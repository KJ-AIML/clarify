/**
 * The small coloured folder shown next to each module in the course list and in search results.
 *
 * It is not a stroke icon: it is a filled 20×16 shape whose colours come from CSS, one tone per module
 * (`.ik-folder--sand`, `.ik-folder--green` …). The stylesheet for those tones lives with the course list
 * in `ui/`. The drawing here is the kit's own; the size, the class structure and the "lip" line across
 * the body follow the original so the same CSS applies.
 */

/** Size of the folder and the tone names the original course uses for its nine modules. */
export const folderConfig = {
  width: 20,
  height: 16,
  tones: ['sand', 'green', 'violet', 'orange', 'blue', 'teal', 'rose', 'olive', 'slate'],
};

/**
 * @param {string} tone module colour name; becomes the modifier class `ik-folder--<tone>`
 * @param {object} [opts]
 * @param {number} [opts.width=20] CSS pixels
 * @param {number} [opts.height=16] CSS pixels
 * @returns {string} `<svg class="ik-folder ik-folder--tone" …>`: a body path and a `.ik-folder__lip` path
 */
export function folderHtml(tone, { width = folderConfig.width, height = folderConfig.height } = {}) {
  return `<svg class="ik-folder ik-folder--${tone}" width="${width}" height="${height}" viewBox="0 0 20 16" aria-hidden="true"><path d="M1.25 3.25a2 2 0 0 1 2-2h4l2.05 2.2h7.45a2 2 0 0 1 2 2v8.3a2 2 0 0 1-2 2H3.25a2 2 0 0 1-2-2Z"/><path class="ik-folder__lip" d="M1.25 6.25h17.5"/></svg>`;
}
