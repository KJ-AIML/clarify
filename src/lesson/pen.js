// clarify/src/lesson/pen.js
// Drawing helpers bound to one projection, ported from the approved mockup
// (docs/superpowers/specs/lesson-mockup/build-styles.mjs). World units: x and y lie on the floor,
// z points up. Every helper returns SVG markup or screen path data at the kit's 0.1 precision.

import * as k from "../iso/kit.js";

/** @typedef {{ x: number, y: number, w: number, d: number, r?: number }} Plan a rounded rectangle on the floor */
/** @typedef {{ origin: [number, number], scale: number, azimuth?: number, elevation?: number }} Projection */
/** @typedef {ReturnType<typeof createPen>} Pen */

/**
 * A number at the kit's precision: one decimal, no trailing ".0", never "-0".
 * @param {number} value
 */
export function tenth(value) {
  const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return text === "-0" ? "0" : text;
}

/** @param {Projection} P */
export function createPen(P) {
  /** @param {number[]} point world [x, y, z] → screen [x, y] */
  const at = (point) => k.iso(point, P);
  const solid = (paths, options) => k.solidSvg(paths, options);
  const line = (d, options) => k.lineSvg(d, options);
  /** @param {Plan} plan */
  const slab = (plan, z, height, steps = 4, bevel = 0) => k.slabOf(plan, z, height, P, steps, bevel);
  const cylinder = (x, y, radius, z, height, steps = 32, bevel = 0) => k.cylinder(x, y, radius, z, height, P, steps, bevel);
  const pathAt = (points, closed = false) => k.pathOf(points.map(at), closed);
  /** @param {Plan} plan */
  const outline = (plan, z) => k.planOutline(plan, z, P);
  const lineOnTop = (from, to, z) => k.lineOnTop(from, to, z, P);
  const ring = (x, y, radius, z, steps = 40) => k.ring(x, y, radius, z, P, steps);
  const sideRing = (center, radius, axis, steps = 20) => k.sideRing(center, radius, axis, P, steps);
  // A face in the plane y = const (it faces the reader at the front), or x = const (the right side).
  const faceY = (y, x1, x2, z1, z2) => pathAt([[x1, y, z1], [x2, y, z1], [x2, y, z2], [x1, y, z2]], true);
  const faceX = (x, y1, y2, z1, z2) => pathAt([[x, y1, z1], [x, y2, z1], [x, y2, z2], [x, y1, z2]], true);
  const segY = (y, x1, z1, x2, z2) => pathAt([[x1, y, z1], [x2, y, z2]]);
  const segX = (x, y1, z1, y2, z2) => pathAt([[x, y1, z1], [x, y2, z2]]);
  /** @param {Plan} plan */
  const halo = (plan, z, height) => `<path class="iso-halo" d="${k.haloOf(plan, z, height, P)}"/>`;
  const depth = ([x, y]) => k.depthOf([x, y, 0], P);
  /** Floor points, back to front. */
  const byDepth = (points) => [...points].sort((a, b) => depth(a) - depth(b));
  /** Plans, back to front by their centres. */
  const byDepthPlans = (plans) => [...plans].sort((a, b) => depth([a.x + a.w / 2, a.y + a.d / 2]) - depth([b.x + b.w / 2, b.y + b.d / 2]));
  /** A small filled disc (an LED, a lens) with its own class. */
  const dot = ([x, y, z], cls, radius = 1.3) => {
    const [sx, sy] = at([x, y, z]);
    return `<circle class="${cls}" cx="${tenth(sx)}" cy="${tenth(sy)}" r="${radius}"/>`;
  };
  /** The kit's dots at world points. */
  const dots = (points, options) => k.dotsSvg(points.map(at), options);
  /** Round rubber feet standing at z, one near each corner of a plan, back to front. */
  const feet = (plan, inset, radius, z, height) =>
    byDepth(k.corners(plan, inset)).map(([x, y]) => solid(cylinder(x, y, radius, z, height, 14), { tone: "lo" })).join("");
  /** A screw head (ring and dot) near each corner of a plan, on its top at z. */
  const screws = (plan, inset, z, size = 0.5) => {
    const c = k.corners(plan, inset);
    return line(c.map(([x, y]) => ring(x, y, 1.9, z, 14)).join(""), { tone: "lo" }) + dots(c.map(([x, y]) => [x, y, z]), { size, tone: "mid" });
  };
  /** A label plate on a front face, with ruled lines. */
  const plateOnY = (y, x1, x2, z1, z2, rules = 1) => {
    const face = faceY(y, x1, x2, z1, z2);
    let out = `<path class="l-plate" d="${face}"/>` + line(face, { tone: "lo" });
    for (let i = 0; i < rules; i++) {
      const z = z2 - (z2 - z1) * ((i + 1) / (rules + 1));
      out += line(segY(y, x1 + 2, z, x2 - 2 - i * 3, z), { tone: "faint", free: "both" });
    }
    return out;
  };
  /** A label plate on a right side face, with three ruled lines (the cabinet's and the server's). */
  const plateOnX = (x, y1, y2, z1, z2) => {
    const face = faceX(x, y1, y2, z1, z2);
    let out = `<path class="l-plate" d="${face}"/>` + line(face, { tone: "lo" });
    for (let i = 0; i < 3; i++) {
      const z = z2 - 2 - i * 2.2;
      out += line(segX(x, y1 + 2.5, z, y2 - 3 - i * 3, z), { tone: "faint", free: "both" });
    }
    return out;
  };
  /** A solid standing on any floor ring (points [x, y] in order round it), as slab() does for a plan; `convex` false for a ring with a hollow side. */
  const prism = (points, z, height, convex = true) => k.extrude(points, z, height, P, { convex });
  /** Points [x, z] round a circle in the x–z plane, from angle `from` to `to` (0 is +x, π/2 is up), both ends included. */
  const arc = (cx, cz, radius, from, to, steps) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / steps;
      return [cx + radius * Math.cos(a), cz + radius * Math.sin(a)];
    });
  const lying = (section, y0, y1) => lyingSolid(section, y0, y1, P);
  return {
    P, at, solid, line, slab, cylinder, pathAt, outline, lineOnTop, ring, sideRing,
    faceY, faceX, segY, segX, halo, dot, dots, feet, screws, plateOnY, plateOnX, byDepth, byDepthPlans,
    prism, arc, lying, inset: k.insetPlan, corners: k.corners
  };
}

/**
 * A solid lying along y (a roller, a drum, a tunnel, a dish): a convex cross-section in the x–z
 * plane (points [x, z] in order round it), from y0 at the back to y1 at the front, in the shape
 * the kit's solids take ({ fill, outline, crease, top, shades }), so pen.solid() draws it. Its
 * front end faces the reader and takes the front faces' tone (shade 3, like every +y face); round
 * its sides, faces that look up take the top tone and the rest darken towards the +x side
 * (shade 0, like every +x face), so it sits among the kit's solids without a seam.
 * @param {number[][]} section
 * @param {number} y0
 * @param {number} y1
 * @param {Projection} P
 */
function lyingSolid(section, y0, y1, P) {
  const { sinA, cosA, sinE, cosE } = k.cameraOf(P);
  // Counter-clockwise in (x, z), so each edge's outward normal is (dz, -dx).
  let area = 0;
  section.forEach(([x, z], i) => {
    const [x2, z2] = section[(i + 1) % section.length];
    area += x * z2 - x2 * z;
  });
  const ring = area < 0 ? [...section].reverse() : section;
  const n = ring.length;
  const front = ring.map(([x, z]) => k.iso([x, y1, z], P));
  const back = ring.map(([x, z]) => k.iso([x, y0, z], P));
  const sides = ring.map(([x, z], i) => {
    const [x2, z2] = ring[(i + 1) % n];
    const length = Math.hypot(x2 - x, z2 - z) || 1;
    const [nx, nz] = [(z2 - z) / length, -(x2 - x) / length];
    return { nz, facing: nx * cosA * cosE + nz * sinE > 1e-9 };
  });
  const outline = [];
  const crease = [];
  const shades = [[], [], [], [k.pathOf(front, true)]];
  const top = [];
  // Runs of neighbouring sides that face the same way, each as its list of ring indices.
  const runs = (facing) => {
    const start = sides.findIndex((side, i) => side.facing === facing && sides[(i + n - 1) % n].facing !== facing);
    if (start < 0) return sides[0].facing === facing ? [[...ring.keys(), 0]] : [];
    const out = [];
    let run = null;
    for (let step = 0; step < n; step++) {
      const i = (start + step) % n;
      if (sides[i].facing !== facing) {
        run = null;
        continue;
      }
      if (!run) out.push((run = [i]));
      run.push((i + 1) % n);
    }
    return out;
  };
  for (const run of runs(false)) outline.push(k.pathOf(run.map((i) => front[i])));
  for (const run of runs(true)) {
    crease.push(k.pathOf(run.map((i) => front[i])));
    outline.push(k.pathOf(run.map((i) => back[i])));
  }
  sides.forEach((side, i) => {
    if (side.facing !== sides[(i + n - 1) % n].facing) outline.push(k.pathOf([front[i], back[i]]));
    if (!side.facing) return;
    const j = (i + 1) % n;
    const quad = k.pathOf([front[i], front[j], back[j], back[i]], true);
    if (side.nz >= 0.8) top.push(quad);
    else shades[side.nz >= 0.55 ? 3 : side.nz >= 0.3 ? 2 : side.nz >= 0.1 ? 1 : 0].push(quad);
  });
  return { fill: k.pathOf(hull([...front, ...back]), true), outline: outline.join(""), crease: crease.join(""), top: top.join(""), shades: shades.map((d) => d.join("")) };
}

/** The convex hull of screen points (monotone chain). */
function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}
