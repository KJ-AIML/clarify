import test from "node:test";
import assert from "node:assert/strict";
import { parseDraft } from "../src/parser.js";
import { compile } from "../src/render.js";
import { lintFree, idsOf } from "../src/free/lint.js";

/** Lints a section called `name` with one `<style>` body and some markup; `bytes` defaults to their length. */
const lint = (name, css = "", html = "", bytes = Buffer.byteLength(css + html)) =>
  lintFree({ name, html, styles: css ? [css] : [], bytes });
/** A free fence as it appears in a draft. */
const fence = (info, ...body) => [`\`\`\`free ${info}`, ...body, "```"].join("\n");

test("a clean section has no warnings", () => {
  const css = `
    .fx-a { fill: var(--trace-0); }
    .fx-a .x, .fx-a-y { background: color-mix(in srgb, var(--ok) 20%, transparent); }
    @media (width < 600px) { .fx-a .z {} }
    @keyframes fx-a-spin { from {} to {} }`;
  const html = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fx-a-grad"></linearGradient></defs>`
    + `<rect fill="url(#fx-a-grad)"/><use href="#fx-a-grad"/></svg>`;
  assert.deepEqual(lint("a", css, html), []);
});

test("an unscoped selector warns once", () => {
  assert.deepEqual(lint("a", ".km-row{} body{} .fx-ab{} :root{}"), ["selectors must start with .fx-a: .km-row | body | .fx-ab (+1 more)"]);
});

test("a selector counts as scoped when .fx-NAME ends the word", () => {
  assert.deepEqual(lint("a", ".fx-a{} .fx-a-x{} .fx-a.on{} .fx-a:hover{} .fx-a>p{}"), []);
  assert.deepEqual(lint("a", ".fx-a_x{} .fx-a9{}"), ["selectors must start with .fx-a: .fx-a_x | .fx-a9"]);
});

test("every selector of a list counts, and rules inside @media, @supports and @layer are checked", () => {
  const css = ".fx-a .ok, .loose{} @media (width < 600px) { .in-media{} } @supports (display: grid) { .fx-a .ok2{} .in-supports{} } @layer base { p{} }";
  assert.deepEqual(lint("a", css), ["selectors must start with .fx-a: .loose | .in-media | .in-supports (+1 more)"]);
});

test("selectors inside @keyframes are not checked, a comma inside a pseudo-class does not split", () => {
  assert.deepEqual(lint("a", "@keyframes fx-a-go { from {} 50% {} to {} } .fx-a :is(.x, .y){}"), []);
});

test("a rule nested in a scoped rule is scoped by its parent; a ; or } inside a string or url() ends nothing", () => {
  const css = '.fx-a { background: url(data:image/svg+xml;utf8,<svg/>); content: "};{"; .x { color: var(--ink); } &:hover { fill: #abc; } }';
  assert.deepEqual(lint("a", css), ['raw colour "#abc"; use a token such as var(--trace-0)']);
});

test("keyframes and ids need the prefix", () => {
  assert.deepEqual(lint("a", "@keyframes spin { from {} to {} }", '<g id="grad"></g>'), [
    '@keyframes "spin" must start with fx-a-',
    'id "grad" must start with fx-a-'
  ]);
  assert.deepEqual(lint("a", "@keyframes fx-ab-spin { from {} to {} }", '<g id="fx-ab-x"></g>'), [
    '@keyframes "fx-ab-spin" must start with fx-a-',
    'id "fx-ab-x" must start with fx-a-'
  ]);
});

test("raw colours warn", () => {
  const css = ".fx-a { fill: #e8742a; stroke: hsl(0 0% 0%); }";
  const html = '<path stroke="#fff"/><g style="color: rgb(1, 2, 3)"></g>';
  assert.deepEqual(lint("a", css, html), [
    'raw colour "#e8742a"; use a token such as var(--trace-0)',
    'raw colour "hsl(0 0% 0%)"; use a token such as var(--trace-0)',
    'raw colour "#fff"; use a token such as var(--trace-0)',
    'raw colour "rgb(1, 2, 3)"; use a token such as var(--trace-0)'
  ]);
});

test("a raw colour warns once however often it is written, in every colour attribute", () => {
  const html = '<g fill="#abc" stroke="#abc"><stop stop-color="oklch(0.7 0.1 40)"/><flood flood-color="lab(50 0 0)"/><text color="hwb(0 0% 0%)"/></g>';
  const css = ".fx-a { background: linear-gradient(#abc, rgba(0,0,0,.5)); }";
  assert.deepEqual(lint("a", css, html), [
    'raw colour "#abc"; use a token such as var(--trace-0)',
    'raw colour "rgba(0,0,0,.5)"; use a token such as var(--trace-0)',
    'raw colour "oklch(0.7 0.1 40)"; use a token such as var(--trace-0)',
    'raw colour "lab(50 0 0)"; use a token such as var(--trace-0)',
    'raw colour "hwb(0 0% 0%)"; use a token such as var(--trace-0)'
  ]);
});

test("a hex-looking word that is not a colour value is not a raw colour", () => {
  const css = '.fx-a::after { content: "#123"; background: url(#abc-grad); } .fx-a #abc { color: var(--ink); }';
  const html = '<p data-fill="#fff" class="fill-#fff">#fff</p><g stroke="none" fill="currentColor"/>';
  assert.deepEqual(lint("a", css, html).filter((m) => m.startsWith("raw colour")), []);
});

test("external URLs warn", () => {
  const css = '@import "https://x.test/a.css"; .fx-a { src: url(//cdn.test/f.woff2); background: url( "http://x.test/b.png" ); }';
  const html = '<img src="https://x.test/a.png"><image xlink:href="http://x.test/i.png"/>'
    + '<video poster="https://x.test/p.jpg"></video><form action="https://x.test/go"></form>';
  const external = (u) => `external URL "${u}"; a page loads nothing from the network`;
  assert.deepEqual(lint("a", css, html), [
    external("https://x.test/a.css"), external("//cdn.test/f.woff2"), external("http://x.test/b.png"),
    external("https://x.test/a.png"), external("http://x.test/i.png"),
    external("https://x.test/p.jpg"), external("https://x.test/go")
  ]);
});

test("a plain link is not a load", () => {
  const links = '<a href="https://example.test/page">source</a><area href="//example.test/area"/><svg><a xlink:href="https://example.test/x"><text>x</text></a><a href="http://example.test/y"><text>y</text></a></svg>';
  assert.deepEqual(lint("a", "", links), []);
  assert.deepEqual(lint("a", "", `${links}<svg><use href="https://example.test/a.svg#i"/><image xlink:href="https://example.test/i.png"/></svg><link href="https://example.test/s.css">`), [
    'external URL "https://example.test/a.svg#i"; a page loads nothing from the network',
    'external URL "https://example.test/i.png"; a page loads nothing from the network',
    'external URL "https://example.test/s.css"; a page loads nothing from the network'
  ]);
});

test("local URLs and xmlns are not external", () => {
  const css = ".fx-a { background: url(data:image/svg+xml;base64,AAAA); mask: url(#fx-a-m); }";
  const html = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#fx-a-m"/></svg>'
    + '<a href="/docs">d</a><img src="data:image/png;base64,AAAA">';
  assert.deepEqual(lint("a", css, html), []);
});

test("comments are ignored", () => {
  const css = "/* .loose { fill: #fff } @import 'https://x.test/a.css'; */ .fx-a { fill: var(--ink) }";
  const html = '<!-- <g id="loose" fill="#fff"></g><img src="https://x.test/a.png"> --><g id="fx-a-ok"></g>';
  assert.deepEqual(lint("a", css, html), []);
  assert.deepEqual(idsOf(html), ["fx-a-ok"]);
});

test("a section over 40 KB warns", () => {
  assert.deepEqual(lint("a", "", "", 41 * 1024), ["41.0 KB is over the 40 KB budget for a section"]);
  assert.deepEqual(lint("a", "", "", 40 * 1024), []);
});

test("idsOf lists every id in page order, repeats included", () => {
  assert.deepEqual(idsOf('<svg id="fx-a-s"><g id="fx-a-k"/><g data-id="x" id=\'fx-a-k\'/><p ID=plain>id="no"</p></svg>'), ["fx-a-s", "fx-a-k", "fx-a-k", "plain"]);
  assert.deepEqual(idsOf("<p>no ids</p>"), []);
});

test("render prefixes lint warnings and finds duplicate ids", () => {
  const draft = ["## A Keys", fence("a", '<style>p{}</style><g id="fx-a-k"></g><g id="fx-a-k"></g>')].join("\n");
  assert.deepEqual(compile(parseDraft(draft)).warnings, [
    'panel A: line 2: free "a": selectors must start with .fx-a: p',
    'panel A: line 2: free "a": duplicate id "fx-a-k" on the page'
  ]);
});

test("a duplicate id across two sections warns once, on the second", () => {
  const draft = ["## A One", fence("a", '<g id="fx-a-k"></g>'), "", "## B Two", fence("b", '<g id="fx-a-k"></g><g id="fx-a-k"></g>')].join("\n");
  assert.deepEqual(compile(parseDraft(draft)).warnings, [
    'panel B: line 7: free "b": id "fx-a-k" must start with fx-b-',
    'panel B: line 7: free "b": duplicate id "fx-a-k" on the page'
  ]);
});

test("a section with a missing file or a bad name is not linted", () => {
  const draft = ["## A One", fence("Bad", '<style>p{}</style><g id="x"></g>'), "", fence("gone file=nope.html")].join("\n");
  const warnings = compile(parseDraft(draft), { source: "" }).warnings;
  assert.equal(warnings.length, 2);
  assert.ok(warnings.every((w) => !/selectors|id "x"/.test(w)), warnings.join("\n"));
});

test("render warns when a section is over the budget", () => {
  const draft = ["## A Big", fence("big", `<p>${"x".repeat(41 * 1024)}</p>`)].join("\n");
  assert.deepEqual(compile(parseDraft(draft)).warnings, ['panel A: line 2: free "big": 41.0 KB is over the 40 KB budget for a section']);
});

// ── what the final review found ──────────────────────────────────────────────

const raw = (c) => `raw colour "${c}"; use a token such as var(--trace-0)`;

test("a comment left open warns: the rest of the page would disappear into it", () => {
  assert.deepEqual(lint("a", "", '<p class="fx-how">a</p>\n<!-- a note the author forgot to close\n<p class="fx-take">b</p>'), [
    '"<!--" is never closed, so the rest of the page disappears into the comment; close it with "-->"'
  ]);
  assert.deepEqual(lint("a", "", "<p>a</p><!-- closed --><p>b</p>"), []);
});

test("a <script> or <style> left open warns", () => {
  // splitFragment takes out every closed <style> and <script>, so one that is left is never closed.
  assert.deepEqual(lint("a", "", "<p>a</p><script>root.x = 1;"), ['"<script>" is never closed, so the rest of the page disappears into it; close it with "</script>"']);
  assert.deepEqual(lint("a", "", '<STYLE media="x">.fx-a { }'), ['"<style>" is never closed, so the rest of the page disappears into it; close it with "</style>"']);
});

const TEXT_TAGS = ["textarea", "title", "template", "xmp", "iframe", "noscript"];
const leftOpenMsg = (t) => `"<${t}>" is left open, so the page shows everything after it as text, or hides it; close it with "</${t}>"`;

test("a tag that holds text warns only when it is left open; a closed one is correct markup", () => {
  const closed = "<textarea>t</textarea><title>t</title><template><p>t</p></template><xmp>x</xmp><iframe></iframe><noscript>n</noscript><textarea>again</textarea>";
  assert.deepEqual(lint("a", "", closed), []);
  assert.deepEqual(lint("a", "", "<TEXTAREA rows=2>t</TextArea >"), []);
  for (const t of TEXT_TAGS) assert.deepEqual(lint("a", "", `<p>a</p><${t}>and the rest`), [leftOpenMsg(t)], t);
});

test("a text tag is left open when no end tag of its own name comes after it", () => {
  // The end tag must come after the start tag, and be the tag's own.
  assert.deepEqual(lint("a", "", "<textarea>a</textarea><textarea>b"), [leftOpenMsg("textarea")]);
  assert.deepEqual(lint("a", "", "</textarea><textarea>b"), [leftOpenMsg("textarea")]);
  assert.deepEqual(lint("a", "", "<textarea>b</title>"), [leftOpenMsg("textarea")]);
  assert.deepEqual(lint("a", "", "<textarea>b</textareas>"), [leftOpenMsg("textarea")]);
  // One warning for each name, in the order the tags open.
  assert.deepEqual(lint("a", "", "<xmp>x<title>t<xmp>y<textarea>b"), [leftOpenMsg("xmp"), leftOpenMsg("title"), leftOpenMsg("textarea")]);
});

test("a <title> inside an svg is the drawing's own, and a tag in a comment is no tag", () => {
  const html = '<svg viewBox="0 0 10 10" role="img"><title>a tooltip</title><foreignObject><p>x</p></foreignObject><g><title>t</title></g></svg>'
    + "<!-- <textarea> <script> --><svg/><p>after</p>";
  assert.deepEqual(lint("a", "", html), []);
  // In an svg these are SVG elements, closed or not; in its foreignObject they are HTML again.
  assert.deepEqual(lint("a", "", "<svg><title>t</svg>"), []);
  assert.deepEqual(lint("a", "", "<svg><foreignObject><textarea>x</textarea></foreignObject></svg>"), []);
  assert.deepEqual(lint("a", "", "<svg><foreignObject><textarea>x</foreignObject></svg>"), [leftOpenMsg("textarea")]);
});

test("a { never closed warns, and each <style> of a section is read on its own", () => {
  const styles = [".fx-a p { font-style: italic;", "p { color: var(--ink) } .fx-a { fill: #abc }"];
  assert.deepEqual(lintFree({ name: "a", html: "", styles, bytes: 100 }), [
    'a "{" in a <style> is never closed: the rules after it in that <style> are lost; add the "}"',
    "selectors must start with .fx-a: p",
    raw("#abc")
  ]);
  assert.deepEqual(lintFree({ name: "a", html: "", styles: [".fx-a { a: 1 }", ".fx-a { b: 2 }"], bytes: 10 }), []);
});

test("named colours and upper-case colour functions are raw colours", () => {
  const css = ".fx-a { color: navy; background: Gainsboro; border: 1px solid black; box-shadow: 0 0 2px RED; fill: RGB(1,2,3); stroke: HSL(0 0% 0%); }"
    + " .fx-a p { outline-color: white; text-decoration: underline wavy orange; filter: drop-shadow(0 1px 1px Black); }";
  const html = '<rect fill="white" stroke="Black"/><stop stop-color="navy"/><feFlood flood-color="gold"/><text color="Tomato"/><g style="fill: teal; stroke: var(--ink)"/>';
  assert.deepEqual(lint("a", css, html), [
    raw("navy"), raw("Gainsboro"), raw("black"), raw("RED"), raw("RGB(1,2,3)"), raw("HSL(0 0% 0%)"),
    raw("white"), raw("orange"), raw("gold"), raw("Tomato"), raw("teal")
  ]);
});

test("none, currentColor, transparent, inherit and words that are not colours are fine", () => {
  const css = '.fx-a { border: 1px solid transparent; outline: none; background: var(--red, transparent); color: inherit;'
    + ' fill: currentColor; font: 600 12px var(--mono); transition: fill 0.2s, color 0.2s; animation: fx-a-red 1s; content: "black"; }'
    + " .fx-a .white { color: var(--ink); background: url(#fx-a-tan) no-repeat center; } @keyframes fx-a-red { from { opacity: 0 } }";
  const html = '<rect fill="none" stroke="currentColor"/><stop stop-color="transparent"/><g fill="inherit" color="currentcolor"/>'
    + '<p class="red white" data-fill="white" title="green">red</p><rect fill="url(#fx-a-tan)"/>';
  assert.deepEqual(lint("a", css, html), []);
});

test("a section named after a kit class, or hatch, warns", () => {
  const kit = (n) => `the name "${n}" is a kit class (.fx-${n}): the section would take its style; choose another name`;
  assert.deepEqual(lint("bar"), [kit("bar")]);
  assert.deepEqual(lint("take"), [kit("take")]);
  assert.deepEqual(lint("hatch"), ['the name "hatch" belongs to the kit: its hatch patterns are fx-hatch-ROLE; choose another name']);
  assert.deepEqual(lint("bars"), []);
  assert.deepEqual(lint("key-code"), []);
});

test("the kit's names come from fx.css itself", async () => {
  const fs = await import("node:fs");
  const css = fs.readFileSync(new URL("../src/runtime/fx.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const names = [...new Set([...css.matchAll(/\.fx-([a-z0-9-]+)/g)].map((m) => m[1]))];
  assert.ok(names.length > 40 && names.includes("num") && names.includes("t-h") && names.includes("phone"), names.join(" "));
  assert.deepEqual(names.filter((n) => !lint(n).some((w) => w.startsWith(`the name "${n}" is a kit class`))), []);
});

test("a meta refresh warns: it takes the reader off the page", () => {
  assert.deepEqual(lint("a", "", '<meta http-equiv="Refresh" content="0; url=https://x.test/">'), ['<meta http-equiv="refresh"> reloads the page or leaves it; take it out']);
  assert.deepEqual(lint("a", "", '<meta name="refresh" content="1">'), []);
});
