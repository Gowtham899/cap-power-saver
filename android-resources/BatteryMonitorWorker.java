package com.gowtham.smartsaver;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class BatteryMonitorWorker extends Worker {
    private static final String CHANNEL_ID = "battery_monitor";
    private static final int[] ALERT_LEVELS = {5, 10, 15, 20, 80, 85, 90, 95, 100};
    
    public BatteryMonitorWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }
    
    @NonNull
    @Override
    public Result doWork() {
        try {
            // Get battery info (non-blocking)
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = getApplicationContext().registerReceiver(null, ifilter);
            
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                int temperature = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1);
                
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                   status == BatteryManager.BATTERY_STATUS_FULL;
                
                float batteryPct = level * 100 / (float)scale;
                int batteryLevel = Math.round(batteryPct);
                
                // Temperature is in tenths of a degree Celsius
                float tempCelsius = temperature / 10.0f;
                
                // Check if this level requires an alert
                for (int alertLevel : ALERT_LEVELS) {
                    if (batteryLevel == alertLevel) {
                        sendBatteryNotification(batteryLevel, isCharging, tempCelsius);
                        break;
                    }
                }
                
                // Check for temperature alerts (overheating)
                if (tempCelsius >= 40.0f) {
                    sendTemperatureNotification(tempCelsius);
                }
            }
            
            return Result.success();
        } catch (Exception e) {
            // Return failure but don't crash
            return Result.failure();
        }
    }
    
    private void sendBatteryNotification(int level, boolean isCharging, float temperature) {
        try {
            String title = "Battery at " + level + "%";
            String message = isCharging ? 
                "Battery is charging (" + level + "%) - Temp: " + String.format("%.1f", temperature) + "°C" : 
                "Battery level: " + level + "% - Temp: " + String.format("%.1f", temperature) + "°C";
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_battery_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getApplicationContext());
            notificationManager.notify(1000 + level, builder.build());
            
        } catch (Exception e) {
            // Log error but don't crash
            System.err.println("Failed to send battery notification: " + e.getMessage());
        }
    }
    
    private void sendTemperatureNotification(float temperature) {
        try {
            String title = "🔥 Device Overheating!";
            String message;
            int priority = NotificationCompat.PRIORITY_HIGH;
            
            if (temperature >= 50.0f) {
                message = "CRITICAL: Device temperature is " + String.format("%.1f", temperature) + "°C. Stop using immediately!";
                priority = NotificationCompat.PRIORITY_MAX;
            } else if (temperature >= 45.0f) {
                message = "SEVERE: Device temperature is " + String.format("%.1f", temperature) + "°C. Reduce usage!";
                priority = NotificationCompat.PRIORITY_MAX;
            } else {
                message = "WARNING: Device temperature is " + String.format("%.1f", temperature) + "°C. Consider reducing usage.";
            }
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_battery_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(priority)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 500, 250, 500}); // Add vibration for temperature alerts
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getApplicationContext());
            notificationManager.notify(2000 + Math.round(temperature), builder.build());
            
        } catch (Exception e) {
            // Log error but don't crash
            System.err.println("Failed to send temperature notification: " + e.getMessage());
        }
    }
}