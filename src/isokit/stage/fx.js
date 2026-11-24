/**
 * One-shot effects. Each is a node with a CSS keyframe animation that is removed by a timer a
 * little after the animation ends; JavaScript does no per-frame work for them.
 *
 * Original: `burst` (index.pretty.js:19020) and `spotlight` (18883); keyframes `fx-burst`,
 * `fx-fade`, `fx-pop`, `spot` (index.pretty.css:1432-1483).
 */
import { stageConfig } from './config.js';
import { footprintOf, iso, primitive, R, roundedPolygon } from './deps.js';
import { removeLater, svgEl } from './svg.js';

/**
 * A packet's end: a green ring that pops (`ok`, 0.45 s) or a red disc with a white cross that
 * swells and fades (`fail`, 0.65 s).
 * @param {Element} layer
 * @param {number} x   SVG units
 * @param {number} y
 * @param {'ok' | 'fail'} kind
 * @param {number} [ms]        lifetime of the node in real ms (700)
 * @returns {SVGElement}
 */
export function burst(layer, x, y, kind, ms = stageConfig.packets.burstMs) {
  const g = svgEl('g', { class: `iso-fx iso-fx--${kind}`, transform: `translate(${R(x)} ${R(y)})` });
  g.innerHTML = kind === 'fail'
    ? '<circle r="5" class="iso-fx-ring"/><path d="M-3.6,-3.6 L3.6,3.6 M3.6,-3.6 L-3.6,3.6" class="iso-fx-x"/>'
    : '<circle r="4.3" class="iso-fx-ring"/>';
  layer.appendChild(g);
  removeLater(g, ms);
  return g;
}

/** Does this entity type get a floor flash? Cards, queues and floor shapes do not. */
export function canSpotlight(state, opts = stageConfig.spot) {
  const prim = primitive(state.type);
  return !!prim && prim.spot !== false && prim.layer !== 'floor' && !opts.skipTypes.includes(state.type);
}

/**
 * Flash the floor under an entity: its footprint grown by 0.6 world units, drawn as a rounded
 * diamond that fades in, grows from 75 % to 140 % and fades out over 1.5 s.
 * @param {Element} floor      the floor layer
 * @param {object} state       entity state
 * @param {number} [timeScale] clock rate; the node's lifetime stretches in slow motion
 * @returns {SVGElement | null}
 */
export function spotlight(floor, state, timeScale = 1, opts = stageConfig.spot) {
  if (!canSpotlight(state, opts)) return null;
  const [x0, x1, y0, y1] = footprintOf(state), m = opts.margin;
  const el = svgEl('path', {
    class: 'iso-spot',
    d: roundedPolygon([iso(x0 - m, y0 - m), iso(x0 - m, y1 + m), iso(x1 + m, y1 + m), iso(x1 + m, y0 - m)], opts.radius),
  });
  floor.appendChild(el);
  removeLater(el, opts.ms / Math.max(0.01, timeScale));
  return el;
}
