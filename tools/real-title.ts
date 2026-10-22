// The realistic title screen's drawings, by Claude: a rose head, a rose leaf and a fallen petal, which the title
// screen arranges into garlands and drifting petals (src/ui/title.ts). Checked like every drawing and written to
// src/data/title-art.json.
//
//   node tools/real-title.ts
import { writeFileSync } from 'node:fs';
import { checkSvg } from '../schemas/svg.ts';
import { M, P, T, W, lobe, roseHead, roseLeaf, s, svg } from './real-kit.ts';

const art: Record<string, string> = {
  title_rose: svg(roseHead(128, 128, 118)),
  title_leaf: svg(roseLeaf(40, 216, 220, 40, 62)),
  title_petal: svg(P(lobe(128, 128, 110, 80, -0.4), M, 'R', 2) + s('M60 150 C100 120 150 110 196 104', T, 3, 0.5) + s('M70 110 C96 80 130 70 160 70', W, 6, 0.4)),
};

let bad = 0;
for (const [id, text] of Object.entries(art)) {
  const errs = checkSvg(text).errors;
  if (errs.length) {
    bad++;
    console.log(`✗ ${id}: ${errs.join('; ')}`);
  } else console.log(`✓ ${id} (${text.length} bytes)`);
}
writeFileSync('src/data/title-art.json', `${JSON.stringify(Object.entries(art).map(([id, svgText]) => ({ id, svg: svgText })), null, 2)}\n`);
process.exit(bad ? 1 : 0);
