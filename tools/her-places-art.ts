// Things for the places Ara drew, drawn realistic by Claude: for the mansion's back garden a heated pool, a BBQ, a long
// garden table, a treehouse and a sandbox; a garage door (it rolls up) and an arcade machine for the garage and game
// room; and for her six-floor house a big window, a tinted glass shower and a balcony railing.
//
//   node tools/her-places-art.ts
import { A, B, C, E, G, K, M, O, P, T, W, WATER, bar, cloud, dot, ground, legs, oval, s, slab, star, tyre, pal, commitNew, type Colourway, type NewThing, type Pal } from './real-kit.ts';

const colours = (template: string, tags: string[], list: [string, string, Pal][]): Colourway[] =>
  list.map(([key, name, palette]) => ({ id: `${template}_${key}`, name, palette, tags }));
const glassRect = (x: number, y: number, w: number, h: number, tint = G, op = 0.55) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${tint}" fill-opacity="${op}" stroke="${O}" stroke-width="2"/>`;

const list: NewThing[] = [
  // A heated pool: tiled edge, warm water with steam rising and a thermometer showing it's warm.
  {
    id: 'heated_pool', name: 'Heated Pool', category: 'garden', size: { w: 0, h: 50 }, anchors: { base: [128, 244], seat: [128, 214] },
    palette: pal('#3aa0d8', '#f4f2ee', '#e03131', '#1e5a80'),
    body: B(4, 196, 248, 48, 6, T, 'V') + B(16, 206, 224, 32, 4, M, 'V', 2) + `<rect x="16" y="206" width="224" height="32" rx="4" fill="${WATER}" opacity="0.45"/>` +
      s('M28 216 c10 -5 20 5 30 0 M88 224 c10 -5 20 5 30 0 M150 214 c10 -5 20 5 30 0 M196 226 c10 -5 20 5 30 0', W, 3, 0.7) +
      s('M50 198 C42 190 58 186 50 178 M110 198 C102 190 118 186 110 178 M170 198 C162 190 178 186 170 178', W, 5, 0.5) +
      bar('M214 196 L214 214 M226 196 L226 214', T, 3) + s('M214 202 L226 202', O, 2) +
      B(232, 168, 12, 30, 6, W, 'V', 1.5) + B(235, 180, 6, 16, 3, A, 'V', 0) + C(238, 198, 6, A, 'R', 1.5),
    items: colours('heated_pool', ['pool', 'garden', 'vip', 'waterpark', 'outdoor'], [
      ['blue', 'Heated Pool', pal('#3aa0d8', '#f4f2ee', '#e03131', '#1e5a80')],
      ['turquoise', 'Turquoise Heated Pool', pal('#2fc0c0', '#e8e0d0', '#e03131', '#14606a')],
      ['deep', 'Deep Blue Heated Pool', pal('#2a5fb0', '#d8d4cc', '#f59f00', '#14305a')],
      ['stone', 'Stone Heated Pool', pal('#4ab0d0', '#b8b0a2', '#e03131', '#2a5a6a')],
    ]),
  },
  // A kettle BBQ with the lid up: sausages and burgers on the grill, side shelves, and smoke.
  {
    id: 'bbq_grill', name: 'BBQ', category: 'garden', size: { w: 0, h: 62 }, anchors: { base: [128, 243] },
    palette: pal('#2a2a30', '#9aa0a8', '#c0604a', '#0c0c10'),
    body: ground(128, 243, 96, 4) + bar('M92 170 L70 236 M164 170 L186 236 M128 182 L128 236', T, 5) + tyre(70, 232, 10) + tyre(186, 232, 10) +
      P('M54 118 C54 52 202 52 202 118 Z', M, 'R') + C(128, 54, 8, T, 'R', 1.5) + s('M72 100 C80 76 104 66 128 64', W, 5, 0.25) +
      B(16, 130, 52, 10, 3, T, 'V', 2) + B(188, 130, 52, 10, 3, T, 'V', 2) + bar('M28 140 L28 170 M228 140 L228 170', T, 3) +
      B(70, 108, 42, 12, 6, A, 'R', 1.5) + B(116, 104, 40, 12, 6, A, 'R', 1.5) + E(180, 112, 16, 7, K, 'R', 1.5) + E(180, 108, 16, 5, A, 'V', 0) +
      P('M52 120 L204 120 C200 168 170 184 128 184 C86 184 56 168 52 120 Z', M, 'R') + s('M56 121 L200 121', T, 4) + s('M70 150 L186 150', T, 2, 0.5) +
      s('M96 98 C86 78 108 68 96 48 M150 96 C140 76 162 66 150 46', W, 6, 0.4),
    items: colours('bbq_grill', ['garden', 'party', 'outdoor', 'beach'], [
      ['black', 'Black BBQ', pal('#2a2a30', '#9aa0a8', '#c0604a', '#0c0c10')],
      ['red', 'Red BBQ', pal('#c0302a', '#a0a6ac', '#b85a3a', '#4a0e0a')],
      ['green', 'Green BBQ', pal('#2f6a4a', '#a0a6ac', '#b85a3a', '#123020')],
      ['steel', 'Steel BBQ', pal('#9aa0a8', '#5a5e66', '#b85a3a', '#3a3c42')],
    ]),
  },
  // A long garden table set for a meal, with a bench along the front.
  {
    id: 'long_garden_table', name: 'Long Garden Table', category: 'furniture', size: { w: 0, h: 46 }, anchors: { base: [128, 244], top: [128, 150], seat: [128, 206] },
    palette: pal('#b5835a', '#f4f2ee', '#e86a5a', '#4a2c12'),
    body: ground(128, 244, 124, 4) + legs([20, 224], 168, 238, 12) + slab(8, 248, 150, 8, 12) +
      [44, 92, 140, 188].map((x) => E(x, 151, 14, 4, T, 'V', 1) + B(x + 16, 138, 9, 13, 2, A, 'H', 1)).join('') + E(228, 150, 8, 4, A, 'R', 1) +
      B(14, 204, 228, 12, 4, M, 'V', 2) + legs([26, 218], 216, 244, 10),
    items: colours('long_garden_table', ['garden', 'party', 'outdoor', 'restaurant', 'kitchen'], [
      ['wood', 'Long Garden Table', pal('#b5835a', '#f4f2ee', '#e86a5a', '#4a2c12')],
      ['white', 'White Garden Table', pal('#f4f2ee', '#ffffff', '#4a8fd8', '#7a766e')],
      ['grey', 'Grey Garden Table', pal('#8a8e96', '#f4f2ee', '#f5c842', '#3a3c42')],
      ['teak', 'Teak Garden Table', pal('#8a5a34', '#f8f0e0', '#4fa85a', '#3a2010')],
    ]),
  },
  // A treehouse: a little wooden house on a platform in a big tree, with a ladder up.
  {
    id: 'garden_treehouse', name: 'Treehouse', category: 'garden', size: { w: 0, h: 190 }, anchors: { base: [128, 244], seat: [150, 132] },
    palette: pal('#a8774f', '#4f9a45', '#c4502a', '#4a2c12'),
    body: ground(128, 244, 70, 5) + cloud(128, 70, 150, 80, T) + C(40, 96, 36, T, 'R', 2) + C(216, 96, 36, T, 'R', 2) +
      P('M112 244 C116 200 112 160 116 120 L144 120 C146 160 142 200 148 244 Z', M, 'H') + s('M120 200 C124 180 122 160 126 140 M136 230 C138 210 136 190 140 170', K, 2, 0.2) +
      B(36, 132, 184, 12, 3, M, 'V', 2) + B(70, 74, 120, 58, 4, M, 'L') + s('M70 90 L190 90 M70 104 L190 104 M70 118 L190 118', K, 1.5, 0.18) +
      P('M60 78 L130 34 L200 78 Z', A, 'L') + B(84, 86, 30, 26, 4, G, 'L', 1.5) + s('M99 86 L99 112 M84 99 L114 99', W, 3) + B(146, 90, 28, 42, 4, A, 'V', 1.5) + dot(168, 112, 2.5, K) +
      bar('M50 144 L44 242 M78 144 L74 242', M, 4) + s('M47 164 L77 164 M46 186 L76 186 M45 208 L75 208 M44 230 L74 230', O, 3) +
      s('M36 132 L36 116 L220 116 L220 132', O, 2.5) + s('M60 116 L60 132 M100 116 L100 132 M196 116 L196 132', O, 2),
    items: colours('garden_treehouse', ['garden', 'outdoor', 'kids_room', 'party'], [
      ['wood', 'Treehouse', pal('#a8774f', '#4f9a45', '#c4502a', '#4a2c12')],
      ['blue', 'Blue Roof Treehouse', pal('#b5835a', '#5aa64e', '#2f6ab0', '#4a2c12')],
      ['pink', 'Pink Treehouse', pal('#f2b0c4', '#5aa64e', '#c84a7a', '#7a3a4e')],
      ['autumn', 'Autumn Treehouse', pal('#a8774f', '#e08a2a', '#7a3a1a', '#4a2c12')],
    ]),
  },
  // A sandbox: a wooden frame full of sand, with a bucket and spade.
  {
    id: 'sandbox', name: 'Sandbox', category: 'garden', size: { w: 0, h: 26 }, anchors: { base: [128, 243] },
    palette: pal('#b5835a', '#ecd49a', '#e03131', '#4a2c12'),
    body: ground(128, 243, 124, 3) + P('M30 196 L226 196 L208 176 L48 176 Z', T, 'V', 2) + E(96, 188, 32, 8, T, 'R', 1) +
      P('M150 152 L180 152 L176 186 L154 186 Z', A, 'L', 2) + s('M152 154 C152 136 178 136 178 154', O, 2) + bar('M86 140 L98 180', M, 3) + P('M94 176 L106 174 L112 192 L96 194 Z', A, 'L', 1.5) +
      B(10, 196, 236, 40, 6, M, 'L') + s('M10 214 L246 214', K, 2, 0.2) + B(4, 190, 26, 14, 3, M, 'V', 1.5) + B(226, 190, 26, 14, 3, M, 'V', 1.5),
    items: colours('sandbox', ['garden', 'daycare', 'outdoor', 'beach', 'school'], [
      ['wood', 'Sandbox', pal('#b5835a', '#ecd49a', '#e03131', '#4a2c12')],
      ['green', 'Green Sandbox', pal('#4fa85a', '#ecd49a', '#f5c842', '#1e4a26')],
      ['blue', 'Blue Sandbox', pal('#3a7ec8', '#ecd49a', '#f28cb0', '#16345e')],
      ['red', 'Red Sandbox', pal('#d63a3a', '#ecd49a', '#3a7ec8', '#5e1414')],
    ]),
  },
  // A roller garage door in a brick wall, with a light over it. It opens (rolls up).
  {
    id: 'garage_door', name: 'Garage Door', category: 'decor', size: { w: 0, h: 72 }, anchors: { base: [128, 244] },
    palette: pal('#e8e6e0', '#b0583a', '#3a3a40', '#6a6860'),
    body: B(8, 40, 240, 204, 6, T, 'L') + s('M8 70 L248 70 M8 100 L248 100 M8 130 L248 130 M8 160 L248 160 M8 190 L248 190 M8 220 L248 220', K, 1.5, 0.2) +
      B(26, 60, 204, 184, 4, M, 'V', 2.5) + s([84, 108, 132, 156, 180, 204, 228].map((y) => `M28 ${y} L228 ${y}`).join(' '), K, 2, 0.16) +
      s([84, 108, 132, 156, 180, 204, 228].map((y) => `M28 ${y + 2} L228 ${y + 2}`).join(' '), W, 1.5, 0.5) + B(110, 222, 36, 8, 3, A, 'V', 1.5) +
      B(116, 44, 24, 12, 3, A, 'V', 1.5) + oval(128, 58, 14, 4, W, 0.7),
    items: colours('garage_door', ['outdoor', 'wall', 'garden', 'fire_station'], [
      ['white', 'White Garage Door', pal('#e8e6e0', '#b0583a', '#3a3a40', '#6a6860')],
      ['grey', 'Grey Garage Door', pal('#7a7e86', '#c8c0b4', '#2a2a30', '#3a3c42')],
      ['wood', 'Wooden Garage Door', pal('#a8774f', '#d8d0c4', '#3a3a40', '#4a2c12')],
      ['blue', 'Blue Garage Door', pal('#3a6ec0', '#b0583a', '#f4f4f4', '#1e3a6a')],
      ['red', 'Red Garage Door', pal('#b8323a', '#e0dcd4', '#f4f4f4', '#5a1418')],
    ]),
  },
  // An arcade machine: a glowing screen, a joystick and buttons.
  {
    id: 'arcade_machine', name: 'Arcade Machine', category: 'furniture', size: { w: 0, h: 92 }, anchors: { base: [128, 243] },
    palette: pal('#2f3a8a', '#f5c842', '#e8406a', '#141a44'),
    body: ground(128, 244, 70, 4) + P('M64 244 L64 30 C64 18 72 12 84 12 L172 12 C184 12 192 18 192 30 L192 244 Z', M, 'H') +
      B(72, 20, 112, 26, 6, A, 'V', 1.5) + P(star(94, 33, 8), T, 'R', 1) + P(star(162, 33, 8), T, 'R', 1) + B(110, 28, 36, 10, 4, W, 'V', 0) +
      B(76, 56, 104, 74, 6, K, 'V', 2) + `<rect x="80" y="60" width="96" height="66" rx="4" fill="${WATER}" opacity="0.25"/>` +
      dot(100, 84, 6, T) + dot(150, 74, 5, A) + dot(128, 104, 5, W) + s('M88 118 L168 118', T, 3, 0.8) + dot(118, 84, 2, T) + dot(130, 84, 2, T) + dot(142, 84, 2, T) +
      P('M58 140 L198 140 L206 170 L50 170 Z', T, 'V', 2) + bar('M98 154 L98 136', K, 3) + C(98, 134, 7, A, 'R', 1.5) + C(140, 156, 7, A, 'R', 1.5) + C(162, 152, 7, W, 'R', 1.5) +
      B(116, 194, 24, 30, 4, K, 'V', 1.5) + B(124, 200, 8, 10, 2, T, 'V', 0) + s('M70 50 L70 238', A, 5, 0.5),
    items: colours('arcade_machine', ['teen_room', 'theme_park', 'kids_room', 'mall', 'party'], [
      ['blue', 'Arcade Machine', pal('#2f3a8a', '#f5c842', '#e8406a', '#141a44')],
      ['red', 'Red Arcade Machine', pal('#b8202a', '#f5c842', '#3aa0e8', '#4a080e')],
      ['black', 'Black Arcade Machine', pal('#26262c', '#4ae0c0', '#f028a0', '#0c0c10')],
      ['purple', 'Purple Arcade Machine', pal('#6a2aa0', '#f5e04a', '#4ae0c0', '#2a0a44')],
    ]),
  },
  // A big picture window to hang on a wall: wide glass with the sky outside, a frame and a sill.
  {
    id: 'big_window', name: 'Big Window', category: 'decor', size: { w: 0, h: 70 }, anchors: { base: [128, 232] },
    palette: pal('#f4f2ee', '#8fc8f0', '#4fa85a', '#7a766e'),
    body: B(10, 30, 236, 190, 8, M, 'L') + B(24, 44, 208, 164, 4, T, 'V', 1.5) + cloud(78, 92, 56, 22, W) + cloud(180, 74, 44, 18, W) +
      P('M24 208 L24 176 C60 160 90 170 120 178 C160 160 200 164 232 176 L232 208 Z', A, 'V', 0) + s('M60 54 L36 96 M88 54 L48 128', W, 5, 0.35) +
      bar('M128 44 L128 208 M24 126 L232 126', M, 6) + B(2, 212, 252, 20, 4, M, 'V', 2),
    items: colours('big_window', ['wall', 'kitchen', 'living', 'bedroom', 'hotel'], [
      ['white', 'Big Window', pal('#f4f2ee', '#8fc8f0', '#4fa85a', '#7a766e')],
      ['wood', 'Wood Frame Window', pal('#a8774f', '#8fc8f0', '#4fa85a', '#4a2c12')],
      ['black', 'Black Frame Window', pal('#2a2a30', '#8fc8f0', '#4fa85a', '#0c0c10')],
      ['sunset', 'Sunset Window', pal('#f4f2ee', '#f5a86a', '#a8326e', '#7a766e')],
    ]),
  },
  // A walk-in shower behind tinted glass, as in her top-floor bathroom.
  {
    id: 'tinted_glass_shower', name: 'Tinted Glass Shower', category: 'furniture', size: { w: 0, h: 96 }, anchors: { base: [128, 244] },
    palette: pal('#e8eef2', '#a8b0b8', '#3a4a5a', '#5a6068'),
    body: ground(128, 244, 104, 3) + B(30, 16, 196, 210, 4, M, 'V') + s('M30 60 L226 60 M30 104 L226 104 M30 148 L226 148 M30 192 L226 192 M96 16 L96 226 M160 16 L160 226', K, 1.5, 0.12) +
      bar('M190 30 L190 62', T, 4) + E(176, 64, 18, 6, T, 'V', 1.5) + [[166, 84], [176, 100], [186, 80], [172, 120], [182, 136]].map(([x, y]) => dot(x, y, 3, WATER)).join('') +
      glassRect(36, 22, 120, 204, A, 0.42) + s('M50 36 L50 210 M64 36 L64 140', W, 6, 0.3) + bar('M36 22 L36 226 M156 22 L156 226', T, 3) + B(140, 110, 8, 40, 3, T, 'H', 1) +
      B(24, 226, 208, 18, 4, T, 'V', 2),
    items: colours('tinted_glass_shower', ['bathroom', 'hotel', 'vip', 'fancy'], [
      ['smoke', 'Tinted Glass Shower', pal('#e8eef2', '#a8b0b8', '#3a4a5a', '#5a6068')],
      ['bronze', 'Bronze Glass Shower', pal('#efe8de', '#c8a46a', '#6a4a2a', '#6a5a48')],
      ['blue', 'Blue Glass Shower', pal('#e6f0f8', '#a8b0b8', '#2a5a8a', '#4a5a6a')],
      ['black', 'Black Glass Shower', pal('#d8d8dc', '#2a2a30', '#1a1a20', '#0c0c10')],
    ]),
  },
  // A balcony railing: glass panels between posts, with flower boxes.
  {
    id: 'balcony_railing', name: 'Balcony Railing', category: 'decor', size: { w: 0, h: 40 }, anchors: { base: [128, 244] },
    palette: pal('#4a4e56', '#cdeeff', '#e8407a', '#1a1c20'),
    body: glassRect(14, 140, 228, 92, T, 0.5) + s('M30 150 L54 222 M120 150 L144 222', W, 5, 0.3) + bar('M10 132 L10 244 M86 132 L86 244 M170 132 L170 244 M246 132 L246 244', M, 5) +
      B(4, 126, 248, 12, 5, M, 'V', 2) + B(4, 232, 248, 12, 3, M, 'V', 2) + B(20, 110, 54, 18, 4, M, 'L', 1.5) + B(182, 110, 54, 18, 4, M, 'L', 1.5) +
      [32, 46, 60, 194, 208, 222].map((x, i) => s(`M${x} 112 L${x} 96`, K, 2, 0.4) + C(x, 94, 6, i % 2 ? A : W, 'R', 1)).join(''),
    items: colours('balcony_railing', ['garden', 'outdoor', 'hotel', 'fancy', 'vip'], [
      ['grey', 'Balcony Railing', pal('#4a4e56', '#cdeeff', '#e8407a', '#1a1c20')],
      ['white', 'White Balcony Railing', pal('#f4f2ee', '#cdeeff', '#f5c842', '#7a766e')],
      ['black', 'Black Balcony Railing', pal('#26262c', '#cdeeff', '#b197fc', '#0c0c10')],
      ['wood', 'Wooden Balcony Railing', pal('#a8774f', '#cdeeff', '#e8407a', '#4a2c12')],
    ]),
  },
];

process.exit(commitNew(list, "Ara's places") ? 1 : 0);
