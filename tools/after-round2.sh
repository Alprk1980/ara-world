#!/usr/bin/env bash
# After Qwen's round-2 drawing run: fixes from the vision check, then the chunked playthrough review, then refresh.
cd "$(dirname "$0")/.."
redo() { node tools/qwen-gen.ts template --count 1 --replace "$1" --ask "Redraw \"$1\" (keep the id $1 and its category). Problem: $2"; }
node tools/fix-round2.ts
redo police_station_dog_leash "it looked like a phone. Draw a coiled lead with a loop handle at one end and a clip at the other, next to a small collar."
redo coaster_safety_buckle "it was unclear. Draw a big padded safety bar (a U-shaped lap bar) on a coaster seat, seen from the front."
redo lazy_river "it looked like a camera lens. Draw a long winding blue water channel seen from the side, with a swim ring floating on it and little waves."
redo post_stamp_machine "it looked like stacked blocks. Draw a tall machine with a coin slot, a small screen, and a strip of stamps coming out of a slot at the front."
node tools/auto-content.ts items && node tools/auto-content.ts places && node tools/auto-content.ts houses && node tools/auto-content.ts daily
node tools/validate-data.ts
node tools/playthrough.ts
