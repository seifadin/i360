#!/usr/bin/env bash
# Shared release-with-retry logic for OtaKit — extracted (2026-08-17) after
# noticing the exact same "unset OTA_CHANNEL, otakit upload --release,
# retry once on failure" logic was duplicated three times across
# scripts/pre-push-hook.sh (Android), ios/fastlane/Fastfile (iOS via Mac
# VM), and ios/App/ci_scripts/ci_post_xcodebuild.sh (iOS via Xcode Cloud).
# One place to fix, three consumers — matches this project's own
# extract-once, not-thrice principle (i360-instructions.md §12 rule 12).
#
# MUST be run from the repo root (where dist/, package.json,
# capacitor.config.ts live) — each caller is responsible for cd'ing there
# first, since they live at different relative depths and that's genuinely
# specific to where each script physically sits, not something to
# generalize here.
#
# Deliberately does NOT set -e at the top level — this script's own job is
# to survive a failure and retry, not propagate one immediately.
#
# Exit code: 0 on success, 1 on failure after the retry, 0 also when
# skipped as not web-relevant (see below) — callers already treat a
# skip and a real success identically (both are "nothing more to do
# here"), so no new exit code is introduced. Callers decide how to react
# to a genuine failure — this script never aborts a caller itself;
# whether that happens depends on how the caller invokes it (see each
# call site's own comment for its specific safety handling).

set +e

# Shared OTA_RELEVANT safeguard (2026-09-04) — added HERE, not only in
# pre-push-hook.sh, after a real, confirmed production incident: a
# scripts/-only commit (no src/, public/, or any other web-relevant file
# at all) reached a real device as an applied OTA bundle and broke data
# loading. Traced (not fully confirmed, but the strongest available
# explanation): this script's OTHER two callers — deploy_apple and
# ci_post_xcodebuild.sh — call it UNCONDITIONALLY after every genuine iOS
# submission, with no equivalent to pre-push-hook.sh's own OTA_RELEVANT
# check at all. A real, confirmed asymmetry between the platforms' release
# paths, regardless of whether it's the exact cause of that one incident.
#
# This check lives HERE — inside the one script all three callers already
# share — rather than duplicated in each of them, so every caller is
# covered by the same, single definition, and any future caller
# automatically inherits it too.
#
# LAST_OTA_RELEASE_TAG is a deliberately movable ("floating") git tag —
# force-moved to HEAD and force-pushed after every successful release
# below — used as the shared reference point ACROSS environments
# (Codespace, Mac VM, Xcode Cloud's own ephemeral containers), none of
# which otherwise share any state with each other. Compared via git diff
# against the tag itself, not "the previous commit" — correctly covers
# however many commits accumulated since the last real release, not just
# the single most recent one.
#
# Best-effort by design, not a hard requirement: git fetch/rev-parse
# failures here (a shallow clone without tags, a tag that hasn't
# propagated yet, no network) all fall through to "proceed with the
# release" rather than silently skip one that's genuinely needed —
# occasionally releasing when not strictly necessary is far less harmful
# than silently failing to ship a real update. This mirrors
# pre-push-hook.sh's own established stance elsewhere: when a git
# operation's result is uncertain, default to treating it as changed.
REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/ota-relevant-pattern.sh"
LAST_OTA_RELEASE_TAG="last-ota-release"

git fetch origin "refs/tags/$LAST_OTA_RELEASE_TAG:refs/tags/$LAST_OTA_RELEASE_TAG" >/dev/null 2>&1

if git rev-parse "$LAST_OTA_RELEASE_TAG" >/dev/null 2>&1; then
  CHANGED_SINCE_LAST_RELEASE=$(git diff --name-only "$LAST_OTA_RELEASE_TAG" HEAD 2>/dev/null)
  if [ $? -eq 0 ] && ! echo "$CHANGED_SINCE_LAST_RELEASE" | grep -qE "$OTA_RELEVANT_PATTERN"; then
    echo "→ Nothing web-bundle-relevant changed since the last OTA release ($LAST_OTA_RELEASE_TAG) — skipping."
    exit 0
  fi
else
  echo "→ No $LAST_OTA_RELEASE_TAG tag found yet (or unreachable from here) — treating this as the baseline release."
fi

unset OTA_CHANNEL
otakit upload --release
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "  (OtaKit release failed, retrying once...)"
  sleep 3
  unset OTA_CHANNEL
  otakit upload --release
  STATUS=$?
fi
set -e

if [ $STATUS -eq 0 ]; then
  echo "✓ OtaKit release published, tagged with the current runtimeVersion."
  # Move the shared reference tag here and push it, so ANY future caller
  # (any platform, any environment) correctly sees "nothing changed
  # since this release" until a genuinely web-relevant commit lands.
  # Best-effort push: if this specific environment can't push (e.g. a CI
  # environment with read-only repo access), the release above still
  # succeeded regardless — this project's own Codespace, which already
  # pushes on every real `git push`, will correctly re-sync the tag on
  # its own next release either way.
  git tag -f "$LAST_OTA_RELEASE_TAG" HEAD >/dev/null 2>&1
  if ! git push origin "refs/tags/$LAST_OTA_RELEASE_TAG" --force >/dev/null 2>&1; then
    echo "  (Could not push the $LAST_OTA_RELEASE_TAG tag from this environment —"
    echo "   the release above still succeeded. A future release from an"
    echo "   environment with push access will re-sync it.)"
  fi
else
  echo "⚠ OtaKit release failed after retry. Retry manually when ready:"
  echo "    unset OTA_CHANNEL && otakit upload --release"
fi

exit $STATUS
