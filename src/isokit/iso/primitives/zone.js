/**
 * zone — a dashed region painted on the floor, with a label lying flat on the floor.
 * Zones group things (a data centre, a network, a pipeline). They sit under the links and
 * never hide anything.
 */
import { config } from '../config.js';
import { R, esc } from '../util.js';
import { iso, faceMatrix } from '../projection.js';
import { bbox, roundedPolygon } from '../geometry.js';

const LABEL_SIZE = 10.5; // px
const LABEL_SPACING = 1.6; // letter-spacing, px

/** World position of the label's baseline start. */
function labelOrigin(e) {
  const alongY = e.labelAlong === 'y';
  return [e.labelX ?? (alongY ? e.x0 + 1.3 : e.x0 + 0.9), e.labelY ?? (alongY ? e.y0 + 0.8 : e.y0 + 0.55)];
}

/**
 * The world rectangle a zone's flat label covers, so layouts can keep it clear.
 * One character advances `(size × charWidth + letter-spacing) / unit` grid units.
 * @param {object} e zone state
 * @returns {[number, number, number, number]} `[x0, x1, y0, y1]` in grid units
 */
export function zoneLabelBox(e) {
  const [lx, ly] = labelOrigin(e);
  const length = (String(e.label || '').length * (LABEL_SIZE * config.charWidth + LABEL_SPACING)) / config.unit;
  const height = LABEL_SIZE / config.unit;
  return e.labelAlong === 'y' ? [lx - height, lx, ly, ly + length] : [lx, lx + length, ly, ly + height];
}

/**
 * Render a zone.
 * @param {object} e entity state, see `zone.defaults`; needs `x0, x1, y0, y1`
 * @returns {{ body: string, over: string, poly: number[][], bounds: number[] }}
 */
export function renderZone(e) {
  const corners = [iso(e.x0, e.y0), iso(e.x0, e.y1), iso(e.x1, e.y1), iso(e.x1, e.y0)];
  let label = '';
  if (e.label) {
    const [lx, ly] = labelOrigin(e);
    // the text is written flat, then laid on the floor by one matrix
    label = `<text transform="${faceMatrix(e.labelAlong === 'y' ? 'floorY' : 'floorX', lx, ly, 0)}" font-size="${LABEL_SIZE}" font-weight="800" letter-spacing="${LABEL_SPACING}" fill="${config.colors.muted}">${esc(e.label)}</text>`;
  }
  return {
    body:
      `<g opacity="${R(e.opacity)}">` +
      `<path d="${roundedPolygon(corners, 8)}" fill="${config.colors.zoneFill}" fill-opacity=".55" stroke="${config.ink}" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="6 5"/>` +
      label +
      `</g>`,
    over: '',
    poly: corners,
    bounds: bbox(corners, [6, 6, 6, 6]),
  };
}

/** Registration record for `zone`. */
export const zone = {
  defaults: {
    label: '', // written as given; lessons write it in capitals
    labelAlong: 'x', // 'x': along the front-left edge. 'y': along the back-left edge (kit addition)
    opacity: 1,
  },
  enterFrom: {},
  exitTo: {},
  layer: 'floor',
  spot: false,
  obstacle: false,
  depth: () => -1e4,
  render: renderZone,
};
