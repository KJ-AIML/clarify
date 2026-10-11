// clarify/src/diagram/sequence-svg.js
// Layout + SVG for sequence diagrams: participant headers, lifelines, messages,
// notes and nested frames (loop / alt / opt / par …). Column spacing grows to fit
// the widest message label between each pair of participants.

import { getBrandMark, brandIcon, renderMonogramSvg, techDisplayName } from "../brand-marks/brands.js";
import { textWidth, wrapText, escapeXml as x, r1 } from "./text.js";

/** @typedef {import("../types").SequenceDiagram} SequenceDiagram */

const M = 24;
const HEAD_H = 46;
const MIN_COL = 120;

/**
 * @param {SequenceDiagram} seq
 * @param {{ title?: string, sprite?: Map<string, object> }} [opts]
 * @returns {{ svg: string, model: object, width: number, height: number }}
 */
export function renderSequenceSvg(seq, opts = {}) {
  const parts = seq.participants;
  const index = new Map(parts.map((p, i) => [p.id, i]));
  const heads = parts.map(p => {
    const mark = getBrandMark(p.tech);
    const icon = Boolean(mark || p.tech);
    const w = Math.max(MIN_COL, textWidth(p.label, 13, true) + 28 + (icon ? 28 : 0));
    return { ...p, mark, icon, w };
  });

  // Column gaps: start from header widths, widen for message labels.
  const gap = heads.slice(1).map((h, i) => (heads[i].w + h.w) / 2 + 36);
  const messages = seq.items.filter(it => it.type === "message");
  for (const m of messages) {
    const a = index.get(m.from);
    const b = index.get(m.to);
    if (a === undefined || b === undefined) continue;
    const need = textWidth(m.label, 12) + 48;
    if (a === b) {
      if (a < gap.length) gap[a] = Math.max(gap[a], need + 30);
      continue;
    }
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const have = gap.slice(lo, hi).reduce((s, g) => s + g, 0);
    if (have < need) gap[hi - 1] += need - have;
  }
  const cx = [];
  heads.forEach((h, i) => cx.push(i === 0 ? M + h.w / 2 : cx[i - 1] + gap[i - 1]));
  const lastRight = heads.length ? cx.at(-1) + heads.at(-1).w / 2 : M + MIN_COL;
  const selfOverflow = messages.some(m => m.from === m.to && index.get(m.from) === heads.length - 1)
    ? Math.max(...messages.filter(m => m.from === m.to).map(m => textWidth(m.label, 12) + 70)) : 0;

  // Rows.
  const body = [];
  const frames = [];
  const stack = [];
  let y = M + HEAD_H + 22;
  let n = 0;
  const edges = [];

  for (const it of seq.items) {
    if (it.type === "message") {
      const a = index.get(it.from);
      const b = index.get(it.to);
      if (a === undefined || b === undefined) continue;
      stack.forEach(f => { f.cols.add(a); f.cols.add(b); });
      n++;
      const cls = `c-msg is-${it.style} arrow-${it.arrow}`;
      const marker = it.arrow === "none" ? "" : ` marker-end="url(#c-${it.arrow === "filled" ? "arrow" : it.arrow === "cross" ? "cross" : "open"})"`;
      const edgeIdx = edges.length;
      edges.push({ id: `m${edgeIdx}`, from: a, to: b, label: it.label, style: it.style, meta: {}, line: it.line });
      if (a === b) {
        const x0 = cx[a];
        body.push(`<g class="${cls}" data-edge="${edgeIdx}">`);
        body.push(`<text class="c-msg-label" x="${r1(x0 + 12)}" y="${r1(y + 4)}">${x(it.label)}</text>`);
        const d = `M ${x0} ${y + 12} H ${x0 + 34} V ${y + 34} H ${x0 + 4}`;
        body.push(`<path class="c-msg-line" d="${d}"${marker}/><path class="c-edge-hit" d="${d}"/>`);
        if (seq.autonumber) body.push(numberBadge(x0, y + 12, n));
        body.push(`</g>`);
        y += 52;
      } else {
        const x0 = cx[a];
        const x1 = cx[b];
        const dir = Math.sign(x1 - x0);
        const ay = y + 16;
        body.push(`<g class="${cls}" data-edge="${edgeIdx}">`);
        body.push(`<text class="c-msg-label" x="${r1((x0 + x1) / 2)}" y="${r1(y + 4)}" text-anchor="middle">${x(it.label)}</text>`);
        const d = `M ${r1(x0 + dir * 2)} ${ay} H ${r1(x1 - dir * 3)}`;
        body.push(`<path class="c-msg-line" d="${d}"${marker}/><path class="c-edge-hit" d="${d}"/>`);
        if (seq.autonumber) body.push(numberBadge(x0, ay, n));
        body.push(`</g>`);
        y += 40;
      }
    } else if (it.type === "note") {
      const cols = it.over.map(id => index.get(id)).filter(c => c !== undefined);
      if (!cols.length) continue;
      stack.forEach(f => cols.forEach(c => f.cols.add(c)));
      const lo = Math.min(...cols);
      const hi = Math.max(...cols);
      const lines = wrapText(it.text, 220, 12, false, 4);
      const w = Math.max(...lines.map(l => textWidth(l, 12))) + 20;
      const h = lines.length * 15 + 12;
      let left;
      let width = w;
      if (it.placement === "left") left = cx[lo] - w - 10;
      else if (it.placement === "right") left = cx[hi] + 10;
      else {
        width = Math.max(w, cx[hi] - cx[lo] + 40);
        left = (cx[lo] + cx[hi]) / 2 - width / 2;
      }
      body.push(`<g class="c-note"><rect x="${r1(left)}" y="${y}" width="${r1(width)}" height="${h}" rx="4"/>`);
      lines.forEach((l, j) => body.push(`<text x="${r1(left + width / 2)}" y="${y + 18 + j * 15}" text-anchor="middle">${x(l)}</text>`));
      body.push(`</g>`);
      y += h + 14;
    } else if (it.type === "frameStart") {
      const f = { kind: it.kind, label: it.label, y0: y, elses: [], cols: new Set(), depth: stack.length };
      stack.push(f);
      y += 30;
    } else if (it.type === "frameElse") {
      const f = stack.at(-1);
      if (f) f.elses.push({ y: y + 2, label: it.label });
      y += 26;
    } else if (it.type === "frameEnd") {
      const f = stack.pop();
      if (!f) continue;
      f.y1 = y;
      frames.push(f);
      stack.forEach(p => f.cols.forEach(c => p.cols.add(c)));
      y += 12;
    }
  }
  while (stack.length) {
    const f = stack.pop();
    f.y1 = y;
    frames.push(f);
  }

  const lifeEnd = y + 10;
  const width = Math.ceil(Math.max(lastRight + M + selfOverflow, M * 2 + MIN_COL));
  const height = Math.ceil(lifeEnd + M);

  const svg = [];
  svg.push(`<svg class="c-svg c-seq" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${x(opts.title || "Sequence diagram")}">`);
  svg.push(`<rect class="c-svg-bg" width="${width}" height="${height}"/>`);
  svg.push(`<g class="c-scene">`);

  frames.sort((a, b) => a.depth - b.depth).forEach(f => {
    const cols = f.cols.size ? [...f.cols] : heads.map((_, i) => i);
    const pad = 16 + Math.max(0, 3 - f.depth) * 6;
    const left = Math.min(...cols.map(c => cx[c] - Math.min(heads[c].w / 2, 70))) - pad;
    const right = Math.max(...cols.map(c => cx[c] + Math.min(heads[c].w / 2, 70))) + pad;
    const tag = f.kind === "rect" ? "" : f.kind;
    svg.push(`<g class="c-frame kind-${f.kind}">`);
    svg.push(`<rect x="${r1(left)}" y="${f.y0}" width="${r1(right - left)}" height="${f.y1 - f.y0}" rx="6"/>`);
    if (tag) {
      const tw = textWidth(tag, 11, true) + 14;
      svg.push(`<path class="c-frame-tag" d="M ${r1(left)} ${f.y0 + 6} Q ${r1(left)} ${f.y0} ${r1(left + 6)} ${f.y0} H ${r1(left + tw)} V ${f.y0 + 14} L ${r1(left + tw - 6)} ${f.y0 + 20} H ${r1(left)} Z"/>`);
      svg.push(`<text class="c-frame-kind" x="${r1(left + 7)}" y="${f.y0 + 14}">${x(tag)}</text>`);
      if (f.label) svg.push(`<text class="c-frame-label" x="${r1(left + tw + 8)}" y="${f.y0 + 14}">[${x(f.label)}]</text>`);
    }
    for (const e of f.elses) {
      svg.push(`<line class="c-frame-sep" x1="${r1(left)}" x2="${r1(right)}" y1="${e.y}" y2="${e.y}"/>`);
      if (e.label) svg.push(`<text class="c-frame-label" x="${r1(left + 8)}" y="${e.y + 15}">[${x(e.label)}]</text>`);
    }
    svg.push(`</g>`);
  });

  heads.forEach((h, i) => {
    svg.push(`<line class="c-lifeline" x1="${r1(cx[i])}" x2="${r1(cx[i])}" y1="${M + HEAD_H}" y2="${lifeEnd}"/>`);
  });
  svg.push(...body);
  heads.forEach((h, i) => {
    const left = cx[i] - h.w / 2;
    const textX = h.icon ? left + 14 + 20 + 8 : cx[i];
    svg.push(`<g class="c-node c-participant${h.kind === "actor" ? " is-actor" : ""}" data-node="${i}" transform="translate(${r1(left)},${M})" tabindex="0" role="button" aria-label="${x(h.label)}">`);
    svg.push(`<rect class="c-node-bg" width="${r1(h.w)}" height="${HEAD_H}" rx="${h.kind === "actor" ? HEAD_H / 2 : 10}"/>`);
    if (h.icon) svg.push(`<g transform="translate(14,13)">${h.mark ? brandIcon(h.mark, 20, opts.sprite) : renderMonogramSvg(h.tech, 20)}</g>`);
    svg.push(`<text class="c-node-title" x="${r1(textX - left)}" y="28" text-anchor="${h.icon ? "start" : "middle"}">${x(h.label)}</text>`);
    svg.push(`</g>`);
  });

  svg.push(`</g></svg>`);

  const model = {
    kind: "sequence",
    width,
    height,
    nodes: heads.map(h => ({ id: h.id, label: h.label, tech: h.tech, techName: h.tech ? techDisplayName(h.tech) : "", shape: "box", group: null, meta: {}, line: h.line })),
    edges,
    groups: [],
    traces: []
  };
  return { svg: svg.join("\n"), model, width, height };
}

function numberBadge(cx0, cy0, n) {
  return `<g class="c-msg-num"><circle cx="${r1(cx0)}" cy="${r1(cy0)}" r="8"/><text x="${r1(cx0)}" y="${r1(cy0)}" dy="0.35em" text-anchor="middle">${n}</text></g>`;
}
