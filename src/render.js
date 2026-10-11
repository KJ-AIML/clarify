// clarify/src/render.js
// Draft → standalone single-file HTML page. Styles and the browser runtime live in
// src/runtime/* as real CSS/JS files and are inlined (lightly minified) at compile time.

import fs from "node:fs";
import { tokenizeBlocks, renderInline, escapeHtml, plainInline } from "./markdown.js";
import { DIAGRAM_LANGS, diagramFromFence, renderDiagram } from "./diagram/index.js";
import { SVG_DEFS } from "./diagram/svg.js";
import { draftToMarkdown } from "./export/markdown.js";
import { renderBrandSprite } from "./brand-marks/brands.js";

/** @typedef {import("./types").Draft} Draft */
/** @typedef {import("./types").Block} Block */

const asset = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const minifyCss = (css) => css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{};,>])\s*/g, "$1")
  .replace(/:\s+/g, ":")
  .replace(/;}/g, "}")
  .trim();
const minifyJs = (js) => js
  .split("\n")
  .map(l => l.trim())
  .filter(l => l && !l.startsWith("//"))
  .join("\n");

const CSS = minifyCss(asset("./runtime/themes.css") + asset("./runtime/page.css"));
const SVG_CSS = minifyCss(asset("./runtime/svg.css"));
const CLIENT_JS = minifyJs(asset("./runtime/client.js"));

export const THEMES = [
  ["auto", "Auto (system)"], ["light", "Light"], ["dark", "Dark"], ["tokyo-night", "Tokyo Night"],
  ["nord", "Nord"], ["catppuccin", "Catppuccin"], ["paper", "Paper"], ["blueprint", "Blueprint"]
];

const ICON = {
  comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 7v6M12 17h.01"/></svg>`,
  no: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3zM12 9v4M12 17h.01"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`
};

const CALLOUT_ICON = { ok: ICON.check, warn: ICON.alert, err: ICON.stop, info: ICON.info };
const WIDE_DIAGRAM = 1100;

/**
 * Compile a parsed draft.
 * @param {Draft} draft
 * @param {{ live?: boolean, source?: string }} [opts]
 * @returns {{ html: string, warnings: string[], stats: { panels: number, diagrams: number, asks: number, callouts: number, bytes: number } }}
 */
export function compile(draft, opts = {}) {
  const { meta, lead } = draft;
  const ctx = { diagrams: 0, asks: 0, callouts: 0, warnings: /** @type {string[]} */ ([]), sprite: new Map(), cols: meta.cols, heroUsed: false };

  const rendered = draft.panels.map(panel => {
    const pctx = { ...ctx, panel, wide: false, roomy: false };
    const blocks = tokenizeBlocks(panel.body, panel.line - 1);
    const body = blocks.map(b => renderBlock(b, pctx)).join("\n");
    ctx.diagrams = pctx.diagrams;
    ctx.asks = pctx.asks;
    ctx.callouts = pctx.callouts;
    ctx.heroUsed = pctx.heroUsed;
    ctx.firstAskPanel = pctx.firstAskPanel;
    const span = pctx.wide && meta.layout !== "canvas" ? meta.cols : Math.min(panel.span, meta.cols);
    return { panel, body, span, roomy: pctx.roomy || pctx.wide };
  });
  packRows(rendered, meta.cols);

  const cards = rendered.map(({ panel, body, span }) => {
    return `<section class="c-card" id="panel-${panel.id}" data-panel="${panel.id}" data-line="${panel.line}"${span > 1 ? ` data-span="${span}"` : ""}>
<header class="c-card-head"><span class="c-key">${panel.id}</span><h2 class="c-card-title">${renderInline(panel.title)}</h2><button type="button" class="c-icon-btn" data-comment aria-label="Comment on panel ${panel.id}">${ICON.comment}</button></header>
<div class="c-card-body">${body}</div>
</section>`;
  });

  const slug = slugify(meta.title);
  const pageMeta = { title: meta.title, slug, source: opts.source || draft.source || "", live: Boolean(opts.live) };
  const markdown = draftToMarkdown(draft);

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(meta.lang || "en")}" data-theme="${escapeHtml(meta.theme)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Clarify">
<title>${escapeHtml(plainInline(meta.title))}</title>
<script>(()=>{try{const t=JSON.parse(localStorage.getItem("clarify:theme")||"null");if(t)document.documentElement.dataset.theme=t}catch{}})()</script>
<style>${CSS}</style>
<style id="c-svg-css">${SVG_CSS}</style>
</head>
<body>
${SVG_DEFS}
${renderBrandSprite(ctx.sprite)}
<div class="c-page" data-layout="${escapeHtml(meta.layout)}">
<header class="c-hero">
<div class="c-topbar">
<span class="c-eyebrow">${escapeHtml([meta.eyebrow || "Clarify brief", meta.date].filter(Boolean).join(" · "))}</span>
<div class="c-actions">
${opts.live ? `<span class="c-live is-off" aria-live="polite">Connecting…</span>` : ""}
<label class="c-sr" for="c-theme">Theme</label>
<select id="c-theme" class="c-select">${THEMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
<button type="button" class="c-btn" id="c-copy-md">${ICON.copy}Copy as Markdown</button>
</div>
</div>
<div class="c-hero-grid">
<div class="c-hero-main">
<h1>${renderInline(meta.title)}</h1>
${meta.subtitle ? `<p class="c-subtitle">${renderInline(meta.subtitle)}</p>` : ""}
${lead ? `<p class="c-lead">${renderInline(lead)}</p>` : ""}
</div>
${sectionIndex(rendered, ctx)}
</div>
</header>
<main class="c-grid" style="--cols:${meta.cols}">
${cards.join("\n")}
</main>
</div>
<aside class="c-sheet" aria-label="Inspector" aria-hidden="true">
<div class="c-sheet-head"><div class="c-sheet-icon"></div><div class="c-sheet-title"><div class="c-sheet-kind"></div><h2></h2><p></p></div><button type="button" class="c-icon-btn" data-close aria-label="Close inspector">${ICON.close}</button></div>
<div class="c-sheet-body"></div>
</aside>
<div class="c-dock" hidden><span class="c-dock-count"></span><button type="button" class="c-btn is-primary" data-reply>${ICON.send}Copy reply for agent</button></div>
<div class="c-toast" role="status" aria-live="polite"></div>
<script type="application/json" id="c-page-meta">${jsonForScript(pageMeta)}</script>
<script type="application/json" id="c-markdown">${jsonForScript(markdown)}</script>
<script>${CLIENT_JS}</script>
</body>
</html>
`;
  return {
    html,
    warnings: ctx.warnings,
    stats: { panels: draft.panels.length, diagrams: ctx.diagrams, asks: ctx.asks, callouts: ctx.callouts, bytes: Buffer.byteLength(html) }
  };
}

/** "On this page" index: the panel letters double as reply references ([C] …). */
function sectionIndex(cards, ctx) {
  if (cards.length < 3) return "";
  const items = cards.map(({ panel }) =>
    `<li><a href="#panel-${panel.id}"><span class="c-key">${panel.id}</span><span>${renderInline(panel.title)}</span></a></li>`).join("");
  const asks = ctx.asks
    ? `<a class="c-index-note" href="#panel-${ctx.firstAskPanel}">${ctx.asks === 1 ? "1 question needs" : `${ctx.asks} questions need`} your answer →</a>`
    : "";
  return `<nav class="c-index" aria-label="On this page"><h2 class="c-index-title">On this page</h2><ol>${items}</ol>${asks}</nav>`;
}

/** Back-compatible entry point (v0.1 API). */
export function compileToHtml(draft, opts = {}) {
  return compile(draft, opts).html;
}

/**
 * Fill grid holes: when a row of cards leaves columns empty, widen the card that benefits
 * most (tables and diagrams first, else the last card) so rows end flush.
 */
export function packRows(cards, cols) {
  let row = [];
  let used = 0;
  const flush = () => {
    const rest = cols - used;
    if (rest > 0 && row.length) {
      const target = row.find(c => c.roomy) || row.at(-1);
      target.span += rest;
    }
    row = [];
    used = 0;
  };
  for (const card of cards) {
    if (used + card.span > cols) flush();
    row.push(card);
    used += card.span;
  }
  flush();
  return cards;
}

// ── blocks ────────────────────────────────────────────────────────────────────

/** @param {Block} b */
function renderBlock(b, ctx) {
  switch (b.type) {
    case "paragraph": return `<p>${renderInline(b.text)}</p>`;
    case "heading": return `<h${b.level <= 3 ? 3 : 4}>${renderInline(b.text)}</h${b.level <= 3 ? 3 : 4}>`;
    case "hr": return "<hr>";
    case "quote": return `<blockquote>${renderInline(b.text)}</blockquote>`;
    case "list": {
      const tag = b.ordered ? "ol" : "ul";
      const items = b.items.map(it => {
        const cls = [it.depth ? `depth-${Math.min(it.depth, 2)}` : "", it.checked !== null ? "is-task" : ""].filter(Boolean).join(" ");
        const box = it.checked === null ? "" : `<span class="c-check${it.checked ? " is-on" : ""}" role="img" aria-label="${it.checked ? "done" : "not done"}">${it.checked ? ICON.ok : ""}</span>`;
        return `<li${cls ? ` class="${cls}"` : ""}>${box}<span>${renderInline(it.text)}</span></li>`;
      });
      return `<${tag}>${items.join("")}</${tag}>`;
    }
    case "table": return renderTable(b.rows, b.align, ctx);
    case "fence": return renderFence(b, ctx);
    default: return "";
  }
}

function statusBadge(text) {
  const m = String(text).match(/^(ok|warn|no)(?:\s+(.*))?$/);
  if (!m) return null;
  return `<span class="c-badge is-${m[1]}">${ICON[m[1]]}${renderInline(m[2] || { ok: "OK", warn: "Warning", no: "No" }[m[1]])}</span>`;
}

function renderTable(rows, align, ctx) {
  if (!rows.length) return "";
  if (ctx && rows[0].length > 3) ctx.roomy = true;
  const [head, ...body] = rows;
  const style = (i) => (align[i] ? ` style="text-align:${align[i]}"` : "");
  return `<div class="c-table-wrap" tabindex="0"><table class="c-table"><thead><tr>${head.map((c, i) => `<th${style(i)}>${renderInline(c)}</th>`).join("")}</tr></thead><tbody>${
    body.map(r => `<tr>${head.map((_, i) => `<td${style(i)}>${statusBadge(r[i] ?? "") ?? renderInline(r[i] ?? "")}</td>`).join("")}</tr>`).join("")
  }</tbody></table></div>`;
}

function renderFence(b, ctx) {
  if (DIAGRAM_LANGS.has(b.lang)) return renderDiagramFigure(b, ctx);
  if (b.lang === "callout") {
    ctx.callouts++;
    const [rawType = "info", ...title] = b.info.split(/\s+/);
    const type = CALLOUT_ICON[rawType] ? rawType : "info";
    const heading = title.join(" ") || { ok: "Recommendation", warn: "Watch out", err: "Blocker", info: "Note" }[type];
    return `<div class="c-callout is-${type}" role="note"><div class="c-callout-head">${CALLOUT_ICON[type]}<span>${renderInline(heading)}</span></div>${b.body.trim() ? `<div class="c-callout-body">${renderInline(b.body.trim())}</div>` : ""}</div>`;
  }
  if (b.lang === "ask") return renderAsk(b, ctx);
  if (b.lang === "kv") {
    const rows = b.body.split("\n").map(l => l.match(/^\s*([^:]+?)\s*:\s*(.*)$/)).filter(Boolean);
    return `<dl class="c-kv">${rows.map(m => `<dt>${renderInline(m[1])}</dt><dd>${statusBadge(m[2]) ?? renderInline(m[2])}</dd>`).join("")}</dl>`;
  }
  if (b.lang === "tree") {
    const rows = b.body.split("\n").filter(l => l.trim()).map(line => {
      const lead = line.match(/^[\s│├└─|`-]*/)[0];
      const depth = Math.round(lead.replace(/\t/g, "  ").length / 2);
      const [label, note] = line.slice(lead.length).split(/\s+\|\s+|\s+#\s+/);
      return `<div class="c-tree-row" style="padding-left:${depth * 14}px"><span class="c-tree-label">${renderInline(label)}</span>${note ? `<span class="c-tree-note">${renderInline(note)}</span>` : ""}</div>`;
    });
    return `<div class="c-tree">${rows.join("")}</div>`;
  }
  return `<div class="c-code"><pre><code${b.lang ? ` class="language-${escapeHtml(b.lang)}"` : ""}>${escapeHtml(b.body)}</code></pre><button type="button" class="c-tool c-copy" aria-label="Copy code">${ICON.copy}</button></div>`;
}

function renderDiagramFigure(b, ctx) {
  const diagram = diagramFromFence(b);
  if (!diagram) return "";
  const index = ctx.diagrams++;
  const title = plainInline(ctx.panel.title);
  const r = renderDiagram(diagram, title, ctx.sprite);
  if (r.width > WIDE_DIAGRAM && r.width / Math.max(r.height, 1) > 2.2) ctx.wide = true;
  r.warnings.forEach(w => ctx.warnings.push(`panel ${ctx.panel.id}: ${w}`));
  const model = { ...r.model, mermaid: r.mermaid };
  const hero = !ctx.heroUsed && model.kind === "graph" && (ctx.wide || ctx.panel.span >= ctx.cols);
  if (hero) ctx.heroUsed = true;
  const warn = r.warnings.length
    ? `<details class="c-warnings"><summary>${r.warnings.length} diagram warning${r.warnings.length > 1 ? "s" : ""}</summary><ul>${r.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul></details>`
    : "";
  const routes = model.traces.length
    ? `<div class="c-route" hidden role="region" aria-label="Route tour">
<div class="c-route-head"><span class="c-route-name"></span><span class="c-route-count"></span>
<div class="c-route-ctl"><button type="button" class="c-tool" data-tour="prev" aria-label="Previous stop">‹</button><button type="button" class="c-tool" data-tour="play" aria-label="Pause">❚❚</button><button type="button" class="c-tool" data-tour="next" aria-label="Next stop">›</button><button type="button" class="c-tool" data-tour="close" aria-label="Close route">${ICON.close}</button></div></div>
<ol class="c-stations"></ol>
<p class="c-route-text" aria-live="polite"></p>
</div>`
    : "";
  return `<figure class="c-diagram${hero ? " is-hero" : ""}" data-kind="${model.kind}" data-diagram="${index}">
<div class="c-stage">
<div class="c-viewport" tabindex="0" aria-label="${escapeHtml(title)} diagram. Drag to pan, Ctrl or Command plus scroll to zoom, Tab to reach nodes.">
${r.svg}
<div class="c-minimap" hidden></div>
<span class="c-zoom" aria-hidden="true"></span>
<div class="c-hint">Drag to pan · ⌘/Ctrl + scroll to zoom · click anything to inspect</div>
</div>
<div class="c-tools" role="toolbar" aria-label="Diagram tools">
<button type="button" class="c-tool" data-act="zoom-out" aria-label="Zoom out">−</button>
<button type="button" class="c-tool" data-act="fit" aria-label="Fit diagram to view">Fit</button>
<button type="button" class="c-tool" data-act="zoom-in" aria-label="Zoom in">+</button>
<div class="c-menu-wrap"><button type="button" class="c-tool" data-act="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Export">${ICON.download}</button>
<div class="c-menu" role="menu" hidden><button type="button" role="menuitem" data-act="export-svg">SVG image <span>.svg</span></button><button type="button" role="menuitem" data-act="export-png">PNG image <span>high-DPI</span></button><button type="button" role="menuitem" data-act="copy-mermaid">Copy as Mermaid <span>GitHub</span></button></div></div>
<button type="button" class="c-tool" data-act="full" aria-label="Expand to fullscreen">${ICON.expand}</button>
</div>
${routes}
</div>
${mapKey(model, r.stats)}
${warn}
<script type="application/json" class="c-model">${jsonForScript(model)}</script>
</figure>`;
}

/**
 * The map key under each diagram: what is on the map, the routes you can play, and a
 * legend that lists only the line styles and markers this diagram actually uses.
 */
function mapKey(model, stats) {
  const routes = model.traces.map((t, i) =>
    `<button type="button" class="c-route-btn tc-${t.color}" data-trace="${i}"><span class="c-route-play" aria-hidden="true">▶</span>${escapeHtml(t.label)}<span class="c-route-stops">${new Set(t.nodes).size} stops</span></button>`).join("");
  const line = (cls) => `<svg width="26" height="8" aria-hidden="true"><line class="${cls}" x1="1" y1="4" x2="25" y2="4"/></svg>`;
  const items = [];
  if (model.kind === "sequence") {
    items.push([line("k-solid"), "request"]);
    if (model.edges.some(e => e.style === "dashed")) items.push([line("k-dashed"), "reply"]);
  } else {
    const styles = new Set(model.edges.map(e => e.style));
    if (styles.has("solid")) items.push([line("k-solid"), "call"]);
    if (styles.has("dashed")) items.push([line("k-dashed"), "async"]);
    if (styles.has("thick")) items.push([line("k-thick"), "main flow"]);
    if (model.edges.some(e => e.both)) items.push([line("k-solid"), "two-way"]);
    if (model.edges.some(e => e.back)) items.push([line("k-back"), "loops back"]);
    if (model.groups.length) items.push([`<span class="k-zone" aria-hidden="true"></span>`, "boundary"]);
    const statuses = new Set(model.nodes.map(n => n.meta.status).filter(st => ["ok", "warn", "no", "err"].includes(st)));
    for (const st of ["ok", "warn", "no", "err"]) if (statuses.has(st)) items.push([`<span class="k-dot is-${st}" aria-hidden="true"></span>`, st]);
    if (model.nodes.some(n => Object.keys(n.meta).some(k => k !== "status"))) items.push([`<span class="k-dot is-meta" aria-hidden="true"></span>`, "has details"]);
  }
  return `<figcaption class="c-mapkey">
<div class="c-mapkey-main"><span class="c-mapkey-stats">${escapeHtml(stats)}</span>${routes ? `<span class="c-mapkey-label">Routes</span>${routes}` : ""}</div>
<ul class="c-legend" aria-label="Legend">${items.map(([sym, label]) => `<li>${sym}<span>${label}</span></li>`).join("")}</ul>
</figcaption>`;
}

const OPTION = /^(\[[ xX]\]|[*+-])\s+(.*)$/;

function renderAsk(b, ctx) {
  const lines = b.body.split("\n").map(l => l.trim()).filter(Boolean);
  const questions = [];
  for (const line of lines) {
    const m = line.match(OPTION);
    if (m && questions.length) questions.at(-1).options.push({ marker: m[1], text: m[2] });
    else if (!m) questions.push({ text: line.replace(/^(\?|Q:)\s*/i, ""), options: [] });
  }
  if (questions.length && !ctx.firstAskPanel) ctx.firstAskPanel = ctx.panel.id;
  return questions.map(q => {
    const n = ctx.asks++;
    const multi = q.options.some(o => o.marker.startsWith("["));
    const name = `ask-${ctx.panel.id}-${n}`;
    const opts = q.options.map(o => {
      const suggested = o.marker === "*" || /x/i.test(o.marker);
      const [label, note] = o.text.split(/\s+\|\s+|\|/).map(s => s.trim());
      return `<label class="c-opt"><input type="${multi ? "checkbox" : "radio"}" name="${name}" value="${escapeHtml(plainInline(label))}"${suggested ? " checked data-suggested" : ""}><span class="c-opt-text"><span class="c-opt-label">${renderInline(label)}${suggested ? `<span class="c-suggested">Suggested</span>` : ""}</span>${note ? `<span class="c-opt-note">${renderInline(note)}</span>` : ""}</span></label>`;
    }).join("");
    return `<fieldset class="c-ask" data-question="${escapeHtml(plainInline(q.text))}"><legend>${renderInline(q.text)}</legend>${opts}<textarea aria-label="Note for: ${escapeHtml(plainInline(q.text))}" placeholder="Add context for the agent (optional)" rows="2"></textarea></fieldset>`;
  }).join("");
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function slugify(title) {
  return String(title || "board")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/-$/, "") || "clarify";
}

/** JSON safe to embed in a <script> element. */
function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
