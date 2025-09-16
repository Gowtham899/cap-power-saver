package com.gowtham.smartsaver;

import android.content.Context;
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
            String title = "Storage " + percentage + "% Full";
            String message = "Your device storage is running low. Consider cleaning up files.";
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_storage_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getApplicationContext());
            notificationManager.notify(2000 + percentage, builder.build());
            
        } catch (Exception e) {
            System.err.println("Failed to send storage notification: " + e.getMessage());
        }
    }
}