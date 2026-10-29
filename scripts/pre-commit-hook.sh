#!/usr/bin/env bash
# scripts/pre-commit-hook.sh — runs on every `git commit` (installed once per clone as a shim,
# i360-instructions.md §10). When a native-relevant file is staged (NATIVE_PATTERN), it asks
# for the release version: runtimeVersion derives from package.json's version, so a native
# change released without a bump would leave OTA bundles matched to the wrong binary (§14l).
# Here, not in pre-push: only pre-commit can still add the bumped package.json to the commit
# being made. pre-push later reads the state file this writes (store submission, Baserow).
# Never blocks a commit: 'q' (or 'cancel') skips, and pre-push then falls back to its manual
# prompt.

set -e

# One-key y/N answers: "y", "Y", or "غ" (the same key on an Arabic keyboard), read with
# LC_ALL=C.UTF-8 so "غ" is one character in any locale (§15r).
is_yes() { [[ $1 == [Yy] || $1 == 'غ' ]]; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

source "$REPO_ROOT/scripts/native-pattern.sh"
source "$REPO_ROOT/scripts/fix-ci-scripts-exec-bit.sh"

STAGED_FILES=$(git diff --cached --name-only)

IS_NATIVE=false
if echo "$STAGED_FILES" | grep -qE "$NATIVE_PATTERN"; then
  IS_NATIVE=true
fi

if [ "$IS_NATIVE" = false ]; then
  exit 0
fi

# Xcode Cloud's ci_scripts must stay executable (§15c); fixed here first, since a fix staged
# now is part of this commit. Called inside `if`: its "nothing to fix" return 1 would
# otherwise trip set -e.
if fix_ci_scripts_exec_bit; then
  echo "  (folded into this commit automatically — no follow-up needed)"
fi

STATE_FILE="$REPO_ROOT/.git/i360-pending-release.json"
CURRENT_VERSION=$(node -p "require('./package.json').version")

# A saved state is valid only while its version matches package.json (an amend or reset
# back is a deliberate signal that the earlier decision no longer applies).
if [ -f "$STATE_FILE" ]; then
  if ! STATE_VERSION=$(node -p "try { require('$STATE_FILE').version } catch { '' }" 2>&1); then
    echo "  ⚠ Could not run node to read $STATE_FILE ($STATE_VERSION) —"
    echo "    treating as no saved version, falling back to a fresh prompt."
    STATE_VERSION=""
  fi
  if [ "$STATE_VERSION" = "$CURRENT_VERSION" ]; then
    # Already decided for this version: no second prompt.
    exit 0
  fi
fi

echo
echo "→ Native-relevant change staged (android/, ios/, capacitor.config.ts,"
echo "  or package.json/package-lock.json)."
echo "  Current version: $CURRENT_VERSION"

while true; do
  # 'q' cancels on a single key (a version is digits only); anything else reads the rest of
  # the line. 'cancel' still works with Enter.
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
  # sort -V: "0.13.10" is above "0.13.9".
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

# What's new (Google Play and Huawei release notes): everything up to Ctrl+D in one `cat`, so
# a multi-line paste arrives whole, then a line count to confirm; "N" starts over.
while true; do
  echo "  What's new for this release? (Arabic, type or paste freely —"
  echo "  press Ctrl+D on its own line when done):"
  WHATS_NEW=$(cat < /dev/tty)
  if [ -z "$WHATS_NEW" ]; then
    LINE_COUNT=0
  else
    LINE_COUNT=$(printf '%s\n' "$WHATS_NEW" | wc -l)
  fi
  LC_ALL=C.UTF-8 read -p "  Captured $LINE_COUNT line(s). Use this? (y/N) " -n 1 -r CONFIRM < /dev/tty
  echo
  if is_yes "$CONFIRM"; then
    break
  fi
  echo "  Let's try again."
done

echo "→ Bumping package.json to $NEW_VERSION..."
npm version "$NEW_VERSION" --no-git-tag-version > /dev/null
git add package.json package-lock.json

# JSON written by node with the values as arguments: correct escaping of free text, no shell
# quoting. With `node -e`, process.argv is [node, arg1, …] (no script-path slot).
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
