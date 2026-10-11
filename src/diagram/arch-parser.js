// clarify/src/diagram/arch-parser.js
// Parser for Clarify's native `arch` / `flow` diagram syntax.
//
//   [Client:react] -> [API:node]: HTTPS            edge with label (solid)
//   [API] --> [(Audit Log:postgres)]               dashed · [(…)] cylinder · {…} decision
//   [A] => [B] · [A] <-> [B] · [A] -- [B]          thick · bidirectional · plain line
//   [A] -> [B] -> [C]: label                       chain (label applies to the last hop)
//   [API] { owner: Payments; files: src/api.go }   node metadata (shown in the inspector)
//   group "VPC us-east-1" { … }                    boundary box (nestable)
//   trace "Checkout": [A] -> [B] -> [C]            animated request path along edges
//   trace "Checkout" {                             narrated route: one caption per hop,
//     [A] -> [B]: Browser sends the order            played as a guided tour on the page
//     [B]: Validates the session                     (a node-only line is a stop)
//   }
//   [A] -> [C]: *trace: Checkout*                  legacy trace: follows existing path A…C
//
// Nodes are identified by label (case/whitespace-insensitive), so later references may
// omit the tech suffix or shape. Parsing never throws; problems land in `warnings`.

import { getBrandMark } from "../brand-marks/brands.js";

/** @typedef {import("../types").Graph} Graph */
/** @typedef {import("../types").GraphNode} GraphNode */
/** @typedef {import("../types").GraphEdge} GraphEdge */
/** @typedef {import("../types").NodeShape} NodeShape */
/** @typedef {import("../types").ParseOptions} ParseOptions */

const ARROWS = [
  ["<-->", { style: "dashed", start: true, end: true }],
  ["<==>", { style: "thick", start: true, end: true }],
  ["<->", { style: "solid", start: true, end: true }],
  ["<=>", { style: "thick", start: true, end: true }],
  ["-->", { style: "dashed", start: false, end: true }],
  ["==>", { style: "thick", start: false, end: true }],
  ["<--", { style: "dashed", start: false, end: true, flip: true }],
  ["->", { style: "solid", start: false, end: true }],
  ["=>", { style: "thick", start: false, end: true }],
  ["<-", { style: "solid", start: false, end: true, flip: true }],
  ["---", { style: "solid", start: false, end: false }],
  ["--", { style: "solid", start: false, end: false }]
];

const GROUP_OPEN = /^(?:group|subgraph|boundary|zone)\s+(?:"([^"]*)"|'([^']*)'|(.+?))\s*\{\s*$/i;
const TRACE_LINE = /^trace\s+(?:"([^"]*)"|'([^']*)'|([^:{]+?))\s*:\s*(.+)$/i;
const TRACE_OPEN = /^trace\s+(?:"([^"]*)"|'([^']*)'|([^:{]+?))\s*\{\s*$/i;
const LEGACY_TRACE = /^\*trace(?::\s*([^*]*))?\*?\s*$/i;
const TECH_SUFFIX = /:(\s*)([a-z][a-z0-9.+-]*)\s*$/i;

/**
 * @param {string} source
 * @param {Partial<ParseOptions> & { direction?: string }} [opts]
 * @returns {Graph}
 */
export function parseArchBlock(source, opts = {}) {
  const lineOffset = opts.lineOffset ?? 0;
  /** @type {Graph} */
  const graph = {
    kind: "graph",
    direction: normalizeDirection(opts.direction),
    nodes: [],
    edges: [],
    groups: [],
    traces: [],
    warnings: []
  };
  const nodeIndex = new Map();
  const groupStack = [];
  const pendingTraces = [];
  let groupSeq = 0;
  /** @type {{ label: string, steps: Array<{from: string, to: string|null, text: string, line: number}>, line: number } | null} */
  let openTrace = null;

  const lines = String(source).split("\n");
  lines.forEach((rawLine, i) => {
    const lineNo = lineOffset + i + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || line.startsWith("//")) return;

    if (openTrace) {
      if (line === "}") {
        pendingTraces.push({ ...openTrace, legacy: false });
        openTrace = null;
        return;
      }
      const step = scanStatement(line);
      if (!step) {
        graph.warnings.push(`line ${lineNo}: could not parse trace step "${line}"`);
        return;
      }
      const ids = step.nodes.map(tok => ensureNode(tok, lineNo, false).id);
      if (!step.arrows.length) {
        openTrace.steps.push({ from: ids[0], to: null, text: step.label, line: lineNo });
        return;
      }
      for (let a = 0; a < step.arrows.length; a++) {
        const [from, to] = step.arrows[a].flip ? [ids[a + 1], ids[a]] : [ids[a], ids[a + 1]];
        openTrace.steps.push({ from, to, text: a === step.arrows.length - 1 ? step.label : "", line: lineNo });
      }
      return;
    }

    const traceOpen = line.match(TRACE_OPEN);
    if (traceOpen) {
      const label = (traceOpen[1] ?? traceOpen[2] ?? traceOpen[3] ?? "").trim() || "trace";
      openTrace = { label, steps: [], line: lineNo };
      return;
    }

    const groupOpen = line.match(GROUP_OPEN);
    if (groupOpen) {
      const label = (groupOpen[1] ?? groupOpen[2] ?? groupOpen[3] ?? "").trim() || "Group";
      const id = `g${groupSeq++}`;
      graph.groups.push({ id, label, parent: groupStack.at(-1) ?? null, line: lineNo });
      groupStack.push(id);
      return;
    }
    if (line === "}") {
      if (groupStack.length) groupStack.pop();
      else graph.warnings.push(`line ${lineNo}: unmatched "}"`);
      return;
    }

    const traceMatch = line.match(TRACE_LINE);
    if (traceMatch) {
      const label = (traceMatch[1] ?? traceMatch[2] ?? traceMatch[3] ?? "").trim() || "trace";
      const stmt = scanStatement(traceMatch[4]);
      if (!stmt || stmt.nodes.length < 2) {
        graph.warnings.push(`line ${lineNo}: trace needs at least two nodes: "${line}"`);
        return;
      }
      const ids = stmt.nodes.map(tok => ensureNode(tok, lineNo, true).id);
      pendingTraces.push({ label, steps: hopsOf(ids, lineNo), line: lineNo, legacy: false });
      return;
    }

    const stmt = scanStatement(line);
    if (!stmt) {
      graph.warnings.push(`line ${lineNo}: could not parse "${line}"`);
      return;
    }

    const isLast = (idx) => idx === stmt.nodes.length - 1 && !stmt.label;
    const ids = stmt.nodes.map((tok, idx) => ensureNode(tok, lineNo, isLast(idx)).id);

    if (stmt.arrows.length === 0) {
      // Node declaration, optionally with metadata.
      const node = nodeIndex.get(key(ids[0]));
      if (stmt.meta) Object.assign(node.meta, stmt.meta);
      if (stmt.label && !node.meta.desc) node.meta.desc = stmt.label;
      return;
    }

    const legacy = stmt.label.match(LEGACY_TRACE);
    if (legacy) {
      const label = (legacy[1] || "").trim() || "trace";
      pendingTraces.push({ label, steps: hopsOf(ids, lineNo), line: lineNo, legacy: ids.length === 2 });
      return;
    }

    for (let a = 0; a < stmt.arrows.length; a++) {
      const spec = stmt.arrows[a];
      let from = ids[a];
      let to = ids[a + 1];
      if (spec.flip) [from, to] = [to, from];
      const last = a === stmt.arrows.length - 1;
      addEdge({
        from,
        to,
        label: last ? stmt.label : "",
        style: spec.style,
        arrowStart: spec.start,
        arrowEnd: spec.end,
        meta: last && stmt.meta ? stmt.meta : {},
        line: lineNo
      });
    }
  });

  if (groupStack.length) graph.warnings.push(`${groupStack.length} group(s) not closed with "}"`);
  if (openTrace) {
    graph.warnings.push(`line ${openTrace.line}: trace "${openTrace.label}" not closed with "}"`);
    pendingTraces.push({ ...openTrace, legacy: false });
  }

  pendingTraces.forEach((t, idx) => resolveTrace(t, idx));
  return graph;

  // ── helpers (closures over graph state) ─────────────────────────────────────

  function ensureNode(token, lineNo, allowLabelColon) {
    const parsed = parseNodeToken(token, allowLabelColon);
    const k = key(parsed.label);
    let node = nodeIndex.get(k);
    if (!node) {
      /** @type {GraphNode} */
      node = {
        id: parsed.label,
        label: parsed.label,
        shape: parsed.shape,
        tech: parsed.tech,
        group: groupStack.at(-1) ?? null,
        meta: {},
        line: lineNo
      };
      nodeIndex.set(k, node);
      graph.nodes.push(node);
    } else {
      if (node.shape === "box" && parsed.shape !== "box") node.shape = parsed.shape;
      if (!node.tech && parsed.tech) node.tech = parsed.tech;
    }
    return node;
  }

  function addEdge(e) {
    const dup = graph.edges.find(x =>
      x.from === e.from && x.to === e.to && x.label === e.label && x.style === e.style);
    if (dup) {
      Object.assign(dup.meta, e.meta);
      return dup;
    }
    const edge = { id: `e${graph.edges.length}`, ...e };
    graph.edges.push(edge);
    return edge;
  }

  function hasEdge(a, b) {
    return graph.edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  }

  function resolveTrace(t, idx) {
    let steps = t.steps;
    if (t.legacy) {
      const { from: a, to: b } = steps[0];
      const direct = graph.edges.some(e => e.from === a && e.to === b);
      const path = direct ? null : shortestPath(graph, a, b);
      if (path) steps = hopsOf(path, t.line);
    }
    if (!steps.length) {
      graph.warnings.push(`line ${t.line}: trace "${t.label}" has no steps`);
      return;
    }
    // The walk: every node the route visits, in order (node-only stops included).
    const nodes = [];
    for (const s of steps) {
      if (nodes.at(-1) !== s.from) nodes.push(s.from);
      if (s.to) {
        if (!hasEdge(s.from, s.to)) {
          addEdge({ from: s.from, to: s.to, label: "", style: "solid", arrowStart: false, arrowEnd: true, meta: {}, line: s.line });
        }
        nodes.push(s.to);
      }
    }
    graph.traces.push({ id: `t${idx}`, label: t.label, nodes, steps, line: t.line });
  }
}

/** Consecutive hops along a node walk, without narration. */
function hopsOf(ids, line) {
  const steps = [];
  for (let h = 0; h < ids.length - 1; h++) steps.push({ from: ids[h], to: ids[h + 1], text: "", line });
  return steps;
}

/** Case- and whitespace-insensitive node identity. */
function key(label) {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeDirection(dir) {
  const d = String(dir || "LR").toUpperCase();
  return d === "TD" || d === "TB" || d === "BT" ? "TD" : "LR";
}

/** Directed BFS over edges; returns node ids from a to b, or null. */
export function shortestPath(graph, a, b) {
  const prev = new Map([[a, null]]);
  const queue = [a];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === b) break;
    for (const e of graph.edges) {
      const next = e.from === cur ? e.to : (e.arrowStart && e.to === cur ? e.from : null);
      if (next !== null && !prev.has(next)) {
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  if (!prev.has(b) || a === b) return null;
  const path = [];
  for (let cur = b; cur !== null; cur = prev.get(cur)) path.unshift(cur);
  return path;
}

// ── statement scanner ─────────────────────────────────────────────────────────

/**
 * Split a statement into node tokens, arrows, a trailing label and `{…}` metadata.
 * Brackets and quotes are respected, so labels may contain arrows and colons.
 * @returns {{ nodes: string[], arrows: Array<{style: string, start: boolean, end: boolean, flip?: boolean}>, label: string, meta: Record<string,string> | null } | null}
 */
export function scanStatement(line) {
  const nodes = [];
  const arrows = [];
  let label = "";
  let meta = null;
  let pos = 0;
  let expectNode = true;

  const skipWs = () => { while (pos < line.length && /\s/.test(line[pos])) pos++; };

  while (pos < line.length) {
    skipWs();
    if (pos >= line.length) break;

    if (expectNode) {
      const ch = line[pos];
      let end;
      if (ch === "[" || ch === "(" || ch === "{") {
        end = matchBracket(line, pos);
        if (end === -1) return null;
        end += 1;
      } else {
        end = scanBare(line, pos);
      }
      const token = line.slice(pos, end).trim();
      if (!token) return null;
      nodes.push(token);
      pos = end;
      expectNode = false;
      continue;
    }

    const arrow = ARROWS.find(([op]) => line.startsWith(op, pos));
    if (arrow) {
      arrows.push(arrow[1]);
      pos += arrow[0].length;
      expectNode = true;
      continue;
    }
    if (line[pos] === ":") {
      const rest = line.slice(pos + 1).trim();
      const split = splitTrailingMeta(rest);
      label = split.text;
      meta = split.meta;
      break;
    }
    if (line[pos] === "{") {
      const end = matchBracket(line, pos);
      if (end === -1) return null;
      meta = parseMeta(line.slice(pos + 1, end));
      pos = end + 1;
      skipWs();
      if (line[pos] === ":") continue;
      if (pos < line.length) return null;
      break;
    }
    return null;
  }

  if (expectNode && arrows.length) return null; // dangling arrow
  if (!nodes.length) return null;
  return { nodes, arrows, label, meta };
}

/** End index (exclusive) of a bare node name: stops at an arrow, `{`, or `: `. */
function scanBare(line, start) {
  let i = start;
  while (i < line.length) {
    if (ARROWS.some(([op]) => line.startsWith(op, i))) break;
    if (line[i] === "{") break;
    if (line[i] === ":" && (i + 1 >= line.length || /\s/.test(line[i + 1]))) break;
    i++;
  }
  return i;
}

/** Index of the bracket closing the one at `start`, honoring nesting and quotes. */
function matchBracket(line, start) {
  const pairs = { "[": "]", "(": ")", "{": "}" };
  const stack = [];
  let quote = null;
  for (let i = start; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"') { quote = ch; continue; }
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (ch === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return -1;
}

/** Separate a trailing `{ k: v; … }` block from label text. */
function splitTrailingMeta(text) {
  if (!text.endsWith("}")) return { text, meta: null };
  const open = text.lastIndexOf("{");
  if (open === -1 || !/:/.test(text.slice(open))) return { text, meta: null };
  return { text: text.slice(0, open).trim(), meta: parseMeta(text.slice(open + 1, -1)) };
}

/** Parse `key: value; key2: value2`. Segments without a key become `desc`. */
export function parseMeta(body) {
  const meta = {};
  for (const part of body.split(";")) {
    const seg = part.trim();
    if (!seg) continue;
    const colon = seg.indexOf(":");
    if (colon > 0 && /^[\w .-]+$/.test(seg.slice(0, colon))) {
      meta[seg.slice(0, colon).trim().toLowerCase()] = seg.slice(colon + 1).trim();
    } else {
      meta.desc = meta.desc ? `${meta.desc}; ${seg}` : seg;
    }
  }
  return meta;
}

/**
 * Interpret a node token: shape from its brackets, tech from a `:key` suffix.
 * `allowLabelColon` marks the final bare token of a line, where `B:word` is only a tech
 * suffix if `word` is a known brand (otherwise the colon would start an edge label —
 * that case is already split off by the scanner, so here we just keep the text).
 * @returns {{ label: string, shape: NodeShape, tech: string | null }}
 */
export function parseNodeToken(token, allowLabelColon = false) {
  let text = token.trim();
  /** @type {NodeShape} */
  let shape = "box";
  const wrappers = [
    ["[(", ")]", "cylinder"],
    ["((", "))", "circle"],
    ["([", "])", "round"],
    ["{[", "]}", "diamond"],
    ["[[", "]]", "box"],
    ["[/", "/]", "box"],
    ["{", "}", "diamond"],
    ["(", ")", "round"],
    ["[", "]", "box"]
  ];
  const bracketed = /^[[({]/.test(text);
  for (const [open, close, s] of wrappers) {
    if (text.startsWith(open) && text.endsWith(close) && text.length >= open.length + close.length) {
      text = text.slice(open.length, text.length - close.length).trim();
      shape = s;
      break;
    }
  }
  if (/^".*"$/.test(text)) text = text.slice(1, -1);

  let tech = null;
  const m = text.match(TECH_SUFFIX);
  if (m && m.index > 0) {
    const candidate = m[2];
    const known = Boolean(getBrandMark(candidate));
    // `[Order DB:postgres]` always tags; `[Phase: Build]` only when the word is a brand.
    if (known || (!m[1] && (bracketed || !allowLabelColon))) {
      tech = candidate;
      text = text.slice(0, m.index).trim();
    }
  }
  return { label: text.replace(/\s+/g, " ") || "?", shape, tech };
}
