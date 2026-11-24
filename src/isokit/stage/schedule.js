/**
 * The transition schedule: given the diff, when does each thing start and how long does it run?
 * And the sampler: what does an entity look like at progress p of its tween?
 *
 * Phases overlap so a step reads as one motion:
 *
 *   exits   0 ─────── 420
 *   camera      168 ─────────────── 988           (starts at exit × 0.4 when something leaves)
 *   moves         231 ────────────── 1051         (start at exit × 0.55)
 *   arrivals                    846 ───── 1526    (start at moveStart + move × 0.75), then +130 each
 *   links                                 1450 ──── 2010   (60 ms after both ends land), then +90 each
 *
 * Original: the body of `goTo` (index.pretty.js:18741-18827) and the entity loop of `tick`
 * (19095-19141). Pure functions, no DOM.
 */
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, lerp } from '../motion/easing.js';
import { stageConfig } from './config.js';

/**
 * @typedef {object} Schedule
 * @property {number} moveAt                       ms at which changes start
 * @property {number} enterAt                      ms at which the first arrival starts
 * @property {Record<string, { delay: number, duration: number }>} exits
 * @property {Record<string, { delay: number, duration: number }>} moves
 * @property {Record<string, { delay: number, duration: number }>} enters
 * @property {Record<string, { delay: number, duration: number }>} linksOut
 * @property {Record<string, { delay: number, duration: number }>} linksIn
 * @property {{ delay: number, duration: number }} camera
 * @property {number} end                          ms at which the last tween ends
 */

/**
 * Lay a transition out on a timeline that starts at 0.
 * @param {object} input
 * @param {string[]} input.exiting
 * @param {string[]} input.changed
 * @param {string[]} input.entering               already sorted back to front
 * @param {string[]} [input.keptIds]              entities that stay untouched (they count as landed at 0)
 * @param {string[]} [input.linksRemoved]
 * @param {{ id: string, from: string, to?: string }[]} [input.linksAdded]  in scene order
 * @param {typeof stageConfig.timings} [T]
 * @param {typeof stageConfig.phases} [P]
 * @returns {Schedule}
 */
export function scheduleTransition({ exiting, changed, entering, keptIds = [], linksRemoved = [], linksAdded = [] }, T = stageConfig.timings, P = stageConfig.phases) {
  const moveAt = exiting.length ? T.exit * P.moveAfterExit : 0;
  const enterAt = changed.length ? moveAt + T.move * P.enterAfterMove : exiting.length ? T.exit * P.enterAfterExit : 0;
  const s = { moveAt, enterAt, exits: {}, moves: {}, enters: {}, linksOut: {}, linksIn: {}, camera: null, end: 0 };
  const landed = {};                                       // id → ms at which a link may attach to it
  for (const id of keptIds) landed[id] = 0;
  for (const id of exiting) { s.exits[id] = { delay: 0, duration: T.exit }; s.end = Math.max(s.end, T.exit); }
  for (const id of changed) {
    s.moves[id] = { delay: moveAt, duration: T.move };
    landed[id] = moveAt + T.move;
    s.end = Math.max(s.end, landed[id]);
  }
  entering.forEach((id, i) => {
    const delay = enterAt + i * T.stagger;
    s.enters[id] = { delay, duration: T.enter };
    landed[id] = delay + T.enter * P.landedAt;             // the back-ease is visually down by 80 %
    s.end = Math.max(s.end, delay + T.enter);
  });
  for (const id of linksRemoved) s.linksOut[id] = { delay: 0, duration: T.linkFade };   // does not extend `end`
  const floor = moveAt + (changed.length ? T.move * P.linkAfterMove : 0);
  linksAdded.forEach((link, i) => {
    const delay = Math.max(landed[link.from] ?? 0, landed[link.to] ?? 0, floor) + T.linkLead + i * T.linkStagger;
    s.linksIn[link.id] = { delay, duration: T.draw };
    s.end = Math.max(s.end, delay + T.draw);
  });
  const camDelay = exiting.length ? T.exit * P.cameraAfterExit : 0;
  s.camera = { delay: camDelay, duration: T.move };
  s.end = Math.max(s.end, camDelay + T.move);
  return s;
}

/** Start state of an arriving entity: its target, invisible, displaced by the type's entrance offset. */
export function enterState(to, prim, table = stageConfig.enter) {
  return { ...to, opacity: 0, ...(table[to.type] || (prim && prim.enterFrom) || table.default) };
}

/** End state of a leaving entity: where it is, invisible, displaced by the type's exit offset. */
export function exitState(cur, prim, table = stageConfig.exit) {
  return { ...cur, opacity: 0, ...(table[cur.type] || (prim && prim.exitTo) || table.default) };
}

/** Tween record for an arrival: cubic-out overall, back-ease on `lift`, in-out on `count` / `n`. */
export const enterTween = (from, to) => ({ from, to, ease: easeOutCubic, liftEase: easeOutBack, countEase: easeInOutCubic });
/** Tween record for a departure. */
export const exitTween = (from, to) => ({ from, to, ease: easeInOutCubic, remove: true });
/** Tween record for a change; `change` comes from `describeChange`. */
export const moveTween = (from, to, change) => ({ from, to, ease: easeInOutCubic, ...change });

/**
 * The state of an entity at raw progress `p` (0..1) of its tween.
 *
 *   numbers            interpolated; `lift` and `count`/`n` may use their own easing
 *   everything else    (strings, arrays, colours) switches from old to new at p = 0.5
 *   cpu                −1 means "no meter", so it is never interpolated through; it switches at 0.5
 *   tagFade/labelFade  1 → 0 over p 0 … 0.42, then 0 → 1 over 0.55 … 0.95, when tags or label changed
 *   card               box size eases over p 0.24 … 0.72; content fades out by 0.24 and back in from 0.72
 *
 * @param {object} tw   record from enterTween / exitTween / moveTween
 * @param {number} p    raw progress, 0..1
 * @param {(corner: string, w: number, h: number) => { sx: number, sy: number }} [dockAt]
 *        for docked cards: the top-left corner that keeps a w × h card pinned to `corner`
 * @param {typeof stageConfig.swap} [S]
 * @returns {object} a fresh state object
 */
export function sampleEntityTween(tw, p, dockAt, S = stageConfig.swap) {
  const eased = tw.ease(p);
  const cur = tw.remove || p >= 0.5 ? { ...tw.to } : { ...tw.from };
  for (const key in tw.to) {
    const a = tw.from[key], b = tw.to[key];
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    if (key === 'cpu' && (a < 0 || b < 0)) continue;
    const k = key === 'lift' && tw.liftEase ? tw.liftEase(p) : (key === 'count' || key === 'n') && tw.countEase ? tw.countEase(p) : eased;
    cur[key] = lerp(a, b, k);
  }
  const fadeOut = 1 - clamp01(p / S.fadeOutEnd), fadeIn = clamp01((p - S.fadeInStart) / S.fadeInSpan);
  if (tw.tagSwap) cur.tagFade = p < 0.5 ? fadeOut : fadeIn;
  if (tw.labelSwap) cur.labelFade = p < 0.5 ? fadeOut : fadeIn;
  if (tw.card) {
    const c = tw.card;
    let w = c.w1, h = c.h1;
    if (c.swap) {
      const k = easeInOutCubic(clamp01((p - S.cardResizeStart) / S.cardResizeSpan));
      w = lerp(c.w0, c.w1, k);
      h = lerp(c.h0, c.h1, k);
      cur.boxW = w;
      cur.boxH = h;
      cur.fade = p < 0.5 ? 1 - clamp01(p / S.cardFadeOutEnd) : clamp01((p - S.cardFadeInStart) / S.cardFadeInSpan);
      cur.contentFade = cur.fade;                          // the legacy `note` primitive reads this name
    }
    if (c.keep && dockAt) Object.assign(cur, dockAt(c.keep, w, h));
  }
  return cur;
}
