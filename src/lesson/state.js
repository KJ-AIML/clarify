// clarify/src/lesson/state.js
// Turns a parsed Lesson into one state per step, plus one for the quiz. A state says
// which places are live, what is focused, failing or cut, which rails are active, the
// moves resolved to rail ids, the counters carried forward, and how many goals are reached.

/** @typedef {import("../types").Lesson} Lesson */
/** @typedef {import("../types").LessonMove} LessonMove */
/** @typedef {import("../types").Level} Level */

/**
 * @typedef {object} StepState
 * @property {string[]} live places that have appeared so far, in declaration order
 * @property {string[]} focus place ids focused by this step
 * @property {string[]} fail place ids failing in this step
 * @property {string[]} cut rail ids cut in this step
 * @property {string[]} routes rail ids of this step's moves, unique, in move order
 * @property {Array<{ rail: string, reverse: boolean, kind: string, count: number, together: boolean, roundTrip: boolean }>} moves
 * @property {Array<{ label: string, value: string, level: Level, changed: boolean }>} counters
 * @property {number} goals goals reached by this step
 */

/**
 * Resolves a pair of places to the declared rail between them.
 * @param {Lesson} lesson
 * @param {string} a
 * @param {string} b
 * @returns {{ id: string, reverse: boolean } | null}
 */
export function railId(lesson, a, b) {
  for (const rail of lesson.rails) {
    if (rail.a === a && rail.b === b) return { id: `${rail.a}--${rail.b}`, reverse: false };
    if (rail.a === b && rail.b === a) return { id: `${rail.a}--${rail.b}`, reverse: true };
  }
  return null;
}

/**
 * @param {Lesson} lesson
 * @returns {StepState[]}
 */
export function lessonStates(lesson) {
  const order = lesson.places.map((p) => p.id);
  const seen = new Set();
  const counters = lesson.counters.map((label) => ({ label, value: "—", level: /** @type {Level} */ ("none") }));
  const states = [];

  for (const step of lesson.steps) {
    const names = [...step.show, ...step.focus, ...step.fail, ...step.cut.flat(), ...step.moves.flatMap((m) => [m.from, m.to])];
    for (const id of names) seen.add(id);

    const moves = step.moves.map((m) => {
      const rail = railId(lesson, m.from, m.to);
      return { rail: rail.id, reverse: rail.reverse, kind: m.kind, count: m.count, together: m.together, roundTrip: m.roundTrip };
    });
    const routes = [...new Set(moves.map((m) => m.rail))];

    const cut = step.cut.map(([a, b]) => railId(lesson, a, b)?.id).filter((id) => id !== undefined);

    for (const change of step.set) {
      const counter = counters.find((c) => c.label === change.label);
      if (counter) {
        counter.value = change.value;
        counter.level = change.level;
      }
    }

    const previous = states.at(-1)?.counters;
    states.push({
      live: order.filter((id) => seen.has(id)),
      focus: [...step.focus],
      fail: [...step.fail],
      cut,
      routes,
      moves,
      counters: counters.map((c, i) => ({
        label: c.label,
        value: c.value,
        level: c.level,
        changed: previous ? previous[i].value !== c.value : c.value !== "—"
      })),
      goals: lesson.goals.filter((g) => g.at <= states.length + 1).length
    });
  }

  if (lesson.quiz) {
    const last = states.at(-1);
    states.push({
      live: last ? [...last.live] : [],
      focus: last ? [...last.focus] : [],
      fail: last ? [...last.fail] : [],
      cut: last ? [...last.cut] : [],
      routes: [],
      moves: [],
      counters: (last?.counters ?? counters).map((c) => ({ ...c, changed: false })),
      goals: lesson.goals.length
    });
  }

  return states;
}
