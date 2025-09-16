package com.gowtham.smartsaver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.work.WorkManager;
import androidx.work.PeriodicWorkRequest;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import java.util.concurrent.TimeUnit;

public class BootReceiver extends BroadcastReceiver {
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            
            // Restart background monitoring after boot
            try {
                restartBackgroundTasks(context);
            } catch (Exception e) {
                // Log error but don't crash
                System.err.println("Failed to restart background tasks: " + e.getMessage());
            }
        }
    }
    
    private void restartBackgroundTasks(Context context) {
        // Same WorkManager setup as in MainActivity
        Constraints batteryConstraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
            .setRequiresBatteryNotLow(false)
            .build();
            
        PeriodicWorkRequest batteryWork = new PeriodicWorkRequest.Builder(
            BatteryMonitorWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(batteryConstraints)
            .build();
            
        PeriodicWorkRequest storageWork = new PeriodicWorkRequest.Builder(
            StorageMonitorWorker.class, 30, TimeUnit.MINUTES)
            .setConstraints(batteryConstraints)
            .build();
            
        Constraints dataConstraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
            
        PeriodicWorkRequest dataWork = new PeriodicWorkRequest.Builder(
            DataMonitorWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(dataConstraints)
            .build();
        
        WorkManager workManager = WorkManager.getInstance(context);
        workManager.enqueue(batteryWork);
        workManager.enqueue(storageWork);
        workManager.enqueue(dataWork);
    }
}