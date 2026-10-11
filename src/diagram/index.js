// clarify/src/diagram/index.js
// Fence → diagram model dispatch, and model → { svg, inspector model, mermaid } rendering.
// `arch`/`flow` blocks that contain raw Mermaid are detected and routed transparently.

import { parseArchBlock } from "./arch-parser.js";
import { parseMermaid, parseMermaidFlowchart, parseSequence, graphToMermaid, sequenceToMermaid } from "./mermaid.js";
import { computeLayout } from "./layout.js";
import { renderGraphSvg, graphModel } from "./svg.js";
import { renderSequenceSvg } from "./sequence-svg.js";

/** @typedef {import("../types").Graph} Graph */
/** @typedef {import("../types").SequenceDiagram} SequenceDiagram */
/** @typedef {import("../types").Block} Block */

export const DIAGRAM_LANGS = new Set(["arch", "flow", "mermaid", "sequence", "flowchart", "graph"]);

function firstMeaningfulLine(text) {
  return String(text).split("\n").map(l => l.trim()).find(l => l && !l.startsWith("%%")) || "";
}

/**
 * @param {Extract<Block, { type: "fence" }>} block
 * @returns {Graph | SequenceDiagram | null}
 */
export function diagramFromFence(block) {
  if (!DIAGRAM_LANGS.has(block.lang)) return null;
  const opts = { lineOffset: block.line };
  const head = firstMeaningfulLine(block.body);
  if (block.lang === "mermaid") return parseMermaid(block.body, opts);
  if (block.lang === "sequence" || /^sequenceDiagram\b/.test(head)) return parseSequence(block.body, opts);
  if (block.lang === "flowchart" || block.lang === "graph" || /^(graph|flowchart)\b/i.test(head)) {
    const src = /^(graph|flowchart)\b/i.test(head) ? block.body : `flowchart ${block.info || "TD"}\n${block.body}`;
    return parseMermaidFlowchart(src, { lineOffset: /^(graph|flowchart)\b/i.test(head) ? block.line : block.line - 1 });
  }
  const dir = (block.info.match(/\b(LR|RL|TD|TB|BT)\b/i)?.[1] || "LR").toUpperCase();
  return parseArchBlock(block.body, { ...opts, direction: dir });
}

/**
 * @param {Graph | SequenceDiagram} diagram
 * @param {string} [title]
 * @param {Map<string, object>} [sprite] collects brand marks for the page sprite
 */
export function renderDiagram(diagram, title = "", sprite) {
  if (diagram.kind === "sequence") {
    const { svg, model, width, height } = renderSequenceSvg(diagram, { title, sprite });
    return {
      svg, model, width, height,
      mermaid: sequenceToMermaid(diagram),
      stats: [plural(diagram.participants.length, "participant"), plural(model.edges.length, "message")].join(" · "),
      warnings: diagram.warnings
    };
  }
  const layout = computeLayout(diagram);
  return {
    svg: renderGraphSvg(layout, { title, sprite }),
    model: graphModel(layout),
    width: layout.width,
    height: layout.height,
    mermaid: graphToMermaid(diagram),
    stats: [plural(layout.nodes.length, "component"), plural(layout.edges.length, "link"), layout.groups.length ? plural(layout.groups.length, "boundary", "boundaries") : ""].filter(Boolean).join(" · "),
    warnings: diagram.warnings
  };
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
