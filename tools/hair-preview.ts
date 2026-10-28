// Show new hairstyles from Qwen on the game's real head BEFORE any of them go into the game.
//
//   node tools/hair-preview.ts [--ids id,id,...] [--out out/hair20] [--merge]
//   node tools/hair-preview.ts --from file.json [--out dir]   (just draw the sheet for hairstyles in a file)
//
// It collects every hair entry in .qwen-runs/template-new-*.txt that passes the template-new
// validator and is not already shipped, writes them to <out>/candidates.json, and draws a sheet:
// each design twice on the game's realistic head - once in Qwen's own colours, once recoloured
// the way the salon does it (src/world/rig.ts: trim +25%, accent +40%, outline -45%).
// Only --merge puts them into src/data/templates.json, and only after you have OKed the sheet.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { paint, type Palette } from '../src/art/render.ts';
import { shade } from '../src/art/color.ts';
import { parseJson } from './llm.ts';
import { KINDS, load, type Entry } from './kinds.ts';
import type { Template } from '../schemas/template.ts';

type Hair = Template & { palette: Record<string, string> };

const argv = process.argv.slice(2);
const opt = (name: string, def: string): string => { const i = argv.indexOf(`--${name}`); return i < 0 || i + 1 >= argv.length ? def : argv[i + 1]; };
const want = opt('ids', '').split(',').map((s) => s.trim()).filter(Boolean);
const outDir = opt('out', 'out/hair20');
const from = opt('from', '');
mkdirSync(outDir, { recursive: true });

const shipped = load<Template>('src/data/templates.json');
const shippedIds = new Set(shipped.map((t) => t.id));

// Every reply the generator saved, oldest first; the first passing copy of an id wins.
const files = readdirSync('.qwen-runs').filter((f) => /^template-new-.*\.txt$/.test(f)).sort();
const found = new Map<string, { hair: Hair; from: string }>();
for (const f of files) {
  const arr = parseJson(readFileSync(`.qwen-runs/${f}`, 'utf8'));
  if (!Array.isArray(arr)) continue;
  for (const e of arr as Hair[]) {
    if (!e || typeof e.id !== 'string') continue;
    if (e.category !== 'hair' || shippedIds.has(e.id) || found.has(e.id)) continue;
    if (want.length && !want.includes(e.id)) continue;
    const pool: Entry[] = [...shipped, ...[...found.values()].map((x) => x.hair)];
    if (KINDS['template-new'].errors(e, pool).length) continue;
    found.set(e.id, { hair: e, from: f });
  }
}
const picked = from
  ? (JSON.parse(readFileSync(from, 'utf8')) as Hair[]).map((hair) => ({ hair, from }))
  : (want.length ? want.map((id) => found.get(id)!) : [...found.values()]).filter(Boolean);
if (!from) writeFileSync(`${outDir}/candidates.json`, `${JSON.stringify(picked.map((x) => x.hair), null, 2)}\n`);
console.log(`found ${picked.length} hairstyle(s)${from ? ` in ${from}` : ' in .qwen-runs'}:`);
for (const x of picked) console.log(`  ${x.hair.id}  <- ${x.from}`);
const missing = want.filter((id) => !found.has(id));
if (missing.length) console.log(`still missing (${missing.length}): ${missing.join(' ')}`);

// --- the game's realistic head, ported from src/world/rig.ts (drawRealSkin + drawRealFace),
// fitted to the 256 hair canvas: an oval a little taller than wide (HEAD_H 1.15), centre 128,140.
const SKIN = '#f1c7a5', INK = '#2a1d1a';
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

// A template's svg is a whole <svg> document; embedding one whole inside the sheet makes it scale to
// the sheet viewport, not the 256 cell (it magnifies and lands far off the head). Unwrap the content,
// paint the palette in, and make every gradient/filter id unique to this cell.
const hairLayer = (hair: Hair, colour: Palette, key: string): string => {
  let inner = paint(hair.svg, colour).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  for (const id of new Set([...inner.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])))
    inner = inner.split(`#${id}`).join(`#${id}_${key}`).split(`="${id}"`).join(`="${id}_${key}"`);
  return inner;
};

const head = (hair: Hair, colour: Palette, key: string): string => {
  const dark = shade(SKIN, -0.16), line = shade(SKIN, -0.38), soft = shade(SKIN, -0.3), brow = shade(colour.main, -0.25);
  const cx = 128, cy = 140, rx = 74, ry = 85, r = rx; // rig: hw=headR, hh=headR*1.15
  const ey = cy + r * 0.02, ex = r * 0.36, ew = r * 0.2, eh = r * 0.12;
  let s = `<rect x="112" y="200" width="32" height="56" rx="10" fill="${SKIN}"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${dark}"/>` +
    `<ellipse cx="${cx}" cy="${cy - ry * 0.04}" rx="${rx * 0.86}" ry="${ry * 0.9}" fill="${SKIN}"/>` +
    `<ellipse cx="${cx}" cy="${cy - ry * 0.62}" rx="${rx * 0.5}" ry="${ry * 0.18}" fill="#ffffff" opacity="0.5"/>`;
  for (const side of [-1, 1]) {
    const x = cx + side * ex;
    s += `<path d="M${x - ew} ${ey} Q${x} ${ey - eh * 1.6} ${x + ew} ${ey} Q${x} ${ey + eh * 1.3} ${x - ew} ${ey} Z" fill="#ffffff"/>` +
      `<circle cx="${x + side * r * 0.01}" cy="${ey}" r="${eh * 0.95}" fill="#3a6ea5"/><circle cx="${x + side * r * 0.01}" cy="${ey}" r="${eh * 0.45}" fill="${INK}"/>` +
      `<circle cx="${x - eh * 0.35}" cy="${ey - eh * 0.35}" r="${eh * 0.28}" fill="#ffffff"/>` +
      `<path d="M${x - ew * 1.08} ${ey + eh * 0.1} Q${x} ${ey - eh * 1.75} ${x + ew * 1.12} ${ey - eh * 0.1}" fill="none" stroke="${INK}" stroke-width="${r * 0.055}" stroke-linecap="round"/>` +
      `<path d="M${x + side * ew * 1.05} ${ey - eh * 0.2} L${x + side * ew * 1.32} ${ey - eh * 0.6}" fill="none" stroke="${INK}" stroke-width="${r * 0.04}" stroke-linecap="round"/>` +
      `<path d="M${x - ew * 0.8} ${ey + eh * 0.9} Q${x} ${ey + eh * 1.35} ${x + ew * 0.8} ${ey + eh * 0.9}" fill="none" stroke="${soft}" stroke-width="${r * 0.025}" opacity="0.6"/>`;
    const yb = ey - eh * 2.6;
    s += `<path d="M${x - side * ew * 1.1} ${yb + r * 0.03} Q${x} ${yb - r * 0.06} ${x + side * ew * 1.15} ${yb + r * 0.02}" fill="none" stroke="${brow}" stroke-width="${r * 0.07}" stroke-linecap="round"/>`;
  }
  // Nose, lips and cheeks at the rig's own offsets.
  const my = cy + r * 0.56, mw = r * 0.24, up = r * 0.05;
  s += `<path d="M${cx + r * 0.02} ${ey + eh * 1.2} Q${cx + r * 0.12} ${ey + r * 0.3} ${cx + r * 0.03} ${ey + r * 0.36}" fill="none" stroke="${soft}" stroke-width="${r * 0.04}" stroke-linecap="round" opacity="0.7"/>` +
    `<ellipse cx="${cx - r * 0.07}" cy="${ey + r * 0.37}" rx="${r * 0.035}" ry="${r * 0.02}" fill="${soft}" opacity="0.6"/>` +
    `<ellipse cx="${cx + r * 0.08}" cy="${ey + r * 0.37}" rx="${r * 0.035}" ry="${r * 0.02}" fill="${soft}" opacity="0.6"/>` +
    `<path d="M${cx - mw} ${my - up} Q${cx - mw * 0.4} ${my - r * 0.08} ${cx} ${my - r * 0.04} Q${cx + mw * 0.4} ${my - r * 0.08} ${cx + mw} ${my - up} Q${cx} ${my + r * 0.04 + up} ${cx - mw} ${my - up} Z" fill="#c27d72"/>` +
    `<path d="M${cx - mw * 0.92} ${my - up * 0.8} Q${cx} ${my + r * 0.1 + up} ${cx + mw * 0.92} ${my - up * 0.8} Q${cx} ${my + r * 0.16 + up} ${cx - mw * 0.92} ${my - up * 0.8} Z" fill="#d88b7f"/>` +
    `<ellipse cx="${cx - mw * 0.25}" cy="${my + r * 0.06}" rx="${mw * 0.2}" ry="${r * 0.02}" fill="#ffffff" opacity="0.35"/>`;
  for (const side of [-1, 1]) s += `<ellipse cx="${cx + side * r * 0.5}" cy="${ey + r * 0.3}" rx="${r * 0.16}" ry="${r * 0.09}" fill="#ff8a8a" opacity="0.16"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${line}" stroke-width="2.5"/>`;
  return s + hairLayer(hair, colour, key);
};

// How the salon wears it: rig.addWear('hair') derives trim/accent/outline from the picked colour.
const salon = (colour: string): Palette => ({ main: colour, trim: shade(colour, 0.25), accent: shade(colour, 0.4), outline: shade(colour, -0.45) });
const SALON_SWATCHES = ['#2b1d14', '#e8c07d', '#d94f2b', '#b0b0b0', '#ff8fb8', '#74c0fc'];

const COLS = 2, CW = 420, CH = 300, SCALE = 0.92, TOP = 58;
const rows = Math.max(1, Math.ceil(picked.length / COLS));
const W = COLS * CW, H = TOP + rows * CH;
const canvas = (inner: string, w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

let cells = '';
picked.forEach((x, i) => {
  const cx = (i % COLS) * CW, cy = TOP + Math.floor(i / COLS) * CH;
  cells += `<g transform="translate(${cx},${cy})">` +
    `<rect x="8" y="8" width="${CW - 16}" height="${CH - 16}" rx="10" fill="#ffffff"/>` +
    `<text x="20" y="31" font-family="sans-serif" font-size="15" font-weight="bold" fill="#1c130b">#${i + 1} ${esc(x.hair.name)}</text>` +
    `<text x="20" y="48" font-family="sans-serif" font-size="11" fill="#7a6a55">${x.hair.id}</text>` +
    `<g transform="translate(22,54) scale(${SCALE})">${head(x.hair, x.hair.palette as unknown as Palette, `${i}a`)}</g>` +
    `<g transform="translate(176,54) scale(${SCALE})">${head(x.hair, salon(SALON_SWATCHES[i % SALON_SWATCHES.length]), `${i}b`)}</g>` +
    `</g>`;
});
const sheet = canvas(
  `<rect width="${W}" height="${H}" fill="#fff6f9"/>` +
  `<text x="16" y="25" font-family="sans-serif" font-size="17" font-weight="bold" fill="#1c130b">${picked.length} new hairstyles${from ? '' : ' (Qwen)'} - not in the game yet</text>` +
  `<text x="16" y="44" font-family="sans-serif" font-size="12" fill="#7a6a55">left: own colours - right: recoloured like the game salon, on the game's real head</text>` +
  cells,
  W, H,
);
writeFileSync(`${outDir}/preview.svg`, sheet);
writeFileSync(`${outDir}/preview.png`, new Resvg(sheet, { fitTo: { mode: 'width', value: Math.round(W * 1.3) } }).render().asPng());
mkdirSync(`${outDir}/png`, { recursive: true });
for (const x of picked)
  writeFileSync(`${outDir}/png/${x.hair.id}.png`, new Resvg(canvas(head(x.hair, x.hair.palette as unknown as Palette, 'p'), 256, 256), { fitTo: { mode: 'width', value: 360 } }).render().asPng());
console.log(`sheet: ${outDir}/preview.png  (${picked.length} designs, each twice)`);

if (argv.includes('--merge')) {
  const live = load<Template>('src/data/templates.json');
  const ids = new Set(live.map((t) => t.id));
  let added = 0, rejected = 0;
  for (const x of picked) {
    if (ids.has(x.hair.id)) continue;
    const problems = KINDS['template-new'].errors(x.hair, live as Entry[]);
    if (problems.length) { rejected++; console.log(`  rejected ${x.hair.id}: ${problems[0]}`); continue; }
    live.push(x.hair);
    ids.add(x.hair.id);
    added++;
  }
  writeFileSync('src/data/templates.json', `${JSON.stringify(live, null, 2)}\n`);
  console.log(`merged ${added} into src/data/templates.json${rejected ? `, ${rejected} rejected` : ''} - run npm run validate`);
}
