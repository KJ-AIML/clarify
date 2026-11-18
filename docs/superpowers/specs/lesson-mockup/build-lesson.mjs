// Mockup: the clarify "lesson" block in style C, built on the shared bench drawing.
// usage: node build-lesson.mjs <path/to/iso-kit.mjs> <path/to/iso.css> <out.html>
import { writeFileSync } from "node:fs";
import { k, P, W, H, ISO_CSS, SKINS, L, T, R, S, M, PAD, at, pathAt, line, solid, slab, off, halo, bench, pad, laptop, tray, cabinet, server } from "./build-styles.mjs";

const outPath = process.argv[4];

const ST = {
  L: { c: L, label: "YOUR FOLDER", draw: () => laptop(L), cls: "m-laptop", top: 46 },
  R: { c: R, label: "LOCAL REPO", draw: () => cabinet(R), cls: "m-repo", top: 53 },
  T: { c: T, label: "STAGING", draw: () => tray(T), cls: "m-tray", top: 18 },
  S: { c: S, label: "ORIGIN", draw: () => server(S), cls: "m-server", top: 70 },
  M: { c: M, label: "TEAMMATE", draw: () => laptop(M), cls: "m-mate", top: 46 },
};
const ORDER = ["L", "R", "T", "S", "M"];
const RAILS = {
  LT: { plan: { x: 36, y: -2.5, w: 48, d: 5, r: 1 }, a: [36, 0], b: [84, 0] },
  TR: { plan: { x: 117.5, y: -84, w: 5, d: 48, r: 1 }, a: [120, -36], b: [120, -84] },
  RS: { plan: { x: 156, y: -122.5, w: 48, d: 5, r: 1 }, a: [156, -120], b: [204, -120] },
  SM: { plan: { x: 237.5, y: -84, w: 5, d: 48, r: 1 }, a: [240, -84], b: [240, -36] },
};

function rails({ active = [], cut = [], reverse = [] }) {
  let out = "";
  for (const [id, r] of Object.entries(RAILS)) {
    out += line(k.planOutline(k.insetPlan(r.plan, -1.8), 0, P), { tone: "faint" });
    out += `<g class="m-rail${cut.includes(id) ? " is-cut" : ""}">${solid(slab(r.plan, 0, 1.2, 3, 0.3), { tone: "mid" })}</g>`;
    if (active.includes(id) || cut.includes(id)) {
      const [a, b] = reverse.includes(id) ? [r.b, r.a] : [r.a, r.b];
      out += `<path class="m-route${cut.includes(id) ? " is-cut" : ""}" d="${pathAt([[...a, 1.3], [...b, 1.3]])}"/>`;
    }
  }
  return out;
}

function puckAt([x, y], kind = "commit") {
  return (
    halo({ x: x - 4.6, y: y - 4.6, w: 9.2, d: 9.2, r: 4.6 }, 1.2, 0.1) +
    `<g class="m-puck is-${kind}">${solid(k.cylinder(x, y, 4.8, 1.2, 3.6, P, 36, 0.4), { tone: "hi", lit: true })}</g>` +
    line(k.ring(x, y, 2.6, 4.8, P, 24), { tone: "mid" }) +
    k.dotsSvg([at([x, y, 4.8])], { size: 0.6, tone: "hi" })
  );
}

const focusRing = (c) => `<path class="m-focus" d="${k.planOutline(k.insetPlan(off(c, PAD), -4.5), 0.2, P)}"/>`;

function badBadge(c, topZ) {
  const [sx, sy] = at([c[0] + 10, c[1] - 6, topZ + 9]);
  return `<g class="m-bad" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)})"><circle r="12"/><path d="M-4.5,-4.5L4.5,4.5M4.5,-4.5L-4.5,4.5"/></g>`;
}

function scene({ pucks = [], focus = null, bad = null, active = [], cut = [], reverse = [], dim = [] } = {}) {
  const body = [bench(), rails({ active, cut, reverse })];
  for (const id of ORDER) body.push(`<g class="m-st${dim.includes(id) ? " is-dim" : ""}">${focus === id ? focusRing(ST[id].c) : ""}${pad(ST[id].c, ST[id].label)}</g>`);
  const queue = [...pucks].sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]));
  for (const id of ORDER) {
    const d = ST[id].c[0] + ST[id].c[1];
    while (queue.length && queue[0].at[0] + queue[0].at[1] < d) body.push(puckAt(queue[0].at, queue.shift().kind));
    body.push(`<g class="m-st${dim.includes(id) ? " is-dim" : ""}"><g class="m-obj ${ST[id].cls}">${ST[id].draw()}</g>${bad === id ? badBadge(ST[id].c, ST[id].top) : ""}</g>`);
  }
  for (const p of queue) body.push(puckAt(p.at, p.kind));
  return k.figureSvg({ width: W, height: H, label: "A bench with five stations joined by rails: your laptop, a staging tray, a card-file cabinet (local repo), a server (origin) and your teammate's laptop. Pucks on the rails are commits moving between them.", body });
}

const HUD = ["Edited", "Staged", "Snapshot", "Pushed", "Teammates"];
const chips = (vals, tools = "") =>
  `<div class="ls-hud">${HUD.map((name, i) => {
    const [v, lvl, changed] = vals[i];
    return `<div class="ls-chip" data-level="${lvl}"${changed ? " data-changed" : ""}><span class="ls-chip-k">${name}</span><span class="ls-chip-v">${v}</span></div>`;
  }).join("")}${tools}</div>`;
const SHORT = ["Hit Save", "Edit", "Stage", "Commit", "History", "Push", "Pull", "Forgot file", "Rejected", "Recap"];
const timeline = (now) => `<ol class="ls-timeline">${SHORT.map((s, i) => `<li class="${i + 1 < now ? "is-done" : i + 1 === now ? "is-now" : ""}"><b>${i + 1}</b>${s}</li>`).join("")}</ol>`;
const stage = (svg) => `<div class="ls-stage sk sk-c iso" data-theme="light">${svg}</div>`;

const PLAYER_CSS = `
.cl-page{background:#f4ebe0;border-radius:12px;padding:28px;color:#1d1b18;font:16px/1.55 system-ui,"Segoe UI",sans-serif}
.cl-eyebrow{font:600 12px/1 ui-monospace,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:#6f6961}
.cl-page h1{font:700 40px/1.1 Bahnschrift,"DIN Alternate","Segoe UI",system-ui,sans-serif;margin:10px 0 8px;color:#1d1b18}
.cl-lead{font-size:18px;color:#34302b;margin:0 0 22px;max-width:62ch}
.ls{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}
.ls-main,.ls-guide,.ls-state{background:#fbf7f1;border:1.5px solid #1d1b18;border-radius:12px}
.ls-main{padding:14px}
.ls-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch}
.ls-chip{min-width:104px;padding:8px 10px;border:1.5px solid #1d1b18;border-radius:8px;background:#fffaf2;display:grid;gap:3px}
.ls-chip-k{font:700 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:#6f6961}
.ls-chip-v{font:700 16px/1.2 ui-monospace,Consolas,monospace;color:#1d1b18}
.ls-chip[data-level=good] .ls-chip-v{color:#2b6e3f}
.ls-chip[data-level=warn] .ls-chip-v{color:#9a5b00}
.ls-chip[data-level=bad] .ls-chip-v{color:#b3261e}
.ls-chip[data-changed]{box-shadow:3px 3px 0 #1d1b18;background:#fff1e3;border-color:#e8742a}
.ls-tools{margin-left:auto;display:flex;gap:8px;align-items:center}
.ls-btn{font:600 14px/1 system-ui,"Segoe UI",sans-serif;padding:10px 14px;border:1.5px solid #1d1b18;border-radius:8px;background:#fffaf2;box-shadow:2px 2px 0 #1d1b18;color:#1d1b18}
.ls-stage{margin:10px 0 4px;border-radius:10px}
.ls-legend{display:flex;gap:18px;font:600 12px/1 ui-monospace,Consolas,monospace;color:#6f6961;padding:6px 4px 12px}
.ls-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px;border:1.5px solid #1d1b18}
.ls-timeline{list-style:none;margin:0;padding:12px 6px 4px;display:grid;grid-template-columns:repeat(10,1fr);border-top:1.5px dashed #d9cbb6}
.ls-timeline li{text-align:center;font:600 12px/1.25 system-ui,"Segoe UI",sans-serif;color:#6f6961}
.ls-timeline b{display:grid;place-items:center;width:28px;height:28px;margin:0 auto 6px;border:1.5px solid #1d1b18;border-radius:50%;background:#fffaf2;font:700 12px/1 ui-monospace,Consolas,monospace;color:#1d1b18}
.ls-timeline li.is-done b{background:#d7ebc6}
.ls-timeline li.is-now b{background:#e8742a;color:#fff;box-shadow:2px 2px 0 #1d1b18}
.ls-timeline li.is-now{color:#1d1b18}
.ls-guide{padding:18px 18px 16px;display:grid;gap:12px}
.ls-top{display:flex;justify-content:space-between;align-items:center;font:700 12px/1 ui-monospace,Consolas,monospace;letter-spacing:.06em;color:#6f6961}
.ls-chapter{padding:5px 9px;border:1.5px solid #1d1b18;border-radius:999px;background:#cfe0fb;color:#1d1b18}
.ls-guide h3{font:700 24px/1.2 Bahnschrift,"DIN Alternate","Segoe UI",system-ui,sans-serif;margin:0;color:#1d1b18}
.ls-guide p{margin:0;font-size:16px;line-height:1.6;color:#1d1b18}
.ls-guide code{font:600 14px ui-monospace,Consolas,monospace;background:#efe6d8;border:1px solid #d9cbb6;border-radius:5px;padding:1px 5px}
.ls-guide mark{background:#f8dfb0;color:inherit;padding:0 3px;border-radius:3px}
.ls-callout{border:1.5px solid #1d1b18;border-radius:10px;background:#efe9fe;padding:12px 14px}
.ls-callout b{display:block;font:700 12px/1 ui-monospace,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.ls-nav{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-top:4px}
.ls-nav .ls-btn{text-align:left}
.ls-next{background:#cfe3b2!important}
.ls-keys{font:12px/1.4 ui-monospace,Consolas,monospace;color:#6f6961}
.ls-goals{border-top:1.5px dashed #d9cbb6;padding-top:12px}
.ls-goals>b{font:700 12px/1 ui-monospace,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:#6f6961}
.ls-goals ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px;font-size:14px}
.ls-goals li{display:flex;gap:8px;align-items:flex-start}
.ls-goals li i{flex:none;width:16px;height:16px;border:1.5px solid #1d1b18;border-radius:4px;background:#fffaf2;margin-top:3px}
.ls-goals li.is-hit i{background:#3f9a5a;box-shadow:inset 0 0 0 3px #fffaf2}
.ls-states{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.ls-state{padding:12px}
.ls-state h4{font:700 17px/1.2 Bahnschrift,"DIN Alternate","Segoe UI",system-ui,sans-serif;margin:4px 4px 10px;color:#1d1b18}
.ls-state p{margin:8px 4px 2px;font-size:14px;line-height:1.5;color:#34302b}
.ls-state .ls-chip{min-width:0;flex:1;padding:6px 7px}
.ls-state .ls-chip-v{font-size:13px}
.ls-state .ls-chip-k{font-size:10px}
.m-focus{fill:rgba(232,116,42,.09);stroke:#e8742a;stroke-width:2.2px;vector-effect:non-scaling-stroke;stroke-dasharray:7 5}
.m-st.is-dim{opacity:.3;filter:grayscale(1)}
.m-bad circle{fill:#e5484d;stroke:#1d1b18;stroke-width:1.6px}
.m-bad path{stroke:#fff;stroke-width:2.6px;stroke-linecap:round;fill:none}
.sk .m-route.is-cut{stroke:#e5484d;stroke-dasharray:6 5;animation:none}
.m-rail.is-cut{--anatomy-top:#f6c9c6;--anatomy-paper:#f2b3ae;--anatomy-shade-0:#d9827b;--anatomy-shade-1:#e3958f;--anatomy-shade-2:#eba8a2;--anatomy-shade-3:#f2b3ae}
.m-puck.is-fail{--route:#e5484d;--route-dark:#b3261e}
.m-puck.is-mate{--route:#3f9a5a;--route-dark:#2b6e3f}
`;

const main = scene({ pucks: [{ at: [180, -120] }], focus: "S", active: ["RS"], dim: ["M"] });
const step3 = scene({ pucks: [{ at: [60, 0] }], focus: "T", active: ["LT"], dim: ["R", "S", "M"] });
const step9 = scene({ pucks: [{ at: [196, -120], kind: "fail" }, { at: [240, -62], kind: "mate" }], bad: "S", cut: ["RS"], active: ["SM"], reverse: ["SM"] });

const goals = [
  ["What the working directory is", true],
  ["Why staging lets you choose", true],
  ["What a commit really saves", true],
  ["The path: laptop → tray → repo → server → teammate", false],
  ["Cases: a missing file, a refused push", false],
];

const html = `<style>${ISO_CSS}${SKINS}${PLAYER_CSS}</style>
<h2>The lesson block inside a clarify page (style C)</h2>
<p class="subtitle">Step 6 of "How a Commit Travels". The orange puck is your commit moving from the local repo to origin. Under it: step 3 (places appear only when the story reaches them) and step 9 (what a failure looks like).</p>
<div class="cl-page">
  <div class="cl-eyebrow">Git Explained · Lesson 1 of 3</div>
  <h1>How a Commit Travels</h1>
  <p class="cl-lead">Follow one saved change hop by hop, from your laptop to your teammate's. Each command moves it one stop.</p>
  <section class="ls">
    <div class="ls-main">
      ${chips([["1 file", "warn"], ["0 files", "good"], ["3 in chain", "good"], ["1 commit", "good", true], ["—", "none"]], `<div class="ls-tools"><span class="ls-btn">↻ Replay</span><span class="ls-btn">❚❚ Pause</span></div>`)}
      ${stage(main)}
      <div class="ls-legend"><span><i style="background:#e8742a"></i>your change</span><span><i style="background:#3f9a5a"></i>teammate's change</span><span><i style="background:#e5484d"></i>refused</span></div>
      ${timeline(6)}
    </div>
    <aside class="ls-guide">
      <div class="ls-top"><span>STEP 6 / 10</span><span class="ls-chapter">HOW IT WORKS</span></div>
      <h3>Send it to the shared copy</h3>
      <p>So far everything happened on your laptop. <code>git push</code> sends new commits to a <mark>remote</mark>: a shared copy on a server, usually called <code>origin</code>.</p>
      <p>Git only sends what the remote is missing, so pushing stays quick even for big projects.</p>
      <div class="ls-callout"><b>Key idea</b>Your laptop and the server each hold a full copy. Push and pull just keep them in step.</div>
      <div class="ls-nav"><span class="ls-btn">← Back</span><span class="ls-btn ls-next">Next: Pull →</span></div>
      <div class="ls-keys">← → step · R replay · Space pause</div>
      <div class="ls-goals"><b>You'll learn</b><ul>${goals.map(([g, hit]) => `<li class="${hit ? "is-hit" : ""}"><i></i>${g}</li>`).join("")}</ul></div>
    </aside>
  </section>
  <div class="ls-states">
    <div class="ls-state"><h4>Step 3 · Stage</h4>${chips([["3 files", "warn"], ["2 files", "good", true], ["—", "none"], ["—", "none"], ["—", "none"]])}${stage(step3)}<p>Places wait in grey until the story reaches them. Here only your folder and the tray are in play; two files ride to the tray.</p></div>
    <div class="ls-state"><h4>Step 9 · Rejected</h4>${chips([["1 file", "warn"], ["0 files", "good"], ["a1f9e2c", "good"], ["rejected", "bad", true], ["—", "none"]])}${stage(step9)}<p>The cause and the result are both on the machine: your teammate's commit (green) reached origin first, so yours stops red at the gate and origin shows a red ✕.</p></div>
  </div>
</div>`;

writeFileSync(outPath, html);
console.log("wrote", outPath, Math.round(html.length / 1024) + " KB");
