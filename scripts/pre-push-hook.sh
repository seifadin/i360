#!/usr/bin/env bash
# scripts/pre-push-hook.sh — installed as .git/hooks/pre-push (see the
# fresh-Codespace checklist for the one-time setup command). Fires
# automatically on every `git push`, no separate command needed.
#
#   Firebase Hosting (every push, matching branch):
#     vite -> preview channel (pwa-test, 30d expiry)
#     main -> production (live site)
#   Mobile release routing:
#     web-only changes  -> OTA push (OtaKit), automatic, retries once,
#                           falls back to a store-submission prompt if
#                           it's still failing
#     native changes    -> prompts "Submit to stores? (y/n)" right here
#                           in the terminal — a plain push never silently
#                           triggers an actual store submission
#     both in one push  -> native-path logic only (OTA can't deliver
#                           native changes anyway, and the next Fastlane
#                           build picks up the current dist/ regardless)
#
# Supersedes the earlier GitHub Actions workflows (deploy-preview.yml,
# deploy-production.yml, Phase 11) — Firebase deployment now runs here
# instead, using credentials already authenticated in this Codespace
# rather than duplicating them as GitHub repo secrets. See Section 13
# rule 17 for the full reasoning on local script vs. CI for this project.
#
# Exits 0 in every case (never blocks the actual push) — this hook only
# adds extra actions around the push, it's not a gatekeeper for it.

set -e

# pre-push receives pushed ref info on stdin: one line per ref, formatted
# as "<local ref> <local sha> <remote ref> <remote sha>". We only care
# about the full commit range being pushed, to catch every changed file
# across all commits in this push, not just the most recent one.
LOCAL_REF=""
REMOTE_SHA=""
LOCAL_SHA=""
while read -r local_ref local_sha remote_ref remote_sha; do
  LOCAL_REF="$local_ref"
  LOCAL_SHA="$local_sha"
  REMOTE_SHA="$remote_sha"
done

BRANCH="${LOCAL_REF#refs/heads/}"

# New branch / first push — remote_sha is all zeros, nothing to diff
# against. Treat as "changed everything" to be safe (routes to native
# path, which just prompts rather than silently doing anything).
if [ -z "$REMOTE_SHA" ] || [[ "$REMOTE_SHA" =~ ^0+$ ]]; then
  CHANGED_FILES=$(git diff --name-only "$(git hash-object -t tree /dev/null)" "$LOCAL_SHA")
else
  CHANGED_FILES=$(git diff --name-only "$REMOTE_SHA" "$LOCAL_SHA")
fi

echo
echo "→ Branch: $BRANCH"
echo "→ Checking what changed in this push..."

NATIVE_PATTERN='^(android/|ios/|capacitor\.config\.ts|package\.json|package-lock\.json)'
IS_NATIVE=false
if echo "$CHANGED_FILES" | grep -qE "$NATIVE_PATTERN"; then
  IS_NATIVE=true
fi

# Build once, shared by Firebase deploy below and OTA further down —
# avoids building dist/ twice for the same push.
if [ "$BRANCH" = "vite" ] || [ "$BRANCH" = "main" ]; then
  npm run build
fi

# --- Firebase Hosting — every push to vite/main, regardless of what
# changed, matching the two retired workflows' own behavior exactly
# (they had no path-filtering either). ---
if [ "$BRANCH" = "vite" ]; then
  echo "→ Deploying preview channel (pwa-test)..."
  firebase hosting:channel:deploy pwa-test --expires 30d
  echo "✓ Preview channel updated."
elif [ "$BRANCH" = "main" ]; then
  echo "→ Deploying to production..."
  firebase deploy --only hosting
  echo "✓ Production site updated."
fi

# --- Mobile release routing — only meaningful on vite/main; a push to
# any other branch skips this entirely. ---
if [ "$BRANCH" != "vite" ] && [ "$BRANCH" != "main" ]; then
  echo
  exit 0
fi

if [ "$IS_NATIVE" = false ]; then
  echo "→ Web-only change detected — pushing OTA update..."

  # otakit is a standalone CLI, not part of Vite's build - it has no
  # awareness of .env at all unless we explicitly load it. Vite itself
  # reads .env internally during npm run build above, but that's a
  # separate mechanism that doesn't export anything to the shell.
  if [ -f .env ]; then
    set -a
    source .env
    set +a
  fi

  if ! command -v otakit &> /dev/null; then
    echo "  (otakit CLI not found, installing...)"
    npm install -g @otakit/cli
  fi

  # Don't let a failed upload kill the script under set -e - that would
  # block the push entirely, contradicting this script's own "never
  # blocks the push" promise. Try once, retry once for a transient
  # blip, then fall back to offering store submission instead - the
  # same prompt native changes get - since a persistently-failing OTA
  # server means mobile users need another way to receive this update.
  set +e
  otakit upload --release
  UPLOAD_STATUS=$?
  if [ $UPLOAD_STATUS -ne 0 ]; then
    echo "  (upload failed, retrying once...)"
    sleep 3
    otakit upload --release
    UPLOAD_STATUS=$?
  fi
  set -e

  if [ $UPLOAD_STATUS -eq 0 ]; then
    echo "✓ OTA update pushed."
  else
    echo "⚠ OTA upload failed after retry — OtaKit's server may be down."
    read -p "  Submit to stores instead (Google Play + Huawei AppGallery)? (y/N) " -n 1 -r < /dev/tty
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "→ Submitting to both stores..."
      (cd android && fastlane deploy_google && fastlane deploy_huawei)
      echo "✓ Submitted to Google Play and Huawei AppGallery."
    else
      echo "  Skipped. This push will proceed, but mobile users won't"
      echo "  receive this update until OTA or a store submission succeeds."
      echo "  Retry manually when ready: otakit upload --release"
    fi
  fi
else
  echo "→ Native change detected."
  echo "  iOS: build & submit manually from the Mac VM — this Codespace"
  echo "  (Linux) can never run Xcode/xcodebuild, so iOS is never part of"
  echo "  this automated flow, regardless of what changed."
  # Read from /dev/tty explicitly, not stdin — git hooks receive ref info
  # via stdin (already consumed by the while-read loop above), so a plain
  # `read` here would hit EOF immediately and fail under set -e, silently
  # blocking the push. This was a real bug caught in actual use, not
  # something the earlier file-detection tests could have revealed.
  read -p "  Submit to Google Play + Huawei AppGallery? (y/N) " -n 1 -r < /dev/tty
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "→ Submitting to both stores..."
    (cd android && fastlane deploy_google && fastlane deploy_huawei)
    echo "✓ Submitted to Google Play and Huawei AppGallery."
    echo "→ Releasing current bundle to OtaKit (runtimeVersion-tagged)..."
    # Defensive: OTA_CHANNEL may be left set from an earlier local test
    # session — unset it here so this real release always targets the
    # production (base) channel, never a leftover development one.
    (unset OTA_CHANNEL && otakit upload --release)
    echo "✓ OtaKit release published, tagged with the current runtimeVersion."
  else
    echo "  Skipped. Run manually when ready:"
    echo "    cd android && fastlane deploy_google && fastlane deploy_huawei"
    echo "    unset OTA_CHANNEL && otakit upload --release"
  fi
fi

echo
exit 0
