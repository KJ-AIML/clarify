/**
 * Text measuring and the basic centred `<text>` element.
 *
 * SVG cannot wrap text or size a box around it, so every pill and card needs the width of
 * its text before it is drawn. With a monospace font that is arithmetic. Only text outside
 * the font's own scripts (Arabic, CJK, …), which a fallback font will draw at another
 * width, is measured with a canvas.
 */
import { config, onConfigure } from './config.js';
import { R, esc } from './util.js';

/** Scripts the monospace font covers: Latin, Greek, Cyrillic, Armenian, punctuation, arrows, symbols. */
const MONO_RANGE = /^[\u0000-֏Ḁ-῿ -⯿⸀-⹿]*$/u;
/** Invisible direction marks: they take no width. */
const BIDI_MARKS = /[‎‏⁦-⁩]/g;
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}]/u;

const widths = new Map();
let context = null;
let listening = false;

/** Forget every measured width. Called when the config changes or a web font finishes loading. */
export function clearTextCache() {
  widths.clear();
}
onConfigure(clearTextCache);

/**
 * Width of a string in px.
 *
 * Fast path: when `config.monospace` is on and the text stays inside the font's scripts
 * (or there is no DOM), the width is `characters × size × config.charWidth`.
 * Otherwise the text is measured on a canvas with `<weight> <size>px <config.font>` and the
 * result is cached. The cache is cleared when the browser reports newly loaded fonts,
 * because widths measured with the fallback font would be wrong afterwards.
 *
 * @param {*} str the text (one line)
 * @param {number} size font size in px
 * @param {number} [weight=700] font weight used for the canvas measurement
 * @returns {number} width in px
 */
export function textWidth(str, size, weight = 700) {
  str = String(str);
  if (typeof document === 'undefined' || (config.monospace && MONO_RANGE.test(str))) {
    return str.replace(BIDI_MARKS, '').length * size * config.charWidth;
  }
  const key = `${weight}|${size}|${str}`;
  let w = widths.get(key);
  if (w === undefined) {
    if (!context) context = document.createElement('canvas').getContext('2d');
    if (!listening && document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', clearTextCache);
      listening = true;
    }
    context.font = `${weight} ${size}px ${config.font}`;
    w = context.measureText(str).width;
    widths.set(key, w);
  }
  return w;
}

/**
 * Line height used for stacked lines inside one pill: 1.3 × the font size, rounded.
 * @param {number} size font size in px
 * @returns {number} px
 */
export const lineHeight = (size) => Math.round(size * 1.3);

/**
 * Reading direction of a string. Only reports `'rtl'` when `config.rtl` is on and the text
 * (with any markup removed) contains Arabic or Hebrew letters.
 * @param {*} str
 * @returns {'rtl'|'ltr'}
 */
export const textDir = (str) => (config.rtl && RTL_SCRIPT.test(String(str).replace(/<[^>]+>/g, '')) ? 'rtl' : 'ltr');

/**
 * The ` direction="…"` attribute for a `<text>` element, or an empty string on a
 * left-to-right page.
 * @param {*} str
 * @returns {string}
 */
export const dirAttr = (str) => (config.rtl ? ` direction="${textDir(str)}"` : '');

/**
 * Upper-case with the configured locale (so Turkish `i` and similar come out right).
 * @param {*} str
 * @returns {string}
 */
export const upper = (str) => String(str).toLocaleUpperCase(config.locale);

/**
 * A horizontally centred `<text>` element.
 * @param {number} x centre x
 * @param {number} y baseline y
 * @param {*} str text; it is escaped
 * @param {number} [size=12.5] font size in px
 * @param {number} [weight=700]
 * @param {string} [fill=config.ink]
 * @param {string} [attrs=''] extra attributes, written as given
 * @returns {string} SVG markup
 */
export const svgText = (x, y, str, size = 12.5, weight = 700, fill = config.ink, attrs = '') =>
  `<text x="${R(x)}" y="${R(y)}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill}"${dirAttr(str)}${attrs ? ' ' + attrs : ''}>${esc(str)}</text>`;
