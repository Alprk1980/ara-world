import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
const [out, ...files] = process.argv.slice(2);
const cw = 590, ch = 410, cols = 3;
let body = '';
files.forEach((f, i) => {
  const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + 24);
  body += `<image href="data:image/png;base64,${readFileSync(f).toString('base64')}" x="${x}" y="${y}" width="${cw}" height="${ch}"/>`;
  body += `<text x="${x + 8}" y="${y + ch + 18}" font-size="16" font-family="sans-serif">${f.split('/').pop()}</text>`;
});
const rows = Math.ceil(files.length / cols);
writeFileSync(out, new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${rows * (ch + 24)}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`).render().asPng());
