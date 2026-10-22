// Screenshots of chosen floors, for checking backdrops and things in them.
//
//   node tools/place-shots.ts hospital:0 zoo:1 ...   -> out/places/<id>-<floor>.png
//   node tools/place-shots.ts house=six_floor_house:3   (a house blueprint, built furnished on a spare lot)
//   (night=1 for night time)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const wanted = process.argv.slice(2).map((a) => a.split(':')).map(([id, f]) => [id, Number(f ?? 0)] as const);
mkdirSync('out/places', { recursive: true });
const server = await createServer({ server: { port: 5193, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5193/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(() => (window as any).ara.play());
  if (process.env.night) await page.evaluate(() => (window as any).ara.setSky(true));
  for (const [id, floor] of wanted) {
    await page.evaluate(([pid, f]) => {
      const ara = (window as any).ara;
      while (ara.stack.depth > 2) ara.stack.pop();
      if (pid.startsWith('house=')) {
        ara.world.lots.lot_shot = { house: pid.slice(6), variant: 0, furnished: true };
        for (const k of Object.keys(ara.world.layouts)) if (k.startsWith('lot_shot:')) delete ara.world.layouts[k];
        ara.openPlace('lot_shot');
      } else ara.openPlace(pid);
      ara.place.goFloor(f);
    }, [id, floor] as const);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `out/places/${id.replace('house=', '')}-${floor}${process.env.night ? '-night' : ''}.png` });
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? `errors: ${errors.join(' | ')}` : `${wanted.length} shots in out/places/`);
