// clarify/src/lesson/objects/server.js
// A tower server: square feet, a vented top with screws, four drive bays (pull handle and two
// LEDs each), a power button, a front intake grille, side vents and a side label plate.
// Ported from the approved mockup (build-styles.mjs server()), centred on the world origin;
// the bays' handle slots became raised pull handles.

const Z0 = 3; // the pad's top

export default {
  top: 70,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, faceX, faceY, segX, segY, halo, dot, outline, lineOnTop, sideRing, screws, plateOnX, byDepth, inset, corners } = pen;
    const out = [];
    const body = { x: -17, y: -24, w: 34, d: 48, r: 2 };
    out.push(halo(inset(body, 1), Z0, 0.1));
    for (const [x, y] of byDepth(corners(body, 3.5))) out.push(solid(slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 1 }, Z0, 2.2, 3), { tone: "lo", crease: "none" }));
    const zb = Z0 + 2.2;
    const zt = zb + 64;
    out.push(solid(slab(body, zb, 64, 6, 0.8), { tone: "mid" }));

    // The top: a vent grille and four screws.
    out.push(line(outline(inset(body, 3), zt), { tone: "faint" }));
    const grille = { x: -10, y: -16, w: 20, d: 26, r: 1.5 };
    out.push(line(outline(grille, zt), { tone: "lo" }));
    for (let i = 0; i < 7; i++) {
      const y = grille.y + 2.6 + i * 3.5;
      out.push(line(lineOnTop([grille.x + 2.5, y], [grille.x + grille.w - 2.5, y], zt), { tone: "lo" }));
    }
    out.push(screws(body, 4.5, zt, 0.4));

    // The front: four drive bays, a power button and the intake grille.
    const yf = 24;
    for (const [z1, z2] of [[zb + 38, zb + 43.5], [zb + 45, zb + 50.5], [zb + 52, zb + 57.5], [zb + 59, zb + 62.5]]) {
      out.push(solid(slab({ x: -14, y: yf, w: 28, d: 1.2, r: 0.6 }, z1, z2 - z1, 3, 0.2), { tone: "mid" }));
      const y2 = yf + 1.2;
      const zm = (z1 + z2) / 2;
      out.push(solid(slab({ x: -11, y: y2, w: 14, d: 0.8, r: 0.4 }, zm - 0.6, 1.2, 3), { tone: "mid", crease: "none" }));
      out.push(dot([7, y2, zm], "l-led is-ok", 1.15), dot([10.5, y2, zm], "l-led", 1.15));
    }
    out.push(line(sideRing([0, yf, zb + 31], 2.6, "y", 24), { tone: "mid" }));
    out.push(dot([0, yf, zb + 31], "l-led is-ok", 0.9));
    out.push(line(faceY(yf, -13, 13, zb + 4.5, zb + 26.5), { tone: "lo" }));
    for (let i = 0; i < 9; i++) {
      const z = zb + 6.4 + i * 2.35;
      out.push(line(segY(yf, -13, z, 13, z), { tone: "lo" }));
    }

    // The right side: three columns of vents and a label plate.
    const xr = 17;
    out.push(line(faceX(xr, -19, 19, zb + 38, zb + 58), { tone: "lo" }));
    for (let col = 0; col < 3; col++) {
      for (let i = 0; i < 6; i++) {
        const y1 = -19 + 1.5 + col * 12.5;
        const z = zb + 40.5 + i * 3.1;
        out.push(line(segX(xr, y1, z, y1 + 9.5, z), { tone: "lo" }));
      }
    }
    out.push(plateOnX(xr, -8, 10, zb + 8, zb + 16));
    return out.join("");
  }
};
