/**
 * Scene layout at rest: render every entity of a scene once (off-screen, as strings) to learn
 * what the camera must frame, what a docked card must avoid, and where each link label goes.
 *
 * This runs once per scene when a lesson is loaded or the stage is resized, never per frame.
 * Original: `layoutOf` (index.pretty.js:18328-18377).
 */
import { stageConfig } from './config.js';
import { cardFootprint, cardSize, isDockedCard } from './cards.js';
import { centerOf, primitive, textWidth } from './deps.js';
import { normalizeScene } from './diff.js';
import { growRect, samplePolyline, unionRect } from './geometry.js';
import { collectObstacles, solveLabels } from './labels.js';
import { routeLink } from './links.js';

/**
 * @typedef {object} SceneLayout
 * @property {number[]} b              bounds of everything, [x0, y0, x1, y1] in SVG units
 * @property {number[][]} boxes        rectangles a docked card must not cover (entities, link samples, labels)
 * @property {number[][][]} polys      floor polygons a docked card must not cover (zones)
 * @property {{ w: number, h: number } | null} panel  screen size of the scene's docked card, if any
 * @property {Record<string, { side: number, label: string, text: string }>} picks  label placement per link id
 */

/**
 * Lay a scene out.
 * @param {{ entities?: object, links?: object }} scene
 * @param {object} ctx
 * @param {number} ctx.hudScale              scale of docked cards
 * @param {boolean} ctx.showCards            false = docked cards are not on the stage
 * @param {typeof stageConfig} [ctx.config]
 * @param {(message: string) => void} [ctx.warn]
 * @param {string} [ctx.locale]              for two-line label wrapping of CJK text
 * @returns {SceneLayout}
 */
export function layoutScene(scene, { hudScale, showCards, config: cfg = stageConfig, warn = () => {}, locale }) {
  const ents = normalizeScene(scene, warn);
  const centerOfId = (id) => (ents[id] ? centerOf(ents[id]) : null);
  const outlines = {}, boxes = [], floorPolys = [], obstacles = { polys: [], boxes: [] };
  let bounds = null, panel = null;

  for (const [id, state] of Object.entries(ents)) {
    if (isDockedCard(state)) {
      if (showCards) panel = cardFootprint(cardSize(state), hudScale, cfg.cards);
      continue;
    }
    const prim = primitive(state.type), out = prim.render(state);
    outlines[id] = out.poly;
    bounds = unionRect(bounds, out.bounds);
    if (prim.layer === 'floor' && out.poly) floorPolys.push(out.poly);      // a zone blocks only inside its diamond
    else boxes.push(out.bounds);
    if (prim.obstacle !== false && !prim.card) collectObstacles(state, out.poly, out.bounds, obstacles, cfg.labels);
  }

  const samples = [], requests = [];
  for (const [id, spec] of Object.entries((scene && scene.links) || {})) {
    let pts;
    try { pts = routeLink(spec, centerOfId, (eid) => outlines[eid], cfg.links); } catch (err) { warn(`link "${id}": ${err.message}`); continue; }
    samples.push(...samplePolyline(pts, cfg.links.sampleStep));
    if (spec.label) requests.push({ id, pts, at: spec.labelAt ?? 0.5, label: spec.label });
  }
  for (const [x, y] of samples) {
    const box = growRect([x, y, x, y], cfg.links.samplePad);
    boxes.push(box);
    bounds = unionRect(bounds, box);
  }

  const { picks, rects } = solveLabels(requests, obstacles, samples, textWidth, { ...cfg.labels, locale });
  for (const rect of rects) {
    boxes.push(rect);
    bounds = unionRect(bounds, [rect[0] - 2, rect[1] - 2, rect[2] + 2, rect[3] + 4]);   // +4 below for the pill's hard shadow
  }
  return { b: bounds || [...cfg.camera.emptyBounds], boxes, polys: floorPolys, panel, picks };
}
