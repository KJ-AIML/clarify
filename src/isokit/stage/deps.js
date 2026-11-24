/**
 * The seam between the stage and the drawing core.
 *
 * Every other file in this folder imports the drawing core from here and from nowhere else.
 * To move the stage onto another core, change the one import line below; nothing else in
 * stage/ needs to know.
 *
 * What the stage needs from a core:
 *   config        live theme object: unit, ink, hard, font, palette, tones (grid/spot colours optional)
 *   configure     (overrides) => config; also used to flush the core's text-measure cache
 *   primitive     (type) => { defaults, render(state), layer?, spot?, obstacle?, card?, depth?, enterFrom?, exitTo? }
 *                 render returns { body, over, poly, bounds, size? }
 *   centerOf      (state) => [x, y] in world units
 *   footprintOf   (state) => [x0, x1, y0, y1] in world units
 *   themed        (svgMarkup) => markup with colours remapped when the page is dark
 *   isDark        () => boolean
 *   toDark        (hex) => hex
 *   toolkit       R, esc, iso, roundedPolygon, roundedPolyline, pill, textWidth
 *                 (looked up at the top level first, then inside the `draw` group)
 *
 * Optional hooks: when the core exports them the stage uses them instead of its local stand-ins
 * (defs.js, and a `configure({})` call to flush text widths).
 */
import * as core from '../iso/index.js';

const tool = (name) => core[name] ?? (core.draw ? core.draw[name] : undefined);

export const config = core.config;
export const configure = core.configure;
export const primitive = core.primitive;
export const centerOf = core.centerOf;
export const footprintOf = core.footprintOf;
export const themed = core.themed;
export const isDark = core.isDark;
export const toDark = core.toDark;

export const R = tool('R');
export const esc = tool('esc');
export const iso = tool('iso');
export const roundedPolygon = tool('roundedPolygon');
export const roundedPolyline = tool('roundedPolyline');
export const pill = tool('pill');
export const textWidth = tool('textWidth');

/** `() => void` that creates the shared `<defs>` if the core owns them, else null (stage/defs.js is used). */
export const coreEnsureDefs = core.ensureDefs ?? null;
/** `() => void` that rebuilds the core's shared `<defs>` after a theme change, else null. */
export const coreRefreshDefs = core.refreshDefs ?? null;
/** Forget measured text widths (a web font arrived). A core without `clearTextCache` gets a `configure({})` call instead. */
export const flushTextCache = core.clearTextCache ?? (() => core.configure({}));
