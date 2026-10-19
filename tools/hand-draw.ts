// Drawings by Claude for the thin places (user's OK, 2026-10-19: finish the art for a proof of concept while the
// local model is busy). Same rules as model-made templates: validated before they are written.
//
//   node tools/hand-draw.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { templateErrors, type Template } from '../schemas/template.ts';

const O = 'stroke="{{outline}}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';
const M = '{{main}}', T = '{{trim}}', A = '{{accent}}', W = '#ffffff', K = '#3a2a2a';
const r = (x: number, y: number, w: number, h: number, rx: number, f: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${O}/>`;
const c = (x: number, y: number, rr: number, f: string) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${f}" ${O}/>`;
const e = (x: number, y: number, rx: number, ry: number, f: string) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${O}/>`;
const p = (d: string, f: string) => `<path d="${d}" fill="${f}" ${O}/>`;
const ln = (d: string, col = '{{outline}}', w = 6) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const shine = (x: number, y: number, rx = 12, ry = 6) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${W}" opacity="0.6"/>`;
const eyes = (x: number, y: number, gap = 16) => `<circle cx="${x - gap}" cy="${y}" r="5" fill="${K}"/><circle cx="${x + gap}" cy="${y}" r="5" fill="${K}"/>`;
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${body}</svg>`;
type D = Omit<Template, 'svg'> & { body: string };
const obj = (id: string, name: string, category: string, w: number, h: number, body: string, anchors: Template['anchors']): D => ({ id, name, category, size: { w, h }, anchors, body });

const DRAWINGS: D[] = [
  // ---- Cafe
  obj('espresso_machine', 'Espresso Machine', 'decor', 30, 30, r(52, 50, 152, 186, 22, M) + r(52, 50, 152, 40, 18, T) + r(96, 120, 64, 22, 8, A) + ln('M108 142 V160 M148 142 V160') + r(98, 176, 60, 56, 10, W) + c(84, 70, 9, A) + c(172, 70, 9, A) + shine(80, 104), { base: [128, 236] }),
  obj('cake_stand', 'Cake Stand', 'decor', 24, 26, p('M70 236 H186 L150 212 H106 Z', T) + r(120, 150, 16, 64, 6, T) + e(128, 150, 92, 14, T) + p('M56 140 V84 C56 60 200 60 200 84 V140 Z', M) + p('M56 84 C80 104 100 70 128 92 C156 70 176 104 200 84', A) + c(128, 46, 14, A) + shine(92, 110), { base: [128, 236], top: [128, 62] }),
  obj('hot_chocolate', 'Hot Chocolate', 'drink', 8, 9, p('M58 92 H182 L170 230 H70 Z', M) + p('M182 120 C226 120 226 190 176 190', 'none') + e(120, 92, 62, 14, T) + c(98, 84, 14, W) + c(126, 80, 16, W) + c(152, 86, 12, W) + ln('M100 40 C90 54 110 60 100 72 M140 36 C130 50 150 56 140 68', A, 5) + shine(86, 140, 8, 16), { base: [120, 230], grip: [190, 156] }),
  obj('croissant', 'Croissant', 'food', 12, 7, p('M28 190 C36 120 90 90 128 90 C166 90 220 120 228 190 C200 176 186 196 166 186 C150 206 106 206 90 186 C70 196 56 176 28 190 Z', M) + ln('M92 104 C100 140 100 170 90 186 M128 92 V196 M164 104 C156 140 156 170 166 186', T, 6) + shine(104, 116), { base: [128, 196], grip: [128, 150] }),
  obj('cosy_armchair', 'Cosy Armchair', 'furniture', 45, 45, r(54, 36, 148, 130, 40, M) + r(30, 116, 50, 100, 22, M) + r(176, 116, 50, 100, 22, M) + r(70, 140, 116, 50, 16, T) + r(40, 190, 176, 34, 14, M) + r(52, 222, 16, 18, 6, A) + r(188, 222, 16, 18, 6, A) + shine(96, 66, 18, 8), { base: [128, 240], seat: [128, 150] }),
  // ---- Hair dressers
  obj('salon_chair', 'Salon Chair', 'furniture', 40, 50, r(70, 20, 116, 110, 36, M) + r(56, 124, 144, 40, 16, T) + r(40, 120, 26, 70, 12, M) + r(190, 120, 26, 70, 12, M) + r(116, 164, 24, 52, 6, A) + p('M60 240 C60 214 196 214 196 240 Z', A) + shine(100, 44, 16, 7), { base: [128, 240], seat: [128, 130] }),
  obj('salon_mirror', 'Salon Mirror', 'decor', 40, 50, e(128, 120, 90, 108, M) + e(128, 120, 68, 86, '#cdeeff') + ln('M96 76 L120 56 M100 108 L148 64', W, 8) + c(128, 22, 10, A) + c(128, 232, 8, A), { base: [128, 232] }),
  obj('hair_dryer', 'Hair Dryer', 'makeup', 14, 12, r(40, 52, 140, 84, 40, M) + e(186, 94, 30, 44, T) + r(80, 130, 48, 106, 18, M) + r(84, 170, 40, 12, 6, A) + ln('M210 70 C226 84 226 104 210 118', A, 5) + shine(76, 74), { base: [104, 236], grip: [104, 190] }),
  obj('salon_comb', 'Comb', 'makeup', 10, 4, r(24, 96, 208, 48, 18, M) + `<path d="M48 144 V200 M72 144 V200 M96 144 V200 M120 144 V200 M144 144 V200 M168 144 V200 M192 144 V200 M212 144 V200" fill="none" stroke="{{main}}" stroke-width="12" stroke-linecap="round"/>` + ln('M48 144 V200 M96 144 V200 M144 144 V200 M192 144 V200', '{{outline}}', 2) + shine(70, 110), { base: [128, 206], grip: [128, 118] }),
  obj('product_shelf', 'Product Shelf', 'furniture', 50, 60, r(34, 24, 188, 212, 16, M) + r(46, 88, 164, 10, 4, T) + r(46, 160, 164, 10, 4, T) + r(62, 46, 26, 42, 8, A) + r(98, 54, 22, 34, 8, T) + r(132, 40, 28, 48, 10, A) + r(170, 52, 24, 36, 8, T) + r(64, 116, 30, 44, 10, T) + r(108, 124, 22, 36, 8, A) + r(144, 112, 32, 48, 10, T) + r(46, 200, 164, 10, 4, T), { base: [128, 236], top: [128, 24] }),
  // ---- Makeup shop
  obj('lipstick_display', 'Lipstick Display', 'furniture', 60, 50, r(28, 118, 200, 118, 18, M) + r(28, 106, 200, 22, 10, T) + [64, 100, 136, 172, 204].map((x, i) => r(x - 10, 70 - (i % 2) * 10, 20, 40 + (i % 2) * 10, 6, i % 2 ? A : T)).join('') + r(76, 156, 104, 44, 14, A) + shine(64, 150), { base: [128, 236], top: [128, 106] }),
  obj('eyeshadow_palette', 'Eyeshadow Palette', 'makeup', 10, 6, r(24, 76, 208, 124, 22, M) + [64, 108, 152, 196].map((x, i) => c(x, 116, 16, i % 2 ? A : T)).join('') + [64, 108, 152, 196].map((x, i) => c(x, 164, 16, i % 2 ? T : A)).join('') + shine(56, 90), { base: [128, 200], grip: [128, 140] }),
  obj('makeup_mirror', 'Makeup Mirror', 'decor', 18, 24, c(128, 98, 82, M) + c(128, 98, 62, '#cdeeff') + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => c(128 + Math.round(Math.cos((i * Math.PI) / 4) * 82), 98 + Math.round(Math.sin((i * Math.PI) / 4) * 82), 9, A)).join('') + r(118, 178, 20, 40, 6, T) + e(128, 228, 56, 12, M) + ln('M100 70 L124 50', W, 8), { base: [128, 238] }),
  obj('brush_set', 'Brush Set', 'makeup', 8, 12, p('M70 236 H186 L196 140 H60 Z', M) + r(84, 40, 18, 104, 8, T) + r(120, 24, 18, 120, 8, A) + r(156, 50, 18, 94, 8, T) + e(93, 40, 14, 22, A) + e(129, 24, 14, 22, T) + e(165, 50, 14, 22, A) + shine(86, 180), { base: [128, 236], grip: [128, 190] }),
  obj('nail_polish_rack', 'Nail Polish Rack', 'decor', 40, 34, r(24, 40, 208, 190, 16, T) + r(36, 116, 184, 10, 4, M) + r(36, 206, 184, 10, 4, M) + [56, 96, 136, 176].map((x, i) => r(x, 72, 26, 44, 8, i % 2 ? M : A) + r(x + 7, 56, 12, 18, 4, '{{outline}}')).join('') + [56, 96, 136, 176].map((x, i) => r(x, 162, 26, 44, 8, i % 2 ? A : M) + r(x + 7, 146, 12, 18, 4, '{{outline}}')).join(''), { base: [128, 230] }),
  // ---- Eye opticians
  obj('glasses_display', 'Glasses Display', 'furniture', 50, 60, r(44, 20, 168, 216, 18, M) + [70, 128, 186].map((y) => c(96, y, 18, '#cdeeff') + c(160, y, 18, '#cdeeff') + ln(`M114 ${y} H142`, '{{outline}}', 6)).join('') + r(44, 20, 168, 26, 12, T) + shine(80, 40), { base: [128, 236], top: [128, 20] }),
  obj('eye_chart', 'Eye Chart', 'decor', 30, 42, r(48, 16, 160, 224, 16, W) + r(48, 16, 160, 224, 16, 'none') + `<path d="M108 52 H148 M128 52 V92" fill="none" stroke="{{main}}" stroke-width="14" stroke-linecap="round"/>` + ln('M92 120 H164', '{{main}}', 12) + ln('M96 152 H160', '{{trim}}', 10) + ln('M102 180 H154', '{{accent}}', 8) + ln('M108 204 H148', '{{main}}', 6) + ln('M112 224 H144', '{{trim}}', 5), { base: [128, 240] }),
  obj('optician_lamp', 'Optician Lamp', 'decor', 30, 70, p('M80 30 H176 L200 98 H56 Z', M) + c(128, 104, 14, A) + r(120, 104, 16, 118, 6, T) + e(128, 228, 56, 12, M) + shine(104, 52, 14, 7), { base: [128, 238] }),
  obj('lens_case', 'Lens Case', 'decor', 10, 6, r(26, 100, 204, 84, 40, M) + c(84, 130, 34, T) + c(172, 130, 34, A) + `<text/>`.replace('<text/>', '') + ln('M84 112 V148 M66 130 H102', '{{outline}}', 5) + ln('M154 130 H190', '{{outline}}', 5) + shine(70, 116), { base: [128, 184] }),
  obj('eye_drop_bottle', 'Eye Drop Bottle', 'decor', 5, 9, p('M80 236 V120 C80 96 176 96 176 120 V236 Z', M) + r(104, 64, 48, 42, 10, T) + p('M114 64 L128 22 L142 64 Z', A) + r(94, 150, 68, 48, 10, W) + c(128, 174, 10, A), { base: [128, 236] }),
  // ---- Vets
  obj('pet_bed', 'Pet Bed', 'decor', 40, 14, p('M24 236 C20 160 60 136 128 136 C196 136 236 160 232 236 Z', M) + e(128, 196, 84, 30, T) + c(104, 186, 7, A) + c(152, 196, 7, A) + c(128, 214, 6, A) + shine(64, 168, 16, 7), { base: [128, 236], seat: [128, 196] }),
  obj('treat_jar', 'Treat Jar', 'decor', 10, 14, r(60, 76, 136, 160, 34, '#cdeeff') + r(52, 50, 152, 34, 14, M) + r(108, 30, 40, 24, 10, T) + p('M84 170 C84 156 100 150 108 162 C116 150 132 156 132 170 C132 182 116 186 108 176 C100 186 84 182 84 170 Z', A) + r(132, 136, 40, 18, 9, T) + shine(84, 112, 10, 22), { base: [128, 236] }),
  obj('bone_toy', 'Bone Toy', 'toy', 12, 5, p('M58 104 C30 76 70 52 82 84 H174 C186 52 226 76 198 104 C226 132 186 156 174 124 H82 C70 156 30 132 58 104 Z', M) + shine(96, 96, 22, 6), { base: [128, 140], grip: [128, 104] }),
  obj('grooming_table', 'Grooming Table', 'furniture', 60, 34, r(20, 70, 216, 34, 14, M) + r(40, 104, 18, 132, 6, T) + r(198, 104, 18, 132, 6, T) + r(40, 168, 176, 14, 6, T) + r(196, 20, 14, 52, 6, A) + p('M150 20 H210', 'none') + ln('M150 24 H206', '{{accent}}', 8) + shine(60, 82, 20, 6), { base: [128, 236], top: [128, 70] }),
  obj('water_bowl', 'Water Bowl', 'decor', 14, 5, p('M28 150 H228 L204 232 H52 Z', M) + e(128, 150, 100, 22, '#7fd1ff') + ln('M84 152 C100 144 116 160 132 152', W, 5) + p('M100 196 C100 186 112 182 118 190 C124 182 136 186 136 196 C136 206 118 214 118 214 C118 214 100 206 100 196 Z', T), { base: [128, 232] }),
  // ---- Pet shop
  obj('pet_cage', 'Pet Cage', 'decor', 40, 40, r(30, 60, 196, 160, 16, 'none') + p('M30 60 C30 14 226 14 226 60 Z', M) + `<path d="M58 60 V220 M90 60 V220 M122 60 V220 M154 60 V220 M186 60 V220" fill="none" stroke="{{main}}" stroke-width="8"/>` + r(22, 212, 212, 26, 10, T) + c(128, 26, 10, A) + c(106, 176, 22, A) + eyes(106, 172, 8), { base: [128, 238] }),
  obj('hamster', 'Hamster', 'animal', 8, 7, e(128, 168, 92, 66, M) + c(70, 104, 20, M) + c(186, 104, 20, M) + c(70, 104, 9, T) + c(186, 104, 9, T) + e(128, 188, 58, 40, T) + eyes(128, 144, 26) + e(128, 162, 8, 6, A) + e(96, 232, 16, 8, T) + e(160, 232, 16, 8, T), { base: [128, 238] }),
  obj('pet_rabbit', 'Rabbit', 'animal', 10, 14, e(104, 60, 18, 52, M) + e(152, 60, 18, 52, M) + e(104, 64, 8, 36, T) + e(152, 64, 8, 36, T) + e(128, 196, 78, 50, M) + c(128, 130, 50, M) + eyes(128, 126, 20) + e(128, 144, 7, 5, A) + c(208, 200, 16, W) + e(92, 238, 18, 8, T) + e(164, 238, 18, 8, T), { base: [128, 244] }),
  obj('goldfish_bowl', 'Goldfish Bowl', 'decor', 18, 18, p('M76 40 H180 C240 80 240 200 180 236 H76 C16 200 16 80 76 40 Z', '#cdeeff') + r(70, 30, 116, 20, 10, T) + p('M70 130 C70 120 230 120 214 130 C214 180 190 230 128 230 C66 230 42 180 42 130 Z', '#7fd1ff') + e(124, 168, 30, 20, M) + p('M150 168 L180 148 V188 Z', M) + c(110, 162, 4, K) + shine(70, 90, 10, 24), { base: [128, 236] }),
  obj('cat_tree', 'Cat Tree', 'furniture', 40, 90, r(112, 40, 32, 196, 8, T) + r(40, 30, 120, 30, 14, M) + r(100, 110, 120, 30, 14, M) + r(36, 180, 110, 30, 14, M) + r(30, 220, 196, 20, 8, M) + c(60, 66, 10, A) + ln('M60 66 V86', '{{accent}}', 4), { base: [128, 240], top: [96, 30] }),
  // ---- Paint shop
  obj('paint_cans', 'Paint Cans', 'decor', 24, 18, r(28, 110, 92, 126, 14, M) + e(74, 110, 46, 14, T) + p('M28 140 C50 154 60 134 74 150 C88 134 98 154 120 140 V160 H28 Z', A) + r(136, 140, 92, 96, 14, T) + e(182, 140, 46, 14, M) + p('M136 166 C158 180 168 160 182 176 C196 160 206 180 228 166 V186 H136 Z', A) + shine(52, 190, 8, 16), { base: [128, 236] }),
  obj('paintbrush', 'Paintbrush', 'school', 6, 14, r(112, 24, 32, 130, 14, M) + r(106, 150, 44, 22, 6, T) + p('M106 172 H150 C152 210 140 236 128 240 C116 236 104 210 106 172 Z', A) + shine(124, 60, 5, 18), { base: [128, 240], grip: [128, 90] }),
  obj('paint_palette', 'Paint Palette', 'school', 12, 9, p('M40 128 C40 64 120 40 176 56 C228 72 236 128 210 168 C190 196 160 180 150 196 C136 218 92 226 66 204 C44 186 40 160 40 128 Z', T) + c(170, 152, 18, '#ffffff') + c(84, 112, 16, M) + c(122, 84, 16, A) + c(170, 96, 16, M) + c(96, 170, 16, A), { base: [128, 216], grip: [170, 152] }),
  obj('paint_roller', 'Paint Roller', 'school', 8, 14, r(40, 24, 176, 60, 26, M) + ln('M200 54 H224 V118 H128 V150', '{{outline}}', 10) + r(110, 150, 36, 90, 14, T) + shine(80, 42, 20, 7), { base: [128, 240], grip: [128, 196] }),
  obj('color_swatches', 'Colour Swatches', 'decor', 30, 30, r(40, 30, 176, 200, 14, W) + [0, 1, 2].map((row) => [0, 1, 2].map((col) => r(58 + col * 50, 50 + row * 58, 40, 44, 8, [M, T, A][(row + col) % 3])).join('')).join(''), { base: [128, 230] }),
  // ---- Sweets shop
  obj('candy_jars', 'Candy Jars', 'decor', 26, 20, r(24, 100, 96, 136, 26, '#cdeeff') + r(30, 82, 84, 22, 10, M) + c(52, 160, 12, M) + c(84, 150, 12, A) + c(66, 196, 12, T) + c(98, 200, 12, M) + r(136, 130, 96, 106, 26, '#cdeeff') + r(142, 112, 84, 22, 10, T) + c(164, 180, 12, A) + c(196, 172, 12, M) + c(180, 210, 12, T) + shine(44, 124, 7, 16), { base: [128, 236] }),
  obj('lollipop_stand', 'Lollipop Stand', 'decor', 30, 50, r(120, 70, 16, 150, 6, T) + p('M60 240 C60 210 196 210 196 240 Z', M) + c(128, 66, 54, M) + ln('M128 66 m-34 0 a34 34 0 1 0 34 -34 a22 22 0 1 0 22 22', '{{trim}}', 10) + c(60, 120, 26, A) + c(196, 120, 26, T) + ln('M60 146 L110 200 M196 146 L146 200', '{{trim}}', 6), { base: [128, 240] }),
  obj('pink_donut', 'Donut', 'food', 9, 5, e(128, 150, 104, 74, T) + p('M30 140 C30 92 70 74 128 74 C186 74 226 92 226 140 C210 160 190 134 170 156 C150 170 140 146 128 160 C112 172 96 146 80 160 C60 170 46 150 30 140 Z', M) + e(128, 132, 30, 18, '#ffffff') + ln('M74 104 L84 112 M150 96 L162 102 M184 124 L194 116 M98 136 L104 146', '{{accent}}', 6), { base: [128, 224], grip: [128, 190] }),
  obj('chocolate_bar', 'Chocolate Bar', 'food', 10, 5, r(30, 74, 196, 108, 14, M) + r(30, 74, 84, 108, 14, T) + `<path d="M114 110 H226 M152 74 V182 M190 74 V182" fill="none" stroke="{{outline}}" stroke-width="5"/>` + p('M60 100 C70 90 84 92 88 104', 'none') + shine(64, 96), { base: [128, 182], grip: [72, 128] }),
  obj('gummy_bears', 'Gummy Bears', 'food', 8, 5, [[72, M], [128, A], [184, T]].map(([x, f]) => c(Number(x), 120, 30, String(f)) + c(Number(x) - 22, 92, 11, String(f)) + c(Number(x) + 22, 92, 11, String(f)) + e(Number(x), 180, 32, 40, String(f)) + eyes(Number(x), 116, 10)).join(''), { base: [128, 220], grip: [128, 150] }),
  // ---- Toy shop
  obj('dollhouse', 'Dollhouse', 'toy', 40, 44, p('M28 104 L128 24 L228 104 Z', M) + r(44, 104, 168, 132, 8, T) + r(60, 120, 60, 46, 6, '#cdeeff') + r(136, 120, 60, 46, 6, '#cdeeff') + r(108, 182, 40, 54, 10, A) + c(128, 72, 14, A) + r(44, 172, 168, 8, 2, M), { base: [128, 236], grip: [128, 140] }),
  obj('building_blocks', 'Building Blocks', 'toy', 16, 14, r(24, 150, 80, 80, 10, M) + r(110, 150, 80, 80, 10, A) + r(66, 66, 80, 80, 10, T) + r(160, 86, 70, 60, 10, M) + c(64, 190, 14, W) + c(150, 190, 14, W) + c(106, 106, 14, W), { base: [128, 230], grip: [106, 106] }),
  obj('rocking_horse', 'Rocking Horse', 'toy', 40, 34, p('M24 196 C60 236 196 236 232 196', 'none') + ln('M24 196 C60 236 196 236 232 196', '{{trim}}', 16) + ln('M70 172 L60 214 M182 172 L194 214', '{{trim}}', 12) + e(126, 150, 72, 34, M) + p('M170 136 L194 48 C220 48 232 72 226 98 L198 120 Z', M) + p('M190 50 C176 60 172 90 168 110', A) + c(206, 74, 5, K) + p('M54 140 C30 150 26 174 36 186', A) + r(104, 112, 44, 20, 8, A), { base: [128, 228], grip: [126, 150] }),
  obj('train_set', 'Toy Train Set', 'toy', 30, 14, r(20, 214, 216, 12, 4, '{{outline}}') + r(30, 110, 90, 90, 14, M) + r(40, 66, 50, 50, 10, M) + r(120, 140, 90, 60, 12, T) + p('M30 110 H110 V96 H30 Z', A) + r(86, 46, 22, 26, 6, A) + c(60, 206, 18, A) + c(104, 206, 18, A) + c(146, 206, 16, A) + c(186, 206, 16, A) + r(52, 128, 34, 30, 6, '#cdeeff'), { base: [128, 226], grip: [120, 150] }),
  obj('plush_bunny', 'Plush Bunny', 'toy', 10, 16, e(100, 56, 20, 50, M) + e(156, 56, 20, 50, M) + e(100, 60, 9, 34, A) + e(156, 60, 9, 34, A) + c(128, 120, 52, M) + e(128, 196, 60, 48, M) + e(128, 202, 36, 30, T) + eyes(128, 116, 18) + e(128, 134, 7, 5, A) + c(78, 176, 16, M) + c(178, 176, 16, M) + e(98, 238, 20, 10, M) + e(158, 238, 20, 10, M), { base: [128, 246], grip: [128, 190] }),
  // ---- Old people home
  obj('rocking_chair', 'Rocking Chair', 'furniture', 45, 55, ln('M30 226 C70 248 186 248 226 226', '{{trim}}', 14) + r(60, 20, 26, 160, 10, M) + r(60, 30, 26, 12, 4, T) + r(60, 120, 150, 30, 12, M) + r(62, 40, 70, 80, 14, T) + ln('M76 150 L64 222 M192 150 L204 222', '{{main}}', 12) + r(150, 90, 70, 16, 8, M), { base: [128, 238], seat: [136, 120] }),
  obj('card_table', 'Card Table', 'furniture', 60, 30, r(20, 84, 216, 28, 12, M) + ln('M48 112 L40 236 M208 112 L216 236 M100 112 L96 236 M156 112 L160 236', '{{trim}}', 10) + r(64, 60, 40, 28, 4, W) + r(112, 56, 40, 32, 4, W) + p('M84 70 L90 78 L84 86 L78 78 Z', A) + c(132, 72, 6, A), { base: [128, 236], top: [128, 84] }),
  obj('jigsaw_puzzle', 'Jigsaw Puzzle', 'toy', 14, 10, r(24, 70, 208, 140, 14, T) + p('M40 86 H120 V118 C140 110 140 140 120 134 V196 H40 Z', M) + p('M128 86 H216 V138 C204 130 196 158 216 152 V196 H136 V150 C150 156 150 130 136 136 Z', A) + shine(60, 98), { base: [128, 210], grip: [128, 140] }),
  obj('tea_cup', 'Tea Cup', 'drink', 7, 5, e(128, 220, 104, 18, T) + p('M48 120 H208 C204 180 170 214 128 214 C86 214 52 180 48 120 Z', M) + e(128, 120, 80, 16, A) + p('M206 136 C244 132 244 184 196 180', 'none') + ln('M206 136 C244 132 244 184 196 180', '{{outline}}', 8) + ln('M100 70 C92 84 108 90 100 104 M150 66 C142 80 158 86 150 100', '{{trim}}', 5) + c(96, 168, 10, W), { base: [128, 236], grip: [222, 160] }),
  obj('soft_blanket', 'Soft Blanket', 'decor', 30, 12, p('M20 160 C40 136 70 150 90 132 C110 116 146 116 166 132 C186 150 216 136 236 160 V236 H20 Z', M) + ln('M20 186 H236 M20 212 H236', '{{trim}}', 8) + ln('M64 160 V236 M128 140 V236 M192 160 V236', '{{accent}}', 5) + shine(70, 150, 18, 6), { base: [128, 236] }),
];

const file = 'src/data/templates.json';
const list = JSON.parse(readFileSync(file, 'utf8')) as Template[];
let added = 0;
const errors: string[] = [];
for (const d of DRAWINGS) {
  const { body, ...rest } = d;
  const t: Template = { ...rest, svg: svg(body) };
  if (list.some((x) => x.id === t.id)) continue;
  const errs = templateErrors(t, [...list, t]);
  if (errs.length) {
    errors.push(...errs);
    continue;
  }
  list.push(t);
  added++;
}
writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
console.log(`hand-drawn: +${added} of ${DRAWINGS.length}`);
for (const e2 of errors) console.log(`  ✗ ${e2}`);
