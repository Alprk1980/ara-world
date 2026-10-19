// Headless bot: visit every place and floor, bring someone in, feed them, build a house, open the post box.
// Writes a step-by-step digest (out/playthrough.txt) and asks the model to flag problems (out/playthrough-review.json).
// Each flag is a lead: replay that step (screenshots in out/play/) before changing anything.
//
//   node tools/playthrough.ts [--no-review]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { chat, parseJson } from './llm.ts';

mkdirSync('out/play', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const steps: string[] = [];
const step = (s: string) => {
  steps.push(`${steps.length + 1}. ${s}`);
  console.log(steps.at(-1));
};

type Stats = { floors: { name: string; outdoor: boolean; width: number; things: number; missingArt: string[]; offFloor: string[] }[] };

try {
  await page.goto('http://localhost:5198/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(() => (window as any).ara.play());
  const placeIds: string[] = await page.evaluate(async () => [...(await import(/* @vite-ignore */ '/src/data/index.ts' as string)).places.keys()]);
  step(`Opened the map: ${placeIds.length} places.`);
  for (const id of placeIds) {
    const stats: Stats = await page.evaluate(async (pid) => {
      const ara = (window as any).ara;
      const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
      const st = await import(/* @vite-ignore */ '/src/world/state.ts' as string);
      ara.openPlace(pid);
      const floors = st.floorsOf(ara.world, pid);
      return {
        floors: floors.map((f: any, i: number) => {
          const things = st.thingsOn(ara.world, pid, i);
          return {
            name: f.name, outdoor: !!f.outdoor, width: f.width, things: things.length,
            missingArt: things.filter((t: any) => !data.templates.has(data.items.get(t.item)?.template)).map((t: any) => t.item),
            offFloor: things.filter((t: any) => t.x < 0 || t.x > f.width).map((t: any) => t.item),
          };
        }),
      };
    }, id);
    for (let i = 0; i < stats.floors.length; i++) {
      const f = stats.floors[i];
      await page.evaluate((n) => (window as any).ara.place.goFloor(n), i);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `out/play/${id}-${i}.png` });
      step(`In ${id}, floor ${i + 1} "${f.name}"${f.outdoor ? ' (outdoor)' : ''}, ${f.width} wide: ${f.things} things${f.missingArt.length ? `, MISSING ART: ${f.missingArt.join(', ')}` : ''}${f.offFloor.length ? `, OFF THE FLOOR: ${f.offFloor.join(', ')}` : ''}. Screenshot out/play/${id}-${i}.png`);
    }
    // Bring the first person in and feed them anything edible here.
    const fed: string = await page.evaluate(async () => {
      const ara = (window as any).ara;
      const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
      const person = ara.world.people[0];
      if (!person) return 'no people exist';
      ara.place.placePerson(person, { x: 600, y: 600 });
      const st = await import(/* @vite-ignore */ '/src/world/state.ts' as string);
      const things = st.thingsOn(ara.world, ara.place.placeId, ara.place.floorIndex);
      const food = things.find((t: any) => ['food', 'drink'].includes(data.categoryOf(t.item)));
      return food ? `brought ${person.name} in; there is food here (${food.item})` : `brought ${person.name} in; nothing to eat on this floor`;
    });
    step(`In ${id}: ${fed}.`);
    await page.evaluate(() => (window as any).ara.back());
  }
  await page.evaluate(() => (window as any).ara.build());
  await page.screenshot({ path: 'out/play/builder.png' });
  step('Pressed the hammer: the house picker opened. Screenshot out/play/builder.png');
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) step(`PAGE ERRORS: ${errors.join(' | ')}`);
const digest = steps.join('\n');
writeFileSync('out/playthrough.txt', digest);

if (!process.argv.includes('--no-review')) {
  const prompt = `You are play-testing a cosy life-sim game for a young girl (like Toca Life World). A test bot played it;
here is what it saw, step by step. Each place floor should feel full and fun (about 6-20 things), have something
to do, and never have missing art or things off the floor. Flag real problems only.

${digest}

Answer with only a JSON array (empty if all is well): [{"step": <step number>, "problem": "...", "fix": "..."}]`;
  // Review in chunks of ~30 steps: one huge digest makes the model think until it runs out of tokens.
  const findings: { step: number; problem: string; fix: string }[] = [];
  for (let i = 0; i < steps.length; i += 30) {
    const part = prompt.replace(digest, steps.slice(i, i + 30).join('\n'));
    try {
      const v = parseJson(await chat([{ role: 'user', content: part }], { temperature: 0.2, maxTokens: 60000 }));
      if (Array.isArray(v)) findings.push(...v.filter((f) => Number.isInteger(f?.step) && typeof f?.problem === 'string'));
      console.log(`  reviewed steps ${i + 1}-${Math.min(steps.length, i + 30)}`);
    } catch (e) {
      console.log(`  steps ${i + 1}-${i + 30}: no review (${(e as Error).message.slice(0, 80)})`);
    }
  }
  writeFileSync('out/playthrough-review.json', JSON.stringify(findings, null, 2));
  console.log(`\n${findings.length} finding(s) — replay each step before fixing:`);
  for (const f of findings) console.log(`  step ${f.step}: ${f.problem} → ${f.fix}`);
}
