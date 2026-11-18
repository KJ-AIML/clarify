import test from "node:test";
import assert from "node:assert/strict";
import * as k from "../src/iso/kit.js";
import { OBJECT_KINDS } from "../src/lesson/kinds.js";
import { parseLesson } from "../src/lesson/parse.js";
import { layoutBench } from "../src/lesson/layout.js";
import { createPen } from "../src/lesson/pen.js";
import { OBJECTS } from "../src/lesson/objects/index.js";
import { renderStage } from "../src/lesson/stage.js";
import { MINI } from "./fixtures/lesson-mini.js";

const lesson = parseLesson(MINI).lesson;
const stage = renderStage(lesson, layoutBench(lesson), 0);

const count = (text, needle) => text.split(needle).length - 1;
const tenth = (value) => Math.round(value * 10) / 10;
/** A small lesson fence; its opening line is draft line 1. */
const fence = (...body) => ({ type: "fence", lang: "lesson", info: "Bench", line: 1, body: body.join("\n") });
const stageOf = (...body) => {
  const parsed = parseLesson(fence(...body)).lesson;
  return renderStage(parsed, layoutBench(parsed), 0);
};

/** Every point the stage paints, in viewBox units: path points, objects moved onto their cells, badge discs. */
function paintedPoints(svg) {
  const points = (text) => [...text.matchAll(/[ML](-?\d+(?:\.\d)?) (-?\d+(?:\.\d)?)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const defs = svg.slice(svg.indexOf("<defs>") + "<defs>".length, svg.indexOf("</defs>"));
  const drawings = Object.fromEntries(defs.split(/(?=<g id=")/).map((part) => [part.match(/^<g id="([^"]+)"/)[1], points(part)]));
  const out = points(svg.replace(defs, ""));
  for (const m of svg.matchAll(/<use href="#([^"]+)" transform="translate\((-?[\d.]+) (-?[\d.]+)\)"\/>/g)) {
    for (const [x, y] of drawings[m[1]]) out.push([x + Number(m[2]), y + Number(m[3])]);
  }
  for (const m of svg.matchAll(/<g class="l-bad" data-place="[^"]*" transform="translate\((-?[\d.]+) (-?[\d.]+)\)">/g)) {
    out.push([Number(m[1]) - 12, Number(m[2]) - 12], [Number(m[1]) + 12, Number(m[2]) + 12]);
  }
  return out;
}

test("objects are crafted", () => {
  const pen = createPen(k.fitProjection([[-40, -40, 0], [40, 40, 80]], 400, 400, { pad: 10, azimuth: 45 }));
  const least = { laptop: 20, tray: 10, cabinet: 15, server: 12, box: 8 };
  for (const [kind, min] of Object.entries(least)) {
    const solids = count(OBJECTS[kind].draw(pen), 'class="iso-solid"');
    assert.ok(solids >= min, `${kind} has ${solids} solids, want at least ${min}`);
  }
  const tops = Object.fromEntries(Object.keys(least).map((kind) => [kind, OBJECTS[kind].top]));
  assert.deepEqual(tops, { laptop: 46, tray: 18, cabinet: 53, server: 70, box: 30 });
});

test("every kind has a drawing; kinds not drawn yet stand as boxes", () => {
  assert.deepEqual(Object.keys(OBJECTS).sort(), [...OBJECT_KINDS].sort());
  const own = ["laptop", "tray", "cabinet", "server"];
  for (const kind of OBJECT_KINDS) {
    if (own.includes(kind)) assert.notEqual(OBJECTS[kind], OBJECTS.box, kind);
    else assert.equal(OBJECTS[kind], OBJECTS.box, kind);
  }
  const s = stageOf('places: a = phone "A" | b = mystery "B"', "rails: a - b");
  assert.equal(count(s.svg, '<use href="#l0-obj-phone"'), 1);
  assert.equal(count(s.svg, '<use href="#l0-obj-box"'), 1); // the parser turns an unknown kind into a box
});

test("repeated kinds share one drawing", () => {
  assert.equal(count(stage.svg, 'id="l0-obj-laptop"'), 1);
  assert.equal(count(stage.svg, 'href="#l0-obj-laptop"'), 2);
  const defs = stage.svg.slice(stage.svg.indexOf("<defs>"), stage.svg.indexOf("</defs>"));
  const ids = [...defs.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["l0-obj-laptop", "l0-obj-tray", "l0-obj-cabinet", "l0-obj-server", "l0-puck"]);
});

test("rails, tags and pucks layers line up", () => {
  assert.equal(count(stage.svg, 'class="l-route"'), 4);
  assert.equal(count(stage.svg, 'class="l-pucks"'), 4);
  assert.deepEqual(Object.keys(stage.rails), ["you--tray", "tray--repo", "repo--origin", "origin--mate"]);
  assert.deepEqual(Object.keys(stage.tags), ["you", "tray", "repo", "origin", "mate"]);
  for (const [id, [left, top]] of Object.entries(stage.tags)) {
    assert.ok(left >= 0 && left <= 100 && top >= 0 && top <= 100, `${id} tag at ${left}%, ${top}%`);
  }
  assert.notDeepEqual(stage.rails["you--tray"].a, stage.rails["you--tray"].b);
});

test("painter's order follows depth", () => {
  const repo = stage.svg.indexOf('<g class="l-obj" data-place="repo"');
  const tray = stage.svg.indexOf('<g class="l-obj" data-place="tray"');
  const pucks = stage.svg.indexOf('<g class="l-pucks" data-rail="tray--repo"');
  assert.ok(repo >= 0 && repo < pucks && pucks < tray, `repo ${repo}, pucks ${pucks}, tray ${tray}`);
  const order = [...stage.svg.matchAll(/<g class="l-(?:obj|pucks)" data-(?:place|rail)="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["you", "repo", "you--tray", "tray--repo", "repo--origin", "tray", "origin", "origin--mate", "mate"]);
});

test("the SVG follows the stage contract", () => {
  const svg = stage.svg;
  assert.ok(svg.startsWith('<svg class="l-svg" viewBox="0 0 1120 620" role="img" aria-label="'), svg.slice(0, 120));
  assert.ok(svg.endsWith("</svg>"));
  assert.match(svg, /aria-label="[^"]*Your folder[^"]*Teammate[^"]*"/);
  const layers = [
    "<defs>",
    '<g class="l-bench">',
    '<g class="l-rail" data-rail="you--tray">',
    '<path class="l-route" data-rail="you--tray" d="M',
    '<path class="l-focus" data-place="you" d="M',
    '<g class="l-pad" data-place="you" data-tint="neutral">',
    '<g class="l-obj" data-place="you" data-tint="neutral"><use href="#l0-obj-laptop" transform="translate('
  ].map((needle) => [needle, svg.indexOf(needle)]);
  for (const [needle, at] of layers) assert.ok(at >= 0, `missing ${needle}`);
  assert.deepEqual(layers.map(([, at]) => at), layers.map(([, at]) => at).sort((a, b) => a - b));
  assert.equal(count(svg, '<g class="l-bench">'), 1);
  assert.equal(count(svg, '<g class="l-rail"'), 4);

  const tints = { you: "neutral", tray: "amber", repo: "violet", origin: "blue", mate: "green" };
  const kinds = { you: "laptop", tray: "tray", repo: "cabinet", origin: "server", mate: "laptop" };
  for (const [id, tint] of Object.entries(tints)) {
    const focusThenPad = new RegExp(`<path class="l-focus" data-place="${id}" d="M[^"]+Z"/><g class="l-pad" data-place="${id}" data-tint="${tint}">`);
    assert.equal(count(svg, `data-place="${id}"`), 4, id); // focus ring, pad, object, badge
    assert.match(svg, focusThenPad, id);
    const object = new RegExp(`<g class="l-obj" data-place="${id}" data-tint="${tint}"><use href="#l0-obj-${kinds[id]}" transform="translate\\(-?[\\d.]+ -?[\\d.]+\\)"/><g class="l-bad" data-place="${id}" transform="translate\\(-?[\\d.]+ -?[\\d.]+\\)"><circle r="12"/><path d="[^"]+"/></g></g>`);
    assert.match(svg, object, id);
  }

  // Coordinates keep the kit's one-decimal precision.
  for (const m of svg.matchAll(/ (?:d|cx|cy|transform)="([^"]*)"/g)) assert.doesNotMatch(m[1], /\d\.\d\d/);
  for (const value of [stage.origin, ...Object.values(stage.tags), ...Object.values(stage.rails).flatMap((r) => [r.a, r.b])]) {
    for (const v of value) assert.equal(v, tenth(v));
  }
});

test("screen geometry comes from one fitted projection", () => {
  // MINI's cells, normalised: you [0,1], tray [1,1], repo [1,0], origin [2,0], mate [2,1], 120 world units each.
  // Pads span x -36..276 and y -36..156; the bench adds 12 (18 at the front, where the ruler is) and stands
  // 16 deep with its feet. Every object top and badge falls inside that box, so the bench alone sets the fit.
  const P = k.fitProjection(k.boxCorners({ x: -48, y: -48, w: 336, d: 222 }, -16, 0), 1120, 620, { pad: 26, azimuth: 45 });
  const at = (p) => k.iso(p, P).map(tenth);
  const pct = (p) => {
    const [x, y] = k.iso(p, P);
    return [tenth((x / 1120) * 100), tenth((y / 620) * 100)];
  };
  assert.deepEqual(stage.origin, at([0, 0, 0]));
  assert.deepEqual(stage.origin, [451.6, 117.3]);
  assert.deepEqual(stage.rails, {
    "you--tray": { a: at([36, 120, 0]), b: at([84, 120, 0]) },
    "tray--repo": { a: at([120, 84, 0]), b: at([120, 36, 0]) },
    "repo--origin": { a: at([156, 0, 0]), b: at([204, 0, 0]) },
    "origin--mate": { a: at([240, 36, 0]), b: at([240, 84, 0]) }
  });
  assert.deepEqual(stage.tags, {
    you: pct([0, 156, 3]),
    tray: pct([120, 156, 3]),
    repo: pct([120, 36, 3]),
    origin: pct([240, 36, 3]),
    mate: pct([240, 156, 3])
  });

  // An object is its drawing at the world origin, moved by screen(cell) - screen(origin).
  const [ox, oy] = k.iso([0, 0, 0], P);
  const [sx, sy] = k.iso([240, 0, 0], P);
  assert.ok(stage.svg.includes(`<use href="#l0-obj-server" transform="translate(${tenth(sx - ox)} ${tenth(sy - oy)})"/>`));
  // The route runs along the rail top, from a to b; the badge floats above the object.
  const route = k.pathOf([k.iso([36, 120, 1.3], P), k.iso([84, 120, 1.3], P)]);
  assert.ok(stage.svg.includes(`<path class="l-route" data-rail="you--tray" d="${route}"/>`), route);
  const [bx, by] = k.iso([130, 114, 18 + 9], P); // tray: [x + 10, y - 6, top + 9]
  assert.ok(stage.svg.includes(`<g class="l-bad" data-place="tray" transform="translate(${tenth(bx)} ${tenth(by)})">`));
  // The puck is drawn once at the world origin: a cylinder of radius 4.8 standing on z 1.2.
  const puck = stage.svg.slice(stage.svg.indexOf('<g id="l0-puck">'), stage.svg.indexOf("</defs>"));
  assert.ok(puck.includes(k.solidSvg(k.cylinder(0, 0, 4.8, 1.2, 3.6, P, 36, 0.4), { tone: "hi", lit: true })));
});

test("a rail declared twice is drawn once", () => {
  const s = stageOf('places: a = box "A" | b = box "B"', "rails: a - b | a - b | b - a");
  assert.equal(count(s.svg, '<g class="l-rail"'), 1);
  assert.equal(count(s.svg, 'class="l-route"'), 1);
  assert.equal(count(s.svg, 'class="l-pucks"'), 1);
  assert.deepEqual(Object.keys(s.rails), ["a--b"]);
});

test("a tint the draft sets wins; the others follow place order", () => {
  const s = stageOf('places: a = box "A" | b = box "B" tint=rose | c = box "C"', "rails: a - b - c");
  const tints = [...s.svg.matchAll(/<g class="l-obj" data-place="(\w)" data-tint="(\w+)"/g)].map((m) => `${m[1]}=${m[2]}`).sort();
  assert.deepEqual(tints, ["a=neutral", "b=rose", "c=violet"]);
});

test("any layout fits the stage", () => {
  const drafts = {
    one: ['places: a = server "A"'],
    row: ['places: a = server "A" | b = server "B"', "rails: a - b"],
    seven: [
      'places: a = server "A" | b = laptop "B" | c = cabinet "C" | d = server "D" | e = tray "E" | f = server "F" | g = box "G"',
      "rails: a - b - c - d - e - f - g"
    ],
    pinned: ['places: a = server "A" at=-3,4 | b = server "B" at=2,-1'],
    mini: null
  };
  for (const [name, body] of Object.entries(drafts)) {
    const s = body ? stageOf(...body) : stage;
    const points = paintedPoints(s.svg);
    assert.ok(points.length > 100, name);
    for (const [x, y] of points) assert.ok(x >= 0 && x <= 1120 && y >= 0 && y <= 620, `${name}: ${x}, ${y} is off the stage`);
    for (const { a, b } of Object.values(s.rails)) assert.ok([a, b].every(([x, y]) => x >= 0 && x <= 1120 && y >= 0 && y <= 620), name);
    for (const [left, top] of Object.values(s.tags)) assert.ok(left >= 0 && left <= 100 && top >= 0 && top <= 100, name);
  }
});

test("an empty or half-typed lesson still draws a bench", () => {
  const s = stageOf("subtitle: nothing yet");
  assert.match(s.svg, /^<svg class="l-svg"[^>]*>.*<g class="l-bench">.*<\/svg>$/s);
  assert.deepEqual([s.rails, s.tags], [{}, {}]);
  assert.equal(s.origin.length, 2);
});

test("author text is escaped", () => {
  const s = stageOf('places: a<b&c = laptop "<img src=x>" | d = box "D"', "rails: a<b&c - d");
  assert.ok(!s.svg.includes("<img"));
  assert.ok(s.svg.includes('data-place="a&lt;b&amp;c"'));
  assert.ok(s.svg.includes('data-rail="a&lt;b&amp;c--d"'));
  assert.deepEqual(Object.keys(s.rails), ["a<b&c--d"]);
});
