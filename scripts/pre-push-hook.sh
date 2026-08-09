#!/usr/bin/env bash
# scripts/pre-push-hook.sh — installed as .git/hooks/pre-push (see the
# fresh-Codespace checklist for the one-time setup command). Fires
# automatically on every `git push`, no separate command needed.
#
#   web-only changes  -> OTA push (OtaKit), automatic
#   native changes    -> prompts "Submit to stores? (y/n)" right here in
#                         the terminal — a plain push never silently
#                         triggers an actual store submission
#   both in one push  -> same native-path logic (OTA can't deliver native
#                         changes anyway, and the next Fastlane build
#                         picks up the current dist/ regardless)
#
# Firebase Hosting's own GitHub Actions workflow (Phase 11) is unaffected —
# the actual `git push` this hook allows through still triggers it exactly
# as before, independently of anything below.
#
# Exits 0 in every case (never blocks the actual push) — this hook only
# adds extra actions around the push, it's not a gatekeeper for it.

set -e

# pre-push receives pushed ref info on stdin: one line per ref, formatted
# as "<local ref> <local sha> <remote ref> <remote sha>". We only care
# about the full commit range being pushed, to catch every changed file
# across all commits in this push, not just the most recent one.
REMOTE_SHA=""
LOCAL_SHA=""
while read -r local_ref local_sha remote_ref remote_sha; do
  LOCAL_SHA="$local_sha"
  REMOTE_SHA="$remote_sha"
done

# New branch / first push — remote_sha is all zeros, nothing to diff
# against. Treat as "changed everything" to be safe (routes to native
# path, which just prompts rather than silently doing anything).
if [ -z "$REMOTE_SHA" ] || [[ "$REMOTE_SHA" =~ ^0+$ ]]; then
  CHANGED_FILES=$(git diff --name-only "$(git hash-object -t tree /dev/null)" "$LOCAL_SHA")
else
  CHANGED_FILES=$(git diff --name-only "$REMOTE_SHA" "$LOCAL_SHA")
fi

echo
echo "→ Checking what changed in this push..."

NATIVE_PATTERN='^(android/|ios/|capacitor\.config\.ts|package\.json|package-lock\.json|fastlane/)'
IS_NATIVE=false
if echo "$CHANGED_FILES" | grep -qE "$NATIVE_PATTERN"; then
  IS_NATIVE=true
fi

if [ "$IS_NATIVE" = false ]; then
  echo "→ Web-only change detected — pushing OTA update..."
  npm run build

  if ! command -v otakit &> /dev/null; then
    echo "  (otakit CLI not found, installing...)"
    npm install -g @otakit/cli
  fi

  otakit upload --release
  echo "✓ OTA update pushed."
else
  echo "→ Native change detected."
  # Read from /dev/tty explicitly, not stdin — git hooks receive ref info
  # via stdin (already consumed by the while-read loop above), so a plain
  # `read` here would hit EOF immediately and fail under set -e, silently
  # blocking the push. This was a real bug caught in actual use, not
  # something the earlier file-detection tests could have revealed.
  read -p "  Submit to stores (Google Play + Huawei AppGallery)? (y/N) " -n 1 -r < /dev/tty
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "→ Submitting to both stores..."
    (cd android && fastlane deploy_google && fastlane deploy_huawei)
    echo "✓ Submitted to Google Play and Huawei AppGallery."
  else
    echo "  Skipped. Run manually when ready:"
    echo "    cd android && fastlane deploy_google && fastlane deploy_huawei"
  fi
fi

echo
exit 0
