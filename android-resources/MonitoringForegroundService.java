package com.gowtham.smartsaver;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MonitoringForegroundService extends Service {
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "monitoring_service";
    private ExecutorService executorService;
    private Handler mainHandler;
    private Runnable monitoringRunnable;
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Create executor for background tasks
        executorService = Executors.newSingleThreadExecutor();
        mainHandler = new Handler(Looper.getMainLooper());
        
        // Create notification channel
        createNotificationChannel();
        
        // Create monitoring runnable
        monitoringRunnable = new Runnable() {
            @Override
            public void run() {
                // Execute monitoring in background thread
                executorService.execute(() -> {
                    try {
                        // Perform lightweight monitoring tasks here
                        // This runs every 30 seconds when app is in foreground
                        performMonitoring();
                        
                        // Schedule next run on main thread
                        mainHandler.postDelayed(this, 30000);
                    } catch (Exception e) {
                        // Log error but don't crash
                        System.err.println("Monitoring error: " + e.getMessage());
                        
                        // Still schedule next run
                        mainHandler.postDelayed(this, 30000);
                    }
                });
            }
        };
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Start foreground notification
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        // Start monitoring
        mainHandler.post(monitoringRunnable);
        
        // Return START_STICKY to restart if killed
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
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null; // We don't provide binding
    }
    
    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Smart Saver Monitoring",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Background monitoring for Smart Saver");
        channel.setShowBadge(false);
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }
    
    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Smart Saver Active")
            .setContentText("Monitoring battery, storage, and data usage")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }
    
    private void performMonitoring() {
        // Lightweight monitoring operations
        // This method runs in background thread to avoid ANR
        
        // Note: Actual monitoring logic should be moved here from deviceService.ts
        // for foreground monitoring when app is active
    }
}