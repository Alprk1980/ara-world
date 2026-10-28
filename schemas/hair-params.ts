// Schema for PARAMETRIC hair designs: the model describes a hairstyle as simple geometry
// (polygons + strokes), and tools/hair-compose.ts renders it into the exact house grammar
// (lump + identical url(#) shading twin + thin {{outline}} stroke + {{tokens}} palette).
// Keeping the model out of raw path/gradient syntax removes every style failure we hit doing
// whole-SVG asks: single quotes, missing gradient, thick outline, slot misses, wrong id.
export type Pt = [number, number];
export type HairLump = { fill: 'main' | 'trim' | 'accent'; grad: 'H' | 'R' | 'V' | 'L'; pts: Pt[] };
export type HairStroke = { d: 'line' | 'arc'; pts: Pt[]; tone: 'outline' | 'trim'; opacity: number };
export type HairParams = {
  id: string;
  name: string;
  category: 'hair';
  main: string; // base #rrggbb; trim/accent/outline derived by shade()
  lump: HairLump; // primary hair mass (cap / afro / bob)
  extra?: HairLump[]; // puffs, buns, tails, braids - each its own shaded lump
  strands?: HairStroke[]; // parts, strand lines, curl scallops
  sheen?: Pt[][]; // optional white shine arc(s), the house #ffffff stroke
  stubble?: number; // 0-30 clipper ticks for buzz/crop
};

const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const FILLS = ['main', 'trim', 'accent'];
const GRADS = ['H', 'R', 'V', 'L'];
const TONES = ['outline', 'trim'];
const inBox = (p: Pt) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= -40 && p[0] <= 296 && p[1] >= -40 && p[1] <= 296;

function lumpErrors(l: unknown, where: string, out: string[]): asserts l is HairLump {
  if (!l || typeof l !== 'object') { out.push(`${where}: missing lump object`); return; }
  const x = l as HairLump;
  if (!FILLS.includes(x.fill)) out.push(`${where}.fill: expected one of ${FILLS.join('|')}`);
  if (!GRADS.includes(x.grad)) out.push(`${where}.grad: expected one of ${GRADS.join('|')}`);
  if (!Array.isArray(x.pts) || x.pts.length < 6) out.push(`${where}.pts: closed shape needs >=6 [x,y] points`);
  else if (!x.pts.every((p) => Array.isArray(p) && p.length === 2 && inBox(p))) out.push(`${where}.pts: every point [x,y] in -40..296`);
}

export function hairParamsErrors(e: unknown): string[] {
  const out: string[] = [];
  const err = (m: string) => out.push(m);
  if (!e || typeof e !== 'object') { err('expected a hair-params object'); return out; }
  const p = e as HairParams;
  if (typeof p.id !== 'string' || !ID.test(p.id)) err('id: lowercase snake_case (e.g. buzz_cut_hair)');
  if (typeof p.name !== 'string' || !p.name.trim()) err('name: a short display name');
  if (p.category !== 'hair') err('category: must be "hair"');
  if (typeof p.main !== 'string' || !HEX.test(p.main)) err('main: a real-world #rrggbb base colour');
  lumpErrors(p.lump, 'lump', out);
  if (p.extra !== undefined) {
    if (!Array.isArray(p.extra) || p.extra.length > 12) err('extra: an array of 0-12 lumps');
    else p.extra.forEach((l, i) => lumpErrors(l, `extra[${i}]`, out));
  }
  if (p.strands !== undefined) {
    if (!Array.isArray(p.strands) || p.strands.length > 48) err('strands: an array of 0-48 strokes');
    else for (const [i, s] of (p.strands ?? []).entries()) {
      const where = `strands[${i}]`;
      if (!s || typeof s !== 'object') { err(`${where}: missing`); continue; }
      if (!['line', 'arc'].includes(s.d)) err(`${where}.d: "line" or "arc"`);
      if (!TONES.includes(s.tone)) err(`${where}.tone: one of ${TONES.join('|')}`);
      if (typeof s.opacity !== 'number' || s.opacity < 0 || s.opacity > 1) err(`${where}.opacity: 0..1`);
      if (!Array.isArray(s.pts) || s.pts.length < 2) err(`${where}.pts: >=2 [x,y] points`);
      else if (!s.pts.every((pt) => Array.isArray(pt) && pt.length === 2 && inBox(pt))) err(`${where}.pts: every point [x,y] in -40..296`);
    }
  }
  if (p.sheen !== undefined) {
    if (!Array.isArray(p.sheen) || p.sheen.length > 4) err('sheen: 0-4 shine arcs');
    else p.sheen.forEach((a, i) => { if (!Array.isArray(a) || a.length < 2 || !a.every((pt) => Array.isArray(pt) && pt.length === 2 && inBox(pt))) err(`sheen[${i}]: >=2 [x,y] points`); });
  }
  if (p.stubble !== undefined && (!Number.isInteger(p.stubble) || p.stubble < 0 || p.stubble > 30)) err('stubble: an integer 0..30');
  return out;
}
