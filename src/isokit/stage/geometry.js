/**
 * Plane geometry used by the label solver, the card docking test and link routing.
 * Pure functions on screen-space numbers: rectangles are `[x0, y0, x1, y1]`, points are `[x, y]`,
 * polygons and polylines are arrays of points. No DOM.
 *
 * Original: `Pf`, `Ff`, `If`, `Lf`, `Rf`, `zf`, `Bf` (index.pretty.js:18042-18102) and
 * `wr`, `Tr`, `Er` (index.pretty.js:5862-5893).
 */

/** Area shared by two rectangles, 0 when they do not overlap. */
export const overlapArea = (a, b) =>
  Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

/** True when two rectangles overlap by more than an edge. */
export const rectsOverlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** Smallest rectangle holding both. Either argument may be null. */
export const unionRect = (a, b) =>
  !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

/** Grow a rectangle by `d` px on every side. */
export const growRect = (r, d) => [r[0] - d, r[1] - d, r[2] + d, r[3] + d];

/** Bounding rectangle of a list of points. */
export function boundsOf(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}

/** Even-odd ray cast: is the point inside the polygon (any simple polygon)? */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const turn = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
/** True when segment a–b properly crosses segment c–d. */
export const segmentsCross = (a, b, c, d) => turn(a, b, c) !== turn(a, b, d) && turn(c, d, a) !== turn(c, d, b);

/**
 * Does a polygon touch a rectangle? Three cheap tests: a polygon vertex strictly inside the
 * rectangle, a rectangle corner inside the polygon, or any pair of edges crossing.
 */
export function polygonHitsRect(poly, rect) {
  if (poly.some(([x, y]) => x > rect[0] && x < rect[2] && y > rect[1] && y < rect[3])) return true;
  const corners = [[rect[0], rect[1]], [rect[2], rect[1]], [rect[2], rect[3]], [rect[0], rect[3]]];
  if (corners.some(([x, y]) => pointInPolygon(x, y, poly))) return true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    for (let k = 0; k < 4; k++) if (segmentsCross(a, b, corners[k], corners[(k + 1) % 4])) return true;
  }
  return false;
}

/**
 * Position and unit direction at fraction `t` (0..1) of a polyline's length.
 * @returns {{ x: number, y: number, dx: number, dy: number }}
 */
export function pointAlong(pts, t) {
  const lens = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(len);
    total += len;
  }
  let left = total * t;
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, left / lens[i]) : 0, [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = lens[i] || 1;
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dx: (bx - ax) / len, dy: (by - ay) / len };
    }
    left -= lens[i];
  }
  return { x: pts[0][0], y: pts[0][1], dx: 1, dy: 0 };
}

/** Points every `step` px along a polyline (segment ends included). */
export function samplePolyline(pts, step = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/** Is the point inside a convex polygon? Every edge's cross product must have the same sign. */
export function insideConvex([x, y], poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) continue;
    if (!sign) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/**
 * Cut the start of a polyline so it begins `gap` px outside a convex outline.
 * Walks to the first segment that leaves the outline, finds the crossing by bisection
 * (30 halvings) and steps `gap` px further along that segment. Returns the input unchanged when
 * there is no outline or the first point is already outside.
 */
export function trimStart(pts, poly, gap) {
  if (!poly || poly.length < 3 || !insideConvex(pts[0], poly)) return pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (insideConvex(b, poly)) continue;
    let lo = 0, hi = 1;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (insideConvex([a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid], poly)) lo = mid; else hi = mid;
    }
    const t = Math.min(1, hi + gap / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1));
    return [[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ...pts.slice(i + 1)];
  }
  return pts;
}

/** The same cut at the other end of the polyline. */
export const trimEnd = (pts, poly, gap) => trimStart([...pts].reverse(), poly, gap).reverse();
