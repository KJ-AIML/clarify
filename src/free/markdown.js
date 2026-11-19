// clarify/src/free/markdown.js
// A `free` fence → GitHub Markdown, for `clarify md` and "Copy as Markdown". GitHub cannot show a drawing, so
// the export keeps only what a reader needs: the "how to read" line, the takeaway and a note that the drawing
// is on the HTML page. The fragment itself (markup, styles, scripts) never leaves the page.

import { FREE_NAME, loadFreeSection, splitFragment } from "./section.js";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/**
 * @param {{ info: string, body: string, line: number }} block the `free` fence
 * @param {string} source absolute path of the draft, or "" for stdin (`file=` then resolves against the working directory)
 * @returns {string}
 */
export function freeToMarkdown(block, source) {
  const section = loadFreeSection(block, source);
  const { html } = splitFragment(section.fragment);
  const how = partText(html, "fx-how");
  const take = partText(html, "fx-take");
  const drawing = FREE_NAME.test(section.name) ? `The drawing (\`${section.name}\`)` : "The drawing";
  return [
    how,
    // The kit draws the word "Takeaway" above `.fx-take` with CSS, so the export writes it itself.
    take && `> **Takeaway:** ${take}`,
    `_${drawing} is on the HTML page._`
  ].filter(Boolean).join("\n\n");
}

/**
 * The first element whose class list holds `cls`, as one line of Markdown text. "" when there is none.
 * @param {string} html a fragment with its styles and scripts already taken out
 * @param {string} cls
 */
function partText(html, cls) {
  const open = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
  for (let m; (m = open.exec(html));) {
    const attr = m[2].match(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!attr || !(attr[1] ?? attr[2]).split(/\s+/).includes(cls)) continue;
    // The matching close tag: elements of the same kind inside the part are counted off.
    const rest = html.slice(open.lastIndex);
    const tags = new RegExp(`<(/?)${m[1]}\\b[^>]*>`, "gi");
    let depth = 1;
    let end = rest.length;
    for (let t; (t = tags.exec(rest));) {
      depth += t[1] ? -1 : 1;
      if (!depth) { end = t.index; break; }
    }
    return toText(rest.slice(0, end));
  }
  return "";
}

/** Inner HTML → Markdown text: bold stays bold, other tags go, entities are decoded, whitespace collapses. */
function toText(inner) {
  return inner
    .replace(/<\/?(?:b|strong)\b[^>]*>/gi, "**")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_all, name) => ENTITIES[name])
    .replace(/\s+/g, " ")
    .trim();
}
