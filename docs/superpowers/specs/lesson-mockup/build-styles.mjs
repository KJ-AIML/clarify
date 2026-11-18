// Mockup for the clarify "lesson" design: the Git lesson's four stations drawn with the
// anatomy kit (MIT, github.com/wheresryan22/anatomy), one geometry, three skins.
// usage: node build-styles.mjs <path/to/iso-kit.mjs> <path/to/iso.css> <out.html>
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [kitPath, cssPath, outPath] = process.argv.slice(2);
const k = await import(pathToFileURL(kitPath).href);
const ISO_CSS = readFileSync(cssPath, "utf8");

const W = 1120;
const H = 620;

// Station centres on one bench (world units ~ px of the real thing; x and y on the floor, z up).
const L = [0, 0]; // your laptop (working directory)
const T = [120, 0]; // staging tray
const R = [120, -120]; // local repo (card-file cabinet)
const S = [240, -120]; // origin (server)
const M = [240, 0]; // teammate
const BENCH = { x: -48, y: -168, w: 336, d: 222, r: 10 };
const BENCH_H = 10;
const FOOT_H = 6;
const PAD = { x: -36, y: -36, w: 72, d: 72, r: 5 };
const PAD_H = 3;

const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [S[0], S[1] - 24, 72], [S[0], S[1] + 24, 72], [L[0], L[1] - 20, 46], [M[0], M[1] - 20, 46], [R[0], R[1], 54]],
  W,
  H,
  { pad: 26, azimuth: 45 },
);

const at = (p) => k.iso(p, P);
const solid = (paths, o) => k.solidSvg(paths, o);
const line = (d, o) => k.lineSvg(d, o);
const slab = (plan, z, h, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const off = ([cx, cy], plan) => ({ ...plan, x: plan.x + cx, y: plan.y + cy });
const pathAt = (pts, closed = false) => k.pathOf(pts.map(at), closed);
const faceY = (y, x1, x2, z1, z2) => pathAt([[x1, y, z1], [x2, y, z1], [x2, y, z2], [x1, y, z2]], true);
const faceX = (x, y1, y2, z1, z2) => pathAt([[x, y1, z1], [x, y2, z1], [x, y2, z2], [x, y1, z2]], true);
const segY = (y, x1, z1, x2, z2) => pathAt([[x1, y, z1], [x2, y, z2]]);
const segX = (x, y1, z1, y2, z2) => pathAt([[x, y1, z1], [x, y2, z2]]);
const halo = (plan, z, h) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`;
const depth = ([x, y]) => k.depthOf([x, y, 0], P);
const byDepth = (pts) => [...pts].sort((a, b) => depth(a) - depth(b));
const byDepthPlans = (plans) => [...plans].sort((a, b) => depth([a.x + a.w / 2, a.y + a.d / 2]) - depth([b.x + b.w / 2, b.y + b.d / 2]));
const dot = ([x, y, z], cls, r = 1.3) => {
  const [sx, sy] = at([x, y, z]);
  return `<circle class="${cls}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${r}"/>`;
};
const screws = (plan, inset, z, size = 0.5) => {
  const c = k.corners(plan, inset);
  return line(c.map(([x, y]) => k.ring(x, y, 1.9, z, P, 14)).join(""), { tone: "lo" }) + k.dotsSvg(c.map(([x, y]) => at([x, y, z])), { size, tone: "mid" });
};
const plateOnY = (y, x1, x2, z1, z2, rules = 1) => {
  let s = `<path class="m-plate" d="${faceY(y, x1, x2, z1, z2)}"/>` + line(faceY(y, x1, x2, z1, z2), { tone: "lo" });
  for (let i = 0; i < rules; i++) {
    const z = z2 - (z2 - z1) * ((i + 1) / (rules + 1));
    s += line(segY(y, x1 + 2, z, x2 - 2 - i * 3, z), { tone: "faint", free: "both" });
  }
  return s;
};

function bench() {
  const out = [halo(k.insetPlan(BENCH, -2), -BENCH_H - FOOT_H, BENCH_H)];
  for (const [x, y] of byDepth(k.corners(BENCH, 18))) {
    out.push(solid(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(solid(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(`<g class="m-bench">${solid(slab(BENCH, -BENCH_H, BENCH_H, 8, 1.6), { tone: "mid" })}</g>`);
  out.push(line(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: "lo" }));
  out.push(screws(BENCH, 11, 0));
  const strip = { x: BENCH.x + 14, y: BENCH.y + BENCH.d - 13, w: 196, d: 6, r: 1 };
  out.push(solid(slab(strip, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(line(t.minor, { tone: "lo" }), line(t.major, { tone: "mid" }));
  const plate = { x: BENCH.x + 10, y: BENCH.y + 10, w: 46, d: 14, r: 1.5 };
  out.push(solid(slab(plate, 0, 0.8, 3), { tone: "mid", crease: "none" }));
  [38, 30, 22].forEach((len, i) => out.push(line(k.lineOnTop([plate.x + 5, plate.y + 4 + i * 4], [plate.x + 5 + len, plate.y + 4 + i * 4], 0.8, P), { tone: "faint", free: "both" })));
  out.push(k.dotsSvg(k.corners(plate, 2.5).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  return out.join("");
}

function tracks() {
  const out = [];
  const rails = [
    { x: 36, y: -2.5, w: 48, d: 5, r: 1 },
    { x: 117.5, y: -84, w: 5, d: 48, r: 1 },
    { x: 156, y: -122.5, w: 48, d: 5, r: 1 },
    { x: 237.5, y: -84, w: 5, d: 48, r: 1 },
  ];
  for (const r of rails) {
    out.push(line(k.planOutline(k.insetPlan(r, -1.8), 0, P), { tone: "faint" }));
    out.push(solid(slab(r, 0, 1.2, 3, 0.3), { tone: "mid" }));
  }
  const route = [[[36, 0], [84, 0]], [[120, -36], [120, -84]], [[156, -120], [204, -120]], [[240, -84], [240, -36]]];
  for (const [a, b] of route) out.push(`<path class="m-route" d="${pathAt([[a[0], a[1], 1.3], [b[0], b[1], 1.3]])}"/>`);
  return out.join("");
}

function pad(c, label) {
  const plan = off(c, PAD);
  const out = [solid(slab(plan, 0, PAD_H, 6, 0.6), { tone: "mid" })];
  out.push(line(k.planOutline(k.insetPlan(plan, 3.5), PAD_H, P), { tone: "faint" }));
  out.push(screws(plan, 6, PAD_H, 0.45));
  out.push(k.faceTextSvg(k.topMatrix([plan.x + 12, plan.y + plan.d - 5.5], PAD_H, P, "x"), label, { size: 4.6, tone: "hi" }));
  return out.join("");
}

function laptop(c) {
  const [cx, cy] = c;
  const out = [];
  const Z0 = PAD_H;
  const base = off(c, { x: -30, y: -20, w: 60, d: 40, r: 3 });
  out.push(halo(k.insetPlan(base, 2), Z0, 0.1));
  for (const [x, y] of byDepth(k.corners(base, 5))) out.push(solid(k.cylinder(x, y, 1.6, Z0, 0.8, P, 14), { tone: "lo" }));
  const zb = Z0 + 0.8;
  const zt = zb + 3.4;
  out.push(solid(slab(base, zb, 3.4, 6, 0.6), { tone: "mid" }));
  const xr = base.x + base.w;
  for (const [y1, y2] of [[-12, -7], [-4, 1]]) out.push(line(faceX(xr, cy + y1, cy + y2, zb + 1, zb + 2.4), { tone: "lo" }));
  out.push(dot([xr, cy + 6, zb + 1.7], "m-led is-ok", 1.1));
  // the lid, standing at the back edge, with its display facing the reader
  const lid = off(c, { x: -30, y: -21.5, w: 60, d: 2.6, r: 1 });
  const zl2 = zt + 36;
  out.push(solid(slab(lid, zt, zl2 - zt, 4, 0.4), { tone: "mid" }));
  const yf = lid.y + lid.d;
  const sx1 = cx - 26.5, sx2 = cx + 26.5, sz1 = zt + 3.6, sz2 = zl2 - 3.6;
  out.push(`<path class="m-screen" d="${faceY(yf, sx1, sx2, sz1, sz2)}"/>`);
  out.push(line(faceY(yf, sx1, sx2, sz1, sz2), { tone: "lo" }));
  out.push(`<path class="m-scrbar" d="${faceY(yf, sx1, sx2, sz2 - 3.2, sz2)}"/>`);
  [[0, 22], [3, 30], [3, 26], [6, 19], [3, 34], [0, 12], [3, 28]].forEach(([indent, len], i) => {
    const z = sz2 - 6.4 - i * 3.6;
    const x1 = sx1 + 3 + indent;
    out.push(`<path class="m-code${i === 3 ? " is-edit" : ""}" d="${segY(yf, x1, z, Math.min(x1 + len, sx2 - 3), z)}"/>`);
  });
  out.push(dot([cx, yf, zl2 - 1.8], "m-cam", 0.9));
  for (const hx of [-22, 14]) out.push(solid(slab(off(c, { x: hx, y: -19, w: 8, d: 2.4, r: 0.8 }), zt, 1.6, 3), { tone: "mid", crease: "none" }));
  out.push(line(k.planOutline(off(c, { x: -26.2, y: -16.4, w: 52.4, d: 23.4, r: 1.6 }), zt, P), { tone: "lo" }));
  const keys = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 11; col++) keys.push({ x: cx - 24.6 + col * 4.5, y: cy - 15 + row * 4.4, w: 3.7, d: 3.6 });
  const last = cy - 15 + 4 * 4.4;
  keys.push({ x: cx - 24.6, y: last, w: 12.6, d: 3.6 }, { x: cx - 11, y: last, w: 22, d: 3.6 }, { x: cx + 12, y: last, w: 12.6, d: 3.6 });
  for (const key of byDepthPlans(keys)) out.push(solid(slab({ ...key, r: 0.7 }, zt, 0.7, 3, 0.25), { tone: "mid", crease: "none" }));
  out.push(line(k.planOutline(off(c, { x: -9, y: 9.5, w: 18, d: 8.5, r: 1.2 }), zt, P), { tone: "lo" }));
  return out.join("");
}

function tray(c) {
  const [cx, cy] = c;
  const out = [];
  const Z0 = PAD_H;
  const outer = off(c, { x: -28, y: -22, w: 56, d: 44, r: 2.5 });
  out.push(halo(k.insetPlan(outer, 2), Z0, 0.1));
  out.push(solid(slab(outer, Z0, 2, 6, 0.4), { tone: "mid" }));
  const zf = Z0 + 2, tk = 2.4, wallH = 11, lipH = 5.5;
  out.push(solid(slab(off(c, { x: -28, y: -22, w: 56, d: tk, r: 1 }), zf, wallH, 3, 0.3), { tone: "mid" }));
  out.push(solid(slab(off(c, { x: -28, y: -22, w: tk, d: 44, r: 1 }), zf, wallH, 3, 0.3), { tone: "mid" }));
  [[-0.8, 0.8], [0.9, -0.5], [0, 0]].forEach(([dx, dy], i) => {
    out.push(`<g class="m-paper">${solid(slab(off(c, { x: -23 + dx, y: -18 + dy, w: 44, d: 34, r: 0.5 }), zf + i * 0.6, 0.6, 2), { tone: "mid", crease: "none" })}</g>`);
  });
  const ztop = zf + 1.8;
  out.push(`<path class="m-sheetbar" d="${k.planOutline(off(c, { x: -20, y: -15.5, w: 26, d: 3.2, r: 0.4 }), ztop, P)}"/>`);
  [30, 24, 34, 18, 28, 32].forEach((len, i) => out.push(line(k.lineOnTop([cx - 20, cy - 8 + i * 3.6], [cx - 20 + len, cy - 8 + i * 3.6], ztop, P), { tone: "lo", free: "both" })));
  out.push(solid(slab(off(c, { x: 28 - tk, y: -22, w: tk, d: 44, r: 1 }), zf, wallH, 3, 0.3), { tone: "mid" }));
  out.push(solid(slab(off(c, { x: -28, y: 22 - tk, w: 56, d: tk, r: 1 }), zf, lipH, 3, 0.3), { tone: "mid" }));
  out.push(plateOnY(cy + 22, cx - 10, cx + 10, zf + 1.1, zf + 4.4, 1));
  out.push(k.dotsSvg([[cx - 26.8, cy - 20.8], [cx + 26.8, cy - 20.8], [cx + 26.8, cy + 20.8]].map(([x, y]) => at([x, y, zf + wallH])), { size: 0.45 }));
  return out.join("");
}

function drawerFront(cx, y, z1, z2) {
  const out = [solid(slab({ x: cx - 21, y, w: 42, d: 1.6, r: 0.8 }, z1, z2 - z1, 3, 0.3), { tone: "mid" })];
  const yf = y + 1.6;
  const zm = (z1 + z2) / 2;
  out.push(solid(slab({ x: cx - 6, y: yf, w: 12, d: 1.8, r: 0.9 }, zm - 2.6, 1.6, 3, 0.2), { tone: "mid", crease: "none" }));
  out.push(plateOnY(yf, cx - 7, cx + 7, zm + 0.8, zm + 3.8, 1));
  return out.join("");
}

function cabinet(c) {
  const [cx, cy] = c;
  const out = [];
  const Z0 = PAD_H;
  const body = off(c, { x: -24, y: -20, w: 48, d: 40, r: 2 });
  out.push(halo(k.insetPlan(body, 1), Z0, 0.1));
  for (const [x, y] of byDepth(k.corners(body, 4))) out.push(solid(k.cylinder(x, y, 1.8, Z0, 2, P, 14), { tone: "lo" }));
  const zb = Z0 + 2, zt = zb + 44;
  out.push(solid(slab(body, zb, 44, 6, 0.8), { tone: "mid" }));
  const lidPlan = off(c, { x: -25.5, y: -21.5, w: 51, d: 43, r: 2.5 });
  out.push(solid(slab(lidPlan, zt, 2.2, 6, 0.5), { tone: "mid" }));
  out.push(line(k.planOutline(k.insetPlan(lidPlan, 3.5), zt + 2.2, P), { tone: "faint" }));
  out.push(screws(k.insetPlan(lidPlan, 0), 6, zt + 2.2, 0.45));
  const xr = cx + 24;
  out.push(`<path class="m-plate" d="${faceX(xr, cy - 10, cy + 8, zb + 28, zb + 36)}"/>` + line(faceX(xr, cy - 10, cy + 8, zb + 28, zb + 36), { tone: "lo" }));
  [0, 1, 2].forEach((i) => out.push(line(segX(xr, cy - 7.5, zb + 34 - i * 2.2, cy + 5 - i * 3, zb + 34 - i * 2.2), { tone: "faint", free: "both" })));
  const yf = cy + 20;
  const bands = [[zb + 3, zb + 14], [zb + 16, zb + 27], [zb + 29, zb + 41]];
  for (const [z1, z2] of bands.slice(0, 2)) out.push(drawerFront(cx, yf, z1, z2));
  // the top drawer is pulled out: its cards are the commits, the front one is the newest
  const [z1, z2] = bands[2];
  const pull = 16;
  out.push(`<path class="m-cavity" d="${faceY(yf, cx - 21, cx + 21, z1, z2)}"/>`);
  out.push(solid(slab({ x: cx - 20, y: yf, w: 40, d: pull, r: 0.5 }, z1 + 0.6, 1, 3), { tone: "mid", crease: "none" }));
  out.push(solid(slab({ x: cx - 20, y: yf, w: 1.4, d: pull, r: 0.4 }, z1 + 1.6, 7, 3), { tone: "mid", crease: "none" }));
  const tabs = [-14, -4, 6, -9, 1, 9];
  tabs.forEach((tx, i) => {
    const y = yf + 1.6 + i * 2.25;
    const zc = z1 + 1.6;
    const newest = i === tabs.length - 1;
    const card = solid(slab({ x: cx - 16, y, w: 32, d: 0.5, r: 0.2 }, zc, 13, 2), { tone: newest ? "hi" : "mid", crease: "none", lit: newest });
    const tab = solid(slab({ x: cx + tx, y, w: 7, d: 0.5, r: 0.2 }, zc + 13, 2.6, 2), { tone: newest ? "hi" : "mid", crease: "none", lit: newest });
    out.push(`<g class="m-paper${newest ? " is-new" : ""}">${tab}${card}</g>`);
    out.push(line(segY(y + 0.5, cx - 13, zc + 10.5, cx + (newest ? 9 : 4), zc + 10.5), { tone: newest ? "hi" : "faint", free: "both" }));
  });
  out.push(solid(slab({ x: cx + 18.6, y: yf, w: 1.4, d: pull, r: 0.4 }, z1 + 1.6, 7, 3), { tone: "mid", crease: "none" }));
  out.push(drawerFront(cx, yf + pull, z1, z2));
  return out.join("");
}

function server(c) {
  const [cx, cy] = c;
  const out = [];
  const Z0 = PAD_H;
  const body = off(c, { x: -17, y: -24, w: 34, d: 48, r: 2 });
  out.push(halo(k.insetPlan(body, 1), Z0, 0.1));
  for (const [x, y] of byDepth(k.corners(body, 3.5))) out.push(solid(slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 1 }, Z0, 2.2, 3), { tone: "lo", crease: "none" }));
  const zb = Z0 + 2.2, zt = zb + 64;
  out.push(solid(slab(body, zb, 64, 6, 0.8), { tone: "mid" }));
  out.push(line(k.planOutline(k.insetPlan(body, 3), zt, P), { tone: "faint" }));
  const grille = off(c, { x: -10, y: -16, w: 20, d: 26, r: 1.5 });
  out.push(line(k.planOutline(grille, zt, P), { tone: "lo" }));
  for (let i = 0; i < 7; i++) out.push(line(k.lineOnTop([grille.x + 2.5, grille.y + 2.6 + i * 3.5], [grille.x + grille.w - 2.5, grille.y + 2.6 + i * 3.5], zt, P), { tone: "lo" }));
  out.push(screws(k.insetPlan(body, 0), 4.5, zt, 0.4));
  const yf = cy + 24;
  for (const [z1, z2] of [[zb + 38, zb + 43.5], [zb + 45, zb + 50.5], [zb + 52, zb + 57.5], [zb + 59, zb + 62.5]]) {
    out.push(solid(slab({ x: cx - 14, y: yf, w: 28, d: 1.2, r: 0.6 }, z1, z2 - z1, 3, 0.2), { tone: "mid" }));
    const y2 = yf + 1.2;
    const zm = (z1 + z2) / 2;
    out.push(line(segY(y2, cx - 11, zm, cx + 3, zm), { tone: "lo" }));
    out.push(dot([cx + 7, y2, zm], "m-led is-ok", 1.15), dot([cx + 10.5, y2, zm], "m-led", 1.15));
  }
  out.push(line(k.sideRing([cx, yf, zb + 31], 2.6, "y", P, 24), { tone: "mid" }));
  out.push(dot([cx, yf, zb + 31], "m-led is-ok", 0.9));
  out.push(line(faceY(yf, cx - 13, cx + 13, zb + 4.5, zb + 26.5), { tone: "lo" }));
  for (let i = 0; i < 9; i++) {
    const z = zb + 6.4 + i * 2.35;
    out.push(line(segY(yf, cx - 13, z, cx + 13, z), { tone: "lo" }));
  }
  const xr = cx + 17;
  out.push(line(faceX(xr, cy - 19, cy + 19, zb + 38, zb + 58), { tone: "lo" }));
  for (let col = 0; col < 3; col++) for (let i = 0; i < 6; i++) {
    const y1 = cy - 19 + 1.5 + col * 12.5;
    const z = zb + 40.5 + i * 3.1;
    out.push(line(segX(xr, y1, z, y1 + 9.5, z), { tone: "lo" }));
  }
  out.push(`<path class="m-plate" d="${faceX(xr, cy - 8, cy + 10, zb + 8, zb + 16)}"/>` + line(faceX(xr, cy - 8, cy + 10, zb + 8, zb + 16), { tone: "lo" }));
  [0, 1, 2].forEach((i) => out.push(line(segX(xr, cy - 5.5, zb + 14 - i * 2.2, cy + 7 - i * 3, zb + 14 - i * 2.2), { tone: "faint", free: "both" })));
  return out.join("");
}

function puck() {
  const [x, y] = [120, -58];
  return (
    halo({ x: x - 4.6, y: y - 4.6, w: 9.2, d: 9.2, r: 4.6 }, 1.2, 0.1) +
    `<g class="m-puck">${solid(k.cylinder(x, y, 4.8, 1.2, 3.6, P, 36, 0.4), { tone: "hi", lit: true })}</g>` +
    line(k.ring(x, y, 2.6, 4.8, P, 24), { tone: "mid" }) +
    k.dotsSvg([at([x, y, 4.8])], { size: 0.6, tone: "hi" })
  );
}

const tint = (cls, body) => `<g class="m-obj ${cls}">${body}</g>`;
const svg = () => k.figureSvg({
  width: W,
  height: H,
  label: "A bench with four stations joined by rails: a laptop, a staging tray, a card-file cabinet and a server. A puck on the rail between the tray and the cabinet is one commit on its way.",
  body: [
    bench(),
    tracks(),
    pad(L, "YOUR FOLDER"),
    pad(R, "LOCAL REPO"),
    pad(T, "STAGING"),
    pad(S, "ORIGIN"),
    pad(M, "TEAMMATE"),
    tint("m-laptop", laptop(L)),
    tint("m-repo", cabinet(R)),
    puck(),
    tint("m-tray", tray(T)),
    tint("m-server", server(S)),
    tint("m-mate", laptop(M)),
  ],
});

const SKINS = `
.sk{position:relative;background:var(--anatomy-card);border-radius:8px 8px 0 0;padding:18px 8px 6px}
.sk .iso-svg{width:100%;height:auto}
.sk .m-route{fill:none;stroke:var(--route);stroke-width:var(--route-w,1.8px);stroke-linecap:round;stroke-dasharray:2 6;animation:m-flow 1.3s linear infinite;vector-effect:non-scaling-stroke}
@keyframes m-flow{to{stroke-dashoffset:-16}}
.sk .m-screen{fill:var(--screen)}
.sk .m-scrbar{fill:var(--scrbar)}
.sk .m-code{fill:none;stroke:var(--code);stroke-width:1.3px;stroke-linecap:round;vector-effect:non-scaling-stroke}
.sk .m-code.is-edit{stroke:var(--route);stroke-width:2px}
.sk .m-cavity{fill:var(--cavity)}
.sk .m-plate{fill:var(--plate)}
.sk .m-sheetbar{fill:var(--route);opacity:.9;stroke:none}
.sk .m-led{fill:var(--led-off)}
.sk .m-led.is-ok{fill:var(--led-ok)}
.sk .m-cam{fill:var(--anatomy-lo)}
.sk .m-paper{--anatomy-top:var(--paper-top);--anatomy-paper:var(--paper-top);--anatomy-shade-0:var(--paper-s0);--anatomy-shade-1:var(--paper-s1);--anatomy-shade-2:var(--paper-s1);--anatomy-shade-3:var(--paper-s0);--anatomy-lit-top:var(--paper-top);--anatomy-lit-shade:var(--paper-s1)}
.sk .m-puck{--anatomy-top:var(--route);--anatomy-lit-top:var(--route);--anatomy-lit-shade:var(--route-dark);--anatomy-face:var(--route-dark);--anatomy-paper:var(--route-dark)}
@media (prefers-reduced-motion:reduce){.sk .m-route{animation:none}}

/* A · Instrument: the anatomy look, paper tones, colour only on what moves */
.sk.sk-a.iso[data-theme]{--route:#e5661b;--route-dark:#b84f12;--screen:#eeeeeb;--scrbar:#e2e2de;--code:#a6a6ab;--cavity:#cfcfcb;--plate:#ffffff;--led-off:#c4c4c8;--led-ok:#30a46c;--paper-top:#ffffff;--paper-s0:#e7e7e4;--paper-s1:#efefec}

/* B · Instrument + colour: same drawing, each place keeps one soft colour */
.sk.sk-b.iso[data-theme]{--route:#e5661b;--route-dark:#b84f12;--screen:#e9edf3;--scrbar:#dbe2ec;--code:#9aa6b5;--cavity:#c9c3b4;--plate:#ffffff;--led-off:#c4c4c8;--led-ok:#30a46c;--paper-top:#ffffff;--paper-s0:#e7e7e4;--paper-s1:#efefec;--anatomy-mid:#7c7c82}
.sk-b .m-laptop{--anatomy-top:#f1f3f6;--anatomy-paper:#e4e8ed;--anatomy-shade-0:#c3cbd5;--anatomy-shade-1:#ced5de;--anatomy-shade-2:#d9dfe6;--anatomy-shade-3:#e4e8ed}
.sk-b .m-tray{--anatomy-top:#fdefc8;--anatomy-paper:#f7e0a2;--anatomy-shade-0:#ddb75c;--anatomy-shade-1:#e6c473;--anatomy-shade-2:#eed08a;--anatomy-shade-3:#f6dc9f}
.sk-b .m-repo{--anatomy-top:#f0ebfe;--anatomy-paper:#e1d8fb;--anatomy-shade-0:#b7a6e3;--anatomy-shade-1:#c5b6ec;--anatomy-shade-2:#d2c6f3;--anatomy-shade-3:#ded5f9}
.sk-b .m-mate{--anatomy-top:#e9f7ee;--anatomy-paper:#d3eedd;--anatomy-shade-0:#9fd3b3;--anatomy-shade-1:#b1dcc1;--anatomy-shade-2:#c3e5cf;--anatomy-shade-3:#d3eedd}
.sk-b .m-server{--anatomy-top:#e7f0fe;--anatomy-paper:#d4e3fb;--anatomy-shade-0:#9ab9e6;--anatomy-shade-1:#acc6ee;--anatomy-shade-2:#bed3f5;--anatomy-shade-3:#cfdffa}

/* C · Bold: your Git lesson's warm look, now on the detailed objects */
.sk.sk-c.iso[data-theme]{--anatomy-card:#fbf7f1;--anatomy-top:#fffaf2;--anatomy-paper:#f1e8db;--anatomy-shade-0:#d9cbb6;--anatomy-shade-1:#e2d6c4;--anatomy-shade-2:#ebe1d2;--anatomy-shade-3:#f3ebdf;--anatomy-hi:#1d1b18;--anatomy-mid:#1d1b18;--anatomy-lo:#6f6961;--anatomy-faint:#b8ad9d;--anatomy-lit:#1d1b18;--anatomy-halo:#5a4630;--anatomy-halo-opacity:.28;--route:#e8742a;--route-dark:#b9541a;--route-w:2.4px;--screen:#d9d0f5;--scrbar:#c4b8ef;--code:#7d6fc0;--cavity:#3a332b;--plate:#fffaf2;--led-off:#b8ad9d;--led-ok:#3f9a5a;--paper-top:#ffffff;--paper-s0:#e9e1d4;--paper-s1:#f2ece2}
.sk-c .iso-edge{stroke-width:1.25px}
.sk-c .m-laptop{--anatomy-top:#f6f1e9;--anatomy-paper:#e3d9ca;--anatomy-shade-0:#c4b6a2;--anatomy-shade-1:#cfc3b1;--anatomy-shade-2:#dad0c0;--anatomy-shade-3:#e5ddcf}
.sk-c .m-tray{--anatomy-top:#fbe2a0;--anatomy-paper:#f3cd6d;--anatomy-shade-0:#d9a63c;--anatomy-shade-1:#e3b44f;--anatomy-shade-2:#ecc260;--anatomy-shade-3:#f3cd6d}
.sk-c .m-repo{--anatomy-top:#e7defc;--anatomy-paper:#cbbcf4;--anatomy-shade-0:#a28ddf;--anatomy-shade-1:#b09ee8;--anatomy-shade-2:#beaeef;--anatomy-shade-3:#cbbcf4}
.sk-c .m-mate{--anatomy-top:#dcf2df;--anatomy-paper:#bfe5c6;--anatomy-shade-0:#8cc79a;--anatomy-shade-1:#9dd1aa;--anatomy-shade-2:#aedbb9;--anatomy-shade-3:#bfe5c6}
.sk-c .m-server{--anatomy-top:#dbe8fc;--anatomy-paper:#b7cff6;--anatomy-shade-0:#86a7e2;--anatomy-shade-1:#97b4ea;--anatomy-shade-2:#a8c1f0;--anatomy-shade-3:#b7cff6}

.today{display:grid;grid-template-columns:260px 1fr;gap:18px;align-items:center;margin:4px 0 22px}
.today-img{aspect-ratio:840/520;background:url('/files/today.jpg') no-repeat;background-size:171.4% auto;background-position:45.3% 52.6%;border-radius:6px;box-shadow:0 0 0 1px rgba(0,0,0,.12)}
.today p{margin:0;color:var(--text-secondary);font-size:.9rem;line-height:1.5}
.styles .card{cursor:pointer}
.styles .card-body p{max-width:70ch}
`;

const card = (id, letter, title, text, skin) => `
<div class="card" data-choice="${id}" onclick="toggleSelect(this)">
  <div class="sk ${skin} iso" data-theme="light">${svg()}</div>
  <div class="card-body"><h3>${letter} · ${title}</h3><p>${text}</p></div>
</div>`;

const html = `<style>${ISO_CSS}${SKINS}</style>
<h2>Which style should the objects have?</h2>
<p class="subtitle">The same scene three times: your laptop, the staging tray, the local repo, the origin server and your teammate on one bench. The orange puck is one commit on its way. Zoom in (Ctrl +) to check the detail, then click the style you like.</p>
<div class="today"><div class="today-img" role="img" aria-label="Today's objects in the Git lesson"></div><p><b>Today, for comparison.</b> Each object is a few shaded blocks, with a label and dots moving between them.</p></div>
<div class="cards styles" style="grid-template-columns:1fr">
${card("instrument", "A", "Instrument", "The anatomy look. Paper tones, fine lines and many small real parts: keys, screws, drive bays, a drawer of cards. The only colour is the thing that moves.", "sk-a")}
${card("instrument-colour", "B", "Instrument + colour", "The same drawing, but every place keeps one soft colour (tray amber, repo violet, server blue), so learners can match each place to its counter and its word in the text.", "sk-b")}
${card("bold", "C", "Bold", "Your Git lesson's warm look kept: cream paper, dark outlines, stronger colours, now on the detailed objects.", "sk-c")}
</div>`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(outPath, html);
  console.log("wrote", outPath, Math.round(html.length / 1024) + " KB");
}
export { k, P, W, H, ISO_CSS, SKINS, L, T, R, S, M, PAD, PAD_H, at, pathAt, line, solid, slab, off, halo, bench, pad, laptop, tray, cabinet, server };
