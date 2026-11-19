import test from "node:test";
import assert from "node:assert/strict";
import { parseLesson } from "../src/lesson/parse.js";
import { LIMITS } from "../src/lesson/kinds.js";
import { MINI } from "./fixtures/lesson-mini.js";

// A fence opening at draft line 5, so body line i (0-based) is draft line 6 + i.
const run = (body, info = "T") => parseLesson({ lang: "lesson", info, body, line: 5 });
const warningsOf = (body, info) => run(body, info).warnings;

// Four valid header lines (draft lines 6-9); a step then opens at line 10.
const BASE = [
  'places: a = laptop "A" | b = server "B" | c = tray "C"',
  "rails: a - b",
  "counters: Count",
  ""
];
const withStep = (...lines) => [...BASE, "step One: First", ...lines].join("\n");

const graphemeCount = s => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].length;
const wordCount = s => [...new Intl.Segmenter(undefined, { granularity: "word" }).segment(s)].filter(x => x.isWordLike).length;

test("parses the header", () => {
  const { lesson, warnings } = parseLesson(MINI);
  assert.deepEqual(warnings, []);
  assert.equal(lesson.title, "How a Commit Travels");
  assert.equal(lesson.subtitle, "Follow one saved change.");
  assert.equal(lesson.line, 10);
  assert.deepEqual(lesson.meta, ["10 min", "Beginner"]);
  assert.deepEqual(lesson.places.map(p => p.id), ["you", "tray", "repo", "origin", "mate"]);
  assert.deepEqual(lesson.places[2], { id: "repo", kind: "cabinet", label: "Local repo", tint: null, at: null, line: 13 });
  assert.deepEqual(lesson.rails[0], { a: "you", b: "tray", line: 14 });
  assert.equal(lesson.rails.length, 4);
  assert.deepEqual(lesson.counters, ["Staged", "Pushed"]);
  assert.deepEqual(lesson.pucks, { change: "your change", reply: "teammate's change", fail: "refused" });
  assert.deepEqual(lesson.goals, [{ text: "Why staging lets you choose", at: 2 }]);
});

test("parses steps and the quiz", () => {
  const { lesson } = parseLesson(MINI);
  assert.equal(lesson.steps.length, 3);
  assert.deepEqual(lesson.steps[0], {
    short: "Save",
    title: "Your work lives on one laptop",
    chapter: "problem",
    paras: ["You pressed Save. Only your laptop knows."],
    tip: { kind: "idea", title: "Key idea", text: "Git moves changes one step at a time." },
    takeaways: [],
    show: ["you"],
    focus: [],
    fail: [],
    cut: [],
    moves: [],
    set: [],
    line: 19
  });
  assert.deepEqual(lesson.steps[1].moves, [{ from: "you", to: "tray", kind: "change", count: 2, together: false, roundTrip: false }]);
  assert.deepEqual(lesson.steps[1].set, [{ label: "Staged", value: "2 files", level: "good" }]);
  assert.deepEqual(lesson.steps[1].focus, ["tray"]);
  assert.deepEqual(lesson.steps[2].moves[1], { from: "repo", to: "origin", kind: "fail", count: 1, together: true, roundTrip: false });
  assert.equal(lesson.steps[2].line, 30);
  assert.deepEqual(lesson.quiz, {
    question: "Your push was refused. What do you run first?",
    options: [
      { text: "git pull", correct: true, why: "brings their commit down" },
      { text: "git push --force", correct: false, why: "erases their commit" }
    ],
    line: 36
  });
});

test("warns with line numbers", () => {
  const puckHelp = "(use change, reply, fail, store, slow)";
  const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));
  const cases = [
    ["unknown key", "shout: hi", ['line 6: unknown key "shout"']],
    ["could not read place", "places: you = laptop", ['line 6: could not read place "you = laptop"']],
    ["unknown object", 'places: a = widget "A"', ['line 6: unknown object "widget", drawn as a box']],
    ["unknown tint", 'places: a = box "A" tint=mauve', ['line 6: unknown tint "mauve"']],
    ["unknown puck kind in pucks:", "pucks: mate = teammate's", [`line 6: unknown puck kind "mate" ${puckHelp}`]],
    ["unknown puck kind in a move", withStep("  move: a -> b flarp"), [`line 11: unknown puck kind "flarp" ${puckHelp}`]],
    ["unknown place", withStep("  show: zed"), ['line 11: unknown place "zed"']],
    ["no rail for a move", withStep("  move: a -> c"), ['line 11: no rail between "a" and "c"']],
    ["no rail for a cut", withStep("  cut: a - c"), ['line 11: no rail between "a" and "c"']],
    ["could not read move", withStep("  move: a ->"), ['line 11: could not read move "a ->"']],
    ["undeclared counter", withStep("  set: Total = 3"), ['line 11: counter "Total" is not declared in counters:']],
    ["step needs a title", [...BASE, "step Save:"].join("\n"), ["line 10: step needs a title"]],
    ["more than 12 steps", many(13, i => `step S${i}: Title ${i}`).join("\n"), ["line 18: more than 12 steps"]],
    ["more than 7 places", `places: ${many(8, i => `p${i} = box "P${i}"`).join(" | ")}`,
      ["line 6: more than 7 places; only the first 7 are drawn"]],
    ["paragraph over 45 words", withStep(many(46, () => "word").join(" ")),
      ["line 11: paragraph has 46 words (keep it to 45)"]],
    ["paragraph words add up across lines", withStep(many(23, () => "word").join(" "), many(23, () => "word").join(" ")),
      ["line 11: paragraph has 46 words (keep it to 45)"]],
    ["step title over 32 characters", [...BASE, `step Long: ${"x".repeat(33)}`].join("\n"),
      ["line 10: title has 33 characters (keep it to 32)"]],
    ["quiz without a correct option", "quiz Pick one\n  - wrong | no\n  - also wrong | no",
      ["line 6: quiz needs one correct option, marked with *"]],
    ["quiz without options", "\nquiz Pick one",
      ["line 7: quiz has 0 options (give 2 to 4)", "line 7: quiz needs one correct option, marked with *"]],
    ["quiz with two correct options", "quiz Pick one\n  * right | yes\n  * right too | yes",
      ["line 6: quiz needs one correct option, marked with *"]],
    ["quiz without a question", "quiz \n  * right | yes\n  - wrong | no", ["line 6: quiz needs a question"]],
    ["quiz with one option", "quiz Pick one\n  * right | yes", ["line 6: quiz has 1 option (give 2 to 4)"]],
    ["quiz with five options", "quiz Pick one\n  * a | yes\n  - b | no\n  - c | no\n  - d | no\n  - e | no",
      ["line 6: quiz has 5 options (give 2 to 4)"]],
    ["option without a reason", "quiz Pick one\n  * right\n  - wrong | no", ['line 7: option "right" needs a reason after |']],
    ["option with an empty reason", "quiz Pick one\n  * right | yes\n  - wrong |", ['line 8: option "wrong" needs a reason after |']],
    ["a second quiz", "quiz Pick one\n  * right | yes\n  - wrong | no\nquiz Again?\n  * yes\n  - no",
      ["line 9: more than one quiz; only the first is kept"]]
  ];
  for (const [name, body, expected] of cases) {
    assert.deepEqual(warningsOf(body), expected, name);
  }
  assert.deepEqual(warningsOf(BASE.join("\n")), [], "the shared header is clean");
  assert.deepEqual(
    warningsOf("subtitle: x", "x".repeat(33)),
    ["line 5: title has 33 characters (keep it to 32)"],
    "lesson title over 32 characters");
});

test("limits are inclusive: 32 characters, 45 words, 12 steps and 7 places pass", () => {
  assert.deepEqual(warningsOf("subtitle: x", "x".repeat(LIMITS.title)), []);
  const lines = [
    `places: ${Array.from({ length: LIMITS.places }, (_, i) => `p${i} = box "P"`).join(" | ")}`,
    ...Array.from({ length: LIMITS.steps }, (_, i) => `step S${i}: ${"y".repeat(LIMITS.title)}`),
    "  " + Array.from({ length: LIMITS.words }, () => "word").join(" ")
  ];
  assert.deepEqual(warningsOf(lines.join("\n")), []);
});

test("over-limit places are dropped and quiet references to them are skipped", () => {
  const places = Array.from({ length: 9 }, (_, i) => `p${i} = box "P${i}"`).join(" | ");
  const { lesson, warnings } = run([`places: ${places}`, "rails: p0 - p1 - p8", "step Go: Go", "  show: p7, p8, p0"].join("\n"));
  assert.equal(lesson.places.length, 7);
  assert.deepEqual(lesson.places.map(p => p.id), ["p0", "p1", "p2", "p3", "p4", "p5", "p6"]);
  assert.deepEqual(lesson.rails.map(r => [r.a, r.b]), [["p0", "p1"]]);
  assert.deepEqual(lesson.steps[0].show, ["p0"]);
  assert.deepEqual(warnings, ["line 6: more than 7 places; only the first 7 are drawn"]);
});

test("more than 12 steps keeps every step", () => {
  const { lesson } = run(Array.from({ length: 14 }, (_, i) => `step S${i}: Title ${i}`).join("\n"));
  assert.equal(lesson.steps.length, 14);
});

test("an unknown object is drawn as a box and an unknown tint is dropped", () => {
  const { lesson } = run('places: a = widget "A" tint=mauve | b = server "B" tint=Violet at=2, -1');
  assert.deepEqual(lesson.places[0], { id: "a", kind: "box", label: "A", tint: null, at: null, line: 6 });
  assert.deepEqual(lesson.places[1], { id: "b", kind: "server", label: "B", tint: "violet", at: [2, -1], line: 6 });
});

test("places: quoted labels may hold a pipe; stray text makes the place unreadable", () => {
  const { lesson, warnings } = run('places: a = box "Read | Write" | b = box "B" colour=red | a = cloud "Again"');
  assert.deepEqual(lesson.places.map(p => [p.id, p.label]), [["a", "Read | Write"]]);
  assert.deepEqual(warnings, [
    'line 6: could not read place "b = box "B" colour=red"',
    'line 6: duplicate place "a"'
  ]);
});

test("references to unknown places are dropped with a warning", () => {
  const { lesson, warnings } = run([
    'places: a = box "A" | b = box "B"',
    "rails: a - zed - b | a - b",
    "step One: First",
    "  show: a, nope",
    "  focus: ghost",
    "  fail: b, spook",
    "  move: a -> yeti"
  ].join("\n"));
  assert.deepEqual(lesson.rails.map(r => [r.a, r.b]), [["a", "b"]]);
  assert.deepEqual(lesson.steps[0].show, ["a"]);
  assert.deepEqual(lesson.steps[0].focus, []);
  assert.deepEqual(lesson.steps[0].fail, ["b"]);
  assert.deepEqual(lesson.steps[0].moves, []);
  assert.deepEqual(warnings, [
    'line 7: unknown place "zed"',
    'line 9: unknown place "nope"',
    'line 10: unknown place "ghost"',
    'line 11: unknown place "spook"',
    'line 12: unknown place "yeti"'
  ]);
});

test("a rail declared before its places still validates", () => {
  const { lesson, warnings } = run('rails: a - b\nplaces: a = box "A" | b = box "B"');
  assert.deepEqual(warnings, []);
  assert.deepEqual(lesson.rails, [{ a: "a", b: "b", line: 6 }]);
});

test("moves: sequential, together after &, round trips, counts and puck kinds", () => {
  const { lesson, warnings } = run([
    'places: a = box "A" | b = box "B" | c = box "C"',
    "rails: a - b - c",
    "step One: First",
    "  move: a -> b x3 store, b <-> c slow & c -> b & a -> b X2 reply, b -> c"
  ].join("\n"));
  assert.deepEqual(warnings, []);
  assert.deepEqual(lesson.steps[0].moves, [
    { from: "a", to: "b", kind: "store", count: 3, together: false, roundTrip: false },
    { from: "b", to: "c", kind: "slow", count: 1, together: false, roundTrip: true },
    { from: "c", to: "b", kind: "change", count: 1, together: true, roundTrip: false },
    { from: "a", to: "b", kind: "reply", count: 2, together: true, roundTrip: false },
    { from: "b", to: "c", kind: "change", count: 1, together: false, roundTrip: false }
  ]);
});

test("an unknown puck kind keeps the move as a change; a move that cannot run is dropped", () => {
  const { lesson, warnings } = run([
    'places: a = box "A" | b = box "B" | c = box "C"',
    "rails: a - b",
    "step One: First",
    "  move: a -> b flarp, a -> c & b -> a"
  ].join("\n"));
  assert.deepEqual(lesson.steps[0].moves, [
    { from: "a", to: "b", kind: "change", count: 1, together: false, roundTrip: false },
    { from: "b", to: "a", kind: "change", count: 1, together: false, roundTrip: false }
  ]);
  assert.deepEqual(warnings, [
    'line 9: unknown puck kind "flarp" (use change, reply, fail, store, slow)',
    'line 9: no rail between "a" and "c"'
  ]);
});

test("cut keeps pairs that run along a rail, in either direction", () => {
  const { lesson, warnings } = run(withStep("  cut: b - a, a - c, tray"));
  assert.deepEqual(lesson.steps[0].cut, [["b", "a"]]);
  assert.deepEqual(warnings, ['line 11: no rail between "a" and "c"', 'line 11: could not read cut "tray"']);
});

test("counters match case-insensitively and keep the declared spelling", () => {
  const { lesson, warnings } = run([
    "counters: Edited | Snapshot",
    "step One: First",
    "  set: edited = 1 file warn | SNAPSHOT = none yet | Edited = 3"
  ].join("\n"));
  assert.deepEqual(warnings, []);
  assert.deepEqual(lesson.steps[0].set, [
    { label: "Edited", value: "1 file", level: "warn" },
    { label: "Snapshot", value: "none yet", level: "none" },
    { label: "Edited", value: "3", level: "none" }
  ]);
});

test("step headers: short name, chapter, and title forms", () => {
  const { lesson, warnings } = run([
    "step Pick what goes in the snapshot [why]",
    "step Rejected: Case: the push is refused [CASE]",
    "step Sorting [wip]",
    "step Save"
  ].join("\n"));
  assert.deepEqual(warnings, []);
  assert.deepEqual(lesson.steps.map(s => [s.short, s.title, s.chapter]), [
    ["Pick what", "Pick what goes in the snapshot", "why"],
    ["Rejected", "Case: the push is refused", "case"],
    ["Sorting [wip]", "Sorting [wip]", "how"],
    ["Save", "Save", "how"]
  ]);
});

test("tips: kind and title defaults, and a colon is only a split before a space", () => {
  const { lesson } = run([
    "step One: First",
    "  tip warn Never force it: `git push --force` erases work.",
    "step Two: Second",
    "  tip try Run it at 10:30 sharp.",
    "step Three: Third",
    "  tip Why a tray?: Staging lets you choose.",
    "step Four: Fourth",
    "  tip idea One idea per tip",
    "  - first takeaway",
    "  - second takeaway"
  ].join("\n"));
  assert.deepEqual(lesson.steps.map(s => s.tip), [
    { kind: "warn", title: "Never force it", text: "`git push --force` erases work." },
    { kind: "try", title: "Try it", text: "Run it at 10:30 sharp." },
    { kind: "idea", title: "Why a tray?", text: "Staging lets you choose." },
    { kind: "idea", title: "Key idea", text: "One idea per tip" }
  ]);
  assert.deepEqual(lesson.steps[3].takeaways, ["first takeaway", "second takeaway"]);
});

test("paragraphs join consecutive lines; a blank line or a directive ends one", () => {
  const { lesson } = run([
    "step One: First",
    "  First line",
    "  continues here.",
    "",
    "  A second paragraph.",
    "  - a takeaway",
    "  Third paragraph."
  ].join("\n"));
  assert.deepEqual(lesson.steps[0].paras, ["First line continues here.", "A second paragraph.", "Third paragraph."]);
  assert.deepEqual(lesson.steps[0].takeaways, ["a takeaway"]);
});

test("a second quiz is skipped: the first one is kept, and the second is not checked", () => {
  const { lesson, warnings } = run([
    "quiz Pick one",
    "  * right | yes",
    "  - wrong | no",
    "",
    "quiz Again?",
    "  * only option"
  ].join("\n"));
  assert.deepEqual(lesson.quiz, {
    question: "Pick one",
    options: [{ text: "right", correct: true, why: "yes" }, { text: "wrong", correct: false, why: "no" }],
    line: 6
  });
  // The second quiz (one option, no reason) would warn twice more if it were read.
  assert.deepEqual(warnings, ["line 10: more than one quiz; only the first is kept"]);
});

test("header keys are only read before the first step; later lines are step text", () => {
  const { lesson, warnings } = run("step One: First\n  subtitle: not a key here");
  assert.deepEqual(warnings, []);
  assert.equal(lesson.subtitle, "");
  assert.deepEqual(lesson.steps[0].paras, ["subtitle: not a key here"]);
});

test("a goal needs @step", () => {
  const { lesson, warnings } = run("goals: Know the tray @2 | Know the repo | @3");
  assert.deepEqual(lesson.goals, [{ text: "Know the tray", at: 2 }]);
  assert.deepEqual(warnings, ['line 6: could not read goal "Know the repo"', 'line 6: could not read goal "@3"']);
});

test("warnings come out in draft line order", () => {
  // The header's unknown key (7) is found before its rails (6) are checked; the output is still sorted.
  const { warnings } = run(["rails: y - z", "shout: hi", "step One: First", "  show: x"].join("\n"));
  assert.deepEqual(warnings.map(w => Number(w.match(/^line (\d+):/)[1])), [6, 6, 7, 9]);
});

test("thai text is measured by graphemes and words", () => {
  // 34 UTF-16 units, but 23 graphemes: combining vowels and tone marks do not count twice.
  const thaiTitle = "ที่เก็บข้อมูลที่ปลอดภัยที่สุดในโลก";
  assert.ok(thaiTitle.length > LIMITS.title, "precondition: over 32 UTF-16 units");
  assert.ok(graphemeCount(thaiTitle) <= LIMITS.title, "precondition: within 32 graphemes");
  // About 32 words by Intl.Segmenter, with no spaces anywhere.
  const shortPara = "คอมมิตคือภาพถ่ายของไฟล์ทั้งหมดในโปรเจกต์ณเวลาหนึ่งที่เราเลือกเก็บไว้เพื่อย้อนกลับมาดูได้ทุกเมื่อไม่ว่าจะเป็นวันนี้";
  assert.ok(!shortPara.includes(" "));
  assert.ok(wordCount(shortPara) > 20 && wordCount(shortPara) <= LIMITS.words, "precondition: a short paragraph");
  assert.deepEqual(warningsOf(`step ${thaiTitle}\n  ${shortPara}`, thaiTitle), []);

  // The same text twice is a long paragraph (more than 45 words) that has no spaces.
  const longPara = shortPara + shortPara;
  const words = wordCount(longPara);
  assert.ok(words > LIMITS.words, "precondition: over 45 words");
  assert.ok(!longPara.includes(" "));
  assert.deepEqual(warningsOf(`step Go: Go\n  ${longPara}`), [`line 7: paragraph has ${words} words (keep it to 45)`]);

  // A Thai title that is long even by graphemes still warns, with the grapheme count.
  const longTitle = thaiTitle.repeat(2);
  assert.ok(graphemeCount(longTitle) > LIMITS.title);
  assert.deepEqual(warningsOf("subtitle: x", longTitle), [`line 5: title has ${graphemeCount(longTitle)} characters (keep it to 32)`]);
});

test("half-typed lines warn instead of throwing", () => {
  assert.deepEqual(warningsOf("places: you = laptop"), ['line 6: could not read place "you = laptop"']);
  assert.deepEqual(warningsOf("step Save:"), ["line 6: step needs a title"]);
  assert.deepEqual(warningsOf('places: you = laptop "You" | me = box "Me"\nrails: you - me\nstep Go: Go\n  move: you ->'),
    ['line 9: could not read move "you ->"']);
  for (const body of ["places:", "rails:", "pucks:", "goals:", "set:", "step", "step ", "quiz ", "quiz", "  * ", ":", "tip ", "move:"]) {
    assert.doesNotThrow(() => run(body), body);
  }
});

test("parseLesson never throws, whatever it is given", () => {
  for (const block of [undefined, null, 0, "text", {}, { body: 5, info: 5, line: "x" }, { body: null }, { info: {}, body: [] }]) {
    const { lesson, warnings } = parseLesson(block);
    assert.ok(lesson && Array.isArray(warnings));
  }
  const bits = [
    "step ", "quiz ", "places: ", "rails: ", "move: ", "set: ", "cut: ", "show: ", "tip ", "- ", "* ", "|", "&", ",", "->", "<->",
    "=", ":", '"', "x2", "a", "b", "tint=", "at=1,", "@", "[how]", "[", "]", "\n", "\n", "\n  ", "__proto__", "constructor", "ที่"
  ];
  let seed = 7;
  const next = n => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 400; i++) {
    const body = Array.from({ length: 1 + next(40) }, () => bits[next(bits.length)]).join(next(2) ? " " : "");
    assert.doesNotThrow(() => parseLesson({ lang: "lesson", info: bits[next(bits.length)], body, line: 1 + next(50) }), JSON.stringify(body));
  }
  const { lesson } = run('places: __proto__ = box "P" | constructor = box "C"\nstep constructor: [constructor]\n  show: __proto__, toString');
  assert.deepEqual(lesson.places.map(p => p.id), ["__proto__", "constructor"]);
  assert.deepEqual(lesson.steps[0].show, ["__proto__"]);
  assert.equal(lesson.steps[0].chapter, "how");
});
