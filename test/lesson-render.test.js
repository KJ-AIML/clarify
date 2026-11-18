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
/** A lesson fence as it appears in a draft. */
const fence = (title, ...body) => ["```lesson " + title, ...body, "```"].join("\n");
/** A small, complete lesson: two places, two steps and a quiz. */
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

test("the Git example compiles cleanly", () => {
  assert.deepEqual(git.warnings, []);
  assert.ok(git.stats.bytes < 450 * 1024, `${git.stats.bytes} bytes`);
  assert.match(git.html, /class="c-lesson"/);
  assert.match(git.html, /id="c-lesson-css"/);
  assert.match(git.html, /id="c-lesson-js"/);
  // 10 steps + the quiz (the `<article` prefix keeps h4.l-step-title out of the count).
  assert.equal(count(git.html, /<article class="l-step/g), 11);
  assert.equal(count(git.html, /<article class="l-step l-quiz"/g), 1);
});

test("pages without a lesson get no lesson assets", () => {
  for (const f of examples.filter((f) => f !== "git-commit-lesson.md")) {
    const { html } = compile(parseDraft(read(f)));
    assert.ok(!html.includes("c-lesson-css"), f);
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
  for (const where of ['<h3 class="l-title">', '<span class="l-tag-t">', '<h4 class="l-step-title">', '<div class="l-tip is-warn" role="note"><b>', '<button type="button" class="l-option" data-correct="true"><span>']) {
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

test("two lessons get distinct ids", () => {
  const { html, warnings } = compile(parseDraft(`## A First\n${fence("One", ...SMALL)}\n\n## B Second\n${fence("Two", ...SMALL)}`));
  assert.deepEqual(warnings, []);
  assert.match(html, /id="l0-obj-/);
  assert.match(html, /id="l1-obj-/);
  assert.match(html, /<section class="c-lesson" data-lesson="0"/);
  assert.match(html, /<section class="c-lesson" data-lesson="1"/);
  assert.equal(count(html, /id="c-lesson-css"/g), 1, "lesson assets ship once per page");
  assert.equal(count(html, /id="c-lesson-js"/g), 1);
  const ids = [...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(twice, [], "every id is unique");
  // Each lesson's <use> drawings point at its own defs.
  const second = html.slice(html.indexOf('data-lesson="1"'));
  assert.ok(!second.includes('href="#l0-'), "lesson 1 never borrows lesson 0's drawings");
});

test("lesson CSS stacks by container width", () => {
  const css = git.html.match(/<style id="c-lesson-css">([\s\S]*?)<\/style>/)[1];
  assert.ok(css.includes("container-type:inline-size"), "the lesson is its own size container");
  assert.match(css, /@container \(max-width:760px\)\{/);
  const narrow = compile(parseDraft(`---\nlayout: canvas\ncols: 3\n---\n## A Narrow card {span=1}\n${fence("Narrow", ...SMALL)}\n\n## B Notes {span=1}\nA second card beside it.`));
  assert.deepEqual(narrow.warnings, []);
  assert.match(narrow.html, /class="c-lesson"/);
});

// ── the HTML contract the CSS and the runtime rely on ────────────────────────────

test("the lesson HTML follows the contract", () => {
  const { html, warnings } = renderLesson(MINI, 0);
  assert.deepEqual(warnings, []);
  assert.match(html, /^<section class="c-lesson" data-lesson="0" tabindex="0" aria-label="Lesson: How a Commit Travels">/);
  // header: title, subtitle, meta items plus the step count
  assert.match(html, /<h3 class="l-title">How a Commit Travels<\/h3>/);
  assert.match(html, /<p class="l-sub">Follow one saved change\.<\/p>/);
  assert.match(html, /<ul class="l-meta"><li>10 min<\/li><li>Beginner<\/li><li>3 steps<\/li><\/ul>/);
  // counters with the first step's values, and the two tools
  assert.match(html, /<div class="l-chip" data-counter="0" data-level="none"><span class="l-chip-k">Staged<\/span><span class="l-chip-v">—<\/span><\/div>/);
  assert.match(html, /<div class="l-chip" data-counter="1" data-level="none"><span class="l-chip-k">Pushed<\/span>/);
  assert.match(html, /<div class="l-tools"><button type="button" class="l-btn" data-l="replay"><span class="l-btn-t">Replay<\/span><\/button><button type="button" class="l-btn" data-l="pause" aria-pressed="false"><span class="l-btn-t">Pause<\/span><\/button><\/div>/);
  // stage: the SVG, one tag per place in place order, the hidden key, the legend of used kinds
  assert.match(html, /<div class="l-stage"><svg class="l-svg"/);
  const tags = [...html.matchAll(/<span class="l-tag" data-place="([^"]+)" data-n="(\d)" style="left:([\d.]+)%;top:([\d.]+)%">/g)];
  assert.deepEqual(tags.map((m) => [m[1], m[2]]), [["you", "1"], ["tray", "2"], ["repo", "3"], ["origin", "4"], ["mate", "5"]]);
  assert.deepEqual(tags[0].slice(3).map(Number), [13.8, 41.7]);
  assert.match(html, /<ol class="l-key" hidden aria-label="Places">/);
  assert.equal(count(html, /<li data-place="[^"]+"><b>\d<\/b><i class="l-swatch" data-tint="\w+"><\/i>/g), 5);
  assert.match(html, /<ul class="l-legend" aria-label="Legend"><li><i class="l-dot" data-kind="change"><\/i>your change<\/li><li><i class="l-dot" data-kind="reply"><\/i>teammate&#39;s change<\/li><li><i class="l-dot" data-kind="fail"><\/i>refused<\/li><\/ul>/);
  // timeline: one button per step, the quiz last
  const steps = [...html.matchAll(/<button type="button" data-step="(\d+)"><b>(\d+)<\/b><span>([^<]*)<\/span><\/button>/g)];
  assert.deepEqual(steps.map((m) => m.slice(1)), [["0", "1", "Save"], ["1", "2", "Stage"], ["2", "3", "Rejected"], ["3", "4", "Quiz"]]);
  // guide: count, chapter, comment, then one article per step with its draft line, then the quiz
  assert.match(html, /<span class="l-count">Step 1 \/ 4<\/span><span class="l-chapter" data-chapter="problem">Problem<\/span><button type="button" class="l-icon" data-l="comment" aria-label="Comment on this step">/);
  const articles = [...html.matchAll(/<article class="(l-step(?: l-quiz)?)" data-step="(\d+)" data-line="(\d+)" data-chapter="(\w+)">/g)];
  assert.deepEqual(articles.map((m) => m.slice(1)), [
    ["l-step", "0", "19", "problem"], ["l-step", "1", "24", "how"], ["l-step", "2", "30", "case"], ["l-step l-quiz", "3", "36", "quiz"]
  ]);
  assert.match(html, /<h4 class="l-step-title">Your work lives on one laptop<\/h4><p>You pressed Save\. Only your laptop knows\.<\/p><div class="l-tip is-idea" role="note"><b>Key idea<\/b><p>Git moves changes one step at a time\.<\/p><\/div>/);
  assert.match(html, /<button type="button" class="l-option" data-correct="true"><span>git pull<\/span><span class="l-why" hidden>brings their commit down<\/span><\/button>/);
  assert.match(html, /<button type="button" class="l-option" data-correct="false"><span>git push --force<\/span><span class="l-why" hidden>erases their commit<\/span><\/button>/);
  assert.match(html, /<div class="l-nav"><button type="button" class="l-btn" data-l="back" disabled>Back<\/button><button type="button" class="l-btn l-next" data-l="next">Next: Stage<\/button><\/div>/);
  assert.match(html, /<p class="l-keys">← → step · R replay · Space pause<\/p>/);
  assert.match(html, /<li data-at="2"><i aria-hidden="true"><\/i><span>Why staging lets you choose<\/span><\/li>/);
  assert.match(html, /<p class="l-live c-sr" aria-live="polite"><\/p>/);
  // the model: geometry from the stage, one state per step plus the quiz
  const model = JSON.parse(html.match(/<script type="application\/json" class="l-model">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(Object.keys(model), ["n", "origin", "rails", "states", "shorts", "places"]);
  assert.equal(model.n, 0);
  assert.deepEqual(model.shorts, ["Save", "Stage", "Rejected", "Quiz"]);
  assert.deepEqual(model.places, ["you", "tray", "repo", "origin", "mate"]);
  assert.equal(model.states.length, 4);
  assert.deepEqual(Object.keys(model.rails), ["you--tray", "tray--repo", "repo--origin", "origin--mate"]);
  assert.deepEqual(model.states[1].counters[0], { label: "Staged", value: "2 files", level: "good", changed: true });
});

test("a lesson without a quiz has no quiz step", () => {
  const { html } = renderLesson({ type: "fence", lang: "lesson", info: "No quiz", line: 1, body: [...HEAD, ...STEPS].join("\n") }, 0);
  assert.equal(count(html, /<article class="l-step"/g), 2);
  assert.equal(count(html, /l-quiz/g), 0);
  assert.equal(count(html, /<button type="button" data-step=/g), 2);
  assert.match(html, /<span class="l-count">Step 1 \/ 2<\/span>/);
});

test("warnings come from the parser and the layout, per panel", () => {
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
});
