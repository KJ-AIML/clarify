/**
 * The charts a panel can show under its text lines. A chart reports how much room it
 * needs and draws itself into the box it is given.
 */
import { config, loadColor } from '../config.js';
import { R, esc } from '../util.js';
import { textWidth, textDir } from '../text.js';

const charts = {};

/**
 * Register a chart type for panels (`entity.chart = name`).
 * @param {string} name
 * @param {{
 *   measure: (e: object) => { minWidth: number, height: number },
 *   draw: (e: object, box: { x: number, y: number, w: number }) => string
 * }} chart `measure` returns the panel width the chart needs and the height it adds to the
 *   panel, in px. `draw` receives the panel's left edge `x`, the chart's top `y` (10 px
 *   under the last text line) and the panel width `w`, and returns SVG markup.
 */
export function registerPanelChart(name, chart) {
  charts[name] = chart;
}

/** @param {string} name @returns {object|undefined} a registered chart type */
export const panelChart = (name) => charts[name];

/**
 * The latency curve: how long a request waits at a given utilisation, in the shape of
 * 1 / (1 − u). Returns 0.06 when idle and is capped at 1.
 * @param {number} u utilisation 0…1
 * @returns {number} 0…1
 */
export const latencyCurve = (u) => Math.min(1, 0.06 / Math.max(0.02, 1 - u));

/* hockey: latency against utilisation, with a marker at the current load --------------- */
registerPanelChart('hockey', {
  measure: () => ({ minWidth: 220, height: 96 + 22 }),
  draw(e, box) {
    const C = config.colors;
    const x = box.x + 18;
    const y = box.y;
    const w = box.w - 36;
    const h = 96 - 14;
    const px = (u) => x + u * w;
    const py = (v) => y + h - v * h;
    let curve = '';
    for (let i = 0; i <= 60; i++) {
      const u = (i / 60) * 0.985;
      curve += `${i ? 'L' : 'M'}${R(px(u))},${R(py(latencyCurve(u)))} `;
    }
    const at = Math.min(0.985, e.marker);
    const mx = px(at);
    const my = py(latencyCurve(at));
    const color = loadColor(e.marker);
    return (
      `<path d="M${R(x)},${R(y)} V${R(y + h)} H${R(x + w)}" fill="none" stroke="${C.arrowMuted}" stroke-width="1.2"/>` +
      `<rect x="${R(px(0.8))}" y="${R(y)}" width="${R(px(1) - px(0.8))}" height="${R(h)}" fill="${config.load.hot}" opacity=".08"/>` +
      `<path d="${curve}" fill="none" stroke="${config.ink}" stroke-width="2"/>` +
      `<path d="M${R(mx)},${R(y + h)} V${R(my)}" stroke="${color}" stroke-width="1.4" stroke-dasharray="3 3"/>` +
      `<circle cx="${R(mx)}" cy="${R(my)}" r="5.2" fill="${color}" stroke="${config.ink}" stroke-width="1.6"/>` +
      `<text x="${R(x + w)}" y="${R(y + h + 14)}" text-anchor="end" font-size="9.5" font-weight="700" fill="${C.muted}">${esc(e.xLabel ?? 'utilization →')}</text>` +
      `<text x="${R(x + 4)}" y="${R(y + 9)}" font-size="9.5" font-weight="700" fill="${C.muted}">${esc(e.yLabel ?? 'latency')}</text>` +
      `<text x="${R(Math.min(mx, x + w - 30))}" y="${R(Math.max(my - 10, y + 22))}" text-anchor="middle" font-size="10.5" font-weight="800" fill="${config.ink}">${Math.round(e.marker * 100)}%</text>`
    );
  },
});

/* bars: labelled horizontal bars; each may start part-way along (a waterfall) ---------- */
const barColumns = (e) => ({
  label: Math.max(0, ...e.bars.map((b) => textWidth(b.label, 10.5))) + 14,
  note: Math.max(46, ...e.bars.map((b) => textWidth(b.note || '', 10) + 12)),
});

/** `x="…">text` for a left-aligned cell, mirrored when the text itself is right-to-left. */
function cell(text, x, size) {
  if (!(config.rtl && textDir(text) === 'rtl')) return `x="${R(x)}">${esc(text)}`;
  const trimmed = text.trimStart();
  return `x="${R(x + textWidth(text.slice(0, text.length - trimmed.length), size))}" direction="rtl" text-anchor="end">${esc(trimmed)}`;
}

registerPanelChart('bars', {
  measure(e) {
    const col = barColumns(e);
    return { minWidth: col.label + 184 + col.note, height: e.bars.length * 19 + 12 };
  },
  draw(e, box) {
    const C = config.colors;
    const col = barColumns(e);
    const x = box.x + 16;
    const y = box.y - 2;
    const trackX = x + col.label;
    const trackW = box.w - 32 - col.label - col.note;
    return e.bars
      .map((bar, i) => {
        const rowY = y + i * 19;
        const from = bar.from || 0;
        const barX = trackX + from * trackW;
        const barW = Math.max(3, ((bar.to ?? 1) - from) * trackW);
        return (
          `<text y="${R(rowY + 12)}" font-size="10.5" font-weight="${bar.bold ? 800 : 500}" fill="${C.cardText}" ${cell(bar.label, x, 10.5)}</text>` +
          `<rect x="${R(trackX)}" y="${R(rowY + 3)}" width="${R(trackW)}" height="11" rx="3" fill="${C.barTrack}"/>` +
          `<rect x="${R(barX)}" y="${R(rowY + 3)}" width="${R(barW)}" height="11" rx="3" fill="${config.barTones[bar.tone || 'gray'] || config.barTones.gray}" stroke="${config.ink}" stroke-opacity=".55" stroke-width="1"/>` +
          `<text y="${R(rowY + 12)}" font-size="10" font-weight="800" fill="${config.ink}" ${cell(bar.note || '', barX + barW + 6, 10)}</text>`
        );
      })
      .join('');
  },
});
