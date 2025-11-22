# Smart Saver Background Services Setup Guide

## Overview
This guide explains how to set up persistent background monitoring that works even when the app is closed.

## Architecture

### 1. PersistentMonitoringService
- **Runs 24/7** - Continues monitoring even when app is closed
- **Auto-restarts** - Automatically restarts if killed by system
- **Boot persistence** - Starts automatically after device reboot
- **Monitoring intervals**: Every 2 minutes in background
- **Alerts for**: Battery (5%, 10%, 15%, 20%, 80%, 85%, 90%, 95%, 100%), Temperature (40°C+), Storage (80%+)

### 2. Dual Service Architecture
- **App Open**: PersistentMonitoringService (2min) + MonitoringForegroundService (30sec)
- **App Closed**: Only PersistentMonitoringService (2min intervals)
- **Reboot**: BootReceiver automatically restarts PersistentMonitoringService

## Installation Steps

1. **Copy Android Files**
   ```
   android-resources/PersistentMonitoringService.java → android/app/src/main/java/com/gowtham/smartsaver/
   android-resources/BootReceiver.java → android/app/src/main/java/com/gowtham/smartsaver/
   android-resources/MainActivity.java → android/app/src/main/java/com/gowtham/smartsaver/
   android-resources/updated-AndroidManifest.xml → android/app/src/main/AndroidManifest.xml
   ```

2. **Build and Install**
   ```bash
   npx cap sync android
   npx cap run android
   ```

3. **Grant Permissions** (Critical for background operation)
   - Allow notifications
   - Disable battery optimization
   - Allow background activity
   - Enable auto-start (device-specific)

## Background Service Features

### Battery Monitoring
- **Alert Levels**: 5%, 10%, 15%, 20% (low) and 80%, 85%, 90%, 95%, 100% (high)
- **Temperature Monitoring**: Alerts at 40°C, critical alerts at 45°C+
- **Charging Status**: Displays charging/discharging with temperature

### Storage Monitoring
- **Alert Levels**: 80%, 85%, 90%, 95%, 100% storage used
- **Real-time Monitoring**: Checks available storage space continuously

### Notification System
- **Persistent Service Notification**: Shows service is running
- **Battery Alerts**: High priority with sound, vibration
- **Temperature Alerts**: Maximum priority with alarm sound, full-screen intent for critical temperatures
- **Storage Alerts**: High priority with sound, vibration

### Alert Sounds (New!)
- **Battery Alerts**: System notification sound with medium vibration
- **Storage Alerts**: System notification sound with quick vibration pulses
- **Temperature Alerts**: System alarm sound (louder) with long vibration pulses
- **Sound Types**: Notifications use standard alert sound, temperature uses alarm ringtone

### Power Management
- **Wake Lock**: Prevents device sleep during monitoring
- **Battery Optimization Bypass**: Requests exemption from battery optimization
- **System-level Service**: Uses FOREGROUND_SERVICE_SYSTEM_EXEMPTED

## User Instructions

### Essential Setup (Must Do)
1. **Disable Battery Optimization**
   - Settings → Battery → Battery Optimization
   - Find "Smart Saver" → Don't Optimize

2. **Allow Background Activity**
   - Settings → Apps → Smart Saver → Battery
   - Enable "Allow background activity"

3. **Enable Auto-start** (Samsung, Xiaomi, etc.)
   - Settings → Apps → Smart Saver → Permissions
   - Enable "Auto-start" or "Start in background"

### Verification
- Look for persistent notification "Smart Saver Running"
- Battery alerts should appear at configured levels
- Service should restart after device reboot

## Technical Details

### Service Lifecycle
1. **App Launch**: MainActivity starts PersistentMonitoringService
2. **App Close**: PersistentMonitoringService continues running
3. **System Kill**: Service restarts automatically (START_STICKY)
4. **Device Reboot**: BootReceiver starts PersistentMonitoringService

### Alert Thresholds
```
Battery Levels: [5, 10, 15, 20, 80, 85, 90, 95, 100]%
Temperature: 40°C (warning), 45°C (critical), 50°C (severe)
Storage: [80, 85, 90, 95, 100]% used
```

### Notification Channels
- **persistent_monitoring**: Service status (low priority)
- **battery_alerts**: Battery notifications (high priority)
- **temperature_alerts**: Overheating alerts (max priority)
- **storage_alerts**: Storage warnings (high priority)

## Troubleshooting

### Service Not Running
1. Check battery optimization settings
2. Verify background activity permission
3. Ensure auto-start is enabled
4. Restart the app to reinitialize service

### No Alerts
1. Check notification permissions
2. Verify alert channels are enabled
3. Test with extreme battery levels
4. Check if service notification is visible

### Service Stops After Time
1. Disable battery optimization (most common cause)
2. Enable auto-start for the app
3. Add app to protected apps list
4. Disable adaptive battery for the app

### After Device Reboot
1. Service should start automatically via BootReceiver
2. If not starting, check RECEIVE_BOOT_COMPLETED permission
3. Manually open app once to reinitialize if needed

## Battery Optimization Settings by Manufacturer

### Samsung
- Settings → Device Care → Battery → More Battery Settings → Optimize Settings → Apps not to sleep

### Xiaomi/MIUI
- Settings → Apps → Manage Apps → Smart Saver → Battery Saver → No restrictions

### Huawei/EMUI
- Settings → Apps → Smart Saver → Battery → App Launch → Manage manually (enable all)

### OnePlus/OxygenOS
- Settings → Battery → Battery Optimization → Smart Saver → Don't optimize

### Oppo/ColorOS
- Settings → Battery → Power Saving Exclusions → Smart Saver

This background service implementation ensures continuous monitoring and alerting regardless of app state, providing true 24/7 device monitoring capabilities.