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
    // ⚠️ REQUIRED FOLLOW-UP, not yet done: this value only takes effect in
    // native builds compiled with it — existing real installs are
    // completely unaffected until they update to a future native release
    // that includes this config. But whenever that next native release
    // actually ships (Google Play/Huawei/App Store), the current bundle
    // MUST be re-released to the base channel under this same
    // runtimeVersion tag in the same window — otherwise devices upgrading
    // to the new native shell request a lane nothing has been published
    // to, and silently stop receiving OTA updates entirely. See
    // i360-instructions.md §14/§15 for the full reasoning.
    //
    // Local test builds naturally benefit from this too, as a side
    // effect: a fresh local build with this runtimeVersion, on the real
    // base channel, finds no matching-runtime release (none of the 5
    // existing bundles are runtime-tagged) — but OTA_CHANNEL=development
    // remains the deliberate, explicit isolation mechanism; don't rely on
    // this side effect alone.
    OtaKit: {
      appId: '423c89c7-e4c3-40e9-891a-e9f6bfe27386',
      ...(process.env.OTA_CHANNEL ? { channel: process.env.OTA_CHANNEL } : {}),
      runtimeVersion: '2026.08',
      appReadyTimeout: 10000,
      launchPolicy: 'apply-staged',
      resumePolicy: 'shadow',
      // Locked: runtimePolicy = 'off', not the plugin's own documented
      // default ('immediate'). Real, confirmed bug: a sideloaded Android
      // build showed "تعذّر تحميل البيانات" (can't load data) shortly after
      // a successful initial data load — on code identical to the working
      // PWA, ruling out the app's own fetch logic. Isolated via clean,
      // single-variable tests, not guessed: (1) fully removing the OtaKit
      // block fixed it — confirmed OtaKit's automatic behavior as the
      // cause; (2) restoring launchPolicy/resumePolicy to their normal
      // values and setting only runtimePolicy: 'off' also fixed it —
      // isolates the cause specifically to the 'runtime' lifecycle event
      // (OtaKit's own docs: "Cold start where the current runtimeVersion
      // lane has not been resolved yet" — i.e. a fresh install or a new
      // native release), not launch or resume, both left untouched at
      // their working values above.
      // Real, accepted trade-off: a genuinely fresh install (or first
      // launch after a new native runtimeVersion release) no longer
      // "catches up immediately." It still receives the update — staged
      // by resumePolicy 'shadow' on first background resume, then applied
      // by launchPolicy 'apply-staged' on the next cold launch — just one
      // cycle later than OtaKit's own default behavior. Reported upstream
      // to OtaKit (github.com/OtaKit/otakit/issues) — see
      // i360-instructions.md §14 for the full investigation.
      runtimePolicy: 'off',
    },
  },
};

export default config;
