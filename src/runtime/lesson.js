// clarify/src/runtime/lesson.js
// Clarify Lesson Player powered by isokit (IsoDiagram.Stage).
// Inlined after client.js and isokit.js, and only into pages that contain a lesson / isokit block.
(() => {
  "use strict";

  const $$ = (sel, root) => [...root.querySelectorAll(sel)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const Iso = window.IsoDiagram;
  if (!Iso || !Iso.Stage) return;

  const fmtChip = (val, unit = "") => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "number") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(val)}${unit}`;
    return `${val}${unit}`;
  };

  document.querySelectorAll(".c-lesson").forEach((root) => {
    let model;
    try {
      model = JSON.parse(root.querySelector(".l-model").textContent);
    } catch {
      return;
    }
    if (model.scenes && model.scenes.length) setup(root, model);
  });

  function setup(root, model) {
    if (model.theme) Iso.configure(model.theme);

    const scenes = model.scenes;
    const total = scenes.length;
    const articles = $$(".l-step", root);
    const chips = $$(".l-chip", root);
    const timeline = $$(".l-timeline [data-step]", root);
    const goals = $$(".l-goals li", root);
    const back = root.querySelector('[data-l="back"]');
    const next = root.querySelector('[data-l="next"]');
    const count = root.querySelector(".l-count");
    const chapter = root.querySelector(".l-chapter");
    const live = root.querySelector(".l-live");
    const pauseBtn = root.querySelector('[data-l="pause"]');
    const fitBtn = root.querySelector('[data-l="fit"]');
    const replayBtn = root.querySelector('[data-l="replay"]');
    const host = root.querySelector(".l-iso-host");
    if (!host) return;

    const params = new URLSearchParams(location.search);
    const speedParam = Number(params.get("speed"));
    let userPaused = false;
    let onScreen = !("IntersectionObserver" in window);
    let now = -1;
    const shownVals = new Map();

    const stage = new Iso.Stage(host, {
      label: host.getAttribute("aria-label") || "Animated isometric diagram",
      xray: params.has("xray"),
      timeScale: speedParam > 0 ? speedParam : 1,
      gestures: { wheelZoomNeedsKey: true },
      onView(zoomed) {
        if (fitBtn) fitBtn.hidden = !zoomed;
      },
      onSwipe(dir) {
        show(now + dir, true);
      }
    });
    stage.setScenes(scenes);

    function syncPaused() {
      stage.paused = userPaused || !onScreen;
    }

    function setPaused(on) {
      userPaused = Boolean(on);
      root.classList.toggle("is-paused", userPaused);
      if (pauseBtn) {
        pauseBtn.setAttribute("aria-pressed", String(userPaused));
        pauseBtn.textContent = userPaused ? "Play" : "Pause";
      }
      syncPaused();
    }

    function updateChips(stepChips, animate) {
      if (!Array.isArray(stepChips)) return;
      stepChips.forEach((c, k) => {
        const chip = chips[k];
        if (!chip) return;
        const valEl = chip.querySelector(".l-chip-v");
        const prev = shownVals.get(k);
        const target = c.value;
        const unit = c.unit || "";
        shownVals.set(k, target);
        chip.dataset.level = c.level || "none";
        chip.toggleAttribute("data-changed", Boolean(animate && c.changed));
        chip._anim = null;
        if (!animate || reduce.matches || typeof prev !== "number" || typeof target !== "number" || prev === target) {
          valEl.textContent = fmtChip(target, unit);
          return;
        }
        const token = (chip._anim = {});
        const t0 = performance.now();
        const isInt = Number.isInteger(prev) && Number.isInteger(target);
        const frame = (ts) => {
          if (chip._anim !== token) return;
          const p = Math.min(1, (ts - t0) / 650);
          const eased = 1 - (1 - p) ** 3;
          const v = prev + (target - prev) * eased;
          valEl.textContent = fmtChip(isInt ? Math.round(v) : Math.round(v * 100) / 100, unit);
          if (p < 1) requestAnimationFrame(frame);
          else valEl.textContent = fmtChip(target, unit);
        };
        requestAnimationFrame(frame);
      });
    }

    function show(i, announce, opts = {}) {
      i = Math.max(0, Math.min(total - 1, i));
      if (i === now && !opts.force) return;
      const first = now < 0;
      const forward = i > now;
      const article = articles[i];
      const focused = document.activeElement;
      now = i;

      stage.goTo(i, { instant: Boolean(opts.instant || first || reduce.matches) });

      articles.forEach((a, k) => { a.hidden = k !== i; });
      if (focused && focused !== root && root.contains(focused) && focused.closest(".l-step[hidden]")) {
        root.focus({ preventScroll: true });
      }
      updateChips(model.chips && model.chips[i], !first && forward && !opts.instant);

      timeline.forEach((button, k) => {
        button.classList.toggle("is-now", k === i);
        button.classList.toggle("is-done", k < i);
        if (k === i) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });

      const isQuiz = article && article.classList.contains("l-quiz");
      goals.forEach((li) => li.classList.toggle("is-hit", isQuiz || Number(li.dataset.at) <= i + 1));

      if (i === 0 && document.activeElement === back) next.focus();
      if (i === total - 1 && i > 0 && document.activeElement === next) back.focus();
      back.disabled = i === 0;
      next.disabled = i === total - 1;
      next.textContent = i < total - 1 ? "Next: " + model.shorts[i + 1] : "Done";
      count.textContent = "Step " + (i + 1) + " / " + total;
      if (article) {
        chapter.textContent = article.querySelector(".l-step-k").textContent;
        chapter.dataset.chapter = article.dataset.chapter;
        if (announce) live.textContent = "Step " + (i + 1) + " of " + total + ": " + article.querySelector(".l-step-title").textContent;
      }
    }

    function replay() {
      setPaused(false);
      if (now <= 0) {
        stage.clear();
        stage.goTo(0);
      } else {
        stage.goTo(now - 1, { instant: true });
        stage.goTo(now);
      }
    }

    back.addEventListener("click", () => show(now - 1, true));
    next.addEventListener("click", () => show(now + 1, true));
    timeline.forEach((button) => button.addEventListener("click", () => show(Number(button.dataset.step), true)));
    if (replayBtn) replayBtn.addEventListener("click", replay);
    if (pauseBtn) pauseBtn.addEventListener("click", () => setPaused(!userPaused));
    if (fitBtn) fitBtn.addEventListener("click", () => stage.resetView());

    const commentBtn = root.querySelector('[data-l="comment"]');
    if (commentBtn) {
      commentBtn.addEventListener("click", () => {
        const article = articles[now];
        if (!article) return;
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
    }

    root.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") show(now + (e.key === "ArrowRight" ? 1 : -1), true);
      else if (e.key === "r" || e.key === "R" || e.code === "KeyR") { if (!e.repeat) replay(); }
      else if (e.key === "x" || e.key === "X" || e.code === "KeyX") { if (!e.repeat) stage.xray = !stage.xray; }
      else if (e.key === " " && !e.target.closest("button")) { if (!e.repeat) setPaused(!userPaused); }
      else return;
      e.preventDefault();
    });

    if (!onScreen) {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        root.classList.toggle("is-offscreen", !onScreen);
        syncPaused();
      }).observe(host);
    }

    quiz(root, live);
    root.classList.add("is-ready");
    const stepFromHash = Number(params.get("step"));
    const initial = Number.isInteger(stepFromHash) && stepFromHash >= 1 && stepFromHash <= total ? stepFromHash - 1 : 0;
    show(initial, false, { instant: true });

    // Expose programmatic handle for visual verification & scripting.
    root.__clarifyLesson = { stage, show, replay, setPaused, get step() { return now; }, total };
  }

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
