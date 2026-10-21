// Build mode in places, with real mouse drags: furniture is locked while playing (small things still move), the 🔨
// unlocks everything and opens the catalogue, things can be added and binned, and ✅ locks the room again.
// Screenshots go to out/build/.
//
//   node tools/build-test.ts
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/build', { recursive: true });
const server = await createServer({ server: { port: 5191, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
const errors: string[] = [];
const fails: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) fails.push(what);
};
const PLACE = 'cafe';
/** A thing of one of these categories that is on screen, with a point to grab it by. */
const find = (cats: string[]) =>
  page.evaluate(async (cats) => {
    const ara = (window as any).ara;
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    const scene = ara.stack.top;
    const floor = scene.floorIndex;
    const layer = scene.floorViews[floor].getChildByLabel('things');
    for (const s of layer.children) {
      const t = scene.game.world.layouts[`${scene.placeId}:${floor}`]?.find((x: any) => Math.abs(x.x - s.x) < 0.01 && Math.abs(-x.y - s.y) < 0.01);
      if (!t || !cats.includes(data.categoryOf(t.item))) continue;
      const b = s.getBounds();
      const x = b.x + b.width / 2, y = b.y + b.height * 0.6;
      if (x > 260 && x < 1100 && y > 150 && y < 760) return { uid: t.uid, x, y, tx: t.x };
    }
    return null;
  }, cats);
const xOf = (uid: string) => page.evaluate((uid) => {
  const s = (window as any).ara.stack.top;
  return s.game.world.layouts[`${s.placeId}:${s.floorIndex}`].find((t: any) => t.uid === uid)?.x ?? null;
}, uid);
const drag = async (x: number, y: number, dx: number, dy = 0) => {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await page.mouse.up();
  await page.waitForTimeout(250);
};
const tapHammer = async () => {
  const p = await page.evaluate(() => (window as any).ara.hud.build.getGlobalPosition());
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(300);
};

try {
  await page.goto('http://localhost:5191/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate((id) => {
    const a = (window as any).ara;
    a.play();
    a.openPlace(id);
  }, PLACE);
  await page.waitForTimeout(800);
  const furn = await find(['furniture', 'decor']);
  const food = await find(['food', 'drink', 'toy']);
  check(!!furn && !!food, `the ${PLACE} has furniture and something small on screen`);
  if (!furn || !food) throw new Error('nothing to test with');

  await drag(furn.x, furn.y, -160);
  check((await xOf(furn.uid)) === furn.tx, 'while playing, furniture stays where it is');
  check(await page.evaluate(() => (window as any).ara.toast.view.visible), 'trying to move it says to tap 🔨');
  await drag(food.x, food.y, 120);
  check((await xOf(food.uid)) !== food.tx, 'small things still move while playing');
  check(await page.evaluate(() => !(window as any).ara.stack.top.bin.visible), 'no bin while playing');

  await tapHammer();
  const state = await page.evaluate(() => {
    const a = (window as any).ara;
    return { building: a.stack.top.building, panel: a.panel.open, glyph: a.hud.build.children[1].text };
  });
  check(state.building && state.panel && state.glyph === '✅', 'the 🔨 turns on build mode, opens the catalogue and shows ✅');
  await page.screenshot({ path: 'out/build/1-build-mode.png' });

  const furn2 = await find(['furniture', 'decor']);
  if (furn2) {
    await drag(furn2.x, furn2.y, -140);
    check((await xOf(furn2.uid)) !== furn2.tx, 'in build mode furniture moves');
  } else check(false, 'furniture still on screen beside the catalogue');

  const before = await page.evaluate(() => {
    const s = (window as any).ara.stack.top;
    return s.game.world.layouts[`${s.placeId}:${s.floorIndex}`].length;
  });
  const sizes = await page.evaluate(async () => {
    const { CATALOGUE } = await import(/* @vite-ignore */ '/src/world/place-scene.ts' as string);
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    return CATALOGUE.map((c: any) => [...data.items.values()].filter((it: any) => c.cats.includes(data.categoryOf(it.id))).length);
  });
  check(sizes.every((n: number) => n > 20), `every catalogue tab has lots to choose from (${sizes.join(', ')})`);
  // Tap the first thing in the catalogue grid.
  const cell = await page.evaluate(() => {
    const grid = (window as any).ara.panel.grid.view;
    const b = grid.getBounds();
    return { x: b.x + 60, y: b.y + 60 };
  });
  await page.mouse.click(cell.x, cell.y);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const s = (window as any).ara.stack.top;
    const list = s.game.world.layouts[`${s.placeId}:${s.floorIndex}`];
    return { n: list.length, uid: list.at(-1).uid };
  });
  check(after.n === before + 1, 'tapping something in the catalogue puts it in the room');
  await page.screenshot({ path: 'out/build/2-added.png' });

  // Drag the new thing onto the bin.
  const added = await page.evaluate((uid) => {
    const s = (window as any).ara.stack.top;
    const layer = s.floorViews[s.floorIndex].getChildByLabel('things');
    const t = s.game.world.layouts[`${s.placeId}:${s.floorIndex}`].find((x: any) => x.uid === uid);
    const sp = layer.children.find((c: any) => Math.abs(c.x - t.x) < 0.01 && Math.abs(c.y + t.y) < 0.01);
    const b = sp.getBounds();
    return { x: b.x + b.width / 2, y: b.y + b.height * 0.6, bin: s.bin.getGlobalPosition() };
  }, after.uid);
  await page.mouse.move(added.x, added.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(added.x + ((added.bin.x - added.x) * i) / 10, added.y + ((added.bin.y - added.y) * i) / 10);
  await page.mouse.up();
  await page.waitForTimeout(300);
  check(await page.evaluate((uid) => {
    const s = (window as any).ara.stack.top;
    return !s.game.world.layouts[`${s.placeId}:${s.floorIndex}`].some((t: any) => t.uid === uid);
  }, after.uid), 'in build mode things can be binned');

  await tapHammer();
  const off = await page.evaluate(() => {
    const a = (window as any).ara;
    return { building: a.stack.top.building, panel: a.panel.open, glyph: a.hud.build.children[1].text };
  });
  check(!off.building && !off.panel && off.glyph === '🔨', 'tapping ✅ locks the room again');
  const furn3 = await find(['furniture', 'decor']);
  if (furn3) {
    await drag(furn3.x, furn3.y, 150);
    check((await xOf(furn3.uid)) === furn3.tx, 'and furniture is locked again');
  }
  // On the map the hammer still builds houses.
  await page.evaluate(() => (window as any).ara.back());
  await page.waitForTimeout(300);
  await tapHammer();
  check(await page.evaluate(() => (window as any).ara.stack.top.name === 'builder'), 'on the map the hammer still builds houses');
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);
if (errors.length || fails.length) process.exit(1);
console.log('build ok');
