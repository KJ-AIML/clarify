// clarify/src/lesson/objects/cabinet.js
// A card-file cabinet: feet, a body under a screwed lid, a side label plate, two closed drawers
// and the top drawer pulled out to show its cards (the commits; the front one is the newest).
// Ported from the approved mockup (build-styles.mjs drawerFront() and cabinet()), centred on the
// world origin.

const Z0 = 3; // the pad's top

/**
 * A drawer front with a handle and a label plate; `y` is its back face.
 * @param {import("../pen.js").Pen} pen
 */
function drawerFront({ solid, slab, plateOnY }, y, z1, z2) {
  const yf = y + 1.6;
  const zm = (z1 + z2) / 2;
  return (
    solid(slab({ x: -21, y, w: 42, d: 1.6, r: 0.8 }, z1, z2 - z1, 3, 0.3), { tone: "mid" }) +
    solid(slab({ x: -6, y: yf, w: 12, d: 1.8, r: 0.9 }, zm - 2.6, 1.6, 3, 0.2), { tone: "mid", crease: "none" }) +
    plateOnY(yf, -7, 7, zm + 0.8, zm + 3.8, 1)
  );
}

export default {
  top: 53,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, faceY, segY, halo, outline, feet, screws, plateOnX, inset } = pen;
    const out = [];
    const body = { x: -24, y: -20, w: 48, d: 40, r: 2 };
    out.push(halo(inset(body, 1), Z0, 0.1), feet(body, 4, 1.8, Z0, 2));
    const zb = Z0 + 2;
    const zt = zb + 44;
    out.push(solid(slab(body, zb, 44, 6, 0.8), { tone: "mid" }));
    const lid = { x: -25.5, y: -21.5, w: 51, d: 43, r: 2.5 };
    out.push(solid(slab(lid, zt, 2.2, 6, 0.5), { tone: "mid" }));
    out.push(line(outline(inset(lid, 3.5), zt + 2.2), { tone: "faint" }));
    out.push(screws(lid, 6, zt + 2.2, 0.45));
    out.push(plateOnX(24, -10, 8, zb + 28, zb + 36));

    const yf = 20;
    const bands = [[zb + 3, zb + 14], [zb + 16, zb + 27], [zb + 29, zb + 41]];
    for (const [z1, z2] of bands.slice(0, 2)) out.push(drawerFront(pen, yf, z1, z2));

    // The top drawer is pulled out: its cards are the commits, the front one is the newest.
    const [z1, z2] = bands[2];
    const pull = 16;
    out.push(`<path class="l-cavity" d="${faceY(yf, -21, 21, z1, z2)}"/>`);
    out.push(solid(slab({ x: -20, y: yf, w: 40, d: pull, r: 0.5 }, z1 + 0.6, 1, 3), { tone: "mid", crease: "none" }));
    out.push(solid(slab({ x: -20, y: yf, w: 1.4, d: pull, r: 0.4 }, z1 + 1.6, 7, 3), { tone: "mid", crease: "none" }));
    const tabs = [-14, -4, 6, -9, 1, 9];
    tabs.forEach((tx, i) => {
      const y = yf + 1.6 + i * 2.25;
      const zc = z1 + 1.6;
      const newest = i === tabs.length - 1;
      const tone = newest ? "hi" : "mid";
      const card = solid(slab({ x: -16, y, w: 32, d: 0.5, r: 0.2 }, zc, 13, 2), { tone, crease: "none", lit: newest });
      const tab = solid(slab({ x: tx, y, w: 7, d: 0.5, r: 0.2 }, zc + 13, 2.6, 2), { tone, crease: "none", lit: newest });
      out.push(`<g class="l-paper${newest ? " is-new" : ""}">${tab}${card}</g>`);
      out.push(line(segY(y + 0.5, -13, zc + 10.5, newest ? 9 : 4, zc + 10.5), { tone: newest ? "hi" : "faint", free: "both" }));
    });
    out.push(solid(slab({ x: 18.6, y: yf, w: 1.4, d: pull, r: 0.4 }, z1 + 1.6, 7, 3), { tone: "mid", crease: "none" }));
    out.push(drawerFront(pen, yf + pull, z1, z2));
    return out.join("");
  }
};
