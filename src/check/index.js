// clarify/src/check/index.js
// `clarify check`: open a page in a real browser, check what the reader sees in every panel (audit.js),
// and save a picture of each panel in each view, so an agent can look. A draft is rendered first, and its
// static lint comes along. `render` never starts a browser; only this does.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDraft } from "../parser.js";
import { compile, slugify } from "../render.js";
import { findChrome as findInstalledChrome, launchBrowser, within } from "./cdp.js";
import { auditScript } from "./audit.js";

/**
 * @typedef {{ panel: string | null, view: string, kind: "overflow" | "small text" | "overlap" | "clipped" | "page error" | "half-empty" | "low contrast", msg: string }} CheckProblem
 * @typedef {{ browser: boolean, draft?: boolean, page: string, outDir: string, panels: string[], lint: string[], problems: CheckProblem[], pictures: Array<{ panel: string, view: string, file: string }> }} CheckReport
 * `view` is "<width> <scheme>", as in "390 dark". `panel` null is the page as a whole. `draft` is false
 * when the input was a page, which has no static lint.
 */

/** The four views, each with reduced motion: wide and phone, light and dark. */
export const VIEWS = [
  { width: 1440, height: 1000, scheme: "light" },
  { width: 1440, height: 1000, scheme: "dark" },
  { width: 390, height: 844, scheme: "light" },
  { width: 390, height: 844, scheme: "dark" }
];
const viewName = (v) => `${v.width} ${v.scheme}`;
/** Room around a panel in its picture, in CSS px, so its border and anything that crosses it show. */
const MARGIN = 8;
/** The most lines one kind of problem gets per panel and view; the rest are counted. */
const MAX_LINES = 5;
/** The name of a picture: `<panel>-<width>-<scheme>.png`, as in `D-390-light.png`. */
const PICTURE = /^[A-Za-z0-9]+-\d+-(?:light|dark)\.png$/;

/**
 * Check a page, or a draft (rendered first into `<outDir>/page.html`), in every view.
 * @param {{ input: string, outDir?: string, findChrome?: () => string | null, loadTimeout?: number }} opts
 *   `outDir` defaults to ~/.clarify/checks/<slug>/; `loadTimeout` (ms) bounds the load and each step after it.
 * @returns {Promise<CheckReport>}
 */
export async function checkPage({ input, outDir, findChrome = findInstalledChrome, loadTimeout = 10000 }) {
  const file = path.resolve(input);
  if (!fs.existsSync(file)) throw new Error(`Input file not found: ${file}`);
  const text = fs.readFileSync(file, "utf8");
  const draft = !/\.html?$/i.test(file);
  let html = text;
  let slug;
  /** @type {string[]} */
  let lint = [];
  /** @type {string[]} */
  let panels = [];
  if (draft) {
    const parsed = parseDraft(text);
    parsed.source = file;
    const result = compile(parsed, { source: file });
    html = result.html;
    lint = result.warnings;
    slug = slugify(parsed.meta.title);
    panels = parsed.panels.map((p) => p.id);
  } else slug = slugify(pageSlug(text) || path.basename(file).replace(/\.html?$/i, ""));

  const dir = outDir ? path.resolve(outDir) : path.join(os.homedir(), ".clarify", "checks", slug);
  fs.mkdirSync(dir, { recursive: true });
  // Old pictures go first, so none is left from a panel that is gone. Only names a check writes, since
  // --out may name a folder that holds other pictures too.
  for (const f of fs.readdirSync(dir)) if (PICTURE.test(f)) fs.rmSync(path.join(dir, f), { force: true });
  const page = draft ? path.join(dir, "page.html") : file;
  if (draft) fs.writeFileSync(page, html, "utf8");

  /** @type {CheckReport} */
  const report = { browser: false, draft, page, outDir: dir, panels, lint, problems: [], pictures: [] };
  const executable = findChrome();
  if (!executable) return report;
  report.browser = true;

  const url = pathToFileURL(page).href;
  const browser = await launchBrowser(executable);
  try {
    for (const view of VIEWS) {
      if (!(await checkView(browser, url, view, report, loadTimeout))) break;
    }
  } finally {
    await browser.close();
  }
  return report;
}

/**
 * One view in a fresh tab: the checks, the page errors and a picture of every panel. Returns false when
 * the page ran out of time (one "page error" is added), so the caller skips the remaining views.
 */
async function checkView(browser, url, view, report, loadTimeout) {
  const name = viewName(view);
  const tab = await browser.newPage({ width: view.width, height: view.height, colorScheme: view.scheme, reducedMotion: true });
  try {
    await tab.goto(url, { timeout: loadTimeout });
    const found = await within(tab.eval(auditScript({ halfEmpty: view.width === 1440 })), loadTimeout, "the checks");
    report.panels = found.panels.map((p) => p.id);
    for (const p of found.panels) for (const { kind, msg } of p.problems) report.problems.push({ panel: p.id, view: name, kind, msg });
    if (found.overflow > 1) report.problems.push({ panel: null, view: name, kind: "overflow", msg: `the page is ${found.overflow}px wider than the window` });

    const pageWidth = view.width + found.overflow;
    for (const p of found.panels) {
      const x = Math.max(0, Math.floor(p.rect.x - MARGIN));
      const y = Math.max(0, Math.floor(p.rect.y - MARGIN));
      const clip = { x, y, width: Math.min(pageWidth, Math.ceil(p.rect.x + p.rect.width + MARGIN)) - x, height: Math.ceil(p.rect.y + p.rect.height + MARGIN) - y };
      const png = await within(tab.screenshot({ clip }), loadTimeout, "a picture");
      const file = path.join(report.outDir, `${p.id}-${view.width}-${view.scheme}.png`);
      fs.writeFileSync(file, png);
      report.pictures.push({ panel: p.id, view: name, file });
    }

    // A section's error (`fx NAME: …`) belongs to the panel that holds the section; any other, to the page.
    for (const error of tab.errors) {
      const msg = String(error).split("\n")[0];
      const section = msg.match(/^fx ([a-z0-9][a-z0-9-]*): /);
      report.problems.push({ panel: (section && found.sections[section[1]]) || null, view: name, kind: "page error", msg });
    }
    return true;
  } catch (err) {
    if (!(err instanceof Error) || !err.message.startsWith("timeout waiting for")) throw err;
    report.problems.push({ panel: null, view: name, kind: "page error", msg: `the page did not finish loading in ${loadTimeout / 1000} s (a script that never ends?)` });
    return false;
  } finally {
    // A tab stuck in a script may never answer; the browser closes it anyway.
    await within(tab.close(), 2000, "the tab to close").catch(() => {});
  }
}

/** The slug a clarify page carries in its #c-page-meta, or null. */
function pageSlug(html) {
  const m = html.match(/<script type="application\/json" id="c-page-meta">([\s\S]*?)<\/script>/);
  try {
    return m ? JSON.parse(m[1]).slug || null : null;
  } catch {
    return null;
  }
}

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The report as lines for the terminal: the pictures of the panels with a problem first (so an agent can
 * read only those), then the lint, then the problems by panel and view, then one summary line.
 * @param {CheckReport} report
 * @returns {string[]}
 */
export function formatReport(report) {
  if (!report.browser) {
    const head = "⚠ no Chrome or Edge found (set CHROME_PATH): ";
    if (report.draft === false) return [`${head}nothing checked; the static lint needs the draft`];
    return [`${head}only the static lint ran`, ...report.lint.map((w) => `⚠ ${w}`)];
  }
  const views = VIEWS.map(viewName);
  const order = (p) => [p.panel === null ? -1 : report.panels.indexOf(p.panel), views.indexOf(p.view)];
  const problems = [...report.problems].sort((a, b) => {
    const [pa, va] = order(a);
    const [pb, vb] = order(b);
    return pa - pb || va - vb;
  });

  const lines = [];
  const shots = [];
  for (const p of problems) {
    const shot = p.panel !== null && report.pictures.find((s) => s.panel === p.panel && s.view === p.view);
    if (shot && !shots.includes(shot.file)) shots.push(shot.file);
  }
  if (shots.length) lines.push("Pictures of the panels with a problem:", ...shots.map((f) => `  ${f}`));
  lines.push(...report.lint.map((w) => `⚠ ${w}`));

  /** @type {Map<string, CheckProblem[]>} */
  const groups = new Map();
  for (const p of problems) {
    const key = `${p.panel}\n${p.view}\n${p.kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  for (const group of groups.values()) {
    const { panel, view, kind } = group[0];
    const at = `⚠ ${panel === null ? "page" : `panel ${panel}`} @${view}: ${kind}: `;
    lines.push(...group.slice(0, MAX_LINES).map((p) => at + p.msg));
    if (group.length > MAX_LINES) lines.push(`${at}… and ${group.length - MAX_LINES} more`);
  }

  if (!problems.length) {
    lines.push(`✓ check: ${count(report.panels.length, "panel")} × ${count(VIEWS.length, "view")}, no problems · pictures in ${report.outDir}`);
  } else {
    const inPanels = new Set(problems.filter((p) => p.panel !== null).map((p) => p.panel)).size;
    const onPage = problems.some((p) => p.panel === null);
    const where = !inPanels ? "on the page" : `in ${count(inPanels, "panel")}${onPage ? " and the page" : ""}`;
    lines.push(`⚠ check: ${count(problems.length, "problem")} ${where} · pictures in ${report.outDir}`);
  }
  return lines;
}
