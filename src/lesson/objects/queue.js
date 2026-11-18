// clarify/src/lesson/objects/queue.js
// A belt conveyor: legs with a brace, two side rails with a bolt at every roller, the belt as one
// loop round a drum at each end (its open side showing the drums' and rollers' ends on their
// axles), cleats on the belt, and three parcels waiting in line on it (the middle one with an
// address label). The belt runs along x. Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top
const ZA = 14; // the drums' and rollers' axle height, level with the rail tops
const LOOP = 2.8; // the belt loop's end radius: a drum with the belt round it

export default {
  top: 28,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, lying, arc, sideRing, halo, dot, dots, lineOnTop, pathAt, plateOnY } = pen;
    const out = [];
    const PI = Math.PI;
    const yf = 10; // the belt's front edge; the rails stand outside it
    const leg = (x, y) => solid(slab({ x, y, w: 2.4, d: 1.6, r: 0.4 }, Z0, ZA - 2 - Z0, 3), { tone: "mid", crease: "none" });
    const rail = (y) => solid(slab({ x: -25, y, w: 50, d: 1.6, r: 0.6 }, ZA - 2, 2, 3), { tone: "mid" });

    // Behind the belt: the back legs and the back rail.
    out.push(halo({ x: -26, y: -12, w: 52, d: 24, r: 2 }, Z0, 0.1));
    out.push(leg(-22, -yf - 1.6), leg(19.6, -yf - 1.6), rail(-yf - 1.6));

    // The belt: one loop round both drums. Inside its front edge it is dark; the drums' and the
    // rollers' ends stand there on their axles (the rail in front hides the rollers' lower halves).
    const loop = (r) => [...arc(25, ZA, r, -PI / 2, PI / 2, 10), ...arc(-25, ZA, r, PI / 2, 1.5 * PI, 10)];
    out.push(solid(lying(loop(LOOP), -yf, yf), { tone: "mid" }));
    out.push(`<path class="l-cavity" d="${pathAt(loop(LOOP - 0.8).map(([x, z]) => [x, yf, z]), true)}"/>`);
    const end = (x, r) => solid(lying(arc(x, ZA, r, 0, 2 * PI, 18).slice(0, -1), yf - 0.2, yf), { tone: "mid", crease: "none" });
    for (const x of [-25, 25]) out.push(end(x, 1.8), line(sideRing([x, yf, ZA], 0.8, "y", 14), { tone: "lo" }), dot([x, yf, ZA], "l-cam", 0.5));
    for (let x = -18; x <= 18; x += 6) out.push(end(x, 1.7));
    const zt = ZA + LOOP; // the belt's top
    for (let x = -21; x <= 21; x += 6) out.push(line(lineOnTop([x, -yf], [x, yf], zt), { tone: "lo" }));

    // In front of it: the front legs and their brace, then the front rail with a bolt where each
    // roller's axle ends.
    out.push(leg(-22, yf), solid(slab({ x: -19.6, y: yf + 0.2, w: 39.2, d: 1.2, r: 0.3 }, Z0 + 3, 1.4, 2), { tone: "mid", crease: "none" }), leg(19.6, yf));
    out.push(rail(yf));
    out.push(dots([-18, -12, -6, 0, 6, 12, 18].map((x) => [x, yf + 1.6, ZA - 1]), { size: 0.5, tone: "mid" }));

    // Three parcels in line, back to front, each taped shut; the middle one has a label.
    const parcel = (plan, height, along) => {
      const z2 = zt + height;
      const box = `<g class="l-paper">${solid(slab({ ...plan, r: 0.5 }, zt, height, 2), { tone: "mid" })}</g>`;
      const tape = [];
      for (const d of [-1.1, 1.1]) {
        if (along === "y") {
          const x = plan.x + plan.w / 2 + d;
          tape.push(pathAt([[x, plan.y, z2], [x, plan.y + plan.d, z2], [x, plan.y + plan.d, zt]]));
        } else {
          const y = plan.y + plan.d / 2 + d;
          tape.push(pathAt([[plan.x, y, z2], [plan.x + plan.w, y, z2], [plan.x + plan.w, y, zt]]));
        }
      }
      return box + line(tape.join(""), { tone: "lo" });
    };
    out.push(parcel({ x: -20, y: -6.5, w: 10, d: 12 }, 8, "y"));
    out.push(parcel({ x: -4.5, y: -5.5, w: 10, d: 10 }, 11, "x"));
    out.push(plateOnY(4.5, -3.2, 3.8, zt + 3, zt + 8, 2));
    out.push(parcel({ x: 10, y: -6, w: 10, d: 11 }, 7, "y"));
    return out.join("");
  }
};
