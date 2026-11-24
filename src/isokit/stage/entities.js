/**
 * Entity nodes. Each entity on stage is one retained `<g>` for its shape and one for its pills
 * and labels (kept in a layer above every shape). The contents of both are regenerated as markup
 * from the primitive's pure renderer whenever the entity's state changes.
 *
 * Original: `addEntity`, `removeEntity`, `renderEntity`, `sortDepth` (index.pretty.js:18855-18882).
 */
import { dockedCardMarkup, isDockedCard } from './cards.js';
import { stageConfig } from './config.js';
import { primitive, themed } from './deps.js';
import { depthOf } from './diff.js';
import { svgEl } from './svg.js';

/**
 * @typedef {object} EntityView
 * @property {string} id
 * @property {object} cur                current state (replaced on every tween frame)
 * @property {SVGGElement} el            the shape, in the floor or the entity layer
 * @property {SVGGElement} overEl        pills and labels, in the over layer (or the HUD layer for a docked card)
 * @property {number[][] | null} poly    current screen outline (links are trimmed against it)
 * @property {number[] | null} bounds    current screen bounds
 * @property {object | null} tween       the running tween record, if any
 * @property {boolean} docked            true for a screen-space card
 */

/**
 * Create the two nodes of an entity and draw its first state.
 * @param {string} id
 * @param {object} state  full state (defaults applied)
 * @param {{ floor: Element, ents: Element, over: Element, hud: Element }} layers
 * @param {number} hudScale
 * @returns {EntityView}
 */
export function createEntity(id, state, layers, hudScale) {
  const prim = primitive(state.type), docked = isDockedCard(state);
  const el = svgEl('g', { class: `iso-ent iso-ent--${state.type}`, 'data-id': id });
  const overEl = svgEl('g', { class: 'iso-ent-over', 'data-id': id });
  (prim.layer === 'floor' ? layers.floor : layers.ents).appendChild(el);
  (docked ? layers.hud : layers.over).appendChild(overEl);
  const ent = { id, cur: { ...state }, el, overEl, poly: null, bounds: null, tween: null, docked };
  renderEntity(ent, hudScale);
  return ent;
}

/** Take an entity's nodes out of the document. */
export function removeEntityNodes(ent) {
  ent.el.remove();
  ent.overEl.remove();
}

/**
 * Redraw an entity from `ent.cur`. This is the whole per-frame render strategy: no attribute
 * patching, just two `innerHTML` writes of freshly generated markup (remapped for dark mode).
 * @param {EntityView} ent
 * @param {number} hudScale  scale of docked cards
 */
export function renderEntity(ent, hudScale) {
  if (ent.docked) {
    ent.overEl.innerHTML = dockedCardMarkup(ent.cur, hudScale);
    ent.poly = ent.bounds = null;
    return;
  }
  const out = primitive(ent.cur.type).render(ent.cur);
  ent.el.innerHTML = themed(out.body || '');
  ent.overEl.innerHTML = themed(out.over || '');
  ent.poly = out.poly;
  ent.bounds = out.bounds;
}

/**
 * Painter's algorithm: put the nodes of the entity layer in back-to-front order. Nodes are
 * re-appended only when the order actually changed, so a still scene costs one comparison pass.
 * @param {Iterable<EntityView>} ents
 * @param {Element} layer  the entity layer
 * @param {typeof stageConfig.depth} [opts]
 */
export function sortByDepth(ents, layer, opts = stageConfig.depth) {
  const order = [...ents].filter((e) => e.el.parentNode === layer).sort((a, b) => depthOf(a.cur, opts) - depthOf(b.cur, opts));
  const kids = layer.children;
  if (order.some((e, i) => kids[i] !== e.el)) for (const e of order) layer.appendChild(e.el);
}
