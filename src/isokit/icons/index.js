/**
 * isokit icons: 127 stroke icons as plain strings, and the helpers that wrap them.
 *
 *   import { iconHtml, iconSvg } from './isokit/icons/index.js';
 *   button.innerHTML = iconHtml('replay', { size: 15, stroke: 2 }) + '<span>Replay</span>';
 *   svgMarkup += iconSvg('database', x, y, 19, { stroke: 1.8 });
 */
export { icons } from './icons.js';
export { iconHtml, iconSvg, registerIcons, hasIcon, iconNames, iconConfig } from './render.js';
export { folderHtml, folderConfig } from './folder.js';
