/**
 * note — a simple floating card with a title and a few lines. This one is not from the
 * original site: it is the card of the earlier single-file engine, kept for lessons that
 * use it. Prefer `panel` for new work (bold spans, charts).
 *
 * A line is a string, optionally prefixed `+ ` (good), `! ` (bad) or `# ` (muted), or an
 * object `{ text, tone: 'plain' | 'good' | 'bad' | 'muted' }`.
 */
import { config } from '../config.js';
import { R, esc } from '../util.js';
import { iso } from '../projection.js';
import { textWidth, upper } from '../text.js';
import { glyph } from '../icons.js';

function parseLine(line) {
  if (line && typeof line === 'object') return { text: String(line.text ?? ''), tone: line.tone || 'plain' };
  const m = /^([+!#]) (.*)$/.exec(String(line));
  return m ? { text: m[2], tone: m[1] === '+' ? 'good' : m[1] === '!' ? 'bad' : 'muted' } : { text: String(line), tone: 'plain' };
}

/**
 * Render a note.
 * @param {object} e entity state, see `note.defaults`. The stage may add `boxW`, `boxH`
 *   and `contentFade` while the card morphs.
 * @returns {{ body: string, over: string, poly: null, size: { w: number, h: number }, bounds: number[] }}
 */
export function renderNote(e) {
  const C = config.colors;
  const lines = (e.lines || []).map(parseLine);
  const title = upper(e.title || '');
  const w = Math.max(
    e.w,
    textWidth(title, 10, 800) + title.length + 50,
    ...lines.map((line) => textWidth(line.text, 11.5, line.tone === 'plain' ? 500 : 800) + 34),
  );
  const h = 32 + lines.length * 18 + 8;
  const [ax, ay] = iso(e.x, e.y, e.z);
  const x = ax + e.dx;
  const y = ay + e.dy - e.lift;
  const boxW = e.boxW ?? w;
  const boxH = e.boxH ?? h;
  let rows = '';
  lines.forEach((line, i) => {
    const baseline = y + 32 + i * 18 + 14;
    if (line.tone === 'good' || line.tone === 'bad') {
      const tone = config.tones[line.tone === 'good' ? 'green' : 'red'];
      rows +=
        `<rect x="${R(x + 10)}" y="${R(baseline - 13)}" width="${R(w - 20)}" height="18" rx="5" fill="${tone.bg}"/>` +
        `<text x="${R(x + 16)}" y="${R(baseline)}" font-size="11.5" font-weight="800" fill="${tone.fg}">${esc(line.text)}</text>`;
    } else {
      const muted = line.tone === 'muted';
      rows += `<text x="${R(x + 16)}" y="${R(baseline)}" font-size="${muted ? 10.5 : 11.5}" font-weight="500" fill="${muted ? C.cardMuted : C.cardText}">${esc(line.text)}</text>`;
    }
  });
  const over =
    `<g opacity="${R(e.opacity)}">` +
    `<rect x="${R(x)}" y="${R(y + 2.5)}" width="${R(boxW)}" height="${R(boxH)}" rx="10" fill="${config.hard}"/>` +
    `<rect x="${R(x)}" y="${R(y)}" width="${R(boxW)}" height="${R(boxH)}" rx="10" fill="${C.card}" stroke="${config.ink}" stroke-width="1.4"/>` +
    `<path d="M${R(x + 12)},${R(y + 30)} H${R(x + boxW - 12)}" stroke="${C.track}" stroke-width="1"/>` +
    `<g opacity="${R(e.contentFade ?? e.fade ?? 1)}">` +
    glyph(e.icon, x + 20, y + 17, 13, { color: C.muted, stroke: 2.1 }) +
    `<text x="${R(x + 33)}" y="${R(y + 21)}" font-size="10" font-weight="800" letter-spacing="1" fill="${C.muted}">${esc(title)}</text>` +
    rows +
    `</g></g>`;
  return { body: '', over, poly: null, size: { w, h }, bounds: [x - 6, y - 6, x + boxW + 6, y + boxH + 10] };
}

/** Registration record for `note`. */
export const note = {
  defaults: {
    z: 0, // height of the anchor above the floor, px
    dx: 0, // screen offset of the card's top-left corner from the anchor, px
    dy: 0,
    title: '',
    icon: 'message',
    lines: [],
    w: 0, // minimum width, px
    lift: 0,
    opacity: 1,
  },
  enterFrom: { lift: -12 },
  exitTo: { lift: -10 },
  spot: false,
  card: true,
  footprint: (e) => [e.x, e.x, e.y, e.y],
  depth: () => 1e4,
  render: renderNote,
};
