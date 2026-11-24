/**
 * X-ray overlay: an authoring aid that draws what the engine "sees". Not in the original site.
 *
 *   red dashed outline    an entity's `poly` (what links are trimmed against)
 *   blue dashed box       an entity's `bounds` (what the camera frames and labels avoid)
 *   blue dots             a link's routed points after trimming
 *   orange dot + text     an entity's id and world centre
 *   three axes            +x, +y, +z from the world origin
 */
import { centerOf, esc, iso, R } from './deps.js';

/**
 * Redraw the overlay.
 * @param {Element} layer  a `<g>` above the entities, in world (SVG) coordinates
 * @param {{ ents: Iterable<{ id: string, cur: object, poly: number[][] | null, bounds: number[] | null, docked?: boolean }>,
 *           links: Iterable<{ pts: number[][] | null }> }} scene
 */
export function drawXray(layer, { ents, links }) {
  let s = '';
  const shown = [...ents].filter((e) => !e.docked && (e.cur.opacity ?? 1) >= 0.05);
  for (const e of shown) {
    if (e.poly) s += `<path d="M${e.poly.map((p) => `${R(p[0])},${R(p[1])}`).join(' L')} Z" fill="rgba(229,83,75,.07)" stroke="#e5534b" stroke-width="1" stroke-dasharray="3 2"/>`;
    if (e.bounds) {
      const [x0, y0, x1, y1] = e.bounds;
      s += `<rect x="${R(x0)}" y="${R(y0)}" width="${R(x1 - x0)}" height="${R(y1 - y0)}" fill="none" stroke="#2f86ce" stroke-width=".8" stroke-dasharray="4 3"/>`;
    }
  }
  for (const l of links) if (l.pts) for (const p of l.pts) s += `<circle cx="${R(p[0])}" cy="${R(p[1])}" r="2.4" fill="#2f86ce"/>`;
  const o = iso(0, 0);
  const axis = (end, colour, name) =>
    `<line x1="${o[0]}" y1="${o[1]}" x2="${end[0]}" y2="${end[1]}" stroke="${colour}" stroke-width="2"/><circle cx="${end[0]}" cy="${end[1]}" r="3" fill="${colour}"/><text x="${R(end[0] + 6)}" y="${R(end[1] + 4)}" font-size="11" font-weight="800" fill="${colour}">${name}</text>`;
  s += axis(iso(5, 0), '#d0683a', '+x') + axis(iso(0, 5), '#2f86ce', '+y') + axis(iso(0, 0, 70), '#3fa456', '+z');
  for (const e of shown) {
    const [x, y] = centerOf(e.cur), [sx, sy] = iso(x, y);
    s += `<circle cx="${sx}" cy="${sy}" r="3" fill="#d0683a"/><text x="${R(sx + 6)}" y="${R(sy + 14)}" font-size="10" font-weight="700" fill="#d0683a">${esc(e.id)} (${R(x)}, ${R(y)})</text>`;
  }
  layer.innerHTML = s;
}

/** Empty the overlay. */
export function clearXray(layer) {
  if (layer.firstChild) layer.innerHTML = '';
}
