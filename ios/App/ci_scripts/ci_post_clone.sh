#!/usr/bin/env bash
set -e -x

# Xcode Cloud provisions a fresh environment per build — nothing persists
# between runs the way it does on the Mac VM, so Node needs installing
# every time. Matches this project's confirmed LTS line (24.x), not the
# generic node@18 shown in most Capacitor/Xcode Cloud examples.
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install node@24
brew link node@24 --force

# This script's CWD is its own directory (ios/App/ci_scripts/) — confirmed
# pattern from other Capacitor/Xcode Cloud setups needing an explicit cd
# out to the repo root before npm/capacitor commands work. Exact level
# count (3, matching ios/App/ci_scripts/ specifically) not yet verified
# against a real Xcode Cloud build log — check the first run's log
# carefully; a wrong path here fails clearly (npm error: no package.json
# found), not silently.
cd ../../..

npm ci
npm run build

# Strip PWA-store-only assets (2026-09-12) — same reasoning as
# pre-push-hook.sh's own equivalent step: screenshots exist solely for
# the web manifest's own install-prompt/store-listing context (Microsoft
# Store via PWABuilder), never displayed anywhere in the app's own UI on
# any platform, unlike the icons (genuinely used in-app via Home.tsx, so
# those stay). Done once here, before cap sync ios, rather than also in
# ci_post_xcodebuild.sh — that script's own comment confirms it reuses
# this exact dist/ unchanged, never rebuilding, so stripping here already
# covers both the .ipa build and the later OTA release in one place.
if [ -d dist/assets/screenshots ]; then
  echo "Stripping PWA-only screenshots from dist/ before native sync/OTA..."
  rm -rf dist/assets/screenshots
fi

npx cap sync ios

# Deliberately NOT installing CocoaPods here — confirmed in 12f this
# project is pure SPM. Add brew install cocoapods back only if a future
# plugin genuinely needs it; skipping it keeps every build faster/cheaper
# against the 25 free monthly compute hours.
