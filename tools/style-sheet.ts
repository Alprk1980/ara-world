// Today's look next to the realistic samples (prompts/style-real.json), one pair per category, plus people drawn in
// both styles, rendered by the real game renderer.
//
//   node tools/style-sheet.ts      -> out/style/compare.png (and compare-people.png)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/style', { recursive: true });
const samples = JSON.parse(readFileSync('prompts/style-real.json', 'utf8'));
const server = await createServer({ server: { port: 5193, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1500 }, deviceScaleFactor: 2 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5193/');
  await page.waitForFunction(() => 'ara' in window);
  await page.evaluate(async (samples) => {
    const imp = (p: string) => import(/* @vite-ignore */ p);
    const { Container, Graphics, Text } = await imp('/src/dev/pixi.ts');
    const data = await imp('/src/data/index.ts');
    const { templateThumb } = await imp('/src/ui/creator.ts');
    for (const t of samples.templates) data.templates.set(t.id, t);
    for (const it of samples.items) data.items.set(it.id, it);
    const app = (window as any).ara.app;
    const sheet = new Container();
    sheet.addChild(new Graphics().rect(0, 0, 1600, 1500).fill(0xfff6f9));
    const cols = 6, cw = 1600 / cols, ch = 245;
    samples.items.forEach((real: any, i: number) => {
      const cat = data.templates.get(real.template).category;
      const now = [...data.items.values()].find((it: any) => data.templates.get(it.template)?.category === cat && !it.id.startsWith('real_'));
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
      sheet.addChild(new Graphics().roundRect(x + 6, y + 6, cw - 12, ch - 12, 16).fill(0xffffff).stroke({ color: 0xe8d0dc, width: 2 }));
      if (now) {
        const a = templateThumb(now.template, now.palette, 120);
        a.position.set(x + cw * 0.27, y + 100);
        sheet.addChild(a);
      }
      const b = templateThumb(real.template, real.palette, 150);
      b.position.set(x + cw * 0.7, y + 100);
      const t = new Text({ text: `${cat}: today → realistic`, style: { fontSize: 15, fill: 0x5a3d4f, fontFamily: 'Fredoka, sans-serif' } });
      t.anchor.set(0.5, 0);
      t.position.set(x + cw / 2, y + ch - 46);
      sheet.addChild(b, t);
    });
    // People: the same two in today's look (today's clothes) and the realistic look (the realistic clothes).
    const { Rig } = await imp('/src/world/rig.ts');
    const first = (cat: string) => [...data.items.values()].find((it: any) => data.templates.get(it.template)?.category === cat && !it.id.startsWith('real_'))?.id;
    const cuteHair = [...data.templates.values()].find((t: any) => t.category === 'hair' && !t.id.startsWith('real_'))?.id;
    const people = [
      { age: 'kid', skin: '#f1c7a5', eyes: '#3a6ea5', hair: '#6b4226', real: { top: 'real_tshirt', bottom: 'real_jeans', socks: 'real_socks', shoes: 'real_sneakers' }, cute: { top: first('top'), bottom: first('bottom'), socks: first('socks'), shoes: first('shoes') } },
      { age: 'teen', skin: '#c68863', eyes: '#3fa66b', hair: '#2b1d14', real: { dress: 'real_sundress', hat: 'real_sun_hat', glasses: 'real_glasses', bag: 'real_backpack', socks: 'real_socks', shoes: 'real_sneakers' }, cute: { dress: first('dress'), hat: first('hat'), glasses: first('glasses'), bag: first('bag'), socks: first('socks'), shoes: first('shoes') } },
    ];
    const y0 = 1000;
    sheet.addChild(new Graphics().roundRect(6, y0 + 6, 1588, 488, 16).fill(0xffffff).stroke({ color: 0xe8d0dc, width: 2 }));
    people.forEach((pp, i) => {
      for (const style of ['cute', 'real']) {
        const person = { kind: 'person', id: `p${i}${style}`, name: 'x', age: pp.age, skin: pp.skin, eyes: pp.eyes, hair: { template: style === 'real' ? 'real_long_hair' : cuteHair, colour: pp.hair }, outfit: style === 'real' ? pp.real : pp.cute };
        const rig = new Rig(person, style);
        const k = 400 / 100;
        rig.scale.set(k);
        rig.position.set(200 + i * 800 + (style === 'real' ? 380 : 0), y0 + 460);
        const t = new Text({ text: style === 'real' ? 'realistic' : 'today', style: { fontSize: 18, fill: 0x5a3d4f, fontFamily: 'Fredoka, sans-serif' } });
        t.anchor.set(0.5, 0);
        t.position.set(rig.x, y0 + 466);
        sheet.addChild(rig, t);
      }
    });
    app.stage.addChild(sheet);
  }, samples);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'out/style/compare.png' });
  await page.screenshot({ path: 'out/style/people.png', clip: { x: 0, y: 1000, width: 1600, height: 500 } });
  await page.screenshot({ path: 'out/style/faces.png', clip: { x: 500, y: 1100, width: 1400, height: 400 } });
  console.log('-> out/style/compare.png');
  // Qwen's realistic trials (prompts/style-real-qwen.json): each drawing in its own colours, and a person wearing
  // the clothes among them.
  const qwen = existsSync('prompts/style-real-qwen.json') ? JSON.parse(readFileSync('prompts/style-real-qwen.json', 'utf8')) : [];
  if (qwen.length) {
    await page.setViewportSize({ width: 1600, height: 560 });
    await page.evaluate(async (qwen) => {
      const imp = (p: string) => import(/* @vite-ignore */ p);
      const { Container, Graphics, Text } = await imp('/src/dev/pixi.ts');
      const data = await imp('/src/data/index.ts');
      const { templateThumb } = await imp('/src/ui/creator.ts');
      const { Rig } = await imp('/src/world/rig.ts');
      const app = (window as any).ara.app;
      // Only this panel shows in the screenshot.
      for (const c of app.stage.children) c.visible = false;
      const sheet = new Container();
      sheet.label = 'qwen';
      sheet.addChild(new Graphics().rect(0, 0, 1600, 560).fill(0xfff6f9));
      const wear: Record<string, string> = {};
      qwen.forEach((t: any, i: number) => {
        data.templates.set(t.id, t);
        data.items.set(t.id, { id: t.id, name: t.name, template: t.id, palette: t.palette, tags: ['shop'] });
        if (['top', 'bottom', 'dress', 'shoes', 'socks', 'hat', 'glasses', 'bag'].includes(t.category)) wear[t.category] = t.id;
        const x = 20 + i * 250;
        sheet.addChild(new Graphics().roundRect(x, 20, 236, 280, 16).fill(0xffffff).stroke({ color: 0xe8d0dc, width: 2 }));
        const th = templateThumb(t.id, t.palette, 200);
        th.position.set(x + 118, 140);
        const label = new Text({ text: `Qwen: ${t.name}`, style: { fontSize: 16, fill: 0x5a3d4f, fontFamily: 'Fredoka, sans-serif' } });
        label.anchor.set(0.5, 0);
        label.position.set(x + 118, 262);
        sheet.addChild(th, label);
      });
      if (Object.keys(wear).length) {
        const outfit: Record<string, string> = { shoes: 'real_sneakers', ...wear };
        if (outfit.dress) delete outfit.bottom;
        const person = { kind: 'person', id: 'q', name: 'q', age: 'kid', skin: '#f1c7a5', eyes: '#3a6ea5', hair: { template: 'real_long_hair', colour: '#6b4226' }, outfit };
        const rig = new Rig(person, 'real');
        rig.scale.set(3.4);
        rig.position.set(20 + qwen.length * 250 + 160, 520);
        const label = new Text({ text: "wearing Qwen's clothes", style: { fontSize: 16, fill: 0x5a3d4f, fontFamily: 'Fredoka, sans-serif' } });
        label.anchor.set(0.5, 0);
        label.position.set(rig.x, 528);
        sheet.addChild(rig, label);
      }
      app.stage.addChild(sheet);
    }, qwen);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'out/style/qwen.png' });
    console.log(`-> out/style/qwen.png (${qwen.length} from Qwen)`);
    // Hairstyles on people: Claude's long hair first, then each of Qwen's, in different colours and outfits.
    const hairs = ['real_long_hair', ...qwen.filter((t: any) => t.category === 'hair').map((t: any) => t.id)];
    if (hairs.length > 1) {
      await page.setViewportSize({ width: Math.max(1000, hairs.length * 260 + 40), height: 520 });
      await page.evaluate(async (hairs) => {
        const imp = (p: string) => import(/* @vite-ignore */ p);
        const { Container, Graphics, Text } = await imp('/src/dev/pixi.ts');
        const data = await imp('/src/data/index.ts');
        const { Rig } = await imp('/src/world/rig.ts');
        const app = (window as any).ara.app;
        for (const c of app.stage.children) c.visible = false;
        const sheet = new Container();
        sheet.addChild(new Graphics().rect(0, 0, hairs.length * 260 + 40, 520).fill(0xfff6f9));
        const colours = ['#6b4226', '#2b1d14', '#e8c07d', '#d94f2b', '#8b5e3c', '#3a2a2a', '#c68642'];
        const skins = ['#f1c7a5', '#c68863', '#8d5535', '#efb995'];
        const outfits = [{ top: 'real_tshirt', bottom: 'real_jeans', shoes: 'real_sneakers' }, { dress: 'real_sundress', socks: 'real_socks', shoes: 'real_sneakers' }];
        hairs.forEach((h: string, i: number) => {
          const person = { kind: 'person', id: `h${i}`, name: 'h', age: i % 2 ? 'teen' : 'kid', skin: skins[i % skins.length], eyes: '#3a6ea5', hair: { template: h, colour: colours[i % colours.length] }, outfit: outfits[i % 2] };
          const rig = new Rig(person, 'real');
          rig.scale.set(3.8);
          rig.position.set(150 + i * 260, 440);
          const name = data.templates.get(h)?.name ?? h;
          const t = new Text({ text: `${i ? 'Qwen' : 'Claude'}: ${name}`, style: { fontSize: 16, fill: 0x5a3d4f, fontFamily: 'Fredoka, sans-serif' } });
          t.anchor.set(0.5, 0);
          t.position.set(rig.x, 456);
          sheet.addChild(rig, t);
        });
        app.stage.addChild(sheet);
      }, hairs);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'out/style/hair.png' });
      console.log(`-> out/style/hair.png (${hairs.length - 1} hairstyles from Qwen)`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log(`errors: ${errors.join(' | ')}`);
