import test from "node:test";
import assert from "node:assert/strict";
import { OBJECT_KINDS } from "../src/lesson/kinds.js";
import { parseLesson } from "../src/lesson/parse.js";
import { layoutBench } from "../src/lesson/layout.js";
import { lessonStates } from "../src/lesson/state.js";
import { buildIsokitScenes, placeTints } from "../src/lesson/isokit-scenes.js";
import { validateIsokitLesson } from "../src/lesson/isokit-validate.js";
import { MINI } from "./fixtures/lesson-mini.js";

const fence = (...body) => ({ type: "fence", lang: "lesson", info: "Bench", line: 1, body: body.join("\n") });

test("all 15 Markdown place kinds translate to valid isokit scenes with zero validator warnings", () => {
  for (let i = 0; i < OBJECT_KINDS.length; i += 5) {
    const chunk = OBJECT_KINDS.slice(i, i + 5);
    const parsed = parseLesson(fence(
      `places: ${chunk.map((k, idx) => `p${idx} = ${k} "Node ${k}"`).join(" | ")}`,
      `rails: ${chunk.map((_, idx) => `p${idx}`).join(" - ")}`,
      "",
      "step One: Check all [how]",
      "  Moving through every kind.",
      `  show: ${chunk.map((_, idx) => `p${idx}`).join(", ")}`,
      "  move: p0 -> p1"
    )).lesson;
    const layout = layoutBench(parsed);
    const states = lessonStates(parsed);
    const { scenes } = buildIsokitScenes(parsed, layout, states);
    assert.equal(scenes.length, 1);
    const warnings = validateIsokitLesson({
      title: "Kinds check",
      steps: [{ short: "One", title: "Check all", scene: scenes[0] }]
    }, 1);
    assert.deepEqual(warnings, [], chunk.join(", "));
  }
});

test("tints follow rail-chain order and explicit tints keep their turn", () => {
  const parsed = parseLesson(fence(
    'places: db = server "DB" | api = server "API" tint=rose | client = laptop "Client" | lone = box "Lone"',
    "rails: client - api - db"
  )).lesson;
  assert.deepEqual(placeTints(parsed), { client: "neutral", api: "rose", db: "violet", lone: "blue" });
});

test("buildIsokitScenes reveals places progressively and encodes focus, fail, cut and roundTrip", () => {
  const lesson = parseLesson(MINI).lesson;
  const layout = layoutBench(lesson);
  const states = lessonStates(lesson);
  const { scenes } = buildIsokitScenes(lesson, layout, states);
  assert.equal(scenes.length, 4); // 3 steps + quiz

  // Step 1: only "you" is live (progressive reveal).
  assert.deepEqual(Object.keys(scenes[0].entities), ["you"]);
  assert.equal(scenes[0].entities.you.type, "device");
  assert.equal(scenes[0].entities.you.form, "laptop");

  // Step 2: "you" and "tray" are live, connected by an active flow.
  assert.deepEqual(Object.keys(scenes[1].entities), ["you", "tray"]);
  assert.equal(scenes[1].flows.length, 1);
  assert.equal(scenes[1].flows[0].kind, "req");

  // Step 3: rejected push — origin is failed (heat + dead + ERROR tag), repo--origin link fails packets.
  assert.equal(scenes[2].entities.origin.dead, 1);
  assert.ok(scenes[2].entities.origin.heat > 0.5);
  assert.equal(scenes[2].links["repo--origin"].fail, 1);

  // Explicit cut + roundTrip move.
  const cutParsed = parseLesson(fence(
    'places: a = server "API" | b = database "DB"',
    "rails: a - b",
    "",
    "step Cut: Link cut [case]",
    "  Cut rail.",
    "  move: a <-> b",
    "  cut: a - b"
  )).lesson;
  const cutScenes = buildIsokitScenes(cutParsed, layoutBench(cutParsed), lessonStates(cutParsed)).scenes;
  assert.equal(cutScenes[0].links["a--b"].style, "cut");
  assert.equal(cutScenes[0].links["a--b"].heads, "both");
  assert.equal(cutScenes[0].links["a--b"].fail, 1);
});

test("validateIsokitLesson catches unknown types, colors, icons, tight spacing, zone crossings and broken routes", () => {
  const bad = {
    title: "Broken",
    metrics: [{ key: "ok", label: "OK" }],
    steps: [
      {
        short: "Bad",
        title: "Problems",
        metrics: { missingMetric: 1 },
        changes: ["bad prefix"],
        scene: {
          entities: {
            z: { type: "zone", x0: -2, x1: 12, y0: -2, y1: 12, label: "CLUSTER" },
            a: { type: "block", x: 0, y: 0, color: "neon", glyph: "notAnIcon", label: ["A"] },
            b: { type: "block", x: 5, y: 0, color: "blue", glyph: "server", label: ["B"] },
            c: { type: "unknownShape", x: 10, y: 10 }
          },
          links: {
            ab: { from: "a", to: "b", pts: ["a", "b"] },
            broken: { from: "b", to: "a", pts: ["b", "a"] }
          },
          flows: [
            { route: ["ab", "ab"], rate: 1 } // ab ends at b, second ab starts at a -> jump!
          ]
        }
      }
    ],
    quiz: {
      question: "Pick?",
      options: [{ text: "Only one", correct: false }]
    }
  };
  const warnings = validateIsokitLesson(bad, 10);
  const text = warnings.join("\n");
  assert.match(text, /unknown color "neon"/);
  assert.match(text, /unknown glyph "notAnIcon"/);
  assert.match(text, /unknown type "unknownShape"/);
  assert.match(text, /blocks "a" and "b" are .* units apart/);
  assert.match(text, /route hops from "ab"/);
  assert.match(text, /metric "missingMetric" is not declared/);
  assert.match(text, /should start with/);
  assert.match(text, /has 1 options/);
  assert.match(text, /exactly one correct option/);
});
