/**
 * SVG element helpers. The stage builds its retained nodes with these and fills them with
 * markup strings (`innerHTML`), exactly as the original does (`mf`, `hf`, index.pretty.js:18014).
 */

/** The SVG namespace. `document.createElement('path')` would make an unknown HTML element instead. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG element with attributes.
 * @param {string} tag                      e.g. 'g', 'path'
 * @param {Record<string, string | number>} [attrs]
 * @returns {SVGElement}
 */
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const key in attrs) el.setAttribute(key, attrs[key]);
  return el;
}

/**
 * Remove an element after a delay. Used for one-shot effects whose CSS animation has a fixed length.
 * @param {Element} el
 * @param {number} ms  real milliseconds
 * @returns {number} the timer id
 */
export const removeLater = (el, ms) => setTimeout(() => el.remove(), ms);

/**
 * The stage's skeleton: private defs for the grid vignette, the grid rectangle, and one `<g>`
 * per layer in paint order. `uid` keeps the vignette ids unique when a page has several stages.
 * @param {number | string} uid
 * @param {string} gridId  id of the shared grid `<pattern>`
 * @returns {string} inner markup for the stage `<svg>`
 */
export function stageMarkup(uid, gridId = 'iso-grid') {
  const far = 5000;                            // "infinite" floor: a 10000 px square around the origin
  const rect = `x="${-far}" y="${-far}" width="${2 * far}" height="${2 * far}"`;
  return `
    <defs>
      <radialGradient id="iso-grid-fade-${uid}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fff"/>
        <stop offset=".42" stop-color="#fff" stop-opacity=".92"/>
        <stop offset=".78" stop-color="#fff" stop-opacity=".35"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <mask id="iso-grid-mask-${uid}" maskUnits="userSpaceOnUse" ${rect}>
        <rect ${rect} fill="url(#iso-grid-fade-${uid})"/>
      </mask>
    </defs>
    <rect class="iso-stage-grid" ${rect} fill="url(#${gridId})" mask="url(#iso-grid-mask-${uid})" pointer-events="none"/>
    <g class="iso-layer iso-floor"></g>
    <g class="iso-layer iso-links"></g>
    <g class="iso-layer iso-packets"></g>
    <g class="iso-layer iso-ents"></g>
    <g class="iso-layer iso-over"></g>
    <g class="iso-layer iso-xray"></g>
    <g class="iso-layer iso-hud"></g>`;
}

/** Layer names in paint order, bottom first. */
export const LAYERS = ['floor', 'links', 'packets', 'ents', 'over', 'xray', 'hud'];
