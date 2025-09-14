import { Device, DeviceInfo } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
}

export interface StorageInfo {
  total: number;
  used: number;
  available: number;
  percentageUsed: number;
}

export interface DataUsage {
  totalUsed: number;
  dailyUsage: number[];
  weeklyTotal: number;
}

class DeviceService {
  private batteryCheckInterval: NodeJS.Timeout | null = null;
  private lastBatteryLevel: number = 0;
  private dataUsageStartTime: number = Date.now();

  async initialize() {
    // Request notification permissions
    await LocalNotifications.requestPermissions();
    
    // Start monitoring
    this.startBatteryMonitoring();
    this.initializeDataTracking();
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return await Device.getInfo();
  }

  async getBatteryInfo(): Promise<BatteryInfo> {
    try {
      const info = await Device.getBatteryInfo();
      return {
        level: Math.round((info.batteryLevel || 0) * 100),
        isCharging: info.isCharging || false,
      };
    } catch (error) {
      // Fallback for web/development
      return {
        level: Math.floor(Math.random() * 100),
        isCharging: Math.random() > 0.5,
      };
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    // Mock data for now - real implementation would use native plugins
    const total = 128 * 1024 * 1024 * 1024; // 128GB
    const used = Math.floor(total * (0.3 + Math.random() * 0.5)); // 30-80% used
    const available = total - used;
    
    return {
      total,
      used,
      available,
      percentageUsed: Math.round((used / total) * 100),
    };
  }

  async getDataUsage(): Promise<DataUsage> {
    const stored = await Preferences.get({ key: 'dataUsage' });
    let dataUsage = stored.value ? JSON.parse(stored.value) : {
      totalUsed: 0,
      dailyUsage: Array(7).fill(0),
      weeklyTotal: 0,
      lastReset: Date.now(),
    };

    // Simulate data usage accumulation
    const currentTime = Date.now();
    const timeDiff = currentTime - (dataUsage.lastReset || this.dataUsageStartTime);
    const hoursElapsed = timeDiff / (1000 * 60 * 60);
    
    // Add some realistic usage (5-50MB per hour)
    const additionalUsage = Math.floor(hoursElapsed * (5 + Math.random() * 45) * 1024 * 1024);
    dataUsage.totalUsed += additionalUsage;
    dataUsage.weeklyTotal += additionalUsage;
    
    // Update daily usage (current day)
    const today = new Date().getDay();
    dataUsage.dailyUsage[today] += additionalUsage;
    
    dataUsage.lastReset = currentTime;
    await Preferences.set({ key: 'dataUsage', value: JSON.stringify(dataUsage) });

    return dataUsage;
  }

  private async startBatteryMonitoring() {
    this.batteryCheckInterval = setInterval(async () => {
      const battery = await this.getBatteryInfo();
      const level = battery.level;
      
      // Check for battery level alerts
      const alertLevels = [5, 10, 15, 20, 80, 85, 90, 95, 100];
      
      if (alertLevels.includes(level) && level !== this.lastBatteryLevel) {
        await this.sendBatteryNotification(level, battery.isCharging);
      }
      
      this.lastBatteryLevel = level;
    }, 30000); // Check every 30 seconds
  }

  private async sendBatteryNotification(level: number, isCharging: boolean) {
    let title = `Battery at ${level}%`;
    let body = '';
    
    if (level >= 80) {
      body = isCharging ? 
        `Battery is ${level}% charged. Consider unplugging to preserve battery health.` :
        `Battery level is high (${level}%). Good battery management!`;
    } else if (level <= 20) {
      body = `Battery is low (${level}%). Consider charging your device.`;
    }

    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 1000) },
      }]
    });
  }

  async sendStorageNotification(percentage: number) {
    if (percentage >= 80) {
      await LocalNotifications.schedule({
        notifications: [{
          title: `Storage ${percentage}% Full`,
          body: `Your device storage is running low. Consider cleaning up files.`,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
        }]
      });
    }
  }

  async sendDataUsageNotification(usedMB: number) {
    const roundedMB = Math.floor(usedMB / 200) * 200; // Every 200MB
    if (roundedMB > 0 && roundedMB % 200 === 0) {
      await LocalNotifications.schedule({
        notifications: [{
          title: `Data Usage Alert`,
          body: `You've used ${roundedMB}MB of mobile data this session.`,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
        }]
      });
    }
  }

  private async initializeDataTracking() {
    // Initialize data usage tracking
    const status = await Network.getStatus();
    if (status.connectionType === 'cellular') {
      // Start tracking cellular usage
      setInterval(async () => {
        const usage = await this.getDataUsage();
        const usedMB = Math.floor(usage.totalUsed / (1024 * 1024));
        await this.sendDataUsageNotification(usedMB);
      }, 60000); // Check every minute
    }
  }

  destroy() {
    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval);
      this.batteryCheckInterval = null;
    }
  }
}

export const deviceService = new DeviceService();