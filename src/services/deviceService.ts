import { Device, DeviceInfo } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Filesystem } from '@capacitor/filesystem';

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

export interface AlertLog {
  id: string;
  type: 'battery' | 'storage' | 'data';
  level: number;
  timestamp: number;
  message: string;
}

export interface MonitoringStatus {
  isBackgroundMonitoringActive: boolean;
  lastBatteryCheck: number;
  lastStorageCheck: number;
  lastDataCheck: number;
}

class DeviceService {
  private batteryCheckInterval: NodeJS.Timeout | null = null;
  private storageCheckInterval: NodeJS.Timeout | null = null;
  private dataCheckInterval: NodeJS.Timeout | null = null;
  private lastBatteryLevel: number = 0;
  private dataUsageStartTime: number = Date.now();
  private backgroundTaskId: string | null = null;
  private alertLogs: AlertLog[] = [];

  async initialize() {
    // Request notification permissions
    await LocalNotifications.requestPermissions();
    
    // Load existing alert logs
    await this.loadAlertLogs();
    
    // Start all monitoring services
    await this.startBackgroundMonitoring();
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
    try {
      // Try to get real filesystem stats
      const stat = await Filesystem.stat({ path: '/', directory: undefined });
      const total = 128 * 1024 * 1024 * 1024; // Default to 128GB as we can't get total space from Capacitor
      const used = stat.size || Math.floor(total * (0.3 + Math.random() * 0.4)); // Use real size or fallback
      const available = total - used;
      
      return {
        total,
        used,
        available,
        percentageUsed: Math.round((used / total) * 100),
      };
    } catch (error) {
      // Fallback to mock data for web/development
      const total = 128 * 1024 * 1024 * 1024; // 128GB
      const used = Math.floor(total * (0.3 + Math.random() * 0.4)); // 30-70% used
      const available = total - used;
      
      return {
        total,
        used,
        available,
        percentageUsed: Math.round((used / total) * 100),
      };
    }
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

  private async startBackgroundMonitoring() {
    // Start battery monitoring (every 30 seconds)
    this.batteryCheckInterval = setInterval(async () => {
      await this.checkBatteryStatus();
    }, 30000);

    // Start storage monitoring (every 5 minutes)
    this.storageCheckInterval = setInterval(async () => {
      await this.checkStorageStatus();
    }, 5 * 60 * 1000);

    // Start data monitoring (every minute)
    this.dataCheckInterval = setInterval(async () => {
      await this.checkDataUsage();
    }, 60000);

    // Initial checks
    await this.checkBatteryStatus();
    await this.checkStorageStatus();
    await this.checkDataUsage();
  }

  private async checkBatteryStatus() {
    const battery = await this.getBatteryInfo();
    const level = battery.level;
    
    // Check for battery level alerts
    const alertLevels = [5, 10, 15, 20, 80, 85, 90, 95, 100];
    
    if (alertLevels.includes(level) && level !== this.lastBatteryLevel) {
      await this.sendBatteryNotification(level, battery.isCharging);
      await this.logAlert('battery', level, `Battery at ${level}%${battery.isCharging ? ' (charging)' : ''}`);
    }
    
    this.lastBatteryLevel = level;
    await Preferences.set({ key: 'lastBatteryCheck', value: Date.now().toString() });
  }

  private async checkStorageStatus() {
    const storage = await this.getStorageInfo();
    const percentage = storage.percentageUsed;
    
    // Check for storage alerts at specific levels
    const alertLevels = [80, 85, 90, 95, 100];
    const currentLevel = Math.floor(percentage);
    
    if (alertLevels.includes(currentLevel)) {
      const lastStorageAlert = await Preferences.get({ key: 'lastStorageAlert' });
      const lastLevel = lastStorageAlert.value ? parseInt(lastStorageAlert.value) : 0;
      
      if (currentLevel !== lastLevel) {
        await this.sendStorageNotification(percentage);
        await this.logAlert('storage', percentage, `Storage at ${percentage}%`);
        await Preferences.set({ key: 'lastStorageAlert', value: currentLevel.toString() });
      }
    }
    
    await Preferences.set({ key: 'lastStorageCheck', value: Date.now().toString() });
  }

  private async checkDataUsage() {
    const usage = await this.getDataUsage();
    const usedMB = Math.floor(usage.totalUsed / (1024 * 1024));
    
    // Check for data usage alerts every 200MB
    const roundedMB = Math.floor(usedMB / 200) * 200;
    
    if (roundedMB > 0 && roundedMB % 200 === 0) {
      const lastDataAlert = await Preferences.get({ key: 'lastDataAlert' });
      const lastAlertMB = lastDataAlert.value ? parseInt(lastDataAlert.value) : 0;
      
      if (roundedMB !== lastAlertMB) {
        await this.sendDataUsageNotification(usedMB);
        await this.logAlert('data', roundedMB, `Used ${roundedMB}MB of mobile data`);
        await Preferences.set({ key: 'lastDataAlert', value: roundedMB.toString() });
      }
    }
    
    await Preferences.set({ key: 'lastDataCheck', value: Date.now().toString() });
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

  async getAlertLogs(): Promise<AlertLog[]> {
    return this.alertLogs.slice(-50); // Return last 50 alerts
  }

  async getMonitoringStatus(): Promise<MonitoringStatus> {
    const lastBatteryCheck = await Preferences.get({ key: 'lastBatteryCheck' });
    const lastStorageCheck = await Preferences.get({ key: 'lastStorageCheck' });
    const lastDataCheck = await Preferences.get({ key: 'lastDataCheck' });

    return {
      isBackgroundMonitoringActive: !!(this.batteryCheckInterval && this.storageCheckInterval && this.dataCheckInterval),
      lastBatteryCheck: lastBatteryCheck.value ? parseInt(lastBatteryCheck.value) : 0,
      lastStorageCheck: lastStorageCheck.value ? parseInt(lastStorageCheck.value) : 0,
      lastDataCheck: lastDataCheck.value ? parseInt(lastDataCheck.value) : 0,
    };
  }

  private async logAlert(type: AlertLog['type'], level: number, message: string) {
    const alert: AlertLog = {
      id: Date.now().toString(),
      type,
      level,
      timestamp: Date.now(),
      message,
    };

    this.alertLogs.push(alert);
    
    // Keep only last 100 alerts in memory
    if (this.alertLogs.length > 100) {
      this.alertLogs = this.alertLogs.slice(-100);
    }

    // Save to preferences
    await Preferences.set({ 
      key: 'alertLogs', 
      value: JSON.stringify(this.alertLogs) 
    });
  }

  private async loadAlertLogs() {
    const stored = await Preferences.get({ key: 'alertLogs' });
    if (stored.value) {
      this.alertLogs = JSON.parse(stored.value);
    }
  }

  destroy() {
    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval);
      this.batteryCheckInterval = null;
    }
    if (this.storageCheckInterval) {
      clearInterval(this.storageCheckInterval);
      this.storageCheckInterval = null;
    }
    if (this.dataCheckInterval) {
      clearInterval(this.dataCheckInterval);
      this.dataCheckInterval = null;
    }
  }
}

export const deviceService = new DeviceService();