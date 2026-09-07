#!/usr/bin/env bash
# scripts/pre-commit-hook.sh — installed as .git/hooks/pre-commit (see the
# fresh-Codespace checklist for the one-time setup command). Fires
# automatically on every `git commit`.
#
# Exists specifically to close a real incident (2026-09-03): the
# @capacitor/browser native dependency shipped without a manual
# runtimeVersion bump in capacitor.config.ts, since nothing enforced
# remembering that step — OtaKit had no signal the previously-staged
# base-channel bundle was now incompatible, and a fresh install of the
# new native binary silently applied stale, pre-migration JS over it.
# runtimeVersion is now derived from package.json's version directly
# (see capacitor.config.ts), which only shifts the real requirement: the
# version itself must never be forgotten to bump on a genuine native
# change. This hook makes that an explicit, hard-to-skip prompt rather
# than a manual step relying on memory — the exact class of gap that
# caused the incident in the first place.
#
# Why pre-commit and not pre-push for the actual version-bump/file-edit
# work: pre-push runs after the commit(s) being pushed are already
# finalized, immutable objects — any file changes a pre-push hook makes
# are NOT part of what's being pushed, only a new, separate, uncommitted
# diff. pre-commit runs BEFORE the commit object is created, so
# re-staging package.json here (git add) genuinely becomes part of this
# commit — the same mechanism tools like lint-staged already rely on.
# pre-push's own, separate role in this flow is limited to consuming the
# state file this hook writes — see pre-push-hook.sh's submit_to_stores().
#
# Exits 0 in every real case (including explicit cancellation) — never
# blocks a commit. A native-relevant change committed without a decided
# version is a legitimate, real scenario (e.g. still actively developing/
# testing locally, not yet ready to commit to a release number) — pre-push
# gracefully degrades to the old, fully-manual prompt if no valid state
# file exists when a store submission is later attempted.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

source "$REPO_ROOT/scripts/native-pattern.sh"

STAGED_FILES=$(git diff --cached --name-only)

IS_NATIVE=false
if echo "$STAGED_FILES" | grep -qE "$NATIVE_PATTERN"; then
  IS_NATIVE=true
fi

if [ "$IS_NATIVE" = false ]; then
  exit 0
fi

STATE_FILE="$REPO_ROOT/.git/i360-pending-release.json"
CURRENT_VERSION=$(node -p "require('./package.json').version")

# A state file is only valid for THIS specific bump — its recorded
# version must match what's currently in package.json. If package.json
# was reset/amended back to an earlier version since the state file was
# written, that's a real, deliberate signal the earlier decision no
# longer applies, not something to keep silently trusting.
if [ -f "$STATE_FILE" ]; then
  if ! STATE_VERSION=$(node -p "try { require('$STATE_FILE').version } catch { '' }" 2>&1); then
    echo "  ⚠ Could not run node to read $STATE_FILE ($STATE_VERSION) —"
    echo "    treating as no saved version, falling back to a fresh prompt."
    STATE_VERSION=""
  fi
  if [ "$STATE_VERSION" = "$CURRENT_VERSION" ]; then
    # Already decided earlier this session, still consistent — reuse
    # silently, no re-prompt for a second native-relevant commit.
    exit 0
  fi
fi

echo
echo "→ Native-relevant change staged (android/, ios/, capacitor.config.ts,"
echo "  or package.json/package-lock.json)."
echo "  Current version: $CURRENT_VERSION"

while true; do
  # 'q' works as a single keypress here, matching the y/N prompts in
  # pre-push-hook.sh (-n 1 -r) — no version this project will ever ask
  # for starts with a literal "q" (the X.Y.Z regex below is purely
  # numeric), so treating a leading "q" as an unambiguous, immediate
  # cancel signal is safe. Reads one character first; if it's not "q",
  # a second read picks up the rest of the line (whatever the user
  # already typed, buffered on the tty, up to their Enter) and combines
  # both into the full input — 'cancel' (the word) still works exactly
  # as before, just still needs Enter, since a single keypress alone
  # can't distinguish it from a real version starting with 'c' (it
  # couldn't anyway — 'c' isn't a digit — but the point is generality:
  # this only special-cases the one single-keypress signal that's safe to).
  read -p "  Enter new version for this release (or 'q' to skip): " -n 1 -r FIRST_CHAR < /dev/tty
  if [[ "$FIRST_CHAR" = "q" ]]; then
    echo
    rm -f "$STATE_FILE"
    echo "  Skipped — this commit will proceed without a version bump."
    echo "  A later store-submission attempt will fall back to the fully"
    echo "  manual prompt, since no version will have been decided."
    exit 0
  fi
  read -r REST_OF_INPUT < /dev/tty
  NEW_VERSION="${FIRST_CHAR}${REST_OF_INPUT}"
  if [[ "$NEW_VERSION" = "cancel" ]]; then
    rm -f "$STATE_FILE"
    echo "  Skipped — this commit will proceed without a version bump."
    echo "  A later store-submission attempt will fall back to the fully"
    echo "  manual prompt, since no version will have been decided."
    exit 0
  fi
  if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "  ✗ \"$NEW_VERSION\" isn't a valid X.Y.Z version — try again."
    continue
  fi
  # sort -V (version sort), not a plain string comparison — a naive
  # string compare would incorrectly rank "0.13.9" above "0.13.10".
  HIGHEST=$(printf '%s\n%s\n' "$CURRENT_VERSION" "$NEW_VERSION" | sort -V | tail -1)
  if [ "$HIGHEST" != "$NEW_VERSION" ] || [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
    echo "  ✗ $NEW_VERSION is not greater than the current $CURRENT_VERSION — try again."
    continue
  fi
  break
done

echo "→ Calculating release date..."
GREGORIAN_DATE=$(date +'%d-%m-%Y')
HIJRI_DATE=$(node scripts/get-hijri-date.js)

BASEROW_VERSION_STRING="إصدار ${NEW_VERSION} @ ${GREGORIAN_DATE} م / ${HIJRI_DATE} هـ"

# What's-new text for Google Play/Huawei AppGallery release notes
# (2026-09-06) — asked here, not at push time, matching the version
# prompt's own reasoning: decided once, reused silently on a later push
# via the same state file, rather than re-asked every time. Optional
# (plain Enter skips) — not every release necessarily has a meaningful
# user-facing change worth a note, and submit_to_stores() (pre-push-
# hook.sh) already degrades gracefully to whatever was previously live
# on each store when this is empty, rather than requiring one.
read -p "  What's new for this release? (Arabic, or Enter to skip): " WHATS_NEW < /dev/tty

echo "→ Bumping package.json to $NEW_VERSION..."
npm version "$NEW_VERSION" --no-git-tag-version > /dev/null
git add package.json package-lock.json

# node -e with JSON.stringify, not a raw heredoc (2026-09-04, real bug
# caught in testing) — the date strings contain literal backslashes
# (yyyy\mm\dd, the requested format), which aren't valid JSON escape
# sequences on their own. A heredoc interpolating them directly produces
# genuinely malformed JSON that require() silently fails to parse later
# — caught because the "reuse silently" check unexpectedly kept
# re-prompting instead of ever finding a valid state file. Passing values
# as separate argv arguments (not interpolated into the JS string itself)
# also avoids any shell-quoting/injection risk. Note: for `node -e`,
# process.argv is [node-path, arg1, arg2, ...] — no "[eval]" placeholder
# the way a real script file's argv has — confirmed directly after an
# initial off-by-one here silently produced an undefined stateFile path.
node -e '
const fs = require("fs");
const [, version, baserowVersionString, gregorianDate, hijriDate, whatsNew, stateFile] = process.argv;
fs.writeFileSync(stateFile, JSON.stringify({ version, baserowVersionString, gregorianDate, hijriDate, whatsNew }, null, 2));
' "$NEW_VERSION" "$BASEROW_VERSION_STRING" "$GREGORIAN_DATE" "$HIJRI_DATE" "$WHATS_NEW" "$STATE_FILE"

echo "✓ Version bumped to $NEW_VERSION and staged for this commit."
echo "  Baserow release string: $BASEROW_VERSION_STRING"
echo "  This will be offered automatically when you later confirm a real"
echo "  store submission — no need to re-enter it."
echo
