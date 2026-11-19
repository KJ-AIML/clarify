// clarify/src/free/kit.js
// The kit's SVG half. FX_DEFS is a hidden <svg> of shared patterns that render.js puts right after SVG_DEFS
// on a page with a free section, so any section can hatch a shape for "up to" or "varies":
// <rect class="fx-ink" fill="url(#fx-hatch-slow)" …/>. The CSS half is src/runtime/fx.css.

/** Each colour role and its token, as in fx.css: hot moves, good answers, bad fails, slow waits, cool is other traffic. */
const ROLES = [["hot", "--trace-0"], ["good", "--ok-line"], ["bad", "--no-line"], ["slow", "--warn-line"], ["cool", "--trace-1"]];

/**
 * One hatch: the role's soft tint (as `.fx-ROLE-fill`), crossed by 2-unit stripes in the role colour,
 * 6 units apart at 45°, the same as `.fx-bar.is-varies`. Inline styles, so the tokens follow the theme.
 */
const hatch = ([role, token]) =>
  `<pattern id="fx-hatch-${role}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
  `<rect width="6" height="6" style="fill:color-mix(in srgb,var(${token}) 26%,var(--node-bg))"/>` +
  `<path d="M3 0V6" style="stroke:var(${token});stroke-width:2"/></pattern>`;

export const FX_DEFS = `<svg id="fx-defs" width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${ROLES.map(hatch).join("")}</defs></svg>`;
