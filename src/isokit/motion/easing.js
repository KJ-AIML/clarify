/**
 * Easing functions and two scalar helpers.
 *
 * Every easing maps a progress `t` in 0..1 to an eased value. `inOut`, `out` and `back` are the
 * three curves the original stage uses for all of its JS-driven motion (index.pretty.js:18020).
 * Nothing here touches the DOM.
 */

/** Clamp a number to 0..1. */
export const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Linear interpolation: `a` at t = 0, `b` at t = 1. `t` may leave 0..1 (an overshoot stays an overshoot). */
export const lerp = (a, b, t) => a + (b - a) * t;

/** No easing. */
export const linear = (t) => t;

/** Cubic ease-in-out: slow, fast, slow. Used for moves, exits, the camera, link fades and link draw-in. */
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Cubic ease-out: fast start, soft landing. Used for entrances and for the metric count-up. */
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Build an ease-out that overshoots and settles ("back" easing): 1 + (c + 1)(t − 1)³ + c(t − 1)².
 * @param {number} c  overshoot strength. 1.35 peaks about 6.6 % past the target at t ≈ 0.62.
 * @returns {(t: number) => number}
 */
export const backOut = (c = 1.35) => (t) => 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;

/** The stage's landing curve: blocks fall from above, dip slightly past the floor and come back. */
export const easeOutBack = backOut(1.35);

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` curve as a JS function, so JS tweens can share a curve with
 * the stylesheet (the UI's "fresh-in" keyframes use `cubic-bezier(0.2, 0.7, 0.2, 1)`).
 * Solved with a few Newton steps and a bisection fallback.
 * @returns {(t: number) => number}
 */
export function cubicBezier(x1, y1, x2, y2) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const xAt = (u) => ((ax * u + bx) * u + cx) * u;
  const yAt = (u) => ((ay * u + by) * u + cy) * u;
  const slope = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const err = xAt(u) - t, d = slope(u);
      if (Math.abs(err) < 1e-5) return yAt(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0, hi = 1;
    u = t;
    for (let i = 0; i < 24; i++) {
      const x = xAt(u);
      if (Math.abs(x - t) < 1e-5) break;
      if (x < t) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return yAt(u);
  };
}

/** The original's easing table under its original keys. */
export const EASE = { linear, inOut: easeInOutCubic, out: easeOutCubic, back: easeOutBack };

/**
 * Look an easing up by name, or pass a function straight through.
 * @param {string | ((t: number) => number) | undefined} ease
 * @returns {(t: number) => number}
 */
export const resolveEase = (ease) => (typeof ease === 'function' ? ease : EASE[ease] || linear);
