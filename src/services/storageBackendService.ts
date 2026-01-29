import { supabase } from "@/integrations/supabase/client";
import { Device } from "@capacitor/device";

export interface StorageMetric {
  id: string;
  device_id: string;
  metric_type: string;
  current_value: number;
  max_value: number | null;
  recorded_at: string;
}

export interface StorageAlert {
  id: string;
  device_id: string;
  alert_type: string;
  alert_level: string;
  threshold_value: number;
  current_value: number;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

export interface StorageStats {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  percentageUsed: number;
  categories: StorageCategory[];
}

export interface StorageCategory {
  name: string;
  size: number;
  percentage: number;
  color: string;
}

class StorageBackendService {
  private deviceId: string | null = null;

  // Get or generate device ID
  async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    
    try {
      const info = await Device.getId();
      this.deviceId = info.identifier;
    } catch {
      // Fallback for web
      let storedId = localStorage.getItem('device_id');
      if (!storedId) {
        storedId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('device_id', storedId);
      }
      this.deviceId = storedId;
    }
    
    return this.deviceId;
  }

  // Record storage metric to Supabase
  async recordStorageMetric(
    usedBytes: number,
    totalBytes: number,
    availableBytes: number
  ): Promise<StorageMetric | null> {
    try {
      const deviceId = await this.getDeviceId();
      const percentageUsed = Math.round((usedBytes / totalBytes) * 100);

      const { data, error } = await supabase
        .from('device_metrics')
        .insert({
          device_id: deviceId,
          metric_type: 'storage',
          current_value: percentageUsed,
          max_value: totalBytes,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to record storage metric:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error recording storage metric:', error);
      return null;
    }
  }

  // Get storage history from Supabase
  async getStorageHistory(
    days: number = 7,
    limit: number = 100
  ): Promise<StorageMetric[]> {
    try {
      const deviceId = await this.getDeviceId();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('device_metrics')
        .select('*')
        .eq('device_id', deviceId)
        .eq('metric_type', 'storage')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get storage history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting storage history:', error);
      return [];
    }
  }

  // Log storage alert to Supabase
  async logStorageAlert(
    percentageUsed: number,
    thresholdValue: number,
    message: string,
    alertLevel: 'info' | 'warning' | 'critical' = 'warning'
  ): Promise<StorageAlert | null> {
    try {
      const deviceId = await this.getDeviceId();

      // Check if we already sent an alert for this threshold recently (within 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: existingAlert } = await supabase
        .from('alert_logs')
        .select('id')
        .eq('device_id', deviceId)
        .eq('alert_type', 'storage')
        .eq('threshold_value', thresholdValue)
        .gte('created_at', oneHourAgo)
        .maybeSingle();

      if (existingAlert) {
        console.log('Storage alert already sent recently for this threshold');
        return null;
      }

      const { data, error } = await supabase
        .from('alert_logs')
        .insert({
          device_id: deviceId,
          alert_type: 'storage',
          alert_level: alertLevel,
          threshold_value: thresholdValue,
          current_value: percentageUsed,
          message: message,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log storage alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error logging storage alert:', error);
      return null;
    }
  }

  // Get storage alerts from Supabase
  async getStorageAlerts(limit: number = 50): Promise<StorageAlert[]> {
    try {
      const deviceId = await this.getDeviceId();

      const { data, error } = await supabase
        .from('alert_logs')
        .select('*')
        .eq('device_id', deviceId)
        .eq('alert_type', 'storage')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get storage alerts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting storage alerts:', error);
      return [];
    }
  }

  // Check storage and trigger alerts if needed
  async checkAndAlertStorage(
    usedBytes: number,
    totalBytes: number
  ): Promise<{
    alertTriggered: boolean;
    thresholdReached: number | null;
    alert: StorageAlert | null;
  }> {
    const percentageUsed = Math.round((usedBytes / totalBytes) * 100);
    const alertThresholds = [80, 85, 90, 95, 100];
    
    // Find the highest threshold reached
    let thresholdReached: number | null = null;
    for (const threshold of alertThresholds.reverse()) {
      if (percentageUsed >= threshold) {
        thresholdReached = threshold;
        break;
      }
    }

    if (thresholdReached === null) {
      return { alertTriggered: false, thresholdReached: null, alert: null };
    }

    // Determine alert level
    let alertLevel: 'info' | 'warning' | 'critical' = 'warning';
    if (thresholdReached >= 95) {
      alertLevel = 'critical';
    } else if (thresholdReached >= 85) {
      alertLevel = 'warning';
    } else {
      alertLevel = 'info';
    }

    // Create message based on severity
    const messages: Record<number, string> = {
      80: `Storage is 80% full. Consider cleaning up unused files.`,
      85: `Storage is 85% full. Running low on space.`,
      90: `Storage is 90% full! Free up space soon.`,
      95: `Critical: Storage is 95% full! Device may slow down.`,
      100: `Storage is FULL! Device performance will be affected.`,
    };

    const message = messages[thresholdReached] || `Storage at ${percentageUsed}%`;

    // Record metric and log alert
    await this.recordStorageMetric(usedBytes, totalBytes, totalBytes - usedBytes);
    const alert = await this.logStorageAlert(
      percentageUsed,
      thresholdReached,
      message,
      alertLevel
    );

    return {
      alertTriggered: !!alert,
      thresholdReached,
      alert,
    };
  }

  // Get storage analytics/trends
  async getStorageTrends(days: number = 30): Promise<{
    averageUsage: number;
    peakUsage: number;
    usageGrowthRate: number;
    dataPoints: { date: string; percentage: number }[];
  }> {
    try {
      const history = await this.getStorageHistory(days, 500);

      if (history.length === 0) {
        return {
          averageUsage: 0,
          peakUsage: 0,
          usageGrowthRate: 0,
          dataPoints: [],
        };
      }

      // Calculate average
      const sum = history.reduce((acc, m) => acc + m.current_value, 0);
      const averageUsage = Math.round(sum / history.length);

      // Find peak
      const peakUsage = Math.max(...history.map((m) => m.current_value));

      // Calculate growth rate (compare first and last readings)
      const oldestReading = history[history.length - 1].current_value;
      const newestReading = history[0].current_value;
      const usageGrowthRate = newestReading - oldestReading;

      // Group by date for chart data
      const dailyData = new Map<string, number[]>();
      history.forEach((m) => {
        const date = m.recorded_at.split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(m.current_value);
      });

      const dataPoints = Array.from(dailyData.entries())
        .map(([date, values]) => ({
          date,
          percentage: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        averageUsage,
        peakUsage,
        usageGrowthRate,
        dataPoints,
      };
    } catch (error) {
      console.error('Error getting storage trends:', error);
      return {
        averageUsage: 0,
        peakUsage: 0,
        usageGrowthRate: 0,
        dataPoints: [],
      };
    }
  }

  // Register device with Supabase
  async registerDevice(): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      
      let deviceInfo: {
        platform: string;
        model: string | null;
        osVersion: string | null;
        name: string | null;
      } = {
        platform: 'web',
        model: null,
        osVersion: null,
        name: null,
      };

      try {
        const info = await Device.getInfo();
        deviceInfo = {
          platform: info.platform,
          model: info.model,
          osVersion: info.osVersion,
          name: info.name || null,
        };
      } catch {
        // Use web defaults
      }

      // Upsert device
      const { error } = await supabase
        .from('devices')
        .upsert({
          device_id: deviceId,
          platform: deviceInfo.platform,
          model: deviceInfo.model,
          os_version: deviceInfo.osVersion,
          device_name: deviceInfo.name,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'device_id',
        });

      if (error) {
        console.error('Failed to register device:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  // Get notification settings for storage
  async getStorageNotificationSettings(): Promise<{
    isEnabled: boolean;
    thresholdValue: number;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    recurringIntervalSeconds: number;
  }> {
    try {
      const deviceId = await this.getDeviceId();

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('device_id', deviceId)
        .eq('alert_type', 'storage')
        .maybeSingle();

      if (error || !data) {
        // Return defaults
        return {
          isEnabled: true,
          thresholdValue: 80,
          soundEnabled: true,
          vibrationEnabled: true,
          recurringIntervalSeconds: 10,
        };
      }

      return {
        isEnabled: data.is_enabled,
        thresholdValue: data.threshold_value,
        soundEnabled: data.sound_enabled,
        vibrationEnabled: data.vibration_enabled,
        recurringIntervalSeconds: data.recurring_interval_seconds || 10,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        isEnabled: true,
        thresholdValue: 80,
        soundEnabled: true,
        vibrationEnabled: true,
        recurringIntervalSeconds: 10,
      };
    }
  }

  // Update notification settings for storage
  async updateStorageNotificationSettings(settings: {
    isEnabled?: boolean;
    thresholdValue?: number;
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    recurringIntervalSeconds?: number;
  }): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          device_id: deviceId,
          alert_type: 'storage',
          is_enabled: settings.isEnabled ?? true,
          threshold_value: settings.thresholdValue ?? 80,
          sound_enabled: settings.soundEnabled ?? true,
          vibration_enabled: settings.vibrationEnabled ?? true,
          recurring_interval_seconds: settings.recurringIntervalSeconds ?? 10,
        }, {
          onConflict: 'device_id,alert_type',
        });

      if (error) {
        console.error('Failed to update notification settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }
}

export const storageBackendService = new StorageBackendService();
