/**
 * The 2:1 isometric projection and the matrices that lay flat artwork onto a face.
 *
 * World space: `x` and `y` are floor axes in grid units, `z` is height in screen pixels.
 * Screen space: SVG user units, y down.
 *
 *   +x moves right and down    (unit, unit/2)
 *   +y moves right and up      (unit, -unit/2)
 *   +z moves straight up       (0, -1)
 *
 * So a larger `x - y` is nearer the viewer and is painted later.
 */
import { config } from './config.js';
import { R } from './util.js';

/**
 * Project a world point to the screen.
 * @param {number} x world x, grid units
 * @param {number} y world y, grid units
 * @param {number} [z=0] height in px
 * @returns {[number, number]} screen `[sx, sy]`, rounded to two decimals
 */
export const iso = (x, y, z = 0) => [R(config.unit * (x + y)), R((config.unit / 2) * (x - y) - z)];

/**
 * Inverse of `iso` for a point on the floor (z = 0). Useful for pointer events.
 * @param {number} sx screen x
 * @param {number} sy screen y
 * @returns {[number, number]} world `[x, y]`
 */
export const unproject = (sx, sy) => {
  const a = sx / config.unit;
  const b = sy / (config.unit / 2);
  return [(a + b) / 2, (a - b) / 2];
};

const MATRIX = {
  // local x runs along world +y, local y runs straight down the wall
  wall: '1 -0.5 0 1',
  // the other visible wall: local x runs along world +x
  wallLeft: '1 0.5 0 1',
  // flat on the floor, local x along world +x, text reads down-right
  floorX: '1 0.5 -1 0.5',
  // flat on the floor, local x along world +y, text reads up-right
  floorY: '1 -0.5 1 0.5',
};

/**
 * An SVG `matrix(...)` transform that places flat artwork (drawn with x right, y down, in px)
 * onto a plane of the isometric world, with its origin at a world point.
 *
 * | face       | local +x follows | local +y follows | used for |
 * | ---------- | ---------------- | ---------------- | -------- |
 * | `wall`     | world +y         | world -z (down)  | screens on the wall that faces +x |
 * | `wallLeft` | world +x         | world -z (down)  | the wall that faces -y (kit addition) |
 * | `floorX`   | world +x         | world -y         | zone labels |
 * | `floorY`   | world +y         | world +x         | keyboard keys |
 *
 * Artwork is not scaled: 14 px of local x covers exactly one grid unit when `config.unit` is 14.
 *
 * @param {'wall'|'wallLeft'|'floorX'|'floorY'} face
 * @param {number} x world x of the artwork origin
 * @param {number} y world y of the artwork origin
 * @param {number} [z=0] height of the origin in px
 * @returns {string} e.g. `matrix(1 -0.5 0 1 84 -66)`
 */
export function faceMatrix(face, x, y, z = 0) {
  const [sx, sy] = iso(x, y, z);
  return `matrix(${MATRIX[face] || MATRIX.wall} ${sx} ${sy})`;
}
