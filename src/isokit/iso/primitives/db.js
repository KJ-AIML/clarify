/**
 * db — a cylinder. A circle of radius `r` on the floor projects to an ellipse with
 * rx = √2 · unit · r and ry = rx / 2, so the cylinder is two such ellipses joined by
 * straight walls. `cpu` doubles as a fill level: the front wall shows a coloured liquid.
 */
import { config, loadLevel, paletteName } from '../config.js';
import { R, clamp01 } from '../util.js';
import { iso } from '../projection.js';
import { glyph } from '../icons.js';
import { pill, pillWidth, entityPills, pillsHalfWidth, stackPills, widenForPills } from '../pills.js';
import { liftFade } from '../paint.js';
import { ref } from '../defs.js';

/**
 * Render a cylinder.
 * @param {object} e entity state, see `db.defaults`
 * @returns {{ body: string, over: string, poly: number[][], bounds: number[] }}
 */
export function renderDb(e) {
  const C = config.colors;
  const rx = Math.SQRT2 * config.unit * e.r;
  const ry = rx / 2;
  const [cx, floorY] = iso(e.x, e.y, 0);
  const bottom = floorY - e.lift;
  const top = bottom - e.h;
  const color = paletteName(e.color, 'purple');
  const left = R(cx - rx);
  const right = R(cx + rx);
  // down the left wall, round the front of the base, up the right wall
  const walls = `M${left},${R(top)} V${R(bottom)} A${R(rx)},${R(ry)} 0 0 0 ${right},${R(bottom)} V${R(top)}`;
  const side = `${walls} Z`;

  let liquid = '';
  const level = e.cpu >= 0 ? clamp01(e.cpu) : 0;
  if (level > 0.004) {
    const y = R(bottom - level * e.h);
    const [fill, line] = config.load.liquid[loadLevel(e.cpu)];
    liquid =
      `<path d="M${left},${y} A${R(rx)},${R(ry)} 0 0 0 ${right},${y} V${R(bottom)} A${R(rx)},${R(ry)} 0 0 1 ${left},${R(bottom)} Z" fill="${fill}" opacity=".92"/>` +
      (level < 0.995
        ? `<path d="M${R(cx - rx + 1)},${y} A${R(rx - 1)},${R(ry - 0.5)} 0 0 0 ${R(cx + rx - 1)},${y}" fill="none" stroke="${line}" stroke-width="1.6" stroke-linecap="round"/>`
        : '');
  }

  const lid = `cx="${R(cx)}" cy="${R(top)}" rx="${R(rx)}" ry="${R(ry)}"`;
  const body =
    `<g opacity="${R(e.opacity)}">` +
    `<ellipse cx="${R(cx)}" cy="${R(floorY + 5)}" rx="${R(rx + 3)}" ry="${R(ry + 1)}" fill="${C.shadow}" opacity="${R(0.22 * liftFade(e.lift))}" filter="${ref('blur-md')}"/>` +
    (e.heat > 0.01 ? `<g class="iso-pulse"><path d="${side}" fill="${C.heat}" opacity="${R(e.heat * 0.7)}" filter="${ref('glow')}"/></g>` : '') +
    `<path d="${side}" fill="${ref(`g-${color}-side`)}"/>` +
    liquid +
    `<path d="${side}" fill="${ref('cyl-sheen')}"/>` +
    `<ellipse ${lid} fill="${ref(`g-${color}-top`)}"/>` +
    `<path d="M${R(cx - rx + 3)},${R(top + 2.5)} A${R(rx - 3)},${R(ry - 2)} 0 0 0 ${R(cx + rx - 3)},${R(top + 2.5)}" fill="none" stroke="${C.highlight}" stroke-opacity=".7" stroke-width="1.4"/>` +
    `<path d="${walls}" fill="none" stroke="${config.ink}" stroke-width="1.9" stroke-linejoin="round"/>` +
    `<ellipse ${lid} fill="none" stroke="${config.ink}" stroke-width="1.9"/>` +
    glyph(e.glyph, cx, top + ry + e.h / 2, 19, { stroke: 1.8 }) +
    `</g>`;

  // name pill to the right of the wall; CPU meter and tags stacked above the lid
  const nameW = pillWidth(e.label || '', config.pill.size, true);
  let over = e.label
    ? `<g opacity="${R(e.labelFade ?? 1)}">${pill(cx + rx + 10 + nameW / 2, bottom - e.h * 0.35, e.label, { icon: 'database' })}</g>`
    : '';
  const items = entityPills(e, cx);
  over += stackPills(items, top - ry - 15, -config.pill.step);

  // outline for link trimming: the back half of the lid, then the front half of the base
  const poly = [];
  for (let i = 0; i <= 8; i++) poly.push([cx - rx * Math.cos((Math.PI * i) / 8), top - ry * Math.sin((Math.PI * i) / 8)]);
  for (let i = 0; i <= 8; i++) poly.push([cx + rx * Math.cos((Math.PI * i) / 8), bottom + ry * Math.sin((Math.PI * i) / 8)]);

  return {
    body,
    over: over ? `<g opacity="${R(e.opacity)}">${over}</g>` : '',
    poly,
    bounds: widenForPills(
      [cx - rx - 8, top - ry - 12 - items.length * config.pill.step, cx + rx + (e.label ? nameW + 18 : 8), bottom + ry + 10],
      cx,
      pillsHalfWidth(e),
    ),
  };
}

/** Registration record for `db`. */
export const db = {
  defaults: {
    r: 1.7, // radius on the floor, grid units
    h: 38, // height, px
    color: 'purple', // palette key (kit addition: the original is always purple)
    glyph: 'database', // icon on the front wall
    label: '', // pill to the right, with a "database" icon
    tags: [],
    opacity: 1,
    lift: 0,
    heat: 0, // 0…1 pulsing glow
    cpu: -1, // 0…1 shows the CPU meter and a fill level; negative hides both
  },
  footprint: (e) => [e.x - e.r, e.x + e.r, e.y - e.r, e.y + e.r],
  render: renderDb,
};
