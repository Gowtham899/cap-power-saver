package com.gowtham.smartsaver;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.StatFs;
import android.os.Environment;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PersistentMonitoringService extends Service {
    private static final int NOTIFICATION_ID = 2;
    private static final String CHANNEL_ID = "persistent_monitoring";
    private static final String BATTERY_CHANNEL_ID = "battery_alerts";
    private static final String STORAGE_CHANNEL_ID = "storage_alerts";
    private static final String TEMPERATURE_CHANNEL_ID = "temperature_alerts";
    
    private ExecutorService executorService;
    private Handler mainHandler;
    private Runnable monitoringRunnable;
    private PowerManager.WakeLock wakeLock;
    
    // Alert thresholds
    private static final int[] BATTERY_ALERT_LEVELS = {5, 10, 15, 20, 80, 85, 90, 95, 100};
    private static final int[] STORAGE_ALERT_LEVELS = {80, 85, 90, 95, 100};
    private static final float TEMPERATURE_WARNING = 40.0f;
    private static final float TEMPERATURE_CRITICAL = 45.0f;
    
    // Last alert levels to prevent spam
    private int lastBatteryAlert = -1;
    private int lastStorageAlert = -1;
    private int lastTemperatureAlert = -1;
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Create executor for background tasks
        executorService = Executors.newSingleThreadExecutor();
        mainHandler = new Handler(Looper.getMainLooper());
        
        // Acquire wake lock to keep service running
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SmartSaver:MonitoringService");
        wakeLock.acquire();
        
        // Create notification channels
        createNotificationChannels();
        
        // Create monitoring runnable
        monitoringRunnable = new Runnable() {
            @Override
            public void run() {
                // Execute monitoring in background thread
                executorService.execute(() -> {
                    try {
                        performBackgroundMonitoring();
                        
                        // Schedule next run in 2 minutes for background monitoring
                        mainHandler.postDelayed(this, 120000); // 2 minutes
                    } catch (Exception e) {
                        System.err.println("Background monitoring error: " + e.getMessage());
                        
                        // Still schedule next run with longer delay on error
                        mainHandler.postDelayed(this, 300000); // 5 minutes on error
                    }
                });
            }
        };
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Start foreground notification
        Notification notification = createPersistentNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        // Start monitoring
        mainHandler.post(monitoringRunnable);
        
        // Return START_STICKY to restart if killed by system
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        
        // Clean up resources
        if (mainHandler != null && monitoringRunnable != null) {
            mainHandler.removeCallbacks(monitoringRunnable);
        }
        
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        // Restart service automatically
        Intent restartIntent = new Intent(getApplicationContext(), this.getClass());
        restartIntent.setPackage(getPackageName());
        startService(restartIntent);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null; // We don't provide binding
    }
    
    private void createNotificationChannels() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        
        // Persistent service channel
        NotificationChannel serviceChannel = new NotificationChannel(
            CHANNEL_ID,
            "Smart Saver Background Service",
            NotificationManager.IMPORTANCE_LOW
        );
        serviceChannel.setDescription("Background monitoring service");
        serviceChannel.setShowBadge(false);
        manager.createNotificationChannel(serviceChannel);
        
        // Battery alerts channel
        NotificationChannel batteryChannel = new NotificationChannel(
            BATTERY_CHANNEL_ID,
            "Battery Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        batteryChannel.setDescription("Battery level and charging notifications");
        batteryChannel.enableVibration(true);
        manager.createNotificationChannel(batteryChannel);
        
        // Storage alerts channel
        NotificationChannel storageChannel = new NotificationChannel(
            STORAGE_CHANNEL_ID,
            "Storage Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        storageChannel.setDescription("Storage space notifications");
        storageChannel.enableVibration(true);
        manager.createNotificationChannel(storageChannel);
        
        // Temperature alerts channel
        NotificationChannel tempChannel = new NotificationChannel(
            TEMPERATURE_CHANNEL_ID,
            "Temperature Alerts",
            NotificationManager.IMPORTANCE_MAX
        );
        tempChannel.setDescription("Device overheating notifications");
        tempChannel.enableVibration(true);
        tempChannel.setVibrationPattern(new long[]{0, 500, 250, 500});
        manager.createNotificationChannel(tempChannel);
    }
    
    private Notification createPersistentNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Smart Saver Running")
            .setContentText("Monitoring battery, storage, and temperature in background")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .build();
    }
    
    private void performBackgroundMonitoring() {
        try {
            // Monitor battery and temperature
            monitorBatteryAndTemperature();
            
            // Monitor storage
            monitorStorage();
            
            // Update persistent notification with current status
            updatePersistentNotification();
            
        } catch (Exception e) {
            System.err.println("Error in background monitoring: " + e.getMessage());
        }
    }
    
    private void monitorBatteryAndTemperature() {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = registerReceiver(null, ifilter);
            
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                int temperature = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1);
                
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                   status == BatteryManager.BATTERY_STATUS_FULL;
                
                int batteryLevel = Math.round(level * 100f / scale);
                float tempCelsius = temperature / 10.0f;
                
                // Check battery alerts
                for (int alertLevel : BATTERY_ALERT_LEVELS) {
                    if (batteryLevel == alertLevel && lastBatteryAlert != alertLevel) {
                        sendBatteryAlert(batteryLevel, isCharging, tempCelsius);
                        lastBatteryAlert = alertLevel;
                        break;
                    }
                }
                
                // Check temperature alerts
                if (tempCelsius >= TEMPERATURE_WARNING) {
                    int tempAlert = (int) tempCelsius;
                    if (tempAlert != lastTemperatureAlert && (tempAlert % 5 == 0 || tempCelsius >= TEMPERATURE_CRITICAL)) {
                        sendTemperatureAlert(tempCelsius);
                        lastTemperatureAlert = tempAlert;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Battery monitoring error: " + e.getMessage());
        }
    }
    
    private void monitorStorage() {
        try {
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            long totalBytes = stat.getTotalBytes();
            long availableBytes = stat.getAvailableBytes();
            long usedBytes = totalBytes - availableBytes;
            
            int usedPercentage = (int) ((usedBytes * 100L) / totalBytes);
            
            // Check storage alerts
            for (int alertLevel : STORAGE_ALERT_LEVELS) {
                if (usedPercentage >= alertLevel && lastStorageAlert != alertLevel) {
                    sendStorageAlert(usedPercentage);
                    lastStorageAlert = alertLevel;
                    break;
                }
            }
        } catch (Exception e) {
            System.err.println("Storage monitoring error: " + e.getMessage());
        }
    }
    
    private void sendBatteryAlert(int level, boolean isCharging, float temperature) {
        try {
            String title = "Battery Alert: " + level + "%";
            String message = (isCharging ? "Charging" : "Discharging") + 
                           " • Temperature: " + String.format("%.1f°C", temperature);
            
            String channelId = BATTERY_CHANNEL_ID;
            int priority = NotificationCompat.PRIORITY_HIGH;
            
            // Higher priority for critical levels
            if (level <= 10 || level >= 95) {
                priority = NotificationCompat.PRIORITY_MAX;
            }
            
            sendAlert(title, message, channelId, priority, 3000 + level);
        } catch (Exception e) {
            System.err.println("Failed to send battery alert: " + e.getMessage());
        }
    }
    
    private void sendTemperatureAlert(float temperature) {
        try {
            String title = "🔥 Temperature Alert!";
            String message;
            int priority = NotificationCompat.PRIORITY_MAX;
            
            if (temperature >= 50.0f) {
                message = "CRITICAL: " + String.format("%.1f°C", temperature) + " - Stop using device immediately!";
            } else if (temperature >= TEMPERATURE_CRITICAL) {
                message = "SEVERE: " + String.format("%.1f°C", temperature) + " - Device overheating! Reduce usage.";
            } else {
                message = "WARNING: " + String.format("%.1f°C", temperature) + " - Device is getting hot.";
                priority = NotificationCompat.PRIORITY_HIGH;
            }
            
            sendAlert(title, message, TEMPERATURE_CHANNEL_ID, priority, 4000 + (int)temperature);
        } catch (Exception e) {
            System.err.println("Failed to send temperature alert: " + e.getMessage());
        }
    }
    
    private void sendStorageAlert(int percentage) {
        try {
            String title = "Storage Alert: " + percentage + "% Full";
            String message = "Device storage is running low. Consider cleaning up files.";
            
            sendAlert(title, message, STORAGE_CHANNEL_ID, NotificationCompat.PRIORITY_HIGH, 5000 + percentage);
        } catch (Exception e) {
            System.err.println("Failed to send storage alert: " + e.getMessage());
        }
    }
    
    private void sendAlert(String title, String message, String channelId, int priority, int notificationId) {
        try {
            Intent notificationIntent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(R.drawable.ic_battery_alert)
                .setContentIntent(pendingIntent)
                .setPriority(priority)
                .setAutoCancel(true);
                
            // Add vibration for high priority alerts
            if (priority >= NotificationCompat.PRIORITY_HIGH) {
                builder.setVibrate(new long[]{0, 500, 250, 500});
            }
            
            // Full screen intent for critical temperature alerts
            if (channelId.equals(TEMPERATURE_CHANNEL_ID) && priority == NotificationCompat.PRIORITY_MAX) {
                builder.setFullScreenIntent(pendingIntent, true);
            }
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
            notificationManager.notify(notificationId, builder.build());
            
        } catch (Exception e) {
            System.err.println("Failed to send notification: " + e.getMessage());
        }
    }
    
    private void updatePersistentNotification() {
        try {
            // Get current battery level for status update
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = registerReceiver(null, ifilter);
            
            String statusText = "Monitoring in background";
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int batteryLevel = Math.round(level * 100f / scale);
                statusText = "Battery: " + batteryLevel + "% • Monitoring active";
            }
            
            Intent notificationIntent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);
            
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Smart Saver Running")
                .setContentText(statusText)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setShowWhen(false)
                .build();
                
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.notify(NOTIFICATION_ID, notification);
            
        } catch (Exception e) {
            System.err.println("Failed to update persistent notification: " + e.getMessage());
        }
    }
}
