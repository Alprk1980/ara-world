// Interaction test with real pointer input: in a temporary test place built from real items, drag food onto a
// person, tap them for the emoji wheel, eat, sit them on a seat, swipe up a floor. Screenshots in out/play-test/.
// The test place lives only in the page; nothing is written to src/data.
//
//   node tools/play-test.ts
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';

mkdirSync('out/play-test', { recursive: true });
const server = await createServer({ server: { port: 5196, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page: Page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push((e.stack ?? e.message).split('\n').slice(0, 4).join('\n')));
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, detail = '') => {
  results.push([name, ok, detail]);
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const shot = async (name: string) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `out/play-test/${name}.png` });
};
// Run code in the page with access to the game and data modules.
const inPage = <T>(src: string): Promise<T> =>
  page.evaluate(async (code) => {
    const data = await import(/* @vite-ignore */ '/src/data/index.ts' as string);
    const st = await import(/* @vite-ignore */ '/src/world/state.ts' as string);
    const ara = (window as any).ara;
    return new Function('ara', 'data', 'st', `return (async () => { ${code} })()`)(ara, data, st);
  }, src) as Promise<T>;
const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
  await page.mouse.up();
  await page.waitForTimeout(150);
};

try {
  await page.goto('http://localhost:5196/');
  await page.waitForFunction(() => 'ara' in window);
  // Build the test place from real items: a table (top), a seat, food, a drink, decor.
  const setup = await inPage<{ ok: boolean; picks: Record<string, string | null> }>(`
    const cat = (id) => data.categoryOf(id);
    const tmpl = (id) => data.templates.get(data.items.get(id).template);
    const all = [...data.items.keys()];
    const pick = (f) => all.find(f) ?? null;
    const picks = {
      table: pick((id) => cat(id) === 'furniture' && tmpl(id).anchors?.top),
      seat: pick((id) => tmpl(id).anchors?.seat),
      food: pick((id) => cat(id) === 'food'),
      drink: pick((id) => cat(id) === 'drink'),
      decor: pick((id) => cat(id) === 'decor' || cat(id) === 'plant'),
      top: pick((id) => cat(id) === 'top'),
      bottom: pick((id) => cat(id) === 'bottom'),
      shoes: pick((id) => cat(id) === 'shoes'),
      bed: pick((id) => /bed|cot|crib/.test(data.items.get(id).template) && tmpl(id).anchors?.seat),
      lamp: pick((id) => /lamp|light|lantern/.test(data.items.get(id).template)),
    };
    const floorItems = [picks.table && { item: picks.table, x: 120 }, picks.seat && { item: picks.seat, x: 260 }, picks.decor && { item: picks.decor, x: 380 }, picks.food && { item: picks.food, x: 470 }, picks.drink && { item: picks.drink, x: 520 }].filter(Boolean);
    data.places.set('__test', { id: '__test', name: 'Test Room', emoji: '🧪', district: 'downtown', floors: [
      { name: 'Ground', wall: '#ffe3ef', ground: '#d9b38c', width: 600, items: floorItems },
      { name: 'Upstairs', wall: '#e3f0ff', ground: '#c9d6e8', width: 600, items: [picks.bed && { item: picks.bed, x: 150 }, picks.lamp && { item: picks.lamp, x: 420 }].filter(Boolean) },
    ] });
    const hair = [...data.templates.values()].find((t) => t.category === 'hair');
    const person = { kind: 'person', id: '__tester', name: 'Tess', age: 'kid', skin: '#efb995', eyes: '#3a2a2a',
      hair: { template: hair?.id ?? '', colour: '#5a3825' }, outfit: { ...(picks.top && { top: picks.top }), ...(picks.bottom && { bottom: picks.bottom }), ...(picks.shoes && { shoes: picks.shoes }) } };
    ara.world.people.push(person);
    ara.play();
    ara.openPlace('__test');
    ara.place.placePerson(person, { x: 700, y: 700 });
    return { ok: floorItems.length >= 3, picks };
  `);
  check('test place built from real items', setup.ok, JSON.stringify(setup.picks));
  await shot('1-place');

  // Drag the food onto the person: it should go to their hand.
  const pos = await inPage<{ food: { x: number; y: number } | null; person: { x: number; y: number }; mouth: { x: number; y: number } }>(`
    const scene = ara.place;
    const things = st.thingsOn(ara.world, '__test', 0);
    const food = things.find((t) => data.categoryOf(t.item) === 'food');
    const layer = scene.floorViews[0];
    const rig = scene.rigs.get('__tester');
    const g = (x, y) => { const p = layer.toGlobal({ x, y }); return { x: p.x, y: p.y }; };
    const m = rig.mouthPos();
    return { food: food ? g(food.x, -food.y - 3) : null, person: g(rig.x, rig.y - rig.geo.height * 0.4), mouth: rig.toGlobal(m) };
  `);
  if (pos.food) {
    await drag(pos.food, pos.person);
    const holding = await inPage<string | undefined>(`return ara.world.people.find((p) => p.id === '__tester').holding;`);
    check('food dragged onto a person goes to their hand', !!holding, `holding ${holding}`);
    await shot('2-holding');
    // Tap the person: the emoji wheel opens (with an eat button while holding food).
    await page.mouse.click(pos.person.x, pos.person.y);
    const wheel = await inPage<boolean>(`return ara.emojis.open;`);
    check('tapping a person opens the emoji wheel', wheel);
    await shot('3-wheel');
    const before = await inPage<number>(`const p = ara.world.people.find((p) => p.id === '__tester'); return p.bitesLeft ?? data.items.get(p.holding)?.bites ?? 0;`);
    // The eat button is the first in the wheel when holding food.
    await inPage(`ara.emojis.view.getChildByLabel('eat').emit('pointerup', { stopPropagation() {} });`);
    await page.waitForTimeout(900);
    const after = await inPage<number>(`const p = ara.world.people.find((p) => p.id === '__tester'); return p.holding ? (p.bitesLeft ?? data.items.get(p.holding).bites) : 0;`);
    check('eating takes a bite (hand to mouth)', after < before, `bites ${before} → ${after}`);
    await shot('4-ate');
  } else check('food dragged onto a person goes to their hand', false, 'no food item exists yet');

  // Tap the person again, press 👗, pick another top: they wear it.
  await page.mouse.click(pos.person.x, pos.person.y);
  await inPage(`ara.emojis.view.getChildByLabel('dress').emit('pointerup', { stopPropagation() {} });`);
  const dressed = await inPage<{ open: boolean; before: string; options: string[] }>(`
    const p = ara.world.people.find((p) => p.id === '__tester');
    const w = await import('/src/ui/wardrobe.ts');
    return { open: ara.wardrobe.open, before: p.outfit.top ?? '', options: w.clothesFor('top', p.age) };
  `);
  check('👗 opens the wardrobe', dressed.open);
  const other = dressed.options.find((o) => o !== dressed.before);
  if (other) {
    const now = await inPage<string>(`
      const p = ara.world.people.find((p) => p.id === '__tester');
      const w = await import('/src/ui/wardrobe.ts');
      w.wear(p, 'top', '${other}');
      ara.place.rigs.get('__tester').draw();
      return p.outfit.top;
    `);
    check('picking clothes in the wardrobe dresses them', now === other, `${dressed.before} → ${now}`);
  }
  await shot('4b-wardrobe');
  await inPage(`ara.wardrobe.hide();`);

  // Drag the person onto the seat: they should sit at seat height.
  const seat = await inPage<{ seat: { x: number; y: number } | null; person: { x: number; y: number } }>(`
    const scene = ara.place;
    const things = st.thingsOn(ara.world, '__test', 0);
    const s = things.find((t) => data.templates.get(data.items.get(t.item).template).anchors?.seat);
    const layer = scene.floorViews[0];
    const rig = scene.rigs.get('__tester');
    const g = (x, y) => { const p = layer.toGlobal({ x, y }); return { x: p.x, y: p.y }; };
    return { seat: s ? g(s.x, -40) : null, person: g(rig.x, rig.y - rig.geo.height * 0.4) };
  `);
  if (seat.seat) {
    await drag(seat.person, seat.seat);
    const y = await inPage<number>(`return ara.world.people.find((p) => p.id === '__tester').at.y;`);
    check('a person dropped on a seat sits on it', y > 0, `y ${y.toFixed(1)}`);
    await shot('5-sitting');
  }

  // Swipe up on empty floor: go to the next floor.
  await drag({ x: 1000, y: 300 }, { x: 1000, y: 600 });
  await page.waitForTimeout(700);
  const floor = await inPage<number>(`return ara.place.floorIndex;`);
  check('swiping changes floor', floor === 1, `floor ${floor}`);
  await shot('6-upstairs');

  // Tap a thing: it bounces and stays where it is.
  const isLamp = `(t) => /lamp|light|lantern/.test(data.items.get(t.item).template)`;
  const lamp = await inPage<{ x: number; y: number; before: number } | null>(`
    const t = st.thingsOn(ara.world, '__test', 1).find(${isLamp});
    if (!t) return null;
    const p = ara.place.floorViews[1].toGlobal({ x: t.x, y: -t.y - 10 });
    return { x: p.x, y: p.y, before: t.x };
  `);
  if (lamp) {
    await page.mouse.click(lamp.x, lamp.y);
    const after = await inPage<number>(`return st.thingsOn(ara.world, '__test', 1).find(${isLamp}).x;`);
    check('tapping a thing does not move it', Math.abs(after - lamp.before) < 0.01, `x ${lamp.before} → ${after}`);
  }

  // Night: the room dims and lights glow.
  await inPage(`ara.setSky(true);`);
  const glow = await inPage<boolean>(`return !!ara.place.floorViews[1].getChildByLabel('glows');`);
  check('night dims the room and lights glow', glow);
  await shot('7-night');

  // Put Tess on the bed upstairs: she falls asleep.
  const asleep = await inPage<boolean | null>(`
    const bed = st.thingsOn(ara.world, '__test', 1).find((t) => /bed|cot|crib/.test(data.items.get(t.item).template));
    if (!bed) return null;
    const p = ara.world.people.find((p) => p.id === '__tester');
    p.at = { place: '__test', floor: 1, x: bed.x, y: 30 };
    ara.place.onSky();
    st.persist(ara.world);
    return ara.place.rigs.get('__tester').asleep;
  `);
  if (asleep !== null) check('someone put on a bed falls asleep', asleep);
  await shot('8-asleep');

  // Drag a thing onto the bin: it is tidied away.
  await inPage(`ara.setSky(false);`);
  const binTest = await inPage<{ from: { x: number; y: number }; bin: { x: number; y: number }; n: number } | null>(`
    const scene = ara.place;
    const things = st.thingsOn(ara.world, '__test', 1);
    const t = things[things.length - 1];
    if (!t) return null;
    const p = scene.floorViews[1].toGlobal({ x: t.x, y: -t.y - 8 });
    return { from: { x: p.x, y: p.y }, bin: { x: scene.bin.x, y: scene.bin.y }, n: things.length };
  `);
  if (binTest) {
    await drag(binTest.from, binTest.bin);
    const n = await inPage<number>(`return st.thingsOn(ara.world, '__test', 1).length;`);
    check('dropping a thing on the bin tidies it away', n === binTest.n - 1, `${binTest.n} → ${n} things`);
  }

  // Get on a vehicle: pick a destination and go there.
  const travelled = await inPage<string>(`
    data.places.set('__test2', { id: '__test2', name: 'Test Park', emoji: '🌳', district: 'nature', floors: [{ name: 'Park', outdoor: true, wall: '#bfe6ff', ground: '#8ce99a', width: 500, items: [] }] });
    const p = ara.world.people.find((p) => p.id === '__tester');
    ara.travel(p, '🚌');
    if (!ara.travelPicker.open) return 'picker did not open';
    ara.travelPicker.pending.go('__test2');
    await new Promise((r) => setTimeout(r, 300));
    return ara.place?.placeId + ' / ' + p.at?.place;
  `);
  check('travelling takes them (and you) to the new place', travelled === '__test2 / __test2', travelled);
  await shot('9-travelled');

  // Close and reopen: the world is still there.
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => 'ara' in window && !!(window as any).ara.world);
  const kept = await inPage<string>(`const p = ara.world.people.find((p) => p.id === '__tester'); return p ? p.at?.place + ' floor ' + p.at?.floor + ', night ' + ara.world.sky.night : 'gone';`);
  check('the world is saved across a reload', kept === '__test2 floor 0, night false', kept);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) check('no page errors', false, errors.join(' | '));
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
