// clarify/src/lesson/objects/router.js
// A router: a flat box on rubber feet with a groove and vent slots on top, a row of status LEDs,
// a WAN port and four LAN ports on its front, a power jack, a power button and a reset hole on its
// right side, and two antennas on hinge blocks at the back. Centred on the world origin,
// standing on the pad.

const Z0 = 3; // the pad's top

export default {
  top: 37,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, cylinder, faceY, sideRing, halo, dot, outline, feet, inset } = pen;
    const out = [];
    const body = { x: -24, y: -14, w: 48, d: 28, r: 3 };
    out.push(halo(inset(body, 1), Z0, 0.1), feet(body, 4, 1.5, Z0, 0.8));
    const zb = Z0 + 0.8;
    const zt = zb + 7;
    out.push(solid(slab(body, zb, 7, 6, 0.6), { tone: "mid" }));

    // The top: a groove round it and a row of vent slots.
    out.push(line(outline(inset(body, 2.2), zt), { tone: "faint" }));
    for (let i = 0; i < 7; i++) out.push(line(outline({ x: -12.6 + i * 4, y: -8, w: 1.2, d: 9, r: 0.6 }, zt), { tone: "lo" }));

    // The front: status LEDs, then the WAN port and four LAN ports.
    const yf = body.y + body.d;
    [-20, -17, -14, -11, -8].forEach((x, i) => out.push(dot([x, yf, zb + 4.6], i === 4 ? "l-led" : "l-led is-ok", 0.8)));
    for (const x of [-4, 3, 7.6, 12.2, 16.8]) {
      const port = faceY(yf, x, x + 3.8, zb + 1.4, zb + 4.4);
      out.push(`<path class="l-cavity" d="${port}"/>`, line(port, { tone: "lo" }));
    }

    // The right side: a power jack, a power button and a reset hole.
    const xr = body.x + body.w;
    out.push(line(sideRing([xr, 6, zb + 3.5], 1.5, "x", 18), { tone: "lo" }));
    out.push(`<path class="l-cavity" d="${sideRing([xr, 6, zb + 3.5], 0.8, "x", 14)}"/>`);
    out.push(solid(slab({ x: xr, y: -4.4, w: 0.6, d: 3, r: 0.4 }, zb + 2.2, 2.6, 2), { tone: "mid", crease: "none" }));
    out.push(`<path class="l-cavity" d="${sideRing([xr, -9, zb + 3.5], 0.45, "x", 10)}"/>`);

    // Two antennas, the far one first: a hinge block, a knuckle, a rod and its thinner tip.
    for (const x of [-19, 19]) {
      const y = -10.4;
      out.push(solid(slab({ x: x - 2.2, y: y - 2.2, w: 4.4, d: 4.4, r: 0.8 }, zt, 2.2, 3, 0.3), { tone: "mid" }));
      out.push(solid(cylinder(x, y, 1.8, zt + 2.2, 1.6, 20), { tone: "mid", crease: "none" }));
      out.push(solid(cylinder(x, y, 1.3, zt + 3.8, 15, 18), { tone: "mid", crease: "none" }));
      out.push(solid(cylinder(x, y, 1, zt + 18.8, 7, 16, 0.3), { tone: "mid", crease: "none" }));
    }
    return out.join("");
  }
};
