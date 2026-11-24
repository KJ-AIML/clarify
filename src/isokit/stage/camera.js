/**
 * The camera. It is nothing but the SVG `viewBox`: `{ x, y, w, h }` in SVG units, with the same
 * aspect ratio as the host element, so `zoom = hostWidth / w` is screen px per SVG unit.
 *
 * Three jobs:
 *   planCamera     pick the camera (and the card corner) for one scene, given the previous one
 *   view helpers   the user's zoom/pan on top of the planned camera
 *   applyCamera    write viewBox, HUD transform and grid vignette to the DOM
 *
 * Original: `planFor`, `displayCam`, `setCam`, `clampView`, `zoomAt`, `panBy`, `toggleZoomAt`
 * (index.pretty.js:18395-18580). Everything except `applyCamera` is pure.
 */
import { clamp01, easeInOutCubic, lerp } from '../motion/easing.js';
import { stageConfig } from './config.js';
import { cardClear, dockRect } from './cards.js';
import { R } from './deps.js';

const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

/** Floor a zoom to the step (0.05) and keep it above the minimum. Fewer distinct zooms = fewer camera moves. */
export function quantizeZoom(zoom, opts = stageConfig.camera) {
  const perUnit = Math.round(1 / opts.zoomStep);             // 20 steps per 1.0
  return Math.max(opts.minZoom, Math.floor(zoom * perUnit + 1e-6) / perUnit);
}

/**
 * The largest zoom at which `bounds` fits the free area with padding, capped at `maxZoom`. Not quantized.
 * @param {number[]} bounds  [x0, y0, x1, y1] in SVG units
 * @param {{ w: number, h: number }} viewport  host px
 * @param {object} [inset]   px reserved on each side
 */
export function fitZoom(bounds, viewport, inset = NO_INSET, opts = stageConfig.camera) {
  const bw = Math.max(1, bounds[2] - bounds[0]), bh = Math.max(1, bounds[3] - bounds[1]);
  const aw = viewport.w - inset.left - inset.right, ah = viewport.h - inset.top - inset.bottom;
  return Math.min(opts.maxZoom, (aw - 2 * opts.pad) / bw, (ah - 2 * opts.pad) / bh);
}

/**
 * The camera that shows `bounds` at `zoom`, aligned inside the free area.
 * @param {number[]} bounds
 * @param {number} zoom       px per SVG unit
 * @param {-1 | 0 | 1} ax     −1 = against the left edge, 0 = centred, 1 = against the right edge
 * @param {-1 | 0 | 1} ay     −1 = top, 0 = centred, 1 = bottom
 * @param {{ w: number, h: number }} viewport
 * @param {object} [inset]
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function frameBounds(bounds, zoom, ax, ay, viewport, inset = NO_INSET, opts = stageConfig.camera) {
  const bw = Math.max(1, bounds[2] - bounds[0]) * zoom, bh = Math.max(1, bounds[3] - bounds[1]) * zoom;
  const aw = viewport.w - inset.left - inset.right, ah = viewport.h - inset.top - inset.bottom;
  const left = ax === 0 ? inset.left + (aw - bw) / 2 : ax < 0 ? inset.left + opts.pad : viewport.w - inset.right - opts.pad - bw;
  const top = ay === 0 ? inset.top + (ah - bh) / 2 : ay < 0 ? inset.top + opts.pad : viewport.h - inset.bottom - opts.pad - bh;
  return { x: bounds[0] - left / zoom, y: bounds[1] - top / zoom, w: viewport.w / zoom, h: viewport.h / zoom };
}

/**
 * Fit a rectangle into a viewport: the short way in when you only need "frame this".
 * @returns {{ cam: { x: number, y: number, w: number, h: number }, zoom: number }}
 */
export function fitCamera(bounds, viewport, inset = NO_INSET, opts = stageConfig.camera) {
  const zoom = quantizeZoom(fitZoom(bounds, viewport, inset, opts), opts);
  return { cam: frameBounds(bounds, zoom, 0, 0, viewport, inset, opts), zoom };
}

/** With a docked card: for each corner, the highest zoom and gentlest alignment that leaves it free. */
function bestCardFraming(layout, top, viewport, inset, prev, opts, cards) {
  let best = null;
  cards.corners.forEach((corner, ci) => {
    const sx = corner[1] === 'l' ? 1 : -1, sy = corner[0] === 't' ? 1 : -1;      // push the diagram away from the card
    const aligns = [[0, 0], [sx, 0], [0, sy], [sx, sy]];
    let found = null;
    for (let zoom = top; zoom >= opts.minZoom - 1e-6 && !found; zoom = Math.round((zoom - opts.zoomStep) * 100) / 100) {
      for (let ai = 0; ai < aligns.length; ai++) {
        const [ax, ay] = aligns[ai];
        if (!cardClear(layout, frameBounds(layout.b, zoom, ax, ay, viewport, inset, opts), corner, viewport, inset, cards)) continue;
        const score = zoom - ai * cards.alignPenalty - ci * cards.cornerPenalty + (prev && prev.corner === corner ? cards.stickBonus : 0);
        found = { zoom, ax, ay, corner, score };
        break;
      }
    }
    if (found && (!best || found.score > best.score)) best = found;
  });
  return best;
}

/**
 * Plan the camera for one scene.
 *
 * 1. Fit: zoom = min(1.6, free width / bounds width, free height / bounds height), floored to 0.05.
 * 2. Card: if the scene has a docked card, search corners × zooms × alignments for the framing
 *    with the best score (zoom, minus small penalties, plus a bonus for the previous corner).
 * 3. Hysteresis: if the previous camera has the same zoom (or up to 10 % less) and still holds the
 *    bounds with 12 px to spare and the centre has drifted less than 12 % (18 %) of the view,
 *    keep the previous camera exactly. Small scene changes then do not move the camera at all.
 *
 * @param {{ b: number[], boxes: number[][], polys: number[][][], panel: { w: number, h: number } | null, picks: object }} layout
 * @param {{ w: number, h: number }} viewport  host px
 * @param {{ cam: object, zoom: number, corner: string | null } | null} prev  the previous step's plan
 * @param {{ inset?: object, camera?: typeof stageConfig.camera, cards?: typeof stageConfig.cards }} [o]
 * @returns {{ cam: { x: number, y: number, w: number, h: number }, zoom: number, corner: string | null,
 *             dock: { x: number, y: number, corner: string } | null, picks: object }}
 */
export function planCamera(layout, viewport, prev, { inset = NO_INSET, camera: opts = stageConfig.camera, cards = stageConfig.cards } = {}) {
  const vp = { w: Math.max(1, viewport.w), h: Math.max(1, viewport.h) };
  const b = layout.b, fit = fitZoom(b, vp, inset, opts);
  let pick;
  if (!layout.panel) pick = { zoom: quantizeZoom(fit, opts), ax: 0, ay: 0, corner: null };
  else pick = bestCardFraming(layout, quantizeZoom(fit, opts), vp, inset, prev, opts, cards)
    || { zoom: quantizeZoom(fit * cards.fallbackZoom, opts), ax: -1, ay: 1, corner: 'tr' };
  let cam = frameBounds(b, pick.zoom, pick.ax, pick.ay, vp, inset, opts), corner = pick.corner, zoom = pick.zoom;

  if (prev) {
    const sameZoom = Math.abs(prev.zoom - zoom) < 1e-6;
    const nearZoom = prev.zoom < zoom && prev.zoom >= zoom * opts.keepZoomRatio;
    if (sameZoom || nearZoom) {
      const c = prev.cam, k = prev.zoom, m = opts.keepMargin / k;
      const fx0 = c.x + inset.left / k, fy0 = c.y + inset.top / k, fx1 = c.x + c.w - inset.right / k, fy1 = c.y + c.h - inset.bottom / k;
      const inside = b[0] >= fx0 + m && b[1] >= fy0 + m && b[2] <= fx1 - m && b[3] <= fy1 - m;
      const driftX = Math.abs((b[0] + b[2]) / 2 - (fx0 + fx1) / 2) / c.w, driftY = Math.abs((b[1] + b[3]) / 2 - (fy0 + fy1) / 2) / c.h;
      const limit = sameZoom ? opts.keepDriftSame : opts.keepDriftNear;
      if (inside && driftX < limit && driftY < limit) {
        const free = layout.panel ? [prev.corner, ...cards.corners].filter(Boolean).find((cn) => cardClear(layout, c, cn, vp, inset, cards)) : null;
        if (!layout.panel || free) { cam = c; corner = layout.panel ? free : null; zoom = prev.zoom; }
      }
    }
  }
  const r = layout.panel ? dockRect(corner, layout.panel, vp, inset, cards) : null;
  return { cam, zoom, corner, dock: r && { x: r[0], y: r[1], corner }, picks: layout.picks };
}

/**
 * Plan a whole lesson in order, each step knowing the previous step's plan.
 * @template S
 * @param {S[]} scenes
 * @param {(scene: S, prev: object | null) => object} planOne
 * @returns {Map<S, object>}
 */
export function planSequence(scenes, planOne) {
  const plans = new Map();
  let prev = null;
  for (const scene of scenes) { prev = planOne(scene, prev); plans.set(scene, prev); }
  return plans;
}

/**
 * @typedef {{ k: number, cx: number, cy: number }} View  the user's zoom: factor `k` > 1 around a centre in SVG units
 */

/** The camera actually shown: the planned camera narrowed by the user's view. */
export function viewCamera(cam, view) {
  if (!view) return cam;
  const w = cam.w / view.k, h = cam.h / view.k;
  return { x: view.cx - w / 2, y: view.cy - h / 2, w, h };
}

/**
 * Keep a view legal: factor between 1 and the cap, centre inside the planned camera (you can zoom
 * into the diagram but never pan off it). Returns null when the factor is ~1, meaning "not zoomed".
 * The cap lets you reach 3.2 screen px per SVG unit, but always allows 1.5× and never more than 6×.
 * @param {View | null} view
 * @param {{ x: number, y: number, w: number, h: number }} cam
 * @param {number} hostWidth  px
 * @returns {View | null}
 */
export function clampView(view, cam, hostWidth, opts = stageConfig.view) {
  if (!view) return null;
  const cap = Math.max(opts.minCap, Math.min(opts.maxCap, opts.maxPxPerUnit / (hostWidth / cam.w)));
  const k = Math.max(1, Math.min(cap, view.k));
  if (k <= 1.001) return null;
  const w = cam.w / k, h = cam.h / k;
  return {
    k,
    cx: Math.max(cam.x + w / 2, Math.min(cam.x + cam.w - w / 2, view.cx)),
    cy: Math.max(cam.y + h / 2, Math.min(cam.y + cam.h - h / 2, view.cy)),
  };
}

/**
 * Zoom by `factor` keeping the point under the cursor fixed.
 * @param {object} cam          planned camera
 * @param {View | null} view    current view
 * @param {object} shown        camera currently displayed (viewCamera, or a blend in flight)
 * @param {number} fx           cursor x as a fraction of the host width, 0..1
 * @param {number} fy           cursor y as a fraction of the host height
 * @param {number} factor       > 1 zooms in
 * @returns {View} unclamped; pass it through clampView
 */
export function zoomViewAt(cam, view, shown, fx, fy, factor) {
  const px = shown.x + fx * shown.w, py = shown.y + fy * shown.h;
  const k = (view ? view.k : 1) * factor, w = cam.w / k, h = cam.h / k;
  return { k, cx: px - fx * w + w / 2, cy: py - fy * h + h / 2 };
}

/** Pan a view by a fraction of the displayed size (drag right = positive dx = content follows the pointer). */
export const panView = (view, shown, dx, dy) => ({ ...view, cx: view.cx - dx * shown.w, cy: view.cy - dy * shown.h });

/**
 * Blend between a camera captured earlier and the target (used when the view changes with animation).
 * @param {{ from: object, start: number, dur: number } | null} blend
 * @param {object} target
 * @param {number} now  ms on the same clock as `blend.start`
 * @returns {{ cam: object, done: boolean }}
 */
export function blendCamera(blend, target, now) {
  if (!blend) return { cam: target, done: true };
  const k = easeInOutCubic(clamp01((now - blend.start) / blend.dur));
  if (k >= 1) return { cam: target, done: true };
  return { cam: lerpCamera(blend.from, target, k), done: false };
}

/** Interpolate two cameras. */
export const lerpCamera = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

/**
 * Write a camera to the DOM.
 *   viewBox        the camera itself
 *   HUD layer      `translate(x y) scale(w / hostWidth)`: inside it, 1 unit = 1 screen px from the host's top-left
 *   grid vignette  a radial gradient centred on the view, radius 56 % of its width, squashed to 60 % height
 * @param {{ svg: SVGElement, hud?: Element, fade?: Element }} nodes
 * @param {{ x: number, y: number, w: number, h: number }} cam
 * @param {number} hostWidth  px
 */
export function applyCamera({ svg, hud, fade }, cam, hostWidth, opts = stageConfig.camera) {
  svg.setAttribute('viewBox', `${R(cam.x)} ${R(cam.y)} ${R(cam.w)} ${R(cam.h)}`);
  if (hud) hud.setAttribute('transform', `translate(${R(cam.x)} ${R(cam.y)}) scale(${(cam.w / Math.max(1, hostWidth)).toFixed(5)})`);
  if (fade) {
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    fade.setAttribute('cx', R(cx));
    fade.setAttribute('cy', R(cy));
    fade.setAttribute('r', R(cam.w * opts.gridRadius));
    fade.setAttribute('gradientTransform', `translate(${R(cx)} ${R(cy)}) scale(1 ${opts.gridSquash}) translate(${R(-cx)} ${R(-cy)})`);
  }
}
