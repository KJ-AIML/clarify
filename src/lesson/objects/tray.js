// clarify/src/lesson/objects/tray.js
// A desk in-tray: rubber feet, a base, walls with a low front lip, a stack of papers (the top
// one with a highlighted heading and ruled lines), rivets on the wall tops and a label holder.
// Ported from the approved mockup (build-styles.mjs tray()), centred on the world origin;
// the feet and the raised label holder are new.

const Z0 = 3; // the pad's top

export default {
  top: 18,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, halo, outline, lineOnTop, plateOnY, dots, feet, inset } = pen;
    const out = [];
    const outer = { x: -28, y: -22, w: 56, d: 44, r: 2.5 };
    out.push(halo(inset(outer, 2), Z0, 0.1), feet(outer, 5, 1.6, Z0, 0.8));
    const zb = Z0 + 0.8;
    out.push(solid(slab(outer, zb, 2, 6, 0.4), { tone: "mid" }));
    const zf = zb + 2;
    const [tk, wallH, lipH] = [2.4, 11, 5.5];
    const wall = (plan, height) => solid(slab({ ...plan, r: 1 }, zf, height, 3, 0.3), { tone: "mid" });

    // The back and left walls stand behind the papers.
    out.push(wall({ x: -28, y: -22, w: 56, d: tk }, wallH), wall({ x: -28, y: -22, w: tk, d: 44 }, wallH));
    [[-0.8, 0.8], [0.9, -0.5], [0, 0]].forEach(([dx, dy], i) => {
      const sheet = slab({ x: -23 + dx, y: -18 + dy, w: 44, d: 34, r: 0.5 }, zf + i * 0.6, 0.6, 2);
      out.push(`<g class="l-paper">${solid(sheet, { tone: "mid", crease: "none" })}</g>`);
    });
    const ztop = zf + 1.8;
    out.push(`<path class="l-sheetbar" d="${outline({ x: -20, y: -15.5, w: 26, d: 3.2, r: 0.4 }, ztop)}"/>`);
    [30, 24, 34, 18, 28, 32].forEach((len, i) => {
      const y = -8 + i * 3.6;
      out.push(line(lineOnTop([-20, y], [-20 + len, y], ztop), { tone: "lo", free: "both" }));
    });

    // The right wall and the front lip stand in front of them; the label holder sits on the lip.
    out.push(wall({ x: 28 - tk, y: -22, w: tk, d: 44 }, wallH), wall({ x: -28, y: 22 - tk, w: 56, d: tk }, lipH));
    out.push(solid(slab({ x: -11.2, y: 22, w: 22.4, d: 0.7, r: 0.35 }, zf + 0.5, 4.5, 3), { tone: "mid", crease: "none" }));
    out.push(plateOnY(22.7, -10, 10, zf + 1.1, zf + 4.4, 1));
    out.push(dots([[-26.8, -20.8], [26.8, -20.8], [26.8, 20.8]].map(([x, y]) => [x, y, zf + wallH]), { size: 0.45 }));
    return out.join("");
  }
};
