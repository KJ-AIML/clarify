/**
 * The user's zoom and pan, kept separate from the planned camera.
 *
 * The stage plans a camera per step. The user may zoom into it and pan around; that is a second,
 * smaller rectangle inside the planned one (a "view": a factor and a centre). Step changes and
 * resizes drop the view; a double-click or `reset()` animates out of it.
 *
 * Original: `view`, `blend`, `displayCam`, `setView`, `clearView`, `zoomAt`, `panBy`,
 * `toggleZoomAt`, `fit` (index.pretty.js:18475-18583). This class holds the state and calls
 * back; it does not touch the DOM, so it can sit on top of any viewBox camera.
 */
import { stageConfig } from './config.js';
import { blendCamera, clampView, panView, viewCamera, zoomViewAt } from './camera.js';

export class ViewState {
  /**
   * @param {object} o
   * @param {() => { x: number, y: number, w: number, h: number }} o.camera  the planned camera right now
   * @param {() => number} o.hostWidth      host width in px
   * @param {() => number} o.now            clock in ms (for the 360 ms blend)
   * @param {() => void} o.apply            called after every change: redraw with `shown()`
   * @param {(zoomed: boolean) => void} [o.onChange]  called when the stage enters or leaves the zoomed state
   * @param {{ view?: typeof stageConfig.view, blendMs?: number }} [o.config]
   */
  constructor({ camera, hostWidth, now, apply, onChange = () => {}, config = {} }) {
    this.camera = camera;
    this.hostWidth = hostWidth;
    this.now = now;
    this.apply = apply;
    this.onChange = onChange;
    this.opts = config.view || stageConfig.view;
    this.blendMs = config.blendMs ?? stageConfig.timings.viewBlend;
    /** @type {{ k: number, cx: number, cy: number } | null} */
    this.view = null;
    /** @type {{ from: object, start: number, dur: number } | null} */
    this.blend = null;
  }
  /** True while the user is zoomed in. */
  get zoomed() { return !!this.view; }
  /** True while a zoom animation is running. */
  get blending() { return !!this.blend; }
  /**
   * The camera to display for a planned camera: narrowed by the view, mid-blend if one is running.
   * @param {object} [cam]
   */
  shown(cam = this.camera()) {
    const { cam: out, done } = blendCamera(this.blend, viewCamera(cam, this.view), this.now());
    if (done) this.blend = null;
    return out;
  }
  /**
   * Replace the view. It is clamped; a factor of ~1 means "no view".
   * @param {{ k: number, cx: number, cy: number } | null} view
   * @param {boolean} [animate]  ease from what is shown now to the new view over 360 ms
   */
  set(view, animate = false) {
    const was = this.zoomed, from = animate ? { ...this.shown() } : null;
    this.view = clampView(view, this.camera(), this.hostWidth(), this.opts);
    this.blend = animate ? { from, start: this.now(), dur: this.blendMs } : null;
    this.apply();
    if (was !== this.zoomed) this.onChange(this.zoomed);
  }
  /** Drop the view at once, without animation and without redrawing (a transition is about to move the camera). */
  clear() {
    if (!this.view && !this.blend) return;
    const was = this.zoomed;
    this.view = null;
    this.blend = null;
    if (was) this.onChange(false);
  }
  /** Zoom by `factor` around a point given as fractions of the host box. */
  zoomAt(fx, fy, factor) { this.set(zoomViewAt(this.camera(), this.view, this.shown(), fx, fy, factor)); }
  /** Pan by fractions of the host size. Ignored unless zoomed. */
  panBy(dx, dy) { if (this.view) this.set(panView(this.view, this.shown(), dx, dy)); }
  /** Zoomed: animate back out. Not zoomed: animate to 2× around the point. */
  toggleAt(fx, fy) {
    if (this.view) return this.set(null, true);
    const cam = this.camera();
    this.set(zoomViewAt(cam, null, cam, fx, fy, this.opts.doubleClick), true);
  }
  /** Animate back to the planned camera. */
  reset() { if (this.view) this.set(null, true); }
}
