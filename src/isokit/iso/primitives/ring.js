/**
 * ring — a hash ring lying on the floor: a circle with coloured arcs (one per node),
 * key dots, optional virtual-node marks and a pulsing circle around keys that moved.
 * Angles are degrees in world space: 0° points along +x, 90° along +y.
 */
import { config, paletteOf } from '../config.js';
import { R } from '../util.js';
import { iso } from '../projection.js';
import { bbox } from '../geometry.js';
import { pill } from '../pills.js';

/**
 * Which node owns a key: the node with the largest angle that is not past the key.
 * A key before the first node wraps round to the last node.
 * @param {number} angle key position in degrees
 * @param {Array<{ a: number, color: string }>} nodes
 * @returns {{ a: number, color: string }|null}
 */
export function ringOwner(angle, nodes) {
  if (!nodes || !nodes.length) return null;
  const sorted = [...nodes].sort((p, q) => p.a - q.a);
  let owner = sorted[sorted.length - 1];
  for (const node of sorted) if (node.a <= angle) owner = node;
  return owner;
}

/**
 * Screen position of a point on a ring.
 * @param {{ x: number, y: number, r: number }} e ring state
 * @param {number} angle degrees
 * @param {number} [radius=e.r] grid units
 * @returns {[number, number]} screen `[sx, sy]`
 */
export function ringPoint(e, angle, radius = e.r) {
  const rad = (angle * Math.PI) / 180;
  return iso(e.x + radius * Math.cos(rad), e.y + radius * Math.sin(rad), 0);
}

/** Path data for an arc, as a polyline with one point every 3° or less. */
function arcPath(e, from, to, radius = e.r) {
  const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 3));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const [sx, sy] = ringPoint(e, from + ((to - from) * i) / steps, radius);
    d += `${i ? 'L' : 'M'}${R(sx)},${R(sy)} `;
  }
  return d;
}

/**
 * Render a ring.
 * @param {object} e entity state, see `ring.defaults`
 * @returns {{ body: string, over: string, poly: null, bounds: number[] }}
 */
export function renderRing(e) {
  const C = config.colors;
  const nodes = [...(e.nodes || [])].sort((p, q) => p.a - q.a);

  // each node colours the arc from itself to the next node
  let arcs = '';
  nodes.forEach((node, i) => {
    const next = nodes[(i + 1) % nodes.length];
    const end = next.a > node.a ? next.a : next.a + 360;
    arcs += `<path d="${arcPath(e, node.a, end)}" fill="none" stroke="${paletteOf(node.color).side[1]}" stroke-width="10" stroke-opacity=".55"/>`;
  });

  // six small chevrons just outside the ring show which way ownership runs
  let chevrons = '';
  for (let angle = 22; angle < 360; angle += 60) {
    const [ax, ay] = ringPoint(e, angle + 2.5, e.r + 1.4);
    const [bx, by] = ringPoint(e, angle, e.r + 1.4);
    const turn = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    chevrons += `<path d="M-4,-3.5 L1,0 L-4,3.5" transform="translate(${R(bx)} ${R(by)}) rotate(${R(turn)})" fill="none" stroke="${C.arrowMuted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // nodes flagged `mark` (virtual nodes, replicas) get a diamond
  const marks = nodes
    .filter((node) => node.mark)
    .map((node) => {
      const [x, y] = ringPoint(e, node.a);
      return `<path d="M${R(x)},${R(y - 6)} L${R(x + 9)},${R(y)} L${R(x)},${R(y + 6)} L${R(x - 9)},${R(y)} Z" fill="${paletteOf(node.color).top[1]}" stroke="${config.ink}" stroke-width="1.4"/>`;
    })
    .join('');

  const moved = new Set(e.moved || []);
  const keys = (e.keys || [])
    .map((angle) => {
      const [x, y] = ringPoint(e, angle);
      const owner = ringOwner(angle, nodes);
      const fill = owner ? paletteOf(owner.color).side[0] : C.paper;
      return (
        (moved.has(angle) ? `<circle class="iso-moved" cx="${R(x)}" cy="${R(y)}" r="9" fill="none" stroke="${C.moved}" stroke-width="2"/>` : '') +
        `<circle cx="${R(x)}" cy="${R(y)}" r="4.6" fill="${fill}" stroke="${config.ink}" stroke-width="1.4"/>`
      );
    })
    .join('');

  const body =
    `<g opacity="${R(e.opacity)}">` +
    `<path d="${arcPath(e, 0, 360, e.r + 0.9)}" fill="none" stroke="${C.ringGuide}" stroke-width="1"/>` +
    `<path d="${arcPath(e, 0, 360)}" fill="${C.zoneFill}" fill-opacity=".35" stroke="${config.ink}" stroke-opacity=".55" stroke-width="1.5"/>` +
    arcs +
    chevrons +
    marks +
    keys +
    `</g>`;

  const [lx, ly] = ringPoint(e, 135, e.r + 2.2);
  const edge = [];
  for (let angle = 0; angle < 360; angle += 15) edge.push(ringPoint(e, angle, e.r + 1.6));
  return {
    body,
    over: e.label ? `<g opacity="${R(e.opacity)}">${pill(lx, ly - 12, e.label, { tone: 'gray', icon: 'replay' })}</g>` : '',
    poly: null,
    bounds: bbox(edge, [10, 34, 10, 10]),
  };
}

/** Registration record for `ring`. */
export const ring = {
  defaults: {
    r: 10, // radius, grid units
    nodes: [], // [{ a: degrees, color: palette key, mark?: boolean }]
    keys: [], // key positions in degrees
    moved: [], // key positions (the same numbers as in `keys`) that changed owner
    opacity: 1,
    label: '', // grey pill at the back of the ring
  },
  enterFrom: {},
  exitTo: {},
  layer: 'floor',
  spot: false,
  footprint: (e) => [e.x - e.r, e.x + e.r, e.y - e.r, e.y + e.r],
  depth: () => -1e4,
  render: renderRing,
};
