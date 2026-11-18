# Clarify Lesson Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ```` ```lesson ```` block to clarify that renders a step-through lesson on a bench of crafted isometric objects (style C), authored by an agent in ≤ 10 minutes.

**Architecture:** Everything is drawn at compile time in Node: a lesson fence is parsed (`src/lesson/parse.js`), turned into per-step states (`state.js`), laid out on a grid (`layout.js`) and drawn as one static SVG with a vendored copy of the anatomy kit (`stage.js`, `objects/*`). The page ships that SVG, the step articles as HTML, and a JSON model; a small browser runtime (`src/runtime/lesson.js`) only toggles classes and moves pucks along precomputed straight paths. Lesson CSS and JS are inlined only into pages that contain a lesson.

**Tech Stack:** Node ≥ 20 ESM, zero dependencies, `node:test`; visual and behaviour checks through the existing CDP harness (`test/visual/run.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-18-lesson-block-design.md`. Approved mockup and its generators: `docs/superpowers/specs/lesson-mockup/` (`approved-lesson-block.jpg`, `build-styles.mjs`, `build-lesson.mjs`).

## Global Constraints

- Zero runtime dependencies, no `npm install`, no build step; Node ≥ 20 (spec §3 anti-goals).
- Existing pages, maps, route tours and exports must not change; the 13 existing visual scenarios must still pass (proved on this Windows PC by before/after screenshots, on the Mac next time).
- Body text 16px; step title ≥ 22px; nothing below 12px, counting HTML text, SVG text and name tags, at 1440 and 390.
- At most 7 places; 6–12 steps plus one quiz; titles ≤ 32 characters; paragraphs ≤ 45 words (warnings, not errors).
- A page with one 5-place lesson ≤ 450 KB. Pages without a lesson stay < 160 KB and contain no lesson CSS or JS.
- Reduced motion: no puck travel and no loop; grey, focus, failure, counters and text still change per step.
- Arrow keys act only inside the lesson that has focus; they must not move route tours or scroll the page.
- Style C look (warm cream, dark outlines, one tint per place); a dark variant in dark themes.
- The anatomy kit is vendored under MIT and credited in `THIRD_PARTY_NOTICES.md`.
- Commits stay on branch `feat/lesson-block`; never push.

## Review Focus

1. **Thai or other non-Latin text** (the owner writes in Thai): titles and paragraphs must not trip the 32-character / 45-word warnings by code units or missing spaces → Task 3 test `thai text is measured by graphemes and words`.
2. **Two lessons on one page:** SVG ids, keyboard and comment targets must not collide → Task 7 test `two lessons get distinct ids`.
3. **A half-typed lesson during `clarify serve`:** missing labels, `move: a ->`, `step Save:` must warn, never throw → Task 3 test `half-typed lines warn instead of throwing`.
4. **No JavaScript** (exported or emailed HTML): every step and the quiz must be readable as a list → Task 7 test `without JS every step is in the page`.
5. **A lesson in a narrow card** (`layout: canvas`, span 1): it must fall back to the stacked phone layout by its own width, not the window's → Task 7 test `lesson CSS stacks by container width`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/iso/kit.js`, `src/iso/kit.css` | Vendored anatomy kit (projection, solids, shading CSS). Unmodified apart from a header. |
| `src/lesson/kinds.js` | `OBJECT_KINDS`, `TINTS`, `PUCK_KINDS`, `CHAPTERS`, limits. Shared vocabulary, no logic. |
| `src/lesson/parse.js` | Lesson fence → `Lesson` model + warnings with draft line numbers. |
| `src/lesson/state.js` | `Lesson` → one `StepState` per step and the quiz. |
| `src/lesson/layout.js` | `Lesson` → grid cell per place, plus layout warnings. |
| `src/lesson/pen.js` | Drawing helpers bound to one projection (ported from the mockup). |
| `src/lesson/objects/<kind>.js`, `objects/index.js` | One crafted object per file, drawn at world origin; registry. |
| `src/lesson/stage.js` | Bench, rails, pads, objects, pucks layers → SVG string + screen geometry. |
| `src/lesson/render.js` | Fence → full lesson HTML (header, counters, stage, legend, timeline, guide, goals, quiz, JSON model). |
| `src/lesson/markdown.js` | Lesson fence → GitHub Markdown. |
| `src/runtime/lesson.css`, `src/runtime/lesson.js` | Lesson styles (style C + dark) and browser runtime. |
| Modified: `src/render.js`, `src/export/markdown.js`, `src/runtime/client.js`, `src/types.d.ts` | Dispatch, conditional assets, export, step comments, types. |
| Modified: `test/visual/cdp.mjs`, `test/visual/run.mjs`, `test/render.test.js`, `.gitignore` | Windows Chrome, harness flags, lesson scenarios, size budgets. |
| New tests: `test/visual-chrome.test.js`, `test/iso-kit.test.js`, `test/lesson-parse.test.js`, `test/lesson-state.test.js`, `test/lesson-layout.test.js`, `test/lesson-stage.test.js`, `test/lesson-render.test.js`, `test/lesson-markdown.test.js` | Unit tests. |
| `examples/git-commit-lesson.md` | The Git lesson ported, with corrected facts. |
| Docs: `SKILL.md`, `references/syntax.md`, `README.md`, `THIRD_PARTY_NOTICES.md`, `test/visual/PENDING-MAC.md` | Agent instructions, syntax, notices, the pending Mac step. |

## The lesson draft syntax (pinned here; Tasks 3–12 all rely on it)

````markdown
```lesson How a Commit Travels
subtitle: Follow one saved change hop by hop.
meta: 10 min · Beginner
places: you = laptop "Your folder" | tray = tray "Staging" | repo = cabinet "Local repo" tint=violet | origin = server "Origin" | mate = laptop "Teammate" at=2,0
rails: you - tray - repo - origin - mate | repo - cache
counters: Edited | Staged | Snapshot | Pushed | Teammates
pucks: change = your change | reply = teammate's change | fail = refused
goals: What the working directory is @2 | Why staging lets you choose @3

step Stage: Pick what goes in the snapshot [how]
  `git add` copies the changes you choose into the ==staging area==.
  tip Why a tray?: Staging lets one messy afternoon become clean snapshots.
  - optional takeaway line
  show: you, tray
  focus: tray
  fail: origin
  cut: repo - origin
  move: you -> tray x2, tray -> repo store & mate -> origin reply, repo <-> origin
  set: Staged = 2 files good | Edited = 1 file warn

quiz Your push was refused. What do you run first?
  * git pull | brings your teammate's commit down
  - git push --force | would erase your teammate's commit
```
````

- Header lines are `key: value` before the first `step`/`quiz`. Keys: `subtitle`, `meta` (items split on `·` or `|`), `places`, `rails`, `counters`, `pucks`, `goals`. Lists split on `|`.
- Place: `id = kind "Label"` then optional `tint=<name>` and `at=<x>,<y>` (grid cells). Rail chains use ` - ` with spaces.
- Step header: `step Short: Title [chapter]`, or `step Title [chapter]` (short = first two words). Chapters `problem | how | why | case | recap`, default `how`. Labels: Problem, How it works, Why it helps, What goes wrong, Recap; the quiz shows Quiz.
- Step lines (leading spaces trimmed): `tip [idea|try|warn] Title: text` (default titles Key idea / Try it / Watch out), `- takeaway`, `show:`, `focus:`, `fail:` (comma lists), `cut: a - b, c - d`, `move:` items split by `,` (sequential) or `&` (starts with the previous item); item `a -> b [kind] [xN]` or `a <-> b [kind] [xN]` (round trip, return leg is `reply`); `set: Label = value [good|warn|bad|none]` split by `|`. Blank line = paragraph break; any other line is paragraph text.
- Puck kinds and colours: `change` orange `#e8742a` (default), `reply` green `#3f9a5a`, `fail` red `#e5484d`, `store` violet `#7b61d1`, `slow` amber `#d4951c`.
- Inline text uses clarify's `renderInline` plus `==term==` → `<mark>`.

Draft line of body line `i` (0-based) = `block.line + 1 + i`.

---

### Task 1: Visual harness runs on Windows; capture "before" screenshots

**Files:**
- Modify: `test/visual/cdp.mjs:12-42` (split `findChrome` into pure `chromeCandidates` + lookup; add `--do-not-de-elevate` on win32 at launch)
- Modify: `test/visual/run.mjs:18-22, 143, 195` (`--baselines <dir>`, `--output <dir>` flags; `pathToFileURL(...).href` instead of `` `file://${...}` ``; scenario field `motion: true` passes `reducedMotion: false`)
- Modify: `.gitignore` (add `.tmp/`)
- Test: `test/visual-chrome.test.js`

**Interfaces:**
- Produces: `chromeCandidates({ platform, env, home, list }): string[]` (exported from `test/visual/cdp.mjs`; `list(dir)` returns directory entries). `findChrome()` keeps its signature. `run.mjs` accepts `--baselines <dir> --output <dir>` and scenario `{ motion?: boolean }`.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { chromeCandidates } from "./visual/cdp.mjs";

test("Windows Chrome, Edge and Playwright builds are candidates", () => {
  const env = { PROGRAMFILES: "C:\\Program Files", "PROGRAMFILES(X86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local" };
  const list = (dir) => (dir.endsWith("ms-playwright") ? ["chromium-1140"] : []);
  const c = chromeCandidates({ platform: "win32", env, home: "C:\\Users\\u", list });
  assert.ok(c.includes("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"));
  assert.ok(c.includes("C:\\Users\\u\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"));
  assert.ok(c.includes("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"));
  assert.ok(c.some(p => p.endsWith("chromium-1140\\chrome-win\\chrome.exe")));
});

test("macOS candidates are unchanged", () => {
  const c = chromeCandidates({ platform: "darwin", env: {}, home: "/Users/u", list: () => [] });
  assert.ok(c.includes("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"));
});
```

- [ ] **Step 2: Run it and see it fail** — `node --test test/visual-chrome.test.js` → FAIL (`chromeCandidates` is not exported).
- [ ] **Step 3: Implement `chromeCandidates`** in `test/visual/cdp.mjs`, using `path.win32.join` for win32 (Playwright entries `chromium-*/chrome-win/chrome.exe`, `chromium-*/chrome-win64/chrome.exe`, `chromium_headless_shell-*/chrome-win/headless_shell.exe`, `chromium_headless_shell-*/chrome-headless-shell-win64/chrome-headless-shell.exe`), keeping every existing macOS/Linux entry in its current order. `findChrome()` = `CHROME_PATH` first, then the first candidate that exists.
- [ ] **Step 4: Add the run.mjs flags and Windows file URLs; ignore `.tmp/`.**
- [ ] **Step 5: Verify** — `node --test test/visual-chrome.test.js` → `# fail 0`; `node test/visual/run.mjs --update --baselines .tmp/before --output .tmp/before-out` prints 15 `✓` lines and no `skipped`. (Source is still identical to `main`, so `.tmp/before` is the "before" set for Task 12.)
- [ ] **Step 6: Commit** — `git add test/visual/cdp.mjs test/visual/run.mjs test/visual-chrome.test.js .gitignore && git commit -m "test: run the visual harness on Windows; baselines/output flags"`

### Task 2: Vendor the anatomy kit

**Files:**
- Create: `src/iso/kit.js` (copy of anatomy `kit/iso-kit.mjs` at commit `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`, plus a 3-line header: source URL, commit, "MIT, see THIRD_PARTY_NOTICES.md")
- Create: `src/iso/kit.css` (copy of anatomy `kit/iso.css`, same header as a CSS comment)
- Modify: `THIRD_PARTY_NOTICES.md` (new section "anatomy isometric kit" with the full MIT text, `Copyright (c) 2026 Ryan`, URL and commit)
- Test: `test/iso-kit.test.js`

**Interfaces:**
- Produces: `src/iso/kit.js` exports used later: `fitProjection, iso, depthOf, slabOf, cylinder, insetPlan, planOutline, lineOnTop, ring, corners, boxCorners, topTicks, knurl, sideRing, haloOf, solidSvg, lineSvg, dotsSvg, pathOf`.

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import * as k from "../src/iso/kit.js";

test("the vendored kit projects, orders and draws solids", () => {
  const P = k.fitProjection([[0, 0, 0], [100, 0, 0], [0, 100, 0], [0, 0, 50]], 400, 300, { pad: 10, azimuth: 45 });
  const [x, y] = k.iso([0, 0, 0], P);
  assert.ok(x >= 0 && x <= 400 && y >= 0 && y <= 300);
  assert.ok(k.depthOf([10, 10, 0], P) > k.depthOf([0, 0, 0], P));
  assert.match(k.solidSvg(k.slabOf({ x: 0, y: 0, w: 10, d: 10, r: 1 }, 0, 5, P), { tone: "mid" }), /class="iso-solid"/);
});
```

- [ ] **Step 2: Run** `node --test test/iso-kit.test.js` → FAIL (module not found).
- [ ] **Step 3: Copy the two files** from `%TEMP%\skill-src\anatomy-review\kit\` (or `git clone --depth 1 https://github.com/wheresryan22/anatomy` and check out the commit above), add the headers and the notice.
- [ ] **Step 4: Run** `node --test test/iso-kit.test.js` → `# fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "feat: vendor the anatomy isometric kit (MIT)"` with the four files.

### Task 3: Parse a lesson fence

**Files:**
- Create: `src/lesson/kinds.js`, `src/lesson/parse.js`
- Modify: `src/types.d.ts` (add the types below)
- Test: `test/lesson-parse.test.js`

**Interfaces:**
- Produces in `kinds.js`: `OBJECT_KINDS = ["laptop","phone","monitor","server","database","cabinet","tray","queue","cache","gate","router","mailbox","folder","cloud","box"]`, `TINTS = ["neutral","amber","violet","blue","green","rose","teal"]`, `PUCK_KINDS = ["change","reply","fail","store","slow"]`, `CHAPTERS = { problem: "Problem", how: "How it works", why: "Why it helps", case: "What goes wrong", recap: "Recap" }`, `LIMITS = { places: 7, steps: 12, words: 45, title: 32 }`.
- Produces: `parseLesson(block: { lang: "lesson", info: string, body: string, line: number }): { lesson: Lesson, warnings: string[] }`, never throws.
- Types (`src/types.d.ts`):

```ts
export type PuckKind = "change" | "reply" | "fail" | "store" | "slow";
export type Level = "good" | "warn" | "bad" | "none";
export interface LessonPlace { id: string; kind: string; label: string; tint: string | null; at: [number, number] | null; line: number }
export interface LessonRail { a: string; b: string; line: number }
export interface LessonMove { from: string; to: string; kind: PuckKind; count: number; together: boolean; roundTrip: boolean }
export interface LessonStep { short: string; title: string; chapter: "problem" | "how" | "why" | "case" | "recap"; paras: string[]; tip: { kind: "idea" | "try" | "warn"; title: string; text: string } | null; takeaways: string[]; show: string[]; focus: string[]; fail: string[]; cut: Array<[string, string]>; moves: LessonMove[]; set: Array<{ label: string; value: string; level: Level }>; line: number }
export interface LessonQuiz { question: string; options: Array<{ text: string; correct: boolean; why: string }>; line: number }
export interface Lesson { title: string; subtitle: string; meta: string[]; places: LessonPlace[]; rails: LessonRail[]; counters: string[]; pucks: Partial<Record<PuckKind, string>>; goals: Array<{ text: string; at: number }>; steps: LessonStep[]; quiz: LessonQuiz | null; line: number }
```

Warnings (exact text, each prefixed `line N: `): `unknown key "x"` · `could not read place "…"` · `unknown object "x", drawn as a box` · `unknown tint "x"` · `unknown puck kind "x" (use change, reply, fail, store, slow)` · `unknown place "x"` · `no rail between "a" and "b"` · `could not read move "…"` · `counter "x" is not declared in counters:` · `step needs a title` · `more than 12 steps` · `more than 7 places; only the first 7 are drawn` · `paragraph has N words (keep it to 45)` · `title has N characters (keep it to 32)` · `quiz needs one correct option, marked with *`. Characters are counted with `Intl.Segmenter(undefined, { granularity: "grapheme" })`, words with `granularity: "word"` (`isWordLike`). An unknown kind keeps `kind: "box"`; an unknown tint becomes `null`; places past 7 are dropped.

- [ ] **Step 1: Write the failing tests.** Create `test/fixtures/lesson-mini.js` exporting this fixture `MINI` (fence at draft line 10); Tasks 4, 5, 6 and 10 import it:

```js
const MINI = { type: "fence", lang: "lesson", info: "How a Commit Travels", line: 10, body: [
  "subtitle: Follow one saved change.",
  "meta: 10 min · Beginner",
  'places: you = laptop "Your folder" | tray = tray "Staging" | repo = cabinet "Local repo" | origin = server "Origin" | mate = laptop "Teammate"',
  "rails: you - tray - repo - origin - mate",
  "counters: Staged | Pushed",
  "pucks: change = your change | reply = teammate's change | fail = refused",
  "goals: Why staging lets you choose @2",
  "",
  "step Save: Your work lives on one laptop [problem]",
  "  You pressed Save. Only your laptop knows.",
  "  tip Key idea: Git moves changes one step at a time.",
  "  show: you",
  "",
  "step Stage: Pick what goes in the snapshot [how]",
  "  `git add` copies the changes you choose.",
  "  move: you -> tray x2",
  "  set: Staged = 2 files good",
  "  focus: tray",
  "",
  "step Rejected: The push is refused [case]",
  "  Your teammate pushed first.",
  "  move: mate -> origin reply & repo -> origin fail",
  "  fail: origin",
  "  set: Pushed = rejected bad",
  "",
  "quiz Your push was refused. What do you run first?",
  "  * git pull | brings their commit down",
  "  - git push --force | erases their commit",
].join("\n") };
```

Tests (assert with `deepEqual`):
- `parses the header` — warnings `[]`; `title` "How a Commit Travels"; `meta` `["10 min","Beginner"]`; place ids `["you","tray","repo","origin","mate"]`; `places[2]` = `{ id:"repo", kind:"cabinet", label:"Local repo", tint:null, at:null, line:13 }`; `rails[0]` = `{ a:"you", b:"tray", line:14 }` and 4 rails; `counters` `["Staged","Pushed"]`; `goals` `[{ text:"Why staging lets you choose", at:2 }]`.
- `parses steps and the quiz` — `steps[0]` has `short:"Save"`, `title:"Your work lives on one laptop"`, `chapter:"problem"`, `paras:["You pressed Save. Only your laptop knows."]`, `tip:{ kind:"idea", title:"Key idea", text:"Git moves changes one step at a time." }`, `show:["you"]`, `line:19`; `steps[1].moves` = `[{ from:"you", to:"tray", kind:"change", count:2, together:false, roundTrip:false }]`; `steps[1].set` = `[{ label:"Staged", value:"2 files", level:"good" }]`; `steps[2].moves[1]` = `{ from:"repo", to:"origin", kind:"fail", count:1, together:true, roundTrip:false }`; `steps[2].line` 30; `quiz` = `{ question:"Your push was refused. What do you run first?", options:[{ text:"git pull", correct:true, why:"brings their commit down" }, { text:"git push --force", correct:false, why:"erases their commit" }], line:36 }`.
- `warns with line numbers` — one small fence per warning in the list above, asserting the exact message and line.
- `thai text is measured by graphemes and words` — a 20-grapheme Thai title (`"การเดินทางของคอมมิต"`) and a 30-word Thai paragraph give no warnings.
- `half-typed lines warn instead of throwing` — bodies `places: you = laptop`, `step Save:`, `move: you ->` each return a warning (`could not read place`, `step needs a title`, `could not read move`) and no exception.

- [ ] **Step 2: Run** `node --test test/lesson-parse.test.js` → FAIL (module not found).
- [ ] **Step 3: Implement `parseLesson`** in `src/lesson/parse.js` per the syntax section; validate place references (`show/focus/fail/cut/move`), rails (a move or cut needs a declared rail in either direction), counters (case-insensitive label match; store the declared spelling), tints, puck kinds, limits.
- [ ] **Step 4: Run** → `# fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "feat(lesson): parse lesson fences with line-numbered warnings"`.

### Task 4: Per-step states

**Files:**
- Create: `src/lesson/state.js`
- Test: `test/lesson-state.test.js`

**Interfaces:**
- Consumes: `Lesson` (Task 3).
- Produces: `railId(lesson: Lesson, a: string, b: string): { id: string, reverse: boolean } | null` (id = `${rail.a}--${rail.b}` of the declared rail, `reverse` when the move runs b→a); `lessonStates(lesson: Lesson): StepState[]` with one entry per step plus one for the quiz (quiz = last step's machine, `moves: []`, counters unchanged, all goals hit):

```ts
interface StepState { live: string[]; focus: string[]; fail: string[]; cut: string[]; routes: string[];
  moves: Array<{ rail: string; reverse: boolean; kind: PuckKind; count: number; together: boolean; roundTrip: boolean }>;
  counters: Array<{ label: string; value: string; level: Level; changed: boolean }>; goals: number }
```

Rules: a place becomes live at the first step that names it (show, focus, fail, cut, move) and stays live; `live` is in declaration order. Counters start at `"—"`/`"none"` and carry forward; `changed` is true when the value differs from the previous state. `routes` = rails of this step's moves, unique, in move order. `goals` = number of goals with `at ≤ step number`.

- [ ] **Step 1: Write the failing tests** (import `MINI` from `test/fixtures/lesson-mini.js`):
  - `states follow the story` — 4 states; `live` `["you"]`, `["you","tray"]`, `["you","tray","repo","origin","mate"]`; `s[1].moves` `[{ rail:"you--tray", reverse:false, kind:"change", count:2, together:false, roundTrip:false }]`; `s[2].moves[0]` `{ rail:"origin--mate", reverse:true, kind:"reply", count:1, together:false, roundTrip:false }`; `s[2].routes` `["origin--mate","repo--origin"]`; `s[2].fail` `["origin"]`.
  - `counters carry forward and flag changes` — `s[1].counters` `[{ label:"Staged", value:"2 files", level:"good", changed:true }, { label:"Pushed", value:"—", level:"none", changed:false }]`; `s[2].counters[0].changed` false; `s[2].counters[1]` `{ label:"Pushed", value:"rejected", level:"bad", changed:true }`.
  - `goals tick by step and the quiz keeps the machine` — goals `0,1,1,1`; `s[3].moves` `[]`; `s[3].live` equals `s[2].live`.
- [ ] **Step 2: Run** `node --test test/lesson-state.test.js` → FAIL.
- [ ] **Step 3: Implement** `railId` and `lessonStates`.
- [ ] **Step 4: Run** → `# fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "feat(lesson): compute per-step lesson states"`.

### Task 5: Lay out the bench

**Files:**
- Create: `src/lesson/layout.js`
- Test: `test/lesson-layout.test.js`

**Interfaces:**
- Consumes: `Lesson`.
- Produces: `layoutBench(lesson: Lesson): { cells: Record<string, [number, number]>, drawn: string[], warnings: string[] }` — grid cells (1 cell = 120 world units), `drawn` = ids of rails that can be drawn (rail ids as in Task 4).

Algorithm: the first rail chain sets the order; zigzag steps repeat `[[1,0],[0,-1],[1,0],[0,1]]` from `[0,0]`. A place with `at=` takes that cell first. A place joined only by a later rail goes to the first free neighbour of its partner in the order `[0,-1],[0,1],[1,0],[-1,0]`. A place with no rail continues the zigzag after the chain end and warns `line N: "x" has no rail`. An occupied cell warns `line N: "x" overlaps "y"` and the later place moves to its first free neighbour. A rail is drawn when its ends share a row or column with no place strictly between; otherwise warn `line N: rail a - b can't be drawn straight` and leave it out of `drawn`.

- [ ] **Step 1: Write the failing tests:**
  - `the Git chain zigzags like the mockup` — `layoutBench(MINI)` cells `{ you:[0,0], tray:[1,0], repo:[1,-1], origin:[2,-1], mate:[2,0] }`; `drawn` has all 4 rails; warnings `[]`.
  - `a branch takes the first free neighbour` — rails `a - b - c | b - d` → `d: [1,1]`.
  - `manual cells win and overlaps move` — `a … at=0,0 | b … at=0,0` → b moved to `[0,-1]`, warning `line N: "b" overlaps "a"`.
  - `a crooked rail is not drawn` — `at=0,0` and `at=1,1` with a rail between → warning and the rail missing from `drawn`.
- [ ] **Step 2: Run** `node --test test/lesson-layout.test.js` → FAIL.
- [ ] **Step 3: Implement `layoutBench`.**
- [ ] **Step 4: Run** → `# fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "feat(lesson): lay places out on a zigzag bench"`.

### Task 6: Pen, stage and the first five objects

**Files:**
- Create: `src/lesson/pen.js` (port the helpers in `lesson-mockup/build-styles.mjs:33-62`: `at, solid, line, slab, pathAt, faceY, faceX, segY, segX, halo, dot, screws, plateOnY, byDepth, byDepthPlans`, bound to one projection)
- Create: `src/lesson/objects/laptop.js`, `tray.js`, `cabinet.js`, `server.js` (port `laptop()` :110-147, `tray()` :149-170, `drawerFront()`+`cabinet()` :172-219, `server()` :221-260, re-centred at world origin), `box.js` (new: a crate with plank seams, corner brackets, screws and a label plate), `objects/index.js`
- Create: `src/lesson/stage.js`
- Test: `test/lesson-stage.test.js`

**Interfaces:**
- Consumes: `kit.js`, `Lesson`, `layoutBench().cells/.drawn`.
- Produces: `createPen(P): Pen`; each object module `export default { top: number, draw(pen: Pen): string }` with `top` = 46 laptop, 18 tray, 53 cabinet, 70 server, 30 box; `OBJECTS: Record<string, { top, draw }>` in `objects/index.js` (kinds not yet drawn map to `box`).
- Produces: `renderStage(lesson: Lesson, layout, n: number): { svg: string, rails: Record<string, { a: [number, number], b: [number, number] }>, origin: [number, number], tags: Record<string, [number, number]> }` — `rails` are rail-end screen points in viewBox units, `origin` is the screen point of world `[0,0,0]`, `tags` are `[left%, top%]` of each place's tag anchor (pad front corner, world `[x, y+36, 3]`).
- Constants: viewBox `1120 × 620`; cell 120; pad `{x:-36,y:-36,w:72,d:72,r:5}`, height 3; bench = pad bounds + 12, height 10, feet 6; azimuth 45, `fitProjection` pad 26; rail plan 5 wide, 1.2 high; puck cylinder r 4.8, height 3.6, on z 1.2.
- SVG contract (the runtime and CSS depend on it): `<svg class="l-svg" viewBox="0 0 1120 620" role="img" aria-label="…">`; `<defs>` with `<g id="l{n}-obj-{kind}">` once per used kind and `<g id="l{n}-puck">`; `<g class="l-bench">`; per drawn rail `<g class="l-rail" data-rail="{id}">` + `<path class="l-route" data-rail="{id}" d="M…L…"/>`; per place `<path class="l-focus" data-place="{id}">` then `<g class="l-pad" data-place="{id}" data-tint="{tint}">`; then, in depth order (`x + y` of the cell), `<g class="l-obj" data-place="{id}" data-tint="{tint}"><use href="#l{n}-obj-{kind}" transform="translate(dx dy)"/><g class="l-bad" data-place="{id}" transform="translate(bx by)">…</g></g>`, with `<g class="l-pucks" data-rail="{id}"></g>` inserted at depth `min(endpoint depths) + 0.5`. Tint = the place's tint, else `TINTS` in place order starting at `neutral`.

- [ ] **Step 1: Write the failing tests:**
  - `objects are crafted` — each of laptop, tray, cabinet, server, box drawn with a test projection has at least 20, 10, 15, 12, 8 `class="iso-solid"` matches respectively.
  - `repeated kinds share one drawing` — the `MINI` stage has exactly one `id="l0-obj-laptop"` and two `href="#l0-obj-laptop"`.
  - `rails, tags and pucks layers line up` — 4 `class="l-route"`, 4 `class="l-pucks"`; every `tags[id]` within 0–100; `rails["you--tray"].a` ≠ `.b`.
  - `painter's order follows depth` — in the SVG string, `data-place="repo"` object precedes `data-place="tray"` object, and `data-rail="tray--repo"` pucks layer sits between them.
- [ ] **Step 2: Run** `node --test test/lesson-stage.test.js` → FAIL.
- [ ] **Step 3: Implement** `createPen`, the five objects, `OBJECTS`, `renderStage`. Objects use the kit's classes only (`iso-solid`, `iso-line` tones) plus the mockup's `m-screen`, `m-code`, `m-plate`, `m-cavity`, `m-led`, `m-paper` renamed `l-screen`, `l-code`, `l-plate`, `l-cavity`, `l-led`, `l-paper`. Engraved pad labels are not drawn (spec §5.1).
- [ ] **Step 4: Run** → `# fail 0`.
- [ ] **Step 5: Look at it.** Render the `MINI` stage to `.tmp/stage.html` (wrap with `src/iso/kit.css` and the mockup's `.sk-c` variables) and screenshot at 1440 with `test/visual/cdp.mjs`; compare against `lesson-mockup/approved-style-c.jpg`. Objects must match the mockup's detail.
- [ ] **Step 6: Commit** — `git commit -m "feat(lesson): draw the bench and the first five objects"`.

### Task 7: Lesson HTML, style C CSS, core runtime, page integration, Git example

**Files:**
- Create: `src/lesson/render.js`, `src/runtime/lesson.css`, `src/runtime/lesson.js` (core only), `examples/git-commit-lesson.md`
- Modify: `src/render.js:15-31` (add `LESSON_CSS = minifyCss(asset("./iso/kit.css") + asset("./runtime/lesson.css"))`, `LESSON_JS = minifyJs(asset("./runtime/lesson.js"))`), `:65` (`lessons: 0` in ctx, copied back from `pctx` like `diagrams`), `:100-101` and `:138` (emit `<style id="c-lesson-css">` and `<script id="c-lesson-js">` only when `ctx.lessons > 0`), `:230` (in `renderFence`: `lesson` → `renderLesson(b, ctx.lessons++)`, push warnings as `panel X: …`, set `ctx.wide = ctx.roomy = true`)
- Modify: `test/render.test.js:12-20` (budget: `/class="c-lesson"/.test(html) ? 450 * 1024 : 160 * 1024`)
- Test: `test/lesson-render.test.js`

**Interfaces:**
- Consumes: Tasks 3–6.
- Produces: `renderLesson(block, n: number): { html: string, warnings: string[] }`. HTML contract (consumed by Tasks 8–9 and the CSS):
  - Root `<section class="c-lesson" data-lesson="{n}" tabindex="0" aria-label="Lesson: {title}">`.
  - `.l-head` (`h3.l-title`, `p.l-sub`, `ul.l-meta` with the meta items and "N steps").
  - `.l-counters` with one `.l-chip[data-counter="{i}"][data-level]` per counter (`.l-chip-k` label, `.l-chip-v` value) and `.l-tools` holding `button[data-l="replay"]` and `button[data-l="pause"][aria-pressed="false"]`.
  - `.l-stage` = stage SVG + `.l-tags` with `span.l-tag[data-place][data-n]` placed by `style="left:…%;top:…%"`; `ol.l-key[hidden]` (number + tint swatch + label per place); `ul.l-legend` (only puck kinds used, with the author's labels or the kind name).
  - `ol.l-timeline` with `button[data-step="{i}"]` (number + short), the quiz last.
  - `aside.l-guide`: `.l-count` (text "Step {i+1} / {N}", N counts the quiz), `.l-chapter`, `button[data-l="comment"]`, then one `article.l-step[data-step="{i}"][data-line="{line}"]` per step (`h4.l-step-title`, paragraphs, `.l-tip.is-{kind}`, `ul.l-takeaways`) and `article.l-step.l-quiz` (question, `button.l-option[data-correct="true|false"]` each with a hidden `.l-why`); `.l-nav` with `button[data-l="back"]` and `button[data-l="next"]`; `p.l-keys` ("← → step · R replay · Space pause"); `.l-goals` with `li[data-at]`; `p.l-live.c-sr[aria-live="polite"]`.
  - `<script type="application/json" class="l-model">` = `{ n, origin, rails, states, shorts, places }` (`states` from Task 4, `rails` from Task 6).
  - No article carries `hidden` in the compiled HTML; the runtime hides them.
- Produces (`lesson.css`): style C under `.c-lesson` using the mockup tokens (`lesson-mockup/build-styles.mjs:325-331` and `build-lesson.mjs:75-131`), tints by `[data-tint]` (neutral, amber, violet, blue, green from the mockup; rose and teal in the same six-tone pattern), dim `opacity:.3; filter:grayscale(1)`, dashed orange focus ring, red badge, a visible `:focus-visible` outline on every lesson control; fonts `var(--font-display)` for titles, `var(--font)` 16px body, `var(--mono)` 12px labels; `container-type: inline-size` on `.c-lesson` with an `@container (max-width: 760px)` stacked layout and sticky Back/Next; dark variant under `:root[data-theme="dark"|"tokyo-night"|"nord"|"catppuccin"|"blueprint"] .c-lesson` and `@media (prefers-color-scheme: dark) { :root[data-theme="auto"] .c-lesson }` (same hues, darker values, light outlines, text contrast ≥ 4.5:1).
- Produces (`lesson.js` core): for each `.c-lesson`, `show(i)` hides other articles, updates chips (`data-changed` only when moving forward), `is-dim` on `[data-place]` not live, `is-on` on `.l-focus`/`.l-bad`/`.l-route`, `is-cut` on cut rails and routes, timeline `is-now`/`is-done` and `aria-current="step"`, goals `is-hit`, Back/Next labels ("Next: {short}", last step "Done", Back disabled at 0), live text "Step i of N: title". Back/Next/timeline buttons call `show`.
- Example `examples/git-commit-lesson.md`: panel A intro, panel B the lesson (port all 10 steps of `Documents\Craft Anything\designed-to-scale-vercel-app\app\src\course\lessons\commit-journey.js` plus a quiz on the refused push), panel C a 4-node `arch` map with a `trace`. Corrections: `git add` copies; no "Git watches"; titles ≤ 32 characters ("The snapshot is missing a file", "The push is refused").

- [ ] **Step 1: Write the failing tests** (`test/lesson-render.test.js`):
  - `the Git example compiles cleanly` — `compile(parseDraft(read("git-commit-lesson.md")))`: warnings `[]`, `bytes < 450*1024`, `html` contains `class="c-lesson"`, `id="c-lesson-css"`, `id="c-lesson-js"`, 11 `class="l-step` (10 steps + quiz).
  - `pages without a lesson get no lesson assets` — every other example's HTML lacks `c-lesson-css` and `c-lesson-js`.
  - `key terms are marked` — a paragraph with `==staging area==` renders `<mark>staging area</mark>`.
  - `lesson text is escaped` — a lesson whose title, label, paragraph, tip and quiz option are `<img src=x onerror=alert(1)>` produces no `<img src=x`.
  - `without JS every step is in the page` (Review Focus 4) — no `<article class="l-step…" hidden`.
  - `two lessons get distinct ids` (Review Focus 2) — a draft with two lesson fences: both `l0-obj-` and `l1-obj-` occur, and every `id="…"` in the HTML is unique.
  - `lesson CSS stacks by container width` (Review Focus 5) — `src/runtime/lesson.css` contains `container-type:inline-size` after minification and an `@container` rule; a `layout: canvas` draft with a lesson compiles with warnings `[]`.
- [ ] **Step 2: Run** `node --test test/lesson-render.test.js test/render.test.js` → FAIL.
- [ ] **Step 3: Implement** `renderLesson`, `lesson.css`, `lesson.js` (core), the `render.js` changes, the size-test change and the example.
- [ ] **Step 4: Add the harness scenario** `{ name: "lesson-core", example: "git-commit-lesson", viewport: true, act: "lesson-core", noShot: true }` and its `act`: only article 0 visible; click `[data-l="next"]` twice → article 2 visible, chip "Staged" reads "2 files" with `data-level="good"` and `data-changed`, `.l-obj[data-place="tray"]` lacks `is-dim`, `.l-focus[data-place="tray"]` has `is-on`; click timeline step 9 → `.l-bad[data-place="origin"]` has `is-on`; the visible `.l-step p` computes to 16px and `.l-step-title` to at least 22px.
- [ ] **Step 5: Run** `npm test` → `# fail 0`; `node test/visual/run.mjs --only lesson-core --baselines .tmp/after --output .tmp/after-out` → `✓ lesson-core`.
- [ ] **Step 6: Commit** — `git commit -m "feat(lesson): render lessons into clarify pages"`.

### Task 8: Motion and controls

**Files:**
- Modify: `src/runtime/lesson.js`
- Modify: `test/visual/run.mjs` (scenarios and acts below)

**Interfaces:**
- Consumes: the HTML contract and model from Task 7.
- Behaviour to add, per lesson root:
  - Pucks: clone `<use href="#l{n}-puck">` into `.l-pucks[data-rail]`, class `is-{kind}`, moved with `transform` only along the straight rail path (`reverse` flips ends). Timing: start 300 ms, travel 1150 ms, repeats every 200 ms, return leg 120 ms after arrival, sequential items 160 ms apart, `together` items share a start, loop rest 900 ms. Loop while visible (IntersectionObserver) and not paused.
  - Reduced motion (`matchMedia("(prefers-reduced-motion: reduce)")`): no loop; each move's pucks drawn once at the end point.
  - `button[data-l="pause"]` toggles `is-paused` and `aria-pressed`; `[data-l="replay"]` restarts the schedule.
  - `keydown` on the root only: ArrowLeft/ArrowRight step (preventDefault), `r` replays, Space toggles pause unless the target is a button, input or textarea. No document-level key handlers.
  - Compact tags: a ResizeObserver on `.l-stage`; if any two `.l-tag` rectangles overlap, add `is-compact` to the root (tags show `data-n`, `ol.l-key` is shown), else remove it.
  - Quiz: clicking `.l-option` marks it `is-picked` and `is-right`/`is-wrong`, reveals every `.l-why`, and sets the live text to "Right" or "Not quite".
- [ ] **Step 1: Write the failing scenarios** in `run.mjs`:
  - `lesson-motion` (`motion: true`, `noShot`): on step 3 two samples of `.l-pucks use` transforms 300 ms apart differ; after `[data-l="pause"]` two samples are equal; focusing the root and pressing ArrowRight moves `.l-count` from "Step 3" to "Step 4"; starting the panel C route tour and pressing ArrowRight inside the lesson leaves the tour's `.c-route-count` unchanged.
  - `lesson-still` (default reduced motion, `noShot`): on step 3 two samples 300 ms apart are equal and every puck sits at its rail's end point (±1 unit).
  - `lesson-compact` (`width: 390, height: 844`, `noShot`): the root has `is-compact` or no two tags overlap; every `.l-tag` and `.l-chip-k` computed font size ≥ 12px.
  - `lesson-quiz` (`noShot`): click the wrong option → it gets `is-wrong`, all `.l-why` visible, live text "Not quite".
- [ ] **Step 2: Run** `node test/visual/run.mjs --only lesson-motion --baselines .tmp/after --output .tmp/after-out` (and the other three) → `✗`.
- [ ] **Step 3: Implement** the behaviour in `lesson.js`.
- [ ] **Step 4: Run** the four scenarios → four `✓`; `npm test` → `# fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "feat(lesson): pucks, controls, keys, reduced motion, quiz"`.

### Task 9: Comment on a step

**Files:**
- Modify: `src/runtime/lesson.js` (dispatch), `src/runtime/client.js:834-845, 904-910` (listener, `external` sheet kind)
- Modify: `test/visual/run.mjs` (scenario)

**Interfaces:**
- Produces: `button[data-l="comment"]` dispatches `document.dispatchEvent(new CustomEvent("clarify:comment", { detail: { kind: "Lesson step", title, subtitle: "Leave review comments on this step", target: { type: "step", diagram: "lesson-{n}", index, panel, label: "Step {i+1} · {title}", line } } }))`.
- `client.js` listens: `current = { kind: "external", detail }; renderSheet(detail)`; `refreshSheet` re-renders `current.detail` when `current.kind === "external"`. `targetKey` and `replyText` are unchanged; a step note reads `- [B · step] Step 3 · Pick what goes in the snapshot (line N)`.
- [ ] **Step 1: Write the failing scenario** `lesson-comment` (`noShot`): go to step 2, click `[data-l="comment"]` → `.c-sheet.is-open` whose title is the step title; type a note and click `[data-add-note]`; the dock shows 1 comment; the reply text (read via the same function the existing `reply` act uses) contains `[B · step] Step 2 · ` and `(line `.
- [ ] **Step 2: Run** `node test/visual/run.mjs --only lesson-comment --baselines .tmp/after --output .tmp/after-out` → `✗`.
- [ ] **Step 3: Implement** the dispatch and the listener.
- [ ] **Step 4: Run** → `✓ lesson-comment`; `node test/visual/run.mjs --only reply-loop --baselines .tmp/before --output .tmp/after-out` → `✓ reply-loop` (existing loop unchanged).
- [ ] **Step 5: Commit** — `git commit -m "feat(lesson): comment on lesson steps in the reply loop"`.

### Task 10: Markdown export

**Files:**
- Create: `src/lesson/markdown.js`
- Modify: `src/export/markdown.js:62` (`if (b.lang === "lesson") return lessonToMarkdown(b);` before the diagram branch)
- Test: `test/lesson-markdown.test.js`

**Interfaces:**
- Produces: `lessonToMarkdown(block): string` = `### {title}`, `_{subtitle}_`, a ```` ```mermaid ```` `flowchart LR` with `id["Label"]` nodes and `a --- b` per rail, a numbered list `N. **{title}** {paragraphs joined}` with the tip as an indented `> **{tip title}:** {text}` and takeaways as nested bullets, then `**Quiz: {question}**` with `- [x] {right option} — {why}` / `- [ ] {option} — {why}`.
- [ ] **Step 1: Write the failing test** `exports a lesson for GitHub` — `lessonToMarkdown(MINI)` contains `### How a Commit Travels`, ```` ```mermaid ````, `you["Your folder"] --- tray["Staging"]`, `1. **Your work lives on one laptop**`, `> **Key idea:** Git moves changes one step at a time.`, `- [x] git pull — brings their commit down`; and `draftToMarkdown(parseDraft(read("git-commit-lesson.md")))` contains `### How a Commit Travels`.
- [ ] **Step 2: Run** `node --test test/lesson-markdown.test.js` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → `# fail 0`; `npm test` → `# fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "feat(lesson): export lessons as GitHub Markdown"`.

### Task 11: The other ten objects

**Files:**
- Create: `src/lesson/objects/phone.js`, `monitor.js`, `database.js`, `queue.js`, `cache.js`, `gate.js`, `router.js`, `mailbox.js`, `folder.js`, `cloud.js`; modify `objects/index.js`
- Modify: `test/lesson-stage.test.js`

**Interfaces:**
- Each module `export default { top, draw(pen) }`, footprint within ±30 of the origin, standing on z 3. Subjects: phone (on a small stand, screen with app rows, buttons, camera), monitor (browser window on screen, stand, cable), database (stacked drums with bands, bolts, status LEDs), queue (conveyor belt with rollers and three parcels), cache (low rack of fast drawers with LEDs and a lightning label plate), gate (turnstile barrier with a lock panel and keypad), router (flat box with ports, LEDs, two antennas), mailbox (post-mounted mailbox with a flag and letters), folder (box file with papers and a label holder), cloud (a small datacenter building with roof vents, a dish and a door).
- Craft bar (spec §5.6): real small parts, the kit's four-tone shading, painter's order inside the object, every line ends on something, at most one engraved label.
- [ ] **Step 1: Write the failing tests** — `every kind is drawn` (`Object.keys(OBJECTS).sort()` equals `[...OBJECT_KINDS].sort()` and no kind except `box` uses the box drawing); `objects are crafted` gains a minimum of 12 `class="iso-solid"` for each new kind.
- [ ] **Step 2: Run** `node --test test/lesson-stage.test.js` → FAIL.
- [ ] **Step 3: Implement** the ten objects.
- [ ] **Step 4: Gallery check.** Write `.tmp/gallery.html` with all 15 kinds on a bench (a lesson with 7 places, rendered twice) and screenshot it at 1440 with `test/visual/cdp.mjs`, plus 4× crops of each object. Fix any object that reads as flat blocks or has a line ending in mid-air.
- [ ] **Step 5: Run** → `# fail 0`; `npm test` → `# fail 0`.
- [ ] **Step 6: Commit** — `git commit -m "feat(lesson): ten more crafted objects"`.

### Task 12: Baselines, before/after proof, docs, and the 10-minute test

**Files:**
- Modify: `test/visual/run.mjs` (screenshot scenarios `lesson-light` and `lesson-fail` with `act: "lesson-step-9"` (clicks `.c-lesson .l-timeline [data-step="8"]`, waits 200 ms), `lesson-dark` with `scheme: "dark"`, and `lesson-mobile` at `390 × 844`)
- Create: `test/visual/PENDING-MAC.md`
- Modify: `SKILL.md`, `references/syntax.md`, `README.md`
- Modify: `docs/superpowers/specs/2026-11-18-lesson-block-design.md` §6.3 (Mac step order, see Step 3)

**Interfaces:**
- `SKILL.md` description adds triggers: "lesson", "teach", "explain step by step", "course", "walk me through how X works". New section "Lessons": when to use a lesson (something moves between places over time) versus a route tour (one path through a map); the story shape; the writing rules (plain words first, then the ==term==; one idea per step; every step changes the machine; show a failure and its fix; end with a recap and one quiz); a 15-line skeleton; the object list. Full syntax in `references/syntax.md`.
- [ ] **Step 1: Prove existing pages are unchanged.** `node test/visual/run.mjs --baselines .tmp/before --output .tmp/after-out` → `✓` for all 15 pre-existing scenarios (13 screenshots, 2 interaction-only), no `skipped`. Any `✗` on them is a regression to fix before continuing.
- [ ] **Step 2: Look at the new lesson screenshots** in `.tmp/after-out` (light, dark, mobile, failure step) against `lesson-mockup/approved-lesson-block.jpg` and spec §5.1–5.2. Do not commit Windows-made lesson PNGs to `test/visual/baselines/`.
- [ ] **Step 3: Write `test/visual/PENDING-MAC.md`** saying: on the Mac run `npm run visual` (do **not** use `visual:update`: it would overwrite the 13 existing baselines and hide regressions); it checks the 13 existing scenarios and writes the 4 missing lesson baselines; review and commit those four PNGs, then delete this file. Update the spec's §6.3 Mac line to the same order.
- [ ] **Step 4: Write the docs** (`SKILL.md`, `references/syntax.md`, `README.md` feature bullet with the example command).
- [ ] **Step 5: The 10-minute test.** Dispatch two fresh agents that can only see this repo's `SKILL.md` and `references/`. Brief 1: "Make a clarify lesson explaining how an HTTPS request travels from a browser to a server." Brief 2: "Make a clarify lesson explaining how clarify turns a draft into a page, from its source code." Record wall-clock time from dispatch to `✓ <path>`. Pass: each ≤ 10 minutes, at most one re-render to fix `⚠` warnings, 0 warnings at the end. If either fails, improve `SKILL.md` or the warnings and re-run that brief.
- [ ] **Step 6: Final check** — `npm test` → `# fail 0`; `node test/visual/run.mjs --baselines .tmp/before --output .tmp/final-out` → no `✗`.
- [ ] **Step 7: Commit** — `git commit -m "docs: lessons in SKILL.md, syntax reference and README; Mac baseline note"`.
