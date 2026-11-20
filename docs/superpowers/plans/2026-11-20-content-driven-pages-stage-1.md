# Content-Driven Pages, Stage 1 (Pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 1 of content-driven pages: a `free` block for hand-drawn sections that look native to the page, a shared kit, a no-network policy, `clarify check` (a browser check of every panel), and a `SKILL.md` that makes the agent think about the content before it picks a form. Version 0.3.0.

**Architecture:** A `free` fence holds an HTML fragment, inline or read from `file=`. `src/free/` loads and lints it. `src/render.js` wraps the fragment, moves its `<style>` to the head after the kit (`src/runtime/fx.css`) and its `<script>` to the end of the body, and adds a Content-Security-Policy. All of this happens only on pages with a free section, so every other page stays byte-identical. `clarify check` (`src/check/`) renders a draft (or takes a page), opens it in headless Chrome or Edge through the DevTools driver moved from `test/visual/`, checks every panel in four views and saves one PNG per panel per view. `SKILL.md` is rewritten near the end and tested with fresh agents before and after.

**Tech Stack:** Node ≥ 20 ESM, zero dependencies, `node:test`; Chrome or Edge over `--remote-debugging-pipe`.

**Spec:** `docs/superpowers/specs/2026-11-19-content-driven-pages-design.md`: Parts 1–3, "Depth and time", Stage 1 deliverables 1–13. Part 4 (lessons) is Stage 2, with its own plan.

## Global Constraints

- Zero dependencies. Node >= 20. No `npm install`, no build step.
- A page is one standalone HTML file. It loads nothing from the network. Colours only from the tokens in `src/runtime/themes.css`. Works on Windows and macOS.
- Raw HTML enters a page only through `free`. Everything else stays escaped, and the escaping test in `test/render.test.js` stays as it is.
- `render` never starts a browser. Only `clarify check` does.
- Existing drafts render exactly as now: a page without a free section is byte-identical to `main`. **The byte-identical check**, after every task that touches `src/`, prints six `✓` lines and no diff: `mkdir -p .tmp/s1-after-html && for f in checkout-sequence codebase-tour ecommerce-architecture git-commit-lesson mermaid-compat platform-topology; do node bin/clarify.mjs render examples/$f.md --out .tmp/s1-after-html/$f.html --no-open --quiet; done; git diff --no-index --stat .tmp/s1-before-html .tmp/s1-after-html`
- Free section names: `/^[a-z0-9][a-z0-9-]*$/`. At most 40 KB per section. No text under 10.5px on screen.
- Warning lines: `render` prints `⚠ panel X: line N: …`; `check` prints `⚠ panel D @390 light: …`.
- Run every `npm test` and `node --test` with `TEMP` and `TMP` set to `%LOCALAPPDATA%\Temp` (Git Bash: `TEMP="$LOCALAPPDATA/Temp" TMP="$LOCALAPPDATA/Temp" npm test`); without them a known, unrelated test fails. 162 tests pass on `main`; every existing test stays green.
- Visual baselines in `test/visual/baselines/` come from the owner's Mac only. Never write PNGs there, never run `npm run visual` or `visual:update` on Windows. Compare with `node test/visual/run.mjs --baselines .tmp/s1-before --output .tmp/s1-out` (Task 1 fills `.tmp/s1-before`; a new scenario gets its PNG there on its first run). A change to how an existing page looks adds a line to `test/visual/PENDING-MAC.md`.
- `.tmp/` is git-ignored and throwaway. Task 2 copies the spike material Stage 1 needs into `docs/superpowers/specs/content-driven-spike/`; later tasks read only that copy.
- One local commit per task on `feat/content-driven-pages`. Never push, never switch branches, never `rm -rf`. Version 0.3.0 only in Task 12.
- Docs and messages in short, plain sentences: the plain words first, then the term.

## Review Focus

1. **A section script that throws, or does not parse:** the other sections still run. → Task 2 `each section script is its own script element`; Task 6 browser scenario `free-csp` (sections `boom` and `broken`).
2. **Named and dark themes** (Nord, Paper, Blueprint, Tokyo Night, Catppuccin): sections stay readable because the kit uses only tokens every theme has. → Task 5 `every token the kit uses exists in themes.css`.
3. **A draft piped on stdin with `file=` sections:** paths resolve against the working directory, in `render` and `md`. → Task 2 `file= from stdin resolves against the working directory`; Task 7 `clarify md - reads file= sections from the working directory`.
4. **A path with spaces or non-Latin letters** given to `clarify check` (Windows user folders, Thai names). → Task 4 browser test run from a folder named `clarify check ✓`.
5. **A section script that never ends:** `clarify check` reports it and exits instead of hanging. → Task 4 `a page that never finishes loading is reported`.

## Execution notes

Tasks 1 and 11 are **controller tasks**: the session that runs this plan does them itself, because they dispatch fresh test agents. Every other task goes to one implementer subagent (model in its header), then one task review. Run the tasks in order.

| File | Responsibility | Task |
| --- | --- | --- |
| `docs/superpowers/specs/content-driven-spike/` | Tracked copy of the spike material Stage 1 needs | 2 |
| `src/free/section.js`, `lint.js`, `kit.js`, `markdown.js` | Load and split a fragment; lint it; `FX_DEFS`; export it | 2, 3, 5, 7 |
| `src/runtime/fx.css` | The kit, inlined only on pages with a free section | 2, 5 |
| `src/check/cdp.js` (moved from `test/visual/cdp.mjs`, which re-exports it), `audit.js`, `index.js` | Browser driver; in-page checks; `checkPage` and the report | 4 |
| `src/render.js`, `src/export/markdown.js`, `src/serve.js`, `bin/clarify.mjs`, `src/types.d.ts` | Dispatch, page assets, CSP, export, watching, `check` | 2–8 |
| `examples/wireless-mouse.md` | Seven flat free sections, no lesson | 9 |
| `SKILL.md`, `references/forms.md`, `references/free-sections.md` | Method, depth, check loop; worked forms; author rules and kit | 10 |
| `docs/superpowers/skill-tests/2026-11-20-content-driven-pages.md` | Briefs, post-mortem input, timed results | 1, 11 |
| `README.md`, `references/syntax.md`, `package.json` | Docs; 0.3.0 | 12 |

---

### Task 1: Baselines before anything changes (controller task; 3 fresh Opus agents)

**Files:**
- Create: `docs/superpowers/skill-tests/2026-11-20-content-driven-pages.md`
- Untracked: `.tmp/s1-before/`, `.tmp/s1-before-html/`, `.tmp/skill-test/before/`, `.tmp/skill-test/shot.mjs`

**Interfaces:**
- Produces: the briefs and agent prompt (reused word for word in Task 11), the before rows, `.tmp/s1-before` and `.tmp/s1-before-html` (used by every later task).

- [ ] **Step 1: Check the start.** This plan and the approved design are committed, and the tree is clean on `feat/content-driven-pages`; `.tmp/spike-free/` exists (if not, stop and tell the owner); `npm test` → `# pass 162`, `# fail 0`.
- [ ] **Step 2: Visual before set.** `node test/visual/run.mjs --baselines .tmp/s1-before --output .tmp/s1-before-out` → 27 lines. Record any `✗` as already failing on `main`.
- [ ] **Step 3: HTML before set.** `mkdir -p .tmp/s1-before-html`, then the byte-identical check's `for` loop with `--out .tmp/s1-before-html/$f.html` (no `git diff`) → six `✓`.
- [ ] **Step 4: Write the skill-test file:**
  - Briefs, exact. `device`: "Use the clarify skill to explain how an electric kettle boils water and switches itself off." `postmortem`: "Use the clarify skill to write up this incident as a post-mortem page:" + the input. `tour`: "Use the clarify skill to give a new contributor a tour of the clarify codebase at <repo>." `device-designed` (Task 11 only): "Make it good: use the clarify skill to make a designed explainer of how an electric kettle boils water and switches itself off."
  - The post-mortem input, written once now: made up, internally consistent, 200–300 words. An online shop's orders stay "paid, not shipped" for about three hours after a deploy changed a queue consumer. It has 6–8 timestamped events (noticed, paged, mitigated, fixed), the cause, two fixes compared with a reason each, and one decision left open. Every time and count agrees.
  - The pass line (spec Part 1); "much slower" means more than 1.5× the before time.
  - Results table: `content | skill | start (UTC) | end (UTC) | minutes | renders | warnings | check | shape (panel titles in order, with each one's block or form) | picture`.
- [ ] **Step 5: Write `.tmp/skill-test/shot.mjs`:** `node .tmp/skill-test/shot.mjs <page.html> <out.png>` saves a full-page PNG at 1440 × 1000, light, reduced motion, via `launchBrowser` from `test/visual/cdp.mjs`.
- [ ] **Step 6: Dispatch three fresh Opus agents at once** (`device`, `postmortem`, `tour`), each with this prompt, `<phase>` = `before`:

```text
The clarify skill is at <repo>. Read its SKILL.md and do what it says. Run its CLI as: node <repo>/bin/clarify.mjs
Task: <brief>
Save your draft as <repo>/.tmp/skill-test/<phase>/<id>.md and render it with --out <repo>/.tmp/skill-test/<phase>/<id>.html --no-open. Do not change any other file in that repo.
Run `date -u +%FT%TZ` as your very first and your very last command. Report both times, how many times you rendered, and the output of your last render.
```

- [ ] **Step 7: Picture and record.** `node .tmp/skill-test/shot.mjs .tmp/skill-test/before/<id>.html .tmp/skill-test/before/<id>.png` per page; fill the three before rows.
- [ ] **Step 8: Commit** the skill-test file: `git commit -m "test(skill): baseline runs with today's SKILL.md"`.

### Task 2: The `free` block (implementer: Opus)

**Files:**
- Create: `docs/superpowers/specs/content-driven-spike/`, copied from `.tmp/spike-free/`: `README.md`, `build.mjs`, `shot.mjs`, `fx-base.css`, `draft.md`, and the `sections/<name>.html|.css|.js` files that exist for `numbers`, `key-matrix`, `key-code`, `spectrum`, `radio-choice`, `time-ruler`, `trouble-path`. Not `mouse-cutaway`, `gen/`, `shots/`, `key-matrix.gen.mjs` or built pages (Stage 2 copies its own).
- Create: `src/free/section.js`; `src/runtime/fx.css` (a copy of `fx-base.css` whose header says it is the kit shipped on pages with a free section)
- Modify: `src/render.js`, `src/types.d.ts` (`FreeSection`; `files` in the compile result)
- Test: `test/free-render.test.js`

**Interfaces:**
- Produces (`src/free/section.js`):
  - `FREE_NAME = /^[a-z0-9][a-z0-9-]*$/`
  - `parseFreeInfo(info: string): { name: string, file: string | null }`: first word is the name; then `file=path` or `file="path with spaces"`.
  - `loadFreeSection(block: { info, body, line }, source: string): FreeSection`, `FreeSection = { name, file: string | null /* absolute */, fragment: string, missing: boolean, line: number }`. `file=` resolves against `path.dirname(source)`, or `process.cwd()` when `source` is `""` (stdin).
  - `splitFragment(fragment: string): { html: string, styles: string[], scripts: string[] }`: takes out the body of every `<style…>…</style>` and `<script…>…</script>`, case-insensitive.
  - `wrapScript(name: string, js: string): string`, exactly:

```js
(() => { const root = document.querySelector('[data-fx="NAME"]'); if (!root) return; try {
JS
} catch (e) { console.error("fx NAME: " + (e && e.stack || e)); } })();
```

- Produces (`src/render.js`): `compile()` also returns `files: string[]` (absolute path of every `file=`, found or not). `ctx.free: Array<{ name, panel, line, html, styles, scripts, bytes }>`, shared by reference like `ctx.warnings`; a missing or badly named section is in it too (empty `html`, `styles`, `scripts`), so the kit styles its box. Page parts, only when `ctx.free.length > 0`:
  - the section `<div class="fx fx-NAME" data-fx="NAME">…</div>`; a missing file `<div class="fx fx-missing" data-fx="NAME">Missing section "NAME": FILE was not found.</div>` (escaped); a bad name `<div class="fx fx-missing">This free section needs a name.</div>`;
  - in the head, after `c-lesson-css` if present: `<style id="c-fx-css">` (minified `fx.css`), then `<style id="c-fx-sections">` (each section's CSS as written, after a `/* fx NAME */` line);
  - at the end of the body, after `c-lesson-js` if present: one bare `<script>` per extracted script, holding `wrapScript(name, js)`. Bare, so the template-leak test in `render.test.js` skips it.
- Warnings (`panel X: line N: ` + text, N = the fence's line): `free section needs a name of lowercase letters, digits and dashes ("INFO")` · `free section "NAME" is used twice on this page; give each one its own name` · `free section file not found: FILE` (as written).

- [ ] **Step 1: Copy** the spike files and make `fx.css`.
- [ ] **Step 2: Write the failing tests** (temp folders from `fs.mkdtempSync(path.join(os.tmpdir(), "clarify-free-"))`):
  - `an inline free section is wrapped and its style and script are moved`: fence `free key-code` holding `<p class="fx-how">How</p><style>.fx-key-code p{font-weight:700}</style><script>root.dataset.ran = "yes"</script>`. HTML matches `/<div class="fx fx-key-code" data-fx="key-code">\s*<p class="fx-how">How<\/p>\s*<\/div>/`; `c-fx-css` precedes `c-fx-sections`, which precedes `</head>` and holds `.fx-key-code p{font-weight:700}`; a `<script>` after `id="c-markdown"` holds `[data-fx="key-code"]`, `root.dataset.ran = "yes"` and `console.error("fx key-code: "`.
  - `each section script is its own script element` (Review Focus 1): sections `a` and `b` with a script each → two separate `<script>` elements after `c-markdown`.
  - `pages without a free section carry no kit`: no example yields `c-fx-css`, `c-fx-sections` or `data-fx=`.
  - `file= reads the fragment relative to the draft`: `<tmp>/sections/part.html` = `<p>from file</p>`; `compile(…, { source: "<tmp>/draft.md" })` → holds `from file`, `files` deep-equals `["<tmp>/sections/part.html"]` (absolute), warnings `[]`.
  - `file= from stdin resolves against the working directory` (Review Focus 3): `process.chdir(tmp)` in try/finally, no source → `from file`.
  - `a missing file warns and shows the dashed box`: `## A One` + fence `free nope file=sections/nope.html` on line 2 → warnings `["panel A: line 2: free section file not found: sections/nope.html"]`; HTML holds `class="fx fx-missing" data-fx="nope"`.
  - `a name used twice warns`; `a bad name warns` (`free Key` and a bare `free`).
- [ ] **Step 3: Run** `node --test test/free-render.test.js` → FAIL (module not found).
- [ ] **Step 4: Implement.** `free` is handled in `renderFence` before the plain-code fallback; `ctx.source = opts.source || draft.source || ""`; `FX_CSS = minifyCss(asset("./runtime/fx.css"))`; section CSS is not minified.
- [ ] **Step 5: Run** `npm test` → `# fail 0`; byte-identical check → no diff.
- [ ] **Step 6: Commit** `git commit -m "feat(free): the free block; styles to the head, scripts to the end, file="` (the spike copy, the two new files, `render.js`, `types.d.ts`, the test).

### Task 3: The static lint (implementer: Sonnet)

**Files:**
- Create: `src/free/lint.js`
- Modify: `src/render.js` (lint each loaded section; duplicate ids across the page)
- Test: `test/free-lint.test.js`

**Interfaces:**
- Consumes: `splitFragment` and `ctx.free` entries `{ name, panel, line, html, styles, scripts, bytes }` (Task 2).
- Produces: `lintFree(s: { name: string, html: string, styles: string[], bytes: number }): string[]` and `idsOf(html: string): string[]`. `render.js` prefixes each message with `panel X: line N: free "NAME": `. Messages:
  - `selectors must start with .fx-NAME: A | B | C (+N more)` (one warning, at most three listed)
  - `@keyframes "K" must start with fx-NAME-` · `id "I" must start with fx-NAME-`
  - `duplicate id "I" on the page` (raised by `render.js` on the second occurrence, within or across sections)
  - `raw colour "V"; use a token such as var(--trace-0)` (one per distinct value)
  - `external URL "U"; a page loads nothing from the network`
  - `N.N KB is over the 40 KB budget for a section`
- Rules: strip comments first. Check selectors inside `@media`, `@container`, `@supports`, `@layer`, not inside `@keyframes`, with a brace walker (`lint()` in the spike copy's `shot.mjs` is the start). `.fx-NAME` counts when the next character is not `[A-Za-z0-9_]` (`.fx-NAME-x` passes, `.fx-NAMEx` fails). A raw colour is `#[0-9a-fA-F]{3,8}\b` or `(rgba?|hsla?|hwb|lab|lch|oklab|oklch)(`, looked for in CSS declaration values, in the `fill`, `stroke`, `stop-color`, `flood-color` and `color` attributes, and in `style="…"`. An external URL is a `src`, `href`, `xlink:href`, `poster` or `action` value, a `url(…)` or an `@import` starting `http:`, `https:` or `//`; `xmlns` is never checked. `bytes` is the fragment's UTF-8 length; the limit is 40 × 1024. JS is not linted.

- [ ] **Step 1: Write the failing tests:**
  - `a clean section has no warnings`: name `a`; CSS `.fx-a`, `.fx-a .x, .fx-a-y`, `@media (width < 600px) { .fx-a .z {} }`, `@keyframes fx-a-spin { from {} to {} }`, `fill: var(--trace-0)`, `color-mix(in srgb, var(--ok) 20%, transparent)`; HTML `xmlns="http://www.w3.org/2000/svg"`, `id="fx-a-grad"`, `href="#fx-a-grad"`, `fill="url(#fx-a-grad)"` → `[]`.
  - `an unscoped selector warns once`: `.km-row{}`, `body{}`, `.fx-ab{}`, `:root{}` → exactly `["selectors must start with .fx-a: .km-row | body | .fx-ab (+1 more)"]`.
  - `keyframes and ids need the prefix`: `@keyframes spin`, `id="grad"` → the two messages.
  - `raw colours warn`: CSS `fill: #e8742a` and `hsl(0 0% 0%)`, HTML `stroke="#fff"` and `style="color: rgb(1, 2, 3)"` → four warnings naming each value.
  - `external URLs warn`: `<img src="https://x.test/a.png">`, `url(//cdn.test/f.woff2)`, `@import "https://x.test/a.css";` → three.
  - `a section over 40 KB warns`: `bytes: 41 * 1024` → `41.0 KB is over the 40 KB budget for a section`.
  - `render prefixes lint warnings and finds duplicate ids`: panel A, fence `free a` on line 2 holding `<style>p{}</style><g id="fx-a-k"></g><g id="fx-a-k"></g>` → warnings include `panel A: line 2: free "a": selectors must start with .fx-a: p` and `panel A: line 2: free "a": duplicate id "fx-a-k" on the page`.
- [ ] **Step 2: Run** `node --test test/free-lint.test.js` → FAIL.
- [ ] **Step 3: Implement** `lintFree`, `idsOf` and the calls in `render.js`.
- [ ] **Step 4: Run** `npm test` → `# fail 0`; byte-identical check → no diff.
- [ ] **Step 5: Commit** `git commit -m "feat(free): static lint for free sections"`.

### Task 4: `clarify check`, with the driver moved to `src/` (implementer: Opus)

**Files:**
- Move: `git mv test/visual/cdp.mjs src/check/cdp.js`; a new `test/visual/cdp.mjs` holds only `export * from "../../src/check/cdp.js";`
- Modify: `src/check/cdp.js`, `bin/clarify.mjs` (`check`, HELP), `test/visual-chrome.test.js`
- Create: `src/check/audit.js`, `src/check/index.js`, `test/fixtures/check-broken.md`
- Test: `test/check.test.js`

**Interfaces:**
- Consumes: `compile(draft, { source }) → { html, warnings }` (warnings include the free lint, Tasks 2–3); `slugify` (`src/render.js`); page parts `.c-grid` (`style="--cols:N"`), `.c-card[data-panel]` with `data-span` (absent means 1), `.c-card-body`, `[data-fx="NAME"]`; section script errors start with `fx NAME: `.
- Produces:
  - `src/check/cdp.js`: all old exports, plus the darwin candidate `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge` (after Chromium, before the Linux paths); `page.goto(url, { timeout = 10000 } = {})`; `page.screenshot({ fullPage, clip })` with `clip = { x, y, width, height }` in page CSS pixels, sent with `scale: 1` and `captureBeyondViewport: true`.
  - `src/check/audit.js`: `parseColor(css: string): [r, g, b, a] | null` (`rgb()`, `rgba()`, `color(srgb r g b [/ a])`, `transparent`); `contrastRatio(fg: [r, g, b], bg: [r, g, b]): number` (WCAG 2); `auditScript({ halfEmpty: boolean }): string`, an expression for `page.eval` returning `{ panels: Array<{ id, rect: { x, y, width, height }, problems: Array<{ kind, msg }> }>, sections: Record<string, string> /* name → panel id */, overflow: number }`. It inlines the two helpers with `.toString()`.
  - `src/check/index.js`: `VIEWS` (1440 × 1000 light, 1440 × 1000 dark, 390 × 844 light, 390 × 844 dark; reduced motion); `checkPage({ input: string, outDir?: string, findChrome?: () => string | null, loadTimeout?: number }): Promise<CheckReport>`; `formatReport(report): string[]`.
  - `CheckReport = { browser: boolean, page: string, outDir: string, panels: string[], lint: string[], problems: Array<{ panel: string | null, view: string /* "390 dark" */, kind: "overflow" | "small text" | "overlap" | "clipped" | "page error" | "half-empty" | "low contrast", msg: string }>, pictures: Array<{ panel, view, file }> }`.
  - CLI `clarify check <page.html | draft.md> [--out dir]`; exit 0 unless the input is missing (like `render` with warnings). HELP line: `clarify check  <page.html | draft.md> [--out dir]     browser check of every panel, with pictures`.
- Behaviour (thresholds and skips are the builder's call in the spec; decided here):
  - A `.md` input is compiled with its source path (`lint` = its warnings) and written to `<outDir>/page.html`; a `.html` input is checked as is (`lint = []`). `outDir` defaults to `~/.clarify/checks/<slug>/` (`slugify(meta.title)`, or the `slug` in a page's `#c-page-meta`). Old `*.png` files there are deleted first.
  - One browser; a fresh page per view; `goto(url, { timeout: loadTimeout })`, default 10000. When a load or an eval runs out of time: one `page error`, "the page did not finish loading in N s (a script that never ends?)", and the remaining views are skipped.
  - In-page checks per `.c-card`, starting from `check()` in the spike's `shot.mjs`, widened from one section to every panel:
    - overflow: a box sticks out of its card by more than 1px with no scrolling or clipping ancestor inside the card; plus a page-level overflow (panel `null`) when `scrollWidth > innerWidth + 1`.
    - small text: visible own text under 10.5px on screen (SVG scaled by `getScreenCTM()`).
    - overlap: two visible text boxes, neither inside the other, overlapping by more than 15% of the smaller.
    - clipped: an element with `overflow` hidden or clip holds text and its scroll size exceeds its client size by more than 1px.
    - half-empty (1440 views only): the card body's content (the union of its children's boxes) fills under 50% of its inner height and leaves more than 120px empty. Message `its content fills N% of the panel's height; try span=S`, S = min(cols, span + 1).
    - low contrast: below 4.5:1, or 3:1 for text ≥ 24px or ≥ 18.66px at weight ≥ 700. HTML text: the first ancestor with a non-transparent `background-color`, see-through ones blended over the next. SVG text: the top solid-filled shape under its centre (`document.elementsFromPoint`), else the HTML background. Skip gradients, images, patterns and unknown backgrounds.
    - page error: the driver's `page.errors`; one starting `fx NAME: ` belongs to the panel holding `[data-fx="NAME"]`, any other to `page`.
    - Skipped: hidden elements (`display: none`, `visibility: hidden`, `opacity: 0`, `[hidden]`); `.c-sr` (screen-reader text, clipped on purpose); `.c-diagram .c-viewport` (the canvas clips by design; labels 9.5–10px); `.c-suggested` (9.5px); `:disabled` for contrast; `text-overflow: ellipsis` for clipped. Keep this list, with a reason per entry, in a comment at the top of `audit.js`; extend it only from Step 7.
  - Pictures: per view and card, `<outDir>/<panel>-<width>-<scheme>.png` (`D-390-light.png`), via `screenshot({ clip })` on the card's rect.
  - `formatReport` order: `Pictures of the panels with a problem:` and one indented path per panel and view with a problem; the lint lines as `⚠ <warning>`; the problems, `⚠ panel D @390 light: small text: …` or `⚠ page @1440 dark: page error: …`, at most 5 per kind per panel per view, then `… and N more`; last `✓ check: P panels × 4 views, no problems · pictures in DIR` or `⚠ check: K problems in M panels · pictures in DIR` (singular for 1). With no browser: `⚠ no Chrome or Edge found (set CHROME_PATH): only the static lint ran`, then the lint lines; for a page input `…: nothing checked; the static lint needs the draft`.

- [ ] **Step 1: Move the driver** and add the shim. `npm test` → `# fail 0`; `node test/visual/run.mjs --only lesson-core --baselines .tmp/s1-before --output .tmp/s1-out` → `✓ lesson-core`.
- [ ] **Step 2: Write the fixture and the failing tests.** `test/fixtures/check-broken.md` (`cols: 3`; inline styles and tokens only): A `{span=3}` plain text · B, C, D in one row: B `free wide` a `width: 900px` box, C `free tiny` text at `font-size: 8px`, D `free pile` two absolutely placed labels 2px apart · E `{span=3}` `free cut` a line with `width: 60px; overflow: hidden; white-space: nowrap` · F short text beside G `{span=2}` with 30 lines of text · H `{span=3}` `free boom` `<p>ok</p><script>throw new Error("on purpose")</script>` · I `{span=3}` `free faint` text in `color: var(--surface-2)`.
  Tests in `test/check.test.js` (browser tests `{ skip: !findChrome() && "no Chrome or Edge", timeout: 60000 }`):
  - `colours parse and contrast follows WCAG 2`: black on white = 21 (±0.01); `[119,119,119]` on white ≈ 4.48; equal colours = 1; `parseColor("rgba(1, 2, 3, 0.5)")` → `[1,2,3,0.5]`; `"color(srgb 1 0.5 0)"` → `[255,128,0,1]`; `"transparent"` → `[0,0,0,0]`.
  - `the report lists pictures first, then problems, then a summary`: a hand-made report with one `small text` problem on D @390 light → line 0 is the heading, line 1 ends `D-390-light.png`, a later line starts `⚠ panel D @390 light: small text: `, the last starts `⚠ check: 1 problem in 1 panel`.
  - `without a browser only the static lint runs`: `findChrome: () => null`, a draft with an unscoped selector → `browser: false`, `lint` holds it, `problems` `[]`, no PNG in `outDir`.
  - `every check fires on the panel that has it` (browser; Review Focus 4): the fixture copied into a temp folder named `clarify check ✓` → A and G have no problems; B `overflow`, C `small text`, D `overlap`, E `clipped`, F `half-empty`, H `page error` (`fx boom: Error: on purpose`), I `low contrast`; 36 pictures (9 panels × 4 views), `A-1440-light.png` among them.
  - `a page that never finishes loading is reported` (browser; Review Focus 5): `free spin` holding `<script>for(;;){}</script>`, `loadTimeout: 2000` → resolves within 30 s with one `page error` matching `/did not finish loading/`.
  - In `test/visual-chrome.test.js`: `macOS candidates include Edge`.
- [ ] **Step 3: Run** `node --test test/check.test.js test/visual-chrome.test.js` → FAIL.
- [ ] **Step 4: Implement** the driver additions, `audit.js`, `index.js` and `cmdCheck`.
- [ ] **Step 5: Run** the same tests → `# fail 0`.
- [ ] **Step 6: Look.** `node bin/clarify.mjs check test/fixtures/check-broken.md --out .tmp/s1-check/broken`; read the 1440 light pictures of B, C, D, E, I: each shows its problem.
- [ ] **Step 7: Check the six examples:** `node bin/clarify.mjs check examples/<name>.md --out .tmp/s1-check/<name>`. Look at each problem's picture. Clarify's own UI working as designed → add a skip with its reason. Anything else → list it in your report; do not change clarify's CSS here (it would move the Mac baselines). Repeat until each example is clean or every leftover is listed.
- [ ] **Step 8: Run** `npm test` → `# fail 0`; byte-identical check → no diff.
- [ ] **Step 9: Commit** `git commit -m "feat(check): clarify check, a browser check of every panel; the driver moves to src/check"`.

### Task 5: The kit (implementer: Opus)

**Files:**
- Modify: `src/runtime/fx.css`, `src/render.js` (emit `FX_DEFS` right after `SVG_DEFS` when `ctx.free.length > 0`)
- Create: `src/free/kit.js`, `test/fixtures/free-kit.md` (a gallery: one panel per kit piece, few words)
- Test: `test/free-kit.test.js`

**Interfaces:**
- Consumes: `ctx.free`, `<style id="c-fx-css">` (Task 2); `node bin/clarify.mjs check <draft> --out <dir>` (Task 4).
- Produces: every class of the spike's `fx-base.css` stays. Roles: `hot` (moves, `--trace-0`), `good` (answers, `--ok-line`), `bad` (fails, `--no-line`), `slow` (waits, `--warn-line`), `cool` (other traffic, `--trace-1`). New, from what two or more spike sections built by hand:
  - `.fx-chip.is-cool` (the blue chip);
  - `.fx-wide` / `.fx-phone`: wide drawing shown, phone drawing hidden, swapped by `@container (width < 560px)`;
  - solid fills and bars: `.fx-ROLE-solid` (SVG), `.fx-bar.is-ROLE` (HTML);
  - the hatch for "up to / varies": `.fx-bar.is-varies` (HTML, `repeating-linear-gradient`) and `fill="url(#fx-hatch-ROLE)"` (SVG);
  - `.fx-dot`, a numbered callout `<g class="fx-dot"><circle r="9"/><text>1</text></g>` used with `.fx-leader`; `.is-on` turns it green;
  - `.fx-legend` with `.fx-swatch.is-ROLE` and `.fx-swatch.is-varies`;
  - `.fx-hit`, a see-through `<button>` over a drawing, with a visible `:focus-visible` ring;
  - `.fx [hidden] { display: none !important }`.
  - `src/free/kit.js`: `FX_DEFS = '<svg id="fx-defs" width="0" height="0" aria-hidden="true" style="position:absolute"><defs>…</defs></svg>'` with patterns `fx-hatch-hot`, `-good`, `-bad`, `-slow`, `-cool`, each stroked with its role token.
  - The look: tokens and `color-mix` of tokens only; 1.3–1.5px outlines in `--node-border` or `--ink-2`; 10px radius on tiles; `var(--pop)` on raised things; motion only inside `@media (prefers-reduced-motion: no-preference)`.

- [ ] **Step 1: Write the failing tests:**
  - `the kit defines every shared piece`: `fx.css` holds every new selector above, `@container (width < 560px)` and `.fx [hidden]`.
  - `every token the kit uses exists in themes.css` (Review Focus 2): each `var(--x)` in `fx.css` has a `--x:` in `src/runtime/themes.css`.
  - `the kit has no raw colours`: no hex, `rgb(`, `rgba(`, `hsl(`, `hsla(` outside comments.
  - `the hatch patterns ship only with free sections`: a free page holds `id="fx-defs"` and `id="fx-hatch-cool"`; no example does.
  - `the gallery uses the kit without warnings`: `test/fixtures/free-kit.md` compiles with warnings `[]`.
- [ ] **Step 2: Run** `node --test test/free-kit.test.js` → FAIL.
- [ ] **Step 3: Implement** the kit, `FX_DEFS` and the gallery.
- [ ] **Step 4: Look.** `node bin/clarify.mjs check test/fixtures/free-kit.md --out .tmp/s1-check/kit` → `✓ check: … no problems`. Read the 1440 light, 1440 dark and 390 light pictures: each piece looks like the page, the phone drawing shows at 390, the hatch shows in both schemes.
- [ ] **Step 5: Run** `npm test` → `# fail 0`; byte-identical check → no diff.
- [ ] **Step 6: Commit** `git commit -m "feat(free): the kit: wide/phone swap, hatch, bars, dots, legend, blue chip, hit buttons"`.

### Task 6: No network: the CSP meta tag (implementer: Sonnet)

**Files:**
- Modify: `src/render.js` (head), `test/visual/run.mjs` (one scenario and its act)
- Create: `test/visual/fixtures/free-csp.md`
- Test: `test/free-render.test.js` (add)

**Interfaces:**
- Consumes: `ctx.free.length > 0`, `opts.live` and the `fx NAME: ` error prefix (Task 2).
- Produces: on pages with a free section, right after `<meta charset="utf-8">`: `<meta http-equiv="Content-Security-Policy" content="POLICY">`. POLICY is exactly `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; form-action 'none'; base-uri 'none'`, plus `; connect-src 'self'` when `opts.live` (live reload's `EventSource` to `/__clarify/events`).

- [ ] **Step 1: Write the failing tests:**
  - `a page with a free section blocks the network`: content equals POLICY; the meta comes after `<meta charset` and before the first `<script`.
  - `under clarify serve the policy also allows connect-src 'self'`: with `{ live: true }` the content ends `; connect-src 'self'`; without it there is no `connect-src`.
  - `pages without a free section have no policy`: no example without `data-fx=` holds `Content-Security-Policy`.
- [ ] **Step 2: Run** `node --test test/free-render.test.js` → FAIL.
- [ ] **Step 3: Implement** the meta tag.
- [ ] **Step 4: Add the browser scenario** `{ name: "free-csp", draft: "test/visual/fixtures/free-csp.md", viewport: true, act: "free-csp", noShot: true }`. The fixture holds one `arch` diagram and four free sections in order: `ok` (script sets `root.dataset.ran = "yes"`; holds `<button class="fx-btn" hidden>never</button>`), `boom` (script throws `new Error("on purpose")`), `broken` (script does not parse: `}{`), `after` (script sets `root.dataset.ran = "yes"`). The act asserts: the CSP meta is in the DOM; `ok` and `after` have `data-ran="yes"` (Review Focus 1); `page.errors` holds one entry starting `fx boom: Error: on purpose` and one `SyntaxError` (splice both out so the scenario's own error check passes on the rest); the hidden `.fx-btn` computes to `display: none`; the diagram's Export → PNG downloads a `.png` (reuse `allowDownloads` and `waitForFile` from the `export` act). The standard AUDIT confirms the embedded font loads under `font-src data:`.
- [ ] **Step 5: Run** `npm test` → `# fail 0`; `node test/visual/run.mjs --only free-csp --baselines .tmp/s1-before --output .tmp/s1-out` → `✓ free-csp`; byte-identical check → no diff.
- [ ] **Step 6: Commit** `git commit -m "feat(free): pages with a free section load nothing from the network (CSP)"`.

### Task 7: Markdown export of free sections (implementer: Sonnet)

**Files:**
- Create: `src/free/markdown.js`
- Modify: `src/export/markdown.js` (`blockToMarkdown(b, source = "")`; `draftToMarkdown` passes `draft.source || ""`), `src/render.js` (embed `draftToMarkdown({ ...draft, source: opts.source || draft.source || "" })`), `bin/clarify.mjs` (`cmdMarkdown` sets `draft.source` as `cmdRender` does, line 73)
- Test: `test/free-markdown.test.js`

**Interfaces:**
- Consumes: `loadFreeSection(block, source)`, `splitFragment(fragment)` (Task 2).
- Produces: `freeToMarkdown(block, source: string): string`. For a section with both parts:

```markdown
**How to read this:** read down. Each key sends a number.

> **Takeaway:** The keyboard sends a position, and the computer picks the letter.

_The drawing (`key-code`) is on the HTML page._
```

  The first `.fx-how` and the first `.fx-take`, as text: `<b>`/`<strong>` → `**`, other tags dropped, `&amp; &lt; &gt; &quot; &#39; &nbsp;` decoded, whitespace collapsed. The takeaway gets the lead `**Takeaway:**` (the kit draws that word with CSS). A missing part is left out; the note is always there.

- [ ] **Step 1: Write the failing tests:**
  - `a free section exports its how line, its takeaway and a note`: the fragment `<p class="fx-how"><b>How to read this:</b> read down. Each key sends a number.</p><svg viewBox="0 0 1 1"></svg><p class="fx-take">The keyboard sends a position, and the computer picks the letter.</p><style>.fx-key-code{}</style><script>1</script>` → exactly the block above; no `<svg`, `<style`, `<script`.
  - `without how or takeaway only the note remains`.
  - `the page's embedded Markdown carries no fragment`: `#c-markdown` holds the how line and no `<svg`.
  - `clarify md reads file= sections from the draft's folder`: `execFileSync(process.execPath, [bin, "md", "<tmp>/draft.md"], { cwd: os.tmpdir() })` → the how line from `<tmp>/sections/part.html`.
  - `clarify md - reads file= sections from the working directory` (Review Focus 3): `execFileSync(…, [bin, "md", "-"], { input: draft, cwd: tmp })` → the how line.
- [ ] **Step 2: Run** `node --test test/free-markdown.test.js` → FAIL.
- [ ] **Step 3: Implement** it.
- [ ] **Step 4: Run** `npm test` → `# fail 0`; byte-identical check → no diff.
- [ ] **Step 5: Commit** `git commit -m "feat(free): Markdown export of free sections; md sets the draft's path"`.

### Task 8: `clarify serve` watches `file=` files (implementer: Sonnet)

**Files:**
- Modify: `src/serve.js`
- Test: `test/serve.test.js` (add)

**Interfaces:**
- Consumes: `compile()` → `files: string[]`, absolute paths of every `file=` (Task 2).
- Produces: `serve()` keeps its signature. After every build it watches the folder of each `file=` path that exists (one `fs.watch` per folder, reused across builds, closed by `close()`). An event for a watched name or for the draft schedules the same debounced `rebuild`. The draft folder's watcher (`serve.js` lines 70–76) also reacts to `file=` names in that folder.

- [ ] **Step 1: Write the failing test** `serve: reloads when a file= section changes`: a temp `draft.md` with `free part file=sections/part.html` and `free near file=near.html`; the page holds `first`. Write `second` into `sections/part.html` → `event: reload` within 4 s and the page holds `second`; write `third` into `near.html` → another reload, page holds `third`. Reuse the existing test's SSE reader.
- [ ] **Step 2: Run** `node --test test/serve.test.js` → FAIL (no reload event).
- [ ] **Step 3: Implement** it.
- [ ] **Step 4: Run** `npm test` → `# fail 0`.
- [ ] **Step 5: Commit** `git commit -m "feat(serve): reload when a file= section changes"`.

### Task 9: The wireless example and the size budget (implementer: Sonnet)

**Files:**
- Create: `examples/wireless-mouse.md`
- Modify: `test/render.test.js:12-25` (budget), `test/visual/run.mjs` (two scenarios), `test/visual/PENDING-MAC.md` (one line)
- Test: `test/render.test.js` (add)

**Interfaces:**
- Consumes: the spike copy `docs/superpowers/specs/content-driven-spike/` (`draft.md`, `sections/*`), the `free` fence (Task 2), the lint (Task 3), `clarify check` (Task 4), the kit classes (Task 5), the CSP meta (Task 6).
- Produces: `examples/wireless-mouse.md`: the spike's `draft.md` without the lesson (panel C, which must not ship as an example) and without `mouse-cutaway` (Stage 2). Eyebrow `Device explainer`; title, Lead and panel A as in the spike. Panels: A Why this matters `{span=3}` · B In numbers `{span=3}` (`free numbers`) · C Inside the keyboard `{span=2}` (`free key-matrix`) · D A position, not a letter (`free key-code`) · E The crowded air `{span=3}` (`free spectrum`) · F Receiver or Bluetooth? `{span=3}` (`free radio-choice`) · G One key press, in milliseconds `{span=3}` (`free time-ruler`) · H When something goes wrong `{span=3}` (`free trouble-path`). All inline, never `file=` (`render.test.js` compiles examples without a source path).
- Porting rules:
  - One fragment per section: `NAME.html`, then `<style>` with `NAME.css`, then `<script>` with `NAME.js` if it exists.
  - Rename unprefixed ids with every reference: `fx-km-key-wide` → `fx-key-matrix-key-wide`, `fx-km-key-narrow` → `fx-key-matrix-key-narrow` (every `<use href="#…">`); `fxtr-w-wait`, `fxtr-w-work`, `fxtr-n-wait`, `fxtr-n-work` → `fx-time-ruler-w-wait`, `…-w-work`, `…-n-wait`, `…-n-work` (every `fill="url(#…)"`).
  - Switch a hand-built kit piece to the kit class only when its picture stays the same.
  - Fix what the spike left: at 390px the dashed "microwave oven" line in `spectrum` runs through the Bluetooth label.

- [ ] **Step 1: Write the failing tests:**
  - In `every example compiles…`, the budget becomes `(lesson ? 450 : 164) * 1024 + 40 * 1024 * sections + FONT_BYTES`, with `sections = (html.match(/<div class="fx fx-/g) || []).length`.
  - `the wireless example is seven free sections and no lesson`: seven `<div class="fx fx-`, no `class="c-lesson"`, warnings `[]`, holds `id="c-fx-css"` and `Content-Security-Policy`.
- [ ] **Step 2: Run** `node --test test/render.test.js` → FAIL (no `wireless-mouse.md`).
- [ ] **Step 3: Port** the example.
- [ ] **Step 4: Run** `npm test` → `# fail 0`.
- [ ] **Step 5: Check and look.** `node bin/clarify.mjs check examples/wireless-mouse.md --out .tmp/s1-check/wireless` → `✓ check: … no problems` (or each leftover explained in your report). Read every picture of B to H in all four views.
- [ ] **Step 6: Add the scenarios** `{ name: "wireless-light", example: "wireless-mouse", scheme: "light" }` and `{ name: "wireless-mobile", example: "wireless-mouse", width: 390, height: 844 }`; `node test/visual/run.mjs --only <each> --baselines .tmp/s1-before --output .tmp/s1-out` → `✓` twice. Add to `test/visual/PENDING-MAC.md`: "Also new: `wireless-light` and `wireless-mobile` (`examples/wireless-mouse.md`, free sections). The same `npm run visual:update` creates them, so step 3 shows 6 new PNGs, not 4. Check them like the others and commit them with the rest."
- [ ] **Step 7: Commit** `git commit -m "docs(examples): the wireless mouse and keyboard page, built from free sections"`.

### Task 10: The thinking step: `SKILL.md`, `references/forms.md`, `references/free-sections.md` (implementer: Opus)

**Files:**
- Modify: `SKILL.md`
- Create: `references/forms.md`, `references/free-sections.md`
- Test: `test/skill.test.js`

**Interfaces:**
- Consumes (document them as they are): the `free` fence and its warnings (Tasks 2–3), `clarify check` and its output (Task 4), the kit classes (Task 5), the CSP (Task 6), `examples/wireless-mouse.md` (Task 9), the spike rules and kit notes in `docs/superpowers/specs/content-driven-spike/README.md`.
- Produces spec Part 1, "Depth and time" and "Rules for authors", in plain words:
  - **Frontmatter:** `argument-hint: "[render | serve | md | check] <draft.md>"`. The `description` lists triggers only, starts `Use when`, has at most 1024 characters, and covers any topic where structure or a picture beats prose (how a device, process or system works; what is inside a thing; a timeline or post-mortem; a comparison or choice; a codebase tour; a PR or design review; a decision). It keeps "diagram", "draw", "visualize", "clarify", "compare" and the lesson triggers ("lesson", "teach", "explain step by step", "course", "walk me through how X works"), and never summarises the method.
  - **Remove** `## Context checklist` and `## Draft skeleton`. **Add after `## Commands`** (which gains `check`), in order: `## Depth and time` (the Quick/Designed table; tell the user the depth and a rough time; in Quick the time is the hard rule; a free section that does not fit Quick becomes the nearest block, and the reply names the part that deserves a drawing and offers the designed page) · `## Think before you draw` (the six steps; the kinds as a prompt, not a menu; "when the content needs a form nobody listed, draw it"; points to `references/forms.md`) · `## What every page guarantees` (the five outcomes) · `## Two page shapes` (the device explainer and the bug post-mortem outlines) · `## Draft basics` (frontmatter keys, `Lead:`, `## A Title {span=N}`; at most 15 lines; no content order).
  - **Keep unchanged:** `## Diagram syntax` and `## Lessons` (Stage 2 changes lessons). The other-blocks line gains `free`.
  - **`## Free sections`:** both forms; "read `references/free-sections.md` before you draw one"; the check loop by depth (Quick: one run, read the pictures of the section's panel and of every panel with a warning, one fix round; Designed: every panel's pictures, up to three rounds). **`## Rules`:** rule 2 also runs `clarify check` on every page with a free section. Under 230 lines in all.
  - **`references/forms.md`:** opens by saying these are examples, not a list to pick from; the twelve forms of the spec's table, each with when it fits and a short snippet (the eight spike forms cut down from `examples/wireless-mouse.md`, the three block forms, a new free-section snippet for the incident timeline).
  - **`references/free-sections.md`:** the eight rules (spec Part 2); both forms and how `file=` resolves (the draft's folder; from stdin, the working directory); what the renderer does (`root`, styles to the head, scripts to the end, one broken section stops nothing); every kit class, one line each; the panel widths measured on the current look (one-, two-, three-column at 1440; every panel at 390); the `<use>` trap (`src/runtime/lesson.css` lines 6–10); every lint warning with its fix; the check loop.

- [ ] **Step 1: Write the failing tests:**
  - `the description lists triggers only`: starts `Use when`, ≤ 1024 characters, holds `diagram`, `visualize`, `compare`, `lesson`, `teach`.
  - `the checklist and the skeleton are gone`: no `Context checklist`, no `Draft skeleton`; holds `## Depth and time`, `## Think before you draw`, `## Two page shapes`, `## Free sections`, `bin/clarify.mjs" check`, `references/forms.md`, `references/free-sections.md`.
  - `every reference SKILL.md names exists`.
  - `the free-section examples compile cleanly`: every ```` ````markdown ```` block in `references/free-sections.md` holding a `free` fence compiles with warnings `[]`.
  - `SKILL.md stays lean`: under 230 lines.
- [ ] **Step 2: Run** `node --test test/skill.test.js` → FAIL.
- [ ] **Step 3: Write** the three files.
- [ ] **Step 4: Run** `npm test` → `# fail 0`. Read `SKILL.md` once as a new agent would: every step names a file, a command or a block that exists.
- [ ] **Step 5: Commit** `git commit -m "docs(skill): think about the content first; free sections and clarify check"`.

### Task 11: The skill test, after (controller task; 4 fresh Opus agents)

**Files:**
- Modify: `docs/superpowers/skill-tests/2026-11-20-content-driven-pages.md`
- Untracked: `.tmp/skill-test/after/`

**Interfaces:**
- Consumes: briefs, prompt, pass line, before rows and `shot.mjs` (Task 1); `clarify check` (Task 4); the new `SKILL.md` (Task 10).

- [ ] **Step 1: Dispatch four fresh Opus agents at once** with Task 1's prompt, `<phase>` = `after`: `device`, `postmortem`, `tour` and `device-designed`.
- [ ] **Step 2: Verify each page.** Re-render its draft → no `⚠`. `node bin/clarify.mjs check .tmp/skill-test/after/<id>.md --out .tmp/skill-test/after/<id>-check` → no problems (judge any leftover from its picture and record it). Full-page picture with `shot.mjs`. Fill the after rows.
- [ ] **Step 3: Judge the pass line.** The three Quick pages have visibly different shapes (panel sequences and pictures side by side); each renders with no warning and passes the check; each Quick run takes at most 12 minutes and at most 1.5× its before time. The Designed run's time is recorded, with no limit.
- [ ] **Step 4: On a miss,** make the smallest change to `SKILL.md` or a reference that answers what the run did; commit it; `npm test`; re-run only that content with a fresh agent; record every attempt. After two misses on one content, stop and ask the owner.
- [ ] **Step 5: Commit** `git commit -m "test(skill): after runs with the new SKILL.md"`. In the report to the owner, give the six Quick picture paths (before and after) and the Designed one: the owner has the last word on "visibly different".

### Task 12: Version 0.3.0, README and the syntax reference (implementer: Sonnet)

**Files:**
- Modify: `package.json` (`"version": "0.3.0"`), `README.md`, `references/syntax.md`
- Test: `test/cli.test.js` (create)

**Interfaces:**
- Consumes: the `check` command and HELP line (Task 4), the free warnings (Tasks 2–3), the kit (Task 5), the `free-csp` scenario (Task 6), the wireless scenarios (Task 9).
- Produces:
  - **README:** feature bullets "Free sections" (a `free` fence holds a hand-drawn HTML or SVG section in the page's tokens and kit; try `examples/wireless-mouse.md`) and "A browser check" (`clarify check`: every panel in four views, with pictures); the "Context built in" bullet names the thinking step instead of the context checklist; Quick start adds `node clarify/bin/clarify.mjs check clarify/examples/wireless-mouse.md`; the Layout tree adds `src/free/`, `src/check/`, `runtime/fx.css`, `references/forms.md`, `references/free-sections.md`, and the CLI line reads `render · serve · md · check · view`; Testing gives the unit test count from `npm test` and "Of the 30 scenarios, 19 compare a screenshot"; Size says a page with free sections also carries the kit and each section.
  - **`references/syntax.md`:** `## Free sections` after `## Other blocks` (both forms, the name, `file=` paths, what the renderer does, a link to `references/free-sections.md`); the free warnings with their fixes; `## Checking a page` (`clarify check`: views, the pictures folder, the output order, the no-browser case).

- [ ] **Step 1: Write the failing test** `the CLI reports version 0.3.0 and lists check`: `execFileSync(process.execPath, [bin, "--version"])` → `clarify v0.3.0\n`; `[bin, "help"]` output holds `clarify check`.
- [ ] **Step 2: Run** `node --test test/cli.test.js` → FAIL (`v0.2.0`).
- [ ] **Step 3: Bump** the version and write the docs.
- [ ] **Step 4: Final checks.** `npm test` → `# fail 0`. `node test/visual/run.mjs --baselines .tmp/s1-before --output .tmp/s1-final-out` → `✓` on every scenario (the 27 old ones against Task 1's PNGs; `free-csp`, `wireless-light`, `wireless-mobile` against the PNGs Tasks 6 and 9 wrote). Byte-identical check → no diff.
- [ ] **Step 5: Commit** `git commit -m "chore: v0.3.0; README and syntax reference for free sections and clarify check"`; then `git status --short` → empty.
