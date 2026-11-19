// clarify/src/free/section.js
// The `free` fence: a hand-made HTML/SVG section inside an ordinary panel. This module reads a section
// (its own body, or the file named by `file=`) and splits the fragment into markup, styles and scripts.
// render.js wraps the markup, moves the styles to the head and each script to the end of the body.

import fs from "node:fs";
import path from "node:path";

/** @typedef {import("../types").FreeSection} FreeSection */

/** A section name: lowercase letters, digits and dashes. It scopes the CSS (`.fx-NAME`) and finds `root`. */
export const FREE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The fence's info after `free`: the first word is the name, then `file=path` or `file="path with spaces"`.
 * @param {string} info
 * @returns {{ name: string, file: string | null }}
 */
export function parseFreeInfo(info) {
  const text = String(info ?? "").trim();
  const name = text.split(/\s+/)[0];
  const m = text.slice(name.length).match(/(?:^|\s)file=(?:"([^"]*)"|(\S+))/);
  return { name, file: m ? (m[1] ?? m[2]) : null };
}

/**
 * Reads one `free` fence. A `file=` path is relative to the draft's folder, or to the working directory
 * when the draft has no path (stdin). A file that cannot be read is `missing`, with an empty fragment.
 * @param {{ info: string, body: string, line: number }} block
 * @param {string} source absolute path of the draft, or "" for stdin
 * @returns {FreeSection}
 */
export function loadFreeSection(block, source) {
  const { name, file } = parseFreeInfo(block.info);
  if (file === null) return { name, file: null, fragment: block.body, missing: false, line: block.line };
  const abs = path.resolve(source ? path.dirname(source) : process.cwd(), file);
  let fragment = null;
  try { fragment = fs.readFileSync(abs, "utf8"); } catch { /* render warns and draws the dashed box */ }
  return { name, file: abs, fragment: fragment ?? "", missing: fragment === null, line: block.line };
}

const STYLE_OR_SCRIPT = /<(style|script)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi;

/**
 * Takes the body of every `<style>` and `<script>` element out of a fragment, in page order.
 * One pass for both tags, so a `<style>` written inside a script string stays in the script.
 * @param {string} fragment
 * @returns {{ html: string, styles: string[], scripts: string[] }}
 */
export function splitFragment(fragment) {
  /** @type {string[]} */
  const styles = [];
  /** @type {string[]} */
  const scripts = [];
  const html = String(fragment).replace(STYLE_OR_SCRIPT, (_all, tag, body) => {
    (tag.toLowerCase() === "style" ? styles : scripts).push(body);
    return "";
  });
  return { html, styles, scripts };
}

/**
 * One section script, run once with `root` set to the section element. An error is caught and logged
 * as `fx NAME: …`, so one broken section never stops the others.
 * @param {string} name a name that matches FREE_NAME
 * @param {string} js
 * @returns {string}
 */
export function wrapScript(name, js) {
  return `(() => { const root = document.querySelector('[data-fx="${name}"]'); if (!root) return; try {
${js}
} catch (e) { console.error("fx ${name}: " + (e && e.stack || e)); } })();`;
}
