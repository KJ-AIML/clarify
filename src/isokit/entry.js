// clarify/src/isokit/entry.js
// Single-file browser runtime entry for isokit inside Clarify (bundled to src/runtime/isokit.js).
import * as iso from './iso/index.js';
import * as stage from './stage/index.js';
import * as motion from './motion/index.js';
import * as icons from './icons/index.js';

iso.registerIcons(icons.icons);
iso.extendMeta({
  linkStyles: [...stage.LINK_STYLES, 'muted'],
  linkHeads: [...stage.LINK_HEADS],
  packetKinds: [...stage.PACKET_KINDS],
});
iso.configure({
  font: '"JetBrains Mono", "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Consolas, "Leelawadee UI", Thonburi, monospace',
  palette: {
    teal: { top: ['#d3f3f1', '#b5e7e4'], side: ['#9fdad6', '#87ccc8'] },
  },
});

function configure(overrides = {}) {
  const { timings, packet, zoom, grid, spot, zone, darkMap, stage: stageOverrides, page, ...core } = overrides;
  const forStage = { ...(stageOverrides || {}) };
  if (timings) forStage.timings = { ...timings, ...forStage.timings };
  if (packet) forStage.packets = { ...packet, ...forStage.packets };
  if (zoom) {
    const camera = {};
    if (zoom.max != null) camera.maxZoom = zoom.max;
    if (zoom.min != null) camera.minZoom = zoom.min;
    if (zoom.margin != null) camera.pad = zoom.margin;
    forStage.camera = { ...camera, ...forStage.camera };
  }
  const colors = { ...core.colors };
  if (grid) colors.grid = grid;
  if (zone && zone.fill) colors.zoneFill = zone.fill;
  if (zone && zone.label) colors.muted = zone.label;
  if (Object.keys(colors).length) core.colors = colors;
  if (darkMap) core.dark = { ...core.dark, map: { ...darkMap, ...(core.dark && core.dark.map) } };
  if (spot) iso.addCss(`svg.iso-stage-svg{--iso-spot:${spot};--iso-spot-fill:${spot}1f}`);
  if (Object.keys(forStage).length) stage.configureStage(forStage);
  return iso.configure(core);
}

const IsoDiagram = {
  version: '2.0.0-clarify',
  config: iso.config,
  configure,
  meta: iso.meta,
  Stage: stage.Stage,
  resolveLesson: stage.resolveLesson,
  scenesOf: stage.scenesOf,
  registerPrimitive: iso.registerPrimitive,
  registerIcon: iso.registerIcon,
  primitive: iso.primitive,
  centerOf: iso.centerOf,
  footprintOf: iso.footprintOf,
  zoneLabelBox: iso.zoneLabelBox,
  packetShape: iso.packetShape,
  addCss: iso.addCss,
  themed: iso.themed,
  isDark: iso.isDark,
  toDark: iso.toDark,
  draw: iso.draw,
  stageConfig: stage.stageConfig,
  configureStage: stage.configureStage,
  renderStatic: iso.renderStatic,
  iso,
  stage,
  motion,
  icons,
};

globalThis.IsoDiagram = IsoDiagram;
export default IsoDiagram;
