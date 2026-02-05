package com.gowtham.smartsaver;

import android.content.Context;
import android.content.Intent; // Added
import android.app.PendingIntent; // Added
import android.provider.Settings; // Added
import android.os.Environment;
import android.os.StatFs;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class StorageMonitorWorker extends Worker {
    private static final String CHANNEL_ID = "storage_monitor";
    private static final int[] ALERT_LEVELS = {80, 85, 90, 95, 100};
    
    public StorageMonitorWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }
    
    @NonNull
    @Override
    public Result doWork() {
        try {
            // Get storage info (non-blocking)
            StatFs stat = new StatFs(Environment.getExternalStorageDirectory().getPath());
            long bytesAvailable = stat.getBlockSizeLong() * stat.getAvailableBlocksLong();
            long bytesTotal = stat.getBlockSizeLong() * stat.getBlockCountLong();
            long bytesUsed = bytesTotal - bytesAvailable;
            
            double percentageUsed = (double) bytesUsed / bytesTotal * 100;
            int storagePercentage = (int) Math.round(percentageUsed);
            
            // Check if this level requires an alert
            for (int alertLevel : ALERT_LEVELS) {
                if (storagePercentage >= alertLevel) {
                    sendStorageNotification(storagePercentage);
                    break;
                }
            }
            
            return Result.success();
        } catch (Exception e) {
            // Return failure but don't crash
            return Result.failure();
        }
    }
    
    private void sendStorageNotification(int percentage) {
        try {
            Context context = getApplicationContext();
            String title = "Storage " + percentage + "% Full";
            String message = "Your device storage is running low. Tap to manage files.";
            
            // 1. Create the Intent to open Storage Settings
            Intent intent = new Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS);
            
            // 2. Create the PendingIntent
            // FLAG_IMMUTABLE is required for Android 12+ (API 31+)
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_storage_alert) // Ensure this icon exists in your drawable folder
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent); // 3. Attach the intent here
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            
            // Note: For Android 13+, ensure you have requested the POST_NOTIFICATIONS permission 
            // in your activity before this worker runs, otherwise the notification won't show.
            try {
                notificationManager.notify(2000 + percentage, builder.build());
            } catch (SecurityException se) {
                // Handle missing permission gracefully
                System.err.println("Permission missing for notifications: " + se.getMessage());
            }
            
        } catch (Exception e) {
            System.err.println("Failed to send storage notification: " + e.getMessage());
        }
    }
}
