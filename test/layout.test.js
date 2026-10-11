// Layout invariants: no overlaps, groups contain members and exclude everything else,
// cycles terminate, ordering removes avoidable crossings. Includes a seeded fuzz pass.
import test from "node:test";
import assert from "node:assert/strict";
import { parseArchBlock } from "../src/diagram/arch-parser.js";
import { computeLayout, isotonicPlace, clusterSort } from "../src/diagram/layout.js";
import { layoutViolations, randomDraft } from "./helpers/layout-check.js";

test("simple chain lays out left to right with no overlaps", () => {
  const g = parseArchBlock("[A] -> [B]: one\n[B] -> [C]: two\n[A] -> [C]: skip");
  const L = computeLayout(g);
  assert.deepEqual(layoutViolations(g, L), []);
  const [a, b, c] = ["A", "B", "C"].map(id => L.nodes.find(n => n.id === id));
  assert.ok(a.x < b.x && b.x < c.x, "ranks increase along LR");
  assert.equal(L.crossings, 0);
});

test("TD direction stacks ranks vertically", () => {
  const g = parseArchBlock("[A] -> [B]\n[B] -> [C]", { direction: "TD" });
  const L = computeLayout(g);
  const [a, b, c] = ["A", "B", "C"].map(id => L.nodes.find(n => n.id === id));
  assert.ok(a.y < b.y && b.y < c.y);
  assert.equal(L.direction, "TD");
});

test("cycles terminate and mark back edges", () => {
  const g = parseArchBlock("[A] -> [B]\n[B] -> [C]\n[C] -> [A]: retry\n[C] -> [C]: self");
  const L = computeLayout(g);
  assert.deepEqual(layoutViolations(g, L), []);
  assert.equal(L.edges.filter(e => e.reversed).length, 1);
  assert.equal(L.edges.find(e => e.from === "C" && e.to === "C").selfLoop, true);
});

test("barycenter ordering removes avoidable crossings", () => {
  // Declared in an order that crosses twice if left untouched.
  const g = parseArchBlock("[A1] -> [B2]\n[A2] -> [B1]\n[A1] -> [C2]\n[A2] -> [C1]\n[B1] -> [C1]\n[B2] -> [C2]");
  assert.equal(computeLayout(g).crossings, 0);
});

test("long edges route through virtual waypoints, labels get their own slot", () => {
  const g = parseArchBlock("[A] -> [B]\n[B] -> [C]\n[C] -> [D]\n[A] -> [D]: a long hop with a label");
  const L = computeLayout(g);
  const long = L.edges.find(e => e.from === "A" && e.to === "D");
  assert.ok(long.points.length > 2, "long edge has interior waypoints");
  assert.ok(long.labelPos, "label positioned");
  assert.deepEqual(layoutViolations(g, L), []);
});

test("nested groups contain members and exclude outsiders", () => {
  const src = `[Client] -> [Gateway]
group "VPC" {
  [Gateway] -> [API]
  group "Data" {
    [API] -> [(DB)]
    [API] -> [(Cache)]
  }
  [API] -> [Queue]
}
[Queue] -> [Worker]
[Client] -> [Worker]: direct`;
  const g = parseArchBlock(src);
  const L = computeLayout(g);
  assert.equal(L.groups.length, 2);
  assert.deepEqual(layoutViolations(g, L), []);
});

test("sibling groups sharing ranks never interleave", () => {
  const src = `group "East" { [E1] -> [E2] -> [E3] }
group "West" { [W1] -> [W2] -> [W3] }
[E1] -> [W2]
[W1] -> [E2]
[E2] -> [W3]
[W2] -> [E3]`.replace(/\{ (.*) \}/g, (_, body) => `{\n${body}\n}`);
  const g = parseArchBlock(src);
  const L = computeLayout(g);
  assert.deepEqual(layoutViolations(g, L), []);
  assert.ok(L.height < 900, `layout stays compact (height ${L.height})`);
});

test("isotonicPlace honors separations and minimizes squared distance", () => {
  const out = isotonicPlace([0, 0, 0], [1, 1, 1], [10, 10]);
  assert.deepEqual(out.map(Math.round), [-10, 0, 10]);
  const free = isotonicPlace([0, 50, 100], [1, 1, 1], [10, 10]);
  assert.deepEqual(free, [0, 50, 100]);
});

test("clusterSort keeps group members contiguous", () => {
  const paths = { a: ["g"], b: [], c: ["g"], d: [] };
  const bary = { a: 0, b: 1, c: 3, d: 2 };
  const order = clusterSort(["a", "b", "c", "d"], v => bary[v], v => paths[v], v => 0);
  const ia = order.indexOf("a");
  const ic = order.indexOf("c");
  assert.equal(Math.abs(ia - ic), 1, `group members adjacent in ${order}`);
});

test("fuzz: 150 random graphs (cycles, nested groups, labels) satisfy all invariants", () => {
  for (let seed = 1; seed <= 150; seed++) {
    const src = randomDraft(seed);
    for (const direction of ["LR", "TD"]) {
      const g = parseArchBlock(src, { direction });
      const L = computeLayout(g);
      const problems = layoutViolations(g, L);
      assert.deepEqual(problems, [], `seed ${seed} ${direction}\n${src}`);
      assert.ok(L.height < 300 * g.nodes.length + 400 && L.width < 600 * g.nodes.length + 400, `seed ${seed} ${direction}: runaway size ${L.width}×${L.height}`);
    }
  }
});
