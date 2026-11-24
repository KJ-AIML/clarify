/**
 * Lesson resolving. A lesson is plain data; every step's scene is a full keyframe. To keep those
 * keyframes short, a lesson may define `components` (named entity templates) and `wires` (named
 * link templates) once, and refer to them from each scene with `use`.
 *
 *   components: { app: { type: 'block', color: 'sky', label: ['App'] } }
 *   wires:      { 'lb-a': { from: 'lb', to: 'a', pts: ['lb', 'a'] } }
 *   scene:      { entities: { a: { use: 'app', x: 6, y: 2, cpu: 0.4 } }, links: ['lb-a', { use: 'lb-a', id: 'x', label: 'GET' }] }
 *
 * This is the kit's authoring format (the original builds its scenes with helper functions in
 * each lesson file instead). No DOM.
 */

/**
 * Expand `components` and `wires` into full scenes.
 *
 * Entities: `{ use, ...overrides }` becomes `{ ...components[use], ...overrides }`. A falsy entity is dropped.
 * Links may be a list or a map:
 *   list   `'id'`                       the wire with that id
 *          `{ use | id, ...overrides }` the wire named `use` (or `id`), stored under `id` (or `use`)
 *   map    `{ id: true }` or `{ id: { use?, ...overrides } }`
 * Every link gets `heads: 'end'` unless the wire or the override says otherwise.
 *
 * @param {{ components?: Record<string, object>, wires?: Record<string, object>, steps?: object[] }} lesson
 * @returns {object} a copy of the lesson whose steps all have `scene: { entities, links, flows }`
 */
export function resolveLesson(lesson) {
  const components = lesson.components || {}, wires = lesson.wires || {};
  const steps = (lesson.steps || []).map((step) => {
    const scene = step.scene || {}, entities = {}, links = {};
    for (const [id, raw] of Object.entries(scene.entities || {})) {
      if (!raw) continue;
      const { use, ...rest } = raw;
      entities[id] = { ...(use ? components[use] : null), ...rest };
    }
    const put = (id, override) => {
      const { use, id: _ignored, ...rest } = override || {};
      links[id] = { heads: 'end', ...(wires[use || id] || {}), ...rest };
    };
    if (Array.isArray(scene.links)) {
      for (const l of scene.links) {
        if (typeof l === 'string') put(l);
        else put(l.id || l.use, l);
      }
    } else {
      for (const [id, override] of Object.entries(scene.links || {})) put(id, override === true ? {} : override);
    }
    return { ...step, scene: { entities, links, flows: scene.flows || [] } };
  });
  return { ...lesson, steps };
}

/**
 * The scenes of a resolved lesson, in step order: what `stage.setScenes` wants.
 * @param {{ steps: { scene: object }[] }} lesson
 * @returns {object[]}
 */
export const scenesOf = (lesson) => lesson.steps.map((step) => step.scene);
