// clarify/src/runtime/lesson.js
// Lesson player runtime. Inlined after client.js, and only into pages that contain a lesson.
// Each section.c-lesson reads its JSON model (src/lesson/render.js) and shows one step at a
// time: the step's article, its counter values, which places are live, its focus ring,
// failure badge, routes and cut rails, the timeline, the goals reached and the Back/Next
// labels. Without this script every article stays visible, so the lesson reads as a list.
(() => {
  "use strict";

  const $$ = (sel, root) => [...root.querySelectorAll(sel)];

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
    let now = -1;

    // Shows step i. Chips are marked as changed only when the reader moves forward.
    function show(i, announce) {
      i = Math.max(0, Math.min(total - 1, i));
      if (i === now) return;
      const forward = i > now;
      const state = states[i];
      const article = articles[i];
      now = i;

      articles.forEach((a, k) => { a.hidden = k !== i; });
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
    root.classList.add("is-ready");
    show(0, false);
  }
})();
