import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gowtham.smartsaver',
  appName: 'Smart saver',
  webDir: 'dist',
  server: {
    url: 'https://8d915f61-7b05-4570-b15d-b3fd54ebbfaa.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    Device: {
      androidPermissions: [
        "android.permission.BATTERY_STATS",
      ]
    },
    Network: {
      androidPermissions: [
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_WIFI_STATE"
      ]
    }
  },
  android: {
    allowMixedContent: true,
    captureExternalUrls: false,
    webContentsDebuggingEnabled: true,
    permissions: [
      "android.permission.WAKE_LOCK",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.FOREGROUND_SERVICE"
    ]
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    allowsLinkPreview: false
  }
};

export default config;
