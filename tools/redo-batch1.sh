#!/usr/bin/env bash
# Redraw the batch-1 templates that failed review (vision check + replay), stating each problem; then run the pipeline.
cd "$(dirname "$0")/.."
redo() { node tools/qwen-gen.ts template --count 1 --replace "$1" --ask "Redraw \"$1\" (keep the id $1 and its category). Problem with the old drawing: $2"; }
redo cosy_hoodie "the hood and pocket look lumpy; a child saw a basketball hoop. Draw a clear hoodie: hood behind the neck, two drawstrings, a kangaroo pocket, long sleeves reaching the sides."
redo floppy_sun_hat "the brim is a shapeless blob; it looked like a flying saucer. Draw a wide, wavy, symmetric brim with a rounded crown and a ribbon band."
redo single_cozy_bed "it looked like an armchair with a face, or a bar of soap. Draw a side view: a headboard on one end, a long flat mattress, a pillow at the headboard end, a blanket over the mattress, four short legs. No face."
redo bouncy_ball_toy "the stripe across the middle makes it look like an eyeball. Draw a shiny round ball with a curved star or wave pattern and a white shine spot; no eye shape."
redo wooden_chair "from the front it looks like a ladder. Draw it from the side: a back rest, a seat, four legs, and give it a seat anchor."
redo big_rose_bloom "it reads as a generic flower in a pot. Draw a big rose head: spiralling petals around a centre, two green leaves on a stem, no pot. It is used on the pink title screen."
redo standing_horse "the head shape is unclear and the mane is a blob. Draw a side view: long face with a muzzle, ears, a flowing mane, four legs with hooves, a tail."
redo zipper_pencil_case "it does not read as a pencil case. Draw a long soft pouch with a zip along the top, a zip pull, and a pencil and a ruler peeking out of one end."
redo city_bus "drawn from the front, it looked like a train; it must drive along a road on the map. Draw a long side view: a row of windows, a door, two wheels, a front windscreen on one end."
node tools/qwen-gen.ts template --count 3 --batches 1 --ask "long wavy hair (hair); short bob hair (hair); walking stick (elder)"
node tools/contact-sheet.ts --out out/sheet-batch1-redo.png
node tools/pipeline.ts
