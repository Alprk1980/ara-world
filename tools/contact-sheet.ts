// Render templates to a contact sheet PNG (and each one to out/templates/<id>.png for the vision check).
//
//   node tools/contact-sheet.ts [--ids a,b] [--out out/sheet.png] [--items]   (--items: every item in its own colours)
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { paint } from '../src/art/render.ts';
import { load } from './kinds.ts';
import type { Template } from '../schemas/template.ts';
import type { Item } from '../schemas/item.ts';

const args = process.argv.slice(2);
const opt = (n: string, f: string) => (args.includes(n) ? (args[args.indexOf(n) + 1] ?? f) : f);
const ids = new Set(opt('--ids', '').split(',').filter(Boolean));
const out = opt('--out', 'out/sheet.png');
const all = load<Template>('src/data/templates.json');
const byId = new Map(all.map((t) => [t.id, t]));
type Cell = { id: string; svg: string; palette?: Item['palette'] };
const templates: Cell[] = args.includes('--items')
  ? load<Item>('src/data/items.json').filter((i) => (ids.size === 0 || ids.has(i.id) || ids.has(i.template)) && byId.has(i.template)).map((i) => ({ id: i.id, svg: byId.get(i.template)!.svg, palette: i.palette }))
  : all.filter((t) => ids.size === 0 || ids.has(t.id));
mkdirSync('out/templates', { recursive: true });

const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const COLS = 8, CELL = 200, LABEL = 28;
const rows = Math.ceil(templates.length / COLS);
let cells = '';
templates.forEach((t, i) => {
  const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * (CELL + LABEL);
  const art = paint(t.svg, t.palette);
  cells += `<g transform="translate(${x + 10} ${y + 6}) scale(${(CELL - 20) / 256})">${inner(art)}</g>`;
  cells += `<text x="${x + CELL / 2}" y="${y + CELL + 16}" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#333">${esc(t.id)}</text>`;
  const single = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><rect width="256" height="256" fill="#fff"/>${inner(art)}</svg>`;
  if (!t.palette) writeFileSync(`out/templates/${t.id}.png`, new Resvg(single).render().asPng());
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * (CELL + LABEL)}"><rect width="100%" height="100%" fill="#fff6f9"/>${cells}</svg>`;
writeFileSync(out, new Resvg(sheet).render().asPng());
console.log(`${templates.length} templates -> ${out}`);
