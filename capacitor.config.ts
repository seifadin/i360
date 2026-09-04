import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// process.cwd(), not import.meta.url (2026-09-03) — vite.config.ts uses
// import.meta.url safely since Vite itself is ESM-native, but Capacitor's
// own CLI parses this specific file through a different, CommonJS-style
// loader that doesn't support import.meta.url at all — confirmed directly:
// npx cap config failed outright with "exports is not defined in ES
// module scope" when this used the same pattern as vite.config.ts.
// process.cwd() works in both contexts and is reliable here specifically
// because this project's own established convention already requires
// every caller (npm run build, npx cap sync, release-to-otakit.sh, etc.)
// to run from the repo root.
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

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
    // release is safe for). Tied directly to package.json's version
    // (2026-09-03), not hardcoded/manually bumped anymore — real incident
    // that motivated this: @capacitor/browser shipped as a genuine native
    // change without a manual runtimeVersion bump, so OtaKit had no signal
    // the previously-staged base-channel bundle (JS-only, pre-migration)
    // was now incompatible — a fresh install of the new binary still
    // applied that stale bundle, silently reverting the native change.
    //
    // Why tying this to pkg.version is safe, not just convenient: this
    // project's version bumps only ever happen for genuine store
    // resubmissions (confirmed directly — every purely OTA-eligible
    // change tonight, e.g. header sizing, never touched package.json's
    // version at all), and versionName is itself derived from pkg.version
    // at native build time (§12g) — so any version bump inherently
    // requires a new native build to ever reach a store, regardless of
    // whether the underlying change was native. The two are structurally
    // linked, not just coincidentally aligned so far, which is what makes
    // deriving runtimeVersion from it safe rather than a coincidence that
    // could later drift apart.
    //
    // Lane-continuity requirement — still automatically satisfied, not
    // reintroduced as a manual step by this change: every genuine store
    // submission already auto-runs scripts/release-to-otakit.sh
    // (pre-push-hook.sh's Android/Huawei path, deploy_apple's iOS path,
    // Xcode Cloud's manual-gated ci_post_xcodebuild.sh), which publishes
    // that same build's content immediately after — so each new
    // runtimeVersion lane a version bump creates gets populated
    // automatically, the same guarantee the old manual scheme relied on.
    // See i360-instructions.md §14/§14k/§15.
    //
    // OTA_CHANNEL=development remains the deliberate, explicit isolation
    // mechanism for local test builds — don't rely on runtimeVersion
    // lane separation alone for that.
    OtaKit: {
      appId: '423c89c7-e4c3-40e9-891a-e9f6bfe27386',
      ...(process.env.OTA_CHANNEL ? { channel: process.env.OTA_CHANNEL } : {}),
      runtimeVersion: pkg.version,
      appReadyTimeout: 10000,
      launchPolicy: 'apply-staged',
      resumePolicy: 'shadow',
      runtimePolicy: 'immediate',
    },
  },
};

export default config;
