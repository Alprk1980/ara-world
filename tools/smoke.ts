// Headless run of the real app in Chromium at tablet size: title → map → a place → corner buttons.
// Screenshots go to out/smoke/. Fails on any page error.
//
//   node tools/smoke.ts            (starts its own vite dev server)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/smoke', { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, hasTouch: true, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push((e.stack ?? e.message).split('\n').slice(0, 6).join('\n')));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const shot = async (name: string) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `out/smoke/${name}.png` });
  console.log(`  📸 ${name}`);
};
type Ara = { play(): void; openPlace(id: string): void; create(): void; build(): void; back(): void; peopleBar: { toggle(): void }; world: { lots: Record<string, unknown> }; stack: { top?: { name: string } } };
// Run fn(window.ara, arg) in the page.
const ara = <T>(fn: (a: Ara, arg?: never) => T, arg?: unknown) =>
  page.evaluate(([src, x]) => new Function('a', 'arg', `return (${src})(a, arg)`)((window as unknown as { ara: unknown }).ara, x), [fn.toString(), arg] as const) as Promise<T>;

try {
  await page.goto('http://localhost:5199/');
  await page.waitForFunction(() => 'ara' in window);
  await shot('1-title');
  await ara((a) => a.play());
  await shot('2-map');
  const firstPlace = await page.evaluate(async () => {
    const m = (await import(/* @vite-ignore */ '/src/data/index.ts' as string)) as { places: Map<string, unknown> };
    return [...m.places.keys()][0] ?? null;
  });
  if (firstPlace) {
    await ara((a, id) => a.openPlace(id!), firstPlace);
    await shot('3-place');
    await ara((a) => a.peopleBar.toggle());
    await shot('4-people-bar');
    await ara((a) => a.peopleBar.toggle());
  }
  await ara((a) => a.create());
  await shot('5-creator');
  await ara((a) => a.back());
  // Back out to the town map: there the hammer builds a house (in a place it is build mode).
  await ara((a) => a.back());
  await ara((a) => a.build());
  await shot('6-builder');
  // Pick lot 1 and see the house list, then build the first house furnished and go in.
  await page.evaluate(() => {
    const b = (window as any).ara.stack.top;
    b.lot = 'lot_1';
    b.step();
  });
  await shot('7-house-picker');
  await page.evaluate(async () => {
    const ara = (window as any).ara;
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    const house = [...data.houses.keys()][0];
    if (!house) return;
    const b = ara.stack.top;
    b.pick = { house, variant: 0 };
    b.done(true);
  });
  await shot('8-house-inside');
  await ara((a) => a.back());
  await shot('9-map-with-house');
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.log(`page errors:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('smoke ok');
