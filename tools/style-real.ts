// "Realistic" style samples, by Claude (user's OK, 2026-10-20): one template per category in a shaded,
// real-shapes look (real proportions and colours, soft light from the top left, thin outlines, ground shadows), to
// show the user's daughter before Qwen redraws the rest in that style. Shading is done with overlay gradients made of
// white and dark at low opacity, so every drawing keeps its colour slots and can still be recoloured.
// Validated before writing prompts/style-real.json (also used as the examples in Qwen's prompt later).
//
//   node tools/style-real.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { templateErrors, type Template } from '../schemas/template.ts';
import { itemErrors, type Item } from '../schemas/item.ts';
import { A, B, C, E, G, K, M, O, P, T, W, dot, f, ground, leaf, lin, line, mirror, n, oval, s, svg, wheel } from './real-kit.ts';

// ---------------------------------------------------------------- wearables (each canvas is its body slot)
// Hair for the square head her drawing has (the head fills x 38-218, y 65-215 of the frame): a cap with a side-swept
// fringe, and straight lengths falling past the sides of the head, keeping the face (x 75-181, y 105-215) clear.
const hairCap = 'M60 34 L196 34 C216 34 232 50 232 70 L232 246 L190 246 L190 100 L66 100 L66 246 L24 246 L24 70 C24 50 40 34 60 34 Z';
const hair = svg(
  P(hairCap, M, 'H') +
    s('M24 100 L232 100', O, 2, 0.35) +
    ['M36 110 L36 240', 'M50 106 L50 242', 'M206 106 L206 242', 'M220 110 L220 240', 'M92 44 L88 98', 'M128 40 L128 98', 'M164 44 L168 98']
      .map((d, i) => s(d, i % 2 ? T : O, 2, i % 2 ? 0.75 : 0.25)).join('') +
    s('M64 56 C96 46 160 46 192 56', W, 6, 0.3),
);

// Clothes for the blocky body her drawing has. The torso fills x 20-236 of the top frame (shoulders y 20, hem y 240);
// the legs are one block filling x 40-216 of the bottom frame (x 20-236 for socks); the arms get their sleeves from
// the body itself, so tops have no sleeves of their own. Everything is straight and symmetric.
const top = svg(
  P('M20 24 C20 20 22 18 26 18 L230 18 C234 18 236 20 236 24 L236 236 C236 239 234 240 231 240 L25 240 C22 240 20 239 20 236 Z', M, 'S') +
    P('M76 18 L180 18 C176 40 154 50 128 50 C102 50 80 40 76 18 Z', T, 'V', 2) +
    f('M88 18 L168 18 C164 34 148 40 128 40 C108 40 92 34 88 18 Z', K, 0.18) +
    s('M26 228 L230 228', T, 2, 0.8) +
    s('M70 70 L74 222', K, 3, 0.1) + s('M186 70 L182 222', K, 3, 0.1) + s('M104 62 C116 70 140 70 152 62', K, 2.5, 0.1) +
    P('M150 70 L186 70 L186 102 C176 108 160 108 150 102 Z', M, 'V', 1.5) + s('M150 76 L186 76', T, 1.5, 0.7) + dot(168, 90, 5, A, 0.9),
);

const bottom = svg(
  P('M40 4 L216 4 L216 250 L132 250 L132 120 L124 120 L124 250 L40 250 Z', M, 'S') +
    s('M128 112 L128 250', K, 2.5, 0.3) +
    P('M40 4 L216 4 L216 26 L40 26 Z', M, 'V', 2) +
    [56, 100, 148, 192].map((x) => B(x, 2, 8, 26, 2, M, 'V', 1.5)).join('') +
    C(128, 15, 6, A, 'R', 1.5) +
    s('M128 26 L128 92 C128 102 122 108 114 110', T, 2) + s('M48 30 C70 36 84 50 90 64', T, 2) + s('M208 30 C186 36 172 50 166 64', T, 2) +
    s('M44 34 L44 246', T, 1.5, 0.6) + s('M212 34 L212 246', T, 1.5, 0.6) +
    oval(84, 168, 20, 34, W, 0.13) + oval(172, 168, 20, 34, W, 0.13) +
    s('M42 236 L124 236', T, 2, 0.7) + s('M132 236 L214 236', T, 2, 0.7),
);

const dress = svg(
  P('M40 118 L216 118 L234 250 L22 250 Z', M, 'S') +
    P('M40 14 L216 14 L216 120 L40 120 Z', M, 'S') +
    s('M40 14 L216 14', T, 3) +
    ['M76 124 L62 248', 'M104 124 L98 250', 'M128 124 L128 250', 'M152 124 L158 250', 'M180 124 L194 248'].map((d) => s(d, K, 3, 0.14)).join('') +
    s('M90 128 L80 248', W, 4, 0.16) + s('M166 128 L176 248', W, 4, 0.16) +
    [[60, 222], [100, 182], [150, 204], [192, 228], [118, 152], [170, 160], [84, 140], [134, 236], [210, 200], [44, 240], [70, 60], [128, 84], [186, 60]].map(([x, y]) => dot(x, y, 4, A, 0.85)).join('') +
    s('M24 242 L232 242', T, 3, 0.9) +
    P('M40 108 L216 108 L216 124 L40 124 Z', T, 'V', 2) +
    P('M128 116 C116 104 102 106 104 116 C106 126 120 124 128 116 C136 108 150 106 152 116 C154 126 140 128 128 116 Z', T, 'L', 1.5),
);

const sock = (x: number) =>
  P(`M${x} 0 L${x + 104} 0 L${x + 104} 236 C${x + 104} 246 ${x + 96} 250 ${x + 86} 250 L${x + 18} 250 C${x + 8} 250 ${x} 246 ${x} 236 Z`, M, 'S') +
  P(`M${x} 0 L${x + 104} 0 L${x + 104} 40 L${x} 40 Z`, T, 'V', 2) +
  [12, 24, 36, 48, 60, 72, 84, 96].map((d) => s(`M${x + d} 3 L${x + d} 37`, K, 1.5, 0.16)).join('') +
  P(`M${x} 210 L${x + 104} 210 L${x + 104} 236 C${x + 104} 246 ${x + 96} 250 ${x + 86} 250 L${x + 18} 250 C${x + 8} 250 ${x} 246 ${x} 236 Z`, A, 'S', 2);
const socks = svg(sock(22) + sock(130));

// Trainers seen from the front, one under each half of the leg block.
const shoe = (x: number) =>
  P(`M${x + 8} 112 L${x + 78} 112 C${x + 84} 112 ${x + 86} 116 ${x + 86} 122 L${x + 86} 220 L${x} 220 L${x} 122 C${x} 116 ${x + 2} 112 ${x + 8} 112 Z`, M, 'S') +
  P(`M${x} 186 C${x} 170 ${x + 20} 162 ${x + 43} 162 C${x + 66} 162 ${x + 86} 170 ${x + 86} 186 L${x + 86} 220 L${x} 220 Z`, T, 'V', 2) +
  P(`M${x + 26} 116 L${x + 60} 116 L${x + 60} 168 L${x + 26} 168 Z`, M, 'V', 1.5) +
  [128, 142, 156].map((y) => s(`M${x + 28} ${y} L${x + 58} ${y}`, W, 4) + s(`M${x + 28} ${y} L${x + 58} ${y}`, K, 1, 0.3)).join('') +
  s(`M${x + 4} 200 L${x + 82} 200`, A, 4) +
  B(x - 2, 218, 90, 24, 8, T, 'V', 2) + s(`M${x + 4} 230 L${x + 82} 230`, K, 1.5, 0.2);
const shoes = svg(shoe(40) + shoe(130));

const hat = svg(
  E(128, 214, 110, 24, M, 'L', 2.5) +
    s('M30 214 C80 230 176 230 226 214', K, 1.5, 0.15) + s('M52 204 C90 216 166 216 204 204', K, 1.5, 0.12) +
    P('M72 216 C64 146 88 100 128 100 C168 100 192 146 184 216 Z', M, 'R') +
    s('M80 170 C110 176 146 176 176 170', K, 1.5, 0.15) + s('M86 140 C110 146 146 146 170 140', K, 1.5, 0.15) + s('M98 116 C116 120 140 120 158 116', K, 1.5, 0.12) +
    P('M72 190 C110 202 146 202 184 190 L186 210 C146 222 110 222 70 210 Z', T, 'V', 2) +
    P('M168 200 C180 186 198 188 196 200 C194 212 180 212 168 204 Z', T, 'L', 1.5) + C(168, 202, 5, T, 'R', 1.5),
);

const lens = (x: number) =>
  `<rect x="${x}" y="62" width="88" height="132" rx="40" fill="${G}" fill-opacity="0.3" stroke="${M}" stroke-width="9"/>` +
  `<rect x="${x - 4.5}" y="57.5" width="97" height="141" rx="44" fill="none" stroke="${O}" stroke-width="1.5"/>` +
  [0.2, 0.45, 0.7].map((k) => oval(n(x + 88 * k), 60, 7, 3, T, 0.7)).join('') +
  s(`M${x + 16} 96 L${x + 36} 80`, W, 5, 0.55) + s(`M${x + 18} 116 L${x + 30} 106`, W, 3, 0.4);
const glasses = svg(
  s('M30 96 L6 88', M, 6) + s('M226 96 L250 88', M, 6) + lens(34) + lens(134) +
    s('M122 108 C126 98 130 98 134 108', M, 7) + oval(116, 150, 4, 7, K, 0.18) + oval(140, 150, 4, 7, K, 0.18),
);

const bag = svg(
  s('M108 30 C108 8 148 8 148 30', O, 11) + s('M108 30 C108 8 148 8 148 30', T, 7) +
    P('M52 64 C52 40 76 28 128 28 C180 28 204 40 204 64 L210 230 C210 242 200 248 188 248 L68 248 C56 248 46 242 46 230 Z', M, 'H') +
    P('M70 150 L186 150 L188 226 C188 236 180 240 170 240 L86 240 C76 240 68 236 68 226 Z', M, 'V', 2) +
    s('M74 162 L182 162', T, 2.5) + B(150, 156, 8, 18, 3, A, 'V', 1) +
    s('M60 76 C80 66 176 66 196 76', W, 1.5, 0.3) +
    P('M58 70 C80 60 176 60 198 70 L196 120 C176 128 80 128 60 120 Z', T, 'V', 2) +
    s('M64 116 C84 124 172 124 192 116', W, 1.5, 0.35) +
    s('M92 124 L92 140', T, 6) + s('M164 124 L164 140', T, 6) +
    B(84, 132, 16, 20, 3, A, 'V', 1.5) + B(156, 132, 16, 20, 3, A, 'V', 1.5) +
    s('M54 140 L50 228', K, 2, 0.15) + s('M202 140 L206 228', K, 2, 0.15),
);

// ---------------------------------------------------------------- objects (standing on the ground, front view)
const sofa = svg(
  ground(128, 244, 118) +
    P('M34 128 C34 116 44 110 56 110 L200 110 C212 110 222 116 222 128 L222 186 L34 186 Z', M, 'V') +
    P('M40 120 C40 114 46 112 52 112 L124 112 C127 112 128 114 128 118 L128 174 L44 174 C42 160 40 140 40 120 Z', M, 'L', 2) +
    P(mirror('M40 120 C40 114 46 112 52 112 L124 112 C127 112 128 114 128 118 L128 174 L44 174 C42 160 40 140 40 120 Z'), M, 'L', 2) +
    [[70, 140], [100, 140], [156, 140], [186, 140]].map(([x, y]) => dot(x, y, 2.5, K, 0.3)).join('') +
    P('M54 180 C54 176 58 174 62 174 L124 174 C127 174 128 176 128 180 L128 220 L54 220 Z', M, 'V', 2) +
    P(mirror('M54 180 C54 176 58 174 62 174 L124 174 C127 174 128 176 128 180 L128 220 L54 220 Z'), M, 'V', 2) +
    P('M10 160 C10 146 20 140 32 140 C46 140 54 150 54 162 L54 226 L10 226 Z', M, 'H') +
    P(mirror('M10 160 C10 146 20 140 32 140 C46 140 54 150 54 162 L54 226 L10 226 Z'), M, 'H') +
    P('M150 150 C160 138 196 136 202 146 C208 160 204 176 196 184 C180 180 160 180 150 172 C146 164 146 156 150 150 Z', A, 'R', 2) +
    B(10, 222, 236, 10, 3, M, 'V', 2) +
    [22, 70, 176, 224].map((x) => B(x, 232, 10, 12, 2, T, 'H', 1.5)).join(''),
);

const lamp = svg(
  ground(128, 244, 52, 5) +
    B(122, 124, 12, 48, 4, T, 'H', 1.5) +
    P('M128 168 C96 168 82 186 82 206 C82 226 96 238 106 240 L150 240 C160 238 174 226 174 206 C174 186 160 168 128 168 Z', A, 'R') +
    s('M90 200 C110 192 146 192 166 200', W, 2, 0.35) +
    B(100, 236, 56, 8, 3, T, 'V', 1.5) +
    P('M84 34 L172 34 L198 128 L58 128 Z', M, 'H') +
    oval(128, 124, 66, 7, W, 0.55) +
    s('M84 34 L172 34', T, 4) + s('M58 128 L198 128', T, 4) +
    s('M104 40 L92 122', K, 2, 0.08) + s('M152 40 L164 122', K, 2, 0.08),
);

const apple = svg(
  ground(128, 238, 58, 5) +
    P('M128 92 C150 74 196 76 206 118 C216 162 196 214 164 232 C150 240 140 236 128 230 C116 236 106 240 92 232 C60 214 40 162 50 118 C60 76 106 74 128 92 Z', M, 'R') +
    s('M84 110 C76 140 80 180 96 210', T, 3, 0.28) + s('M170 112 C180 140 176 180 160 210', T, 3, 0.28) + s('M128 104 C124 150 126 190 128 224', T, 2, 0.18) +
    [[100, 150], [150, 170], [118, 200], [170, 140], [86, 186]].map(([x, y]) => dot(x, y, 1.6, T, 0.45)).join('') +
    oval(88, 124, 9, 18, W, 0.45) +
    s('M128 96 C126 78 130 62 138 48', O, 6) +
    P('M136 62 C150 40 182 36 196 46 C186 66 160 76 136 62 Z', A, 'L', 2) + s('M140 61 C156 54 174 50 192 47', O, 1.5, 0.5),
);

const juice = svg(
  ground(128, 247, 50, 4) +
    s('M150 232 L198 8', O, 11) + s('M150 232 L198 8', A, 7) + s('M153 218 L196 18', W, 2, 0.4) +
    f('M76 80 L180 80 L170 232 C170 237 165 240 160 240 L96 240 C91 240 86 237 86 232 Z', M) +
    f('M76 80 L180 80 L170 232 C170 237 165 240 160 240 L96 240 C91 240 86 237 86 232 Z', 'url(#H)') +
    oval(128, 80, 52, 7, T) +
    [[104, 120], [140, 150], [120, 190], [156, 210], [100, 214]].map(([x, y]) => dot(x, y, 3, W, 0.3)).join('') +
    `<path d="M70 40 L186 40 L172 236 C172 242 166 246 160 246 L96 246 C90 246 84 242 84 236 Z" fill="${G}" fill-opacity="0.22"${line(2.5)}/>` +
    s('M84 52 L96 226', W, 6, 0.45) + s('M166 60 L158 200', W, 3, 0.3) +
    `<ellipse cx="128" cy="40" rx="58" ry="7" fill="none"${line(2.5)}/>` +
    P('M164 40 C166 18 210 14 216 40 Z', T, 'L', 2) + P('M170 38 C174 24 204 22 210 38 Z', M, 'R', 0) +
    s('M190 38 L176 28 M190 38 L190 24 M190 38 L204 28', W, 1.5, 0.7),
);

// The pencil lies corner to corner; points along its length t from the tip, across it s.
const pen = (t: number, w: number): [number, number] => [40 + 0.7071 * t + 0.7071 * w, 236 - 0.7071 * t + 0.7071 * w];
const quad = (t0: number, t1: number, w0: number, w1: number) => {
  const p = [pen(t0, w0), pen(t1, w0), pen(t1, w1), pen(t0, w1)];
  return `M${p.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z`;
};
const across = lin('X', [...pen(100, -14), ...pen(100, 14)].map(n), [[0, W, 0.4], [0.35, W, 0], [0.65, K, 0], [1, K, 0.35]], true);
const tipD = `M${pen(0, 0).map(n).join(' ')} L${pen(46, -14).map(n).join(' ')} L${pen(46, 14).map(n).join(' ')} Z`;
const pencil = svg(
  ground(128, 239, 90, 4) +
    f(tipD, W) + f(tipD, M, 0.25) + f(tipD, 'url(#X)') +
    f(`M${pen(0, 0).map(n).join(' ')} L${pen(15, -4.6).map(n).join(' ')} L${pen(15, 4.6).map(n).join(' ')} Z`, K) +
    `<path d="${tipD}" fill="none"${line(2)}/>` +
    P(quad(46, 206, -14, 14), M, 'X', 2.5) +
    s(`M${pen(48, -4.7).map(n).join(' ')} L${pen(204, -4.7).map(n).join(' ')}`, K, 1.5, 0.15) + s(`M${pen(48, 4.7).map(n).join(' ')} L${pen(204, 4.7).map(n).join(' ')}`, K, 1.5, 0.2) +
    P(quad(206, 228, -14.5, 14.5), T, 'X', 2) +
    [212, 217, 222].map((t) => s(`M${pen(t, -14).map(n).join(' ')} L${pen(t, 14).map(n).join(' ')}`, K, 1.2, 0.3)).join('') +
    P(quad(228, 248, -14, 14), A, 'X', 2),
  [across],
);

const teddy = svg(
  ground(128, 242, 82) +
    C(84, 48, 18, M) + C(172, 48, 18, M) + C(84, 50, 9, T, 'R', 0) + C(172, 50, 9, T, 'R', 0) +
    P('M128 120 C88 120 70 150 70 186 C70 216 92 236 128 236 C164 236 186 216 186 186 C186 150 168 120 128 120 Z', M, 'R') +
    E(128, 190, 34, 38, T, 'R', 0) + s('M128 156 L128 222', K, 1.5, 0.14) +
    P('M84 136 C62 140 50 164 56 184 C60 196 74 196 82 186 C88 172 92 152 84 136 Z', M, 'L') +
    P(mirror('M84 136 C62 140 50 164 56 184 C60 196 74 196 82 186 C88 172 92 152 84 136 Z'), M, 'L') +
    P('M74 200 C54 204 44 222 50 236 C56 248 84 248 98 238 C104 226 96 206 74 200 Z', M, 'L') +
    P(mirror('M74 200 C54 204 44 222 50 236 C56 248 84 248 98 238 C104 226 96 206 74 200 Z'), M, 'L') +
    E(64, 232, 12, 10, T, 'R', 1.5) + E(192, 232, 12, 10, T, 'R', 1.5) +
    C(128, 92, 54, M) +
    E(128, 110, 26, 19, T, 'R', 1.5) +
    `<path d="M118 99 C118 93 138 93 138 99 C138 105 132 109 128 109 C124 109 118 105 118 99 Z" fill="${K}"/>` + oval(124, 97, 4, 2, W, 0.6) +
    s('M128 109 L128 116 M119 117 C123 122 133 122 137 117', K, 2.5, 0.85) +
    dot(106, 84, 6.5, K) + dot(150, 84, 6.5, K) + dot(104, 82, 2, W) + dot(148, 82, 2, W) +
    s('M96 70 C102 66 110 66 114 70', K, 2, 0.3) + s('M142 70 C146 66 154 66 160 70', K, 2, 0.3) +
    P('M128 144 C114 132 96 132 98 144 C100 156 116 154 128 146 C140 154 156 156 158 144 C160 132 142 132 128 144 Z', A, 'L', 1.5) + C(128, 145, 6, A, 'R', 1.5),
);

const can = svg(
  ground(132, 246, 76, 5) +
    s('M184 128 C232 112 238 200 200 212', O, 13) + s('M184 128 C232 112 238 200 200 212', M, 8) +
    P('M80 200 L26 108 L38 100 L92 182 Z', M, 'H', 2) +
    P('M12 112 L32 84 L50 96 L30 124 Z', M, 'L', 2) + [[24, 104], [32, 98], [30, 110], [38, 104]].map(([x, y]) => dot(x, y, 1.6, K, 0.4)).join('') +
    P('M76 120 L196 120 L200 232 C200 240 194 244 186 244 L86 244 C78 244 72 240 72 232 Z', M, 'H') +
    s('M75 150 L197 150', K, 2, 0.2) + s('M73 214 L199 214', K, 2, 0.2) + s('M96 128 L94 236', W, 6, 0.35) +
    E(136, 120, 60, 10, M, 'V', 2) + oval(136, 120, 46, 6, K, 0.35) +
    s('M110 118 C110 72 170 72 170 118', O, 12) + s('M110 118 C110 72 170 72 170 118', M, 7) + s('M114 104 C118 82 140 76 156 82', W, 2, 0.4),
);

const pumpkin = svg(
  ground(128, 246, 100, 5) +
    E(64, 178, 44, 62, M) + E(192, 178, 44, 62, M) + E(100, 174, 46, 70, M) + E(156, 174, 46, 70, M) + E(128, 172, 40, 72, M) +
    P('M120 106 C118 88 122 70 134 60 L144 66 C136 76 136 90 138 106 Z', T, 'H', 2) +
    P('M84 152 L112 152 L98 128 Z', A, 'G', 2) + P('M144 152 L172 152 L158 128 Z', A, 'G', 2) + P('M120 176 L136 176 L128 162 Z', A, 'G', 2) +
    P('M78 188 C96 206 160 206 178 188 C170 216 150 226 128 226 C106 226 86 216 78 188 Z', A, 'G', 2) +
    f('M106 196 L118 196 L118 206 L106 204 Z', M) + f('M138 196 L150 196 L150 204 L138 206 Z', M) + f('M122 214 L134 214 L134 225 L122 225 Z', M),
);

const pram = svg(
  ground(128, 246, 100, 5) +
    s('M206 124 L236 70', O, 8) + s('M206 124 L236 70', T, 4) + s('M226 64 L246 74', O, 11) + s('M226 64 L246 74', A, 7) +
    s('M92 194 L70 222 M164 194 L186 222', O, 6) + s('M92 194 L70 222 M164 194 L186 222', T, 3) +
    P('M50 120 L206 120 C206 170 178 196 128 196 C78 196 50 170 50 120 Z', M, 'V') +
    s('M70 150 C100 160 156 160 186 150', W, 1.5, 0.3) + s('M86 176 C110 182 146 182 170 176', W, 1.5, 0.25) +
    P('M58 122 C58 62 108 38 160 50 L162 122 Z', T, 'L') +
    ['M160 50 L82 74', 'M160 50 L68 98', 'M160 50 L60 118'].map((d) => s(d, K, 2, 0.22)).join('') +
    B(46, 114, 164, 12, 6, M, 'V', 2) +
    wheel(70, 222, 22) + wheel(186, 222, 22),
);

const rocker = svg(
  ground(128, 246, 100, 5) +
    B(70, 36, 14, 186, 6, M, 'H', 2) + B(172, 36, 14, 186, 6, M, 'H', 2) +
    [98, 116, 134, 152].map((x) => B(x, 54, 7, 92, 3, M, 'H', 1.5)).join('') +
    B(64, 30, 128, 20, 9, M, 'V', 2) +
    s('M76 60 L76 210', K, 1.5, 0.15) + s('M178 60 L178 210', K, 1.5, 0.15) +
    B(62, 172, 12, 58, 4, M, 'H', 1.5) + B(182, 172, 12, 58, 4, M, 'H', 1.5) +
    P('M56 150 L200 150 L206 172 L50 172 Z', T, 'V', 2) +
    P('M62 136 C90 128 166 128 194 136 L198 152 L58 152 Z', A, 'L', 2) +
    s('M30 226 C80 250 176 250 226 226', O, 12) + s('M30 226 C80 250 176 250 226 226', M, 8) + s('M40 228 C84 244 172 244 216 228', W, 2, 0.25),
);

const plant = svg(
  ground(128, 246, 56, 5) +
    s('M128 172 C122 130 92 112 64 100', O, 7) + s('M128 172 C122 130 92 112 64 100', M, 4) +
    s('M130 172 C138 120 160 96 190 82', O, 7) + s('M130 172 C138 120 160 96 190 82', M, 4) +
    s('M128 172 C128 120 124 80 122 44', O, 7) + s('M128 172 C128 120 124 80 122 44', M, 4) +
    P(leaf(62, 104, 54, Math.PI * 1.08), M, 'L', 2) + s('M62 104 L14 96', W, 2, 0.3) +
    P(leaf(194, 86, 54, -0.25), M, 'L', 2) + s('M194 86 L244 74', W, 2, 0.3) +
    P(leaf(124, 54, 50, -Math.PI / 2), M, 'R', 2) + s('M124 54 L124 8', W, 2, 0.3) +
    P('M88 176 L168 176 L160 244 L96 244 Z', T, 'H') + B(80, 166, 96, 18, 4, T, 'V', 2) + oval(128, 168, 42, 5, A),
);

const dog = svg(
  ground(132, 246, 82) +
    P('M176 214 C206 214 228 196 232 168 C222 188 204 200 180 200 Z', M, 'L', 2) +
    P('M100 120 C76 140 66 180 70 216 C72 234 88 244 110 244 L170 244 C188 244 196 232 192 214 C188 180 168 146 148 128 Z', M, 'L') +
    E(166, 210, 30, 32, M, 'R', 2) +
    P('M96 124 C84 150 86 184 104 204 C112 186 120 160 122 132 Z', T, 'L', 1.5) +
    B(92, 168, 22, 76, 10, M, 'H', 2) + B(120, 174, 20, 70, 10, M, 'H', 2) +
    E(103, 240, 15, 7, M, 'V', 1.5) + E(130, 240, 14, 7, M, 'V', 1.5) +
    P('M88 50 C110 34 150 40 160 66 C168 88 160 112 140 120 C128 126 108 126 98 118 C82 106 76 70 88 50 Z', M, 'R') +
    P('M84 92 C70 96 58 104 58 114 C58 124 72 128 88 124 C100 122 104 108 98 98 Z', T, 'R', 2) +
    oval(60, 108, 8, 6, K) + oval(58, 106, 3, 1.6, W, 0.6) + s('M60 118 C68 124 80 124 90 120', K, 2, 0.6) +
    P('M116 50 C132 46 146 56 146 74 C146 100 136 116 124 116 C114 104 110 80 116 50 Z', M, 'L', 2) + f('M116 50 C132 46 146 56 146 74 C146 100 136 116 124 116 C114 104 110 80 116 50 Z', K, 0.14) +
    dot(98, 76, 6, K) + dot(96, 74, 2, W) + s('M90 66 C96 62 104 62 108 66', K, 2, 0.35) +
    P('M98 120 C112 130 136 130 150 120 L152 132 C136 142 112 142 96 132 Z', A, 'V', 1.5) + C(124, 144, 6, T, 'R', 1.5),
);

const car = svg(
  ground(130, 246, 122) +
    P('M14 206 C12 186 22 176 40 172 L72 166 C88 146 110 132 142 130 L176 130 C196 130 212 144 224 166 L236 172 C246 176 250 188 248 204 L246 214 C246 220 240 224 234 224 L22 224 C16 224 14 218 14 206 Z', M, 'V') +
    P('M84 166 C96 150 112 142 136 140 L136 166 Z', G, 'L', 2) + P('M144 140 L174 140 C188 140 200 150 210 166 L144 166 Z', G, 'L', 2) +
    s('M100 160 L116 146', W, 4, 0.6) + s('M156 160 L170 146', W, 4, 0.5) +
    s('M140 168 L140 220', K, 2, 0.3) + s('M88 168 C86 190 88 206 92 220', K, 2, 0.3) +
    B(116, 176, 14, 4, 2, T, 'V', 1) + B(172, 176, 14, 4, 2, T, 'V', 1) +
    P('M16 190 C22 182 34 180 42 184 L36 196 L18 198 Z', W, 'L', 1.5) + B(236, 178, 10, 14, 3, A, 'V', 1.5) +
    B(10, 206, 42, 10, 4, T, 'V', 1.5) + B(208, 206, 40, 10, 4, T, 'V', 1.5) +
    dot(64, 222, 29, K, 0.55) + dot(198, 222, 29, K, 0.55) + wheel(64, 222, 24) + wheel(198, 222, 24),
);

const lipstick = svg(
  ground(128, 246, 36, 4) +
    P('M112 112 L112 56 C112 44 120 36 144 28 L144 112 Z', M, 'H', 2) + s('M120 58 L120 104', W, 4, 0.5) +
    B(106, 108, 44, 44, 3, T, 'H', 1.5) +
    B(96, 146, 64, 12, 4, T, 'H', 2) +
    B(100, 154, 56, 90, 6, T, 'H', 2) + s('M104 168 L152 168', K, 1.5, 0.2) + s('M104 230 L152 230', K, 1.5, 0.2),
);

const pent = (cx: number, cy: number, r: number, rot = -Math.PI / 2) =>
  `M${Array.from({ length: 5 }, (_, i) => `${n(cx + Math.cos(rot + (i * 2 * Math.PI) / 5) * r)} ${n(cy + Math.sin(rot + (i * 2 * Math.PI) / 5) * r)}`).join(' L')} Z`;
const ball = svg(
  ground(128, 244, 74, 5) +
    dot(128, 128, 112, M) +
    f(pent(128, 128, 32), T) +
    Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const inner: [number, number] = [128 + Math.cos(a) * 32, 128 + Math.sin(a) * 32];
      const out: [number, number] = [128 + Math.cos(a) * 62, 128 + Math.sin(a) * 62];
      const far = a + Math.PI / 5;
      return s(`M${n(inner[0])} ${n(inner[1])} L${n(out[0])} ${n(out[1])}`, O, 2, 0.55) + f(pent(n(128 + Math.cos(far) * 92), n(128 + Math.sin(far) * 92), 24, far + Math.PI), T);
    }).join('') +
    `<circle cx="128" cy="128" r="112" fill="url(#R)"${line(2.5)}/>` + oval(92, 82, 20, 12, W, 0.35),
);

// ---------------------------------------------------------------- the samples and their real-world colours
type Sample = { t: Template; palette: Item['palette']; tags: string[]; bites?: number };
const pal = (main: string, trim: string, accent: string, outline: string) => ({ main, trim, accent, outline });
const wear = (id: string, name: string, category: string, svgText: string, palette: Item['palette']): Sample => ({ t: { id, name, category, svg: svgText }, palette, tags: ['shop'] });
const obj = (id: string, name: string, category: string, size: { w: number; h: number }, anchors: Template['anchors'], svgText: string, palette: Item['palette'], tags: string[], bites?: number): Sample => ({ t: { id, name, category, size, anchors, svg: svgText }, palette, tags, bites });

// A SECOND hair example: the game's own shipped short grammar (cap + stubble ticks), so short asks
// see a proven short design next to the long one (tools/kinds.ts feeds both when the ask is "(hair)").
const shortCropSvg = (JSON.parse(readFileSync('src/data/templates-real.json', 'utf8')) as Template[])
  .find((t) => t.id === 'short_crop_hair')!.svg;

export const SAMPLES: Sample[] = [
  wear('real_long_hair', 'Long Wavy Hair', 'hair', hair, pal('#6b4226', '#9c6b43', '#b88a5a', '#3b2414')),
  wear('real_short_crop_hair', 'Short Crop Hair', 'hair', shortCropSvg, pal('#6b4226', '#9c6b43', '#b88a5a', '#3b2414')),
  wear('real_tshirt', 'Cotton T-shirt', 'top', top, pal('#2b4162', '#e9ecef', '#e9c46a', '#1b2a41')),
  wear('real_jeans', 'Blue Jeans', 'bottom', bottom, pal('#3d5a80', '#e0a458', '#b08d57', '#22334a')),
  wear('real_sundress', 'Summer Dress', 'dress', dress, pal('#f4a6b7', '#fbe4e9', '#ffffff', '#9c4f60')),
  wear('real_socks', 'Sporty Socks', 'socks', socks, pal('#f8f9fa', '#adb5bd', '#e63946', '#6c757d')),
  wear('real_sneakers', 'White Sneakers', 'shoes', shoes, pal('#eef0f2', '#d9d2c5', '#3a86ff', '#495057')),
  wear('real_sun_hat', 'Straw Sun Hat', 'hat', hat, pal('#e9d8a6', '#9b2226', '#ffffff', '#8a7341')),
  wear('real_glasses', 'Tortoise Glasses', 'glasses', glasses, pal('#6f4e37', '#b08968', '#ffffff', '#3b2a1e')),
  wear('real_backpack', 'Leather Backpack', 'bag', bag, pal('#8c5a3c', '#6b4429', '#c9a227', '#4a2e1c')),
  obj('real_sofa', 'Comfy Sofa', 'furniture', { w: 74, h: 42 }, { base: [128, 244], seat: [128, 178] }, sofa, pal('#7a8b99', '#5b4632', '#e9c46a', '#3d4650'), ['living']),
  obj('real_lamp', 'Table Lamp', 'decor', { w: 14, h: 26 }, { base: [128, 244] }, lamp, pal('#f3e9d2', '#b08d57', '#5e7d8a', '#6b5a3e'), ['living', 'bedroom']),
  obj('real_apple', 'Red Apple', 'food', { w: 8, h: 9 }, { base: [128, 238], grip: [128, 160] }, apple, pal('#c8102e', '#f2c14e', '#4c9a2a', '#5a1a14'), ['kitchen'], 3),
  obj('real_juice', 'Orange Juice', 'drink', { w: 7, h: 13 }, { base: [128, 246], grip: [128, 160] }, juice, pal('#ff9f1c', '#ffbf69', '#e63946', '#5a3d2b'), ['kitchen', 'cafe'], 3),
  obj('real_pencil', 'Yellow Pencil', 'school', { w: 13, h: 13 }, { base: [128, 236], grip: [128, 140] }, pencil, pal('#f6c90e', '#b8bec4', '#f08080', '#5c4a10'), ['school']),
  obj('real_teddy', 'Teddy Bear', 'toy', { w: 18, h: 22 }, { base: [128, 242], grip: [128, 170] }, teddy, pal('#a0703c', '#e3c49a', '#c0392b', '#4a2f17'), ['toys', 'kids_room']),
  obj('real_watering_can', 'Watering Can', 'garden', { w: 20, h: 16 }, { base: [132, 246] }, can, pal('#a7b1ba', '#6b7680', '#3a6ea5', '#4b555e'), ['garden', 'outdoor']),
  obj('real_jack_o_lantern', 'Jack-o\'-lantern', 'halloween', { w: 24, h: 20 }, { base: [128, 246] }, pumpkin, pal('#e8751a', '#5b7a2b', '#ffd23f', '#7a3b0c'), ['halloween']),
  obj('real_pram', 'Baby Pram', 'baby', { w: 48, h: 46 }, { base: [128, 244] }, pram, pal('#2f4858', '#86bbd8', '#f6ae2d', '#1d2b33'), ['nursery', 'baby']),
  obj('real_rocking_chair', 'Rocking Chair', 'elder', { w: 40, h: 52 }, { base: [128, 246], seat: [128, 150] }, rocker, pal('#8b5a2b', '#6b4423', '#7d9d72', '#4a2c12'), ['elder_home', 'living']),
  obj('real_monstera', 'Monstera Plant', 'plant', { w: 36, h: 56 }, { base: [128, 244] }, plant, pal('#2d6a4f', '#c0643b', '#4a3222', '#1b4332'), ['living', 'garden']),
  obj('real_golden_dog', 'Golden Retriever', 'animal', { w: 30, h: 32 }, { base: [132, 244] }, dog, pal('#d4a056', '#f1d7a8', '#c0392b', '#7a5320'), ['pet']),
  obj('real_car', 'Family Car', 'vehicle', { w: 175, h: 85 }, { base: [130, 244] }, car, pal('#c1121f', '#adb5bd', '#ff6b35', '#4a0a0f'), ['outdoor']),
  obj('real_lipstick', 'Red Lipstick', 'makeup', { w: 2.4, h: 8 }, { base: [128, 244], grip: [128, 190] }, lipstick, pal('#b5172d', '#d4af37', '#ffffff', '#5c4314'), ['makeup']),
  obj('real_football', 'Football', 'sport', { w: 11, h: 11 }, { base: [128, 240], grip: [128, 128] }, ball, pal('#f8f9fa', '#222222', '#ffffff', '#555555'), ['sport', 'football']),
];

// Only run when called directly (the tests import SAMPLES).
if (process.argv[1]?.endsWith('style-real.ts')) {
  const existing = JSON.parse(readFileSync('src/data/templates.json', 'utf8')) as Template[];
  const all = [...existing, ...SAMPLES.map((x) => x.t)];
  const templates = new Map(all.map((t) => [t.id, t]));
  const items: Item[] = SAMPLES.map((x) => ({ id: x.t.id, name: x.t.name, template: x.t.id, palette: x.palette, tags: x.tags, ...(x.bites ? { bites: x.bites } : {}) }));
  let bad = 0;
  for (const x of SAMPLES) {
    const errs = [...templateErrors(x.t, all), ...itemErrors(items.find((i) => i.id === x.t.id)!, items, templates)];
    if (errs.length) {
      bad++;
      console.log(`✗ ${x.t.id}\n  ${errs.join('\n  ')}`);
    } else console.log(`✓ ${x.t.id} (${x.t.svg.length} bytes)`);
  }
  if (bad) process.exit(1);
  writeFileSync('prompts/style-real.json', JSON.stringify({ templates: SAMPLES.map((x) => x.t), items }, null, 1) + '\n');
  console.log(`${SAMPLES.length} samples -> prompts/style-real.json`);
}
