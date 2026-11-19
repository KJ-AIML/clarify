import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseDraft } from "../src/parser.js";
import { compile } from "../src/render.js";
import { freeToMarkdown } from "../src/free/markdown.js";

const BIN = fileURLToPath(new URL("../bin/clarify.mjs", import.meta.url));
const HOW = "**How to read this:** read down. Each key sends a number.";
const FRAGMENT = '<p class="fx-how"><b>How to read this:</b> read down. Each key sends a number.</p><svg viewBox="0 0 1 1"></svg><p class="fx-take">The keyboard sends a position, and the computer picks the letter.</p><style>.fx-key-code{}</style><script>1</script>';
/** A free fence as it appears in a draft. */
const fence = (info, ...body) => [`\`\`\`free ${info}`.trimEnd(), ...body, "```"].join("\n");
const block = (info, body = "") => ({ type: "fence", lang: "free", info, body, line: 1 });

/** Runs `fn` with a fresh temp folder, and removes the folder after. */
function inTmp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-free-md-"));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** A draft folder with `sections/part.html` and a draft that points to it. */
function withDraft(fn) {
  return inTmp((tmp) => {
    fs.mkdirSync(path.join(tmp, "sections"));
    fs.writeFileSync(path.join(tmp, "sections", "part.html"), '<p class="fx-how"><b>How to read this:</b> from the file.</p><svg viewBox="0 0 1 1"></svg>');
    const draft = ["# T", "", "## A Keys", fence("part file=sections/part.html")].join("\n");
    fs.writeFileSync(path.join(tmp, "draft.md"), draft);
    return fn(tmp, draft);
  });
}

test("a free section exports its how line, its takeaway and a note", () => {
  const md = freeToMarkdown(block("key-code", FRAGMENT), "");
  assert.equal(md, [
    HOW,
    "> **Takeaway:** The keyboard sends a position, and the computer picks the letter.",
    "_The drawing (`key-code`) is on the HTML page._"
  ].join("\n\n"));
  assert.doesNotMatch(md, /<svg|<style|<script/);
});

test("without how or takeaway only the note remains", () => {
  const note = "_The drawing (`key-code`) is on the HTML page._";
  assert.equal(freeToMarkdown(block("key-code", '<svg viewBox="0 0 1 1"></svg>'), ""), note);
  assert.equal(freeToMarkdown(block("key-code", '<p class="fx-take">T</p>'), ""), `> **Takeaway:** T\n\n${note}`);
  assert.equal(freeToMarkdown(block("key-code", '<p class="fx-how">H</p>'), ""), `H\n\n${note}`);
  assert.equal(freeToMarkdown(block("key-code", '<p class="fx-take"> </p>'), ""), note, "an empty takeaway is left out");
});

test("a part is read as text: bold kept, other tags dropped, entities decoded, spaces collapsed", () => {
  const fragment = '<div class="fx-how wide">\n  Read <strong>A &amp; B</strong>\n  with <em>care</em>:&nbsp;&lt;3 &quot;x&quot; it&#39;s &amp;lt;\n</div>';
  assert.match(freeToMarkdown(block("a", fragment), ""), /^Read \*\*A & B\*\* with care: <3 "x" it's &lt;\n\n/);
});

test("a part keeps its own nested tags of the same kind, and the first one wins", () => {
  const fragment = '<div class="fx-take">one <div>two</div> three</div><p class="fx-take">later</p>';
  assert.match(freeToMarkdown(block("a", fragment), ""), /^> \*\*Takeaway:\*\* one two three\n\n/);
});

test("a section with no usable name still gets a note", () => {
  assert.equal(freeToMarkdown(block("", "<p>x</p>"), ""), "_The drawing is on the HTML page._");
  assert.equal(freeToMarkdown(block("Bad`Name"), ""), "_The drawing is on the HTML page._");
});

test("a missing file leaves only the note", () => {
  inTmp((tmp) => {
    const md = freeToMarkdown(block("gone file=sections/gone.html"), path.join(tmp, "draft.md"));
    assert.equal(md, "_The drawing (`gone`) is on the HTML page._");
  });
});

test("a free section reads its file= from the draft's folder", () => {
  withDraft((tmp) => {
    const md = freeToMarkdown(block("part file=sections/part.html"), path.join(tmp, "draft.md"));
    assert.match(md, /^\*\*How to read this:\*\* from the file\.\n\n_The drawing \(`part`\)/);
  });
});

test("the page's embedded Markdown carries no fragment", () => {
  const draft = ["# T", "", "## A Keys", fence("key-code", FRAGMENT)].join("\n");
  const { html } = compile(parseDraft(draft));
  const embedded = html.match(/<script type="application\/json" id="c-markdown">([\s\S]*?)<\/script>/);
  assert.ok(embedded, "the page embeds its Markdown");
  const md = JSON.parse(embedded[1]);
  assert.ok(md.includes(HOW), "the how line is there");
  assert.doesNotMatch(md, /<svg|<style|<script/);
  assert.match(md, /_The drawing \(`key-code`\) is on the HTML page\._/);
});

test("the page's embedded Markdown reads file= sections from the draft's folder", () => {
  withDraft((tmp, draft) => {
    const source = path.join(tmp, "draft.md");
    const { html } = compile(parseDraft(draft), { source });
    const md = JSON.parse(html.match(/<script type="application\/json" id="c-markdown">([\s\S]*?)<\/script>/)[1]);
    assert.match(md, /\*\*How to read this:\*\* from the file\./);
  });
});

test("clarify md reads file= sections from the draft's folder", () => {
  withDraft((tmp) => {
    const md = execFileSync(process.execPath, [BIN, "md", path.join(tmp, "draft.md")], { cwd: os.tmpdir(), encoding: "utf8" });
    assert.match(md, /\*\*How to read this:\*\* from the file\./);
    assert.doesNotMatch(md, /<svg/);
  });
});

test("clarify md - reads file= sections from the working directory", () => {
  withDraft((tmp, draft) => {
    const md = execFileSync(process.execPath, [BIN, "md", "-"], { input: draft, cwd: tmp, encoding: "utf8" });
    assert.match(md, /\*\*How to read this:\*\* from the file\./);
    assert.doesNotMatch(md, /<svg/);
  });
});
