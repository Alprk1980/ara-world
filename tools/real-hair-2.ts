// Claude's redraws of 15 of the 20 salon hairstyles Qwen drew (2026-10-24). Its versions sat on the head like helmets
// with a square hole for the face, and several did not look like their names (a beehive that was a bob, a low bun
// under the chin like a beard). The ids stay the same, so anyone already wearing one gets the new drawing.
// Same frame as tools/real-hair.ts: the head is an oval centred 128,140 (about x 54-202, y 55-225), the brows sit
// near y 118, so a fringe ends above y 108 and the hair follows the curve of the face.
//
//   node tools/real-hair-2.ts --dry   -> out/hair-fix/claude.json, then: node tools/hair-preview.ts --from out/hair-fix/claude.json --out out/hair-fix
//   node tools/real-hair-2.ts         -> validated and merged into src/data/templates.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { C, E, K, M, O, P, T, W, blade, f, mirror, n, nw, pal, s, svg, commitFresh, type Fresh } from './real-kit.ts';

// As in tools/real-hair.ts: soft strand lines, a hair tie, a thin plait.
const strands = (ds: string[]) => ds.map((d, i) => s(d, i % 2 ? T : O, 2, i % 2 ? 0.7 : 0.25)).join('');
const tie = (x: number, y: number, rx = 12, ry = 8) => E(x, y, rx, ry, T, 'R', 1.5);
const plait = (x: number, top: number, bottom: number) => {
  let x2 = '';
  for (let y = top + 6; y < bottom - 4; y += 10) x2 += `M${x - 4} ${y} L${x + 4} ${y + 4} `;
  return s(`M${x} ${top} L${x} ${bottom}`, O, 10) + s(`M${x} ${top} L${x} ${bottom}`, M, 7) + s(x2.trim(), O, 1.5, 0.35);
};
// A braid along a list of points: leaves leaning alternately, each from one point to the next.
const braid = (pts: number[][], w: number) =>
  pts.slice(1).map(([x, y], i) => P(blade(pts[i][0], pts[i][1], x, y, w, i % 2 ? 0.18 : -0.18), M, 'H', 1.5)).join('');
// A braid plaited flat to the scalp along a quadratic curve: a rope with crossing lines down it.
const row = (p0: number[], c: number[], p1: number[]) => {
  const d = `M${p0[0]} ${p0[1]} Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`;
  const x = along(p0, c, p1, 6).slice(1, -1).map(([x, y]) => `M${x - 3} ${y + 2} L${x + 3} ${y - 2}`).join(' ');
  return s(d, O, 11) + s(d, M, 8) + s(x, O, 1.5, 0.45);
};
// Points along a quadratic curve, for rows and braids.
const along = ([x0, y0]: number[], [cx, cy]: number[], [x1, y1]: number[], k: number) =>
  Array.from({ length: k + 1 }, (_, i) => {
    const t = i / k, u = 1 - t;
    return [n(u * u * x0 + 2 * u * t * cx + t * t * x1), n(u * u * y0 + 2 * u * t * cy + t * t * y1)];
  });
const both = (d: string, fill: string, g = 'H', w = 2.5) => P(d, fill, g, w) + P(mirror(d), fill, g, w);
const shine = (d: string, op = 0.3) => s(d, W, 6, op);

// A close crop that hugs the scalp, with a soft natural hairline: the base of the buzz, flat top, undercut, faux hawk.
const SCALP = 'M50 182 C42 96 78 48 128 48 C178 48 214 96 206 182 L198 182 C198 132 192 116 184 106 C168 100 150 98 128 98 C106 98 88 100 72 106 C64 116 58 132 58 182 Z';
// The sides of a fade, a shade darker where they are cut shortest.
const fade = f('M50 182 C46 130 50 108 58 92 L66 100 C60 116 58 140 58 182 Z', K, 0.18) + f(mirror('M50 182 C46 130 50 108 58 92 L66 100 C60 116 58 140 58 182 Z'), K, 0.18);
// Stubble texture: short flecks over the scalp.
const fleck = (pts: number[][], col = O, op = 0.3) => s(pts.map(([x, y]) => `M${x} ${y} l2 -4`).join(' '), col, 2, op);
const SCALP_FLECKS = [[80, 70], [100, 60], [122, 56], [144, 58], [166, 64], [186, 78], [70, 90], [92, 80], [114, 74], [138, 74], [160, 80], [180, 92], [62, 120], [194, 120], [60, 146], [196, 146]];

// Long hair falling past the shoulders beside the face; `inner` is the face edge from the right side round to the left.
const longFrame = (inner: string, bottom = 246) =>
  `M28 ${bottom} L28 140 C28 70 70 36 128 36 C186 36 228 70 228 140 L228 ${bottom} C228 ${bottom + 4} 222 ${bottom + 6} 216 ${bottom + 4} L196 ${bottom} ${inner} L60 ${bottom} L40 ${bottom + 4} C34 ${bottom + 6} 28 ${bottom + 4} 28 ${bottom} Z`;

const BROWN = pal('#6b4226', '#9c6b43', '#b88a5a', '#3b2414');
const DARK = pal('#2b1d14', '#4a3426', '#6b5040', '#140c08');
const BLACK = pal('#1d1a1a', '#3a3434', '#565050', '#0a0808');
const BLONDE = pal('#d9b06a', '#ecca8e', '#f6e0b0', '#8a6430');
const AUBURN = pal('#9a3f1e', '#c2603a', '#d98a60', '#4f1d0b');
const CHESTNUT = pal('#7a4a2a', '#a06a44', '#c08a60', '#3e2412');

const list: Fresh[] = [
  // Buzz cut: cropped evenly close to the scalp, a touch darker at the temples. No volume at all.
  nw('buzz_cut_hair', 'Buzz Cut', 'hair', DARK,
    P(SCALP, M, 'H', 2) + fade + fleck(SCALP_FLECKS) + fleck(SCALP_FLECKS.map(([x, y]) => [x + 8, y + 6]), T, 0.5) + shine('M78 70 C100 56 156 56 178 70', 0.2)),

  // Flat top: very short at the sides, the top cut perfectly flat and level, standing up like a brush.
  nw('flat_top_hair', 'Flat Top Fade', 'hair', BLACK,
    P(SCALP, M, 'H', 2) + fade + fleck(SCALP_FLECKS.filter(([, y]) => y > 100)) +
      P('M66 104 C64 88 64 70 68 46 C68 42 72 40 76 40 L180 40 C184 40 188 42 188 46 C192 70 192 88 190 104 C170 96 150 94 128 94 C106 94 86 96 66 104 Z', M, 'V', 2) +
      s([76, 90, 104, 118, 132, 146, 160, 174].map((x) => `M${x} 46 L${x + (x < 128 ? -1 : 1)} 92`).join(' '), O, 2, 0.22) +
      s([83, 97, 111, 125, 139, 153, 167, 181].map((x) => `M${x} 46 L${x} 88`).join(' '), T, 1.5, 0.55) +
      s('M74 44 L182 44', W, 4, 0.35)),

  // Undercut: cropped sides, the long top swept up and over to one side.
  nw('undercut_hair', 'Undercut', 'hair', BROWN,
    P(SCALP, M, 'H', 2) + fade + fleck(SCALP_FLECKS.filter(([, y]) => y > 110)) +
      P('M74 104 C62 70 82 34 130 28 C178 22 216 48 218 88 C218 108 210 122 198 128 C200 112 196 100 184 96 C158 88 120 88 96 96 C86 98 80 100 74 104 Z', M, 'H') +
      strands(['M84 98 C80 64 108 38 150 34', 'M100 94 C104 66 136 46 176 44', 'M120 90 C130 68 160 56 196 64', 'M146 90 C166 78 190 80 208 98', 'M168 92 C184 92 198 102 204 118']) +
      s('M88 102 C86 84 90 70 98 60', K, 2, 0.3) + shine('M100 52 C130 36 168 38 194 56')),

  // Faux hawk: short at the sides, the middle swept up into a soft peak at the crown.
  nw('faux_hawk_hair', 'Faux Hawk', 'hair', CHESTNUT,
    P(SCALP, M, 'H', 2) + fade + fleck(SCALP_FLECKS.filter(([x]) => x < 96 || x > 160)) +
      P('M90 104 C86 82 96 56 110 36 C116 26 120 18 126 8 C130 16 136 22 142 30 C158 50 170 80 166 104 C152 98 140 96 128 96 C116 96 102 98 90 104 Z', M, 'H') +
      P(blade(112, 40, 120, 10, 6, -0.1), M, 'H', 1.5) + P(blade(140, 40, 134, 12, 6, 0.1), M, 'H', 1.5) +
      strands(['M98 100 C98 74 110 50 124 16', 'M112 98 C114 72 120 48 128 12', 'M140 98 C140 72 138 48 132 14', 'M156 100 C156 76 146 52 136 26']) +
      shine('M114 50 C120 36 130 30 138 40', 0.35)),

  // Slicked back: combed straight back off the forehead, sleek and close to the head, with a wet-look shine.
  nw('slicked_back_hair', 'Slicked Back', 'hair', BLACK,
    P('M44 168 C36 94 72 40 128 40 C184 40 220 94 212 168 L200 168 C200 130 194 110 184 96 C164 84 146 80 128 80 C110 80 92 84 72 96 C62 110 56 130 56 168 Z', M, 'V', 2) +
      s(['M78 98 C80 76 96 56 116 46', 'M96 88 C100 70 112 56 126 48', 'M116 82 C118 66 124 56 132 48', 'M140 82 C140 66 140 56 140 46', 'M160 88 C158 70 152 56 146 46', 'M178 98 C176 78 166 60 152 46', 'M62 130 C64 110 72 92 86 78', 'M194 130 C192 110 184 92 170 78'].join(' '), O, 2, 0.35) +
      s('M88 84 C100 64 120 54 138 52', W, 5, 0.5) + s('M150 56 C164 60 176 70 184 84', W, 4, 0.35) + s('M70 116 C72 104 76 96 82 90', W, 3, 0.3)),

  // Mullet: short on top and at the sides, longer at the back, falling to the neck behind the jaw.
  nw('mullet_hair', 'Mullet', 'hair', AUBURN,
    both('M40 140 C34 170 36 200 44 226 L50 238 L56 226 L62 236 L66 222 L74 230 C70 210 64 190 62 168 L58 140 Z', M) +
      P('M42 170 C32 92 72 42 128 42 C184 42 224 92 214 170 L202 170 C202 132 194 112 184 102 L174 110 L166 98 L154 106 L144 96 L132 104 L120 96 L110 106 L98 98 L90 110 L72 102 C62 114 54 134 54 170 Z', M, 'H') +
      strands(['M70 70 C90 56 108 52 124 52', 'M186 70 C166 56 148 52 132 52', 'M100 60 C104 74 104 88 98 98', 'M156 60 C152 74 152 88 158 98', 'M48 172 C46 196 50 214 56 230', 'M208 172 C210 196 206 214 200 230']) +
      shine('M74 72 C100 54 156 54 182 72', 0.28)),

  // Curtain bangs: shoulder length with a centre parting, the bangs swept down and out either side of the forehead.
  nw('curtain_bangs_hair', 'Curtain Bangs', 'hair', CHESTNUT,
    P('M30 214 L30 140 C30 70 70 38 128 38 C186 38 226 70 226 140 L226 214 C226 220 218 222 210 220 L196 216 L196 154 C196 116 170 84 128 66 C86 84 60 116 60 154 L60 216 L46 220 C38 222 30 220 30 214 Z', M, 'H') +
      both('M128 62 C104 74 80 98 70 132 C68 142 74 146 78 138 C88 112 106 90 128 74 Z', M, 'V', 2) +
      strands(['M128 42 L128 66', 'M116 50 C98 62 82 84 72 116', 'M140 50 C158 62 174 84 184 116', 'M42 140 L40 212', 'M52 150 L52 214', 'M214 140 L216 212', 'M204 150 L204 214']) +
      s('M120 70 C102 82 88 100 80 124 M136 70 C154 82 168 100 176 124', T, 2, 0.6) + shine('M76 70 C96 52 112 46 122 44 M180 70 C160 52 144 46 134 44', 0.25)),

  // Choppy shag: a layered fringe across the brow and feathered layers flicking out at the sides.
  nw('shag_layers_hair', 'Choppy Shag', 'hair', BROWN,
    P('M36 196 C28 130 50 40 128 40 C206 40 228 130 220 196 L196 190 C196 150 190 122 182 106 L74 106 C66 122 60 150 60 190 Z', M, 'H') +
      [[60, 120, 32, 186, 13, -0.12], [62, 140, 40, 206, 12, -0.08], [58, 160, 52, 214, 10, 0.06], [54, 100, 26, 150, 11, -0.15]]
        .map(([x0, y0, x1, y1, w, b]) => P(blade(x0, y0, x1, y1, w, b), M, 'H', 2) + P(blade(256 - x0, y0, 256 - x1, y1, w, -b), M, 'H', 2)).join('') +
      P('M66 112 Q72 100 78 98 Q84 114 92 112 Q96 98 104 96 Q110 116 118 112 Q122 96 132 96 Q138 116 146 112 Q150 98 158 96 Q166 114 172 110 Q178 98 186 100 Q188 110 190 112 C190 70 164 52 128 52 C92 52 66 70 66 112 Z', M, 'V', 2) +
      strands(['M86 60 C84 80 84 96 88 108', 'M110 54 C106 78 108 96 112 108', 'M146 54 C150 78 148 96 144 108', 'M170 60 C172 80 172 96 168 108', 'M44 130 C40 160 42 180 38 196', 'M212 130 C216 160 214 180 218 196']) +
      shine('M80 66 C104 50 152 50 176 66', 0.28)),

  // Wavy lob: a wavy shoulder-length bob with a side parting, soft waves down to the tips.
  nw('wavy_lob_hair', 'Wavy Lob', 'hair', BLONDE,
    P('M36 168 C26 96 64 36 128 36 C192 36 230 96 220 168 L198 168 C196 138 188 116 172 104 C146 94 118 88 100 70 C90 86 80 98 72 110 C62 126 58 146 58 168 Z', M, 'H') +
      P('M36 140 C22 162 42 176 30 196 C22 210 32 222 48 218 C62 214 58 202 66 192 C72 180 62 168 64 156 L58 140 Z', M, 'H') +
      P('M220 140 C234 162 214 176 226 196 C234 210 224 222 208 218 C194 214 198 202 190 192 C184 180 194 168 192 156 L198 140 Z', M, 'H') +
      P('M100 56 C134 58 174 78 196 120 C200 130 196 136 190 132 C178 112 154 100 124 98 C112 88 104 78 100 66 Z', M, 'V', 2) +
      strands(['M104 60 C136 66 168 84 188 118', 'M100 74 C126 80 154 92 176 110', 'M38 160 C30 176 44 188 36 204', 'M218 160 C226 176 212 188 220 204', 'M50 168 C46 182 56 194 50 210', 'M206 168 C210 182 200 194 206 210']) +
      s('M100 46 L100 70', K, 2, 0.3) + shine('M110 50 C140 52 170 68 186 92', 0.3)),

  // Layered long: long hair cut in clear face-framing layers, the tips feathered.
  nw('long_layers_hair', 'Layered Long Hair', 'hair', DARK,
    P(longFrame('L196 150 C196 128 190 114 182 104 C160 96 96 96 74 104 C66 114 60 128 60 150'), M, 'H') +
      both('M74 104 C62 124 58 150 60 176 C62 188 70 192 72 182 C72 160 74 134 84 112 Z', M, 'V', 2) +
      P('M74 104 C82 72 104 52 128 50 C152 52 174 72 182 104 C160 96 96 96 74 104 Z', M, 'V', 2) +
      strands(['M128 40 L128 54', 'M100 56 C88 70 80 86 76 104', 'M156 56 C168 70 176 86 180 104', 'M40 140 L38 230', 'M216 140 L218 230', 'M66 160 C62 180 64 200 60 214', 'M190 160 C194 180 192 200 196 214']) +
      shine('M76 74 C100 54 156 54 180 74', 0.28)),

  // Beehive: smooth hair piled high in a tall rounded stack, the sides swept up into it, with a band at its base.
  nw('beehive_hair', 'Beehive', 'hair', AUBURN,
    P('M50 168 C40 124 52 96 68 84 C56 40 86 4 128 4 C170 4 200 40 188 84 C204 96 216 124 206 168 L196 168 C196 134 190 116 180 106 C158 96 98 96 76 106 C66 116 60 134 60 168 Z', M, 'H') +
      P('M68 84 C66 46 92 14 128 14 C164 14 190 46 188 84 C164 72 92 72 68 84 Z', M, 'R', 2) +
      s('M70 86 C96 74 160 74 186 86', T, 7) + s('M70 86 C96 74 160 74 186 86', O, 1.5, 0.4) +
      strands(['M84 66 C90 40 110 24 128 22', 'M172 66 C166 40 146 24 128 22', 'M104 70 C108 50 118 36 128 32', 'M152 70 C148 50 138 36 128 32', 'M62 160 C60 130 66 108 82 96', 'M194 160 C196 130 190 108 174 96', 'M90 100 C110 92 146 92 166 100']) +
      shine('M88 40 C104 24 124 20 140 22', 0.35)),

  // Low bun: sleek hair with a centre parting, swept back and down into a smooth round bun low at the nape, showing
  // to one side of the neck.
  nw('low_bun_hair', 'Low Bun', 'hair', BROWN,
    C(204, 196, 26, M, 'R', 2) + s('M190 194 C190 180 218 178 220 194 C220 206 200 208 198 196', T, 2, 0.7) +
      P('M46 168 C38 96 72 42 128 42 C184 42 218 96 210 168 L200 168 C200 132 192 112 180 100 C158 92 142 88 128 76 C114 88 98 92 76 100 C64 112 56 132 56 168 Z', M, 'V', 2) +
      P('M196 150 C204 160 206 172 200 180 L184 172 C190 166 194 158 196 150 Z', M, 'H', 1.5) + tie(194, 174, 9, 7) +
      s(['M128 46 L128 76', 'M116 52 C96 64 80 84 72 106', 'M140 52 C160 64 176 84 184 106', 'M100 56 C80 70 64 96 60 130', 'M156 56 C176 70 192 96 196 130'].join(' '), O, 2, 0.28) +
      shine('M76 74 C92 56 110 48 122 46 M180 74 C164 56 146 48 134 46', 0.35)),

  // Braided ponytail: gathered high at the crown, the long tail one thick braid swinging down past the shoulder.
  nw('braided_ponytail_hair', 'Braided Ponytail', 'hair', BLONDE,
    braid(along([168, 40], [244, 60], [220, 230], 9), 19) + tie(218, 238, 8, 6) +
      P('M34 176 C26 98 62 36 128 36 C194 36 230 98 222 176 L198 176 C196 140 188 118 178 104 C150 96 106 96 78 104 C68 118 60 140 58 176 Z', M, 'H') +
      strands(['M74 104 C84 76 110 52 150 40', 'M98 98 C110 74 132 56 158 44', 'M182 104 C182 80 176 60 162 46', 'M44 120 C46 92 60 68 84 52']) +
      tie(162, 40, 12, 9) + shine('M80 72 C100 56 124 46 146 42', 0.3)),

  // Long hair with a padded headband: the hair pushed back off the face and falling long behind the band.
  nw('headband_long_hair', 'Headband Long Hair', 'hair', CHESTNUT,
    P(longFrame('L196 150 C196 112 170 84 128 84 C86 84 60 112 60 150'), M, 'H') +
      strands(['M96 88 C92 70 96 58 104 50', 'M160 88 C164 70 160 58 152 50', 'M40 140 L38 240', 'M52 150 L52 240', 'M216 140 L218 240', 'M204 150 L204 240']) +
      P('M52 130 C48 70 86 50 128 50 C170 50 208 70 204 130 C204 138 192 138 190 130 C188 86 164 68 128 68 C92 68 68 86 66 130 C66 138 52 138 52 130 Z', W, 'V', 2) +
      s('M66 112 C70 80 96 60 128 60 C160 60 186 80 190 112', W, 3, 0.35) + shine('M78 46 C100 36 156 36 178 46', 0.25)),

  // Cornrows: neat braids plaited close to the scalp, running back from the hairline, ending in short braids beside the head.
  nw('cornrows_hair', 'Cornrows', 'hair', BLACK,
    [[56, 130], [200, 130]].map(([x, y]) => plait(x < 128 ? x - 12 : x + 12, y, y + 80)).join('') +
      P(SCALP, M, 'H', 2) + f(SCALP, K, 0.2) +
      [[66, 132, 54, 80, 90, 52], [76, 108, 70, 66, 104, 48], [96, 100, 94, 60, 118, 44], [118, 98, 118, 56, 128, 42], [138, 98, 138, 56, 128, 42], [160, 100, 162, 60, 138, 44], [180, 108, 186, 66, 152, 48], [190, 132, 202, 80, 166, 52]]
        .map(([x0, y0, cx, cy, x1, y1]) => row([x0, y0], [cx, cy], [x1, y1])).join('') +
      shine('M86 64 C104 52 152 52 170 64', 0.2)),
];

if (process.argv.includes('--dry')) {
  mkdirSync('out/hair-fix', { recursive: true });
  const out = list.map((r) => ({ id: r.id, name: r.name, category: r.category, palette: r.palette, svg: svg(r.body) }));
  writeFileSync('out/hair-fix/claude.json', `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${out.length} hairstyles -> out/hair-fix/claude.json`);
} else process.exit(commitFresh(list, 'hair fixes') ? 1 : 0);
