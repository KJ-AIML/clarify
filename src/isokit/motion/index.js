/**
 * JS side of the motion kit: easings, a tween scheduler and the number count-up.
 * The CSS side (keyframes and motion tokens) lives in the stylesheets next to this file.
 */
export {
  clamp01, lerp, linear, easeInOutCubic, easeOutCubic, easeOutBack, backOut, cubicBezier, EASE, resolveEase,
} from './easing.js';
export { Scheduler, Tween, TweenGroup, tween, stagger } from './tween.js';
export { countUp, animateValue, countUpConfig } from './countup.js';
