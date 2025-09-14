import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8d915f617b054570b15db3fd54ebbfaa',
  appName: 'Device Health Monitor',
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
  },
};

export default config;