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
npx cap sync ios

# Deliberately NOT installing CocoaPods here — confirmed in 12f this
# project is pure SPM. Add brew install cocoapods back only if a future
# plugin genuinely needs it; skipping it keeps every build faster/cheaper
# against the 25 free monthly compute hours.
