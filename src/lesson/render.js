// clarify/src/lesson/render.js
// A `lesson` fence → the lesson player's HTML: header, counter chips, the stage (static SVG with
// flat name tags), the place key, the legend, the timeline, and the guide with one article per
// step plus the quiz. A JSON model carries what the runtime (src/runtime/lesson.js) needs to
// switch steps and move pucks. Every article is in the page; the runtime hides all but one, so
// a reader without JavaScript still gets the whole lesson as a list.
//
// HTML contract (src/runtime/lesson.css and lesson.js rely on it):
//   section.c-lesson[data-lesson=n][tabindex=0][aria-label="Lesson: …"]
//     header.l-head: h3.l-title, p.l-sub, ul.l-meta (meta items, then "N steps")
//     .l-body > .l-main: .l-counters (.l-chip[data-counter][data-level] > .l-chip-k + .l-chip-v,
//                                     .l-tools > button[data-l=replay], button[data-l=pause][aria-pressed])
//                        .l-stage (svg.l-svg, .l-tags > span.l-tag[data-place][data-n]), ol.l-key[hidden],
//                        ul.l-legend, ol.l-timeline > li > button[data-step]
//             > aside.l-guide: .l-top (.l-count, .l-chapter, button[data-l=comment]),
//                        article.l-step[data-step][data-line][data-chapter] per step, article.l-step.l-quiz,
//                        .l-nav (button[data-l=back], button[data-l=next]), p.l-keys, .l-goals li[data-at],
//                        p.l-live[aria-live]
//     script.l-model: { n, origin, rails, states, shorts, places }

import { renderInline, escapeHtml, plainInline } from "../markdown.js";
import { CHAPTERS, PUCK_KINDS } from "./kinds.js";
import { parseLesson } from "./parse.js";
import { lessonStates } from "./state.js";
import { layoutBench } from "./layout.js";
import { renderStage } from "./stage.js";

/** @typedef {import("../types").Lesson} Lesson */
/** @typedef {import("../types").LessonStep} LessonStep */
/** @typedef {import("../types").LessonQuiz} LessonQuiz */

const COMMENT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const KEY_TERM = /==(?=\S)([^\n]*?\S)==/g;

/**
 * @param {{ lang?: string, info?: string, body?: string, line?: number }} block a `lesson` fence from tokenizeBlocks
 * @param {number} n the lesson's index on its page; it prefixes every SVG id, so two lessons never collide
 * @returns {{ html: string, warnings: string[] }} warnings from the parser and the bench layout, in draft-line order
 */
export function renderLesson(block, n) {
  const { lesson, warnings: parsed } = parseLesson(block);
  const layout = layoutBench(lesson);
  const stage = renderStage(lesson, layout, n);
  const states = lessonStates(lesson); // one per step, plus one for the quiz when there is one
  const total = states.length;
  const places = lesson.places.filter((place) => stage.tags[place.id]);
  const shorts = [...lesson.steps.map((step) => step.short), ...(lesson.quiz ? ["Quiz"] : [])].map(plain);
  const first = lesson.steps[0];

  const chipValues = states[0]?.counters ?? lesson.counters.map((label) => ({ label, value: "—", level: "none" }));
  const chips = chipValues
    .map((c, i) => `<div class="l-chip" data-counter="${i}" data-level="${escapeHtml(c.level)}"><span class="l-chip-k">${escapeHtml(c.label)}</span><span class="l-chip-v">${escapeHtml(c.value)}</span></div>`)
    .join("");
  const tools = `<div class="l-tools"><button type="button" class="l-btn" data-l="replay">Replay</button><button type="button" class="l-btn" data-l="pause" aria-pressed="false">Pause</button></div>`;

  const name = (place) => inline(place.label || place.id);
  const tags = places
    .map((place, i) => {
      const [left, top] = stage.tags[place.id];
      return `<span class="l-tag" data-place="${escapeHtml(place.id)}" data-n="${i + 1}" style="left:${left}%;top:${top}%"><span class="l-tag-t">${name(place)}</span></span>`;
    })
    .join("");
  const key = places
    .map((place, i) => `<li data-place="${escapeHtml(place.id)}"><b>${i + 1}</b><i class="l-swatch" data-tint="${escapeHtml(stage.tints[place.id])}"></i><span>${name(place)}</span></li>`)
    .join("");

  const used = PUCK_KINDS.filter((kind) => lesson.steps.some((step) => step.moves.some((m) => m.kind === kind || (kind === "reply" && m.roundTrip))));
  const legend = used.length
    ? `<ul class="l-legend" aria-label="Legend">${used.map((kind) => `<li><i class="l-dot" data-kind="${kind}"></i>${inline(lesson.pucks[kind] || kind)}</li>`).join("")}</ul>`
    : "";
  const timeline = shorts
    .map((short, i) => `<li><button type="button" data-step="${i}"><b>${i + 1}</b><span>${escapeHtml(short)}</span></button></li>`)
    .join("");

  const main =
    `<div class="l-main"><div class="l-counters">${chips}${tools}</div>` +
    `<div class="l-stage">${stage.svg}<div class="l-tags" aria-hidden="true">${tags}</div></div>` +
    `<ol class="l-key" hidden aria-label="Places">${key}</ol>${legend}` +
    `<ol class="l-timeline" style="--n:${Math.max(total, 1)}">${timeline}</ol></div>`;

  const chapter = first ? first.chapter : "quiz";
  const top =
    `<div class="l-top"><span class="l-count">Step ${total ? 1 : 0} / ${total}</span>` +
    `<span class="l-chapter" data-chapter="${chapter}">${chapterLabel(chapter)}</span>` +
    `<button type="button" class="l-icon" data-l="comment" aria-label="Comment on this step">${COMMENT_ICON}</button></div>`;
  const articles = lesson.steps.map(stepArticle).join("") + (lesson.quiz ? quizArticle(lesson.quiz, lesson.steps.length) : "");
  const nav =
    `<div class="l-nav"><button type="button" class="l-btn" data-l="back" disabled>Back</button>` +
    `<button type="button" class="l-btn l-next" data-l="next">${total > 1 ? `Next: ${escapeHtml(shorts[1])}` : "Done"}</button></div>`;
  const goals = lesson.goals.length
    ? `<div class="l-goals"><b>You'll learn</b><ul>${lesson.goals.map((g) => `<li data-at="${g.at}"><i aria-hidden="true"></i><span>${inline(g.text)}</span></li>`).join("")}</ul></div>`
    : "";
  const guide =
    `<aside class="l-guide" aria-label="Lesson guide">${top}${articles}${nav}` +
    `<p class="l-keys">← → step · R replay · Space pause</p>${goals}<p class="l-live c-sr" aria-live="polite"></p></aside>`;

  const meta = [...lesson.meta, `${lesson.steps.length} ${lesson.steps.length === 1 ? "step" : "steps"}`];
  const head =
    `<header class="l-head"><h3 class="l-title">${inline(lesson.title)}</h3>` +
    (lesson.subtitle ? `<p class="l-sub">${inline(lesson.subtitle)}</p>` : "") +
    `<ul class="l-meta">${meta.map((item) => `<li>${inline(item)}</li>`).join("")}</ul></header>`;

  const model = { n, origin: stage.origin, rails: stage.rails, states, shorts, places: places.map((place) => place.id) };
  const title = plain(lesson.title);
  const html =
    `<section class="c-lesson" data-lesson="${n}" tabindex="0" aria-label="${escapeHtml(title ? `Lesson: ${title}` : "Lesson")}">` +
    `${head}<div class="l-body">${main}${guide}</div>` +
    `<script type="application/json" class="l-model">${jsonForScript(model)}</script></section>`;
  return { html, warnings: byLine([...parsed, ...layout.warnings]) };
}

/**
 * @param {LessonStep} step
 * @param {number} i
 */
function stepArticle(step, i) {
  const paras = step.paras.map((text) => `<p>${inline(text)}</p>`).join("");
  const tip = step.tip ? `<div class="l-tip is-${step.tip.kind}" role="note"><b>${inline(step.tip.title)}</b><p>${inline(step.tip.text)}</p></div>` : "";
  const takeaways = step.takeaways.length ? `<ul class="l-takeaways">${step.takeaways.map((text) => `<li>${inline(text)}</li>`).join("")}</ul>` : "";
  return (
    `<article class="l-step" data-step="${i}" data-line="${step.line}" data-chapter="${step.chapter}">` +
    `<div class="l-step-k">${chapterLabel(step.chapter)}</div><h4 class="l-step-title">${inline(step.title)}</h4>${paras}${tip}${takeaways}</article>`
  );
}

/**
 * The quiz: each option is a button carrying its reason, hidden until the reader picks one.
 * @param {LessonQuiz} quiz
 * @param {number} i its place in the timeline (after every step)
 */
function quizArticle(quiz, i) {
  const options = quiz.options
    .map((o) => `<button type="button" class="l-option" data-correct="${o.correct}"><span>${inline(o.text)}</span><span class="l-why" hidden>${inline(o.why)}</span></button>`)
    .join("");
  return (
    `<article class="l-step l-quiz" data-step="${i}" data-line="${quiz.line}" data-chapter="quiz">` +
    `<div class="l-step-k">Quiz</div><h4 class="l-step-title">${inline(quiz.question)}</h4>` +
    `<div class="l-options" role="group" aria-label="Answers">${options}</div></article>`
  );
}

const chapterLabel = (chapter) => (chapter === "quiz" ? "Quiz" : CHAPTERS[chapter]);

/**
 * Clarify's inline Markdown plus `==term==` → <mark>. Terms are marked outside code spans only
 * (the split matches renderInline's own code-span pattern), with control characters as stand-ins
 * so the marks survive renderInline's escaping.
 */
function inline(text) {
  const parts = String(text ?? "").replace(/[\u0001\u0002]/g, "").split(/(`[^`]+`)/);
  const marked = parts.map((part, i) => (i % 2 ? part : part.replace(KEY_TERM, "\u0001$1\u0002"))).join("");
  return renderInline(marked).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
}

/** Plain text for labels the runtime writes with textContent (and for aria-label). */
function plain(text) {
  return plainInline(text).replace(KEY_TERM, "$1");
}

/** Warnings sorted by their draft line; equal lines keep their order (parser first, then layout). */
function byLine(warnings) {
  const line = (w) => Number(/^line (\d+)/.exec(w)?.[1] ?? Infinity);
  return warnings.map((w, i) => ({ w, i })).sort((a, b) => line(a.w) - line(b.w) || a.i - b.i).map(({ w }) => w);
}

/** `<` and the two Unicode line separators, which must not appear raw inside a <script> element. */
const UNSAFE_IN_SCRIPT = new RegExp(`[<${String.fromCharCode(0x2028, 0x2029)}]`, "g");

/** JSON safe inside a <script> element (the same rule as jsonForScript in src/render.js). */
function jsonForScript(value) {
  return JSON.stringify(value).replace(UNSAFE_IN_SCRIPT, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
