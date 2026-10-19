// Shared helpers for drawings Claude writes by hand (user's OK while the local model is busy).
// `commit` validates every drawing with templateErrors before writing, and records which places each one is for
// (src/data/signatures.json), so layouts put a place's own pieces first.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { templateErrors, type Template } from '../schemas/template.ts';

export const O = 'stroke="{{outline}}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';
export const M = '{{main}}', T = '{{trim}}', A = '{{accent}}', W = '#ffffff', K = '#3a2a2a', G = '#cdeeff', WA = '#7fd1ff';
export const r = (x: number, y: number, w: number, h: number, rx: number, f: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${O}/>`;
export const c = (x: number, y: number, rr: number, f: string) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${f}" ${O}/>`;
export const e = (x: number, y: number, rx: number, ry: number, f: string) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${O}/>`;
export const p = (d: string, f: string) => `<path d="${d}" fill="${f}" ${O}/>`;
export const ln = (d: string, col = '{{outline}}', w = 6) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const shine = (x: number, y: number, rx = 12, ry = 6) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${W}" opacity="0.6"/>`;
export const eyes = (x: number, y: number, gap = 16, rr = 5) => `<circle cx="${x - gap}" cy="${y}" r="${rr}" fill="${K}"/><circle cx="${x + gap}" cy="${y}" r="${rr}" fill="${K}"/>`;
export const smile = (x: number, y: number, w = 12) => ln(`M${x - w} ${y} Q${x} ${y + w} ${x + w} ${y}`, K, 4);
export const wheel = (x: number, y: number, rr: number) => c(x, y, rr, '{{outline}}') + c(x, y, rr * 0.45, T);
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${body}</svg>`;

export type Drawing = Omit<Template, 'svg'> & { body: string; for: string[] };
export const obj = (forPlaces: string[], id: string, name: string, category: string, w: number, h: number, body: string, anchors: Template['anchors']): Drawing =>
  ({ for: forPlaces, id, name, category, size: { w, h }, anchors, body });

export function commit(drawings: Drawing[], label: string): void {
  const file = 'src/data/templates.json', sigFile = 'src/data/signatures.json';
  const list = JSON.parse(readFileSync(file, 'utf8')) as Template[];
  const sigs = (existsSync(sigFile) ? JSON.parse(readFileSync(sigFile, 'utf8')) : {}) as Record<string, string[]>;
  let added = 0;
  const errors: string[] = [];
  for (const d of drawings) {
    const { body, for: places, ...rest } = d;
    const t: Template = { ...rest, svg: svg(body) };
    const others = list.filter((x) => x.id !== t.id);
    const errs = templateErrors(t, [...others, t]);
    if (errs.length) {
      errors.push(...errs);
      continue;
    }
    const i = list.findIndex((x) => x.id === t.id);
    if (i >= 0) list[i] = t;
    else list.push(t);
    sigs[t.id] = places;
    added++;
  }
  writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
  writeFileSync(sigFile, `${JSON.stringify(sigs, null, 2)}\n`);
  console.log(`${label}: ${added} of ${drawings.length} written`);
  for (const x of errors) console.log(`  ✗ ${x}`);
}
