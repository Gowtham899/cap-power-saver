import { Preferences } from "@capacitor/preferences";
import { Network } from "@capacitor/network";
import { supabase } from "@/integrations/supabase/client";

export interface OfflineOperation {
  id: string;
  operation: "insert" | "update" | "delete";
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = "offline_operations_queue";
const MAX_RETRIES = 3;

class OfflineStorageService {
  private isProcessing = false;
  private listeners: Set<() => void> = new Set();

  async queueOperation(
    operation: "insert" | "update" | "delete",
    table: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const opId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const op: OfflineOperation = {
      id: opId,
      operation,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const queue = await this.getQueue();
    queue.push(op);
    await this.saveQueue(queue);

    this.notifyListeners();
    this.processQueue(); // Try to process immediately

    return opId;
  }

  async getQueue(): Promise<OfflineOperation[]> {
    try {
      const result = await Preferences.get({ key: QUEUE_KEY });
      return result.value ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error("Failed to get offline queue:", error);
      return [];
    }
  }

  private async saveQueue(queue: OfflineOperation[]): Promise<void> {
    try {
      await Preferences.set({
        key: QUEUE_KEY,
        value: JSON.stringify(queue),
      });
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    // Check network status
    const status = await Network.getStatus();
    if (!status.connected) {
      console.log("Offline - queue processing skipped");
      return;
    }

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`Processing ${queue.length} queued operations...`);

      const remainingOps: OfflineOperation[] = [];

      for (const op of queue) {
        try {
          let success = false;

          switch (op.operation) {
            case "insert":
              const { error: insertError } = await supabase
                .from(op.table as "battery_logs" | "storage_logs" | "usage_logs" | "user_settings")
                .insert(op.data as never);
              success = !insertError;
              if (insertError) console.error("Insert error:", insertError);
              break;

            case "update":
              const { error: updateError } = await supabase
                .from(op.table as "battery_logs" | "storage_logs" | "usage_logs" | "user_settings")
                .update(op.data)
                .match({ id: op.data.id });
              success = !updateError;
              if (updateError) console.error("Update error:", updateError);
              break;

            case "delete":
              const { error: deleteError } = await supabase
                .from(op.table as "battery_logs" | "storage_logs" | "usage_logs" | "user_settings")
                .delete()
                .match({ id: op.data.id });
              success = !deleteError;
              if (deleteError) console.error("Delete error:", deleteError);
              break;
          }

          if (!success) {
            op.retryCount++;
            if (op.retryCount < MAX_RETRIES) {
              remainingOps.push(op);
            } else {
              console.warn(`Operation ${op.id} exceeded max retries, discarding`);
            }
          } else {
            console.log(`Successfully processed operation ${op.id}`);
          }
        } catch (error) {
          console.error(`Error processing operation ${op.id}:`, error);
          op.retryCount++;
          if (op.retryCount < MAX_RETRIES) {
            remainingOps.push(op);
          }
        }
      }

      await this.saveQueue(remainingOps);
      this.notifyListeners();

      console.log(`Queue processing complete. ${queue.length - remainingOps.length} processed, ${remainingOps.length} remaining.`);
    } finally {
      this.isProcessing = false;
    }
  }

  async clearQueue(): Promise<void> {
    await Preferences.remove({ key: QUEUE_KEY });
    this.notifyListeners();
  }

  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Utility to wrap Supabase calls with offline support
  async safeInsert<T extends Record<string, unknown>>(
    table: string,
    data: T
  ): Promise<{ success: boolean; offline: boolean }> {
    try {
      const status = await Network.getStatus();
      
      if (!status.connected) {
        await this.queueOperation("insert", table, data);
        return { success: true, offline: true };
      }

      const { error } = await supabase.from(table as "battery_logs" | "storage_logs" | "usage_logs" | "user_settings").insert(data as never);
      
      if (error) {
        // On error, queue for retry
        await this.queueOperation("insert", table, data);
        return { success: true, offline: true };
      }

      return { success: true, offline: false };
    } catch (error) {
      console.error("safeInsert error:", error);
      await this.queueOperation("insert", table, data);
      return { success: true, offline: true };
    }
  }
}

export const offlineStorage = new OfflineStorageService();

// Initialize network listener for auto-sync
Network.addListener("networkStatusChange", (status) => {
  if (status.connected) {
    console.log("Network restored - processing offline queue");
    offlineStorage.processQueue();
  }
});
