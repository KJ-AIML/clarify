import test from "node:test";
import assert from "node:assert/strict";
import { parseDraft } from "../src/parser.js";
import { tokenizeBlocks, renderInline, splitRow } from "../src/markdown.js";

test("frontmatter: values, quotes, comments, theme aliases, clamped cols", () => {
  const d = parseDraft(`---
title: "Ops: Review # 3"
subtitle: Plain value   # trailing comment
theme: modern
layout: canvas
cols: 9
owner: platform
---
## A Panel
body`);
  assert.equal(d.meta.title, "Ops: Review # 3");
  assert.equal(d.meta.subtitle, "Plain value");
  assert.equal(d.meta.theme, "auto");
  assert.equal(d.meta.layout, "canvas");
  assert.equal(d.meta.cols, 4);
  assert.equal(d.meta.owner, "platform");
});

test("unknown theme falls back to auto; named presets pass through", () => {
  assert.equal(parseDraft("---\ntheme: neon\n---\nx").meta.theme, "auto");
  assert.equal(parseDraft("---\ntheme: tokyo\n---\nx").meta.theme, "tokyo-night");
  assert.equal(parseDraft("---\ntheme: nord\n---\nx").meta.theme, "nord");
});

test("lead, panels, ids, spans and body line numbers", () => {
  const src = [
    "---", "title: T", "cols: 3", "---", "",            // 1-5
    "Lead: First line", "continues here.", "",           // 6-8
    "## A Topology {span=2}", "", "```arch", "[A] -> [B]", "```", // 9-13
    "## Notes {span=9}", "text",                         // 14-15
    "## C Third", "x"                                    // 16-17
  ].join("\n");
  const d = parseDraft(src);
  assert.equal(d.lead, "First line continues here.");
  assert.deepEqual(d.panels.map(p => [p.id, p.title, p.span, p.line]), [
    ["A", "Topology", 2, 11],
    ["B", "Notes", 3, 15],
    ["C", "Third", 1, 17]
  ]);
});

test("a draft without ## sections still renders as one full-width panel", () => {
  const d = parseDraft("---\ntitle: Quick\ncols: 2\n---\n\n```arch\n[A] -> [B]\n```\n");
  assert.equal(d.panels.length, 1);
  assert.equal(d.panels[0].span, 2);
  assert.equal(d.panels[0].line, 6);
});

test("duplicate or missing panel letters are reassigned uniquely", () => {
  const d = parseDraft("## A One\nx\n## A Two\ny\n## Three\nz");
  assert.deepEqual(d.panels.map(p => p.id), ["A", "B", "C"]);
});

test("block tokenizer: mixed content keeps every block, with draft lines", () => {
  const blocks = tokenizeBlocks([
    "Intro paragraph", "wraps here.", "",
    "| A | B |", "| :-- | --: |", "| 1 | `a|b` |", "",
    "- [x] done", "  continued", "- [ ] todo", "",
    "```callout warn Heads up", "Body", "```",
    "### Heading", "> quote", "---"
  ].join("\n"), 10);
  assert.deepEqual(blocks.map(b => [b.type, b.line]), [
    ["paragraph", 11], ["table", 14], ["list", 18], ["fence", 22], ["heading", 25], ["quote", 26], ["hr", 27]
  ]);
  const table = blocks[1];
  assert.deepEqual(table.align, ["left", "right"]);
  assert.deepEqual(table.rows[1], ["1", "`a|b`"]);
  assert.deepEqual(blocks[2].items, [{ text: "done continued", checked: true, depth: 0 }, { text: "todo", checked: false, depth: 0 }]);
  assert.equal(blocks[3].lang, "callout");
  assert.equal(blocks[3].info, "warn Heads up");
});

test("unclosed fence runs to end of input (streaming drafts)", () => {
  const blocks = tokenizeBlocks("```arch\n[A] -> [B]\n[B] -> [C]");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].body, "[A] -> [B]\n[B] -> [C]");
});

test("splitRow handles escaped pipes and code spans", () => {
  assert.deepEqual(splitRow("| a \\| b | `x|y` | c |"), ["a | b", "`x|y`", "c"]);
});

test("inline markdown escapes HTML and rejects unsafe links", () => {
  assert.equal(renderInline("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(renderInline("[x](javascript:alert(1))"), "x");
  assert.equal(renderInline("**b** *i* `c<d>` ~~s~~"), "<strong>b</strong> <em>i</em> <code>c&lt;d&gt;</code> <del>s</del>");
  assert.match(renderInline("[docs](https://example.com/a?b=1&c=2)"), /href="https:\/\/example\.com\/a\?b=1&amp;c=2" target="_blank" rel="noopener noreferrer"/);
  assert.equal(renderInline("snake_case_name stays"), "snake_case_name stays");
  assert.match(renderInline("[wiki](https://en.wikipedia.org/wiki/Foo_(bar))"), /href="https:\/\/en\.wikipedia\.org\/wiki\/Foo_\(bar\)"/);
});
