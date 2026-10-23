#!/usr/bin/env bash
# Qwen (user's OK, 2026-10-22): new hairstyles, empty shelf units with levels, and small things to stand on shelves.
# Drawn straight in the realistic style (no cute versions any more), then colourways for the objects. The first six
# hairstyles were drawn cute before that change, so they get realistic redraws. Resumable: re-running skips what passed.
cd "$(dirname "$0")/.."
HAIR=(
  "long_straight_fringe_hair (hair): long straight hair falling past the shoulders, with a straight fringe across the forehead"
  "short_crop_hair (hair): a short neat crop close to the head, a little textured on top"
  "spiky_short_hair (hair): short hair sticking up in soft rounded spikes"
  "box_braids_hair (hair): long box braids hanging down both sides past the shoulders"
  "half_up_bow_hair (hair): long hair, half up: the top part tied back with a little bow, the rest hanging down"
  "curly_bob_hair (hair): a bouncy chin-length bob of round curls"
  "double_dutch_braids_hair (hair): two thick plaits running back from the forehead and hanging down each side"
  "messy_top_knot_hair (hair): hair pulled up into a big messy bun on top of the head, a few loose wisps"
  "side_swept_long_hair (hair): long hair swept over to one side from a side parting"
  "shoulder_locs_hair (hair): shoulder-length locs, many rounded ropes of hair"
)
SHELVES=(
  "wall_plank_shelf (decor): Wall Shelf, one wooden plank on two brackets, hung on a wall; empty; size about 60x14; anchors base + top (the plank's upper face)"
  "wall_double_shelf (decor): Hanging Shelf, a small wall shelf with two empty boards and side panels; size about 50x40; anchors base + shelf1 (lower board) + top (upper board)"
  "tall_open_bookcase (furniture): Tall Bookcase, a tall wooden bookcase with four EMPTY shelves; size about 70x150; anchors base + shelf1 + shelf2 + shelf3 + top"
  "shop_shelving_unit (furniture): Shop Shelves, metal shop shelving with three EMPTY shelves; size about 90x110; anchors base + shelf1 + shelf2 + top"
  "low_display_cabinet (furniture): Display Cabinet, a low wooden cabinet with two EMPTY open shelves and a flat top; size about 80x60; anchors base + shelf1 + top"
  "ladder_shelf (furniture): Ladder Shelf, a leaning ladder-style shelf with three EMPTY shelves getting narrower towards the top; size about 50x130; anchors base + shelf1 + shelf2 + top"
  "glass_display_shelf (furniture): Glass Shelves, a slim boutique stand with three EMPTY glass shelves; size about 60x120; anchors base + shelf1 + shelf2 + top"
  "cube_storage_shelf (furniture): Cube Shelf, a square shelf of four open cubes (2x2), EMPTY; size about 70x70; anchors base + shelf1 (floor of the top row) + top"
)
SMALL=(
  "small_flower_vase (decor): a little vase with three flowers; size about 8x14"
  "photo_frame_stand (decor): a standing photo frame showing a smiling sun picture; size about 10x12"
  "trophy_cup (decor): a shiny trophy cup with handles on a base; size about 10x16"
  "snow_globe (decor): a snow globe with a tiny house inside, on a base; size about 10x12"
  "candle_jar (decor): a scented candle in a jar with a little flame; size about 7x9"
  "book_stack (decor): a stack of three books lying flat; size about 14x10"
  "sweet_jar (decor): a round glass jar full of sweets with a lid; size about 10x14"
  "cat_ornament (decor): a sitting china cat ornament; size about 8x12"
  "desk_globe (decor): a little world globe on a stand; size about 10x14"
  "music_box (decor): a music box with a tiny dancer on top; size about 12x12"
  "piggy_bank (decor): a cute piggy bank; size about 12x10"
  "fairy_light_jar (decor): a jar with glowing fairy lights inside; size about 8x12"
  "succulent_pot (plant): a small pot with a chubby succulent; size about 8x10"
  "perfume_bottle (makeup): a pretty perfume bottle with a round stopper; size about 6x9; anchors base + grip"
)
ids() { for a in "$@"; do echo "${a%% *}"; done; }
missing() { node -e "const f=process.argv[1],ids=process.argv.slice(2),have=new Set(require('./'+f).map(t=>t.id));console.log(ids.filter(i=>!have.has(i)).join(' '))" "$@"; }
join() { local IFS=';'; echo "$*"; }

echo "== $(date -u +%FT%TZ) realistic drawings"
ALL=("${HAIR[@]}" "${SHELVES[@]}" "${SMALL[@]}")
TODO=()
for want in $(missing src/data/templates.json $(ids "${ALL[@]}")); do for a in "${ALL[@]}"; do [ "${a%% *}" = "$want" ] && TODO+=("$a"); done; done
if [ ${#TODO[@]} -gt 0 ]; then
  LLM_MAX_TOKENS=40000 node tools/qwen-gen.ts template-new --count 1 --batches ${#TODO[@]} --ask "$(join "${TODO[@]}")"
fi

echo "== $(date -u +%FT%TZ) colourways"
OBJ=$(node -e "const ts=new Map(require('./src/data/templates.json').map(t=>[t.id,t])),it=require('./src/data/items.json');console.log(process.argv.slice(1).filter(i=>ts.has(i)&&!it.some(x=>x.template===i)).join(' '))" $(ids "${SHELVES[@]}" "${SMALL[@]}"))
set -- $OBJ
while [ $# -gt 0 ]; do
  batch="$1 $2 $3 $4"; shift $(( $# < 4 ? $# : 4 ))
  PER=3 node tools/qwen-gen.ts item --ask "$batch"
done

echo "== $(date -u +%FT%TZ) realistic redraws of the hairstyles drawn cute"
REAL=$(node -e "const real=new Set(require('./src/data/templates-real.json').map(t=>t.id));console.log(require('./src/data/templates.json').filter(t=>process.argv.includes(t.id)&&!t.palette&&!real.has(t.id)).map(t=>t.id).join('; '))" $(ids "${HAIR[@]}"))
if [ -n "$REAL" ]; then
  n=$(echo "$REAL" | tr ';' '
' | wc -l)
  LLM_MAX_TOKENS=40000 node tools/qwen-gen.ts template-redraw --count 1 --batches "$n" --ask "$REAL"
fi
echo "== $(date -u +%FT%TZ) done"
node tools/validate-data.ts
