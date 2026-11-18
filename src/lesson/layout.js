// clarify/src/lesson/layout.js
// Decides which grid cell each place of a Lesson stands in (1 cell = 120 world units, cells are
// [x, y] on the floor) and which rails can be drawn as straight segments. The first rail chain
// sets the order and zigzags away from [0,0]; places the author pinned with `at=` keep their cell.

/** @typedef {import("../types").Lesson} Lesson */

/**
 * @typedef {object} Bench
 * @property {Record<string, [number, number]>} cells grid cell of every place, by place id
 * @property {string[]} drawn ids (`a--b`, as in state.js) of the rails that can be drawn, in declaration order
 * @property {string[]} warnings author-facing problems, each prefixed with its draft line
 */

/** The step the chain takes from each place to the next; repeats. */
const ZIGZAG = [[1, 0], [0, -1], [1, 0], [0, 1]];
/** Where a place goes when its own cell is taken, or when it hangs off a partner. */
const NEIGHBOURS = [[0, -1], [0, 1], [1, 0], [-1, 0]];

/**
 * @param {Lesson} lesson
 * @returns {Bench}
 */
export function layoutBench(lesson) {
  const placed = new Map(); // place id -> [x, y]
  const owner = new Map(); // "x,y" -> place id
  const warnings = [];
  const byId = new Map(lesson.places.map(place => [place.id, place]));
  const key = ([x, y]) => `${x},${y}`;

  let cursor = null; // the cell of the place last put on the zigzag
  let steps = 0; // zigzag steps used so far; one per chain place after the first

  /** The first free cell around `cell`: its four neighbours, then the same four two cells out, and so on. */
  function freeNear([x, y]) {
    for (let reach = 1; ; reach++) {
      for (const [dx, dy] of NEIGHBOURS) {
        const cell = [x + dx * reach, y + dy * reach];
        if (!owner.has(key(cell))) return cell;
      }
    }
  }

  function put(id, cell) {
    placed.set(id, cell);
    owner.set(key(cell), id);
    return cell;
  }

  /** Stands a place on a cell the layout computed; if it is taken, warn and move to a free neighbour. */
  function settle(place, cell) {
    const holder = owner.get(key(cell));
    if (holder === undefined) return put(place.id, cell);
    warnings.push(`line ${place.line}: "${place.id}" overlaps "${holder}"`);
    return put(place.id, freeNear(cell));
  }

  /** Takes the next zigzag step from the cursor (the very first place starts at [0,0]). A pinned place stays put. */
  function follow(id) {
    let target = [0, 0];
    if (cursor) {
      const [dx, dy] = ZIGZAG[steps++ % ZIGZAG.length];
      target = [cursor[0] + dx, cursor[1] + dy];
    }
    cursor = placed.get(id) ?? settle(byId.get(id), target);
  }

  /** Puts a place on the first free neighbour of its partner. */
  function beside(id, partner) {
    put(id, freeNear(placed.get(partner)));
  }

  // Pinned places first, in declaration order.
  for (const place of lesson.places) {
    if (place.at) settle(place, [place.at[0], place.at[1]]);
  }

  // The first rail chain: the longest run of rails that each start where the one before ended.
  const chain = [];
  if (lesson.rails.length) {
    chain.push(lesson.rails[0].a);
    for (const rail of lesson.rails) {
      if (rail.a !== chain.at(-1)) break;
      chain.push(rail.b);
    }
  }
  for (const id of chain) follow(id);

  // Later rails hang their unplaced ends off the placed one.
  for (const { a, b } of lesson.rails) {
    if (!placed.has(a) && !placed.has(b)) follow(a);
    if (!placed.has(b)) beside(b, a);
    else if (!placed.has(a)) beside(a, b);
  }

  // Places in no rail continue the zigzag after everything else.
  for (const place of lesson.places) {
    if (placed.has(place.id)) continue;
    warnings.push(`line ${place.line}: "${place.id}" has no rail`);
    follow(place.id);
  }

  /** Same row or column, different cells, and no place strictly between. */
  function straight(a, b) {
    const [ax, ay] = placed.get(a);
    const [bx, by] = placed.get(b);
    const lo = (p, q) => Math.min(p, q);
    const hi = (p, q) => Math.max(p, q);
    if (ax === bx && ay !== by) {
      return ![...placed.values()].some(([x, y]) => x === ax && y > lo(ay, by) && y < hi(ay, by));
    }
    if (ay === by && ax !== bx) {
      return ![...placed.values()].some(([x, y]) => y === ay && x > lo(ax, bx) && x < hi(ax, bx));
    }
    return false;
  }

  const drawn = [];
  for (const rail of lesson.rails) {
    if (straight(rail.a, rail.b)) drawn.push(`${rail.a}--${rail.b}`);
    else warnings.push(`line ${rail.line}: rail ${rail.a} - ${rail.b} can't be drawn straight`);
  }

  const cells = Object.fromEntries(lesson.places.map(place => [place.id, placed.get(place.id)]));
  return { cells, drawn, warnings };
}
