// clarify/src/lesson/objects/box.js
// A wooden crate on two skids: planked sides with a hand hole and a label plate, corner battens
// with screwed metal brackets, and a planked lid with corner screws. It is also the stand-in for
// any kind that has no drawing of its own yet. Centred on the world origin, standing on the pad.
// No piece passes through another, so drawing them back to front is exact.

const Z0 = 3; // the pad's top

export default {
  top: 30,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, faceX, segX, segY, halo, lineOnTop, screws, plateOnY, dots, inset } = pen;
    const out = [];
    const body = { x: -22, y: -22, w: 44, d: 44, r: 0.6 };
    out.push(halo(inset(body, -1), Z0, 0.1));
    for (const y of [-15, 10]) out.push(solid(slab({ x: -23, y, w: 46, d: 5, r: 0.8 }, Z0, 2.2, 3), { tone: "lo", crease: "none" }));
    const zb = Z0 + 2.2;
    const zt = zb + 22;
    out.push(solid(slab(body, zb, 22, 4, 0.4), { tone: "mid" }));

    // Plank seams on the two faces the reader sees, a hand hole in the top plank, a label plate.
    for (const z of [zb + 5.5, zb + 11, zb + 16.5]) {
      out.push(line(segY(22, -17, z, 17, z) + segX(22, -17, z, 17, z), { tone: "lo" }));
    }
    const hole = faceX(22, -6, 6, zt - 4, zt - 1.5);
    out.push(`<path class="l-cavity" d="${hole}"/>`, line(hole, { tone: "lo" }));
    out.push(plateOnY(22, -8, 8, zb + 7, zb + 14.5, 2));

    // Corner battens set against the faces, back to front, each with a bracket plate near its
    // foot and its head. A batten on the right face is narrow in x; one on the front, in y.
    const battens = [
      { x: 22, y: -22, w: 1.2, d: 5 }, // right corner, on the right face
      { x: -22, y: 22, w: 5, d: 1.2 }, // left corner, on the front face
      { x: 22, y: 17, w: 1.2, d: 5 }, // front corner, on the right face
      { x: 17, y: 22, w: 6.2, d: 1.2 } // front corner, on the front face, closing the corner
    ];
    const heads = [];
    for (const b of battens) {
      out.push(solid(slab({ ...b, r: 0.3 }, zb, zt - zb, 3), { tone: "mid", crease: "none" }));
      const onRight = b.w < b.d;
      const plate = onRight ? { x: b.x + b.w, y: b.y + 0.3, w: 0.4, d: b.d - 0.6 } : { x: b.x + 0.3, y: b.y + b.d, w: b.w - 0.6, d: 0.4 };
      const [hx, hy] = onRight ? [plate.x + plate.w, plate.y + plate.d / 2] : [plate.x + plate.w / 2, plate.y + plate.d];
      for (const z1 of [zb + 1, zt - 5.4]) {
        out.push(solid(slab({ ...plate, r: 0.15 }, z1, 4.4, 2), { tone: "mid", crease: "none" }));
        heads.push([hx, hy, z1 + 2.2]);
      }
    }
    out.push(dots(heads, { size: 0.5, tone: "hi" }));

    // The lid: three planks, a screw near each corner.
    const lid = { x: -24, y: -24, w: 48, d: 48, r: 1.4 };
    const ztop = zt + 2.4;
    out.push(solid(slab(lid, zt, 2.4, 4, 0.4), { tone: "mid" }));
    out.push(line(lineOnTop([-24, -8], [24, -8], ztop) + lineOnTop([-24, 8], [24, 8], ztop), { tone: "lo" }));
    out.push(screws(lid, 4.5, ztop, 0.45));
    return out.join("");
  }
};
