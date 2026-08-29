import type { CapacitorConfig } from '@capacitor/cli';

// Xcode Cloud Distribution Preparation experiment, test 1 of 3 (2026-08-29):
// this push is deliberate, no functional change — confirms whether the
// current "App Store Connect" setting on "iOS Validate" produces a fresh
// 90062/90186 failure on a genuinely new build, not a delayed-queue echo
// of an older, already-fixed state. See i360-instructions.md §15.


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
    // Channel driven by OTA_CHANNEL (build-time only, not VITE_-prefixed —
    // read by this Node-context config file, never exposed to the client
    // bundle). Per OtaKit's own docs: omitting `channel` entirely uses the
    // unnamed base channel — NOT the same as passing the string "base",
    // which isn't a real channel name (the dashboard just labels the
    // default state that way for display). For local/Mac VM test builds,
    // set OTA_CHANNEL=development before building. No dashboard setup
    // needed — channels are created implicitly by being referenced, and
    // since nothing is ever intentionally released to "development", a
    // fresh install finds no manifest there and the native-bundled code
    // is what actually runs, instead of silently being overridden by
    // whatever's currently live on the real (base) channel. Real
    // production builds (Google Play/Huawei/App Store) omit OTA_CHANNEL
    // entirely — the `channel` key is genuinely absent from the object
    // below, not set to any string.
    //
    // runtimeVersion — native-compatibility lane, separate concern from
    // channel (channel = audience, runtimeVersion = which native shell a
    // release is safe for). Bumped MANUALLY whenever a native-affecting
    // change ships (new Capacitor plugin, native config change, Capacitor
    // version bump) — never auto-generated per build like versionCode/
    // CFBundleVersion, since it must stay stable across many otherwise-
    // compatible OTA releases within one native shell's lifetime.
    // Baseline set 2026-08-15 (yyyy.MM, matching OtaKit's own docs
    // example format), reflecting current native shell state — no
    // runtime-affecting change since this baseline.
    // Lane-continuity requirement — SATISFIED and automated: a baseline
    // release tagged 2026.08 was published to the base channel on
    // 2026-08-15 (the "something must exist on the new lane" requirement
    // before any native build ships with this value), and every genuine
    // store submission now auto-runs scripts/release-to-otakit.sh
    // (pre-push-hook.sh's Android/Huawei path, deploy_apple's iOS path,
    // and Xcode Cloud's manual-gated ci_post_xcodebuild.sh), so any
    // future runtimeVersion bump only needs the bump itself — the
    // release-on-submission automation keeps the new lane populated with
    // no separate step to remember. See i360-instructions.md §14/§15.
    //
    // OTA_CHANNEL=development remains the deliberate, explicit isolation
    // mechanism for local test builds — don't rely on runtimeVersion
    // lane separation alone for that.
    OtaKit: {
      appId: '423c89c7-e4c3-40e9-891a-e9f6bfe27386',
      ...(process.env.OTA_CHANNEL ? { channel: process.env.OTA_CHANNEL } : {}),
      runtimeVersion: '2026.08',
      appReadyTimeout: 10000,
      launchPolicy: 'apply-staged',
      resumePolicy: 'shadow',
      runtimePolicy: 'immediate',
    },
  },
};

export default config;
