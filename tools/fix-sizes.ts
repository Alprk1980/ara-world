// Size balance by rule (user's OK, 2026-10-19): rescale templates whose real-world size dwarfs or vanishes next to a
// person (adult = 100 tall). Keeps each drawing's proportions; every change is re-validated.
//
//   node tools/fix-sizes.ts [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { templateErrors, type Template } from '../schemas/template.ts';

const PET = /cat|kitten|dog|pup|bunny|rabbit|hamster|guinea|budgie|parrot|bird|duck|chick|turtle|tortoise|fish/;
type Rule = { test: (t: Template) => boolean; minH?: number; maxH?: number; maxW?: number; why: string };
const RULES: Rule[] = [
  { test: (t) => t.category === 'vehicle', maxW: 400, maxH: 160, why: 'vehicles crowd out whole floors' },
  { test: (t) => /tree|palm/.test(t.id) && t.category !== 'toy', maxH: 170, why: 'trees fill the screen' },
  { test: (t) => t.category === 'decor', maxH: 125, maxW: 200, why: 'decorations taller than a grown-up' },
  { test: (t) => t.category === 'furniture', maxH: 150, maxW: 220, why: 'furniture taller than the room feels' },
  { test: (t) => t.category === 'garden', maxH: 220, maxW: 260, why: 'garden things bigger than the yard' },
  { test: (t) => t.category === 'animal' && PET.test(t.id), minH: 14, maxH: 45, why: 'pets too tiny to grab or too big to cuddle' },
  { test: (t) => t.category === 'animal', minH: 12, why: 'animals too tiny to see' },
  { test: (t) => ['toy', 'school', 'sport', 'makeup'].includes(t.category), minH: 6, why: 'things too tiny to grab' },
];

const file = 'src/data/templates.json';
const list = JSON.parse(readFileSync(file, 'utf8')) as Template[];
let changed = 0;
for (const t of list) {
  if (!t.size) continue;
  let { w, h } = t.size;
  for (const rule of RULES) {
    if (!rule.test(t)) continue;
    let k = 1;
    if (rule.maxH && h * k > rule.maxH) k = rule.maxH / h;
    if (rule.maxW && w * k > rule.maxW) k = Math.min(k, rule.maxW / w);
    if (rule.minH && h * k < rule.minH) k = rule.minH / h;
    if (k !== 1) {
      const next = { ...t, size: { w: Math.round(w * k), h: Math.round(h * k) } };
      if (templateErrors(next, list.filter((x) => x.id !== t.id)).length === 0) {
        console.log(`${t.id}: ${w}x${h} → ${next.size.w}x${next.size.h} (${rule.why})`);
        ({ w, h } = next.size);
        changed++;
      }
    }
  }
  t.size = { w, h };
}
if (!process.argv.includes('--dry')) writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
console.log(`${changed} size change(s)${process.argv.includes('--dry') ? ' (dry run)' : ''}`);
