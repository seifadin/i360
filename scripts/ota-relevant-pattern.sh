# scripts/ota-relevant-pattern.sh — sourced by both pre-push-hook.sh and
# release-to-otakit.sh, not duplicated in each. Extracted 2026-09-04
# alongside the release-to-otakit.sh safeguard — the same reasoning as
# native-pattern.sh's own extraction: a single source means the two
# consumers can never silently drift apart.
#
# Rewritten 2026-10-03: INCLUSION list -> EXCLUSION lists. The original
# OTA_RELEVANT_PATTERN listed the files known to feed `npm run build`'s
# output; anything unlisted silently counted as "irrelevant." That failed
# in practice: ota-timing.json (imported by src/lib/startupHealth.ts)
# fed the bundle but was never listed, so editing it alone would have
# skipped the OTA release with no warning. The same lesson was already
# locked for Xcode Cloud's path-scoping (§15: "a wrong inclusion list
# fails silently, the worse failure mode"), and release-to-otakit.sh's
# own comment states the matching stance — releasing when not strictly
# necessary is far less harmful than silently failing to ship a real
# update. An exclusion list fails the safe way: a file nobody has
# classified yet counts as RELEVANT, costing at most one redundant
# deploy/release, never a missed one. (Bonus: git quotes non-ASCII paths
# in --name-only output, e.g. "src/\330...", which never matched the old
# `^(src/` inclusion — under exclusion they fall through to relevant.)
#
# Two lists, one a strict superset of the other — deliberately not
# duplicated: _UNAFFECTED_COMMON is shared, each list only adds its own.
#
#   HOSTING_UNAFFECTED_PATTERN — files that can never change what Firebase
#   Hosting serves. Anything else (including firebase.json/.firebaserc,
#   which change hosting behavior without ever changing dist/ — the SPA
#   rewrite rules behind the robots.txt/llms.txt incident) triggers a
#   build + deploy.
#
#   OTA_UNAFFECTED_PATTERN — files that can never change the BUILT BUNDLE
#   (dist/). Adds to the common set: firebase.json/.firebaserc (hosting
#   config, not bundle content); tsconfig*.json (`tsc -b` is noEmit — a
#   config-only change can block or pass the build but never changes
#   dist/'s contents); and package.json/package-lock.json/
#   capacitor.config.ts, which are handled by NATIVE_PATTERN's own
#   resubmission flow instead (unchanged from the original design — a
#   carve-out, not a claim that they can't affect dist/: package.json
#   feeds __APP_VERSION__).
#   Because the OTA list contains everything the hosting list does,
#   "OTA relevant" always implies "hosting relevant" — pre-push-hook.sh
#   relies on that: a skipped build can never leave an OTA path without
#   its dist/.
#
# Root-level anchoring is deliberate: `[^/]+\.md$` excludes root docs
# (README.md, CHANGELOG.md) but NOT public/*.md, which would ship in dist/.
_UNAFFECTED_COMMON='scripts/|android/|ios/|[^/]+\.md$|\.gitignore$|\.env\.example$'
HOSTING_UNAFFECTED_PATTERN="^(${_UNAFFECTED_COMMON})"
OTA_UNAFFECTED_PATTERN="^(${_UNAFFECTED_COMMON}|firebase\.json\$|\.firebaserc\$|tsconfig[^/]*\.json\$|package\.json\$|package-lock\.json\$|capacitor\.config\.ts\$)"

# any_file_outside "<unaffected pattern>" "<newline-separated file list>"
# Succeeds (exit 0) if at least one listed file does NOT match the
# pattern, i.e. something relevant changed. An EMPTY list fails (exit 1):
# nothing changed, nothing to act on — the same answer the old inclusion
# check gave, and required by release-to-otakit.sh, where an empty diff
# against last-ota-release is the normal "already released" case. Callers
# with a genuinely UNKNOWN diff (not an empty one) must handle that
# themselves — see DIFF_UNKNOWN in pre-push-hook.sh. Call it inside `if`,
# not as a bare statement: its exit 1 would trip `set -e`.
any_file_outside() {
  local pattern="$1" files="$2"
  printf '%s\n' "$files" | grep -v '^$' | grep -qvE "$pattern"
}
