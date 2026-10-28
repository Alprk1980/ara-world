// Remove entries with the given ids from every .qwen-runs/template-new-*.txt, so a reroll's
// new entry can win (hair-preview.ts: first passing copy of an id, oldest file first).
//   node tools/hair-strip.ts flat_top_hair mullet_hair ...
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseJson } from './llm.ts';

const ids = new Set(process.argv.slice(2).map((s) => s.trim()).filter(Boolean));
if (!ids.size) { console.error('usage: node tools/hair-strip.ts <id> [...]'); process.exit(2); }
for (const f of readdirSync('.qwen-runs').filter((x) => /^template-new-.*\.txt$/.test(x))) {
  const arr = parseJson(readFileSync(`.qwen-runs/${f}`, 'utf8'));
  if (!Array.isArray(arr)) continue;
  const kept = arr.filter((e) => !(e && typeof e === 'object' && ids.has((e as { id?: string }).id ?? '')));
  if (kept.length !== arr.length) {
    writeFileSync(`.qwen-runs/${f}`, JSON.stringify(kept, null, 1));
    console.log(`stripped ${arr.length - kept.length} from ${f}`);
  }
}
