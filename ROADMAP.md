# ARA World roadmap

What's next for the game. Her notes (15 pages, 2026-10-18) are the spec; this list tracks what is left.

## In progress
- [ ] Try the 20 new salon hairstyles in the game on the tablet (sheet: `out/hair-fix/preview.png`).

## Waiting on a go-ahead
- [ ] **Realistic redraw** of the ~590 older drawings. New drawings are already realistic, and realistic is the default look.
- [ ] **Tablet install over Tailscale**: enable HTTPS certificates in the Tailscale admin console first.
- [ ] **Hidden places**: where they go and how many. She picks. Right now they're placed automatically as secret spots.

## Ideas
- [ ] Clothes she draws herself on the draw pad (it only makes objects now).
- [ ] Delete or recolour saved drawings.
- [ ] Optional vision model that guesses a name and tags for a drawing, with an offline fallback.

## Plan steps not done yet
- [ ] Coverage audit: check every wish in her notes against what the game has.
- [ ] Playthrough review: a headless run that visits every place, uses every floor, builds a house,
      dresses and feeds a character, and opens the post box.
- [ ] Real-tablet playtest: installs to the home screen, works offline, swipes and drags feel right, 60 fps.
- [ ] Content at full scale. It's proof-of-concept size now; the plan aimed for ~2,500 items, ~300 houses
      and 365 days of daily gifts and decorations.

## Done
- 20 new salon hairstyles: 5 of Qwen's kept, 15 redrawn by Claude (`tools/real-hair-2.ts`).
- Post office: miss a day and you get two prizes the next day (never more than two).
- Proof of concept, playable: wardrobe, travel, bin, sleep, night glow, idle life, map buildings, music.
- Draw pad v1 (objects).
- Realistic style is the default, with her blocky body shape; realistic title screen and rose.
- Realistic world pass: map depth and railway, new animals, oval heads, curated places and homes.
- Hats that fit, plus her own designs.
- Published to GitHub Pages.
