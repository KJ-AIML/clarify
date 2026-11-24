/**
 * Pointer, touch and wheel gestures for a zoomable surface.
 *
 *   wheel + Ctrl/⌘ (or a trackpad pinch)   zoom around the cursor
 *   wheel while zoomed                      pan
 *   mouse drag while zoomed                 pan
 *   double-click / double-tap               toggle 2× zoom at that point
 *   two fingers                             pinch-zoom and pan together
 *   one finger while zoomed                 pan
 *   one-finger horizontal flick, unzoomed   swipe (previous / next step)
 *
 * The module knows nothing about cameras. It turns raw events into five calls on a `target`,
 * with positions as fractions of the host box (0..1), so it can drive any pan/zoom model.
 * Original: `gestures()` (index.pretty.js:18584-18716).
 */
import { stageConfig } from './config.js';

/** Every gesture can be switched off individually. */
export const GESTURE_DEFAULTS = {
  wheelZoom: true,      // Ctrl/⌘ + wheel, and trackpad pinch (which browsers report as Ctrl + wheel)
  wheelZoomNeedsKey: true,   // false = plain wheel zooms (and the page no longer scrolls over the stage)
  wheelPan: true,       // plain wheel pans while zoomed
  dragPan: true,        // mouse drag pans while zoomed
  doubleClick: true,    // mouse double-click toggles zoom
  pinch: true,          // two-finger zoom + pan
  touchPan: true,       // one-finger pan while zoomed
  doubleTap: true,      // touch double-tap toggles zoom
  swipe: true,          // one-finger horizontal flick while not zoomed
};

/**
 * @typedef {object} GestureTarget
 * @property {() => boolean} isZoomed
 * @property {(fx: number, fy: number, factor: number) => void} zoomAt       factor > 1 zooms in
 * @property {(dx: number, dy: number) => void} panBy                       fractions of the host size
 * @property {(fx: number, fy: number) => void} toggleZoomAt
 * @property {(direction: 1 | -1) => void} [swipe]                          1 = flick left = "next"
 */

/**
 * Attach the gestures to an element.
 * @param {HTMLElement} host
 * @param {GestureTarget} target
 * @param {Partial<typeof GESTURE_DEFAULTS> | boolean} [enabled]  `false` attaches nothing
 * @param {{ gestures?: typeof stageConfig.gestures, view?: typeof stageConfig.view }} [cfg]
 * @returns {() => void} call it to remove every listener
 */
export function attachGestures(host, target, enabled = true, cfg = stageConfig) {
  if (enabled === false) return () => {};
  const on = { ...GESTURE_DEFAULTS, ...(enabled === true ? null : enabled) };
  const G = cfg.gestures, V = cfg.view;
  const box = () => host.getBoundingClientRect();
  const frac = (x, y) => { const r = box(); return [(x - r.left) / r.width, (y - r.top) / r.height]; };
  const pair = (t) => ({ d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
  const now = () => performance.now();
  const off = [];
  const listen = (type, fn, opts) => { host.addEventListener(type, fn, opts); off.push(() => host.removeEventListener(type, fn, opts)); };

  /* ---- touch ---- */
  let touch = null;                            // { mode: 'one' | 'two', ... }
  let lastTap = { at: 0, x: 0, y: 0 };
  const oneFinger = (t, fresh) => ({ mode: 'one', x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: fresh ? now() : 0, moved: !fresh, pinched: !fresh });

  listen('touchstart', (e) => {
    if (e.touches.length >= 2) {
      if (!on.pinch) return;
      e.preventDefault();
      touch = { mode: 'two', ...pair(e.touches), pinched: true };
    } else if (e.touches.length === 1) touch = oneFinger(e.touches[0], true);
  }, { passive: false });

  listen('touchmove', (e) => {
    if (!touch) return;
    if (e.touches.length >= 2) {
      if (!on.pinch) return;
      e.preventDefault();
      const p = pair(e.touches);
      if (touch.mode !== 'two') touch = { mode: 'two', ...p, pinched: true };
      const [fx, fy] = frac(p.x, p.y), r = box();
      if (touch.d > 0) target.zoomAt(fx, fy, p.d / touch.d);
      target.panBy((p.x - touch.x) / r.width, (p.y - touch.y) / r.height);
      Object.assign(touch, p);
      return;
    }
    if (touch.mode !== 'one') return;
    const t = e.touches[0];
    if (Math.hypot(t.clientX - touch.x0, t.clientY - touch.y0) > G.moveSlop) touch.moved = true;
    if (on.touchPan && target.isZoomed()) {
      e.preventDefault();                      // while zoomed the stage owns the finger; otherwise the page may scroll
      const r = box();
      target.panBy((t.clientX - touch.x) / r.width, (t.clientY - touch.y) / r.height);
    }
    touch.x = t.clientX;
    touch.y = t.clientY;
  }, { passive: false });

  listen('touchend', (e) => {
    if (!touch) return;
    if (e.touches.length === 1 && touch.mode === 'two') { touch = oneFinger(e.touches[0], false); return; }   // a pinch ended on one finger: no tap, no swipe
    if (e.touches.length) return;
    const t = now();
    if (touch.mode === 'one' && !touch.pinched) {
      const c = e.changedTouches[0], dx = c.clientX - touch.x0, dy = c.clientY - touch.y0;
      if (on.swipe && !target.isZoomed() && t - touch.t0 < G.swipeMs && Math.abs(dx) > G.swipeMin && Math.abs(dy) < Math.abs(dx) * G.swipeSlope) {
        if (target.swipe) target.swipe(dx < 0 ? 1 : -1);
      } else if (on.doubleTap && !touch.moved && t - touch.t0 < G.tapMs) {
        const close = Math.hypot(c.clientX - lastTap.x, c.clientY - lastTap.y) < G.doubleTapDist;
        if (t - lastTap.at < G.doubleTapMs && close) {
          e.preventDefault();
          target.toggleZoomAt(...frac(c.clientX, c.clientY));
          lastTap = { at: 0, x: 0, y: 0 };
        } else lastTap = { at: t, x: c.clientX, y: c.clientY };
      }
    }
    touch = null;
  });
  listen('touchcancel', () => { touch = null; });

  /* ---- mouse ---- */
  let drag = null;
  listen('pointerdown', (e) => {
    if (!on.dragPan || e.pointerType !== 'mouse' || e.button !== 0 || !target.isZoomed()) return;
    drag = { x: e.clientX, y: e.clientY };
    if (host.setPointerCapture) { try { host.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no live pointer */ } }
    host.classList.add('is-dragging');
  });
  listen('pointermove', (e) => {
    if (!drag) return;
    const r = box();
    target.panBy((e.clientX - drag.x) / r.width, (e.clientY - drag.y) / r.height);
    drag = { x: e.clientX, y: e.clientY };
  });
  const endDrag = () => { drag = null; host.classList.remove('is-dragging'); };
  listen('pointerup', endDrag);
  listen('pointercancel', endDrag);
  listen('dblclick', (e) => { if (on.doubleClick) target.toggleZoomAt(...frac(e.clientX, e.clientY)); });

  listen('wheel', (e) => {
    const unit = e.deltaMode === 1 ? V.lineHeight : 1;      // Firefox reports lines, everyone else pixels
    if (on.wheelZoom && (e.ctrlKey || e.metaKey || !on.wheelZoomNeedsKey)) {
      e.preventDefault();
      const [fx, fy] = frac(e.clientX, e.clientY);
      target.zoomAt(fx, fy, Math.exp(-e.deltaY * unit * V.wheelRate));
    } else if (on.wheelPan && target.isZoomed()) {
      e.preventDefault();
      const r = box();
      target.panBy((-e.deltaX * unit) / r.width, (-e.deltaY * unit) / r.height);
    }
  }, { passive: false });

  return () => { for (const fn of off) fn(); host.classList.remove('is-dragging'); };
}
