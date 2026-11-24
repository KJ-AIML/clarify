// clarify/src/lesson/isokit-validate.js
// Compile-time validator for native `isokit` / `iso` JSON lessons.
// Checks types, colors, icons, coordinates, overlaps, block spacing, link waypoints,
// zone floor-label crossings, flow routes, metrics, changes and optional quiz.
// Never throws: returns author-facing `line N: ...` warnings.

import * as iso from "../isokit/iso/index.js";
import * as stage from "../isokit/stage/index.js";
import { icons } from "../isokit/icons/icons.js";

// Initialize engine metadata once in Node (matches src/isokit/entry.js).
let initialized = false;
function ensureMeta() {
  if (initialized) return;
  initialized = true;
  iso.registerIcons(icons);
  iso.configure({
    palette: {
      teal: { top: ["#d3f3f1", "#b5e7e4"], side: ["#9fdad6", "#87ccc8"] }
    }
  });
  iso.extendMeta({
    linkStyles: [...stage.LINK_STYLES, "muted"],
    linkHeads: [...stage.LINK_HEADS],
    packetKinds: [...stage.PACKET_KINDS]
  });
}

const VALID_CHAPTERS = new Set(["setup", "problem", "solution", "technique", "tradeoff", "insight", "recap", "how", "why", "case"]);
const RECT_TYPES = new Set(["crowd", "zone"]);
const num = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Validate a raw (pre-resolve) isokit JSON lesson object.
 * @param {object} lesson
 * @param {number} [line=1] draft line of the opening fence
 * @returns {string[]} warnings prefixed with `line N: `
 */
export function validateIsokitLesson(lesson, line = 1) {
  ensureMeta();
  const M = iso.meta();
  const out = [];
  const warn = (where, msg) => out.push(`line ${line}: ${where}: ${msg}`);

  if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
    warn("isokit", "lesson must be a JSON object");
    return out;
  }
  if (!Array.isArray(lesson.steps) || !lesson.steps.length) {
    warn("isokit", '"steps" must be a non-empty array');
    return out;
  }

  const metricKeys = new Set((Array.isArray(lesson.metrics) ? lesson.metrics : []).map((m) => m?.key).filter(Boolean));
  const comps = lesson.components && typeof lesson.components === "object" ? lesson.components : {};
  const wires = lesson.wires && typeof lesson.wires === "object" ? lesson.wires : {};

  for (const [name, c] of Object.entries(comps)) {
    if (!c || typeof c !== "object" || !M.types.includes(c.type)) {
      warn(`components.${name}`, `unknown type "${c?.type}" (known: ${M.types.join(", ")})`);
    }
  }
  for (const l of Array.isArray(lesson.legend) ? lesson.legend : []) {
    const kind = typeof l === "string" ? l : l?.kind;
    if (![...M.packetKinds, "res", "fail"].includes(kind)) {
      warn("legend", `unknown packet kind "${kind}"`);
    }
  }

  // Template reference checks on raw steps.
  lesson.steps.forEach((st, i) => {
    const sc = st?.scene || {};
    for (const [id, e] of Object.entries(sc.entities || {})) {
      if (e && e.use && !comps[e.use]) warn(`step ${i + 1} › ${id}`, `uses unknown component "${e.use}"`);
    }
    const refs = Array.isArray(sc.links)
      ? sc.links.map((l) => (typeof l === "string" ? [l, {}] : [l?.id || l?.use, l]))
      : Object.entries(sc.links || {});
    for (const [id, over] of refs) {
      const o = over && typeof over === "object" ? over : {};
      if (o.use && !wires[o.use]) warn(`step ${i + 1} › link ${id}`, `uses unknown wire "${o.use}"`);
      if (!wires[o.use || id] && !(o.from && o.pts)) {
        warn(`step ${i + 1} › link ${id}`, 'is not in "wires" and does not define "from" and "pts" itself');
      }
    }
  });

  const resolved = stage.resolveLesson(lesson);
  let prevTypes = {};

  resolved.steps.forEach((st, i) => {
    const at = `step ${i + 1}`;
    if (!st.title) warn(at, 'missing "title"');
    if (st.chapter && !VALID_CHAPTERS.has(st.chapter)) {
      warn(at, `unknown chapter "${st.chapter}"`);
    }
    for (const c of Array.isArray(st.changes) ? st.changes : []) {
      if (!/^[+~\-−]\s/.test(String(c))) warn(at, `change "${c}" should start with "+ ", "~ " or "- "`);
    }
    for (const k of Object.keys(st.metrics || {})) {
      if (!metricKeys.has(k)) warn(at, `metric "${k}" is not declared in lesson.metrics`);
    }

    const ents = st.scene?.entities || {};
    const ids = Object.keys(ents);
    const norm = {};
    if (!ids.length) warn(at, "scene has no entities");
    if (ids.length > 12) warn(at, `${ids.length} entities in one scene; more than ~10 gets crowded`);

    for (const [id, raw] of Object.entries(ents)) {
      const w = `${at} › ${id}`;
      const prim = iso.primitive(raw?.type);
      if (!prim) {
        warn(w, `unknown type "${raw?.type}" (known: ${M.types.join(", ")})`);
        continue;
      }
      const e = (norm[id] = { ...prim.defaults, ...raw });
      if (prevTypes[id] && prevTypes[id] !== e.type) {
        warn(w, `changed type from ${prevTypes[id]} to ${e.type}; use a new id so it enters cleanly`);
      }
      if (RECT_TYPES.has(e.type)) {
        if (![e.x0, e.x1, e.y0, e.y1].every(num)) warn(w, `${e.type} needs numeric x0, x1, y0, y1`);
        else if (e.x0 >= e.x1 || e.y0 >= e.y1) warn(w, "needs x0 < x1 and y0 < y1");
      } else if (!("x0" in e) && !(num(e.x) && num(e.y))) {
        const docked = (prim.card === true || e.type === "panel") && e.x == null && e.y == null;
        if (!docked) warn(w, "needs numeric x and y");
      }
      const paletteTyped = typeof prim.defaults.color === "string" && !prim.defaults.color.startsWith("#");
      if (paletteTyped && typeof e.color === "string" && !e.color.startsWith("#") && !M.colors.includes(e.color)) {
        warn(w, `unknown color "${e.color}" (known: ${M.colors.join(", ")})`);
      }
      for (const key of ["glyph", "icon"]) {
        if (e[key] && !M.icons.includes(e[key])) warn(w, `unknown ${key} "${e[key]}"`);
      }
      if (e.tags !== undefined && !Array.isArray(e.tags)) warn(w, '"tags" must be an array');
      for (const t of Array.isArray(e.tags) ? e.tags : []) {
        const tag = typeof t === "string" ? { text: t } : t;
        if (!tag || typeof tag.text !== "string") warn(w, 'each tag needs a "text"');
        else {
          if (tag.tone && !M.tones.includes(tag.tone)) warn(w, `unknown tag tone "${tag.tone}" (known: ${M.tones.join(", ")})`);
          if (tag.icon && !M.icons.includes(tag.icon)) warn(w, `unknown tag icon "${tag.icon}"`);
          if (tag.text.length > 22) warn(w, `tag "${tag.text}" is long (keep under 22 characters)`);
        }
      }
      if (num(e.cpu) && e.cpu > 1) warn(w, `cpu is ${e.cpu}; use a fraction between 0 and 1 (-1 hides)`);
      for (const key of ["heat", "dead", "dim"]) {
        if (num(e[key]) && (e[key] < 0 || e[key] > 1)) warn(w, `${key} should be between 0 and 1`);
      }
      if (e.type === "block") {
        const lines = Array.isArray(e.label) ? e.label : e.label ? String(e.label).split("\n") : [];
        const fit = Math.round(e.s * 3.1);
        for (const l of lines) {
          if (l.length > fit) warn(w, `label line "${l}" may overflow block of size ${e.s}; split into two lines`);
        }
        if (lines.length > 2) warn(w, 'more than two label lines; use "sub" or a tag');
      }
      if (e.type === "queue" && !(Array.isArray(e.dir) && e.dir.length === 2 && e.dir.every(num))) {
        warn(w, 'queue "dir" must be [dx, dy]');
      }
      if (e.type === "note" && !Array.isArray(e.lines)) warn(w, 'note "lines" must be an array');
    }
    prevTypes = Object.fromEntries(Object.entries(norm).map(([id, e]) => [id, e.type]));

    // Footprint overlaps & tight block spacing.
    const solid = Object.entries(norm).filter(([, e]) => ["block", "db", "crowd", "device"].includes(e.type));
    for (let a = 0; a < solid.length; a++) {
      for (let b = a + 1; b < solid.length; b++) {
        const [ia, ea] = solid[a];
        const [ib, eb] = solid[b];
        const fa = iso.footprintOf(ea);
        const fb = iso.footprintOf(eb);
        const gx = Math.max(fa[0], fb[0]) - Math.min(fa[1], fb[1]);
        const gy = Math.max(fa[2], fb[2]) - Math.min(fa[3], fb[3]);
        if (gx < -0.01 && gy < -0.01) {
          warn(at, `"${ia}" and "${ib}" overlap on the floor`);
        } else if (ea.type === "block" && eb.type === "block" && ((gx < 2.5 && gy < 0) || (gy < 2.5 && gx < 0))) {
          warn(at, `blocks "${ia}" and "${ib}" are ${Math.max(gx, gy).toFixed(1)} units apart (keep size-4 blocks >= 7 units centre-to-centre)`);
        }
      }
    }

    // Links.
    const links = st.scene?.links || {};
    const refOk = (r) => {
      if (num(r)) return true;
      if (typeof r !== "string") return false;
      if (norm[r]) return true;
      const m = /^(.+?)([+-]\d+(?:\.\d+)?)$/.exec(r);
      return Boolean(m && norm[m[1]]);
    };
    for (const [id, l] of Object.entries(links)) {
      const w = `${at} › link ${id}`;
      if (!l.from || !norm[l.from]) warn(w, `"from" entity "${l.from}" is not in this scene`);
      if (l.to && !norm[l.to]) warn(w, `"to" entity "${l.to}" is not in this scene`);
      if (!Array.isArray(l.pts) || l.pts.length < 2) {
        warn(w, '"pts" needs at least two waypoints');
        continue;
      }
      for (const p of l.pts) {
        const ok = Array.isArray(p) ? p.length === 2 && refOk(p[0]) && refOk(p[1]) : typeof p === "string" && refOk(p);
        if (!ok) warn(w, `waypoint ${JSON.stringify(p)} does not resolve`);
      }
      if (l.style && !M.linkStyles.includes(l.style)) warn(w, `unknown style "${l.style}" (known: ${M.linkStyles.join(", ")})`);
      if (l.heads && !M.linkHeads.includes(l.heads)) warn(w, `unknown heads "${l.heads}" (known: ${M.linkHeads.join(", ")})`);
      if (l.labelTone && !M.tones.includes(l.labelTone)) warn(w, `unknown labelTone "${l.labelTone}"`);
      if (num(l.fail) && (l.fail < 0 || l.fail > 1)) warn(w, '"fail" must be between 0 and 1');
    }

    // Zone floor-label crossing check (Liang-Barsky).
    const zones = Object.entries(norm).filter(([, e]) => e.type === "zone" && e.label);
    if (zones.length) {
      const axis = (r, k) => {
        if (num(r)) return r;
        if (norm[r]) return iso.centerOf(norm[r])[k];
        const m = /^(.+?)([+-]\d+(?:\.\d+)?)$/.exec(String(r));
        return m && norm[m[1]] ? iso.centerOf(norm[m[1]])[k] + parseFloat(m[2]) : NaN;
      };
      const crosses = (p, q, [bx0, bx1, by0, by1]) => {
        let t0 = 0;
        let t1 = 1;
        const d = [q[0] - p[0], q[1] - p[1]];
        for (const [den, lo, hi] of [[d[0], bx0 - p[0], bx1 - p[0]], [d[1], by0 - p[1], by1 - p[1]]]) {
          if (Math.abs(den) < 1e-9) { if (lo > 0 || hi < 0) return false; continue; }
          const a = lo / den;
          const b = hi / den;
          t0 = Math.max(t0, Math.min(a, b));
          t1 = Math.min(t1, Math.max(a, b));
          if (t0 > t1) return false;
        }
        return true;
      };
      for (const [id, l] of Object.entries(links)) {
        if (!Array.isArray(l.pts)) continue;
        const pts = l.pts.map((p) => (Array.isArray(p) ? [axis(p[0], 0), axis(p[1], 1)] : [axis(p, 0), axis(p, 1)]));
        if (pts.some((p) => p.some(Number.isNaN))) continue;
        for (const [zid, z] of zones) {
          const box = iso.zoneLabelBox(z);
          if (pts.some((p, k) => k < pts.length - 1 && crosses(p, pts[k + 1], box))) {
            warn(at, `link "${id}" runs over the floor label of zone "${zid}"; move it with "labelAlong": "y" or "labelX"/"labelY"`);
          }
        }
      }
    }

    // Flows.
    (st.scene?.flows || []).forEach((f, n) => {
      const w = `${at} › flow ${n + 1}`;
      const routes = f.routes || (f.route ? [f.route] : []);
      if (!routes.length) {
        warn(w, 'needs "route" or "routes"');
        return;
      }
      for (const r of routes) {
        if (!Array.isArray(r) || !r.length) { warn(w, "each route must be a non-empty list of link ids"); continue; }
        for (const id of r) if (!links[id]) warn(w, `route uses link "${id}", which is not in this scene`);
        for (let k = 0; k < r.length - 1; k++) {
          const a = links[r[k]];
          const b = links[r[k + 1]];
          if (a && b && a.to !== b.from) {
            warn(w, `route hops from "${r[k]}" (ends at ${a.to}) to "${r[k + 1]}" (starts at ${b.from})`);
          }
        }
      }
      if (f.kind && !M.packetKinds.includes(f.kind)) warn(w, `unknown packet kind "${f.kind}" (known: ${M.packetKinds.join(", ")})`);
      if (f.rate !== undefined && !(num(f.rate) && f.rate > 0)) warn(w, '"rate" must be a positive number');
      if (f.weights && (!f.routes || f.weights.length !== f.routes.length)) warn(w, '"weights" must match "routes" length');
    });
  });

  // Optional quiz validation.
  if (lesson.quiz && typeof lesson.quiz === "object") {
    const opts = Array.isArray(lesson.quiz.options) ? lesson.quiz.options : [];
    if (!lesson.quiz.question) warn("quiz", 'missing "question"');
    if (opts.length < 2 || opts.length > 4) warn("quiz", `has ${opts.length} options (give 2 to 4)`);
    if (opts.filter((o) => o && o.correct).length !== 1) warn("quiz", "needs exactly one correct option");
  }

  return out;
}
