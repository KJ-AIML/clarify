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
  return {
    P, at, solid, line, slab, cylinder, pathAt, outline, lineOnTop, ring, sideRing,
    faceY, faceX, segY, segX, halo, dot, dots, feet, screws, plateOnY, plateOnX, byDepth, byDepthPlans,
    inset: k.insetPlan, corners: k.corners
  };
}
