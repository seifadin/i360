#!/usr/bin/env bash
set -x

# ci_post_xcodebuild.sh runs even when xcodebuild fails (Apple's own
# documented behavior, confirmed via a DTS engineer forum response) — so
# this MUST gate on CI_XCODEBUILD_EXIT_CODE before releasing anything, or
# a broken/failed archive could get silently published to OtaKit's real
# channel as if it were a working release.
if [ "${CI_XCODEBUILD_EXIT_CODE}" != "0" ]; then
  echo "xcodebuild did not succeed (exit ${CI_XCODEBUILD_EXIT_CODE}) — skipping OtaKit release."
  exit 0
fi

# Only release on the actual Archive action — CI_XCODEBUILD_ACTION also
# fires for Build/Test/Analyze, none of which should trigger a release.
if [ "${CI_XCODEBUILD_ACTION}" != "archive" ]; then
  echo "Not an archive action (${CI_XCODEBUILD_ACTION}) — skipping OtaKit release."
  exit 0
fi

# Only release on a manually-triggered build, never an automatic push to
# vite. This workflow auto-builds on every vite push for free "did I just
# break iOS" validation — without this gate, every routine WIP commit
# would get automatically published as a live OTA update to real users.
# A deliberate "Start Build" click (Xcode or App Store Connect) is the
# actual "yes, ship this" confirmation, matching pre-push-hook.sh's y/n
# prompt in spirit, just expressed as a manual dashboard action instead
# of a terminal keystroke.
if [ "${CI_START_CONDITION}" != "manual" ]; then
  echo "Automatic build (start condition: ${CI_START_CONDITION}) — skipping OtaKit release. Use a manual Start Build to actually ship."
  exit 0
fi

# otakit CLI is NOT preinstalled — Xcode Cloud provisions a fresh
# environment every build, unlike the Mac VM where this was a one-time
# npm install -g. Needed here, not in ci_post_clone.sh, since nothing
# before this point actually uses it.
npm install -g @otakit/cli

# CWD is this script's own directory — cd to repo root, same reasoning
# as ci_post_clone.sh. dist/ should still be exactly what ci_post_clone.sh
# built earlier in this same workflow run — not rebuilding here, since
# nothing in Xcode's own build step touches the repo-root dist/ (cap sync
# only copies it into ios/App/App/public). NOT yet verified this holds
# true against a real log for this specific script — check the first
# real run carefully before trusting this assumption long-term.
cd ../../..

# Shared release-with-retry script (scripts/release-to-otakit.sh, see its
# own header comment) — extracted 2026-08-17 after the exact same retry
# logic was duplicated here, in pre-push-hook.sh, and in the iOS Fastfile.
# No set -e active in this script, so a non-zero exit here doesn't need
# special handling to avoid aborting anything — but || true keeps it
# explicit/robust regardless of whether that assumption ever changes.
#
# This script previously had no check at all for whether dist/ actually
# changed since the last OTA release — every genuine manual-start build
# reaching this point published a release unconditionally. That gap now
# lives (2026-09-04) inside release-to-otakit.sh itself, shared across
# all three callers — no changes needed here.
bash scripts/release-to-otakit.sh || true
