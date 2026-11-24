/**
 * Shared SVG `<defs>`: gradients, blur filters, arrowhead markers and the floor-grid tile, kept
 * in one hidden `<svg>` at the end of `<body>` so several stages (and static figures) can share them.
 *
 * FALLBACK. The definitions belong to the drawing core. When deps.js finds `ensureDefs` /
 * `refreshDefs` on the core (the kit's own `iso/` exports both), those are used and nothing here
 * runs. This file only matters when the stage is pointed at a core that does not provide them.
 *
 * Arrowhead and grid numbers are the original's (`jr`, index.pretty.js:5927-5935). The original
 * keeps its defs inside the stage `<svg>` and rewrites them on a theme change (`retheme`, 18849).
 */
import { config, coreEnsureDefs, coreRefreshDefs, themed } from './deps.js';
import { svgEl } from './svg.js';

const HOST_ID = 'iso-stage-defs';

/** Id of a shared definition, e.g. `defId('arrow')` → `iso-arrow`. */
export const defId = (name) => `${config.idPrefix || 'iso-'}${name}`;

/** Markup of every shared definition, in light-mode colours. */
export function defsMarkup() {
  const U = config.unit, grid = (config.colors && config.colors.grid) || config.grid || '#a8916f';
  let gradients = '';
  for (const [name, c] of Object.entries(config.palette)) {
    gradients += `<linearGradient id="iso-${name}-top" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${c.top[0]}"/><stop offset="1" stop-color="${c.top[1]}"/></linearGradient>
      <linearGradient id="iso-${name}-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.side[0]}"/><stop offset="1" stop-color="${c.side[1]}"/></linearGradient>`;
  }
  const arrow = (id, colour) => `<marker id="${id}" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth">
      <path d="M1,1.2 L9,5 L1,8.8 Z" fill="${colour}" stroke="${colour}" stroke-width="1" stroke-linejoin="round"/></marker>`;
  return `${gradients}
    <linearGradient id="iso-cyl-sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".3" stop-color="#ffffff" stop-opacity=".35"/>
      <stop offset=".55" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="#4b2f6b" stop-opacity=".08"/>
    </linearGradient>
    <linearGradient id="iso-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E3D6F3"/><stop offset="1" stop-color="#C9B5E6"/></linearGradient>
    <filter id="iso-blur-s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="iso-blur-l" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6.5"/></filter>
    <filter id="iso-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
    ${arrow('iso-arrow', config.ink)}
    ${arrow('iso-arrow-muted', '#a59c90')}
    <pattern id="iso-grid" patternUnits="userSpaceOnUse" x="0" y="${-U / 2}" width="${2 * U}" height="${U}">
      <path d="M0 ${U / 2} L${U} 0 L${2 * U} ${U / 2} L${U} ${U} Z" fill="none" stroke="${grid}" stroke-opacity=".3" stroke-width=".8"/>
    </pattern>`;
}

/**
 * Make sure the shared definitions exist in the document. Safe to call many times.
 * @param {Document} [doc]
 */
export function ensureDefs(doc = document) {
  if (coreEnsureDefs) return coreEnsureDefs();
  if (doc.getElementById(HOST_ID)) return;
  const svg = svgEl('svg', { id: HOST_ID, 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0 });
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.appendChild(svgEl('defs'));
  doc.body.appendChild(svg);
  refreshDefs(doc);
}

/**
 * Rebuild the definitions: after a theme flip (colours are remapped for dark) or a palette change.
 * @param {Document} [doc]
 */
export function refreshDefs(doc = document) {
  if (coreRefreshDefs) return coreRefreshDefs();
  const host = doc.getElementById(HOST_ID);
  if (host) host.firstChild.innerHTML = themed(defsMarkup());
}
