/**
 * Small helpers shared by every module in `iso/`. Nothing here touches the DOM at import time.
 */

/** The SVG namespace, for `document.createElementNS`. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Round to two decimals. Every coordinate written into SVG goes through this, which keeps the
 * generated markup short and stable (the same input always produces the same string).
 * @param {number} v
 * @returns {number}
 */
export const R = (v) => Math.round(v * 100) / 100;

/**
 * Clamp a number to the range 0…1.
 * @param {number} v
 * @returns {number}
 */
export const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Linear interpolation.
 * @param {number} a start value
 * @param {number} b end value
 * @param {number} t 0…1
 * @returns {number}
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Escape text for use inside SVG markup. An ampersand that already starts an entity
 * (`&amp;`, `&#8594;`) is left alone, so pre-escaped strings are not escaped twice.
 * @param {*} s
 * @returns {string}
 */
export const esc = (s) =>
  String(s)
    .replace(/&(?![a-z#0-9]+;)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Structural equality by JSON, with `undefined` treated as `null`. Used to decide whether
 * a label or tag list changed between two scene keyframes.
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
export const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Create an SVG element. Call only in a browser.
 * @param {string} tag element name, e.g. `'path'`
 * @param {Record<string, string|number>} [attrs] attributes to set
 * @returns {SVGElement}
 */
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/** @param {*} v @returns {boolean} true for a plain `{}` object (not an array, not null). */
export const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Recursively merge `source` into `target` in place. Plain objects merge key by key;
 * arrays and scalars replace the old value.
 * @param {object} target
 * @param {object} source
 * @returns {object} `target`
 */
export function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source || {})) {
    if (isPlainObject(v) && isPlainObject(target[k])) deepMerge(target[k], v);
    else target[k] = isPlainObject(v) ? deepMerge({}, v) : v;
  }
  return target;
}
