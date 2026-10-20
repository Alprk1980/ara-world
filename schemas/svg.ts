// Strict checks for model-written SVG: a small allowlist of shapes and attributes,
// colours only from slots, and a bounding box we can measure. Gradients are allowed for soft shading, but their
// stop colours are slots or fixed colours too, so every drawing can still be repainted.
import { XMLParser } from 'fast-xml-parser';
import { svgPathBbox } from 'svg-path-bbox';
import { COLOR_SLOTS, FIXED_COLORS } from './vocab.ts';

export type Box = { minX: number; minY: number; maxX: number; maxY: number };

const SHAPES = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line'];
const GRADIENTS = ['defs', 'linearGradient', 'radialGradient', 'stop'];
const ELEMENTS = new Set(['g', ...SHAPES, ...GRADIENTS]);
const ATTRS = new Set([
  'xmlns', 'viewBox', 'd', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'points',
  'x1', 'y1', 'x2', 'y2', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'opacity', 'fill-opacity', 'fill-rule',
  // gradients
  'id', 'offset', 'stop-color', 'stop-opacity', 'fx', 'fy', 'gradientUnits',
]);
const PAINTS = new Set<string>([...COLOR_SLOTS.map((s) => `{{${s}}}`), ...FIXED_COLORS]);
export const MAX_SVG_BYTES = 6144;
const MAX_ELEMENTS = 80;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', preserveOrder: true, allowBooleanAttributes: true });

type Node = { [tag: string]: Node[] | string } & { ':@'?: Record<string, string> };

const num = (v: string | undefined): number => (v === undefined ? 0 : Number(v));

function shapeBox(tag: string, a: Record<string, string>): Box | string {
  switch (tag) {
    case 'path': {
      try {
        const [minX, minY, maxX, maxY] = svgPathBbox(a.d ?? '');
        return { minX, minY, maxX, maxY };
      } catch {
        return `path d is not valid: "${String(a.d).slice(0, 40)}"`;
      }
    }
    case 'rect':
      return { minX: num(a.x), minY: num(a.y), maxX: num(a.x) + num(a.width), maxY: num(a.y) + num(a.height) };
    case 'circle':
      return { minX: num(a.cx) - num(a.r), minY: num(a.cy) - num(a.r), maxX: num(a.cx) + num(a.r), maxY: num(a.cy) + num(a.r) };
    case 'ellipse':
      return { minX: num(a.cx) - num(a.rx), minY: num(a.cy) - num(a.ry), maxX: num(a.cx) + num(a.rx), maxY: num(a.cy) + num(a.ry) };
    case 'line':
      return { minX: Math.min(num(a.x1), num(a.x2)), minY: Math.min(num(a.y1), num(a.y2)), maxX: Math.max(num(a.x1), num(a.x2)), maxY: Math.max(num(a.y1), num(a.y2)) };
    default: {
      const n = String(a.points ?? '').trim().split(/[\s,]+/).map(Number);
      if (n.length < 4 || n.length % 2 || n.some((v) => !Number.isFinite(v))) return `${tag} points are not valid`;
      const xs = n.filter((_, i) => i % 2 === 0);
      const ys = n.filter((_, i) => i % 2 === 1);
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    }
  }
}

/** Problems with an SVG string, plus the union bounding box of its shapes and the slots it uses. */
export function checkSvg(svg: unknown): { errors: string[]; box: Box | null; slots: Set<string> } {
  const errors: string[] = [];
  const slots = new Set<string>();
  if (typeof svg !== 'string') return { errors: ['svg: must be a string'], box: null, slots };
  if (svg.length > MAX_SVG_BYTES) errors.push(`svg: ${svg.length} bytes, limit ${MAX_SVG_BYTES}: use fewer, simpler shapes`);
  let doc: Node[];
  try {
    doc = parser.parse(svg) as Node[];
  } catch (e) {
    return { errors: [...errors, `svg: not valid XML (${(e as Error).message.slice(0, 60)})`], box: null, slots };
  }
  const roots = doc.filter((n) => !('#text' in n) && !('?xml' in n));
  const root = roots[0];
  if (roots.length !== 1 || root === undefined || !('svg' in root)) return { errors: [...errors, 'svg: must be a single <svg> root element'], box: null, slots };
  if (root[':@']?.viewBox !== '0 0 256 256') errors.push('svg: viewBox must be exactly "0 0 256 256"');

  let box: Box | null = null;
  let count = 0, shapes = 0;
  const ids = new Set<string>(), refs = new Set<string>();
  const walk = (children: Node[]) => {
    for (const child of children) {
      if ('#text' in child) {
        if (String(child['#text']).trim()) errors.push('svg: no text content allowed');
        continue;
      }
      const tag = Object.keys(child).find((k) => k !== ':@') ?? '';
      const attrs = child[':@'] ?? {};
      if (!ELEMENTS.has(tag)) {
        errors.push(`svg: <${tag}> is not allowed (use only ${[...ELEMENTS].join(', ')})`);
        continue;
      }
      count++;
      if (tag === 'stop' && attrs['stop-color'] === undefined) errors.push('svg: <stop> needs a stop-color (a slot or a fixed colour)');
      for (const [k, v] of Object.entries(attrs)) {
        if (!ATTRS.has(k)) errors.push(`svg: attribute "${k}" on <${tag}> is not allowed`);
        if (k === 'id') {
          if (!/^[a-zA-Z][\w-]{0,15}$/.test(v)) errors.push(`svg: id "${v}" should be a short name`);
          ids.add(v);
        }
        const url = /^url\(#([\w-]+)\)$/.exec(v);
        if ((k === 'fill' || k === 'stroke') && url) refs.add(url[1]);
        else if (k === 'fill' || k === 'stroke' || k === 'stop-color') {
          if (!PAINTS.has(v) || (k === 'stop-color' && v === 'none')) errors.push(`svg: ${k}="${v}" is not allowed (use ${[...PAINTS].join(', ')}${k === 'stop-color' ? '' : ', or url(#gradient)'})`);
          const m = /^\{\{(\w+)\}\}$/.exec(v);
          if (m) slots.add(m[1]);
        }
      }
      if (SHAPES.includes(tag)) {
        shapes++;
        if (attrs.fill === undefined && tag !== 'line' && tag !== 'polyline') errors.push(`svg: <${tag}> needs a fill (a slot or none)`);
        const b = shapeBox(tag, attrs);
        if (typeof b === 'string') errors.push(`svg: ${b}`);
        else box = box === null ? b : { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) };
      }
      const kids = child[tag];
      if (Array.isArray(kids)) walk(kids);
    }
  };
  walk(root.svg as Node[]);
  for (const r of refs) if (!ids.has(r)) errors.push(`svg: url(#${r}) points at no gradient`);
  if (shapes === 0) errors.push('svg: draws nothing');
  if (count > MAX_ELEMENTS) errors.push(`svg: ${count} elements, limit ${MAX_ELEMENTS}`);
  if (box !== null) {
    const b: Box = box;
    if (b.minX < -4 || b.minY < -4 || b.maxX > 260 || b.maxY > 260)
      errors.push(`svg: shapes reach outside the 256x256 canvas (box ${Math.round(b.minX)},${Math.round(b.minY)} to ${Math.round(b.maxX)},${Math.round(b.maxY)})`);
  }
  if (!slots.has('main')) errors.push('svg: must use {{main}} for the main colour');
  return { errors, box, slots };
}
