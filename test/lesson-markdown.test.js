import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseDraft } from "../src/parser.js";
import { draftToMarkdown } from "../src/export/markdown.js";
import { lessonToMarkdown, lessonModelToMarkdown } from "../src/lesson/markdown.js";
import { MINI } from "./fixtures/lesson-mini.js";

const read = (f) => fs.readFileSync(new URL(`../examples/${f}`, import.meta.url), "utf8");
const fence = (info, ...body) => ({ type: "fence", lang: "lesson", info, line: 1, body: body.join("\n") });

test("exports a lesson for GitHub", () => {
  const md = lessonToMarkdown(MINI);
  assert.match(md, /### How a Commit Travels/);
  assert.match(md, /```mermaid/);
  assert.match(md, /you\["Your folder"\] --- tray\["Staging"\]/);
  assert.match(md, /1\. \*\*Your work lives on one laptop\*\*/);
  assert.match(md, /> \*\*Key idea:\*\* Git moves changes one step at a time\./);
  assert.match(md, /- \[x\] git pull — brings their commit down/);

  const page = draftToMarkdown(parseDraft(read("git-commit-lesson.md")));
  assert.match(page, /### How a Commit Travels/);
});

test("the MINI lesson exports to exactly this Markdown", () => {
  assert.equal(lessonToMarkdown(MINI), [
    "### How a Commit Travels",
    "",
    "_Follow one saved change._",
    "",
    "```mermaid",
    "flowchart LR",
    '  you["Your folder"] --- tray["Staging"]',
    '  tray["Staging"] --- repo["Local repo"]',
    '  repo["Local repo"] --- origin["Origin"]',
    '  origin["Origin"] --- mate["Teammate"]',
    "```",
    "",
    "1. **Your work lives on one laptop** You pressed Save. Only your laptop knows.",
    "   > **Key idea:** Git moves changes one step at a time.",
    "2. **Pick what goes in the snapshot** `git add` copies the changes you choose.",
    "3. **The push is refused** Your teammate pushed first.",
    "",
    "**Quiz: Your push was refused. What do you run first?**",
    "",
    "- [x] git pull — brings their commit down",
    "- [ ] git push --force — erases their commit"
  ].join("\n"));
});

test("joins paragraphs with a space, nests the tip and takeaways, and numbers the steps", () => {
  const md = lessonToMarkdown(fence("T",
    'places: a = laptop "A" | b = server "B"',
    "rails: a - b",
    "",
    "step One: First",
    "  Para one.",
    "",
    "  Para two.",
    "  tip warn Careful: Mind the gap.",
    "  - Take one",
    "  - Take two",
    "",
    "step Two: Second",
    "  Only text."
  ));
  assert.ok(md.includes([
    "1. **First** Para one. Para two.",
    "   > **Careful:** Mind the gap.",
    "   - Take one",
    "   - Take two",
    "2. **Second** Only text."
  ].join("\n")));
});

test("turns ==term== into bold outside code spans and leaves other inline Markdown alone", () => {
  const md = lessonToMarkdown(fence("T",
    'places: a = laptop "A"',
    "",
    "step One: The ==staging area== step",
    "  Copies into the ==tray==. See `x ==y== z`, **bold**, _this_ and [a link](https://example.com).",
    "  tip The ==tip== title: A ==tip== body.",
    "  - A ==takeaway==",
    "",
    "quiz Is ==this== right?",
    "  * a ==yes== | because ==why==",
    "  - a `no ==x==` | stays"
  ));
  // Inside bold the marks just drop; everywhere else the term turns bold.
  assert.ok(md.includes("1. **The staging area step** Copies into the **tray**. See `x ==y== z`, **bold**, _this_ and [a link](https://example.com)."));
  assert.ok(md.includes("   > **The tip title:** A **tip** body."));
  assert.ok(md.includes("   - A **takeaway**"));
  assert.ok(md.includes("**Quiz: Is this right?**"));
  assert.ok(md.includes("- [x] a **yes** — because **why**"));
  assert.ok(md.includes("- [ ] a `no ==x==` — stays"));
  assert.ok(!md.includes("==tray==") && !md.includes("==tip=="));
});

test("skips an empty subtitle and a missing quiz, with single blank lines between blocks", () => {
  const md = lessonToMarkdown(fence("Bare",
    'places: a = laptop "A" | b = server "B"',
    "rails: a - b",
    "",
    "step One: First",
    "  Text."
  ));
  assert.equal(md, [
    "### Bare",
    "",
    "```mermaid",
    "flowchart LR",
    '  a["A"] --- b["B"]',
    "```",
    "",
    "1. **First** Text."
  ].join("\n"));
  assert.ok(!md.includes("__") && !md.includes("Quiz"));
  assert.ok(!/\n{3,}/.test(md));
});

test("lists every place that is in no rail as its own node, after the rails", () => {
  const md = lessonToMarkdown(fence("T",
    'places: a = laptop "A" | b = server "B" | c = tray "C" | d = cabinet "D"',
    "rails: a - b",
    "",
    "step One: First",
    "  Text."
  ));
  assert.ok(md.includes([
    "flowchart LR",
    '  a["A"] --- b["B"]',
    '  c["C"]',
    '  d["D"]',
    "```"
  ].join("\n")));
});

test("keeps the ids as parsed", () => {
  const md = lessonToMarkdown(fence("T",
    'places: my-id = laptop "The \'dev\' box" | b = server "B"',
    "rails: my-id - b",
    "",
    "step One: First",
    "  Text."
  ));
  assert.ok(md.includes('my-id["The \'dev\' box"] --- b["B"]'));
});

test("escapes a double quote in a label as #quot;", () => {
  // The parser never produces a quote in a label, so build the model by hand.
  const md = lessonModelToMarkdown({
    title: "T", subtitle: "", places: [{ id: "a", label: 'Say "hi"' }, { id: "b", label: "B" }, { id: "c", label: 'The "lone" one' }],
    rails: [{ a: "a", b: "b" }], quiz: null,
    steps: [{ title: "First", paras: ["Text."], tip: null, takeaways: [] }]
  });
  assert.ok(md.includes('a["Say #quot;hi#quot;"] --- b["B"]'));
  assert.ok(md.includes('c["The #quot;lone#quot; one"]'));
});

test("leaves the mermaid block out when the lesson has no places", () => {
  const md = lessonToMarkdown(fence("Empty", "", "step One: First", "  Text."));
  assert.ok(!md.includes("mermaid"));
  assert.equal(md, "### Empty\n\n1. **First** Text.");
});

test("indents a tip and takeaways under a two-digit step marker", () => {
  const steps = Array.from({ length: 10 }, (_, i) => `step S${i + 1}: Step ${i + 1}\n  Text ${i + 1}.\n  tip Why: Because.\n  - Point`);
  const md = lessonToMarkdown(fence("T", 'places: a = laptop "A"', "", ...steps));
  assert.ok(md.includes("10. **Step 10** Text 10.\n    > **Why:** Because.\n    - Point"));
  assert.ok(md.includes("9. **Step 9** Text 9.\n   > **Why:** Because.\n   - Point"));
});

test("a lesson fence in a draft exports as a lesson, not as a raw code block", () => {
  const md = draftToMarkdown(parseDraft(read("git-commit-lesson.md")));
  assert.ok(!md.includes("```lesson"));
  assert.match(md, /\n1\. \*\*Your work lives on one laptop\*\*/);
  assert.match(md, /\n\*\*Quiz: /);
  assert.ok(!/\n{3,}/.test(md));
});
