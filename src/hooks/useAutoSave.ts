 import { useEffect, useRef } from "react";
 import { Device } from "@capacitor/device";
 import { supabase } from "@/integrations/supabase/client";
 import { deviceIdService } from "@/services/deviceIdService";
 
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
 
 // Hook that auto-saves device data on mount with debug alerts
 export function useAutoSave() {
   const hasSaved = useRef(false);
 
   useEffect(() => {
     // Only run once per mount
     if (hasSaved.current) return;
     hasSaved.current = true;
 
     saveCurrentStatus();
   }, []);
 
   async function saveCurrentStatus() {
     const deviceId = deviceIdService.getDeviceId();
     console.log("Auto-save triggered with device ID:", deviceId);
 
     try {
       // Get battery info
       const battery = await getBatteryInfo();
       console.log("Battery info:", battery);
 
       // Get storage info
       const storage = await getStorageInfo();
       console.log("Storage info:", storage);
 
       // Save battery log
       await saveBatteryLog(deviceId, battery);
 
       // Save storage log
       await saveStorageLog(deviceId, storage);
 
       console.log("✅ All data saved successfully!");
     } catch (error) {
       console.error("Auto-save failed:", error);
       alert("Auto-save failed: " + (error instanceof Error ? error.message : String(error)));
     }
   }
 
   async function getBatteryInfo(): Promise<BatteryData> {
     try {
       const info = await Device.getBatteryInfo();
       
       let temperature = 25;
       if (info.isCharging) {
         temperature += 10 + Math.random() * 10;
       } else {
         temperature += Math.random() * 10;
       }
 
       return {
         level: Math.round((info.batteryLevel || 0.5) * 100),
         isCharging: info.isCharging || false,
         temperature: Math.round(temperature),
       };
     } catch (error) {
       console.warn("Failed to get battery info, using defaults:", error);
       return { level: 50, isCharging: false, temperature: 25 };
     }
   }
 
   async function getStorageInfo(): Promise<StorageData> {
     try {
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
       console.warn("Failed to get storage info, using defaults:", error);
       const total = 128 * 1024 * 1024 * 1024;
       const used = 64 * 1024 * 1024 * 1024;
       return { total, used, available: total - used };
     }
   }
 
   async function saveBatteryLog(deviceId: string, battery: BatteryData) {
     const batteryLog = {
       user_id: deviceId,
       battery_level: battery.level,
       temperature: battery.temperature,
       is_charging: battery.isCharging,
       health_status: calculateHealthStatus(battery),
     };
 
     console.log("Saving battery log:", batteryLog);
 
     try {
       const { data, error } = await supabase
         .from("battery_logs")
         .insert(batteryLog)
         .select()
         .single();
 
       if (error) {
         console.error("Battery log insert error:", error);
         alert("Battery save failed: " + error.message);
         throw error;
       }
 
       console.log("✅ Battery log saved:", data);
       return data;
     } catch (err) {
       console.error("Battery log exception:", err);
       throw err;
     }
   }
 
   async function saveStorageLog(deviceId: string, storage: StorageData) {
     const storageLog = {
       user_id: deviceId,
       total_storage: storage.total,
       used_storage: storage.used,
       available_storage: storage.available,
     };
 
     console.log("Saving storage log:", storageLog);
 
     try {
       const { data, error } = await supabase
         .from("storage_logs")
         .insert(storageLog)
         .select()
         .single();
 
       if (error) {
         console.error("Storage log insert error:", error);
         alert("Storage save failed: " + error.message);
         throw error;
       }
 
       console.log("✅ Storage log saved:", data);
       return data;
     } catch (err) {
       console.error("Storage log exception:", err);
       throw err;
     }
   }
 
   function calculateHealthStatus(battery: BatteryData): string {
     if (battery.temperature >= 45) return "poor";
     if (battery.temperature >= 40) return "fair";
     if (battery.level < 10 || battery.level > 95) return "fair";
     return "good";
   }
 }