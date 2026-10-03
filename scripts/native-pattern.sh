# shellcheck shell=bash disable=SC2034
# (sourced, not executed: the variables below are used by the scripts that source it)
# scripts/native-pattern.sh — sourced by both pre-commit-hook.sh and
# pre-push-hook.sh, not duplicated in each. Extracted 2026-09-04, the
# same night a version-bump reminder was added to pre-commit specifically
# because these two hooks now need to agree on exactly the same
# definition of "native-relevant" — a single source avoids them silently
# drifting apart if one is ever edited without the other.
#
# ota-timing.json added 2026-10-03: it is read by capacitor.config.ts
# (compiled into the native binary as appReadyTimeout) AND imported by
# src/lib/startupHealth.ts, so a change to it is exactly the JS-versus-
# native mismatch §14o warns about — new JS expecting different timing
# than an old binary has compiled in. It was in neither this pattern nor
# the OTA one, so editing it alone would have skipped both the version-
# bump prompt and the store-submission prompt, silently.
NATIVE_PATTERN='^(android/|ios/|capacitor\.config\.ts|ota-timing\.json|package\.json|package-lock\.json)'
