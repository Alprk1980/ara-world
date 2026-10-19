// Ask the local vision model whether each rendered template looks like what it is called.
// Run tools/contact-sheet.ts first (it writes out/templates/<id>.png).
//
//   node tools/vision-check.ts [--ids a,b] [--since <id>]
//
// Writes out/vision.json. Flags are leads: look at the flagged PNGs before regenerating anything.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chat, parseJson, VISION_MODEL } from './llm.ts';
import { load, FILES } from './kinds.ts';
import type { Template } from '../schemas/template.ts';

type Verdict = { recognizable: boolean; cute: number; broken: boolean; sees: string; guess?: string; guessMatches?: boolean };

const args = process.argv.slice(2);
const opt = (n: string, f: string) => (args.includes(n) ? (args[args.indexOf(n) + 1] ?? f) : f);
const ids = new Set(opt('--ids', '').split(',').filter(Boolean));
const reportFile = 'out/vision.json';
const report: Record<string, Verdict & { name: string }> = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, 'utf8')) : {};
const list = load<Template>(FILES.template).filter((t) => (ids.size ? ids.has(t.id) : !(t.id in report)));

function verdictErrors(v: unknown): string[] {
  const o = v as Partial<Verdict>;
  const e: string[] = [];
  if (typeof o?.recognizable !== 'boolean') e.push('recognizable: true/false');
  if (typeof o?.broken !== 'boolean') e.push('broken: true/false');
  if (typeof o?.cute !== 'number' || o.cute < 1 || o.cute > 5) e.push('cute: 1-5');
  if (typeof o?.sees !== 'string' || o.sees.length < 2) e.push('sees: what you see, in a few words');
  return e;
}

for (const t of list) {
  const png = `out/templates/${t.id}.png`;
  if (!existsSync(png)) continue;
  const image = `data:image/png;base64,${readFileSync(png).toString('base64')}`;
  const question = `This is a flat cartoon drawing for a children's game. It is supposed to be: "${t.name}" (a ${t.category}).
${t.category === 'shoes' || t.category === 'socks' ? 'It is a pair, drawn as two.' : ''}
Answer with only JSON: {"sees": "what you see, a few words", "recognizable": true if a child would recognise it as a ${t.name}, "cute": 1-5, "broken": true if it looks glitchy, cut off or messy}`;
  // Blind first: what does it look like without being told? A guess sharing no word with the name is a lead.
  const blind = (await chat([{ role: 'user', content: [{ type: 'text', text: "This is a flat cartoon drawing for a children's game (all drawings use the same pink and yellow test colours). What object is it? Answer with only 1-4 words." }, { type: 'image_url', image_url: { url: image } }] }], { model: VISION_MODEL, maxTokens: 30, temperature: 0 })).replace(/[^a-zA-Z ]/g, ' ').trim().toLowerCase();
  // Same kind of thing? Cheap spelling check here ("t shirt" ~ "tshirt"); leftovers go to the big model in one batch.
  const squash = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '');
  const tokens = (x: string) =>
    x.toLowerCase().replace(/_/g, ' ').split(/[^a-z]+/)
      .filter((w) => w.length >= 3 && !['cute', 'cozy', 'cosy', 'big', 'small', 'the', 'toy', 'and', 'with'].includes(w))
      .map((w) => (w.length > 4 ? w.replace(/(es|s)$/, '') : w));
  const guessMatches = tokens(`${t.name} ${t.id}`).some((w) => squash(blind).includes(w)) || tokens(blind).some((w) => squash(t.name).includes(w));
  let verdict: Verdict | null = null;
  for (let attempt = 0; attempt < 2 && !verdict; attempt++) {
    const reply = await chat([{ role: 'user', content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: image } }] }], { model: VISION_MODEL, maxTokens: 300, temperature: 0.2 });
    const v = parseJson(reply, 'object');
    if (verdictErrors(v).length === 0) verdict = v as Verdict;
  }
  if (!verdict) {
    console.log(`? ${t.id}: no usable answer`);
    continue;
  }
  report[t.id] = { name: t.name, ...verdict, guess: blind, guessMatches };
  const flag = !verdict.recognizable || verdict.broken || verdict.cute <= 2 || !guessMatches;
  console.log(`${flag ? '✗' : '✓'} ${t.id.padEnd(28)} cute ${verdict.cute}${verdict.broken ? ' BROKEN' : ''} guess "${blind}" — sees "${verdict.sees}"`);
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
}
// The big model judges blind guesses that did not match by spelling (synonyms: dog = puppy).
const unsure = Object.entries(report).filter(([, v]) => v.guessMatches === false && v.guess);
if (unsure.length) {
  const pairs = unsure.map(([id, v]) => `${id}: name "${v.name}", guess "${v.guess}"`).join('\n');
  const q = `For each pair, is the guess the same kind of thing as the name? Synonyms and close kinds count (dog = puppy, shoes = sneakers; but peach is not apple). Answer only JSON {"<id>": true or false, ...}.\n${pairs}`;
  const verdicts = parseJson(await chat([{ role: 'user', content: q }], { temperature: 0 }), 'object') as Record<string, boolean> | null;
  for (const [id] of unsure) if (verdicts?.[id] === true) report[id].guessMatches = true;
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
}
const flagged = Object.entries(report).filter(([, v]) => !v.recognizable || v.broken || v.cute <= 2 || v.guessMatches === false);
console.log(`\n${Object.keys(report).length} checked, ${flagged.length} flagged: ${flagged.map(([id]) => id).join(', ')}`);
