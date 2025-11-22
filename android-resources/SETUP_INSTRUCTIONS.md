# Background Services Setup Instructions

## Quick Setup Guide

Follow these steps to enable background monitoring with alert sounds:

### 1. Copy Android Files to Your Project

After running `npx cap sync android`, copy these files to your Android project:

```
android-resources/PersistentMonitoringService.java → android/app/src/main/java/com/gowtham/smartsaver/
android-resources/BootReceiver.java → android/app/src/main/java/com/gowtham/smartsaver/
android-resources/MainActivity.java → android/app/src/main/java/com/gowtham/smartsaver/
```

### 2. Update AndroidManifest.xml

Merge the contents from `android-resources/updated-AndroidManifest.xml` into your `android/app/src/main/AndroidManifest.xml`

Key additions needed:
- Permissions for WAKE_LOCK, RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE
- Service declarations for PersistentMonitoringService
- Receiver declaration for BootReceiver

### 3. Build and Run

```bash
# Build the web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

### 4. Grant Permissions (Critical!)

When the app first launches, you MUST grant these permissions:

1. **Notifications** - Allow the app to show notifications
2. **Battery Optimization** - Disable battery optimization for Smart Saver
   - Settings → Battery → Battery Optimization → Smart Saver → Don't Optimize
3. **Background Activity** - Allow background activity
   - Settings → Apps → Smart Saver → Battery → Allow background activity
4. **Auto-start** (device-specific)
   - Settings → Apps → Smart Saver → Permissions → Auto-start → Enable

## Alert Sound Features

The background service now includes:

✅ **Sound Alerts**
- Battery alerts: System notification sound
- Temperature alerts: System alarm sound (louder)
- Storage alerts: System notification sound

✅ **Vibration Patterns**
- Battery: Short pulses (500ms - 200ms - 500ms)
- Storage: Quick pulses (300ms - 100ms - 300ms)
- Temperature: Long pulses (1000ms - 500ms - 1000ms)

✅ **Notification Priorities**
- Low battery/high battery: High priority
- Temperature warnings: High priority + alarm sound
- Storage warnings: High priority

## Monitoring Features

### Battery Monitoring
- Alerts at: 5%, 10%, 15%, 20%, 80%, 85%, 90%, 95%, 100%
- Temperature monitoring: Alerts at 40°C, critical at 45°C+
- Checks every 2 minutes in background

### Storage Monitoring
- Alerts at: 80%, 85%, 90%, 95%, 100% used
- Real-time space monitoring

### Background Operation
- Runs 24/7 even when app is closed
- Auto-restarts if killed by system
- Starts automatically after device reboot
- Uses foreground service for reliability

## Troubleshooting

### No Alerts Appearing
1. Check if notifications are enabled for Smart Saver
2. Verify notification channels are not muted
3. Ensure battery optimization is disabled
4. Check if sound is enabled on device

### Service Stops Running
1. Disable battery optimization (most common issue)
2. Enable auto-start for the app
3. Add app to protected apps list (device-specific)
4. Restart the app to reinitialize service

### No Sound on Alerts
1. Check device is not in silent/DND mode
2. Verify notification channels have sound enabled
3. Check app notification settings allow sound
4. Ensure device volume is up

### After Device Reboot
- Service should start automatically via BootReceiver
- If not starting, check RECEIVE_BOOT_COMPLETED permission
- Manually open app once to reinitialize

## Device-Specific Settings

### Samsung
Settings → Device Care → Battery → More Battery Settings → Apps not to sleep

### Xiaomi/MIUI
Settings → Apps → Manage Apps → Smart Saver → Battery Saver → No restrictions

### Huawei/EMUI
Settings → Apps → Smart Saver → Battery → App Launch → Manage manually (enable all)

### OnePlus
Settings → Battery → Battery Optimization → Smart Saver → Don't optimize

### Oppo/ColorOS
Settings → Battery → Power Saving Exclusions → Smart Saver

## Testing the Setup

1. **Test Notifications**
   - Trigger a battery alert by using the app
   - Check if sound and vibration work

2. **Test Background Service**
   - Close the app completely
   - Wait 2-3 minutes
   - Check if "Smart Saver Running" notification appears

3. **Test After Reboot**
   - Restart your device
   - Check if service starts automatically
   - Verify monitoring is active

## Technical Details

- **Monitoring Interval**: 2 minutes in background
- **Service Type**: Foreground service with SYSTEM_EXEMPTED
- **Wake Lock**: Partial wake lock during monitoring
- **Notification Channels**: 4 channels (service, battery, storage, temperature)
- **Auto-restart**: START_STICKY for automatic recovery

For complete technical documentation, see `BACKGROUND_SERVICE_GUIDE.md`
