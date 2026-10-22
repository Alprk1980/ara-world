// Realistic redraws, by Claude: furniture, first half (homes, post office, station, bus stop, sky, snow, school,
// daycare, hospital, fire and police stations, pool, zoo, theme park, waterpark, airport). Seats and tops are set where
// people sit and things stand on the new drawings.
//
//   node tools/real-furniture-a.ts
import { A, B, C, E, G, K, M, O, P, T, W, dot, f, ground, oval, pal, rd, ring, s, star, commitReal, type Redraw } from './real-kit.ts';

const WATER = '#7fd1ff';
const bar = (d: string, col: string, w: number) => s(d, O, w + 4) + s(d, col, w);
// A table or counter: a top seen slightly from above (a lit strip), its front edge, and legs or a front panel.
const slab = (x0: number, x1: number, y: number, depth: number, thick: number, fill = M) =>
  P(`M${x0 + depth} ${y} L${x1 - depth} ${y} L${x1} ${y + depth} L${x0} ${y + depth} Z`, fill, 'V', 2) + B(x0, y + depth, x1 - x0, thick, 3, fill, 'L', 2);
const legs = (xs: number[], top: number, bottom: number, w: number, fill = M) => xs.map((x) => B(x, top, w, bottom - top, 3, fill, 'H', 2)).join('');
// A cushion: a soft rounded block, lit on top.
const cushion = (x: number, y: number, w: number, h: number, fill = T) => B(x, y, w, h, Math.min(16, h / 2), fill, 'V', 2);
// Shelf rows inside a cabinet: dark backs with thin shelves.
const shelves = (x0: number, x1: number, ys: number[], fill = M) => ys.map((y) => B(x0, y, x1 - x0, 7, 2, fill, 'V', 1.5)).join('');
const back = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#3a2a2a" opacity="0.28"/>`;
const books = (x: number, y: number, n: number, cols = [T, A, W]) =>
  Array.from({ length: n }, (_, i) => `<rect x="${x + i * 13}" y="${y - 30 - (i % 3) * 4}" width="11" height="${30 + (i % 3) * 4}" rx="2" fill="${cols[i % cols.length]}" stroke="${O}" stroke-width="1"/>`).join('');
const box = (x: number, y: number, w: number, h: number, fill = A) => B(x, y, w, h, 3, fill, 'L', 2) + s(`M${x + w / 2} ${y} L${x + w / 2} ${y + h}`, T, 3, 0.8);
const tyre = (cx: number, cy: number, r: number) => dot(cx, cy, r, K) + C(cx, cy, r * 0.55, T, 'H', 1.5) + dot(cx, cy, r * 0.18, K, 0.5);
const cloud = (cx: number, cy: number, w: number, h: number, fill = M) =>
  P(`M${cx - w / 2} ${cy + h / 2} C${cx - w / 2 - h * 0.6} ${cy + h / 2} ${cx - w / 2 - h * 0.4} ${cy - h * 0.2} ${cx - w / 2 + h * 0.2} ${cy - h * 0.1} C${cx - w / 4} ${cy - h * 0.9} ${cx} ${cy - h * 0.9} ${cx + w * 0.05} ${cy - h * 0.4} C${cx + w / 4} ${cy - h} ${cx + w / 2} ${cy - h * 0.6} ${cx + w / 2 - h * 0.1} ${cy - h * 0.1} C${cx + w / 2 + h * 0.5} ${cy - h * 0.1} ${cx + w / 2 + h * 0.5} ${cy + h / 2} ${cx + w / 2} ${cy + h / 2} Z`, fill, 'R');
const ripple = (x0: number, x1: number, y: number) => s(Array.from({ length: Math.floor((x1 - x0) / 40) }, (_, i) => `M${x0 + i * 40} ${y + (i % 2) * 6} c10 -5 20 5 30 0`).join(' '), W, 3, 0.6);

const list: Redraw[] = [
  // ---------------------------------------------------------------- home
  rd('round_sofa', pal('#d96c7a', '#f2d0d6', '#ffd23f', '#6b2a33'),
    ground(128, 242, 116, 5) + P('M14 170 C14 130 50 112 128 112 C206 112 242 130 242 170 L242 226 L14 226 Z', M, 'V') +
      cushion(36, 162, 92, 40, M) + cushion(128, 162, 92, 40, M) + E(28, 196, 22, 34, M, 'H', 2) + E(228, 196, 22, 34, M, 'H', 2) +
      cushion(160, 130, 50, 38, T) + B(14, 220, 228, 12, 4, M, 'V', 2) + legs([30, 218], 230, 242, 10, A) + s('M60 128 C100 118 156 118 196 128', W, 4, 0.3),
    { base: [128, 242], seat: [128, 164] }),
  rd('single_cozy_bed', pal('#7aa6c9', '#f2f2f2', '#c49a6c', '#2f5a80'),
    ground(128, 243, 118, 3) + B(10, 204, 16, 40, 4, A, 'H', 2) + B(230, 214, 16, 30, 4, A, 'H', 2) +
      B(24, 222, 208, 14, 3, A, 'V', 2) + cushion(26, 210, 204, 16, T) + P('M70 208 L230 208 L230 228 L70 228 Z', M, 'L', 2) + cushion(30, 206, 44, 14, W) +
      s('M80 214 L224 214', W, 3, 0.3),
    { base: [128, 244], seat: [128, 208] }),
  rd('kitchen_table', pal('#b5835a', '#8a5a34', '#f2f2f2', '#4a2c12'),
    ground(128, 242, 116, 5) + slab(10, 246, 64, 16, 16) + legs([22, 64, 182, 222], 96, 242, 12) + s('M30 72 L226 72', W, 3, 0.3) + s('M40 86 L216 86', K, 1.5, 0.15),
    { base: [128, 242], top: [128, 66] }),
  rd('wooden_chair', pal('#b5835a', '#8a5a34', '#d96c7a', '#4a2c12'),
    ground(128, 242, 52, 4) + B(86, 12, 14, 230, 4, M, 'H', 2) + B(156, 12, 14, 130, 4, M, 'H', 2) + [36, 64, 92].map((y) => B(98, y, 60, 10, 3, M, 'V', 1.5)).join('') +
      slab(80, 176, 128, 10, 12) + cushion(88, 122, 80, 12, A) + legs([84, 158], 150, 242, 12) + B(96, 196, 66, 8, 3, M, 'V', 1.5),
    { base: [128, 242], seat: [128, 126] }),
  rd('cozy_bookshelf', pal('#9a6a3a', '#3d7dd8', '#e63946', '#4a2c12'),
    ground(128, 242, 104, 5) + B(26, 12, 204, 230, 6, M, 'L') + back(40, 26, 176, 202) + shelves(40, 216, [82, 142, 202]) +
      books(48, 82, 6, [T, A, W]) + books(140, 82, 3, [A, W, T]) + books(48, 142, 4, [W, T, A]) + C(164, 124, 16, A, 'R', 1.5) + books(110, 202, 7) + B(26, 228, 204, 14, 3, M, 'V', 2),
    { base: [128, 242], top: [128, 14] }),
  rd('cute_fridge', pal('#f2f2f2', '#c0c6cc', '#3d7dd8', '#5a6068'),
    ground(128, 242, 56, 4) + B(74, 12, 108, 226, 12, M, 'H') + s('M76 90 L180 90', O, 2) + B(162, 38, 8, 40, 3, T, 'H', 1.5) + B(162, 108, 8, 60, 3, T, 'H', 1.5) +
      [[96, 50, A], [116, 60, T], [100, 126, A]].map(([x, y, c]) => C(x as number, y as number, 7, c as string, 'R', 1)).join('') + B(84, 234, 18, 8, 2, K, 'V', 1) + B(154, 234, 18, 8, 2, K, 'V', 1) +
      s('M86 24 L86 220', W, 5, 0.35),
    { base: [128, 242], top: [128, 14] }),
  rd('bubble_bathtub', pal('#f2f2f2', '#c0c6cc', '#ff9ec0', '#5a6068'),
    ground(128, 242, 116, 3) + [[40, 172, 12], [70, 164, 16], [104, 168, 12], [150, 162, 18], [190, 168, 14], [220, 172, 10]].map(([x, y, r]) => C(x, y, r, W, 'R', 1.5)).join('') +
      P('M10 182 L246 182 C246 220 222 236 196 236 L60 236 C34 236 10 220 10 182 Z', M, 'L') + B(8, 178, 240, 10, 5, M, 'V', 2) +
      B(30, 234, 14, 10, 4, T, 'V', 1.5) + B(212, 234, 14, 10, 4, T, 'V', 1.5) + s('M24 196 C40 222 70 226 100 226', W, 4, 0.35)),
  // ---------------------------------------------------------------- post office, station, bus stop
  rd('parcel_shelf', pal('#9a6a3a', '#c49a6c', '#e63946', '#4a2c12'),
    ground(128, 242, 116, 4) + B(10, 92, 236, 150, 6, M, 'L') + back(22, 104, 212, 58) + back(22, 172, 212, 58) + shelves(22, 234, [160, 228]) +
      box(30, 122, 46, 38, T) + box(84, 130, 34, 30, T) + box(126, 112, 60, 48, T) + box(194, 126, 36, 34, A) + box(34, 186, 60, 42, T) + box(104, 194, 40, 34, A) + box(152, 180, 74, 48, T),
    { base: [128, 242], top: [128, 94] }),
  rd('post_stamp_machine', pal('#e63946', '#f2f2f2', '#ffd23f', '#6b1a20'),
    ground(128, 242, 64, 4) + B(66, 14, 124, 214, 12, M, 'L') + B(84, 34, 88, 50, 6, G, 'L', 1.5) + P(star(128, 59, 14), A, 'L', 1) +
      [100, 128, 156].map((x) => [104, 124].map((y) => B(x - 9, y, 18, 14, 3, T, 'V', 1)).join('')).join('') + B(92, 158, 72, 10, 3, K, 'V', 1) +
      B(86, 184, 84, 30, 4, M, 'V', 1.5) + B(76, 224, 104, 18, 4, M, 'V', 2) + s('M76 26 L76 214', W, 4, 0.3)),
  rd('postcard_display_table', pal('#9a6a3a', '#f2f2f2', '#3d7dd8', '#4a2c12'),
    ground(128, 242, 116, 4) + [[24, 112, T], [70, 104, A], [116, 112, T], [162, 104, A], [204, 112, T]].map(([x, y, c]) => B(x as number, y as number, 34, 28, 3, c as string, 'L', 1.5) + s(`M${(x as number) + 6} ${(y as number) + 10} L${(x as number) + 28} ${(y as number) + 10}`, K, 1.5, 0.3)).join('') +
      slab(10, 246, 132, 12, 18) + legs([22, 222], 162, 242, 12) + B(30, 196, 196, 8, 3, M, 'V', 1.5),
    { base: [128, 242], top: [128, 134] }),
  rd('cute_parcel_belt', pal('#3a3a3a', '#c0c6cc', '#c49a6c', '#1a1a1a'),
    ground(128, 242, 116, 4) + box(40, 160, 50, 34) + box(120, 150, 64, 44) + box(196, 164, 40, 30) +
      B(10, 194, 236, 22, 11, M, 'V') + s(Array.from({ length: 11 }, (_, i) => `M${26 + i * 20} 198 L${26 + i * 20} 212`).join(' '), T, 2, 0.6) +
      C(20, 205, 8, T, 'R', 1.5) + C(236, 205, 8, T, 'R', 1.5) + legs([30, 118, 210], 216, 242, 12, T)),
  rd('station_ticket_machine', pal('#2a9d8f', '#f2f2f2', '#ffd23f', '#14524a'),
    ground(128, 242, 66, 4) + B(64, 12, 128, 230, 10, M, 'L') + B(80, 30, 96, 66, 6, G, 'L', 1.5) + s('M92 50 L150 50 M92 66 L136 66', K, 3, 0.35) +
      s(Array.from({ length: 3 }, (_, r) => [0, 1, 2].map((c) => `M${96 + c * 24} ${112 + r * 18} h12`).join(' ')).join(' '), T, 8) + B(150, 110, 22, 40, 4, A, 'V', 1.5) +
      B(88, 172, 80, 10, 3, K, 'V', 1) + B(84, 196, 88, 30, 4, M, 'V', 1.5) + s('M72 24 L72 230', W, 4, 0.3)),
  rd('station_bench', pal('#9a6a3a', '#3a3a3a', '#ffd23f', '#4a2c12'),
    ground(128, 242, 116, 5) + [86, 108, 130].map((y) => B(14, y, 228, 14, 4, M, 'V', 2)).join('') +
      bar('M30 80 L30 242 M226 80 L226 242', T, 8) + slab(10, 246, 160, 10, 14) + bar('M30 186 L56 242 M226 186 L200 242', T, 6) + s('M24 92 L232 92', W, 3, 0.3),
    { base: [128, 242], seat: [128, 162] }),
  rd('station_snack_cart', pal('#e63946', '#f2f2f2', '#ffd23f', '#6b1a20'),
    ground(128, 242, 116, 4) + bar('M28 60 L28 140 M228 60 L228 140', T, 4) + P('M14 60 L242 60 L232 84 L24 84 Z', M, 'V', 2) + f('M24 84 L44 96 L64 84 L84 96 L104 84 L124 96 L144 84 L164 96 L184 84 L204 96 L224 84 Z', T) +
      [[44, A], [80, T], [116, A], [150, T], [190, A]].map(([x, c]) => B(x as number, 116, 26, 24, 4, c as string, 'L', 1.5)).join('') +
      slab(16, 240, 138, 10, 64) + B(40, 166, 176, 30, 4, T, 'L', 1.5) + P(star(128, 181, 12), A, 'L', 1) + tyre(56, 226, 16) + tyre(200, 226, 16),
    { base: [128, 242], top: [128, 140] }),
  rd('bus_stop_shelter', pal('#3d7dd8', '#cdeeff', '#ffd23f', '#1f3d6b'),
    ground(128, 242, 116, 5) + P('M10 76 L246 76 L246 94 L10 94 Z', M, 'V', 2) + B(14, 94, 10, 148, 3, M, 'H', 2) + B(232, 94, 10, 148, 3, M, 'H', 2) +
      `<rect x="24" y="94" width="208" height="120" fill="#cdeeff" fill-opacity="0.35" stroke="{{outline}}" stroke-width="2"/>` + s('M80 94 L80 214 M176 94 L176 214', O, 2) +
      B(184, 110, 40, 60, 3, A, 'L', 1.5) + s('M40 104 L60 200', W, 4, 0.4) + slab(40, 216, 180, 8, 10, M) + legs([52, 200], 198, 242, 8),
    { base: [128, 242], seat: [128, 182] }),
  rd('bus_stop_snack_machine', pal('#e63946', '#f2f2f2', '#ffd23f', '#6b1a20'),
    ground(128, 242, 70, 4) + B(60, 12, 136, 230, 10, M, 'L') + B(72, 26, 82, 170, 6, G, 'L', 1.5) +
      [52, 96, 140].map((y) => s(`M76 ${y + 26} L150 ${y + 26}`, O, 2) + [84, 108, 132].map((x, i) => B(x, y, 16, 24, 3, i % 2 ? A : T, 'L', 1)).join('')).join('') +
      B(162, 40, 24, 40, 3, K, 'V', 1) + s('M168 96 h12 M168 110 h12 M168 124 h12', T, 6) + B(76, 204, 74, 24, 4, K, 'V', 1.5)),
  rd('lost_found_basket', pal('#c49a6c', '#9a6a3a', '#e63946', '#5a3a1a'),
    ground(128, 242, 110, 5) + bar('M36 110 C36 20 220 20 220 110', T, 7) +
      B(40, 92, 34, 40, 6, A, 'L', 2) + E(158, 98, 30, 22, A, 'R', 2) + C(110, 92, 20, T, 'R', 2) +
      P('M18 112 L238 112 L218 242 L38 242 Z', M, 'L') + s('M24 140 L232 140 M28 170 L228 170 M32 200 L224 200', T, 3, 0.8) +
      s(Array.from({ length: 10 }, (_, i) => `M${34 + i * 21} 114 L${44 + i * 18} 240`).join(' '), T, 2, 0.5) + B(14, 106, 228, 14, 6, T, 'V', 2)),
  // ---------------------------------------------------------------- sky and snow
  rd('moon_cloud_swing', pal('#ffd23f', '#ffffff', '#cdeeff', '#7a5a00'),
    ground(128, 242, 76, 4) + s('M70 12 L74 170 M186 12 L182 170', O, 3) + s('M70 12 L74 170 M186 12 L182 170', T, 1.5) +
      P('M60 170 C70 222 186 222 196 170 C176 196 80 196 60 170 Z', M, 'R') + cloud(128, 214, 120, 30, T) + P(star(76, 60, 8), M, 'L', 1) + P(star(184, 100, 8), M, 'L', 1),
    { base: [128, 242], seat: [128, 188] }),
  rd('cloud_sofa', pal('#ffffff', '#cdeeff', '#ff9ec0', '#7a8ea8'),
    ground(128, 242, 116, 5) + cloud(128, 150, 180, 60, M) + cloud(36, 196, 40, 50, M) + cloud(220, 196, 40, 50, M) + cushion(50, 180, 156, 40, M) +
      C(90, 142, 16, A, 'R', 1.5) + C(166, 142, 16, T, 'R', 1.5) + B(30, 220, 196, 14, 7, T, 'V', 2) + legs([44, 200], 232, 242, 12, T),
    { base: [128, 242], seat: [128, 182] }),
  rd('cloud_throne', pal('#ffffff', '#ffd23f', '#cdeeff', '#7a8ea8'),
    ground(128, 242, 90, 5) + P('M64 140 L64 50 C64 30 90 30 96 46 C104 20 152 20 160 46 C166 30 192 30 192 50 L192 140 Z', T, 'L') +
      P(star(128, 58, 14), M, 'L', 1.5) + cloud(128, 112, 110, 40, M) + cloud(52, 186, 34, 46, M) + cloud(204, 186, 34, 46, M) +
      cushion(64, 160, 128, 40, M) + B(56, 196, 144, 40, 10, T, 'L', 2) + B(60, 232, 136, 10, 4, T, 'V', 1.5),
    { base: [128, 242], seat: [128, 162] }),
  rd('snowflake_lamp', pal('#cdeeff', '#ffffff', '#3d7dd8', '#5a8aa8'),
    ground(128, 242, 50, 4) + B(122, 100, 12, 130, 4, A, 'H', 2) + B(84, 226, 88, 16, 6, A, 'V', 2) +
      C(128, 74, 62, M, 'R').replace('fill="{{main}}"', 'fill="{{main}}" fill-opacity="0.85"') +
      s([0, 1, 2, 3, 4, 5].map((i) => `M128 74 L${128 + Math.cos(i * 1.047) * 50} ${74 + Math.sin(i * 1.047) * 50}`).join(' '), T, 4) +
      s([0, 1, 2, 3, 4, 5].map((i) => {
        const x = 128 + Math.cos(i * 1.047) * 32, y = 74 + Math.sin(i * 1.047) * 32, a = i * 1.047 + 1.57;
        return `M${x - Math.cos(a) * 10} ${y - Math.sin(a) * 10} L${x + Math.cos(a) * 10} ${y + Math.sin(a) * 10}`;
      }).join(' '), T, 3) + C(128, 74, 8, T, 'R', 1)),
  rd('snowboard_rack', pal('#9a6a3a', '#3d7dd8', '#e63946', '#4a2c12'),
    ground(128, 242, 112, 5) + B(20, 30, 216, 18, 4, M, 'V', 2) + B(20, 210, 216, 18, 4, M, 'V', 2) + B(20, 30, 14, 212, 4, M, 'H', 2) + B(222, 30, 14, 212, 4, M, 'H', 2) +
      [[44, T], [84, A], [124, T], [164, A], [200, T]].map(([x, c]) => P(`M${x} 64 C${x} 46 ${(x as number) + 24} 46 ${(x as number) + 24} 64 L${(x as number) + 24} 212 L${x} 212 Z`, c as string, 'H', 2) + B((x as number) + 2, 100, 20, 10, 3, K, 'V', 1)).join('') +
      B(20, 120, 216, 10, 3, M, 'V', 1.5)),
  rd('school_uniform_rack', pal('#c0c6cc', '#1f3d8a', '#e63946', '#4b525a'),
    ground(128, 242, 82, 5) + bar('M58 30 L58 236 M198 30 L198 236 M50 30 L206 30', M, 5) + B(44, 230, 40, 10, 4, M, 'V', 1.5) + B(172, 230, 40, 10, 4, M, 'V', 1.5) +
      [70, 112, 154].map((x, i) => s(`M${x + 16} 32 L${x + 16} 46`, O, 2) + P(`M${x} 46 L${x + 32} 46 L${x + 36} 150 L${x - 4} 150 Z`, i === 1 ? '#ffffff' : T, 'S', 2) + f(`M${x + 10} 46 L${x + 16} 60 L${x + 22} 46 Z`, A)).join('') +
      P('M66 150 L190 150 L196 200 L60 200 Z', T, 'S', 2) + s('M128 150 L128 200', K, 1.5, 0.2)),
  rd('teacher_desk', pal('#9a6a3a', '#3d7dd8', '#e63946', '#4a2c12'),
    ground(128, 242, 116, 5) + C(196, 52, 12, A, 'R', 1.5) + B(36, 46, 40, 26, 3, T, 'L', 1.5) + B(86, 56, 50, 16, 3, '#ffffff', 'L', 1.5) +
      slab(10, 246, 72, 12, 16) + B(14, 100, 96, 142, 4, M, 'L', 2) + [118, 158, 198].map((y) => s(`M20 ${y} L104 ${y}`, O, 1.5, 0.6) + B(52, y + 10, 20, 6, 3, T, 'V', 1)).join('') +
      B(214, 100, 26, 142, 4, M, 'H', 2) + B(110, 100, 104, 40, 3, M, 'L', 1.5),
    { base: [128, 242], top: [128, 74] }),
  // ---------------------------------------------------------------- daycare and hospital
  rd('daycare_baby_crib', pal('#f2e3c6', '#ffffff', '#a8d5e2', '#8a6f45'),
    ground(128, 242, 116, 4) + B(10, 140, 16, 102, 5, M, 'H', 2) + B(230, 140, 16, 102, 5, M, 'H', 2) + B(26, 196, 204, 18, 6, T, 'V', 2) + cushion(40, 186, 60, 14, A) +
      B(26, 150, 204, 10, 3, M, 'V', 1.5) + B(26, 212, 204, 10, 3, M, 'V', 1.5) + s(Array.from({ length: 12 }, (_, i) => `M${40 + i * 16} 160 L${40 + i * 16} 212`).join(' '), M, 5) +
      s(Array.from({ length: 12 }, (_, i) => `M${40 + i * 16} 160 L${40 + i * 16} 212`).join(' '), O, 1, 0.3)),
  rd('daycare_high_chair', pal('#f2f2f2', '#7ed957', '#ffd23f', '#5a6068'),
    ground(128, 242, 86, 4) + bar('M80 160 L50 242 M176 160 L206 242 M90 160 L104 242 M166 160 L152 242', M, 6) + B(70, 214, 116, 8, 3, M, 'V', 1.5) +
      P('M76 30 C76 18 86 12 98 12 L158 12 C170 12 180 18 180 30 L180 150 L76 150 Z', M, 'L') + cushion(84, 40, 88, 110, T) +
      slab(56, 200, 120, 6, 10) + B(70, 150, 116, 16, 4, M, 'V', 2),
    { base: [128, 242], seat: [128, 140] }),
  rd('daycare_changing_table', pal('#f2e3c6', '#a8d5e2', '#ffffff', '#8a6f45'),
    ground(128, 242, 90, 5) + B(38, 18, 180, 40, 10, T, 'V', 2) + B(38, 50, 180, 192, 6, M, 'L') + [92, 150].map((y) => B(50, y, 156, 50, 4, M, 'L', 1.5) + B(116, y + 20, 24, 8, 3, T, 'V', 1)).join('') +
      B(42, 210, 172, 22, 4, M, 'L', 1.5) + B(36, 46, 184, 10, 3, M, 'V', 1.5),
    { base: [128, 242], top: [128, 22] }),
  rd('daycare_play_mat', pal('#7ed957', '#ffd23f', '#ff8fb8', '#3a7a2a'),
    P('M30 222 L226 222 L246 242 L10 242 Z', M, 'L') + f(Array.from({ length: 6 }, (_, i) => `M${40 + i * 32} 224 L${56 + i * 32} 224 L${56 + i * 34} 240 L${38 + i * 34} 240 Z`).join(' '), T, 0.85) +
      f(Array.from({ length: 5 }, (_, i) => `M${56 + i * 32} 224 L${72 + i * 32} 224 L${72 + i * 34} 240 L${56 + i * 34} 240 Z`).join(' '), A, 0.6) + B(10, 240, 236, 4, 2, M, 'V', 1),
    { base: [128, 244] }),
  rd('hospital_cute_pillow', pal('#f2f2f2', '#a8d5e2', '#ff9ec0', '#5a6068'),
    ground(128, 242, 112, 4) + P('M20 110 C60 92 196 92 236 110 C246 150 246 200 236 228 C196 244 60 244 20 228 C10 200 10 150 20 110 Z', M, 'R') +
      s('M40 116 C80 104 176 104 216 116', W, 5, 0.5) + s('M50 220 C90 230 166 230 206 220', K, 2, 0.12) + P('M128 176 C110 156 90 160 92 176 C94 194 116 200 128 210 C140 200 162 194 164 176 C166 160 146 156 128 176 Z', A, 'L', 1.5)),
  rd('hospital_bedside_lamp', pal('#f2f2f2', '#a8d5e2', '#ffd23f', '#5a6068'),
    ground(128, 242, 70, 4) + B(60, 160, 136, 82, 6, T, 'L') + B(70, 180, 116, 30, 4, T, 'L', 1.5) + B(116, 190, 24, 8, 3, M, 'V', 1) +
      B(122, 90, 12, 72, 4, M, 'H', 1.5) + P('M78 92 L178 92 L156 18 L100 18 Z', M, 'H') + E(128, 92, 50, 6, A, 'V', 0)),
  rd('hospital_comfort_chair', pal('#3d7dd8', '#a8d5e2', '#c49a6c', '#1f3d6b'),
    ground(128, 242, 92, 5) + P('M58 140 L58 32 C58 18 70 12 84 12 L172 12 C186 12 198 18 198 32 L198 140 Z', M, 'L') + cushion(72, 24, 112, 112, M) +
      E(48, 172, 18, 40, M, 'H', 2) + E(208, 172, 18, 40, M, 'H', 2) + cushion(62, 150, 132, 40, T) + B(46, 186, 164, 36, 8, M, 'L', 2) + legs([56, 190], 220, 242, 10, A),
    { base: [128, 242], seat: [128, 152] }),
  // ---------------------------------------------------------------- fire and police stations
  rd('fire_station_helmet_stand', pal('#9a6a3a', '#d62828', '#ffd23f', '#4a2c12'),
    ground(128, 242, 84, 5) + B(120, 80, 16, 152, 4, M, 'H', 2) + B(64, 228, 128, 14, 5, M, 'V', 2) + bar('M128 92 L76 110 M128 92 L180 110', M, 5) +
      P('M80 90 C80 44 104 24 128 24 C152 24 176 44 176 90 Z', T, 'R') + P('M60 92 L196 92 C200 92 200 106 190 108 L66 108 C56 106 56 92 60 92 Z', T, 'V', 2) +
      P('M114 34 L142 34 L140 72 L116 72 Z', A, 'L', 1.5) + P(star(128, 52, 7), T, 'L', 0)),
  rd('fire_station_ladder', pal('#c0c6cc', '#d62828', '#ffd23f', '#4b525a'),
    ground(128, 242, 44, 4) + bar('M98 12 L98 242 M158 12 L158 242', M, 8) + s(Array.from({ length: 10 }, (_, i) => `M98 ${30 + i * 22} L158 ${30 + i * 22}`).join(' '), O, 9) +
      s(Array.from({ length: 10 }, (_, i) => `M98 ${30 + i * 22} L158 ${30 + i * 22}`).join(' '), M, 5) + B(92, 232, 18, 10, 3, K, 'V', 1) + B(146, 232, 18, 10, 3, K, 'V', 1) +
      B(92, 8, 18, 10, 3, T, 'V', 1.5) + B(146, 8, 18, 10, 3, T, 'V', 1.5)),
  rd('fire_station_pet_doghouse', pal('#d62828', '#f2f2f2', '#ffd23f', '#6b1010'),
    ground(128, 242, 116, 5) + P('M30 120 L226 120 L226 242 L30 242 Z', M, 'L') + s([140, 164, 188, 212].map((y) => `M30 ${y} L226 ${y}`).join(' '), K, 1.5, 0.15) +
      P('M90 242 L90 182 C90 152 166 152 166 182 L166 242 Z', K, 'L', 2) + P('M12 128 L128 56 L244 128 L226 138 L128 78 L30 138 Z', T, 'V', 2.5) +
      C(128, 104, 16, A, 'R', 1.5) + B(100, 224, 56, 14, 7, T, 'V', 1.5)),
  rd('fire_station_tool_cabinet', pal('#d62828', '#c0c6cc', '#ffd23f', '#6b1010'),
    ground(128, 242, 76, 5) + B(54, 14, 148, 228, 8, M, 'L') + [44, 96, 148, 200].map((y) => B(64, y - 22, 128, 46, 4, M, 'L', 1.5) + B(108, y - 2, 40, 8, 3, T, 'V', 1)).join('') +
      s('M62 24 L62 232', W, 4, 0.3),
    { base: [128, 242], top: [128, 16] }),
  rd('police_station_snack_table', pal('#9a6a3a', '#1f3d8a', '#ffd23f', '#4a2c12'),
    ground(128, 242, 116, 5) + C(70, 120, 24, A, 'R', 2) + C(70, 120, 9, K, 'R', 0).replace(/fill="url\(#R\)"/, 'fill="url(#R)"') + B(150, 104, 40, 34, 6, T, 'L', 1.5) + s('M190 112 C204 112 204 128 190 128', O, 3) +
      slab(10, 246, 138, 14, 18) + legs([24, 70, 172, 218], 170, 242, 14) + s('M30 146 L226 146', W, 3, 0.3),
    { base: [128, 242], top: [128, 140] }),
  rd('police_station_cosy_chair', pal('#1f3d8a', '#c0c6cc', '#ffd23f', '#0f1f4a'),
    ground(128, 242, 104, 5) + P('M44 150 L44 34 C44 18 58 12 74 12 L182 12 C198 12 212 18 212 34 L212 150 Z', M, 'L') + cushion(58, 26, 140, 110, M) +
      E(32, 178, 22, 46, M, 'H', 2) + E(224, 178, 22, 46, M, 'H', 2) + cushion(48, 148, 160, 42, M) + B(30, 186, 196, 40, 10, M, 'L', 2) + legs([44, 202], 224, 242, 10, T) +
      P(star(128, 80, 16), A, 'L', 1.5),
    { base: [128, 242], seat: [128, 150] }),
  // ---------------------------------------------------------------- pool, zoo
  rd('pool_water_slide', pal('#3d7dd8', '#ffd23f', '#e63946', '#1f3d6b'),
    ground(128, 242, 116, 5) + B(16, 80, 12, 162, 4, T, 'H', 2) + B(68, 80, 12, 162, 4, T, 'H', 2) + [120, 160, 200].map((y) => B(20, y, 56, 8, 3, T, 'V', 1.5)).join('') +
      B(10, 70, 76, 14, 4, A, 'V', 2) + P('M14 64 L82 64 L74 30 L22 30 Z', A, 'V', 2) +
      bar('M80 80 C150 80 140 150 180 180 C210 202 230 210 244 220', M, 22) + s('M80 74 C146 74 136 144 178 172', W, 4, 0.4) + E(230, 232, 26, 8, WATER, 'V', 1.5)),
  rd('pool_towel_rack', pal('#c0c6cc', '#3d7dd8', '#ffd23f', '#4b525a'),
    ground(128, 242, 116, 4) + bar('M20 60 L20 242 M236 60 L236 242 M14 60 L242 60', M, 6) + B(10, 232, 30, 10, 4, M, 'V', 1.5) + B(216, 232, 30, 10, 4, M, 'V', 1.5) +
      [[30, T], [96, A], [162, T]].map(([x, c]) => P(`M${x} 56 L${(x as number) + 60} 56 L${(x as number) + 60} 196 L${x} 196 Z`, c as string, 'S', 2) + s(`M${x} 176 L${(x as number) + 60} 176 M${x} 186 L${(x as number) + 60} 186`, W, 3, 0.7)).join('')),
  rd('pool_drink_cart', pal('#ffd23f', '#3d7dd8', '#e63946', '#7a5a00'),
    ground(128, 242, 116, 4) + [[40, A], [70, T], [180, A], [204, T]].map(([x, c]) => B(x as number, 78, 18, 38, 3, G, 'L', 1.5) + B((x as number) + 2, 92, 14, 24, 2, c as string, 'V', 0) + s(`M${(x as number) + 12} 78 L${(x as number) + 18} 62`, c as string, 2.5)).join('') +
      C(128, 92, 24, WATER, 'R', 1.5) + slab(14, 242, 116, 10, 70) + B(32, 148, 192, 40, 6, T, 'L', 1.5) + s('M46 168 L210 168', W, 4, 0.4) +
      bar('M242 130 L246 100', M, 4) + tyre(52, 222, 20) + tyre(204, 222, 20),
    { base: [128, 242], top: [128, 118] }),
  rd('pool_sun_umbrella', pal('#ffd23f', '#ffffff', '#c49a6c', '#7a5a00'),
    ground(128, 242, 104, 5) + B(124, 100, 8, 142, 3, A, 'H', 1.5) + B(100, 232, 56, 10, 4, A, 'V', 1.5) +
      P('M10 104 C24 52 76 32 128 32 C180 32 232 52 246 104 C228 96 210 96 192 104 C174 96 156 96 138 104 C118 96 100 96 82 104 C64 96 46 96 28 104 Z', M, 'L') +
      f('M82 104 C88 60 106 36 128 32 C114 60 110 80 112 102 Z M192 104 C186 60 168 36 128 32 C142 60 146 80 144 102 Z', T, 0.85) + dot(128, 30, 6, A)),
  rd('bunny_pen', pal('#c49a6c', '#7ed957', '#f2ece4', '#5a3a1a'),
    P('M10 230 L246 230 L246 244 L10 244 Z', T, 'V', 1.5) + C(90, 206, 16, A, 'R', 1.5) + E(90, 188, 5, 14, A, 'L', 1) + E(100, 188, 5, 14, A, 'L', 1) + eye(84, 204, 2.5) +
      C(170, 210, 14, A, 'R', 1.5) + E(166, 194, 4, 12, A, 'L', 1) + eye(176, 208, 2.5) +
      B(10, 140, 236, 10, 3, M, 'V', 2) + B(10, 190, 236, 10, 3, M, 'V', 2) + s(Array.from({ length: 12 }, (_, i) => `M${20 + i * 20} 112 L${20 + i * 20} 240`).join(' '), O, 9) +
      s(Array.from({ length: 12 }, (_, i) => `M${20 + i * 20} 112 L${20 + i * 20} 240`).join(' '), M, 6)),
  rd('monkey_swing', pal('#9a6a3a', '#c49a6c', '#7ed957', '#4a2c12'),
    ground(128, 242, 90, 5) + bar('M50 242 L70 30 L102 242 M206 242 L186 30 L154 242', M, 9) + bar('M60 30 L196 30', M, 10) +
      s('M110 36 C108 80 112 130 108 176 M146 36 C148 80 144 130 148 176', T, 4) + B(96, 174, 64, 12, 4, M, 'V', 2) +
      [[66, 30], [110, 22], [150, 26], [190, 32]].map(([x, y]) => E(x, y, 14, 7, A, 'L', 1)).join('') + s('M60 36 C70 60 66 80 76 96', A, 3),
    { base: [128, 242], seat: [128, 176] }),
  rd('zoo_picnic_table', pal('#9a6a3a', '#e63946', '#ffffff', '#4a2c12'),
    ground(128, 242, 116, 4) + slab(30, 226, 140, 10, 12) + f('M40 140 L60 140 L56 150 L36 150 Z M80 140 L100 140 L96 150 L76 150 Z M120 140 L140 140 L136 150 L116 150 Z M160 140 L180 140 L176 150 L156 150 Z M200 140 L216 140 L212 150 L196 150 Z', T, 0.8) +
      bar('M60 160 L36 242 M196 160 L220 242 M60 160 L196 160', M, 6) + slab(10, 246, 196, 6, 10) + legs([30, 214], 210, 242, 10),
    { base: [128, 242], top: [128, 142], seat: [128, 198] }),
  // ---------------------------------------------------------------- theme park, waterpark, airport
  rd('theme_park_game_counter', pal('#e63946', '#ffffff', '#ffd23f', '#6b1a20'),
    ground(128, 242, 116, 5) + P('M10 48 L246 48 L236 76 L20 76 Z', M, 'V', 2) + f('M20 76 L44 88 L68 76 L92 88 L116 76 L140 88 L164 76 L188 88 L212 76 L236 88 Z', T) +
      back(24, 88, 208, 64) + [60, 100, 140, 180].map((x, i) => C(x, 120, 14, i % 2 ? A : T, 'R', 1.5) + C(x, 120, 6, M, 'R', 0)).join('') +
      slab(10, 246, 152, 10, 90) + f('M10 162 L34 162 L34 252 L10 252 Z M58 162 L82 162 L82 252 L58 252 Z M106 162 L130 162 L130 252 L106 252 Z M154 162 L178 162 L178 252 L154 252 Z M202 162 L226 162 L226 252 L202 252 Z', T, 0.7).replace(/252/g, '242') +
      P(star(128, 196, 20), A, 'L', 1.5),
    { base: [128, 242], top: [128, 154] }),
  rd('theme_park_popcorn_machine', pal('#e63946', '#ffd23f', '#ffffff', '#6b1a20'),
    ground(128, 242, 80, 4) + P('M62 34 L194 34 L178 12 L78 12 Z', M, 'V', 2) + B(58, 34, 140, 110, 6, G, 'L', 2).replace('fill="#cdeeff"', 'fill="#cdeeff" fill-opacity="0.6"') +
      f(Array.from({ length: 22 }, (_, i) => ring(68 + (i % 8) * 17, 128 - Math.floor(i / 8) * 14, 7, 6, 6, (k) => 1 - (k % 2) * 0.2)).join(' '), A) +
      s('M72 46 L72 134', W, 5, 0.5) + B(58, 140, 140, 70, 6, M, 'L', 2) + B(80, 156, 96, 36, 4, T, 'L', 1.5) + legs([66, 178], 208, 236, 12, M) + tyre(72, 232, 9) + tyre(184, 232, 9)),
  rd('theme_park_prize_shelf', pal('#9a6a3a', '#ff8fb8', '#ffd23f', '#4a2c12'),
    ground(128, 242, 106, 5) + B(22, 50, 212, 192, 6, M, 'L') + back(34, 62, 188, 52) + back(34, 124, 188, 52) + back(34, 186, 188, 46) + shelves(34, 222, [114, 176]) +
      [50, 92, 134, 176].map((x, i) => C(x + 16, 92, 18, i % 2 ? T : A, 'R', 1.5)).join('') +
      [44, 94, 144, 190].map((x, i) => P(star(x + 14, 154, 18), i % 2 ? A : T, 'L', 1.5)).join('') + [60, 128, 196].map((x) => C(x, 212, 18, T, 'R', 1.5)).join('') +
      P('M14 50 L242 50 L232 20 L24 20 Z', T, 'V', 2),
    { base: [128, 242], top: [128, 22] }),
  rd('wave_pool', pal('#3d9dd8', '#ffffff', '#7fd1ff', '#1f5a80'),
    P('M10 128 L246 128 L246 244 L10 244 Z', M, 'L', 2) + B(10, 236, 236, 8, 2, T, 'V', 1.5) +
      s('M10 150 C40 130 70 130 100 150 C130 170 160 170 190 150 C210 136 230 134 246 140', T, 8, 0.9) + s('M10 190 C40 172 70 172 100 190 C130 208 160 208 190 190 C210 178 230 176 246 182', T, 6, 0.7) +
      ripple(30, 230, 220) + B(10, 124, 236, 8, 3, T, 'V', 1.5)),
  rd('lazy_river', pal('#3d9dd8', '#c49a6c', '#ff8fb8', '#1f5a80'),
    E(128, 196, 118, 46, T, 'V', 2) + E(128, 196, 100, 32, M, 'L', 1.5) + E(128, 196, 58, 14, T, 'V', 2) + s('M40 190 C60 180 80 200 100 190 M156 210 C176 200 196 220 214 210', W, 3, 0.6) +
      `<ellipse cx="74" cy="212" rx="18" ry="7" fill="none" stroke="{{outline}}" stroke-width="10"/><ellipse cx="74" cy="212" rx="18" ry="7" fill="none" stroke="{{accent}}" stroke-width="7"/>` +
      `<ellipse cx="186" cy="178" rx="16" ry="6" fill="none" stroke="{{outline}}" stroke-width="9"/><ellipse cx="186" cy="178" rx="16" ry="6" fill="none" stroke="#ffffff" stroke-width="6"/>`),
  rd('waterpark_snack_stand', pal('#2a9d8f', '#ffffff', '#ffd23f', '#14524a'),
    ground(128, 242, 92, 5) + P('M28 40 L228 40 L218 70 L38 70 Z', M, 'V', 2) + f('M38 70 L58 82 L78 70 L98 82 L118 70 L138 82 L158 70 L178 82 L198 70 L218 82 Z', T) + C(128, 26, 16, A, 'R', 1.5) +
      bar('M44 70 L44 150 M212 70 L212 150', T, 4) + back(50, 84, 156, 62) + [[66, A], [104, T], [142, A], [176, T]].map(([x, c]) => B(x as number, 110, 22, 30, 4, c as string, 'L', 1.5)).join('') +
      slab(36, 220, 144, 8, 98) + P(star(128, 196, 20), A, 'L', 1.5),
    { base: [128, 242], top: [128, 146] }),
  rd('airport_carry_suitcase', pal('#3d7dd8', '#3a3a3a', '#ffd23f', '#1f3d6b'),
    ground(128, 242, 76, 4) + bar('M98 12 L98 64 M158 12 L158 64 M92 12 L164 12', T, 5) + B(56, 60, 144, 168, 16, M, 'L') +
      s('M90 66 L90 222 M128 66 L128 222 M166 66 L166 222', K, 2, 0.15) + B(64, 110, 128, 10, 3, A, 'V', 1.5) + tyre(76, 234, 9) + tyre(180, 234, 9) + s('M66 76 L66 216', W, 4, 0.3)),
  rd('airport_gift_shop_counter', pal('#7b3fa0', '#ffffff', '#ffd23f', '#3e1f52'),
    ground(128, 242, 116, 5) + [[30, 66, A], [64, 74, T], [180, 64, A]].map(([x, y, c]) => B(x as number, y as number, 30, 96 - (y as number), 4, c as string, 'L', 1.5)).join('') +
      C(140, 82, 14, A, 'R', 1.5) + P(star(210, 82, 12), A, 'L', 1) + slab(10, 246, 96, 10, 146) + B(30, 130, 196, 80, 6, T, 'L', 1.5) +
      P('M56 160 L84 168 L92 158 L98 160 L92 172 L106 176 L104 180 L90 178 L80 190 L74 188 L78 176 L54 168 Z', M, 'L', 1) + s('M130 160 L200 160 M130 180 L184 180', M, 5, 0.7),
    { base: [128, 242], top: [128, 98] }),
];

function eye(x: number, y: number, r = 6) {
  return dot(x, y, r, K) + dot(x - r * 0.35, y - r * 0.35, r * 0.38, W);
}

void [E, oval, ring];
process.exit(commitReal(list, 'furniture A') ? 1 : 0);
