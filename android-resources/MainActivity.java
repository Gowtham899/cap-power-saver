package com.gowtham.smartsaver;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.work.WorkManager;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkRequest;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Set theme back to normal after splash screen
        setTheme(R.style.AppTheme_NoActionBar);
        
        super.onCreate(savedInstanceState);
        
        // Initialize background monitoring using WorkManager (non-blocking)
        Handler mainHandler = new Handler(Looper.getMainLooper());
        mainHandler.post(() -> initializeBackgroundTasks());
    }
    
    private void initializeBackgroundTasks() {
        // Use WorkManager for background tasks to prevent ANR
        try {
            // Battery monitoring - every 15 minutes (minimum WorkManager interval)
            Constraints batteryConstraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                .setRequiresBatteryNotLow(false)
                .build();
                
            PeriodicWorkRequest batteryWork = new PeriodicWorkRequest.Builder(
                BatteryMonitorWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(batteryConstraints)
                .build();
                
            // Storage monitoring - every 30 minutes
            PeriodicWorkRequest storageWork = new PeriodicWorkRequest.Builder(
                StorageMonitorWorker.class, 30, TimeUnit.MINUTES)
                .setConstraints(batteryConstraints)
                .build();
                
            // Data monitoring - every 15 minutes
            Constraints dataConstraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
                
            PeriodicWorkRequest dataWork = new PeriodicWorkRequest.Builder(
                DataMonitorWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(dataConstraints)
                .build();
            
            // Enqueue all work requests
            WorkManager workManager = WorkManager.getInstance(this);
            workManager.enqueue(batteryWork);
            workManager.enqueue(storageWork);
            workManager.enqueue(dataWork);
            
        } catch (Exception e) {
            // Log error but don't crash
            System.err.println("Failed to initialize background tasks: " + e.getMessage());
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Start foreground service for active monitoring when app is in foreground
        Intent serviceIntent = new Intent(this, MonitoringForegroundService.class);
        startForegroundService(serviceIntent);
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        // Stop foreground service when app goes to background
        Intent serviceIntent = new Intent(this, MonitoringForegroundService.class);
        stopService(serviceIntent);
    }
}