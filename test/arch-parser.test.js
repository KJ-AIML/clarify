import test from "node:test";
import assert from "node:assert/strict";
import { parseArchBlock, scanStatement, parseNodeToken } from "../src/diagram/arch-parser.js";
import { getBrandMark } from "../src/brand-marks/brands.js";

test("brand lookup resolves ids, aliases and shorthands (v0.1 regex regression)", () => {
  for (const [key, id] of [["redis", "redis"], ["postgres", "postgresql"], ["Kafka", "apache-kafka"], ["node", "node-js"], ["Node.js", "node-js"], ["k8s", "kubernetes"], ["golang", "go"]]) {
    assert.equal(getBrandMark(key)?.id, id, key);
  }
  assert.equal(getBrandMark("celery"), null);
});

test("node tokens: shapes, tech suffix, quoted labels", () => {
  assert.deepEqual(parseNodeToken("[(Order DB:postgres)]"), { label: "Order DB", shape: "cylinder", tech: "postgres" });
  assert.deepEqual(parseNodeToken("{Ready?}"), { label: "Ready?", shape: "diamond", tech: null });
  assert.deepEqual(parseNodeToken("{[Legacy decision]}"), { label: "Legacy decision", shape: "diamond", tech: null });
  assert.deepEqual(parseNodeToken("((Start))"), { label: "Start", shape: "circle", tech: null });
  assert.deepEqual(parseNodeToken('["Edge [beta]"]'), { label: "Edge [beta]", shape: "box", tech: null });
  assert.deepEqual(parseNodeToken("[Phase: Build]"), { label: "Phase: Build", shape: "box", tech: null }, "spaced colon + non-brand stays in the label");
  assert.deepEqual(parseNodeToken("[Store: redis]"), { label: "Store", shape: "box", tech: "redis" }, "spaced colon + known brand tags");
  assert.deepEqual(parseNodeToken("[Worker:celery]"), { label: "Worker", shape: "box", tech: "celery" }, "unknown tech still tags (monogram icon)");
});

test("scanner: labels may contain arrows and colons; brackets are balanced", () => {
  const s = scanStatement("[A:go] -> [B (v2)]: maps a->b: fast");
  assert.deepEqual(s.nodes, ["[A:go]", "[B (v2)]"]);
  assert.equal(s.label, "maps a->b: fast");
  const bare = scanStatement("Client:react -> API: Request");
  assert.deepEqual(bare.nodes, ["Client:react", "API"]);
  assert.equal(bare.label, "Request");
  assert.equal(scanStatement("[A] ->"), null, "dangling arrow rejected");
});

test("edges: styles, arrows, flipped arrows, chains, dedupe, metadata", () => {
  const g = parseArchBlock(`[A] -> [B]
[A] --> [C]: async
[A] => [D]
[A] <-> [E]
[A] -- [F]
[G] <- [A]
[X] -> [Y] -> [Z]: last hop
[A] -> [B]
[A] -> [Q]: call { rps: 1.2k; desc: hot path }`);
  const e = (from, to) => g.edges.find(x => x.from === from && x.to === to);
  assert.equal(e("A", "B").style, "solid");
  assert.equal(g.edges.filter(x => x.from === "A" && x.to === "B").length, 1, "exact duplicates merged");
  assert.equal(e("A", "C").style, "dashed");
  assert.equal(e("A", "D").style, "thick");
  assert.deepEqual([e("A", "E").arrowStart, e("A", "E").arrowEnd], [true, true]);
  assert.deepEqual([e("A", "F").arrowStart, e("A", "F").arrowEnd], [false, false]);
  assert.ok(e("A", "G"), "<- flips direction");
  assert.equal(e("X", "Y").label, "");
  assert.equal(e("Y", "Z").label, "last hop");
  assert.deepEqual(e("A", "Q").meta, { rps: "1.2k", desc: "hot path" });
});

test("node identity is case/space-insensitive; first explicit shape/tech wins", () => {
  const g = parseArchBlock("[(Order DB:postgres)] -> [API]\n[order  db] -> [Cache]\n[Order DB] { owner: Data; files: a.sql, b.sql }");
  assert.equal(g.nodes.length, 3);
  const db = g.nodes[0];
  assert.deepEqual([db.label, db.shape, db.tech], ["Order DB", "cylinder", "postgres"]);
  assert.deepEqual(db.meta, { owner: "Data", files: "a.sql, b.sql" });
});

test("groups nest; nodes join the group where first declared; line numbers", () => {
  const g = parseArchBlock(`[Edge] -> [API]
group "VPC" {
  [API] -> [Svc]
  group 'Data' {
    [Svc] -> [(DB)]
  }
}`, { lineOffset: 20 });
  assert.deepEqual(g.groups.map(x => [x.label, x.parent, x.line]), [["VPC", null, 22], ["Data", "g0", 24]]);
  const group = Object.fromEntries(g.nodes.map(n => [n.id, n.group]));
  assert.deepEqual(group, { Edge: null, API: null, Svc: "g0", DB: "g1" });
  assert.equal(g.nodes.find(n => n.id === "DB").line, 25);
});

test("traces: explicit walks, legacy shortcut follows the real path, missing hops are added", () => {
  const g = parseArchBlock(`[Web] -> [CDN]
[CDN] -> [API]
[API] -> [(DB)]
[Web] -> [DB]: *trace: Checkout*
trace "Ops": API -> Audit`);
  assert.deepEqual(g.traces.map(t => [t.label, t.nodes]), [["Checkout", ["Web", "CDN", "API", "DB"]], ["Ops", ["API", "Audit"]]]);
  assert.equal(g.edges.some(e => e.from === "Web" && e.to === "DB"), false, "legacy trace does not add a shortcut edge");
  assert.ok(g.edges.some(e => e.from === "API" && e.to === "Audit"), "missing hop created");
});

test("never throws: bad lines become warnings with line numbers", () => {
  const g = parseArchBlock("[A] -> [B]\n[Broken -> [C]\n}\ngroup \"Open\" {\n[D]", { lineOffset: 4 });
  assert.equal(g.nodes.length, 3);
  assert.ok(g.warnings.some(w => w.startsWith("line 6:")), g.warnings.join("; "));
  assert.ok(g.warnings.some(w => w.includes('unmatched "}"')));
  assert.ok(g.warnings.some(w => w.includes("not closed")));
});

test("narrated trace blocks: per-hop narration, node stops, reverse hops, unclosed warning", () => {
  const g = parseArchBlock(`[Web] -> [API]
[API] -> [Auth]
[API] -> [(DB)]
trace "Checkout" {
  [Web]: The user clicks Buy.
  Web -> API: Posts the cart.
  API -> Auth: Checks the token.
  Auth -> API: Token is valid.
  API -> DB -> Audit: Writes the order, then the audit row.
}
trace "Open" {
  Web -> API: never closed`, { lineOffset: 10 });
  const [t, open] = g.traces;
  assert.deepEqual(t.steps.map(s => [s.from, s.to, s.text, s.line]), [
    ["Web", null, "The user clicks Buy.", 15],
    ["Web", "API", "Posts the cart.", 16],
    ["API", "Auth", "Checks the token.", 17],
    ["Auth", "API", "Token is valid.", 18],
    ["API", "DB", "", 19],
    ["DB", "Audit", "Writes the order, then the audit row.", 19]
  ]);
  assert.deepEqual(t.nodes, ["Web", "API", "Auth", "API", "DB", "Audit"]);
  assert.equal(g.edges.filter(e => e.from === "Auth" && e.to === "API").length, 0, "a reverse hop reuses the existing edge");
  assert.ok(g.edges.some(e => e.from === "DB" && e.to === "Audit"), "missing hop is created");
  assert.ok(g.edges.every(e => !e.label.includes("Posts the cart")), "narration never becomes an edge label");
  assert.equal(open.label, "Open");
  assert.ok(g.warnings.some(w => w.includes('trace "Open" not closed')));
});
