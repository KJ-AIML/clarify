/**
 * A tiny tween scheduler on a virtual clock.
 *
 * The original stage keeps one `requestAnimationFrame` loop and a bag of tween records
 * `{ from, to, start, delay, dur, ease }` that it samples every frame (index.pretty.js:19083).
 * This module is that idea as a reusable piece: tweens with a delay, a duration and an easing,
 * groups that finish together, one time scale for slow motion, pause, and `finish()` to jump to
 * the end state. Nothing here touches the DOM until `start()` is called.
 */
import { lerp, linear, resolveEase } from './easing.js';

/**
 * @typedef {object} TweenSpec
 * @property {number} [delay]     ms to wait on the scheduler's clock before the tween starts (default 0)
 * @property {number} duration    ms the tween runs for (0 = completes on the first step after its delay)
 * @property {string | ((t: number) => number)} [ease]  easing name from EASE or a function (default linear)
 * @property {number | Record<string, number>} [from]   start value: a number or an object of numbers
 * @property {number | Record<string, number>} [to]     end value, same shape as `from`
 * @property {(value: any, tween: Tween) => void} [update]  called every step once the delay has passed.
 *   `value` is the eased interpolation of from → to, or the eased progress when no from/to is given.
 *   The raw progress is `tween.progress`.
 * @property {(tween: Tween) => void} [done]  called once, after the final `update`
 */

/** One running tween. Created by `Scheduler.add` or `TweenGroup.add`. */
export class Tween {
  /** @param {Scheduler} scheduler @param {TweenSpec} spec @param {TweenGroup | null} group */
  constructor(scheduler, spec, group) {
    this.scheduler = scheduler;
    this.group = group;
    this.start = scheduler.time;               // virtual ms at creation
    this.delay = spec.delay || 0;
    this.duration = Math.max(0, spec.duration || 0);
    this.ease = resolveEase(spec.ease) || linear;
    this.from = spec.from;
    this.to = spec.to;                         // may be reassigned while the tween runs (retargeting)
    this.update = spec.update || null;
    this.done = spec.done || null;
    this.progress = 0;                         // raw, 0..1
    this.started = false;
    this.finished = false;
  }
  /** Virtual time at which the tween ends. */
  get end() { return this.start + this.delay + this.duration; }
  /** The eased value at the current progress. */
  get value() {
    const k = this.ease(this.progress), a = this.from, b = this.to;
    if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, k);
    if (a && b && typeof a === 'object') {
      const out = {};
      for (const key in b) out[key] = typeof a[key] === 'number' && typeof b[key] === 'number' ? lerp(a[key], b[key], k) : b[key];
      return out;
    }
    return k;
  }
  /** Sample at virtual time `time`. Returns true when the tween has just finished. */
  step(time) {
    if (this.finished) return false;
    const elapsed = time - this.start - this.delay;
    if (elapsed < 0 && !this.started) return false;   // still waiting: `update` is not called before the delay
    this.started = true;
    this.progress = this.duration > 0 ? Math.max(0, Math.min(1, elapsed / this.duration)) : 1;
    if (this.update) this.update(this.value, this);
    if (this.progress < 1) return false;
    this.finished = true;
    if (this.done) this.done(this);
    return true;
  }
  /** Jump to the end state now: one last `update` at progress 1, then `done`. */
  finish() {
    if (this.finished) return;
    this.started = true;
    this.progress = 1;
    if (this.update) this.update(this.value, this);
    this.finished = true;
    if (this.done) this.done(this);
    this.scheduler.forget(this);
  }
  /** Stop without calling `update` or `done` again. */
  cancel() {
    this.finished = true;
    this.scheduler.forget(this);
  }
}

/** Tweens that belong together (one transition). `done` flips to true when every member has finished. */
export class TweenGroup {
  /** @param {Scheduler} scheduler */
  constructor(scheduler) {
    this.scheduler = scheduler;
    /** @type {Set<Tween>} */
    this.tweens = new Set();
    this.onDone = null;                        // optional callback, fired once when the group empties
    this.notified = false;
  }
  /** Add a tween to the scheduler as a member of this group. @param {TweenSpec} spec @returns {Tween} */
  add(spec) { return this.scheduler.add(spec, this); }
  /** True when the group has no unfinished tweens. */
  get done() { return this.tweens.size === 0; }
  /** Virtual time at which the last member ends. */
  get end() { let t = this.scheduler.time; for (const tw of this.tweens) t = Math.max(t, tw.end); return t; }
  /** Jump every member to its end state, in the order they were added. */
  finish() { for (const tw of [...this.tweens]) tw.finish(); this.settle(); }
  /** Drop every member without completing it. */
  cancel() { for (const tw of [...this.tweens]) tw.cancel(); }
  /** Fire `onDone` once, when empty. Called by the scheduler. */
  settle() {
    if (!this.done || this.notified) return;
    this.notified = true;
    if (this.onDone) this.onDone(this);
  }
}

/** The scheduler: a clock plus the set of live tweens. */
export class Scheduler {
  /**
   * @param {object} [options]
   * @param {number} [options.timeScale]  clock rate: 1 = real time, 0.25 = slow motion (default 1)
   * @param {number} [options.maxStep]    longest real step in ms; a longer frame gap (a background tab)
   *                                      is cut to this so nothing jumps (default 50, as in the original)
   */
  constructor({ timeScale = 1, maxStep = 50 } = {}) {
    this.time = 0;                             // virtual ms since creation
    this.timeScale = timeScale;
    this.paused = false;                       // freezes the clock; tweens resume where they were
    this.maxStep = maxStep;
    /** @type {Set<Tween>} */
    this.tweens = new Set();
    this.lastNow = null;
    this.frame = 0;
    this.running = false;
    this.onFrame = null;                       // optional callback(dtVirtualMs) after each step of the own loop
  }
  /**
   * Schedule a tween. @param {TweenSpec} spec @param {TweenGroup | null} [group] @returns {Tween}
   */
  add(spec, group = null) {
    const tw = new Tween(this, spec, group);
    this.tweens.add(tw);
    if (group) group.tweens.add(tw);
    return tw;
  }
  /** Create an empty group. @returns {TweenGroup} */
  group() { return new TweenGroup(this); }
  /** True while any tween is waiting or running. */
  get busy() { return this.tweens.size > 0; }
  /** Remove a tween from the books (used by Tween.finish / cancel). */
  forget(tw) {
    this.tweens.delete(tw);
    if (tw.group) tw.group.tweens.delete(tw);
  }
  /**
   * Move the clock forward and sample every tween.
   * @param {number} ms  virtual milliseconds (already scaled). Ignored while paused.
   */
  advance(ms) {
    if (this.paused) return;
    this.time += ms;
    const groups = new Set();
    for (const tw of [...this.tweens]) {
      if (tw.finished) { this.forget(tw); continue; }     // finished or cancelled by an earlier callback
      if (tw.step(this.time)) {
        const g = tw.group;
        this.forget(tw);
        if (g) groups.add(g);
      }
    }
    for (const g of groups) g.settle();
  }
  /**
   * Feed a real timestamp (the `requestAnimationFrame` argument, or `performance.now()`).
   * @param {number} now  real ms
   * @returns {number} the virtual ms the clock moved by
   */
  tick(now) {
    const real = this.lastNow === null ? 0 : Math.min(this.maxStep, Math.max(0, now - this.lastNow));
    this.lastNow = now;
    const dt = this.paused ? 0 : real * this.timeScale;
    this.advance(dt);
    return dt;
  }
  /** Run on the scheduler's own `requestAnimationFrame` loop. Call `stop()` to end it. */
  start() {
    if (this.running) return this;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      const dt = this.tick(now);
      if (this.onFrame) this.onFrame(dt);
      if (this.running) this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
    return this;
  }
  /** Stop the own loop. Tweens keep their state and resume on the next `start()` or `tick()`. */
  stop() {
    if (this.running && this.frame) cancelAnimationFrame(this.frame);
    this.running = false;
    this.frame = 0;
    this.lastNow = null;
    return this;
  }
  /** Jump every tween to its end state. */
  finish() {
    const groups = new Set();
    for (const tw of [...this.tweens]) { if (tw.group) groups.add(tw.group); tw.finish(); }
    for (const g of groups) g.settle();
  }
  /** Drop every tween without completing it. */
  cancel() { for (const tw of [...this.tweens]) tw.cancel(); }
}

let shared = null;
/**
 * One-off tween on a shared, self-running scheduler: the short way in for page code.
 * @param {TweenSpec} spec
 * @returns {Tween}
 * @example
 *   tween({ from: 0, to: 1, duration: 300, ease: 'out', update: (v) => (el.style.opacity = v) });
 */
export function tween(spec) {
  shared = shared || new Scheduler();
  const tw = shared.add({
    ...spec,
    done: (t) => { if (spec.done) spec.done(t); if (shared.tweens.size <= 1) shared.stop(); },
  });
  shared.start();
  return tw;
}

/**
 * Delays for a staggered sequence: item i starts at `base + i * step`.
 * @param {number} count  number of items
 * @param {number} step   ms between consecutive starts (the stage uses 130 for entrances, 90 for links)
 * @param {number} [base] ms before the first one
 * @returns {number[]}
 */
export const stagger = (count, step, base = 0) => Array.from({ length: count }, (_, i) => base + i * step);
