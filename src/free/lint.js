// clarify/src/free/lint.js
// The static lint for a free section. A hand-made fragment shares one page with other sections and with
// the page's own styles, so it has to keep to the house rules: selectors, ids and keyframes carry the
// section's prefix, colours come from tokens, nothing loads from the network, and the section stays small.
// It reads text only (no browser) and never looks at scripts. `clarify check` finds what the eye must judge.

/** The most a section may weigh, as written, in KB. */
const BUDGET_KB = 40;

const COLOUR_ATTRS = new Set(["fill", "stroke", "stop-color", "flood-color", "color", "style"]);
const URL_ATTRS = new Set(["src", "href", "xlink:href", "poster", "action"]);
// A colour written out: a hex value or a colour function. `var(--x)`, `currentColor` and `color-mix(` are fine.
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
// Strings and url() hold names and addresses, not colours: `content: "#123"`, `url(#fx-a-grad)`.
const NAMES_NOT_COLOURS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\)/gi;
const EXTERNAL = /^\s*(?:https?:|\/\/)/i;
// `@import "…"` or `url(…)`, with or without quotes.
const CSS_URL = /@import\s*["']\s*([^"']*)|url\(\s*["']?\s*([^"')\s]*)/gi;

// A start tag with its attribute text, and one attribute (`name`, `name=value`, `name="value"`) inside it.
const TAG = /<[a-zA-Z][^\s/>]*((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

/**
 * Every attribute of every tag in a fragment, in page order, with the name in lowercase.
 * @param {string} html
 * @returns {Array<[string, string]>}
 */
function attributes(html) {
  /** @type {Array<[string, string]>} */
  const found = [];
  for (const tag of stripHtmlComments(html).matchAll(TAG)) {
    for (const a of tag[1].matchAll(ATTR)) found.push([a[1].toLowerCase(), (a[2] ?? a[3] ?? a[4] ?? "").trim()]);
  }
  return found;
}

/**
 * The `id` of every element in a fragment, in page order, repeats included.
 * @param {string} html
 * @returns {string[]}
 */
export function idsOf(html) {
  return attributes(html).filter(([name, value]) => name === "id" && value).map(([, value]) => value);
}

/** The raw colours written in a CSS value (or a `style` or colour attribute): `#e8742a`, `hsl(0 0% 0%)`. */
function rawColours(value) {
  const text = value.replace(NAMES_NOT_COLOURS, " ");
  const found = [];
  for (const m of text.matchAll(RAW_COLOUR)) {
    let end = m.index + m[0].length;
    if (m[0].endsWith("(")) for (let depth = 1; depth && end < text.length; end++) depth += text[end] === "(" ? 1 : text[end] === ")" ? -1 : 0;
    found.push(text.slice(m.index, end).replace(/\s+/g, " "));
  }
  return found;
}

const cssUrls = (css) => [...css.matchAll(CSS_URL)].map((m) => (m[1] ?? m[2]).trim());

/**
 * Walks the braces of a stylesheet once. `selectors` are the selector lists of the style rules that must be
 * scoped (top-level rules and rules inside `@media`, `@container`, `@supports`, `@layer`; not the steps of
 * `@keyframes`, not a rule nested inside another rule, which its parent already scopes). `declarations` are
 * all the `prop: value` texts, keyframe steps included. Strings and parentheses are skipped whole, so a `;`
 * in `url(data:…;base64,…)` or a `}` in `content: "}"` does not end anything.
 * @param {string} css comments already removed
 * @returns {{ selectors: string[], keyframes: string[], declarations: string[] }}
 */
function walkCss(css) {
  const found = { selectors: /** @type {string[]} */ ([]), keyframes: /** @type {string[]} */ ([]), declarations: /** @type {string[]} */ ([]) };
  /** @type {Array<"keyframes" | "at" | "rule">} */
  const open = [];
  let text = "";
  let parens = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      let end = i + 1;
      while (end < css.length && css[end] !== ch) end += css[end] === "\\" ? 2 : 1;
      text += css.slice(i, end + 1);
      i = end;
    } else if (!parens && ch === "{") {
      const head = text.trim();
      text = "";
      if (head.startsWith("@")) {
        const kf = head.match(/^@(?:-\w+-)?keyframes\s+["']?([^\s"']+)/i);
        if (kf) found.keyframes.push(kf[1]);
        open.push(kf ? "keyframes" : "at");
      } else {
        if (!open.includes("keyframes") && !open.includes("rule")) found.selectors.push(head);
        open.push("rule");
      }
    } else if (!parens && (ch === "}" || ch === ";")) {
      if (open.length && text.trim()) found.declarations.push(text.trim());
      text = "";
      if (ch === "}") open.pop();
    } else {
      parens = Math.max(0, parens + (ch === "(" ? 1 : ch === ")" ? -1 : 0));
      text += ch;
    }
  }
  return found;
}

/** A selector list split at its top-level commas: `.a :is(.b, .c), .d` is two selectors. */
function splitSelectors(list) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    depth += ch === "(" || ch === "[" ? 1 : ch === ")" || ch === "]" ? -1 : 0;
    if (ch === "," && depth <= 0) { out.push(current); current = ""; } else current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/**
 * Checks one section against the house rules and returns what is wrong, in plain sentences, in this
 * order: selectors, keyframes, ids, raw colours, external URLs, size. A repeated problem is said once.
 * Duplicate ids across the page are not found here (that needs every section): see `idsOf`.
 * @param {{ name: string, html: string, styles: string[], bytes: number }} s `name` matches FREE_NAME;
 *   `html` has its `<style>` and `<script>` taken out; `bytes` is the fragment as written
 * @returns {string[]}
 */
export function lintFree({ name, html, styles, bytes }) {
  const css = styles.map(stripCssComments).join("\n");
  const attrs = attributes(html);
  const { selectors, keyframes, declarations } = walkCss(css);
  const prefix = `fx-${name}-`;
  const own = new RegExp(`^\\.fx-${name}(?![A-Za-z0-9_])`);
  const out = [];

  const loose = [...new Set(selectors.flatMap(splitSelectors).filter((sel) => !own.test(sel)))];
  if (loose.length) out.push(`selectors must start with .fx-${name}: ${loose.slice(0, 3).join(" | ")}${loose.length > 3 ? ` (+${loose.length - 3} more)` : ""}`);
  for (const k of new Set(keyframes)) if (!k.startsWith(prefix)) out.push(`@keyframes "${k}" must start with ${prefix}`);
  for (const id of new Set(idsOf(html))) if (!id.startsWith(prefix)) out.push(`id "${id}" must start with ${prefix}`);

  const written = [...declarations, ...attrs.filter(([n]) => COLOUR_ATTRS.has(n)).map(([, v]) => v)];
  for (const colour of new Set(written.flatMap(rawColours))) out.push(`raw colour "${colour}"; use a token such as var(--trace-0)`);

  const urls = [...cssUrls(css), ...attrs.flatMap(([n, v]) => URL_ATTRS.has(n) ? [v] : n === "style" ? cssUrls(v) : [])];
  for (const url of new Set(urls.filter((u) => EXTERNAL.test(u)))) out.push(`external URL "${url}"; a page loads nothing from the network`);

  if (bytes > BUDGET_KB * 1024) out.push(`${(bytes / 1024).toFixed(1)} KB is over the ${BUDGET_KB} KB budget for a section`);
  return out;
}
