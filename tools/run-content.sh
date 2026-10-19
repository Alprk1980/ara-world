#!/usr/bin/env bash
# One content run: the two batch-1 redraws still owed, then the pipeline from the wardrobe on (plan is done).
cd "$(dirname "$0")/.."
node tools/qwen-gen.ts template --count 1 --replace cosy_hoodie --ask "Redraw \"cosy_hoodie\" (keep the id and category top). The last two drawings looked like a basketball hoop: make it clearly a hoodie seen from the front: a hood drawn as a rounded shape BEHIND the shoulders and neck, a zip or seam down the middle, two drawstrings hanging from the neckline, a wide kangaroo pocket across the belly, ribbed cuffs at the hem."
node tools/qwen-gen.ts template --count 1 --replace big_rose_bloom --ask "Redraw \"big_rose_bloom\" (keep the id and category plant). A big red-pink rose head: petals spiralling around a centre, on a short green stem with two leaves, no pot. Keep it simple: under 25 shapes."
THINGS_PER_PLACE=10 node tools/pipeline.ts wardrobe things items places houses emotions names characters daily
