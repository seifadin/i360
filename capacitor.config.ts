import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.appgyver.i360',
  appName: 'i360إ',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#FAF7F2',
      showSpinner: false,
    },
    // OtaKit (12h) — recommended policy defaults per the plugin's own docs:
    // launchPolicy 'apply-staged' (fresh install/new runtimeVersion catches
    // up immediately, later cold starts apply anything already staged),
    // resumePolicy 'shadow' (checks/stages in the background, never applies
    // mid-session), runtimePolicy 'immediate' (a new native shell always
    // catches up right away). appReadyTimeout uses OtaKit's own documented
    // example value (10s) rather than coupling it to the unrelated splash
    // screen duration — this is a safety margin for slower devices/networks
    // to still call notifyAppReady() before a false rollback, not a UI
    // preference. See App.tsx for the notifyAppReady() call this pairs with.
    OtaKit: {
      appId: '423c89c7-e4c3-40e9-891a-e9f6bfe27386',
      appReadyTimeout: 10000,
      launchPolicy: 'apply-staged',
      resumePolicy: 'shadow',
      runtimePolicy: 'immediate',
    },
  },
};

export default config;
