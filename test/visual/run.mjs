#!/usr/bin/env node
// clarify/test/visual/run.mjs
// Visual regression + in-browser sanity audit. Renders every scenario in headless
// Chromium (driven over CDP, no Playwright dependency), then:
//   1. asserts DOM invariants: no console errors, labels fit their boxes, no page overflow
//   2. compares a screenshot against test/visual/baselines/<name>.png
// Usage: node test/visual/run.mjs [--update] [--only name] [--baselines dir] [--output dir]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDraft } from "../../src/parser.js";
import { compile } from "../../src/render.js";
import { launchBrowser, findChrome, decodePng, encodePng, diffImages } from "./cdp.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const baselines = flag("--baselines") ? path.resolve(flag("--baselines")) : path.join(here, "baselines");
const output = flag("--output") ? path.resolve(flag("--output")) : path.join(here, "output");
const update = args.includes("--update");
const only = flag("--only");
const MAX_DIFF = 0.002;

/** @type {Array<{ name: string, example: string, width?: number, height?: number, scheme?: "light"|"dark", theme?: string, viewport?: boolean, motion?: boolean, act?: string, noShot?: boolean }>} */
const SCENARIOS = [
  { name: "ecommerce-light", example: "ecommerce-architecture", scheme: "light" },
  { name: "ecommerce-dark", example: "ecommerce-architecture", scheme: "dark" },
  { name: "ecommerce-mobile", example: "ecommerce-architecture", width: 390, height: 844 },
  { name: "ecommerce-inspector", example: "ecommerce-architecture", scheme: "dark", viewport: true, act: "inspect" },
  { name: "ecommerce-trace", example: "ecommerce-architecture", viewport: true, act: "trace" },
  { name: "ecommerce-nord", example: "ecommerce-architecture", theme: "nord", viewport: true },
  { name: "ecommerce-blueprint", example: "ecommerce-architecture", theme: "blueprint", viewport: true },
  { name: "platform-catppuccin", example: "platform-topology", viewport: true },
  { name: "mermaid-tokyo", example: "mermaid-compat" },
  { name: "sequence-paper", example: "checkout-sequence" },
  { name: "codebase-tour-light", example: "codebase-tour" },
  { name: "codebase-tour-mobile", example: "codebase-tour", width: 390, height: 844, viewport: true, act: "trace-mobile" },
  { name: "ecommerce-hovercard", example: "ecommerce-architecture", viewport: true, act: "hovercard" },
  { name: "reply-loop", example: "ecommerce-architecture", viewport: true, act: "reply", noShot: true },
  { name: "export", example: "ecommerce-architecture", viewport: true, act: "export", noShot: true },
  { name: "lesson-light", example: "git-commit-lesson", scheme: "light" },
  { name: "lesson-dark", example: "git-commit-lesson", scheme: "dark" },
  { name: "lesson-mobile", example: "git-commit-lesson", width: 390, height: 844, viewport: true, act: "lesson-top" },
  { name: "lesson-fail", example: "git-commit-lesson", act: "lesson-step-9" },
  { name: "lesson-core", example: "git-commit-lesson", viewport: true, act: "lesson-core", noShot: true },
  { name: "lesson-motion", example: "git-commit-lesson", viewport: true, motion: true, act: "lesson-motion", noShot: true },
  { name: "lesson-still", example: "git-commit-lesson", viewport: true, act: "lesson-still", noShot: true },
  { name: "lesson-compact", example: "git-commit-lesson", width: 390, height: 844, viewport: true, act: "lesson-compact", noShot: true },
  { name: "lesson-quiz", example: "git-commit-lesson", viewport: true, act: "lesson-quiz", noShot: true },
  { name: "lesson-comment", example: "git-commit-lesson", viewport: true, act: "lesson-comment", noShot: true }
];

// Runs inside the page; returns a list of problems.
const AUDIT = `(() => {
  const problems = [];
  if (document.documentElement.scrollWidth > innerWidth + 1) problems.push("horizontal page overflow: " + document.documentElement.scrollWidth + " > " + innerWidth);
  document.querySelectorAll(".c-diagram").forEach((fig, d) => {
    const model = JSON.parse(fig.querySelector(".c-model").textContent);
    const nodes = fig.querySelectorAll(".c-node");
    if (nodes.length !== model.nodes.length) problems.push("diagram " + d + ": " + nodes.length + " nodes drawn, model has " + model.nodes.length);
    nodes.forEach(node => {
      const bg = node.querySelector(".c-node-bg").getBBox();
      node.querySelectorAll(".c-node-title tspan, .c-node-caption").forEach(t => {
        const b = t.getBBox();
        if (b.x < bg.x + 2 || b.x + b.width > bg.x + bg.width - 2) problems.push("diagram " + d + ": text overflows node: '" + t.textContent + "' (" + Math.round(b.x + b.width) + " > " + Math.round(bg.x + bg.width) + ")");
      });
    });
    fig.querySelectorAll(".c-elabel").forEach(l => {
      const r = l.querySelector("rect").getBBox();
      const t = l.querySelector("text").getBBox();
      if (t.width > r.width + 1) problems.push("diagram " + d + ": edge label overflows: '" + l.textContent + "'");
    });
    const techNodes = model.nodes.filter(n => n.tech).length;
    const icons = fig.querySelectorAll(".c-node .c-brand").length;
    if (icons < techNodes) problems.push("diagram " + d + ": " + icons + " icons for " + techNodes + " tech nodes");
  });
  return problems;
})()`;

async function waitForFile(dir, pattern, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const hit = fs.existsSync(dir) && fs.readdirSync(dir).find(f => pattern.test(f) && !f.endsWith(".crdownload"));
    if (hit) return path.join(dir, hit);
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`no download matching ${pattern}`);
}

async function act(page, kind) {
  if (kind === "hovercard") {
    const sel = await page.eval(`(() => { const m = JSON.parse(document.querySelector(".c-model").textContent); return '.c-node[data-node="' + m.nodes.findIndex(n => n.id === "Checkout Service") + '"]'; })()`);
    await page.hover(sel);
    await page.sleep(400);
    const state = await page.eval(`(() => { const c = document.querySelector(".c-hovercard"); const r = c.getBoundingClientRect(); return { on: c.classList.contains("is-on"), text: c.textContent.replace(/\\s+/g, " "), inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; })()`);
    for (const needle of ["Checkout Service", "Owns cart pricing", "owner", "Payments team", "1 in · 3 out · 2 files", "Checkout"]) {
      if (!state.text.includes(needle)) throw new Error(`hover card missing "${needle}": ${state.text}`);
    }
    if (!state.on || !state.inView) throw new Error(`hover card not visible in viewport: ${JSON.stringify(state)}`);
    // Leaving the node hides the card.
    await page.hover(".c-card-title");
    await page.sleep(300);
    if (await page.eval(`document.querySelector(".c-hovercard").classList.contains("is-on")`)) throw new Error("hover card did not hide");
    await page.hover(sel);
    await page.sleep(400);
  }
  if (kind === "trace-mobile") {
    await page.click(".c-route-btn");
    await page.click('[data-tour="next"]');
    await page.sleep(700);
    await page.eval(`document.querySelector(".c-stage").scrollIntoView({ block: "start" })`);
    const pos = await page.eval(`getComputedStyle(document.querySelector(".c-route")).position`);
    if (pos !== "static") throw new Error(`route strip should sit under the map on phones, got ${pos}`);
  }
  if (kind === "reply") {
    // Comment on a node, then copy the reply; the clipboard is stubbed to capture text.
    await page.eval(`navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }`);
    const sel = await page.eval(`(() => { const m = JSON.parse(document.querySelector(".c-model").textContent); return '.c-node[data-node="' + m.nodes.findIndex(n => n.id === "Session Cache") + '"]'; })()`);
    await page.click(sel);
    await page.sleep(300);
    await page.eval(`(() => { const t = document.querySelector("#c-note-input"); t.value = "Replace Redis with Dragonfly"; })()`);
    await page.click("[data-add-note]");
    await page.click(".c-dock [data-reply]");
    await page.sleep(100);
    const reply = await page.eval("window.__copied || ''");
    for (const needle of ["## Decisions", "→ Multi-region read replicas with auto-failover (confirmed suggestion)", "## Review comments", "[A · node] Session Cache (Redis) (line", "Replace Redis with Dragonfly"]) {
      if (!reply.includes(needle)) throw new Error(`reply missing "${needle}":\n${reply}`);
    }
    const marked = await page.eval(`document.querySelectorAll(".c-node.is-annotated").length`);
    if (marked !== 1) throw new Error(`expected 1 annotated node, got ${marked}`);
  }
  if (kind === "export") {
    const dir = path.join(output, "downloads");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    await page.allowDownloads(dir);
    for (const [act, pattern] of [["export-svg", /\.svg$/], ["export-png", /\.png$/]]) {
      await page.click('[data-act="menu"]');
      await page.click(`[data-act="${act}"]`);
      await waitForFile(dir, pattern);
    }
    const svgFile = await waitForFile(dir, /\.svg$/);
    const svg = fs.readFileSync(svgFile, "utf8");
    if (!/<style>svg\{[^}]*--canvas:#[0-9a-f]{3,8}[;}]/i.test(svg)) throw new Error("exported SVG lacks resolved theme tokens");
    if (/--[\w-]+:[;}]/.test(svg)) throw new Error("exported SVG has empty tokens");
    if (!svg.includes("<symbol id=\"b-react\"")) throw new Error("exported SVG lacks brand symbols");
    if (!svg.includes('id="c-arrow"')) throw new Error("exported SVG lacks arrow markers");
    const model = await page.eval(`JSON.parse(document.querySelector(".c-model").textContent)`);
    const png = decodePng(fs.readFileSync(await waitForFile(dir, /\.png$/)));
    if (png.width < model.width * 2) throw new Error(`PNG is ${png.width}px wide, expected ≥ ${model.width * 2}`);
    // The exported SVG must render standalone (no page CSS): screenshot it as its own document.
    await page.goto(pathToFileURL(svgFile).href);
    fs.writeFileSync(path.join(output, "export-standalone.png"), await page.screenshot({ fullPage: true }));
  }
  if (kind === "inspect") {
    const sel = await page.eval(`(() => { const m = JSON.parse(document.querySelector(".c-model").textContent); return '.c-node[data-node="' + m.nodes.findIndex(n => n.id === "Checkout Service") + '"]'; })()`);
    await page.click(sel);
    await page.sleep(350);
    const open = await page.eval(`document.querySelector(".c-sheet").classList.contains("is-open")`);
    if (!open) throw new Error("inspector did not open");
  }
  if (kind === "trace") {
    // Play the route, step to stop 6, and check the map, strip and narration agree.
    await page.click(".c-route-btn");
    for (let i = 0; i < 5; i++) await page.click('[data-tour="next"]');
    await page.sleep(700);
    const state = await page.eval(`(() => ({
      count: document.querySelector(".c-route-count").textContent,
      text: document.querySelector(".c-route-text").textContent,
      current: document.querySelector(".c-stations li.is-current .c-station-name").textContent,
      visitedEdges: document.querySelectorAll(".c-edge.is-visited").length,
      touring: document.querySelector(".c-svg").classList.contains("is-touring")
    }))()`);
    if (state.count !== "Step 6 of 8") throw new Error(`unexpected step: ${state.count}`);
    if (state.current !== "Session Cache" || !state.text.startsWith("Checkout Service → Session Cache")) throw new Error(`strip out of sync: ${JSON.stringify(state)}`);
    if (state.visitedEdges < 5 || !state.touring) throw new Error(`route not drawn: ${JSON.stringify(state)}`);
  }
  if (kind === "lesson-step-9") {
    // The refused push: the red badge on origin, the cut rail and the red puck stopped short.
    await page.click('.c-lesson .l-timeline [data-step="8"]');
    await page.sleep(200);
  }
  if (kind === "lesson-top") {
    // A phone screen at the lesson's top: header, counters, stage, key and the sticky Back/Next bar.
    // (A full-page phone capture would paint that sticky bar in the middle of the page.)
    await page.eval(`document.querySelector(".c-lesson").scrollIntoView({ block: "start" })`);
    await page.sleep(200);
  }
  if (kind === "lesson-core") {
    // Step switching: one article at a time, chips, places, focus ring and failure badge follow the step.
    const shown = () => page.eval(`[...document.querySelectorAll(".c-lesson .l-step")].filter(a => getComputedStyle(a).display !== "none").map(a => a.dataset.step).join(",")`);
    if (await shown() !== "0") throw new Error(`only article 0 should be visible at first, got [${await shown()}]`);
    await page.click('.c-lesson [data-l="next"]');
    await page.click('.c-lesson [data-l="next"]');
    if (await shown() !== "2") throw new Error(`after two Next clicks only article 2 should be visible, got [${await shown()}]`);
    const step3 = await page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      const chip = [...root.querySelectorAll(".l-chip")].find(c => c.querySelector(".l-chip-k").textContent.trim() === "Staged");
      return {
        value: chip && chip.querySelector(".l-chip-v").textContent.trim(),
        level: chip && chip.dataset.level,
        changed: Boolean(chip && chip.hasAttribute("data-changed")),
        trayDim: root.querySelector('.l-obj[data-place="tray"]').classList.contains("is-dim"),
        focusOn: root.querySelector('.l-focus[data-place="tray"]').classList.contains("is-on")
      };
    })()`);
    if (step3.value !== "2 files" || step3.level !== "good" || !step3.changed) throw new Error(`step 3: Staged chip should read "2 files", good, changed: ${JSON.stringify(step3)}`);
    if (step3.trayDim || !step3.focusOn) throw new Error(`step 3: the tray should be live and focused: ${JSON.stringify(step3)}`);
    await page.click('.c-lesson .l-timeline [data-step="8"]');
    const step9 = await page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      const article = [...root.querySelectorAll(".l-step")].find(a => getComputedStyle(a).display !== "none");
      return {
        bad: root.querySelector('.l-bad[data-place="origin"]').classList.contains("is-on"),
        step: article && article.dataset.step,
        body: parseFloat(getComputedStyle(article.querySelector("p")).fontSize),
        title: parseFloat(getComputedStyle(article.querySelector(".l-step-title")).fontSize)
      };
    })()`);
    if (!step9.bad || step9.step !== "8") throw new Error(`step 9: origin should show the failure badge: ${JSON.stringify(step9)}`);
    if (step9.body !== 16 || step9.title < 22) throw new Error(`step text should be 16px with a title of at least 22px: ${JSON.stringify(step9)}`);
  }
  if (kind === "lesson-motion") {
    // Pucks travel on step 3, Pause holds them, Replay plays again, and ←/→ on the lesson never reach a route tour.
    // page.click measures its target right after scrolling it into view; with motion allowed the page scrolls
    // smoothly (page.css), so the click would land where the button used to be. Scroll instantly instead.
    await page.eval(`document.documentElement.style.scrollBehavior = "auto"`);
    const pucks = () => page.eval(`[...document.querySelectorAll(".c-lesson .l-pucks use")].map(u => u.getAttribute("transform")).join(" ; ")`);
    const count = () => page.eval(`document.querySelector(".c-lesson .l-count").textContent`);
    const pause = () => page.eval(`(() => { const root = document.querySelector(".c-lesson"); return { paused: root.classList.contains("is-paused"), pressed: root.querySelector('[data-l="pause"]').getAttribute("aria-pressed") }; })()`);
    // A keydown (synthetic KeyboardEvent) on whatever has focus; returns whether a handler called preventDefault.
    const press = (key) => page.eval(`(() => { const e = new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(e); return e.defaultPrevented; })()`);
    const travels = async (when) => {
      const a = await pucks();
      await page.sleep(300);
      const b = await pucks();
      if (!b) throw new Error(`${when}: no pucks in .l-pucks`);
      if (a === b) throw new Error(`${when}: two samples 300 ms apart should differ, both were "${b}"`);
    };
    await page.click('.c-lesson [data-l="next"]');
    await page.click('.c-lesson [data-l="next"]');
    await travels("step 3");
    await page.click('.c-lesson [data-l="pause"]');
    const held = await pause();
    if (!held.paused || held.pressed !== "true") throw new Error(`Pause should set is-paused on the lesson and aria-pressed="true": ${JSON.stringify(held)}`);
    const c = await pucks();
    await page.sleep(300);
    const d = await pucks();
    if (c !== d) throw new Error(`paused: pucks should hold still, got "${c}" then "${d}"`);
    if (!(await count()).startsWith("Step 3 ")) throw new Error(`expected step 3 before the key press, got "${await count()}"`);
    await page.eval(`document.querySelector(".c-lesson").focus()`);
    if (!await press("ArrowRight")) throw new Error("ArrowRight on the focused lesson should be handled (preventDefault)");
    if (!(await count()).startsWith("Step 4 ")) throw new Error(`ArrowRight on the focused lesson should go to step 4, got "${await count()}"`);
    await page.click('.c-lesson [data-l="replay"]');
    const played = await pause();
    if (played.paused || played.pressed !== "false") throw new Error(`Replay should play again (no is-paused, aria-pressed="false"): ${JSON.stringify(played)}`);
    await travels("step 4 after Replay");
    // Start the panel C route tour and stop its autoplay on stop 2; keys pressed in the lesson must not move it.
    await page.click(".c-route-btn");
    await page.click('[data-tour="next"]');
    const tour = () => page.eval(`document.querySelector(".c-route-count").textContent`);
    const before = await tour();
    if (!/^Step 2 of \d+$/.test(before)) throw new Error(`the panel C route tour should be on stop 2, got "${before}"`);
    await page.eval(`document.querySelector(".c-lesson").focus()`);
    await press("ArrowRight");
    const after = await tour();
    if (after !== before) throw new Error(`ArrowRight in the lesson moved the route tour: "${before}" → "${after}"`);
    if (!(await count()).startsWith("Step 5 ")) throw new Error(`ArrowRight in the lesson should still step the lesson (step 5) while a tour runs, got "${await count()}"`);
    // A refused push stops short (rulings R23, R26): sampled every 100 ms from Replay on step 9, the fail puck is
    // seen travelling and waiting at 55% of its trip, and never past it (±1 unit).
    await page.click('.c-lesson .l-timeline [data-step="8"]');
    await page.click('.c-lesson [data-l="replay"]');
    const failAt = () => page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      const model = JSON.parse(root.querySelector(".l-model").textContent);
      const move = model.states[8].moves.find(m => m.kind === "fail");
      const rail = model.rails[move.rail];
      const [from, to] = move.reverse ? [rail.b, rail.a] : [rail.a, rail.b];
      const u = root.querySelector('.l-pucks[data-rail="' + move.rail + '"] use.is-fail');
      const m = u.transform.baseVal.consolidate().matrix;
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const along = ((model.origin[0] + m.e - from[0]) * (to[0] - from[0]) + (model.origin[1] + m.f - from[1]) * (to[1] - from[1])) / len;
      return { beyond: Math.round((along - 0.55 * len) * 100) / 100, shown: parseFloat(getComputedStyle(u).opacity) > 0 };
    })()`);
    const trail = [];
    for (let i = 0; i < 25; i++) {
      trail.push(await failAt());
      await page.sleep(100);
    }
    const shown = trail.filter(s => s.shown);
    if (shown.some(s => s.beyond > 1)) throw new Error(`step 9: the fail puck went past 55% of its trip: ${JSON.stringify(trail)}`);
    if (!shown.some(s => s.beyond < -5)) throw new Error(`step 9: the fail puck was never seen travelling: ${JSON.stringify(trail)}`);
    if (!shown.some(s => Math.abs(s.beyond) <= 1)) throw new Error(`step 9: the fail puck was never seen waiting at 55%: ${JSON.stringify(trail)}`);
  }
  if (kind === "lesson-still") {
    // Reduced motion: no travel and no loop. Step 3 moves you -> tray x2, so its two pucks rest at 55% and 43%
    // of the trip (rulings R21, R22, R26), each on top at its centre.
    await page.click('.c-lesson [data-l="next"]');
    await page.click('.c-lesson [data-l="next"]');
    await page.eval(`document.querySelector(".c-lesson .l-stage").scrollIntoView({ block: "center" })`);
    const sample = () => page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      const model = JSON.parse(root.querySelector(".l-model").textContent);
      const [move] = model.states[2].moves;
      const rail = model.rails[move.rail];
      const [from, to] = move.reverse ? [rail.b, rail.a] : [rail.a, rail.b];
      const pucks = [...root.querySelectorAll(".l-pucks use")].map(u => {
        const m = u.transform.baseVal.consolidate();
        const at = [model.origin[0] + (m ? m.matrix.e : 0), model.origin[1] + (m ? m.matrix.f : 0)];
        const share = ((at[0] - from[0]) * (to[0] - from[0]) + (at[1] - from[1]) * (to[1] - from[1])) / ((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
        const b = u.getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return {
          rail: u.parentNode.dataset.rail,
          at: at.map(v => Math.round(v * 100) / 100),
          share: Math.round(share * 1000) / 1000,
          opacity: getComputedStyle(u).opacity,
          onTop: Boolean(hit && hit.closest(".l-pucks"))
        };
      });
      return { pucks, expected: [0.55, 0.43].map(f => [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f]) };
    })()`);
    const a = await sample();
    await page.sleep(300);
    const b = await sample();
    if (a.pucks.length !== 2) throw new Error(`step 3 (you -> tray x2): expected 2 pucks, got ${a.pucks.length}: ${JSON.stringify(a.pucks)}`);
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`reduced motion: pucks should not move: ${JSON.stringify(a.pucks)} then ${JSON.stringify(b.pucks)}`);
    const [first, second] = [...a.pucks].sort((p, q) => q.share - p.share);
    if (first.at.join() === second.at.join()) throw new Error(`step 3: x2 should rest at two distinct positions, both at ${first.at}`);
    [first, second].forEach((p, i) => {
      const [ex, ey] = a.expected[i];
      const off = Math.max(Math.abs(p.at[0] - ex), Math.abs(p.at[1] - ey));
      if (!(off <= 1)) throw new Error(`step 3: puck ${i + 1} should rest at ${[55, 43][i]}% of its trip (±1), it is ${off.toFixed(2)} away: ${JSON.stringify(p)}`);
      if (p.opacity === "0") throw new Error(`step 3: puck ${i + 1} is not drawn: ${JSON.stringify(p)}`);
      if (!p.onTop) throw new Error(`step 3: puck ${i + 1} is covered at its centre: ${JSON.stringify(p)}`);
    });
    // Every step (rulings R24, R26): no resting puck's box is more than 25% covered by any object's box (.l-obj)
    // or any name tag's box (.l-tag).
    const resting = await page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      const model = JSON.parse(root.querySelector(".l-model").textContent);
      const share = (p, t) => Math.max(0, Math.min(p.right, t.right) - Math.max(p.left, t.left)) * Math.max(0, Math.min(p.bottom, t.bottom) - Math.max(p.top, t.top)) / (p.width * p.height);
      const worst = (box, sel) => [...root.querySelectorAll(sel)].map(el => [el.dataset.place, Math.round(100 * share(box, el.getBoundingClientRect()))]).sort((p, q) => q[1] - p[1])[0] || ["", 0];
      const out = [];
      model.states.forEach((state, s) => {
        root.querySelector('.l-timeline [data-step="' + s + '"]').click();
        root.querySelector(".l-stage").scrollIntoView({ block: "center" });
        root.querySelectorAll(".l-pucks use").forEach(u => {
          const box = u.getBoundingClientRect();
          out.push({ step: s + 1, rail: u.parentNode.dataset.rail, kind: u.getAttribute("class"), obj: worst(box, ".l-obj"), tag: worst(box, ".l-tag") });
        });
      });
      return out;
    })()`);
    if (!resting.length) throw new Error("no resting pucks on any step");
    const hidden = resting.filter(p => p.obj[1] > 25 || p.tag[1] > 25);
    if (hidden.length) throw new Error(`resting pucks covered over 25% by an object's or a tag's box: ${JSON.stringify(hidden)}`);
  }
  if (kind === "lesson-compact") {
    // Name tags never collide (numbered tags + the key when full ones would) and nothing is under 12px.
    const tags = () => page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      const els = [...root.querySelectorAll(".l-tag")];
      const r = els.map(t => t.getBoundingClientRect());
      const hits = [];
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
        if (r[i].left < r[j].right && r[j].left < r[i].right && r[i].top < r[j].bottom && r[j].top < r[i].bottom) hits.push(els[i].dataset.place + "/" + els[j].dataset.place);
      }
      const small = [...root.querySelectorAll(".l-tag, .l-chip-k")].map(el => el.className + " " + getComputedStyle(el).fontSize).filter(s => !(parseFloat(s.split(" ").pop()) >= 12));
      return { compact: root.classList.contains("is-compact"), hits, small };
    })()`);
    const phone = await tags();
    if (!phone.compact && phone.hits.length) throw new Error(`390px: tags overlap without is-compact: ${phone.hits.join(", ")}`);
    if (phone.small.length) throw new Error(`390px: name tag or counter label under 12px: ${phone.small.join(", ")}`);
    // Above 520px the CSS keeps full tags and the runtime decides (R19): stack two tags and resize the stage
    // → numbered tags; put them back and resize again → full tags.
    await page.eval(`(() => { const root = document.querySelector(".c-lesson"); const [a, b] = root.querySelectorAll(".l-tag"); window.__tag = [b.style.left, b.style.top]; b.style.left = a.style.left; b.style.top = a.style.top; root.style.width = "720px"; })()`);
    await page.sleep(250);
    const stacked = await tags();
    if (!stacked.compact) throw new Error(`720px lesson with two stacked tags: the runtime should add is-compact: ${JSON.stringify(stacked)}`);
    await page.eval(`(() => { const root = document.querySelector(".c-lesson"); const b = root.querySelectorAll(".l-tag")[1]; [b.style.left, b.style.top] = window.__tag; root.style.width = "740px"; })()`);
    await page.sleep(250);
    const apart = await tags();
    if (apart.compact || apart.hits.length) throw new Error(`740px lesson with the tags apart: full tags should come back without overlaps: ${JSON.stringify(apart)}`);
  }
  if (kind === "lesson-quiz") {
    // Picking an answer marks it right or wrong, shows every reason and tells screen readers.
    const quiz = () => page.eval(`(() => {
      const root = document.querySelector(".c-lesson");
      return {
        options: [...root.querySelectorAll(".l-option")].map(o => ({ correct: o.dataset.correct, cls: o.className })),
        hidden: [...root.querySelectorAll(".l-why")].filter(w => w.hidden || getComputedStyle(w).display === "none").length,
        live: root.querySelector(".l-live").textContent
      };
    })()`);
    await page.click(".c-lesson .l-timeline li:last-child button");
    await page.click('.c-lesson .l-option[data-correct="false"]');
    const wrong = await quiz();
    const first = wrong.options.find(o => o.correct === "false");
    if (!/\bis-wrong\b/.test(first.cls) || !/\bis-picked\b/.test(first.cls)) throw new Error(`the picked wrong option should get is-picked and is-wrong: ${JSON.stringify(wrong.options)}`);
    if (wrong.hidden) throw new Error(`${wrong.hidden} reason(s) still hidden after picking an answer`);
    if (wrong.live !== "Not quite") throw new Error(`live text should be "Not quite", got "${wrong.live}"`);
    await page.click('.c-lesson .l-option[data-correct="true"]');
    const right = await quiz();
    const correct = right.options.find(o => o.correct === "true");
    if (!/\bis-right\b/.test(correct.cls) || !/\bis-picked\b/.test(correct.cls)) throw new Error(`the picked right option should get is-picked and is-right: ${JSON.stringify(right.options)}`);
    if (right.options.filter(o => /\bis-picked\b/.test(o.cls)).length !== 1) throw new Error(`only the latest answer should be is-picked: ${JSON.stringify(right.options)}`);
    if (right.live !== "Right") throw new Error(`live text should be "Right", got "${right.live}"`);
  }
  if (kind === "lesson-comment") {
    // The guide header's comment button opens the inspector sheet on the current step; a note joins the reply.
    await page.eval(`navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }`);
    await page.click('.c-lesson [data-l="next"]');
    const title = await page.eval(`document.querySelector('.c-lesson .l-step[data-step="1"] .l-step-title').textContent`);
    await page.click('.c-lesson [data-l="comment"]');
    await page.sleep(300);
    const sheet = await page.eval(`(() => { const s = document.querySelector(".c-sheet"); return { open: s.classList.contains("is-open"), title: s.querySelector(".c-sheet-title h2").textContent, kind: s.querySelector(".c-sheet-kind").textContent }; })()`);
    if (!sheet.open || sheet.title !== title || sheet.kind !== "Lesson step") throw new Error(`the sheet should open on "${title}" as a Lesson step: ${JSON.stringify(sheet)}`);
    await page.eval(`document.querySelector("#c-note-input").value = "Say what the snapshot keeps"`);
    await page.click("[data-add-note]");
    await page.sleep(100);
    const after = await page.eval(`(() => { const s = document.querySelector(".c-sheet"); return { open: s.classList.contains("is-open"), title: s.querySelector(".c-sheet-title h2").textContent, comments: s.querySelectorAll(".c-comment").length, dock: document.querySelector(".c-dock-count").textContent, shown: document.querySelector(".c-dock").hidden === false }; })()`);
    if (!after.open || after.title !== title || after.comments !== 1) throw new Error(`adding a note should keep the same sheet open with the note listed: ${JSON.stringify(after)}`);
    if (!after.shown || !/1\s*comment/.test(after.dock)) throw new Error(`the dock should show 1 comment: ${JSON.stringify(after)}`);
    await page.click(".c-dock [data-reply]");
    await page.sleep(100);
    const reply = await page.eval("window.__copied || ''");
    for (const needle of ["## Review comments", "[B · step] Step 2 · " + title, "(line ", "Say what the snapshot keeps"]) {
      if (!reply.includes(needle)) throw new Error(`reply missing "${needle}":\n${reply}`);
    }
    // Deleting the note re-renders the same sheet, now without it.
    await page.click("[data-del-note]");
    await page.sleep(100);
    const gone = await page.eval(`(() => { const s = document.querySelector(".c-sheet"); return { open: s.classList.contains("is-open"), comments: s.querySelectorAll(".c-comment").length, title: s.querySelector(".c-sheet-title h2").textContent }; })()`);
    if (!gone.open || gone.comments !== 0 || gone.title !== title) throw new Error(`deleting the note should re-render the same sheet without it: ${JSON.stringify(gone)}`);
  }
}

async function main() {
  if (!findChrome()) {
    console.log("⚠ visual suite skipped: no Chromium found (set CHROME_PATH)");
    return;
  }
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(baselines, { recursive: true });
  const pages = new Map();
  for (const s of SCENARIOS) {
    if (pages.has(s.example)) continue;
    const draft = parseDraft(fs.readFileSync(path.join(root, "examples", `${s.example}.md`), "utf8"));
    const file = path.join(output, `${s.example}.html`);
    fs.writeFileSync(file, compile(draft).html);
    pages.set(s.example, file);
  }

  const browser = await launchBrowser();
  let failures = 0;
  try {
    for (const s of SCENARIOS) {
      if (only && s.name !== only) continue;
      const page = await browser.newPage({ width: s.width || 1440, height: s.height || 1000, colorScheme: s.scheme || "light", reducedMotion: !s.motion });
      const problems = [];
      try {
        await page.goto(pathToFileURL(pages.get(s.example)).href);
        if (s.theme) {
          await page.eval(`document.documentElement.dataset.theme = ${JSON.stringify(s.theme)}`);
          await page.sleep(80);
        }
        problems.push(...await page.eval(AUDIT));
        if (s.act) await act(page, s.act);
        problems.push(...page.errors.map(e => `console: ${e}`));
        const shot = s.noShot ? null : await page.screenshot({ fullPage: !s.viewport });
        if (shot) fs.writeFileSync(path.join(output, `${s.name}.png`), shot);
        const basePath = path.join(baselines, `${s.name}.png`);
        if (!shot) {
          // interaction-only scenario
        } else if (update || !fs.existsSync(basePath)) {
          fs.writeFileSync(basePath, shot);
        } else {
          const d = diffImages(decodePng(fs.readFileSync(basePath)), decodePng(shot));
          if (d.sizeMismatch) problems.push(`size changed: ${d.sizeMismatch}`);
          else if (d.ratio > MAX_DIFF) {
            fs.writeFileSync(path.join(output, `${s.name}.diff.png`), encodePng(d.diff));
            problems.push(`pixels changed: ${(d.ratio * 100).toFixed(2)}% (see output/${s.name}.diff.png)`);
          }
        }
      } catch (err) {
        problems.push(`error: ${err instanceof Error ? err.message : err}`);
      } finally {
        await page.close();
      }
      if (problems.length) {
        failures++;
        console.log(`✗ ${s.name}`);
        problems.forEach(p => console.log(`    ${p}`));
      } else console.log(`✓ ${s.name}${update ? " (baseline updated)" : ""}`);
    }
  } finally {
    await browser.close();
  }
  if (failures) {
    console.log(`\n${failures} scenario(s) failed. Re-run with --update to accept intentional changes.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
