// clarify/src/lesson/objects/mailbox.js
// A post-mounted mailbox: a wooden post on a bolted flange, a board on the post, and the box (a
// tunnel with two ribs) whose front door hangs open on two hinges, showing a letter standing
// inside and another lying on the door; its flag is up on the right side. The box runs along y,
// its door facing the reader. Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top
const W = 7; // half the box's width, and its roof's radius

export default {
  top: 44,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, prism, lying, arc, faceX, segX, segY, halo, lineOnTop, outline, pathAt, bolts } = pen;
    const out = [];
    const { azimuth = 45, elevation = 30 } = pen.P;
    const rad = Math.PI / 180;
    // Where the roof's curve turns away from the reader: ribs end there, on its outline.
    const limb = Math.PI - Math.atan2(Math.cos(azimuth * rad) * Math.cos(elevation * rad), Math.sin(elevation * rad));

    // The flange, bolted down at the three corners in view (the fourth is hidden behind the post),
    // the post (with its grain running its full height) and the board on top. Each bolt's washer
    // stands clear of the post and of the flange's edge.
    const flange = { x: -5.5, y: -5.5, w: 11, d: 11, r: 1.2 };
    out.push(halo(flange, Z0, 0.1), solid(slab(flange, Z0, 1.2, 3, 0.3), { tone: "lo" }), bolts([[-3.9, 3.9], [3.9, 3.9], [3.9, -3.9]], Z0 + 1.2, 0.4, 1.3));
    const [zp, zboard] = [Z0 + 1.2, 23];
    out.push(solid(slab({ x: -2.6, y: -2.6, w: 5.2, d: 5.2, r: 0.5 }, zp, zboard - zp, 2), { tone: "mid" }));
    out.push(line(segY(2.6, -0.8, zp, -0.8, zboard) + segY(2.6, 1.1, zp, 1.1, zboard) + segX(2.6, -1, zp, -1, zboard) + segX(2.6, 0.9, zp, 0.9, zboard), { tone: "faint" }));
    out.push(solid(slab({ x: -5, y: -12, w: 10, d: 23, r: 0.8 }, zboard, 1.6, 3, 0.3), { tone: "mid" }));

    // The box: straight sides under a round roof, from the back (y0) to the open front (y1).
    const [y0, y1] = [-13, 12];
    const zb = zboard + 1.6;
    const zr = zb + W; // where the roof starts to curve
    out.push(solid(lying([[-W, zb], [W, zb], ...arc(0, zr, W, 0, Math.PI, 14)], y0, y1), { tone: "mid" }));
    for (const y of [-3, 5]) {
      const rib = [[W, y, zb], ...arc(0, zr, W, 0, limb, 10).map(([x, z]) => [x, y, z])];
      out.push(line(pathAt(rib), { tone: "faint" }));
    }

    // Inside the open front: the dark box and a letter standing in it (its flap towards us).
    const t = 0.7; // the box's wall
    const mouth = [[-W + t, zb + t], [W - t, zb + t], ...arc(0, zr, W - t, 0, Math.PI, 14)];
    out.push(`<path class="l-cavity" d="${pathAt(mouth.map(([x, z]) => [x, y1, z]), true)}"/>`);
    const standing = { x: -4, y: y1 - 2.6, w: 8, d: 0.6, r: 0.2 };
    const [zl1, zl2] = [zb + t, zb + t + 7];
    out.push(`<g class="l-paper">${solid(slab(standing, zl1, zl2 - zl1, 2), { tone: "mid", crease: "none" })}</g>`);
    const ys = standing.y + standing.d;
    out.push(line(pathAt([[-4, ys, zl2], [0, ys, zl2 - 3.2], [4, ys, zl2]]), { tone: "lo" }));
    // The catch at the top of the mouth, which the door's handle hooks under when it is shut.
    out.push(solid(slab({ x: -1, y: y1, w: 2, d: 0.6, r: 0.25 }, zr + W - 1.8, 1.2, 2), { tone: "mid", crease: "none" }));

    // The door, open flat on its two hinges, with a letter lying on it (stamp and address up).
    const door = [[-W, y1], [W, y1], ...arc(0, y1 + W, W, 0, Math.PI, 14)];
    out.push(solid(prism(door, zb - 0.8, 0.8), { tone: "mid" }));
    out.push(line(pathAt([[-W + 1.2, y1 + 1.2], [W - 1.2, y1 + 1.2], ...arc(0, y1 + W, W - 1.2, 0, Math.PI, 14)].map(([x, y]) => [x, y, zb]), true), { tone: "faint" }));
    for (const x of [-6.4, 4.4]) out.push(solid(slab({ x, y: y1 - 0.6, w: 2, d: 1.2, r: 0.5 }, zb - 1, 1.6, 3), { tone: "mid", crease: "none" }));
    const lyingLetter = { x: -4.6, y: y1 + 1.6, w: 9.2, d: 6.4, r: 0.2 };
    const zl = zb + 0.4;
    out.push(`<g class="l-paper">${solid(slab(lyingLetter, zb, 0.4, 2), { tone: "mid", crease: "none" })}</g>`);
    out.push(`<path class="l-sheetbar" d="${outline({ x: 1.6, y: y1 + 2.4, w: 2.2, d: 2, r: 0 }, zl)}"/>`);
    for (const [y, x2] of [[y1 + 5.2, 1.2], [y1 + 6.6, 0.2]]) out.push(line(lineOnTop([-3, y], [x2, y], zl), { tone: "lo", free: "both" }));

    // The flag, up: a bracket on the right side, the arm, and the flag (painted) at its top.
    out.push(solid(slab({ x: W, y: -8.4, w: 0.6, d: 2.8, r: 0.4 }, zb + 2.4, 2.8, 2), { tone: "mid", crease: "none" }));
    out.push(solid(slab({ x: W + 0.6, y: -7.6, w: 0.6, d: 1.2, r: 0.2 }, zb + 3, 15.4, 2), { tone: "mid", crease: "none" }));
    out.push(solid(slab({ x: W + 0.6, y: -13, w: 0.6, d: 5.4, r: 0.3 }, zb + 14.4, 4, 2), { tone: "mid", crease: "none" }));
    out.push(`<path class="l-sheetbar" d="${faceX(W + 1.2, -12.6, -8, zb + 14.8, zb + 18)}"/>`);
    return out.join("");
  }
};
