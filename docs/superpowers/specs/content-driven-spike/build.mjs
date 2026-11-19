// Throwaway spike: render draft.md with the clarify CLI, then splice the hand-made "free sections"
// (sections/<name>.html + .css + .js) into the rendered page.
//
//   node .tmp/spike-free/build.mjs [--only a,b] [--out file]
//
// Every path is resolved from this file, not from the cwd.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const DRAFT = path.join(HERE, "draft.md");
const SECTIONS = path.join(HERE, "sections");
const BASE_CSS = path.join(HERE, "fx-base.css");
const MARKER = /<p>@@FREE:([a-z0-9-]+)@@<\/p>/g;

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
const kb = (n) => (n / 1024).toFixed(1);

/**
 * @param {{ only?: string[] | null, out?: string }} [opts]
 * @returns {{ file: string, bytes: number, missing: string[] }}
 */
export function build({ only = null, out = path.join(HERE, "page.html") } = {}) {
  const outFile = path.resolve(out);
  const tmp = path.join(HERE, `.render-${process.pid}-${Math.random().toString(36).slice(2, 8)}.html`);
  let html;
  try {
    // Warnings from the clarify compiler go straight to our stderr.
    execFileSync(process.execPath, [path.join(REPO, "bin", "clarify.mjs"), "render", DRAFT, "--out", tmp, "--no-open", "--quiet"], {
      stdio: ["ignore", "ignore", "inherit"]
    });
    html = fs.readFileSync(tmp, "utf8");
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* not written */ }
  }

  const wanted = only && only.length ? new Set(only) : null;
  const used = [];     // names that got a real section, in page order
  const missing = [];  // names with a marker and no (wanted) section
  const parts = new Map();

  html = html.replace(MARKER, (_all, name) => {
    const htmlFile = path.join(SECTIONS, `${name}.html`);
    if (fs.existsSync(htmlFile) && (!wanted || wanted.has(name))) {
      const fragment = fs.readFileSync(htmlFile, "utf8");
      const css = read(path.join(SECTIONS, `${name}.css`));
      const js = read(path.join(SECTIONS, `${name}.js`));
      used.push(name);
      parts.set(name, { html: Buffer.byteLength(fragment), css: Buffer.byteLength(css), js: Buffer.byteLength(js), cssText: css, jsText: js });
      return `<div class="fx fx-${name}" data-fx="${name}">${fragment}</div>`;
    }
    missing.push(name);
    return `<div class="fx fx-missing" data-fx="${name}">Section "${name}" is not written yet.</div>`;
  });

  // CSS: the kit, then each used section, in one <style> just before </head>.
  const css = [read(BASE_CSS), ...used.map((n) => `/* sections/${n}.css */\n${parts.get(n).cssText}`)].join("\n");
  const styleTag = `<style id="fx-css">\n${css}\n</style>\n`;
  const head = html.indexOf("</head>");
  if (head < 0) throw new Error("build: no </head> in the rendered page");
  html = html.slice(0, head) + styleTag + html.slice(head);

  // JS: one script, one wrapper per section. A section that throws logs to console.error and does not
  // stop the others (the shot check reads console errors).
  const withJs = used.filter((n) => parts.get(n).jsText.trim());
  if (withJs.length) {
    const js = withJs.map((n) => `(() => { const root = document.querySelector('[data-fx="${n}"]'); if (!root) return; try {\n/* sections/${n}.js */\n${parts.get(n).jsText}\n} catch (e) { console.error("fx ${n}: " + (e && e.stack || e)); } })();`).join("\n");
    const body = html.lastIndexOf("</body>");
    if (body < 0) throw new Error("build: no </body> in the rendered page");
    html = html.slice(0, body) + `<script id="fx-js">\n${js}\n</script>\n` + html.slice(body);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  const bytes = Buffer.byteLength(html);
  return { file: outFile, bytes, missing, used, parts };
}

function report(result) {
  console.log(`✓ ${result.file} (${kb(result.bytes)} KB)`);
  for (const name of result.used) {
    const p = result.parts.get(name);
    console.log(`  ${name}: +${kb(p.html + p.css + p.js)} KB (html ${kb(p.html)}, css ${kb(p.css)}, js ${kb(p.js)})`);
  }
  if (result.missing.length) console.log(`  missing (${result.missing.length}): ${result.missing.join(", ")}`);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--only") opts.only = String(argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === "--out") opts.out = argv[++i];
    else throw new Error(`build: unknown argument ${argv[i]}`);
  }
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = build(parseArgs(process.argv.slice(2)));
    report(result);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
