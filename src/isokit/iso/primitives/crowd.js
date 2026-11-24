/**
 * crowd — a low slab with little people standing on it. `count` may be fractional, so
 * people fade and grow in one at a time while it tweens.
 */
import { config } from '../config.js';
import { R, clamp01 } from '../util.js';
import { iso } from '../projection.js';
import { bbox } from '../geometry.js';
import { pill } from '../pills.js';
import { boxGeom, paintBox, dropShadow } from '../paint.js';

const SLAB_HEIGHT = 10; // px
const SPACING = 1.75; // grid units between people
const EDGE = 0.85; // grid units kept free along each slab edge

/** Repeatable pseudo-random number 0…1 for a grid cell (the classic sine hash). */
const cellNoise = (i, j) => {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * One person: a floor shadow, a rounded-shoulder body and a round head.
 * @param {number} x world x
 * @param {number} y world y
 * @param {number} z height of the feet in px
 * @param {number} presence 0…1: fades in, grows from 35% and drops the last 10 px into place
 * @param {string} color shirt colour
 * @returns {string} SVG markup
 */
export function person(x, y, z, presence, color) {
  const [sx, sy] = iso(x, y, z);
  const scale = (0.35 + 0.65 * presence) * 1.3;
  return (
    `<g opacity="${R(presence)}" transform="translate(${R(sx)} ${R(sy - (1 - presence) * 10)}) scale(${R(scale)})">` +
    `<ellipse cx="0" cy="0" rx="5.6" ry="2.8" fill="${config.colors.shadow}" opacity=".18"/>` +
    `<path d="M-5.2,0 V-9 A5.2,5.2 0 0 1 5.2,-9 V0 A5.2,2.4 0 0 1 -5.2,0 Z" fill="${color}" stroke="${config.ink}" stroke-width="1.25"/>` +
    `<circle cx="0" cy="-17.6" r="4.3" fill="${config.colors.head}" stroke="${config.ink}" stroke-width="1.25"/></g>`
  );
}

/**
 * The standing places on a slab, in the order they fill up: the middle rows first, with
 * jitter so the crowd does not grow as a neat block.
 * @param {{ x0: number, x1: number, y0: number, y1: number }} e slab extents
 * @returns {Array<{ i: number, j: number }>} grid cells around the slab centre
 */
export function crowdSeats(e) {
  const ni = Math.floor(((e.x1 - e.x0) / 2 - EDGE) / SPACING);
  const nj = Math.floor(((e.y1 - e.y0) / 2 - EDGE) / SPACING);
  const seats = [];
  for (let i = -ni; i <= ni; i++) for (let j = -nj; j <= nj; j++) seats.push({ i, j, order: Math.abs(i) + cellNoise(i, j) * 1.6 });
  return seats.sort((a, b) => a.order - b.order);
}

/**
 * Render a crowd.
 * @param {object} e entity state, see `crowd.defaults`; needs `x0, x1, y0, y1`
 * @returns {{ body: string, over: string, poly: number[][], bounds: number[] }}
 */
export function renderCrowd(e) {
  const g = boxGeom(e.x0, e.x1, e.y0, e.y1, SLAB_HEIGHT, 8);
  const cx = (e.x0 + e.x1) / 2;
  const cy = (e.y0 + e.y1) / 2;
  const colors = config.people;
  const people = crowdSeats(e)
    .map((seat, n) => ({ ...seat, presence: clamp01(e.count - n) }))
    .filter((seat) => seat.presence > 0.01)
    .sort((a, b) => a.i - a.j - (b.i - b.j)) // back to front
    .map((seat) =>
      person(cx + seat.i * SPACING, cy + seat.j * SPACING, SLAB_HEIGHT, seat.presence, colors[Math.abs(seat.i * 3 + seat.j * 7) % colors.length]),
    )
    .join('');
  const lift = e.lift;
  const body =
    `<g opacity="${R(e.opacity)}">` +
    dropShadow(g, SLAB_HEIGHT, lift, 0.2) +
    `<g transform="translate(0 ${R(-lift)})">${paintBox(g, 'slab', { stroke: config.colors.slabStroke, sw: 1.5 })}${people}</g></g>`;
  const [px, py] = g.Bd;
  return {
    body,
    over: e.label
      ? `<g opacity="${R(e.opacity * (e.labelFade ?? 1))}" transform="translate(0 ${R(-lift)})">${pill(px, py + 22, e.label, { icon: 'users' })}</g>`
      : '',
    poly: g.outline.map(([x, y]) => [x, y - lift]),
    bounds: bbox(g.outline, [8, 34, 8, 40]),
  };
}

/** How many people fit on a slab. @param {{ x0: number, x1: number, y0: number, y1: number }} e @returns {number} */
export const crowdCapacity = (e) => crowdSeats(e).length;

/** Registration record for `crowd`. */
export const crowd = {
  defaults: {
    count: 0, // people shown; fractional values fade the next person in
    label: '', // pill under the front corner, with a "users" icon
    opacity: 1,
    lift: 0,
  },
  enterFrom: { count: 0, lift: 26 },
  exitTo: { count: 0 },
  render: renderCrowd,
};
