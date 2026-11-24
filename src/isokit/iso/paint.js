/**
 * Isometric boxes: the geometry of a rounded box, its seven paint layers, its soft shadow,
 * and a small flat-shaded prism for details such as a laptop screen.
 */
import { config, paletteName } from './config.js';
import { iso } from './projection.js';
import { roundedPolygon, roundedPolyline } from './geometry.js';
import { ref } from './defs.js';
import { R } from './util.js';

/**
 * Geometry of a box standing on the floor.
 *
 * Corner names follow where the corner sits on screen: `T` top (back), `R` right, `B` bottom
 * (front), `L` left are the four lid corners; `Rd`, `Bd`, `Ld` are the three floor corners
 * you can see. The hexagon `T, R, Rd, Bd, Ld, L` is the silhouette.
 *
 * Corner radii: lid corners use `radius + 1` at the back, 6 at the front and the "wall
 * radius" at the sides; the bottom front corner uses `radius + 3`. The wall radius is
 * `radius` limited to `h / 2 − 0.5` (never below 1), so a thin slab does not round away.
 *
 * @param {number} x0 world x of the back-left edge
 * @param {number} x1 world x of the front-right edge
 * @param {number} y0 world y of the front-left edge
 * @param {number} y1 world y of the back-right edge
 * @param {number} h height in px
 * @param {number} [radius=9] corner radius in px
 * @returns {{
 *   T: number[], R: number[], B: number[], L: number[], Rd: number[], Bd: number[], Ld: number[],
 *   lidX: number, lidY: number, outline: number[][],
 *   silhouette: string, top: string, sheen: string, right: string, bevel: string
 * }} corner points, the lid centre, the unrounded outline, and path data for each paint layer
 */
export function boxGeom(x0, x1, y0, y1, h, radius = 9) {
  const T = iso(x0, y1, h);
  const Rt = iso(x1, y1, h);
  const B = iso(x1, y0, h);
  const L = iso(x0, y0, h);
  const Rd = iso(x1, y1, 0);
  const Bd = iso(x1, y0, 0);
  const Ld = iso(x0, y0, 0);
  const wall = Math.max(1, Math.min(radius, h / 2 - 0.5));
  const [lidX, lidY] = iso((x0 + x1) / 2, (y0 + y1) / 2, h);
  const outline = [T, Rt, Rd, Bd, Ld, L];
  const lid = [T, Rt, B, L];
  const lidRadii = [radius + 1, wall, 6, wall];
  return {
    T,
    R: Rt,
    B,
    L,
    Rd,
    Bd,
    Ld,
    lidX,
    lidY,
    outline,
    silhouette: roundedPolygon(outline, [radius + 1, wall, wall, radius + 3, wall, wall]),
    top: roundedPolygon(lid, lidRadii),
    // the lid, squashed 25% towards its centre line and raised 3 px: a soft highlight
    sheen: roundedPolygon(
      lid.map(([x, y]) => [x, y - 3 + (y - lidY) * -0.25]),
      lidRadii,
    ),
    right: roundedPolygon([B, Rt, Rd, Bd], [6, wall, wall, radius + 3]),
    // the two front lid edges, L → B → R
    bevel: roundedPolyline([L, B, Rt], 8),
  };
}

/**
 * Paint a box. Seven layers, back to front:
 *
 * 1. the silhouette filled with the wall gradient
 * 2. the right wall darkened (5% of a deep brown)
 * 3. the lid, filled with the lid gradient
 * 4. a blurred white sheen on the lid (22%)
 * 5. a white line along the front lid edges, 1.4 px below the edge (the bevel light)
 * 6. a faint dark line 3.4 px below the edge (the bevel shadow)
 * 7. the ink outline of the silhouette
 *
 * The soft floor shadow is separate: see `dropShadow`.
 *
 * @param {ReturnType<typeof boxGeom>} g geometry from `boxGeom`
 * @param {string} color palette key or alias; unknown names paint as `slab`
 * @param {{ stroke?: string, sw?: number }} [outline] outline colour (default ink) and width in px (default 1.9)
 * @returns {string} SVG markup
 */
export function paintBox(g, color, { stroke = config.ink, sw = 1.9 } = {}) {
  const C = config.colors;
  const c = paletteName(color);
  return (
    `<path d="${g.silhouette}" fill="${ref(`g-${c}-side`)}"/>` +
    `<path d="${g.right}" fill="${C.faceShade}" opacity=".05"/>` +
    `<path d="${g.top}" fill="${ref(`g-${c}-top`)}"/>` +
    `<path d="${g.sheen}" fill="${C.highlight}" opacity=".22" filter="${ref('blur-sm')}"/>` +
    `<path d="${g.bevel}" transform="translate(0 1.4)" fill="none" stroke="${C.highlight}" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="${g.bevel}" transform="translate(0 3.4)" fill="none" stroke="${C.bevelShade}" stroke-opacity=".07" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="${g.silhouette}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
  );
}

/**
 * How much a shadow keeps of its strength at a given lift: 1 on the floor, 0.15 from 140 px up.
 * @param {number} lift px above the floor
 * @returns {number}
 */
export const liftFade = (lift) => 1 - Math.min(1, lift / 140) * 0.85;

/**
 * The soft floor shadow of a box: its silhouette, blurred (6.5 px) and pushed down by
 * `min(9, 3 + 0.15 × h)` px. Draw it outside the group that lifts the box. As the box
 * rises the shadow slides down by the same distance and fades.
 * @param {ReturnType<typeof boxGeom>} g geometry from `boxGeom`
 * @param {number} h box height in px
 * @param {number} lift px the box is raised above the floor
 * @param {number} strength opacity on the floor (blocks use 0.26, slabs 0.2)
 * @returns {string} SVG markup
 */
export function dropShadow(g, h, lift, strength) {
  const drop = Math.min(9, 3 + h * 0.15);
  return `<path d="${g.silhouette}" transform="translate(0 ${R(drop + lift)})" fill="${config.colors.shadow}" opacity="${R(strength * liftFade(lift))}" filter="${ref('blur-lg')}"/>`;
}

/**
 * A small flat-shaded box with three visible faces and one outline. Unlike `boxGeom` it can
 * float (`z0` above the floor) and has no gradients, bevel or shadow.
 * @param {{ x0: number, x1: number, y0: number, y1: number, z0: number, z1: number }} box world extents; z in px
 * @param {{ top: string, right?: string, front?: string, left: string, stroke?: string }} colors fills for the lid,
 *   the wall facing +x (`right`, also accepted as `front`) and the wall facing −y (`left`)
 * @param {{ sw?: number, r?: number }} [opts] outline width (default 1.5) and corner radius (default 2), px
 * @returns {string} SVG markup
 */
export function prism(box, colors, { sw = 1.5, r = 2 } = {}) {
  const { x0, x1, y0, y1, z0, z1 } = box;
  const top = [iso(x0, y0, z1), iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y0, z1)];
  const right = [iso(x1, y0, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x1, y0, z0)];
  const left = [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y0, z0), iso(x0, y0, z0)];
  const outline = [top[0], top[1], top[2], right[2], right[3], left[3]];
  return (
    `<path d="${roundedPolygon(left, r)}" fill="${colors.left}"/>` +
    `<path d="${roundedPolygon(right, r)}" fill="${colors.right ?? colors.front}"/>` +
    `<path d="${roundedPolygon(top, r)}" fill="${colors.top}"/>` +
    `<path d="${roundedPolygon(outline, r)}" fill="none" stroke="${colors.stroke || config.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`
  );
}
