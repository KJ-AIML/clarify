import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseDraft } from "../src/parser.js";
import { compile } from "../src/render.js";
import { renderLesson } from "../src/lesson/render.js";
import { MINI } from "./fixtures/lesson-mini.js";

const examples = fs.readdirSync(new URL("../examples/", import.meta.url)).filter((f) => f.endsWith(".md"));
const read = (f) => fs.readFileSync(new URL(`../examples/${f}`, import.meta.url), "utf8");
const count = (text, re) => (text.match(re) || []).length;
const fence = (title, ...body) => ["```lesson " + title, ...body, "```"].join("\n");
const HEAD = ['places: a = laptop "Desk" | b = server "Server"', "rails: a - b", "counters: Sent", ""];
const STEPS = [
  "step Send: The change leaves [how]",
  "  It moves along the rail.",
  "  move: a -> b",
  "  set: Sent = 1 good",
  "",
  "step Done: It arrived [recap]",
  "  The server has it now.",
  "  focus: b",
  ""
];
const QUIZ = ["quiz Where is the change now?", "  * On the server | it arrived in step 2", "  - On the desk | it left in step 1"];
const SMALL = [...HEAD, ...STEPS, ...QUIZ];
const git = compile(parseDraft(read("git-commit-lesson.md")));
const cache = compile(parseDraft(read("cache-isokit-lesson.md")));

test("the Git Markdown lesson and Cache native isokit examples compile cleanly", () => {
  assert.deepEqual(git.warnings, []);
  assert.ok(git.stats.bytes < 450 * 1024, `${git.stats.bytes} bytes`);
  assert.match(git.html, /class="c-lesson"/);
  assert.match(git.html, /id="c-lesson-css"/);
  assert.match(git.html, /id="c-isokit-js"/);
  assert.match(git.html, /id="c-lesson-js"/);
  assert.equal(count(git.html, /<article class="l-step/g), 11);
  assert.equal(count(git.html, /<article class="l-step l-quiz"/g), 1);

  assert.deepEqual(cache.warnings, []);
  assert.ok(cache.stats.bytes < 450 * 1024, `${cache.stats.bytes} bytes`);
  assert.match(cache.html, /class="c-lesson"/);
  assert.match(cache.html, /id="c-isokit-js"/);
  assert.match(cache.html, /class="l-changes"/);
  assert.equal(count(cache.html, /<article class="l-step/g), 5);
  assert.equal(count(cache.html, /<article class="l-step l-quiz"/g), 1);
});

test("pages without a lesson get no lesson or isokit assets", () => {
  const lessonExamples = new Set(["git-commit-lesson.md", "cache-isokit-lesson.md"]);
  for (const f of examples.filter((name) => !lessonExamples.has(name))) {
    const { html } = compile(parseDraft(read(f)));
    assert.ok(!html.includes("c-lesson-css"), f);
    assert.ok(!html.includes("c-isokit-js"), f);
    assert.ok(!html.includes("c-lesson-js"), f);
    assert.ok(!html.includes('class="c-lesson"'), f);
  }
});

test("key terms are marked", () => {
  const stage = ["step Stage: Pick the files [how]", "  `git add` copies them into the ==staging area==.", "  focus: a", ""];
  const { html, warnings } = compile(parseDraft(fence("Staging", ...HEAD, ...stage, ...STEPS, ...QUIZ)));
  assert.deepEqual(warnings, []);
  assert.match(html, /<mark>staging area<\/mark>/);
  assert.match(html, /<code>git add<\/code> copies them/);
});

test("lesson text is escaped", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const { html } = compile(parseDraft(fence(
    evil,
    `subtitle: ${evil}`,
    `meta: ${evil}`,
    `places: a = laptop "${evil}" | b = tray "${evil}"`,
    "rails: a - b",
    `counters: ${evil}`,
    `pucks: change = ${evil}`,
    `goals: ${evil} @1`,
    "",
    `step ${evil}: ${evil}`,
    `  ${evil}`,
    `  tip warn ${evil}: ${evil}`,
    `  - ${evil}`,
    "  move: a -> b",
    "",
    `quiz ${evil}`,
    `  * ${evil} | ${evil}`,
    `  - ${evil} | ${evil}`
  )));
  assert.ok(!html.includes("<img src=x"), "a raw tag must not appear");
  assert.ok(html.includes('aria-label="Lesson: &lt;img src=x onerror=alert(1)&gt;"'));
  assert.ok(html.includes('data-step="0" aria-label="Step 1: &lt;img src=x onerror=alert(1)&gt;"'));
  for (const where of ['<h3 class="l-title">', '<h4 class="l-step-title">', '<div class="l-tip is-warn" role="note"><b>', '<button type="button" class="l-option" data-correct="true"><span>']) {
    assert.ok(html.includes(`${where}&lt;img src=x onerror=alert(1)&gt;`), where);
  }
});

test("without JS every step is in the page", () => {
  assert.ok(!/<article class="l-step[^>]*\shidden/.test(git.html), "no article is hidden in the compiled page");
  const lesson = git.html.slice(git.html.indexOf('<section class="c-lesson"'), git.html.indexOf("</section>", git.html.indexOf('<section class="c-lesson"')));
  for (const title of ["Your work lives on one laptop", "The snapshot is missing a file", "The push is refused", "Where the change went"]) {
    assert.ok(lesson.includes(`>${title}</h4>`), title);
  }
  assert.ok(lesson.includes("Your push was refused. What do you run first?"));
});

test("two lessons ship runtime once and get distinct indices", () => {
  const { html, warnings } = compile(parseDraft(`## A First\n${fence("One", ...SMALL)}\n\n## B Second\n${fence("Two", ...SMALL)}`));
  assert.deepEqual(warnings, []);
  assert.match(html, /<section class="c-lesson" data-lesson="0"/);
  assert.match(html, /<section class="c-lesson" data-lesson="1"/);
  assert.equal(count(html, /id="c-lesson-css"/g), 1, "lesson CSS ships once per page");
  assert.equal(count(html, /id="c-isokit-js"/g), 1, "isokit ships once per page");
  assert.equal(count(html, /id="c-lesson-js"/g), 1, "lesson JS ships once per page");
  const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  const ids = [...noScripts.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(twice, [], "every id is unique");
});

test("lesson CSS stacks by container width and cards span full row", () => {
  const css = git.html.match(/<style id="c-lesson-css">([\s\S]*?)<\/style>/)[1];
  assert.ok(css.includes("container-type:inline-size"), "the lesson is its own size container");
  assert.match(css, /@container \(max-width:760px\)\{/);
  const grid = compile(parseDraft(`## A Lesson {span=1}\n${fence("Grid", ...SMALL)}\n\n## B Notes {span=1}\nA second card.`));
  assert.deepEqual(grid.warnings, []);
  assert.match(grid.html, /<section class="c-card" id="panel-A" data-panel="A" data-line="\d+" data-span="3">/);
  const canvas = compile(parseDraft(`---\nlayout: canvas\ncols: 3\n---\n## A Lesson {span=1}\n${fence("Canvas", ...SMALL)}`));
  assert.deepEqual(canvas.warnings, []);
  assert.match(canvas.html, /<div class="c-page" data-layout="canvas">/);
  assert.match(canvas.html, /class="c-lesson"/);
});

test("the lesson HTML follows the isokit player contract", () => {
  const { html, warnings } = renderLesson(MINI, 0);
  assert.deepEqual(warnings, []);
  assert.match(html, /^<section class="c-lesson" data-lesson="0" tabindex="0" aria-label="Lesson: How a Commit Travels">/);
  assert.match(html, /<h3 class="l-title">How a Commit Travels<\/h3>/);
  assert.match(html, /<p class="l-sub">Follow one saved change\.<\/p>/);
  assert.match(html, /<ul class="l-meta"><li>10 min<\/li><li>Beginner<\/li><li>3 steps<\/li><\/ul>/);
  assert.match(html, /<div class="l-chip" data-counter="0" data-level="none"><span class="l-chip-k">Staged<\/span><span class="l-chip-v">—<\/span><\/div>/);
  assert.match(html, /<div class="l-stage"><div class="l-iso-host"/);
  assert.match(html, /<ul class="l-legend" aria-label="Legend">/);
  assert.match(html, /class="l-pkt-swatch"/);

  const steps = [...html.matchAll(/<button type="button" data-step="(\d+)" aria-label="([^"]*)"><b>(\d+)<\/b><span>([^<]*)<\/span><\/button>/g)];
  assert.deepEqual(steps.map((m) => m.slice(1)), [
    ["0", "Step 1: Save", "1", "Save"],
    ["1", "Step 2: Stage", "2", "Stage"],
    ["2", "Step 3: Rejected", "3", "Rejected"],
    ["3", "Step 4: Quiz", "4", "Quiz"]
  ]);

  const model = JSON.parse(html.match(/<script type="application\/json" class="l-model">([\s\S]*?)<\/script>/)[1]);
  assert.equal(model.n, 0);
  assert.equal(model.mode, "markdown");
  assert.deepEqual(model.shorts, ["Save", "Stage", "Rejected", "Quiz"]);
  assert.equal(model.scenes.length, 4);
  assert.equal(model.chips.length, 4);
  assert.deepEqual(model.chips[1][0], { key: "0", value: "2 files", level: "good", changed: true });
});

test("a lesson without a quiz has no quiz step", () => {
  const { html } = renderLesson({ type: "fence", lang: "lesson", info: "No quiz", line: 1, body: [...HEAD, ...STEPS].join("\n") }, 0);
  assert.equal(count(html, /<article class="l-step"/g), 2);
  assert.equal(count(html, /l-quiz/g), 0);
  assert.equal(count(html, /<button type="button" data-step=/g), 2);
  assert.match(html, /<span class="l-count">Step 1 \/ 2<\/span>/);
});

test("warnings come from the parser and layout for Markdown lessons and from validator for isokit JSON", () => {
  const body = [
    'places: a = laptop "A" at=0,0 | b = rocket "B" at=0,0',
    "rails: a - b",
    "",
    "step One: First [how]",
    "  move: a -> ghost"
  ];
  const own = renderLesson({ type: "fence", lang: "lesson", info: "Warned", line: 4, body: body.join("\n") }, 0);
  assert.deepEqual(own.warnings, ['line 5: unknown object "rocket", drawn as a box', 'line 5: "b" overlaps "a"', 'line 9: unknown place "ghost"']);
  const page = compile(parseDraft(`## A Lesson\n${fence("Warned", ...body)}`));
  assert.ok(page.warnings.length === 3 && page.warnings.every((w) => w.startsWith("panel A: line ")), page.warnings.join("\n"));

  const badJson = compile(parseDraft("## A Bad\n```isokit\n{ not valid json\n```"));
  assert.equal(badJson.warnings.length, 1);
  assert.match(badJson.warnings[0], /panel A: line \d+: invalid isokit JSON/);
});
