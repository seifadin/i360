#!/usr/bin/env bash
# scripts/pre-push-hook.sh — runs on every `git push` (installed once per clone as a shim,
# i360-instructions.md §10). Only `vite` does anything; other branches push untouched.
# In order, each only when this push changes what it covers:
#   1. hub tests (hub/) and app tests (src/ and the app's config) — a failure stops the push
#   2. the hub Workers: hub/theme/ → theme.i36o.workers.dev, hub/hijri/ → dar-hijri.i36o.workers.dev
#      (check first — a failure stops the push; a failed publish only warns)
#   3. build, preview deploy (a check), then ONE question releasing the same build to the web
#      and, for a web-only change, to phones by OTA (§15r)
#   4. native changes: their own store and OTA questions; a plain push never submits to a store
# Rule: automatic for what nobody sees, asked for what users see; checks stop the push,
# releases only warn. Runs here rather than in CI (§12.17).

set -e

# One-key y/N answers: "y", "Y", or "غ" (the same key on an Arabic keyboard), read with
# LC_ALL=C.UTF-8 so "غ" is one character in any locale (§15r).
is_yes() { [[ $1 == [Yy] || $1 == 'غ' ]]; }

# stdin: one line per pushed ref, "<local ref> <local sha> <remote ref> <remote sha>"; the
# whole pushed range is diffed, so every changed file of every commit counts.
LOCAL_REF=""
REMOTE_SHA=""
LOCAL_SHA=""
while read -r local_ref local_sha _remote_ref remote_sha; do
  LOCAL_REF="$local_ref"
  LOCAL_SHA="$local_sha"
  REMOTE_SHA="$remote_sha"
done

BRANCH="${LOCAL_REF#refs/heads/}"

# True only when the changed-file list is UNKNOWN (not merely empty): an empty list skips
# the deploy, an unknown one must not.
DIFF_UNKNOWN=false

# The remote SHA can't be resolved (a new branch, or a lookup git can't do here — under
# set -e a failing `git diff` would kill the push): fall back instead of failing.
if [ -z "$REMOTE_SHA" ] || [[ "$REMOTE_SHA" =~ ^0+$ ]] || ! git cat-file -e "$REMOTE_SHA^{commit}" 2>/dev/null; then
  echo "→ Remote SHA unresolvable (a new branch, or a git-internal lookup"
  echo "  issue) — falling back to a safe default instead of failing the"
  echo "  push (which default is printed just below)."
  # Diagnostic: this has fired on plain pushes to tracked branches; show the real values.
  echo "  (diagnostic — local_ref='$LOCAL_REF' local_sha='$LOCAL_SHA'"
  echo "   remote_sha='$REMOTE_SHA')"
  # An empty LOCAL_SHA can't be diffed either: the list is UNKNOWN — the build and preview
  # still run, but native submission and OTA are left to the developer (manual commands
  # printed at the end).
  if [ -z "$LOCAL_SHA" ]; then
    echo "  ⚠ local_sha itself came back empty — skipping the diff"
    echo "    entirely rather than risk the same crash from the other"
    echo "    side. Changed files are UNKNOWN: the build and preview"
    echo "    deploy still run, but native submission and OTA release"
    echo "    are NOT attempted automatically (manual commands at the end)."
    CHANGED_FILES=""
    DIFF_UNKNOWN=true
  else
    echo "  Treating every tracked file as changed (diff against an empty"
    echo "  tree) — each step below runs or prompts as for a full change;"
    echo "  every prompt can still be declined."
    CHANGED_FILES=$(git diff --name-only "$(git hash-object -t tree /dev/null)" "$LOCAL_SHA")
  fi
else
  CHANGED_FILES=$(git diff --name-only "$REMOTE_SHA" "$LOCAL_SHA")
fi

echo
echo "→ Branch: $BRANCH"
echo "→ Checking what changed in this push..."

# Xcode Cloud's ci_scripts must stay executable (§15c). pre-commit is the primary fix (it
# can fold the change into the commit); this catches a bit lost without a new commit.
source "$(git rev-parse --show-toplevel)/scripts/fix-ci-scripts-exec-bit.sh"
if fix_ci_scripts_exec_bit; then
  echo "  Commit this mode change and include it in a follow-up push."
fi

# Store submission, shared by the native path and the OTA-failure fallback (§12 rule 12).
# Re-syncs with `env -u OTA_CHANNEL` so neither a stale sync nor the calling shell can ship a
# development channel, then verifies the compiled config has no channel key (§12.16c) — a
# key there aborts the submission (and the push).
submit_to_stores() {
  echo "→ Syncing native assets (guaranteed-clean OTA channel)..."
  env -u OTA_CHANNEL npx cap sync android
  if grep -q '"channel"' android/app/src/main/assets/capacitor.config.json; then
    echo "✗ ABORT: compiled capacitor.config.json contains a channel key —"
    echo "  this submission would ship targeting a non-production OTA"
    echo "  channel. Investigate before submitting (see §12.16c)."
    return 1
  fi

  # What's-new text saved by pre-commit with the version; optional (the OTA-failure fallback
  # has none — each store then keeps its current notes). §14o, §14p.
  if [ -n "$STATE_FILE" ] && [ -f "$STATE_FILE" ]; then
    local whats_new
    whats_new=$(node -p "try { require('$STATE_FILE').whatsNew || '' } catch { '' }" 2>/dev/null || echo "")
    if [ -n "$whats_new" ]; then
      echo "→ Writing release notes for both stores..."
      # Google Play (supply): the file-based changelog; "ar" = generic Arabic; default.txt,
      # since version codes (yyyyDDDHH) never repeat.
      mkdir -p android/fastlane/metadata/android/ar/changelogs
      printf '%s' "$whats_new" > android/fastlane/metadata/android/ar/changelogs/default.txt

      # Huawei: huawei_appgallery_connect_update_app_localization reads this folder (§14p).
      mkdir -p android/fastlane/metadata/huawei/ar
      printf '%s' "$whats_new" > android/fastlane/metadata/huawei/ar/release_notes
    fi
  fi

  echo "→ Submitting to both stores..."
  (cd android && fastlane deploy_google && fastlane deploy_huawei)
  echo "✓ Submitted to Google Play and Huawei AppGallery."
}

# After a real submission: PATCH i360dbc's Version in Baserow from the release state file,
# with the write-capable BASEROW_WRITE_KEY (never VITE_-prefixed: it would ship in the
# bundle; §9). Never aborts the push: a failure prints the value for manual entry.
update_baserow_version() {
  local baserow_version_string
  baserow_version_string=$(node -p "require('$STATE_FILE').baserowVersionString")

  if [ -z "$BASEROW_WRITE_KEY" ] || [ -z "$BASEROW_I360DBC_ROW_ID" ]; then
    echo "⚠ BASEROW_WRITE_KEY or BASEROW_I360DBC_ROW_ID not set in .env —"
    echo "  skipping the automatic Baserow update. Update i360dbc's Version"
    echo "  field manually to:"
    echo "    $baserow_version_string"
    return 0
  fi

  echo "→ Updating i360dbc's Version field in Baserow..."
  # JSON built by node (JSON.stringify), never by hand: the string is free text.
  local payload
  payload=$(node -e 'console.log(JSON.stringify({ Version: process.argv[1] }))' "$baserow_version_string")
  local http_code
  http_code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH \
    "https://api.baserow.io/api/database/rows/table/${VITE_BASEROW_TABLE_RESOURCES}/${BASEROW_I360DBC_ROW_ID}/?user_field_names=true" \
    -H "Authorization: Token ${BASEROW_WRITE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if [ "$http_code" = "200" ]; then
    echo "✓ Baserow Version field updated: $baserow_version_string"
  else
    echo "⚠ Baserow update failed (HTTP $http_code). Update manually:"
    echo "    $baserow_version_string"
  fi
}

# NATIVE_PATTERN, shared with pre-commit-hook.sh (scripts/native-pattern.sh).
source "$(git rev-parse --show-toplevel)/scripts/native-pattern.sh"
IS_NATIVE=false
if echo "$CHANGED_FILES" | grep -qE "$NATIVE_PATTERN"; then
  IS_NATIVE=true
fi

# Could this push change the built web bundle (dist/)? If not, there is nothing to release
# by OTA. Exclusion lists shared with release-to-otakit.sh (scripts/ota-relevant-pattern.sh,
# §15f); any_file_outside() is called inside `if`, as a bare exit 1 would trip set -e.
source "$(git rev-parse --show-toplevel)/scripts/ota-relevant-pattern.sh"
OTA_RELEVANT=false
if any_file_outside "$OTA_UNAFFECTED_PATTERN" "$CHANGED_FILES"; then
  OTA_RELEVANT=true
fi

# Could Firebase Hosting serve anything differently? A strict superset of OTA_RELEVANT (it
# also counts firebase.json, .firebaserc, tsconfig*.json, package*.json), so an OTA release
# always has a fresh dist/. An unknown list always deploys (§15f).
DEPLOY_NEEDED=false
if [ "$DIFF_UNKNOWN" = true ] || any_file_outside "$HOSTING_UNAFFECTED_PATTERN" "$CHANGED_FILES"; then
  DEPLOY_NEEDED=true
fi

# --- Only vite goes further (the one permanent branch; MS5 is the AppGyver archive). ---
if [ "$BRANCH" != "vite" ]; then
  echo
  exit 0
fi

# --- Hub tests (§12.17): when hub/ changes (or the list is unknown), `npm test` in hub/ —
# ESLint, then the tests (Reader, CSE, Daily Reflection, book format, search, indexer,
# theme, Hijri, built pages parse). A failure stops the push. `npm ci` first if
# hub/node_modules is missing or hub/package-lock.json changed. About 25 s.
if [ "$DIFF_UNKNOWN" = true ] || printf '%s\n' "$CHANGED_FILES" | grep -q '^hub/'; then
  echo "→ hub/ changed — running the hub's tests..."
  if [ ! -d hub/node_modules ] || printf '%s\n' "$CHANGED_FILES" | grep -qx 'hub/package-lock.json'; then
    echo "  Installing the hub's packages (cd hub && npm ci)..."
    if ! (cd hub && npm ci --no-audit --no-fund); then
      echo "✗ The hub's packages couldn't be installed — push stopped: nothing was pushed."
      exit 1
    fi
  fi
  HUB_TEST_LOG=$(mktemp)
  if (cd hub && npm test --silent) >"$HUB_TEST_LOG" 2>&1; then
    echo "✓ Hub tests passed."
    rm -f "$HUB_TEST_LOG"
  else
    if grep -q '^not ok' "$HUB_TEST_LOG"; then
      grep -E -A6 '^not ok' "$HUB_TEST_LOG" | head -30
    else
      tail -30 "$HUB_TEST_LOG"   # ESLint's findings (the tests didn't start)
    fi
    echo "✗ Hub tests failed — push stopped: nothing was pushed, published or released."
    echo "  Full output: $HUB_TEST_LOG   (or: cd hub && npm test)"
    exit 1
  fi
fi

# --- App tests (§12.17, §15ab): when src/, vite.config.ts, package*.json or tsconfig*.json
# change (or the list is unknown), `npm test` (Vitest) — a failure stops the push. `npm ci`
# first if package-lock.json changed or Vitest isn't installed.
if [ "$DIFF_UNKNOWN" = true ] || printf '%s\n' "$CHANGED_FILES" | grep -qE '^(src/|vite\.config\.ts$|package(-lock)?\.json$|tsconfig[^/]*\.json$)'; then
  echo "→ App code changed — running the app's tests..."
  if [ ! -x node_modules/.bin/vitest ] || printf '%s\n' "$CHANGED_FILES" | grep -qx 'package-lock.json'; then
    echo "  Installing the app's packages (npm ci)..."
    if ! npm ci --no-audit --no-fund; then
      echo "✗ The app's packages couldn't be installed — push stopped: nothing was pushed."
      exit 1
    fi
  fi
  APP_TEST_LOG=$(mktemp)
  if npm test --silent >"$APP_TEST_LOG" 2>&1; then
    echo "✓ App tests passed."
    rm -f "$APP_TEST_LOG"
  else
    tail -40 "$APP_TEST_LOG"
    echo "✗ App tests failed — push stopped: nothing was pushed, published or released."
    echo "  Full output: $APP_TEST_LOG   (or: npm test)"
    exit 1
  fi
fi

# --- Hub Workers (i360-hub.md §2): a changed hub/theme/ or hub/hijri/ is checked, then
# published from hub/ with its own publish-* script (wrangler pinned there once), before any
# deploy (pages load theme.css live). A failing CHECK stops the push, so repo and Worker
# never disagree; a failing PUBLISH only warns. Cloudflare values come from .env in a
# subshell; without them the publish is skipped (wrangler would start a browser login).
publish_hub_worker() {   # <name> <hub/package.json publish script> <check command, run in hub/>
  local name="$1" script="$2" check="$3"
  local manual="cd hub && set -a && source ../.env && set +a && npm run $script"
  echo "→ $name changed — checking it before publishing..."
  if ! (cd hub && bash -c "$check"); then
    echo "✗ $name check failed — push stopped: nothing was pushed or published."
    echo "  Fix it, commit, and push again."
    exit 1
  fi
  if ! (set -a; [ ! -f .env ] || source .env; set +a; [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]); then
    echo "⚠ $name NOT published: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID"
    echo "  missing from .env (the push continues). Add them, then publish by hand:"
    echo "    $manual"
    return 0
  fi
  echo "→ Publishing $name..."
  if (set -a; [ ! -f .env ] || source .env; set +a; cd hub && npm run "$script"); then
    echo "✓ $name published."
  else
    echo "⚠ $name NOT published (the push continues). Publish by hand:"
    echo "    $manual"
  fi
}

if [ "$DIFF_UNKNOWN" = true ]; then
  echo "→ Changed files unknown — the theme and Hijri Workers were not checked"
  echo "  or published. If this push changes hub/theme/ or hub/hijri/, run:"
  echo "    cd hub && node theme/fallbacks.js && set -a && source ../.env && set +a && npm run publish-theme"
  echo "    cd hub && node --test test/hijri-*.test.js && set -a && source ../.env && set +a && npm run publish-hijri"
else
  if printf '%s\n' "$CHANGED_FILES" | grep -q '^hub/theme/'; then
    publish_hub_worker "Theme (theme.i36o.workers.dev)" "publish-theme" "node theme/fallbacks.js"
  fi
  if printf '%s\n' "$CHANGED_FILES" | grep -q '^hub/hijri/'; then
    publish_hub_worker "Hijri Worker (dar-hijri.i36o.workers.dev)" "publish-hijri" "node --test test/hijri-*.test.js"
  fi
fi

# Build once, for the deploys and OTA below — when hosting-relevant, or native (the store
# path needs dist/). Without a build, nothing below uses dist/; a manual deploy still
# builds first (§15b).
BUILT=false
if [ "$DEPLOY_NEEDED" = true ] || [ "$IS_NATIVE" = true ]; then
  npm run build
  BUILT=true
else
  echo "→ No hosting-relevant files changed — skipping build and deploy."
fi

# --- Releasing to users (§15r). The preview deploys automatically and is a CHECK (a failure
# stops the push). Then ONE question releases this same build to the web and, for a
# web-only change that affects the bundle, to phones by OTA — so the website and the app
# never drift apart. A failed release only warns; each is attempted on its own. Native
# changes ask about stores and OTA separately below, so here only the web is named.
# The preview channel (--expires 30d, Firebase's maximum) lapses after 30 days without a
# hosting-relevant push; the next one recreates it (new URL suffix).
OTA_WITH_RELEASE=false
if [ "$IS_NATIVE" = false ] && [ "$OTA_RELEVANT" = true ]; then
  OTA_WITH_RELEASE=true
fi
RELEASE_TO_USERS=false
if [ "$DEPLOY_NEEDED" = true ]; then
  echo "→ Deploying preview channel (pwa-test)..."
  if ! firebase hosting:channel:deploy pwa-test --expires 30d; then
    echo "✗ Preview deploy failed — push stopped: nothing was pushed or released."
    echo "  Usually Firebase sign-in or the network; fix it and push again."
    exit 1
  fi
  echo "✓ Preview channel updated."
  if [ "$OTA_WITH_RELEASE" = true ]; then
    RELEASE_TARGETS="web (i36o.web.app) and phones (OTA)"
  else
    RELEASE_TARGETS="web (i36o.web.app)"
  fi
  LC_ALL=C.UTF-8 read -p "  Release this build to users — $RELEASE_TARGETS? (y/N) " -n 1 -r < /dev/tty
  echo
  if is_yes "$REPLY"; then
    RELEASE_TO_USERS=true
    echo "→ Releasing to the web (i36o.web.app)..."
    if firebase deploy --only hosting; then
      echo "✓ Web released."
    else
      echo "⚠ Web NOT released (the push continues). Release it by hand:"
      echo "    npm run build && firebase deploy --only hosting"
    fi
  else
    echo "  Skipped — users are unchanged. Release later by hand:"
    echo "    web:    npm run build && firebase deploy --only hosting"
    if [ "$OTA_WITH_RELEASE" = true ]; then
      echo "    phones: npm run build && rm -rf dist/assets/screenshots && set -a && source .env && set +a && bash scripts/release-to-otakit.sh"
    fi
  fi
elif [ "$IS_NATIVE" = true ]; then
  echo "→ No hosting-relevant files changed — skipping preview deploy (the build above still ran, for the native path)."
fi

# Screenshots are for the web manifest only (Microsoft Store, §15b): the web already shipped
# them; the store build and the OTA bundle reuse dist/ without them. Only when this push
# built dist/ — never touch a dist/ built by hand.
if [ "$BUILT" = true ] && [ -d dist/assets/screenshots ]; then
  echo "→ Stripping PWA-only screenshots from dist/ before native sync/OTA..."
  rm -rf dist/assets/screenshots
fi

# otakit and the Baserow update need .env's values exported (Vite's own reading of .env
# exports nothing); only when something below can use them.
if [ "$IS_NATIVE" = true ] || [ "$OTA_RELEVANT" = true ]; then
  if [ -f .env ]; then
    set -a
    # shellcheck source=/dev/null  # git-ignored, so there is nothing to follow
    source .env
    set +a
  fi
  if ! command -v otakit &> /dev/null; then
    echo "  (otakit CLI not found, installing...)"
    npm install -g @otakit/cli@1.4.0   # pinned (2026-10-22): the version every release so far used; change it deliberately
  fi
fi

if [ "$IS_NATIVE" = false ]; then
  if [ "$OTA_RELEVANT" = false ]; then
    # Nothing to ship (not a failure), so no store fallback is offered.
    if [ "$DIFF_UNKNOWN" = true ]; then
      # Unknown list: no automatic release; the manual commands instead.
      echo "→ Changed files unknown — native submission and OTA release were not"
      echo "  attempted automatically. If this push needs them, run manually:"
      echo "    npm run build && rm -rf dist/assets/screenshots && env -u OTA_CHANNEL npx cap sync android"
      echo "    cd android && fastlane deploy_google && fastlane deploy_huawei"
      echo "    set -a && source .env && set +a && bash scripts/release-to-otakit.sh"
    else
      echo "→ No web-bundle-relevant files changed — skipping OTA release."
    fi
  elif [ "$RELEASE_TO_USERS" != true ]; then
    # Declined above: phones stay as they are, like the web.
    echo "→ Web and phones not released (declined above)."
  else
    echo "→ Releasing to phones (OTA)..."

    # A failed OTA only warns (set -e must not end the push) and offers the second route for
    # the same bundle: a store submission.
    if ! I360_DEFER_TAG_PUSH_UNTIL_PID=$PPID bash scripts/release-to-otakit.sh; then
      echo "⚠ Phones NOT released by OTA (the push continues)."
      LC_ALL=C.UTF-8 read -p "  Submit to stores instead (Google Play + Huawei AppGallery)? (y/N) " -n 1 -r < /dev/tty
      echo
      if is_yes "$REPLY"; then
        submit_to_stores
      else
        echo "  Skipped. Mobile users won't receive this update until OTA or a"
        echo "  store submission succeeds. Release by OTA later by hand:"
        echo "    npm run build && rm -rf dist/assets/screenshots && set -a && source .env && set +a && bash scripts/release-to-otakit.sh"
      fi
    fi
  fi
else
  echo "→ Native change detected."
  echo "  iOS: build & submit manually from the Mac VM — this Codespace"
  echo "  (Linux) can never run Xcode/xcodebuild, so iOS is never part of"
  echo "  this automated flow, regardless of what changed."

  # The release state written by pre-commit: used only if its version still matches
  # package.json (a commit may have been amended or reset); otherwise the manual prompt.
  STATE_FILE="$(git rev-parse --show-toplevel)/.git/i360-pending-release.json"
  HAS_VALID_STATE=false
  if [ -f "$STATE_FILE" ]; then
    if ! STATE_VERSION=$(node -p "try { require('$STATE_FILE').version } catch { '' }" 2>&1); then
      echo "  ⚠ Could not run node to read $STATE_FILE ($STATE_VERSION) —"
      echo "    treating as no saved version, falling back to the fully manual prompt."
      STATE_VERSION=""
    fi
    PKG_VERSION=$(node -p "require('./package.json').version")
    if [ "$STATE_VERSION" = "$PKG_VERSION" ] && [ -n "$STATE_VERSION" ]; then
      HAS_VALID_STATE=true
      echo "  Release version: $STATE_VERSION"
      echo "  Baserow release string: $(node -p "require('$STATE_FILE').baserowVersionString")"
    fi
  fi

  # Prompts read /dev/tty: stdin was the pushed refs, already read (a plain `read` would hit
  # EOF and fail under set -e).
  LC_ALL=C.UTF-8 read -p "  Submit to Google Play + Huawei AppGallery? (y/N) " -n 1 -r < /dev/tty
  echo
  STORE_SUBMISSION_DECLINED=false
  if is_yes "$REPLY"; then
    submit_to_stores
    if [ "$HAS_VALID_STATE" = true ]; then
      update_baserow_version
      rm -f "$STATE_FILE"
    fi
  else
    STORE_SUBMISSION_DECLINED=true
    echo "  Skipped. Run manually when ready (build + clean sync first —"
    echo "  see submit_to_stores above for why the sync matters):"
    echo "    npm run build && rm -rf dist/assets/screenshots && env -u OTA_CHANNEL npx cap sync android"
    echo "    cd android && fastlane deploy_google && fastlane deploy_huawei"
    if [ "$HAS_VALID_STATE" = true ]; then
      echo "  The pending release state is preserved — this prompt will show"
      echo "  the same version and Baserow string again on a later push."
    fi
  fi

  # OTA is its own question, never tied to the store answer (OTA reaches users without store
  # review), and only when the bundle changed.
  if [ "$OTA_RELEVANT" = false ]; then
    echo "→ No web-bundle-relevant files changed — skipping OTA release."
  else
    # Warn when the stores were declined: JS that relies on a native change must not reach
    # phones still on the old binary (§14o).
    if [ "$STORE_SUBMISSION_DECLINED" = true ]; then
      echo "  ⚠ Store submission was declined above, but this push also"
      echo "    changes web-bundle-relevant files. If any of those changes"
      echo "    assume a native-side value that hasn't actually reached"
      echo "    real devices yet, releasing this bundle via OTA now could"
      echo "    break the app for anyone still on the older native binary."
    fi
    LC_ALL=C.UTF-8 read -p "  Release current bundle to OtaKit? (y/N) " -n 1 -r < /dev/tty
    echo
    if is_yes "$REPLY"; then
      echo "→ Releasing current bundle to OtaKit (runtimeVersion-tagged)..."
      # || true: a failed OTA must not end the push under set -e.
      I360_DEFER_TAG_PUSH_UNTIL_PID=$PPID bash scripts/release-to-otakit.sh || true
    else
      echo "  Skipped. Run manually when ready:"
      echo "    set -a && source .env && set +a && bash scripts/release-to-otakit.sh"
    fi
  fi
fi

echo
exit 0
