/**
 * Number count-up, as used by the original's metric chips (`oh`, index.pretty.js:22042).
 *
 * Two layers:
 *   countUp()        the bare number tween: from → to over 900 ms with a cubic ease-out
 *   animateValue()   the chip behaviour around it: count the text up while the box glides from its
 *                    old width to its new width, or cross-fade the text when the value is not a number
 *
 * Importing this file touches nothing; both functions use `requestAnimationFrame` when called.
 */
import { easeOutCubic, lerp } from './easing.js';

/** Defaults taken from the original. Change them here or pass options per call. */
export const countUpConfig = {
  numberMs: 900,              // number → number
  swapMs: 480,                // anything else: only the box width is tweened, the text swaps with a CSS class
  changedClass: 'is-changed', // re-triggered on the box whenever the value differs from the previous one
  swapClass: 'is-swap',       // re-triggered on the value element for a non-numeric change
};

/**
 * Tween a number and report every frame.
 * @param {object} o
 * @param {number} o.from
 * @param {number} o.to
 * @param {number} [o.duration]            ms (default 900)
 * @param {(t: number) => number} [o.ease] default cubic ease-out
 * @param {(value: number, eased: number) => void} o.onUpdate  called every frame with the current value
 * @param {() => void} [o.onDone]          called after the last frame (not after `cancel`)
 * @returns {{ cancel(): void, finish(): void }}
 */
export function countUp({ from, to, duration = countUpConfig.numberMs, ease = easeOutCubic, onUpdate, onDone }) {
  let live = true, start = null, frame = 0;
  const end = () => { live = false; onUpdate(to, 1); if (onDone) onDone(); };
  const step = (now) => {
    if (!live) return;
    if (start === null) start = now;
    const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
    if (t >= 1) return end();
    const k = ease(t);
    onUpdate(lerp(from, to, k), k);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return {
    cancel() { live = false; cancelAnimationFrame(frame); },
    finish() { if (live) { cancelAnimationFrame(frame); end(); } },
  };
}

const retrigger = (el, cls) => {               // restart a CSS animation: remove, force a reflow, add
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};
const running = new WeakMap();                 // box element → the handle of its current animation

/**
 * Show a new value in a "chip": a box whose width follows its text.
 *
 * What happens, in the original's order:
 *   1. If the value changed, the box gets `is-changed` again (a CSS flash).
 *   2. The box is measured, the final text is written, and the box is measured again.
 *   3. number → number: the old text is put back, then text and width are tweened together for
 *      900 ms (cubic ease-out). Anything else: the value element gets `is-swap` (a CSS fade) and
 *      only the width is tweened, for 480 ms.
 *   4. At the end the inline width is removed and the exact final text is written.
 * A newer call on the same box cancels the older animation.
 *
 * @param {object} o
 * @param {HTMLElement} o.box           the element whose width is animated (the chip)
 * @param {HTMLElement} o.value         the element whose text is the value
 * @param {number | string | undefined} o.from   previous value (`undefined` = first paint, nothing animates)
 * @param {number | string} o.to        new value
 * @param {(v: any) => string} [o.format]  value → text (default `String`)
 * @param {boolean} [o.animate]         false writes the final state at once (default true)
 * @param {Partial<typeof countUpConfig>} [o.config]
 * @returns {{ cancel(): void, finish(): void } | null}  null when nothing needed animating
 */
export function animateValue({ box, value, from, to, format = String, animate = true, config }) {
  const cfg = { ...countUpConfig, ...config };
  const previous = running.get(box);
  if (previous) previous.cancel();
  running.delete(box);

  const changed = from !== undefined && from !== to;
  if (changed && animate) retrigger(box, cfg.changedClass);
  const w0 = box.offsetWidth;
  box.style.width = '';
  value.textContent = format(to);
  const w1 = box.offsetWidth;
  const numeric = animate && typeof from === 'number' && typeof to === 'number' && from !== to;
  if (!animate || (!numeric && w0 === w1)) return null;

  if (numeric) value.textContent = format(from);
  else if (changed) retrigger(value, cfg.swapClass);
  box.style.width = `${w0}px`;
  const handle = countUp({
    from: 0, to: 1, ease: easeOutCubic, duration: numeric ? cfg.numberMs : cfg.swapMs,
    onUpdate: (_, k) => {
      if (numeric) value.textContent = format(lerp(from, to, k));
      box.style.width = `${lerp(w0, w1, k)}px`;
    },
    onDone: () => {
      box.style.width = '';
      value.textContent = format(to);
      running.delete(box);
    },
  });
  const wrapped = { cancel: () => { handle.cancel(); box.style.width = ''; }, finish: () => handle.finish() };
  running.set(box, wrapped);
  return wrapped;
}
