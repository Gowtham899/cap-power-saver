-- Add unique constraint for notification_settings to enable upsert
ALTER TABLE public.notification_settings 
ADD CONSTRAINT notification_settings_device_alert_unique 
UNIQUE (device_id, alert_type);

-- Add unique constraint for devices to enable upsert
ALTER TABLE public.devices 
ADD CONSTRAINT devices_device_id_unique 
UNIQUE (device_id);