/**
 * The link-label solver: where does a pill go so it sits beside its line and covers nothing?
 *
 * It is a small discrete search. For each label it lists up to 36 candidate rectangles (nine
 * positions along the path × two sides × near/far), prices every one, and keeps the cheapest.
 * Labels are solved in order; each placed label becomes an obstacle for the next.
 *
 * Original: `Vf` (candidates), `Xf` (cost), `qf` (obstacles), `Kf` (size), `Gf`/`Wf` (two-line
 * wrap), index.pretty.js:18103-18236. No DOM; imports only geometry and the stage numbers, so the
 * file can be lifted out together with geometry.js and config.js.
 */
import { stageConfig } from './config.js';
import { boundsOf, growRect, overlapArea, pointAlong, polygonHitsRect } from './geometry.js';

/**
 * @typedef {object} LabelPick
 * @property {number} side  candidate id: `positionIndex × 4 + variant` (variant 0/1 near pair, 2/3 far pair)
 * @property {number[]} rect  [x0, y0, x1, y1]
 * @property {number} cx
 * @property {number} cy
 * @property {number} cost
 */

/**
 * Size of a label pill.
 * @param {string} text                 may contain one `\n`
 * @param {(line: string, size: number) => number} measure  text width in px
 * @param {typeof stageConfig.labels} [opts]
 * @returns {{ w: number, h: number }}
 */
export function labelSize(text, measure, opts = stageConfig.labels) {
  const lines = String(text).split('\n');
  return {
    w: Math.max(...lines.map((line) => measure(line, opts.size))) + opts.padX,
    h: opts.height + (lines.length - 1) * opts.lineHeight,
  };
}

/** The two near offsets for a path direction: which sides of the line a pill may sit on. */
function sideOffsets(dx, dy, w, h, opts) {
  const g = opts.gap, snap = opts.axisSnap;
  if (Math.abs(dy) < snap) return [[0, -(h / 2 + g + opts.straightExtra)], [0, h / 2 + g + opts.straightExtra]];     // horizontal: above, below
  if (Math.abs(dx) < snap) return [[w / 2 + g + opts.straightExtra, 0], [-(w / 2 + g + opts.straightExtra), 0]];     // vertical: right, left
  return dx * dy > 0
    ? [[w / 2 + g, -(h / 2 + g)], [-(w / 2 + g), h / 2 + g]]       // falling to the right: upper right, lower left
    : [[-(w / 2 + g), -(h / 2 + g)], [w / 2 + g, h / 2 + g]];      // rising to the right: upper left, lower right
}

/**
 * Pick the cheapest spot for one w × h label beside a polyline.
 *
 * @param {number[][]} pts      the link's screen points
 * @param {number} at           preferred position along the path, 0..1
 * @param {number} w            pill width in px
 * @param {number} h            pill height in px
 * @param {(rect: number[]) => number} costFn  extra cost of a rectangle (collisions)
 * @param {number} [lock]       −1 to search; a candidate id to return exactly that candidate (cost 0).
 *                              The stage solves once per step at rest, then replays the pick every
 *                              frame with `lock`, so a label keeps its side while its ends move.
 * @param {typeof stageConfig.labels} [opts]
 * @returns {LabelPick}
 */
export function placeLabel(pts, at, w, h, costFn, lock = -1, opts = stageConfig.labels) {
  const C = opts.cost, found = [];
  opts.offsets.forEach((shift, index) => {
    const t = at + shift;
    if (index && (t < opts.range[0] || t > opts.range[1])) return;       // the preferred spot itself is always allowed
    const p = pointAlong(pts, t);
    const near = sideOffsets(p.dx, p.dy, w, h, opts);
    const far = near.map(([ox, oy]) => (oy ? [ox, oy + Math.sign(oy) * (h + opts.farStepY)] : [ox + Math.sign(ox) * opts.farStepX, oy]));
    [...near, ...far].forEach(([ox, oy], variant) => {
      const id = index * 4 + variant;
      if (lock >= 0 && lock !== id) return;
      const rect = [p.x + ox - w / 2, p.y + oy - h / 2, p.x + ox + w / 2, p.y + oy + h / 2];
      const cost = lock >= 0 ? 0 : costFn(rect) + Math.abs(shift) * C.slide + (variant % 2) * C.second + (variant > 1 ? C.far : 0);
      found.push({ id, rect, cost });
    });
  });
  if (!found.length) return placeLabel(pts, at, w, h, costFn, -1, opts);  // the locked spot left the allowed range
  const best = found.reduce((a, b) => (b.cost < a.cost ? b : a));
  return { side: best.id, rect: best.rect, cx: (best.rect[0] + best.rect[2]) / 2, cy: (best.rect[1] + best.rect[3]) / 2, cost: best.cost };
}

/**
 * Collision cost of a candidate rectangle.
 * @param {number[]} rect
 * @param {{ polys: number[][][], boxes: number[][] }} obstacles  entity outlines and pill areas
 * @param {number[][]} samples   points along every link
 * @param {number[][]} [placed]  rectangles of labels already placed
 * @param {typeof stageConfig.labels.cost} [C]
 * @returns {number}
 */
export function labelCost(rect, obstacles, samples, placed = [], C = stageConfig.labels.cost) {
  let cost = 0;
  for (const poly of obstacles.polys) if (polygonHitsRect(poly, rect)) cost += C.polygon;
  for (const box of obstacles.boxes) {
    const area = overlapArea(rect, box);
    if (area) cost += C.box + area * C.boxArea;
  }
  const padded = growRect(rect, C.labelPad);
  for (const other of placed) {
    const area = overlapArea(padded, other);
    if (area) cost += C.label + area * C.labelArea;
  }
  const near = growRect(rect, C.linePad);
  for (const [x, y] of samples) if (x > near[0] && x < near[2] && y > near[1] && y < near[3]) cost += C.line;
  return cost;
}

/**
 * Record what one entity blocks: its outline, plus rectangles for where its pills and label sit.
 * @param {object} state           entity state (type, cpu, tags, pills, label)
 * @param {number[][] | null} poly screen outline, or null
 * @param {number[]} bounds        [x0, y0, x1, y1] including pills
 * @param {{ polys: number[][][], boxes: number[][] }} out  appended to
 * @param {typeof stageConfig.labels} [opts]
 */
export function collectObstacles(state, poly, bounds, out, opts = stageConfig.labels) {
  if (!bounds) return;
  if (!poly || poly.length < 3) { out.boxes.push(bounds); return; }       // no outline: the whole bounds block
  out.polys.push(poly);
  const [px0, py0, px1, py1] = boundsOf(poly);
  const pills = (state.cpu >= 0 ? 1 : 0) + (state.tags ? state.tags.length : 0), below = state.pills === 'below';
  if (pills && !below) out.boxes.push([bounds[0], bounds[1], bounds[2], py0 + 4]);                    // the pill stack above
  if ((pills && below) || (opts.belowTypes.includes(state.type) && state.label)) out.boxes.push([bounds[0], py1 - 4, bounds[2], bounds[3]]);
  if (opts.rightTypes.includes(state.type) && state.label) out.boxes.push([px1 - 4, py0, bounds[2], py1]);
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const NO_LINE_START = /^[·→←:;,.!?)»”’%]/, NO_LINE_END = /[(«“‘]$/;
let segmenter = null;
function wordStarts(text, locale) {                          // indexes where a CJK word begins, or null without Intl.Segmenter
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null;
  if (!segmenter || segmenter.locale !== locale) segmenter = { locale, seg: new Intl.Segmenter(locale, { granularity: 'word' }) };
  return new Set([...segmenter.seg.segment(text)].map((s) => s.index));
}

/**
 * Best two-line form of a label, or null when it cannot be split.
 * Break points are spaces and, in Chinese or Japanese text, word boundaries between two CJK
 * characters. Text inside Unicode bidi isolates is never split, a line may not start with closing
 * punctuation or end with an opening bracket, and the split with the narrowest longer line wins.
 * @param {string} text
 * @param {(line: string, size: number) => number} measure
 * @param {{ size?: number, locale?: string }} [opts]
 * @returns {string | null} `"first\nsecond"`
 */
export function wrapLabel(text, measure, { size = stageConfig.labels.size, locale } = {}) {
  if (text.includes('\n')) return null;
  const chars = [...text], starts = CJK.test(text) ? wordStarts(text, locale) : null;
  let isolate = 0, best = null, index = chars[0] ? chars[0].length : 0;    // index = UTF-16 offset of chars[i]
  for (let i = 1; i < chars.length - 1; index += chars[i].length, i++) {
    const ch = chars[i];
    if (ch >= '⁦' && ch <= '⁨') isolate++;
    else if (ch === '⁩') isolate = Math.max(0, isolate - 1);
    if (isolate) continue;
    let head, tail;
    if (ch === ' ') { head = chars.slice(0, i).join(''); tail = chars.slice(i + 1).join(''); }
    else if (CJK.test(ch) && CJK.test(chars[i - 1]) && (!starts || starts.has(index))) { head = chars.slice(0, i).join(''); tail = chars.slice(i).join(''); }
    else continue;
    head = head.trimEnd();
    tail = tail.trimStart();
    if (!head || !tail || NO_LINE_START.test(tail) || NO_LINE_END.test(head)) continue;
    const w = Math.max(measure(head, size), measure(tail, size));
    if (!best || w < best.w) best = { w, text: `${head}\n${tail}` };
  }
  return best && best.text;
}

/**
 * Solve every label of a scene, in order.
 * @param {{ id: string, pts: number[][], at: number, label: string }[]} requests
 * @param {{ polys: number[][][], boxes: number[][] }} obstacles
 * @param {number[][]} samples
 * @param {(line: string, size: number) => number} measure
 * @param {typeof stageConfig.labels & { locale?: string }} [opts]
 * @returns {{ picks: Record<string, { side: number, label: string, text: string }>, rects: number[][] }}
 *   `text` is the form that won (possibly two lines); `rects` are the placed rectangles in order.
 */
export function solveLabels(requests, obstacles, samples, measure, opts = stageConfig.labels) {
  const picks = {}, rects = [];
  for (const req of requests) {
    const forms = [{ text: req.label, extra: 0 }];
    const wrapped = labelSize(req.label, measure, opts).w > opts.wrapOver && wrapLabel(req.label, measure, opts);
    if (wrapped) forms.push({ text: wrapped, extra: opts.wrapPenalty });
    let best = null;
    for (const form of forms) {
      const { w, h } = labelSize(form.text, measure, opts);
      const pick = placeLabel(req.pts, req.at, w, h, (rect) => labelCost(rect, obstacles, samples, rects, opts.cost) + form.extra, -1, opts);
      if (!best || pick.cost < best.pick.cost) best = { pick, text: form.text };
    }
    picks[req.id] = { side: best.pick.side, label: req.label, text: best.text };
    rects.push(best.pick.rect);
  }
  return { picks, rects };
}
