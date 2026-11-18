// clarify/src/lesson/objects/phone.js
// A phone upright in a desk stand: a round weighted base on a rubber ring with a charging LED, a
// collar and a neck with a tilt knob, a ledge with side clamps and a front lip that hold the
// phone, side buttons, and a screen of app rows (one with news) under a speaker and a camera.
// Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top
const TAU = 2 * Math.PI;

export default {
  top: 49,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, cylinder, lying, arc, faceY, segY, halo, dot, ring } = pen;
    const out = [];

    // The base: a rubber ring under a round weighted disc, its charging LED facing the reader.
    out.push(halo({ x: -12, y: -12, w: 24, d: 24, r: 12 }, Z0, 0.1));
    out.push(solid(cylinder(0, 0, 12.4, Z0, 1.2, 32), { tone: "lo" }));
    const zb = Z0 + 1.2;
    const zt = zb + 2.6;
    out.push(solid(cylinder(0, 0, 13, zb, 2.6, 36, 0.4), { tone: "mid" }));
    out.push(line(ring(0, 0, 10.5, zt, 36), { tone: "faint" }));
    out.push(dot([9.2, 9.2, zb + 1.3], "l-led is-ok", 1));

    // The collar and neck rise behind the phone; a knob on the neck's front sets the tilt.
    out.push(solid(cylinder(0, -2, 3.6, zt, 1.2, 24), { tone: "mid", crease: "none" }));
    const zl = 13; // the ledge's underside
    out.push(solid(slab({ x: -2.4, y: -4, w: 4.8, d: 4, r: 1.2 }, zt + 1.2, zl - zt - 1.2, 3), { tone: "mid" }));
    out.push(solid(lying(arc(0, 10.1, 1.7, 0, TAU, 16).slice(0, -1), 0, 1.4), { tone: "mid", crease: "none" }));

    // The ledge, the left clamp (behind the phone's left edge), the phone, its buttons on the right
    // side, the right clamp, then the front lip over the phone's foot.
    const zp = zl + 1.6; // the phone stands on the ledge
    out.push(solid(slab({ x: -10.6, y: -3.4, w: 21.2, d: 5, r: 1 }, zl, 1.6, 4, 0.3), { tone: "mid" }));
    out.push(solid(slab({ x: -10.4, y: -3, w: 1.4, d: 3, r: 0.5 }, zp, 6, 3), { tone: "mid", crease: "none" }));
    const top = zp + 34;
    out.push(solid(slab({ x: -9, y: -2.6, w: 18, d: 2.6, r: 1.4 }, zp, top - zp, 4, 0.4), { tone: "mid" }));

    const yf = 0; // the phone's face
    const [sx1, sx2, sz1, sz2] = [-7.6, 7.6, zp + 3, top - 2.6];
    const screen = faceY(yf, sx1, sx2, sz1, sz2);
    out.push(`<path class="l-screen" d="${screen}"/>`, line(screen, { tone: "lo" }));
    out.push(`<path class="l-scrbar" d="${faceY(yf, sx1, sx2, sz2 - 2.2, sz2)}"/>`);
    // App rows: an icon and two lines of text each; the second row has news.
    [[8, 5], [6.6, 4.2], [7.6, 3.4], [5.8, 4.6]].forEach(([long, short], i) => {
      const zc = sz2 - 5 - i * 5.8;
      out.push(`<path class="l-scrbar" d="${faceY(yf, -6.4, -3.2, zc - 1.6, zc + 1.6)}"/>`);
      out.push(`<path class="l-code${i === 1 ? " is-edit" : ""}" d="${segY(yf, -1.8, zc + 0.7, -1.8 + long, zc + 0.7)}"/>`);
      out.push(`<path class="l-code" d="${segY(yf, -1.8, zc - 0.9, -1.8 + short, zc - 0.9)}"/>`);
    });
    out.push(`<path class="l-code" d="${segY(yf, -1.8, sz1 + 1.2, 1.8, sz1 + 1.2)}"/>`); // the home bar
    out.push(line(faceY(yf, -2, 2, top - 1.6, top - 1.1), { tone: "lo" })); // the speaker slot
    out.push(dot([3.6, yf, top - 1.35], "l-cam", 0.8));

    for (const [z1, z2] of [[top - 13, top - 6], [top - 20, top - 16]]) {
      out.push(solid(slab({ x: 9, y: -2, w: 0.6, d: 1.4, r: 0.3 }, z1, z2 - z1, 2), { tone: "mid", crease: "none" }));
    }
    out.push(solid(slab({ x: 9, y: -3, w: 1.4, d: 3, r: 0.5 }, zp, 6, 3), { tone: "mid", crease: "none" }));
    out.push(solid(slab({ x: -10.6, y: 0, w: 21.2, d: 1.6, r: 0.6 }, zp, 2.4, 3, 0.2), { tone: "mid" }));
    return out.join("");
  }
};
