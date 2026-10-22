// Render people wearing every hair (and the clothes that exist) in the real game renderer, to judge fit.
//
//   node tools/rig-sheet.ts [--out out/rigs.png] [--slot hair|top|bottom|dress|socks|shoes|hat|glasses|bag] [--heads]
//   (--heads: close-ups of the head, for hats, hair and glasses)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const opt = (n: string, f: string) => (args.includes(n) ? (args[args.indexOf(n) + 1] ?? f) : f);
const out = opt('--out', 'out/rigs.png');
const slot = opt('--slot', 'hair');
const heads = args.includes('--heads');
mkdirSync('out', { recursive: true });
const server = await createServer({ server: { port: 5197, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
try {
  await page.goto('http://localhost:5197/');
  await page.waitForFunction(() => 'ara' in window);
  const n = await page.evaluate(async ([slot, heads]) => {
    const imp = (p: string) => import(/* @vite-ignore */ p);
    const { Container, Graphics, Text } = await imp('/src/dev/pixi.ts');
    const { Rig } = await imp('/src/world/rig.ts');
    const data = await imp('/src/data/index.ts');
    const ara = (window as any).ara;
    const app = ara.app;
    const sheet = new Container();
    sheet.addChild(new Graphics().rect(0, 0, 1600, 1000).fill(0xfff6f9));
    const cat = (t: string) => data.templates.get(t)?.category;
    const options: string[] = slot === 'hair'
      ? [...data.templates.values()].filter((t: any) => t.category === 'hair').map((t: any) => t.id)
      : [...data.templates.values()].filter((t: any) => t.category === slot).map((t: any) => t.id);
    const ages = ['baby', 'toddler', 'kid', 'teen', 'adult', 'elder'];
    const skins = ['#f9cfb4', '#d99a73', '#8d5535', '#efb995'];
    const hairCols = ['#5a3825', '#e8c07d', '#2b1d14', '#d94f2b'];
    options.forEach((id: string, i: number) => {
      const age = ages[i % ages.length];
      const person: any = {
        kind: 'person', id: `p${i}`, name: id, age, skin: skins[i % skins.length], eyes: '#3a2a2a',
        hair: { template: slot === 'hair' ? id : ([...data.templates.values()].find((t: any) => t.category === 'hair') as any)?.id ?? '', colour: hairCols[i % hairCols.length] },
        outfit: {},
      };
      if (slot !== 'hair') {
        // Paint the template with a temporary item so the rig can wear it.
        const itemId = `__try_${id}`;
        data.items.set(itemId, { id: itemId, name: id, template: id, palette: { main: '#7fb8ff', trim: '#ffd36e', accent: '#ff8fb8', outline: '#3d4f7a' }, tags: ['shop'] });
        person.outfit[slot] = itemId;
      }
      void cat;
      const rig = new Rig(person);
      const cols = heads ? 8 : 8, cw = 1600 / cols, ch = heads ? 250 : 330;
      const s = heads ? 4.2 : (ch * 0.8) / 100;
      rig.scale.set(s);
      if (heads) {
        // The head in the middle of its cell, everything below cut off.
        const top = Math.floor(i / cols) * ch;
        rig.position.set((i % cols) * cw + cw / 2, top + ch * 0.55 - rig.geo.headCy * s);
        const m = new Graphics().rect((i % cols) * cw + 2, top + 2, cw - 4, ch - 34).fill(0xffffff);
        rig.mask = m;
        sheet.addChild(m);
      } else rig.position.set((i % cols) * cw + cw / 2, Math.floor(i / cols) * ch + ch - 40);
      const label = new Text({ text: `${id}\n(${age})`, style: { fontSize: 14, fill: 0x333333, align: 'center' } });
      label.anchor.set(0.5, 0);
      label.position.set(rig.x, heads ? Math.floor(i / cols) * ch + ch - 32 : rig.y + 4);
      sheet.addChild(rig, label);
    });
    app.stage.addChild(sheet);
    return options.length;
  }, [slot, heads] as const);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out });
  console.log(`${n} ${slot} options -> ${out}`);
} finally {
  await browser.close();
  await server.close();
}
