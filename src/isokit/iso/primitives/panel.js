/**
 * panel — a floating card: an icon and a small-caps title, a few text lines, and
 * optionally a chart. It is anchored to a world point and offset in screen pixels, and it
 * is drawn entirely in the `over` layer so no shape can cover it.
 *
 * Lines are plain strings with a one-character prefix for emphasis:
 *   `= total`   highlighted green (a result)
 *   `! broken`  highlighted red (a problem)
 *   `# note`    smaller and grey
 * Text between `**double stars**` is bold. Spaces are kept (the SVG uses
 * `white-space: pre`), so columns can be aligned with spaces in a monospace font.
 */
import { config } from '../config.js';
import { R, esc } from '../util.js';
import { iso } from '../projection.js';
import { textWidth, textDir, upper } from '../text.js';
import { glyph } from '../icons.js';
import { panelChart } from './panel-charts.js';

const HEADER = 34; // px from the top of the card to the first line
const LINE = 18; // px per text line

/** Escape, then turn `**bold**` into a bold tspan. */
const rich = (text) =>
  esc(text)
    .split('**')
    .map((part, i) => (i % 2 ? `<tspan font-weight="800" fill="${config.ink}">${part}</tspan>` : part))
    .join('');

/** Split a line into its style and its text. */
function parseLine(line) {
  const text = String(line);
  if (text.startsWith('= ')) return { kind: 'good', text: text.slice(2) };
  if (text.startsWith('! ')) return { kind: 'bad', text: text.slice(2) };
  if (text.startsWith('# ')) return { kind: 'muted', text: text.slice(2) };
  return { kind: 'plain', text };
}

/**
 * Natural size of a panel, before any `boxW` / `boxH` override.
 * Width: the widest of `w`, the title (plus 48 px for the icon and margins, plus 1 px of
 * letter-spacing per character), each line (plus 30 px) and what the chart asks for.
 * Height: 34 px header + 18 px per line + the chart + 6 px.
 * @param {object} e panel state
 * @returns {{ w: number, h: number }} px
 */
export function panelSize(e) {
  const title = String(e.title);
  const chart = e.chart ? panelChart(e.chart) : null;
  const need = chart ? chart.measure(e) : { minWidth: 0, height: 0 };
  const w = Math.max(
    e.w,
    textWidth(title, 10) + title.length + 48,
    ...e.lines.map((line) => textWidth(parseLine(line).text.replace(/\*\*/g, ''), 11.5) + 30),
    need.minWidth,
  );
  return { w, h: HEADER + e.lines.length * LINE + need.height + 6 };
}

/**
 * Render a panel.
 * @param {object} e entity state, see `panel.defaults`. The stage may add `boxW`, `boxH`
 *   (the card's size while it morphs between two contents) and `fade` (content opacity).
 * @returns {{ body: string, over: string, poly: null, size: { w: number, h: number }, bounds: number[] }}
 */
export function renderPanel(e) {
  const C = config.colors;
  const { w, h } = panelSize(e);
  const [ax, ay] = iso(e.x, e.y, e.z);
  const x = ax + e.dx;
  const y = ay + e.dy - e.lift;
  const boxW = e.boxW ?? w;
  const boxH = e.boxH ?? h;
  const rtl = config.rtl;
  // x attribute for text inset `pad` px from the reading edge
  const textX = (text, pad) =>
    rtl ? (textDir(text) === 'rtl' ? `x="${R(x + w - pad)}" direction="rtl"` : `x="${R(x + w - pad)}" text-anchor="end"`) : `x="${R(x + pad)}"`;

  let lines = '';
  e.lines.forEach((raw, i) => {
    const { kind, text } = parseLine(raw);
    const baseline = y + HEADER + i * LINE + 12;
    if (kind === 'good' || kind === 'bad') {
      const tone = config.tones[kind === 'good' ? 'green' : 'red'];
      lines +=
        `<rect x="${R(x + 10)}" y="${R(baseline - 13)}" width="${R(w - 20)}" height="18" rx="5" fill="${tone.bg}"/>` +
        `<text ${textX(text, 16)} y="${R(baseline)}" font-size="11.5" font-weight="800" fill="${tone.fg}">${rich(text)}</text>`;
    } else if (kind === 'muted') {
      lines += `<text ${textX(text, 16)} y="${R(baseline)}" font-size="10.5" font-weight="500" fill="${C.cardMuted}">${rich(text)}</text>`;
    } else {
      lines += `<text ${textX(text, 16)} y="${R(baseline)}" font-size="11.5" font-weight="500" fill="${C.cardText}">${rich(text)}</text>`;
    }
  });

  const chart = e.chart ? panelChart(e.chart) : null;
  const chartMarkup = chart ? chart.draw(e, { x, y: y + HEADER + e.lines.length * LINE + 10, w }) : '';

  const over =
    `<g opacity="${R(e.opacity)}">` +
    `<rect x="${R(x)}" y="${R(y + 2.5)}" width="${R(boxW)}" height="${R(boxH)}" rx="10" fill="${config.hard}"/>` +
    `<rect x="${R(x)}" y="${R(y)}" width="${R(boxW)}" height="${R(boxH)}" rx="10" fill="${C.card}" stroke="${config.ink}" stroke-width="1.4"/>` +
    `<path d="M${R(x + 12)},${R(y + 30)} H${R(x + boxW - 12)}" stroke="${C.track}" stroke-width="1"/>` +
    `<g opacity="${R(e.fade ?? 1)}">` +
    glyph(e.icon, rtl ? x + w - 20 : x + 20, y + 18, 13, { stroke: 2.1, color: C.muted }) +
    `<text ${textX(e.title, 33)} y="${R(y + 21.5)}" font-size="10" font-weight="800" letter-spacing="1" fill="${C.muted}">${esc(upper(e.title))}</text>` +
    lines +
    chartMarkup +
    `</g></g>`;

  return {
    body: '',
    over,
    poly: null,
    size: { w, h },
    bounds: [x - 6, y - 6, x + boxW + 6, y + boxH + 10],
  };
}

/** Registration record for `panel`. */
export const panel = {
  defaults: {
    z: 0, // height of the anchor above the floor, px
    dx: 0, // screen offset of the card's top-left corner from the anchor, px
    dy: 0,
    w: 0, // minimum width, px
    title: '',
    icon: 'sparkles',
    lines: [],
    chart: null, // 'hockey', 'bars' or a chart added with registerPanelChart
    bars: [], // for 'bars': [{ label, from?, to?, tone?, note?, bold? }], from/to in 0…1
    marker: 0, // for 'hockey': the current utilisation, 0…1
    opacity: 1,
    lift: 0,
  },
  enterFrom: { lift: -14 },
  exitTo: { lift: -10 },
  overLayer: 'hud',
  spot: false,
  obstacle: false,
  card: true,
  depth: () => 1e4,
  render: renderPanel,
};
