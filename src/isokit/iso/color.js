/**
 * Dark mode without a second palette. Primitives always emit their light-mode colours;
 * `themed()` rewrites every lowercase hex in the finished markup with one HSL rule.
 * A hex that contains an UPPERCASE letter is the escape hatch: it is never rewritten.
 */
import { config, onConfigure } from './config.js';

/**
 * Convert `#rrggbb` to hue, saturation, lightness and chroma.
 * @param {string} hex six-digit hex with a leading `#`
 * @returns {{ h: number, s: number, l: number, c: number }} h in degrees 0…360; s, l and c (max − min channel) in 0…1
 */
export function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (c) {
    h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: c ? c / (1 - Math.abs(2 * l - 1)) : 0, l, c };
}

/**
 * Convert hue, saturation and lightness to `#rrggbb`.
 * @param {number} h degrees 0…360
 * @param {number} s 0…1
 * @param {number} l 0…1
 * @returns {string}
 */
export function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const channel = (v) =>
    Math.round(Math.max(0, Math.min(1, v + m)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Lowercase a hex colour and expand the three-digit form.
 * @param {string} hex `#abc` or `#AABBCC`
 * @returns {string} `#aabbcc`
 */
export function normalizeHex(hex) {
  const t = hex.replace('#', '').toLowerCase();
  return `#${t.length === 3 ? [...t].map((ch) => ch + ch).join('') : t}`;
}

const cache = { css: new Map(), svg: new Map() };
onConfigure(() => {
  cache.css.clear();
  cache.svg.clear();
});

/**
 * The dark-mode counterpart of a light-mode colour.
 *
 * 1. Explicit tables first: `config.dark.svgMap` (SVG only), then `config.dark.map`.
 * 2. Neutrals — chroma under 0.045, or under 0.13 with a warm hue of 12°…62° (paper, ink,
 *    sand greys) — swap light and dark. Lightness from 0.885 up lands near 0.12
 *    (`0.118 + (l − 0.92) × 0.9`); anything darker becomes `1 − l`. The result is clamped to
 *    0.06…0.93, given saturation 0.13 (dark results) or 0.12 (light results), and keeps its
 *    hue, or takes hue 34° when it was almost grey (chroma under 0.02).
 * 3. Pastels — lightness from 0.66 up — keep their hue, lose saturation
 *    (`min(s, 0.5) × 0.6`) and drop to lightness `0.16 + (l − 0.66) × 0.55`.
 * 4. Mid-tones — lightness 0.36…0.66 — are returned unchanged: they read on both grounds.
 * 5. Dark accents — below 0.36 — keep hue, cap saturation at 0.6 and go to lightness 0.8.
 *
 * @param {string} hex light-mode colour, three or six digits
 * @param {'svg'|'css'} [mode='svg'] which exception table applies
 * @returns {string} `#rrggbb`
 */
export function toDark(hex, mode = 'svg') {
  const key = normalizeHex(hex);
  const memo = cache[mode] || cache.svg;
  if (memo.has(key)) return memo.get(key);
  let out = (mode === 'svg' && config.dark.svgMap[key]) || config.dark.map[key];
  if (!out) {
    const { h, s, l, c } = hexToHsl(key);
    if (c < 0.045 || (c < 0.13 && h >= 12 && h <= 62)) {
      const hue = c < 0.02 ? 34 : h;
      const flipped = l >= 0.885 ? 0.118 + (l - 0.92) * 0.9 : 1 - l;
      out = hslToHex(hue, flipped < 0.5 ? 0.13 : 0.12, Math.max(0.06, Math.min(0.93, flipped)));
    } else if (l >= 0.66) out = hslToHex(h, Math.min(s, 0.5) * 0.6, 0.16 + (l - 0.66) * 0.55);
    else if (l >= 0.36) out = key;
    else out = hslToHex(h, Math.min(s, 0.6), 0.8);
  }
  memo.set(key, out);
  return out;
}

const CLARIFY_DARK_THEMES = new Set(['dark', 'tokyo-night', 'nord', 'catppuccin', 'blueprint']);

/**
 * Is the page in dark mode? Matches Clarify's dark theme presets and `auto` under OS dark mode.
 * @returns {boolean}
 */
export const isDark = () => {
  if (typeof document === 'undefined') return false;
  const theme = document.documentElement.dataset.theme;
  if (CLARIFY_DARK_THEMES.has(theme)) return true;
  if (theme === 'auto' && typeof matchMedia === 'function') return matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
};

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

/**
 * Rewrite the colours in a piece of SVG markup for the current theme. In light mode the
 * markup is returned untouched. In dark mode every hex colour without an uppercase letter
 * goes through `toDark`; a hex with an uppercase letter is kept as written.
 *
 * Element ids referenced as `url(#name)` are safe as long as they do not look like a three-
 * or six-digit hex number. The kit's own ids all start with `iso-`.
 *
 * @param {string} markup SVG markup produced by a primitive
 * @param {boolean} [dark=isDark()] force a theme, e.g. when rendering in Node
 * @returns {string}
 */
export function themed(markup, dark = isDark()) {
  if (!markup || !dark) return markup;
  return markup.replace(HEX, (m) => (/[A-F]/.test(m) ? m : toDark(m, 'svg')));
}
