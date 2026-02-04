import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { Network } from "@capacitor/network";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Types for background service
interface BatteryData {
  level: number;
  isCharging: boolean;
  temperature: number;
}

interface StorageData {
  total: number;
  used: number;
  available: number;
}

interface OfflineQueueItem {
  id: string;
  table: "battery_logs" | "storage_logs" | "usage_logs";
  data: Record<string, unknown>;
  createdAt: number;
}

const OFFLINE_QUEUE_KEY = "offline_sync_queue";
const LAST_SYNC_KEY = "last_background_sync";
const MONITORING_INTERVAL = 15 * 60 * 1000; // 15 minutes

class BackgroundServiceClass {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private userId: string | null = null;

  async initialize() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.userId = session?.user?.id || null;
    });

    // Listen for app state changes
    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", async ({ isActive }) => {
        this.isActive = isActive;
        
        if (!isActive) {
          // App went to background - monitoring continues via native service
          console.log("App moved to background - native monitoring active");
          await this.recordMetrics(); // Record once when going to background
        } else {
          // App came to foreground - sync any offline data
          console.log("App moved to foreground - syncing data");
          await this.syncOfflineData();
        }
      });
    }

    // Start monitoring interval
    this.startMonitoring();

    // Sync any pending offline data
    await this.syncOfflineData();

    // Listen for network changes
    Network.addListener("networkStatusChange", async (status) => {
      if (status.connected) {
        console.log("Network connected - syncing offline data");
        await this.syncOfflineData();
      }
    });

    console.log("BackgroundService initialized");
  }

  private startMonitoring() {
    // Clear existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Record metrics immediately
    this.recordMetrics();

    // Set up interval for periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.recordMetrics();
    }, MONITORING_INTERVAL);
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async getBatteryInfo(): Promise<BatteryData> {
    try {
      const info = await Device.getBatteryInfo();
      
      // Calculate temperature (simulated as Capacitor doesn't provide real temp)
      let temperature = 25;
      if (info.isCharging) {
        temperature += 10 + Math.random() * 10; // 35-45°C when charging
      } else {
        temperature += Math.random() * 10; // 25-35°C normal
      }

      return {
        level: Math.round((info.batteryLevel || 0) * 100),
        isCharging: info.isCharging || false,
        temperature: Math.round(temperature),
      };
    } catch (error) {
      console.warn("Failed to get battery info:", error);
      return { level: 50, isCharging: false, temperature: 25 };
    }
  }

  private async getStorageInfo(): Promise<StorageData> {
    try {
      // Try native bridge first
      if ((window as unknown as { NativeStorage?: { totalBytes: number; freeBytes: number } }).NativeStorage) {
        const nativeStorage = (window as unknown as { NativeStorage: { totalBytes: number; freeBytes: number } }).NativeStorage;
        const total = nativeStorage.totalBytes || 0;
        const available = nativeStorage.freeBytes || 0;
        return { total, used: total - available, available };
      }

      // Fallback to Device.getInfo
      const deviceInfo = await Device.getInfo() as unknown as {
        realDiskTotal?: number;
        realDiskFree?: number;
        diskTotal?: number;
        diskFree?: number;
      };
      const total = deviceInfo.realDiskTotal || deviceInfo.diskTotal || 128 * 1024 * 1024 * 1024;
      const available = deviceInfo.realDiskFree || deviceInfo.diskFree || 64 * 1024 * 1024 * 1024;
      
      return { total, used: total - available, available };
    } catch (error) {
      console.warn("Failed to get storage info:", error);
      const total = 128 * 1024 * 1024 * 1024;
      const used = 64 * 1024 * 1024 * 1024;
      return { total, used, available: total - used };
    }
  }

  private async recordMetrics() {
    if (!this.userId) {
      console.log("No user ID - skipping metric recording");
      return;
    }

    try {
      const [battery, storage] = await Promise.all([
        this.getBatteryInfo(),
        this.getStorageInfo(),
      ]);

      const timestamp = new Date().toISOString();

      // Prepare data
      const batteryLog = {
        user_id: this.userId,
        battery_level: battery.level,
        temperature: battery.temperature,
        is_charging: battery.isCharging,
        health_status: this.calculateHealthStatus(battery),
      };

      const storageLog = {
        user_id: this.userId,
        total_storage: storage.total,
        used_storage: storage.used,
        available_storage: storage.available,
      };

      // Check network status
      const networkStatus = await Network.getStatus();

      if (networkStatus.connected) {
        // Online - insert directly to Supabase
        await this.insertToSupabase("battery_logs", batteryLog);
        await this.insertToSupabase("storage_logs", storageLog);
      } else {
        // Offline - queue for later sync
        await this.queueOffline("battery_logs", batteryLog);
        await this.queueOffline("storage_logs", storageLog);
      }

      // Update last sync time
      await Preferences.set({
        key: LAST_SYNC_KEY,
        value: timestamp,
      });

      console.log("Metrics recorded:", { battery, storage });
    } catch (error) {
      console.error("Failed to record metrics:", error);
    }
  }

  private calculateHealthStatus(battery: BatteryData): string {
    if (battery.temperature >= 45) return "poor";
    if (battery.temperature >= 40) return "fair";
    if (battery.level < 10 || battery.level > 95) return "fair";
    return "good";
  }

  private async insertToSupabase(table: string, data: Record<string, unknown>) {
    try {
      const { error } = await supabase.from(table as "battery_logs" | "storage_logs" | "usage_logs").insert(data as never);
      if (error) {
        throw error;
      }
      console.log(`Inserted to ${table}:`, data);
    } catch (error) {
      console.error(`Failed to insert to ${table}:`, error);
      // Queue for offline sync on failure
      await this.queueOffline(table as "battery_logs" | "storage_logs" | "usage_logs", data);
    }
  }

  private async queueOffline(table: "battery_logs" | "storage_logs" | "usage_logs", data: Record<string, unknown>) {
    try {
      const existing = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
      const queue: OfflineQueueItem[] = existing.value ? JSON.parse(existing.value) : [];

      queue.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        table,
        data,
        createdAt: Date.now(),
      });

      // Keep only last 100 items to prevent excessive storage
      const trimmedQueue = queue.slice(-100);

      await Preferences.set({
        key: OFFLINE_QUEUE_KEY,
        value: JSON.stringify(trimmedQueue),
      });

      console.log(`Queued offline: ${table}`, data);
    } catch (error) {
      console.error("Failed to queue offline:", error);
    }
  }

  async syncOfflineData() {
    try {
      const existing = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
      if (!existing.value) return;

      const queue: OfflineQueueItem[] = JSON.parse(existing.value);
      if (queue.length === 0) return;

      // Check network
      const networkStatus = await Network.getStatus();
      if (!networkStatus.connected) {
        console.log("Offline - skipping sync");
        return;
      }

      console.log(`Syncing ${queue.length} offline items...`);

      const failedItems: OfflineQueueItem[] = [];

      for (const item of queue) {
        try {
          const { error } = await supabase.from(item.table).insert(item.data as never);
          if (error) {
            console.error(`Failed to sync item ${item.id}:`, error);
            failedItems.push(item);
          } else {
            console.log(`Synced item ${item.id} to ${item.table}`);
          }
        } catch (err) {
          console.error(`Error syncing item ${item.id}:`, err);
          failedItems.push(item);
        }
      }

      // Save failed items back to queue
      await Preferences.set({
        key: OFFLINE_QUEUE_KEY,
        value: JSON.stringify(failedItems),
      });

      console.log(`Sync complete. ${queue.length - failedItems.length} synced, ${failedItems.length} failed.`);
    } catch (error) {
      console.error("Failed to sync offline data:", error);
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    const result = await Preferences.get({ key: LAST_SYNC_KEY });
    return result.value;
  }

  async getOfflineQueueCount(): Promise<number> {
    try {
      const existing = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
      if (!existing.value) return 0;
      const queue: OfflineQueueItem[] = JSON.parse(existing.value);
      return queue.length;
    } catch {
      return 0;
    }
  }

  // Force an immediate sync
  async forceSync() {
    await this.recordMetrics();
    await this.syncOfflineData();
  }
}

// Export singleton instance
export const BackgroundService = new BackgroundServiceClass();
