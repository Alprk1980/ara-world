// Generate entries with the local model, validate, repair failures, merge what passes.
//
//   node tools/qwen-gen.ts <kind> [--count 8] [--ask "what to make"] [--batches 1] [--replace id,id] [--dry]
//
// Every reply is saved to .qwen-runs/. Nothing is merged unless it passes the kind's validator.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chat, parseJson, MODEL, type Message } from './llm.ts';
import { KINDS, load, type Entry } from './kinds.ts';

const args = process.argv.slice(2);
const kindName = args[0];
const opt = (name: string, fallback: string) => (args.includes(name) ? (args[args.indexOf(name) + 1] ?? fallback) : fallback);
const kind = KINDS[kindName];
if (kind === undefined) {
  console.error(`usage: node tools/qwen-gen.ts <${Object.keys(KINDS).join('|')}> [--count N] [--ask "..."] [--batches N] [--replace id,id] [--dry]`);
  process.exit(1);
}
const count = Number(opt('--count', '8'));
const batches = Number(opt('--batches', '1'));
const replace = new Set(opt('--replace', '').split(',').map((s) => s.trim()).filter(Boolean));
// --ask may list items separated by ";" — each batch then gets the next `count` of them.
const askList = opt('--ask', '').split(';').map((s) => s.trim()).filter(Boolean);
mkdirSync('.qwen-runs', { recursive: true });

async function runBatch(batch: number): Promise<number> {
  const shipped = load(kind.data);
  const ask = askList.length > 1 ? askList.slice((batch - 1) * count, batch * count).join('; ') : (askList[0] ?? '');
  if (askList.length > 1 && ask === '') return 0;
  // Kind facts first (they may set {{count}} themselves), then the generic placeholders.
  let prompt = readFileSync(kind.prompt, 'utf8');
  for (const [k, v] of Object.entries(kind.vars?.(ask) ?? {})) prompt = prompt.replaceAll(`{{${k}}}`, v);
  prompt = prompt
    .replaceAll('{{count}}', String(askList.length > 1 ? ask.split(';').length : count))
    .replaceAll('{{ask}}', ask)
    .replaceAll('{{existing}}', shipped.map((e) => e.id).join(', ') || '(none yet)');
  const messages: Message[] = [{ role: 'user', content: prompt }];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let passing: Entry[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    console.log(`[${kindName} batch ${batch}/${batches}] attempt ${attempt}/3: asking ${MODEL}…`);
    const reply = await chat(messages);
    writeFileSync(`.qwen-runs/${kindName}-${stamp}-${attempt}.txt`, reply);
    const entries = parseJson(reply);
    if (!Array.isArray(entries)) {
      console.log(`  no JSON array in reply (${Math.round((Date.now() - t0) / 1000)}s)`);
      messages.push({ role: 'assistant', content: reply }, { role: 'user', content: 'Answer with only the JSON array, complete and valid.' });
      continue;
    }
    // Entries being replaced on purpose don't count as taken ids.
    const pool = [...shipped.filter((s) => !replace.has(s.id)), ...(entries as Entry[])];
    const problems = (entries as Entry[]).flatMap((e) => kind.errors(e, pool));
    for (const e of entries as Entry[])
      if (kind.errors(e, pool).length === 0 && !passing.some((p) => p.id === e.id)) passing.push(e);
    console.log(`  ${entries.length} entries, ${passing.length} passing, ${problems.length} problem(s) (${Math.round((Date.now() - t0) / 1000)}s)${problems.length ? `:\n    ${problems.slice(0, 10).join('\n    ')}` : ''}`);
    if (problems.length === 0) break;
    const failing = (entries as Entry[]).filter((e) => kind.errors(e, pool).length > 0).map((e) => e.id);
    messages.push(
      { role: 'assistant', content: reply },
      { role: 'user', content: `These entries have problems: ${failing.join(', ')}. Fix them and answer with a JSON array of ONLY the fixed entries:\n- ${problems.join('\n- ')}` },
    );
  }
  // Merge: new ids are added; a shipped id is written over only when --replace names it.
  const wanted = replace.size > 0 ? passing.filter((e) => replace.has(e.id)) : passing.filter((e) => !shipped.some((s) => s.id === e.id));
  if (args.includes('--dry') || wanted.length === 0) {
    console.log(`  ${wanted.length} entr(ies) would merge; nothing written`);
    return 0;
  }
  const merged = [...shipped.map((s) => wanted.find((w) => w.id === s.id) ?? s), ...wanted.filter((w) => !shipped.some((s) => s.id === w.id))];
  writeFileSync(kind.data, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`  merged ${wanted.length} into ${kind.data}: ${wanted.map((e) => e.id).join(', ')}`);
  return wanted.length;
}

let total = 0;
for (let b = 1; b <= batches; b++) {
  try {
    total += await runBatch(b);
  } catch (e) {
    console.log(`  batch ${b} failed: ${(e as Error).message}`);
  }
}
console.log(`done: ${total} merged`);
