// clarify/src/lesson/render.js
// A `lesson` / `isokit` / `iso` fence → the Clarify lesson player powered by isokit's
// animated isometric Stage (src/isokit + src/runtime/isokit.js + src/runtime/lesson.js).
//
// Two authoring modes share one player shell:
//   1. Clarify Markdown `lesson` syntax (places, rails, steps, moves, quiz) — compiled into
//      isokit scenes via buildIsokitScenes(), 100% compatible with existing Clarify drafts.
//   2. Native isokit JSON (`isokit` / `iso` fence, or `lesson` fence starting with `{`) —
//      supports all isokit primitives (block, db, crowd, device, zone, queue, panel, note,
//      ring, ghost), custom coordinates, elbow links, link labels, flows, metrics & changes.

import { renderInline, escapeHtml, plainInline } from "../markdown.js";
import { resolveLesson } from "../isokit/stage/lesson.js";
import { packetShape } from "../isokit/iso/packets.js";
import { CHAPTERS, PUCK_KINDS } from "./kinds.js";
import { parseLesson } from "./parse.js";
import { lessonStates } from "./state.js";
import { layoutBench } from "./layout.js";
import { buildIsokitScenes, PUCK_TO_PACKET } from "./isokit-scenes.js";
import { validateIsokitLesson } from "./isokit-validate.js";

const COMMENT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const KEY_TERM = /==(?=\S)([^\n]*?\S)==/g;

const ALL_CHAPTERS = {
  ...CHAPTERS,
  setup: "Setup",
  solution: "Solution",
  technique: "Technique",
  tradeoff: "Trade-off",
  insight: "Insight",
  quiz: "Quiz"
};

const CALLOUT_TITLES = {
  tip: "Good to know",
  idea: "Key idea",
  insight: "Key idea",
  try: "Try it",
  warn: "Watch out"
};

const CALLOUT_CLASS = {
  tip: "is-idea",
  idea: "is-idea",
  insight: "is-idea",
  try: "is-try",
  warn: "is-warn"
};

const DEFAULT_LEGEND = {
  req: "request",
  res: "response",
  heavy: "heavy request",
  ping: "health check",
  write: "write",
  msg: "message",
  push: "response",
  mine: "stored",
  slow: "slow",
  kill: "failed",
  fail: "failed"
};

/**
 * @param {{ lang?: string, info?: string, body?: string, line?: number }} block
 * @param {number} n lesson index on the page
 * @returns {{ html: string, warnings: string[] }}
 */
export function renderLesson(block, n) {
  const rawBody = typeof block?.body === "string" ? block.body.trim() : "";
  const isJson = block?.lang === "isokit" || block?.lang === "iso" || rawBody.startsWith("{");
  return isJson ? renderIsokitJsonLesson(block, n) : renderMarkdownLesson(block, n);
}

// ── Mode 1: Clarify Markdown `lesson` → isokit Stage ───────────────────────────

function renderMarkdownLesson(block, n) {
  const { lesson, warnings: parsed } = parseLesson(block);
  const layout = layoutBench(lesson);
  const states = lessonStates(lesson);
  const { scenes } = buildIsokitScenes(lesson, layout, states);
  const total = states.length;
  const shorts = [...lesson.steps.map((s) => s.short), ...(lesson.quiz ? ["Quiz"] : [])].map(plain);
  const first = lesson.steps[0];

  const chipSpecs = lesson.counters.map((label, i) => ({ key: String(i), label }));
  const stepChips = states.map((st) =>
    st.counters.map((c, i) => ({ key: String(i), value: c.value, level: c.level, changed: c.changed }))
  );

  const usedKinds = PUCK_KINDS.filter((kind) =>
    lesson.steps.some((step) => step.moves.some((m) => m.kind === kind || (kind === "reply" && m.roundTrip)))
  );
  const legendItems = usedKinds.map((kind) => ({
    kind: kind === "reply" ? "res" : PUCK_TO_PACKET[kind] || "req",
    label: lesson.pucks[kind] || kind
  }));

  const articles =
    lesson.steps.map(stepArticle).join("") +
    (lesson.quiz ? quizArticle(lesson.quiz, lesson.steps.length) : "");

  const model = {
    n,
    mode: "markdown",
    scenes,
    chips: stepChips,
    shorts,
    theme: null
  };

  const html = buildLessonHtml({
    n,
    title: lesson.title,
    subtitle: lesson.subtitle,
    meta: [...lesson.meta, `${lesson.steps.length} ${lesson.steps.length === 1 ? "step" : "steps"}`],
    chipSpecs,
    initialChips: stepChips[0] || [],
    legendItems,
    shorts,
    total,
    firstChapter: first ? first.chapter : "quiz",
    articles,
    goals: lesson.goals,
    model
  });

  return { html, warnings: byLine([...parsed, ...layout.warnings]) };
}

// ── Mode 2: Native `isokit` JSON lesson ────────────────────────────────────────

function renderIsokitJsonLesson(block, n) {
  const line = Number.isInteger(block?.line) ? block.line : 1;
  const warnings = [];
  let raw;
  try {
    raw = JSON.parse(block?.body || "{}");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`line ${line}: invalid isokit JSON (${msg})`);
    return {
      html: `<section class="c-lesson is-error" data-lesson="${n}"><p class="l-error">Invalid isokit JSON: ${escapeHtml(msg)}</p></section>`,
      warnings
    };
  }

  warnings.push(...validateIsokitLesson(raw, line));
  const resolved = resolveLesson(raw);
  const title = resolved.title || (typeof block?.info === "string" ? block.info.trim() : "") || "Interactive Lesson";
  const subtitle = resolved.subtitle || "";
  const rawSteps = Array.isArray(resolved.steps) ? resolved.steps : [];

  const quiz = normalizeJsonQuiz(resolved.quiz, line);
  const total = rawSteps.length + (quiz ? 1 : 0);
  const shorts = [
    ...rawSteps.map((s, i) => plain(s.short || s.title || `Step ${i + 1}`)),
    ...(quiz ? ["Quiz"] : [])
  ];

  const scenes = rawSteps.map((s) => s.scene || { entities: {}, links: {}, flows: [] });
  if (quiz) scenes.push(scenes.at(-1) || { entities: {}, links: {}, flows: [] });

  const metrics = Array.isArray(resolved.metrics) ? resolved.metrics : [];
  const chipSpecs = metrics.map((m) => ({
    key: String(m.key),
    label: String(m.label || m.key),
    unit: m.unit || ""
  }));

  const stepChips = rawSteps.map((s, idx) => {
    const prev = idx > 0 ? rawSteps[idx - 1].metrics || {} : {};
    const cur = s.metrics || {};
    return chipSpecs.map((spec) => {
      const val = cur[spec.key];
      const prevVal = prev[spec.key];
      let level = "none";
      let display = val;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        display = val.value ?? "—";
        level = val.level || "none";
      }
      return {
        key: spec.key,
        value: display === null || display === undefined ? "—" : display,
        unit: spec.unit,
        level,
        changed: idx > 0 ? JSON.stringify(prevVal) !== JSON.stringify(val) : display !== null && display !== undefined && display !== "—"
      };
    });
  });
  if (quiz) {
    stepChips.push((stepChips.at(-1) || []).map((c) => ({ ...c, changed: false })));
  }

  const legendItems = (Array.isArray(resolved.legend) ? resolved.legend : []).map((item) =>
    typeof item === "string"
      ? { kind: item, label: DEFAULT_LEGEND[item] || item }
      : { kind: item.kind || "req", label: item.label || DEFAULT_LEGEND[item.kind] || item.kind || "" }
  );

  const meta = [
    ...(Array.isArray(resolved.meta) ? resolved.meta : typeof resolved.meta === "string" ? [resolved.meta] : []),
    `${rawSteps.length} ${rawSteps.length === 1 ? "step" : "steps"}`
  ];

  const goals = (Array.isArray(resolved.goals) ? resolved.goals : []).map((g, i) =>
    typeof g === "string" ? { text: g, at: i + 1 } : { text: String(g.text || ""), at: Number(g.at) || 1 }
  );

  const articles =
    rawSteps.map((s, i) => jsonStepArticle(s, i, line)).join("") +
    (quiz ? quizArticle(quiz, rawSteps.length) : "");

  const model = {
    n,
    mode: "isokit",
    scenes,
    chips: stepChips,
    shorts,
    theme: resolved.theme || null
  };

  const html = buildLessonHtml({
    n,
    title,
    subtitle,
    meta,
    chipSpecs,
    initialChips: stepChips[0] || [],
    legendItems,
    shorts,
    total,
    firstChapter: rawSteps[0]?.chapter || (quiz ? "quiz" : "setup"),
    articles,
    goals,
    model
  });

  return { html, warnings };
}

function normalizeJsonQuiz(q, line) {
  if (!q || typeof q !== "object" || !q.question || !Array.isArray(q.options)) return null;
  return {
    question: String(q.question),
    line,
    options: q.options.map((o) => ({
      text: String(o.text || ""),
      correct: Boolean(o.correct),
      why: String(o.why || "")
    }))
  };
}

// ── Shared Clarify Lesson Player HTML ──────────────────────────────────────────

function buildLessonHtml({ n, title, subtitle, meta, chipSpecs, initialChips, legendItems, shorts, total, firstChapter, articles, goals, model }) {
  const chips = chipSpecs
    .map((spec, i) => {
      const init = initialChips[i] || { value: "—", level: "none", unit: spec.unit || "" };
      const shown = formatChipValue(init.value, init.unit || spec.unit || "");
      return `<div class="l-chip" data-counter="${i}" data-level="${escapeHtml(init.level || "none")}"><span class="l-chip-k">${escapeHtml(spec.label)}</span><span class="l-chip-v">${escapeHtml(shown)}</span></div>`;
    })
    .join("");

  const tools =
    `<div class="l-tools">` +
    `<button type="button" class="l-btn" data-l="fit" hidden>Fit</button>` +
    `<button type="button" class="l-btn" data-l="replay">Replay</button>` +
    `<button type="button" class="l-btn" data-l="pause" aria-pressed="false">Pause</button>` +
    `</div>`;

  const legend = legendItems.length
    ? `<ul class="l-legend" aria-label="Legend">${legendItems
        .map((item) => {
          const pktClass = item.kind === "res" ? "iso-pkt--req iso-pkt--back" : `iso-pkt--${escapeHtml(item.kind)}`;
          const shape = packetShape(item.kind === "fail" ? "kill" : item.kind);
          return `<li><svg class="l-pkt-swatch" viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true"><g class="iso-pkt ${pktClass}">${shape}</g></svg><span>${inline(item.label)}</span></li>`;
        })
        .join("")}</ul>`
    : "";

  const timeline = shorts
    .map((short, i) => `<li><button type="button" data-step="${i}" aria-label="${escapeHtml(`Step ${i + 1}: ${short}`)}"><b>${i + 1}</b><span>${escapeHtml(short)}</span></button></li>`)
    .join("");

  const main =
    `<div class="l-main">` +
    `<div class="l-counters">${chips}${tools}</div>` +
    `<div class="l-stage"><div class="l-iso-host" aria-label="${escapeHtml(plain(title) || "Animated isometric diagram")}"></div></div>` +
    `${legend}` +
    `<ol class="l-timeline" style="--n:${Math.max(total, 1)}">${timeline}</ol>` +
    `</div>`;

  const top =
    `<div class="l-top"><span class="l-count">Step ${total ? 1 : 0} / ${total}</span>` +
    `<span class="l-chapter" data-chapter="${escapeHtml(firstChapter)}">${escapeHtml(chapterLabel(firstChapter))}</span>` +
    `<button type="button" class="l-icon" data-l="comment" aria-label="Comment on this step">${COMMENT_ICON}</button></div>`;

  const nav =
    `<div class="l-nav"><button type="button" class="l-btn" data-l="back" disabled>Back</button>` +
    `<button type="button" class="l-btn l-next" data-l="next">${total > 1 ? `Next: ${escapeHtml(shorts[1])}` : "Done"}</button></div>`;

  const goalsHtml = goals.length
    ? `<div class="l-goals"><b>You'll learn</b><ul>${goals.map((g) => `<li data-at="${g.at}"><i aria-hidden="true"></i><span>${inline(g.text)}</span></li>`).join("")}</ul></div>`
    : "";

  const guide =
    `<aside class="l-guide" aria-label="Lesson guide">${top}${articles}${nav}` +
    `<p class="l-keys">← → step · R replay · Space pause · X xray</p>${goalsHtml}<p class="l-live c-sr" aria-live="polite"></p></aside>`;

  const head =
    `<header class="l-head"><h3 class="l-title">${inline(title)}</h3>` +
    (subtitle ? `<p class="l-sub">${inline(subtitle)}</p>` : "") +
    `<ul class="l-meta">${meta.map((item) => `<li>${inline(item)}</li>`).join("")}</ul></header>`;

  const plainTitle = plain(title);
  return (
    `<section class="c-lesson" data-lesson="${n}" tabindex="0" aria-label="${escapeHtml(plainTitle ? `Lesson: ${plainTitle}` : "Lesson")}">` +
    `${head}<div class="l-body">${main}${guide}</div>` +
    `<script type="application/json" class="l-model">${jsonForScript(model)}</script></section>`
  );
}

function stepArticle(step, i) {
  const paras = step.paras.map((text) => `<p>${inline(text)}</p>`).join("");
  const tip = step.tip ? `<div class="l-tip is-${step.tip.kind}" role="note"><b>${inline(step.tip.title)}</b><p>${inline(step.tip.text)}</p></div>` : "";
  const takeaways = step.takeaways.length ? `<ul class="l-takeaways">${step.takeaways.map((text) => `<li>${inline(text)}</li>`).join("")}</ul>` : "";
  return (
    `<article class="l-step" data-step="${i}" data-line="${step.line}" data-chapter="${escapeHtml(step.chapter)}">` +
    `<div class="l-step-k">${escapeHtml(chapterLabel(step.chapter))}</div><h4 class="l-step-title">${inline(step.title)}</h4>${paras}${tip}${takeaways}</article>`
  );
}

function jsonStepArticle(step, i, line) {
  const chapter = step.chapter || "setup";
  const rawBody = Array.isArray(step.body) ? step.body : step.body ? [step.body] : step.text ? [step.text] : [];
  const paras = rawBody.map((p) => `<p>${inline(p)}</p>`).join("");
  const callout = step.callout
    ? `<div class="l-tip ${CALLOUT_CLASS[step.callout.kind] || "is-idea"}" role="note"><b>${inline(step.callout.title || CALLOUT_TITLES[step.callout.kind] || "Key idea")}</b><p>${inline(step.callout.text || "")}</p></div>`
    : "";
  const changes = Array.isArray(step.changes) && step.changes.length
    ? `<div class="l-changes"><b>What changed</b><ul>${step.changes
        .map((c) => {
          const m = /^([+~\-−])\s+(.*)$/.exec(String(c));
          const mark = m ? m[1] : "~";
          const cls = mark === "+" ? "is-add" : mark === "~" ? "is-mod" : "is-del";
          const sym = mark === "-" ? "−" : mark;
          return `<li class="${cls}"><span class="l-mk" aria-hidden="true">${sym}</span><span>${inline(m ? m[2] : c)}</span></li>`;
        })
        .join("")}</ul></div>`
    : "";
  const takeaways = Array.isArray(step.takeaways) && step.takeaways.length
    ? `<ul class="l-takeaways">${step.takeaways.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`
    : "";
  return (
    `<article class="l-step" data-step="${i}" data-line="${line}" data-chapter="${escapeHtml(chapter)}">` +
    `<div class="l-step-k">${escapeHtml(chapterLabel(chapter))}</div>` +
    `<h4 class="l-step-title">${inline(step.title || `Step ${i + 1}`)}</h4>` +
    `${paras}${callout}${changes}${takeaways}</article>`
  );
}

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

function formatChipValue(val, unit = "") {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "number") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(val)}${unit}`;
  return `${val}${unit}`;
}

const chapterLabel = (chapter) => ALL_CHAPTERS[chapter] || chapter || "Step";

function inline(text) {
  const parts = String(text ?? "").replace(/[\u0001\u0002]/g, "").split(/(`[^`]+`)/);
  const marked = parts.map((part, i) => (i % 2 ? part : part.replace(KEY_TERM, "\u0001$1\u0002"))).join("");
  return renderInline(marked).replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
}

function plain(text) {
  return plainInline(text).replace(KEY_TERM, "$1");
}

function byLine(warnings) {
  const line = (w) => Number(/^line (\d+)/.exec(w)?.[1] ?? Infinity);
  return warnings.map((w, i) => ({ w, i })).sort((a, b) => line(a.w) - line(b.w) || a.i - b.i).map(({ w }) => w);
}

const UNSAFE_IN_SCRIPT = new RegExp(`[<${String.fromCharCode(0x2028, 0x2029)}]`, "g");
function jsonForScript(value) {
  return JSON.stringify(value).replace(UNSAFE_IN_SCRIPT, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
