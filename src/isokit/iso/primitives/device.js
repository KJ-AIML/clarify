/**
 * device — a laptop (default) or a phone standing on a low slab. The slab is a normal
 * rounded box; the screen and keyboard deck are flat-shaded prisms; the screen content is
 * flat artwork skewed onto the screen with one matrix.
 */
import { config } from '../config.js';
import { R } from '../util.js';
import { iso, faceMatrix } from '../projection.js';
import { bbox, roundedPolygon } from '../geometry.js';
import { pill, pillWidth } from '../pills.js';
import { boxGeom, paintBox, dropShadow, prism } from '../paint.js';
import { ref } from '../defs.js';

const BASE_HEIGHT = 16; // px

const rect = (x, y, w, h, rx, fill) => `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"/>`;

/** Blurred contact shadow on the slab under a prism. */
const contactShadow = (x0, x1, y0, y1, radius, opacity) =>
  `<path d="${roundedPolygon([iso(x0, y0, BASE_HEIGHT), iso(x0, y1, BASE_HEIGHT), iso(x1, y1, BASE_HEIGHT), iso(x1, y0, BASE_HEIGHT)], radius)}" fill="${config.colors.shadow}" opacity="${opacity}" filter="${ref('blur-sm')}"/>`;

/** A browser window, drawn flat: `w` × `h` px with the origin at the screen's top-left corner. */
function browserArt(w, h) {
  const D = config.device;
  const page = w - 6.8;
  return (
    rect(3.4, 3.4, page, h - 8, 1.5, D.page) +
    rect(3.4, 3.4, page, 7, 1.5, D.chrome) +
    `<circle cx="6.6" cy="6.9" r="1" fill="#E5534B"/><circle cx="9.6" cy="6.9" r="1" fill="#EFB041"/><circle cx="12.6" cy="6.9" r="1" fill="#7FC278"/>` +
    rect(16, 5, page - 16, 3.8, 1.9, D.page) +
    rect(7, 14.5, page - 7.2, 12, 1.5, ref('screen')) +
    rect(7, 29.5, (page - 7.2) * 0.62, 2.6, 1.3, D.textLine) +
    rect(7, 34, (page - 7.2) * 0.8, 2.6, 1.3, D.textLine) +
    rect(3.4, 3.4, page, h - 8, 1.5, ref('screen-glare'))
  );
}

/** A chat app, drawn flat for the phone screen. */
function chatArt(w, h) {
  const D = config.device;
  const inner = w - 5;
  return (
    rect(2.5, 2.5, inner, h - 5, 3.5, D.page) +
    rect(w / 2 - 4, 3.6, 8, 2.2, 1.1, D.bezel.right) +
    rect(2.5, 8, inner, 7, 0, D.chrome) +
    rect(5, 19, inner * 0.62, 7, 3, D.bubble) +
    rect(2.5 + inner * 0.32, 29, inner * 0.6, 7, 3, D.bubbleMine) +
    rect(5, 39, inner * 0.5, 7, 3, D.bubble) +
    rect(5, h - 12, inner - 5, 5, 2.5, D.chrome) +
    rect(2.5, 2.5, inner, h - 5, 3.5, ref('screen-glare'))
  );
}

/** Keyboard keys and trackpad, drawn flat for the deck: 4 rows, as many columns as fit. */
function keyboardArt(w) {
  const columns = Math.floor((w - 6) / 4.7);
  let keys = '';
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < columns; col++) keys += `<rect x="${R(3 + col * 4.7)}" y="${R(2.5 + row * 4.3)}" width="3.8" height="3.3" rx=".7"/>`;
  return keys + `<rect x="${R(w / 2 - 10)}" y="21.5" width="20" height="9" rx="1.6"/>`;
}

/** Padding that makes the bounds cover the name pill below and the tag stack above the screen. */
function boundsPad(tags, cx, outline) {
  const half = Math.max(0, ...(tags || []).map((t) => pillWidth(t.text, config.pill.size, !!t.icon) / 2));
  const xs = outline.map((p) => p[0]);
  return [
    Math.max(8, Math.min(...xs) - (cx - half) + 8),
    18 + (tags || []).length * config.pill.step,
    Math.max(8, cx + half + 8 - Math.max(...xs)),
    40,
  ];
}

/**
 * Render a device.
 * @param {object} e entity state, see `device.defaults`
 * @returns {{ body: string, over: string, poly: number[][], bounds: number[] }}
 */
export function renderDevice(e) {
  const D = config.device;
  const phone = e.form === 'phone';
  const x0 = e.x - e.d / 2;
  const x1 = e.x + e.d / 2;
  const y0 = e.y - e.w / 2;
  const y1 = e.y + e.w / 2;
  const base = boxGeom(x0, x1, y0, y1, BASE_HEIGHT, 9);
  const lift = e.lift;

  // the upright screen: a thin prism whose big face looks towards +x
  const screen = phone
    ? { x0: e.x - 0.2, x1: e.x + 0.25, y0: e.y - 1.2, y1: e.y + 1.2, z0: BASE_HEIGHT + 1, z1: BASE_HEIGHT + 64 }
    : { x0: x0 + 0.7, x1: x0 + 1.05, y0: y0 + 0.9, y1: y1 - 0.9, z0: 19, z1: 66 };
  const screenW = (screen.y1 - screen.y0) * config.unit;
  const screenH = screen.z1 - screen.z0;
  const art = `<g transform="${faceMatrix('wall', screen.x1, screen.y0, screen.z1)}">${phone ? chatArt(screenW, screenH) : browserArt(screenW, screenH)}</g>`;

  let parts;
  if (phone) {
    parts =
      contactShadow(screen.x0 - 0.5, screen.x1 + 0.9, screen.y0 - 0.3, screen.y1 + 0.3, 5, '.16') +
      prism(screen, D.bezel, { r: 3.5, sw: 1.5 }) +
      art;
  } else {
    const deck = { x0: screen.x1, x1: screen.x1 + 2.7, y0: screen.y0, y1: screen.y1, z0: BASE_HEIGHT, z1: 19 };
    parts =
      contactShadow(screen.x0 - 0.3, deck.x1 + 0.3, screen.y0 - 0.3, screen.y1 + 0.3, 6, '.14') +
      prism(deck, D.deck, { r: 2.5, sw: 1.4 }) +
      `<g transform="${faceMatrix('floorY', deck.x0 + 0.15, deck.y0, deck.z1)}" fill="${D.key}" stroke="${D.keyStroke}" stroke-width=".55">${keyboardArt(screenW)}</g>` +
      prism(screen, D.bezel, { r: 3, sw: 1.5 }) +
      art;
  }
  const body =
    `<g opacity="${R(e.opacity)}">` +
    dropShadow(base, BASE_HEIGHT, lift, 0.2) +
    `<g transform="translate(0 ${R(-lift)})">${paintBox(base, 'slab', { stroke: config.colors.slabStroke, sw: 1.5 })}${parts}</g></g>`;

  // name pill under the front corner, tags stacked above the top edge of the screen
  const [nameX, nameY] = base.Bd;
  const [tagX, tagY] = iso(screen.x0, (screen.y0 + screen.y1) / 2, screen.z1);
  let over = e.label ? `<g opacity="${R(e.labelFade ?? 1)}">${pill(nameX, nameY + 22, e.label, { icon: 'user' })}</g>` : '';
  let y = tagY - (phone ? 20 : 22);
  for (const tag of e.tags || []) {
    over += `<g transform="translate(0 ${R(y)})" opacity="${R(e.tagFade ?? 1)}">${pill(tagX, 0, tag.text, tag)}</g>`;
    y -= config.pill.step;
  }
  return {
    body,
    over: over ? `<g opacity="${R(e.opacity)}" transform="translate(0 ${R(-lift)})">${over}</g>` : '',
    poly: base.outline.map(([px, py]) => [px, py - lift]),
    bounds: bbox([...base.outline, [tagX, tagY]], boundsPad(e.tags, tagX, base.outline)),
  };
}

/** Registration record for `device`. */
export const device = {
  defaults: {
    form: 'laptop', // 'laptop' or 'phone'
    w: 6, // slab width along world y, grid units
    d: 6, // slab depth along world x, grid units
    label: '', // pill under the front corner, with a "user" icon
    tags: [], // pills stacked above the screen
    opacity: 1,
    lift: 0,
  },
  enterFrom: { lift: 40 },
  footprint: (e) => [e.x - e.d / 2, e.x + e.d / 2, e.y - e.w / 2, e.y + e.w / 2],
  render: renderDevice,
};
