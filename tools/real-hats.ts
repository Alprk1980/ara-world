// Realistic redraws of the game's hats, by Claude. A hat sits on the round head: the crown is as wide as the head
// (x 30-226) with its top near y 108, and the band or brim crosses the forehead at y 196-226; a brim may spread to
// x 6-250. Hats are wide, not tall: only ears, pompoms, stalks and leaves rise above the crown.
//
//   node tools/real-hats.ts
import { A, B, C, E, K, M, P, T, W, dot, f, oval, pal, rd, ring, s, star, commitReal, type Redraw } from './real-kit.ts';

// The crown: a dome over the head from one side of the band to the other.
const dome = (top = 108, x0 = 32, x1 = 224, y = 206, fill = M, g = 'R') =>
  P(`M${x0} ${y} C${x0 - 2} ${top + 30} ${x0 + 40} ${top} 128 ${top} C${x1 - 40} ${top} ${x1 + 2} ${top + 30} ${x1} ${y} Z`, fill, g);
// A band across the forehead (a knitted rib, a ribbon or a cap's edge).
const band = (fill = T, y = 196, h = 28, x0 = 28, x1 = 228) => B(x0, y, x1 - x0, h, h / 2, fill, 'V', 2.5);
// Knit ribs: soft vertical lines down a band or crown.
const ribs = (x0: number, x1: number, y0: number, y1: number, step = 14, col = K) =>
  s(Array.from({ length: Math.floor((x1 - x0) / step) + 1 }, (_, i) => `M${x0 + i * step} ${y0} L${x0 + i * step} ${y1}`).join(' '), col, 2, 0.16);
// A pompom: a fluffy ball with a ragged edge.
const pom = (cx: number, cy: number, r: number, fill = T) => P(ring(cx, cy, r, r, 16, (i) => (i % 2 ? 0.86 : 1)), fill, 'R', 2) + s(`M${cx - r * 0.5} ${cy - r * 0.2} l${r * 0.3} ${r * 0.2} M${cx + r * 0.1} ${cy - r * 0.5} l${r * 0.2} ${r * 0.3} M${cx - r * 0.1} ${cy + r * 0.3} l${r * 0.3} ${-r * 0.1}`, K, 2, 0.2);
// The shine across the top of a crown.
const shine = (top = 108) => s(`M70 ${top + 26} C96 ${top + 8} 160 ${top + 8} 186 ${top + 26}`, W, 7, 0.32);
// A leaf on a stalk, from its base (x, y) pointing at angle a (radians), length l, half-width w.
const leafAt = (x: number, y: number, a: number, l: number, w: number, fill = A) => {
  const tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
  const mx = (x + tx) / 2, my = (y + ty) / 2;
  const r = (v: number) => Math.round(v);
  return P(`M${x} ${y} Q${r(mx + nx)} ${r(my + ny)} ${r(tx)} ${r(ty)} Q${r(mx - nx)} ${r(my - ny)} ${x} ${y} Z`, fill, 'L', 2) + s(`M${x} ${y} L${r(tx)} ${r(ty)}`, K, 1.5, 0.25);
};

const list: Redraw[] = [
  // A floppy straw sun hat: a low crown, a wide soft wavy brim and a ribbon tied in a bow.
  rd('floppy_sun_hat', pal('#e8cf96', '#c99a5a', '#d9667a', '#8a6232'),
    P('M8 214 C2 196 30 186 60 190 C90 184 166 184 196 190 C226 186 254 196 248 214 C244 232 218 236 196 228 C170 234 86 234 60 228 C38 236 12 232 8 214 Z', M, 'V') +
      s('M24 214 C60 222 196 222 232 214', T, 2, 0.6) + s('M40 200 C70 196 186 196 216 200', K, 2, 0.12) +
      dome(112, 46, 210, 202) + s('M70 150 C100 140 156 140 186 150 M60 176 C96 166 160 166 196 176', T, 2, 0.5) +
      B(44, 184, 168, 20, 8, A, 'V', 2) +
      P('M168 194 C150 176 146 206 168 196 C190 206 186 176 168 194 Z', A, 'R', 2) + P('M166 198 L156 228 L166 222 L172 230 L172 200 Z', A, 'L', 2) + C(168, 195, 6, A, 'R', 1.5) +
      shine(112)),
  // A knitted baby bonnet with a pompom, framing the face, with ties under the chin.
  rd('baby_pom_bonnet', pal('#f3c3d1', '#ffffff', '#f7dbe3', '#a86c7e'),
    P('M26 226 C14 150 56 104 128 104 C200 104 242 150 230 226 L206 226 C206 168 176 140 128 140 C80 140 50 168 50 226 Z', M, 'R') +
      ribs(40, 216, 112, 150, 16) + P('M50 226 C50 168 80 140 128 140 C176 140 206 168 206 226 L196 226 C194 178 168 152 128 152 C88 152 62 178 60 226 Z', T, 'V', 2) +
      s('M36 226 C30 236 34 248 40 252 M220 226 C226 236 222 248 216 252', T, 5) + pom(128, 92, 22) + shine(106)),
  // A trapper hat: a furry front band, ear flaps down each side and a pompom on top.
  rd('cozy_ear_flap_hat', pal('#4f6f9b', '#efe4d2', '#c4553f', '#2a3a55'),
    P('M30 190 L22 244 C22 252 50 254 56 246 L66 196 Z', T, 'H') + P('M226 190 L234 244 C234 252 206 254 200 246 L190 196 Z', T, 'H') +
      dome(108) + s('M60 140 L196 140 M48 166 L208 166', A, 6, 0.85) + band(T, 192, 32) +
      s('M40 200 l6 6 M64 198 l6 8 M90 198 l6 8 M116 198 l6 8 M142 198 l6 8 M168 198 l6 8 M194 198 l6 8 M214 200 l6 6', K, 2, 0.14) +
      pom(128, 96, 20, A) + shine(108)),
  // A felt cloche with a little turned-down brim and a daisy on the side.
  rd('grandma_daisy_cloche_hat', pal('#7a8f6a', '#5d704f', '#f4d24b', '#3c4a33'),
    P('M22 214 C30 196 70 192 128 192 C186 192 226 196 234 214 C222 228 186 226 128 226 C70 226 34 228 22 214 Z', M, 'V') +
      dome(104, 34, 222, 204) + B(34, 184, 188, 16, 8, T, 'V', 2) +
      P(ring(180, 186, 24, 24, 16, (i) => (i % 2 ? 0.5 : 1)), W, 'R', 1.5) + C(180, 186, 9, A, 'R', 1.5) + shine(104)),
  // A cotton bucket hat with a sloping brim, and cat ears on top.
  rd('cat_ear_bucket_hat', pal('#f2c14e', '#d8a43a', '#f39aa9', '#8a6420'),
    P('M48 132 L56 84 L92 116 Z', M, 'L') + P('M208 132 L200 84 L164 116 Z', M, 'L') + f('M58 120 L62 98 L80 114 Z', A) + f('M198 120 L194 98 L176 114 Z', A) +
      dome(110, 40, 216, 200) +
      P('M14 222 L40 192 L216 192 L242 222 C244 230 230 234 220 232 L36 232 C26 234 12 230 14 222 Z', M, 'V') +
      s('M44 198 L212 198', T, 3, 0.7) + s('M20 224 L236 224', K, 2, 0.14) + shine(110)),
  // A red toadstool cap with white spots.
  rd('mushroom_cap_hat', pal('#d63a2f', '#ffffff', '#f4e9d6', '#7a1d18'),
    P('M10 210 C8 140 60 98 128 98 C196 98 248 140 246 210 C246 222 228 224 210 218 C170 210 86 210 46 218 C28 224 10 222 10 210 Z', M, 'R') +
      P('M46 218 C86 210 170 210 210 218 L206 228 C168 222 88 222 50 228 Z', A, 'V', 2) +
      E(88, 140, 16, 12, W, 'R', 1.5) + E(150, 124, 13, 10, W, 'R', 1.5) + E(196, 160, 15, 12, W, 'R', 1.5) + E(48, 182, 11, 9, W, 'R', 1.5) + E(128, 176, 12, 9, W, 'R', 1.5) + E(220, 196, 8, 6, W, 'R', 1.5) +
      shine(98)),
  // A snapback cap: a six-panel crown with a button, a star patch and the visor out to one side.
  rd('teen_star_snapback_hat', pal('#20262e', '#d43a3a', '#f4c430', '#0c1014'),
    P('M120 206 C150 196 220 192 252 206 C254 218 236 224 206 224 C176 224 140 222 120 214 Z', T, 'V') +
      dome(108, 32, 222, 210) + s('M128 108 L128 206 M84 116 C70 150 66 180 68 206 M172 116 C186 150 190 180 188 206', K, 2, 0.25) +
      dot(128, 108, 7, T) + P(star(128, 160, 24), A, 'R', 1.5) + s('M34 204 L222 204', K, 2, 0.3) + shine(108)),
  // A puffy beanie with a ribbed turn-up and a big cloud of a pompom.
  rd('kid_puffy_cloud_beanie', pal('#9ccbe8', '#ffffff', '#6ea7cc', '#3d6a87'),
    dome(110) + ribs(46, 210, 120, 192, 14) + band(A, 188, 36) + ribs(40, 216, 192, 220, 10) +
      C(106, 96, 18, T, 'R', 2) + C(150, 96, 18, T, 'R', 2) + C(128, 82, 22, T, 'R', 2) + C(128, 104, 16, T, 'R', 2) + shine(110)),
  // A slouchy wool beret pulled to one side, with bunny ears.
  rd('bunny_ear_beret', pal('#f2eee6', '#f3b2c2', '#c9c2b4', '#7e7766'),
    P('M78 140 C66 90 70 30 92 28 C112 26 112 90 104 136 Z', M, 'H') + f('M86 128 C78 90 82 44 92 42 C102 42 102 90 98 128 Z', T) +
      P('M178 136 C176 86 182 26 204 30 C224 34 214 92 196 140 Z', M, 'H') + f('M184 128 C184 90 192 46 202 46 C212 48 206 90 192 130 Z', T) +
      P('M24 196 C10 150 60 112 136 112 C210 112 252 140 238 176 C230 196 210 204 190 204 L54 206 C38 206 28 204 24 196 Z', M, 'R') +
      band(A, 194, 22, 36, 222) + dot(150, 112, 6, A) + shine(112)),
  // A pineapple beanie: knitted in a crisscross with a crown of leaves.
  rd('kid_pineapple_cap_hat', pal('#f2c230', '#2f8a4a', '#c78a1c', '#7a5a10'),
    leafAt(128, 116, -1.57, 74, 13, T) + leafAt(120, 118, -2.2, 64, 12, T) + leafAt(136, 118, -0.94, 64, 12, T) + leafAt(112, 120, -2.7, 50, 10, T) + leafAt(144, 120, -0.44, 50, 10, T) +
      dome(110) + s('M50 150 L110 206 M60 124 L150 206 M90 112 L180 200 M130 110 L212 186 M206 150 L146 206 M196 124 L106 206 M166 112 L76 200 M126 110 L44 186', A, 2.5, 0.55) +
      band(A, 194, 28) + ribs(40, 216, 196, 220, 10) + shine(110)),
  // An avocado beanie: green with a paler middle and a round brown stone of a pompom.
  rd('grandma_avocado_beanie_hat', pal('#4f7a2f', '#cfe08a', '#7a4a26', '#2a4218'),
    dome(110) + f('M70 196 C64 150 92 128 128 128 C164 128 192 150 186 196 Z', T) + ribs(46, 210, 120, 192, 14) +
      band(M, 192, 30) + ribs(40, 216, 194, 220, 10) + pom(128, 98, 20, A) + shine(110)),
  // A watermelon cap: a red crown with seeds, a white-and-green rind band and a green visor.
  rd('kid_watermelon_cap', pal('#e24a5a', '#2f9a4a', '#f4f0e0', '#7a1d24'),
    P('M40 202 C70 194 186 194 216 202 L234 220 C238 230 222 234 200 230 C160 226 96 226 56 230 C34 234 18 230 22 220 Z', T, 'V') +
      dome(108, 34, 222, 204) + B(36, 192, 184, 12, 6, A, 'V', 2) +
      oval(84, 150, 4, 7, K) + oval(118, 132, 4, 7, K) + oval(152, 140, 4, 7, K) + oval(186, 166, 4, 7, K) + oval(104, 172, 4, 7, K) + oval(140, 176, 4, 7, K) + oval(64, 182, 4, 6, K) +
      dot(128, 108, 7, T) + shine(108)),
];

process.exit(commitReal(list, 'hats') ? 1 : 0);
