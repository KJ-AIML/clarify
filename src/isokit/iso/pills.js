/**
 * Pills: the rounded labels that carry names, tags and the CPU meter.
 *
 * A pill is two rounded rectangles: a solid dark copy 2 px lower (the "hard shadow") and
 * the coloured face on top. No blur, which is what gives the sticker look.
 */
import { config, loadColor } from './config.js';
import { R, clamp01, esc } from './util.js';
import { textWidth, lineHeight, dirAttr } from './text.js';
import { glyph } from './icons.js';

/**
 * Measure the text block of a pill. Text may contain `\n` for several lines.
 * @param {*} text
 * @param {number} [size=config.pill.size] font size in px
 * @returns {{ lines: string[], tw: number, h: number }} the lines, the widest line in px,
 *   and the pill height: 21 for one line plus one line height for each further line
 */
export function pillLayout(text, size = config.pill.size) {
  const lines = String(text).split('\n');
  return {
    lines,
    tw: Math.max(...lines.map((line) => textWidth(line, size))),
    h: config.pill.height + (lines.length - 1) * lineHeight(size),
  };
}

/**
 * Outer width of a pill: widest line + 9 px inset each side + 15 px for an icon.
 * @param {*} text
 * @param {number} [size=config.pill.size]
 * @param {boolean} [icon=false] whether the pill has an icon
 * @returns {number} px
 */
export const pillWidth = (text, size = config.pill.size, icon = false) =>
  pillLayout(text, size).tw + 2 * config.pill.padX + (icon ? config.pill.iconSlot : 0);

/**
 * Draw a pill centred on a point.
 * @param {number} cx centre x in px
 * @param {number} cy centre y in px
 * @param {*} text label; `\n` starts a new line; it is escaped
 * @param {{ tone?: string, size?: number, icon?: string|null }} [opts] `tone` is a key of
 *   `config.tones` (default `paper`), `size` the font size (default 10.5), `icon` an icon
 *   name drawn left of the text
 * @returns {string} SVG markup, a `<g class="iso-pill">`
 */
export function pill(cx, cy, text, { tone = 'paper', size = config.pill.size, icon = null } = {}) {
  const P = config.pill;
  const colors = config.tones[tone] || config.tones.paper;
  const iconSlot = icon ? P.iconSlot : 0;
  const { lines, tw, h } = pillLayout(text, size);
  const w = tw + 2 * P.padX + iconSlot;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rx = P.height / 2;
  const step = lineHeight(size);
  const rows = lines
    .map(
      (line, i) =>
        `<text x="${R(x + P.padX + iconSlot + tw / 2)}" y="${R(cy + size * 0.36 + (i - (lines.length - 1) / 2) * step)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${colors.fg}"${dirAttr(line)}>${esc(line)}</text>`,
    )
    .join('');
  return (
    `<g class="iso-pill">` +
    `<rect x="${R(x)}" y="${R(y + P.drop)}" width="${R(w)}" height="${h}" rx="${rx}" fill="${config.hard}"/>` +
    `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${h}" rx="${rx}" fill="${colors.bg}" stroke="${config.ink}" stroke-width="${P.stroke}"/>` +
    (icon ? glyph(icon, x + P.padX + 6, cy, 12, { stroke: 2.2, color: colors.fg }) : '') +
    rows +
    `</g>`
  );
}

/** Width of the CPU pill in px. */
export const CPU_PILL_WIDTH = 86;

/**
 * Draw the CPU meter: a fixed 86 × 21 pill with a chip icon, a 28 × 7 bar and a percentage.
 * The bar turns amber at `config.load.warnAt` and red at `config.load.hotAt`.
 * @param {number} cx centre x in px
 * @param {number} cy centre y in px
 * @param {number} load 0…1
 * @returns {string} SVG markup
 */
export function cpuPill(cx, cy, load) {
  const P = config.pill;
  const C = config.colors;
  const v = clamp01(load);
  const x = cx - CPU_PILL_WIDTH / 2;
  const y = cy - P.height / 2;
  const barX = x + 23;
  return (
    `<g class="iso-pill">` +
    `<rect x="${R(x)}" y="${R(y + P.drop)}" width="${CPU_PILL_WIDTH}" height="${P.height}" rx="${P.height / 2}" fill="${config.hard}"/>` +
    `<rect x="${R(x)}" y="${R(y)}" width="${CPU_PILL_WIDTH}" height="${P.height}" rx="${P.height / 2}" fill="${C.paper}" stroke="${config.ink}" stroke-width="${P.stroke}"/>` +
    glyph('cpu', x + 13, cy, 11, { stroke: 2.2, color: C.muted }) +
    `<rect x="${R(barX)}" y="${R(cy - 3.5)}" width="28" height="7" rx="3.5" fill="${C.track}"/>` +
    `<rect x="${R(barX)}" y="${R(cy - 3.5)}" width="${R(Math.max(3, 28 * v))}" height="7" rx="3.5" fill="${loadColor(load)}"/>` +
    `<text x="${R(x + CPU_PILL_WIDTH - 9)}" y="${R(cy + 3.6)}" text-anchor="end" font-size="10.5" font-weight="800" fill="${config.ink}">${Math.round(v * 100)}%</text>` +
    `</g>`
  );
}

/**
 * The pills an entity carries above (or below) its shape: the CPU meter when `cpu >= 0`,
 * then one pill per tag. Each is centred on `(cx, 0)`; position them with `stackPills`.
 * Tag pills are wrapped in a group with opacity `tagFade` (the stage cross-fades tags with it).
 * @param {{ cpu?: number, tags?: Array<{ text: string, tone?: string, icon?: string, size?: number }>, tagFade?: number }} e entity state
 * @param {number} cx centre x in px
 * @returns {string[]} one SVG fragment per pill, nearest the shape first
 */
export function entityPills(e, cx) {
  const items = [];
  if (e.cpu >= 0) items.push(cpuPill(cx, 0, e.cpu));
  for (const tag of e.tags || []) items.push(`<g opacity="${R(e.tagFade ?? 1)}">${pill(cx, 0, tag.text, tag)}</g>`);
  return items;
}

/**
 * Half the width of the widest pill an entity carries. Used to widen its bounds.
 * @param {{ cpu?: number, tags?: Array<{ text: string, icon?: string }> }} e entity state
 * @returns {number} px, 0 when there are no pills
 */
export const pillsHalfWidth = (e) =>
  Math.max(0, e.cpu >= 0 ? CPU_PILL_WIDTH / 2 : 0, ...(e.tags || []).map((tag) => pillWidth(tag.text, config.pill.size, !!tag.icon) / 2));

/**
 * Place pill fragments in a vertical stack.
 * @param {string[]} items fragments centred on y = 0
 * @param {number} y0 centre y of the first pill
 * @param {number} step distance to the next pill: negative stacks upwards (`-config.pill.step`)
 * @returns {string} SVG markup
 */
export function stackPills(items, y0, step) {
  let y = y0;
  let out = '';
  for (const item of items) {
    out += `<g transform="translate(0 ${R(y)})">${item}</g>`;
    y += step;
  }
  return out;
}

/**
 * Widen a bounds box sideways so it also covers pills centred on `cx`.
 * @param {number[]} bounds `[x0, y0, x1, y1]`
 * @param {number} cx centre x of the pills
 * @param {number} half half width of the widest pill; 0 leaves the box unchanged
 * @returns {number[]}
 */
export const widenForPills = (bounds, cx, half) =>
  half ? [Math.min(bounds[0], cx - half - 5), bounds[1], Math.max(bounds[2], cx + half + 5), bounds[3]] : bounds;
