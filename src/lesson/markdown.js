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
  return lessonModelToMarkdown(parseLesson(block).lesson);
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

/** The places as a left-to-right flowchart: a line per rail, then each place no rail touches. */
function routeMap({ places, rails }) {
  if (!places.length) return "";
  const byId = new Map(places.map((p) => [p.id, p]));
  const node = (id) => `${id}["${label(byId.get(id)?.label ?? id)}"]`;
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
