/**
 * isokit/iso — the isometric drawing core: projection, geometry, paint, text, pills, icons,
 * the dark-mode colour remap, ten primitives and a static renderer.
 *
 * Importing this file registers the built-in primitives. It does not touch the DOM.
 * See README.md in this folder for the API and examples.
 */
import { R, clamp01, lerp, esc } from './util.js';
import { iso } from './projection.js';
import { roundedPolygon, roundedPolyline, bbox } from './geometry.js';
import { boxGeom, paintBox, dropShadow, prism } from './paint.js';
import { glyph } from './icons.js';
import { pill, cpuPill, pillWidth, entityPills, pillsHalfWidth, stackPills } from './pills.js';
import { textWidth, svgText } from './text.js';
import { labelLines } from './primitives/block.js';
import './primitives/index.js';

/** Version of the kit's iso module. */
export const version = '2.0.0';

export { config, configure, onConfigure, paletteName, paletteOf, loadColor, loadLevel } from './config.js';
export { SVG_NS, R, clamp01, lerp, esc, same, svgEl, deepMerge } from './util.js';
export { iso, unproject, faceMatrix } from './projection.js';
export { roundedPolygon, roundedPolyline, insideConvex, trimStart, trimEnd, trimToOutlines, bbox, union, overlapArea, pointAt } from './geometry.js';
export { hexToHsl, hslToHex, normalizeHex, toDark, themed, isDark } from './color.js';
export { defId, ref, defsMarkup, gridLayer, cssText, addCss, ensureCss, ensureDefs, refreshDefs } from './defs.js';
export { textWidth, clearTextCache, lineHeight, textDir, dirAttr, upper, svgText } from './text.js';
export { icons, registerIcon, registerIcons, hasIcon, glyph } from './icons.js';
export { pill, pillLayout, pillWidth, cpuPill, CPU_PILL_WIDTH, entityPills, pillsHalfWidth, stackPills, widenForPills } from './pills.js';
export { boxGeom, paintBox, dropShadow, liftFade, prism } from './paint.js';
export { registerPrimitive, primitive, primitiveTypes, resolveDefaults, centerOf, footprintOf, depthOf, renderEntity, meta, extendMeta } from './registry.js';
export {
  builtins,
  registerBuiltins,
  labelLines,
  registerLidGlyph,
  person,
  crowdSeats,
  crowdCapacity,
  zoneLabelBox,
  panelSize,
  registerPanelChart,
  panelChart,
  latencyCurve,
  ringOwner,
  ringPoint,
} from './primitives/index.js';
export { packetShape } from './packets.js';
export { renderStatic, staticLayers, linkPoints, resolveWaypoints, linkStyles, LINK_LABEL_SIZE } from './static.js';

/**
 * The drawing toolkit for custom primitives, grouped under one name:
 * `import { draw } from './iso/index.js'` then `draw.boxGeom(...)`, `draw.pill(...)`.
 */
export const draw = {
  R,
  clamp01,
  lerp,
  esc,
  iso,
  roundedPolygon,
  roundedPolyline,
  bbox,
  boxGeom,
  paintBox,
  dropShadow,
  prism,
  glyph,
  pill,
  cpuPill,
  pillWidth,
  textWidth,
  svgText,
  entityPills,
  pillsHalfWidth,
  stackPills,
  labelLines,
};
