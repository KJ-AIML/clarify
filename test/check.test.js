import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findChrome } from "../src/check/cdp.js";
import { parseColor, contrastRatio } from "../src/check/audit.js";
import { checkPage, formatReport, VIEWS } from "../src/check/index.js";

// The browser tests need Chrome or Edge; without one they are skipped, not failed.
const inBrowser = { skip: !findChrome() && "no Chrome or Edge", timeout: 60000 };
const FIXTURE = new URL("./fixtures/check-broken.md", import.meta.url);

/** Runs `fn` with a fresh temp folder, and removes the folder after. */
async function withTemp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clarify-check-"));
  try {
    return await fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

const pngs = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".png")) : []);

test("colours parse and contrast follows WCAG 2", () => {
  assert.ok(Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio([119, 119, 119], [255, 255, 255]) - 4.48) < 0.01);
  assert.equal(contrastRatio([10, 20, 30], [10, 20, 30]), 1);
  assert.deepEqual(parseColor("rgba(1, 2, 3, 0.5)"), [1, 2, 3, 0.5]);
  assert.deepEqual(parseColor("rgb(1, 2, 3)"), [1, 2, 3, 1]);
  assert.deepEqual(parseColor("color(srgb 1 0.5 0)"), [255, 128, 0, 1]);
  assert.deepEqual(parseColor("color(srgb 0 0 1 / 0.25)"), [0, 0, 255, 0.25]);
  assert.deepEqual(parseColor("transparent"), [0, 0, 0, 0]);
  assert.equal(parseColor("linear-gradient(red, blue)"), null);
  assert.equal(parseColor("oklch(0.5 0.1 200)"), null);
});

test("the report lists pictures first, then problems, then a summary", () => {
  const panels = ["A", "B", "C", "D"];
  const pictures = VIEWS.flatMap((v) => panels.map((panel) => ({
    panel, view: `${v.width} ${v.scheme}`, file: path.join("/checks/demo", `${panel}-${v.width}-${v.scheme}.png`)
  })));
  const report = {
    browser: true, page: "/checks/demo/page.html", outDir: "/checks/demo", panels, lint: [], pictures,
    problems: [{ panel: "D", view: "390 light", kind: "small text", msg: 'text is 8.0px (under 10.5px): "tiny" in p' }]
  };
  const lines = formatReport(report);
  assert.equal(lines[0], "Pictures of the panels with a problem:");
  assert.ok(lines[1].endsWith("D-390-light.png"), lines[1]);
  assert.ok(/^\s/.test(lines[1]), "the path is indented");
  const at = lines.findIndex((l) => l.startsWith("⚠ panel D @390 light: small text: "));
  assert.ok(at > 1, lines.join("\n"));
  assert.ok(lines.at(-1).startsWith("⚠ check: 1 problem in 1 panel"), lines.at(-1));
  assert.ok(lines.at(-1).includes("/checks/demo"));
});

test("the report shows at most five problems of a kind per panel and view", () => {
  const problems = Array.from({ length: 8 }, (_, i) => ({ panel: "B", view: "1440 light", kind: "overflow", msg: `box ${i}` }));
  const lines = formatReport({ browser: true, page: "/p.html", outDir: "/out", panels: ["A", "B"], lint: ["panel B: line 3: free \"a\": raw colour"], pictures: [], problems });
  assert.equal(lines.filter((l) => l.startsWith("⚠ panel B @1440 light: overflow: box")).length, 5);
  assert.ok(lines.some((l) => l.includes("… and 3 more")));
  assert.ok(lines.includes('⚠ panel B: line 3: free "a": raw colour'));
  assert.ok(lines.at(-1).startsWith("⚠ check: 8 problems in 1 panel"), lines.at(-1));
  const clean = formatReport({ browser: true, page: "/p.html", outDir: "/out", panels: ["A", "B"], lint: [], pictures: [], problems: [] });
  assert.deepEqual(clean, ["✓ check: 2 panels × 4 views, no problems · pictures in /out"]);
});

test("without a browser only the static lint runs", () => withTemp(async (tmp) => {
  const draft = path.join(tmp, "draft.md");
  fs.writeFileSync(draft, ["---", "title: No browser", "---", "", "## A Unscoped", "```free a", "<p>hi</p><style>p { font-weight: 700 }</style>", "```", ""].join("\n"));
  const outDir = path.join(tmp, "out");
  fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, "A-1440-light.png"), "old");
  const report = await checkPage({ input: draft, outDir, findChrome: () => null });
  assert.equal(report.browser, false);
  assert.ok(report.lint.some((w) => w.includes('free "a": selectors must start with .fx-a: p')), report.lint.join("\n"));
  assert.deepEqual(report.problems, []);
  assert.deepEqual(pngs(outDir), [], "old pictures are deleted and none are taken");
  assert.ok(fs.existsSync(path.join(outDir, "page.html")), "the draft is rendered into the folder");
  const lines = formatReport(report);
  assert.equal(lines[0], "⚠ no Chrome or Edge found (set CHROME_PATH): only the static lint ran");
  assert.ok(lines.slice(1).some((l) => l.startsWith("⚠ panel A: line ") && l.includes("selectors must start with .fx-a")));
}));

test("a check deletes only its own old pictures", () => withTemp(async (tmp) => {
  const draft = path.join(tmp, "draft.md");
  fs.writeFileSync(draft, "## A Plain\nText.\n");
  fs.writeFileSync(path.join(tmp, "B-390-dark.png"), "old");
  fs.writeFileSync(path.join(tmp, "logo.png"), "not ours");
  await checkPage({ input: draft, outDir: tmp, findChrome: () => null });
  assert.deepEqual(pngs(tmp), ["logo.png"]);
}));

test("a page without a browser is not checked", () => withTemp(async (tmp) => {
  const page = path.join(tmp, "page.html");
  fs.writeFileSync(page, "<!DOCTYPE html><title>x</title><p>x</p>");
  const report = await checkPage({ input: page, outDir: path.join(tmp, "out"), findChrome: () => null });
  assert.equal(report.browser, false);
  assert.deepEqual(report.lint, []);
  assert.deepEqual(formatReport(report), ["⚠ no Chrome or Edge found (set CHROME_PATH): nothing checked; the static lint needs the draft"]);
}));

test("a missing input is an error", async () => {
  await assert.rejects(checkPage({ input: path.join(os.tmpdir(), "clarify-no-such-draft.md"), findChrome: () => null }), /not found/);
});

test("every check fires on the panel that has it", inBrowser, () => withTemp(async (tmp) => {
  const dir = path.join(tmp, "clarify check ✓");
  fs.mkdirSync(dir);
  const draft = path.join(dir, "check-broken.md");
  fs.copyFileSync(FIXTURE, draft);
  const outDir = path.join(dir, "out");
  const report = await checkPage({ input: draft, outDir });
  assert.equal(report.browser, true);
  assert.deepEqual(report.lint, []);
  assert.deepEqual(report.panels, ["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
  const kinds = (panel) => [...new Set(report.problems.filter((p) => p.panel === panel).map((p) => p.kind))].sort();
  const seen = Object.fromEntries(report.panels.map((p) => [p, kinds(p)]));
  assert.deepEqual(seen, {
    A: [], B: ["overflow"], C: ["small text"], D: ["overlap"], E: ["clipped"],
    F: ["half-empty"], G: [], H: ["page error"], I: ["low contrast"]
  }, formatReport(report).join("\n"));
  const boom = report.problems.filter((p) => p.kind === "page error");
  assert.ok(boom.length > 0 && boom.every((p) => p.panel === "H" && p.msg.startsWith("fx boom: Error: on purpose")), JSON.stringify(boom));
  const half = report.problems.find((p) => p.panel === "F");
  assert.equal(half.view.split(" ")[0], "1440", "half-empty is a wide-view check");
  assert.match(half.msg, /^its content fills \d+% of the panel's height; try span=2$/);
  assert.equal(report.pictures.length, 36);
  const files = pngs(outDir);
  assert.equal(files.length, 36);
  assert.ok(files.includes("A-1440-light.png"));
  for (const p of report.pictures) assert.ok(fs.statSync(p.file).size > 0, p.file);
}));

test("clarify's own blocks check clean", inBrowser, () => withTemp(async (tmp) => {
  // The hero diagram (3px out at 390), the ▶ of a route button (4.44:1) and code in a table (9.7px) are clarify's own.
  const draft = path.join(tmp, "check-own.md");
  fs.copyFileSync(new URL("./fixtures/check-own.md", import.meta.url), draft);
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out") });
  assert.equal(report.browser, true);
  assert.deepEqual(report.lint, []);
  assert.deepEqual(report.panels, ["A", "B"]);
  assert.deepEqual(report.problems, [], formatReport(report).join("\n"));
  assert.equal(report.pictures.length, 8);
}));

test("a page that never finishes loading is reported", inBrowser, () => withTemp(async (tmp) => {
  const draft = path.join(tmp, "spin.md");
  fs.writeFileSync(draft, ["---", "title: Spin", "---", "", "## A Spins", "```free spin", "<p>spin</p><script>for(;;){}</script>", "```", ""].join("\n"));
  const started = Date.now();
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out"), loadTimeout: 2000 });
  assert.ok(Date.now() - started < 30000, `took ${Date.now() - started} ms`);
  const errors = report.problems.filter((p) => p.kind === "page error");
  assert.equal(errors.length, 1, JSON.stringify(report.problems));
  assert.match(errors[0].msg, /did not finish loading/);
}));
