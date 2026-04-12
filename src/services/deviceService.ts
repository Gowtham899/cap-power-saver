import { Device, DeviceInfo } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Filesystem } from '@capacitor/filesystem';

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
  temperature: number; // Temperature in Celsius
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
  private batteryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private storageCheckInterval: ReturnType<typeof setInterval> | null = null;
  private dataCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastBatteryLevel: number = 0;
  private dataUsageStartTime: number = Date.now();
  private backgroundTaskId: string | null = null;
  private alertLogs: AlertLog[] = [];
  private activeAlarms: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private activeSoundAlarms: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private alarmDuration: number = 60000; // 60 seconds total alarm duration
  private alarmInterval: number = 10000; // 10 seconds between each alarm
  private soundAlarmDuration: number = 10000; // 10 seconds sound alarm
  private audioContext: AudioContext | null = null;

  async initialize() {
    // Request notification permissions (non-blocking)
    LocalNotifications.requestPermissions().catch(err => 
      console.warn('Notification permissions not granted:', err)
    );
    
    // Load existing alert logs (async)
    this.loadAlertLogs().catch(err => 
      console.warn('Failed to load alert logs:', err)
    );
    
    // Use lightweight monitoring for web/development
    // Heavy monitoring is handled by Android WorkManager in production
    await this.startLightweightMonitoring();
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return await Device.getInfo();
  }

  async getBatteryInfo(): Promise<BatteryInfo> {
    try {
      const info = await Device.getBatteryInfo();
      // Note: Capacitor doesn't provide battery temperature directly
      // For development, we simulate temperature based on battery level and charging status
      let temperature = 25; // Base temperature 25°C
      
      // Simulate higher temperature when charging or battery is low/high
      if (info.isCharging) {
        temperature += Math.random() * 15 + 5; // 30-45°C when charging
      } else if ((info.batteryLevel || 0) > 0.9) {
        temperature += Math.random() * 10 + 5; // 30-40°C when battery is very full
      } else if ((info.batteryLevel || 0) < 0.2) {
        temperature += Math.random() * 8 + 2; // 27-35°C when battery is low
      } else {
        temperature += Math.random() * 8 - 2; // 23-31°C normal range
      }
      
      return {
        level: Math.round((info.batteryLevel || 0) * 100),
        isCharging: info.isCharging || false,
        temperature: Math.round(temperature),
      };
    } catch (error) {
      // Fallback for web/development
      const level = Math.floor(Math.random() * 100);
      const isCharging = Math.random() > 0.5;
      let temperature = 25 + Math.random() * 15; // 25-40°C range
      
      // Simulate overheating occasionally for testing
      if (Math.random() < 0.1) {
        temperature = 45 + Math.random() * 10; // 45-55°C overheating
      }
      
      return {
        level,
        isCharging,
        temperature: Math.round(temperature),
      };
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      // Check if we have access to the native Storage API via window
      // Android native code can expose storage info through a Capacitor plugin or custom bridge
      if ((window as any).NativeStorage) {
        const nativeStorage = (window as any).NativeStorage;
        const total = nativeStorage.totalBytes || 0;
        const available = nativeStorage.freeBytes || 0;
        const used = total - available;
        
        return {
          total,
          used,
          available,
          percentageUsed: total > 0 ? Math.round((used / total) * 100) : 0,
        };
      }

      // Try to use navigator.storage API (available in some browsers/WebViews)
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usedBytes = estimate.usage || 0;
        const availableBytes = quota - usedBytes;

        // Only use if we got meaningful values (quota > 0)
        if (quota > 0) {
          return {
            total: quota,
            used: usedBytes,
            available: availableBytes,
            percentageUsed: Math.round((usedBytes / quota) * 100),
          };
        }
      }

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

  private async startLightweightMonitoring() {
    // For web/development - use longer intervals to prevent ANR
    // Production Android app uses WorkManager instead
    
    // Start battery monitoring (every 2 minutes to reduce load)
    this.batteryCheckInterval = setInterval(() => {
      // Use setTimeout to make it non-blocking
      setTimeout(async () => {
        try {
          await this.checkBatteryStatus();
        } catch (error) {
          console.warn('Battery check error:', error);
        }
      }, 0);
    }, 120000); // 2 minutes

    // Start storage monitoring (every 10 minutes)
    this.storageCheckInterval = setInterval(() => {
      setTimeout(async () => {
        try {
          await this.checkStorageStatus();
        } catch (error) {
          console.warn('Storage check error:', error);
        }
      }, 0);
    }, 10 * 60 * 1000); // 10 minutes

    // Start data monitoring (every 5 minutes)
    this.dataCheckInterval = setInterval(() => {
      setTimeout(async () => {
        try {
          await this.checkDataUsage();
        } catch (error) {
          console.warn('Data check error:', error);
        }
      }, 0);
    }, 5 * 60 * 1000); // 5 minutes

    // Initial checks (non-blocking)
    setTimeout(() => this.checkBatteryStatus().catch(console.warn), 1000);
    setTimeout(() => this.checkStorageStatus().catch(console.warn), 2000);
    setTimeout(() => this.checkDataUsage().catch(console.warn), 3000);
  }

  private async checkBatteryStatus() {
    const battery = await this.getBatteryInfo();
    const level = battery.level;
    const temperature = battery.temperature;
    
    // Check for battery level alerts at specified thresholds
    const alertLevels = [5, 10, 15, 20, 80, 85, 90, 95, 100];
    
    if (alertLevels.includes(level) && level !== this.lastBatteryLevel) {
      await this.sendBatteryNotification(level, battery.isCharging, temperature);
      await this.logAlert('battery', level, `Battery at ${level}%${battery.isCharging ? ' (charging)' : ''} - Temp: ${temperature}°C`);
    }
    
    // Check for temperature alerts (overheating)
    if (temperature >= 40) {
      await this.sendTemperatureNotification(temperature);
      await this.logAlert('battery', temperature, `Device overheating: ${temperature}°C`);
    }
    
    this.lastBatteryLevel = level;
    await Preferences.set({ key: 'lastBatteryCheck', value: Date.now().toString() });
  }

  private async checkStorageStatus() {
    const storage = await this.getStorageInfo();
    const percentage = storage.percentageUsed;
    
    // Check for storage alerts at specified thresholds: 80%, 85%, 90%, 95%, 100%
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

  private async sendBatteryNotification(level: number, isCharging: boolean, temperature?: number) {
    let title = `Battery at ${level}%`;
    let body = '';
    
    if (level >= 80) {
      body = isCharging ? 
        `Battery is ${level}% charged. Consider unplugging to preserve battery health.` :
        `Battery level is high (${level}%). Good battery management!`;
    } else if (level <= 20) {
      body = `Battery is low (${level}%). Consider charging your device.`;
    }

    if (temperature) {
      body += ` Temperature: ${temperature}°C`;
    }

    // Send immediate notification with sound
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 1000) },
        sound: 'default',
        extra: {
          sound: true,
          vibrate: true
        }
      }]
    });

    // Start 10-second sound alarm for ALL battery levels
    await this.startSoundAlarm('battery', title, body);
    
    // Also start recurring notifications alarm
    await this.startRecurringAlarm('battery', title, body);
  }

  private async sendTemperatureNotification(temperature: number) {
    const title = `🔥 Device Overheating!`;
    let body = '';
    let severity = '';
    
    if (temperature >= 50) {
      severity = 'CRITICAL';
      body = `Device temperature is critically high (${temperature}°C). Stop using immediately and let it cool down.`;
    } else if (temperature >= 45) {
      severity = 'SEVERE';
      body = `Device temperature is very high (${temperature}°C). Reduce usage and avoid charging.`;
    } else if (temperature >= 40) {
      severity = 'WARNING';
      body = `Device temperature is elevated (${temperature}°C). Consider reducing usage.`;
    }

    // Send immediate high-priority notification
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'default',
        extra: {
          sound: true,
          vibrate: true,
          priority: 'high'
        }
      }]
    });

    // Start urgent sound alarm for overheating
    await this.startSoundAlarm('temperature', title, body);
    
    // Start recurring alarm for severe overheating
    if (temperature >= 45) {
      await this.startRecurringAlarm('temperature', title, body);
    }
  }

  async sendStorageNotification(percentage: number) {
    if (percentage >= 80) {
      const title = `Storage ${percentage}% Full`;
      const body = `Your device storage is running low. Consider cleaning up files.`;
      
      // Send immediate notification with sound
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          extra: {
            sound: true,
            vibrate: true
          }
        }]
      });

      // Start 10-second sound alarm for storage alerts
      await this.startSoundAlarm('storage', title, body);
      
      // Also start recurring notifications alarm
      await this.startRecurringAlarm('storage', title, body);
    }
  }

  async sendDataUsageNotification(usedMB: number) {
    const roundedMB = Math.floor(usedMB / 200) * 200; // Every 200MB
    if (roundedMB > 0 && roundedMB % 200 === 0) {
      const title = `Data Usage Alert`;
      const body = `You've used ${roundedMB}MB of mobile data this session.`;
      
      // Send immediate notification with sound
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          extra: {
            sound: true,
            vibrate: true
          }
        }]
      });

      // Start 10-second sound alarm for ALL data usage alerts (every 200MB)
      await this.startSoundAlarm('data', title, body);
      
      // Also start recurring notifications alarm for high usage (400MB+)
      if (roundedMB >= 400) {
        await this.startRecurringAlarm('data', title, body);
      }
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

  private async startRecurringAlarm(type: string, title: string, body: string) {
    const alarmKey = `${type}_alarm`;
    
    // Clear any existing alarm for this type
    await this.stopRecurringAlarm(alarmKey);
    
    let alarmCount = 0;
    const maxAlarms = Math.floor(this.alarmDuration / this.alarmInterval); // 6 alarms in 60 seconds
    
    const alarmInterval = setInterval(async () => {
      alarmCount++;
      
      // Send notification with alarm count
      await LocalNotifications.schedule({
        notifications: [{
          title: `🚨 ALERT ${alarmCount}/${maxAlarms}: ${title}`,
          body: `${body} - Recurring alert every 10 seconds`,
          id: Date.now() + alarmCount,
          schedule: { at: new Date(Date.now() + 100) },
        }]
      });
      
      // Stop after reaching max alarms
      if (alarmCount >= maxAlarms) {
        await this.stopRecurringAlarm(alarmKey);
      }
    }, this.alarmInterval);
    
    // Store the alarm interval
    this.activeAlarms.set(alarmKey, alarmInterval);
    
    // Auto-stop alarm after total duration
    setTimeout(() => {
      this.stopRecurringAlarm(alarmKey);
    }, this.alarmDuration);
  }

  private async stopRecurringAlarm(alarmKey: string) {
    if (this.activeAlarms.has(alarmKey)) {
      const interval = this.activeAlarms.get(alarmKey);
      if (interval) {
        clearInterval(interval);
      }
      this.activeAlarms.delete(alarmKey);
    }
  }

  private async startSoundAlarm(type: string, title: string, body: string) {
    const soundAlarmKey = `${type}_sound_alarm`;
    
    // Clear any existing sound alarm for this type
    await this.stopSoundAlarm(soundAlarmKey);
    
    // Initialize audio context for web-based sound
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (error) {
        console.warn('AudioContext not supported');
      }
    }
    
    // Play sound for 10 seconds
    if (this.audioContext) {
      this.playAlarmSound();
    }
    
    // Set timeout to stop the sound alarm after 10 seconds
    const soundTimeout = setTimeout(() => {
      this.stopSoundAlarm(soundAlarmKey);
    }, this.soundAlarmDuration);
    
    this.activeSoundAlarms.set(soundAlarmKey, soundTimeout);
  }

  private playAlarmSound() {
    // Use requestIdleCallback to avoid blocking main thread
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.createAlarmSound());
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.createAlarmSound(), 0);
    }
  }

  private createAlarmSound() {
    if (!this.audioContext) return;
    
    try {
      // Create oscillator for alarm sound (non-blocking)
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Set alarm sound frequency (high pitch beep)
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.5);
      
      // Set volume
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 10);
      
      // Play for 10 seconds
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 10);
      
    } catch (error) {
      console.warn('Failed to play alarm sound:', error);
    }
  }

  private async stopSoundAlarm(soundAlarmKey: string) {
    if (this.activeSoundAlarms.has(soundAlarmKey)) {
      const timeout = this.activeSoundAlarms.get(soundAlarmKey);
      if (timeout) {
        clearTimeout(timeout);
      }
      this.activeSoundAlarms.delete(soundAlarmKey);
    }
  }

  async stopAllAlarms() {
    // Stop notification alarms
    for (const [key, interval] of this.activeAlarms.entries()) {
      clearInterval(interval);
    }
    this.activeAlarms.clear();
    
    // Stop sound alarms
    for (const [key, timeout] of this.activeSoundAlarms.entries()) {
      clearTimeout(timeout);
    }
    this.activeSoundAlarms.clear();
  }

  destroy() {
    // Clear all monitoring intervals
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
    
    // Stop all recurring alarms
    this.stopAllAlarms();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const deviceService = new DeviceService();