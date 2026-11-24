/**
 * The built-in primitives. Importing this module registers all ten types.
 *
 * Nine come from the original site (block, crowd, ghost, device, db, zone, queue, panel,
 * ring). `note` is the simple card of the earlier single-file engine.
 */
import { registerPrimitive } from '../registry.js';
import { block } from './block.js';
import { crowd } from './crowd.js';
import { ghost } from './ghost.js';
import { device } from './device.js';
import { db } from './db.js';
import { zone } from './zone.js';
import { queue } from './queue.js';
import { panel } from './panel.js';
import { ring } from './ring.js';
import { note } from './note.js';

/** The registration records, by type name. */
export const builtins = { block, crowd, ghost, device, db, zone, queue, panel, ring, note };

/**
 * Register every built-in primitive. Runs once when this module is imported; call it again
 * to restore a built-in after replacing it.
 */
export function registerBuiltins() {
  for (const [type, def] of Object.entries(builtins)) registerPrimitive(type, def);
}
registerBuiltins();

export { block, renderBlock, labelLines, registerLidGlyph } from './block.js';
export { crowd, renderCrowd, person, crowdSeats, crowdCapacity } from './crowd.js';
export { ghost, renderGhost } from './ghost.js';
export { device, renderDevice } from './device.js';
export { db, renderDb } from './db.js';
export { zone, renderZone, zoneLabelBox } from './zone.js';
export { queue, renderQueue } from './queue.js';
export { panel, renderPanel, panelSize } from './panel.js';
export { registerPanelChart, panelChart, latencyCurve } from './panel-charts.js';
export { ring, renderRing, ringOwner, ringPoint } from './ring.js';
export { note, renderNote } from './note.js';
