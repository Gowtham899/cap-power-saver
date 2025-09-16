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
                
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                   status == BatteryManager.BATTERY_STATUS_FULL;
                
                float batteryPct = level * 100 / (float)scale;
                int batteryLevel = Math.round(batteryPct);
                
                // Check if this level requires an alert
                for (int alertLevel : ALERT_LEVELS) {
                    if (batteryLevel == alertLevel) {
                        sendBatteryNotification(batteryLevel, isCharging);
                        break;
                    }
                }
            }
            
            return Result.success();
        } catch (Exception e) {
            // Return failure but don't crash
            return Result.failure();
        }
    }
    
    private void sendBatteryNotification(int level, boolean isCharging) {
        try {
            String title = "Battery at " + level + "%";
            String message = isCharging ? 
                "Battery is charging (" + level + "%)" : 
                "Battery level: " + level + "%";
            
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
}