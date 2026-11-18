// clarify/src/runtime/lesson.js
// Lesson player runtime. Inlined after client.js, and only into pages that contain a lesson.
// Each section.c-lesson reads its JSON model (src/lesson/render.js) and shows one step at a
// time: the step's article, its counter values, which places are live, its focus ring,
// failure badge, routes and cut rails, the timeline, the goals reached and the Back/Next
// labels. Without this script every article stays visible, so the lesson reads as a list.
//
// It also plays each step's moves: pucks (copies of the stage's #l{n}-puck drawing) ride the
// rails, moved with transforms only, on a schedule that loops while the stage is on screen and
// not paused; a refused (fail) puck stops short. With reduced motion each puck is drawn once,
// resting near the end of its trip. Plus Replay and Pause, keys on the focused lesson (← → step,
// R replay, Space pause), numbered name tags when full ones would collide, and the quiz.
(() => {
  "use strict";

  const $$ = (sel, root) => [...root.querySelectorAll(sel)];
  const SVG_NS = "http://www.w3.org/2000/svg";
  // Puck timing, in ms. The first puck leaves at `start` and a trip takes `travel`. An xN move
  // sends a puck every `repeat`; a round trip's replies leave `back` after the last arrival. The
  // next move (`,`) leaves `gap` after everything before it has arrived; a move joined by `&`
  // leaves with the one before it. After the last arrival the stage rests, then it all loops.
  const TIME = { start: 300, travel: 1150, repeat: 200, back: 120, gap: 160, rest: 900 };
  const MAX_PUCKS = 5; // per move and leg: a longer xN still sends 5
  const FADE = 0.06; // the share of a trip spent fading in, and fading out
  // A resting puck (reduced motion, or a step shown while paused) and a refused (fail) puck stop
  // 55% of the way along their trip, clear of the place they head for (a rail ends at that
  // place's pad, where a tall object drawn in front can hide it); each later puck of the same
  // move stops 12% further back.
  const REST = 0.55;
  const QUEUE = 0.12;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll(".c-lesson").forEach((root) => {
    let model;
    try {
      model = JSON.parse(root.querySelector(".l-model").textContent);
    } catch {
      return;
    }
    if (model.states && model.states.length) setup(root, model);
  });

  function setup(root, model) {
    const states = model.states;
    const total = states.length;
    const articles = $$(".l-step", root);
    const chips = $$(".l-chip", root);
    const timeline = $$(".l-timeline [data-step]", root);
    const goals = $$(".l-goals li", root);
    const places = $$("[data-place]", root);
    const routes = $$(".l-route", root);
    const rails = $$(".l-rail", root);
    const back = root.querySelector('[data-l="back"]');
    const next = root.querySelector('[data-l="next"]');
    const count = root.querySelector(".l-count");
    const chapter = root.querySelector(".l-chapter");
    const live = root.querySelector(".l-live");
    const pause = root.querySelector('[data-l="pause"]');
    const pucks = motion(root, model, pause);
    let now = -1;

    // Shows step i. Chips are marked as changed only when the reader moves forward.
    function show(i, announce) {
      i = Math.max(0, Math.min(total - 1, i));
      if (i === now) return;
      const forward = i > now;
      const state = states[i];
      const article = articles[i];
      const focused = document.activeElement;
      now = i;

      articles.forEach((a, k) => { a.hidden = k !== i; });
      // Focus inside an article that just hid (a quiz answer) would fall back to the page, and the keys with it.
      if (focused && focused !== root && root.contains(focused) && focused.closest(".l-step[hidden]")) root.focus({ preventScroll: true });
      state.counters.forEach((c, k) => {
        const chip = chips[k];
        if (!chip) return;
        chip.querySelector(".l-chip-v").textContent = c.value;
        chip.dataset.level = c.level;
        chip.toggleAttribute("data-changed", forward && c.changed);
      });

      const lit = new Set(state.live);
      const focus = new Set(state.focus);
      const fail = new Set(state.fail);
      const cut = new Set(state.cut);
      const active = new Set([...state.routes, ...state.cut]);
      places.forEach((el) => {
        const id = el.dataset.place;
        el.classList.toggle("is-dim", !lit.has(id));
        if (el.classList.contains("l-focus")) el.classList.toggle("is-on", focus.has(id));
        if (el.classList.contains("l-bad")) el.classList.toggle("is-on", fail.has(id));
      });
      routes.forEach((el) => {
        el.classList.toggle("is-on", active.has(el.dataset.rail));
        el.classList.toggle("is-cut", cut.has(el.dataset.rail));
      });
      rails.forEach((el) => el.classList.toggle("is-cut", cut.has(el.dataset.rail)));
      pucks.load(state.moves);

      timeline.forEach((button, k) => {
        button.classList.toggle("is-now", k === i);
        button.classList.toggle("is-done", k < i);
        if (k === i) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      const quiz = article.classList.contains("l-quiz");
      goals.forEach((li) => li.classList.toggle("is-hit", quiz || Number(li.dataset.at) <= i + 1));

      if (i === 0 && document.activeElement === back) next.focus(); // a disabled button would drop focus
      back.disabled = i === 0;
      next.textContent = i < total - 1 ? "Next: " + model.shorts[i + 1] : "Done";
      count.textContent = "Step " + (i + 1) + " / " + total;
      chapter.textContent = article.querySelector(".l-step-k").textContent;
      chapter.dataset.chapter = article.dataset.chapter;
      if (announce) live.textContent = "Step " + (i + 1) + " of " + total + ": " + article.querySelector(".l-step-title").textContent;
    }

    back.addEventListener("click", () => show(now - 1, true));
    next.addEventListener("click", () => show(now + 1, true));
    timeline.forEach((button) => button.addEventListener("click", () => show(Number(button.dataset.step), true)));
    root.querySelector('[data-l="replay"]').addEventListener("click", () => pucks.replay());
    pause.addEventListener("click", () => pucks.pause(!pucks.paused));
    // Comment: hand the current step to clarify's review sheet (client.js listens for this event).
    root.querySelector('[data-l="comment"]').addEventListener("click", () => {
      const article = articles[now];
      const title = article.querySelector(".l-step-title").textContent;
      document.dispatchEvent(new CustomEvent("clarify:comment", {
        detail: {
          kind: "Lesson step",
          title,
          subtitle: "Leave review comments on this step",
          target: {
            type: "step",
            diagram: "lesson-" + root.dataset.lesson,
            index: now,
            panel: root.closest(".c-card")?.dataset.panel,
            label: "Step " + (now + 1) + " · " + title,
            line: Number(article.dataset.line)
          }
        }
      }));
    });

    // Keys act on this lesson only, while focus is inside it: ← → step, R replays, Space pauses
    // (a focused button keeps Space for itself). Alt, Ctrl and Cmd shortcuts stay the browser's.
    root.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") show(now + (e.key === "ArrowRight" ? 1 : -1), true);
      else if (e.key === "r" || e.key === "R") { if (!e.repeat) pucks.replay(); }
      else if (e.key === " " && !e.target.closest("button")) { if (!e.repeat) pucks.pause(!pucks.paused); }
      else return;
      e.preventDefault();
    });

    quiz(root, live);
    fitTags(root);
    root.classList.add("is-ready");
    show(0, false);
  }

  /**
   * The pucks of one lesson. load(moves) swaps in a step's pucks and starts its schedule over;
   * the clock runs only while the stage is on screen, not paused, and motion is allowed.
   */
  function motion(root, model, button) {
    const layers = new Map($$(".l-pucks", root).map((layer) => [layer.dataset.rail, layer]));
    const href = "#l" + model.n + "-puck";
    const [ox, oy] = model.origin;
    let items = []; // one per puck: { el, from, to, start, rest, fail, o }
    let loop = 0; // ms in one round of the schedule, rest included (0: nothing moves)
    let settle = 0; // loop time when every trip is over and the rest begins
    let paused = false;
    let seen = !("IntersectionObserver" in window); // whether the stage is on screen
    let held = 0; // where the clock stopped, in ms into the loop
    let t0 = 0; // performance.now() at loop time 0, while the clock runs
    let raf = 0;

    function load(moves) {
      items.forEach((p) => p.el.remove());
      items = [];
      let at = TIME.start; // when the current move (and any joined to it by &) leaves
      let end = TIME.start; // when every puck so far has arrived
      moves.forEach((m) => {
        const rail = model.rails[m.rail];
        const layer = layers.get(m.rail);
        if (!rail || !layer) return;
        if (items.length && !m.together) at = end + TIME.gap;
        const n = Math.min(MAX_PUCKS, Math.max(1, m.count || 1));
        const [a, b] = m.reverse ? [rail.b, rail.a] : [rail.a, rail.b];
        const trips = [[a, b, m.kind, at]];
        if (m.roundTrip) trips.push([b, a, "reply", at + (n - 1) * TIME.repeat + TIME.travel + TIME.back]);
        for (const [from, to, kind, start] of trips) {
          const group = [];
          for (let i = 0; i < n; i++) group.push(add(from, to, kind, start + i * TIME.repeat, REST - QUEUE * i));
          // Painted back to front: a trip heading down the screen comes toward the viewer, so its first puck
          // (always the furthest along) goes on last.
          const order = to[1] > from[1] ? [...group].reverse() : group;
          order.forEach((p) => layer.appendChild(p.el));
          items.push(...group);
          end = Math.max(end, start + (n - 1) * TIME.repeat + TIME.travel);
        }
      });
      settle = end;
      loop = items.length ? end + TIME.rest : 0;
      restart();
    }

    function add(from, to, kind, start, rest) {
      const el = document.createElementNS(SVG_NS, "use");
      el.setAttribute("href", href);
      el.setAttribute("class", "is-" + kind);
      el.setAttribute("transform", spot(from, to, 0));
      el.style.opacity = "0";
      return { el, from, to, start, rest, fail: kind === "fail", o: 0 };
    }

    // The transform that puts the puck drawing (made at the world origin) a share f of the way along a trip.
    function spot(from, to, f) {
      const x = from[0] + (to[0] - from[0]) * f - ox;
      const y = from[1] + (to[1] - from[1]) * f - oy;
      return "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ")";
    }

    function draw(p, f, o) {
      if (o !== p.o) {
        p.el.style.opacity = String(o);
        p.o = o;
      }
      if (o > 0) p.el.setAttribute("transform", spot(p.from, p.to, f));
    }

    // The schedule at loop time t: a puck shows during its trip; a refused one stops short at its
    // resting point and waits there until every trip is over.
    function frame(t) {
      for (const p of items) {
        const k = (t - p.start) / TIME.travel;
        if (p.fail) draw(p, Math.min(ease(k), p.rest), k < 0 || t > settle ? 0 : Math.min(1, k / FADE, (settle - t) / (FADE * TIME.travel)));
        else draw(p, ease(k), k < 0 || k > 1 ? 0 : Math.min(1, k / FADE, (1 - k) / FADE));
      }
    }

    // Every puck at its resting point (reduced motion, or a step shown while paused).
    function still() {
      for (const p of items) draw(p, p.rest, 1);
    }

    function tick(time) {
      raf = requestAnimationFrame(tick);
      frame(Math.max(0, time - t0) % loop);
    }

    // Starts or stops the clock to match: something to move, on screen, not paused, motion allowed.
    function sync() {
      const run = loop > 0 && seen && !paused && !reduce.matches;
      if (run && !raf) {
        t0 = performance.now() - held;
        raf = requestAnimationFrame(tick);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        held = loop ? Math.max(0, performance.now() - t0) % loop : 0;
      }
    }

    // Back to loop time 0. Paused or with reduced motion the pucks wait at their resting points.
    function restart() {
      held = 0;
      t0 = performance.now();
      if (paused || reduce.matches) still();
      else frame(0);
      sync();
    }

    function pause(on) {
      paused = on;
      root.classList.toggle("is-paused", on);
      button.setAttribute("aria-pressed", String(on));
      sync();
    }

    // Replay plays the step's moves again from the start, paused or not.
    function replay() {
      pause(false);
      restart();
    }

    // Off screen nothing animates: the clock stops and so does the route dash (lesson.css).
    if (!seen) {
      new IntersectionObserver((entries) => {
        seen = entries[entries.length - 1].isIntersecting;
        root.classList.toggle("is-offscreen", !seen);
        sync();
      }).observe(root.querySelector(".l-stage"));
    }
    reduce.addEventListener("change", restart);

    return { load, pause, replay, get paused() { return paused; } };
  }

  // Mostly steady, eased a little at both ends: the share of a trip's time → the share of its distance.
  function ease(k) {
    k = Math.max(0, Math.min(1, k));
    return 0.85 * k + 0.15 * k * k * (3 - 2 * k);
  }

  // Full name tags, or numbers plus the place key (.is-compact) when two full tags would overlap.
  // Under 520px the CSS always shows numbers; this decides for wider lessons. It measures the full
  // tags, so it takes .is-compact off first (nothing is painted in between).
  function fitTags(root) {
    const tags = $$(".l-tag", root);
    if (tags.length < 2 || !("ResizeObserver" in window)) return;
    new ResizeObserver(() => {
      root.classList.remove("is-compact");
      const boxes = tags.map((tag) => tag.getBoundingClientRect());
      const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
      root.classList.toggle("is-compact", overlap);
    }).observe(root.querySelector(".l-stage"));
  }

  // The quiz: the picked answer is marked right or wrong, every reason shows, and the result is announced.
  function quiz(root, live) {
    const options = $$(".l-option", root);
    const reasons = $$(".l-why", root);
    options.forEach((option) => option.addEventListener("click", () => {
      const right = option.dataset.correct === "true";
      options.forEach((o) => o.classList.toggle("is-picked", o === option));
      option.classList.add(right ? "is-right" : "is-wrong");
      reasons.forEach((why) => { why.hidden = false; });
      live.textContent = right ? "Right" : "Not quite";
    }));
  }
})();
