# Smart Saver - ANR Testing and Troubleshooting Guide

## Overview
This guide helps you test and fix ANR (Application Not Responding) issues in the Smart Saver Android app.

## ANR Fix Implementation

### Key Changes Made:
1. **WorkManager Integration**: Background tasks now use Android WorkManager instead of setInterval
2. **Foreground Service**: Active monitoring when app is in foreground
3. **Non-blocking Operations**: All heavy operations moved off main thread
4. **Proper Lifecycle Management**: Services respect Android app lifecycle
5. **Error Handling**: Graceful error handling to prevent crashes

## Testing Steps

### 1. Pre-Testing Setup
```bash
# Export to GitHub and pull locally
git pull origin main

# Install dependencies
npm install

# Add Android platform
npx cap add android

# Copy Android resources (follow android-resources/README.md)
# Then sync
npx cap sync android
```

### 2. Copy Required Files
After `npx cap add android`, copy these files:

**Java Files:**
- Copy `android-resources/*.java` to `android/app/src/main/java/com/gowtham/smartsaver/`

**Resources:**
```bash
# Copy drawable resources
cp android-resources/drawable/* android/app/src/main/res/drawable/

# Copy values resources
cp android-resources/values/* android/app/src/main/res/values/
cp android-resources/values-night/* android/app/src/main/res/values-night/

# Update AndroidManifest.xml using android-resources/updated-AndroidManifest.xml
# Update build.gradle using android-resources/app/build.gradle
```

### 3. Testing for ANR Issues

#### A. Development Testing (Android Studio)
```bash
# Build and run
npx cap run android

# Monitor logcat for issues
adb logcat | grep -E "(ANR|WATCHDOG|NOT RESPONDING)"
```

#### B. ANR Detection Tools
1. **Enable Developer Options** on your test device
2. **Show ANRs** in Developer Options
3. **Use Android Studio Profiler**:
   - CPU Profiler to monitor main thread
   - Memory Profiler to check for leaks

#### C. Stress Testing
Test these scenarios that previously caused ANRs:

1. **Battery Level Changes**:
   ```bash
   # Simulate battery level changes
   adb shell dumpsys battery set level 20
   adb shell dumpsys battery set level 85
   adb shell dumpsys battery set level 100
   ```

2. **Background/Foreground Switching**:
   - Rapidly switch between apps
   - Put app in background for extended periods
   - Bring app back to foreground

3. **Storage Alerts**:
   - Fill device storage to trigger alerts
   - Monitor if app remains responsive

4. **Data Usage**:
   - Use mobile data heavily
   - Check if monitoring remains stable

### 4. Performance Monitoring

#### A. Monitor Main Thread
```bash
# Check main thread usage
adb shell top -p $(adb shell ps | grep smartsaver | awk '{print $2}')
```

#### B. Check WorkManager Tasks
```bash
# Monitor WorkManager jobs
adb shell dumpsys jobscheduler | grep smartsaver
```

#### C. Memory Usage
```bash
# Monitor memory usage
adb shell dumpsys meminfo com.gowtham.smartsaver
```

### 5. Expected Behavior After Fix

#### ✅ What Should Work:
- App launches without freezing during splash screen
- Background monitoring continues without blocking UI
- Notifications appear without causing ANR
- App remains responsive during alerts
- Battery/storage/data monitoring works smoothly
- App survives background/foreground transitions

#### ❌ What Should NOT Happen:
- "System UI not responding" dialog
- App freezing during startup
- Long delays when interacting with UI
- Crashes during background tasks
- Excessive battery drain from background services

### 6. Common Issues and Solutions

#### Issue: WorkManager jobs not running
**Solution:**
```bash
# Check if WorkManager is properly initialized
adb shell dumpsys jobscheduler | grep androidx.work
```

#### Issue: Notifications not appearing
**Solution:**
```bash
# Check notification permissions
adb shell dumpsys notification | grep smartsaver
```

#### Issue: App still has ANR
**Solution:**
1. Check logcat for specific errors
2. Use Android Studio Profiler to identify blocking operations
3. Ensure all heavy operations are in background threads

### 7. Emulator vs Physical Device Testing

#### Emulator Testing:
```bash
# Create AVD with appropriate specs
# Minimum: API 21, 2GB RAM, x86_64 architecture
npx cap run android --target=emulator_name
```

#### Physical Device Testing:
```bash
# Enable USB debugging
# Connect device
adb devices
npx cap run android --target=device_id
```

### 8. Performance Benchmarks

#### Before Fix (Known Issues):
- App startup: 5-10 seconds with freezing
- Background task intervals: Every 30 seconds (blocking)
- Memory usage: High due to multiple setInterval
- ANR frequency: High during alerts

#### After Fix (Expected):
- App startup: 2-3 seconds, smooth
- Background tasks: WorkManager (15-30 min intervals)
- Memory usage: Optimized with proper cleanup
- ANR frequency: Zero

### 9. Final Verification

Run this comprehensive test:

```bash
# 1. Clean install
adb uninstall com.gowtham.smartsaver
npx cap run android

# 2. Background testing
# Put app in background for 1 hour
# Check if notifications still work

# 3. Stress test
# Rapidly change battery levels
# Fill storage
# Generate data usage

# 4. Lifecycle test
# Kill and restart app multiple times
# Check if monitoring resumes properly
```

## Troubleshooting Commands

```bash
# Clear app data
adb shell pm clear com.gowtham.smartsaver

# Restart ADB if issues
adb kill-server && adb start-server

# Check running services
adb shell dumpsys activity services | grep smartsaver

# Monitor real-time logs
adb logcat -s SmartSaver:V AndroidRuntime:E
```

## Success Criteria
- ✅ No ANR dialogs during normal usage
- ✅ Smooth app startup and navigation
- ✅ Background monitoring works without blocking UI
- ✅ Notifications appear timely without causing freezes
- ✅ App survives extended background periods
- ✅ Memory usage remains stable over time