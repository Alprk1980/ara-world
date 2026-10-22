// Have Qwen redraw every game template in the realistic style, one per call, into src/data/templates-real.json.
// Clothes first, then objects in the order she meets them most. Resumable: anything already redrawn is skipped.
//
//   LLM_MAX_TOKENS=40000 node tools/redraw-real.ts [--only top,bottom] [--limit 40]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Template } from '../schemas/template.ts';

const ORDER = ['top', 'bottom', 'dress', 'shoes', 'socks', 'hat', 'hair', 'bag', 'glasses', 'food', 'drink', 'toy', 'makeup', 'school', 'sport', 'baby', 'elder', 'animal', 'plant', 'halloween', 'garden', 'vehicle', 'furniture', 'decor'];
const args = process.argv.slice(2);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const only = opt('--only')?.split(',');
const limit = Number(opt('--limit') ?? Infinity);

const all = JSON.parse(readFileSync('src/data/templates.json', 'utf8')) as Template[];
const done = new Set((JSON.parse(readFileSync('src/data/templates-real.json', 'utf8')) as Template[]).map((t) => t.id));
const queue = ORDER.filter((c) => !only || only.includes(c))
  .flatMap((c) => all.filter((t) => t.category === c && !done.has(t.id)))
  .slice(0, limit)
  .map((t) => t.id);
console.log(`${done.size} redrawn already; ${queue.length} to go`);
// The generator gives each batch the next id from the list; it stops cleanly if killed between batches.
const r = spawnSync(process.execPath, ['tools/qwen-gen.ts', 'template-redraw', '--count', '1', '--batches', String(queue.length), '--ask', queue.join('; ')], { stdio: 'inherit', env: { ...process.env, LLM_MAX_TOKENS: process.env.LLM_MAX_TOKENS ?? '40000' } });
process.exit(r.status ?? 1);
