import test from "node:test";
import assert from "node:assert/strict";
import { parseLesson } from "../src/lesson/parse.js";
import { railId, lessonStates } from "../src/lesson/state.js";
import { MINI } from "./fixtures/lesson-mini.js";

const lesson = parseLesson(MINI).lesson;

test("railId resolves declared rails in either direction", () => {
  assert.deepEqual(railId(lesson, "you", "tray"), { id: "you--tray", reverse: false });
  assert.deepEqual(railId(lesson, "origin", "mate"), { id: "origin--mate", reverse: false });
  assert.deepEqual(railId(lesson, "mate", "origin"), { id: "origin--mate", reverse: true });
  assert.equal(railId(lesson, "you", "origin"), null);
});

test("states follow the story", () => {
  const s = lessonStates(lesson);
  assert.equal(s.length, 4);
  assert.deepEqual(s.map((x) => x.live), [
    ["you"],
    ["you", "tray"],
    ["you", "tray", "repo", "origin", "mate"],
    ["you", "tray", "repo", "origin", "mate"]
  ]);
  assert.deepEqual(s[1].moves, [
    { rail: "you--tray", reverse: false, kind: "change", count: 2, together: false, roundTrip: false }
  ]);
  assert.deepEqual(s[2].moves[0],
    { rail: "origin--mate", reverse: true, kind: "reply", count: 1, together: false, roundTrip: false });
  assert.deepEqual(s[2].routes, ["origin--mate", "repo--origin"]);
  assert.deepEqual(s[2].fail, ["origin"]);
  assert.deepEqual(s[1].focus, ["tray"]);
});

test("counters carry forward and flag changes", () => {
  const s = lessonStates(lesson);
  assert.deepEqual(s[1].counters, [
    { label: "Staged", value: "2 files", level: "good", changed: true },
    { label: "Pushed", value: "—", level: "none", changed: false }
  ]);
  assert.equal(s[2].counters[0].changed, false);
  assert.deepEqual(s[2].counters[1], { label: "Pushed", value: "rejected", level: "bad", changed: true });
});

test("goals tick by step and the quiz keeps the machine", () => {
  const s = lessonStates(lesson);
  assert.deepEqual(s.map((x) => x.goals), [0, 1, 1, 1]);
  assert.deepEqual(s[3].moves, []);
  assert.deepEqual(s[3].routes, []);
  assert.deepEqual(s[3].live, s[2].live);
  assert.deepEqual(s[3].counters.map((c) => c.changed), [false, false]);
  assert.deepEqual(s[3].counters.map((c) => c.value), ["2 files", "rejected"]);
});

test("no quiz means no quiz state", () => {
  const noQuiz = { ...lesson, quiz: null };
  assert.equal(lessonStates(noQuiz).length, 3);
});
