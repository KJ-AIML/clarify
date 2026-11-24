/**
 * The shared `<defs>`: gradients, blur filters, arrowheads and the floor-grid tile that
 * every primitive refers to by id, plus the few CSS rules the core needs.
 *
 * In a page, call `ensureDefs()` once: it adds one hidden `<svg id="iso-defs">` and one
 * `<style id="iso-engine-css">`. A standalone picture embeds `defsMarkup()` instead
 * (see `renderStatic`).
 */
import { config, onConfigure } from './config.js';
import { themed } from './color.js';
import { R, svgEl } from './util.js';

/**
 * The full id of a shared definition.
 * @param {string} name short name: `g-<colour>-top`, `g-<colour>-side`, `screen`, `screen-glare`,
 *   `cyl-sheen`, `blur-sm`, `blur-md`, `blur-lg`, `glow`, `arrow`, `arrow-muted`, `grid`
 * @returns {string} e.g. `iso-blur-lg`
 */
export const defId = (name) => `${config.idPrefix}${name}`;

/**
 * A paint or filter reference to a shared definition.
 * @param {string} name short name, see `defId`
 * @returns {string} e.g. `url(#iso-blur-lg)`
 */
export const ref = (name) => `url(#${config.idPrefix}${name})`;

const arrowHead = (id, color) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth">` +
  `<path d="M1,1.2 L9,5 L1,8.8 Z" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/></marker>`;

const blur = (id, margin, deviation) =>
  `<filter id="${id}" x="-${margin}%" y="-${margin}%" width="${100 + 2 * margin}%" height="${100 + 2 * margin}%"><feGaussianBlur stdDeviation="${deviation}"/></filter>`;

/**
 * Markup for the contents of the shared `<defs>`, in light-mode colours. Pass it through
 * `themed()` before inserting it into a dark page.
 *
 * - per palette colour: `g-<name>-top` (direction 0,0 → 0.35,1) and `g-<name>-side` (top to bottom)
 * - `screen` (diagonal lilac), `screen-glare` (white 35% → 0 at 45%), `cyl-sheen` (horizontal highlight band)
 * - blurs `blur-sm` 2.2, `blur-md` 4, `blur-lg` 6.5 and `glow` 9 (standard deviation in px)
 * - markers `arrow` (ink) and `arrow-muted`
 * - pattern `grid`: one diamond of 2 × unit by unit
 *
 * @returns {string}
 */
export function defsMarkup() {
  const U = config.unit;
  const C = config.colors;
  let gradients = '';
  for (const [name, c] of Object.entries(config.palette)) {
    gradients +=
      `<linearGradient id="${defId(`g-${name}-top`)}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${c.top[0]}"/><stop offset="1" stop-color="${c.top[1]}"/></linearGradient>` +
      `<linearGradient id="${defId(`g-${name}-side`)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.side[0]}"/><stop offset="1" stop-color="${c.side[1]}"/></linearGradient>`;
  }
  return (
    gradients +
    `<linearGradient id="${defId('screen')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${config.device.screenFrom}"/><stop offset="1" stop-color="${config.device.screenTo}"/></linearGradient>` +
    `<linearGradient id="${defId('screen-glare')}" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${defId('cyl-sheen')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#4b2f6b" stop-opacity=".08"/></linearGradient>` +
    blur(defId('blur-sm'), 20, 2.2) +
    blur(defId('blur-md'), 30, 4) +
    blur(defId('blur-lg'), 30, 6.5) +
    blur(defId('glow'), 40, 9) +
    arrowHead(defId('arrow'), config.ink) +
    arrowHead(defId('arrow-muted'), C.arrowMuted) +
    `<pattern id="${defId('grid')}" patternUnits="userSpaceOnUse" x="0" y="${-U / 2}" width="${2 * U}" height="${U}"><path d="M0 ${U / 2} L${U} 0 L${2 * U} ${U / 2} L${U} ${U} Z" fill="none" stroke="${C.grid}" stroke-opacity=".3" stroke-width=".8"/></pattern>`
  );
}

/**
 * The floor grid: a huge rectangle filled with the `grid` pattern, faded out towards the
 * edges by an elliptical mask centred on the view. Returns its own `<defs>` (a radial
 * gradient and a mask) followed by the rectangle.
 * @param {{ cx: number, cy: number, r: number, uid?: string }} view centre of the view in px,
 *   fade radius (the stage uses 0.56 × the view width), and a suffix that keeps ids unique
 *   when several grids share a page
 * @returns {string} SVG markup
 */
export function gridLayer({ cx, cy, r, uid = '' }) {
  const fade = defId(`grid-fade${uid ? '-' + uid : ''}`);
  const mask = defId(`grid-mask${uid ? '-' + uid : ''}`);
  const area = 'x="-5000" y="-5000" width="10000" height="10000"';
  return (
    `<defs><radialGradient id="${fade}" gradientUnits="userSpaceOnUse" cx="${R(cx)}" cy="${R(cy)}" r="${R(r)}" gradientTransform="translate(${R(cx)} ${R(cy)}) scale(1 0.6) translate(${R(-cx)} ${R(-cy)})">` +
    `<stop offset="0" stop-color="#FFF"/><stop offset=".42" stop-color="#FFF" stop-opacity=".92"/><stop offset=".78" stop-color="#FFF" stop-opacity=".35"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient>` +
    `<mask id="${mask}" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="url(#${fade})"/></mask></defs>` +
    `<rect class="iso-grid" ${area} fill="${ref('grid')}" mask="url(#${mask})" pointer-events="none"/>`
  );
}

const CORE_CSS = `
.iso-svg text,.iso-stage-svg text{white-space:pre}
.iso-pulse{animation:iso-pulse 1.3s ease-in-out infinite}
@keyframes iso-pulse{0%,to{opacity:.4}50%{opacity:1}}
.iso-moved{transform-box:fill-box;transform-origin:50%;animation:iso-moved 1.4s ease-out infinite}
@keyframes iso-moved{0%{opacity:.9;transform:scale(.6)}to{opacity:0;transform:scale(1.5)}}
@media (prefers-reduced-motion:reduce){.iso-pulse,.iso-moved{animation:none}}
`;
const extraCss = [];

/**
 * The CSS the diagram needs: `white-space: pre` on SVG text (so aligned columns keep their
 * spaces), the heat pulse, the "moved key" ripple, and anything added with `addCss`.
 * @returns {string}
 */
export const cssText = () => CORE_CSS + extraCss.join('\n');

/**
 * Append CSS to the engine's stylesheet. Safe to call before the page exists; the stage and
 * plugins use it for link, packet and effect rules.
 * @param {string} css
 */
export function addCss(css) {
  extraCss.push(String(css));
  const style = typeof document !== 'undefined' && document.getElementById('iso-engine-css');
  if (style) style.textContent = cssText();
}

/** Insert the `<style id="iso-engine-css">` element once. Browser only. */
export function ensureCss() {
  if (document.getElementById('iso-engine-css')) return;
  const style = document.createElement('style');
  style.id = 'iso-engine-css';
  style.textContent = cssText();
  document.head.appendChild(style);
}

/**
 * Make sure the page has the engine CSS and one hidden `<svg id="iso-defs">` holding the
 * shared definitions, themed for the current mode. Browser only; safe to call repeatedly.
 */
export function ensureDefs() {
  ensureCss();
  if (document.getElementById('iso-defs')) return;
  const svg = svgEl('svg', { id: 'iso-defs', 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0 });
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.appendChild(svgEl('defs'));
  (document.body || document.documentElement).appendChild(svg);
  refreshDefs();
}

/**
 * Rewrite the shared definitions. Call after the theme flips; `configure()` calls it for you.
 * Does nothing when `ensureDefs()` has not run.
 */
export function refreshDefs() {
  if (typeof document === 'undefined') return;
  const host = document.getElementById('iso-defs');
  if (host) host.firstChild.innerHTML = themed(defsMarkup());
}
onConfigure(refreshDefs);
