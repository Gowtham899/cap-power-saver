-- =============================================
-- 1. USER PROFILES & SETTINGS TABLE
-- =============================================
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    -- Battery alert thresholds
    battery_high_threshold INTEGER NOT NULL DEFAULT 85,
    battery_critical_threshold INTEGER NOT NULL DEFAULT 90,
    battery_low_threshold INTEGER NOT NULL DEFAULT 15,
    battery_critical_low_threshold INTEGER NOT NULL DEFAULT 5,
    -- Data usage settings
    data_limit_mb FLOAT NOT NULL DEFAULT 1000,
    data_alert_interval_mb FLOAT NOT NULL DEFAULT 200,
    -- Notification preferences
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    vibration_enabled BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT unique_user_settings UNIQUE (user_id),
    CONSTRAINT valid_battery_high CHECK (battery_high_threshold BETWEEN 50 AND 100),
    CONSTRAINT valid_battery_critical CHECK (battery_critical_threshold BETWEEN 50 AND 100),
    CONSTRAINT valid_battery_low CHECK (battery_low_threshold BETWEEN 1 AND 50),
    CONSTRAINT valid_battery_critical_low CHECK (battery_critical_low_threshold BETWEEN 1 AND 50),
    CONSTRAINT valid_data_limit CHECK (data_limit_mb > 0)
);

-- =============================================
-- 2. BATTERY LOGS TABLE (For History/Graphs)
-- =============================================
CREATE TABLE public.battery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    battery_level INTEGER NOT NULL,
    temperature FLOAT,
    is_charging BOOLEAN NOT NULL DEFAULT false,
    health_status TEXT NOT NULL DEFAULT 'good',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT valid_battery_level CHECK (battery_level BETWEEN 0 AND 100),
    CONSTRAINT valid_health_status CHECK (health_status IN ('good', 'fair', 'poor', 'unknown'))
);

-- =============================================
-- 3. STORAGE LOGS TABLE
-- =============================================
CREATE TABLE public.storage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    total_storage BIGINT NOT NULL,
    used_storage BIGINT NOT NULL,
    available_storage BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT valid_storage_values CHECK (used_storage >= 0 AND available_storage >= 0 AND total_storage >= 0)
);

-- =============================================
-- 4. DATA USAGE LOGS TABLE
-- =============================================
CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    mobile_data_used FLOAT NOT NULL DEFAULT 0,
    wifi_data_used FLOAT NOT NULL DEFAULT 0,
    limit_set FLOAT NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT valid_data_values CHECK (mobile_data_used >= 0 AND wifi_data_used >= 0 AND limit_set > 0)
);

-- =============================================
-- 5. HEALTH TIPS TABLE (Public Read)
-- =============================================
CREATE TABLE public.health_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('battery', 'storage', 'data', 'general'))
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX idx_battery_logs_user_id ON public.battery_logs(user_id);
CREATE INDEX idx_battery_logs_created_at ON public.battery_logs(created_at DESC);
CREATE INDEX idx_storage_logs_user_id ON public.storage_logs(user_id);
CREATE INDEX idx_storage_logs_created_at ON public.storage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX idx_health_tips_category ON public.health_tips(category);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - USER SETTINGS
-- =============================================
CREATE POLICY "Users can view own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - BATTERY LOGS
-- =============================================
CREATE POLICY "Users can view own battery logs"
ON public.battery_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own battery logs"
ON public.battery_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - STORAGE LOGS
-- =============================================
CREATE POLICY "Users can view own storage logs"
ON public.storage_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage logs"
ON public.storage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - USAGE LOGS
-- =============================================
CREATE POLICY "Users can view own usage logs"
ON public.usage_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
ON public.usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - HEALTH TIPS (Public Read)
-- =============================================
CREATE POLICY "Anyone can view health tips"
ON public.health_tips FOR SELECT
USING (true);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED DATA - HEALTH TIPS
-- =============================================
INSERT INTO public.health_tips (title, content, category, icon, priority) VALUES
-- Battery Tips
('Unplug at 85-90%', 'Consistently charging to 100% degrades lithium-ion batteries faster. Unplug when you reach 85-90% to extend battery lifespan by up to 2 years.', 'battery', 'battery', 10),
('Avoid Deep Discharge', 'Don''t let your battery drop below 15%. Frequent deep discharges stress the battery cells and reduce overall capacity over time.', 'battery', 'battery-low', 9),
('Keep Cool While Charging', 'Heat is the enemy of batteries. Remove your phone case while charging and avoid using intensive apps during charge cycles.', 'battery', 'thermometer', 8),
('Use Original Charger', 'Third-party chargers may not have proper voltage regulation. Use certified chargers to prevent battery damage and ensure safe charging speeds.', 'battery', 'plug', 7),
('Enable Battery Optimization', 'Turn on adaptive battery features in your settings. Your phone will learn your usage patterns and optimize power consumption automatically.', 'battery', 'settings', 6),

-- Storage Tips
('Clear App Cache Weekly', 'Cached data accumulates quickly. Clear your app caches weekly to free up storage and potentially fix app glitches.', 'storage', 'trash', 10),
('Move Media to Cloud', 'Photos and videos consume the most storage. Enable auto-backup to Google Photos or iCloud and delete local copies.', 'storage', 'cloud', 9),
('Uninstall Unused Apps', 'Apps you haven''t used in 30 days are taking up valuable space. Review and uninstall to keep your device running smoothly.', 'storage', 'app-window', 8),
('Keep 15% Storage Free', 'Your phone needs free space to function properly. When storage drops below 15%, performance significantly degrades.', 'storage', 'hard-drive', 7),
('Use Lite App Versions', 'Many popular apps have "Lite" versions that use 50-90% less storage while providing core functionality.', 'storage', 'minimize', 6),

-- Data Usage Tips
('Use WiFi When Possible', 'Connect to trusted WiFi networks to save your mobile data for when you really need it.', 'data', 'wifi', 10),
('Enable Data Saver Mode', 'Data saver mode restricts background data usage and can reduce consumption by up to 40%.', 'data', 'arrow-down', 9),
('Download Content on WiFi', 'Pre-download music, podcasts, and videos on WiFi before leaving home. Most streaming apps support offline mode.', 'data', 'download', 8),
('Monitor Background Apps', 'Some apps consume data in the background. Check data usage per app and restrict heavy consumers.', 'data', 'activity', 7),
('Set Usage Alerts at 200MB', 'Configure alerts at 200MB intervals to stay aware of your consumption and avoid overage charges.', 'data', 'bell', 6),

-- General Tips
('Restart Weekly', 'Restarting your phone weekly clears temporary files, refreshes system processes, and can improve overall performance.', 'general', 'refresh-cw', 10),
('Keep System Updated', 'Software updates include security patches and performance improvements. Install them promptly for optimal device health.', 'general', 'shield-check', 9),
('Manage App Permissions', 'Review app permissions regularly. Revoke unnecessary access to location, camera, and microphone for better security and battery life.', 'general', 'lock', 8),
('Clean Ports Regularly', 'Dust in charging ports can cause slow charging or connection issues. Gently clean with a soft brush or compressed air.', 'general', 'zap', 7);