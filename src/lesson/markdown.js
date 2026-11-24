// clarify/src/lesson/markdown.js
// A `lesson` fence → GitHub-flavored Markdown, for `clarify md` and "Copy as Markdown".
// GitHub cannot play the stage, so the lesson becomes what it can show: the places as a
// Mermaid flowchart, the steps as a numbered list (tip and takeaways nested under their
// step) and the quiz as a task list with the right answer ticked.

import { parseLesson } from "./parse.js";

/** @typedef {import("../types").Lesson} Lesson */

const KEY_TERM = /==(?=\S)([^\n]*?\S)==/g;

/**
 * Lesson-only `==term==` highlight, which GitHub has no syntax for, outside code spans.
 * `emphasis` writes it as bold; text that is already inside bold drops the marks instead.
 */
const text = (s, emphasis = true) =>
  String(s ?? "")
    .split(/(`[^`]+`)/)
    .map((part, i) => (i % 2 ? part : part.replace(KEY_TERM, emphasis ? "**$1**" : "$1")))
    .join("");

/** Mermaid label text: `"` is the quoting character, so it becomes the `#quot;` entity. */
const label = (s) => String(s ?? "").replace(/\s+/g, " ").trim().replace(/"/g, "#quot;");

/**
 * @param {{ lang?: string, info?: string, body?: string, line?: number }} block a `lesson` fence from tokenizeBlocks
 * @returns {string} Markdown with single blank lines between its blocks and no trailing newline
 */
export function lessonToMarkdown(block) {
  const rawBody = typeof block?.body === "string" ? block.body.trim() : "";
  if (block?.lang === "isokit" || block?.lang === "iso" || rawBody.startsWith("{")) {
    return isokitJsonToMarkdown(block);
  }
  return lessonModelToMarkdown(parseLesson(block).lesson);
}

function isokitJsonToMarkdown(block) {
  let data;
  try { data = JSON.parse(block.body || "{}"); } catch { return ""; }
  const out = [];
  if (data.title) out.push(`### ${text(data.title, false)}`);
  if (data.subtitle) out.push(`_${text(data.subtitle)}_`);
  const steps = Array.isArray(data.steps) ? data.steps : [];
  if (steps.length) {
    out.push(steps.map((s, i) => {
      const body = Array.isArray(s.body) ? s.body : s.body ? [s.body] : [];
      const head = [`**${text(s.title || `Step ${i + 1}`, false)}**`, ...body.map((p) => text(p))].join(" ");
      const lines = [`${i + 1}. ${head}`];
      if (s.callout?.text) lines.push(`   > **${text(s.callout.title || "Note", false)}:** ${text(s.callout.text)}`);
      return lines.join("\n");
    }).join("\n"));
  }
  if (data.quiz?.question && Array.isArray(data.quiz.options)) {
    const opts = data.quiz.options.map((o) => `- [${o.correct ? "x" : " "}] ${[text(o.text), o.why && text(o.why)].filter(Boolean).join(" — ")}`);
    out.push([`**Quiz: ${text(data.quiz.question, false)}**`, "", ...opts].join("\n"));
  }
  return out.join("\n\n");
}

/**
 * @param {Pick<Lesson, "title" | "subtitle" | "places" | "rails" | "steps" | "quiz">} lesson an already parsed lesson
 * @returns {string}
 */
export function lessonModelToMarkdown(lesson) {
  const out = [];
  if (lesson.title) out.push(`### ${text(lesson.title, false)}`);
  if (lesson.subtitle) out.push(`_${text(lesson.subtitle)}_`);

  const map = routeMap(lesson);
  if (map) out.push(map);

  if (lesson.steps.length) out.push(lesson.steps.map(stepToMarkdown).join("\n"));

  const quiz = lesson.quiz;
  if (quiz) {
    const options = quiz.options.map((o) => `- [${o.correct ? "x" : " "}] ${[text(o.text), o.why && text(o.why)].filter(Boolean).join(" — ")}`);
    out.push([`**Quiz: ${text(quiz.question, false)}**`, ...(options.length ? ["", ...options] : [])].join("\n"));
  }
  return out.join("\n\n");
}

// Words Mermaid reads as syntax where a node id goes (compared case-insensitively).
const MERMAID_WORDS = new Set([
  "end", "graph", "flowchart", "subgraph", "style", "class", "classdef", "click", "default",
  "linkstyle", "direction", "interpolate", "call", "href"
]);
// Letters, digits and `_`, with single hyphens between them. Anything else (brackets, `:`, `"`,
// spaces, non-ASCII, `--`) can break Mermaid's node or edge syntax.
const SAFE_ID = /^[A-Za-z_]\w*(?:-\w+)*$/;
const isSafeId = (id) => SAFE_ID.test(id) && !MERMAID_WORDS.has(id.toLowerCase());

/**
 * Place id → Mermaid node id. A safe id passes through as parsed; any other becomes `n{index}`
 * (the place's position), with `_` added when a real id already has that name. Each id gets one
 * name, so every line a place appears in agrees.
 * @returns {(id: string) => string}
 */
function nodeNames(places) {
  const used = new Set(places.map((p) => p.id).filter(isSafeId));
  const names = new Map();
  const name = (id, index) => {
    if (!names.has(id)) {
      let n = id;
      if (!isSafeId(id)) {
        n = `n${index}`;
        while (used.has(n)) n += "_";
        used.add(n);
      }
      names.set(id, n);
    }
    return names.get(id);
  };
  places.forEach((p, i) => name(p.id, i));
  return (id) => name(id, names.size); // a rail end no place declares (never from the parser)
}

/** The places as a left-to-right flowchart: a line per rail, then each place no rail touches. */
function routeMap({ places, rails }) {
  if (!places.length) return "";
  const byId = new Map(places.map((p) => [p.id, p]));
  const nameOf = nodeNames(places);
  const node = (id) => `${nameOf(id)}["${label(byId.get(id)?.label ?? id)}"]`;
  const onRail = new Set(rails.flatMap((r) => [r.a, r.b]));
  const lines = [
    ...rails.map((r) => `  ${node(r.a)} --- ${node(r.b)}`),
    ...places.filter((p) => !onRail.has(p.id)).map((p) => `  ${node(p.id)}`)
  ];
  return ["```mermaid", "flowchart LR", ...lines, "```"].join("\n");
}

/** `N. **Title** paragraphs`, then the tip as a blockquote and the takeaways as bullets, indented under the marker. */
function stepToMarkdown(step, i) {
  const marker = `${i + 1}. `;
  const indent = " ".repeat(marker.length);
  const head = [`**${text(step.title, false)}**`, ...step.paras.map((p) => text(p))].join(" ");
  const lines = [`${marker}${head}`];
  if (step.tip) lines.push(`${indent}> **${text(step.tip.title, false)}:** ${text(step.tip.text)}`);
  for (const t of step.takeaways) lines.push(`${indent}- ${text(t)}`);
  return lines.join("\n");
}
