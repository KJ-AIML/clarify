/**
 * The shapes of the packets that travel along links. The stage animates them; they live
 * here so a still picture or a legend can draw the same shapes.
 */

/**
 * Inner SVG for a packet, centred on (0, 0). Colours come from CSS classes on the wrapper
 * (`iso-pkt iso-pkt--<kind>`), which belong to the stage.
 *
 * | kind               | shape                         |
 * | ------------------ | ----------------------------- |
 * | `ping`, `kill`     | circle, radius 3.6            |
 * | `heavy`            | square 12, corner radius 3.5  |
 * | `write`            | square 8.4, corner radius 2   |
 * | `msg`, `poison`    | square 9.6, corner radius 2.4 |
 * | anything else      | circle, radius 4.3            |
 *
 * @param {string} kind
 * @returns {string} SVG markup
 */
export function packetShape(kind) {
  const square = (size, rx) => `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${rx}"/>`;
  if (kind === 'ping' || kind === 'kill') return '<circle r="3.6"/>';
  if (kind === 'heavy') return square(12, 3.5);
  if (kind === 'write') return square(8.4, 2);
  if (kind === 'msg' || kind === 'poison') return square(9.6, 2.4);
  return '<circle r="4.3"/>';
}
