/**
 * Links: from a spec `{ from, to, pts, style, heads, label }` to a rounded SVG path that starts
 * and ends just outside its two shapes, draws itself in, and carries a label pill.
 *
 * Original: `ip` (waypoints, index.pretty.js:18256), `Tr`/`Er` (trimming, 5875), `Cr` (rounded
 * polyline, 5843), `addLink`/`styleLink`/`updateLinks` (18894-18951).
 */
import { clamp01 } from '../motion/easing.js';
import { stageConfig } from './config.js';
import { config, esc, iso, pill, R, roundedPolyline, textWidth, themed } from './deps.js';
import { trimEnd, trimStart } from './geometry.js';
import { svgEl } from './svg.js';

/** Link styles. `muted` is the earlier engine's name for `off`. */
export const LINK_STYLES = ['solid', 'dashed', 'off', 'beat', 'cut'];
/** Arrowhead options: one at the target (default), one at each end, or none. */
export const LINK_HEADS = ['end', 'both', 'none'];

/** The canonical style name of a spec (`muted` → `off`, missing → `solid`). */
export const linkStyle = (spec) => (spec.style === 'muted' ? 'off' : spec.style || 'solid');
/** Styles that never show arrowheads. */
const HEADLESS = new Set(['beat', 'cut']);
/** The effective head setting of a link, as packets see it. */
export const linkHeads = (spec) => (HEADLESS.has(linkStyle(spec)) ? 'none' : spec.heads || 'end');

const OFFSET = /^(.+?)([+-]\d*\.?\d+)$/;
/**
 * Resolve one waypoint to world coordinates.
 *
 *   'lb'            the centre of entity `lb`
 *   'lb+2'          that centre moved +2 on both axes
 *   ['app', 'lb']   x of `app`, y of `lb`: an elbow that stays square when either end moves
 *   ['lb-3', 4]     x of `lb` minus 3, y = 4
 *   [6, 2]          a fixed point
 *
 * An exact id wins over the offset reading, so an id such as `app-1` works.
 * @param {string | (string | number)[]} ref
 * @param {(id: string) => number[] | null} centerOfId  id → [x, y], or null when unknown
 * @returns {number[]} [x, y] in world units
 */
export function resolveWaypoint(ref, centerOfId) {
  const axis = (r, k) => {
    if (typeof r === 'number') return r;
    const exact = centerOfId(r);
    if (exact) return exact[k];
    const m = OFFSET.exec(r), base = m && centerOfId(m[1]);
    if (!base) throw new Error(`unknown waypoint "${r}"`);
    return base[k] + parseFloat(m[2]);
  };
  return Array.isArray(ref) ? [axis(ref[0], 0), axis(ref[1], 1)] : [axis(ref, 0), axis(ref, 1)];
}

/**
 * Screen points of a link: waypoints projected on the floor, then trimmed to both outlines.
 * @param {object} spec                                   link spec
 * @param {(id: string) => number[] | null} centerOfId    world centre by entity id
 * @param {(id: string) => number[][] | null} polyOfId    current screen outline by entity id
 * @param {typeof stageConfig.links} [opts]
 * @returns {number[][]}
 */
export function routeLink(spec, centerOfId, polyOfId, opts = stageConfig.links) {
  let pts = spec.pts.map((ref) => iso(...resolveWaypoint(ref, centerOfId), 0));
  pts = trimStart(pts, polyOfId(spec.from), opts.gapStart);
  if (spec.to) pts = trimEnd(pts, polyOfId(spec.to), spec.heads === 'none' ? opts.gapEndPlain : opts.gapEnd);
  return pts;
}

/**
 * @typedef {object} LinkView
 * @property {string} id
 * @property {object} spec
 * @property {SVGPathElement} el      the line, in the links layer
 * @property {SVGGElement} label      the pill, in the over layer
 * @property {number} draw            0 = not drawn, 1 = fully drawn
 * @property {number} opacity
 * @property {number} len             path length in px
 * @property {number[][] | null} pts  current screen points
 */

/**
 * Create the two nodes of a link, fully drawn.
 * @param {string} id
 * @param {object} spec
 * @param {{ links: Element, over: Element }} layers
 * @returns {LinkView}
 */
export function createLink(id, spec, layers) {
  const el = svgEl('path', { class: 'iso-link', 'data-link': id });
  const label = svgEl('g', { class: 'iso-link-label', 'data-link': id });
  layers.links.appendChild(el);
  layers.over.appendChild(label);
  const link = { id, spec, el, label, draw: 1, opacity: 1, tween: null, len: 0, pts: null, labelKey: null, labelBorn: null, lpos: null };
  styleLink(link);
  return link;
}

/** Set the style class. A colour change then eases through the CSS `transition: stroke .5s`. */
export function styleLink(link) {
  link.el.setAttribute('class', `iso-link iso-link--${linkStyle(link.spec)}`);
}

/** Remove both nodes. */
export function removeLink(link) {
  link.el.remove();
  link.label.remove();
}

/**
 * Write a link's geometry and draw-in state to its path.
 *   solid, draw < 1     the dash trick: one dash as long as the path, offset by the missing part
 *   any other style     it has its own dash pattern, so it fades in instead (opacity = draw × 1.4)
 *   arrowheads          appear only once the line has almost arrived (draw > 0.97)
 * @param {LinkView} link
 * @param {number[][]} pts  routed screen points
 * @param {typeof stageConfig.links} [opts]
 */
export function drawLink(link, pts, opts = stageConfig.links) {
  const { el, spec } = link, style = linkStyle(spec), prefix = config.idPrefix || 'iso-';
  link.pts = pts;
  el.setAttribute('d', roundedPolyline(pts, opts.radius));
  link.len = el.getTotalLength();
  const marker = `url(#${prefix}${style === 'off' ? 'arrow-muted' : 'arrow'})`;
  const heads = link.draw > opts.headAt && !HEADLESS.has(style);
  el.setAttribute('marker-end', heads && spec.heads !== 'none' ? marker : 'none');
  el.setAttribute('marker-start', heads && spec.heads === 'both' ? marker : 'none');
  if (link.draw < 1 && style === 'solid') {
    el.style.strokeDasharray = `${R(link.len)} ${R(link.len)}`;
    el.style.strokeDashoffset = R(link.len * (1 - link.draw));
    el.style.opacity = link.draw > 0 ? 1 : 0;              // a zero-length dash with round caps would paint a dot
  } else {
    el.style.strokeDasharray = '';
    el.style.strokeDashoffset = '';
    el.style.opacity = R(link.opacity * (style === 'solid' ? 1 : clamp01(link.draw * opts.fadeGain)));
  }
}

/** Hide a link whose ends cannot be resolved (an entity is missing). */
export function hideLink(link) {
  link.pts = null;
  link.el.style.opacity = 0;
  link.label.style.opacity = 0;
}

/**
 * Markup of a label pill centred on (0, 0). One line goes through the core's `pill`; two lines
 * are drawn here (the same sticker look: a hard shadow 2 px under a rounded rectangle).
 * @param {string} text   may contain one `\n`
 * @param {string} [tone] a key of `config.tones` (default 'paper')
 * @param {typeof stageConfig.labels} [opts]
 * @returns {string} themed SVG markup
 */
export function labelMarkup(text, tone = 'paper', opts = stageConfig.labels) {
  const lines = String(text).split('\n');
  if (lines.length === 1) return themed(pill(0, 0, text, { tone, size: opts.size }));
  const t = config.tones[tone] || config.tones.paper;
  const w = Math.max(...lines.map((line) => textWidth(line, opts.size))) + opts.padX;
  const h = opts.height + (lines.length - 1) * opts.lineHeight, x = -w / 2, y = -h / 2;
  const rows = lines
    .map((line, i) => `<text x="0" y="${R(opts.size * 0.36 + (i - (lines.length - 1) / 2) * opts.lineHeight)}" text-anchor="middle" font-size="${opts.size}" font-weight="700" fill="${t.fg}">${esc(line)}</text>`)
    .join('');
  return themed(`<g class="iso-pill">
    <rect x="${R(x)}" y="${R(y + 2)}" width="${R(w)}" height="${h}" rx="10.5" fill="${config.hard}"/>
    <rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${h}" rx="10.5" fill="${t.bg}" stroke="${config.ink}" stroke-width="1.3"/>
    ${rows}</g>`);
}

/**
 * Update a link's label node: rebuild the pill when its text or tone changed, and set its opacity.
 * A label that changes text on a link that stays fades back in over `labelSwapMs`.
 * @param {LinkView} link
 * @param {string} text         the text to show (possibly the two-line form picked by the solver)
 * @param {number} now          stage clock in ms
 * @param {number} labelSwapMs
 * @param {typeof stageConfig.links} [opts]
 */
export function drawLabel(link, text, now, labelSwapMs, opts = stageConfig.links) {
  const { spec, label } = link;
  if (!spec.label) {
    if (link.labelKey) { label.innerHTML = ''; link.labelKey = null; }
    return;
  }
  const key = `${text}|${spec.labelTone || ''}`;
  if (link.labelKey !== key) {
    if (link.labelKey) link.labelBorn = now;                 // a swap, not a first paint
    label.innerHTML = labelMarkup(text, spec.labelTone || 'paper');
    link.labelKey = key;
  }
  const born = link.labelBorn === null ? 1 : clamp01((now - link.labelBorn) / labelSwapMs);
  label.style.opacity = R(clamp01((link.draw - opts.labelFrom) / (1 - opts.labelFrom)) * link.opacity * born);
}
