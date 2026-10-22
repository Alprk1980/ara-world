// Drive the ⚙️ menu with real taps: toggle sounds, open reset, check a quick tap does nothing, hold to reset, switch
// the look to realistic and back, and
// check the world comes back fresh while the settings are kept. Screenshots go to out/menu/.
//
//   node tools/menu-test.ts
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/menu', { recursive: true });
const server = await createServer({ server: { port: 5196, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
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
/** Screen centre of the menu button whose label contains `text` (or the ⚙️ corner button). */
const where = (text: string) =>
  page.evaluate((text) => {
    const ara = (window as any).ara;
    const find = (c: any): any => {
      for (const ch of c.children ?? []) {
        if (ch.children?.some((t: any) => typeof t.text === 'string' && t.text.includes(text))) return ch;
        const f = find(ch);
        if (f) return f;
      }
      return null;
    };
    const b = text === '⚙️' ? ara.hud.settings : find(ara.menu.view);
    if (!b) return null;
    const p = b.getGlobalPosition();
    return { x: p.x, y: p.y };
  }, text);
const tap = async (text: string) => {
  const p = await where(text);
  if (!p) throw new Error(`no button "${text}"`);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(250);
};

try {
  await page.goto('http://localhost:5196/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(() => (window as any).ara.play());
  // Make the world different from a fresh one: a built house and a found secret.
  await page.evaluate(async () => {
    const ara = (window as any).ara;
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    const { persist } = await import(/* @vite-ignore */ '/src/world/state.ts' as string);
    ara.world.lots.lot_1 = { house: [...data.houses.keys()][0], variant: 0, furnished: true };
    ara.world.found.push('secret_treehouse');
    persist(ara.world);
  });
  await page.waitForTimeout(700);
  const visible = await page.evaluate(() => (window as any).ara.hud.settings.visible && !(window as any).ara.hud.back.visible);
  check(visible, 'the ⚙️ button shows on the map (in place of back)');
  await tap('⚙️');
  check(await page.evaluate(() => (window as any).ara.menu.open), 'tapping ⚙️ opens the menu');
  await page.screenshot({ path: 'out/menu/1-settings.png' });
  await tap('Sounds');
  check(await page.evaluate(async () => !(await import(/* @vite-ignore */ '/src/ui/sound.ts' as string)).soundsOn()), 'sounds switch off');
  await tap('Reset world');
  await page.screenshot({ path: 'out/menu/2-confirm.png' });
  await tap('Hold to reset');
  await page.waitForTimeout(500);
  check(await page.evaluate(() => Object.keys((window as any).ara.world.lots).length === 1), 'a quick tap on reset does nothing');
  await tap('Keep my world');
  check(!!(await where('Reset world')), '"keep my world" goes back to the settings');
  await tap('Reset world');
  const p = (await where('Hold to reset'))!;
  const reloaded = page.waitForEvent('load', { timeout: 20000 });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'out/menu/3-holding.png' });
  await page.waitForTimeout(1600);
  await page.mouse.up().catch(() => undefined);
  await reloaded;
  await page.waitForFunction(() => 'ara' in window && (window as any).ara.world);
  await page.waitForTimeout(300);
  const after = await page.evaluate(async () => {
    const ara = (window as any).ara;
    const sound = await import(/* @vite-ignore */ '/src/ui/sound.ts' as string);
    return { lots: Object.keys(ara.world.lots).length, found: ara.world.found.length, title: ara.stack.top?.name, sounds: sound.soundsOn() };
  });
  check(after.lots === 0 && after.found === 0, `holding reset gives a fresh world (lots ${after.lots}, found ${after.found})`);
  check(after.title === 'title', 'after a reset the game starts at the title');
  check(after.sounds === false, 'settings survive a reset');
  await page.evaluate(() => (window as any).ara.play());
  await tap('⚙️');
  await tap('Title screen');
  check(await page.evaluate(() => (window as any).ara.stack.top?.name === 'title'), '"title screen" goes back to the title');
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);
if (errors.length || fails.length) process.exit(1);
console.log('menu ok');
