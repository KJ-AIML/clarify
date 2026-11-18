// clarify/src/lesson/objects/cloud.js
// The cloud as a small datacenter: a building on a plinth with a door (window, handle, a canopy,
// a step and a lamp), a name plate and louvred vents on its front, more louvres and a panel joint on
// its right side, and on its roof two fan units, two mushroom vents and a dish on a mast.
// Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top

export default {
  top: 47,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, cylinder, lying, arc, faceX, faceY, segX, segY, sideRing, halo, dot, outline, ring, lineOnTop, plateOnY, inset } = pen;
    const out = [];
    /** A louvred vent on a face: its frame and slats that run from one side of it to the other. */
    const louvre = (frame, slat, count) => {
      let d = frame;
      for (let i = 1; i <= count; i++) d += slat(i / (count + 1));
      return line(d, { tone: "lo" });
    };

    const plinth = { x: -26, y: -22, w: 52, d: 44, r: 1 };
    out.push(halo(inset(plinth, 1), Z0, 0.1), solid(slab(plinth, Z0, 1.4, 4, 0.3), { tone: "lo" }));
    const zb = Z0 + 1.4;
    const zt = 30;
    const body = { x: -24, y: -20, w: 48, d: 40, r: 0.8 };
    out.push(solid(slab(body, zb, zt - zb, 4, 0.4), { tone: "mid" }));

    // The front: a name plate, the door with its window and handle, a lamp, louvres.
    const yf = body.y + body.d;
    out.push(plateOnY(yf, -20, -11, 15, 20, 2));
    out.push(solid(slab({ x: -6, y: yf, w: 9, d: 0.5, r: 0.2 }, zb, 19 - zb, 2), { tone: "mid" }));
    const pane = faceY(yf + 0.5, -4.2, 1.2, 13, 17);
    out.push(`<path class="l-screen" d="${pane}"/>`, line(pane, { tone: "lo" }));
    out.push(solid(slab({ x: 0.4, y: yf + 0.5, w: 1.8, d: 0.8, r: 0.3 }, 10.4, 0.8, 2), { tone: "mid", crease: "none" }));
    out.push(dot([-1.5, yf, 22.4], "l-led is-ok", 1));
    out.push(louvre(faceY(yf, 7, 19, 8, 18), (t) => segY(yf, 7, 8 + 10 * t, 19, 8 + 10 * t), 5));

    // The right side: two louvres either side of a panel joint that runs floor to roof.
    const xr = body.x + body.w;
    for (const [y1, y2] of [[-15, -3], [3, 15]]) out.push(louvre(faceX(xr, y1, y2, 8, 18), (t) => segX(xr, y1, 8 + 10 * t, y2, 8 + 10 * t), 5));
    out.push(line(segX(xr, 0, zb, 0, zt), { tone: "lo" }));

    // The canopy over the door and the step under it.
    out.push(solid(slab({ x: -8, y: yf, w: 13, d: 3.2, r: 0.4 }, 19.6, 1, 3), { tone: "mid" }));
    out.push(solid(slab({ x: -8, y: plinth.y + plinth.d, w: 13, d: 2.6, r: 0.4 }, Z0, 1.4, 3), { tone: "mid" }));

    // The roof: a cornice with a parapet line, then its plant, back to front.
    const roof = { x: -25, y: -21, w: 50, d: 42, r: 1 };
    out.push(solid(slab(roof, zt, 1.6, 4, 0.4), { tone: "mid" }));
    const zr = zt + 1.6;
    out.push(line(outline(inset(roof, 2), zr), { tone: "faint" }));
    const fanUnit = (x, y) => {
      const unit = { x, y, w: 13, d: 11, r: 0.8 };
      const [cx, cy, z2] = [x + 6.5, y + 5.5, zr + 5];
      const fan = ring(cx, cy, 3.8, z2, 32);
      const blades = lineOnTop([cx - 3.8, cy], [cx + 3.8, cy], z2) + lineOnTop([cx, cy - 3.8], [cx, cy + 3.8], z2);
      const yu = y + 11;
      return (
        solid(slab(unit, zr, 5, 3, 0.3), { tone: "mid" }) +
        line(fan, { tone: "lo" }) + line(blades, { tone: "faint" }) + dot([cx, cy, z2], "l-cam", 0.7) +
        louvre(faceY(yu, x + 2, x + 11, zr + 1, zr + 4), (t) => segY(yu, x + 2, zr + 1 + 3 * t, x + 11, zr + 1 + 3 * t), 2)
      );
    };
    const vent = (x, y) =>
      solid(cylinder(x, y, 1.3, zr, 3.4, 16), { tone: "mid", crease: "none" }) + solid(cylinder(x, y, 2.4, zr + 3.4, 1, 20, 0.2), { tone: "mid" });
    out.push(fanUnit(-19, -16), vent(-15, 8), fanUnit(-3, -16), vent(-6, 12));

    // The dish: a plate, a mast, the dish facing the reader, its feed arm and feed.
    out.push(solid(slab({ x: 10, y: 4.6, w: 6, d: 6, r: 0.6 }, zr, 0.8, 3), { tone: "mid" }));
    out.push(solid(slab({ x: 12.2, y: 7.2, w: 1.6, d: 1.6, r: 0.4 }, zr + 0.8, 7, 2), { tone: "mid", crease: "none" }));
    const [dx, dz] = [13, zr + 9.6];
    out.push(solid(lying(arc(dx, dz, 5.5, 0, 2 * Math.PI, 28).slice(0, -1), 8.8, 10), { tone: "mid" }));
    out.push(line(sideRing([dx, 10, dz], 4, "y", 28), { tone: "faint" }));
    out.push(solid(slab({ x: dx - 0.4, y: 10, w: 0.8, d: 3.6, r: 0.3 }, dz - 0.4, 0.8, 2), { tone: "mid", crease: "none" }));
    out.push(solid(slab({ x: dx - 1, y: 13.6, w: 2, d: 1.4, r: 0.4 }, dz - 1, 2, 2), { tone: "mid", crease: "none" }));
    return out.join("");
  }
};
