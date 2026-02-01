// TypeScript interfaces for Supabase tables

export interface UserSettings {
  id: string;
  user_id: string;
  battery_high_threshold: number;
  battery_critical_threshold: number;
  battery_low_threshold: number;
  battery_critical_low_threshold: number;
  data_limit_mb: number;
  data_alert_interval_mb: number;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatteryLog {
  id: string;
  user_id: string;
  battery_level: number;
  temperature: number | null;
  is_charging: boolean;
  health_status: 'good' | 'fair' | 'poor' | 'unknown';
  created_at: string;
}

export interface StorageLog {
  id: string;
  user_id: string;
  total_storage: number;
  used_storage: number;
  available_storage: number;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  mobile_data_used: number;
  wifi_data_used: number;
  limit_set: number;
  created_at: string;
}

export interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: 'battery' | 'storage' | 'data' | 'general';
  icon: string | null;
  priority: number;
  created_at: string;
}

// Insert types (without id and timestamps)
export type UserSettingsInsert = Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>;
export type UserSettingsUpdate = Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type BatteryLogInsert = Omit<BatteryLog, 'id' | 'created_at'>;
export type StorageLogInsert = Omit<StorageLog, 'id' | 'created_at'>;
export type UsageLogInsert = Omit<UsageLog, 'id' | 'created_at'>;
