// Clothes the user's daughter designed (her drawings), drawn realistic by Claude: a leaf jumper and a green skirt, a striped
// button top with striped trousers, a cami, a scoop tee, blue shorts, a strappy rainbow dress, a cosy onesie, baby
// swaddles, a bib top, a polo, a cardigan with a white front, a split skirt and trousers with a stripe down the side.
// Each comes in her colours first, then a few more.
//
//   node tools/her-clothes.ts
import { A, B, C, K, M, O, P, T, W, dot, f, s, pal, commitNew, type Colourway, type NewThing, type Pal } from './real-kit.ts';

// A top fills the torso (x 20-236, shoulders y 18, hem y 240) with a scoop neck; the arms get sleeves themselves.
const TOP = 'M20 30 C20 22 26 18 34 18 L84 18 C94 46 162 46 172 18 L222 18 C230 18 236 22 236 30 L236 230 C236 236 232 240 226 240 L30 240 C24 240 20 236 20 230 Z';
const top = (fill = M) => P(TOP, fill, 'S');
const edge = (d: string, w = 2.5) => s(d, O, w);
// A ribbed band (hem or cuff), with its ribs.
const rib = (x: number, y: number, w: number, h: number, fill = T) =>
  B(x, y, w, h, 6, fill, 'V', 2) + s(Array.from({ length: Math.floor(w / 10) - 1 }, (_, i) => `M${x + 10 + i * 10} ${y + 3} L${x + 10 + i * 10} ${y + h - 3}`).join(' '), K, 1.5, 0.15);
const neckRib = (fill = T) => s('M84 20 C94 48 162 48 172 20', O, 12) + s('M84 20 C94 48 162 48 172 20', fill, 8);
const buttons = (x: number, ys: number[], fill = A) => ys.map((y) => C(x, y, 6, fill, 'R', 1.5) + dot(x - 1.5, y - 1, 1.2, K, 0.4) + dot(x + 1.5, y + 1, 1.2, K, 0.4)).join('');
// A stripe across a shape from x0 to x1 (painted, then the shape's outline goes back on top).
const band = (x0: number, x1: number, y: number, h: number, fill = T) => f(`M${x0} ${y} H${x1} V${y + h} H${x0} Z`, fill);
const fold = (d: string) => s(d, K, 2, 0.14);

// Bottoms: one block x 40-216 from the waistband (y 4-26) down; trousers to y 250 with the legs parted from y 120.
const TROUSERS = 'M40 4 L216 4 L216 250 L134 250 L130 120 L126 120 L122 250 L40 250 Z';
const waist = (fill = M) => B(40, 4, 176, 22, 4, fill, 'V', 2);
// Dresses: bodice x 40-216 from y 14 to the waist at y 120, the skirt flaring to x 22-234 at the hem.

const colours = (template: string, ages: string[], tags: string[], list: [string, string, Pal][]): Colourway[] =>
  list.map(([key, name, palette]) => ({ id: `${template}_${key}`, name, palette, tags, ages }));

const ALL = ['toddler', 'kid', 'teen', 'adult', 'elder'], GROWN = ['kid', 'teen', 'adult', 'elder'], BABY = ['baby', 'toddler'];

const list: NewThing[] = [
  // Her green jumper with a big leaf on the front.
  {
    id: 'leaf_jumper', name: 'Leaf Jumper', category: 'top', palette: pal('#4f8f3e', '#a8d672', '#2f5f24', '#244a1b'),
    body: top() + rib(20, 214, 216, 26) + neckRib() +
      P('M86 182 C76 128 112 86 172 78 C176 136 146 180 86 182 Z', T, 'L', 2) +
      s('M86 182 C112 150 140 116 172 78 M110 156 L104 130 M110 156 L136 160 M130 130 L126 106 M130 130 L156 132 M150 106 L150 92', A, 3, 0.8) +
      fold('M60 60 C58 120 62 170 58 206 M196 60 C198 120 194 170 198 206'),
    items: colours('leaf_jumper', ALL, ['garden', 'school', 'cosy', 'outdoor', 'kids_room'], [
      ['green', 'Green Leaf Jumper', pal('#4f8f3e', '#a8d672', '#2f5f24', '#244a1b')],
      ['cream', 'Cream Leaf Jumper', pal('#efe6d2', '#7fb35a', '#4f7d36', '#8a7a5a')],
      ['navy', 'Navy Leaf Jumper', pal('#2f3f66', '#8cc26a', '#d8e8b0', '#1a2440')],
      ['rust', 'Autumn Leaf Jumper', pal('#b8562e', '#f2b33d', '#7a3a1a', '#5e2a12')],
      ['pink', 'Pink Leaf Jumper', pal('#e9a3b6', '#8cc26a', '#4f7d36', '#9a5a6c')],
    ]),
  },
  // Her orange top with pink stripes, a round white collar and buttons down the front.
  {
    id: 'striped_button_top', name: 'Striped Button Top', category: 'top', palette: pal('#f28c3a', '#f5a3c0', '#ffffff', '#9a4a1a'),
    body: top() + [56, 96, 136, 176, 216].map((y) => band(21, 235, y, 16)).join('') + edge(TOP) +
      s('M128 44 L128 240', K, 2, 0.22) + buttons(128, [70, 110, 150, 190]) +
      P('M80 18 C82 52 116 58 128 44 C140 58 174 52 176 18 C166 40 90 40 80 18 Z', A, 'V', 2),
    items: colours('striped_button_top', ALL, ['school', 'kids_room', 'party', 'cosy', 'outdoor'], [
      ['orange', 'Orange & Pink Stripe Top', pal('#f28c3a', '#f5a3c0', '#ffffff', '#9a4a1a')],
      ['blue', 'Blue Stripe Top', pal('#4a7fc0', '#ffffff', '#ffffff', '#24406a')],
      ['mint', 'Mint Stripe Top', pal('#7fd0b0', '#fff4d6', '#f28c8c', '#2f7a5e')],
      ['lemon', 'Lemon Stripe Top', pal('#f5d34a', '#ffffff', '#4a7fc0', '#8a6a10')],
      ['berry', 'Berry Stripe Top', pal('#a8326e', '#f5a3c0', '#ffffff', '#5a1236')],
    ]),
  },
  // Her purple cami: thin straps and a lacy edge (no sleeves).
  {
    id: 'cami_top', name: 'Cami Top', category: 'top', palette: pal('#8a5cc0', '#d8c2f0', '#f5a3c0', '#4a2a70'),
    body: s('M72 70 L76 18 M184 70 L180 18', O, 9) + s('M72 70 L76 18 M184 70 L180 18', M, 5) +
      P('M46 72 C76 60 180 60 210 72 L230 230 C230 236 226 240 220 240 L36 240 C30 240 26 236 26 230 Z', M, 'S') +
      s('M48 74 C64 82 72 66 88 74 C104 82 112 66 128 74 C144 82 152 66 168 74 C184 82 192 66 208 74', T, 4) +
      P('M118 84 C104 76 104 98 118 90 L128 88 L138 90 C152 98 152 76 138 84 L128 86 Z', A, 'R', 1.5) +
      fold('M70 100 C64 150 66 190 60 230 M186 100 C192 150 190 190 196 230'),
    items: colours('cami_top', ['kid', 'teen', 'adult'], ['beach', 'outdoor', 'teen_room', 'party', 'pool'], [
      ['purple', 'Purple Cami', pal('#8a5cc0', '#d8c2f0', '#f5a3c0', '#4a2a70')],
      ['white', 'White Cami', pal('#f7f5f0', '#e6d8c2', '#f5a3c0', '#8a8070')],
      ['black', 'Black Cami', pal('#26262c', '#6a6a78', '#c84a6a', '#0c0c10')],
      ['coral', 'Coral Cami', pal('#f27a6a', '#ffd2c8', '#ffffff', '#8a3024')],
      ['sage', 'Sage Cami', pal('#9cb88a', '#e4efd6', '#f5d34a', '#4a6a3a')],
    ]),
  },
  // Her teal top: a plain scoop-neck tee with a little chest pocket.
  {
    id: 'scoop_tee', name: 'Scoop Tee', category: 'top', palette: pal('#2fa8a0', '#a8e2dc', '#f5d34a', '#155a56'),
    body: top() + neckRib() + B(150, 74, 44, 46, 6, T, 'V', 2) + s('M150 86 L194 86', K, 2, 0.2) +
      s('M22 226 L234 226', K, 2, 0.2) + fold('M64 70 C60 130 64 180 60 220 M192 70 C196 130 192 180 196 220'),
    items: colours('scoop_tee', ALL, ['outdoor', 'school', 'beach', 'kids_room', 'sport'], [
      ['teal', 'Teal Scoop Tee', pal('#2fa8a0', '#a8e2dc', '#f5d34a', '#155a56')],
      ['white', 'White Scoop Tee', pal('#f7f6f2', '#dcdcd6', '#7fa8d0', '#8a8a84')],
      ['grey', 'Grey Marl Tee', pal('#a0a4aa', '#d6d8dc', '#f28c3a', '#55585e')],
      ['red', 'Red Scoop Tee', pal('#d63a3a', '#f5a3a3', '#ffffff', '#6a1616')],
      ['yellow', 'Sunny Scoop Tee', pal('#f5c842', '#fff0b0', '#4a7fc0', '#8a6a10')],
    ]),
  },
  // Her baby top with a blue bib.
  {
    id: 'bib_top', name: 'Bib Top', category: 'top', palette: pal('#ffffff', '#5a9be0', '#d6ecff', '#3a5a80'),
    body: top() + P('M70 22 C58 86 80 146 128 146 C176 146 198 86 186 22 C172 58 84 58 70 22 Z', T, 'R', 2) +
      s('M76 34 C70 90 92 136 128 136 C164 136 186 90 180 34', A, 3, 0.9) + P('M110 92 C100 82 104 70 116 74 L128 82 L140 74 C152 70 156 82 146 92 L128 106 Z', A, 'R', 1.5) +
      rib(20, 222, 216, 18),
    items: colours('bib_top', BABY, ['baby', 'nursery', 'daycare', 'kitchen', 'cosy'], [
      ['blue', 'Blue Bib Top', pal('#ffffff', '#5a9be0', '#d6ecff', '#3a5a80')],
      ['pink', 'Pink Bib Top', pal('#ffffff', '#f28cb0', '#ffe0ec', '#8a3a5a')],
      ['yellow', 'Duckling Bib Top', pal('#fff6d6', '#f5c842', '#ffffff', '#8a6a10')],
      ['green', 'Mint Bib Top', pal('#ffffff', '#6ac29a', '#e0f5ea', '#2f6a50')],
    ]),
  },
  // Her white top with a collar: a polo with a button placket.
  {
    id: 'polo_top', name: 'Polo Top', category: 'top', palette: pal('#f7f6f2', '#e2e0da', '#3a6ab0', '#8a8a84'),
    body: top() + P('M120 40 L136 40 L136 96 L120 96 Z', T, 'V', 2) + buttons(128, [56, 80], A) +
      P('M84 16 C96 30 112 38 128 42 L104 70 L74 26 Z', T, 'L', 2) + P('M172 16 C160 30 144 38 128 42 L152 70 L182 26 Z', T, 'L', 2) +
      s('M22 226 L234 226', K, 2, 0.2) + fold('M64 90 C60 140 64 180 60 220 M192 90 C196 140 192 180 196 220'),
    items: colours('polo_top', ALL, ['school', 'sport', 'office', 'outdoor', 'shop'], [
      ['white', 'White Polo', pal('#f7f6f2', '#e2e0da', '#3a6ab0', '#8a8a84')],
      ['navy', 'Navy School Polo', pal('#2a3a66', '#3a4c80', '#ffffff', '#141c36')],
      ['red', 'Red Polo', pal('#c83a3a', '#e05454', '#ffffff', '#5e1414')],
      ['green', 'Bottle Green Polo', pal('#2f6a4a', '#3f8a60', '#f5d34a', '#143022')],
      ['sky', 'Sky Polo', pal('#8ac4ec', '#b8dcf5', '#ffffff', '#3a6a8a')],
    ]),
  },
  // Her blue cardigan with a white front and buttons.
  {
    id: 'white_front_cardigan', name: 'Button Cardigan', category: 'top', palette: pal('#3a6ec0', '#ffffff', '#f5d34a', '#1e3a6a'),
    body: top() + P('M86 18 C94 44 162 44 170 18 L150 18 L128 100 L106 18 Z', T, 'V', 2) +
      P('M106 30 L128 100 L150 30 L150 240 L106 240 Z', T, 'S', 2) + s('M128 100 L128 240', O, 2, 0.6) + buttons(116, [120, 156, 192]) + buttons(140, [120, 156, 192]) +
      rib(20, 220, 86, 20, M) + rib(150, 220, 86, 20, M) + B(38, 150, 46, 44, 6, M, 'V', 2) + B(172, 150, 46, 44, 6, M, 'V', 2),
    items: colours('white_front_cardigan', GROWN, ['school', 'cosy', 'elder', 'office', 'living'], [
      ['blue', 'Blue Cardigan', pal('#3a6ec0', '#ffffff', '#f5d34a', '#1e3a6a')],
      ['red', 'Red Cardigan', pal('#b8323a', '#ffffff', '#f5d34a', '#5a1418')],
      ['grey', 'Grey Cardigan', pal('#8a8e96', '#ffffff', '#3a3a40', '#46484e')],
      ['lilac', 'Lilac Cardigan', pal('#b49ad6', '#fff4f8', '#f28cb0', '#5a3a80')],
      ['mustard', 'Mustard Cardigan', pal('#d6a43a', '#fff6e0', '#6a4a1a', '#6a4a10')],
    ]),
  },
  // Her green skirt: an A-line skirt with soft pleats.
  {
    id: 'aline_skirt', name: 'A-Line Skirt', category: 'bottom', palette: pal('#4f8f3e', '#3f7a30', '#a8d672', '#244a1b'),
    body: P('M42 18 L214 18 L226 158 C196 168 60 168 30 158 Z', M, 'S') + waist() + s('M88 30 L76 160 M128 30 L128 164 M168 30 L180 160', K, 2.5, 0.16) +
      s('M34 150 C72 158 184 158 222 150', T, 3, 0.6),
    items: colours('aline_skirt', ALL, ['school', 'garden', 'outdoor', 'shop', 'cosy'], [
      ['green', 'Green Skirt', pal('#4f8f3e', '#3f7a30', '#a8d672', '#244a1b')],
      ['denim', 'Denim Skirt', pal('#4a6ea0', '#3a5a86', '#e0a040', '#22344e')],
      ['red', 'Red Skirt', pal('#c83a3a', '#a82a2a', '#ffffff', '#5e1414')],
      ['plum', 'Plum Skirt', pal('#6a3a6a', '#5a2a5a', '#f5a3c0', '#2e122e')],
      ['camel', 'Camel Skirt', pal('#c89a62', '#b0844e', '#5a3a1a', '#5e4224')],
    ]),
  },
  // Her striped trousers, to match the striped top.
  {
    id: 'striped_trousers', name: 'Striped Trousers', category: 'bottom', palette: pal('#f28c3a', '#f5a3c0', '#ffffff', '#9a4a1a'),
    body: P(TROUSERS, M, 'S') + [50, 92, 134, 176, 218].map((y) => (y < 120 ? band(41, 215, y, 18) : band(41, 121, y, 18) + band(135, 215, y, 18))).join('') +
      edge(TROUSERS) + waist(T) + s('M128 26 L128 120', K, 2, 0.25) + B(40, 236, 82, 14, 4, T, 'V', 2) + B(134, 236, 82, 14, 4, T, 'V', 2),
    items: colours('striped_trousers', ALL, ['kids_room', 'party', 'cosy', 'school', 'outdoor'], [
      ['orange', 'Orange & Pink Stripe Trousers', pal('#f28c3a', '#f5a3c0', '#ffffff', '#9a4a1a')],
      ['blue', 'Blue Stripe Trousers', pal('#4a7fc0', '#ffffff', '#ffffff', '#24406a')],
      ['mint', 'Mint Stripe Trousers', pal('#7fd0b0', '#fff4d6', '#f28c8c', '#2f7a5e')],
      ['lemon', 'Lemon Stripe Trousers', pal('#f5d34a', '#ffffff', '#4a7fc0', '#8a6a10')],
      ['berry', 'Berry Stripe Trousers', pal('#a8326e', '#f5a3c0', '#ffffff', '#5a1236')],
    ]),
  },
  // Her blue shorts (worn with the cami and the teal top): denim with turned-up hems and stitching.
  {
    id: 'blue_shorts', name: 'Shorts', category: 'bottom', palette: pal('#4a7ec8', '#3a66a8', '#e0a040', '#1e3a6a'),
    body: P('M40 18 L216 18 L222 136 L136 140 L128 76 L120 140 L34 136 Z', M, 'S') + waist() +
      B(32, 122, 92, 18, 4, T, 'V', 2) + B(132, 122, 92, 18, 4, T, 'V', 2) +
      s('M60 30 C64 52 82 60 104 60 M196 30 C192 52 174 60 152 60 M128 26 L128 76', A, 2, 0.8),
    items: colours('blue_shorts', ALL, ['beach', 'pool', 'outdoor', 'sport', 'waterpark'], [
      ['blue', 'Blue Shorts', pal('#4a7ec8', '#3a66a8', '#e0a040', '#1e3a6a')],
      ['white', 'White Shorts', pal('#f4f2ec', '#e2dfd6', '#a8a49a', '#8a8678')],
      ['pink', 'Pink Shorts', pal('#f2a0bc', '#e486a6', '#ffffff', '#8a3a5a')],
      ['khaki', 'Khaki Shorts', pal('#a89a6a', '#948656', '#5a4a2a', '#4e4428')],
      ['black', 'Black Shorts', pal('#2a2a30', '#3a3a42', '#9a9aa6', '#0c0c10')],
    ]),
  },
  // Her black skirt: straight, with a split at the front.
  {
    id: 'split_skirt', name: 'Split Skirt', category: 'bottom', palette: pal('#26262c', '#3a3a42', '#c8a24a', '#0c0c10'),
    body: P('M42 18 L214 18 L222 170 L138 170 L128 132 L118 170 L34 170 Z', M, 'S') + waist() + C(128, 15, 5, A, 'R', 1.5) +
      s('M80 30 L74 166 M176 30 L182 166', K, 2, 0.2),
    items: colours('split_skirt', ['teen', 'adult', 'elder'], ['office', 'fancy', 'school', 'restaurant', 'shop'], [
      ['black', 'Black Split Skirt', pal('#26262c', '#3a3a42', '#c8a24a', '#0c0c10')],
      ['navy', 'Navy Split Skirt', pal('#26345a', '#33446e', '#d6d6e0', '#10162a')],
      ['grey', 'Grey Split Skirt', pal('#7a7e86', '#8e929a', '#2a2a30', '#3a3c42')],
      ['wine', 'Wine Split Skirt', pal('#6a1e2e', '#7e2a3a', '#e0b060', '#30080f')],
    ]),
  },
  // Her black trousers with a line down each side.
  {
    id: 'side_stripe_trousers', name: 'Side Stripe Trousers', category: 'bottom', palette: pal('#26262c', '#ffffff', '#9a9aa6', '#0c0c10'),
    body: P(TROUSERS, M, 'S') + waist() + s('M50 28 L50 248 M206 28 L206 248', T, 8) + s('M128 26 L128 120', A, 2, 0.6) +
      fold('M86 150 L84 246 M170 150 L172 246'),
    items: colours('side_stripe_trousers', ALL, ['sport', 'school', 'outdoor', 'teen_room', 'football'], [
      ['black', 'Black Stripe Trousers', pal('#26262c', '#ffffff', '#9a9aa6', '#0c0c10')],
      ['navy', 'Navy Track Trousers', pal('#26345a', '#f5d34a', '#9aa6c8', '#10162a')],
      ['red', 'Red Track Trousers', pal('#b8323a', '#ffffff', '#f5a3a3', '#5a1418')],
      ['green', 'Green Track Trousers', pal('#2f6a4a', '#ffffff', '#a8d6b8', '#143022')],
      ['pink', 'Pink Track Trousers', pal('#e486a6', '#ffffff', '#ffd2e0', '#8a3a5a')],
    ]),
  },
  // Her strappy dress in lots of colours: a fitted top with thin straps and a skirt in three bright tiers.
  {
    id: 'rainbow_tier_dress', name: 'Strappy Tier Dress', category: 'dress', palette: pal('#e84a6a', '#f5c842', '#4ab0e0', '#7a1a30'),
    body: s('M74 50 L78 14 M182 50 L178 14', O, 9) + s('M74 50 L78 14 M182 50 L178 14', M, 5) +
      P('M50 54 C80 44 176 44 206 54 L214 122 L42 122 Z', M, 'S') + P('M42 120 L214 120 L222 164 L34 164 Z', T, 'S', 2) +
      P('M34 162 L222 162 L228 204 L28 204 Z', A, 'S', 2) + P('M28 202 L228 202 L234 242 C210 250 46 250 22 242 Z', M, 'S', 2) +
      s('M42 122 C64 130 84 114 106 122 C128 130 148 114 170 122 C192 130 206 116 214 122', W, 3, 0.6) + fold('M80 170 L76 240 M128 170 L128 244 M176 170 L180 240'),
    items: colours('rainbow_tier_dress', ['toddler', 'kid', 'teen', 'adult'], ['party', 'birthday', 'beach', 'fancy', 'garden'], [
      ['rainbow', 'Rainbow Tier Dress', pal('#e84a6a', '#f5c842', '#4ab0e0', '#7a1a30')],
      ['sunset', 'Sunset Tier Dress', pal('#f28c3a', '#f5a3c0', '#a8326e', '#7a3010')],
      ['ocean', 'Ocean Tier Dress', pal('#2fa8a0', '#8ac4ec', '#2f4f9a', '#155a56')],
      ['garden', 'Garden Tier Dress', pal('#6ac25a', '#f5e04a', '#f28cb0', '#2f6a24')],
      ['berry', 'Berry Tier Dress', pal('#8a5cc0', '#f28cb0', '#f5c842', '#4a2a70')],
    ]),
  },
  // Her red onesie: all in one, with a zip down the front and cuffs at the ankles.
  {
    id: 'cosy_onesie', name: 'Cosy Onesie', category: 'dress', palette: pal('#d6343a', '#f5e6d8', '#f5c842', '#6a1216'),
    body: P('M40 22 C40 16 44 12 52 12 L88 12 C98 38 158 38 168 12 L204 12 C212 12 216 16 216 22 L224 250 L136 250 L128 168 L120 250 L32 250 Z', M, 'S') +
      s('M88 14 C98 40 158 40 168 14', T, 7) + s('M128 34 L128 168', K, 4, 0.28) + B(122, 40, 12, 18, 4, A, 'V', 1.5) +
      B(32, 230, 88, 20, 6, T, 'V', 2) + B(136, 230, 88, 20, 6, T, 'V', 2) + B(150, 66, 42, 40, 6, M, 'V', 2) +
      fold('M70 40 C66 110 70 170 60 226 M186 40 C190 110 186 170 196 226'),
    items: colours('cosy_onesie', ['baby', 'toddler', 'kid', 'teen'], ['bedroom', 'cosy', 'nursery', 'kids_room', 'christmas'], [
      ['red', 'Red Onesie', pal('#d6343a', '#f5e6d8', '#f5c842', '#6a1216')],
      ['grey', 'Grey Onesie', pal('#9a9ea6', '#f0f0f2', '#f28cb0', '#4a4c52')],
      ['pink', 'Pink Onesie', pal('#f2a0bc', '#ffffff', '#8a5cc0', '#8a3a5a')],
      ['navy', 'Starry Onesie', pal('#26345a', '#f5e04a', '#f5e04a', '#10162a')],
      ['mint', 'Mint Onesie', pal('#8ad6b8', '#ffffff', '#f28c8c', '#2f7a5e')],
    ]),
  },
  // Her baby swaddles: a soft blanket wrapped round, folded over from one side.
  {
    id: 'baby_swaddle', name: 'Swaddle', category: 'dress', palette: pal('#f5c2d2', '#fff0f4', '#e486a6', '#8a4a5e'),
    body: P('M34 22 C70 6 186 6 222 22 C240 96 236 182 202 236 C172 252 84 252 54 236 C20 182 16 96 34 22 Z', M, 'R') +
      P('M34 24 C80 50 150 104 214 214 C232 164 238 92 222 22 C186 8 90 8 34 24 Z', T, 'L', 2) +
      s('M40 30 C86 58 152 110 212 206', A, 3, 0.8) + dot(80, 150, 5, A, 0.7) + dot(110, 196, 5, A, 0.7) + dot(160, 74, 5, A, 0.7) + dot(190, 130, 5, A, 0.7) +
      fold('M60 120 C70 170 90 210 120 236'),
    items: colours('baby_swaddle', ['baby'], ['baby', 'nursery', 'daycare', 'hospital', 'cosy'], [
      ['pink', 'Pink Swaddle', pal('#f5c2d2', '#fff0f4', '#e486a6', '#8a4a5e')],
      ['blue', 'Blue Swaddle', pal('#a8d0f0', '#eef7ff', '#5a9be0', '#3a5a80')],
      ['lemon', 'Lemon Swaddle', pal('#f5e08a', '#fffbe6', '#e0a040', '#8a6a10')],
      ['mint', 'Mint Swaddle', pal('#a8e2c8', '#f0fff8', '#4ab08a', '#2f6a50')],
      ['lilac', 'Lilac Swaddle', pal('#cdb8ec', '#f8f2ff', '#8a5cc0', '#5a3a80')],
      ['cream', 'Cream Swaddle', pal('#efe4d0', '#fffaf0', '#c89a62', '#7a6a50')],
    ]),
  },
];

process.exit(commitNew(list, 'her clothes') ? 1 : 0);
