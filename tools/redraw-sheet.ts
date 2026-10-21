// Qwen's realistic redraws (src/data/templates-real.json): a grid of every drawing in its own colours, and people in
// the blocky realistic body wearing the redrawn clothes.
//
//   node tools/redraw-sheet.ts   -> out/style/redraws.png, out/style/redraw-people.png
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/style', { recursive: true });
const redraws = JSON.parse(readFileSync('src/data/templates-real.json', 'utf8'));
const server = await createServer({ server: { port: 5192, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const cols = 14, cell = 128;
const rows = Math.ceil(redraws.length / cols);
const page = await browser.newPage({ viewport: { width: cols * cell, height: rows * cell + 20 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5192/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(async ({ redraws, cols, cell }) => {
    const imp = (p: string) => import(/* @vite-ignore */ p);
    const { Container, Graphics, Text } = await imp('/src/dev/pixi.ts');
    const data = await imp('/src/data/index.ts');
    const { templateThumb } = await imp('/src/ui/creator.ts');
    const app = (window as any).ara.app;
    for (const c of app.stage.children) c.visible = false;
    const sheet = new Container();
    sheet.label = 'grid';
    sheet.addChild(new Graphics().rect(0, 0, cols * cell, Math.ceil(redraws.length / cols) * cell + 20).fill(0xfff6f9));
    redraws.forEach((t: any, i: number) => {
      const id = `redraw__${t.id}`;
      data.templates.set(id, { ...t, id });
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      sheet.addChild(new Graphics().roundRect(x + 3, y + 3, cell - 6, cell - 6, 10).fill(0xffffff));
      const th = templateThumb(id, t.palette, cell - 30);
      th.position.set(x + cell / 2, y + cell / 2 - 8);
      const label = new Text({ text: t.name.slice(0, 18), style: { fontSize: 11, fill: 0x5a3d4f } });
      label.anchor.set(0.5, 0);
      label.position.set(x + cell / 2, y + cell - 20);
      sheet.addChild(th, label);
    });
    app.stage.addChild(sheet);
  }, { redraws, cols, cell });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'out/style/redraws.png' });
  // People wearing the redrawn clothes, each in that item's own colours.
  await page.setViewportSize({ width: 1800, height: 1000 });
  const samples = JSON.parse(readFileSync('prompts/style-real.json', 'utf8'));
  const trials = JSON.parse(readFileSync('prompts/style-real-qwen.json', 'utf8'));
  await page.evaluate(async ({ redraws, samples, trials }) => {
    const imp = (p: string) => import(/* @vite-ignore */ p);
    const { Container, Graphics } = await imp('/src/dev/pixi.ts');
    const data = await imp('/src/data/index.ts');
    // Hair: Claude's sample and Qwen's trial hairstyles.
    for (const t of [...samples.templates, ...trials]) data.templates.set(t.id, t);
    const { Rig } = await imp('/src/world/rig.ts');
    const app = (window as any).ara.app;
    for (const c of app.stage.children) c.visible = false;
    const by: Record<string, string[]> = {};
    for (const t of redraws) {
      const id = `redraw__${t.id}`;
      data.items.set(id, { id, name: t.name, template: id, palette: t.palette, tags: ['shop'] });
      (by[t.category] ??= []).push(id);
    }
    const pick = (cat: string, i: number) => (by[cat]?.length ? by[cat][i % by[cat].length] : undefined);
    const sheet = new Container();
    sheet.addChild(new Graphics().rect(0, 0, 1800, 1000).fill(0xfff6f9));
    const hairs = ['real_long_hair', ...trials.filter((t: any) => t.category === 'hair').map((t: any) => t.id)], skins = ['#f1c7a5', '#c68863', '#8d5535', '#efb995'], hairCol = ['#6b4226', '#2b1d14', '#e8c07d', '#d94f2b'];
    for (let i = 0; i < 16; i++) {
      const dress = i % 3 === 2;
      const outfit: Record<string, string | undefined> = dress ? { dress: pick('dress', i), socks: pick('socks', i), shoes: pick('shoes', i), hat: i % 2 ? pick('hat', i) : undefined, bag: pick('bag', i) } : { top: pick('top', i), bottom: pick('bottom', i), shoes: pick('shoes', i + 3), glasses: i % 4 === 1 ? pick('glasses', i) : undefined, hat: i % 4 === 3 ? pick('hat', i + 5) : undefined };
      for (const k of Object.keys(outfit)) if (!outfit[k]) delete outfit[k];
      const person = { kind: 'person', id: `r${i}`, name: 'r', age: ['kid', 'teen', 'adult'][i % 3], skin: skins[i % 4], eyes: '#3a6ea5', hair: { template: hairs[i % hairs.length], colour: hairCol[i % 4] }, outfit };
      const rig = new Rig(person, 'real');
      rig.scale.set(3.6);
      rig.position.set(110 + (i % 8) * 220, i < 8 ? 470 : 960);
      sheet.addChild(rig);
    }
    app.stage.addChild(sheet);
  }, { redraws, samples, trials });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'out/style/redraw-people.png' });
  console.log(`${redraws.length} redraws -> out/style/redraws.png, out/style/redraw-people.png`);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log(`errors: ${errors.join(' | ')}`);
