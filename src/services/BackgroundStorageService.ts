 import { Device } from "@capacitor/device";
 import { Filesystem, Directory } from "@capacitor/filesystem";
 import { App } from "@capacitor/app";
 import { Capacitor } from "@capacitor/core";
 import { supabase } from "@/integrations/supabase/client";
 import { deviceIdService } from "@/services/deviceIdService";
 
 // Dynamic import for BackgroundTask to handle cases where it's not available
 let BackgroundTask: typeof import("@capawesome/capacitor-background-task").BackgroundTask | null = null;
 
 interface StorageData {
   total: number;
   used: number;
   available: number;
 }
 
 class BackgroundStorageServiceClass {
   private isInitialized = false;
   private isScanning = false;
 
   async initialize() {
     if (this.isInitialized) return;
 
     // Try to load BackgroundTask plugin
     try {
       const module = await import("@capawesome/capacitor-background-task");
       BackgroundTask = module.BackgroundTask;
       console.log("BackgroundTask plugin loaded successfully");
     } catch (e) {
       console.log("BackgroundTask plugin not available, using fallback");
     }
 
     // Listen for app state changes
     if (Capacitor.isNativePlatform()) {
       App.addListener("appStateChange", async ({ isActive }) => {
         if (!isActive) {
           console.log("App went to background - starting storage scan");
           await this.performBackgroundScan();
         }
       });
     }
 
     this.isInitialized = true;
     console.log("BackgroundStorageService initialized");
   }
 
   async performBackgroundScan(): Promise<void> {
     // Prevent concurrent scans
     if (this.isScanning) {
       console.log("Scan already in progress, skipping");
       return;
     }
 
     this.isScanning = true;
     let taskId: string | null = null;
 
     try {
       // Request background processing time from Android
       if (BackgroundTask && Capacitor.isNativePlatform()) {
         taskId = await BackgroundTask.beforeExit(async () => {
           console.log("Background task time granted");
         });
       }
 
       // Step A: Check permissions before attempting any storage access
       const hasPermission = await this.checkStoragePermission();
       if (!hasPermission) {
         console.log("Storage permission not granted - skipping background scan");
         return;
       }
 
       // Step B: Read storage data safely
       const storageData = await this.getStorageInfo();
       if (!storageData) {
         console.log("Failed to get storage info - skipping save");
         return;
       }
 
       // Step C: Save to Supabase
       await this.saveToSupabase(storageData);
 
     } catch (error) {
       console.error("Background storage scan failed:", error);
     } finally {
       this.isScanning = false;
 
       // Signal that background work is complete
       if (BackgroundTask && taskId) {
         await BackgroundTask.finish({ taskId });
         console.log("Background task finished");
       }
     }
   }
 
   private async checkStoragePermission(): Promise<boolean> {
     try {
       // On web, always return true
       if (!Capacitor.isNativePlatform()) {
         return true;
       }
 
       const result = await Filesystem.checkPermissions();
       const granted = result.publicStorage === "granted";
       
       console.log("Storage permission status:", result.publicStorage);
       return granted;
     } catch (error) {
       console.error("Error checking storage permissions:", error);
       // Don't crash in background - just skip the scan
       return false;
     }
   }
 
   private async getStorageInfo(): Promise<StorageData | null> {
     try {
       // Try native bridge first (injected by StorageBridge.java)
       const nativeStorage = (window as unknown as { 
         NativeStorage?: { totalBytes: number; freeBytes: number } 
       }).NativeStorage;
 
       if (nativeStorage && nativeStorage.totalBytes > 0) {
         const total = nativeStorage.totalBytes;
         const available = nativeStorage.freeBytes;
         const used = total - available;
         
         console.log("Storage from native bridge:", { total, used, available });
         return { total, used, available };
       }
 
       // Fallback to Device.getInfo()
       const deviceInfo = await Device.getInfo() as unknown as {
         realDiskTotal?: number;
         realDiskFree?: number;
         diskTotal?: number;
         diskFree?: number;
       };
 
       const total = deviceInfo.realDiskTotal || deviceInfo.diskTotal || 0;
       const available = deviceInfo.realDiskFree || deviceInfo.diskFree || 0;
       const used = total - available;
 
       // Validate we got real data
       if (total === 0) {
         console.warn("Device.getInfo returned 0 for disk total");
         return null;
       }
 
       console.log("Storage from Device.getInfo:", { total, used, available });
       return { total, used, available };
 
     } catch (error) {
       console.error("Failed to get storage info:", error);
       return null;
     }
   }
 
   private async saveToSupabase(data: StorageData): Promise<void> {
     const deviceId = deviceIdService.getDeviceId();
     
     if (!deviceId) {
       console.log("No device ID - cannot save to Supabase");
       return;
     }
 
     try {
       const { error } = await supabase.from("storage_logs").insert({
         user_id: deviceId,
         total_storage: data.total,
         used_storage: data.used,
         available_storage: data.available,
       });
 
       if (error) {
         console.error("Supabase insert error:", error.message);
         // Could queue for offline sync here
       } else {
         console.log("Storage log saved to Supabase successfully");
       }
     } catch (error) {
       console.error("Failed to save storage log:", error);
     }
   }
 
   // Manual trigger for immediate scan (e.g., from UI)
   async triggerScan(): Promise<StorageData | null> {
     const hasPermission = await this.checkStoragePermission();
     if (!hasPermission) {
       console.log("Cannot scan - permission not granted");
       return null;
     }
 
     const data = await this.getStorageInfo();
     if (data) {
       await this.saveToSupabase(data);
     }
     return data;
   }
 }
 
 export const BackgroundStorageService = new BackgroundStorageServiceClass();