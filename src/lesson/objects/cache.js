// clarify/src/lesson/objects/cache.js
// A cache: a low, wide rack on four feet with a screwed lid, eight small drawers in two rows (a
// pull and an LED each, most of them lit), and on its right side a label plate with a lightning
// bolt over a row of vent slots. Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top

export default {
  top: 28,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, faceX, segX, halo, dot, outline, feet, screws, pathAt, inset } = pen;
    const out = [];
    const body = { x: -26, y: -16, w: 52, d: 32, r: 2 };
    out.push(halo(inset(body, 1), Z0, 0.1), feet(body, 4, 1.8, Z0, 1.6));
    const zb = Z0 + 1.6;
    const zt = zb + 21;
    out.push(solid(slab(body, zb, 21, 6, 0.6), { tone: "mid" }));
    const lid = { x: -27.2, y: -17.2, w: 54.4, d: 34.4, r: 2.6 };
    out.push(solid(slab(lid, zt, 2, 6, 0.5), { tone: "mid" }));
    out.push(line(outline(inset(lid, 3.5), zt + 2), { tone: "faint" }));
    out.push(screws(lid, 5, zt + 2, 0.45));

    // The right side: a label plate with a lightning bolt, and a row of vent slots under it.
    const xr = body.x + body.w;
    const plate = faceX(xr, -7, 7, zb + 8, zb + 17);
    out.push(`<path class="l-plate" d="${plate}"/>`, line(plate, { tone: "lo" }));
    const [yc, zc] = [3.6, zb + 12.5];
    const bolt = [[1.4, 3.6], [-1.6, -0.3], [0.2, -0.3], [-1.2, -3.6], [1.9, 0.6], [0.1, 0.6]];
    out.push(`<path class="l-sheetbar" d="${pathAt(bolt.map(([u, v]) => [xr, yc - u, zc + v]), true)}"/>`);
    for (const [z, y2] of [[zc + 1.2, -5], [zc - 1.2, -3]]) out.push(line(segX(xr, 0.8, z, y2, z), { tone: "faint", free: "both" }));
    for (let i = 0; i < 9; i++) {
      const y = -10 + i * 2.6;
      out.push(line(faceX(xr, y, y + 1, zb + 2.2, zb + 6), { tone: "lo" }));
    }

    // Two rows of four drawers, each with a pull and an LED; a vent slot runs under each row.
    const yf = body.y + body.d;
    const rows = [[zb + 2.2, zb + 9.6], [zb + 11.2, zb + 18.6]];
    rows.forEach(([z1, z2], row) => {
      for (let col = 0; col < 4; col++) {
        const x = -24.4 + col * 12.4;
        const zm = (z1 + z2) / 2;
        out.push(solid(slab({ x, y: yf, w: 11.4, d: 1.2, r: 0.6 }, z1, z2 - z1, 3, 0.2), { tone: "mid" }));
        out.push(solid(slab({ x: x + 2, y: yf + 1.2, w: 5, d: 1, r: 0.5 }, zm - 1.6, 1.2, 3), { tone: "mid", crease: "none" }));
        out.push(dot([x + 9, yf + 1.2, zm + 1.6], (row * 4 + col) % 5 === 3 ? "l-led" : "l-led is-ok", 0.9));
      }
    });
    return out.join("");
  }
};
