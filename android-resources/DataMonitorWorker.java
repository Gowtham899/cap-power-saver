package com.gowtham.smartsaver;

import android.content.Context;
import android.net.TrafficStats;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class DataMonitorWorker extends Worker {
    private static final String CHANNEL_ID = "data_monitor";
    private static final String PREFS_NAME = "data_usage_prefs";
    private static final String KEY_LAST_TOTAL = "last_total_bytes";
    private static final String KEY_SESSION_START = "session_start_bytes";
    private static final long MB_200 = 200 * 1024 * 1024; // 200MB in bytes
    
    public DataMonitorWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }
    
    @NonNull
    @Override
    public Result doWork() {
        try {
            // Get data usage (non-blocking)
            long totalBytes = TrafficStats.getTotalRxBytes() + TrafficStats.getTotalTxBytes();
            
            if (totalBytes == TrafficStats.UNSUPPORTED) {
                return Result.failure();
            }
            
            SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            long sessionStartBytes = prefs.getLong(KEY_SESSION_START, totalBytes);
            long lastTotalBytes = prefs.getLong(KEY_LAST_TOTAL, totalBytes);
            
            // If this is first run, set session start
            if (sessionStartBytes == 0) {
                sessionStartBytes = totalBytes;
                prefs.edit().putLong(KEY_SESSION_START, sessionStartBytes).apply();
            }
            
            long sessionUsage = totalBytes - sessionStartBytes;
            long newUsage = totalBytes - lastTotalBytes;
            
            // Check if we've crossed a 200MB threshold
            long sessionMB = sessionUsage / (1024 * 1024);
            long threshold200MB = (sessionMB / 200) * 200;
            
            if (threshold200MB > 0 && newUsage > MB_200) {
                sendDataUsageNotification((int) threshold200MB);
            }
            
            // Update last total
            prefs.edit().putLong(KEY_LAST_TOTAL, totalBytes).apply();
            
            return Result.success();
        } catch (Exception e) {
            return Result.failure();
        }
    }
    
    private void sendDataUsageNotification(int usedMB) {
        try {
            String title = "Data Usage Alert";
            String message = "You've used " + usedMB + "MB of mobile data this session.";
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_data_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getApplicationContext());
            notificationManager.notify(3000 + usedMB, builder.build());
            
        } catch (Exception e) {
            System.err.println("Failed to send data usage notification: " + e.getMessage());
        }
    }
}