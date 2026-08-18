#!/usr/bin/env bash
# Shared release-with-retry logic for OtaKit — extracted (2026-08-17) after
# noticing the exact same "unset OTA_CHANNEL, otakit upload --release,
# retry once on failure" logic was duplicated three times across
# scripts/pre-push-hook.sh (Android), ios/fastlane/Fastfile (iOS via Mac
# VM), and ios/App/ci_scripts/ci_post_xcodebuild.sh (iOS via Xcode Cloud).
# One place to fix, three consumers — matches this project's own
# extract-once, not-thrice principle (i360-instructions.md §12 rule 12).
#
# MUST be run from the repo root (where dist/, package.json,
# capacitor.config.ts live) — each caller is responsible for cd'ing there
# first, since they live at different relative depths and that's genuinely
# specific to where each script physically sits, not something to
# generalize here.
#
# Deliberately does NOT set -e at the top level — this script's own job is
# to survive a failure and retry, not propagate one immediately.
#
# Exit code: 0 on success, 1 on failure after the retry. Callers decide
# how to react — this script never aborts a caller itself; whether that
# happens depends on how the caller invokes it (see each call site's own
# comment for its specific safety handling).

set +e
unset OTA_CHANNEL
otakit upload --release
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "  (OtaKit release failed, retrying once...)"
  sleep 3
  unset OTA_CHANNEL
  otakit upload --release
  STATUS=$?
fi
set -e

if [ $STATUS -eq 0 ]; then
  echo "✓ OtaKit release published, tagged with the current runtimeVersion."
else
  echo "⚠ OtaKit release failed after retry. Retry manually when ready:"
  echo "    unset OTA_CHANNEL && otakit upload --release"
fi

exit $STATUS
