// The skill text: SKILL.md and the references it names. An agent acts on this text alone, so it must
// name only files that exist, stay short enough to read inside a quick run, and every example an agent
// may copy must compile without a warning.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseDraft } from "../src/parser.js";
import { compile } from "../src/render.js";

const ROOT = new URL("../", import.meta.url);
// Line ends as \n, whatever the checkout wrote (Git on Windows may turn them into \r\n).
const read = (rel) => fs.readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
const skill = read("SKILL.md");

/** The frontmatter `description`: one line, or a folded block (`>-`) joined with spaces. */
function description(text) {
  const front = text.match(/^---\n([\s\S]*?)\n---/)[1].split("\n");
  const at = front.findIndex((l) => /^description:/.test(l));
  const first = front[at].replace(/^description:\s*/, "");
  if (!/^[>|]-?$/.test(first)) return first.replace(/^(["'])(.*)\1$/, "$2");
  const body = [];
  for (const line of front.slice(at + 1)) {
    if (!/^\s+\S/.test(line)) break;
    body.push(line.trim());
  }
  return body.join(" ");
}

/** The body of every ````markdown block (four backticks) in a reference file. */
const markdownBlocks = (text) => [...text.matchAll(/^````markdown\n([\s\S]*?)\n````$/gm)].map((m) => m[1]);

test("the description lists triggers only", () => {
  const d = description(skill);
  assert.match(d, /^Use when/);
  assert.ok(d.length <= 1024, `${d.length} characters`);
  for (const word of ["diagram", "visualize", "compare", "lesson", "teach"]) assert.ok(d.includes(word), word);
});

test("the checklist and the skeleton are gone", () => {
  assert.ok(!skill.includes("Context checklist"));
  assert.ok(!skill.includes("Draft skeleton"));
  for (const part of ["## Depth and time", "## Think before you draw", "## Two page shapes", "## Free sections",
    'bin/clarify.mjs" check', "references/forms.md", "references/free-sections.md"]) {
    assert.ok(skill.includes(part), part);
  }
});

test("every reference SKILL.md names exists", () => {
  const named = new Set(skill.match(/\b(?:references|examples)\/[\w.-]+\.md\b/g));
  assert.ok(named.size >= 3, [...named].join(", "));
  for (const rel of named) assert.ok(fs.existsSync(new URL(rel, ROOT)), rel);
});

test("the free-section examples compile cleanly", () => {
  const blocks = markdownBlocks(read("references/free-sections.md")).filter((b) => b.includes("```free "));
  assert.ok(blocks.length >= 1);
  for (const block of blocks) {
    const { warnings } = compile(parseDraft(block));
    assert.deepEqual(warnings, [], block.slice(0, 80));
  }
});

test("every form in references/forms.md compiles cleanly", () => {
  const blocks = markdownBlocks(read("references/forms.md"));
  assert.ok(blocks.length >= 12, `${blocks.length} snippets`);
  for (const block of blocks) {
    const { warnings } = compile(parseDraft(block));
    assert.deepEqual(warnings, [], block.slice(0, 80));
  }
});

test("SKILL.md stays lean", () => {
  const lines = skill.split("\n").length;
  assert.ok(lines < 230, `${lines} lines`);
});
