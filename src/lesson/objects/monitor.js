// clarify/src/lesson/objects/monitor.js
// A desktop monitor: a base plate on rubber feet, a neck, the panel with a browser window on its
// screen (window controls, an address bar, a picture, text and an orange button), a camera, a
// power LED and side buttons, and its power cable leaving the base through a grommet and running
// across the pad to a power brick. Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top

/**
 * The cable's floor ring: a strip `half` either side of a line that runs +x from [x0, 0], bends
 * round a corner of radius `bend` and runs +y to `y1`.
 */
function cableRing(x0, xb, bend, y1, half) {
  const side = (radius, from, to) =>
    Array.from({ length: 7 }, (_, i) => {
      const a = from + ((to - from) * i) / 6;
      return [xb + radius * Math.sin(a), bend - radius * Math.cos(a)];
    });
  return [
    [x0, -half],
    ...side(bend + half, 0, Math.PI / 2),
    [xb + bend + half, y1],
    [xb + bend - half, y1],
    ...side(bend - half, Math.PI / 2, 0),
    [x0, half]
  ];
}

export default {
  top: 48,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, prism, faceY, segY, halo, dot, outline, feet, inset } = pen;
    const out = [];

    // The base plate on rubber feet, with a groove round its top.
    const base = { x: -13, y: -10, w: 26, d: 18, r: 4 };
    out.push(halo(inset(base, -2), Z0, 0.1), feet(base, 3.5, 1.3, Z0, 0.7));
    const zb = Z0 + 0.7;
    const zt = zb + 1.8;
    out.push(solid(slab(base, zb, 1.8, 6, 0.5), { tone: "mid" }));
    out.push(line(outline(inset(base, 2), zt), { tone: "faint" }));

    // The neck rises from the base's back to the panel's back.
    out.push(solid(slab({ x: -3, y: -7, w: 6, d: 3.4, r: 1.2 }, zt, 16, 3, 0.3), { tone: "mid" }));

    // The panel, its screen showing a browser window, and its camera.
    const panel = { x: -27, y: -3.6, w: 54, d: 2.4, r: 1 };
    const [zp1, zp2] = [15, 48];
    out.push(solid(slab(panel, zp1, zp2 - zp1, 4, 0.4), { tone: "mid" }));
    const yf = panel.y + panel.d;
    const [sx1, sx2, sz1, sz2] = [-25.4, 25.4, zp1 + 3.2, zp2 - 1.6];
    const screen = faceY(yf, sx1, sx2, sz1, sz2);
    out.push(`<path class="l-screen" d="${screen}"/>`, line(screen, { tone: "lo" }));
    const zbar = sz2 - 3;
    out.push(`<path class="l-scrbar" d="${faceY(yf, sx1, sx2, zbar, sz2)}"/>`);
    out.push(dot([sx1 + 1.8, yf, zbar + 1.5], "l-cam", 0.7), dot([sx1 + 3.6, yf, zbar + 1.5], "l-cam", 0.7), dot([sx1 + 5.4, yf, zbar + 1.5], "l-cam", 0.7));
    const address = faceY(yf, -13, 13, zbar + 0.6, zbar + 2.4);
    out.push(`<path class="l-plate" d="${address}"/>`, line(address, { tone: "lo" }));
    out.push(`<path class="l-code" d="${segY(yf, -11, zbar + 1.5, -1, zbar + 1.5)}"/>`);
    // The page: a heading, a picture, text beside it, a button, and a row of three cards.
    out.push(`<path class="l-code" d="${segY(yf, -22, zbar - 3, -4, zbar - 3)}"/>`);
    const picture = faceY(yf, -22, -3, zbar - 15.5, zbar - 5.5);
    out.push(`<path class="l-scrbar" d="${picture}"/>`, line(picture, { tone: "lo" }));
    [18, 14, 17, 10].forEach((len, i) => {
      const z = zbar - 6.2 - i * 2.2;
      out.push(`<path class="l-code" d="${segY(yf, 0, z, len, z)}"/>`);
    });
    out.push(`<path class="l-sheetbar" d="${faceY(yf, 0, 8, zbar - 15.5, zbar - 13)}"/>`);
    for (const x of [-22, -6.6, 8.8]) {
      const card = faceY(yf, x, x + 13.2, sz1 + 1.2, sz1 + 6);
      out.push(line(card, { tone: "lo" }));
      out.push(`<path class="l-code" d="${segY(yf, x + 1.6, sz1 + 3.6, x + 9, sz1 + 3.6)}"/>`);
    }
    out.push(dot([0, yf, zp2 - 0.8], "l-cam", 0.6));
    out.push(dot([22.5, yf, zp1 + 1.6], "l-led is-ok", 0.8));

    // Three buttons down the panel's right side.
    for (const z of [zp1 + 4, zp1 + 7, zp1 + 10]) {
      out.push(solid(slab({ x: 27, y: -3, w: 0.6, d: 1.4, r: 0.3 }, z, 1.8, 2), { tone: "mid", crease: "none" }));
    }

    // In front of it all, the cable leaves the base's right side through a grommet, bends towards
    // the reader and ends in the power brick's back (the brick is drawn after it, over its end).
    out.push(solid(prism(cableRing(13.6, 18, 3, 14, 0.6), Z0, 1.1, false), { tone: "mid" }));
    out.push(solid(slab({ x: 13, y: -1.1, w: 1.4, d: 2.2, r: 0.5 }, Z0 + 0.2, 1.6, 3), { tone: "mid", crease: "none" }));
    const brick = { x: 15, y: 14, w: 12, d: 7, r: 1.4 };
    out.push(solid(slab(brick, Z0, 3.6, 4, 0.4), { tone: "mid" }));
    out.push(line(outline(inset(brick, 1.4), Z0 + 3.6), { tone: "faint" }));
    out.push(dot([23.5, brick.y + brick.d, Z0 + 1.8], "l-led is-ok", 0.9));
    return out.join("");
  }
};
