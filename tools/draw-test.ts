// Drive the 🖍️ draw pad with real mouse strokes: draw a teddy in the toy shop, make it a medium toy, and check it
// lands in the shop, passes the validators and survives a reload; then draw an animal from the map and check it
// waits in the home inbox and shows in Pets. Screenshots go to out/draw/.
//
//   node tools/draw-test.ts
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/draw', { recursive: true });
const server = await createServer({ server: { port: 5194, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
const errors: string[] = [];
const fails: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('dialog', (d) => d.accept(d.message().includes('called') ? 'Fluffy Bear' : ''));
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) fails.push(what);
};
/** Screen centre of a button in the top scene: by its pixi label, or by text it shows. */
const where = (key: string) =>
  page.evaluate((key) => {
    const find = (c: any): any => {
      for (const ch of c.children ?? []) {
        if (ch.label === key || ch.children?.some((t: any) => typeof t.text === 'string' && t.text.includes(key))) return ch;
        const f = find(ch);
        if (f) return f;
      }
      return null;
    };
    const b = find((window as any).ara.stack.top.view);
    if (!b) return null;
    const p = b.getGlobalPosition();
    return { x: p.x, y: p.y };
  }, key);
const tap = async (key: string) => {
  const p = await where(key);
  if (!p) throw new Error(`no button "${key}"`);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(200);
};
/** Draw a path on the pad; points are in 0-256 pad units. */
const stroke = async (pts: [number, number][]) => {
  const pad = await page.evaluate(() => {
    const s = (window as any).ara.stack.top;
    const p = s.pad.getGlobalPosition();
    return { x: p.x, y: p.y, side: s.side };
  });
  const at = ([x, y]: [number, number]) => [pad.x + (x / 256) * pad.side, pad.y + (y / 256) * pad.side] as const;
  await page.mouse.move(...at(pts[0]));
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(...at(p), { steps: 2 });
  await page.mouse.up();
};
const circle = (cx: number, cy: number, r: number, n = 28): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * 6.283) * r, cy + Math.sin((i / n) * 6.283) * r]);

try {
  await page.goto(`http://localhost:5194/${process.env.LOOK ? `?look=${process.env.LOOK}` : ''}`);
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(() => {
    const a = (window as any).ara;
    a.play();
    a.openPlace('toy_shop');
    a.create();
  });
  await page.waitForTimeout(500);
  await tap('🖍️ Draw');
  check(await page.evaluate(() => (window as any).ara.stack.top.name === 'draw'), 'the 🖍️ Draw tab opens the draw pad');
  await tap('Next ▶');
  check(await page.evaluate(() => (window as any).ara.stack.top.step === 'draw'), 'Next does nothing on an empty pad');
  // A teddy: fill the body and head, ears in the second pot, eyes and a smile with the pen.
  await tap('tool-fill');
  await stroke(circle(128, 165, 62));
  await stroke(circle(128, 82, 42));
  await tap('ink-trim');
  await stroke(circle(92, 46, 15));
  await stroke(circle(164, 46, 15));
  await tap('ink-outline');
  await tap('tool-pen-2');
  await stroke([[112, 78], [113, 79]]);
  await stroke([[144, 78], [145, 79]]);
  await tap('tool-pen-1');
  await stroke([[110, 100], [120, 108], [136, 108], [146, 100]]);
  await tap('ink-white');
  await tap('tool-fill');
  await stroke(circle(128, 175, 26));
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'out/draw/1-drawing.png' });
  check(await page.evaluate(() => (window as any).ara.stack.top.strokes.length === 8), 'eight strokes drawn');
  await tap('↩️ Undo');
  check(await page.evaluate(() => (window as any).ara.stack.top.strokes.length === 7), 'undo takes one away');
  await tap('Next ▶');
  await tap('🧒');
  await tap('🔤');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'out/draw/2-what-is-it.png' });
  await tap('✔ Done');
  await page.waitForTimeout(600);
  const made = await page.evaluate(async () => {
    const a = (window as any).ara;
    const { templateErrors } = await import(/* @vite-ignore */ '/schemas/template.ts' as string);
    const it = a.world.custom.at(-1), t = a.world.drawings.at(-1);
    return { name: it?.name, cat: t?.category, h: t?.size?.h, errs: t ? templateErrors(t) : ['none'], top: a.stack.top?.placeId, inShop: JSON.stringify(a.world.layouts).includes(it?.id), id: it?.id };
  });
  const fills = await page.evaluate(() => ((window as any).ara.world.drawings.at(-1)?.svg.match(/Z/g) ?? []).length);
  check(fills === 4, `the four filled shapes are in the drawing (${fills})`);
  check(made.errs.length === 0, `the drawing is a valid template${made.errs.length ? `: ${made.errs.join('; ')}` : ''}`);
  check(made.name === 'Fluffy Bear' && made.cat === 'toy' && made.h === 40, `it's a medium toy called "${made.name}" (${made.cat}, ${made.h} tall)`);
  check(made.top === 'toy_shop' && made.inShop, 'it appears in the toy shop you were in');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'out/draw/3-in-the-shop.png' });
  // It's saved: reload and it's still there.
  await page.reload();
  await page.waitForFunction(() => 'ara' in window && (window as any).ara.world);
  const kept = await page.evaluate(async (id) => {
    const a = (window as any).ara;
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    const it = data.items.get(id);
    return !!it && data.templates.has(it.template) && a.world.drawings.length === 1;
  }, made.id);
  check(kept, 'the drawing survives a reload');
  // An animal drawn from the map waits in the home inbox and shows in Pets.
  await page.evaluate(() => {
    const a = (window as any).ara;
    a.play();
    a.create();
  });
  await page.waitForTimeout(300);
  await tap('🖍️ Draw');
  await tap('tool-fill');
  await stroke(circle(128, 150, 70));
  await stroke(circle(70, 80, 30));
  await tap('Next ▶');
  await tap('🐶 Animal');
  await tap('🐱');
  await tap('✔ Done');
  await page.waitForTimeout(400);
  const pet = await page.evaluate(() => {
    const a = (window as any).ara;
    const it = a.world.custom.at(-1);
    return { inbox: a.world.inbox.includes(it.id), top: a.stack.top?.name, tags: it.tags };
  });
  check(pet.inbox && pet.top === 'map', 'drawn from the map, it waits in your home');
  await page.evaluate(() => (window as any).ara.create());
  await page.waitForTimeout(300);
  await tap('🐶 Pets');
  const inPets = await page.evaluate(() => (window as any).ara.stack.top.cells().length);
  const petsBefore = await page.evaluate(async () => {
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    return [...data.items.values()].filter((it: any) => it.tags.includes('pet') && data.templates.get(it.template)?.category === 'animal' && !it.id.startsWith('drawn_')).length;
  });
  check(inPets === petsBefore + 1, 'the drawn animal is one of the pets to choose');
  await page.screenshot({ path: 'out/draw/4-pets.png' });
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);
if (errors.length || fails.length) process.exit(1);
console.log('draw ok');
