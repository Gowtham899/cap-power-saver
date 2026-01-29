-- =====================================================
-- SECURITY FIX: Input Validation Constraints
-- =====================================================

-- 1. Add user_id column to all tables for proper RLS (linking to auth.users)
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.device_metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.alert_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.data_usage_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add CHECK constraints for device_metrics
ALTER TABLE public.device_metrics 
ADD CONSTRAINT valid_metric_value CHECK (current_value >= 0 AND current_value <= 100);

ALTER TABLE public.device_metrics 
ADD CONSTRAINT valid_metric_type CHECK (metric_type IN ('battery', 'storage', 'temperature', 'data'));

-- 3. Add CHECK constraints for notification_settings  
ALTER TABLE public.notification_settings
ADD CONSTRAINT valid_threshold CHECK (threshold_value >= 0 AND threshold_value <= 100);

ALTER TABLE public.notification_settings
ADD CONSTRAINT valid_interval CHECK (recurring_interval_seconds > 0 AND recurring_interval_seconds <= 86400);

ALTER TABLE public.notification_settings
ADD CONSTRAINT valid_alert_type CHECK (alert_type IN ('battery', 'storage', 'temperature', 'data', 'battery_low', 'battery_high', 'storage_warning'));

-- 4. Add CHECK constraints for alert_logs
ALTER TABLE public.alert_logs
ADD CONSTRAINT valid_alert_level CHECK (alert_level IN ('info', 'warning', 'critical'));

ALTER TABLE public.alert_logs
ADD CONSTRAINT valid_alert_current_value CHECK (current_value >= 0);

ALTER TABLE public.alert_logs
ADD CONSTRAINT valid_alert_threshold CHECK (threshold_value >= 0 AND threshold_value <= 100);

ALTER TABLE public.alert_logs
ADD CONSTRAINT valid_alert_type_check CHECK (alert_type IN ('battery', 'storage', 'temperature', 'data'));

-- 5. Add string length constraints
ALTER TABLE public.devices
ADD CONSTRAINT device_id_length CHECK (length(device_id) <= 100);

ALTER TABLE public.devices
ADD CONSTRAINT device_name_length CHECK (device_name IS NULL OR length(device_name) <= 200);

ALTER TABLE public.alert_logs
ADD CONSTRAINT message_length CHECK (length(message) <= 1000);

-- 6. Create indexes on user_id for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_device_metrics_user_id ON public.device_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id ON public.alert_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_usage_logs_user_id ON public.data_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- =====================================================
-- SECURITY FIX: Update RLS Policies to use auth.uid()
-- =====================================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Anyone can view alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Anyone can insert alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Anyone can view data usage" ON public.data_usage_logs;
DROP POLICY IF EXISTS "Anyone can insert data usage" ON public.data_usage_logs;
DROP POLICY IF EXISTS "Anyone can view metrics" ON public.device_metrics;
DROP POLICY IF EXISTS "Anyone can insert metrics" ON public.device_metrics;
DROP POLICY IF EXISTS "Anyone can view devices" ON public.devices;
DROP POLICY IF EXISTS "Anyone can register devices" ON public.devices;
DROP POLICY IF EXISTS "Anyone can update their device" ON public.devices;
DROP POLICY IF EXISTS "Anyone can manage notification settings" ON public.notification_settings;

-- Create secure RLS policies for devices
CREATE POLICY "Users can view own devices" 
ON public.devices FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can register own devices" 
ON public.devices FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" 
ON public.devices FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" 
ON public.devices FOR DELETE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for device_metrics
CREATE POLICY "Users can view own metrics" 
ON public.device_metrics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" 
ON public.device_metrics FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create secure RLS policies for alert_logs
CREATE POLICY "Users can view own alerts" 
ON public.alert_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" 
ON public.alert_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create secure RLS policies for data_usage_logs
CREATE POLICY "Users can view own data usage" 
ON public.data_usage_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data usage" 
ON public.data_usage_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create secure RLS policies for notification_settings
CREATE POLICY "Users can view own settings" 
ON public.notification_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings" 
ON public.notification_settings FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);