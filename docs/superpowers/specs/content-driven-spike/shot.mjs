// Throwaway spike: preview free sections and check them.
//   node .tmp/spike-free/shot.mjs <name> [name...]      (from the repo root)
// For each name: build preview-<name>.html with only that section, open it in three views
// (1440 light, 1440 dark, 390 light; reduced motion), save a PNG of the section's panel to
// shots/<name>-<width>-<light|dark>.png and print every problem the in-page checks find.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "./build.mjs";
import { launchBrowser, decodePng, encodePng } from "../../test/visual/cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECTIONS = path.join(HERE, "sections");
const SHOTS = path.join(HERE, "shots");
const VIEWS = [
  { width: 1440, height: 1000, scheme: "light" },
  { width: 1440, height: 1000, scheme: "dark" },
  { width: 390, height: 844, scheme: "light" }
];
const MAX_LINES = 10; // per kind of problem and view; the rest are counted

// ── the in-page checks (this function is stringified and run in the page) ──────────────────
function check(name) {
  const root = document.querySelector('[data-fx="' + name + '"]');
  if (!root) return { fatal: 'no [data-fx="' + name + '"] element in the page' };
  const problems = [];
  const add = (kind, msg) => problems.push({ kind, msg });
  const clean = (s) => s.replace(/\s+/g, " ").trim();
  const short = (s) => { s = clean(s); return s.length > 48 ? s.slice(0, 47) + "…" : s; };
  const label = (el) => el.tagName.toLowerCase() + (el.getAttribute("class") ? "." + el.getAttribute("class").trim().split(/\s+/).join(".") : "");
  const isSvg = (el) => el instanceof SVGElement;
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).map((n) => n.nodeValue).join(" ");
  const visible = (el) => {
    if (getComputedStyle(el).visibility === "hidden") return false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.opacity === "0") return false;
    }
    return true;
  };
  const els = [...root.querySelectorAll("*")];
  const rb = root.getBoundingClientRect();

  // a. overflow
  for (const el of els) {
    const sc = el.parentElement && el.parentElement.closest(".fx-scroll");
    if (sc && root.contains(sc)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const right = r.right - rb.right;
    const left = rb.left - r.left;
    if ((right > 1 || left > 1) && visible(el)) {
      add("overflow", label(el) + " sticks out " + Math.round(Math.max(right, left)) + "px on the " + (right > left ? "right" : "left") + " of the section");
    }
  }
  const body = root.closest(".c-card-body");
  if (body) {
    const bb = body.getBoundingClientRect();
    const cs = getComputedStyle(body);
    const inner = bb.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (rb.width > inner + 1) add("overflow", "the section is " + Math.round(rb.width) + "px wide but its panel body is " + Math.round(inner) + "px");
  }
  if (root.scrollWidth > root.clientWidth + 1) add("overflow", "content is wider than the section (" + root.scrollWidth + "px > " + root.clientWidth + "px)");

  // b. small text
  const MIN = 10.5 - 0.005;
  for (const el of els) {
    const own = ownText(el);
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    let size = parseFloat(getComputedStyle(el).fontSize);
    const scaleOf = (node) => { const m = node.getScreenCTM && node.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
    if (isSvg(el)) size *= scaleOf(el);
    else { const fo = el.closest("foreignObject"); if (fo) size *= scaleOf(fo); }
    if (size < MIN && visible(el)) add("small", 'text is ' + size.toFixed(1) + 'px (under 10.5px): "' + short(own) + '" in ' + label(el));
  }

  // c. text overlap
  const boxes = [];
  for (const el of els) {
    const own = ownText(el);
    if (!own) continue;
    let rects = [];
    if (isSvg(el)) rects = [el.getBoundingClientRect()];
    else {
      const range = document.createRange();
      for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { range.selectNodeContents(n); rects.push(...range.getClientRects()); }
    }
    rects = rects.filter((r) => r.width > 0.5 && r.height > 0.5);
    if (rects.length && visible(el)) boxes.push({ el, text: short(own), rects });
  }
  const area = (r) => r.width * r.height;
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i];
      const B = boxes[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      let worst = 0;
      for (const ra of A.rects) for (const rb2 of B.rects) worst = Math.max(worst, inter(ra, rb2) / Math.min(area(ra), area(rb2)));
      if (worst > 0.15) add("overlap", 'text overlaps (' + Math.round(worst * 100) + '% of the smaller box): "' + A.text + '" and "' + B.text + '"');
    }
  }

  // d. clipped text
  for (const el of [root, ...els]) {
    if (isSvg(el) || !clean(el.textContent)) continue;
    const cs = getComputedStyle(el);
    const cutX = /hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const cutY = /hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if ((cutX || cutY) && visible(el)) {
      add("clipped", 'text is clipped in ' + label(el) + ' (' + (cutX ? "scrollWidth " + el.scrollWidth + " > clientWidth " + el.clientWidth : "scrollHeight " + el.scrollHeight + " > clientHeight " + el.clientHeight) + '): "' + short(el.textContent) + '"');
    }
  }

  const card = root.closest(".c-card") || root;
  const cr = card.getBoundingClientRect();
  return { problems, card: { x: cr.left + scrollX, y: cr.top + scrollY, w: cr.width, h: cr.height } };
}

// ── contract lint (static, on the section files) ───────────────────────────────────────────
function lint(name) {
  const out = [];
  const read = (ext) => { const f = path.join(SECTIONS, `${name}.${ext}`); return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : ""; };
  const html = read("html");
  const css = read("css").replace(/\/\*[\s\S]*?\*\//g, "");
  const js = read("js");
  if (/<\s*\/?\s*(html|head|body|style|script|link|meta)\b/i.test(html)) out.push("the fragment has a html/head/body/style/script/link/meta tag; CSS goes in the .css file and JS in the .js file");
  if (/(src|href)\s*=\s*["']\s*(https?:)?\/\//i.test(html) || /url\(\s*["']?\s*(https?:)?\/\//i.test(css)) out.push("external resource (images, fonts and scripts must be inline)");
  for (const block of css.matchAll(/\{([^{}]*)\}/g)) {
    const raw = block[1].match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/);
    if (raw) { out.push(`raw colour "${raw[0]}" in the CSS (use var(--token))`); break; }
  }
  const rawAttr = html.match(/\b(?:fill|stroke|stop-color|flood-color|color)\s*[:=]\s*["']?\s*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/);
  if (rawAttr) out.push(`raw colour "${rawAttr[0].trim()}" in the HTML (use a class or var(--token))`);
  // selectors: walk the braces, skipping the insides of @keyframes
  const ctx = [];
  let prelude = "";
  const own = new RegExp(`^\\.fx-${name.replace(/[^\w-]/g, "")}(?![A-Za-z0-9_])`);
  const bad = new Set();
  for (const ch of css) {
    if (ch === "{") {
      const p = prelude.trim();
      prelude = "";
      if (p.startsWith("@")) {
        ctx.push(/^@(-\w+-)?keyframes/i.test(p) ? "keyframes" : "at");
        const kf = p.match(/^@(?:-\w+-)?keyframes\s+([\w-]+)/i);
        if (kf && !kf[1].startsWith(`fx-${name}`)) out.push(`@keyframes ${kf[1]} should be named fx-${name}-…`);
      } else {
        if (!ctx.includes("keyframes")) {
          let depth = 0; let cur = ""; const list = [];
          for (const c of p) { if (c === "(") depth++; if (c === ")") depth--; if (c === "," && !depth) { list.push(cur); cur = ""; } else cur += c; }
          list.push(cur);
          for (const sel of list) if (sel.trim() && !own.test(sel.trim())) bad.add(sel.trim());
        }
        ctx.push("rule");
      }
    } else if (ch === "}") { ctx.pop(); prelude = ""; } else if (ch === ";" && !ctx.length) prelude = "";
    else prelude += ch;
  }
  if (bad.size) out.push(`selectors must start with .fx-${name}: ${[...bad].slice(0, 4).join(" | ")}${bad.size > 4 ? ` (+${bad.size - 4} more)` : ""}`);
  const bytes = Buffer.byteLength(html) + Buffer.byteLength(css) + Buffer.byteLength(js);
  const limit = name === "mouse-cutaway" ? 80 : 40;
  if (bytes > limit * 1024) out.push(`${(bytes / 1024).toFixed(1)} KB of HTML+CSS+JS is over the ${limit} KB budget`);
  return out;
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────
function crop(png, x, y, w, h) {
  const img = decodePng(png);
  x = Math.max(0, Math.min(img.width - 1, Math.floor(x)));
  y = Math.max(0, Math.min(img.height - 1, Math.floor(y)));
  w = Math.max(1, Math.min(img.width - x, Math.ceil(w)));
  h = Math.max(1, Math.min(img.height - y, Math.ceil(h)));
  const data = Buffer.alloc(w * h * 4);
  for (let row = 0; row < h; row++) img.data.copy(data, row * w * 4, ((y + row) * img.width + x) * 4, ((y + row) * img.width + x + w) * 4);
  return encodePng({ width: w, height: h, data });
}

async function shootName(browser, name) {
  const preview = path.join(HERE, `preview-${name}.html`);
  const result = build({ only: [name], out: preview });
  if (result.missing.includes(name) || !result.used.includes(name)) {
    console.log(`✗ ${name}: sections/${name}.html does not exist (or the draft has no @@FREE:${name}@@ marker)`);
    return false;
  }
  const part = result.parts.get(name);
  console.log(`built ${path.relative(process.cwd(), preview) || preview}: ${name} is ${((part.html + part.css + part.js) / 1024).toFixed(1)} KB (html ${(part.html / 1024).toFixed(1)}, css ${(part.css / 1024).toFixed(1)}, js ${(part.js / 1024).toFixed(1)})`);
  for (const line of lint(name)) console.log(`⚠ ${name} lint: ${line}`);

  const url = pathToFileURL(preview).href;
  const saved = [];
  for (const view of VIEWS) {
    const tag = `${view.width} ${view.scheme}`;
    const warn = (msg) => console.log(`⚠ ${name} @${tag}: ${msg}`);
    // Pass 1: the checks, at the standard viewport.
    const page = await browser.newPage({ width: view.width, height: view.height, colorScheme: view.scheme, reducedMotion: true });
    let measured;
    try {
      await page.goto(url);
      await page.sleep(250);
      await page.eval(`(() => { const c = document.querySelector('[data-fx="${name}"]')?.closest(".c-card"); if (c) window.scrollTo({ top: Math.max(0, c.getBoundingClientRect().top + scrollY - 8), behavior: "instant" }); })()`);
      await page.sleep(100);
      measured = await page.eval(`(${check.toString()})(${JSON.stringify(name)})`);
      if (measured.fatal) { warn(measured.fatal); continue; }
      const counts = {};
      let total = 0;
      for (const p of measured.problems) {
        counts[p.kind] = (counts[p.kind] || 0) + 1;
        total++;
        if (counts[p.kind] <= MAX_LINES) warn(p.msg);
        else if (counts[p.kind] === MAX_LINES + 1) warn(`…more ${p.kind} problems not listed`);
      }
      for (const e of page.errors) { total++; warn(`page error: ${String(e).split("\n")[0]}`); }
      if (!total) console.log(`✓ ${name} @${tag}: no problems`);
    } finally {
      await page.close();
    }
    // Pass 2: a viewport as tall as the panel, so one screenshot holds the whole panel; then crop to it.
    const { x, w, h } = measured.card;
    const shot = await browser.newPage({ width: view.width, height: Math.min(Math.ceil(h) + 16, 9000), colorScheme: view.scheme, reducedMotion: true });
    try {
      await shot.goto(url);
      await shot.sleep(250);
      const box = await shot.eval(`(() => { const c = document.querySelector('[data-fx="${name}"]').closest(".c-card"); window.scrollTo({ top: Math.max(0, c.getBoundingClientRect().top + scrollY - 8), behavior: "instant" }); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
      await shot.sleep(150);
      const png = await shot.screenshot({ fullPage: false });
      const out = path.join(SHOTS, `${name}-${view.width}-${view.scheme}.png`);
      fs.mkdirSync(SHOTS, { recursive: true });
      fs.writeFileSync(out, crop(png, box.x - 8, Math.max(0, box.y - 8), box.w + 16, box.h + 16));
      saved.push(out);
    } finally {
      await shot.close();
    }
  }
  for (const f of saved) console.log(f);
  return true;
}

// ── main ────────────────────────────────────────────────────────────────────────────────────
const names = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (!names.length) {
  console.error("usage: node .tmp/spike-free/shot.mjs <name> [name...]");
  process.exit(2);
}
let failed = false;
const browser = await launchBrowser();
try {
  for (const name of names) {
    if (!/^[a-z0-9-]+$/.test(name)) { console.log(`✗ ${name}: not a section name`); failed = true; continue; }
    if (!(await shootName(browser, name))) failed = true;
  }
} finally {
  try { await browser.close(); } catch { /* already gone */ }
}
process.exit(failed ? 1 : 0);
