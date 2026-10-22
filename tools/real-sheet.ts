// Quick look at the realistic redraws without a browser: a grid of each drawing in its own colours.
//
//   node tools/real-sheet.ts [category,category] [--ids a,b]   -> out/style/real-sheet.png
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { paint } from '../src/art/render.ts';

const args = process.argv.slice(2);
const ids = args.includes('--ids') ? args[args.indexOf('--ids') + 1].split(',') : null;
const cats = args[0] && !args[0].startsWith('--') ? args[0].split(',') : null;
const all = JSON.parse(readFileSync('src/data/templates-real.json', 'utf8')) as { id: string; category: string; palette: Record<string, string>; svg: string }[];
const list = all.filter((t) => (ids ? ids.includes(t.id) : !cats || cats.includes(t.category)));
const cols = Math.min(8, list.length), cell = 200;
const rows = Math.ceil(list.length / cols);
const cells = list.map((t, i) => {
  const inner = paint(t.svg, t.palette).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  // Gradient ids repeat between drawings; give each cell its own.
  const own = inner.replace(/id="(\w+)"/g, `id="$1_${i}"`).replace(/url\(#(\w+)\)/g, `url(#$1_${i})`);
  const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
  return `<rect x="${x + 4}" y="${y + 4}" width="${cell - 8}" height="${cell - 8}" rx="12" fill="#ffffff"/><svg x="${x + 12}" y="${y + 8}" width="${cell - 24}" height="${cell - 24}" viewBox="0 0 256 256">${own}</svg><text x="${x + cell / 2}" y="${y + cell - 8}" font-size="12" text-anchor="middle" fill="#5a3d4f">${t.id}</text>`;
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#fff6f9"/>${cells.join('')}</svg>`;
mkdirSync('out/style', { recursive: true });
writeFileSync('out/style/real-sheet.png', new Resvg(sheet, { font: { loadSystemFonts: true } }).render().asPng());
console.log(`${list.length} drawings -> out/style/real-sheet.png`);
