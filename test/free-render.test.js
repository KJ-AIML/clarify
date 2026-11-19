import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseDraft } from "../src/parser.js";
import { compile } from "../src/render.js";
import { parseFreeInfo } from "../src/free/section.js";
import { findChrome, launchBrowser } from "../src/check/cdp.js";
import { pathToFileURL } from "node:url";

// The browser test needs Chrome or Edge; without one it is skipped, not failed.
const inBrowser = { skip: !findChrome() && "no Chrome or Edge", timeout: 60000 };

const examples = fs.readdirSync(new URL("../examples/", import.meta.url)).filter((f) => f.endsWith(".md"));
const read = (f) => fs.readFileSync(new URL(`../examples/${f}`, import.meta.url), "utf8");
const count = (text, re) => (text.match(re) || []).length;
/** A free fence as it appears in a draft. */
const fence = (info, ...body) => [`\`\`\`free ${info}`.trimEnd(), ...body, "```"].join("\n");
/** The bare scripts at the end of the page (the embedded Markdown before them quotes every fence as text). */
const endScripts = (html) => html.slice(html.indexOf('id="c-markdown"')).match(/<script>[\s\S]*?<\/script>/g) || [];

/** Runs `fn` with a fresh temp folder holding `sections/part.html`, and removes the folder after. */
function withPart(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-free-"));
  try {
    fs.mkdirSync(path.join(tmp, "sections"));
    fs.writeFileSync(path.join(tmp, "sections", "part.html"), "<p>from file</p>");
    fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test("an inline free section is wrapped and its style and script are moved", () => {
  const draft = ["## A Keys", fence("key-code", '<p class="fx-how">How</p><style>.fx-key-code p{font-weight:700}</style><script>root.dataset.ran = "yes"</script>')].join("\n");
  const { html, warnings } = compile(parseDraft(draft));
  assert.deepEqual(warnings, []);
  assert.match(html, /<div class="fx fx-key-code" data-fx="key-code">\s*<p class="fx-how">How<\/p>\s*<\/div>/);
  const kit = html.indexOf('<style id="c-fx-css">');
  const own = html.indexOf('<style data-fx-css="key-code">');
  const head = html.indexOf("</head>");
  assert.ok(kit > 0 && kit < own && own < head, "the kit, then the section styles, in the head");
  assert.match(html.slice(kit, own), /\.fx-how\{/);
  assert.match(html.slice(own, head), /\.fx-key-code p\{font-weight:700\}/);
  const script = endScripts(html).find((s) => s.includes('[data-fx="key-code"]'));
  assert.ok(script, "a script after the embedded Markdown runs the section");
  assert.ok(script.includes('root.dataset.ran = "yes"'));
  assert.ok(script.includes('console.error("fx key-code: "'));
  assert.equal(script, `<script>(() => { const root = document.querySelector('[data-fx="key-code"]'); if (!root) return; try {
root.dataset.ran = "yes"
} catch (e) { console.error("fx key-code: " + (e && e.stack || e)); } })();</script>`);
});

test("each <style> of a section is its own style element, after the kit, in page order", () => {
  // A { left open then spoils only the rest of its own <style>: the browser stops at the end of each sheet.
  const draft = ["## A Two", fence("a", "<p>a</p><style>.fx-a p { font-style: italic;</style><style>.fx-a b { color: var(--ink) }</style>"), "",
    "## B Three", fence("b", "<p>b</p><style>.fx-b p { font-weight: 800 }</style>"), "", fence("c", "<p>no style</p><style> </style>")].join("\n");
  const { html } = compile(parseDraft(draft));
  const head = html.slice(html.indexOf('<style id="c-fx-css">'), html.indexOf("</head>"));
  assert.deepEqual(head.match(/<style[^>]*>/g), ['<style id="c-fx-css">', '<style data-fx-css="a">', '<style data-fx-css="a">', '<style data-fx-css="b">']);
  assert.match(head, /<\/style>\n<style data-fx-css="a">\.fx-a p \{ font-style: italic;<\/style>\n<style data-fx-css="a">\.fx-a b \{ color: var\(--ink\) \}<\/style>\n<style data-fx-css="b">\.fx-b p \{ font-weight: 800 \}<\/style>\n$/);
  assert.doesNotMatch(compile(parseDraft(read("ecommerce-architecture.md"))).html, /data-fx-css/);
});

test("one section's unclosed { leaves the next section's style alone", inBrowser, async () => {
  const draft = ["## A One", fence("a", "<p>a</p>", "<style>.fx-a p { font-style: italic;</style>"), "",
    "## B Two", fence("b", "<p>b</p>", "<style>.fx-b p { font-weight: 800; letter-spacing: 3px; }</style>")].join("\n");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-free-"));
  const file = path.join(tmp, "blast.html");
  fs.writeFileSync(file, compile(parseDraft(draft)).html);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ width: 1280, height: 900 });
    await page.goto(pathToFileURL(file).href);
    const style = (fx) => page.eval(`(() => { const cs = getComputedStyle(document.querySelector('[data-fx="${fx}"] p')); return [cs.fontStyle, cs.fontWeight, cs.letterSpacing].join(" / "); })()`);
    assert.equal(await style("b"), "normal / 800 / 3px");
    assert.equal(await style("a"), "italic / 400 / normal", "the open rule still applies to its own section");
    await page.close();
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("each section script is its own script element", () => {
  const draft = ["## A Two", fence("a", "<p>a</p><script>root.dataset.ran = 'a'</script>"), "", fence("b", "<p>b</p><script>root.dataset.ran = 'b'</script>")].join("\n");
  const scripts = endScripts(compile(parseDraft(draft)).html).filter((s) => s.includes("data-fx="));
  assert.equal(scripts.length, 2);
  assert.match(scripts[0], /\[data-fx="a"\][\s\S]*ran = 'a'/);
  assert.match(scripts[1], /\[data-fx="b"\][\s\S]*ran = 'b'/);
});

test("pages without a free section carry no kit", () => {
  const plain = examples.filter((f) => !/^\s*```free\b/m.test(read(f)));
  assert.ok(plain.length > 0);
  for (const f of plain) {
    const { html } = compile(parseDraft(read(f)));
    assert.doesNotMatch(html, /c-fx-css|c-fx-sections|data-fx=/, f);
  }
});

test("file= reads the fragment relative to the draft", () => {
  withPart((tmp) => {
    const draft = ["## A Part", fence("part file=sections/part.html")].join("\n");
    const { html, files, warnings } = compile(parseDraft(draft), { source: path.join(tmp, "draft.md") });
    assert.match(html, /<div class="fx fx-part" data-fx="part">\s*<p>from file<\/p>/);
    assert.deepEqual(files, [path.join(tmp, "sections", "part.html")]);
    assert.deepEqual(warnings, []);
  });
});

test("file= from stdin resolves against the working directory", () => {
  withPart((tmp) => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      const { html, warnings } = compile(parseDraft(["## A Part", fence("part file=sections/part.html")].join("\n")));
      assert.match(html, /<p>from file<\/p>/);
      assert.deepEqual(warnings, []);
    } finally {
      process.chdir(cwd);
    }
  });
});

test("file= takes a quoted path with spaces", () => {
  assert.deepEqual(parseFreeInfo('part file="sections/my part.html"'), { name: "part", file: "sections/my part.html" });
  assert.deepEqual(parseFreeInfo("part file=sections/part.html"), { name: "part", file: "sections/part.html" });
  assert.deepEqual(parseFreeInfo("part"), { name: "part", file: null });
});

test("a missing file warns and shows the dashed box", () => {
  withPart((tmp) => {
    const draft = ["## A One", fence("nope file=sections/nope.html")].join("\n");
    const { html, files, warnings } = compile(parseDraft(draft), { source: path.join(tmp, "draft.md") });
    assert.deepEqual(warnings, ["panel A: line 2: free section file not found: sections/nope.html"]);
    assert.match(html, /<div class="fx fx-missing" data-fx="nope">Missing section &quot;nope&quot;: sections\/nope\.html was not found\.<\/div>/);
    assert.match(html, /<style id="c-fx-css">/, "the kit styles the box");
    assert.deepEqual(files, [path.join(tmp, "sections", "nope.html")]);
  });
});

test("a name used twice warns", () => {
  const draft = ["## A One", fence("same", "<p>one</p>"), "", "## B Two", fence("same", "<p>two</p>")].join("\n");
  const { warnings } = compile(parseDraft(draft));
  assert.deepEqual(warnings, ['panel B: line 7: free section "same" is used twice on this page; give each one its own name']);
});

test("a bad name warns", () => {
  const draft = ["## A Bad", fence("Key", "<p>key</p>"), "", fence("", "<p>bare</p>")].join("\n");
  const { html, warnings } = compile(parseDraft(draft));
  assert.deepEqual(warnings, [
    'panel A: line 2: free section needs a name of lowercase letters, digits and dashes ("Key")',
    'panel A: line 6: free section needs a name of lowercase letters, digits and dashes ("")'
  ]);
  assert.equal(count(html, /<div class="fx fx-missing">This free section needs a name\.<\/div>/g), 2);
  assert.doesNotMatch(html, /<p>key<\/p>|<p>bare<\/p>/);
});

const POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; form-action 'none'; base-uri 'none'";
const policyOf = (html) => (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/) || [])[1];
const withFree = ["## A Keys", fence("key-code", "<p>a</p>")].join("\n");

test("a page with a free section blocks the network", () => {
  const { html } = compile(parseDraft(withFree));
  assert.equal(policyOf(html), POLICY);
  const meta = html.indexOf('<meta http-equiv="Content-Security-Policy"');
  assert.ok(html.indexOf('<meta charset="utf-8">') < meta, "right after the charset");
  assert.ok(meta < html.indexOf("<script"), "before the first script");
});

test("under clarify serve the policy also allows connect-src 'self'", () => {
  assert.equal(policyOf(compile(parseDraft(withFree), { live: true }).html), `${POLICY}; connect-src 'self'`);
  assert.doesNotMatch(policyOf(compile(parseDraft(withFree)).html), /connect-src/);
});

test("pages without a free section have no policy", () => {
  const plain = examples.filter((f) => !/data-fx=/.test(compile(parseDraft(read(f))).html));
  assert.ok(plain.length > 0);
  for (const f of plain) {
    assert.doesNotMatch(compile(parseDraft(read(f)), { live: true }).html, /Content-Security-Policy/, f);
  }
});
