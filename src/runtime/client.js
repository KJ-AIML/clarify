// clarify/src/runtime/client.js
// Browser runtime inlined into every Clarify page. No dependencies, no build step.
// Sections: storage · theme · canvas (pan/zoom/minimap/focus/traces) · inspector ·
// comments + asks + reply dock · export · live reload.
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pageMeta = JSON.parse($("#c-page-meta")?.textContent || "{}");
  const slug = pageMeta.slug || "clarify";
  // Storage survives title edits while a draft is live-edited: key by source path when known.
  const storeKey = pageMeta.source || slug;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── storage (per-viewer conveniences only; every access may throw) ─────────
  const store = {
    get(key, fallback, area = "local") {
      try {
        const raw = (area === "session" ? sessionStorage : localStorage).getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value, area = "local") {
      try { (area === "session" ? sessionStorage : localStorage).setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let toastTimer;
  function toast(message, kind = "", ms = 2600) {
    const el = $(".c-toast");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("is-error", kind === "error");
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => el.classList.remove("is-on"), ms);
  }

  async function copyText(text, okMessage) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(okMessage);
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Hover card state lives up here: canvases call hideCard() while they initialize.
  const card = document.createElement("div");
  card.className = "c-hovercard";
  card.hidden = true;
  card.setAttribute("aria-hidden", "true");
  document.body.appendChild(card);
  let cardTimer = 0;
  let cardOwner = null;
  let cardAnchor = null;

  // ── theme ──────────────────────────────────────────────────────────────────
  const themeSelect = $("#c-theme");
  if (themeSelect) {
    themeSelect.value = document.documentElement.dataset.theme;
    themeSelect.addEventListener("change", () => {
      document.documentElement.dataset.theme = themeSelect.value;
      store.set("clarify:theme", themeSelect.value);
    });
  }

  // ── canvas ─────────────────────────────────────────────────────────────────
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3;
  const FIT_MIN = 0.5;      // show the whole diagram if it stays at least this legible
  const START_SCALE = 0.75; // otherwise open at this zoom on the start of the flow
  const canvases = [];

  $$(".c-diagram").forEach((fig, index) => {
    const model = JSON.parse($(".c-model", fig)?.textContent || "{}");
    const viewport = $(".c-viewport", fig);
    const svg = $(".c-viewport > svg", fig);
    if (!svg || !model.width) return;
    const cw = model.width;
    const ch = model.height;
    const view = { cx: cw / 2, cy: ch / 2, s: 1 };
    const zoomLabel = $(".c-zoom", fig);
    const minimap = $(".c-minimap", fig);
    const canvas = { fig, index, model, viewport, svg, view, selection: null, fit, centerOn, select, clear, applyAnnotations };
    canvases.push(canvas);
    if (reduceMotion && svg.pauseAnimations) svg.pauseAnimations();

    const size = () => ({ w: viewport.clientWidth || 1, h: viewport.clientHeight || 1 });

    function apply() {
      const { w, h } = size();
      const vw = w / view.s;
      const vh = h / view.s;
      svg.setAttribute("viewBox", `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`);
      if (zoomLabel) zoomLabel.textContent = `${Math.round(view.s * 100)}%`;
      if (cardOwner === canvas) hideCard();
      updateMinimap(vw, vh);
    }

    function fitScale() {
      const { w, h } = size();
      return Math.min(w / cw, h / ch, 1.15) * 0.97;
    }

    function fit(force = false) {
      const s = fitScale();
      const { w, h } = size();
      view.cx = cw / 2;
      view.cy = ch / 2;
      view.s = Math.min(s, MAX_SCALE);
      // Too big to show legibly: open at the start of the flow (the minimap shows the rest).
      if (s < FIT_MIN && !force) {
        view.s = START_SCALE;
        if (model.direction === "TD" || model.kind === "sequence") view.cy = Math.min(ch / 2, h / view.s / 2);
        else view.cx = Math.min(cw / 2, w / view.s / 2);
      }
      apply();
    }

    function zoomAt(factor, px, py) {
      const { w, h } = size();
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.s * factor));
      const ux = view.cx + (px - w / 2) / view.s;
      const uy = view.cy + (py - h / 2) / view.s;
      view.cx = ux - (px - w / 2) / next;
      view.cy = uy - (py - h / 2) / next;
      view.s = next;
      apply();
    }

    function centerOn(x, y) {
      view.cx = x;
      view.cy = y;
      apply();
    }

    // Initial height follows the diagram's aspect ratio at a readable scale.
    function sizeViewport() {
      if (fig.classList.contains("is-full")) return;
      const w = viewport.clientWidth || 600;
      const fitW = Math.min(1.1, w / cw);
      const s = fitW >= FIT_MIN ? fitW : START_SCALE;
      const hero = fig.classList.contains("is-hero");
      const extra = model.traces.length ? 72 : 16;
      const min = hero ? 440 : 240;
      const max = Math.max(hero ? 480 : 320, innerHeight * (hero ? 0.76 : 0.7));
      viewport.style.height = `${Math.round(Math.min(Math.max(ch * s + extra, min), max))}px`;
    }

    // Pointer: drag to pan, click to select, two-finger pinch to zoom.
    const pointers = new Map();
    let drag = null;
    let pinch = null;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      viewport.classList.add("is-touched");
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
        drag = null;
        return;
      }
      drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false, target: e.target, id: e.pointerId };
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const rect = viewport.getBoundingClientRect();
        const target = pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
        zoomAt(target / view.s, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 4) {
        drag.moved = true;
        viewport.setPointerCapture(e.pointerId);
        viewport.classList.add("is-panning");
      }
      if (drag.moved) {
        view.cx = drag.cx - dx / view.s;
        view.cy = drag.cy - dy / view.s;
        apply();
      }
    });
    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!drag || drag.id !== e.pointerId) return;
      viewport.classList.remove("is-panning");
      if (!drag.moved && e.type === "pointerup") handleClick(drag.target);
      drag = null;
    };
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);

    // Wheel: Ctrl/⌘ (and trackpad pinch) zooms; plain wheel pans once the canvas is active.
    viewport.addEventListener("wheel", (e) => {
      const active = document.activeElement === viewport || viewport.contains(document.activeElement) || fig.classList.contains("is-full");
      if (!(e.ctrlKey || e.metaKey) && !active) return;
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)), e.clientX - rect.left, e.clientY - rect.top);
      } else {
        view.cx += e.deltaX / view.s;
        view.cy += e.deltaY / view.s;
        apply();
      }
    }, { passive: false });

    viewport.addEventListener("keydown", (e) => {
      const { w, h } = size();
      const step = 60 / view.s;
      const keys = {
        "+": () => zoomAt(1.2, w / 2, h / 2), "=": () => zoomAt(1.2, w / 2, h / 2),
        "-": () => zoomAt(1 / 1.2, w / 2, h / 2), "0": () => fit(true),
        ArrowLeft: () => centerOn(view.cx - step, view.cy), ArrowRight: () => centerOn(view.cx + step, view.cy),
        ArrowUp: () => centerOn(view.cx, view.cy - step), ArrowDown: () => centerOn(view.cx, view.cy + step)
      };
      if (e.target.closest(".c-node") && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleClick(e.target);
        return;
      }
      if (keys[e.key] && !e.target.closest("textarea, input")) {
        e.preventDefault();
        keys[e.key]();
      }
    });

    // Tabbing to a node: the browser may scroll the clipped viewport; undo that and pan instead.
    viewport.addEventListener("scroll", () => { viewport.scrollTop = 0; viewport.scrollLeft = 0; });
    svg.addEventListener("focusin", (e) => {
      const node = e.target.closest?.(".c-node");
      if (!node) return;
      const r = node.getBoundingClientRect();
      const v = viewport.getBoundingClientRect();
      if (r.left < v.left || r.right > v.right || r.top < v.top || r.bottom > v.bottom) {
        const b = nodeBox(Number(node.dataset.node));
        if (b) centerOn(b.x + b.w / 2, b.y + b.h / 2);
      }
    });

    // Hover preview of a node's neighborhood (when nothing is selected).
    svg.addEventListener("pointerover", (e) => {
      if (canvas.selection || drag?.moved || tour) return;
      const node = e.target.closest(".c-node");
      if (node) focusNode(Number(node.dataset.node), false);
    });
    svg.addEventListener("pointerout", (e) => {
      if (canvas.selection || tour) return;
      const node = e.target.closest(".c-node");
      if (node && !node.contains(e.relatedTarget)) clearFocus();
    });

    function handleClick(target) {
      const node = target.closest?.(".c-node");
      const edge = target.closest?.("[data-edge]");
      if (node) select({ kind: "node", index: Number(node.dataset.node) });
      else if (edge) select({ kind: "edge", index: Number(edge.dataset.edge) });
      else if (!tour) { clear(); closeInspector(); }
    }

    function clearFocus() {
      svg.classList.remove("is-focus");
      $$(".is-hl, .is-selected", svg).forEach(el => el.classList.remove("is-hl", "is-selected"));
    }

    function focusNode(i, selected) {
      clearFocus();
      svg.classList.add("is-focus");
      const nodeEl = $(`.c-node[data-node="${i}"]`, svg);
      nodeEl?.classList.add("is-hl");
      if (selected) nodeEl?.classList.add("is-selected");
      model.edges.forEach((e, k) => {
        if (e.from !== i && e.to !== i) return;
        $$(`[data-edge="${k}"]`, svg).forEach(el => el.classList.add("is-hl"));
        $(`.c-node[data-node="${e.from === i ? e.to : e.from}"]`, svg)?.classList.add("is-hl");
      });
    }

    function focusEdge(k) {
      clearFocus();
      svg.classList.add("is-focus");
      const e = model.edges[k];
      $$(`[data-edge="${k}"]`, svg).forEach(el => el.classList.add("is-hl", "is-selected"));
      [e.from, e.to].forEach(n => $(`.c-node[data-node="${n}"]`, svg)?.classList.add("is-hl"));
    }

    function select(sel, { pan = false } = {}) {
      stopTour();
      canvas.selection = sel;
      if (sel.kind === "node") focusNode(sel.index, true);
      else focusEdge(sel.index);
      if (pan && sel.kind === "node") {
        const b = nodeBox(sel.index);
        if (b) centerOn(b.x + b.w / 2, b.y + b.h / 2);
      }
      openInspector(canvas, sel);
    }

    function clear() {
      canvas.selection = null;
      clearFocus();
    }

    function nodeBox(i) {
      const el = $(`.c-node[data-node="${i}"]`, svg);
      if (!el) return null;
      const b = el.getBBox();
      const m = el.transform.baseVal.consolidate()?.matrix;
      return { x: (m?.e || 0) + b.x, y: (m?.f || 0) + b.y, w: b.width, h: b.height };
    }

    // ── route tour: play a trace stop by stop, with narration and a gliding camera ──
    const stage = $(".c-stage", fig);
    const strip = $(".c-route", fig);
    let tour = null;
    let pulse = null;
    let camFrame = 0;

    function animateView(target) {
      cancelAnimationFrame(camFrame);
      if (reduceMotion) { Object.assign(view, target); apply(); return; }
      const from = { ...view };
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / 560);
        const e = 1 - (1 - k) ** 3;
        view.cx = from.cx + (target.cx - from.cx) * e;
        view.cy = from.cy + (target.cy - from.cy) * e;
        view.s = from.s * (target.s / from.s) ** e;
        apply();
        if (k < 1) camFrame = requestAnimationFrame(tick);
      };
      camFrame = requestAnimationFrame(tick);
    }

    // Fit the given boxes into the canvas area left free by the tools and the route strip.
    function frame(boxes) {
      const bs = boxes.filter(Boolean);
      if (!bs.length) return;
      const x0 = Math.min(...bs.map(b => b.x));
      const y0 = Math.min(...bs.map(b => b.y));
      const x1 = Math.max(...bs.map(b => b.x + b.w));
      const y1 = Math.max(...bs.map(b => b.y + b.h));
      const { w, h } = size();
      const top = 56;
      const overlaid = strip && !strip.hidden && getComputedStyle(strip).position === "absolute";
      const bottom = overlaid ? strip.offsetHeight + 28 : 16;
      const availW = Math.max(160, w - 96);
      const availH = Math.max(100, h - top - bottom);
      const s = Math.max(0.35, Math.min(1.15, availW / (x1 - x0 + 40), availH / (y1 - y0 + 40)));
      animateView({ s, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 - (top + availH / 2 - h / 2) / s });
    }

    function startTour(ti, { node = null } = {}) {
      const t = model.traces[ti];
      if (!t || !strip) return;
      stopTour();
      closeInspector();
      clear();
      const steps = t.steps.length ? t.steps : t.nodes.slice(1).map((n, j) => ({ from: t.nodes[j], to: n, text: "", edge: null, reverse: false }));
      // Stations are listed once, in order of first visit; fan-outs revisit a station.
      const walk = [];
      const at = steps.map(st => {
        const cur = st.to ?? st.from;
        for (const n of [st.from, cur]) if (!walk.includes(n)) walk.push(n);
        return walk.indexOf(cur);
      });
      tour = { ti, steps, walk, at, i: 0, playing: !reduceMotion, timer: 0 };
      stage.classList.add("is-touring");
      svg.classList.add("is-touring", "is-focus");
      svg.style.setProperty("--rc", `var(--trace-${t.color})`);
      strip.className = `c-route tc-${t.color}`;
      strip.hidden = false;
      $(".c-route-name", strip).textContent = t.label;
      $(".c-stations", strip).innerHTML = walk.map((n, j) =>
        `<li><button type="button" class="c-station" data-stop="${j}" aria-label="Stop ${j + 1}: ${esc(model.nodes[n]?.label)}"></button><span class="c-station-name">${esc(model.nodes[n]?.label)}</span></li>`).join("");
      steps.forEach(st => { if (st.edge !== null) $$(`[data-edge="${st.edge}"]`, svg).forEach(el => el.classList.add("is-route")); });
      walk.forEach(n => $(`.c-node[data-node="${n}"]`, svg)?.classList.add("is-route"));
      $$(".c-route-btn", fig).forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.trace) === ti)));
      const startAt = node === null ? 0 : Math.max(0, steps.findIndex(st => (st.to ?? st.from) === node));
      showStep(startAt);
    }

    function showStep(i) {
      if (!tour) return;
      const { steps, walk, at } = tour;
      tour.i = Math.max(0, Math.min(steps.length - 1, i));
      const st = steps[tour.i];
      const stop = at[tour.i];
      $$(".is-visited, .is-current", svg).forEach(el => el.classList.remove("is-visited", "is-current"));
      steps.forEach((x, j) => { if (j <= tour.i && x.edge !== null) $$(`[data-edge="${x.edge}"]`, svg).forEach(el => el.classList.add("is-visited")); });
      const seen = new Set(steps.slice(0, tour.i + 1).flatMap(x => [x.from, x.to ?? x.from]));
      walk.forEach(n => { if (seen.has(n)) $(`.c-node[data-node="${n}"]`, svg)?.classList.add("is-visited"); });
      $(`.c-node[data-node="${st.to ?? st.from}"]`, svg)?.classList.add("is-current");
      $$(".c-stations li", strip).forEach((li, j) => {
        li.classList.toggle("is-passed", j !== stop && seen.has(walk[j]));
        li.classList.toggle("is-current", j === stop);
      });
      $(`.c-stations li:nth-child(${stop + 1})`, strip)?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
      $(".c-route-count", strip).textContent = `Step ${tour.i + 1} of ${steps.length}`;
      const from = esc(model.nodes[st.from]?.label);
      const head = st.to !== null ? `<b>${from} → ${esc(model.nodes[st.to]?.label)}</b>` : `<b>${from}</b>`;
      const body = st.text || (st.edge !== null ? model.edges[st.edge].label : "");
      $(".c-route-text", strip).innerHTML = body ? `${head} · ${esc(body)}` : head;
      movePulse(st);
      frame([nodeBox(st.from), st.to !== null ? nodeBox(st.to) : null]);
      updatePlay();
      schedule();
    }

    function movePulse(st) {
      if (reduceMotion) return;
      const line = st.edge !== null ? $(`.c-edge[data-edge="${st.edge}"] .c-edge-line`, svg) : null;
      if (!pulse) {
        const ns = "http://www.w3.org/2000/svg";
        pulse = document.createElementNS(ns, "circle");
        pulse.setAttribute("class", "c-tour-dot");
        pulse.setAttribute("r", "6.5");
        const anim = document.createElementNS(ns, "animateMotion");
        for (const [k, v] of [["dur", "1.1s"], ["fill", "freeze"], ["begin", "indefinite"], ["calcMode", "linear"]]) anim.setAttribute(k, v);
        pulse.appendChild(anim);
        $(".c-nodes", svg).before(pulse);
      }
      pulse.style.display = line ? "" : "none";
      if (!line) return;
      const anim = pulse.firstChild;
      anim.setAttribute("path", line.getAttribute("d"));
      if (st.reverse) { anim.setAttribute("keyPoints", "1;0"); anim.setAttribute("keyTimes", "0;1"); }
      else { anim.removeAttribute("keyPoints"); anim.removeAttribute("keyTimes"); }
      anim.beginElement?.();
    }

    function schedule() {
      clearTimeout(tour.timer);
      if (!tour.playing) return;
      if (tour.i >= tour.steps.length - 1) { tour.playing = false; updatePlay(); return; }
      const len = (tour.steps[tour.i].text || "").length;
      tour.timer = setTimeout(() => showStep(tour.i + 1), 2600 + len * 32);
    }

    function updatePlay() {
      const b = $('[data-tour="play"]', strip);
      b.textContent = tour.playing ? "❚❚" : "▶";
      b.setAttribute("aria-label", tour.playing ? "Pause" : "Play");
    }

    function stopTour() {
      if (!tour) return;
      clearTimeout(tour.timer);
      cancelAnimationFrame(camFrame);
      tour = null;
      strip.hidden = true;
      stage.classList.remove("is-touring");
      svg.classList.remove("is-touring", "is-focus");
      $$(".is-route, .is-visited, .is-current", svg).forEach(el => el.classList.remove("is-route", "is-visited", "is-current"));
      if (pulse) pulse.style.display = "none";
      $$(".c-route-btn", fig).forEach(b => b.setAttribute("aria-pressed", "false"));
    }

    function step(delta) {
      tour.playing = false;
      showStep(tour.i + delta);
    }

    strip?.addEventListener("click", (e) => {
      if (!tour) return;
      const act = e.target.closest("[data-tour]")?.dataset.tour;
      const stopBtn = e.target.closest("[data-stop]");
      if (act === "next") step(1);
      else if (act === "prev") step(-1);
      else if (act === "close") stopTour();
      else if (act === "play") {
        tour.playing = !tour.playing;
        if (tour.playing && tour.i >= tour.steps.length - 1) showStep(0);
        else { updatePlay(); schedule(); }
      } else if (stopBtn) {
        tour.playing = false;
        const k = tour.at.indexOf(Number(stopBtn.dataset.stop));
        showStep(k === -1 ? 0 : k);
      }
    });
    $$(".c-route-btn", fig).forEach(btn => btn.addEventListener("click", () => {
      const ti = Number(btn.dataset.trace);
      if (tour && tour.ti === ti) stopTour();
      else startTour(ti);
    }));
    // While a route plays, ←/→ step through it and Esc closes it (capture: beats canvas panning).
    fig.addEventListener("keydown", (e) => {
      if (!tour || e.target.closest("textarea, input, select")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") step(e.key === "ArrowRight" ? 1 : -1);
      else if (e.key === "Escape") stopTour();
      else return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    Object.assign(canvas, { startTour, stopTour, touring: () => Boolean(tour), stationNode: (j) => tour?.walk[j] });

    // Toolbar.
    fig.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const { w, h } = size();
      const act = btn.dataset.act;
      if (act === "zoom-in") zoomAt(1.25, w / 2, h / 2);
      else if (act === "zoom-out") zoomAt(0.8, w / 2, h / 2);
      else if (act === "fit") fit(true);
      else if (act === "full") toggleFull();
      else if (act === "menu") toggleMenu(btn);
      else if (act === "export-svg") exportSvg(canvas);
      else if (act === "export-png") exportPng(canvas);
      else if (act === "copy-mermaid") copyText(model.mermaid || "", "Mermaid copied, ready to paste into a PR or doc");
      if (act.startsWith("export") || act.startsWith("copy")) closeMenus();
    });

    function toggleFull(force) {
      const on = force ?? !fig.classList.contains("is-full");
      fig.classList.toggle("is-full", on);
      document.body.classList.toggle("has-full", on);
      const btn = $('[data-act="full"]', fig);
      if (btn) btn.setAttribute("aria-label", on ? "Exit fullscreen" : "Expand to fullscreen");
      if (!on) sizeViewport();
      requestAnimationFrame(() => { fit(); if (on) viewport.focus(); });
    }
    canvas.toggleFull = toggleFull;

    // Minimap: only when part of the diagram is out of view.
    let mmView = null;
    if (minimap) {
      const mm = [`<svg viewBox="0 0 ${cw} ${ch}" style="aspect-ratio:${cw}/${ch}" aria-hidden="true">`];
      $$(".c-group rect", svg).forEach(r => mm.push(`<rect class="c-mm-group" x="${r.getAttribute("x")}" y="${r.getAttribute("y")}" width="${r.getAttribute("width")}" height="${r.getAttribute("height")}" rx="10"/>`));
      $$(".c-edge-line, .c-msg-line", svg).forEach(p => mm.push(`<path class="c-mm-edge" d="${p.getAttribute("d")}"/>`));
      $$(".c-node", svg).forEach(n => {
        const t = n.getAttribute("transform").match(/translate\(([-\d.]+),([-\d.]+)\)/);
        const box = $(".c-node-bg", n).getBBox();
        if (t) mm.push(`<rect class="c-mm-node" x="${Number(t[1]) + box.x}" y="${Number(t[2]) + box.y}" width="${box.width}" height="${box.height}" rx="6"/>`);
      });
      mm.push(`<rect class="c-mm-view" x="0" y="0" width="0" height="0"/></svg>`);
      minimap.innerHTML = mm.join("");
      const mmScale = Math.min(190 / cw, 120 / ch);
      minimap.style.width = `${Math.round(cw * mmScale)}px`;
      mmView = $(".c-mm-view", minimap);
      const jump = (e) => {
        const r = minimap.getBoundingClientRect();
        centerOn((e.clientX - r.left) / r.width * cw, (e.clientY - r.top) / r.height * ch);
      };
      let mmDrag = false;
      minimap.addEventListener("pointerdown", (e) => { e.stopPropagation(); mmDrag = true; minimap.setPointerCapture(e.pointerId); jump(e); });
      minimap.addEventListener("pointermove", (e) => { if (mmDrag) jump(e); });
      minimap.addEventListener("pointerup", (e) => { e.stopPropagation(); mmDrag = false; });
    }
    function updateMinimap(vw, vh) {
      if (!minimap || !mmView) return;
      const x0 = view.cx - vw / 2;
      const y0 = view.cy - vh / 2;
      const clipped = x0 > 2 || y0 > 2 || x0 + vw < cw - 2 || y0 + vh < ch - 2;
      minimap.hidden = !clipped;
      mmView.setAttribute("x", x0);
      mmView.setAttribute("y", y0);
      mmView.setAttribute("width", vw);
      mmView.setAttribute("height", vh);
    }

    sizeViewport();
    fit();
    new ResizeObserver(() => apply()).observe(viewport);

    function applyAnnotations() {
      $$(".is-annotated", svg).forEach(el => el.classList.remove("is-annotated"));
      for (const note of notes) {
        if (note.target.diagram !== index) continue;
        const sel = note.target.type === "node" ? `.c-node[data-node="${note.target.index}"]` : `.c-edge[data-edge="${note.target.index}"]`;
        $(sel, svg)?.classList.add("is-annotated");
      }
    }
  });

  function toggleMenu(btn) {
    const menu = btn.parentElement.querySelector(".c-menu");
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("button")?.focus();
  }
  function closeMenus() {
    $$(".c-menu").forEach(m => { m.hidden = true; });
    $$('[data-act="menu"]').forEach(b => b.setAttribute("aria-expanded", "false"));
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".c-menu-wrap")) closeMenus(); });

  // ── hover cards: what a component is, without clicking ─────────────────────
  function cardHtml(canvas, sel) {
    const { model, svg } = canvas;
    const f = describe(model, sel);
    const facts = f.extra.slice(0, 3).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
    if (sel.kind === "node") {
      const n = model.nodes[sel.index];
      const nodeEl = $(`.c-node[data-node="${sel.index}"]`, svg);
      const brand = $(".c-brand", nodeEl);
      const mono = $(".c-node-mono", nodeEl)?.textContent;
      const icon = brand ? brand.outerHTML : mono ? `<b class="c-hc-mono">${esc(mono)}</b>` : "";
      const sub = [n.techName || n.tech, groupPath(model, n.group).join(" › ")].filter(Boolean).join(" · ");
      const flow = [
        f.incoming.length && `${f.incoming.length} in`,
        f.outgoing.length && `${f.outgoing.length} out`,
        f.files.length && `${f.files.length} file${f.files.length > 1 ? "s" : ""}`
      ].filter(Boolean).join(" · ");
      const routes = f.traces.map(t => `<span class="c-hc-route tc-${t.color}">${esc(t.label)}</span>`).join("");
      return `<div class="c-hc-head">${icon ? `<span class="c-hc-icon">${icon}</span>` : ""}<div class="c-hc-titles"><b>${esc(n.label)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>${f.status ? badge(f.status) : ""}</div>
        ${f.desc ? `<p class="c-hc-desc">${esc(f.desc)}</p>` : ""}
        ${facts ? `<dl class="c-hc-facts">${facts}</dl>` : ""}
        ${flow || routes ? `<div class="c-hc-foot"><span>${flow}</span>${routes}</div>` : ""}
        <div class="c-hc-hint">Click to inspect and comment</div>`;
    }
    const e = model.edges[sel.index];
    const words = model.kind === "sequence" ? { solid: "request", dashed: "reply" } : { solid: "call", dashed: "async", thick: "main flow" };
    const kind = [words[e.style] || e.style, e.both && "two-way", e.back && "loops back"].filter(Boolean).join(" · ");
    const text = f.desc || e.label;
    return `<div class="c-hc-head"><div class="c-hc-titles"><b>${esc(model.nodes[e.from]?.label)} → ${esc(model.nodes[e.to]?.label)}</b><span>${esc(kind)}</span></div></div>
      ${text ? `<p class="c-hc-desc">${esc(text)}</p>` : ""}
      ${facts ? `<dl class="c-hc-facts">${facts}</dl>` : ""}
      <div class="c-hc-hint">Click to inspect and comment</div>`;
  }

  /** Show the card for `sel`, anchored above (or below) an element, or at a pointer position. */
  function showCard(canvas, sel, anchor) {
    cardOwner = canvas;
    cardAnchor = anchor;
    card.innerHTML = cardHtml(canvas, sel);
    card.hidden = false;
    card.classList.remove("is-on");
    placeCard();
    requestAnimationFrame(() => card.classList.add("is-on"));
  }

  function placeCard() {
    const a = cardAnchor;
    const r = a instanceof Element ? a.getBoundingClientRect() : { left: a.x, right: a.x, top: a.y, bottom: a.y, width: 0 };
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let top = r.top - ch - 10;
    if (top < 8) top = Math.min(innerHeight - ch - 8, r.bottom + 10);
    const left = Math.max(8, Math.min(innerWidth - cw - 8, r.left + r.width / 2 - cw / 2));
    card.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function hideCard() {
    clearTimeout(cardTimer);
    cardOwner = null;
    cardAnchor = null;
    card.classList.remove("is-on");
    card.hidden = true;
  }

  /** Hover/focus wiring for one canvas: nodes and edges in the SVG, stations in the route strip. */
  function wireCards(canvas) {
    const { svg, fig, viewport } = canvas;
    const targetOf = (el) => {
      const node = el.closest?.(".c-node");
      if (node) return { el: node, sel: { kind: "node", index: Number(node.dataset.node) } };
      const edge = el.closest?.(".c-edge, .c-elabel, .c-msg");
      if (edge) return { el: edge, sel: { kind: "edge", index: Number(edge.dataset.edge) } };
      return null;
    };
    const schedule = (fn) => {
      clearTimeout(cardTimer);
      if (card.classList.contains("is-on")) fn();
      else cardTimer = setTimeout(fn, 180);
    };
    svg.addEventListener("pointerover", (e) => {
      if (e.pointerType === "touch" || e.buttons) return;
      const t = targetOf(e.target);
      if (!t) return;
      const at = t.sel.kind === "node" ? t.el : { x: e.clientX, y: e.clientY };
      schedule(() => showCard(canvas, t.sel, at));
    });
    svg.addEventListener("pointerout", (e) => {
      const t = targetOf(e.target);
      if (t && t.el.contains(e.relatedTarget)) return;
      clearTimeout(cardTimer);
      cardTimer = setTimeout(hideCard, 90);
    });
    svg.addEventListener("focusin", (e) => {
      const t = targetOf(e.target);
      if (t?.sel.kind === "node") showCard(canvas, t.sel, t.el);
    });
    svg.addEventListener("focusout", hideCard);
    viewport.addEventListener("pointerdown", hideCard);
    viewport.addEventListener("wheel", hideCard, { passive: true });
    const strip = $(".c-route", fig);
    strip?.addEventListener("pointerover", (e) => {
      const li = e.target.closest(".c-stations li");
      const stop = li ? Number($(".c-station", li).dataset.stop) : NaN;
      const node = canvas.stationNode?.(stop);
      if (node === undefined || node === null) return;
      schedule(() => showCard(canvas, { kind: "node", index: node }, $(".c-station", li)));
    });
    strip?.addEventListener("pointerout", (e) => {
      if (e.target.closest(".c-stations li")?.contains(e.relatedTarget)) return;
      clearTimeout(cardTimer);
      cardTimer = setTimeout(hideCard, 90);
    });
  }
  canvases.forEach(wireCards);
  // Element-anchored cards follow the page; pointer-anchored ones (edges) close.
  addEventListener("scroll", () => {
    if (!cardOwner) return;
    if (cardAnchor instanceof Element) placeCard();
    else hideCard();
  }, { passive: true });

  // ── inspector ──────────────────────────────────────────────────────────────
  const sheet = $(".c-sheet");
  let current = null; // { canvas?, kind, index, panel? }

  function groupPath(model, gid) {
    const byId = new Map(model.groups.map(g => [g.id, g]));
    const path = [];
    for (let g = gid; g && byId.has(g) && path.length < 8; g = byId.get(g).parent) path.unshift(byId.get(g).label);
    return path;
  }

  function targetFor(canvas, sel) {
    const { model, index } = canvas;
    const panel = canvas.fig.closest(".c-card")?.dataset.panel || "";
    if (sel.kind === "node") {
      const n = model.nodes[sel.index];
      return { type: "node", diagram: index, index: sel.index, panel, label: n.label + (n.techName ? ` (${n.techName})` : ""), line: n.line };
    }
    const e = model.edges[sel.index];
    const from = model.nodes[e.from]?.label;
    const to = model.nodes[e.to]?.label;
    return { type: model.kind === "sequence" ? "message" : "edge", diagram: index, index: sel.index, panel, label: `${from} → ${to}${e.label ? ` "${e.label}"` : ""}`, line: e.line };
  }

  // Facts about a node or edge, shared by the hover card and the inspector so they agree.
  const META_SKIP = new Set(["desc", "description", "note", "files", "file", "repo", "path", "status", "tech"]);
  function describe(model, sel) {
    const item = sel.kind === "node" ? model.nodes[sel.index] : model.edges[sel.index];
    const meta = item?.meta || {};
    const f = {
      desc: meta.desc || meta.description || meta.note || "",
      status: meta.status || "",
      files: (meta.files || meta.file || meta.repo || meta.path || "").split(",").map(x => x.trim()).filter(Boolean),
      extra: Object.entries(meta).filter(([k]) => !META_SKIP.has(k)),
      incoming: [],
      outgoing: [],
      traces: []
    };
    if (sel.kind === "node") {
      model.edges.forEach((e, k) => {
        if (e.to === sel.index) f.incoming.push({ e, k });
        if (e.from === sel.index) f.outgoing.push({ e, k });
      });
      f.traces = model.traces.filter(t => t.nodes.includes(sel.index));
    }
    return f;
  }

  function openInspector(canvas, sel) {
    current = { canvas, ...sel };
    hideCard();
    const { model, svg } = canvas;
    const sections = [];
    let kind;
    let title;
    let subtitle = "";
    let icon = "";
    const { desc, files, status, extra, incoming, outgoing, traces } = describe(model, sel);

    if (sel.kind === "node") {
      const n = model.nodes[sel.index];
      kind = model.kind === "sequence" ? "Participant" : "Component";
      title = n.label;
      subtitle = [n.techName || n.tech, groupPath(model, n.group).join(" › ")].filter(Boolean).join(" · ");
      const iconEl = $(`.c-node[data-node="${sel.index}"] .c-brand`, svg);
      icon = iconEl ? iconEl.outerHTML : "";
      if (desc) sections.push(section("About", `<p>${esc(desc)}</p>`));
      if (status) sections.push(section("Status", badge(status)));
      if (extra.length) sections.push(section("Details", `<dl class="c-kv">${extra.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`));
      if (files.length) sections.push(section("Files", `<ul class="c-files">${files.map(f => `<li><code>${esc(f)}</code></li>`).join("")}</ul>`));
      const linkList = (list, dir) => `<ul class="c-links">${list.map(({ e, k }) => {
        const other = model.nodes[dir === "in" ? e.from : e.to];
        return `<li><button type="button" class="c-link" data-go-edge="${k}"><span class="c-dir">${dir === "in" ? "←" : "→"}</span><b>${esc(other?.label)}</b><span>${esc(e.label || "")}</span></button></li>`;
      }).join("")}</ul>`;
      if (incoming.length) sections.push(section(`Incoming · ${incoming.length}`, linkList(incoming, "in")));
      if (outgoing.length) sections.push(section(`Outgoing · ${outgoing.length}`, linkList(outgoing, "out")));
      if (traces.length) sections.push(section("Routes through here", traces.map(t => `<button type="button" class="c-route-btn tc-${t.color}" data-tour-start="${model.traces.indexOf(t)}" data-tour-node="${sel.index}"><span class="c-route-play" aria-hidden="true">▶</span>${esc(t.label)}</button>`).join(" ")));
    } else {
      const e = model.edges[sel.index];
      const from = model.nodes[e.from];
      const to = model.nodes[e.to];
      kind = model.kind === "sequence" ? "Message" : "Connection";
      title = e.label || `${from.label} → ${to.label}`;
      subtitle = `${from.label} → ${to.label}${e.style && e.style !== "solid" ? ` · ${e.style}` : ""}`;
      if (desc) sections.push(section("About", `<p>${esc(desc)}</p>`));
      if (extra.length) sections.push(section("Details", `<dl class="c-kv">${extra.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`));
      sections.push(section("Endpoints", `<ul class="c-links">
        <li><button type="button" class="c-link" data-go-node="${e.from}"><span class="c-dir">from</span><b>${esc(from.label)}</b><span>${esc(from.techName || "")}</span></button></li>
        <li><button type="button" class="c-link" data-go-node="${e.to}"><span class="c-dir">to</span><b>${esc(to.label)}</b><span>${esc(to.techName || "")}</span></button></li></ul>`));
    }

    const target = targetFor(canvas, sel);
    renderSheet({ kind, title, subtitle, icon, sections, target });
  }

  function openPanelInspector(card) {
    current = { kind: "panel", panel: card.dataset.panel };
    const title = $(".c-card-title", card)?.textContent || "";
    renderSheet({
      kind: `Panel ${card.dataset.panel}`,
      title,
      subtitle: "Leave review comments on this panel",
      icon: `<span class="c-pill">${esc(card.dataset.panel)}</span>`,
      sections: [],
      target: { type: "panel", panel: card.dataset.panel, label: title, line: Number(card.dataset.line) || null }
    });
  }

  function section(title, html) {
    return `<section class="c-sheet-section"><h3>${esc(title)}</h3>${html}</section>`;
  }
  function badge(status) {
    const cls = { ok: "is-ok", warn: "is-warn", no: "is-no", err: "is-no" }[status] || "";
    return `<span class="c-badge ${cls}">${esc(status)}</span>`;
  }

  function renderSheet({ kind, title, subtitle, icon, sections, target }) {
    const key = targetKey(target);
    const mine = notes.filter(n => targetKey(n.target) === key);
    const source = pageMeta.source ? pageMeta.source.split("/").pop() : "draft";
    $(".c-sheet-icon", sheet).innerHTML = icon || `<span class="c-pill">·</span>`;
    $(".c-sheet-kind", sheet).textContent = kind;
    $(".c-sheet-title h2", sheet).textContent = title;
    $(".c-sheet-title p", sheet).textContent = subtitle;
    $(".c-sheet-body", sheet).innerHTML = `${sections.join("")}
      <section class="c-sheet-section">
        <h3>Review comments${mine.length ? ` · ${mine.length}` : ""}</h3>
        ${mine.length ? `<ul class="c-comments">${mine.map(n => `<li class="c-comment"><p>${esc(n.text)}</p><button type="button" data-del-note="${n.id}" aria-label="Delete comment">✕</button></li>`).join("")}</ul>` : ""}
        <label class="c-src" for="c-note-input">Ask the agent for a change</label>
        <textarea id="c-note-input" placeholder="e.g. Replace Redis with Dragonfly here"></textarea>
        <div class="c-row"><button type="button" class="c-btn is-primary" data-add-note>Add comment</button>${target.line ? `<span class="c-src">${esc(source)}:${target.line}</span>` : ""}</div>
      </section>`;
    sheet.dataset.target = JSON.stringify(target);
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
  }

  function closeInspector() {
    if (!sheet?.classList.contains("is-open")) return;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    if (current?.canvas) current.canvas.clear();
    current = null;
  }

  sheet?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { closeInspector(); return; }
    const goNode = e.target.closest("[data-go-node]");
    const goEdge = e.target.closest("[data-go-edge]");
    if (goNode && current?.canvas) current.canvas.select({ kind: "node", index: Number(goNode.dataset.goNode) }, { pan: true });
    if (goEdge && current?.canvas) current.canvas.select({ kind: "edge", index: Number(goEdge.dataset.goEdge) });
    if (e.target.closest("[data-add-note]")) addNote();
    const tourBtn = e.target.closest("[data-tour-start]");
    if (tourBtn && current?.canvas) current.canvas.startTour(Number(tourBtn.dataset.tourStart), { node: Number(tourBtn.dataset.tourNode) });
    const del = e.target.closest("[data-del-note]");
    if (del) {
      notes = notes.filter(n => n.id !== del.dataset.delNote);
      saveNotes();
      refreshSheet();
    }
  });
  sheet?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.target.id === "c-note-input") addNote();
  });

  function refreshSheet() {
    if (!current) return;
    if (current.kind === "panel") {
      const card = $(`.c-card[data-panel="${current.panel}"]`);
      if (card) openPanelInspector(card);
    } else openInspector(current.canvas, { kind: current.kind, index: current.index });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const full = canvases.find(c => c.fig.classList.contains("is-full"));
    const touring = canvases.find(c => c.touring?.());
    if (touring) touring.stopTour();
    else if (sheet?.classList.contains("is-open")) closeInspector();
    else if (full) full.toggleFull(false);
    closeMenus();
  });

  $$(".c-card [data-comment]").forEach(btn => btn.addEventListener("click", () => openPanelInspector(btn.closest(".c-card"))));

  // ── comments, asks, reply dock ─────────────────────────────────────────────
  let notes = store.get(`clarify:notes:${storeKey}`, []);
  const targetKey = (t) => (t.type === "panel" ? `panel:${t.panel}` : `${t.type}:${t.diagram}:${t.index}`);

  function addNote() {
    const input = $("#c-note-input");
    const text = input?.value.trim();
    if (!text) { input?.focus(); return; }
    const target = JSON.parse(sheet.dataset.target || "{}");
    notes.push({ id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, target, text });
    saveNotes();
    refreshSheet();
    toast("Comment added, it'll be included in your reply");
  }

  function saveNotes() {
    store.set(`clarify:notes:${storeKey}`, notes);
    canvases.forEach(c => c.applyAnnotations());
    $$(".c-card").forEach(card => {
      const count = notes.filter(n => n.target.panel === card.dataset.panel).length;
      const btn = $("[data-comment]", card);
      if (btn) count ? btn.setAttribute("data-count", count) : btn.removeAttribute("data-count");
    });
    updateDock();
  }

  const asks = $$(".c-ask");
  const askState = store.get(`clarify:asks:${storeKey}`, {});
  asks.forEach(fs => {
    const q = fs.dataset.question;
    const saved = askState[q];
    if (saved) {
      $$("input", fs).forEach(inp => { inp.checked = saved.picks.includes(inp.value); });
      const ta = $("textarea", fs);
      if (ta) ta.value = saved.note || "";
    }
    fs.addEventListener("input", () => {
      askState[q] = { picks: $$("input:checked", fs).map(i => i.value), note: $("textarea", fs)?.value || "" };
      store.set(`clarify:asks:${storeKey}`, askState);
      updateDock();
    });
  });

  function replyText() {
    const out = [`# Re: ${pageMeta.title || document.title}`];
    if (pageMeta.source) out.push(`Draft: ${pageMeta.source}`);
    if (asks.length) {
      out.push("", "## Decisions");
      asks.forEach((fs, i) => {
        const picks = $$("input:checked", fs).map(inp => inp.value);
        const suggested = $$("input[data-suggested]", fs).map(inp => inp.value);
        const note = $("textarea", fs)?.value.trim();
        const panel = fs.closest(".c-card")?.dataset.panel;
        out.push(`${i + 1}. [${panel}] ${fs.dataset.question}`);
        const same = picks.length && picks.join() === suggested.join();
        out.push(`   → ${picks.length ? picks.join("; ") : "(no selection)"}${same ? " (confirmed suggestion)" : ""}`);
        if (note) note.split("\n").forEach(l => out.push(`   > ${l}`));
      });
    }
    if (notes.length) {
      out.push("", "## Review comments");
      for (const n of notes) {
        const t = n.target;
        const where = t.type === "panel" ? `[${t.panel} · panel] ${t.label}` : `[${t.panel} · ${t.type}] ${t.label}`;
        const line = t.line ? ` (line ${t.line})` : "";
        out.push(`- ${where}${line}`);
        n.text.split("\n").forEach(l => out.push(`  ${l}`));
      }
    }
    return out.join("\n") + "\n";
  }

  function updateDock() {
    const dock = $(".c-dock");
    if (!dock) return;
    const decided = asks.filter(fs => $("input:checked", fs)).length;
    dock.hidden = !asks.length && !notes.length;
    const parts = [];
    if (asks.length) parts.push(`<b>${decided}/${asks.length}</b> decision${asks.length > 1 ? "s" : ""}`);
    if (notes.length) parts.push(`<b>${notes.length}</b> comment${notes.length > 1 ? "s" : ""}`);
    $(".c-dock-count", dock).innerHTML = parts.join(" · ");
  }

  $(".c-dock [data-reply]")?.addEventListener("click", () => copyText(replyText(), "Reply copied. Paste it into your agent session."));
  $("#c-copy-md")?.addEventListener("click", () => copyText(JSON.parse($("#c-markdown")?.textContent || '""'), "Markdown copied, ready for a PR description or RFC"));
  $$(".c-code .c-copy").forEach(btn => btn.addEventListener("click", () => copyText(btn.parentElement.querySelector("code").textContent, "Code copied")));

  saveNotes();

  // ── export ─────────────────────────────────────────────────────────────────
  function standaloneSvg(canvas, { forRaster = false } = {}) {
    const { svg, model } = canvas;
    const clone = svg.cloneNode(true);
    clone.setAttribute("viewBox", `0 0 ${model.width} ${model.height}`);
    clone.setAttribute("width", model.width);
    clone.setAttribute("height", model.height);
    clone.classList.remove("is-focus");
    $$(".is-hl, .is-selected, .is-annotated", clone).forEach(el => el.classList.remove("is-hl", "is-selected", "is-annotated"));
    $$("[tabindex]", clone).forEach(el => el.removeAttribute("tabindex"));
    if (forRaster) $$(".c-trace-dot", clone).forEach(el => el.remove());
    const css = $("#c-svg-css")?.textContent || "";
    const cs = getComputedStyle(document.documentElement);
    const names = [...new Set([...css.matchAll(/var\(--([\w-]+)/g)].map(m => m[1]))];
    const tokens = names.map(n => [n, cs.getPropertyValue(`--${n}`).trim()]).filter(([, v]) => v).map(([n, v]) => `--${n}:${v}`).join(";");
    const used = new Set([...clone.querySelectorAll("use")].map(u => u.getAttribute("href")));
    const symbols = [...used].map(id => $(id)?.outerHTML || "").join("");
    const defs = ($("#c-defs defs")?.innerHTML || "") + symbols;
    clone.insertAdjacentHTML("afterbegin", `<style>svg{${tokens}}${css}</style><defs>${defs}</defs>`);
    return new XMLSerializer().serializeToString(clone);
  }

  function fileBase(canvas) {
    return `${slug}-${canvas.fig.closest(".c-card")?.dataset.panel || "diagram"}`.toLowerCase();
  }

  function exportSvg(canvas) {
    download(`${fileBase(canvas)}.svg`, new Blob([standaloneSvg(canvas)], { type: "image/svg+xml" }));
    toast("SVG downloaded");
  }

  async function exportPng(canvas) {
    const { width, height } = canvas.model;
    const scale = Math.min(3, Math.sqrt(32e6 / (width * height)), Math.max(2, devicePixelRatio || 1));
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standaloneSvg(canvas, { forRaster: true }))}`;
    try {
      await img.decode();
      const c = Object.assign(document.createElement("canvas"), { width: Math.round(width * scale), height: Math.round(height * scale) });
      const ctx = c.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      c.toBlob(blob => { download(`${fileBase(canvas)}@${Math.round(scale)}x.png`, blob); toast(`PNG downloaded (${Math.round(scale)}×)`); }, "image/png");
    } catch {
      toast("PNG export failed in this browser. Try SVG instead.", "error");
    }
  }

  // ── view state across live reloads ─────────────────────────────────────────
  const saved = store.get(`clarify:view:${storeKey}`, null, "session");
  if (saved) {
    saved.views?.forEach((v, i) => {
      const c = canvases[i];
      if (!c || !v) return;
      Object.assign(c.view, v);
      c.centerOn(v.cx, v.cy);
    });
    if (saved.scroll) scrollTo(0, saved.scroll);
    store.set(`clarify:view:${storeKey}`, null, "session");
  }
  function saveView() {
    store.set(`clarify:view:${storeKey}`, { views: canvases.map(c => ({ ...c.view })), scroll: scrollY }, "session");
  }

  // ── live reload (only when served by `clarify serve`) ─────────────────────
  if (pageMeta.live && "EventSource" in window) {
    const indicator = $(".c-live");
    const es = new EventSource("/__clarify/events");
    es.addEventListener("reload", () => { saveView(); location.reload(); });
    es.addEventListener("draft-error", (e) => toast(`Draft error: ${e.data}`, "error", 0));
    es.addEventListener("open", () => { indicator?.classList.remove("is-off"); if (indicator) indicator.textContent = "Live"; });
    es.addEventListener("error", () => { indicator?.classList.add("is-off"); if (indicator) indicator.textContent = "Reconnecting…"; });
  }
})();
