// Realistic redraws of the game's hairstyles, by Claude. The head is a soft oval, x 38-218, y 55-225 (centre 128,140);
// hair covers its top and sides and keeps the face (x 75-181, y 105-215) clear. Hair is one layer over the head, so
// long lengths fall beside it. The game colours hair itself (main = the person's hair colour, trim and accent lighter).
//
//   node tools/real-hair.ts
import { C, E, K, M, O, P, T, W, pal, rd, s, commitReal, type Redraw } from './real-kit.ts';

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
];

process.exit(commitReal(list, 'hair') ? 1 : 0);
