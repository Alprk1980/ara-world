import { describe, expect, it } from 'vitest';
import { templateErrors, type Template } from './template.ts';

const cupcake: Template = {
  id: 'cupcake',
  name: 'Cupcake',
  category: 'food',
  size: { w: 10, h: 10 },
  anchors: { base: [128, 220], grip: [128, 180] },
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M60 140 L82 220 L174 220 L196 140Z" fill="{{main}}" stroke="{{outline}}"/><circle cx="128" cy="40" r="14" fill="{{trim}}"/></svg>',
};
const tshirt: Template = {
  id: 'tshirt',
  name: 'T-shirt',
  category: 'top',
  svg: '<svg viewBox="0 0 256 256"><path d="M20 20 H236 V240 H20Z" fill="{{main}}"/></svg>',
};

describe('templateErrors', () => {
  it('accepts a good object and a good wearable', () => {
    expect(templateErrors(cupcake)).toEqual([]);
    expect(templateErrors(tshirt)).toEqual([]);
  });
  it('rejects literal colours and disallowed elements', () => {
    const t = { ...cupcake, svg: cupcake.svg.replace('{{trim}}', '#ff0000').replace('<circle', '<text') };
    const e = templateErrors(t).join('\n');
    expect(e).toMatch(/<text> is not allowed/);
    const t2 = { ...cupcake, svg: cupcake.svg.replace('{{trim}}', '#ff0000') };
    expect(templateErrors(t2).join('\n')).toMatch(/fill="#ff0000" is not allowed/);
  });
  it('rejects scripts, transforms and bad XML', () => {
    expect(templateErrors({ ...cupcake, svg: '<svg viewBox="0 0 256 256"><script/></svg>' }).join()).toMatch(/<script> is not allowed/);
    expect(templateErrors({ ...cupcake, svg: cupcake.svg.replace('<circle', '<circle transform="scale(2)"') }).join()).toMatch(/"transform"/);
    expect(templateErrors({ ...cupcake, svg: '<svg viewBox="0 0 256 256"><path' }).join()).toMatch(/not valid XML|single <svg>/);
  });
  it('needs the required anchors, at the right places', () => {
    expect(templateErrors({ ...cupcake, anchors: { base: [128, 220] } }).join()).toMatch(/anchors.grip is required/);
    expect(templateErrors({ ...cupcake, anchors: { base: [128, 100], grip: [128, 180] } }).join()).toMatch(/base must sit at the bottom/);
    expect(templateErrors({ ...cupcake, anchors: { base: [128, 220], grip: [250, 10] } }).join()).toMatch(/outside the drawing/);
  });
  it('checks size range per category', () => {
    expect(templateErrors({ ...cupcake, size: { w: 10, h: 300 } }).join()).toMatch(/out of range for food/);
  });
  it('checks drawings fill their canvas', () => {
    const tiny = { ...tshirt, svg: '<svg viewBox="0 0 256 256"><rect x="100" y="100" width="40" height="40" fill="{{main}}"/></svg>' };
    expect(templateErrors(tiny).join()).toMatch(/must fill its slot frame/);
  });
  it('flags duplicate ids and missing main slot', () => {
    expect(templateErrors(cupcake, [cupcake, { ...cupcake }]).join()).toMatch(/already exists/);
    expect(templateErrors({ ...tshirt, svg: tshirt.svg.replace('{{main}}', '{{trim}}') }).join()).toMatch(/must use \{\{main\}\}/);
  });
});
