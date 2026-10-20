// What each place looks like on the town map, built from the kit in map-buildings.ts.
import type { MapDesign } from './map-buildings.ts';

/** Always drawn as open-air plots: rides, pools, pitches, the zoo, the slopes, beaches and gardens. */
export const OPEN = new Set(['theme_park', 'rollercoaster_place', 'waterpark', 'pools', 'zoo', 'football_stadium', 'snowboarding_place', 'secret_beach', 'secret_garden', 'secret_pet_garden', 'secret_candy_cave']);

export const DESIGNS: Record<string, MapDesign> = {
  // Town square
  post_office: { body: 'shop', wall: '#fff3e0', roof: '#e03131', trim: '#e03131', floors: 2, extras: ['awning', 'clock', 'flag', 'postbox'], sign: 'POST' },
  bus_station: { body: 'shelter', wall: '#2f9e8f', roof: '#1c7ed6' },
  police_station: { body: 'shop', wall: '#e7f0ff', roof: '#1c4e8a', trim: '#1c7ed6', floors: 2, extras: ['checker', 'siren', 'flag', 'benches'], sign: 'POLICE' },
  restaurant: { body: 'shop', wall: '#ffe8cc', roof: '#c4502a', trim: '#e03131', top: 'gable', extras: ['awning', 'chimney', 'smoke', 'patio'], prop: '🍝' },
  places_to_eat: { body: 'stalls', wall: '#ff8fb8', roof: '#4dabf7', trim: '#ffd43b' },
  fire_station: { body: 'hall', wall: '#d9534f', roof: '#7a2a28', trim: '#e03131', extras: ['garage', 'hosetower', 'siren', 'flag'], sign: 'FIRE' },
  pub: { body: 'house', wall: '#fff6e6', roof: '#4a3b35', trim: '#2f6b3a', extras: ['beams', 'chimney', 'smoke', 'flowers', 'benches'], sign: 'PUB' },
  offices: { body: 'tower', wall: '#5c7cfa', roof: '#364fc7', floors: 4, extras: ['glass', 'antenna', 'rooftrees'] },
  // High street
  cafe: { body: 'shop', wall: '#f3e1c7', roof: '#8a5a3c', trim: '#8a5a3c', extras: ['awning', 'patio', 'flowers'], prop: '☕' },
  sweets_shop: { body: 'shop', wall: '#ffffff', roof: '#ff8fb8', trim: '#ff8fb8', extras: ['stripes', 'awning'], prop: '🍭' },
  toy_shop: { body: 'shop', wall: '#ffe066', roof: '#4dabf7', trim: '#ff6b6b', top: 'hip', windows: 'round', extras: ['bunting', 'awning'], prop: '🧸' },
  pet_shop: { body: 'shop', wall: '#d3f9d8', roof: '#2f9e44', trim: '#2f9e44', extras: ['awning', 'kennel'], prop: '🐶' },
  paint_shop: { body: 'shop', wall: '#ffffff', roof: '#7048e8', trim: '#7048e8', extras: ['splashes', 'awning'], prop: '🎨' },
  eye_opticians: { body: 'shop', wall: '#e3fafc', roof: '#1098ad', trim: '#1098ad', floors: 2, windows: 'round', extras: ['awning'], prop: '👓' },
  hair_dressers: { body: 'shop', wall: '#f3d9fa', roof: '#9c36b5', trim: '#cc5de8', floors: 2, extras: ['awning', 'barberpole'], prop: '✂️' },
  makeup_shop: { body: 'shop', wall: '#fff0f6', roof: '#d6336c', trim: '#f06595', top: 'hip', extras: ['stripes', 'awning'], prop: '💄' },
  school_shopping_place: { body: 'shop', wall: '#fff4e6', roof: '#f76707', trim: '#1c7ed6', floors: 2, extras: ['awning', 'bunting'], prop: '🎒' },
  supermarket: { body: 'hall', wall: '#ebfbee', roof: '#2b8a3e', trim: '#2b8a3e', extras: ['glass', 'trolleys'], sign: 'MARKET' },
  malls: { body: 'hall', wall: '#f8f0fc', roof: '#ae3ec9', trim: '#e64980', floors: 2, extras: ['atrium', 'bunting', 'flowers'], sign: 'MALL' },
  // Travel
  train_station: { body: 'station', wall: '#c4704a', roof: '#3d4a5c', trim: '#2f9e8f' },
  airport: { body: 'terminal', wall: '#e9ecef', roof: '#5c7cfa', trim: '#5c7cfa' },
  hotels: { body: 'tower', wall: '#fff3bf', roof: '#e8590c', trim: '#e8590c', floors: 4, extras: ['balconies', 'pool', 'flag'], sign: 'HOTEL' },
  // School and care
  school: { body: 'hall', wall: '#f4a582', roof: '#8a3b2a', trim: '#1c7ed6', floors: 2, extras: ['belltower', 'clock', 'flag'], sign: 'SCHOOL' },
  daycare: { body: 'house', wall: '#fff9db', roof: '#ff6b6b', trim: '#4dabf7', windows: 'round', extras: ['rainbow', 'flowers'] },
  hospital: { body: 'tower', wall: '#ffffff', roof: '#adb5bd', trim: '#e03131', floors: 2, size: 1.15, extras: ['cross', 'helipad'] },
  old_people_home: { body: 'bungalow', wall: '#fff0e6', roof: '#a0522d', trim: '#2f9e44', extras: ['sunroom', 'flowers', 'benches'] },
  vets: { body: 'house', wall: '#e6fcf5', roof: '#0ca678', trim: '#0ca678', extras: ['cross', 'kennel'], prop: '🐾' },
  // Countryside and wild side
  stables: { body: 'barn', wall: '#c92a2a', roof: '#5c3d2e', extras: ['weathervane', 'haybales', 'fence'] },
  aquarium: { body: 'dome', wall: '#1c7ed6', roof: '#74c0fc', trim: '#ffd43b', extras: ['fishes'] },
  // Homes by the shore
  mansion: { body: 'mansion', wall: '#fff8e1', roof: '#5f3dc4', trim: '#ffd43b', extras: ['columns', 'flowers'] },
  beach_house: { body: 'stilts', wall: '#d0ebff', roof: '#1c7ed6', trim: '#ff922b', windows: 'round', extras: ['palm', 'surfboard'] },
  // Fun Land
  sports_arena: { body: 'arena', wall: '#dee2e6', roof: '#495057', trim: '#f03e3e' },
  halloween_house: { body: 'house', wall: '#9775fa', roof: '#3d2457', trim: '#ff9f43', floors: 2, windows: 'tall', extras: ['witchtower', 'bats', 'pumpkins'] },
  // Secret places (shown once found)
  secret_mansion: { body: 'castle', wall: '#adb5bd', roof: '#343a40', trim: '#7048e8', extras: ['ivy', 'bats'] },
  secret_beach_house: { body: 'stilts', wall: '#fff0f6', roof: '#f06595', trim: '#20c997', windows: 'round', extras: ['palm', 'flag'] },
  secret_treehouse: { body: 'treehouse', wall: '#c9a27a', roof: '#c4502a', trim: '#ff8fb8' },
  starry_observatory: { body: 'observatory', wall: '#e9ecef', roof: '#91a7ff', trim: '#4263eb', extras: ['stars'] },
  // In the clouds
  kingdom_in_the_clouds: { body: 'castle', wall: '#fff0f6', roof: '#fcc419', trim: '#f783ac', floors: 2, extras: ['stars'] },
  cloud_swing_set: { body: 'swings', wall: '#ffffff', roof: '#74c0fc', trim: '#ff8fb8' },
};

const DISTRICT: Record<string, MapDesign> = {
  homes: { body: 'house', wall: '#ffe3ef', roof: '#e05a7a' },
  downtown: { body: 'shop', wall: '#e3f0ff', roof: '#3a6ea5', extras: ['awning'] },
  shopping: { body: 'shop', wall: '#fff3d6', roof: '#ff9f43', trim: '#ff9f43', extras: ['awning'] },
  fun: { body: 'shop', wall: '#f1e9ff', roof: '#b197fc', trim: '#ff8fb8', extras: ['bunting'] },
  nature: { body: 'house', wall: '#e6fff2', roof: '#3fa66b' },
  travel: { body: 'hall', wall: '#e3f6ff', roof: '#2f9e8f' },
  care: { body: 'house', wall: '#fff0f0', roof: '#ff6b6b', extras: ['flowers'] },
  sky: { body: 'castle', wall: '#ffffff', roof: '#ffd36e' },
};

/** A place's design, or a building in its district's colours for places without one yet. */
export function designFor(placeId: string, district: string, emoji: string, floors: number): MapDesign {
  return DESIGNS[placeId] ?? { ...(DISTRICT[district] ?? DISTRICT.downtown), floors: Math.min(3, floors), prop: emoji };
}

/** A built house on a lot: the body follows the blueprint's style, the colours its exterior. */
export function houseDesign(style: string, ex: { walls: string; roof: string; door: string }, floors: number): MapDesign {
  const base = { wall: ex.walls, roof: ex.roof, trim: ex.door, floors: Math.min(3, floors) };
  switch (style) {
    case 'mansion': return { ...base, body: 'mansion', floors: 1, extras: ['columns', 'flowers'] };
    case 'castle': return { ...base, body: 'castle', floors: Math.min(2, floors) };
    case 'beach': return { ...base, body: 'stilts', windows: 'round', extras: ['palm'] };
    case 'modern': return { ...base, body: 'shop', top: 'flat', extras: ['glass', 'rooftrees'] };
    case 'apartment': return { ...base, body: 'tower', floors: Math.min(3, floors), extras: ['balconies'] };
    case 'cabin': return { ...base, body: 'house', extras: ['beams', 'chimney', 'smoke'] };
    case 'farmhouse': return { ...base, body: 'house', extras: ['chimney', 'haybales'] };
    case 'treehouse': return { ...base, body: 'treehouse', roof: ex.roof };
    case 'spooky_cute': return { ...base, body: 'house', windows: 'tall', extras: ['witchtower', 'pumpkins', 'bats'] };
    default: return { ...base, body: 'house', extras: ['chimney', 'flowers'] };
  }
}
