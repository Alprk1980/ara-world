#!/usr/bin/env bash
# Qwen round 2 (user's OK, 2026-10-19): checks first, then the missing things per place, then refresh the layouts.
cd "$(dirname "$0")/.."
echo "== $(date -u +%FT%TZ) contact sheet"; node tools/contact-sheet.ts --out out/sheet-all.png
echo "== $(date -u +%FT%TZ) vision check"; rm -f out/vision.json; node tools/vision-check.ts
echo "== $(date -u +%FT%TZ) coverage audit"; node tools/coverage-audit.ts
echo "== $(date -u +%FT%TZ) playthrough review"; node tools/playthrough.ts
echo "== $(date -u +%FT%TZ) things + items"; THINGS_PER_PLACE=10 node tools/pipeline.ts things items
echo "== $(date -u +%FT%TZ) refresh layouts"; node tools/auto-content.ts places && node tools/auto-content.ts houses && node tools/auto-content.ts daily && node tools/validate-data.ts
echo "== $(date -u +%FT%TZ) done"
