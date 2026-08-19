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

# ci_scripts must stay executable in git (§15's silent 100755→100644
# incident — Xcode Cloud's zsh fallback survived it once, but that's a
# documented leniency, not a contract). Self-announcing + self-repairing
# at the moment it matters, matching submit_to_stores()'s
# verify-don't-trust pattern. Note: the fix lands in the INDEX — the push
# currently in flight still carries the old mode; commit and include it
# in a follow-up push.
if git ls-files -s ios/App/ci_scripts/*.sh | grep -q '^100644'; then
  echo "⚠ ci_scripts lost exec bit — restoring in the index now:"
  git update-index --chmod=+x ios/App/ci_scripts/*.sh
  git ls-files -s ios/App/ci_scripts/
  echo "  Commit this mode change and include it in a follow-up push."
fi

# Shared by both store-submission call sites below (the native-change
# branch and the web-only branch's OTA-failure fallback) — extracted per
# §12 rule 12 rather than duplicating the sync+guard+submit sequence.
#
# Why the sync: deploy_google/deploy_huawei package whatever the LAST
# manual `cap sync` left in android/'s assets — which may be a stale
# dist/, or worse, a local test sync that baked "channel": "development"
# into the compiled capacitor.config.json. That's §12.16c's exact
# failure class (a real release landing on the dev channel), re-entering
# via stale sync artifacts instead of a lingering `export`. `env -u`
# guarantees OTA_CHANNEL can't leak in from the calling shell no matter
# what it has exported. dist/ is guaranteed fresh here — the shared
# `npm run build` above already ran (this function is only reachable on
# vite/main, the same branches that build).
#
# Why the grep guard anyway: verify, don't trust the command alone —
# the same principle as §12.16c's post-sync `cat | grep` check, just
# automated at the moment it matters most. Tripping it aborts the
# submission (and, under set -e, the push — consistent with how a
# fastlane failure here has always behaved), since a channel key
# appearing despite env -u means something is genuinely wrong.
submit_to_stores() {
  echo "→ Syncing native assets (guaranteed-clean OTA channel)..."
  env -u OTA_CHANNEL npx cap sync android
  if grep -q '"channel"' android/app/src/main/assets/capacitor.config.json; then
    echo "✗ ABORT: compiled capacitor.config.json contains a channel key —"
    echo "  this submission would ship targeting a non-production OTA"
    echo "  channel. Investigate before submitting (see §12.16c)."
    return 1
  fi
  echo "→ Submitting to both stores..."
  (cd android && fastlane deploy_google && fastlane deploy_huawei)
  echo "✓ Submitted to Google Play and Huawei AppGallery."
}

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

# otakit is a standalone CLI, not part of Vite's build — it has no
# awareness of .env at all unless we explicitly load it. Vite itself
# reads .env internally during npm run build above, but that's a
# separate mechanism that doesn't export anything to the shell. Runs
# once here, before either branch below, since both may call otakit —
# a real bug caught while extracting scripts/release-to-otakit.sh: this
# used to live only inside the web-only branch, so the native branch's
# OTA release call had no OTAKIT_TOKEN available at all unless the
# calling shell happened to already have it from something else.
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
if ! command -v otakit &> /dev/null; then
  echo "  (otakit CLI not found, installing...)"
  npm install -g @otakit/cli
fi

if [ "$IS_NATIVE" = false ]; then
  echo "→ Web-only change detected — pushing OTA update..."

  # scripts/release-to-otakit.sh's own non-zero exit (genuine failure
  # after its internal retry) must not kill this script under set -e —
  # this specific call site has its own further fallback (offering store
  # submission) that no other caller of the shared script needs, since
  # here nothing has explicitly confirmed a manual release is even
  # wanted; a persistently-failing OTA server means mobile users need
  # another way to receive this update at all.
  if ! bash scripts/release-to-otakit.sh; then
    read -p "  Submit to stores instead (Google Play + Huawei AppGallery)? (y/N) " -n 1 -r < /dev/tty
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      submit_to_stores
    else
      echo "  Skipped. This push will proceed, but mobile users won't"
      echo "  receive this update until OTA or a store submission succeeds."
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
    submit_to_stores
  else
    echo "  Skipped. Run manually when ready (build + clean sync first —"
    echo "  see submit_to_stores above for why the sync matters):"
    echo "    npm run build && env -u OTA_CHANNEL npx cap sync android"
    echo "    cd android && fastlane deploy_google && fastlane deploy_huawei"
  fi

  # Deliberately a SEPARATE question from store submission above, not
  # nested inside it — a real bug caught in actual use: OTA release was
  # originally coupled to the store-submission "y", so declining that
  # prompt (for any reason — maybe this push has nothing store-relevant
  # in it) silently skipped shipping the JS/web update too, even though
  # OTA exists specifically to reach users WITHOUT needing store review
  # at all. The two are conceptually unrelated risk decisions and must
  # stay independently answerable.
  read -p "  Release current bundle to OtaKit? (y/N) " -n 1 -r < /dev/tty
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "→ Releasing current bundle to OtaKit (runtimeVersion-tagged)..."
    # This script has set -e active — the shared script's own non-zero
    # exit (on genuine failure after its internal retry) must not be
    # allowed to abort the whole push. || true absorbs that here.
    bash scripts/release-to-otakit.sh || true
  else
    echo "  Skipped. Run manually when ready:"
    echo "    unset OTA_CHANNEL && otakit upload --release"
  fi
fi

echo
exit 0
