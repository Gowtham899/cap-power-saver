package com.gowtham.smartsaver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            Intent.ACTION_PACKAGE_REPLACED.equals(action)) {
            
            try {
                // Start persistent monitoring service on boot
                Intent serviceIntent = new Intent(context, PersistentMonitoringService.class);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
                
                System.out.println("Smart Saver: Background monitoring started on boot");
                
            } catch (Exception e) {
                System.err.println("Failed to start monitoring service on boot: " + e.getMessage());
            }
        }
    }
}