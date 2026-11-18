// clarify/src/lesson/objects/database.js
// A database: three drums stacked on a plinth, joined by bolted bands, each drum with a small
// status module of LEDs facing the reader, under a lid with a groove, bolts, a cap and a knob.
// Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top
const R = 19; // a drum's radius
const BAND = 20.2; // a band's (and the lid's) radius

export default {
  top: 50,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, cylinder, halo, dot, dots, ring } = pen;
    const out = [];
    const deg = Math.PI / 180;
    const { azimuth = 45 } = pen.P;
    // Which way the side of a drum faces the reader, so bolts are put only on the half in view.
    const facing = (angle) => Math.cos(angle - azimuth * deg) > 0.05;

    /** A band round the stack: a ring of bolts on the half in view. */
    const band = (z, height) => {
      const bolts = [];
      for (let i = 0; i < 15; i++) {
        const a = (i * 24 + 6) * deg;
        if (facing(a)) bolts.push([BAND * Math.cos(a), BAND * Math.sin(a), z + height / 2]);
      }
      return solid(cylinder(0, 0, BAND, z, height, 40, 0.3), { tone: "mid" }) + dots(bolts, { size: 0.45, tone: "mid" });
    };
    /** A drum, with a status module on its front: LEDs in a row. */
    const drum = (z, height, lit) => {
      const zm = z + height / 2;
      const module = { x: -3.6, y: R - 0.4, w: 7.2, d: 1.2, r: 0.4 };
      const yf = module.y + module.d;
      return (
        solid(cylinder(0, 0, R, z, height, 40, 0.3), { tone: "mid" }) +
        solid(slab(module, zm - 1.6, 3.2, 3), { tone: "mid", crease: "none" }) +
        [-2, 0, 2].map((x, i) => dot([x, yf, zm], i < lit ? "l-led is-ok" : "l-led", 0.8)).join("")
      );
    };

    out.push(halo({ x: -21, y: -21, w: 42, d: 42, r: 21 }, Z0, 0.1));
    out.push(solid(cylinder(0, 0, 21.5, Z0, 2.4, 40, 0.4), { tone: "lo" }));
    let z = Z0 + 2.4;
    out.push(band(z, 1.6));
    z += 1.6;
    [3, 1, 2].forEach((lit, i) => {
      out.push(drum(z, 11, lit));
      z += 11;
      if (i < 2) {
        out.push(band(z, 2.2));
        z += 2.2;
      }
    });

    // The lid: a groove, eight bolts round its edge, a cap and a knob.
    out.push(solid(cylinder(0, 0, BAND, z, 2.2, 40, 0.5), { tone: "mid" }));
    z += 2.2;
    out.push(line(ring(0, 0, 15.5, z, 40), { tone: "faint" }));
    out.push(dots(Array.from({ length: 8 }, (_, i) => [17.8 * Math.cos((i * 45 + 22.5) * deg), 17.8 * Math.sin((i * 45 + 22.5) * deg), z]), { size: 0.5, tone: "mid" }));
    out.push(solid(cylinder(0, 0, 6, z, 1.6, 28, 0.3), { tone: "mid" }));
    out.push(line(ring(0, 0, 4.2, z + 1.6, 24), { tone: "faint" }));
    out.push(solid(cylinder(0, 0, 2.4, z + 1.6, 1.4, 20), { tone: "mid", crease: "none" }));
    return out.join("");
  }
};
