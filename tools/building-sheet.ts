// Every map building (place designs and house styles) on one sheet, by day and by night, to judge the looks.
//
//   node tools/building-sheet.ts        -> out/buildings-day.png, out/buildings-night.png
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out', { recursive: true });
const server = await createServer({ server: { port: 5198, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1500 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5198/');
  await page.waitForFunction(() => 'ara' in window);
  for (const night of [false, true]) {
    const n = await page.evaluate(async (night) => {
      const imp = (p: string) => import(/* @vite-ignore */ p);
      const { Container, Graphics, Text } = await imp('/src/dev/pixi.ts');
      const { drawBuilding, designErrors } = await imp('/src/ui/map-buildings.ts');
      const { DESIGNS, houseDesign } = await imp('/src/ui/map-designs.ts');
      const app = (window as any).ara.app;
      app.stage.children.filter((c: any) => c.label === 'sheet').forEach((c: any) => c.destroy({ children: true }));
      const sheet = new Container();
      sheet.label = 'sheet';
      sheet.addChild(new Graphics().rect(0, 0, 1800, 1500).fill(night ? 0x4a6a9a : 0x9be37a));
      const styles = ['cottage', 'modern', 'mansion', 'beach', 'cabin', 'castle', 'apartment', 'farmhouse', 'treehouse', 'spooky_cute'];
      const list: [string, any][] = [
        ...Object.entries(DESIGNS),
        ...styles.map((s) => [`house: ${s}`, houseDesign(s, { walls: '#ffe3ef', roof: '#c2557a', door: '#7fd1c7' }, 2)] as [string, any]),
      ];
      const cols = 9, cw = 200, ch = 270;
      list.forEach(([id, d], i) => {
        const x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + ch - 50;
        const tile = new Graphics().poly([x, y - 48, x + 96, y, x, y + 48, x - 96, y]).fill(night ? 0x5a7aaa : 0xa8e889);
        const { c } = drawBuilding(d, night);
        c.position.set(x, y);
        const errs = designErrors(d);
        const t = new Text({ text: errs.length ? `${id}\n${errs.join('\n')}` : id, style: { fontSize: 13, fill: errs.length ? 0xc00000 : 0x222222, align: 'center' } });
        t.anchor.set(0.5, 0);
        t.position.set(x, y + 34);
        sheet.addChild(tile, c, t);
      });
      app.stage.addChild(sheet);
      return list.length;
    }, night);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `out/buildings-${night ? 'night' : 'day'}.png` });
    console.log(`${n} buildings -> out/buildings-${night ? 'night' : 'day'}.png`);
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log(`errors: ${errors.join(' | ')}`);
