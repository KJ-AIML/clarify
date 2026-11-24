/**
 * queue — a line of waiting items on the floor. `n` may be fractional: the last item
 * fades, grows and drops into place while it tweens.
 */
import { config } from '../config.js';
import { R, clamp01 } from '../util.js';
import { iso } from '../projection.js';
import { bbox } from '../geometry.js';
import { pill, pillWidth } from '../pills.js';

/**
 * Render a queue.
 * @param {object} e entity state, see `queue.defaults`
 * @returns {{ body: string, over: string, poly: null, bounds: number[] }}
 */
export function renderQueue(e) {
  const points = [];
  let body = '';
  // from the tail to the head, so the head is painted last
  for (let i = Math.ceil(e.n) - 1; i >= 0; i--) {
    const presence = clamp01(e.n - i);
    const [sx, sy] = iso(e.x + e.dir[0] * e.gap * i, e.y + e.dir[1] * e.gap * i, 0);
    points.push([sx, sy]);
    body +=
      `<g opacity="${R(presence * e.opacity)}" transform="translate(${R(sx)} ${R(sy - (1 - presence) * 8)}) scale(${R(0.5 + presence * 0.5)})">` +
      `<circle r="4.6" fill="${e.color}" stroke="${config.ink}" stroke-width="1.5"/></g>`;
  }
  let over = '';
  if (e.label) {
    const [hx, hy] = iso(e.x, e.y, 0);
    const half = pillWidth(e.label, config.pill.size, true) / 2 + 4;
    over = `<g opacity="${R(e.opacity * (e.labelFade ?? 1))}">${pill(hx + e.labelDx, hy + e.labelDy, e.label, { tone: 'amber', icon: 'layers' })}</g>`;
    points.push([hx, hy], [hx + e.labelDx - half, hy + e.labelDy - 13], [hx + e.labelDx + half, hy + e.labelDy + 15]);
  }
  return { body, over, poly: null, bounds: points.length ? bbox(points, [8, 8, 8, 8]) : [0, 0, 0, 0] };
}

/** Registration record for `queue`. */
export const queue = {
  defaults: {
    n: 0, // items shown; fractional values fade the last one in
    gap: 1, // grid units between items
    dir: [0, -1], // world direction the line grows in, from the head at (x, y)
    opacity: 1,
    color: '#efb041', // item fill
    label: '', // kit addition: an amber pill near the head
    labelDx: 0, // px offset of that pill from the head
    labelDy: 22,
  },
  enterFrom: { n: 0, opacity: 1 },
  exitTo: { n: 0, opacity: 1 },
  spot: false,
  depth: () => -1e3,
  render: renderQueue,
};
