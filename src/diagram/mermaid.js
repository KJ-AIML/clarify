// clarify/src/diagram/mermaid.js
// Zero-dependency parser for the Mermaid flowchart + sequenceDiagram subset that Clarify
// renders natively, plus exporters back to Mermaid text (for GitHub PR descriptions).
// Parsers never throw: bad statements are skipped and reported in `warnings`.

/** @typedef {import("../types").Graph} Graph */
/** @typedef {import("../types").GraphNode} GraphNode */
/** @typedef {import("../types").GraphEdge} GraphEdge */
/** @typedef {import("../types").GraphGroup} GraphGroup */
/** @typedef {import("../types").SequenceDiagram} SequenceDiagram */
/** @typedef {import("../types").SeqParticipant} SeqParticipant */
/** @typedef {import("../types").SeqItem} SeqItem */
/** @typedef {import("../types").ParseOptions} ParseOptions */
/** @typedef {import("../types").EdgeStyle} EdgeStyle */
/** @typedef {import("../types").NodeShape} NodeShape */

/**
 * @typedef {{ end: number, style: EdgeStyle, arrowStart: boolean, arrowEnd: boolean,
 *             label: string, invisible: boolean }} LinkToken
 * @typedef {{ id: string, label?: string, shape?: NodeShape }} NodeRef
 */

// ── Shared text helpers ──────────────────────────────────────────────────────

const NAMED_ENTITIES = { quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " ", apos: "'" };
const TECH_RE = /^(.*?\S)\s*:([a-z][a-z0-9.+-]*)$/i;

/** @param {ParseOptions | undefined} opts */
const lineOffsetOf = (opts) => (Number.isFinite(opts?.lineOffset) ? Number(opts?.lineOffset) : 0);

/** Mermaid entity codes: `#quot;`, `#35;`, … */
function decodeEntities(s) {
  return s.replace(/#(\w+);/g, (m, name) => {
    if (/^\d+$/.test(name)) {
      const code = Number(name);
      return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[name] ?? m;
  });
}

function unquote(s) {
  const t = s.trim();
  if (t.length >= 2 && t[0] === '"' && t.at(-1) === '"') return t.slice(1, -1);
  // Markdown strings: "`text`"
  if (t.length >= 2 && t[0] === "`" && t.at(-1) === "`") return t.slice(1, -1);
  return t;
}

/** Normalise label text: strip quotes, `<br>` → space, decode entities, collapse spaces. */
function cleanText(raw) {
  const s = unquote(unquote(String(raw ?? "")));
  return decodeEntities(s.replace(/<br\s*\/?>/gi, " ")).replace(/\s+/g, " ").trim();
}

/** `API Gateway:cloudflare` → { label: "API Gateway", tech: "cloudflare" }. */
function splitTech(label) {
  const m = TECH_RE.exec(label);
  return m ? { label: m[1].trim(), tech: m[2] } : { label, tech: null };
}

const excerpt = (s, max = 60) => {
  const t = String(s).trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** Remove a `%%` comment that is not inside a quoted string. */
function stripComment(line) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (!quoted && c === "%" && line[i + 1] === "%") return line.slice(0, i);
  }
  return line;
}

/**
 * Non-empty, comment-free, trimmed lines with their 0-based index. Skips YAML
 * frontmatter (`---` … `---`) and accessibility directives.
 * @returns {{ index: number, text: string }[]}
 */
function meaningfulLines(source) {
  const raw = String(source ?? "").split(/\r?\n/);
  let i = 0;
  while (i < raw.length && !raw[i].trim()) i++;
  if (raw[i]?.trim() === "---") {
    let j = i + 1;
    while (j < raw.length && raw[j].trim() !== "---") j++;
    i = j + 1;
  }
  const out = [];
  let inAccBlock = false;
  for (; i < raw.length; i++) {
    const text = stripComment(raw[i]).trim();
    if (inAccBlock) {
      if (text.includes("}")) inAccBlock = false;
      continue;
    }
    if (!text) continue;
    if (/^accDescr\s*\{/.test(text)) {
      inAccBlock = !text.includes("}");
      continue;
    }
    if (/^acc(Title|Descr)\s*:/.test(text)) continue;
    out.push({ index: i, text });
  }
  return out;
}

/** Split on `;` outside quotes, keeping entity codes like `#quot;` intact. */
function splitStatements(text) {
  const out = [];
  let quoted = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') quoted = !quoted;
    else if (c === ";" && !quoted && !/#(?:quot|amp|lt|gt|nbsp|apos|\d+)$/.test(text.slice(start, i))) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/** True when the first meaningful line is `sequenceDiagram`. */
export function isMermaidSequence(source) {
  const first = meaningfulLines(source)[0];
  return Boolean(first && /^sequenceDiagram\b/.test(first.text));
}

/**
 * @param {string} source
 * @param {ParseOptions} [opts]
 * @returns {Graph | SequenceDiagram}
 */
export function parseMermaid(source, opts = {}) {
  return isMermaidSequence(source) ? parseSequence(source, opts) : parseMermaidFlowchart(source, opts);
}

// ── Flowchart ────────────────────────────────────────────────────────────────

const DIRECTIONS = { LR: "LR", RL: "LR", ">": "LR", "<": "LR", TD: "TD", TB: "TD", BT: "TD", "^": "TD", v: "TD" };
const FLOW_HEADER = /^(?:graph|flowchart(?:-elk)?)(?:\s+(.*))?$/;
const UNSUPPORTED_HEADER =
  /^(sequenceDiagram|classDiagram(?:-v2)?|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|zenuml|kanban|C4(?:Context|Container|Component|Dynamic|Deployment)|(?:sankey|xychart|block|packet|architecture|radar|treemap)-beta)(?:\s+(?![-=&<~]).*)?$/;
const FLOW_IGNORE = /^(?:classDef|class|style|linkStyle|click|callback|direction)\s/;

/** Ordered longest-opener first; each entry: [open, closes, shape]. */
const SHAPES = /** @type {[string, string[], NodeShape][]} */ ([
  ["(((", [")))"], "circle"],
  ["((", ["))"], "circle"],
  ["([", ["])"], "round"],
  ["[(", [")]"], "cylinder"],
  ["[[", ["]]"], "box"],
  ["[/", ["/]", "\\]"], "box"],
  ["[\\", ["\\]", "/]"], "box"],
  ["{{", ["}}"], "diamond"],
  ["[", ["]"], "box"],
  ["(", [")"], "round"],
  ["{", ["}"], "diamond"],
  [">", ["]"], "box"],
]);

const ID_STOP = /[\s[\](){}<>&;|:"=~]/;
const HEAD = "([>ox])"; // like Mermaid, `A--oB` is a circle-headed link to B

/** Link families. `plain` matches unlabeled links, `open`/`close` the `-- text -->` form. */
const LINK_KINDS = [
  {
    style: /** @type {EdgeStyle} */ ("dashed"),
    plain: new RegExp(`(<)?-(\\.+)-${HEAD}?`, "y"),
    valid: () => true,
    open: /(<)?-\.(?=[\s"])/y,
    close: new RegExp(`\\.+-${HEAD}?`, "g"),
  },
  {
    style: /** @type {EdgeStyle} */ ("solid"),
    plain: new RegExp(`(<)?(-{2,})${HEAD}?`, "y"),
    valid: (m) => Boolean(m[3]) || m[2].length >= 3,
    open: /(<)?--(?=[\s"])/y,
    close: new RegExp(`-{2,}${HEAD}|-{3,}`, "g"),
  },
  {
    style: /** @type {EdgeStyle} */ ("thick"),
    plain: new RegExp(`(<)?(={2,})${HEAD}?`, "y"),
    valid: (m) => Boolean(m[3]) || m[2].length >= 3,
    open: /(<)?==(?=[\s"])/y,
    close: new RegExp(`={2,}${HEAD}|={3,}`, "g"),
  },
];

/**
 * Match a flowchart link starting exactly at `pos`.
 * @returns {LinkToken | null}
 */
function matchLink(s, pos) {
  const invisible = /~{3,}/y;
  invisible.lastIndex = pos;
  if (invisible.exec(s)) {
    return { end: invisible.lastIndex, style: "solid", arrowStart: false, arrowEnd: false, label: "", invisible: true };
  }
  for (const kind of LINK_KINDS) {
    kind.plain.lastIndex = pos;
    const m = kind.plain.exec(s);
    if (m && kind.valid(m)) {
      const arrowEnd = Boolean(m[3]);
      return { end: pos + m[0].length, style: kind.style, arrowStart: Boolean(m[1]), arrowEnd, label: "", invisible: false };
    }
    const labeled = matchLabeledLink(kind, s, pos);
    if (labeled) return labeled;
  }
  return null;
}

/** `A -- text --> B`, `A -. text .-> B`, `A == text ==> B` (text may be quoted). */
function matchLabeledLink(kind, s, pos) {
  kind.open.lastIndex = pos;
  const open = kind.open.exec(s);
  if (!open) return null;
  const textStart = kind.open.lastIndex;
  let searchFrom = textStart;
  let p = textStart;
  while (p < s.length && /\s/.test(s[p])) p++;
  if (s[p] === '"') {
    const q = s.indexOf('"', p + 1);
    if (q < 0) return null;
    searchFrom = q + 1;
  }
  kind.close.lastIndex = searchFrom;
  const close = kind.close.exec(s);
  if (!close) return null;
  const text = s.slice(textStart, close.index);
  if (!text.trim()) return null;
  return {
    end: close.index + close[0].length,
    style: kind.style,
    arrowStart: Boolean(open[1]),
    arrowEnd: Boolean(close[1]),
    label: cleanText(text),
    invisible: false,
  };
}

/** Read text up to one of `closes`; a leading quoted string may contain the closer. */
function readDelimited(s, from, closes) {
  let p = from;
  while (p < s.length && /\s/.test(s[p])) p++;
  if (s[p] === '"') {
    const q = s.indexOf('"', p + 1);
    if (q >= 0) {
      let r = q + 1;
      while (r < s.length && /\s/.test(s[r])) r++;
      const close = closes.find((c) => s.startsWith(c, r));
      if (close) return { text: s.slice(p + 1, q), end: r + close.length };
    }
  }
  let best = -1;
  let bestLen = 0;
  for (const c of closes) {
    const i = s.indexOf(c, from);
    if (i >= 0 && (best < 0 || i < best)) [best, bestLen] = [i, c.length];
  }
  return best < 0 ? null : { text: s.slice(from, best), end: best + bestLen };
}

function readShape(s, pos) {
  for (const [open, closes, shape] of SHAPES) {
    if (!s.startsWith(open, pos)) continue;
    const r = readDelimited(s, pos + open.length, closes);
    if (r) return { label: cleanText(r.text), shape, end: r.end };
  }
  return null;
}

class ParseFail extends Error {}
const fail = (msg) => {
  throw new ParseFail(msg);
};

/**
 * Parse `A & B -->|x| C[Label] --> D` into node groups joined by links.
 * @returns {{ groups: NodeRef[][], links: LinkToken[] }}
 */
function parseChain(s) {
  let pos = 0;
  const skipWs = () => {
    while (pos < s.length && /\s/.test(s[pos])) pos++;
  };

  const readRef = () => {
    skipWs();
    const start = pos;
    while (pos < s.length && !ID_STOP.test(s[pos]) && !(s[pos] === "-" && matchLink(s, pos))) pos++;
    const id = s.slice(start, pos);
    if (!id) fail(pos < s.length ? `unexpected "${excerpt(s.slice(pos), 20)}"` : "missing node");
    /** @type {NodeRef} */
    const ref = { id };
    const save = pos;
    skipWs();
    if ("[({>".includes(s[pos] ?? "\0")) {
      const shaped = readShape(s, pos);
      if (!shaped) fail(`unclosed label for "${id}"`);
      ref.label = shaped.label;
      ref.shape = shaped.shape;
      pos = shaped.end;
    } else pos = save;
    const cls = /:::[\w-]+/y;
    cls.lastIndex = pos;
    if (cls.exec(s)) pos = cls.lastIndex;
    return ref;
  };

  const readGroup = () => {
    const refs = [readRef()];
    for (;;) {
      skipWs();
      if (s[pos] !== "&") return refs;
      pos++;
      refs.push(readRef());
    }
  };

  const readLink = () => {
    const link = matchLink(s, pos);
    if (!link) fail(`expected an arrow at "${excerpt(s.slice(pos), 20)}"`);
    pos = link.end;
    const save = pos;
    skipWs();
    if (s[pos] === "|") {
      const r = readDelimited(s, pos + 1, ["|"]);
      if (!r) fail("unclosed |label|");
      link.label = cleanText(r.text);
      pos = r.end;
    } else pos = save;
    return link;
  };

  const groups = [readGroup()];
  const links = [];
  skipWs();
  while (pos < s.length) {
    links.push(readLink());
    skipWs();
    if (pos >= s.length) fail("arrow has no target");
    groups.push(readGroup());
    skipWs();
  }
  return { groups, links };
}

const slug = (text) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "group";

/** `id [Title]`, `id["Title"]`, `"Title"`, `Title With Spaces`, `id`. */
function parseSubgraphHeader(rest) {
  const text = rest.trim();
  if (!text) return null;
  if (text[0] === '"') {
    const label = cleanText(text.replace(/^"|"$/g, ""));
    return { rawId: slug(label), label };
  }
  const m = /^([^\s[\]"]+)\s*\[(.*)\]$/.exec(text);
  if (m) return { rawId: m[1], label: cleanText(m[2]) || m[1] };
  if (!/\s/.test(text)) return { rawId: text, label: text };
  const label = cleanText(text);
  return { rawId: slug(label), label };
}

/**
 * Parse a Mermaid `graph`/`flowchart` block into Clarify's graph model.
 * @param {string} source
 * @param {ParseOptions} [opts]
 * @returns {Graph}
 */
export function parseMermaidFlowchart(source, opts = {}) {
  const offset = lineOffsetOf(opts);
  /** @type {Graph} */
  const graph = { kind: "graph", direction: "TD", nodes: [], edges: [], groups: [], traces: [], warnings: [] };
  /** @type {Map<string, GraphNode>} */
  const nodes = new Map();
  const groupIds = new Set();
  /** Raw Mermaid subgraph id → line, and node ids that received an explicit label. */
  const subgraphRawIds = new Map();
  const labelled = new Set();
  /** @type {GraphGroup[]} */
  const open = [];
  let subgraphCount = 0;
  let first = true;
  const warn = (line, msg) => graph.warnings.push(`line ${line}: ${msg}`);

  // Mermaid semantics: listing a node inside a subgraph moves it there, even after an
  // earlier top-level mention. A node joins the deepest subgraph mentioning it; mentions
  // in an ancestor (or at top level) never pull it back out.
  const isWithin = (gid, ancestor) => {
    for (let g = graph.groups.find(x => x.id === gid); g; g = graph.groups.find(x => x.id === g.parent)) {
      if (g.id === ancestor) return true;
    }
    return false;
  };
  const touchNode = (ref, line) => {
    let node = nodes.get(ref.id);
    const current = open.at(-1)?.id ?? null;
    if (!node) {
      node = { id: ref.id, label: ref.id, shape: "box", tech: null, group: current, meta: {}, line };
      nodes.set(ref.id, node);
      graph.nodes.push(node);
    } else if (current && current !== node.group && (!node.group || isWithin(current, node.group))) {
      node.group = current;
    }
    if (ref.label !== undefined) {
      labelled.add(ref.id);
      const { label, tech } = splitTech(ref.label || ref.id);
      node.label = label;
      node.tech = tech;
      node.shape = ref.shape ?? "box";
    }
  };

  const openGroup = (rest, line) => {
    let header = parseSubgraphHeader(rest);
    if (!header) {
      warn(line, "subgraph has no name");
      header = { rawId: `subgraph-${subgraphCount + 1}`, label: "" };
    }
    subgraphCount++;
    let id = `g:${header.rawId}`;
    for (let n = 2; groupIds.has(id); n++) id = `g:${header.rawId}-${n}`;
    groupIds.add(id);
    if (!subgraphRawIds.has(header.rawId)) subgraphRawIds.set(header.rawId, line);
    const group = { id, label: header.label, parent: open.at(-1)?.id ?? null, line };
    graph.groups.push(group);
    open.push(group);
  };

  const handle = (stmt, line) => {
    if (/^subgraph(\s|$)/.test(stmt)) return openGroup(stmt.slice(8), line);
    if (stmt === "end") {
      if (!open.pop()) warn(line, `unexpected "end" with no open subgraph`);
      return;
    }
    if (FLOW_IGNORE.test(stmt)) return;
    try {
      const { groups, links } = parseChain(stmt);
      for (const refs of groups) for (const ref of refs) touchNode(ref, line);
      links.forEach((link, k) => {
        if (link.invisible) return;
        for (const a of groups[k]) {
          for (const b of groups[k + 1]) {
            graph.edges.push({
              id: `e${graph.edges.length}`,
              from: a.id,
              to: b.id,
              label: link.label,
              style: link.style,
              arrowStart: link.arrowStart,
              arrowEnd: link.arrowEnd,
              meta: {},
              line,
            });
          }
        }
      });
    } catch (err) {
      warn(line, `could not parse "${excerpt(stmt)}" (${err instanceof Error ? err.message : err})`);
    }
  };

  for (const { index, text } of meaningfulLines(source)) {
    const line = offset + index + 1;
    for (const stmt of splitStatements(text)) {
      if (first) {
        first = false;
        if (UNSUPPORTED_HEADER.test(stmt)) {
          warn(line, `unsupported Mermaid diagram type "${stmt.split(/\s/)[0]}"`);
          return graph;
        }
        const header = FLOW_HEADER.exec(stmt);
        if (header) {
          const dir = (header[1] ?? "").trim();
          if (dir && !DIRECTIONS[dir]) warn(line, `unknown direction "${excerpt(dir, 20)}", using TD`);
          graph.direction = /** @type {"LR" | "TD"} */ (DIRECTIONS[dir] ?? "TD");
          continue;
        }
      }
      handle(stmt, line);
    }
  }

  for (const group of open.reverse()) {
    warn(group.line, `subgraph "${group.label}" is not closed by "end"`);
  }
  dropSubgraphLinks(graph, subgraphRawIds, labelled);
  return graph;
}

/**
 * Mermaid allows `A --> someSubgraph`, which the graph model cannot express. Such
 * endpoints would otherwise appear as stray boxes, so drop them (and their edges).
 */
function dropSubgraphLinks(graph, subgraphRawIds, labelled) {
  const stray = new Set(
    graph.nodes.filter((n) => subgraphRawIds.has(n.id) && !labelled.has(n.id)).map((n) => n.id),
  );
  if (!stray.size) return;
  for (const id of stray) {
    const dropped = graph.edges.filter((e) => e.from === id || e.to === id).length;
    graph.warnings.push(
      `line ${subgraphRawIds.get(id)}: links to subgraph "${id}" are not supported (${dropped} dropped)`,
    );
  }
  graph.nodes = graph.nodes.filter((n) => !stray.has(n.id));
  graph.edges = graph.edges
    .filter((e) => !stray.has(e.from) && !stray.has(e.to))
    .map((e, i) => ({ ...e, id: `e${i}` }));
}

// ── Sequence ─────────────────────────────────────────────────────────────────

/** Longest first so `-->>` wins over `-->`; cross arrows are tried in a second pass. */
const SEQ_ARROWS = ["<<-->>", "<<->>", "-->>", "->>", "--)", "-)", "-->", "->"];
const SEQ_CROSS_ARROWS = ["--x", "-x"];
const SEQ_ARROW_KIND = {
  "->>": ["solid", "filled"],
  "-->>": ["dashed", "filled"],
  "->": ["solid", "open"],
  "-->": ["dashed", "open"],
  "-x": ["solid", "cross"],
  "--x": ["dashed", "cross"],
  "-)": ["solid", "open"],
  "--)": ["dashed", "open"],
  "<<->>": ["solid", "filled"],
  "<<-->>": ["dashed", "filled"],
};
const FRAME_START = /^(loop|alt|opt|par(?:_over)?|critical|break|rect)(?:\s+(.*))?$/;
const FRAME_ELSE = /^(else|and|option)(?:\s+(.*))?$/;
const NOTE = /^note\s+(over|left\s+of|right\s+of)\s+(.*)$/i;
const SEQ_IGNORE = /^(?:(?:activate|deactivate|destroy|links?|properties|details)\s|title\b)/;

function findSeqArrow(head) {
  for (const set of [SEQ_ARROWS, SEQ_CROSS_ARROWS]) {
    for (let i = 1; i < head.length; i++) {
      const arrow = set.find((a) => head.startsWith(a, i));
      if (arrow) return { index: i, arrow };
    }
  }
  return null;
}

/** `From ARROW [+-]To: label` → parts, or null. */
function parseMessage(stmt) {
  const colon = stmt.indexOf(":");
  const head = colon < 0 ? stmt : stmt.slice(0, colon);
  const found = findSeqArrow(head);
  if (!found) return null;
  const from = head.slice(0, found.index).trim();
  let to = head.slice(found.index + found.arrow.length).trim();
  if (to[0] === "+" || to[0] === "-") to = to.slice(1).trim();
  if (!from || !to) return null;
  const [style, arrow] = SEQ_ARROW_KIND[found.arrow];
  return { from, to, style, arrow, label: colon < 0 ? "" : cleanText(stmt.slice(colon + 1)) };
}

/**
 * Parse a Mermaid `sequenceDiagram` (header optional) or Clarify sequence shorthand,
 * where participant names may contain spaces (`Web Client -> API: POST /x`).
 * @param {string} source
 * @param {ParseOptions} [opts]
 * @returns {SequenceDiagram}
 */
export function parseSequence(source, opts = {}) {
  const offset = lineOffsetOf(opts);
  /** @type {SequenceDiagram} */
  const seq = { kind: "sequence", participants: [], items: [], autonumber: false, warnings: [] };
  /** @type {Map<string, SeqParticipant>} */
  const byId = new Map();
  /** @type {{ kind: string, line: number }[]} */
  const frames = [];
  const warn = (line, msg) => seq.warnings.push(`line ${line}: ${msg}`);

  /** Resolve a name to a participant id (by id, then by label), auto-adding it. */
  const resolve = (name, line) => {
    if (byId.has(name)) return name;
    const byLabel = seq.participants.find((p) => p.label === name);
    if (byLabel) return byLabel.id;
    const p = { id: name, label: name, tech: null, kind: /** @type {const} */ ("participant"), line };
    seq.participants.push(p);
    byId.set(name, p);
    return name;
  };

  const declare = (kind, rest, line) => {
    const text = rest.replace(/@\{[^}]*\}/, " ").trim();
    const alias = /^(.+?)\s+as\s+(.+)$/.exec(text);
    let id = unquote(alias ? alias[1] : text);
    const parsed = splitTech(cleanText(alias ? alias[2] : id));
    if (!alias) id = parsed.label;
    if (!id) return warn(line, `participant has no name`);
    const existing = byId.get(id);
    if (existing) {
      Object.assign(existing, { label: parsed.label, tech: parsed.tech, kind });
      return;
    }
    const p = { id, label: parsed.label, tech: parsed.tech, kind, line };
    seq.participants.push(p);
    byId.set(id, p);
  };

  let first = true;
  for (const { index, text } of meaningfulLines(source)) {
    const line = offset + index + 1;
    const stmt = text.replace(/(?<!#\w+);+$/, "").trim();
    if (!stmt) continue;
    if (first) {
      first = false;
      if (/^sequenceDiagram\b/.test(stmt)) continue;
    }
    let m;
    if (/^autonumber\b/.test(stmt)) {
      seq.autonumber = !/^autonumber\s+off$/.test(stmt);
    } else if ((m = /^(?:create\s+)?(participant|actor)\s+(.+)$/.exec(stmt))) {
      declare(m[1], m[2], line);
    } else if (SEQ_IGNORE.test(stmt)) {
      // activation, links, title: no visual model
    } else if ((m = NOTE.exec(stmt))) {
      const colon = m[2].indexOf(":");
      const targets = (colon < 0 ? m[2] : m[2].slice(0, colon)).split(",").map((t) => t.trim()).filter(Boolean);
      if (!targets.length) {
        warn(line, `note has no participant: "${excerpt(stmt)}"`);
        continue;
      }
      const where = m[1].toLowerCase();
      seq.items.push({
        type: "note",
        over: targets.map((t) => resolve(t, line)),
        placement: where === "over" ? "over" : where.startsWith("left") ? "left" : "right",
        text: colon < 0 ? "" : cleanText(m[2].slice(colon + 1)),
        line,
      });
    } else if (/^box(\s|$)/.test(stmt)) {
      frames.push({ kind: "box", line });
    } else if (stmt === "end") {
      const top = frames.pop();
      if (!top) warn(line, `unexpected "end" with no open block`);
      else if (top.kind !== "box") seq.items.push({ type: "frameEnd", line });
    } else if ((m = FRAME_START.exec(stmt))) {
      const kind = /** @type {"loop" | "alt" | "opt" | "par" | "critical" | "break" | "rect"} */ (
        m[1] === "par_over" ? "par" : m[1]
      );
      frames.push({ kind, line });
      seq.items.push({ type: "frameStart", kind, label: kind === "rect" ? "" : cleanText(m[2] ?? ""), line });
    } else if ((m = FRAME_ELSE.exec(stmt))) {
      const top = frames.at(-1);
      if (!top || top.kind === "box") warn(line, `"${m[1]}" outside of a block`);
      else seq.items.push({ type: "frameElse", label: cleanText(m[2] ?? ""), line });
    } else {
      const msg = parseMessage(stmt);
      if (!msg) {
        warn(line, `could not parse "${excerpt(stmt)}"`);
        continue;
      }
      seq.items.push({
        type: "message",
        from: resolve(msg.from, line),
        to: resolve(msg.to, line),
        label: msg.label,
        style: /** @type {"solid" | "dashed"} */ (msg.style),
        arrow: /** @type {"filled" | "open" | "cross"} */ (msg.arrow),
        line,
      });
    }
  }

  for (const frame of frames.reverse()) {
    warn(frame.line, `"${frame.kind}" block is not closed by "end"`);
    if (frame.kind !== "box") seq.items.push({ type: "frameEnd", line: null });
  }
  return seq;
}

// ── Exporters ────────────────────────────────────────────────────────────────

const flowText = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[#"]/g, (c) => (c === "#" ? "#35;" : "#quot;"));

const seqText = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[#;]/g, (c) => (c === "#" ? "#35;" : "#59;"));

const withTech = (label, tech) => (tech ? `${label} (${tech})` : label);

const SHAPE_WRAP = {
  box: ["[", "]"],
  round: ["(", ")"],
  cylinder: ["[(", ")]"],
  diamond: ["{", "}"],
  circle: ["((", "))"],
};

/** [no arrow, end arrow, both arrows] per style. */
const FLOW_OPS = {
  solid: ["---", "-->", "<-->"],
  dashed: ["-.-", "-.->", "<-.->"],
  thick: ["===", "==>", "<==>"],
};

/**
 * Serialize a graph to Mermaid flowchart text (GitHub-renderable).
 * @param {Graph} graph
 * @returns {string}
 */
export function graphToMermaid(graph) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const groups = graph?.groups ?? [];
  const lines = [`flowchart ${graph?.direction === "LR" ? "LR" : "TD"}`];

  /** @type {Map<string, string>} */
  const safe = new Map();
  nodes.forEach((n) => safe.set(n.id, `n${safe.size}`));
  const dangling = [];
  for (const e of edges) {
    for (const end of [e.from, e.to]) {
      if (!safe.has(end)) {
        safe.set(end, `n${safe.size}`);
        dangling.push(end);
      }
    }
  }

  const groupSafe = new Map(groups.map((g, i) => [g.id, `sg${i}`]));
  const parentOf = (g) => (g.parent && g.parent !== g.id && groupSafe.has(g.parent) ? g.parent : null);
  const childGroups = (id) => groups.filter((g) => parentOf(g) === id);
  const memberNodes = (id) => nodes.filter((n) => (n.group && groupSafe.has(n.group) ? n.group : null) === id);
  const nodeDef = (n, indent) => {
    const [open, close] = SHAPE_WRAP[n.shape] ?? SHAPE_WRAP.box;
    lines.push(`${indent}${safe.get(n.id)}${open}"${flowText(withTech(n.label, n.tech))}"${close}`);
  };

  const emitted = new Set();
  const emitGroup = (g, depth) => {
    if (emitted.has(g.id)) return;
    emitted.add(g.id);
    const indent = "  ".repeat(depth);
    lines.push(`${indent}subgraph ${groupSafe.get(g.id)}["${flowText(g.label)}"]`);
    for (const n of memberNodes(g.id)) nodeDef(n, `${indent}  `);
    for (const child of childGroups(g.id)) emitGroup(child, depth + 1);
    lines.push(`${indent}end`);
  };
  for (const g of childGroups(null)) emitGroup(g, 1);
  for (const g of groups) emitGroup(g, 1); // parent cycles: emit whatever was unreachable

  for (const n of memberNodes(null)) nodeDef(n, "  ");
  for (const id of dangling) lines.push(`  ${safe.get(id)}["${flowText(id)}"]`);

  for (const e of edges) {
    let [from, to] = [safe.get(e.from), safe.get(e.to)];
    const ops = FLOW_OPS[e.style] ?? FLOW_OPS.solid;
    let op = ops[0];
    if (e.arrowStart && e.arrowEnd) op = ops[2];
    else if (e.arrowEnd) op = ops[1];
    else if (e.arrowStart) [from, to, op] = [to, from, ops[1]]; // Mermaid has no start-only arrow
    const label = e.label ? `|"${flowText(e.label)}"|` : "";
    lines.push(`  ${from} ${op}${label} ${to}`);
  }
  return lines.join("\n");
}

/** Mermaid arrow per message style/arrow. `open` uses `-)` so GitHub still draws a head. */
const SEQ_EXPORT = {
  solid: { filled: "->>", open: "-)", cross: "-x", none: "->" },
  dashed: { filled: "-->>", open: "--)", cross: "--x", none: "-->" },
};
const ELSE_KEYWORD = { par: "and", critical: "option" };

/**
 * Serialize a sequence diagram to Mermaid `sequenceDiagram` text.
 * @param {SequenceDiagram} seq
 * @returns {string}
 */
export function sequenceToMermaid(seq) {
  const participants = seq?.participants ?? [];
  const items = seq?.items ?? [];
  const lines = ["sequenceDiagram"];
  if (seq?.autonumber) lines.push("  autonumber");

  /** @type {Map<string, string>} */
  const safe = new Map();
  const declare = (id, label, kind) => {
    safe.set(id, `p${safe.size}`);
    lines.push(`  ${kind === "actor" ? "actor" : "participant"} ${safe.get(id)} as ${seqText(label) || safe.get(id)}`);
  };
  for (const p of participants) if (!safe.has(p.id)) declare(p.id, withTech(p.label, p.tech), p.kind);
  for (const item of items) {
    const refs = item.type === "message" ? [item.from, item.to] : item.type === "note" ? item.over : [];
    for (const id of refs) if (!safe.has(id)) declare(id, id, "participant");
  }

  const frames = [];
  const indent = () => "  ".repeat(frames.length + 1);
  for (const item of items) {
    switch (item.type) {
      case "message": {
        const arrow = (SEQ_EXPORT[item.style] ?? SEQ_EXPORT.solid)[item.arrow] ?? "->>";
        lines.push(`${indent()}${safe.get(item.from)}${arrow}${safe.get(item.to)}: ${seqText(item.label)}`);
        break;
      }
      case "note": {
        const where = item.placement === "left" ? "left of" : item.placement === "right" ? "right of" : "over";
        const targets = (item.placement === "over" ? item.over : item.over.slice(0, 1)).map((id) => safe.get(id));
        lines.push(`${indent()}Note ${where} ${targets.join(",")}: ${seqText(item.text)}`);
        break;
      }
      case "frameStart": {
        const head = item.kind === "rect" ? "rect rgba(127, 127, 127, 0.12)" : `${item.kind} ${seqText(item.label)}`;
        lines.push(`${indent()}${head.trimEnd()}`);
        frames.push(item.kind);
        break;
      }
      case "frameElse": {
        if (!frames.length) break;
        const keyword = ELSE_KEYWORD[frames.at(-1)] ?? "else";
        lines.push(`${"  ".repeat(frames.length)}${keyword} ${seqText(item.label)}`.trimEnd());
        break;
      }
      case "frameEnd": {
        if (!frames.length) break;
        frames.pop();
        lines.push(`${indent()}end`);
        break;
      }
    }
  }
  while (frames.length) {
    frames.pop();
    lines.push(`${indent()}end`);
  }
  return lines.join("\n");
}
