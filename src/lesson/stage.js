// clarify/src/lesson/stage.js
// Draws a laid-out Lesson as one static SVG in the approved mockup's look
// (docs/superpowers/specs/lesson-mockup): a cream bench on feet, rails set into it, a pad per
// place, then the objects back to front with an empty pucks layer per rail between them. Each
// object kind is drawn once in <defs> at the world origin and placed with <use>; tints reach it
// through CSS custom properties on its group. Also returns the screen geometry the runtime needs.
//
// SVG contract (the lesson CSS and runtime rely on it):
//   <svg class="l-svg" viewBox="0 0 1120 620" role="img" aria-label="…">
//   <defs>: <g id="l{n}-obj-{kind}"> once per used kind, and <g id="l{n}-puck">
//   <g class="l-bench">
//   per rail:  <g class="l-rail" data-rail="{id}"> then <path class="l-route" data-rail="{id}" d="M…L…"/>
//   per place: <path class="l-focus" data-place="{id}"> then <g class="l-pad" data-place="{id}" data-tint="{tint}">
//   back to front (x + y of the cell): <g class="l-obj" data-place data-tint><use …/><g class="l-bad" data-place …>…</g></g>,
//   and <g class="l-pucks" data-rail="{id}"></g> at depth min(its ends' depths) + 0.5.

import * as k from "../iso/kit.js";
import { escapeHtml } from "../markdown.js";
import { TINTS } from "./kinds.js";
import { createPen, tenth } from "./pen.js";
import { OBJECTS } from "./objects/index.js";

/** @typedef {import("../types").Lesson} Lesson */
/** @typedef {import("../types").LessonPlace} LessonPlace */
/** @typedef {import("./pen.js").Pen} Pen */
/** @typedef {import("./pen.js").Plan} Plan */

/**
 * @typedef {object} Stage
 * @property {string} svg
 * @property {Record<string, { a: [number, number], b: [number, number] }>} rails each rail's ends where it meets
 *   the two pads (floor level), in viewBox units, from the rail's `a` place to its `b` place
 * @property {[number, number]} origin screen point of world [0, 0, 0], where the <defs> drawings stand
 * @property {Record<string, [number, number]>} tags [left %, top %] of each place's tag anchor, world [x, y + 36, 3]
 * @property {Record<string, string>} tints each place's tint, as placeTints gives it
 */

const W = 1120;
const H = 620;
const CELL = 120;
const PAD = { x: -36, y: -36, w: 72, d: 72, r: 5 };
const PAD_H = 3;
const MARGIN = 12; // bench beyond the pads
const RULER = 6; // extra bench at the front, where the ruler strip lies (the mockup's 18-unit front)
const BENCH_H = 10;
const FOOT_H = 6;
const RAIL_W = 5;
const RAIL_H = 1.2;
const ROUTE_Z = 1.3;
const REACH = 30; // an object stands within ±30 of its cell centre
const BADGE_RISE = 21; // the failure badge's disc reaches about this far above an object's top
const BADGE = '<circle r="12"/><path d="M-4.5,-4.5L4.5,4.5M4.5,-4.5L-4.5,4.5"/>';

/**
 * Each place's tint (spec §5.6: chain order unless the draft sets one). Places take turns in the
 * order they first appear along the rails (rails in declaration order, each rail's a then its b),
 * then the places in no rail, in declaration order; turn i gets TINTS[i % 7], starting at neutral.
 * A tint the draft sets wins for that place only; its turn is still used up.
 * @param {Lesson} lesson
 * @returns {Record<string, string>} tint by place id
 */
export function placeTints(lesson) {
  const declared = new Set(lesson.places.map((place) => place.id));
  const turns = new Set();
  for (const { a, b } of lesson.rails) {
    for (const id of [a, b]) if (declared.has(id)) turns.add(id);
  }
  for (const id of declared) turns.add(id);
  const turnTint = new Map([...turns].map((id, i) => [id, TINTS[i % TINTS.length]]));
  return Object.fromEntries(lesson.places.map((place) => [place.id, place.tint || turnTint.get(place.id)]));
}

/**
 * @param {Lesson} lesson
 * @param {{ cells: Record<string, [number, number]>, drawn: string[] }} layout from layoutBench
 * @param {number} n the lesson's index on its page, so two lessons never share an id
 * @returns {Stage}
 */
export function renderStage(lesson, layout, n) {
  const tints = placeTints(lesson);
  const places = lesson.places.filter((place) => layout.cells[place.id]);
  const kindOf = (place) => (Object.hasOwn(OBJECTS, place.kind) ? place.kind : "box");

  // Grid cells moved so the back-left one is [0, 0]; a cell is CELL world units across.
  const raw = places.map((place) => layout.cells[place.id]);
  const [minX, minY] = raw.length ? [0, 1].map((axis) => Math.min(...raw.map((c) => c[axis]))) : [0, 0];
  const cells = new Map(places.map((place, i) => [place.id, [raw[i][0] - minX, raw[i][1] - minY]]));
  const centre = (id) => cells.get(id).map((v) => v * CELL);
  const depth = (id) => cells.get(id)[0] + cells.get(id)[1];
  const [cols, rows] = [0, 1].map((axis) => Math.max(0, ...[...cells.values()].map((c) => c[axis])) + 1);
  /** @type {Plan} */
  const bench = {
    x: PAD.x - MARGIN,
    y: PAD.y - MARGIN,
    w: (cols - 1) * CELL + PAD.w + 2 * MARGIN,
    d: (rows - 1) * CELL + PAD.d + 2 * MARGIN + RULER,
    r: 10
  };

  // Drawn rails in declaration order, once per pair of places, each from one pad edge to the other.
  const drawn = new Set(layout.drawn);
  const pairs = new Set();
  const rails = [];
  for (const { a, b } of lesson.rails) {
    const id = `${a}--${b}`;
    const pair = JSON.stringify([a, b].sort());
    if (!drawn.has(id) || pairs.has(pair) || !cells.has(a) || !cells.has(b)) continue;
    pairs.add(pair);
    const [ax, ay] = centre(a);
    const [bx, by] = centre(b);
    const [dx, dy] = [Math.sign(bx - ax), Math.sign(by - ay)];
    const half = PAD.w / 2;
    rails.push({ id, a, b, from: [ax + dx * half, ay + dy * half], to: [bx - dx * half, by - dy * half] });
  }

  // One projection for everything: the bench box plus every object's top and badge must fit.
  const fit = k.boxCorners(bench, -BENCH_H - FOOT_H, 0);
  for (const place of places) {
    const [x, y] = centre(place.id);
    const { top } = OBJECTS[kindOf(place)];
    for (const [cx, cy] of k.corners({ x: x - REACH, y: y - REACH, w: 2 * REACH, d: 2 * REACH })) fit.push([cx, cy, top]);
    fit.push([x + 10, y - 6, top + BADGE_RISE]);
  }
  const pen = createPen(k.fitProjection(fit, W, H, { pad: 26, azimuth: 45 }));
  const origin = pen.at([0, 0, 0]);

  const defs =
    [...new Set(places.map(kindOf))].map((kind) => `<g id="l${n}-obj-${kind}">${OBJECTS[kind].draw(pen)}</g>`).join("") +
    `<g id="l${n}-puck">${puckSvg(pen)}</g>`;

  const railsSvg = rails
    .map(({ id, from, to }) => {
      const plan = railPlan(from, to);
      const rail = pen.line(pen.outline(pen.inset(plan, -1.8), 0), { tone: "faint" }) + pen.solid(pen.slab(plan, 0, RAIL_H, 3, 0.3), { tone: "mid" });
      const route = pen.pathAt([[...from, ROUTE_Z], [...to, ROUTE_Z]]);
      return `<g class="l-rail" data-rail="${escapeHtml(id)}">${rail}</g><path class="l-route" data-rail="${escapeHtml(id)}" d="${route}"/>`;
    })
    .join("");

  const backToFront = [...places].sort((p, q) => depth(p.id) - depth(q.id));
  const padsSvg = backToFront
    .map((place) => {
      const [x, y] = centre(place.id);
      const plan = { ...PAD, x: x + PAD.x, y: y + PAD.y };
      const id = escapeHtml(place.id);
      return (
        `<path class="l-focus" data-place="${id}" d="${pen.outline(pen.inset(plan, -4.5), 0.2)}"/>` +
        `<g class="l-pad" data-place="${id}" data-tint="${escapeHtml(tints[place.id])}">${padSvg(pen, plan)}</g>`
      );
    })
    .join("");

  /** @param {LessonPlace} place */
  const objectSvg = (place) => {
    const kind = kindOf(place);
    const [x, y] = centre(place.id);
    const [sx, sy] = pen.at([x, y, 0]);
    const [bx, by] = pen.at([x + 10, y - 6, OBJECTS[kind].top + 9]);
    const id = escapeHtml(place.id);
    return (
      `<g class="l-obj" data-place="${id}" data-tint="${escapeHtml(tints[place.id])}">` +
      `<use href="#l${n}-obj-${kind}" transform="translate(${tenth(sx - origin[0])} ${tenth(sy - origin[1])})"/>` +
      `<g class="l-bad" data-place="${id}" transform="translate(${tenth(bx)} ${tenth(by)})">${BADGE}</g></g>`
    );
  };
  // Stable sort: places keep their order among equals, and a pucks layer (x.5) never ties a place.
  const layers = [
    ...places.map((place) => ({ depth: depth(place.id), svg: objectSvg(place) })),
    ...rails.map((rail) => ({ depth: Math.min(depth(rail.a), depth(rail.b)) + 0.5, svg: `<g class="l-pucks" data-rail="${escapeHtml(rail.id)}"></g>` }))
  ].sort((p, q) => p.depth - q.depth);

  const svg =
    `<svg class="l-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(describe(places, rails.length))}">` +
    `<defs>${defs}</defs>` +
    `<g class="l-bench">${benchSvg(pen, bench, freeCell(cells, rails, cols, rows))}</g>` +
    railsSvg +
    padsSvg +
    layers.map((layer) => layer.svg).join("") +
    `</svg>`;

  const round = (v) => Math.round(v * 10) / 10 + 0; // + 0 turns -0 into 0
  const screen = (point) => pen.at(point).map(round);
  return {
    svg,
    rails: Object.fromEntries(rails.map(({ id, from, to }) => [id, { a: screen([...from, 0]), b: screen([...to, 0]) }])),
    origin: origin.map(round),
    tags: Object.fromEntries(
      places.map((place) => {
        const [x, y] = centre(place.id);
        const [sx, sy] = pen.at([x, y + PAD.d / 2, PAD_H]);
        return [place.id, [round((sx / W) * 100), round((sy / H) * 100)]];
      })
    ),
    tints
  };
}

/** What the stage shows, for the SVG's aria-label. */
function describe(places, railCount) {
  if (!places.length) return "An empty bench";
  const list = places.map((place) => `${place.label || place.id} (${place.kind})`).join(", ");
  return `A bench with ${places.length === 1 ? "one place" : `${places.length} places`}${railCount ? " joined by rails" : ""}: ${list}`;
}

/** A rail's plan: RAIL_W wide, from one pad edge to the other. */
function railPlan([fx, fy], [tx, ty]) {
  const half = RAIL_W / 2;
  return fy === ty
    ? { x: Math.min(fx, tx), y: fy - half, w: Math.abs(tx - fx), d: RAIL_W, r: 1 }
    : { x: fx - half, y: Math.min(fy, ty), w: RAIL_W, d: Math.abs(ty - fy), r: 1 };
}

/** The world centre of the first cell, back row first and left to right, with no place and no rail through it. */
function freeCell(cells, rails, cols, rows) {
  const busy = new Set([...cells.values()].map(String));
  for (const { a, b } of rails) {
    const [[ax, ay], [bx, by]] = [cells.get(a), cells.get(b)];
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) busy.add(String([x, y]));
    }
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) if (!busy.has(String([x, y]))) return [x * CELL, y * CELL];
  }
  return null;
}

/**
 * The bench, as in the mockup: a rounded plate on four feet, an inset groove, corner screws, a
 * ruler strip along the front edge and, at the back-left of a free cell, a label plate.
 * @param {Pen} pen
 * @param {Plan} bench
 * @param {[number, number] | null} plateCell
 */
function benchSvg(pen, bench, plateCell) {
  const { solid, line, slab, cylinder, halo, outline, lineOnTop, screws, dots, byDepth, inset, corners } = pen;
  const floor = -BENCH_H - FOOT_H;
  const out = [halo(inset(bench, -2), floor, BENCH_H)];
  for (const [x, y] of byDepth(corners(bench, 18))) {
    out.push(solid(cylinder(x, y, 7, floor, 1.6, 28), { tone: "lo" }));
    out.push(solid(cylinder(x, y, 5.4, floor + 1.6, FOOT_H - 1.6, 28), { tone: "mid" }));
  }
  out.push(solid(slab(bench, -BENCH_H, BENCH_H, 8, 1.6), { tone: "mid" }));
  out.push(line(outline(inset(bench, 6), 0), { tone: "lo" }));
  out.push(screws(bench, 11, 0));
  const strip = { x: bench.x + 14, y: bench.y + bench.d - 13, w: Math.min(196, bench.w - 28), d: 6, r: 1 };
  out.push(solid(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], pen.P);
  out.push(line(ticks.minor, { tone: "lo" }), line(ticks.major, { tone: "mid" }));
  if (plateCell) {
    const plate = { x: plateCell[0] - 38, y: plateCell[1] - 38, w: 46, d: 14, r: 1.5 };
    out.push(solid(slab(plate, 0, 0.8, 3), { tone: "mid", crease: "none" }));
    [38, 30, 22].forEach((len, i) => {
      const y = plate.y + 4 + i * 4;
      out.push(line(lineOnTop([plate.x + 5, y], [plate.x + 5 + len, y], 0.8), { tone: "faint", free: "both" }));
    });
    out.push(dots(corners(plate, 2.5).map(([x, y]) => [x, y, 0.8]), { size: 0.4 }));
  }
  return out.join("");
}

/**
 * A pad: a low slab with an inset groove and four screws (no engraved label, spec §5.1).
 * @param {Pen} pen
 * @param {Plan} plan
 */
function padSvg(pen, plan) {
  return (
    pen.solid(pen.slab(plan, 0, PAD_H, 6, 0.6), { tone: "mid" }) +
    pen.line(pen.outline(pen.inset(plan, 3.5), PAD_H), { tone: "faint" }) +
    pen.screws(plan, 6, PAD_H, 0.45)
  );
}

/**
 * The puck, at the world origin: a lit cylinder on the rail top with a ring and a dot on its face.
 * @param {Pen} pen
 */
function puckSvg(pen) {
  return (
    pen.halo({ x: -4.6, y: -4.6, w: 9.2, d: 9.2, r: 4.6 }, 1.2, 0.1) +
    `<g class="l-puck">${pen.solid(pen.cylinder(0, 0, 4.8, 1.2, 3.6, 36, 0.4), { tone: "hi", lit: true })}</g>` +
    pen.line(pen.ring(0, 0, 2.6, 4.8, 24), { tone: "mid" }) +
    pen.dots([[0, 0, 4.8]], { size: 0.6, tone: "hi" })
  );
}
