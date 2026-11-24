/**
 * Still pictures. `renderStatic({ entities, links })` returns one complete `<svg>` string:
 * its own `<defs>`, shapes in the right depth order, links trimmed to the shapes' outlines,
 * pills on top, and a viewBox fitted to the content. No stage, no animation loop, and no
 * DOM needed, so it also runs in Node.
 */
import { config } from './config.js';
import { R, esc } from './util.js';
import { iso } from './projection.js';
import { bbox, union, roundedPolyline, trimToOutlines, pointAt } from './geometry.js';
import { themed, isDark } from './color.js';
import { defsMarkup, gridLayer, cssText, ref } from './defs.js';
import { pill, pillLayout } from './pills.js';
import { primitive, resolveDefaults, centerOf, depthOf } from './registry.js';
import './primitives/index.js';

/**
 * How each link style is drawn. `marker` is the arrowhead definition, or `null` for styles
 * that never carry one.
 */
export const linkStyles = {
  solid: { stroke: null, width: 1.9, dash: '', marker: 'arrow' },
  dashed: { stroke: null, width: 1.9, dash: '5 4.5', marker: 'arrow' },
  off: { stroke: '#b0a698', width: 1.6, dash: '4 5', marker: 'arrow-muted' },
  beat: { stroke: '#3fa456', width: 2, dash: '1.5 5.5', marker: null },
  cut: { stroke: '#c0392b', width: 2, dash: '7 6', marker: null },
};
linkStyles.muted = linkStyles.off; // the earlier engine's name for the same style

/** Font size of a link label, px. */
export const LINK_LABEL_SIZE = 9.5;

/**
 * Turn a link's waypoints into world points.
 *
 * A waypoint is one of:
 * - `'lb'`            the centre of entity `lb`
 * - `'lb+2'`, `'lb-1.5'`  that centre with the offset added to both x and y
 * - `[a, b]`          x from `a` and y from `b`, where each is a number or an entity
 *                     reference: `['app', 'lb']` is the corner at app's x and lb's y
 *
 * @param {Array<string|Array<string|number>>} waypoints
 * @param {(id: string) => [number, number]|undefined} centerOfId world centre of an entity, or undefined
 * @returns {Array<[number, number]>} world points
 * @throws {Error} when a waypoint names an unknown entity
 */
export function resolveWaypoints(waypoints, centerOfId) {
  const axis = (value, k) => {
    if (typeof value === 'number') return value;
    const exact = centerOfId(value);
    if (exact) return exact[k];
    const m = /^(.+?)([+-]\d+(?:\.\d+)?)$/.exec(value);
    const base = m && centerOfId(m[1]);
    if (!base) throw new Error(`isokit: unknown waypoint "${value}"`);
    return base[k] + parseFloat(m[2]);
  };
  return waypoints.map((wp) => (Array.isArray(wp) ? [axis(wp[0], 0), axis(wp[1], 1)] : [axis(wp, 0), axis(wp, 1)]));
}

/**
 * The screen path of a link: waypoints projected to the floor, then trimmed so the line
 * starts 3 px outside the `from` shape and stops 4 px (3 px without an arrowhead) outside
 * the `to` shape.
 * @param {{ from: string, to?: string, pts?: Array, heads?: string }} spec link; `pts` defaults to `[from, to]`
 * @param {Record<string, object>} entities resolved entity states by id
 * @param {Record<string, number[][]|null>} polys each entity's `poly` by id
 * @returns {Array<[number, number]>} screen points
 */
export function linkPoints(spec, entities, polys) {
  const waypoints = spec.pts || [spec.from, spec.to];
  const world = resolveWaypoints(waypoints, (id) => (entities[id] ? centerOf(entities[id]) : undefined));
  const screen = world.map(([x, y]) => iso(x, y, 0));
  return trimToOutlines(screen, polys[spec.from], spec.to ? polys[spec.to] : null, { endGap: spec.heads === 'none' ? 3 : 4 });
}

/** Where a w × h label sits beside the path: clear of the line, above it when possible. */
function labelSpot(pts, t, w, h, side = 1) {
  const p = pointAt(pts, t);
  const gap = 7;
  let dx;
  let dy;
  if (Math.abs(p.dy) < 0.12) [dx, dy] = [0, -(h / 2 + gap + 3)];
  else if (Math.abs(p.dx) < 0.12) [dx, dy] = [w / 2 + gap + 3, 0];
  else if (p.dx * p.dy > 0) [dx, dy] = [w / 2 + gap, -(h / 2 + gap)];
  else [dx, dy] = [-(w / 2 + gap), -(h / 2 + gap)];
  return [p.x + dx * side, p.y + dy * side];
}

const asEntries = (value) =>
  Array.isArray(value) ? value.filter(Boolean).map((item, i) => [item.id ?? String(i), item]) : Object.entries(value || {}).filter(([, v]) => v);

/**
 * Lay out a scene without producing the final SVG: every layer as markup (light-mode
 * colours) and the bounds of the whole picture.
 * @param {{ entities?: object|object[], links?: object|object[] }} scene
 * @returns {{ floor: string, links: string, ents: string, over: string, hud: string, bounds: number[] }}
 *   `bounds` is `[x0, y0, x1, y1]` in px
 */
export function staticLayers(scene) {
  const entities = {};
  for (const [id, raw] of asEntries(scene.entities)) {
    if (!primitive(raw.type)) throw new Error(`isokit: entity "${id}" has unknown type "${raw.type}"`);
    entities[id] = resolveDefaults(raw);
  }
  const ids = Object.keys(entities);
  const out = {};
  const polys = {};
  let bounds = null;
  for (const id of ids) {
    out[id] = primitive(entities[id].type).render(entities[id]);
    polys[id] = out[id].poly;
    bounds = union(bounds, out[id].bounds);
    // a primitive's bounds describe it at rest; a still picture must also fit a raised shape and its shadow
    const lift = Math.abs(entities[id].lift || 0);
    if (lift && out[id].bounds) bounds = union(bounds, [out[id].bounds[0], out[id].bounds[1] - lift, out[id].bounds[2], out[id].bounds[3] + lift]);
  }

  const layerOf = (id) => primitive(entities[id].type);
  const byDepth = (a, b) => depthOf(entities[a]) - depthOf(entities[b]);
  const wrap = (id, markup) => (markup ? `<g data-id="${esc(id)}">${markup}</g>` : '');
  const floor = ids.filter((id) => layerOf(id).layer === 'floor').sort(byDepth).map((id) => wrap(id, out[id].body)).join('');
  const ents = ids.filter((id) => layerOf(id).layer !== 'floor').sort(byDepth).map((id) => wrap(id, out[id].body)).join('');
  let over = ids.filter((id) => layerOf(id).overLayer !== 'hud').map((id) => wrap(id, out[id].over)).join('');
  const hud = ids.filter((id) => layerOf(id).overLayer === 'hud').map((id) => wrap(id, out[id].over)).join('');

  let links = '';
  for (const [id, spec] of asEntries(scene.links)) {
    const pts = linkPoints(spec, entities, polys);
    const style = linkStyles[spec.style || 'solid'] || linkStyles.solid;
    const heads = spec.heads || 'end';
    const marker = style.marker ? ref(style.marker) : '';
    links +=
      `<path data-id="${esc(id)}" d="${roundedPolyline(pts, 9)}" fill="none" stroke="${style.stroke || config.ink}" stroke-width="${style.width}" stroke-linecap="round" stroke-linejoin="round"` +
      (style.dash ? ` stroke-dasharray="${style.dash}"` : '') +
      (marker && heads !== 'none' ? ` marker-end="${marker}"` : '') +
      (marker && heads === 'both' ? ` marker-start="${marker}"` : '') +
      `/>`;
    bounds = union(bounds, bbox(pts, [3, 3, 3, 3]));
    if (spec.label) {
      const { tw, h } = pillLayout(spec.label, LINK_LABEL_SIZE);
      const w = tw + 2 * config.pill.padX;
      const [lx, ly] = labelSpot(pts, spec.labelAt ?? 0.5, w, h, spec.labelSide === -1 ? -1 : 1);
      over += `<g transform="translate(${R(lx)} ${R(ly)})">${pill(0, 0, spec.label, { tone: spec.labelTone || 'paper', size: LINK_LABEL_SIZE })}</g>`;
      bounds = union(bounds, [lx - w / 2, ly - h / 2, lx + w / 2, ly + h / 2 + 2]);
    }
  }
  return { floor, links, ents, over, hud, bounds: bounds || [-100, -60, 100, 60] };
}

/**
 * Render a scene as a complete, standalone SVG string.
 *
 * ```js
 * const svg = renderStatic({
 *   entities: {
 *     users: { type: 'crowd', x0: -4, x1: 4, y0: -14, y1: -9, count: 9, label: '2,000 users' },
 *     app:   { type: 'block', x: 0, y: 0, label: ['App', 'Server'], cpu: 0.4 },
 *   },
 *   links: { u: { from: 'users', to: 'app', heads: 'both' } },
 * });
 * ```
 *
 * Layers, back to front: floor shapes (zones, rings), links, shapes sorted by depth,
 * pills and link labels, cards.
 *
 * @param {{ entities?: object|object[], links?: object|object[] }} scene entities and links,
 *   each as an `{ id: spec }` map or as an array (ids are then `spec.id` or the index)
 * @param {object} [opts]
 * @param {boolean} [opts.dark=isDark()] render in dark-mode colours
 * @param {number} [opts.padding=24] free space around the content, px
 * @param {boolean} [opts.defs=true] embed the shared `<defs>`; pass false when the page already called `ensureDefs()`
 * @param {boolean} [opts.css=true] embed the core CSS (`white-space: pre`, heat pulse)
 * @param {boolean} [opts.grid=false] draw the faded floor grid behind everything
 * @param {string|null} [opts.background=null] fill colour of a background rectangle (remapped in dark mode)
 * @param {number|string} [opts.width] `width` attribute; defaults to the natural width in px
 * @param {number|string} [opts.height] `height` attribute; defaults to the natural height in px
 * @param {boolean} [opts.fluid=false] omit width and height so the SVG scales to its container
 * @param {string} [opts.uid] make every id unique to this SVG (`iso-<uid>-…`), for pages that
 *   hold several standalone pictures with different themes or palettes
 * @param {string} [opts.title] accessible name, written as `aria-label`
 * @param {string} [opts.className='iso-svg'] class of the root element
 * @returns {string} SVG markup
 */
export function renderStatic(scene, opts = {}) {
  const { dark = isDark(), padding = 24, defs = true, css = true, grid = false, background = null, fluid = false, uid = '', title = '', className = 'iso-svg' } = opts;
  const L = staticLayers(scene);
  const x = Math.floor(L.bounds[0] - padding);
  const y = Math.floor(L.bounds[1] - padding);
  const w = Math.ceil(L.bounds[2] + padding) - x;
  const h = Math.ceil(L.bounds[3] + padding) - y;

  let inner =
    (defs ? `<defs>${defsMarkup()}</defs>` : '') +
    (background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : '') +
    (grid ? gridLayer({ cx: x + w / 2, cy: y + h / 2, r: w * 0.56, uid: 's' }) : '') +
    `<g class="iso-floor">${L.floor}</g><g class="iso-links">${L.links}</g><g class="iso-ents">${L.ents}</g><g class="iso-over">${L.over}</g><g class="iso-hud">${L.hud}</g>`;
  inner = themed(inner, dark);
  if (uid) {
    const from = config.idPrefix;
    const to = `${from}${uid}-`;
    inner = inner.split(`url(#${from}`).join(`url(#${to}`).split(`id="${from}`).join(`id="${to}`);
  }
  const size = fluid ? '' : ` width="${opts.width ?? w}" height="${opts.height ?? h}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="${esc(className)}" viewBox="${x} ${y} ${w} ${h}"${size} role="img"` +
    (title ? ` aria-label="${esc(title).replace(/"/g, '&quot;')}"` : '') +
    ` font-family="${config.font.replace(/"/g, '&quot;')}">` +
    (css ? `<style>${cssText()}</style>` : '') +
    inner +
    `</svg>`
  );
}
