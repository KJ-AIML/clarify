// clarify/src/render.js
// Draft → standalone single-file HTML page. Styles and the browser runtime live in
// src/runtime/* as real CSS/JS files and are inlined (lightly minified) at compile time.

import fs from "node:fs";
import { tokenizeBlocks, renderInline, escapeHtml, plainInline } from "./markdown.js";
import { DIAGRAM_LANGS, diagramFromFence, renderDiagram } from "./diagram/index.js";
import { SVG_DEFS } from "./diagram/svg.js";
import { draftToMarkdown } from "./export/markdown.js";
import { renderBrandSprite } from "./brand-marks/brands.js";
import { renderLesson } from "./lesson/render.js";
import { FREE_NAME, parseFreeInfo, loadFreeSection, splitFragment, wrapScript } from "./free/section.js";
import { lintFree, idsOf } from "./free/lint.js";
import { FX_DEFS } from "./free/kit.js";

/** @typedef {import("./types").Draft} Draft */
/** @typedef {import("./types").Block} Block */
/** @typedef {import("./types").CompileResult} CompileResult */

const asset = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const minifyCss = (css) => css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{};,>])\s*/g, "$1")
  .replace(/:\s+/g, ":")
  .replace(/([\s:,(-])0\.(\d)/g, "$1.$2") // 0.5 -> .5
  .replace(/;}/g, "}")
  .trim();
const minifyJs = (js) => js
  .split("\n")
  .map(l => l.trim())
  .filter(l => l && !l.startsWith("//"))
  .join("\n");

// JetBrains Mono, Latin subset, one variable file for every weight from 100 to 800 (src/runtime/fonts,
// OFL-1.1), inlined so every page looks the same on every machine without a network request. Other
// scripts (Thai, CJK) fall back per glyph to the system's faces through the font stack in themes.css.
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const FONT_WOFF2 = fs.readFileSync(new URL("./runtime/fonts/jetbrains-mono-latin-wght-normal.woff2", import.meta.url)).toString("base64");
const FONT_CSS = `/* JetBrains Mono © 2020 The JetBrains Mono Project Authors, SIL Open Font License 1.1 */` +
  `@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:100 800;font-display:swap;src:url(data:font/woff2;base64,${FONT_WOFF2}) format("woff2");unicode-range:${LATIN}}`;
/** Bytes the embedded font adds to every page; the page-size budgets in the tests add exactly this. */
export const FONT_BYTES = Buffer.byteLength(FONT_CSS);
const CSS = minifyCss(asset("./runtime/themes.css") + asset("./runtime/page.css"));
const SVG_CSS = minifyCss(asset("./runtime/svg.css"));
const CLIENT_JS = minifyJs(asset("./runtime/client.js"));
// Only pages that contain a lesson carry these (the anatomy kit's shading CSS + the lesson player).
const LESSON_CSS = minifyCss(asset("./iso/kit.css") + asset("./runtime/lesson.css"));
const LESSON_JS = minifyJs(asset("./runtime/lesson.js"));
// Only pages that contain a free section carry the kit; each section's own CSS follows it as written.
const FX_CSS = minifyCss(asset("./runtime/fx.css"));
// A free section is raw HTML and script, so its page must stay off the network. Inline script and style, the
// embedded font (data:) and the PNG export (data: and blob: images) still work. `clarify serve` adds
// `connect-src 'self'` for live reload's EventSource.
const FREE_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; form-action 'none'; base-uri 'none'";

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
 * @returns {CompileResult}
 */
export function compile(draft, opts = {}) {
  const { meta, lead } = draft;
  const ctx = {
    diagrams: 0, lessons: 0, asks: 0, callouts: 0, warnings: /** @type {string[]} */ ([]), sprite: new Map(), cols: meta.cols, heroUsed: false,
    // Free sections, shared by reference across panels like `warnings`: every section (a missing or badly
    // named one too) and the absolute path of every `file=`. `source` is "" for a draft read from stdin.
    free: /** @type {Array<{ name: string, panel: string, line: number, html: string, styles: string[], scripts: string[], bytes: number }>} */ ([]),
    files: /** @type {string[]} */ ([]),
    // How often each id has been seen in free sections on the whole page; the second sighting is a duplicate.
    freeIds: /** @type {Map<string, number>} */ (new Map()),
    source: opts.source || draft.source || ""
  };

  const rendered = draft.panels.map(panel => {
    const pctx = { ...ctx, panel, wide: false, roomy: false };
    const blocks = tokenizeBlocks(panel.body, panel.line - 1);
    const body = blocks.map(b => renderBlock(b, pctx)).join("\n");
    ctx.diagrams = pctx.diagrams;
    ctx.lessons = pctx.lessons;
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
  const pageMeta = { title: meta.title, slug, source: ctx.source, live: Boolean(opts.live) };
  const markdown = draftToMarkdown({ ...draft, source: ctx.source });

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(meta.lang || "en")}" data-theme="${escapeHtml(meta.theme)}">
<head>
<meta charset="utf-8">${ctx.free.length ? `\n<meta http-equiv="Content-Security-Policy" content="${FREE_CSP}${opts.live ? "; connect-src 'self'" : ""}">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Clarify">
<title>${escapeHtml(plainInline(meta.title))}</title>
<script>(()=>{try{const t=JSON.parse(localStorage.getItem("clarify:theme")||"null");if(t)document.documentElement.dataset.theme=t}catch{}})()</script>
<style id="c-font">${FONT_CSS}</style>
<style>${CSS}</style>
<style id="c-svg-css">${SVG_CSS}</style>${ctx.lessons ? `\n<style id="c-lesson-css">${LESSON_CSS}</style>` : ""}${ctx.free.length ? `\n<style id="c-fx-css">${FX_CSS}</style>${freeStyles(ctx.free)}` : ""}
</head>
<body>
${SVG_DEFS}${ctx.free.length ? `\n${FX_DEFS}` : ""}
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
<script>${CLIENT_JS}</script>${ctx.lessons ? `\n<script id="c-lesson-js">${LESSON_JS}</script>` : ""}${freeScripts(ctx.free)}
</body>
</html>
`;
  return {
    html,
    warnings: ctx.warnings,
    stats: { panels: draft.panels.length, diagrams: ctx.diagrams, asks: ctx.asks, callouts: ctx.callouts, bytes: Buffer.byteLength(html) },
    files: ctx.files
  };
}

/**
 * Each `<style>` of each free section, as written, in its own style element named by the section. The browser
 * stops at the end of each sheet, so a `{` left open spoils only the rest of its own `<style>`.
 */
function freeStyles(free) {
  return free.flatMap(f => f.styles.filter(css => css.trim()).map(css => `\n<style data-fx-css="${f.name}">${css}</style>`)).join("");
}

/**
 * One bare `<script>` per section script, so a script that throws or does not parse stops only itself
 * (and the template-leak test, which skips bare scripts, ignores them).
 */
function freeScripts(free) {
  return free.flatMap(f => f.scripts.filter(js => js.trim()).map(js => `\n<script>${wrapScript(f.name, js)}</script>`)).join("");
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
  if (b.lang === "lesson") {
    const lesson = renderLesson(b, ctx.lessons++);
    lesson.warnings.forEach(w => ctx.warnings.push(`panel ${ctx.panel.id}: ${w}`));
    ctx.wide = ctx.roomy = true;
    return lesson.html;
  }
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
  if (b.lang === "free") return renderFree(b, ctx);
  return `<div class="c-code"><pre><code${b.lang ? ` class="language-${escapeHtml(b.lang)}"` : ""}>${escapeHtml(b.body)}</code></pre><button type="button" class="c-tool c-copy" aria-label="Copy code">${ICON.copy}</button></div>`;
}

/**
 * A `free` fence: the one place raw HTML enters a page. The fragment is wrapped in its own element; its
 * styles and scripts are collected in `ctx.free` for the head and the end of the body. A missing file or a
 * bad name warns and shows the kit's dashed box instead. A good section is linted (src/free/lint.js), and
 * an id already used by an earlier section, or earlier in this one, warns as a duplicate.
 */
function renderFree(b, ctx) {
  const s = loadFreeSection(b, ctx.source);
  const written = parseFreeInfo(b.info).file;
  const warn = (text) => ctx.warnings.push(`panel ${ctx.panel.id}: line ${b.line}: ${text}`);
  const named = FREE_NAME.test(s.name);
  if (!named) warn(`free section needs a name of lowercase letters, digits and dashes ("${b.info}")`);
  else if (ctx.free.some(f => f.name === s.name)) warn(`free section "${s.name}" is used twice on this page; give each one its own name`);
  if (s.missing) warn(`free section file not found: ${written}`);
  if (s.file) ctx.files.push(s.file);
  const entry = { name: s.name, panel: ctx.panel.id, line: b.line, html: "", styles: [], scripts: [], bytes: 0 };
  ctx.free.push(entry);
  if (!named) return `<div class="fx fx-missing">This free section needs a name.</div>`;
  if (s.missing) return `<div class="fx fx-missing" data-fx="${s.name}">${escapeHtml(`Missing section "${s.name}": ${written} was not found.`)}</div>`;
  const { html, styles, scripts } = splitFragment(s.fragment);
  Object.assign(entry, { html: html.trim(), styles, scripts, bytes: Buffer.byteLength(s.fragment) });
  lintFree(entry).forEach(w => warn(`free "${s.name}": ${w}`));
  for (const id of idsOf(entry.html)) {
    const seen = (ctx.freeIds.get(id) ?? 0) + 1;
    ctx.freeIds.set(id, seen);
    if (seen === 2) warn(`free "${s.name}": duplicate id "${id}" on the page`);
  }
  return `<div class="fx fx-${s.name}" data-fx="${s.name}">${entry.html}</div>`;
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

/**
 * A name for files and folders: the title's ASCII letters and digits, joined by dashes. A title with none of
 * them (Thai, Chinese) gives `fallback`.
 * @param {string} title
 * @param {string} [fallback]
 */
export function slugify(title, fallback = "clarify") {
  return String(title || "board")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/-$/, "") || fallback;
}

/** JSON safe to embed in a <script> element. */
function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
