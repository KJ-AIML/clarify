/**
 * The primitive registry.
 *
 * A primitive is a pure function from entity state to SVG strings, plus a little metadata
 * that tells the stage how to treat it:
 *
 * ```js
 * registerPrimitive('block', {
 *   defaults: { s: 4, h: 46, ... },   // merged under every entity of this type
 *   enterFrom: { lift: 120 },         // state it starts from when it appears (opacity 0 is added)
 *   exitTo: { lift: -22 },            // state it moves to when it leaves (opacity 0 is added)
 *   layer: 'ents',                    // where `body` goes: 'ents' (depth-sorted) or 'floor' (under links)
 *   overLayer: 'over',                // where `over` goes: 'over', or 'hud' for cards
 *   spot: true,                       // flash its footprint on the floor when it appears or changes
 *   obstacle: true,                   // link labels keep clear of it
 *   card: false,                      // a floating card that resizes while its text cross-fades
 *   footprint: (e) => [x0, x1, y0, y1],   // world rectangle it stands on
 *   center: (e) => [x, y],                // world point links are routed to
 *   depth: (e) => number,                 // paint order; larger is nearer the viewer
 *   render: (e) => ({ body, over, poly, bounds }),
 * });
 * ```
 *
 * `render` returns:
 * - `body`   SVG for the shape itself
 * - `over`   SVG for its pills and labels, drawn above every shape so nothing hides them
 * - `poly`   convex screen outline used to trim links, or `null` (links then run to the centre)
 * - `bounds` `[x0, y0, x1, y1]` in px, pills included: for the camera and the label solver
 */
import { config } from './config.js';
import { icons } from './icons.js';

const primitives = new Map();

/**
 * Register (or replace) a primitive type.
 * @param {string} type the value of `entity.type`
 * @param {object} def see the module description; only `render` is required
 */
export function registerPrimitive(type, def) {
  primitives.set(type, {
    defaults: {},
    enterFrom: { lift: 120 },
    exitTo: { lift: -22 },
    layer: 'ents',
    overLayer: 'over',
    spot: true,
    obstacle: true,
    card: false,
    ...def,
    type,
  });
}

/**
 * Look up a registered primitive.
 * @param {string} type
 * @returns {object|undefined} the definition with defaults filled in
 */
export const primitive = (type) => primitives.get(type);

/** @returns {string[]} every registered type name, in registration order */
export const primitiveTypes = () => [...primitives.keys()];

/**
 * An entity with its type's defaults filled in. Tags written as plain strings become
 * `{ text }` objects. The input is not modified.
 * @param {{ type: string }} e raw entity from a scene
 * @returns {object} complete entity state
 */
export function resolveDefaults(e) {
  const def = primitives.get(e.type);
  const out = { ...(def ? def.defaults : null), ...e };
  if (Array.isArray(out.tags) && out.tags.some((t) => typeof t === 'string')) {
    out.tags = out.tags.map((t) => (typeof t === 'string' ? { text: t } : t));
  }
  return out;
}

/**
 * The world point a link aims at.
 * Rule: the type's own `center`, else the middle of `x0…x1, y0…y1`, else `(x, y)`.
 * @param {object} e entity state
 * @returns {[number, number]} world `[x, y]`
 */
export function centerOf(e) {
  const def = primitives.get(e.type);
  if (def && def.center) return def.center(e);
  return 'x0' in e ? [(e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2] : [e.x, e.y];
}

/**
 * The world rectangle an entity stands on.
 * Rule: the type's own `footprint`, else `x0…x1, y0…y1`, else a square of side `s` (default 4)
 * around `(x, y)`.
 * @param {object} e entity state
 * @returns {[number, number, number, number]} `[x0, x1, y0, y1]` in grid units
 */
export function footprintOf(e) {
  const def = primitives.get(e.type);
  if (def && def.footprint) return def.footprint(e);
  if ('x0' in e) return [e.x0, e.x1, e.y0, e.y1];
  const half = (e.s || 4) / 2;
  return [e.x - half, e.x + half, e.y - half, e.y + half];
}

/**
 * Paint order. Smaller is painted first (further back).
 * Rule: the type's own `depth`, else −10000 for floor-layer types, else `x − y` of the centre.
 * @param {object} e entity state
 * @returns {number}
 */
export function depthOf(e) {
  const def = primitives.get(e.type);
  if (def && def.depth) return def.depth(e);
  if (def && def.layer === 'floor') return -1e4;
  const [cx, cy] = centerOf(e);
  return cx - cy;
}

/**
 * Fill in defaults and render in one step.
 * @param {{ type: string }} e raw entity
 * @returns {{ body: string, over: string, poly: number[][]|null, bounds: number[] }}
 * @throws {Error} when the type is not registered
 */
export function renderEntity(e) {
  const def = primitives.get(e.type);
  if (!def) throw new Error(`isokit: unknown primitive type "${e.type}"`);
  return def.render(resolveDefaults(e));
}

const extraMeta = {};

/**
 * Add fields to what `meta()` reports. The stage uses it to list link styles and packet kinds.
 * @param {object} fields
 */
export function extendMeta(fields) {
  Object.assign(extraMeta, fields);
}

/**
 * What a lesson may refer to by name: for validators and editors.
 * @returns {{ types: string[], colors: string[], tones: string[], icons: string[] }} plus anything added with `extendMeta`
 */
export const meta = () => ({
  types: primitiveTypes(),
  colors: [...Object.keys(config.palette), ...Object.keys(config.aliases)],
  tones: Object.keys(config.tones),
  icons: Object.keys(icons),
  ...extraMeta,
});
