// Things the second Qwen playtest said were missing: wheelchair and walking frame (old people home), bar stools and
// a pool table (pub). Drawn by Claude, 2026-10-20.
import { A, K, M, T, W, c, commit, ln, obj, p, r, shine } from './draw-kit.ts';

commit([
  obj(['old_people_home', 'hospital'], 'wheelchair', 'Wheelchair', 'furniture', 40, 45, c(96, 180, 56, 'none') + `<circle cx="96" cy="180" r="56" fill="none" stroke="{{trim}}" stroke-width="10"/>` + ln('M96 124 V236 M40 180 H152 M56 140 L136 220 M136 140 L56 220', T, 3) + c(206, 222, 16, K) + r(70, 110, 120, 30, 12, M) + r(150, 30, 30, 96, 12, M) + ln('M180 140 L206 210 M180 40 L222 40', T, 8) + shine(90, 116, 20, 5), { base: [128, 238], seat: [128, 116] }),
  obj(['old_people_home', 'hospital'], 'walking_frame', 'Walking Frame', 'elder', 24, 40, ln('M50 236 V70 M206 236 V70 M50 70 C50 40 206 40 206 70 M50 150 H206', M, 10) + r(40, 60, 30, 26, 10, T) + r(186, 60, 30, 26, 10, T) + c(50, 230, 10, A) + c(206, 230, 10, A), { base: [128, 240] }),
  obj(['pub', 'restaurant'], 'bar_stool', 'Bar Stool', 'furniture', 20, 36, e2() + ln('M128 96 V210', T, 12) + ln('M80 236 L128 200 L176 236', T, 8) + e(128, 170, 40, 10, 'none'), { base: [128, 238], seat: [128, 80] }),
  obj(['pub', 'hotels', 'mansion'], 'pool_table', 'Pool Table', 'furniture', 90, 40, r(14, 90, 228, 40, 14, M) + r(26, 98, 204, 24, 8, '#7fd1ff'.replace('#7fd1ff', A)) + ln('M40 130 V236 M216 130 V236 M128 130 V200', M, 14) + [70, 110, 150].map((x, i) => c(x, 108, 8, [W, T, K][i])).join('') + c(196, 110, 8, W) + ln('M30 70 L170 96', T, 5), { base: [128, 238], top: [128, 90] }),
], 'things batch D');

function e(x: number, y: number, rx: number, ry: number, f: string): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" stroke="{{outline}}" stroke-width="6" stroke-linejoin="round"/>`;
}
function e2(): string {
  return p('M70 80 C70 50 186 50 186 80 C186 100 70 100 70 80 Z', M);
}
