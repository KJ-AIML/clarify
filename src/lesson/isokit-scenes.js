// clarify/src/lesson/isokit-scenes.js
// Translates a parsed Clarify Markdown `lesson` (places, rails, layout, step states)
// into isokit scenes ({ entities, links, flows }) for IsoDiagram.Stage.

import { TINTS } from "./kinds.js";

/** Clarify tint → isokit palette name. */
const TINT_TO_COLOR = {
  neutral: "slab",
  amber: "orange",
  violet: "purple",
  blue: "blue",
  green: "green",
  rose: "rose",
  teal: "teal"
};

/** Clarify 15 place kinds → isokit primitive spec (type, glyph/form, height). */
const KIND_SPEC = {
  laptop:   { type: "device", form: "laptop" },
  phone:    { type: "device", form: "phone" },
  database: { type: "db", glyph: "database", r: 1.9, h: 42 },
  cabinet:  { type: "db", glyph: "layers", r: 1.9, h: 42 },
  server:   { type: "block", glyph: "server", s: 4.2, h: 48 },
  monitor:  { type: "block", glyph: "window", s: 4.2, h: 44 },
  tray:     { type: "block", glyph: "inbox", s: 4.2, h: 34 },
  queue:    { type: "block", glyph: "listOrdered", s: 4.2, h: 38 },
  cache:    { type: "block", glyph: "zap", s: 4.2, h: 40 },
  gate:     { type: "block", glyph: "shield", s: 4.2, h: 46 },
  router:   { type: "block", glyph: "network", s: 4.2, h: 42 },
  mailbox:  { type: "block", glyph: "mail", s: 4.2, h: 42 },
  folder:   { type: "block", glyph: "file", s: 4.2, h: 38 },
  cloud:    { type: "block", glyph: "globe", s: 4.2, h: 44 },
  box:      { type: "block", glyph: "box", s: 4.2, h: 42 }
};

/** Clarify puck kind → isokit packet kind. */
export const PUCK_TO_PACKET = {
  change: "req",
  reply: "push",
  fail: "kill",
  store: "mine",
  slow: "slow"
};

/** Grid spacing in isokit world units (blocks are ~4.2 units wide; 10 units keeps labels/pills clear). */
const GRID_STEP = 10;

/**
 * Each place's tint in rail-chain order (mirrors Clarify's original placeTints rule).
 * @param {import("../types").Lesson} lesson
 * @returns {Record<string, string>}
 */
export function placeTints(lesson) {
  const declared = new Set(lesson.places.map((p) => p.id));
  const turns = new Set();
  for (const { a, b } of lesson.rails) {
    for (const id of [a, b]) if (declared.has(id)) turns.add(id);
  }
  for (const id of declared) turns.add(id);
  const turnTint = new Map([...turns].map((id, i) => [id, TINTS[i % TINTS.length]]));
  return Object.fromEntries(lesson.places.map((p) => [p.id, p.tint || turnTint.get(p.id)]));
}

/**
 * Split a short place label into 1-2 balanced lines that fit neatly on an isokit block lid.
 * @param {string} text
 * @returns {string[]}
 */
function wrapLabel(text) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  if (clean.length <= 12) return [clean];
  const words = clean.split(/\s+/);
  if (words.length === 1) return [clean];
  let bestIdx = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    const diff = Math.abs(left - right);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(" "), words.slice(bestIdx).join(" ")];
}

/**
 * Build isokit scenes — one per StepState — from a parsed Clarify lesson.
 * @param {import("../types").Lesson} lesson
 * @param {{ cells: Record<string, [number, number]>, drawn: string[] }} layout
 * @param {Array<import("./state.js").StepState>} states
 * @returns {{ scenes: Array<{ entities: object, links: object, flows: Array<object> }>, tints: Record<string, string> }}
 */
export function buildIsokitScenes(lesson, layout, states) {
  const tints = placeTints(lesson);
  const places = lesson.places.filter((p) => layout.cells[p.id]);
  const raw = places.map((p) => layout.cells[p.id]);
  const [minX, minY] = raw.length ? [0, 1].map((axis) => Math.min(...raw.map((c) => c[axis]))) : [0, 0];

  /** Map Clarify grid [cx, cy] → isokit world [x, y] (x down-right, y up-right). */
  const coords = new Map(
    places.map((p, i) => {
      const cx = raw[i][0] - minX;
      const cy = raw[i][1] - minY;
      return [p.id, [cx * GRID_STEP, -cy * GRID_STEP]];
    })
  );

  // Deduplicated drawn rails in declaration order.
  const drawnSet = new Set(layout.drawn);
  const seenPairs = new Set();
  const drawnRails = [];
  for (const { a, b } of lesson.rails) {
    const id = `${a}--${b}`;
    const pair = JSON.stringify([a, b].sort());
    if (!drawnSet.has(id) || seenPairs.has(pair) || !coords.has(a) || !coords.has(b)) continue;
    seenPairs.add(pair);
    drawnRails.push({ id, a, b });
  }
  const railById = new Map(drawnRails.map((r) => [r.id, r]));

  const scenes = states.map((state) => {
    const liveIds = state.live.length ? new Set(state.live) : new Set(places.map((p) => p.id));
    const focusSet = new Set(state.focus);
    const failSet = new Set(state.fail);
    const cutSet = new Set(state.cut);
    const activeEndpoints = new Set();
    for (const m of state.moves) {
      const r = railById.get(m.rail);
      if (r) { activeEndpoints.add(r.a); activeEndpoints.add(r.b); }
    }
    const hasHighlight = focusSet.size > 0 || failSet.size > 0 || activeEndpoints.size > 0;

    /** @type {Record<string, object>} */
    const entities = {};
    for (const place of places) {
      if (!liveIds.has(place.id)) continue;
      const [x, y] = coords.get(place.id);
      const spec = KIND_SPEC[place.kind] || KIND_SPEC.box;
      const color = TINT_TO_COLOR[tints[place.id]] || "slab";
      const labelText = place.label || place.id;
      const isFocused = focusSet.has(place.id);
      const isFailed = failSet.has(place.id);
      const isActive = isFocused || isFailed || activeEndpoints.has(place.id);
      const dim = hasHighlight && !isActive && liveIds.size > 2 ? 0.32 : 0;

      if (spec.type === "device") {
        const ent = { type: "device", form: spec.form, x, y, label: labelText };
        if (isFailed) ent.tags = [{ text: "ERROR", tone: "red", icon: "alert" }];
        entities[place.id] = ent;
      } else if (spec.type === "db") {
        const ent = {
          type: "db",
          x,
          y,
          r: spec.r,
          h: spec.h,
          color,
          glyph: spec.glyph,
          label: labelText
        };
        if (isFailed) {
          ent.heat = 0.9;
          ent.cpu = 0.96;
          ent.tags = [{ text: "ERROR", tone: "red", icon: "alert" }];
        } else if (isFocused) {
          ent.cpu = 0.45;
        }
        entities[place.id] = ent;
      } else {
        const ent = {
          type: "block",
          x,
          y,
          s: spec.s,
          h: spec.h,
          color,
          glyph: spec.glyph,
          label: wrapLabel(labelText),
          dim
        };
        if (isFailed) {
          ent.heat = 0.92;
          ent.dead = 1;
          ent.tags = [{ text: "ERROR", tone: "red", icon: "alert" }];
        }
        entities[place.id] = ent;
      }
    }

    // Index moves by rail so each link carries the right direction, heads, style and fail flag.
    const movesByRail = new Map();
    for (const m of state.moves) {
      if (!movesByRail.has(m.rail)) movesByRail.set(m.rail, []);
      movesByRail.get(m.rail).push(m);
    }

    /** @type {Record<string, object>} */
    const links = {};
    /** @type {Array<object>} */
    const flows = [];

    for (const rail of drawnRails) {
      if (!liveIds.has(rail.a) || !liveIds.has(rail.b)) continue;
      const railMoves = movesByRail.get(rail.id) || [];
      const isCut = cutSet.has(rail.id);

      if (!railMoves.length) {
        links[rail.id] = {
          from: rail.a,
          to: rail.b,
          pts: [rail.a, rail.b],
          style: isCut ? "cut" : "off",
          heads: isCut ? "none" : "end"
        };
        continue;
      }

      // If multiple moves use the same rail in opposite directions (e.g. a->b and b->a), give each its own directed link.
      const seenDir = new Map();
      railMoves.forEach((m, idx) => {
        const from = m.reverse ? rail.b : rail.a;
        const to = m.reverse ? rail.a : rail.b;
        const dirKey = `${from}->${to}`;
        let linkId = seenDir.get(dirKey);
        if (!linkId) {
          linkId = idx === 0 ? rail.id : `${rail.id}__${idx}`;
          seenDir.set(dirKey, linkId);
          const fails = isCut || m.kind === "fail";
          links[linkId] = {
            from,
            to,
            pts: [from, to],
            style: isCut ? "cut" : "solid",
            heads: m.roundTrip ? "both" : "end",
            fail: fails ? 1 : 0
          };
        } else if (m.kind === "fail") {
          links[linkId].fail = 1;
        }

        const kind = PUCK_TO_PACKET[m.kind] || "req";
        const rate = Math.min(3, 1.05 + Math.max(0, (m.count || 1) - 1) * 0.55);
        flows.push({
          route: [linkId],
          kind,
          rate,
          bounce: Boolean(m.roundTrip) && !isCut && m.kind !== "fail",
          hold: m.kind === "slow" ? 0.55 : 0
        });
      });
    }

    return { entities, links, flows };
  });

  return { scenes, tints };
}
