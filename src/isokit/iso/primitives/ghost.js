/**
 * ghost — a dashed wireframe box: something that is not there (a size limit, a planned or
 * removed machine). Back edges are drawn fainter, so it reads as a transparent volume.
 */
import { config } from '../config.js';
import { R } from '../util.js';
import { iso } from '../projection.js';
import { bbox } from '../geometry.js';
import { pill, pillWidth } from '../pills.js';

/**
 * Render a ghost.
 * @param {object} e entity state, see `ghost.defaults`
 * @returns {{ body: string, over: string, poly: null, bounds: number[] }}
 */
export function renderGhost(e) {
  const x0 = e.x - e.s / 2;
  const x1 = e.x + e.s / 2;
  const y0 = e.y - e.s / 2;
  const y1 = e.y + e.s / 2;
  // corners in screen order: left, back, right, front
  const lid = [iso(x0, y0, e.h), iso(x0, y1, e.h), iso(x1, y1, e.h), iso(x1, y0, e.h)];
  const floor = [iso(x0, y0, 0), iso(x0, y1, 0), iso(x1, y1, 0), iso(x1, y0, 0)];
  const [LEFT, BACK, RIGHT, FRONT] = [0, 1, 2, 3];
  const edge = (a, b, hidden = false) =>
    `<path d="M${a[0]},${a[1]} L${b[0]},${b[1]}" stroke="${config.ink}" stroke-opacity="${hidden ? 0.22 : 0.55}" stroke-width="1.4" stroke-dasharray="5 4" fill="none"/>`;
  const lines = [
    edge(lid[LEFT], lid[BACK]),
    edge(lid[BACK], lid[RIGHT]),
    edge(lid[RIGHT], lid[FRONT]),
    edge(lid[FRONT], lid[LEFT]),
    edge(floor[LEFT], floor[FRONT]),
    edge(floor[FRONT], floor[RIGHT]),
    edge(lid[LEFT], floor[LEFT]),
    edge(lid[RIGHT], floor[RIGHT]),
    edge(lid[FRONT], floor[FRONT]),
    // the three edges behind the volume
    edge(floor[LEFT], floor[BACK], true),
    edge(floor[BACK], floor[RIGHT], true),
    edge(lid[BACK], floor[BACK], true),
  ].join('');
  const [ax, ay] = lid[RIGHT];
  const w = pillWidth(e.label, config.pill.size, true);
  return {
    body: `<g opacity="${R(e.opacity)}">${lines}</g>`,
    over: e.label ? `<g opacity="${R(e.opacity)}">${pill(ax + 14 + w / 2, ay + 18, e.label, { tone: 'gray', icon: 'alert' })}</g>` : '',
    poly: null,
    bounds: bbox([...lid, ...floor, [ax + 22 + w, ay]], [8, 30, 8, 8]),
  };
}

/** Registration record for `ghost`. */
export const ghost = {
  defaults: {
    s: 6, // side of the square footprint, grid units
    h: 90, // height, px
    opacity: 1,
    label: '', // grey pill with an alert icon, right of the right lid corner
  },
  enterFrom: {},
  exitTo: {},
  footprint: (e) => [e.x - e.s / 2, e.x + e.s / 2, e.y - e.s / 2, e.y + e.s / 2],
  // half a step behind a block on the same spot, so the block it surrounds paints over its back edges
  depth: (e) => e.x - e.y - 0.5,
  render: renderGhost,
};
