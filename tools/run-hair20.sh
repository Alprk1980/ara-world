#!/usr/bin/env bash
# 20 new hairstyles for the salon (asked 2026-10-24), drawn by the updated local model
# (qwen3.8-flash-next-iq3_s on strata :8080 - URL and key in .env.llm, which is gitignored).
# Nothing goes into the game: qwen-gen runs --dry, so candidates live only in .qwen-runs/ and
# out/hair20/. Look at out/hair20/preview.png, then node tools/hair-preview.ts --merge puts
# them into src/data/templates.json.
# Resumable: a re-run only asks for the ids not yet in out/hair20/candidates.json.
cd "$(dirname "$0")/.."
if [ -f .env.llm ]; then set -a; . ./.env.llm; set +a; fi

HAIR=(
  "buzz_cut_hair (hair): a very short buzz cut, hair cropped evenly close to the scalp, a touch darker at the temples"
  "flat_top_hair (hair): a flat-top fade: very short at the sides, the hair on top cut perfectly flat and level"
  "undercut_hair (hair): short cropped sides, long hair on top swept up and over to one side"
  "faux_hawk_hair (hair): short at the sides, the hair along the middle swept up to a soft peak at the crown"
  "slicked_back_hair (hair): hair combed straight back off the forehead, sleek and close to the head with a wet-look shine"
  "bowl_cut_hair (hair): a rounded bowl cut: a smooth dome with an even straight fringe line all around"
  "curtain_bangs_hair (hair): shoulder-length hair with a centre parting and soft curtain bangs swept to each side of the forehead"
  "shag_layers_hair (hair): a choppy shag: a layered fringe across the brow and feathered layers falling at the sides"
  "mullet_hair (hair): short at the sides and on top, longer hair at the back falling to the neck"
  "wavy_lob_hair (hair): a wavy shoulder-length bob with a side parting, soft waves down to the tips"
  "asymmetric_bob_hair (hair): a sleek bob, cut short on one side and falling longer on the other"
  "long_layers_hair (hair): long hair cut in clear face-framing layers, the tips feathered"
  "center_part_long_hair (hair): long straight hair with a clean centre parting and no fringe, falling past the shoulders"
  "beehive_hair (hair): a tall stacked beehive, smooth hair piled high on the head"
  "low_bun_hair (hair): sleek hair swept back into a smooth round low bun at the nape"
  "cornrows_hair (hair): neat braids plaited close to the scalp running back from the hairline, ending in short braids that hang beside the head"
  "braided_ponytail_hair (hair): hair gathered at the back into a ponytail whose long tail is one thick braid"
  "twin_afro_puffs_hair (hair): two round afro puffs tied high on each side of the head"
  "short_twists_hair (hair): short defined twist curls all over, sitting close to the head"
  "headband_long_hair (hair): long hair pushed back from the face by a padded headband"
)

ids() { for a in "$@"; do echo "${a%% *}"; done; }
IDLIST=$(ids "${HAIR[@]}" | paste -sd, -)

# What already passed (from any earlier run) goes into candidates.json; ask only for the gaps.
node tools/hair-preview.ts --ids "$IDLIST"
TODO=()
for a in "${HAIR[@]}"; do
  grep -q "\"id\": \"${a%% *}\"" out/hair20/candidates.json 2>/dev/null || TODO+=("$a")
done

if [ ${#TODO[@]} -gt 0 ]; then
  echo "generating ${#TODO[@]} missing hairstyle(s)…"
  printf '%s;\n' "${TODO[@]}" > out/hair20-ask.txt
  LLM_MAX_TOKENS=40000 node tools/qwen-gen.ts template-new --count 1 --batches ${#TODO[@]} --dry --ask @out/hair20-ask.txt
  node tools/hair-preview.ts --ids "$IDLIST"
fi
echo "done - look at out/hair20/preview.png, then: node tools/hair-preview.ts --merge"
