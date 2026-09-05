# scripts/ota-relevant-pattern.sh — sourced by both pre-push-hook.sh and
# release-to-otakit.sh, not duplicated in each. Extracted 2026-09-04
# alongside the release-to-otakit.sh safeguard — the same reasoning as
# native-pattern.sh's own extraction: a single source means the two
# consumers can never silently drift apart.
#
# Deliberately narrow, not exhaustive: only files verified to actually
# feed `npm run build`'s output. package.json/capacitor.config.ts are
# handled separately by NATIVE_PATTERN (native path has its own
# resubmission flow) so they're intentionally absent here. tsconfig*.json
# deliberately excluded: `tsc -b` is noEmit, type-checking only — a
# config-only change there can block or pass the build but never changes
# dist/'s actual contents.
OTA_RELEVANT_PATTERN='^(src/|public/|index\.html|vite\.config\.ts|tailwind\.config\.ts|postcss\.config\.js)'
