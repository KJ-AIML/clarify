// clarify/src/diagram/svg.js
// SVG renderer for laid-out graphs. Emits semantic, class-based markup: every color
// comes from CSS custom properties, so themes and exports restyle without re-rendering.
// Arrow markers live once per page in the shared `#c-defs` sprite (see render.js).

import { getBrandMark, brandIcon, techDisplayName } from "../brand-marks/brands.js";
import { escapeXml as x, r1 } from "./text.js";
import { smoothPath } from "./layout.js";

/** @typedef {import("../types").Layout} Layout */
/** @typedef {import("../types").LaidOutNode} LaidOutNode */

const STATUS = new Set(["ok", "warn", "no", "err"]);
export const TRACE_COLORS = 4;

/**
 * @param {Layout} layout
 * @param {{ title?: string, sprite?: Map<string, object> }} [opts]
 * @returns {string}
 */
export function renderGraphSvg(layout, opts = {}) {
  const isLR = layout.direction === "LR";
  const nodeIdx = new Map(layout.nodes.map((n, i) => [n.id, i]));
  const out = [];
  out.push(`<svg class="c-svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${x(opts.title || "Architecture diagram")}">`);
  out.push(`<rect class="c-svg-bg" width="${layout.width}" height="${layout.height}"/>`);
  out.push(`<g class="c-scene">`);

  // Groups: shallow first so nested boxes paint on top.
  out.push(`<g class="c-groups">`);
  [...layout.groups].sort((a, b) => a.depth - b.depth).forEach(g => {
    out.push(`<g class="c-group depth-${Math.min(g.depth, 3)}" data-group="${x(g.id)}">`);
    out.push(`<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" rx="12"/>`);
    out.push(`<text x="${r1(g.x + 12)}" y="${r1(g.y + 16)}" class="c-group-label">${x(g.label.toUpperCase())}</text>`);
    out.push(`</g>`);
  });
  out.push(`</g>`);

  // Edges: halo (keeps crossings legible), visible line, wide transparent hit area.
  out.push(`<g class="c-edges">`);
  layout.edges.forEach((e, i) => {
    const cls = ["c-edge", `is-${e.style}`, e.reversed ? "is-back" : ""].filter(Boolean).join(" ");
    const markers = `${e.arrowEnd ? ' marker-end="url(#c-arrow)"' : ""}${e.arrowStart ? ' marker-start="url(#c-arrow)"' : ""}`;
    const aria = `${layout.nodes[nodeIdx.get(e.from)]?.label} to ${layout.nodes[nodeIdx.get(e.to)]?.label}${e.label ? `: ${e.label}` : ""}`;
    out.push(`<g class="${cls}" data-edge="${i}" tabindex="-1" aria-label="${x(aria)}">`);
    out.push(`<path class="c-edge-halo" d="${e.path}"/>`);
    out.push(`<path class="c-edge-line" d="${e.path}"${markers}/>`);
    out.push(`<path class="c-edge-hit" d="${e.path}"/>`);
    out.push(`</g>`);
  });
  out.push(`</g>`);

  // Traces: highlighted path plus a pulse that travels the whole walk.
  out.push(`<g class="c-traces">`);
  layout.traces.forEach((t, i) => {
    const d = tracePath(layout, t, isLR);
    if (!d) return;
    const dur = Math.min(7, Math.max(1.8, d.length / 300)).toFixed(1);
    out.push(`<g class="c-trace tc-${i % TRACE_COLORS}" data-trace="${i}">`);
    out.push(`<path class="c-trace-line" d="${d.path}"/>`);
    out.push(`<circle class="c-trace-dot" r="5"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${d.path}"/></circle>`);
    out.push(`</g>`);
  });
  out.push(`</g>`);

  out.push(`<g class="c-elabels">`);
  layout.edges.forEach((e, i) => {
    const lp = e.labelPos;
    if (!lp) return;
    out.push(`<g class="c-elabel" data-edge="${i}">`);
    out.push(`<rect x="${r1(lp.x - lp.width / 2)}" y="${r1(lp.y - lp.height / 2)}" width="${lp.width}" height="${lp.height}" rx="${lp.lines.length > 1 ? 6 : r1(lp.height / 2)}"/>`);
    const top = lp.y - ((lp.lines.length - 1) * 13) / 2;
    out.push(`<text x="${lp.x}" y="${r1(top)}" dy="0.35em" text-anchor="middle">${lp.lines.map((l, j) => `<tspan x="${lp.x}" dy="${j ? 13 : 0}">${x(l)}</tspan>`).join("")}</text>`);
    out.push(`</g>`);
  });
  out.push(`</g>`);

  out.push(`<g class="c-nodes">`);
  layout.nodes.forEach((n, i) => out.push(renderNode(n, i, opts.sprite)));
  out.push(`</g>`);

  out.push(`</g></svg>`);
  return out.join("\n");
}

/** @param {LaidOutNode} n */
function renderNode(n, i, sprite) {
  const status = STATUS.has(n.meta.status) ? n.meta.status : "";
  const hasMeta = Object.keys(n.meta).some(k => k !== "status");
  const cls = ["c-node", `shape-${n.shape}`, status ? `is-${status}` : "", hasMeta ? "has-meta" : ""].filter(Boolean).join(" ");
  const aria = [n.label, n.caption.toLowerCase(), status && `status ${status}`].filter(Boolean).join(", ");
  const w = n.width;
  const h = n.height;
  const parts = [];
  parts.push(`<g class="${cls}" data-node="${i}" transform="translate(${n.x},${n.y})" tabindex="0" role="button" aria-label="${x(aria)}">`);
  parts.push(shapeMarkup(n.shape, w, h));
  if (status) parts.push(`<rect class="c-node-status" x="0" y="${n.shape === "cylinder" ? 12 : 9}" width="3" height="${h - (n.shape === "cylinder" ? 24 : 18)}" rx="1.5"/>`);

  const mark = getBrandMark(n.tech) || (n.tech ? null : getBrandMark(n.label));
  const showIcon = n.shape !== "diamond" && n.shape !== "circle" && (mark || n.tech);
  const blockH = n.lines.length * 17 + (n.caption ? 14 : 0);
  const capOffset = n.shape === "cylinder" ? 5 : 0;
  const top = (h - blockH) / 2 + capOffset;
  const textX = showIcon ? 10 + 30 + 10 : w / 2;
  const anchor = showIcon ? "start" : "middle";
  if (showIcon) {
    // Icon tile tinted with the brand color: recognizable at a glance, even zoomed out.
    const ty = r1((h - 30) / 2 + capOffset);
    const tint = mark && !isInk(mark.hex) ? ` style="fill:${rgba(mark.hex, 0.13)}"` : "";
    parts.push(`<rect class="c-node-tile${mark ? "" : " is-mono"}" x="10" y="${ty}" width="30" height="30" rx="8"${tint}/>`);
    if (mark) parts.push(`<g transform="translate(15,${r1(Number(ty) + 5)})">${brandIcon(mark, 20, sprite)}</g>`);
    else parts.push(`<text class="c-node-mono" x="25" y="${r1(Number(ty) + 15)}" dy="0.35em" text-anchor="middle">${x(monogram(n.tech))}</text>`);
  }
  parts.push(`<text class="c-node-title" x="${r1(textX)}" y="${r1(top + 13)}" text-anchor="${anchor}">${n.lines.map((l, j) => `<tspan x="${r1(textX)}" dy="${j ? 17 : 0}">${x(l)}</tspan>`).join("")}</text>`);
  if (n.caption) parts.push(`<text class="c-node-caption" x="${r1(textX)}" y="${r1(top + n.lines.length * 17 + 10)}" text-anchor="${anchor}">${x(n.caption)}</text>`);
  if (hasMeta) parts.push(`<circle class="c-node-meta" cx="${w - 9}" cy="9" r="2.5"/>`);
  parts.push(`</g>`);
  return parts.join("");
}

function isInk(hex) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40;
}

function rgba(hex, alpha) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

function monogram(key) {
  return String(key || "?").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
}

function shapeMarkup(shape, w, h) {
  switch (shape) {
    case "cylinder": {
      const ry = 6;
      return `<path class="c-node-bg" d="M0 ${ry} A${w / 2} ${ry} 0 0 1 ${w} ${ry} V${h - ry} A${w / 2} ${ry} 0 0 1 0 ${h - ry} Z"/><path class="c-node-rim" d="M0 ${ry} A${w / 2} ${ry} 0 0 0 ${w} ${ry}"/>`;
    }
    case "diamond":
      return `<polygon class="c-node-bg" points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}"/>`;
    case "circle":
      return `<ellipse class="c-node-bg" cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
    case "round":
      return `<rect class="c-node-bg" width="${w}" height="${h}" rx="${h / 2}"/>`;
    default:
      return `<rect class="c-node-bg" width="${w}" height="${h}" rx="10"/>`;
  }
}

/**
 * Join the hops of a trace into one motion path. Each hop follows the drawn edge
 * (reversed when the walk runs against it); hops are bridged through the node.
 * @returns {{ path: string, length: number } | null}
 */
export function tracePath(layout, trace, isLR) {
  let d = "";
  let length = 0;
  for (let h = 0; h < trace.nodes.length - 1; h++) {
    const a = trace.nodes[h];
    const b = trace.nodes[h + 1];
    const fwd = layout.edges.find(e => e.from === a && e.to === b);
    const edge = fwd || layout.edges.find(e => e.from === b && e.to === a);
    if (!edge) return null;
    const pts = fwd ? edge.points : [...edge.points].reverse();
    const seg = smoothPath(pts, isLR);
    d += d ? ` L${seg.slice(1)}` : seg;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return d ? { path: d, length } : null;
}

/** Inspector/exports model embedded next to each diagram as JSON. */
export function graphModel(layout) {
  const nodeIdx = new Map(layout.nodes.map((n, i) => [n.id, i]));
  return {
    kind: "graph",
    direction: layout.direction,
    width: layout.width,
    height: layout.height,
    nodes: layout.nodes.map(n => ({
      id: n.id,
      label: n.label,
      tech: n.tech,
      techName: n.tech ? techDisplayName(n.tech) : "",
      shape: n.shape,
      group: n.group,
      meta: n.meta,
      line: n.line
    })),
    edges: layout.edges.map(e => ({
      id: e.id,
      from: nodeIdx.get(e.from),
      to: nodeIdx.get(e.to),
      label: e.label,
      style: e.style,
      both: Boolean(e.arrowStart && e.arrowEnd),
      back: e.reversed,
      meta: e.meta,
      line: e.line
    })),
    groups: layout.groups.map(g => ({ id: g.id, label: g.label, parent: g.parent })),
    traces: layout.traces.map((t, i) => ({
      label: t.label,
      color: i % TRACE_COLORS,
      nodes: t.nodes.map(id => nodeIdx.get(id)),
      steps: (t.steps || []).map(st => {
        let edge = null;
        let reverse = false;
        if (st.to) {
          edge = layout.edges.findIndex(e => e.from === st.from && e.to === st.to);
          if (edge === -1) {
            edge = layout.edges.findIndex(e => e.from === st.to && e.to === st.from);
            reverse = edge !== -1;
          }
          if (edge === -1) edge = null;
        }
        return { from: nodeIdx.get(st.from), to: st.to ? nodeIdx.get(st.to) : null, text: st.text, edge, reverse };
      })
    }))
  };
}

/** Shared marker sprite, emitted once per page and copied into exported SVGs. */
export const SVG_DEFS = `<svg id="c-defs" width="0" height="0" aria-hidden="true" style="position:absolute"><defs>
<marker id="c-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 1.2 L9.2 5 L0 8.8 z" class="c-arrow-head"/></marker>
<marker id="c-arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 1.2 L9.2 5 L0 8.8 z" class="c-arrow-head is-hl"/></marker>
<marker id="c-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 1 L9 5 L1 9" class="c-arrow-open"/></marker>
<marker id="c-cross" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse"><path d="M2 2 L8 8 M8 2 L2 8" class="c-arrow-open"/></marker>
</defs></svg>`;
