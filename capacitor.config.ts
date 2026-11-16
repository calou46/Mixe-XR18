import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xr18touch.pro',
  appName: 'XR18 Touch Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#141619',
    allowMixedContent: true,
  },
};

export default config;
