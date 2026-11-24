/**
 * Stroke icons for the diagram: on block lids, inside pills, in card headers.
 *
 * An icon is the inner SVG markup of a 24×24 drawing. The wrapper supplies
 * `fill="none"`, the stroke colour, round caps and joins, so a body is just shapes:
 * `'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>'`.
 * Use `fill="currentColor"` inside a body for a solid part.
 *
 * This is a small starter set. Add a whole icon pack with `registerIcons(map)`.
 */
import { config } from './config.js';
import { R } from './util.js';

const bolt = '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>';
const cube = '<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>';
const refresh = '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>';

/** The icon bodies, by name. Treat as read-only; use `registerIcon` to add or replace. */
export const icons = {
  server: '<rect x="3" y="3.5" width="18" height="7" rx="2"/><rect x="3" y="13.5" width="18" height="7" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
  balancer: '<circle cx="5" cy="12" r="2.2" fill="currentColor"/><path d="M7.5 12h3.5M11 12c3 0 3-6 7-6M11 12c3 0 3 6 7 6M11 12h7"/><path d="M16 4l2.5 2-2.5 2M16 10l2.5 2-2.5 2M16 16l2.5 2-2.5 2"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.8 3.5 5.7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 2v4M14.5 2v4M9.5 18v4M14.5 18v4M2 9.5h4M2 14.5h4M18 9.5h4M18 14.5h4"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4M12 17h.01"/>',
  sparkles: '<path d="M11 3.5 12.9 9.1 18.5 11l-5.6 1.9L11 18.5l-1.9-5.6L3.5 11l5.6-1.9z"/><path d="M19 2.5v4M17 4.5h4"/><circle cx="19" cy="19" r="1.6"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  refresh,
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  bolt,
  zap: bolt,
  layers: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="M2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.5 11.5 20 3M16.5 6.5l3 3M14 9l2 2"/>',
  cloud: '<path d="M7 19a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.75 4.75 0 0 1-.5 9.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5v-4M9.5 2.5h5M12 2.5V6"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7.5 3c0 5 4.5 5.5 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 5.5-4.5 9s4.5 4 4.5 9"/>',
  check: '<path d="M4.5 12.5 10 18 19.5 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  filter: '<path d="M3.5 5h17L14 12.5V19l-4-2v-4.5z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6z"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  trendingUp: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  gauge: '<path d="M4.5 18a9 9 0 1 1 15 0"/><path d="m12 13 4-5"/><circle cx="12" cy="13" r="1.2"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  smartphone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/>',
  cube,
  box: cube,
  package: '<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.2l8.4 4.5"/>',
  cart: '<path d="M3 4h2.5l2.2 10.5h10l1.8-7.5H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  route: '<circle cx="6" cy="18.5" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><path d="M8.5 18.5H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  split: '<path d="M3 12h6M9 12c3.5 0 3.5-6 7-6h5M9 12c3.5 0 3.5 6 7 6h5M18.5 3.5 21 6l-2.5 2.5M18.5 15.5 21 18l-2.5 2.5"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
};

/**
 * Add or replace one icon.
 * @param {string} name
 * @param {string} body inner SVG markup drawn in a 24×24 box, stroke-only unless a shape sets its own fill
 */
export function registerIcon(name, body) {
  icons[name] = String(body);
}

/**
 * Add or replace many icons at once, e.g. the kit's full icon set.
 * @param {Record<string, string>} map name → inner SVG markup
 */
export function registerIcons(map) {
  for (const [name, body] of Object.entries(map || {})) registerIcon(name, body);
}

/** @param {string} name @returns {boolean} whether an icon with this name exists */
export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(icons, name);

/**
 * Draw an icon centred on a point. The 24-unit drawing is scaled to `size`, and the stroke
 * width is divided by the same factor, so `stroke` is the width you see on screen.
 * An unknown name draws nothing.
 * @param {string} name icon name
 * @param {number} cx centre x in px
 * @param {number} cy centre y in px
 * @param {number} [size=22] rendered width and height in px
 * @param {{ color?: string, stroke?: number, fill?: string }} [style] stroke colour (default `config.colors.glyph`), visible stroke width in px (default 1.9), fill (default none)
 * @returns {string} an SVG `<g>`, or `''`
 */
export function glyph(name, cx, cy, size = 22, { color = config.colors.glyph, stroke = 1.9, fill = 'none' } = {}) {
  const body = icons[name];
  if (!body) return '';
  const k = size / 24;
  return `<g transform="translate(${R(cx - size / 2)} ${R(cy - size / 2)}) scale(${+k.toFixed(4)})" fill="${fill}" stroke="${color}" color="${color}" stroke-width="${R(stroke / k)}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}
