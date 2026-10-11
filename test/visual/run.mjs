#!/usr/bin/env node
// clarify/test/visual/run.mjs
// Visual regression + in-browser sanity audit. Renders every scenario in headless
// Chromium (driven over CDP, no Playwright dependency), then:
//   1. asserts DOM invariants: no console errors, labels fit their boxes, no page overflow
//   2. compares a screenshot against test/visual/baselines/<name>.png
// Usage: node test/visual/run.mjs [--update] [--only name]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDraft } from "../../src/parser.js";
import { compile } from "../../src/render.js";
import { launchBrowser, findChrome, decodePng, encodePng, diffImages } from "./cdp.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const baselines = path.join(here, "baselines");
const output = path.join(here, "output");
const args = process.argv.slice(2);
const update = args.includes("--update");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const MAX_DIFF = 0.002;

/** @type {Array<{ name: string, example: string, width?: number, height?: number, scheme?: "light"|"dark", theme?: string, viewport?: boolean, act?: string, noShot?: boolean }>} */
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
  { name: "export", example: "ecommerce-architecture", viewport: true, act: "export", noShot: true }
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
    await page.goto(`file://${svgFile}`);
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
      const page = await browser.newPage({ width: s.width || 1440, height: s.height || 1000, colorScheme: s.scheme || "light" });
      const problems = [];
      try {
        await page.goto(`file://${pages.get(s.example)}`);
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
