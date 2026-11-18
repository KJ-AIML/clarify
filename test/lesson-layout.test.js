import test from "node:test";
import assert from "node:assert/strict";
import { parseLesson } from "../src/lesson/parse.js";
import { layoutBench } from "../src/lesson/layout.js";
import { MINI } from "./fixtures/lesson-mini.js";

// A small fence: the opening line is draft line 1, so body[0] is line 2, body[1] line 3, and so on.
const fence = (...body) => ({ type: "fence", lang: "lesson", info: "Bench", line: 1, body: body.join("\n") });
const bench = (...body) => layoutBench(parseLesson(fence(...body)).lesson);
const overlaps = (b) => b.warnings.filter((w) => w.includes("overlaps"));

test("the Git chain zigzags like the mockup", () => {
  const b = layoutBench(parseLesson(MINI).lesson);
  assert.deepEqual(b.cells, { you: [0, 0], tray: [1, 0], repo: [1, -1], origin: [2, -1], mate: [2, 0] });
  assert.deepEqual(b.drawn, ["you--tray", "tray--repo", "repo--origin", "origin--mate"]);
  assert.deepEqual(b.warnings, []);
});

test("the zigzag keeps repeating past four steps", () => {
  const b = bench(
    'places: a = box "A" | b = box "B" | c = box "C" | d = box "D" | e = box "E" | f = box "F"',
    "rails: a - b - c - d - e - f"
  );
  assert.deepEqual(b.cells, { a: [0, 0], b: [1, 0], c: [1, -1], d: [2, -1], e: [2, 0], f: [3, 0] });
  assert.equal(b.drawn.length, 5);
  assert.deepEqual(b.warnings, []);
});

test("a branch takes the first free neighbour", () => {
  const b = bench(
    'places: a = box "A" | b = box "B" | c = box "C" | d = box "D"',
    "rails: a - b - c | b - d"
  );
  assert.deepEqual(b.cells.d, [1, 1]); // b is at [1,0]: above it is c, so below is the first free cell
  assert.deepEqual(b.drawn, ["a--b", "b--c", "b--d"]);
  assert.deepEqual(b.warnings, []);
});

test("the first rail chain stops where a rail does not continue from the last place", () => {
  const b = bench(
    'places: a = box "A" | b = box "B" | c = box "C" | d = box "D"',
    "rails: a - b | c - d | b - c"
  );
  // chain is a, b; c continues the zigzag from b with the next step, d is c's first free neighbour
  assert.deepEqual(b.cells, { a: [0, 0], b: [1, 0], c: [1, -1], d: [1, -2] });
  assert.deepEqual(b.drawn, ["a--b", "c--d", "b--c"]);
  assert.deepEqual(b.warnings, []);
});

test("a later rail puts its unplaced first end beside the placed second end", () => {
  const b = bench(
    'places: a = box "A" | b = box "B" | c = box "C"',
    "rails: a - b | c - a"
  );
  assert.deepEqual(b.cells, { a: [0, 0], b: [1, 0], c: [0, -1] });
  assert.deepEqual(b.drawn, ["a--b", "c--a"]);
  assert.deepEqual(b.warnings, []);
});

test("manual cells win and overlaps move", () => {
  const b = bench(
    'places: a = box "A" at=0,0 | b = box "B" at=0,0',
    "rails: a - b"
  );
  assert.deepEqual(b.cells, { a: [0, 0], b: [0, -1] });
  assert.deepEqual(b.warnings, ['line 2: "b" overlaps "a"']);
  assert.deepEqual(b.drawn, ["a--b"]);
});

test("manual cells are placed before the chain and keep their own cell", () => {
  const b = bench(
    'places: a = box "A" | b = box "B" at=5,5 | c = box "C"',
    "rails: a - b - c"
  );
  // a is the chain start; b stays put; c takes the third chain step ([0,-1]) from b's cell
  assert.deepEqual(b.cells, { a: [0, 0], b: [5, 5], c: [5, 4] });
  assert.deepEqual(b.warnings, ["line 3: rail a - b can't be drawn straight"]);
  assert.deepEqual(b.drawn, ["b--c"]);
});

test("a chain's first place takes its at= cell instead of [0,0]", () => {
  const b = bench(
    'places: a = box "A" at=3,2 | b = box "B"',
    "rails: a - b"
  );
  assert.deepEqual(b.cells, { a: [3, 2], b: [4, 2] });
  assert.deepEqual(b.warnings, []);
});

test("a computed cell that is taken warns with the places line and moves", () => {
  const b = bench(
    'places: a = box "A" | b = box "B"',
    'places: c = box "C" at=1,0',
    "rails: a - b"
  );
  // b's zigzag cell [1,0] holds c, so b takes [1,-1] (above), and the warning names b's own places line;
  // the move leaves a - b off one row, so that rail is crooked
  assert.deepEqual(b.cells, { a: [0, 0], b: [1, -1], c: [1, 0] });
  assert.deepEqual(b.warnings, ['line 2: "b" overlaps "c"', "line 4: rail a - b can't be drawn straight"]);
  assert.deepEqual(b.drawn, []);
});

test("a taken cell searches outward when all four neighbours are taken", () => {
  const b = bench(
    'places: o = box "O" at=0,0 | n = box "N" at=0,-1 | s = box "S" at=0,1 | e = box "E" at=1,0 | w = box "W" at=-1,0',
    'places: x = box "X" at=0,0'
  );
  assert.deepEqual(b.cells.x, [0, -2]);
  assert.deepEqual(overlaps(b), ['line 3: "x" overlaps "o"']);
});

test("a place with no rail continues the zigzag after everything else and warns", () => {
  const b = bench(
    'places: a = box "A" | b = box "B"',
    'places: c = box "C"',
    'places: d = box "D" | e = box "E"',
    "rails: a - b | d - e"
  );
  // chain a, b; the d - e rail continues the zigzag from b ([1,-1]) with e beside d;
  // c, in no rail, continues the zigzag from d with the next step
  assert.deepEqual(b.cells, { a: [0, 0], b: [1, 0], d: [1, -1], e: [1, -2], c: [2, -1] });
  assert.deepEqual(b.warnings, ['line 3: "c" has no rail']);
});

test("a lesson with no rails still gets a cell for its place", () => {
  const b = bench('places: x = box "X"');
  assert.deepEqual(b.cells, { x: [0, 0] });
  assert.deepEqual(b.drawn, []);
  assert.deepEqual(b.warnings, ['line 2: "x" has no rail']);
});

test("a crooked rail is not drawn", () => {
  const b = bench(
    'places: a = box "A" at=0,0 | b = box "B" at=1,1',
    "rails: a - b"
  );
  assert.deepEqual(b.cells, { a: [0, 0], b: [1, 1] });
  assert.deepEqual(b.warnings, ["line 3: rail a - b can't be drawn straight"]);
  assert.deepEqual(b.drawn, []);
});

test("a rail with a place strictly between its ends is not drawn", () => {
  const b = bench(
    'places: a = box "A" at=0,0 | b = box "B" at=1,0 | c = box "C" at=2,0',
    "rails: a - b - c | a - c"
  );
  assert.deepEqual(b.warnings, ["line 3: rail a - c can't be drawn straight"]);
  assert.deepEqual(b.drawn, ["a--b", "b--c"]);
});

test("a long straight rail with nothing between is drawn", () => {
  const b = bench(
    'places: a = box "A" at=0,0 | b = box "B" at=3,0 | c = box "C" at=1,1',
    "rails: a - b | b - c"
  );
  // c sits off the row of a - b, so it is not between; b - c is crooked
  assert.deepEqual(b.drawn, ["a--b"]);
  assert.deepEqual(b.warnings, ["line 3: rail b - c can't be drawn straight"]);
});
