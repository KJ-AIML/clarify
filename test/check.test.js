import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findChrome, launchBrowser } from "../src/check/cdp.js";
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

test("a browser that will not start is reported, never silent", { timeout: 30000 }, () => withTemp(async (tmp) => {
  // Node stands in for a browser that exits at once (as Chrome does when it runs as root without --no-sandbox).
  const draft = path.join(tmp, "draft.md");
  fs.writeFileSync(draft, ["---", "title: Dead browser", "---", "", "## A Unscoped", "```free a", "<p>hi</p><style>p { font-weight: 700 }</style>", "```", ""].join("\n"));
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out"), findChrome: () => process.execPath });
  assert.equal(report.browser, false);
  assert.ok(report.failure.startsWith(`${process.execPath}: `), report.failure);
  assert.match(report.failure, /: the browser exited \(code \d+\)$/);
  const lines = formatReport(report);
  assert.equal(lines[0], `⚠ the browser did not start (${report.failure}; set CHROME_PATH to Chrome or Edge): only the static lint ran`);
  assert.ok(lines.slice(1).some((l) => l.includes("selectors must start with .fx-a")), lines.join("\n"));

  const page = path.join(tmp, "page.html");
  fs.writeFileSync(page, "<!DOCTYPE html><title>x</title><p>x</p>");
  const pageLines = formatReport(await checkPage({ input: page, outDir: path.join(tmp, "out2"), findChrome: () => process.execPath }));
  assert.match(pageLines[0], /^⚠ the browser did not start \(.*\): nothing checked; the static lint needs the draft$/);
}));

test("titles with no ASCII letters get a check folder each", () => withTemp(async (tmp) => {
  // The default folder is ~/.clarify/checks/<slug>; a Thai title slugs to nothing, so the draft's name decides.
  const homes = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = tmp;
  try {
    const dirs = [];
    for (const name of ["mouse.md", "keyboard.md", "เมาส์.md", "คีย์บอร์ด.md"]) {
      const draft = path.join(tmp, name);
      fs.writeFileSync(draft, "---\ntitle: เมาส์ไร้สายทำงานอย่างไร\n---\n\n## A หนึ่ง\nข้อความ\n");
      dirs.push((await checkPage({ input: draft, findChrome: () => null })).outDir);
    }
    const names = dirs.map((d) => path.basename(d));
    assert.deepEqual(names.slice(0, 2), ["mouse", "keyboard"]);
    assert.match(names[2], /^clarify-[0-9a-f]{8}$/);
    assert.match(names[3], /^clarify-[0-9a-f]{8}$/);
    assert.notEqual(names[2], names[3]);
    assert.ok(dirs.every((d) => d.startsWith(path.join(tmp, ".clarify", "checks"))), dirs.join("\n"));
    const plain = path.join(tmp, "plain.md");
    fs.writeFileSync(plain, "---\ntitle: How a Mouse Works\n---\n\n## A One\nText.\n");
    assert.equal(path.basename((await checkPage({ input: plain, findChrome: () => null })).outDir), "how-a-mouse-works");
  } finally {
    for (const [k, v] of Object.entries(homes)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
}));

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

test("a time limit names what ran out of time", inBrowser, () => withTemp(async (tmp) => {
  // The page loads, but its script makes the checks hang: the overlap check measures text with a Range.
  const draft = path.join(tmp, "slow.md");
  fs.writeFileSync(draft, ["---", "title: Slow checks", "---", "", "## A Slow", "```free slow", "<p>slow</p><script>document.createRange = () => { for (;;) {} };</script>", "```", ""].join("\n"));
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out"), loadTimeout: 2000 });
  const errors = report.problems.filter((p) => p.kind === "page error");
  assert.equal(errors.length, 1, JSON.stringify(report.problems));
  assert.equal(errors[0].panel, null);
  assert.match(errors[0].msg, /^the checks did not finish in 2 s/);
}));

test("a browser that stops mid-run keeps the views that finished", inBrowser, () => withTemp(async (tmp) => {
  const draft = path.join(tmp, "plain.md");
  fs.writeFileSync(draft, "## A Plain\nText.\n");
  // The browser goes away before the third view's tab: the first two views are done by then.
  const launch = async (executable) => {
    const browser = await launchBrowser(executable);
    const open = browser.newPage;
    let tabs = 0;
    browser.newPage = async (opts) => {
      if (++tabs === 3) await browser.close();
      return open(opts);
    };
    return browser;
  };
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out"), launch });
  assert.equal(report.browser, true);
  assert.deepEqual(report.pictures.map((p) => `${p.panel} ${p.view}`), ["A 1440 light", "A 1440 dark"]);
  assert.deepEqual(report.problems.map((p) => [p.panel, p.view, p.kind]), [[null, "390 light", "page error"]], JSON.stringify(report.problems));
  assert.match(report.problems[0].msg, /^the browser stopped \(the browser exited \(.+\)\); this view and the ones after it were not checked$/);
  assert.match(formatReport(report).at(-1), /^⚠ check: 1 problem on the page · /);
}));

test("a panel that a free section swallows is reported missing", inBrowser, () => withTemp(async (tmp) => {
  // B leaves a comment open, so the browser reads C, D and the page's own script as part of that comment.
  const draft = path.join(tmp, "unclosed.md");
  fs.writeFileSync(draft, [
    "---", "title: Unclosed comment", "cols: 3", "---", "Lead: The free section in B leaves a comment open.", "",
    "## A First {span=3}", "Plain text in A.", "",
    "## B Section {span=3}", "```free open", '<p class="fx-how"><b>How to read this:</b> a note.</p>', "<!-- a note the author forgot to close", '<p class="fx-take">Takeaway.</p>', "```", "",
    "## C Third {span=3}", "Text in C.", "", "## D Fourth {span=3}", "Text in D.", ""
  ].join("\n"));
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out") });
  assert.deepEqual(report.panels, ["A", "B", "C", "D"]);
  const missing = report.problems.filter((p) => p.kind === "missing");
  assert.deepEqual(missing.map((p) => [p.panel, p.view]), [["C", "1440 light"], ["D", "1440 light"]], formatReport(report).join("\n"));
  assert.equal(missing[0].msg, "not on the page; a free section above it may leave a comment, <style> or <script> open");
  assert.ok(formatReport(report).includes("⚠ panel C @1440 light: missing: not on the page; a free section above it may leave a comment, <style> or <script> open"));
  assert.match(formatReport(report).at(-1), /^⚠ check: \d+ problems? in \d+ panels/);
}));

test("text written straight into an svg is not checked as text", inBrowser, () => withTemp(async (tmp) => {
  // SKILL.md's own placeholder: SVG paints text only inside <text>, so the "…" here is never drawn.
  const draft = path.join(tmp, "bare.md");
  fs.writeFileSync(draft, ["---", "title: Bare svg text", "---", "", "## A Bare {span=3}", "```free bare",
    '<p class="fx-how"><b>How to read this:</b> …</p>', '<svg viewBox="0 0 320 120" role="img" aria-label="…">…<g>loose</g><text class="fx-t" x="10" y="20">drawn</text></svg>', '<p class="fx-take">…</p>',
    "```", ""].join("\n"));
  const report = await checkPage({ input: draft, outDir: path.join(tmp, "out") });
  assert.deepEqual(report.problems, [], formatReport(report).join("\n"));
}));
