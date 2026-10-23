// Realistic redraws of the game's hairstyles, by Claude. The head is a soft oval, x 38-218, y 55-225 (centre 128,140);
// hair covers its top and sides and keeps the face (x 75-181, y 105-215) clear. Hair is one layer over the head, so
// long lengths fall beside it. The game colours hair itself (main = the person's hair colour, trim and accent lighter).
//
//   node tools/real-hair.ts
import { C, E, K, M, O, P, T, W, n, nw, pal, rd, s, commitFresh, commitReal, type Fresh, type Redraw } from './real-kit.ts';

// The cap over the top of the head, ending at a fringe across the forehead and short side pieces.
const CAP = 'M34 176 C26 98 62 36 128 36 C194 36 230 98 222 176 L198 176 C196 142 188 120 180 106 C150 94 106 94 76 106 C68 120 60 142 58 176 Z';
const cap = (g = 'H') => P(CAP, M, g);
// Strands: a few soft lines in the lighter shade and the outline colour, and a shine arc across the crown.
const strands = (ds: string[]) => ds.map((d, i) => s(d, i % 2 ? T : O, 2, i % 2 ? 0.7 : 0.25)).join('');
const crown = strands(['M128 42 C120 60 112 80 106 98', 'M100 48 C90 64 80 84 74 104', 'M156 48 C166 64 176 84 182 104', 'M128 42 C138 60 146 80 150 98']) + s('M70 74 C96 52 160 52 186 74', W, 6, 0.3);
// A hair tie (accent) where a tail or bun is gathered.
const tie = (x: number, y: number, rx = 12, ry = 8) => E(x, y, rx, ry, T, 'R', 1.5);
// A tail of curls: overlapping balls along a list of points.
const curls = (pts: number[][]) => pts.map(([x, y, r]) => C(x, y, r, M, 'R', 2)).join('');
// A braid: overlapping leaves along a list of points, each tilted alternately.
const braid = (pts: number[][], w = 18) =>
  pts.map(([x, y], i) => {
    const d = i % 2 ? 1 : -1;
    return P(`M${x - w} ${y - 10 * d} C${x - w} ${y + 12} ${x + w} ${y + 14} ${x + w} ${y + 10 * d} C${x + w} ${y - 12} ${x - w} ${y - 14} ${x - w} ${y - 10 * d} Z`, M, 'H', 2);
  }).join('');
// A long straight lock falling beside the head, from (x, top) to the bottom, w wide.
const lock = (x: number, top: number, w: number, bottom = 250, flare = 6) =>
  P(`M${x} ${top} L${x + w} ${top} L${x + w + flare} ${bottom - 8} C${x + w + flare} ${bottom} ${x - flare} ${bottom} ${x - flare} ${bottom - 8} Z`, M, 'H', 2.5);


// A cap parted in the middle, with no fringe: the hair sweeps back from the parting at the top of the forehead.
const PARTED = 'M34 176 C26 98 62 36 128 36 C194 36 230 98 222 176 L198 176 C196 140 186 116 172 104 C156 96 140 90 128 76 C116 90 100 96 84 104 C70 116 60 140 58 176 Z';
// Long hair falling straight to the shoulders and past them on both sides, outside the face.
const LONG = 'M28 246 L28 140 C28 70 70 36 128 36 C186 36 228 70 228 140 L228 246 C228 250 222 252 216 250 L196 246 L196 150 C196 130 190 115 182 104 L74 104 C66 115 60 130 60 150 L60 246 L40 250 C34 252 28 250 28 246 Z';
// Soft rounded spikes round the top of the head.
const SPIKES = (() => {
  const k = 9, pt = (a: number, r: number) => `${n(128 + Math.cos(a) * r)} ${n(132 + Math.sin(a) * r * 0.95)}`;
  let d = `M40 160 L${pt(Math.PI * 1.06, 92)}`;
  for (let i = 0; i < k; i++) {
    const a0 = Math.PI * (1.06 + (0.88 * i) / k), a1 = Math.PI * (1.06 + (0.88 * (i + 1)) / k), am = (a0 + a1) / 2;
    d += ` Q${pt(am - 0.04, 118)} ${pt(am, 116)} Q${pt(am + 0.04, 118)} ${pt(a1, 92)}`;
  }
  return `${d} L216 160 L204 156 C202 128 196 114 186 104 C160 96 96 96 70 104 C60 114 54 128 52 156 Z`;
})();
// A thin plait hanging from (x, top): a rope with crossing lines down it.
const plait = (x: number, top: number, bottom = 246) => {
  let x2 = '';
  for (let y = top + 6; y < bottom - 4; y += 12) x2 += `M${x - 5} ${y} L${x + 5} ${y + 5} `;
  return s(`M${x} ${top} L${x} ${bottom}`, O, 13) + s(`M${x} ${top} L${x} ${bottom}`, M, 10) + s(x2.trim(), O, 1.5, 0.35);
};

const HAIR = pal('#6b4226', '#9c6b43', '#b88a5a', '#3b2414');

const list: Redraw[] = [
  // Long wavy hair: wavy curtains from the cap to well past the shoulders.
  rd('long_wavy_hair', HAIR,
    cap() +
      P('M34 150 C20 176 40 196 26 220 C16 236 30 250 48 248 C66 246 60 228 70 214 C78 200 64 184 70 168 C72 156 66 146 58 140 Z', M, 'H') +
      P('M222 150 C236 176 216 196 230 220 C240 236 226 250 208 248 C190 246 196 228 186 214 C178 200 192 184 186 168 C184 156 190 146 198 140 Z', M, 'H') +
      crown + strands(['M44 170 C36 190 50 206 40 228', 'M58 176 C52 196 62 210 54 236', 'M212 170 C220 190 206 206 216 228', 'M198 176 C204 196 194 210 202 236'])),
  // Short bob: a full straight fringe and a blunt cut at the jaw.
  rd('short_bob_hair', HAIR,
    P('M30 200 C22 120 50 36 128 36 C206 36 234 120 226 200 C226 206 220 208 214 208 L196 208 C196 160 190 122 182 104 L74 104 C66 122 60 160 60 208 L42 208 C36 208 30 206 30 200 Z', M, 'H') +
      P('M70 106 C70 70 96 52 128 52 C160 52 186 70 186 106 Z', M, 'V', 2) +
      strands(['M90 60 L86 104', 'M108 54 L106 104', 'M128 52 L128 104', 'M148 54 L150 104', 'M166 60 L170 104', 'M44 120 L40 204', 'M212 120 L216 204']) +
      s('M76 70 C100 54 156 54 180 70', W, 6, 0.3) + s('M42 200 L58 200 M198 200 L214 200', K, 2, 0.15)),
  // Curly twin tails: tied high at each side, falling as curls.
  rd('curly_twin_tails_hair', HAIR,
    curls([[36, 120, 22], [26, 150, 22], [30, 182, 21], [22, 212, 19], [34, 236, 15]]) +
      curls([[220, 120, 22], [230, 150, 22], [226, 182, 21], [234, 212, 19], [222, 236, 15]]) +
      cap() + crown + tie(46, 100) + tie(210, 100) +
      s('M20 146 C28 140 34 146 30 154 M224 146 C232 140 238 146 234 154 M18 206 C26 200 32 206 28 214 M228 206 C236 200 242 206 238 214', T, 2, 0.7)),
  // Space buns: two round buns high on the head, with a swirl.
  rd('space_buns_hair', HAIR,
    C(66, 46, 34, M, 'R') + C(190, 46, 34, M, 'R') +
      s('M50 46 C50 30 80 28 82 46 C82 58 62 60 60 48', T, 2, 0.75) + s('M174 46 C174 30 204 28 206 46 C206 58 186 60 184 48', T, 2, 0.75) +
      cap() + crown + tie(80, 72, 14, 6) + tie(176, 72, 14, 6)),
  // High ponytail: gathered at the crown and swinging out to one side.
  rd('high_ponytail_hair', HAIR,
    P('M150 30 C196 10 246 36 244 96 C242 150 234 196 214 236 C206 248 196 240 200 226 C214 182 220 136 212 98 C206 70 186 56 160 52 Z', M, 'H') +
      cap() + crown + tie(150, 36, 14, 10) +
      strands(['M176 34 C214 40 230 80 226 130', 'M168 46 C200 60 214 100 212 150', 'M226 140 C226 176 218 206 208 232'])),
  // Side braid: the hair swept over to one side into a long braid.
  rd('side_braid_hair', HAIR,
    cap() + crown + braid([[208, 150], [212, 174], [214, 198], [214, 222]]) + tie(214, 240, 10, 6) +
      s('M80 100 C110 80 170 80 204 120', T, 2.5, 0.7)),
  // Crown braid: a braid going over the top of the head like a headband.
  rd('crown_braid_hair', HAIR,
    cap() + crown +
      braid([[54, 112], [70, 80], [96, 60], [128, 52], [160, 60], [186, 80], [202, 112]].map(([x, y]) => [x, y]), 16)),
  // Low ponytail: tied at the nape, the tail falling over one shoulder.
  rd('low_ponytail_hair', HAIR,
    P('M196 168 C222 176 236 200 232 226 C230 242 220 250 210 248 C202 246 204 232 206 220 C210 200 202 186 188 180 Z', M, 'H') +
      cap() + crown + tie(196, 172, 12, 9) + strands(['M216 190 C226 206 224 224 218 242'])),
  // Side puff: a big round puff high on one side.
  rd('side_puff_hair', HAIR,
    C(196, 64, 46, M, 'R') + s('M176 54 C186 40 210 40 218 56 M180 80 C192 92 212 90 222 78', T, 2, 0.7) +
      cap() + crown + tie(168, 92, 14, 8)),
  // Curly afro: a big rounded cloud of curls all round the head.
  rd('curly_afro_hair', HAIR,
    P('M30 196 C4 176 6 132 20 108 C10 74 34 36 70 32 C88 10 168 10 186 32 C222 36 246 74 236 108 C250 132 252 176 226 196 C214 204 200 200 198 186 C196 146 188 120 180 106 C150 94 106 94 76 106 C68 120 60 146 58 186 C56 200 42 204 30 196 Z', M, 'R') +
      [[46, 60], [84, 36], [128, 28], [172, 36], [210, 60], [30, 110], [226, 110], [34, 164], [222, 164], [100, 70], [156, 70]]
        .map(([x, y], i) => s(`M${x - 8} ${y + 4} C${x - 8} ${y - 6} ${x + 8} ${y - 6} ${x + 8} ${y + 4}`, i % 2 ? T : O, 2, i % 2 ? 0.7 : 0.3)).join('') +
      s('M70 60 C96 40 160 40 186 60', W, 6, 0.25)),
  // Twin loop buns: each side's hair looped into a ring.
  rd('twin_loop_buns_hair', HAIR,
    P('M40 84 C10 84 6 136 36 140 C58 142 60 112 58 100 L48 104 C50 116 46 130 36 128 C20 126 24 96 42 96 Z', M, 'H', 2) +
      P('M216 84 C246 84 250 136 220 140 C198 142 196 112 198 100 L208 104 C206 116 210 130 220 128 C236 126 232 96 214 96 Z', M, 'H', 2) +
      cap() + crown + tie(56, 98, 9, 7) + tie(200, 98, 9, 7)),
  // Feathered pixie: short all over, with a soft feathered fringe and tapered sides.
  rd('feathered_pixie_hair', HAIR,
    P('M40 176 C26 94 66 38 128 38 C190 38 230 94 216 176 L202 168 C200 132 194 118 184 108 L172 116 L164 102 L150 112 L140 98 L126 110 L114 98 L102 112 L90 102 L82 116 L72 108 C62 118 56 132 54 168 Z', M, 'H') +
      strands(['M60 80 C80 64 100 60 112 62', 'M196 80 C176 64 156 60 144 62', 'M128 44 C118 62 110 80 104 96', 'M150 52 C152 70 152 86 148 100', 'M44 120 L48 166', 'M212 120 L208 166']) +
      s('M70 70 C96 50 160 50 186 70', W, 6, 0.3)),
  // Long pigtails: tied low each side, falling straight past the shoulders.
  rd('long_pigtails_hair', HAIR,
    lock(26, 150, 30) + lock(200, 150, 30) + cap() + crown + tie(41, 150, 16, 8) + tie(215, 150, 16, 8) +
      strands(['M34 166 L32 240', 'M48 166 L50 240', 'M208 166 L206 240', 'M222 166 L224 240'])),
  // Single top bun: everything gathered into one bun on top.
  rd('single_top_bun_hair', HAIR,
    C(128, 34, 32, M, 'R') + s('M108 34 C108 18 148 16 150 34 C150 48 124 50 122 36', T, 2, 0.75) +
      cap() + strands(['M70 104 C80 80 100 64 122 62', 'M186 104 C176 80 156 64 134 62', 'M96 98 C104 80 116 70 126 66', 'M160 98 C152 80 140 70 130 66']) +
      tie(128, 64, 18, 7)),
  // Bubble pigtails: pigtails tied off every few inches into bubbles.
  rd('bubble_pigtails_hair', HAIR,
    [150, 184, 218].map((y, i) => E(36, y, 20 - i * 2, 17, M, 'R', 2) + E(220, y, 20 - i * 2, 17, M, 'R', 2)).join('') +
      cap() + crown + [134, 167, 201, 234].map((y) => tie(36, y, 10, 5) + tie(220, y, 10, 5)).join('')),
  // Curly side ponytail: gathered on one side and falling as a column of curls.
  rd('curly_side_ponytail_hair', HAIR,
    curls([[214, 140, 24], [226, 170, 22], [214, 198, 21], [228, 224, 18], [212, 242, 13]]) + cap() + crown + tie(206, 118, 14, 9) +
      s('M206 166 C214 158 222 164 218 172 M218 218 C226 210 234 216 230 224', T, 2, 0.7)),
  // Long straight hair with a straight fringe across the forehead.
  rd('long_straight_fringe_hair', HAIR,
    P(LONG, M, 'H') + P('M70 106 C70 70 96 52 128 52 C160 52 186 70 186 106 Z', M, 'V', 2) +
      strands(['M90 60 L86 104', 'M108 54 L106 104', 'M128 52 L128 104', 'M148 54 L150 104', 'M166 60 L170 104', 'M40 140 L38 240', 'M50 150 L50 240', 'M216 140 L218 240', 'M206 150 L206 240']) +
      s('M76 70 C100 54 156 54 180 70', W, 6, 0.3)),
  // Short crop: close to the head, a little textured on top.
  rd('short_crop_hair', HAIR,
    P('M40 178 C30 92 70 42 128 42 C186 42 226 92 216 178 L204 178 C204 132 196 114 186 104 C160 96 96 96 70 104 C60 114 52 132 52 178 Z', M, 'H') +
      s('M76 70 L84 62 M96 58 L104 52 M118 54 L126 48 M140 54 L148 50 M160 58 L168 54 M180 66 L186 62 M86 84 L94 76 M110 74 L118 68 M136 74 L144 70 M160 80 L168 74', T, 2.5, 0.7) +
      s('M70 74 C96 54 160 54 186 74', W, 6, 0.25) + s('M46 124 L46 172 M210 124 L210 172', O, 2, 0.25)),
  // Spiky short hair: short, sticking up in soft rounded spikes.
  rd('spiky_short_hair', HAIR,
    P(SPIKES, M, 'H') + strands(['M128 104 L128 24', 'M100 104 L82 30', 'M156 104 L174 30', 'M80 108 L44 60', 'M176 108 L212 60']) +
      s('M66 82 C96 58 160 58 190 82', W, 6, 0.25)),
  // Box braids: a middle parting and many thin plaits hanging past the shoulders.
  rd('box_braids_hair', HAIR,
    [28, 44, 60, 196, 212, 228].map((x) => plait(x, x < 128 ? 120 + (x - 26) * 0.2 : 120 + (230 - x) * 0.2)).join('') +
      P(PARTED, M, 'H') + strands(['M128 40 L128 76', 'M112 46 C96 60 84 80 78 100', 'M144 46 C160 60 172 80 178 100', 'M96 52 C76 68 62 92 56 122', 'M160 52 C180 68 194 92 200 122']) +
      s('M70 72 C92 54 112 48 124 46 M188 72 C166 54 146 48 132 46', W, 5, 0.25)),
  // Half up with a bow: the top tied back with a little bow, the rest hanging long.
  rd('half_up_bow_hair', HAIR,
    P(LONG, M, 'H') + P('M70 106 C68 76 92 56 128 56 C164 56 188 76 186 106 C164 94 92 94 70 106 Z', M, 'V', 2) +
      strands(['M84 98 C100 76 112 66 124 60', 'M172 98 C156 76 144 66 132 60', 'M40 140 L38 240', 'M216 140 L218 240']) +
      P('M128 30 C110 10 84 14 90 32 C94 46 116 42 128 30 Z', T, 'L', 2) + P('M128 30 C146 10 172 14 166 32 C162 46 140 42 128 30 Z', T, 'L', 2) +
      P('M122 32 L110 58 L118 58 L128 36 Z', T, 'L', 1.5) + P('M134 32 L146 58 L138 58 L128 36 Z', T, 'L', 1.5) + E(128, 30, 8, 7, T, 'R', 1.5) +
      s('M70 74 C96 56 160 56 186 74', W, 6, 0.25)),
  // Curly bob: a bouncy chin-length bob of round curls.
  rd('curly_bob_hair', HAIR,
    cap() + curls([[46, 204, 20], [40, 176, 21], [42, 146, 22], [52, 116, 22], [68, 88, 22], [92, 64, 23], [128, 54, 24], [164, 64, 23], [188, 88, 22], [204, 116, 22], [214, 146, 22], [216, 176, 21], [210, 204, 20],
      [90, 92, 16], [114, 86, 16], [142, 86, 16], [166, 92, 16], [62, 222, 15], [194, 222, 15]]) +
      s('M34 166 C40 160 46 166 42 172 M210 166 C216 160 222 166 218 172 M120 50 C126 44 134 48 132 56', T, 2, 0.7)),
];

// Two hairstyles drawn new in the realistic style (Qwen's tries did not read as the style).
const fresh: Fresh[] = [
  // Side-swept long hair: parted on the left, swept across the forehead to the right, long on both sides.
  nw('side_swept_long_hair', 'Side Swept Long Hair', 'hair', HAIR,
    P(LONG, M, 'H') + P('M92 44 C130 46 172 70 196 112 C200 122 198 130 194 136 C186 118 172 106 150 100 C120 92 92 96 70 106 C66 82 74 58 92 44 Z', M, 'V', 2) +
      strands(['M96 48 C130 56 166 76 190 112', 'M90 62 C120 66 156 82 182 112', 'M80 84 C110 82 140 90 166 104', 'M40 150 L38 240', 'M52 150 L52 240', 'M214 150 L216 240', 'M204 150 L204 240']) +
      s('M92 44 L86 76', K, 2, 0.3) + s('M104 50 C140 54 170 72 188 98', W, 6, 0.3)),
  // Double Dutch braids: two plaits running back from the forehead either side of a middle parting, hanging down each side.
  nw('double_dutch_braids_hair', 'Double Dutch Braids', 'hair', HAIR,
    P(PARTED, M, 'H') +
      braid([[110, 50], [90, 62], [74, 80], [62, 104], [54, 130], [48, 156], [46, 182], [46, 208], [46, 230]], 16) +
      braid([[146, 50], [166, 62], [182, 80], [194, 104], [202, 130], [208, 156], [210, 182], [210, 208], [210, 230]], 16) +
      s('M128 40 L128 76', K, 2, 0.3) + tie(46, 244, 10, 6) + tie(210, 244, 10, 6)),
];

process.exit(commitReal(list, 'hair') + commitFresh(fresh, 'new hair') ? 1 : 0);
