// Shared layout invariant checker and seeded random draft generator (used by tests and
// for debugging layouts by hand).

const rect = (x0, y0, x1, y1, id) => ({ x0, y0, x1, y1, id });
const nodeRect = (n) => rect(n.x, n.y, n.x + n.width, n.y + n.height, n.id);
const labelRect = (e) => rect(e.labelPos.x - e.labelPos.width / 2, e.labelPos.y - e.labelPos.height / 2, e.labelPos.x + e.labelPos.width / 2, e.labelPos.y + e.labelPos.height / 2, `label:${e.id}`);
const groupRect = (g) => rect(g.x, g.y, g.x + g.width, g.y + g.height, g.id);
const overlaps = (a, b, eps = 0.5) => a.x0 < b.x1 - eps && b.x0 < a.x1 - eps && a.y0 < b.y1 - eps && b.y0 < a.y1 - eps;
const contains = (outer, inner) => inner.x0 >= outer.x0 - 0.5 && inner.x1 <= outer.x1 + 0.5 && inner.y0 >= outer.y0 - 0.5 && inner.y1 <= outer.y1 + 0.5;

/** Returns a list of human-readable invariant violations (empty when the layout is sound). */
export function layoutViolations(graph, layout) {
  const problems = [];
  const nodes = layout.nodes.map(nodeRect);
  const labels = layout.edges.filter(e => e.labelPos && !e.selfLoop).map(labelRect);
  const boxes = [...nodes, ...labels];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j])) problems.push(`overlap: ${boxes[i].id} × ${boxes[j].id}`);
    }
  }
  const byId = new Map(graph.groups.map(g => [g.id, g]));
  const ancestors = (gid) => { const out = []; for (let g = gid; g; g = byId.get(g)?.parent) out.push(g); return out; };
  for (const g of layout.groups) {
    const gr = groupRect(g);
    for (const n of layout.nodes) {
      const inside = ancestors(n.group).includes(g.id);
      const nr = nodeRect(n);
      if (inside && !contains(gr, nr)) problems.push(`group ${g.label} does not contain ${n.id}`);
      if (!inside && overlaps(gr, nr)) problems.push(`group ${g.label} overlaps foreign node ${n.id}`);
    }
    for (const h of layout.groups) {
      if (h.id <= g.id) continue;
      const nested = ancestors(h.id).includes(g.id) || ancestors(g.id).includes(h.id);
      if (!nested && overlaps(gr, groupRect(h))) problems.push(`groups ${g.label} × ${h.label} overlap`);
    }
  }
  for (const n of layout.nodes) {
    if (![n.x, n.y, n.width, n.height].every(Number.isFinite)) problems.push(`non-finite geometry for ${n.id}`);
    if (n.x < 0 || n.y < 0 || n.x + n.width > layout.width || n.y + n.height > layout.height) problems.push(`${n.id} outside canvas`);
  }
  return problems;
}



function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomDraft(seed) {
  const r = rng(seed);
  const n = 4 + Math.floor(r() * 18);
  const groups = Math.floor(r() * 4);
  const names = Array.from({ length: n }, (_, i) => `Svc ${i}`);
  const assign = names.map(() => (r() < 0.6 && groups ? Math.floor(r() * groups) : -1));
  const nestedParent = Array.from({ length: groups }, (_, gi) => (gi > 0 && r() < 0.3 ? gi - 1 : -1));
  const lines = [];
  const emitGroup = (gi, indent) => {
    lines.push(`${indent}group "G${gi}" {`);
    names.forEach((nm, i) => { if (assign[i] === gi) lines.push(`${indent}  [${nm}]`); });
    nestedParent.forEach((p, ci) => { if (p === gi) emitGroup(ci, `${indent}  `); });
    lines.push(`${indent}}`);
  };
  nestedParent.forEach((p, gi) => { if (p === -1) emitGroup(gi, ""); });
  names.forEach((nm, i) => { if (assign[i] === -1) lines.push(`[${nm}]`); });
  const edges = Math.floor(n * (1 + r()));
  for (let k = 0; k < edges; k++) {
    const a = names[Math.floor(r() * n)];
    const b = names[Math.floor(r() * n)];
    const label = r() < 0.4 ? `: call ${k}` : "";
    lines.push(`[${a}] ${r() < 0.2 ? "-->" : "->"} [${b}]${label}`);
  }
  return lines.join("\n");
}

