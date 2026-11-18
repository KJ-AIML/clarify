// clarify/src/lesson/parse.js
// Parser for the `lesson` fence: a line-based draft of a step-through lesson.
//
//   ```lesson How a Commit Travels
//   subtitle: Follow one saved change.             header keys, read before the first step/quiz:
//   meta: 10 min · Beginner                          subtitle · meta · places · rails · counters
//   places: you = laptop "Your folder" tint=violet at=2,0 | tray = tray "Staging"
//   rails: you - tray - repo | repo - cache          pucks · goals (lists split on |)
//   counters: Staged | Pushed
//   pucks: change = your change | reply = their change
//   goals: Why staging lets you choose @2
//
//   step Stage: Pick what goes in the snapshot [how]   `step` / `quiz` start at column 0;
//     Paragraph text.                                    every other line belongs to them
//     tip warn Title: text · - takeaway · show: a, b · focus: a · fail: a
//     cut: a - b · move: a -> b x2 store & b <-> c · set: Staged = 2 files good | Pushed = no
//
//   quiz The question?
//     * the right answer | why
//     - a wrong answer | why
//   ```
//
// Every declaration keeps its draft line. Parsing never throws: problems become
// `line N: ...` warnings (sorted by line) and the offending item is dropped, except an
// unknown object kind, tint or puck kind, which fall back to `box`, none and `change`.

import { OBJECT_KINDS, TINTS, PUCK_KINDS, CHAPTERS, LIMITS } from "./kinds.js";

/** @typedef {import("../types").Lesson} Lesson */
/** @typedef {import("../types").LessonStep} LessonStep */
/** @typedef {import("../types").PuckKind} PuckKind */

const LEVELS = ["good", "warn", "bad", "none"];
const TIP_TITLES = { idea: "Key idea", try: "Try it", warn: "Watch out" };

const SECTION = /^(step|quiz)\s+(.*)$/;
const KEY = /^([^:]+?)\s*:\s*(.*)$/;
const PLACE = /^([^\s=]+)\s*=\s*([\w-]+)\s*"([^"]*)"\s*(.*)$/;
const DIRECTIVE = /^(show|focus|fail|cut|move|set):\s*(.*)$/;
const MOVE = /^(.+?)\s*(<->|->)\s*(\S+)(?:\s+(.+))?$/;
const COLON = /:(?:\s|$)/;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const words = new Intl.Segmenter(undefined, { granularity: "word" });

/**
 * @param {{ lang?: string, info?: string, body?: string, line?: number }} block a `lesson`
 *   fence from tokenizeBlocks; body line i (0-based) is draft line `line + 1 + i`
 * @returns {{ lesson: Lesson, warnings: string[] }}
 */
export function parseLesson(block) {
  const first = Number.isInteger(block?.line) ? block.line : 1;
  const body = typeof block?.body === "string" ? block.body : "";
  const title = typeof block?.info === "string" ? block.info.trim() : "";

  const found = [];
  const warn = (line, message) => found.push({ line, message: `line ${line}: ${message}` });

  /** @type {Lesson} */
  const lesson = {
    title, subtitle: "", meta: [], places: [], rails: [], counters: [], pucks: {}, goals: [],
    steps: [], quiz: null, line: first
  };
  const ids = new Set(); // declared place ids
  const dropped = new Set(); // ids past the places limit; references to them are skipped quietly

  checkTitle(title, first);

  // Header lines first, then sections that each open with a column-0 `step` / `quiz` line.
  const header = [];
  const sections = [];
  body.split(/\r\n?|\n/).forEach((raw, i) => {
    const line = first + 1 + i;
    const open = raw.match(SECTION);
    if (open) sections.push({ kind: open[1], head: open[2].trim(), line, lines: [] });
    else (sections.at(-1)?.lines ?? header).push({ text: raw.trim(), line });
  });

  readHeader(header);
  for (const section of sections) {
    if (section.kind === "step") readStep(section);
    else readQuiz(section);
  }
  return { lesson, warnings: found.sort((a, b) => a.line - b.line).map(w => w.message) };

  // ── helpers (closures over the lesson being built) ─────────────────────────────

  function checkTitle(text, line) {
    const n = countGraphemes(text);
    if (n > LIMITS.title) warn(line, `title has ${n} characters (keep it to ${LIMITS.title})`);
  }

  /** The id if it is a drawn place; otherwise null, with a warning unless it was over the limit. */
  function placeRef(id, line) {
    if (ids.has(id)) return id;
    if (!dropped.has(id)) warn(line, `unknown place "${id}"`);
    return null;
  }

  /** A rail joins the two places in either direction. */
  function hasRail(a, b) {
    return lesson.rails.some(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
  }

  // ── header ─────────────────────────────────────────────────────────────────────

  function readHeader(rows) {
    const railLines = [];
    for (const { text, line } of rows) {
      if (!text) continue;
      const m = text.match(KEY);
      const value = m ? m[2] : "";
      switch (m ? m[1].toLowerCase() : "") {
        case "subtitle": lesson.subtitle = value; break;
        case "meta": lesson.meta = lesson.meta.concat(splitList(value, /[·|]/)); break;
        case "places": readPlaces(value, line); break;
        case "rails": railLines.push({ value, line }); break; // checked once every place is known
        case "counters": lesson.counters = lesson.counters.concat(splitList(value, "|")); break;
        case "pucks": readPucks(value, line); break;
        case "goals": readGoals(value, line); break;
        default: warn(line, `unknown key "${m ? m[1] : text}"`);
      }
    }
    for (const { value, line } of railLines) readRails(value, line);
  }

  function readPlaces(value, line) {
    for (const item of splitPipes(value)) {
      const m = item.match(PLACE);
      const attrs = m && readPlaceAttrs(m[4]);
      if (!m || !attrs) {
        warn(line, `could not read place "${item}"`);
        continue;
      }
      const [, id, kind, label] = m;
      if (ids.has(id) || dropped.has(id)) {
        warn(line, `duplicate place "${id}"`);
        continue;
      }
      if (lesson.places.length >= LIMITS.places) {
        if (!dropped.size) warn(line, `more than ${LIMITS.places} places; only the first ${LIMITS.places} are drawn`);
        dropped.add(id);
        continue;
      }
      const known = OBJECT_KINDS.includes(kind.toLowerCase());
      if (!known) warn(line, `unknown object "${kind}", drawn as a box`);
      const tint = attrs.tint && TINTS.includes(attrs.tint.toLowerCase()) ? attrs.tint.toLowerCase() : null;
      if (attrs.tint && !tint) warn(line, `unknown tint "${attrs.tint}"`);
      ids.add(id);
      lesson.places.push({ id, kind: known ? kind.toLowerCase() : "box", label, tint, at: attrs.at, line });
    }
  }

  function readRails(value, line) {
    for (const chain of value.split("|")) {
      const refs = splitList(chain, /\s+-\s+/).map(id => placeRef(id, line));
      for (let i = 0; i + 1 < refs.length; i++) {
        if (refs[i] && refs[i + 1]) lesson.rails.push({ a: refs[i], b: refs[i + 1], line });
      }
    }
  }

  function readPucks(value, line) {
    for (const item of splitList(value, "|")) {
      const eq = item.indexOf("=");
      const word = (eq < 0 ? item : item.slice(0, eq)).trim();
      const label = eq < 0 ? "" : item.slice(eq + 1).trim();
      const kind = puckKind(word);
      if (!kind) warn(line, unknownPuck(word));
      else if (label) lesson.pucks[kind] = label;
    }
  }

  function readGoals(value, line) {
    for (const item of splitList(value, "|")) {
      const m = item.match(/^(.+?)\s*@\s*(\d+)$/);
      if (m) lesson.goals.push({ text: m[1], at: Number(m[2]) });
      else warn(line, `could not read goal "${item}"`);
    }
  }

  // ── steps ──────────────────────────────────────────────────────────────────────

  function readStep(section) {
    const { short, title: stepTitle, chapter } = readStepHead(section.head);
    /** @type {LessonStep} */
    const step = {
      short, title: stepTitle, chapter, paras: [], tip: null, takeaways: [], show: [], focus: [],
      fail: [], cut: [], moves: [], set: [], line: section.line
    };
    if (!stepTitle) warn(section.line, "step needs a title");
    checkTitle(stepTitle, section.line);
    if (lesson.steps.length === LIMITS.steps) warn(section.line, `more than ${LIMITS.steps} steps`);
    lesson.steps.push(step);

    let para = null; // the paragraph being collected
    const flush = () => {
      if (!para) return;
      const n = countWords(para.text);
      if (n > LIMITS.words) warn(para.line, `paragraph has ${n} words (keep it to ${LIMITS.words})`);
      step.paras.push(para.text);
      para = null;
    };
    for (const { text, line } of section.lines) {
      const directive = text.match(DIRECTIVE);
      if (!text) {
        flush();
      } else if (directive) {
        flush();
        readDirective(step, directive[1], directive[2], line);
      } else if (/^tip\s/.test(text)) {
        flush();
        step.tip = readTip(text.slice(3));
      } else if (text.startsWith("- ")) {
        flush();
        step.takeaways.push(text.slice(2).trim());
      } else {
        para = para ? { line: para.line, text: `${para.text} ${text}` } : { line, text };
      }
    }
    flush();
  }

  function readDirective(step, key, value, line) {
    if (key === "cut") readCuts(step, value, line);
    else if (key === "move") readMoves(step, value, line);
    else if (key === "set") readSets(step, value, line);
    else {
      for (const id of splitList(value, ",")) {
        const ref = placeRef(id, line);
        if (ref) step[key].push(ref);
      }
    }
  }

  function readCuts(step, value, line) {
    for (const item of splitList(value, ",")) {
      const pair = splitList(item, /\s+-\s+/);
      if (pair.length !== 2) {
        warn(line, `could not read cut "${item}"`);
        continue;
      }
      const [a, b] = pair.map(id => placeRef(id, line));
      if (!a || !b) continue;
      if (hasRail(a, b)) step.cut.push([a, b]);
      else warn(line, `no rail between "${a}" and "${b}"`);
    }
  }

  function readMoves(step, value, line) {
    // Items alternate with their separators: `,` runs after the previous move, `&` starts with it.
    const parts = value.split(/\s*([,&])\s*/);
    let prevKept = false;
    for (let i = 0; i < parts.length; i += 2) {
      const item = parts[i].trim();
      if (!item) continue;
      const together = i > 0 && parts[i - 1] === "&" && prevKept;
      prevKept = false;
      const m = item.match(MOVE);
      const detail = m && readMoveDetail(m[4]);
      if (!m || !detail) {
        warn(line, `could not read move "${item}"`);
        continue;
      }
      const named = detail.word === null ? "change" : puckKind(detail.word);
      if (!named) warn(line, unknownPuck(detail.word));
      const from = placeRef(m[1], line);
      const to = placeRef(m[3], line);
      if (!from || !to) continue;
      if (!hasRail(from, to)) {
        warn(line, `no rail between "${from}" and "${to}"`);
        continue;
      }
      step.moves.push({ from, to, kind: named ?? "change", count: detail.count, together, roundTrip: m[2] === "<->" });
      prevKept = true;
    }
  }

  function readSets(step, value, line) {
    for (const item of splitList(value, "|")) {
      const eq = item.indexOf("=");
      const label = (eq < 0 ? item : item.slice(0, eq)).trim();
      let text = eq < 0 ? "" : item.slice(eq + 1).trim();
      let level = "none";
      const tail = text.match(/^(.+?)\s+(\S+)$/);
      if (tail && LEVELS.includes(tail[2].toLowerCase())) {
        text = tail[1];
        level = tail[2].toLowerCase();
      }
      const declared = lesson.counters.find(c => c.toLowerCase() === label.toLowerCase());
      if (declared === undefined) warn(line, `counter "${label}" is not declared in counters:`);
      else step.set.push({ label: declared, value: text, level });
    }
  }

  // ── quiz ───────────────────────────────────────────────────────────────────────

  function readQuiz(section) {
    const quiz = { question: section.head, options: [], line: section.line };
    for (const { text } of section.lines) {
      const option = text.match(/^([*-])\s+(.*)$/);
      if (option) {
        const bar = option[2].indexOf("|");
        quiz.options.push({
          text: (bar < 0 ? option[2] : option[2].slice(0, bar)).trim(),
          correct: option[1] === "*",
          why: bar < 0 ? "" : option[2].slice(bar + 1).trim()
        });
      } else if (text) {
        quiz.question = `${quiz.question} ${text}`.trim();
      }
    }
    if (quiz.options.filter(o => o.correct).length !== 1) {
      warn(section.line, "quiz needs one correct option, marked with *");
    }
    lesson.quiz = quiz;
  }
}

// ── pure helpers ─────────────────────────────────────────────────────────────────

function countGraphemes(text) {
  let n = 0;
  for (const _ of graphemes.segment(text)) n++;
  return n;
}

function countWords(text) {
  let n = 0;
  for (const part of words.segment(text)) if (part.isWordLike) n++;
  return n;
}

/** Split on a separator and keep the trimmed, non-empty pieces. */
function splitList(text, separator) {
  return text.split(separator).map(s => s.trim()).filter(Boolean);
}

/** Like `splitList(text, "|")`, but a `|` inside double quotes stays in its item. */
function splitPipes(text) {
  const items = [];
  let current = "";
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    if (ch === "|" && !quoted) {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items.map(s => s.trim()).filter(Boolean);
}

/** @returns {PuckKind | null} */
function puckKind(word) {
  return PUCK_KINDS.find(kind => kind === word.toLowerCase()) ?? null;
}

const unknownPuck = word => `unknown puck kind "${word}" (use ${PUCK_KINDS.join(", ")})`;

/** `tint=name` and `at=x,y` after a place's label; null if anything else is left over. */
function readPlaceAttrs(text) {
  let tint = null;
  let at = null;
  const rest = text
    .replace(/(?:^|\s)tint=(\S+)/, (_, name) => { tint = name; return " "; })
    .replace(/(?:^|\s)at=(-?\d+)\s*,\s*(-?\d+)/, (_, x, y) => { at = [Number(x), Number(y)]; return " "; });
  return rest.trim() ? null : { tint, at };
}

/** What follows `a -> b` in a move: one optional puck word and an optional `xN` count. */
function readMoveDetail(text = "") {
  let word = null;
  let count = 1;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const n = token.match(/^x(\d+)$/i);
    if (n) count = Math.max(1, Number(n[1]));
    else if (word === null) word = token;
    else return null;
  }
  return { word, count };
}

/** `Short: Title [chapter]` or `Title [chapter]`; the short name defaults to the first two words. */
function readStepHead(head) {
  let rest = head;
  let chapter = "how";
  const tag = rest.match(/\s*\[([^\]]*)\]\s*$/);
  const named = tag?.[1].trim().toLowerCase();
  if (named && Object.hasOwn(CHAPTERS, named)) {
    chapter = named;
    rest = rest.slice(0, tag.index).trim();
  }
  const colon = rest.search(COLON);
  const title = (colon < 0 ? rest : rest.slice(colon + 1)).trim();
  const short = (colon < 0 ? "" : rest.slice(0, colon).trim()) || title.split(/\s+/).slice(0, 2).join(" ");
  return { short, title, chapter };
}

/** The text after `tip`: `[idea|try|warn] [Title:] text`. */
function readTip(text) {
  let rest = text.trim();
  let kind = "idea";
  const named = rest.match(/^(idea|try|warn)(?:\s+|$)/);
  if (named) {
    kind = named[1];
    rest = rest.slice(named[0].length);
  }
  const colon = rest.search(COLON);
  const title = colon < 0 ? "" : rest.slice(0, colon).trim();
  return { kind, title: title || TIP_TITLES[kind], text: (colon < 0 ? rest : rest.slice(colon + 1)).trim() };
}
