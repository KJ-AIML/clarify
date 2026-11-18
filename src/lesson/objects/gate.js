// clarify/src/lesson/objects/gate.js
// A turnstile barrier: a pedestal bolted down on a plinth, with a lock panel on top (a display,
// two LEDs and a keypad) and a key lock and service door on its front; on its right side a hub
// clamps a striped arm across the lane to a post on the far side, which has its own plinth and an
// LED. The lane runs along y. Centred on the world origin, standing on the pad.

const Z0 = 3; // the pad's top
const BOLT = 1.3; // an anchor bolt's washer radius; each stands clear of the body on its plate and of the plate's edge

export default {
  top: 36,
  /** @param {import("../pen.js").Pen} pen */
  draw(pen) {
    const { solid, line, slab, cylinder, faceY, sideRing, halo, dot, dots, outline, bolts, byDepthPlans, inset } = pen;
    const out = [];

    // The pedestal: a plinth bolted down in front of it and beside the lane (the fourth bolt is
    // hidden behind it), the body, the cap.
    const plinth = { x: -27, y: -12, w: 16.2, d: 28.2, r: 1.2 };
    out.push(halo(inset(plinth, 1), Z0, 0.1));
    out.push(solid(slab(plinth, Z0, 1.4, 4, 0.3), { tone: "lo" }));
    out.push(bolts([[-23, 14.6], [-12.4, 14.6], [-12.4, -10.4]], Z0 + 1.4, 0.4, BOLT));
    const zb = Z0 + 1.4;
    const zt = zb + 28;
    out.push(solid(slab({ x: -26, y: -11, w: 12, d: 24, r: 1.5 }, zb, 28, 4, 0.5), { tone: "mid" }));
    const cap = { x: -26.8, y: -11.8, w: 13.6, d: 25.6, r: 2 };
    out.push(solid(slab(cap, zt, 1.6, 4, 0.4), { tone: "mid" }));

    // The lock panel on the cap: a display, two LEDs, then the keypad, back to front.
    const zc = zt + 1.6;
    out.push(solid(slab({ x: -25, y: -8, w: 10, d: 16, r: 1 }, zc, 0.8, 4, 0.2), { tone: "mid" }));
    const zk = zc + 0.8;
    const display = outline({ x: -23.6, y: -6.8, w: 7.2, d: 3.2, r: 0.4 }, zk);
    out.push(`<path class="l-screen" d="${display}"/>`, line(display, { tone: "lo" }));
    out.push(dot([-23, -2.6, zk], "l-led is-ok", 0.8), dot([-21, -2.6, zk], "l-led", 0.8));
    const keys = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) keys.push({ x: -23.8 + col * 2.8, y: -1.6 + row * 2.4, w: 2.2, d: 2, r: 0.5 });
    for (const key of byDepthPlans(keys)) out.push(solid(slab(key, zk, 0.6, 3, 0.15), { tone: "mid", crease: "none" }));

    // The front: a service door and a key lock.
    const yf = 13;
    out.push(line(faceY(yf, -24.4, -15.6, zb + 2, zb + 16.6), { tone: "lo" }));
    out.push(solid(slab({ x: -22.6, y: yf, w: 5.2, d: 0.6, r: 0.4 }, zb + 18.6, 6, 3), { tone: "mid", crease: "none" }));
    const yl = yf + 0.6;
    out.push(`<path class="l-cavity" d="${sideRing([-20, yl, zb + 22.6], 0.8, "y", 14)}"/>`);
    out.push(`<path class="l-cavity" d="${faceY(yl, -20.3, -19.7, zb + 20.4, zb + 22.4)}"/>`);

    // The hub on the pedestal's right side: a mounting plate, then the lower collar, the arm (with
    // its warning bands), the upper collar and the shaft's cap.
    const xh = -10.2;
    out.push(solid(slab({ x: -14, y: -3.4, w: 0.8, d: 6.8, r: 0.3 }, zb + 11.6, 14, 2), { tone: "mid", crease: "none" }));
    out.push(dots([[-13.2, -2.4, zb + 12.6], [-13.2, 2.4, zb + 12.6], [-13.2, -2.4, zb + 24.6], [-13.2, 2.4, zb + 24.6]], { size: 0.4 }));
    const [za1, za2] = [zb + 16.6, zb + 19];
    out.push(solid(cylinder(xh, 0, 3, zb + 13.6, za1 - zb - 13.6, 24, 0.3), { tone: "mid" }));
    out.push(solid(slab({ x: xh, y: -1.2, w: 18 - xh, d: 2.4, r: 1.2 }, za1, za2 - za1, 3, 0.3), { tone: "mid" }));
    for (const x of [-3.4, 3.8, 11]) out.push(`<path class="l-sheetbar" d="${faceY(1.2, x, x + 3.6, za1 + 0.2, za2 - 0.2)}"/>`);
    out.push(solid(cylinder(xh, 0, 3, za2, 3, 24, 0.3), { tone: "mid" }));
    out.push(solid(cylinder(xh, 0, 1.4, za2 + 3, 1.2, 16), { tone: "mid", crease: "none" }));

    // The post on the far side of the lane takes the arm's end; its foot plate is bolted down at
    // three corners in view (the fourth is hidden behind the post).
    const foot = { x: 15, y: -5.6, w: 10, d: 11.2, r: 1 };
    out.push(halo(inset(foot, 0.5), Z0, 0.1));
    out.push(solid(slab(foot, Z0, 1.2, 3, 0.2), { tone: "lo" }));
    out.push(bolts([[16.6, 4], [23.4, 4], [23.4, -4]], Z0 + 1.2, 0.4, BOLT));
    out.push(solid(slab({ x: 18, y: -2.6, w: 4, d: 5.2, r: 1 }, Z0 + 1.2, 23.8, 3, 0.3), { tone: "mid" }));
    out.push(solid(slab({ x: 17.6, y: -3, w: 4.8, d: 6, r: 1.4 }, Z0 + 25, 1.4, 3, 0.3), { tone: "mid" }));
    out.push(dot([20, 2.6, Z0 + 21], "l-led is-ok", 0.9));
    return out.join("");
  }
};
