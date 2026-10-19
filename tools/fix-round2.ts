// Fixes from the round-2 vision check for two of Claude's own drawings (croissant: third try; lens case).
import { A, M, T, W, c, commit, ln, obj, p, r, shine } from './draw-kit.ts';

commit([
  // A proper crescent: thick in the middle, tapering to two tips that curl down.
  obj(['cafe'], 'croissant', 'Croissant', 'food', 12, 7,
    p('M14 204 C30 120 80 84 128 84 C176 84 226 120 242 204 C230 200 214 186 200 176 C180 160 154 150 128 150 C102 150 76 160 56 176 C42 186 26 200 14 204 Z', M) +
      ln('M64 112 C78 132 84 150 84 162 M128 86 V150 M192 112 C178 132 172 150 172 162', T, 7) + shine(110, 106, 18, 6),
    { base: [128, 204], grip: [128, 120] }),
  // Two round lens cups joined by a bridge, with ridged lids (no plus/minus signs).
  obj(['eye_opticians'], 'lens_case', 'Lens Case', 'decor', 10, 6,
    r(100, 128, 56, 24, 10, T) + c(76, 140, 52, M) + c(180, 140, 52, A) + c(76, 140, 32, W) + c(180, 140, 32, W) +
      ln('M76 92 V100 M44 108 L50 114 M108 108 L102 114 M180 92 V100 M148 108 L154 114 M212 108 L206 114', T, 5) + shine(60, 112, 10, 5),
    { base: [128, 192] }),
], 'round-2 fixes');
