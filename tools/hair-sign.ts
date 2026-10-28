// Shape signature for hairstyle dedupe: rasterize a hair path's first lump into a 64x64 occupancy
// grid (point-in-polygon), compare by IoU. Catches near-duplicates (buzz vs the shipped short_crop)
// BEFORE spending a generation on them.
export type Pt = [number, number];

// Parse M/C/L/Z path data into polylines (cubics sampled at 8 steps).
export function polylines(d: string): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let cx = 0, cy = 0;
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const cmds = d.match(/[MCLZ]/gi) ?? [];
  let i = 0;
  for (const c of cmds) {
    if (c === 'M') { cx = nums[i]; cy = nums[i + 1]; i += 2; if (cur.length) out.push(cur); cur = [[cx, cy]]; }
    else if (c === 'L') { cx = nums[i]; cy = nums[i + 1]; i += 2; cur.push([cx, cy]); }
    else if (c === 'C') {
      const [x1, y1, x2, y2, x, y] = nums.slice(i, i + 6); i += 6;
      for (let t = 1; t <= 8; t++) {
        const u = t / 8, a = 1 - u;
        cur.push([a * a * a * cx + 3 * a * a * u * x1 + 3 * a * u * u * x2 + u * u * u * x, a * a * a * cy + 3 * a * a * u * y1 + 3 * a * u * u * y2 + u * u * u * y]);
      }
      cx = x; cy = y;
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

export const inside = (poly: Pt[], x: number, y: number): boolean => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (poly[i][1] > y !== poly[j][1] > y && x < ((poly[j][0] - poly[i][0]) * (y - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
  }
  return c;
};

/** Occupancy grid of the FIRST lump in an svg's path data. */
export const grid = (svg: string, N = 64): Uint8Array => {
  const d = /<path d="([^"]+)"/.exec(svg)?.[1] ?? '';
  const polys = polylines(d);
  const g = new Uint8Array(N * N);
  if (!polys[0]) return g;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const x = (px + 0.5) * (256 / N), y = (py + 0.5) * (256 / N);
    if (inside(polys[0], x, y)) g[py * N + px] = 1;
  }
  return g;
};

export const iou = (a: Uint8Array, b: Uint8Array): number => {
  let both = 0, any = 0;
  for (let i = 0; i < a.length; i++) { const o = a[i] | b[i], n = a[i] & b[i]; any += o; both += n; }
  return any ? both / any : 0;
};
