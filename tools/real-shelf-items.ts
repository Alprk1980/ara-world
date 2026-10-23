// Colourways for the shelf units and the small things for shelves (by Claude, in place of Qwen): three each, in
// real-world colours, checked with itemErrors and merged into items.json. Re-running replaces them.
//
//   node tools/real-shelf-items.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { itemErrors, type Item } from '../schemas/item.ts';
import type { Template } from '../schemas/template.ts';
import { FILES } from './kinds.ts';

type Way = [suffix: string, name: string, main: string, trim: string, accent: string, outline: string];
const sets: [template: string, tags: string[], ways: Way[]][] = [
  // shelf units
  ['wall_plank_shelf', ['wall', 'living', 'bedroom', 'kitchen'], [['oak', 'Oak Wall Shelf', '#c9a06a', '#3a3a3a', '#8a6a44', '#6b4a2a'], ['white', 'White Wall Shelf', '#f2efe8', '#9a9a9a', '#d8d2c4', '#8a857a'], ['walnut', 'Walnut Wall Shelf', '#6e4a2e', '#2e2e2e', '#9a7250', '#3e2818']]],
  ['wall_double_shelf', ['wall', 'living', 'bedroom', 'kids_room'], [['pine', 'Pine Hanging Shelf', '#d9b27c', '#b88a52', '#efd9b0', '#7a5630'], ['white', 'White Hanging Shelf', '#f4f1ea', '#d6d0c2', '#ffffff', '#8a857a'], ['sage', 'Sage Hanging Shelf', '#9db59a', '#7d9a7a', '#d9e4d2', '#4e6a4c']]],
  ['tall_open_bookcase', ['living', 'bedroom', 'school', 'office'], [['oak', 'Oak Bookcase', '#c49a6c', '#a87b4f', '#e8d3b0', '#5e4026'], ['white', 'White Bookcase', '#f2efe8', '#d8d2c4', '#ffffff', '#8a857a'], ['walnut', 'Walnut Bookcase', '#6e4a2e', '#553823', '#9a7250', '#33200f']]],
  ['shop_shelving_unit', ['shop', 'supermarket', 'toys', 'sweets'], [['steel', 'Steel Shop Shelves', '#c7ccd1', '#8f979e', '#e8ecef', '#4f565c'], ['white', 'White Shop Shelves', '#f1f1ee', '#c9c9c4', '#ffffff', '#7d7d78'], ['black', 'Black Shop Shelves', '#3c3f43', '#24272a', '#6b7075', '#16181a']]],
  ['low_display_cabinet', ['living', 'shop', 'salon', 'hotel'], [['oak', 'Oak Display Cabinet', '#c49a6c', '#a87b4f', '#e8d3b0', '#5e4026'], ['cream', 'Cream Display Cabinet', '#efe6d2', '#d6c8a8', '#c9a227', '#857858'], ['cherry', 'Cherry Display Cabinet', '#8c3f2a', '#6e2e1e', '#c98a5a', '#401a10']]],
  ['ladder_shelf', ['living', 'bedroom', 'teen_room', 'salon'], [['natural', 'Natural Ladder Shelf', '#d4b088', '#a87b4f', '#efd9b0', '#6b4a2a'], ['black', 'Black Ladder Shelf', '#b48a5e', '#2e2e2e', '#d8c09a', '#1e1e1e'], ['white', 'White Ladder Shelf', '#f2efe8', '#e2ddd2', '#ffffff', '#8a857a']]],
  ['glass_display_shelf', ['salon', 'makeup', 'shop', 'mall'], [['chrome', 'Chrome Glass Shelves', '#cfd6dc', '#9aa3ab', '#eef2f5', '#56606a'], ['gold', 'Gold Glass Shelves', '#d9b45a', '#a8853a', '#f2e2b0', '#6e5420'], ['black', 'Black Glass Shelves', '#3a3d42', '#24272a', '#7a8088', '#141618']]],
  ['cube_storage_shelf', ['kids_room', 'bedroom', 'living', 'nursery'], [['oak', 'Oak Cube Shelf', '#c49a6c', '#a87b4f', '#e8d3b0', '#5e4026'], ['white', 'White Cube Shelf', '#f2efe8', '#ddd7ca', '#ffffff', '#8a857a'], ['grey', 'Grey Cube Shelf', '#9a9d9f', '#7d8082', '#c6c8c9', '#4a4c4e']]],
  // small things for shelves
  ['small_flower_vase', ['living', 'bedroom', 'cafe', 'hotel', 'cosy'], [['pink', 'Pink Flower Vase', '#f06a8a', '#4f8f3a', '#f7c948', '#7a2f45'], ['yellow', 'Yellow Flower Vase', '#f7d046', '#4f8f3a', '#e07a2c', '#8a6a14'], ['white', 'White Flower Vase', '#f7f4ee', '#4f8f3a', '#f2c94c', '#8a8378']]],
  ['photo_frame_stand', ['living', 'bedroom', 'office', 'cosy'], [['wood', 'Wooden Photo Frame', '#b08850', '#6aa84f', '#ffd23f', '#5e4520'], ['silver', 'Silver Photo Frame', '#c9ced3', '#6aa84f', '#ffd23f', '#5c6268'], ['white', 'White Photo Frame', '#f2efe8', '#6aa84f', '#ffd23f', '#8a857a']]],
  ['trophy_cup', ['sport', 'football', 'school', 'kids_room'], [['gold', 'Gold Trophy', '#e0b13a', '#3b2f2a', '#d9d4c7', '#8a6414'], ['silver', 'Silver Trophy', '#c9ced3', '#2e2e2e', '#e8e4da', '#5c6268'], ['bronze', 'Bronze Trophy', '#b87333', '#3b2f2a', '#d9d4c7', '#6e4218']]],
  ['snow_globe', ['kids_room', 'bedroom', 'toys', 'living'], [['red', 'Snow Globe', '#7a4a2a', '#c0392b', '#ffd27a', '#3e2414'], ['blue', 'Blue House Snow Globe', '#3a3a3a', '#3a6ea5', '#ffd27a', '#1e1e1e'], ['gold', 'Golden Snow Globe', '#c9a227', '#8c3f2a', '#ffe08a', '#6e5414']]],
  ['candle_jar', ['bedroom', 'bathroom', 'living', 'cosy'], [['vanilla', 'Vanilla Candle', '#f3e6d0', '#8fae9a', '#ffb347', '#7a6a55'], ['lavender', 'Lavender Candle', '#d9c8e8', '#7a5fa0', '#ffb347', '#6a5880'], ['rose', 'Rose Candle', '#f4c6cc', '#b8505e', '#ffb347', '#8a5a60']]],
  ['book_stack', ['living', 'school', 'bedroom', 'office'], [['classic', 'Stack of Books', '#8b2e2e', '#2e5e8b', '#c9a227', '#3a1e1e'], ['green', 'Green Book Stack', '#3e6b48', '#a8553a', '#e0c070', '#1e3a24'], ['pastel', 'Pastel Book Stack', '#e8a6b6', '#8ab8d8', '#f2d27a', '#7a4a58']]],
  ['sweet_jar', ['sweets', 'kitchen', 'cafe', 'kids_room'], [['red', 'Sweet Jar', '#e84a5f', '#ffd23f', '#5bc0be', '#7a2430'], ['blue', 'Blue Lid Sweet Jar', '#3a7bd5', '#f28cb1', '#9be15d', '#1e3e6e'], ['pink', 'Pink Lid Sweet Jar', '#f28cb1', '#ffffff', '#a66cff', '#8a3e60']]],
  ['cat_ornament', ['living', 'bedroom', 'elder', 'cosy'], [['white', 'China Cat', '#f7f4ee', '#e8a6a6', '#3a6ea5', '#8a8378'], ['black', 'Black China Cat', '#3a3a3e', '#e8a6a6', '#c9a227', '#141416'], ['ginger', 'Ginger China Cat', '#e8a160', '#f4c6c6', '#3e8a5a', '#8a5426']]],
  ['desk_globe', ['school', 'office', 'kids_room', 'living'], [['blue', 'Desk Globe', '#3f7cbf', '#7fb069', '#c9a227', '#1f3f66'], ['antique', 'Antique Globe', '#d8c49a', '#a8804a', '#8a6414', '#6e5430'], ['dark', 'Dark Sea Globe', '#22355a', '#c9a227', '#d0d4d8', '#0e1a30']]],
  ['music_box', ['bedroom', 'kids_room', 'toys', 'cosy'], [['wood', 'Music Box', '#8b5a2b', '#e8b4c8', '#d4af37', '#4a2e14'], ['pink', 'Pink Music Box', '#e8a6c0', '#ffffff', '#d4af37', '#8a4a66'], ['blue', 'Blue Music Box', '#7fa8d8', '#f2d0e0', '#d0d4d8', '#3a5a80']]],
  ['piggy_bank', ['kids_room', 'bedroom', 'toys', 'shop'], [['pink', 'Piggy Bank', '#f4a7b9', '#e88aa0', '#ffd23f', '#a8556a'], ['blue', 'Blue Piggy Bank', '#9cc4e8', '#7aa8d4', '#ffd23f', '#4a6e90'], ['gold', 'Gold Piggy Bank', '#e0b13a', '#c9962a', '#f2e2b0', '#8a6414']]],
  ['fairy_light_jar', ['bedroom', 'teen_room', 'garden', 'cosy'], [['warm', 'Fairy Light Jar', '#b8b8b8', '#c9a97a', '#ffd56b', '#5a5a5a'], ['gold', 'Gold Lid Light Jar', '#d4af37', '#e8d8b8', '#ffe08a', '#6e5414'], ['pink', 'Pink Light Jar', '#e8a6c0', '#ffffff', '#ffb0d0', '#8a4a66']]],
  ['succulent_pot', ['living', 'bedroom', 'office', 'garden'], [['sage', 'Succulent', '#7fae8a', '#c8693f', '#e3a0a8', '#3f5e48'], ['blue', 'Blue Succulent', '#8ab0b8', '#f2efe8', '#d8a0c8', '#45606a'], ['jade', 'Jade Succulent', '#5a9a52', '#3a3a3a', '#d06a5a', '#2e5a2a']]],
  // fittings for places that lacked their own (tools/real-fittings.ts)
  ['fire_extinguisher', ['fire_station', 'school', 'office', 'hotel'], [['red', 'Fire Extinguisher', '#d62828', '#2b2b2b', '#e9c46a', '#6b1010'], ['dark_red', 'Fire Extinguisher', '#b81d24', '#2b2b2b', '#c9ced3', '#5a0e10'], ['bright', 'Fire Extinguisher', '#e63946', '#3a3a3a', '#e9c46a', '#7a1a20']]],
  ['departure_board', ['wall', 'airport', 'station'], [['black', 'Departure Board', '#1f2430', '#f2c14e', '#4caf50', '#0d1016'], ['blue', 'Blue Departure Board', '#1e3a5f', '#ffffff', '#f2c14e', '#0e1e30'], ['grey', 'Grey Departure Board', '#3a3f45', '#f29e4e', '#7fd1c7', '#1c1f22']]],
  ['drip_stand', ['hospital', 'vet'], [['steel', 'Drip Stand', '#c9d1d8', '#9aa4ad', '#bfe6ff', '#4f5a63'], ['white', 'White Drip Stand', '#eef1f4', '#b8c0c8', '#ffd6e0', '#6a737c'], ['blue', 'Blue Drip Stand', '#b8c8d8', '#8a9cae', '#d6f0c8', '#4a5a6a']]],
  ['pet_scale', ['vet', 'pet_shop', 'pet'], [['grey', 'Pet Scale', '#d8dee4', '#7a8794', '#7fe0a0', '#4a545e'], ['blue', 'Blue Pet Scale', '#cfe0ef', '#5a7a9a', '#7fe0a0', '#3a5068'], ['white', 'White Pet Scale', '#f2f4f6', '#9aa4ae', '#ffb86b', '#6a747e']]],
  ['freezer_chest', ['supermarket', 'shop', 'cafe'], [['white', 'Chest Freezer', '#f2f5f7', '#3a7bd5', '#ffd166', '#6a7680'], ['red', 'Ice Cream Freezer', '#f2f5f7', '#e63946', '#ffd166', '#6a7680'], ['green', 'Green Freezer', '#eef4f0', '#2a9d8f', '#f4a261', '#5e6e66']]],
  // home basics (tools/real-home.ts)
  ['tv_stand', ['living', 'bedroom', 'teen_room', 'hotel'], [['oak', 'TV', '#8a5a36', '#2b2b2e', '#5bc0eb', '#3e2614'], ['white', 'TV on White Stand', '#f2efe8', '#2b2b2e', '#5bc0eb', '#8a857a'], ['grey', 'TV on Grey Stand', '#7d8082', '#1e1e20', '#ff6b6b', '#3a3c3e']]],
  ['wardrobe', ['bedroom', 'kids_room', 'teen_room', 'hotel'], [['oak', 'Oak Wardrobe', '#c49a6c', '#a87b4f', '#d4af37', '#5e4026'], ['white', 'White Wardrobe', '#f2efe8', '#ddd7ca', '#c9ced3', '#8a857a'], ['pink', 'Pink Wardrobe', '#f0c4cf', '#e0a6b4', '#ffffff', '#8a5a66']]],
  ['kitchen_cooker', ['kitchen', 'restaurant', 'cafe'], [['white', 'Cooker', '#eef0f2', '#3a3d42', '#c9ced3', '#6a737c'], ['steel', 'Steel Cooker', '#c9ced3', '#2e3034', '#eef0f2', '#55595e'], ['cream', 'Cream Cooker', '#efe4cc', '#4a3a2a', '#c9a227', '#857858']]],
  ['kitchen_sink_counter', ['kitchen', 'cafe', 'restaurant'], [['white', 'Kitchen Sink', '#f2efe8', '#7a6a58', '#c9ced3', '#6a6458'], ['sage', 'Sage Kitchen Sink', '#a8bfa4', '#e8e4dc', '#c9ced3', '#4e6a4c'], ['navy', 'Navy Kitchen Sink', '#3e5470', '#d8d2c4', '#d4af37', '#1e2a3a']]],
  ['toilet', ['bathroom', 'hotel', 'school'], [['white', 'Toilet', '#f6f6f4', '#d8dcdf', '#c9ced3', '#8a9096'], ['cream', 'Cream Toilet', '#f2ebdc', '#e0d6c2', '#d4af37', '#8a8270'], ['white_wood', 'Toilet with Wood Seat', '#f6f6f4', '#b88a5a', '#c9ced3', '#8a9096']]],
  ['bathroom_sink', ['bathroom', 'hotel', 'salon'], [['white', 'Bathroom Sink', '#f6f6f4', '#d8dcdf', '#c9ced3', '#8a9096'], ['cream', 'Cream Bathroom Sink', '#f2ebdc', '#e0d6c2', '#d4af37', '#8a8270'], ['blue', 'Blue Bathroom Sink', '#dfeaf2', '#c4d6e4', '#c9ced3', '#6a7e8e']]],
  ['dressing_table', ['bedroom', 'teen_room', 'salon', 'makeup'], [['cream', 'Dressing Table', '#f2e6dc', '#d4b090', '#d4af37', '#7a6450'], ['white', 'White Dressing Table', '#f6f4f0', '#d8d2c4', '#c9ced3', '#8a857a'], ['pink', 'Pink Dressing Table', '#f4cdd6', '#e0a6b4', '#d4af37', '#8a5a66']]],
  ['bedside_table', ['bedroom', 'kids_room', 'hotel', 'teen_room'], [['oak', 'Bedside Table', '#b88a5a', '#9a6e42', '#d4af37', '#5a3e22'], ['white', 'White Bedside Table', '#f2efe8', '#ddd7ca', '#c9ced3', '#8a857a'], ['walnut', 'Walnut Bedside Table', '#6e4a2e', '#553823', '#d4af37', '#33200f']]],
  ['living_rug', ['living', 'bedroom', 'kids_room', 'cosy'], [['red', 'Patterned Rug', '#c8553d', '#f2d0a4', '#2e4057', '#6a2a1e'], ['blue', 'Blue Rug', '#3e6a8a', '#e8dcc4', '#c8553d', '#1e3a50'], ['pink', 'Pink Rug', '#e8a6b6', '#fbeff2', '#8a5a9a', '#8a4a5a']]],
  ['perfume_bottle', ['makeup', 'salon', 'bedroom', 'mall'], [['pink', 'Pink Perfume', '#f2a0c0', '#d4af37', '#e8c6e0', '#7a3f5c'], ['amber', 'Amber Perfume', '#e8a040', '#2e2e2e', '#f2d8a8', '#7a4e14'], ['lilac', 'Lilac Perfume', '#b89ad8', '#d0d4d8', '#e8dcf4', '#5a4278']]],
];

const items = JSON.parse(readFileSync(FILES.item, 'utf8')) as Item[];
const templates = new Map((JSON.parse(readFileSync(FILES.template, 'utf8')) as Template[]).map((t) => [t.id, t]));
const mine = new Set(sets.map(([t]) => t));
const kept = items.filter((i) => !mine.has(i.template));
const made: Item[] = sets.flatMap(([template, tags, ways]) => ways.map(([suf, name, main, trim, accent, outline]) =>
  ({ id: `${template}_${suf}`, name, template, palette: { main, trim, accent, outline }, tags })));
const errors = made.flatMap((i) => itemErrors(i, [...kept, ...made], templates));
if (errors.length) {
  console.log(errors.join('\n'));
  process.exit(1);
}
writeFileSync(FILES.item, `${JSON.stringify([...kept, ...made], null, 2)}\n`);
console.log(`${made.length} colourways for ${sets.length} templates merged (${kept.length + made.length} items in all)`);
