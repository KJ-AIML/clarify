/**
 * The animated stage. `Stage` is the whole thing; the other exports are its parts, each usable
 * on its own (see README.md).
 */
export { Stage } from './stage.js';
export { resolveLesson, scenesOf } from './lesson.js';
export { stageConfig, configureStage, mergeConfig } from './config.js';

// scene model
export { same, withDefaults, normalizeScene, depthOf, targetStates, diffEntities, diffLinks, describeChange, spotTargets } from './diff.js';
export { scheduleTransition, sampleEntityTween, enterState, exitState, enterTween, exitTween, moveTween } from './schedule.js';
export { layoutScene } from './layout.js';
export { createEntity, removeEntityNodes, renderEntity, sortByDepth } from './entities.js';

// camera, user view, docked cards
export {
  quantizeZoom, fitZoom, frameBounds, fitCamera, planCamera, planSequence,
  viewCamera, clampView, zoomViewAt, panView, blendCamera, lerpCamera, applyCamera,
} from './camera.js';
export { ViewState } from './view.js';
export { isCard, isDockedCard, cardSize, hudScaleFor, cardsVisible, cardFootprint, dockRect, cardClear, dockedCardMarkup } from './cards.js';

// links and labels
export {
  LINK_STYLES, LINK_HEADS, linkStyle, linkHeads, resolveWaypoint, routeLink,
  createLink, styleLink, removeLink, drawLink, hideLink, labelMarkup, drawLabel,
} from './links.js';
export { labelSize, placeLabel, labelCost, collectObstacles, wrapLabel, solveLabels } from './labels.js';
export {
  overlapArea, rectsOverlap, unionRect, growRect, boundsOf, pointInPolygon, segmentsCross, polygonHitsRect,
  pointAlong, samplePolyline, insideConvex, trimStart, trimEnd,
} from './geometry.js';

// traffic and effects
export { PacketRunner, pickRoute, packetMarkup, registerPacketKind, PACKET_KINDS, PACKET_SHAPES } from './packets.js';
export { burst, spotlight, canSpotlight } from './fx.js';

// input, debugging, DOM plumbing
export { attachGestures, GESTURE_DEFAULTS } from './gestures.js';
export { drawXray, clearXray } from './xray.js';
export { STAGE_CSS, ensureStageStyles } from './styles.js';
export { defsMarkup, ensureDefs, refreshDefs, defId } from './defs.js';
export { SVG_NS, svgEl, stageMarkup, LAYERS } from './svg.js';
