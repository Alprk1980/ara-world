// Screenshots of the town map: the whole island zoomed out, and a close view, by day and by night.
//   node tools/map-shot.ts
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/map', { recursive: true });
const server = await createServer({ server: { port: 5195, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5195/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(() => (window as any).ara.play());
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'out/map/close.png' });
  await page.evaluate(() => {
    const m = (window as any).ara.stack.top;
    m.setZoom(0.3, { x: 590, y: 410 });
    m.world.position.set(590 - m.world.getLocalBounds().x * 0.3 - (m.world.getLocalBounds().width * 0.3) / 2, 60);
    m.clamp();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'out/map/whole.png' });
  await page.evaluate(() => (window as any).ara.setSky(true));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'out/map/night.png' });
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? `errors: ${errors.join(' | ')}` : 'map shots in out/map/');
