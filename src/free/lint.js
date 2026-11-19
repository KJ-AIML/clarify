// clarify/src/free/lint.js
// The static lint for a free section. A hand-made fragment shares one page with other sections and with
// the page's own styles, so it has to keep to the house rules: selectors, ids and keyframes carry the
// section's prefix, colours come from tokens, nothing loads from the network, and the section stays small.
// It also finds what would spoil the rest of the page: a comment, `<script>` or `<style>` left open, a tag
// whose content the browser does not read as markup, and a `{` never closed.
// It reads text only (no browser) and never looks at scripts. `clarify check` finds what the eye must judge.

import fs from "node:fs";

/** The most a section may weigh, as written, in KB. */
const BUDGET_KB = 40;

// The kit's class names (`.fx-bar` is "bar"), read from fx.css itself. A section's wrapper is div.fx.fx-NAME,
// so a section with one of these names would take that class's style.
const KIT_CLASSES = new Set([...fs.readFileSync(new URL("../runtime/fx.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.fx-([a-z0-9-]+)/g)].map((m) => m[1]));

const COLOUR_ATTRS = new Set(["fill", "stroke", "stop-color", "flood-color", "color"]);
const URL_ATTRS = new Set(["src", "href", "xlink:href", "poster", "action"]);
// A colour written out: a hex value or a colour function, in any case. `var(--x)` and `color-mix(` are fine.
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
// The CSS colour keywords. `none`, `currentColor`, `transparent` and `inherit` are not among them, so they pass.
const NAMED_COLOURS = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown "
  + "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray "
  + "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue "
  + "darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite "
  + "forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory "
  + "khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen "
  + "lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime "
  + "limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue "
  + "mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive "
  + "olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum "
  + "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue "
  + "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke "
  + "yellow yellowgreen").split(" "));
// The CSS properties that take a colour: every `…color`, and the shorthands and effects that hold one.
const COLOUR_PROPS = /^(?:[\w-]*-)?color$|^(?:background|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|outline|fill|stroke|box-shadow|text-shadow|text-decoration|text-emphasis|column-rule|filter|-webkit-text-stroke)$/i;
// A word in a CSS value, not part of a longer name (`--red`, `color-mix`, `#abc`) and not a function's name.
const WORD = /(?<![\w#.-])[a-z]+(?![\w(-])/gi;
// Strings and url() hold names and addresses, not colours: `content: "#123"`, `url(#fx-a-grad)`.
const NAMES_NOT_COLOURS = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\)/gi;
const EXTERNAL = /^\s*(?:https?:|\/\/)/i;
// `@import "…"` or `url(…)`, with or without quotes.
const CSS_URL = /@import\s*["']\s*([^"']*)|url\(\s*["']?\s*([^"')\s]*)/gi;

// A link loads nothing until the reader clicks it, so the `href` of these elements is not an external load.
const LINK_ELEMENTS = new Set(["a", "area"]);

// Elements whose content the browser does not read as markup, or never shows: what follows one, up to its end
// tag, is text or hidden, and the rest of the page with it when the end tag is missing. Inside an <svg> (but not
// in its <foreignObject>) they are SVG elements instead: a <title> there is the drawing's tooltip.
const TEXT_TAGS = new Set(["textarea", "title", "template", "xmp", "iframe", "noscript"]);

// A start tag (its name, then its attribute text), and one attribute (`name`, `name=value`, `name="value"`) inside it.
const TAG = /<([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
// Any tag: `/` for an end tag, its name, and its attribute text (a last `/` closes it at once).
const ANY_TAG = /<(\/?)([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

/**
 * Every attribute of every tag in a fragment, in page order: its name and its element's name, both in lowercase, and its value.
 * @param {string} html
 * @returns {Array<[string, string, string]>} `[name, value, element]`
 */
function attributes(html) {
  /** @type {Array<[string, string, string]>} */
  const found = [];
  for (const tag of stripHtmlComments(html).matchAll(TAG)) {
    for (const a of tag[2].matchAll(ATTR)) found.push([a[1].toLowerCase(), (a[2] ?? a[3] ?? a[4] ?? "").trim(), tag[1].toLowerCase()]);
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

/**
 * What in a fragment would spoil the rest of the page, as warnings: a comment left open, a `<script>` or
 * `<style>` left open (every closed one was taken out before), and the elements of TEXT_TAGS outside a drawing.
 * @param {string} html the fragment without its closed `<style>` and `<script>` elements
 * @returns {string[]}
 */
function leftOpen(html) {
  const out = [];
  const text = stripHtmlComments(html);
  const open = text.indexOf("<!--");
  if (open >= 0) out.push('"<!--" is never closed, so the rest of the page disappears into the comment; close it with "-->"');
  // What follows a comment left open is inside the comment, so only what comes before it counts.
  const markup = open >= 0 ? text.slice(0, open) : text;
  for (const tag of ["script", "style"]) {
    if (new RegExp(`<${tag}(?=[\\s/>]|$)`, "i").test(markup)) out.push(`"<${tag}>" is never closed, so the rest of the page disappears into it; close it with "</${tag}>"`);
  }
  const found = new Set();
  /** "svg" or "html" for each <svg> and <foreignObject> still open, the innermost last. */
  const space = [];
  for (const [, end, written, rest] of markup.matchAll(ANY_TAG)) {
    const name = written.toLowerCase();
    if (name === "svg" || name === "math" || name === "foreignobject") {
      if (end) space.pop();
      else if (!rest.trim().endsWith("/")) space.push(name === "foreignobject" ? "html" : "svg");
    } else if (!end && TEXT_TAGS.has(name) && space.at(-1) !== "svg") found.add(name);
  }
  for (const name of found) out.push(`"<${name}>" does not belong in a section: the page shows what follows it as text, or hides it, up to "</${name}>"`);
  return out;
}

/**
 * Every match of `re` in `text`, with where it starts.
 * @returns {Array<{ at: number, text: string }>}
 */
const matchesOf = (text, re) => [...text.matchAll(re)].map((m) => ({ at: m.index, text: m[0] }));

/**
 * The raw colours written in a CSS value, in the order written: hex values and colour functions (`#e8742a`,
 * `hsl(0 0% 0%)`), and, when `named`, colour keywords (`white`).
 * @param {string} value
 * @param {boolean} named
 * @returns {string[]}
 */
function rawColours(value, named) {
  const text = value.replace(NAMES_NOT_COLOURS, (m) => " ".repeat(m.length));
  const found = matchesOf(text, RAW_COLOUR).map(({ at, text: m }) => {
    let end = at + m.length;
    if (m.endsWith("(")) for (let depth = 1; depth && end < text.length; end++) depth += text[end] === "(" ? 1 : text[end] === ")" ? -1 : 0;
    return { at, text: text.slice(at, end).replace(/\s+/g, " ") };
  });
  if (named) found.push(...matchesOf(text, WORD).filter((w) => NAMED_COLOURS.has(w.text.toLowerCase())));
  return found.sort((a, b) => a.at - b.at).map((c) => c.text);
}

/** The raw colours of one declaration, `prop: value`: keywords only in a property that takes a colour. */
function declarationColours(declaration) {
  const colon = declaration.indexOf(":");
  if (colon < 0) return rawColours(declaration, false);
  return rawColours(declaration.slice(colon + 1), COLOUR_PROPS.test(declaration.slice(0, colon).trim()));
}

const cssUrls = (css) => [...css.matchAll(CSS_URL)].map((m) => (m[1] ?? m[2]).trim());

/**
 * Walks the braces of a stylesheet once. `selectors` are the selector lists of the style rules that must be
 * scoped (top-level rules and rules inside `@media`, `@container`, `@supports`, `@layer`; not the steps of
 * `@keyframes`, not a rule nested inside another rule, which its parent already scopes). `declarations` are
 * all the `prop: value` texts, keyframe steps included. `unclosed` is true when a `{` is never closed. Strings
 * and parentheses are skipped whole, so a `;` in `url(data:…;base64,…)` or a `}` in `content: "}"` ends nothing.
 * @param {string} css comments already removed
 * @returns {{ selectors: string[], keyframes: string[], declarations: string[], unclosed: boolean }}
 */
function walkCss(css) {
  const found = { selectors: /** @type {string[]} */ ([]), keyframes: /** @type {string[]} */ ([]), declarations: /** @type {string[]} */ ([]), unclosed: false };
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
  if (open.length && text.trim()) found.declarations.push(text.trim());
  found.unclosed = open.length > 0;
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
 * Checks one section against the house rules and returns what is wrong, in plain sentences, in this order:
 * its name, what is left open, a `{` never closed, selectors, keyframes, ids, raw colours, external URLs, a
 * meta refresh, size. A repeated problem is said once. Each `<style>` is read as its own sheet, as the page
 * keeps it. Duplicate ids across the page are not found here (that needs every section): see `idsOf`.
 * @param {{ name: string, html: string, styles: string[], bytes: number }} s `name` matches FREE_NAME;
 *   `html` has its `<style>` and `<script>` taken out; `bytes` is the fragment as written
 * @returns {string[]}
 */
export function lintFree({ name, html, styles, bytes }) {
  const sheets = styles.map((css) => walkCss(stripCssComments(css)));
  const selectors = sheets.flatMap((s) => s.selectors);
  const keyframes = sheets.flatMap((s) => s.keyframes);
  const declarations = sheets.flatMap((s) => s.declarations);
  const attrs = attributes(html);
  const prefix = `fx-${name}-`;
  const own = new RegExp(`^\\.fx-${name}(?![A-Za-z0-9_])`);
  const out = [];

  if (KIT_CLASSES.has(name)) out.push(`the name "${name}" is a kit class (.fx-${name}): the section would take its style; choose another name`);
  if (name === "hatch") out.push('the name "hatch" belongs to the kit: its hatch patterns are fx-hatch-ROLE; choose another name');
  out.push(...leftOpen(html));
  if (sheets.some((s) => s.unclosed)) out.push('a "{" in a <style> is never closed: the rules after it in that <style> are lost; add the "}"');

  const loose = [...new Set(selectors.flatMap(splitSelectors).filter((sel) => !own.test(sel)))];
  if (loose.length) out.push(`selectors must start with .fx-${name}: ${loose.slice(0, 3).join(" | ")}${loose.length > 3 ? ` (+${loose.length - 3} more)` : ""}`);
  for (const k of new Set(keyframes)) if (!k.startsWith(prefix)) out.push(`@keyframes "${k}" must start with ${prefix}`);
  for (const id of new Set(idsOf(html))) if (!id.startsWith(prefix)) out.push(`id "${id}" must start with ${prefix}`);

  // In a colour attribute, a keyword is a raw colour when it is the whole value; a `style` holds declarations.
  const attrColours = ([n, v]) => n === "style" ? walkCss(`x{${v}}`).declarations.flatMap(declarationColours)
    : COLOUR_ATTRS.has(n) ? [...rawColours(v, false), ...(NAMED_COLOURS.has(v.toLowerCase()) ? [v] : [])] : [];
  const seen = new Set();
  for (const colour of [...declarations.flatMap(declarationColours), ...attrs.flatMap(attrColours)]) {
    if (seen.has(colour.toLowerCase())) continue;
    seen.add(colour.toLowerCase());
    out.push(`raw colour "${colour}"; use a token such as var(--trace-0)`);
  }

  const css = styles.map(stripCssComments).join("\n");
  const loads = ([n, v, el]) => URL_ATTRS.has(n) && !(LINK_ELEMENTS.has(el) && (n === "href" || n === "xlink:href")) ? [v] : n === "style" ? cssUrls(v) : [];
  const urls = [...cssUrls(css), ...attrs.flatMap(loads)];
  for (const url of new Set(urls.filter((u) => EXTERNAL.test(u)))) out.push(`external URL "${url}"; a page loads nothing from the network`);
  if (attrs.some(([n, v, el]) => el === "meta" && n === "http-equiv" && v.toLowerCase() === "refresh")) out.push('<meta http-equiv="refresh"> reloads the page or leaves it; take it out');

  if (bytes > BUDGET_KB * 1024) out.push(`${(bytes / 1024).toFixed(1)} KB is over the ${BUDGET_KB} KB budget for a section`);
  return out;
}
