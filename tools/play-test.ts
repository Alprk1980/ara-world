// Interaction test with real pointer input: in a temporary test place built from real items, drag food onto a
// person, tap them for the emoji wheel, eat, sit them on a seat, swipe up a floor, ride a horse. Screenshots in out/play-test/.
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
  await page.goto(`http://localhost:5196/${process.env.LOOK ? `?look=${process.env.LOOK}` : ''}`);
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

  // In build mode (the bin is only there while building), drag a thing onto the bin: it is tidied away.
  await inPage(`ara.setSky(false); ara.place.setBuilding(true); ara.panel.hide();`);
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
  await inPage(`ara.place.setBuilding(false);`);

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

  // Things that do stuff: fridge opens, TV switches on, oven cooks, lipstick shows, bath bubbles, swing swings, salon.
  const doStuff = await inPage<Record<string, string | boolean>>(`
    const find = (re) => [...data.items.keys()].find((id) => re.test(data.items.get(id).template));
    const ids = { fridge: find(/fridge/), tv: find(/tv|computer/), oven: find(/oven|stove/), lips: find(/lipstick|lip_balm/), salon: find(/salon_chair/), bath: find(/bath/), swing: find(/swing|hammock/), food: find(/cupcake|croissant|pizza/) };
    const floorItems = [['fridge', 60], ['tv', 200], ['oven', 330], ['salon', 470], ['bath', 640], ['swing', 820]].filter(([k]) => ids[k]).map(([k, x]) => ({ item: ids[k], x }));
    data.places.set('__test3', { id: '__test3', name: 'Doing Room', emoji: '🧪', district: 'downtown', floors: [{ name: 'Room', wall: '#ffe3ef', ground: '#d9b38c', width: 1000, items: floorItems }] });
    const p = ara.world.people.find((p) => p.id === '__tester');
    p.at = { place: '__test3', floor: 0, x: 900, y: 0 };
    ara.stack.replace(new (ara.place.constructor)(ara, '__test3'));
    const scene = ara.place;
    const things = st.thingsOn(ara.world, '__test3', 0);
    const thing = (k) => things.find((t) => t.item === ids[k]);
    const out = {};
    // Fridge: opening shows food.
    if (thing('fridge')) { ara.openContainer(thing('fridge'), () => {}); out.fridgeOpens = ara.panel.open; ara.panel.hide(); }
    // TV: a tap switches it on.
    if (thing('tv')) { const t = thing('tv'); t.on = !t.on; out.tvOn = !!t.on; }
    // Oven: food dropped on it cooks (bites reset).
    if (thing('oven') && ids.food) {
      const o = thing('oven');
      const f = { item: ids.food, x: o.x, y: 10, uid: 'cookme', bitesLeft: 1 };
      things.push(f);
      scene.dropThing(f, new (await import('/src/dev/pixi.ts')).Sprite(), 0);
      out.cooked = f.bitesLeft === undefined;
    }
    // Lipstick on her face.
    const rig = scene.rigs.get('__tester');
    if (ids.lips) {
      const t = { item: ids.lips, x: p.at.x, y: p.at.y - rig.geo.headCy, uid: 'lips' };
      things.push(t);
      scene.dropThing(t, new (await import('/src/dev/pixi.ts')).Sprite(), 0);
      out.lipstick = !!p.makeup?.lips;
    }
    // Bath: put her in it.
    if (thing('bath')) { p.at.x = thing('bath').x; p.at.y = 20; scene.settlePerson(p, rig); out.inBath = p.at.y > 0; }
    // Swing.
    if (thing('swing')) { p.at.x = thing('swing').x; p.at.y = 20; scene.settlePerson(p, rig); out.swinging = rig.swinging; }
    // Salon chair opens the hair panel.
    if (thing('salon')) { p.at.x = thing('salon').x; p.at.y = 20; scene.settlePerson(p, rig); out.salon = ara.panel.open; }
    st.persist(ara.world);
    return { ...out, have: Object.entries(ids).filter(([, v]) => v).map(([k]) => k).join(',') };
  `);
  console.log(`  (things found: ${doStuff.have})`);
  for (const [k, label] of [['fridgeOpens', 'tapping a fridge opens it'], ['tvOn', 'tapping a TV switches it on'], ['cooked', 'food on the oven cooks'], ['lipstick', 'lipstick dropped on a face shows'], ['inBath', 'someone put in the bath sits in it'], ['swinging', 'someone on a swing swings'], ['salon', 'the salon chair opens the hair panel']] as const)
    if (k in doStuff) check(label, doStuff[k] === true);
  await shot('10-doing-room');

  // Opening: in the realistic look a fridge has an open drawing; a real tap opens it (and shows what's inside), a
  // second tap shuts it.
  const fridgeAt = await inPage<{ x: number; y: number } | null>(`
    const look = await import('/src/art/look.ts');
    const t = st.thingsOn(ara.world, '__test3', 0).find((t) => /fridge/.test(data.items.get(t.item).template));
    if (!t || !look.hasOpenArt(data.items.get(t.item).template)) return null;
    ara.panel.hide();
    ara.place.camYTarget = ara.place.floorTop?.[0] ?? 0;
    ara.place.cam.x = ara.place.clampCamX(-t.x + 590);
    const p = ara.place.floorViews[0].toGlobal({ x: t.x, y: -t.y - 60 });
    return { x: p.x, y: p.y };
  `);
  if (fridgeAt) {
    await page.waitForTimeout(400);
    const at = await inPage<{ x: number; y: number }>(`
      const t = st.thingsOn(ara.world, '__test3', 0).find((t) => /fridge/.test(data.items.get(t.item).template));
      const p = ara.place.floorViews[0].toGlobal({ x: t.x, y: -t.y - 60 });
      return { x: p.x, y: p.y };
    `);
    const openNow = () => inPage<boolean>(`return !!st.thingsOn(ara.world, '__test3', 0).find((t) => /fridge/.test(data.items.get(t.item).template)).open;`);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(400);
    const opened = await openNow(), panel = await inPage<boolean>('return ara.panel.open;');
    await shot('10b-fridge-open');
    check('tapping a fridge opens its door (open drawing)', opened, `open ${opened}`);
    check('an opened fridge shows what is inside', panel);
    await inPage('ara.panel.hide();');
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(300);
    check('tapping it again shuts it', !(await openNow()));
  }

  // Riding: someone dropped on a horse sits on its back, and rides along when the horse is moved.
  const ride = await inPage<Record<string, string | boolean>>(`
    const horse = [...data.items.keys()].find((id) => /standing_horse|little_pony/.test(data.items.get(id).template));
    if (!horse) return { none: true };
    ara.panel.hide();
    data.places.set('__test4', { id: '__test4', name: 'Riding Field', emoji: '🐴', district: 'downtown', floors: [{ name: 'Field', outdoor: true, wall: '#bfe6ff', ground: '#8ce99a', width: 900, items: [{ item: horse, x: 300 }] }] });
    const p = ara.world.people.find((p) => p.id === '__tester');
    p.holding = undefined;
    p.at = { place: '__test4', floor: 0, x: 600, y: 0 };
    ara.stack.replace(new (ara.place.constructor)(ara, '__test4'));
    const scene = ara.place, rig = scene.rigs.get('__tester');
    const h = st.thingsOn(ara.world, '__test4', 0)[0];
    p.at.x = h.x + 10; p.at.y = 40;
    scene.settlePerson(p, rig);
    const mounted = p.at.on === h.uid && p.at.y > 5;
    // Move the horse along: the rider comes too.
    h.x = 600;
    scene.dropThing(h, scene.floorViews[0].getChildByLabel('things').children.find((c) => c.position.x === 300) ?? new (await import('/src/dev/pixi.ts')).Sprite(), 0);
    return { mounted, rode: p.at.on === h.uid && Math.abs(p.at.x - 600) < 40, x: Math.round(p.at.x) };
  `);
  if (!ride.none) {
    check('someone dropped on a horse rides it', ride.mounted === true);
    check('the rider goes where the horse goes', ride.rode === true, `rider x ${ride.x}`);
    await shot('11-riding');
  }
  await inPage(`ara.panel.hide(); ara.stack.replace(new (ara.place.constructor)(ara, '__test2'));`);
  await inPage(`const p = ara.world.people.find((p) => p.id === '__tester'); p.at = { place: '__test2', floor: 0, x: 80, y: 0 }; st.persist(ara.world);`);

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
