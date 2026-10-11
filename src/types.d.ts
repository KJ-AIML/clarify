// clarify/src/types.d.ts
// Shared type contracts for Clarify. The source stays plain ESM JavaScript (no build
// step); modules reference these via JSDoc `@typedef {import("./types").X}` so editors
// and `tsc --checkJs` can type-check without a compile pass.

// ── Draft ─────────────────────────────────────────────────────────────────────

export type ThemeName =
  | "auto" | "light" | "dark" | "tokyo-night" | "nord" | "catppuccin" | "paper" | "blueprint";

export interface DraftMeta {
  title: string;
  subtitle: string;
  /** Requested default theme. `modern` (legacy) maps to `auto`. */
  theme: ThemeName;
  layout: "hybrid" | "sheet" | "canvas";
  cols: number;
  [key: string]: string | number;
}

export interface Panel {
  /** Single capital letter (A, B, …). */
  id: string;
  title: string;
  /** Column span, already clamped to `meta.cols`. */
  span: number;
  body: string;
  /** 1-based draft line where `body` starts. */
  line: number;
}

export interface Draft {
  meta: DraftMeta;
  lead: string;
  panels: Panel[];
  raw: string;
  /** Absolute path of the source draft, when rendered from a file. */
  source?: string;
}

// ── Markdown blocks ───────────────────────────────────────────────────────────

export type Block =
  | { type: "fence"; lang: string; info: string; body: string; line: number }
  | { type: "table"; rows: string[][]; align: Array<"left" | "center" | "right" | null>; line: number }
  | { type: "heading"; level: number; text: string; line: number }
  | { type: "list"; ordered: boolean; items: ListItem[]; line: number }
  | { type: "quote"; text: string; line: number }
  | { type: "hr"; line: number }
  | { type: "paragraph"; text: string; line: number };

export interface ListItem {
  text: string;
  /** `null` for plain bullets, boolean for `- [ ]` / `- [x]` task items. */
  checked: boolean | null;
  depth: number;
}

// ── Graph model (arch / flow / mermaid flowchart) ─────────────────────────────

export type Direction = "LR" | "TD";
export type NodeShape = "box" | "round" | "cylinder" | "diamond" | "circle";
export type EdgeStyle = "solid" | "dashed" | "thick";

export interface GraphNode {
  /** Stable identity used by edges (label text for Clarify syntax, the id for Mermaid). */
  id: string;
  label: string;
  shape: NodeShape;
  /** Raw tech/brand key such as "redis" or "postgres"; resolved to a mark at render time. */
  tech: string | null;
  /** Innermost group id, or null for top level. */
  group: string | null;
  /** Free-form metadata from `[Node] { key: value; … }` (desc, files, owner, status, …). */
  meta: Record<string, string>;
  /** 1-based draft line of the first declaration, when known. */
  line: number | null;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  style: EdgeStyle;
  arrowStart: boolean;
  arrowEnd: boolean;
  meta: Record<string, string>;
  line: number | null;
}

export interface GraphGroup {
  id: string;
  label: string;
  parent: string | null;
  line: number | null;
}

/** One stop of a route: a hop along an edge (`to` set) or a pause at a node (`to` null). */
export interface TraceStep {
  from: string;
  to: string | null;
  /** Narration shown in the route strip; "" falls back to the edge label. */
  text: string;
  line: number | null;
}

/** An animated request path (a "route"): an ordered walk of node ids along existing edges. */
export interface Trace {
  id: string;
  label: string;
  /** Every node visited, in order. */
  nodes: string[];
  steps: TraceStep[];
  line: number | null;
}

export interface Graph {
  kind: "graph";
  direction: Direction;
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  traces: Trace[];
  warnings: string[];
}

// ── Sequence model (sequence / mermaid sequenceDiagram) ───────────────────────

export interface SeqParticipant {
  id: string;
  label: string;
  tech: string | null;
  kind: "participant" | "actor";
  line: number | null;
}

export type SeqItem =
  | {
      type: "message";
      from: string;
      to: string;
      label: string;
      style: "solid" | "dashed";
      arrow: "filled" | "open" | "cross" | "none";
      line: number | null;
    }
  | {
      type: "note";
      over: string[];
      placement: "over" | "left" | "right";
      text: string;
      line: number | null;
    }
  | {
      type: "frameStart";
      kind: "loop" | "alt" | "opt" | "par" | "critical" | "break" | "rect";
      label: string;
      line: number | null;
    }
  | { type: "frameElse"; label: string; line: number | null }
  | { type: "frameEnd"; line: number | null };

export interface SequenceDiagram {
  kind: "sequence";
  participants: SeqParticipant[];
  items: SeqItem[];
  autonumber: boolean;
  warnings: string[];
}

export interface ParseOptions {
  /** Added to 0-based block line indexes to produce 1-based draft lines. */
  lineOffset?: number;
}

// ── Layout output ─────────────────────────────────────────────────────────────

export interface Point { x: number; y: number }

export interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Text lines after wrapping. */
  lines: string[];
  /** Small caption under the label (tech/brand display name), or "". */
  caption: string;
}

export interface LaidOutEdge extends GraphEdge {
  /** Polyline waypoints from source port to target port. */
  points: Point[];
  /** SVG path data (smoothed). */
  path: string;
  /** Label box center, or null when the edge has no label. */
  labelPos: (Point & { width: number; height: number; text: string; lines: string[] }) | null;
  /** True when the edge runs against the layer direction (cycle back-edge). */
  reversed: boolean;
  selfLoop: boolean;
}

export interface LaidOutGroup extends GraphGroup {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface Layout {
  direction: Direction;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  groups: LaidOutGroup[];
  traces: Trace[];
  width: number;
  height: number;
  /** Edge crossings remaining after ordering (diagnostic). */
  crossings: number;
}
