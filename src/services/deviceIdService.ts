 // Simple Device ID Service - No Supabase Auth Required
 // Uses localStorage for persistence
 
 const DEVICE_ID_KEY = 'device_user_id';
 
 class DeviceIdService {
   private deviceId: string | null = null;
 
   // Get or create a persistent device ID
   getDeviceId(): string {
     // Return cached value if available
     if (this.deviceId) {
       return this.deviceId;
     }
 
     // Check localStorage
     let storedId = localStorage.getItem(DEVICE_ID_KEY);
     
     if (!storedId) {
       // Generate a new UUID
       storedId = crypto.randomUUID();
       localStorage.setItem(DEVICE_ID_KEY, storedId);
       console.log('Generated new device ID:', storedId);
     } else {
       console.log('Using existing device ID:', storedId);
     }
 
     this.deviceId = storedId;
     return storedId;
   }
 
   // Clear device ID (for testing)
   clearDeviceId(): void {
     localStorage.removeItem(DEVICE_ID_KEY);
     this.deviceId = null;
     console.log('Device ID cleared');
   }
 }
 
 export const deviceIdService = new DeviceIdService();