/**
 * The Stage: an SVG that plays a list of scenes.
 *
 *   const stage = new Stage(hostElement);
 *   stage.setScenes(scenes);      // plan the camera for the whole lesson
 *   stage.goTo(0);                // diff against what is on screen and animate the difference
 *
 * It composes the other files of this folder: layout → camera plan → diff → schedule → tweens,
 * then links, labels, packets and effects on every frame. Original: class `ap`
 * (index.pretty.js:18265-19156).
 */
import { easeInOutCubic, lerp } from '../motion/easing.js';
import { Scheduler } from '../motion/tween.js';
import { applyCamera, lerpCamera, planCamera, planSequence } from './camera.js';
import { cardFootprint, cardsVisible, dockRect, hudScaleFor } from './cards.js';
import { mergeConfig, stageConfig } from './config.js';
import { defId, ensureDefs, refreshDefs } from './defs.js';
import { centerOf, config, flushTextCache, isDark, primitive, R, textWidth, toDark } from './deps.js';
import { depthOf, describeChange, diffEntities, diffLinks, spotTargets, targetStates } from './diff.js';
import { createEntity, removeEntityNodes, renderEntity, sortByDepth } from './entities.js';
import { burst, spotlight } from './fx.js';
import { attachGestures } from './gestures.js';
import { labelSize, placeLabel } from './labels.js';
import { layoutScene } from './layout.js';
import { createLink, drawLabel, drawLink, hideLink, removeLink, routeLink, styleLink } from './links.js';
import { PacketRunner } from './packets.js';
import { enterState, enterTween, exitState, exitTween, moveTween, sampleEntityTween, scheduleTransition } from './schedule.js';
import { ensureStageStyles } from './styles.js';
import { LAYERS, stageMarkup, svgEl } from './svg.js';
import { ViewState } from './view.js';
import { clearXray, drawXray } from './xray.js';

let stageCount = 0;

export class Stage {
  /**
   * @param {HTMLElement} host   the element the SVG fills. Give it a size; clip its frame with `overflow: hidden`.
   * @param {object} [options]
   * @param {boolean | object} [options.gestures]   true (default), false, or `{ wheelZoom, wheelPan, dragPan, doubleClick, pinch, touchPan, doubleTap, swipe }`
   * @param {(visible: boolean) => void} [options.onCards]  docked cards were shown / hidden (host narrower than 520 px)
   * @param {(zoomed: boolean) => void} [options.onView]    the user zoomed in / returned to the fitted view
   * @param {(direction: 1 | -1) => void} [options.onSwipe] horizontal flick: 1 = next, −1 = previous
   * @param {() => void} [options.onSettle]                 a transition finished and traffic started
   * @param {number} [options.timeScale]            clock rate, 0.25 = slow motion (default 1)
   * @param {boolean} [options.paused]              start with traffic paused
   * @param {boolean} [options.xray]                start with the authoring overlay on
   * @param {{ top?: number, right?: number, bottom?: number, left?: number }} [options.inset]  px kept free of diagram
   * @param {'auto' | boolean} [options.reducedMotion]  'auto' (default) follows the OS setting: steps then change without tweens
   * @param {boolean} [options.watchTheme]          re-render when `<html data-theme>` changes (default true)
   * @param {string} [options.label]                accessible name of the SVG
   * @param {string} [options.locale]               language for wrapping CJK link labels
   * @param {object} [options.config]               partial `stageConfig` for this stage only
   */
  constructor(host, options = {}) {
    this.host = host;
    this.options = options;
    this.cfg = mergeConfig(stageConfig, options.config);
    ensureStageStyles();
    ensureDefs();
    const uid = ++stageCount;
    this.svg = svgEl('svg', { class: 'iso-stage-svg', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': options.label || 'Animated isometric diagram' });
    this.svg.innerHTML = stageMarkup(uid, defId('grid'));
    host.appendChild(this.svg);
    host.classList.add('iso-stage-host');
    this.L = {};
    for (const name of LAYERS) this.L[name] = this.svg.querySelector(`.iso-${name}`);
    this.fade = this.svg.querySelector(`#iso-grid-fade-${uid}`);

    /** @type {Map<string, object>} live entities: { id, cur, el, overEl, poly, bounds, tween, docked } */
    this.ents = new Map();
    /** @type {Map<string, import('./links.js').LinkView>} */
    this.links = new Map();
    this.plans = new Map();
    this.scenes = [];
    this.scene = null;
    this.anim = null;                                    // the running transition, or null when settled
    this.cam = { x: -300, y: -200, w: 600, h: 400 };
    this.hudScale = this.cfg.cards.maxScale;
    this.showCards = true;
    this.inset = { top: 0, right: 0, bottom: 0, left: 0, ...options.inset };
    this.paused = !!options.paused;                      // pauses packets only, never a transition
    this.xray = !!options.xray;
    this.onCards = options.onCards || null;
    this.onView = options.onView || null;
    this.onSwipe = options.onSwipe || null;
    this.onSettle = options.onSettle || null;
    this.warn = (message) => console.warn(`isokit stage: ${message}`);

    this.clock = new Scheduler({ maxStep: this.cfg.maxFrameMs });    // virtual ms; this.tick feeds it scaled time
    this.timeScale = options.timeScale ?? 1;
    this.viewState = new ViewState({
      camera: () => this.cam, hostWidth: () => this.host.clientWidth, now: () => this.clock.time, apply: () => this.setCam(this.cam),
      onChange: (zoomed) => { this.host.classList.toggle('is-zoomed', zoomed); if (this.onView) this.onView(zoomed); },
      config: { view: this.cfg.view, blendMs: this.cfg.timings.viewBlend },
    });
    this.runner = new PacketRunner({
      layer: this.L.packets, link: (id) => this.links.get(id), config: this.cfg.packets,
      burst: (x, y, kind) => burst(this.L.packets, x, y, kind, this.cfg.packets.burstMs / this.timeScale),
    });
    this.applyTheme();

    this.detach = [attachGestures(host, {
      isZoomed: () => this.zoomed, zoomAt: (fx, fy, f) => this.zoomAt(fx, fy, f), panBy: (dx, dy) => this.panBy(dx, dy),
      toggleZoomAt: (fx, fy) => this.toggleZoomAt(fx, fy), swipe: (dir) => { if (this.onSwipe) this.onSwipe(dir); },
    }, options.gestures ?? true, this.cfg)];
    this.sizeKey = '';
    const sizes = new ResizeObserver(() => {
      const key = `${host.clientWidth}x${host.clientHeight}`;
      if (key !== this.sizeKey) { this.sizeKey = key; this.refit(); }
    });
    sizes.observe(host);
    this.detach.push(() => sizes.disconnect());
    if (options.watchTheme !== false) {
      const theme = new MutationObserver(() => this.rerender());
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this.detach.push(() => theme.disconnect());
      if (typeof matchMedia === 'function') {
        const mq = matchMedia('(prefers-color-scheme: dark)');
        const onScheme = () => { if (!this.dead) this.rerender(); };
        if (mq.addEventListener) {
          mq.addEventListener('change', onScheme);
          this.detach.push(() => mq.removeEventListener('change', onScheme));
        }
      }
    }
    if (document.fonts && document.fonts.addEventListener) {           // widths measured with a fallback font are wrong later
      const fonts = () => { if (!this.dead) this.rerender(); };
      document.fonts.ready.then(fonts);
      document.fonts.addEventListener('loadingdone', fonts);
      this.detach.push(() => document.fonts.removeEventListener('loadingdone', fonts));
    }
    this.last = null;
    const loop = (now) => { if (this.dead) return; this.tick(now); this.frame = requestAnimationFrame(loop); };
    this.frame = requestAnimationFrame(loop);
  }

  /* ---- small properties ---- */
  /** Clock rate: 1 = real time, 0.25 = slow motion. Also slows the CSS effects. */
  get timeScale() { return this.rate; }
  set timeScale(v) {
    this.rate = v >= 0 ? v : 1;                          // 0 freezes the clock; drive it with advance()
    this.svg.style.setProperty('--iso-speed', Math.max(0.001, this.rate));
  }
  /** True while the user is zoomed in. */
  get zoomed() { return this.viewState.zoomed; }
  /** True when steps should change without tweens (option, or the OS "reduce motion" setting). */
  get reduced() {
    const o = this.options.reducedMotion ?? 'auto';
    return o === 'auto' ? typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches : !!o;
  }
  viewport() { return { w: this.host.clientWidth, h: this.host.clientHeight }; }
  applyTheme() {
    const s = this.svg.style;
    s.fontFamily = config.font;
    s.setProperty('--iso-ink', isDark() ? toDark(config.ink) : config.ink);
    if (config.spot) { s.setProperty('--iso-spot', config.spot); s.setProperty('--iso-spot-fill', `color-mix(in srgb, ${config.spot} 12%, transparent)`); }
    this.svg.classList.toggle('iso-reduce-motion', this.reduced);
  }

  /* ---- planning ---- */
  /** Re-read the host width: card scale, and whether docked cards fit at all. Returns true when that flipped. */
  measure() {
    const w = this.host.clientWidth;
    if (!w) return false;
    this.hudScale = hudScaleFor(w, this.cfg.cards);
    const show = cardsVisible(w, this.cfg.cards);
    if (show === this.showCards) return false;
    this.showCards = show;
    if (this.onCards) this.onCards(show);
    return true;
  }
  planFor(scene, prev) {
    const layout = layoutScene(scene, { hudScale: this.hudScale, showCards: this.showCards, config: this.cfg, warn: this.warn, locale: this.options.locale });
    return planCamera(layout, this.viewport(), prev, { inset: this.inset, camera: this.cfg.camera, cards: this.cfg.cards });
  }
  /** Plan every known scene in order, so each camera can hold still when the previous one still fits. */
  replan() {
    const list = this.scenes.length ? this.scenes : this.scene ? [this.scene] : [];
    this.plans = planSequence(list, (scene, prev) => this.planFor(scene, prev));
  }
  plan(scene) {
    if (!this.plans.has(scene)) this.plans.set(scene, this.planFor(scene, null));
    return this.plans.get(scene);
  }
  /**
   * Give the stage the scenes of a lesson, in order. Plans all cameras; draws nothing.
   * @param {object[]} scenes  each `{ entities, links?, flows? }`
   */
  setScenes(scenes) {
    this.measure();
    this.scenes = scenes || [];
    this.replan();
    if (!this.ents.size && this.scenes[0]) this.setCam(this.plan(this.scenes[0]).cam);
  }

  /* ---- camera ---- */
  setCam(cam) {
    this.cam = cam;
    applyCamera({ svg: this.svg, hud: this.L.hud, fade: this.fade }, this.viewState.shown(cam), this.host.clientWidth, this.cfg.camera);
  }
  /** Zoom by `factor` around a point given as fractions (0..1) of the host box. */
  zoomAt(fx, fy, factor) { this.viewState.zoomAt(fx, fy, factor); }
  /** Pan by fractions of the host size. Does nothing unless zoomed. */
  panBy(dx, dy) { this.viewState.panBy(dx, dy); }
  /** Double-click behaviour: zoom to 2× at the point, or back out if already zoomed. */
  toggleZoomAt(fx, fy) { this.viewState.toggleAt(fx, fy); }
  /** Animate back to the fitted camera. */
  resetView() { this.viewState.reset(); }
  /** The original's name for `resetView`. */
  fit() { this.resetView(); }
  /** Re-plan for the current host size and move to the new camera. Called on resize; call it after changing `inset`. */
  refit() {
    const cardsFlipped = this.measure();
    if (!this.scene) { this.replan(); if (!this.ents.size && this.scenes[0]) this.setCam(this.plan(this.scenes[0]).cam); return; }
    this.viewState.clear();
    this.replan();
    if (cardsFlipped) return this.goTo(this.scene, { instant: true });     // the card entity itself appears or disappears
    this.applyPlan();
  }
  applyPlan() {
    const plan = this.plan(this.scene);
    if (this.anim) this.anim.cam.to = plan.cam; else this.setCam(plan.cam);
    for (const ent of this.ents.values()) {
      if (!ent.docked) continue;
      const at = plan.dock ? { sx: plan.dock.x, sy: plan.dock.y, corner: plan.dock.corner } : null;
      if (at) ent.cur = { ...ent.cur, ...at };
      if (at && ent.tween && !ent.tween.remove) ent.tween.to = { ...ent.tween.to, ...at };
      this.renderEntity(ent);
    }
  }
  /** Redraw everything in place: after a theme flip, a late web font, or a `configure()` call. */
  rerender() {
    flushTextCache();
    refreshDefs();
    this.applyTheme();
    for (const ent of this.ents.values()) this.renderEntity(ent);
    for (const link of this.links.values()) { link.labelKey = null; link.labelBorn = null; }
    this.replan();
    if (this.scene) this.applyPlan();
    this.updateLinks(true);
  }

  /* ---- transitions ---- */
  /**
   * Show a scene. Whatever is on stage is diffed against it and the difference is animated:
   * exits, then moves, then staggered arrivals, then new links draw in, then traffic starts.
   * @param {object | number} target  a scene, or an index into the scenes given to `setScenes`
   * @param {{ instant?: boolean }} [o]  instant = jump to the settled state
   */
  goTo(target, { instant = false } = {}) {
    const scene = typeof target === 'number' ? this.scenes[target] : target;
    if (!scene) return;
    this.finish(true);
    this.runner.clear();
    this.runner.setFlows([]);
    for (const el of this.L.floor.querySelectorAll('.iso-spot')) el.remove();   // flashes of the previous step would sit at stale positions
    const cfg = this.cfg, plan = this.plan(scene), links = scene.links || {};
    const next = targetStates(scene, plan, { showCards: this.showCards, cardKey: cfg.cards.key, warn: this.warn });
    for (const [id, ent] of [...this.ents]) if (next[id] && next[id].type !== ent.cur.type) this.removeEntity(id);   // a new type is a new thing
    const diff = diffEntities(this.ents, next, (state) => depthOf(state, cfg.depth));
    const linkDiff = diffLinks(this.links, links);
    const sch = scheduleTransition({
      ...diff, linksRemoved: linkDiff.removed, linksAdded: linkDiff.added.map((id) => ({ id, from: links[id].from, to: links[id].to })),
    }, cfg.timings, cfg.phases);
    const spot = spotTargets(diff, this.ents, next), group = this.clock.group();

    for (const id of diff.exiting) {
      const ent = this.ents.get(id);
      this.tweenEntity(ent, exitTween({ ...ent.cur }, exitState(ent.cur, primitive(ent.cur.type), cfg.exit)), sch.exits[id], group);
    }
    for (const id of diff.changed) {
      const ent = this.ents.get(id);
      this.tweenEntity(ent, moveTween({ ...ent.cur }, next[id], describeChange(ent.cur, next[id], cfg.cards)), sch.moves[id], group);
    }
    for (const id of diff.entering) {
      const to = next[id], from = enterState(to, primitive(to.type), cfg.enter);
      this.tweenEntity(this.addEntity(id, from), enterTween(from, to), sch.enters[id], group);
    }
    for (const id of linkDiff.removed) this.tweenLink(this.links.get(id), 'opacity', 0, sch.linksOut[id], group, true);
    for (const id of linkDiff.kept) { const link = this.links.get(id); link.spec = links[id]; styleLink(link); }
    for (const id of linkDiff.added) {
      const link = createLink(id, links[id], this.L);
      this.links.set(id, link);
      link.draw = 0;
      this.tweenLink(link, 'draw', 1, sch.linksIn[id], group, false);
    }

    this.scene = scene;
    const cam = { from: { ...this.viewState.shown() }, to: plan.cam };   // start from what is shown, zoomed or not
    this.viewState.clear();
    this.setCam(cam.from);
    group.add({ ...sch.camera, ease: easeInOutCubic, update: (k) => this.setCam(lerpCamera(cam.from, cam.to, k)) });
    this.anim = { group, cam, flows: scene.flows || [], spot, schedule: sch };
    if (instant || this.reduced) this.finish();
  }
  tweenEntity(ent, record, timing, group) {
    ent.tween = record;
    group.add({
      ...timing,
      update: (_, tw) => { ent.cur = sampleEntityTween(record, tw.progress, this.dockAt, this.cfg.swap); this.renderEntity(ent); this.moved = true; },
      done: () => {
        if (record.remove) return this.removeEntity(ent.id);
        ent.cur = record.to;
        ent.tween = null;
        this.renderEntity(ent);
      },
    });
  }
  tweenLink(link, key, to, timing, group, remove) {
    link.tween = group.add({
      ...timing, ease: easeInOutCubic, from: link[key], to,
      update: (value) => { link[key] = value; },
      done: () => { link.tween = null; if (remove) { removeLink(link); this.links.delete(link.id); } },
    });
  }
  /** Top-left corner (host px) that keeps a w × h card pinned to a corner. Arrow function: passed around as a callback. */
  dockAt = (corner, w, h) => {
    const r = dockRect(corner, cardFootprint({ w, h }, this.hudScale, this.cfg.cards), this.viewport(), this.inset, this.cfg.cards);
    return { sx: r[0], sy: r[1] };
  };
  /**
   * Jump the running transition to its end state.
   * @param {boolean} [skipSettle]  true = do not start traffic or flash spotlights (another goTo follows)
   */
  finish(skipSettle = false) {
    const anim = this.anim;
    if (!anim) return;
    anim.group.finish();
    this.setCam(anim.cam.to);
    this.sortDepth();
    this.anim = null;
    this.updateLinks(true);
    if (!skipSettle) this.settleScene(anim);
  }
  /** Finish the running transition and start the scene's traffic now. */
  settle() { this.finish(); }
  settleScene(anim) {
    this.runner.setFlows(anim.flows);
    for (const id of anim.spot) { const ent = this.ents.get(id); if (ent) spotlight(this.L.floor, ent.cur, this.timeScale, this.cfg.spot); }
    if (this.onSettle) this.onSettle();
  }
  /** Empty the stage at once: no entities, links, packets or effects. Plans are kept. */
  clear() {
    this.finish(true);
    for (const ent of this.ents.values()) removeEntityNodes(ent);
    for (const link of this.links.values()) removeLink(link);
    this.ents.clear();
    this.links.clear();
    this.runner.clear(true);
    this.runner.setFlows([]);
    this.L.floor.innerHTML = '';
    this.scene = null;
  }

  /* ---- entities ---- */
  addEntity(id, state) {
    const ent = createEntity(id, state, this.L, this.hudScale);
    this.ents.set(id, ent);
    return ent;
  }
  removeEntity(id) {
    const ent = this.ents.get(id);
    if (!ent) return;
    removeEntityNodes(ent);
    this.ents.delete(id);
  }
  renderEntity(ent) { renderEntity(ent, this.hudScale); }
  sortDepth() { sortByDepth(this.ents.values(), this.L.ents, this.cfg.depth); }

  /* ---- links ---- */
  /**
   * Re-route and redraw every link from the entities' current positions, and place the labels.
   * @param {boolean} [snap]  true = put labels exactly on target (no easing towards it)
   * @param {number} [dt]     ms since the last frame, for the label easing
   */
  updateLinks(snap = false, dt = 1000 / 60) {
    const cfg = this.cfg, now = this.clock.time, picks = (this.plans.get(this.scene) || {}).picks || {};
    const centerOfId = (id) => (this.ents.has(id) ? centerOf(this.ents.get(id).cur) : null);
    const polyOfId = (id) => (this.ents.has(id) ? this.ents.get(id).poly : null);
    const chase = 1 - (1 - cfg.links.labelChase) ** (dt / (1000 / 60));
    for (const link of this.links.values()) {
      const spec = link.spec;
      let pts = null;
      if (this.ents.has(spec.from) && (!spec.to || this.ents.has(spec.to))) { try { pts = routeLink(spec, centerOfId, polyOfId, cfg.links); } catch (err) { pts = null; } }
      if (!pts) { hideLink(link); continue; }
      drawLink(link, pts, cfg.links);
      const pick = picks[link.id], text = spec.label && pick && pick.label === spec.label ? pick.text : spec.label;
      drawLabel(link, text, now, cfg.timings.labelSwap, cfg.links);
      if (!spec.label) continue;
      const { w, h } = labelSize(text, textWidth, cfg.labels);
      const at = placeLabel(pts, spec.labelAt ?? 0.5, w, h, () => 0, pick ? pick.side : 0, cfg.labels);   // replay the planned side
      link.lpos = link.lpos && this.anim && !snap ? [lerp(link.lpos[0], at.cx, chase), lerp(link.lpos[1], at.cy, chase)] : [at.cx, at.cy];
      link.label.setAttribute('transform', `translate(${R(link.lpos[0])} ${R(link.lpos[1])})`);
    }
  }

  /* ---- the frame loop ---- */
  tick(now) {
    const real = this.last === null ? 0 : Math.min(this.cfg.maxFrameMs, Math.max(0, now - this.last));
    this.last = now;
    this.step(real * this.rate);
  }
  /**
   * Move the stage clock forward by hand, in 60 Hz steps: for scrubbing, tests and frame capture.
   * Set `timeScale = 0` first so the frame loop does not also advance it.
   * @param {number} ms  virtual milliseconds
   */
  advance(ms) {
    const frame = 1000 / 60;
    for (let left = ms; left > 1e-6; left -= frame) this.step(Math.min(frame, left));
  }
  /** One frame of `dt` virtual ms. */
  step(dt) {
    this.moved = false;
    this.clock.advance(dt);                              // camera, entity and link tweens
    if (this.anim) {
      if (this.moved) this.sortDepth();
      this.updateLinks(false, dt);
      if (this.anim.group.done) { const anim = this.anim; this.anim = null; this.updateLinks(true); this.settleScene(anim); }
    }
    if (this.viewState.blending) this.setCam(this.cam);
    if (!this.paused) this.runner.step(dt / 1000);
    if (this.xray) drawXray(this.L.xray, { ents: this.ents.values(), links: this.links.values() });
    else clearXray(this.L.xray);
  }
  /** Stop the loop, remove every listener and observer, and take the SVG out of the host. */
  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.frame);
    for (const fn of this.detach) fn();
    this.clock.cancel();
    this.svg.remove();
    this.host.classList.remove('iso-stage-host', 'is-zoomed', 'is-dragging');
  }
}
