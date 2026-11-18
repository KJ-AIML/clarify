// clarify/src/lesson/objects/laptop.js
// An open laptop facing the reader: rubber feet, side ports and a status LED, the lid with a
// screen of code (one line being edited) and a camera, hinges, a keyboard and a trackpad.
// Ported from the approved mockup (build-styles.mjs laptop()), centred on the world origin.

const Z0 = 3; // the pad's top

export default {
  top: 46,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, faceX, faceY, segY, halo, dot, outline, feet, byDepthPlans, inset } = pen;
    const out = [];
    const base = { x: -30, y: -20, w: 60, d: 40, r: 3 };
    out.push(halo(inset(base, 2), Z0, 0.1), feet(base, 5, 1.6, Z0, 0.8));
    const zb = Z0 + 0.8;
    const zt = zb + 3.4;
    out.push(solid(slab(base, zb, 3.4, 6, 0.6), { tone: "mid" }));
    const xr = base.x + base.w;
    for (const [y1, y2] of [[-12, -7], [-4, 1]]) out.push(line(faceX(xr, y1, y2, zb + 1, zb + 2.4), { tone: "lo" }));
    out.push(dot([xr, 6, zb + 1.7], "l-led is-ok", 1.1));

    // The lid stands at the back edge, its display facing the reader.
    const lid = { x: -30, y: -21.5, w: 60, d: 2.6, r: 1 };
    const zl2 = zt + 36;
    out.push(solid(slab(lid, zt, zl2 - zt, 4, 0.4), { tone: "mid" }));
    const yf = lid.y + lid.d;
    const [sx1, sx2, sz1, sz2] = [-26.5, 26.5, zt + 3.6, zl2 - 3.6];
    const screen = faceY(yf, sx1, sx2, sz1, sz2);
    out.push(`<path class="l-screen" d="${screen}"/>`, line(screen, { tone: "lo" }));
    out.push(`<path class="l-scrbar" d="${faceY(yf, sx1, sx2, sz2 - 3.2, sz2)}"/>`);
    [[0, 22], [3, 30], [3, 26], [6, 19], [3, 34], [0, 12], [3, 28]].forEach(([indent, len], i) => {
      const z = sz2 - 6.4 - i * 3.6;
      const x1 = sx1 + 3 + indent;
      out.push(`<path class="l-code${i === 3 ? " is-edit" : ""}" d="${segY(yf, x1, z, Math.min(x1 + len, sx2 - 3), z)}"/>`);
    });
    out.push(dot([0, yf, zl2 - 1.8], "l-cam", 0.9));

    // Hinges, the keyboard well, keys back to front, then the trackpad.
    for (const hx of [-22, 14]) out.push(solid(slab({ x: hx, y: -19, w: 8, d: 2.4, r: 0.8 }, zt, 1.6, 3), { tone: "mid", crease: "none" }));
    out.push(line(outline({ x: -26.2, y: -16.4, w: 52.4, d: 23.4, r: 1.6 }, zt), { tone: "lo" }));
    const keys = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 11; col++) keys.push({ x: -24.6 + col * 4.5, y: -15 + row * 4.4, w: 3.7, d: 3.6 });
    const last = -15 + 4 * 4.4;
    keys.push({ x: -24.6, y: last, w: 12.6, d: 3.6 }, { x: -11, y: last, w: 22, d: 3.6 }, { x: 12, y: last, w: 12.6, d: 3.6 });
    for (const key of byDepthPlans(keys)) out.push(solid(slab({ ...key, r: 0.7 }, zt, 0.7, 3, 0.25), { tone: "mid", crease: "none" }));
    out.push(line(outline({ x: -9, y: 9.5, w: 18, d: 8.5, r: 1.2 }, zt), { tone: "lo" }));
    return out.join("");
  }
};
