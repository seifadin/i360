# scripts/native-pattern.sh — sourced by both pre-commit-hook.sh and
# pre-push-hook.sh, not duplicated in each. Extracted 2026-09-04, the
# same night a version-bump reminder was added to pre-commit specifically
# because these two hooks now need to agree on exactly the same
# definition of "native-relevant" — a single source avoids them silently
# drifting apart if one is ever edited without the other.
NATIVE_PATTERN='^(android/|ios/|capacitor\.config\.ts|package\.json|package-lock\.json)'
