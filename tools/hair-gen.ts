// Hair generator: the local model emits PARAMS (schemas/hair-params.ts), and code composes/validates.
//   node --env-file=.env.llm tools/hair-gen.ts "id | one-line design brief" [...] [--dry]
// Loop: params schema -> compose -> template-new validator -> IoU dedupe vs shipped hair;
// failures are fed back with their exact errors; passing entries land in .qwen-runs/template-new-*.txt
// for tools/hair-preview.ts to render and (after your OK) merge.
import { readFileSync, writeFileSync } from 'node:fs';
import { chat, parseJson } from './llm.ts';
import { hairParamsErrors, type HairParams } from '../schemas/hair-params.ts';
import { compose } from './hair-compose.ts';
import { grid, iou } from './hair-sign.ts';
import { KINDS, load, type Entry } from './kinds.ts';
import type { Template } from '../schemas/template.ts';

type RealTemplate = Template & { palette: Record<string, string> };

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const ask = argv.find((a) => !a.startsWith('--')) ?? '';
const styles = ask.startsWith('@') ? readFileSync(ask.slice(1), 'utf8') : ask;
if (!styles.trim()) { console.error('usage: node tools/hair-gen.ts "id | design brief" [--dry]'); process.exit(2); }

const system = readFileSync('prompts/hair-params.txt', 'utf8');
const shippedPool = load<Template>('src/data/templates.json');
const shippedHair = [
  ...shippedPool.filter((t) => t.category === 'hair' && 'palette' in t),
  ...load<Template>('src/data/templates-real.json').filter((t) => t.category === 'hair'),
];
const shippedSigs = shippedHair.map((t) => ({ id: t.id, g: grid(t.svg) }));
const accepted: RealTemplate[] = [];

async function main() {
  let user = `Design these hairstyles as hair-params JSON (one object per style):\n${styles.trim()}`;
  const MAX_ROUNDS = 3;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`[hair-gen round ${round}/${MAX_ROUNDS}] asking ${process.env.LLM_MODEL ?? 'model'}...`);
    const reply = await chat([{ role: 'system', content: system }, { role: 'user', content: user }]);
    const arr = parseJson(reply) as HairParams[] | null;
    if (!Array.isArray(arr)) { user = 'Your reply contained no JSON array. Output ONLY the array of hair-params objects.'; continue; }
    const problems: string[] = [];
    const failed: HairParams[] = [];
    const pass: RealTemplate[] = [];
    for (const item of arr) {
      const id = (item as HairParams)?.id ?? '?';
      let errs = hairParamsErrors(item);
      let composed: RealTemplate | null = null;
      if (!errs.length) { const c = compose(item); errs = c.errors; composed = c.template; }
      if (!errs.length && composed) errs = KINDS['template-new'].errors(composed as Entry, [...shippedPool, ...accepted] as Entry[]);
      if (!errs.length && composed) {
        const g = grid(composed.svg);
        const rivals = [...shippedSigs, ...accepted.map((a) => ({ id: a.id, g: grid(a.svg) }))];
        for (const s of rivals) {
          const v = iou(g, s.g);
          if (v >= 0.82) { errs = [`${id}: shape duplicates ${s.id} (IoU ${v.toFixed(2)}) - vary hairline, side walls, volume or texture`]; break; }
        }
      }
      if (errs.length) { problems.push(...errs.map((e) => `- ${e}`)); failed.push(item); console.log(`  fail ${id}: ${errs[0]}`); }
      else { pass.push(composed!); console.log(`  pass ${id}`); }
    }
    accepted.push(...pass);
    if (!problems.length) break;
    if (round === MAX_ROUNDS) { console.error(`left ${problems.length} problem(s):\n${problems.join('\n')}`); break; }
    user = `These hair-params failed validation. Fix exactly these problems and re-emit ONLY a JSON array with the corrected objects (keep ids):\n${problems.join('\n')}\n\nFailed objects:\n${JSON.stringify(failed)}`;
  }
  if (!accepted.length) { console.log('nothing passed'); return; }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `.qwen-runs/template-new-${ts}-param.txt`;
  if (dry) console.log(`dry: ${accepted.length} entries would go to ${file}`);
  else {
    writeFileSync(file, JSON.stringify(accepted, null, 2));
    console.log(`wrote ${accepted.length} to ${file} - then: node tools/hair-preview.ts --out out/hair20`);
  }
}
main();
