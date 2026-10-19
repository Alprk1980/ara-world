// Qwen plays tester: for every floor screenshot from tools/playthrough.ts, the vision model says whether it looks like
// the place it should be, what doesn't belong and what's missing; the big model turns that into a to-do per place.
// Feedback is a lead: Claude looks at the screenshot before changing anything.
//
//   node tools/playthrough.ts --no-review && node tools/qwen-playtest.ts [--only id,id]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chat, parseJson, VISION_MODEL } from './llm.ts';
import { FILES, load } from './kinds.ts';
import type { Place } from '../schemas/place.ts';

type Look = { looks_like: boolean; score: number; wrong: string[]; missing: string[] };
type Todo = { place: string; verdict: string; fixes: string[] };

const args = process.argv.slice(2);
const only = new Set((args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').filter(Boolean));
const places = load<Place>(FILES.place).filter((p) => only.size === 0 || only.has(p.id));
const report: Record<string, (Look & { floor: string })[]> = {};

const lookErrors = (v: unknown): string[] => {
  const o = v as Partial<Look>;
  const e: string[] = [];
  if (typeof o?.looks_like !== 'boolean') e.push('looks_like');
  if (typeof o?.score !== 'number') e.push('score');
  if (!Array.isArray(o?.wrong) || !Array.isArray(o?.missing)) e.push('wrong/missing arrays');
  return e;
};

for (const p of places) {
  report[p.id] = [];
  for (let i = 0; i < p.floors.length; i++) {
    const png = `out/play/${p.id}-${i}.png`;
    if (!existsSync(png)) continue;
    const f = p.floors[i];
    const q = `This is a screenshot from a cute children's game (like Toca Life World). It should show: "${p.name}", the "${f.name}" ${f.outdoor ? '(outdoors)' : '(a room)'}.
Look at the background and the things in it. Answer with only JSON:
{"looks_like": true if a child would know this is a ${p.name}, "score": 1-5 how well it fits, "wrong": ["things that don't belong here"], "missing": ["up to 3 things that would make it look more like a ${p.name}"]}`;
    let look: Look | null = null;
    for (let a = 0; a < 2 && !look; a++) {
      const v = parseJson(await chat([{ role: 'user', content: [{ type: 'text', text: q }, { type: 'image_url', image_url: { url: `data:image/png;base64,${readFileSync(png).toString('base64')}` } }] }], { model: VISION_MODEL, maxTokens: 12000, temperature: 0.2 }), 'object');
      if (lookErrors(v).length === 0) look = v as Look;
    }
    if (!look) continue;
    report[p.id].push({ floor: f.name, ...look });
    console.log(`${look.looks_like ? '✓' : '✗'} ${p.id} / ${f.name}: ${look.score}/5${look.wrong.length ? ` — wrong: ${look.wrong.slice(0, 3).join(', ')}` : ''}${look.missing.length ? ` — add: ${look.missing.join(', ')}` : ''}`);
  }
  writeFileSync('out/qwen-playtest.json', JSON.stringify(report, null, 2));
}

// Turn the per-floor notes into a short to-do list per place (one request, places that scored below 4).
const weak = Object.entries(report).filter(([, ls]) => ls.some((l) => !l.looks_like || l.score < 4));
const todos: Todo[] = [];
for (let i = 0; i < weak.length; i += 10) {
  const part = weak.slice(i, i + 10).map(([id, ls]) => `${id}: ${ls.map((l) => `[${l.floor}] score ${l.score}; wrong: ${l.wrong.join(', ') || '-'}; missing: ${l.missing.join(', ') || '-'}`).join(' | ')}`).join('\n');
  const prompt = `A children's game has these places. A tester looked at each floor and noted what's wrong and missing.
${part}
For each place, give a one-line verdict and up to 3 concrete fixes (background or things to add/remove). Ignore vague notes.
Answer with only a JSON array: [{"place": "id", "verdict": "...", "fixes": ["..."]}]`;
  try {
    const v = parseJson(await chat([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 40000 }));
    if (Array.isArray(v)) todos.push(...v.filter((t) => typeof t?.place === 'string' && Array.isArray(t?.fixes)));
  } catch (e) {
    console.log(`summary failed: ${(e as Error).message.slice(0, 80)}`);
  }
}
writeFileSync('out/qwen-todo.json', JSON.stringify(todos, null, 2));
const floors = Object.values(report).flat();
console.log(`\n${floors.length} floors looked at, ${floors.filter((l) => l.looks_like).length} look right; average ${(floors.reduce((a, l) => a + l.score, 0) / Math.max(1, floors.length)).toFixed(1)}/5`);
for (const t of todos) console.log(`• ${t.place}: ${t.verdict}\n    - ${t.fixes.join('\n    - ')}`);
