// clarify/src/lesson/objects/folder.js
// A box file: an open box on rubber feet with rivets on its wall tops, filled with folders (each
// with an index tab) between bundles of paper standing on edge; a label holder over a finger hole
// on its front and a hand hole in its right side. Centred on the world origin, standing on the pad.
// Like the tray, the walls behind the contents are drawn before them and the walls in front after.

const Z0 = 3; // the pad's top

export default {
  top: 30,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, faceX, sideRing, halo, dots, feet, plateOnY, inset } = pen;
    const out = [];
    const outer = { x: -22, y: -15, w: 44, d: 30, r: 1.5 };
    out.push(halo(inset(outer, 1), Z0, 0.1), feet(outer, 4, 1.6, Z0, 0.8));
    const zb = Z0 + 0.8;
    out.push(solid(slab(outer, zb, 1.6, 6, 0.4), { tone: "mid" }));
    const zf = zb + 1.6; // the floor inside
    const [tk, wallH] = [1.6, 17];
    const zw = zf + wallH;
    const wall = (plan) => solid(slab({ ...plan, r: 0.6 }, zf, wallH, 3, 0.3), { tone: "mid" });
    out.push(wall({ x: -22, y: -15, w: 44, d: tk }), wall({ x: -22, y: -15, w: tk, d: 30 }));

    // Folders and paper bundles standing on edge, left to right (back to front).
    const items = [
      ["folder", 4.2, -9], ["paper", 2.4], ["folder", 3.2, -1], ["paper", 3], ["folder", 4.6, 6],
      ["paper", 1.8], ["folder", 3.6, -6], ["paper", 2.6], ["folder", 4, 2], ["paper", 2.2]
    ];
    items.forEach(([kind, rise, tab], i) => {
      const x = -18.6 + i * 3.7;
      const zi = zw + rise;
      if (kind === "paper") {
        out.push(`<g class="l-paper">${solid(slab({ x, y: -12.6, w: 1.6, d: 25.2, r: 0.3 }, zf, zi - zf, 2), { tone: "mid" })}</g>`);
        return;
      }
      out.push(solid(slab({ x, y: -13, w: 0.5, d: 26, r: 0.2 }, zf, zi - zf, 2), { tone: "mid", crease: "none" }));
      out.push(solid(slab({ x, y: tab, w: 0.5, d: 6, r: 0.2 }, zi, 2.2, 2), { tone: "mid", crease: "none" }));
    });

    // The right wall and the front stand in front of the files; rivets sit on the wall tops.
    out.push(wall({ x: 22 - tk, y: -15, w: tk, d: 30 }), wall({ x: -22, y: 15 - tk, w: 44, d: tk }));
    out.push(dots([[-21.2, -14.2], [21.2, -14.2], [21.2, 14.2], [-21.2, 14.2]].map(([x, y]) => [x, y, zw]), { size: 0.45 }));
    const hole = faceX(22, -4.5, 4.5, zw - 5.4, zw - 2.6);
    out.push(`<path class="l-cavity" d="${hole}"/>`, line(hole, { tone: "lo" }));

    // The front: a label holder (a frame round a card) over a finger hole with a metal grommet.
    out.push(solid(slab({ x: -9, y: 15, w: 18, d: 0.6, r: 0.5 }, zf + 7.6, 7.4, 3), { tone: "mid", crease: "none" }));
    out.push(plateOnY(15.6, -7.6, 7.6, zf + 8.4, zf + 14.2, 2));
    out.push(`<path class="l-cavity" d="${sideRing([0, 15, zf + 4], 1.6, "y", 20)}"/>`);
    out.push(line(sideRing([0, 15, zf + 4], 2.4, "y", 24), { tone: "mid" }));
    return out.join("");
  }
};
