// clarify/src/diagram/layout.js
// Layered (Sugiyama-style) graph layout, zero dependencies.
//
// Pipeline:
//   1. measure     node boxes from wrapped label text, icon and caption
//   2. acyclic     DFS back-edge reversal so cycles lay out cleanly
//   3. layering    longest path, then sources pulled next to their successors
//   4. normalize   ranks doubled so every edge gets a mid-rank label vertex; long edges
//                  become chains of virtual vertices; group placeholders fill gaps
//   5. ordering    barycenter sweeps + transposition, cluster-aware so group members stay
//                  contiguous; the ordering with the fewest crossings wins
//   6. placement   per-rank weighted isotonic regression (PAVA) toward neighbor means —
//                  straight long edges, centered parents, guaranteed separation
//   7. groups      boundary boxes from members; foreign vertices pushed clear of boxes
//   8. routing     spread ports per node side, smooth cubic paths through waypoints

import { textWidth, wrapText, truncate, mono } from "./text.js";
import { getBrandMark, techDisplayName } from "../brand-marks/brands.js";

export { parseArchBlock } from "./arch-parser.js";

/** @typedef {import("../types").Graph} Graph */
/** @typedef {import("../types").Layout} Layout */
/** @typedef {import("../types").LaidOutNode} LaidOutNode */
/** @typedef {import("../types").LaidOutEdge} LaidOutEdge */
/** @typedef {import("../types").Point} Point */

export const LAYOUT = {
  margin: 24,
  nodeMinW: 128,
  nodeMaxW: 236,
  labelMaxW: 168,
  padX: 14,
  tile: 30,
  tileGap: 10,
  lineH: 17,
  titleSize: 13.5,
  captionSize: 10,
  captionTracking: 0.6,
  edgeLabelSize: 10.5,
  rankGap: 24,
  nodeSep: { LR: 24, TD: 34 },
  edgeSep: 12,
  groupPad: 16,
  groupHeader: 22,
  edgeLabelMaxW: 124,
  edgeLabelLineH: 13,
  portSpacing: 12,
  sweeps: 24
};

/**
 * @param {Graph} graph
 * @returns {Layout}
 */
export function computeLayout(graph) {
  const isLR = graph.direction !== "TD";
  const C = LAYOUT;

  // ── 1. measure ──────────────────────────────────────────────────────────────
  const nodes = graph.nodes.map(n => ({ ...n, ...measureNode(n) }));
  const nodeIdx = new Map(nodes.map((n, i) => [n.id, i]));
  const groupById = new Map(graph.groups.map(g => [g.id, g]));
  const pathCache = new Map();
  const groupPath = (gid) => {
    if (!gid) return [];
    if (pathCache.has(gid)) return pathCache.get(gid);
    const p = [];
    const seen = new Set();
    for (let g = gid; g && !seen.has(g); g = groupById.get(g)?.parent ?? null) {
      seen.add(g);
      if (groupById.has(g)) p.unshift(g);
    }
    pathCache.set(gid, p);
    return p;
  };

  const validEdges = graph.edges.filter(e => nodeIdx.has(e.from) && nodeIdx.has(e.to));
  const flow = validEdges.filter(e => e.from !== e.to);
  const loops = validEdges.filter(e => e.from === e.to);
  const N = nodes.length;

  // ── 2. acyclic ──────────────────────────────────────────────────────────────
  const outEdges = Array.from({ length: N }, () => []);
  const inCount = new Array(N).fill(0);
  flow.forEach((e, k) => {
    outEdges[nodeIdx.get(e.from)].push(k);
    inCount[nodeIdx.get(e.to)]++;
  });
  const reversed = new Array(flow.length).fill(false);
  const state = new Uint8Array(N);
  const visit = (u) => {
    state[u] = 1;
    for (const k of outEdges[u]) {
      const v = nodeIdx.get(flow[k].to);
      if (state[v] === 1) reversed[k] = true;
      else if (state[v] === 0) visit(v);
    }
    state[u] = 2;
  };
  const roots = [...nodes.keys()].filter(i => inCount[i] === 0);
  for (const u of [...roots, ...nodes.keys()]) if (state[u] === 0) visit(u);

  const dag = flow.map((e, k) => {
    const a = nodeIdx.get(e.from);
    const b = nodeIdx.get(e.to);
    return reversed[k] ? [b, a] : [a, b];
  });

  // ── 3. layering ─────────────────────────────────────────────────────────────
  const preds = Array.from({ length: N }, () => []);
  const succs = Array.from({ length: N }, () => []);
  dag.forEach(([a, b]) => { succs[a].push(b); preds[b].push(a); });
  const topo = topoOrder(N, preds, succs);
  const layer = new Array(N).fill(0);
  for (const v of topo) for (const u of preds[v]) layer[v] = Math.max(layer[v], layer[u] + 1);
  balanceLayers(layer, topo, preds, succs);
  const minLayer = Math.min(0, ...layer);
  for (let i = 0; i < N; i++) layer[i] -= minLayer;

  // ── 4. normalize into vertices ──────────────────────────────────────────────
  /** @type {Array<{kind: "node"|"dummy"|"label"|"ph", rank: number, node?: number, edge?: number, group?: string, path: string[], prim: number, cross: number}>} */
  const V = [];
  nodes.forEach((n, i) => V.push({
    kind: "node", node: i, rank: layer[i] * 2, path: groupPath(n.group),
    prim: isLR ? n.width : n.height, cross: isLR ? n.height : n.width
  }));

  const chains = [];
  const segs = []; // [upper vertex, lower vertex, weight]
  dag.forEach(([a, b], k) => {
    const e = flow[k];
    const ra = V[a].rank;
    const rb = V[b].rank;
    const path = commonPrefix(V[a].path, V[b].path);
    const label = measureEdgeLabel(e.label);
    const labelText = label.lines.join(" ");
    const labelRank = ra + Math.floor((rb - ra) / 2);
    const chain = [a];
    for (let r = ra + 1; r < rb; r++) {
      const isLabel = Boolean(labelText) && r === labelRank;
      chain.push(V.length);
      V.push({
        kind: isLabel ? "label" : "dummy", rank: r, edge: k, path,
        prim: isLabel ? (isLR ? label.width : label.height) : 0,
        cross: isLabel ? (isLR ? label.height : label.width) : 0
      });
    }
    chain.push(b);
    for (let c = 1; c < chain.length; c++) {
      const virtualEnds = (V[chain[c - 1]].kind !== "node") + (V[chain[c]].kind !== "node");
      segs.push([chain[c - 1], chain[c], [1, 2, 8][virtualEnds]]);
    }
    chains.push({ chain, label });
  });

  const maxRank = Math.max(0, ...V.map(v => v.rank));
  const depthOf = (gid) => groupPath(gid).length;
  const groupsDeepFirst = [...graph.groups].sort((g, h) => depthOf(h.id) - depthOf(g.id));
  for (const g of groupsDeepFirst) {
    const inside = V.filter(v => v.path.includes(g.id));
    if (!inside.length) continue;
    const lo = Math.min(...inside.map(v => v.rank));
    const hi = Math.max(...inside.map(v => v.rank));
    for (let r = lo + 1; r < hi; r++) {
      if (!inside.some(v => v.rank === r)) {
        V.push({ kind: "ph", rank: r, group: g.id, path: groupPath(g.id), prim: 0, cross: 0 });
      }
    }
  }

  const up = V.map(() => []);
  const down = V.map(() => []);
  for (const [u, v, w] of segs) { down[u].push([v, w]); up[v].push([u, w]); }

  // ── 5. ordering ─────────────────────────────────────────────────────────────
  const ranks = Array.from({ length: maxRank + 1 }, () => []);
  const placed = new Uint8Array(V.length);
  const dfsPlace = (v) => {
    placed[v] = 1;
    ranks[V[v].rank].push(v);
    for (const [w] of down[v]) if (!placed[w]) dfsPlace(w);
  };
  for (const i of roots) if (!placed[i]) dfsPlace(i);
  for (let v = 0; v < V.length; v++) if (!placed[v] && V[v].kind === "node") dfsPlace(v);
  for (let v = 0; v < V.length; v++) if (!placed[v]) { placed[v] = 1; ranks[V[v].rank].push(v); }

  const pos = new Float64Array(V.length);
  const reindex = () => ranks.forEach(list => list.forEach((v, i) => { pos[v] = i; }));
  reindex();

  const countCrossings = () => {
    let total = 0;
    for (let r = 0; r < maxRank; r++) {
      const pairs = [];
      for (const u of ranks[r]) for (const [v] of down[u]) pairs.push([pos[u], pos[v]]);
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          const [a1, b1] = pairs[i];
          const [a2, b2] = pairs[j];
          if ((a1 - a2) * (b1 - b2) < 0) total++;
        }
      }
    }
    return total;
  };

  // Make group members contiguous before taking the baseline, so every candidate is valid.
  for (let r = 0; r <= maxRank; r++) ranks[r] = clusterSort(ranks[r], () => null, v => V[v].path, v => pos[v]);
  reindex();
  let best = countCrossings();
  let bestOrder = ranks.map(l => [...l]);
  for (let it = 0; it < C.sweeps && best > 0; it++) {
    const goingDown = it % 2 === 0;
    const order = goingDown ? range(1, maxRank) : range(maxRank - 1, 0);
    for (const r of order) {
      const bary = new Map();
      for (const v of ranks[r]) {
        const nb = goingDown ? up[v] : down[v];
        bary.set(v, nb.length ? mean(nb.map(([w]) => pos[w])) : null);
      }
      ranks[r] = clusterSort(ranks[r], v => bary.get(v), v => V[v].path, v => pos[v]);
      ranks[r].forEach((v, i) => { pos[v] = i; });
    }
    transpose();
    const c = countCrossings();
    if (c < best) {
      best = c;
      bestOrder = ranks.map(l => [...l]);
    }
  }
  bestOrder.forEach((l, r) => { ranks[r] = l; });
  reindex();
  harmonizeGroupOrder();

  // ── 6. placement ────────────────────────────────────────────────────────────
  const sepBetween = (a, b) => {
    const va = V[a];
    const vb = V[b];
    const real = (va.kind === "node") + (vb.kind === "node");
    const base = real === 2 ? C.nodeSep[isLR ? "LR" : "TD"] : real === 1 ? 16 : (va.kind === "ph" || vb.kind === "ph") ? 4 : C.edgeSep;
    const cp = commonPrefix(va.path, vb.path).length;
    const closed = va.path.length - cp;
    const opened = vb.path.length - cp;
    return (va.cross + vb.cross) / 2 + base + (closed + opened) * C.groupPad + (isLR ? opened * C.groupHeader : 0);
  };

  const coord = new Float64Array(V.length);
  for (const list of ranks) {
    let c = 0;
    list.forEach((v, i) => {
      if (i > 0) c += sepBetween(list[i - 1], v);
      coord[v] = c;
    });
    const shift = c / 2;
    for (const v of list) coord[v] -= shift;
  }

  const placeRank = (r, mode) => {
    const list = ranks[r];
    if (!list.length) return;
    const desired = [];
    const weights = [];
    for (const v of list) {
      const nb = mode === "down" ? up[v] : mode === "up" ? down[v] : [...up[v], ...down[v]];
      if (nb.length) {
        let sw = 0;
        let s = 0;
        for (const [w, weight] of nb) { s += coord[w] * weight; sw += weight; }
        desired.push(s / sw);
        weights.push(sw);
      } else {
        desired.push(coord[v]);
        weights.push(0.05);
      }
    }
    const seps = list.slice(1).map((v, i) => sepBetween(list[i], v));
    const out = isotonicPlace(desired, weights, seps);
    list.forEach((v, i) => { coord[v] = out[i]; });
  };

  for (let it = 0; it < 8; it++) {
    for (let r = 1; r <= maxRank; r++) placeRank(r, "down");
    for (let r = maxRank - 1; r >= 0; r--) placeRank(r, "up");
  }
  for (let it = 0; it < 3; it++) for (let r = 0; r <= maxRank; r++) placeRank(r, "both");

  // ── 7. rank positions + group clearance ─────────────────────────────────────
  const maxDepth = Math.max(0, ...graph.groups.map(g => depthOf(g.id)));
  const rankSize = ranks.map(list => Math.max(0, ...list.map(v => V[v].prim)));
  const extraGap = maxDepth ? maxDepth * C.groupPad + (isLR ? 0 : maxDepth * C.groupHeader) / 2 : 0;
  const rankPos = [];
  let cursor = 0;
  rankSize.forEach((size, r) => {
    if (r > 0) cursor += rankSize[r - 1] / 2 + C.rankGap + extraGap + size / 2;
    rankPos.push(cursor);
  });

  const box = (v) => {
    const p = rankPos[V[v].rank];
    const c = coord[v];
    const halfP = V[v].prim / 2;
    const halfC = V[v].cross / 2;
    return isLR
      ? { x0: p - halfP, x1: p + halfP, y0: c - halfC, y1: c + halfC }
      : { x0: c - halfC, x1: c + halfC, y0: p - halfP, y1: p + halfP };
  };

  const computeGroupBoxes = () => {
    const boxes = new Map();
    for (const g of groupsDeepFirst) {
      const members = V.map((v, i) => i).filter(i => V[i].kind !== "ph" && V[i].kind !== "dummy" && V[i].path.includes(g.id));
      const rects = members.map(box);
      for (const child of graph.groups) if (child.parent === g.id && boxes.has(child.id)) rects.push(boxes.get(child.id));
      if (!rects.length) continue;
      boxes.set(g.id, {
        x0: Math.min(...rects.map(b => b.x0)) - C.groupPad,
        x1: Math.max(...rects.map(b => b.x1)) + C.groupPad,
        y0: Math.min(...rects.map(b => b.y0)) - C.groupPad - C.groupHeader,
        y1: Math.max(...rects.map(b => b.y1)) + C.groupPad
      });
    }
    return boxes;
  };

  if (graph.groups.length) resolveGroupOverlaps();

  // ── 8. materialize nodes, ports, edges ──────────────────────────────────────
  nodes.forEach((n, i) => {
    const b = box(i);
    n.x = b.x0;
    n.y = b.y0;
  });

  // Port assignment: per node side, sort attached edge ends by the next waypoint.
  const ports = new Map();
  const portKey = (node, side) => `${node}:${side}`;
  chains.forEach(({ chain }, k) => {
    const a = chain[0];
    const b = chain.at(-1);
    const addPort = (node, side, neighbor) => {
      const key = portKey(node, side);
      if (!ports.has(key)) ports.set(key, []);
      ports.get(key).push({ k, other: coord[neighbor] });
    };
    addPort(a, "out", chain[1]);
    addPort(b, "in", chain.at(-2));
  });
  const portOffset = new Map();
  for (const [key, list] of ports) {
    const node = nodes[Number(key.split(":")[0])];
    list.sort((p, q) => p.other - q.other);
    // Diamonds and circles converge on their tip; boxes spread ports along the side.
    const span = node.shape === "diamond" || node.shape === "circle" ? 0 : (isLR ? node.height : node.width) * 0.6;
    const step = list.length > 1 ? Math.min(C.portSpacing, span / (list.length - 1)) : 0;
    list.forEach((p, i) => portOffset.set(`${key}:${p.k}`, (i - (list.length - 1) / 2) * step));
  }

  const point = (prim, cross) => (isLR ? { x: prim, y: cross } : { x: cross, y: prim });

  /** @type {LaidOutEdge[]} */
  const laidEdges = [];
  chains.forEach(({ chain, label }, k) => {
    const e = flow[k];
    const a = chain[0];
    const b = chain.at(-1);
    const pts = [];
    const aCenter = coord[a];
    const bCenter = coord[b];
    pts.push(point(rankPos[V[a].rank] + V[a].prim / 2, aCenter + portOffset.get(`${a}:out:${k}`)));
    let labelPos = null;
    for (let c = 1; c < chain.length - 1; c++) {
      const v = chain[c];
      const p = rankPos[V[v].rank];
      const half = Math.max(V[v].prim, V[v].kind === "dummy" ? rankSize[V[v].rank] : 0) / 2;
      if (half > 0) {
        pts.push(point(p - half, coord[v]));
        pts.push(point(p + half, coord[v]));
      } else {
        pts.push(point(p, coord[v]));
      }
      if (V[v].kind === "label") {
        const center = point(p, coord[v]);
        labelPos = { ...center, ...label };
      }
    }
    pts.push(point(rankPos[V[b].rank] - V[b].prim / 2, bCenter + portOffset.get(`${b}:in:${k}`)));
    if (reversed[k]) pts.reverse();
    laidEdges.push({
      ...e,
      points: pts,
      path: smoothPath(pts, isLR),
      labelPos,
      reversed: reversed[k],
      selfLoop: false
    });
  });

  for (const e of loops) {
    const n = nodes[nodeIdx.get(e.from)];
    const pts = isLR
      ? [{ x: n.x + n.width, y: n.y + n.height * 0.3 }, { x: n.x + n.width + 26, y: n.y + n.height * 0.3 }, { x: n.x + n.width + 26, y: n.y + n.height * 0.7 }, { x: n.x + n.width, y: n.y + n.height * 0.7 }]
      : [{ x: n.x + n.width * 0.3, y: n.y + n.height }, { x: n.x + n.width * 0.3, y: n.y + n.height + 26 }, { x: n.x + n.width * 0.7, y: n.y + n.height + 26 }, { x: n.x + n.width * 0.7, y: n.y + n.height }];
    const [p0, p1, p2, p3] = pts;
    const label = measureEdgeLabel(e.label);
    const w = label.width;
    laidEdges.push({
      ...e,
      points: pts,
      path: `M ${f(p0.x)} ${f(p0.y)} C ${f(p1.x)} ${f(p1.y)}, ${f(p2.x)} ${f(p2.y)}, ${f(p3.x)} ${f(p3.y)}`,
      labelPos: label.lines.length ? (isLR
        ? { x: p1.x + w / 2 + 4, y: (p1.y + p2.y) / 2, ...label }
        : { x: (p1.x + p2.x) / 2, y: p1.y + label.height / 2 + 4, ...label }) : null,
      reversed: false,
      selfLoop: true
    });
  }
  // Keep edges in declaration order so ids/indexes line up with the source.
  const order = new Map(graph.edges.map((e, i) => [e.id, i]));
  laidEdges.sort((p, q) => order.get(p.id) - order.get(q.id));

  // ── 9. groups + normalization ───────────────────────────────────────────────
  const gboxes = computeGroupBoxes();
  const laidGroups = graph.groups
    .filter(g => gboxes.has(g.id))
    .map(g => {
      const b = gboxes.get(g.id);
      return { ...g, x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, depth: depthOf(g.id) - 1 };
    });

  const xs = [];
  const ys = [];
  for (const n of nodes) { xs.push(n.x, n.x + n.width); ys.push(n.y, n.y + n.height); }
  for (const g of laidGroups) { xs.push(g.x, g.x + g.width); ys.push(g.y, g.y + g.height); }
  for (const e of laidEdges) {
    for (const p of e.points) { xs.push(p.x); ys.push(p.y); }
    if (e.labelPos) {
      xs.push(e.labelPos.x - e.labelPos.width / 2, e.labelPos.x + e.labelPos.width / 2);
      ys.push(e.labelPos.y - e.labelPos.height / 2, e.labelPos.y + e.labelPos.height / 2);
    }
  }
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const dx = C.margin - minX;
  const dy = C.margin - minY;
  for (const n of nodes) { n.x = f(n.x + dx); n.y = f(n.y + dy); }
  for (const g of laidGroups) { g.x = f(g.x + dx); g.y = f(g.y + dy); g.width = f(g.width); g.height = f(g.height); }
  for (const e of laidEdges) {
    e.points = e.points.map(p => ({ x: f(p.x + dx), y: f(p.y + dy) }));
    e.path = e.selfLoop ? translatePath(e.path, dx, dy) : smoothPath(e.points, isLR);
    if (e.labelPos) e.labelPos = { ...e.labelPos, x: f(e.labelPos.x + dx), y: f(e.labelPos.y + dy) };
  }

  const width = Math.ceil((xs.length ? Math.max(...xs) : 200) + dx + C.margin);
  const height = Math.ceil((ys.length ? Math.max(...ys) : 120) + dy + C.margin);

  return {
    direction: isLR ? "LR" : "TD",
    nodes: /** @type {LaidOutNode[]} */ (nodes),
    edges: laidEdges,
    groups: laidGroups,
    traces: graph.traces,
    width,
    height,
    crossings: best
  };

  // ── ordering helpers (closures over V, ranks, pos) ──────────────────────────

  function crossPair(u, v) {
    // Crossings contributed by edges of u and v against both adjacent ranks when u precedes v.
    let c = 0;
    for (const nbs of [[up[u], up[v]], [down[u], down[v]]]) {
      for (const [a] of nbs[0]) for (const [b] of nbs[1]) if (pos[a] > pos[b]) c++;
    }
    return c;
  }

  function transpose() {
    if (V.length > 400) return;
    for (let pass = 0; pass < 6; pass++) {
      let improved = false;
      for (let r = 0; r <= maxRank; r++) {
        const list = ranks[r];
        for (let i = 0; i < list.length - 1; i++) {
          const u = list[i];
          const v = list[i + 1];
          if (!samePath(V[u].path, V[v].path)) continue;
          if (crossPair(v, u) < crossPair(u, v)) {
            list[i] = v;
            list[i + 1] = u;
            pos[u] = i + 1;
            pos[v] = i;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }

  /**
   * Make boundary boxes disjoint from everything they don't contain. Levels are processed
   * innermost first; within a level, sibling groups go top-down and only ever move away
   * from what is already placed (rigidly, as a block), so the pass always terminates.
   */
  function resolveGroupOverlaps() {
    const GAP = 10;
    const lo = (b) => (isLR ? b.y0 : b.x0);
    const hi = (b) => (isLR ? b.y1 : b.x1);
    const startOf = (v) => coord[v] - V[v].cross / 2;
    const endOf = (v) => coord[v] + V[v].cross / 2;
    const under = (path, prefix) => path.length >= prefix.length && prefix.every((g, i) => path[i] === g);
    const parents = [...groupsDeepFirst.map(g => g.id), null];

    for (let pass = 0; pass < 3; pass++) {
      for (const parent of parents) {
        const ppath = parent ? groupPath(parent) : [];
        const depth = ppath.length;
        let boxes = computeGroupBoxes();
        // Process siblings in their in-rank order (consistent after harmonizeGroupOrder);
        // fall back to box position for siblings that never share a rank.
        const firstIndex = (gid, list) => list.findIndex(v => V[v].path[depth] === gid);
        const children = graph.groups
          .filter(g => g.parent === parent && boxes.has(g.id))
          .sort((a, b) => {
            for (const list of ranks) {
              const ia = firstIndex(a.id, list);
              const ib = firstIndex(b.id, list);
              if (ia !== -1 && ib !== -1) return ia - ib;
            }
            return lo(boxes.get(a.id)) - lo(boxes.get(b.id));
          });
        for (const g of children) {
          // 1. Clear what sits above the block: earlier siblings' boxes and direct members.
          let gb = boxes.get(g.id);
          let need = 0;
          for (const list of ranks) {
            const i0 = list.findIndex(v => V[v].path[depth] === g.id);
            if (i0 <= 0) continue;
            const v = list[i0 - 1];
            if (!under(V[v].path, ppath)) continue;
            const sib = V[v].path[depth];
            if (!sib && V[v].kind === "ph") continue; // the parent's own placeholder: no extent
            const sb = sib ? boxes.get(sib) : null;
            if (sib && !sb) continue;
            need = Math.max(need, (sb ? hi(sb) : endOf(v)) + GAP - lo(gb));
          }
          if (need > 0.5) {
            V.forEach((v, i) => { if (v.path[depth] === g.id) coord[i] += need; });
            boxes = computeGroupBoxes();
            gb = boxes.get(g.id);
          }
          // 2. Push the run of direct members just below the block out of the box.
          for (const list of ranks) {
            let i1 = -1;
            list.forEach((v, i) => { if (V[v].path[depth] === g.id) i1 = i; });
            if (i1 === -1) continue;
            const run = [];
            for (let j = i1 + 1; j < list.length && V[list[j]].path.length === depth && under(V[list[j]].path, ppath); j++) run.push(list[j]);
            const first = run.find(v => V[v].kind !== "ph");
            if (first === undefined) continue;
            const over = hi(gb) + GAP - startOf(first);
            if (over > 0.5) run.forEach(v => { coord[v] += over; });
          }
        }
      }
      // Restore per-rank separation (only ever pushes later vertices further along).
      for (const list of ranks) {
        for (let i = 1; i < list.length; i++) {
          const need = coord[list[i - 1]] + sepBetween(list[i - 1], list[i]) - coord[list[i]];
          if (need > 0.01) coord[list[i]] += need;
        }
      }
    }
  }

  // Give sibling groups the same relative order in every rank, so boxes never interleave.
  function harmonizeGroupOrder() {
    if (!graph.groups.length) return;
    const avg = new Map();
    for (const g of graph.groups) {
      const vals = V.map((v, i) => i).filter(i => V[i].path.includes(g.id)).map(i => pos[i] / Math.max(1, ranks[V[i].rank].length - 1));
      avg.set(g.id, vals.length ? mean(vals) : 0);
    }
    for (let r = 0; r <= maxRank; r++) {
      ranks[r] = reorderGroups(ranks[r], 0);
      ranks[r].forEach((v, i) => { pos[v] = i; });
    }
    function reorderGroups(list, depth) {
      // Partition into consecutive blocks at this depth.
      const blocks = [];
      for (const v of list) {
        const k = V[v].path[depth] ?? null;
        const last = blocks.at(-1);
        if (k !== null && last && last.key === k) last.items.push(v);
        else blocks.push({ key: k, items: [v] });
      }
      const groupSlots = blocks.map((b, i) => (b.key !== null ? i : -1)).filter(i => i >= 0);
      const sortedGroups = groupSlots.map(i => blocks[i]).sort((p, q) => avg.get(p.key) - avg.get(q.key));
      groupSlots.forEach((slot, j) => { blocks[slot] = sortedGroups[j]; });
      return blocks.flatMap(b => (b.key !== null ? reorderGroups(b.items, depth + 1) : b.items));
    }
  }
}

/**
 * Shorten edges after longest-path layering (a lightweight stand-in for network simplex).
 * Each node moves within the range its edges allow: toward its predecessors when it has
 * more of them, toward its successors when it has more of those. On a tie, it moves toward
 * whichever side's neighbors can follow (they feed or consume only this node), so side
 * chains like `Rule Engine → Reflection → Store` end up beside the node they attach to
 * instead of stretched across the whole diagram.
 */
export function balanceLayers(layer, topo, preds, succs) {
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (const v of pass % 2 ? [...topo].reverse() : topo) {
      const np = preds[v].length;
      const ns = succs[v].length;
      if (!np && !ns) continue;
      const lo = np ? Math.max(...preds[v].map(u => layer[u] + 1)) : -Infinity;
      const hi = ns ? Math.min(...succs[v].map(w => layer[w] - 1)) : Infinity;
      let target = layer[v];
      if (np > ns) target = lo;
      else if (ns > np) target = hi;
      else {
        const predsFollow = preds[v].every(u => succs[u].length === 1);
        const succsFollow = succs[v].every(w => preds[w].length === 1);
        if (predsFollow && !succsFollow) target = hi;
        else if (succsFollow && !predsFollow) target = lo;
      }
      if (Number.isFinite(target) && target !== layer[v]) {
        layer[v] = target;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

// ── measurement ───────────────────────────────────────────────────────────────

/** Node box size, wrapped label lines and caption. */
export function measureNode(node) {
  const C = LAYOUT;
  const mark = getBrandMark(node.tech) || (node.tech ? null : getBrandMark(node.label));
  const hasIcon = Boolean(node.tech || mark);
  let caption = node.meta?.tech || (node.tech ? techDisplayName(node.tech) : "");
  if (caption.toLowerCase() === node.label.toLowerCase()) caption = "";
  // Captions render as monospace small caps ("POSTGRESQL"), like a spec label.
  caption = caption ? truncate(caption.toUpperCase(), C.labelMaxW, C.captionSize, false, mono(C.captionTracking)) : "";
  const lines = wrapText(node.label, C.labelMaxW, C.titleSize, true, 2);
  const textW = Math.max(...lines.map(l => textWidth(l, C.titleSize, true)), caption ? mono(C.captionTracking)(caption, C.captionSize) : 0);
  const iconW = hasIcon ? C.tile + C.tileGap : 0;
  let width = clamp((hasIcon ? 10 : C.padX) + iconW + textW + C.padX, C.nodeMinW, C.nodeMaxW);
  let height = Math.max(hasIcon ? 52 : 46, 26 + lines.length * C.lineH + (caption ? 14 : 0));
  if (node.shape === "diamond") { width += 36; height += 22; }
  if (node.shape === "cylinder") height += 10;
  if (node.shape === "circle") { height = Math.max(height, 64); width = Math.max(width, height + 24); }
  return { width: Math.round(width), height: Math.round(height), lines, caption, x: 0, y: 0 };
}

/** Edge label box: up to two wrapped lines of 11px text. */
export function measureEdgeLabel(text) {
  const C = LAYOUT;
  if (!text) return { lines: [], width: 0, height: 0, text: "" };
  const lines = wrapText(text, C.edgeLabelMaxW - 16, C.edgeLabelSize, false, 2, mono());
  const width = Math.max(...lines.map(l => mono()(l, C.edgeLabelSize))) + 16;
  return { lines, width: Math.round(width), height: lines.length * C.edgeLabelLineH + 7, text };
}

// ── geometry helpers ──────────────────────────────────────────────────────────

/** Smooth path through waypoints using cubic segments with tangents along the flow axis. */
export function smoothPath(points, isLR) {
  if (!points.length) return "";
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if ((isLR && Math.abs(a.y - b.y) < 0.5) || (!isLR && Math.abs(a.x - b.x) < 0.5)) {
      d += ` L ${f(b.x)} ${f(b.y)}`;
      continue;
    }
    if (isLR) {
      const dx = (b.x - a.x) / 2;
      d += ` C ${f(a.x + dx)} ${f(a.y)}, ${f(b.x - dx)} ${f(b.y)}, ${f(b.x)} ${f(b.y)}`;
    } else {
      const dy = (b.y - a.y) / 2;
      d += ` C ${f(a.x)} ${f(a.y + dy)}, ${f(b.x)} ${f(b.y - dy)}, ${f(b.x)} ${f(b.y)}`;
    }
  }
  return d;
}

/**
 * Minimize Σ w_i (x_i − d_i)² subject to x_{i+1} − x_i ≥ sep_i, via pool-adjacent-violators
 * on the shifted problem y_i = x_i − Σ_{k<i} sep_k (which turns spacing into monotonicity).
 */
export function isotonicPlace(desired, weights, seps) {
  const n = desired.length;
  const offset = new Array(n).fill(0);
  for (let i = 1; i < n; i++) offset[i] = offset[i - 1] + seps[i - 1];
  const blocks = [];
  for (let i = 0; i < n; i++) {
    blocks.push({ sum: (desired[i] - offset[i]) * weights[i], w: weights[i], count: 1 });
    while (blocks.length > 1) {
      const b = blocks.at(-1);
      const a = blocks.at(-2);
      if (a.sum / a.w <= b.sum / b.w) break;
      blocks.pop();
      a.sum += b.sum;
      a.w += b.w;
      a.count += b.count;
    }
  }
  const out = [];
  for (const b of blocks) for (let c = 0; c < b.count; c++) out.push(b.sum / b.w + offset[out.length]);
  return out;
}

/**
 * Sort a rank so that members of the same group stay contiguous (recursively for nested
 * groups). Blocks are ordered by the mean barycenter of their members; vertices without
 * a barycenter keep their current position.
 */
export function clusterSort(list, baryOf, pathOf, posOf, depth = 0) {
  const blocks = new Map();
  for (const v of list) {
    const k = pathOf(v)[depth] ?? `#${v}`;
    if (!blocks.has(k)) blocks.set(k, []);
    blocks.get(k).push(v);
  }
  const scored = [...blocks.entries()].map(([k, items]) => {
    const known = items.map(baryOf).filter(b => b !== null && b !== undefined);
    const score = known.length ? mean(known) : mean(items.map(posOf));
    return { k, items, score, tie: Math.min(...items.map(posOf)) };
  });
  scored.sort((a, b) => a.score - b.score || a.tie - b.tie);
  return scored.flatMap(({ k, items }) =>
    (k.startsWith("#") ? items : clusterSort(items, baryOf, pathOf, posOf, depth + 1)));
}

function topoOrder(n, preds, succs) {
  const indeg = preds.map(p => p.length);
  const queue = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  const out = [];
  while (queue.length) {
    const v = queue.shift();
    out.push(v);
    for (const s of succs[v]) if (--indeg[s] === 0) queue.push(s);
  }
  // Defensive: should be unreachable after cycle removal.
  for (let i = 0; i < n; i++) if (!out.includes(i)) out.push(i);
  return out;
}

function translatePath(d, dx, dy) {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (num) => f(Number(num) + (i++ % 2 === 0 ? dx : dy)));
}

function commonPrefix(a, b) {
  const out = [];
  for (let i = 0; i < Math.min(a.length, b.length) && a[i] === b[i]; i++) out.push(a[i]);
  return out;
}

function samePath(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function range(from, to) {
  const out = [];
  if (from <= to) for (let i = from; i <= to; i++) out.push(i);
  else for (let i = from; i >= to; i--) out.push(i);
  return out;
}

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function f(n) {
  return Math.round(n * 10) / 10;
}
