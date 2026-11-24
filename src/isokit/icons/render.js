/**
 * Turns an icon name into markup. Two targets, as on the original site:
 *
 *   iconHtml()  an inline `<svg>` for page UI. It inherits the text colour (`stroke="currentColor"`).
 *   iconSvg()   a `<g>` to drop inside a diagram `<svg>`, centred on a point, with an explicit colour.
 *
 * Both return strings, so they work in Node and in template literals. Nothing here touches the DOM.
 */
import { icons } from './icons.js';

/**
 * Defaults a reuser may want to change. Edit the object, or pass options per call.
 * Sizes are CSS pixels (iconHtml) or diagram units (iconSvg); strokes are the visible line width.
 */
export const iconConfig = {
  /** Side of the square the icon data is drawn in. Lucide uses 24. */
  box: 24,
  /** Class on every `<svg>` made by iconHtml(). */
  className: 'ik-i',
  /** iconHtml() defaults. */
  html: { size: 16, stroke: 1.75, fill: 'none' },
  /** iconSvg() defaults. The colour is the diagram's icon ink. */
  svg: { size: 22, stroke: 1.9, color: '#1d1b19', fill: 'none' },
};

/** Live table of name → inner markup: the generated set plus anything added with registerIcons(). */
const table = { ...icons };

const round = (n, places = 3) => {
  const k = 10 ** places;
  return Math.round(n * k) / k;
};

function markupOf(name) {
  const inner = table[name];
  if (inner === undefined) throw new Error(`Unknown icon: ${name}`);
  return inner;
}

/**
 * Adds icons to the table, or replaces existing ones.
 * @param {Record<string, string>} extra name → inner SVG markup drawn in a 24×24 box, stroke only
 * @returns {void}
 */
export function registerIcons(extra) {
  Object.assign(table, extra);
}

/**
 * @param {string} name
 * @returns {boolean} whether the name can be rendered
 */
export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(table, name);
}

/** @returns {string[]} every icon name, generated ones first, in file order */
export function iconNames() {
  return Object.keys(table);
}

/**
 * An icon for page UI: a self-contained `<svg>` that takes its colour from the surrounding text.
 *
 * @param {string} name icon name, e.g. `'server'`. Throws `Unknown icon: …` for a name that is not registered.
 * @param {object} [opts]
 * @param {number} [opts.size=16] width and height in CSS pixels
 * @param {number} [opts.stroke=1.75] line width in icon units (the 24 box); the line gets thinner on screen as `size` shrinks
 * @param {string} [opts.cls=''] extra class names, added after `ik-i`
 * @param {string} [opts.fill='none'] fill paint, for the few places that want a solid icon
 * @returns {string} `<svg class="ik-i …" …>…</svg>`, hidden from assistive tech (`aria-hidden`); label the button, not the icon
 */
export function iconHtml(name, { size = iconConfig.html.size, stroke = iconConfig.html.stroke, cls = '', fill = iconConfig.html.fill } = {}) {
  const inner = markupOf(name);
  const box = iconConfig.box;
  const classes = cls ? `${iconConfig.className} ${cls}` : iconConfig.className;
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}" fill="${fill}" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/**
 * An icon for use inside a diagram: a `<g>` scaled to `size` and centred on (`cx`, `cy`).
 *
 * The group is scaled by `size / 24`, which would scale the line width too, so the stroke is divided by
 * the same factor: `stroke` is the line width you see, in diagram units, whatever the size.
 *
 * @param {string} name icon name. Throws `Unknown icon: …` for a name that is not registered.
 * @param {number} cx centre x, in the coordinate system of the parent `<svg>` or `<g>`
 * @param {number} cy centre y
 * @param {number} [size=22] rendered width and height, same units
 * @param {object} [opts]
 * @param {number} [opts.stroke=1.9] visible line width, same units
 * @param {string} [opts.color='#1d1b19'] stroke colour. Inside an SVG string there is no text colour to inherit, so it is explicit.
 * @param {string} [opts.fill='none']
 * @returns {string} `<g transform="translate(…) scale(…)" …>…</g>`
 */
export function iconSvg(name, cx, cy, size = iconConfig.svg.size, { stroke = iconConfig.svg.stroke, color = iconConfig.svg.color, fill = iconConfig.svg.fill } = {}) {
  const inner = markupOf(name);
  const scale = size / iconConfig.box;
  return `<g transform="translate(${round(cx - size / 2)} ${round(cy - size / 2)}) scale(${round(scale, 5)})" fill="${fill}" stroke="${color}" stroke-width="${round(stroke / scale)}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}
