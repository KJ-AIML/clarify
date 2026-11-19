// clarify/src/check/index.js
// `clarify check`: open a page in a real browser, check what the reader sees in every panel (audit.js),
// and save a picture of each panel in each view, so an agent can look. A draft is rendered first, and its
// static lint comes along. `render` only hands a page to the default browser to show; only this drives one.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDraft } from "../parser.js";
import { compile, slugify } from "../render.js";
import { findChrome as findInstalledChrome, launchBrowser, within } from "./cdp.js";
import { auditScript } from "./audit.js";

/**
 * @typedef {{ panel: string | null, view: string, kind: "overflow" | "small text" | "overlap" | "clipped" | "page error" | "half-empty" | "low contrast" | "missing", msg: string }} CheckProblem
 * @typedef {{ browser: boolean, failure?: string, draft?: boolean, page: string, outDir: string, panels: string[], lint: string[], problems: CheckProblem[], pictures: Array<{ panel: string, view: string, file: string }> }} CheckReport
 * `view` is "<width> <scheme>", as in "390 dark". `panel` null is the page as a whole. `draft` is false
 * when the input was a page, which has no static lint. `panels` are the draft's panels, so one the page lost
 * keeps its place; for a page, the ones the browser found. `failure` says why a browser that was found did
 * not start; `browser` is then false.
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
 * @param {{ input: string, outDir?: string, findChrome?: () => string | null, loadTimeout?: number, launch?: typeof launchBrowser }} opts
 *   `outDir` defaults to ~/.clarify/checks/<folder>/ (see checkFolder); `loadTimeout` (ms) bounds the load and
 *   each step after it; `launch` starts the browser (the tests wrap it).
 * @returns {Promise<CheckReport>}
 */
export async function checkPage({ input, outDir, findChrome = findInstalledChrome, loadTimeout = 10000, launch = launchBrowser }) {
  const file = path.resolve(input);
  if (!fs.existsSync(file)) throw new Error(`Input file not found: ${file}`);
  const text = fs.readFileSync(file, "utf8");
  const draft = !/\.html?$/i.test(file);
  let html = text;
  let title;
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
    title = parsed.meta.title;
    panels = parsed.panels.map((p) => p.id);
  } else title = pageTitle(text);

  const dir = outDir ? path.resolve(outDir) : path.join(os.homedir(), ".clarify", "checks", checkFolder(file, title));
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
  let browser;
  try {
    browser = await launch(executable);
  } catch (err) {
    report.failure = `${executable}: ${err instanceof Error ? err.message : err}`;
    return report;
  }
  report.browser = true;

  const url = pathToFileURL(page).href;
  try {
    for (const view of VIEWS) {
      if (!(await checkView(browser, url, view, report, loadTimeout))) break;
    }
  } finally {
    await browser.close();
  }
  return report;
}

/** Said of a draft panel that the browser did not find on the page. */
const MISSING = "not on the page; a free section above it may leave a comment, <style> or <script> open";

/**
 * One view in a fresh tab: the checks, the page errors and a picture of every panel. Whatever goes wrong
 * becomes a "page error" of this view, so the views that finished keep their results. Returns false when
 * the remaining views should be skipped: the browser has gone, or the page ran out of time.
 */
async function checkView(browser, url, view, report, loadTimeout) {
  const name = viewName(view);
  const s = `${loadTimeout / 1000} s`;
  /** What the view is waiting for, as said when its time runs out. */
  let waiting = `the browser did not open a tab in ${s}`;
  let tab = null;
  try {
    tab = await within(browser.newPage({ width: view.width, height: view.height, colorScheme: view.scheme, reducedMotion: true }), loadTimeout, "a tab");
    waiting = `the page did not finish loading in ${s} (a script that never ends?)`;
    await tab.goto(url, { timeout: loadTimeout });
    waiting = `the checks did not finish in ${s} (a script that never ends, or a page too big to measure?)`;
    const found = await within(tab.eval(auditScript({ halfEmpty: view.width === 1440 })), loadTimeout, "the checks");
    const ids = found.panels.map((p) => p.id);
    // A draft's panel that is not on the page was swallowed by a section that leaves something open. It is
    // said once, in the first view that sees it, since every view reads the same page.
    if (report.draft) {
      for (const id of report.panels) {
        if (!ids.includes(id) && !report.problems.some((p) => p.kind === "missing" && p.panel === id)) report.problems.push({ panel: id, view: name, kind: "missing", msg: MISSING });
      }
    } else report.panels = ids;
    for (const p of found.panels) for (const { kind, msg } of p.problems) report.problems.push({ panel: p.id, view: name, kind, msg });
    if (found.overflow > 1) report.problems.push({ panel: null, view: name, kind: "overflow", msg: `the page is ${found.overflow}px wider than the window` });

    const pageWidth = view.width + found.overflow;
    for (const p of found.panels) {
      const x = Math.max(0, Math.floor(p.rect.x - MARGIN));
      const y = Math.max(0, Math.floor(p.rect.y - MARGIN));
      const clip = { x, y, width: Math.min(pageWidth, Math.ceil(p.rect.x + p.rect.width + MARGIN)) - x, height: Math.ceil(p.rect.y + p.rect.height + MARGIN) - y };
      waiting = `the picture of panel ${p.id} did not finish in ${s}`;
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
    const reason = String(err instanceof Error ? err.message : err).split("\n")[0];
    const problem = (msg) => report.problems.push({ panel: null, view: name, kind: "page error", msg });
    if (browser.gone) {
      problem(`the browser stopped (${browser.gone}); this view and the ones after it were not checked`);
      return false;
    }
    if (reason.startsWith("timeout waiting for")) {
      problem(waiting);
      return false;
    }
    problem(`this view could not be checked: ${reason}`);
    return true;
  } finally {
    // A tab stuck in a script may never answer; the browser closes it anyway.
    if (tab) await within(tab.close(), 2000, "the tab to close").catch(() => {});
  }
}

/** The title a clarify page carries in its #c-page-meta, or null. */
function pageTitle(html) {
  const m = html.match(/<script type="application\/json" id="c-page-meta">([\s\S]*?)<\/script>/);
  try {
    return m ? JSON.parse(m[1]).title || null : null;
  } catch {
    return null;
  }
}

/**
 * The folder of a check under ~/.clarify/checks: the slug of the title. A title with no ASCII letter or digit
 * (Thai, Chinese) slugs to nothing, so then the file's name decides, and when that slugs to nothing too, a
 * short hash of the file's path. Two pages never share a folder only because their titles are not English.
 * @param {string} file absolute path of the draft or page
 * @param {string | null | undefined} title
 */
function checkFolder(file, title) {
  const stem = path.basename(file).replace(/\.[^.]*$/, "");
  return (title && slugify(title, "")) || slugify(stem, "") || `clarify-${crypto.createHash("sha256").update(file).digest("hex").slice(0, 8)}`;
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
    const head = report.failure
      ? `⚠ the browser did not start (${report.failure}; set CHROME_PATH to Chrome or Edge): `
      : "⚠ no Chrome or Edge found (set CHROME_PATH): ";
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
