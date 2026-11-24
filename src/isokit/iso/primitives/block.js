/**
 * block — a rounded box with an icon on its lid and a name across its front edge.
 * Servers, services, balancers, caches: almost everything in a diagram is a block.
 */
import { config } from '../config.js';
import { R } from '../util.js';
import { bbox } from '../geometry.js';
import { svgText } from '../text.js';
import { glyph } from '../icons.js';
import { entityPills, pillsHalfWidth, stackPills, widenForPills } from '../pills.js';
import { boxGeom, paintBox, dropShadow } from '../paint.js';
import { ref } from '../defs.js';

/**
 * Turn a label value into lines. Accepts an array of lines or one string with `\n`.
 * @param {string|string[]|null|undefined} value
 * @returns {string[]}
 */
export const labelLines = (value) => (Array.isArray(value) ? value : value ? String(value).split('\n') : []);

const lidGlyphs = {
  /** Two stacked rack units, each with a status light and a slot. */
  server(k) {
    const unit = (y) => `<rect x="-11" y="${y}" width="22" height="8.5" rx="2.2"/>`;
    const mid = [-5.75, 5.75];
    return (
      `<g fill="none" stroke="${config.ink}" stroke-width="1.9" stroke-linecap="round" transform="scale(${k})">` +
      unit(-10) +
      unit(1.5) +
      `<path d="${mid.map((y) => `M-6.5 ${y}h.01`).join('')}" stroke-width="2.6"/>` +
      `<path d="${mid.map((y) => `M1 ${y}h5.5`).join('')}"/></g>`
    );
  },
  /** One dot fanning out into three arrows. */
  balancer(k) {
    const branches = [-8, 8].map((y) => `M-1 0 C 3 0 3 ${y} 8 ${y}`).join('') + 'M-1 0h9';
    const heads = [-8, 0, 8].map((y) => `M5.5 ${y - 2.5}l3 2.5-3 2.5`).join('');
    return (
      `<g fill="none" stroke="${config.ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="scale(${k})">` +
      `<circle cx="-8" cy="0" r="3" fill="${config.ink}"/><path d="M-5 0h4${branches}"/><path d="${heads}"/></g>`
    );
  },
};

/**
 * Register a lid glyph: artwork drawn around (0, 0), about 22 px wide, that scales with
 * the block (×1.15 for blocks 6 units or wider, ×0.8 under 3.5). A block whose `glyph` has
 * no lid glyph falls back to the icon of that name at a fixed 24 px.
 * @param {string} name value of `entity.glyph`
 * @param {(scale: number) => string} draw returns SVG markup centred on the origin
 */
export function registerLidGlyph(name, draw) {
  lidGlyphs[name] = draw;
}

/** Name and sub-label, centred on the front vertical edge. `y` is 40% of the way from the lid centre to the bottom corner. */
function labels(e, cx, y) {
  const lines = labelLines(e.label);
  const n = lines.length;
  if (!n) return '';
  if (n === 1) {
    return e.sub
      ? svgText(cx, y, lines[0], 13.5, 800) + svgText(cx, y + 14, e.sub, 10, 600)
      : svgText(cx, y + 4.5, lines[0], 13.5, 800);
  }
  const step = 15.5;
  const first = y - ((n - 1) * step) / 2 + (e.sub ? -1.25 : 4.25);
  let out = lines.map((line, i) => svgText(cx, first + i * step, line, 13, 800)).join('');
  if (e.sub) out += svgText(cx, first + (n - 1) * step + 14, e.sub, 10, 600);
  return out;
}

/**
 * Render a block.
 * @param {object} e entity state, see `block.defaults`
 * @returns {{ body: string, over: string, poly: number[][], bounds: number[] }}
 */
export function renderBlock(e) {
  const C = config.colors;
  const half = e.s / 2;
  const g = boxGeom(e.x - half, e.x + half, e.y - half, e.y + half, e.h, e.radius ?? 9);
  const cx = g.lidX;
  const lift = e.lift;
  const hasLabel = labelLines(e.label).length > 0;
  const labelY = g.lidY + (e.s * config.unit * 0.5 + e.h) * 0.4;

  const scale = e.s >= 6 ? 1.15 : e.s < 3.5 ? 0.8 : 1;
  const icon = lidGlyphs[e.glyph]
    ? `<g transform="translate(${R(cx)} ${R(hasLabel ? g.lidY - 1 : g.lidY + 2)})">${lidGlyphs[e.glyph](scale)}</g>`
    : e.glyph
      ? glyph(e.glyph, cx, g.lidY - 1, 24, { stroke: 1.9 })
      : '';

  const hot = e.heat > 0.01;
  const dead = e.dead > 0.01;
  const sil = g.silhouette;
  const body =
    `<g opacity="${R(e.opacity)}">` +
    dropShadow(g, e.h, lift, 0.26) +
    `<g transform="translate(0 ${R(-lift)})">` +
    (hot ? `<g class="iso-pulse"><path d="${sil}" fill="${C.heat}" opacity="${R(e.heat * 0.7)}" filter="${ref('glow')}"/></g>` : '') +
    paintBox(g, e.color) +
    (hot ? `<path d="${sil}" fill="${C.heat}" opacity="${R(e.heat * 0.3)}"/>` : '') +
    (dead
      ? `<path d="${sil}" fill="${C.dead}" opacity="${R(e.dead * 0.62)}"/><path d="${sil}" fill="none" stroke="${config.ink}" stroke-width="1.9" stroke-linejoin="round"/>`
      : '') +
    (e.dim > 0.01 ? `<path d="${sil}" fill="${C.dim}" opacity="${R(e.dim * 0.45)}"/>` : '') +
    `<g opacity="${R(1 - e.dead * 0.5 - e.dim * 0.35)}">${e.dead > 0.5 ? '' : icon}<g opacity="${R(e.labelFade ?? 1)}">${labels(e, cx, labelY)}</g></g>` +
    (dead
      ? `<g opacity="${R(e.dead)}" stroke="${C.deadCross}" stroke-width="3.2" stroke-linecap="round"><path d="M${R(cx - 9)},${R(g.lidY - 10)} L${R(cx + 9)},${R(g.lidY + 8)} M${R(cx + 9)},${R(g.lidY - 10)} L${R(cx - 9)},${R(g.lidY + 8)}"/></g>`
      : '') +
    `</g></g>`;

  const below = e.pills === 'below';
  const step = config.pill.step;
  const items = entityPills(e, cx);
  const stack = stackPills(items, below ? g.Bd[1] - lift + 20 : g.T[1] - lift - 17, below ? step : -step);
  const pad = below ? [8, 8, 8, 14 + items.length * step] : [8, 8 + Math.max(items.length, 1) * step, 8, 14];
  return {
    body,
    over: stack ? `<g opacity="${R(e.opacity)}">${stack}</g>` : '',
    poly: g.outline.map(([x, y]) => [x, y - lift]),
    bounds: widenForPills(bbox(g.outline, pad), cx, pillsHalfWidth(e)),
  };
}

/** Registration record for `block`. */
export const block = {
  defaults: {
    s: 4, // side of the square footprint, grid units
    h: 46, // height, px
    color: 'blue', // palette key
    glyph: 'server', // lid glyph or icon name; '' for none
    label: [], // one or two lines
    sub: '', // small line under the label
    heat: 0, // 0…1 overload: pulsing glow + orange tint
    dead: 0, // 0…1 failed: grey wash + red cross, icon hidden above 0.5
    dim: 0, // 0…1 de-emphasised: paper wash, content faded
    opacity: 1,
    lift: 0, // px above the floor
    cpu: -1, // 0…1 shows the CPU meter; negative hides it
    tags: [], // [{ text, tone?, icon?, size? }]
    pills: 'above', // 'above' the back corner or 'below' the front corner
  },
  footprint: (e) => [e.x - e.s / 2, e.x + e.s / 2, e.y - e.s / 2, e.y + e.s / 2],
  render: renderBlock,
};
