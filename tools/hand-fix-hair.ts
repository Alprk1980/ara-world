// One-off: three hair drawings Qwen kept drawing as helmets/hoods, redrawn by Claude with the user's OK
// (2026-10-19). Head circle in the hair frame: centre (128,140), radius 90; face area x 75-181, y 125-215 stays clear.
import { readFileSync, writeFileSync } from 'node:fs';
import { templateErrors, type Template } from '../schemas/template.ts';

const S = 'stroke="{{outline}}" stroke-width="6" stroke-linejoin="round"';
// Hair over the top of the head with a scalloped fringe, ending at the temples.
const cap = `<path d="M34 164 C22 84 70 36 128 36 C186 36 234 84 222 164 C212 152 206 138 204 122 C186 128 166 120 150 108 C140 118 116 118 106 108 C90 120 70 128 52 122 C50 138 44 152 34 164 Z" fill="{{main}}" ${S}/>`;
// Side locks that frame the face without covering the cheeks.
const locks = `<path d="M34 150 C28 186 32 214 46 234 C58 216 62 188 58 150 Z" fill="{{main}}" ${S}/><path d="M222 150 C228 186 224 214 210 234 C198 216 194 188 198 150 Z" fill="{{main}}" ${S}/>`;
const shine = `<ellipse cx="96" cy="58" rx="18" ry="7" fill="#ffffff" opacity="0.6"/>`;
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${body}</svg>`;

const braidBeads = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (1.08 + (i / 8) * 0.84);
  const x = Math.round(128 + Math.cos(a) * 84), y = Math.round(116 + Math.sin(a) * 66);
  return `<circle cx="${x}" cy="${y}" r="14" fill="{{trim}}" ${S}/>`;
}).join('');

// Short feathery sideburns that stop at the ears, for the pixie cut.
const wisps = `<path d="M34 150 C30 170 36 186 50 194 C52 180 58 168 60 150 Z" fill="{{main}}" ${S}/><path d="M222 150 C226 170 220 186 206 194 C204 180 198 168 196 150 Z" fill="{{main}}" ${S}/>`;

const FIXES: Record<string, string> = {
  feathered_pixie_hair: svg(
    cap + wisps + `<path d="M70 70 C92 52 120 50 140 60 M120 46 C146 40 176 52 188 74" fill="none" stroke="{{trim}}" stroke-width="7" stroke-linecap="round"/>` + shine,
  ),
  space_buns_hair: svg(
    `<circle cx="62" cy="50" r="34" fill="{{main}}" ${S}/><circle cx="194" cy="50" r="34" fill="{{main}}" ${S}/>` +
      `<ellipse cx="62" cy="40" rx="10" ry="5" fill="#ffffff" opacity="0.6"/><ellipse cx="194" cy="40" rx="10" ry="5" fill="#ffffff" opacity="0.6"/>` +
      cap + locks +
      `<ellipse cx="80" cy="76" rx="12" ry="8" fill="{{accent}}" ${S}/><ellipse cx="176" cy="76" rx="12" ry="8" fill="{{accent}}" ${S}/>` + shine,
  ),
  crown_braid_hair: svg(cap + locks + braidBeads + `<circle cx="128" cy="44" r="10" fill="{{accent}}" ${S}/>` + shine),
  twin_loop_buns_hair: svg(
    `<circle cx="48" cy="70" r="28" fill="{{main}}" ${S}/><circle cx="208" cy="70" r="28" fill="{{main}}" ${S}/>` +
      `<circle cx="48" cy="70" r="11" fill="{{trim}}" ${S}/><circle cx="208" cy="70" r="11" fill="{{trim}}" ${S}/>` +
      cap + locks + `<path d="M96 52 C112 44 144 44 160 52" fill="none" stroke="{{accent}}" stroke-width="8" stroke-linecap="round"/>` + shine,
  ),
};

const file = 'src/data/templates.json';
const list = JSON.parse(readFileSync(file, 'utf8')) as Template[];
for (const [id, s] of Object.entries(FIXES)) {
  const t = list.find((x) => x.id === id);
  if (!t) throw new Error(`no template ${id}`);
  const next = { ...t, svg: s };
  const errs = templateErrors(next, list.filter((x) => x.id !== id));
  if (errs.length) throw new Error(errs.join('\n'));
  Object.assign(t, next);
  console.log(`${id}: ${s.length} chars`);
}
writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
