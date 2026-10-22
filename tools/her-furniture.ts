// Furniture from the furniture page the user's daughter drew ("all different colours"), drawn realistic by Claude: painted stools, a
// double bed, a painted cot, a round table, a tall two-door fridge and a jail cell. The fridge and the cell open
// (their open drawings are in tools/real-open.ts).
//
//   node tools/her-furniture.ts
import { A, B, C, E, K, M, O, P, T, W, bar, cushion, dot, ground, s, pal, commitNew, type Colourway, type NewThing, type Pal } from './real-kit.ts';

const colours = (template: string, tags: string[], list: [string, string, Pal][]): Colourway[] =>
  list.map(([key, name, palette]) => ({ id: `${template}_${key}`, name, palette, tags }));

const list: NewThing[] = [
  // A painted wooden stool: a round seat on three splayed legs, with a ring between them.
  {
    id: 'painted_stool', name: 'Painted Stool', category: 'furniture', size: { w: 27, h: 30 }, anchors: { base: [128, 242], seat: [128, 92] },
    palette: pal('#d63a3a', '#b02a2a', '#f2e6d0', '#5e1414'),
    body: ground(128, 243, 76, 4) + P('M76 112 L92 112 L74 242 L58 242 Z', T, 'H', 2) + P('M180 112 L164 112 L182 242 L198 242 Z', T, 'H', 2) + B(120, 114, 16, 126, 4, M, 'H', 2) +
      `<ellipse cx="128" cy="186" rx="56" ry="8" fill="none" stroke="${O}" stroke-width="8"/><ellipse cx="128" cy="186" rx="56" ry="8" fill="none" stroke="${T}" stroke-width="4"/>` +
      B(58, 96, 140, 20, 9, M, 'L', 2) + E(128, 96, 70, 15, M, 'V', 2) + s('M84 92 C110 86 150 86 172 92', W, 4, 0.4),
    items: colours('painted_stool', ['kitchen', 'kids_room', 'cafe', 'daycare', 'school', 'living'], [
      ['red', 'Red Stool', pal('#d63a3a', '#b02a2a', '#f2e6d0', '#5e1414')],
      ['yellow', 'Yellow Stool', pal('#f5c842', '#d6a82a', '#ffffff', '#7a5a10')],
      ['blue', 'Blue Stool', pal('#3a7ec8', '#2a64a8', '#ffffff', '#16345e')],
      ['green', 'Green Stool', pal('#4fa85a', '#3a8a46', '#ffffff', '#1e4a26')],
      ['pink', 'Pink Stool', pal('#f28cb0', '#d66e94', '#ffffff', '#7a2e4a')],
      ['purple', 'Purple Stool', pal('#8a5cc0', '#6e44a0', '#ffffff', '#3a2060')],
      ['orange', 'Orange Stool', pal('#f28c3a', '#d4702a', '#ffffff', '#7a3a10')],
      ['wood', 'Wooden Stool', pal('#b5835a', '#8a5a34', '#f2e6d0', '#4a2c12')],
    ]),
  },
  // A double bed seen from the foot: a padded headboard, two pillows and a duvet.
  {
    id: 'double_bed', name: 'Double Bed', category: 'furniture', size: { w: 90, h: 66 }, anchors: { base: [128, 243], seat: [128, 176] },
    palette: pal('#7aa6c9', '#f4f2ee', '#8a5a34', '#2f5a80'),
    body: ground(128, 243, 120, 4) + B(16, 74, 224, 140, 24, A, 'L') + B(30, 88, 196, 80, 16, A, 'V', 2) + s('M74 92 L74 164 M128 92 L128 164 M182 92 L182 164', K, 2, 0.18) +
      cushion(34, 150, 90, 34, T) + cushion(132, 150, 90, 34, T) + B(12, 214, 232, 18, 4, A, 'V', 2) + B(16, 230, 16, 13, 3, A, 'H', 1.5) + B(224, 230, 16, 13, 3, A, 'H', 1.5) +
      P('M10 178 C60 170 196 170 246 178 L246 220 C200 228 56 228 10 220 Z', M, 'L') + P('M10 178 C60 170 196 170 246 178 L246 192 C196 186 60 186 10 192 Z', T, 'V', 2) +
      s('M40 204 C80 210 120 200 150 210 C180 218 210 206 236 210', K, 2, 0.16),
    items: colours('double_bed', ['bedroom', 'hotel', 'cosy', 'vip'], [
      ['blue', 'Blue Double Bed', pal('#7aa6c9', '#f4f2ee', '#8a5a34', '#2f5a80')],
      ['pink', 'Pink Double Bed', pal('#f2b0c4', '#ffffff', '#f4e8ee', '#8a4a5e')],
      ['grey', 'Grey Double Bed', pal('#9aa0a8', '#f4f2ee', '#46484e', '#3a3c42')],
      ['green', 'Sage Double Bed', pal('#9cb88a', '#f8f4ea', '#c8a87a', '#4a6a3a')],
      ['yellow', 'Sunny Double Bed', pal('#f5d34a', '#ffffff', '#f2f2f2', '#8a6a10')],
      ['purple', 'Purple Double Bed', pal('#8a5cc0', '#f4eefa', '#3a2a4a', '#3a2060')],
      ['gold', 'Royal Double Bed', pal('#a8263a', '#f4e6c8', '#d6a43a', '#50101a')],
    ]),
  },
  // A painted cot with slatted sides and a soft mattress.
  {
    id: 'painted_cot', name: 'Painted Cot', category: 'baby', size: { w: 60, h: 60 }, anchors: { base: [128, 241], seat: [128, 150] },
    palette: pal('#f2f2f2', '#a8d5e2', '#f5c2d2', '#6a7880'),
    body: ground(128, 241, 104, 5) + B(30, 60, 18, 180, 6, M, 'H', 2) + B(208, 60, 18, 180, 6, M, 'H', 2) + E(39, 56, 12, 10, M, 'R', 2) + E(217, 56, 12, 10, M, 'R', 2) +
      B(48, 150, 160, 30, 6, T, 'V', 2) + P('M60 150 C70 136 110 134 128 140 C150 134 186 136 196 150 Z', A, 'V', 1.5) +
      B(48, 84, 160, 12, 4, M, 'V', 2) + B(48, 180, 160, 14, 4, M, 'V', 2) + [64, 84, 104, 124, 144, 164, 184].map((x) => B(x, 96, 8, 84, 3, M, 'H', 1.5)).join('') +
      B(48, 200, 160, 10, 3, M, 'V', 1.5) + C(128, 30, 8, A, 'R', 1.5) + s('M128 38 L128 60 M100 60 L156 60', O, 2) + C(100, 68, 7, T, 'R', 1.5) + C(156, 68, 7, A, 'R', 1.5),
    items: colours('painted_cot', ['nursery', 'baby', 'daycare', 'hospital', 'cosy'], [
      ['white', 'White Cot', pal('#f2f2f2', '#a8d5e2', '#f5c2d2', '#6a7880')],
      ['pink', 'Pink Cot', pal('#f5b8cc', '#ffffff', '#f5e08a', '#8a4a5e')],
      ['blue', 'Blue Cot', pal('#8ac4ec', '#ffffff', '#f5e08a', '#3a6a8a')],
      ['mint', 'Mint Cot', pal('#9ee0c4', '#ffffff', '#f5a3c0', '#2f6a50')],
      ['wood', 'Wooden Cot', pal('#c89a62', '#f4ecdc', '#a8d5e2', '#5e4224')],
      ['grey', 'Grey Cot', pal('#a0a4aa', '#f4f2ee', '#f5d34a', '#46484e')],
    ]),
  },
  // A round table on a single pedestal.
  {
    id: 'round_table', name: 'Round Table', category: 'furniture', size: { w: 70, h: 52 }, anchors: { base: [128, 243], top: [128, 96] },
    palette: pal('#b5835a', '#8a5a34', '#f2f2f2', '#4a2c12'),
    body: ground(128, 243, 80, 5) + E(128, 232, 60, 11, T, 'V', 2) + B(114, 118, 28, 112, 6, T, 'H', 2) + B(100, 116, 56, 14, 6, T, 'V', 1.5) +
      B(16, 98, 224, 18, 9, M, 'L', 2) + E(128, 98, 112, 22, M, 'V', 2) + s('M50 94 C90 84 166 84 206 94', W, 4, 0.35),
    items: colours('round_table', ['kitchen', 'living', 'cafe', 'restaurant', 'garden', 'daycare'], [
      ['wood', 'Wooden Round Table', pal('#b5835a', '#8a5a34', '#f2f2f2', '#4a2c12')],
      ['white', 'White Round Table', pal('#f4f2ee', '#d6d2ca', '#9a9a9a', '#7a766e')],
      ['red', 'Red Round Table', pal('#d63a3a', '#3a3a3a', '#ffffff', '#5e1414')],
      ['blue', 'Blue Round Table', pal('#3a7ec8', '#e8e8e8', '#ffffff', '#16345e')],
      ['yellow', 'Yellow Round Table', pal('#f5c842', '#ffffff', '#ffffff', '#7a5a10')],
      ['green', 'Green Round Table', pal('#4fa85a', '#f2f2f2', '#ffffff', '#1e4a26')],
      ['black', 'Black Round Table', pal('#2a2a30', '#c0a060', '#ffffff', '#0c0c10')],
    ]),
  },
  // A tall two-door fridge with a water and ice dispenser.
  {
    id: 'tall_fridge', name: 'Tall Fridge', category: 'furniture', size: { w: 72, h: 106 }, anchors: { base: [128, 242], top: [128, 12] },
    palette: pal('#d8dce0', '#a0a6ac', '#3a3a40', '#5a6068'),
    body: ground(128, 243, 84, 4) + B(48, 10, 160, 228, 14, M, 'H') + s('M128 12 L128 236', O, 2.5) + s('M50 196 L206 196', O, 2) +
      B(112, 50, 8, 96, 3, T, 'H', 1.5) + B(136, 50, 8, 96, 3, T, 'H', 1.5) + B(64, 40, 38, 52, 6, A, 'V', 2) + B(74, 70, 18, 14, 3, T, 'V', 1) + dot(83, 52, 4, W, 0.6) +
      B(90, 206, 76, 8, 3, T, 'V', 1) + B(54, 236, 20, 6, 2, K, 'V', 1) + B(182, 236, 20, 6, 2, K, 'V', 1) + s('M60 24 L60 186', W, 5, 0.35) + s('M196 24 L196 186', K, 3, 0.08),
    items: colours('tall_fridge', ['kitchen', 'cafe', 'restaurant', 'supermarket', 'shop'], [
      ['steel', 'Steel Fridge', pal('#d8dce0', '#a0a6ac', '#3a3a40', '#5a6068')],
      ['white', 'White Fridge', pal('#f6f6f4', '#c8ccd0', '#9ac4e0', '#7a7e84')],
      ['black', 'Black Fridge', pal('#2e3036', '#5a5e66', '#7fd1ff', '#0c0e12')],
      ['red', 'Red Retro Fridge', pal('#d63a3a', '#e8e8e8', '#f4f4f4', '#5e1414')],
      ['mint', 'Mint Retro Fridge', pal('#a8e2cc', '#e8e8e8', '#f4f4f4', '#3a6a58')],
      ['pink', 'Pink Fridge', pal('#f5b8cc', '#ffffff', '#f4f4f4', '#8a4a5e')],
      ['blue', 'Blue Fridge', pal('#7ab0e0', '#e8e8e8', '#f4f4f4', '#2f5a80')],
    ]),
  },
  // A jail cell: a plain wall behind bars, a bench to sit on, and a barred door with a lock.
  {
    id: 'jail_cell', name: 'Jail Cell', category: 'furniture', size: { w: 110, h: 99 }, anchors: { base: [128, 242], seat: [74, 166] },
    palette: pal('#5a6068', '#c8c4bc', '#d6a43a', '#24282e'),
    body: ground(128, 243, 122, 3) + B(14, 40, 228, 200, 4, T, 'L') + s('M14 110 L242 110 M14 180 L242 180 M70 40 L70 110 M150 40 L150 110 M110 110 L110 180 M200 110 L200 180', K, 2, 0.12) +
      B(28, 166, 96, 14, 3, M, 'V', 2) + B(34, 180, 10, 60, 2, M, 'H', 1.5) + B(108, 180, 10, 60, 2, M, 'H', 1.5) + B(196, 60, 28, 30, 3, K, 'V', 1.5) + s('M210 60 L210 90 M196 75 L224 75', T, 3) +
      bar('M24 46 L24 234 M46 46 L46 234 M68 46 L68 234 M90 46 L90 234 M112 46 L112 234 M134 46 L134 234', M, 6) +
      bar('M160 46 L160 234 M180 46 L180 234 M200 46 L200 234 M220 46 L220 234 M238 46 L238 234', M, 6) +
      B(10, 30, 236, 18, 4, M, 'V', 2) + B(10, 228, 236, 14, 4, M, 'V', 2) + B(150, 128, 96, 12, 3, M, 'V', 1.5) + B(152, 122, 26, 30, 4, A, 'L', 1.5) + dot(165, 140, 4, K),
    items: colours('jail_cell', ['police'], [
      ['grey', 'Jail Cell', pal('#5a6068', '#c8c4bc', '#d6a43a', '#24282e')],
      ['blue', 'Blue Jail Cell', pal('#2f4f80', '#c8d0dc', '#d6a43a', '#142440')],
      ['black', 'Black Jail Cell', pal('#2a2a30', '#d8d2c4', '#c0c0c8', '#0c0c10')],
    ]),
  },
];

process.exit(commitNew(list, 'her furniture') ? 1 : 0);
