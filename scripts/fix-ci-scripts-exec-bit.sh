# scripts/fix-ci-scripts-exec-bit.sh — sourced by both pre-commit-hook.sh
# and pre-push-hook.sh, not duplicated in each. Extracted 2026-09-12, same
# reasoning as native-pattern.sh's own extraction: the two consumers now
# need to run exactly the same fix, and a single source means they can
# never silently drift apart if one is ever edited without the other.
#
# pre-commit-hook.sh is the primary fix location — it runs before the
# commit object exists, so re-staging there genuinely becomes part of
# the same commit, closing the real, repeated annoyance a pre-push-only
# fix had: landing only in the working directory/index, needing a
# separate follow-up commit+push every time. pre-push-hook.sh keeps its
# own call too, deliberately not removed — a real, if narrow, edge case
# pre-commit structurally can't reach at all: the bit lost with no new
# commit made (nothing fires in pre-commit without one). Harmless
# overlap in the common case, where pre-commit already fixed it first —
# this then finds nothing wrong and stays silent.
#
# Checks the real, on-disk file directly (`[ ! -x "$f" ]`), not just
# git's own index (`git ls-files -s`) — a real, confirmed gap in an
# earlier version of this fix: the index can already, genuinely say
# 100755 despite the real file being non-executable, if an earlier fix
# already updated the index alone without ever touching disk. Catches
# either failure class now.
fix_ci_scripts_exec_bit() {
  local needs_fix=false
  for f in ios/App/ci_scripts/*.sh; do
    if [ ! -x "$f" ]; then
      needs_fix=true
    fi
  done
  if [ "$needs_fix" = true ] || git ls-files -s ios/App/ci_scripts/ | grep -q '^100644'; then
    echo "⚠ ci_scripts lost exec bit — restoring on disk and in the index:"
    chmod +x ios/App/ci_scripts/*.sh
    git add ios/App/ci_scripts/*.sh
    git ls-files -s ios/App/ci_scripts/
    return 0
  fi
  return 1
}
