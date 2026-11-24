/**
 * Screen-space geometry: rounded outlines, bounding boxes, and trimming a link so it stops
 * just outside the shape it connects to. All points are `[x, y]` in SVG user units.
 */
import { R } from './util.js';

/** Move `r` px from `a` towards `b`, but never past the midpoint of the edge. */
function towards(a, b, r) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const k = Math.min(r, len / 2) / len;
  return [a[0] + dx * k, a[1] + dy * k];
}

/**
 * Path data for a closed polygon whose corners are replaced by quadratic curves.
 * Each corner is cut `radius` px back along both edges (at most half the edge) and the
 * corner itself becomes the control point, so sharp and blunt corners both look right.
 * @param {Array<[number, number]>} pts corners in order
 * @param {number|number[]} radius one radius, or one per corner
 * @returns {string} SVG path data ending in `Z`
 */
export function roundedPolygon(pts, radius) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const r = Array.isArray(radius) ? radius[i] : radius;
    const corner = pts[i];
    const a = towards(corner, pts[(i - 1 + n) % n], r);
    const b = towards(corner, pts[(i + 1) % n], r);
    d += `${i === 0 ? 'M' : 'L'}${R(a[0])},${R(a[1])} Q${R(corner[0])},${R(corner[1])} ${R(b[0])},${R(b[1])} `;
  }
  return d + 'Z';
}

/**
 * Path data for an open polyline with rounded interior corners. Every link is drawn with it.
 * A corner whose incoming or outgoing segment is shorter than 0.01 px is skipped.
 * @param {Array<[number, number]>} pts at least two points
 * @param {number} [radius=10] corner radius in px, limited to half of each adjoining segment
 * @returns {string} SVG path data
 */
export function roundedPolyline(pts, radius = 10) {
  let d = `M${R(pts[0][0])},${R(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    if (inLen < 0.01 || outLen < 0.01) continue;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const ax = cx + ((px - cx) / inLen) * r;
    const ay = cy + ((py - cy) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += ` L${R(ax)},${R(ay)} Q${R(cx)},${R(cy)} ${R(bx)},${R(by)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${R(last[0])},${R(last[1])}`;
}

/**
 * Is a point inside a convex polygon? True when the point is on the same side of every edge
 * (edges the point lies exactly on are ignored). Winding direction does not matter.
 * @param {[number, number]} point
 * @param {Array<[number, number]>} poly convex polygon
 * @returns {boolean}
 */
export function insideConvex([x, y], poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/**
 * Cut the start of a polyline so it begins `gap` px outside a shape.
 *
 * Links are routed centre to centre. This walks the path to the first segment that leaves
 * the outline, finds the crossing by bisection (30 halvings), steps `gap` px further along
 * the segment, and drops everything before that point. A path that does not start inside
 * the outline, or never leaves it, is returned unchanged.
 * @param {Array<[number, number]>} pts the path
 * @param {Array<[number, number]>|null} poly convex outline of the shape at the start, or null
 * @param {number} gap px of clear space between the outline and the new start
 * @returns {Array<[number, number]>}
 */
export function trimStart(pts, poly, gap) {
  if (!poly || !insideConvex(pts[0], poly)) return pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (insideConvex(b, poly)) continue;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (insideConvex([a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid], poly)) lo = mid;
      else hi = mid;
    }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = Math.min(1, hi + gap / len);
    return [[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ...pts.slice(i + 1)];
  }
  return pts;
}

/**
 * Cut the end of a polyline so it stops `gap` px outside a shape. See `trimStart`.
 * @param {Array<[number, number]>} pts
 * @param {Array<[number, number]>|null} poly
 * @param {number} gap px
 * @returns {Array<[number, number]>}
 */
export const trimEnd = (pts, poly, gap) => trimStart([...pts].reverse(), poly, gap).reverse();

/**
 * Trim both ends of a link the way the stage does: 3 px clear at the start, and at the end
 * 4 px when it carries an arrowhead or 3 px when it does not.
 * @param {Array<[number, number]>} pts centre-to-centre path
 * @param {Array<[number, number]>|null} fromPoly outline at the start
 * @param {Array<[number, number]>|null} toPoly outline at the end
 * @param {{ startGap?: number, endGap?: number }} [gaps]
 * @returns {Array<[number, number]>}
 */
export function trimToOutlines(pts, fromPoly, toPoly, { startGap = 3, endGap = 4 } = {}) {
  let out = trimStart(pts, fromPoly, startGap);
  if (toPoly) out = trimEnd(out, toPoly, endGap);
  return out;
}

/**
 * Bounding box of a set of points, grown by a margin on each side.
 * @param {Array<[number, number]>} pts
 * @param {[number, number, number, number]} [pad] `[left, top, right, bottom]` in px
 * @returns {[number, number, number, number]} `[x0, y0, x1, y1]`
 */
export function bbox(pts, [l, t, r, b] = [0, 0, 0, 0]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0 - l, y0 - t, x1 + r, y1 + b];
}

/**
 * The smallest box that contains both boxes. Either may be null.
 * @param {number[]|null} a `[x0, y0, x1, y1]`
 * @param {number[]|null} b
 * @returns {number[]|null}
 */
export const union = (a, b) =>
  !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

/**
 * Area shared by two boxes, in px². Zero when they do not overlap.
 * @param {number[]} a `[x0, y0, x1, y1]`
 * @param {number[]} b
 * @returns {number}
 */
export const overlapArea = (a, b) =>
  Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

/**
 * The point and unit direction at a fraction of a polyline's length.
 * @param {Array<[number, number]>} pts
 * @param {number} t 0…1 along the whole path
 * @returns {{ x: number, y: number, dx: number, dy: number }}
 */
export function pointAt(pts, t) {
  const lengths = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lengths.push(len);
    total += len;
  }
  let d = total * t;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] ? Math.min(1, d / lengths[i]) : 0;
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const len = lengths[i] || 1;
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dx: (bx - ax) / len, dy: (by - ay) / len };
    }
    d -= lengths[i];
  }
  return { x: pts[0][0], y: pts[0][1], dx: 1, dy: 0 };
}
