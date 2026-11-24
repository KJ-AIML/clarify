/**
 * Docked cards: a note card that lives in screen space (the HUD layer), parked in whichever
 * corner of the stage the diagram leaves free.
 *
 * Original: `Nf` (footprint), `dockRect`, `dockAt`, `cardClear`, `measure` and the HUD part of
 * `renderEntity` (index.pretty.js:18041, 18378-18394, 18459-18465, 18867-18874).
 *
 * A `panel` is always docked (as in the original). Any other card primitive (`card: true`, e.g. the
 * legacy `note`) is docked when it has no world anchor (`x` undefined) and stays a normal
 * world-space entity when it has one. `dock: true | false` on the entity overrides both.
 */
import { stageConfig } from './config.js';
import { primitive, R, themed } from './deps.js';
import { polygonHitsRect, rectsOverlap } from './geometry.js';

/**
 * Is this entity state a docked (screen-space) card? `dock: true | false` on the entity decides;
 * without it a `panel` always docks and any other card docks when it has no world `x`.
 */
export function isDockedCard(state) {
  if (!isCard(state)) return false;
  return typeof state.dock === 'boolean' ? state.dock : state.type === 'panel' || state.x == null;
}

/** Is this entity a card of either kind (docked or anchored)? Cards resize and cross-fade their content. */
export const isCard = (state) => {
  const prim = state && primitive(state.type);
  return !!prim && (prim.card === true || state.type === 'panel');
};

/**
 * Natural size of a card, ignoring any in-flight resize.
 * @param {object} state
 * @returns {{ w: number, h: number }} px at scale 1
 */
export function cardSize(state) {
  const out = primitive(state.type).render({ ...state, x: 0, y: 0, z: 0, dx: 0, dy: 0, lift: 0, boxW: undefined, boxH: undefined });
  return out.size || { w: 0, h: 0 };
}

/**
 * Scale of HUD cards for a host width: `width / 780`, clamped to 0.86 … 1.16.
 * @param {number} hostWidth px
 */
export const hudScaleFor = (hostWidth, opts = stageConfig.cards) =>
  Math.min(opts.maxScale, Math.max(opts.minScale, hostWidth / opts.scaleWidth));

/** Cards are shown on the stage only when the host is at least 520 px wide. */
export const cardsVisible = (hostWidth, opts = stageConfig.cards) => hostWidth >= opts.minHostWidth;

/**
 * Screen footprint of a card: its size times the HUD scale, plus the hard shadow under it.
 * @param {{ w: number, h: number }} size
 * @param {number} scale
 */
export const cardFootprint = (size, scale, opts = stageConfig.cards) => ({ w: size.w * scale, h: (size.h + opts.shadow) * scale });

/**
 * Where a card of a given screen size sits for a corner.
 * @param {'tr' | 'br' | 'tl' | 'bl'} corner
 * @param {{ w: number, h: number }} size            screen px (see cardFootprint)
 * @param {{ w: number, h: number }} viewport        host size in px
 * @param {{ top: number, right: number, bottom: number, left: number }} [inset]  px reserved by overlays
 * @returns {number[]} [x0, y0, x1, y1] in host px
 */
export function dockRect(corner, size, viewport, inset = NO_INSET, opts = stageConfig.cards) {
  const m = opts.margin;
  const x = corner[1] === 'l' ? inset.left + m.x : viewport.w - inset.right - m.x - size.w;
  const y = corner[0] === 't' ? inset.top + m.top : viewport.h - inset.bottom - m.bottom - size.h;
  return [x, y, x + size.w, y + size.h];
}
const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Would a card docked in `corner` stay clear of the diagram under camera `cam`?
 * The card rectangle, grown by the clearance, is converted to SVG units and tested against every
 * obstacle box and every floor polygon (zones: only the diamond blocks, not its bounding box).
 * @param {{ boxes: number[][], polys: number[][][], panel: { w: number, h: number } }} layout
 * @param {{ x: number, y: number, w: number, h: number }} cam
 * @param {string} corner
 * @param {{ w: number, h: number }} viewport
 * @param {object} [inset]
 */
export function cardClear(layout, cam, corner, viewport, inset = NO_INSET, opts = stageConfig.cards) {
  const k = viewport.w / cam.w, r = dockRect(corner, layout.panel, viewport, inset, opts), c = opts.clearance;
  const area = [cam.x + (r[0] - c) / k, cam.y + (r[1] - c) / k, cam.x + (r[2] + c) / k, cam.y + (r[3] + c) / k];
  return !layout.boxes.some((box) => rectsOverlap(box, area)) && !layout.polys.some((poly) => polygonHitsRect(poly, area));
}

/**
 * Markup of a docked card for the HUD layer (whose transform maps host px to SVG units).
 * @param {object} state    card state with `sx`, `sy` (host px of its top-left corner)
 * @param {number} scale    HUD scale
 * @returns {string}
 */
export function dockedCardMarkup(state, scale) {
  const out = primitive(state.type).render({ ...state, x: 0, y: 0, z: 0, dx: 0, dy: 0 });
  return `<g transform="translate(${R(state.sx || 0)} ${R(state.sy || 0)}) scale(${R(scale)})">${themed(out.over)}</g>`;
}
