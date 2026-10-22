// Quick look at the realistic redraws without a browser: a grid of each drawing in its own colours.
//
//   node tools/real-sheet.ts [category,category] [--ids a,b] [--items]   -> out/style/real-sheet.png
// --items paints each drawing in the first game item's colours instead of its own real-world palette.
// --cell 400 draws each one bigger.
// --open shows each drawing that opens, closed then open (src/data/templates-open.json).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { paint } from '../src/art/render.ts';

const args = process.argv.slice(2);
const ids = args.includes('--ids') ? args[args.indexOf('--ids') + 1].split(',') : null;
const cats = args[0] && !args[0].startsWith('--') ? args[0].split(',') : null;
const itemPal = new Map<string, Record<string, string>>();
if (args.includes('--items')) for (const it of JSON.parse(readFileSync('src/data/items.json', 'utf8')) as { template: string; palette: Record<string, string> }[]) if (!itemPal.has(it.template)) itemPal.set(it.template, it.palette);
const all = JSON.parse(readFileSync('src/data/templates-real.json', 'utf8')) as { id: string; category: string; palette: Record<string, string>; svg: string }[];
let list = all.filter((t) => (ids ? ids.includes(t.id) : !cats || cats.includes(t.category)));
if (args.includes('--open')) {
  const opens = JSON.parse(readFileSync('src/data/templates-open.json', 'utf8')) as { id: string; svg: string }[];
  list = opens.flatMap((o) => {
    const c = all.find((t) => t.id === o.id)!;
    return [c, { ...c, id: `${c.id} (open)`, svg: o.svg }];
  });
}
const cell = args.includes('--cell') ? Number(args[args.indexOf('--cell') + 1]) : 200, cols = Math.min(Math.max(1, Math.floor(1600 / cell)), list.length);
const rows = Math.ceil(list.length / cols);
const cells = list.map((t, i) => {
  const inner = paint(t.svg, itemPal.get(t.id) ?? t.palette).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  // Gradient ids repeat between drawings; give each cell its own.
  const own = inner.replace(/id="(\w+)"/g, `id="$1_${i}"`).replace(/url\(#(\w+)\)/g, `url(#$1_${i})`);
  const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
  return `<rect x="${x + 4}" y="${y + 4}" width="${cell - 8}" height="${cell - 8}" rx="12" fill="#ffffff"/><svg x="${x + 12}" y="${y + 8}" width="${cell - 24}" height="${cell - 24}" viewBox="0 0 256 256">${own}</svg><text x="${x + cell / 2}" y="${y + cell - 8}" font-size="12" text-anchor="middle" fill="#5a3d4f">${t.id}</text>`;
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#fff6f9"/>${cells.join('')}</svg>`;
mkdirSync('out/style', { recursive: true });
writeFileSync('out/style/real-sheet.png', new Resvg(sheet, { font: { loadSystemFonts: true } }).render().asPng());
console.log(`${list.length} drawings -> out/style/real-sheet.png`);
