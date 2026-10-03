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

# True only when the changed-file list is genuinely UNKNOWN (as opposed to
# empty because nothing changed) — see the one branch below that sets it.
# The hosting gate further down needs to tell those two apart: an empty
# list from "nothing changed" should skip a deploy, an empty list from
# "couldn't compute the diff" must not.
DIFF_UNKNOWN=false

# New branch / first push — remote_sha is all zeros, nothing to diff
# against. Treat as "changed everything" to be safe (routes to native
# path, which just prompts rather than silently doing anything).
#
# Also treat an UNKNOWN (non-zero) remote SHA the same way — a real
# failure hit in practice (2026-08-19): `git diff` against a SHA this
# clone can't resolve aborts with "fatal: bad object <sha>", which under
# `set -e` killed the push outright before any of the hook's own logic
# ran. Root cause wasn't pinned down with certainty — regardless, a hook
# that can hard-fail on a git-internal object-lookup hiccup is too
# fragile; falling back to "changed everything" costs nothing (native
# path just prompts) and can never block a push that would otherwise
# succeed.
if [ -z "$REMOTE_SHA" ] || [[ "$REMOTE_SHA" =~ ^0+$ ]] || ! git cat-file -e "$REMOTE_SHA^{commit}" 2>/dev/null; then
  echo "→ Remote SHA unresolvable (a new branch, or a git-internal lookup"
  echo "  issue) — falling back to a safe default instead of failing the"
  echo "  push (which default is printed just below)."
  # Diagnostic (2026-09-07) — added after this branch was confirmed,
  # twice, to be reached even on a plain, non-force push to an
  # already-correctly-tracked branch (where REMOTE_SHA should have
  # resolved cleanly) — genuinely surprising, not the new-branch/stale-
  # object case this fallback was originally built for. Real values
  # shown here rather than continuing to guess blind next time this
  # fires.
  echo "  (diagnostic — local_ref='$LOCAL_REF' local_sha='$LOCAL_SHA'"
  echo "   remote_sha='$REMOTE_SHA')"
  # LOCAL_SHA guarded too, not just REMOTE_SHA — a real, confirmed
  # failure (2026-09-07): this exact fallback line crashed with "fatal:
  # ambiguous argument ''" when LOCAL_SHA was itself unexpectedly empty,
  # under set -e, killing the push before anything else in the hook
  # could run — the same class of fragility REMOTE_SHA was already
  # guarded against, just not this variable too. Falls through rather
  # than crash — but NOT to "changed everything": with no local SHA there
  # is nothing to diff, so CHANGED_FILES stays empty and DIFF_UNKNOWN=true.
  # Only the build + preview deploy honor DIFF_UNKNOWN (they always run);
  # native submission and OTA release see an empty list and are left to
  # the developer, with the manual commands printed at the end. Messages
  # reworded 2026-10-03 to say exactly that (they used to claim
  # "everything changed"); the behavior itself was kept deliberately.
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

# ci_scripts must stay executable in git (§15's silent 100755→100644
# incident — Xcode Cloud's zsh fallback survived it once, but that's a
# documented leniency, not a contract). Self-announcing + self-repairing
# at the moment it matters, matching submit_to_stores()'s
# verify-don't-trust pattern.
#
# Secondary safety net only (2026-09-12) — the primary fix now lives in
# pre-commit-hook.sh, since a fix here only ever lands in the working
# directory/index, never the commit already in flight, needing a
# separate follow-up commit+push every real time this fired. pre-commit
# runs before the commit object exists, so re-staging there genuinely
# becomes part of the same commit — this can't do that, structurally,
# no matter how it's written. Kept here anyway for one real, narrow
# edge case pre-commit can't reach at all: the bit lost with no new
# commit made (nothing fires there without one). Harmless overlap in
# the common case, where pre-commit already fixed it first — this then
# finds nothing wrong and stays silent.
#
# Shared with pre-commit-hook.sh via scripts/fix-ci-scripts-exec-bit.sh
# (full reasoning, including why the real disk file is checked directly
# and not just git's index, lives there — not duplicated here).
source "$(git rev-parse --show-toplevel)/scripts/fix-ci-scripts-exec-bit.sh"
if fix_ci_scripts_exec_bit; then
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

  # What's-new release notes (2026-09-06) — pre-commit-hook.sh's own
  # prompt saved this into $STATE_FILE alongside the version, if a
  # native-relevant commit happened this session. Genuinely optional:
  # this function is also called from the web-only OTA-failure fallback
  # above, where no such state exists at all (not a native-relevant push
  # to begin with) — degrades gracefully to whatever each store already
  # has live, rather than requiring one.
  if [ -n "$STATE_FILE" ] && [ -f "$STATE_FILE" ]; then
    local whats_new
    whats_new=$(node -p "try { require('$STATE_FILE').whatsNew || '' } catch { '' }" 2>/dev/null || echo "")
    if [ -n "$whats_new" ]; then
      echo "→ Writing release notes for both stores..."
      # supply (Google Play) reads from this exact, file-based convention
      # — confirmed directly, no direct inline parameter exists. "ar"
      # (bare, no region suffix) is Google Play's own standard locale
      # code for generic Arabic — worth confirming on the first real
      # submission, same caution this project applies to every other
      # untested-on-a-real-device assumption. default.txt specifically
      # (not a version-code-named file): this project's version codes
      # (yyyyDDDHH) are always unique, never repeated, so a version-
      # specific file would never be found anyway — default.txt is
      # correctly used as the fallback on every single release.
      mkdir -p android/fastlane/metadata/android/ar/changelogs
      printf '%s' "$whats_new" > android/fastlane/metadata/android/ar/changelogs/default.txt

      # huawei_appgallery_connect_update_app_localization (2026-09-07
      # revision — see the Fastfile's own comment for the full reasoning)
      # reads from this exact, directory-based convention instead — the
      # earlier single-file changelog_path attempt is confirmed, via a
      # real submission, to not populate what AppGallery Connect's own
      # pre-submission app-info view actually shows.
      mkdir -p android/fastlane/metadata/huawei/ar
      printf '%s' "$whats_new" > android/fastlane/metadata/huawei/ar/release_notes
    fi
  fi

  echo "→ Submitting to both stores..."
  (cd android && fastlane deploy_google && fastlane deploy_huawei)
  echo "✓ Submitted to Google Play and Huawei AppGallery."
}

# Reads the release state file pre-commit-hook.sh wrote and PATCHes
# i360dbc's Version field in Baserow directly — no manual Baserow-console
# step needed after a real submission. Uses a separate, write-capable
# BASEROW_WRITE_KEY, deliberately never the client's own VITE_BASEROW_KEY
# (confirmed read-only, per the security review documented in
# i360-instructions.md — this write key must never get a VITE_ prefix or
# it would bake into the public client bundle).
#
# Never aborts the push on failure — a Baserow update failing after a
# real store submission has already succeeded is a real problem worth
# surfacing loudly, but not one that should make the script look like the
# whole release failed. Prints the value for manual entry either way.
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
  # JSON.stringify via node, not hand-built JSON string — same real bug
  # already caught and fixed in pre-commit-hook.sh's state-file write:
  # baserow_version_string contains literal backslashes (the requested
  # yyyy\mm\dd date format), which aren't valid JSON escapes on their own
  # and would otherwise produce a malformed request body.
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

# Shared with pre-commit-hook.sh — see scripts/native-pattern.sh for why
# this is sourced rather than duplicated.
source "$(git rev-parse --show-toplevel)/scripts/native-pattern.sh"
IS_NATIVE=false
if echo "$CHANGED_FILES" | grep -qE "$NATIVE_PATTERN"; then
  IS_NATIVE=true
fi

# Does this push change anything that could actually affect the BUILT
# WEB BUNDLE (dist/)? Real gap caught in practice (2026-08-19): the
# web-only branch below auto-releases to OtaKit unconditionally — so a
# pure scripts/ or docs change (this hook file itself, a moment ago)
# still published a new, distinct OTA release even though dist/ would be
# byte-identical to the previous one. Harmless (OtaKit just republishes
# the same content under a new timestamp-derived tag) but pure noise —
# a fresh Downloaded/Applied event on the dashboard for zero real change.
# Shared with release-to-otakit.sh (2026-09-04) — see
# scripts/ota-relevant-pattern.sh for the full reasoning and why it's
# sourced rather than duplicated.
#
# Rewritten 2026-10-03 as EXCLUSION lists (see ota-relevant-pattern.sh for
# why, and for the superset relationship between the two). Both checks go
# through any_file_outside(), called inside `if` — a bare call's exit 1
# would trip `set -e`.
source "$(git rev-parse --show-toplevel)/scripts/ota-relevant-pattern.sh"
OTA_RELEVANT=false
if any_file_outside "$OTA_UNAFFECTED_PATTERN" "$CHANGED_FILES"; then
  OTA_RELEVANT=true
fi

# Does this push change anything Firebase Hosting could serve differently?
# (Hosting gate, 2026-10-03.) A strict superset of OTA_RELEVANT — it also
# counts firebase.json/.firebaserc, tsconfig*.json and package*.json, which
# the OTA list deliberately sets aside — so OTA_RELEVANT=true always
# implies DEPLOY_NEEDED=true, and a skipped build can never leave the OTA
# path below without a dist/. An unknown diff (DIFF_UNKNOWN) always
# deploys: the safe direction.
DEPLOY_NEEDED=false
if [ "$DIFF_UNKNOWN" = true ] || any_file_outside "$HOSTING_UNAFFECTED_PATTERN" "$CHANGED_FILES"; then
  DEPLOY_NEEDED=true
fi

# Build once, shared by Firebase deploy below and OTA further down —
# avoids building dist/ twice for the same push.
#
# Gated (2026-10-03). This used to build and deploy on EVERY push to
# vite/main, "matching the two retired workflows' own behavior exactly" —
# a deliberate parity choice during the GitHub Actions migration, not a
# requirement. A scripts/-only push still uploaded all 1,753 files for a
# dist/ that was byte-identical. Now:
#   - main ALWAYS builds and deploys. A production push is a rare,
#     deliberate release, and an unconditional deploy there guarantees
#     production matches what was just pushed — worth more than the
#     saved minute, given the stale-dist/ incident in §15b.
#   - vite builds when DEPLOY_NEEDED, or when IS_NATIVE (the native path's
#     submit_to_stores relies on this build having run, even if the
#     preview deploy itself is skipped).
#   - A skipped build leaves local dist/ untouched. That is safe because
#     nothing below uses it in that case (OTA_RELEVANT implies
#     DEPLOY_NEEDED), but §15b's rule still holds for MANUAL deploys:
#     always `npm run build` first, never trust whatever dist/ holds.
BUILT=false
if [ "$BRANCH" = "vite" ] || [ "$BRANCH" = "main" ]; then
  if [ "$BRANCH" = "main" ] || [ "$DEPLOY_NEEDED" = true ] || [ "$IS_NATIVE" = true ]; then
    npm run build
    BUILT=true
  else
    echo "→ No hosting-relevant files changed — skipping build and deploy."
  fi
fi

# --- Firebase Hosting. Preview (vite) is gated on DEPLOY_NEEDED; production
# (main) is not — see the build comment above. The preview channel is
# created with --expires 30d (Firebase's maximum) and every deploy renews
# it, so with this gate it can now lapse after 30 days with no hosting-
# relevant push. Deliberately not engineered around: the next relevant
# push recreates it (a deploy to a missing channel creates it, though the
# URL's random suffix will change), and a manual refresh is one line:
#   npm run build && firebase hosting:channel:deploy pwa-test --expires 30d
if [ "$BRANCH" = "vite" ]; then
  if [ "$DEPLOY_NEEDED" = true ]; then
    echo "→ Deploying preview channel (pwa-test)..."
    firebase hosting:channel:deploy pwa-test --expires 30d
    echo "✓ Preview channel updated."
  elif [ "$IS_NATIVE" = true ]; then
    echo "→ No hosting-relevant files changed — skipping preview deploy (the build above still ran, for the native path)."
  fi
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

# Strip PWA-store-only assets (2026-09-12) — screenshots exist solely
# for the web manifest's own install-prompt/store-listing context
# (Microsoft Store via PWABuilder); never displayed anywhere in the
# app's own UI on any platform, unlike the icons (genuinely used
# in-app via Home.tsx on every platform, so those stay). Both the
# native apk/aab (via cap sync below) and the OTA bundle (via
# release-to-otakit.sh, further down) independently reuse this exact
# dist/ — done here, after the web deploy above already shipped the
# full dist/ with screenshots intact, but before either downstream
# path reuses it, so neither one carries image weight no installed
# native app ever actually needs.
#
# Only when THIS push built dist/ (2026-10-03). With the hosting gate a
# push can skip the build entirely; stripping then would silently modify
# whatever dist/ is on disk (one built by hand for a local preview or a
# web zip, say) and announce a native sync/OTA that isn't going to
# happen. Nothing downstream needs dist/ when no build ran: the native
# path always builds (IS_NATIVE), and OTA_RELEVANT implies DEPLOY_NEEDED.
if [ "$BUILT" = true ] && [ -d dist/assets/screenshots ]; then
  echo "→ Stripping PWA-only screenshots from dist/ before native sync/OTA..."
  rm -rf dist/assets/screenshots
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
#
# Gated (2026-10-03): every consumer — otakit itself, and submit_to_stores'
# Baserow update (BASEROW_WRITE_KEY etc.) — sits behind IS_NATIVE or
# OTA_RELEVANT, so a push that can reach neither no longer sources .env
# or installs a global CLI it will never use.
if [ "$IS_NATIVE" = true ] || [ "$OTA_RELEVANT" = true ]; then
  if [ -f .env ]; then
    set -a
    source .env
    set +a
  fi
  if ! command -v otakit &> /dev/null; then
    echo "  (otakit CLI not found, installing...)"
    npm install -g @otakit/cli
  fi
fi

if [ "$IS_NATIVE" = false ]; then
  if [ "$OTA_RELEVANT" = false ]; then
    # Nothing in this push could change dist/'s actual contents (see
    # OTA_UNAFFECTED_PATTERN above) — deliberately distinct from "tried and
    # failed" below: this is "nothing to ship," so no store-submission
    # fallback offer here, that fallback exists for a genuine failed
    # release, not a skipped one.
    if [ "$DIFF_UNKNOWN" = true ]; then
      # Not "nothing changed": the list is unknown (see the fallback at the
      # top). Same behavior as before — no automatic release — with an
      # honest message and the hook's own manual commands, reused verbatim.
      # (The native branch's identical skip line below needs no such case:
      # it is unreachable with an unknown diff, since an empty list can
      # never match NATIVE_PATTERN.)
      echo "→ Changed files unknown — native submission and OTA release were not"
      echo "  attempted automatically. If this push needs them, run manually:"
      echo "    npm run build && rm -rf dist/assets/screenshots && env -u OTA_CHANNEL npx cap sync android"
      echo "    cd android && fastlane deploy_google && fastlane deploy_huawei"
      echo "    unset OTA_CHANNEL && otakit upload --release"
    else
      echo "→ No web-bundle-relevant files changed — skipping OTA release."
    fi
  else
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
  fi
else
  echo "→ Native change detected."
  echo "  iOS: build & submit manually from the Mac VM — this Codespace"
  echo "  (Linux) can never run Xcode/xcodebuild, so iOS is never part of"
  echo "  this automated flow, regardless of what changed."

  # Consumes the state file pre-commit-hook.sh writes when it detects the
  # same native-relevant condition and prompts for a release version.
  # Re-validated here, not just trusted — the state file's recorded
  # version must still match current package.json (a commit could have
  # been amended/reset since it was written). If invalid or absent
  # (e.g. hooks bypassed with --no-verify, or the native-relevant commit
  # predates this feature), gracefully degrades to the fully manual
  # prompt below rather than failing.
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

  # Read from /dev/tty explicitly, not stdin — git hooks receive ref info
  # via stdin (already consumed by the while-read loop above), so a plain
  # `read` here would hit EOF immediately and fail under set -e, silently
  # blocking the push. This was a real bug caught in actual use, not
  # something the earlier file-detection tests could have revealed.
  read -p "  Submit to Google Play + Huawei AppGallery? (y/N) " -n 1 -r < /dev/tty
  echo
  STORE_SUBMISSION_DECLINED=false
  if [[ $REPLY =~ ^[Yy]$ ]]; then
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

  # Deliberately a SEPARATE question from store submission above, not
  # nested inside it — a real bug caught in actual use: OTA release was
  # originally coupled to the store-submission "y", so declining that
  # prompt (for any reason — maybe this push has nothing store-relevant
  # in it) silently skipped shipping the JS/web update too, even though
  # OTA exists specifically to reach users WITHOUT needing store review
  # at all. The two are conceptually unrelated risk decisions and must
  # stay independently answerable.
  #
  # Gated behind OTA_RELEVANT (same check the web-only branch already
  # applies above) — a real gap caught in practice (2026-08-27): a
  # native-only change (e.g. proguard-rules.pro alone) was still asking
  # this unconditionally. Answering yes republished dist/ byte-identical
  # to what was already live, under a new timestamp tag — harmless, but
  # a confusing no-op release with nothing to actually ship.
  if [ "$OTA_RELEVANT" = false ]; then
    echo "→ No web-bundle-relevant files changed — skipping OTA release."
  else
    # Real, confirmed risk (2026-09-06), not a hypothetical: a JS change
    # tied to a native-side value (e.g. capacitor.config.ts's
    # appReadyTimeout) can look completely fine here, yet genuinely
    # misbehave against an older native build's own, different
    # compiled-in value — a device still on the previous binary would
    # apply new JS that assumes a native change it was never actually
    # given. This warning does NOT couple the two questions back
    # together (that coupling was deliberately removed once already, see
    # the comment above) — it only makes a real risk visible right
    # before the same, still-independently-answerable question, for the
    # one specific combination where it actually applies.
    if [ "$STORE_SUBMISSION_DECLINED" = true ]; then
      echo "  ⚠ Store submission was declined above, but this push also"
      echo "    changes web-bundle-relevant files. If any of those changes"
      echo "    assume a native-side value that hasn't actually reached"
      echo "    real devices yet, releasing this bundle via OTA now could"
      echo "    break the app for anyone still on the older native binary."
    fi
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
fi

echo
exit 0
