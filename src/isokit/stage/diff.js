/**
 * The scene diff. A scene is a full keyframe: `{ entities, links, flows }`. Nothing in a scene
 * says "add" or "move"; the stage compares the next keyframe with what is on screen and derives
 * three lists: who leaves, who changes, who arrives.
 *
 * Original: `np` (defaults merge), `rp`/`Jf` (equality), `Yf` (what kind of change), and the
 * first lines of `goTo` (index.pretty.js:18200-18255, 18727-18740). No DOM.
 */
import { stageConfig } from './config.js';
import { centerOf, primitive } from './deps.js';
import { cardSize, isCard, isDockedCard } from './cards.js';

/** Deep equality by JSON, treating `undefined` as `null`. Entity states are small plain objects. */
export const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Fill one entity with its primitive's defaults. Tags given as strings become `{ text }`.
 * @param {object} entity  raw entity from a scene
 * @returns {object | null} the full state, or null when the type is unknown
 */
export function withDefaults(entity) {
  const prim = entity && primitive(entity.type);
  if (!prim) return null;
  const state = { ...prim.defaults, ...entity };
  if (Array.isArray(state.tags)) state.tags = state.tags.map((t) => (typeof t === 'string' ? { text: t } : t));
  return state;
}

/**
 * Every entity of a scene with defaults applied.
 * @param {{ entities?: Record<string, object> }} scene
 * @param {(message: string) => void} [warn]  called for entities with an unknown type
 * @returns {Record<string, object>}
 */
export function normalizeScene(scene, warn = () => {}) {
  const out = {};
  for (const [id, raw] of Object.entries((scene && scene.entities) || {})) {
    const state = withDefaults(raw);
    if (state) out[id] = state;
    else warn(`entity "${id}" has unknown type "${raw && raw.type}"`);
  }
  return out;
}

/**
 * Draw order of an entity: larger = nearer the viewer = painted later.
 * Floor types are always underneath, a few types have a fixed depth, the rest sort by x − y.
 * @param {object} state
 * @param {typeof stageConfig.depth} [opts]
 * @returns {number}
 */
export function depthOf(state, opts = stageConfig.depth) {
  const prim = primitive(state.type);
  if (prim && prim.layer === 'floor') return opts.floor;
  if (state.type in opts.fixed) return opts.fixed[state.type];
  if (prim && prim.depth) return prim.depth(state);
  const [cx, cy] = centerOf(state);
  return cx - cy + (opts.bias[state.type] || 0);
}

/**
 * The target states of a scene as the stage will hold them: defaults applied, docked cards
 * either dropped (cards hidden) or stored under the shared card key with their dock position.
 * @param {object} scene
 * @param {{ dock?: { x: number, y: number, corner: string } | null }} plan  the scene's camera plan
 * @param {{ showCards: boolean, cardKey?: string, warn?: (m: string) => void }} ctx
 * @returns {Record<string, object>}
 */
export function targetStates(scene, plan, { showCards, cardKey = stageConfig.cards.key, warn }) {
  const out = {};
  for (const [id, state] of Object.entries(normalizeScene(scene, warn))) {
    if (!isDockedCard(state)) { out[id] = state; continue; }
    if (!showCards) continue;
    if (plan && plan.dock) out[cardKey] = { ...state, sx: plan.dock.x, sy: plan.dock.y, corner: plan.dock.corner };
    else out[id] = state;
  }
  return out;
}

/**
 * Compare what is on stage with the next targets.
 * @param {Map<string, { cur: object }>} current  live entities
 * @param {Record<string, object>} next           target states by id
 * @param {(state: object) => number} [depth]     sort key for arrivals (back to front)
 * @returns {{ exiting: string[], changed: string[], entering: string[] }}
 */
export function diffEntities(current, next, depth = depthOf) {
  return {
    exiting: [...current.keys()].filter((id) => !next[id]),
    changed: Object.keys(next).filter((id) => current.has(id) && !same(current.get(id).cur, next[id])),
    entering: Object.keys(next).filter((id) => !current.has(id)).sort((a, b) => depth(next[a]) - depth(next[b])),
  };
}

/**
 * Compare the live links with the next scene's.
 * @param {Map<string, object>} current
 * @param {Record<string, object>} [nextLinks]
 * @returns {{ removed: string[], kept: string[], added: string[] }}
 */
export function diffLinks(current, nextLinks = {}) {
  const ids = Object.keys(nextLinks);
  return {
    removed: [...current.keys()].filter((id) => !nextLinks[id]),
    kept: ids.filter((id) => current.has(id)),
    added: ids.filter((id) => !current.has(id)),
  };
}

/**
 * What needs special handling when an entity goes from one state to another.
 *   tagSwap    the tags differ: fade the old ones out, the new ones in
 *   labelSwap  label or sub-label differ: same cross-fade
 *   card       a card: `swap` (content changed → resize box and cross-fade content), the two
 *              natural sizes, and `keep` (the corner to stay pinned to while resizing, if unchanged)
 * @param {object} from
 * @param {object} to
 * @param {typeof stageConfig.cards} [opts]
 * @returns {{ tagSwap?: true, labelSwap?: true, card?: { swap: boolean, w0: number, h0: number, w1: number, h1: number, keep: string | null } }}
 */
export function describeChange(from, to, opts = stageConfig.cards) {
  const change = {};
  if (!same(from.tags, to.tags)) change.tagSwap = true;
  if (!same(from.label, to.label) || (from.sub || '') !== (to.sub || '')) change.labelSwap = true;
  if (isCard(to)) {
    const key = (e) => opts.swapKeys.map((k) => e[k]);
    const a = cardSize(from), b = cardSize(to);
    change.card = {
      swap: !same(key(from), key(to)),
      w0: a.w, h0: a.h, w1: b.w, h1: b.h,
      keep: from.corner && from.corner === to.corner ? to.corner : null,
    };
  }
  return change;
}

/**
 * Which entities get a floor flash once the transition settles: everything that arrived, and
 * everything that changed unless it is dead and was already just as dead.
 * @param {{ changed: string[], entering: string[] }} diff
 * @param {Map<string, { cur: object }>} current  live entities, read before the tweens run
 * @param {Record<string, object>} next
 * @returns {string[]}
 */
export function spotTargets(diff, current, next) {
  return [...diff.entering, ...diff.changed.filter((id) => !next[id].dead || current.get(id).cur.dead !== next[id].dead)];
}
