# Clarify lesson block — design

Date: 2026-11-18 · Status: draft for approval · Branch: `feat/lesson-block`

## 1. Intent and why

The owner wants an agent to turn **any topic or codebase** into an **easy-to-follow visual
lesson** in **10 minutes or less**, with objects that look crafted rather than like flat boxes.

Two things led here:

- **A Git course they built** (a restyle of a system-design course site) showed that the format
  works for learning: one idea per step, places that appear as the story needs them, things
  moving between places, counters that change, and "what goes wrong" cases. But its objects are
  a few shaded blocks each, and they want a much higher level.
- **The anatomy skill** (github.com/wheresryan22/anatomy, MIT) draws that higher level: crafted
  isometric machines with many small parts. But it invents a new machine per figure, which takes
  30 minutes to several hours: far over the 10-minute budget.

Clarify already compiles an agent's Markdown draft into one interactive HTML page and has
narrated route tours, so it is the home for this. The owner chose to add **both** the lesson
steps and the crafted objects, as one new block.

## 2. Decided by the owner

| Decision | Choice |
| --- | --- |
| What to add to clarify | **C: lesson steps + crafted 3D objects together**, as one block (not objects-only, not steps-only) |
| Look of the objects | **Style C "Bold"**: warm cream ground, dark outlines, stronger colour per place, on detailed anatomy-style objects |
| Time budget | **≤ 10 minutes** from request to rendered page, per lesson |
| The design in §5 | Approved in conversation after a playback of points 1–7 and a mockup |

Mockups the owner saw and approved (open in a browser):
`%TEMP%\clarify-lesson-design\mockup\preview\index.html` (three styles) and
`%TEMP%\clarify-lesson-design\mockup\preview\lesson.html` (the lesson block, style C).
Their generators, `mockup/build-styles.mjs` and `mockup/build-lesson.mjs`, are a working seed
for the bench and four objects (laptop, tray, card cabinet, server) drawn with the anatomy kit.

## 3. Goals, non-goals, anti-goals

**Goals**

1. A new ```` ```lesson ```` fenced block in clarify drafts that renders a step-through lesson
   player inside a normal clarify page (a page may hold several lessons).
2. A fixed set of about 15 crafted object kinds, drawn once in style C, reusable for any topic.
3. An agent with only the updated skill can author and render a lesson on an unseen topic in
   ≤ 10 minutes, with the CLI catching mistakes by draft line number.
4. Easy to learn from: readable text, one idea per step, failures shown on the machine, and one
   quiz question to check understanding.

**Non-goals (v1)**

- A course menu, progress tracking or navigation across many lessons.
- Inventing a custom machine per lesson (anatomy's own mode), WebGL, 3D turning, or PDF printing.
- Letting the agent draw new object geometry in a draft.
- Dragging objects or editing the bench in the browser.

**Anti-goals (would make this a failure even if it works)**

- Any change to how existing clarify pages, maps, route tours or exports look or behave; the 13
  existing visual baselines must still pass untouched.
- A runtime dependency, an `npm install`, or a build step. Clarify stays zero-dependency, Node ≥ 20.
- Authoring that takes longer than 10 minutes because the syntax is long or fiddly.
- Text a learner has to squint at (body below 16px, any label below 12px), or motion that cannot
  be stopped.

## 4. Approaches considered

**What to add.** A: crafted objects for existing maps only. B: lesson steps on today's flat boxes.
**C: both as one lesson block (picked by the owner)**: the real goal, at about twice the work
before anything is visible.

**How objects get made.**
- Invent a machine per lesson (anatomy's way): best explanation, but 30 min–hours each; fails the
  10-minute budget. Rejected.
- **A fixed set drawn once with the anatomy kit (picked)**: each lesson only writes text; the set
  grows over time.
- AI image generation: not crisp, not animatable per part, not themable. Rejected.

**Look.** A "Instrument" (paper tones, colour only on what moves), B "Instrument + colour", **C
"Bold" (picked by the owner)**.

**Where the drawing happens.** **At compile time in Node (picked)**, like clarify's diagrams today:
the page ships finished SVG plus a small runtime that only switches state and moves pucks.
Drawing in the browser would ship the whole geometry kit to every page. Rejected.

## 5. The design

### 5.1 What the reader sees (desktop, ≥ 1200px)

Matches `lesson.html`. Inside a full-width clarify panel:

- **Header:** lesson title, a one-sentence subtitle, and meta tags (minutes, level, step count).
- **Counter row** above the stage: one chip per declared counter (label + value). Values are
  coloured by level (good / warn / bad / none). A chip whose value changed on this step is
  highlighted. Replay and Pause buttons sit at the right end of the row.
- **Stage:** the bench, the whole machine visible at all times (no camera moves in v1):
  - **Places**: one crafted object per place, standing on its own pad, with a flat **name tag**
    (≥ 12px, like the Git lesson's tags) under it. Tags are placed from projected coordinates and
    must not collide at any width. The mockup's engraved pad labels are dropped: they render at
    about 8px on a laptop and 2–3px on a phone. At phone width, if full tags cannot fit, they fall
    back to numbered tags plus a place key under the stage (tint swatch + name).
  - **Rails** between places, set into the bench.
  - **Pucks**: the things that move (a change, a request, a commit), riding the rails.
  - **Focus**: a dashed orange ring on the bench around the place this step is about.
  - **Not yet introduced**: places the story has not reached are shown in grey (about 30%
    opacity, greyscale), so the whole machine is visible from step 1.
  - **Failure**: a red puck that stops short, a red rail, and a red ✕ badge on the place. The
    cause is shown too (for example the teammate's green puck reaching origin first).
- **Legend** under the stage: built from the puck kinds this lesson actually uses.
- **Timeline** of numbered steps with 1–2 word labels; done, current, upcoming; clickable.
- **Guide panel** (right, about 360px): `STEP n / N`, a chapter tag (Problem, How it works,
  Why it helps, What goes wrong, Recap, Quiz), the step title, 1–2 short paragraphs, one tip box
  (Key idea / Try it / Watch out), optional takeaways list, Back and Next ("Next: Pull"), a
  keyboard hint, and a **You'll learn** checklist that ticks itself as steps are reached.

Text sizes: body 16px, step title ≥ 22px, chips and labels ≥ 12px.

### 5.2 Phone (≤ 640px)

One column: header, counters (wrapping or scrolling sideways), stage scaled to the width,
legend, guide, a compact timeline (dots plus the current label), and a sticky bar with Back and
Next. The bench and labels must still read at 390px wide.

### 5.3 Story shape

Same as the Git lesson the owner liked: a **problem** step in plain words, **how** steps that add
one idea each, a **why it helps** step, 1–2 **what goes wrong** steps showing a failure and its
fix, a **recap** with takeaways, then one **quiz** step. 6–12 steps. Every step changes something
on the machine (a puck moves, a place lights, a counter changes).

### 5.4 Authoring (the draft)

The agent writes one fenced block. The exact syntax is the builder's call, under these rules:

- Line-based and short: a 10-step lesson is about 60–90 lines. Nothing positional the agent has
  to compute (no coordinates by default).
- Every declaration and step keeps its draft line number, for CLI warnings and for the reply loop.
- Inline formatting matches clarify's (`code`, **bold**) plus a highlighted key term.

What a draft declares (illustrative sketch, not final syntax):

````markdown
```lesson How a Commit Travels
subtitle: Follow one saved change hop by hop, from your laptop to your teammate's.
meta: 10 min · Beginner
places: you = laptop "Your folder" | tray = tray "Staging" | repo = cabinet "Local repo" | origin = server "Origin" | mate = laptop "Teammate"
rails: you - tray - repo - origin - mate
counters: Edited | Staged | Snapshot | Pushed | Teammates
pucks: change = your change | mate = teammate's change | fail = refused
goals: What the working directory is @2 | Why staging lets you choose @3

step Stage: Pick what goes in the snapshot [how]
  `git add` copies the changes you choose into the ==staging area==, a waiting tray.
  You picked two of the three files. The third one stays out, on purpose.
  tip Why a tray?: Staging lets one messy afternoon become several clean snapshots.
  move: you -> tray x2
  set: Staged = 2 files good
  focus: tray

step Rejected: Case: the push is refused [case]
  Your teammate pushed first, so Git refuses your push rather than lose their work.
  tip warn Never force it: `git push --force` would erase their commit. Pull first.
  move: mate -> origin mate, repo -> origin fail
  fail: origin
  set: Pushed = rejected bad

quiz Your push was refused. What do you run first?
  * git pull | brings your teammate's commit down, then you can push again
  - git push --force | would erase your teammate's commit
  - git commit again | the remote would still have a commit you don't
```
````

Semantics the builder must keep:

- **Places**: id, object kind, label; optional tint and optional manual position. Max 7 per lesson.
- **Rails**: a chain (`a - b - c`) plus optional extra pairs. A move may only run along rails.
- **A place is introduced** at the first step that names it (move, focus, fail, or an explicit
  show). Before that it is grey.
- **Counters** carry their value forward until a step sets them again.
- **Moves** in a step play in order (an option lets two start together); then a calm pause; then
  the step's moves loop, as in the Git lesson. Replay restarts; Pause holds.
- **Puck kinds** map to fixed colours: change/request (orange), returned/teammate (green),
  refused/failed (red), stored (violet), slow (amber). The legend shows only the kinds used,
  with the author's labels.
- **Quiz**: one question, 2–4 options, one correct, a reason for each. Picking shows right or
  wrong and the reason. It is the last step in the timeline.

### 5.5 Bench layout

Automatic by default: places follow the rail chain in a zigzag across the bench (the mockup's
pattern: +x, −y, +x, +y, …), rails join neighbours, and the bench is sized to its places. A place
may set a grid position by hand. The builder decides how branch rails (a place off the main
chain) are placed. Nothing may overlap, and the whole bench must fit the stage at 1440 and 390.

### 5.6 Objects (v1 set, about 15)

Must include the four the Git lesson needs: **laptop, tray, card cabinet, server**. The rest
cover common software topics; final list is the builder's, for example: phone, monitor/browser,
database, queue (belt with parcels), cache, gate/lock (auth), router (gateway / load balancer),
mailbox (email, notifications), folder (files), datacenter or cloud building, and **box**
(a crate with a label plate), the fallback for any unknown kind with a CLI warning.

Craft bar for every object, from the anatomy rules: real small parts (screws, seams, handles,
vents, LEDs, label plates, keys), four-tone shading from the kit, correct painter's order, lines
that end on something, one engraved label at most. Style C colours: one tint per place
(neutral, amber, violet, blue, green, rose, teal…), assigned in chain order unless the draft
sets one; dark outlines; cream bench.

### 5.7 Themes

Style C in clarify's light themes (light, auto-light, paper). A dark variant of style C (same
hues, darker values, light outlines) in dark themes (dark, auto-dark, tokyo-night, nord,
catppuccin, blueprint). The builder sets the dark values.

### 5.8 Rendering split

- **Compile time (Node):** parse → validate → lay out the bench → draw the static SVG (bench,
  pads, rails, objects) with a vendored copy of the anatomy kit → compute each rail's screen
  path → serialise the per-step state as JSON in the page.
- **Runtime (browser):** switch steps by toggling classes and attributes (grey, focus, failure,
  counters, guide text), move pucks along the precomputed paths with transforms only, run
  loop / pause / replay, keyboard, reduced motion, aria-live announcements, and the quiz. No SVG is
  rebuilt per frame.
- The kit is MIT: vendor `kit/iso-kit.mjs` (pure geometry, no imports) and credit it in
  `THIRD_PARTY_NOTICES.md`.

### 5.9 Behaviour and accessibility

- Back/Next, timeline buttons, and ←/→ keys. Arrow keys act only on the lesson that has focus or
  was used last, and must not break route tours or page scrolling. Space toggles Pause only when
  the lesson has focus. R replays.
- **Reduced motion:** pucks appear at their destination with no travel and no loop; everything
  else (grey, focus, counters, text) still changes per step.
- Step changes are announced politely to screen readers; all controls have names and visible
  focus.
- The stage animates only while on screen.

### 5.10 Clarify integration

- **CLI warnings with line numbers**, for example: unknown place, unknown object kind (falls back
  to box), a move with no rail, an undeclared counter, a step with no title, more than 12 steps or
  7 places, a paragraph over 45 words, a title over 32 characters, a quiz with no correct option.
- **Reply loop:** each step and the quiz can be commented on like a panel; the reply cites the
  step's draft line.
- **`clarify md` export:** the lesson becomes a heading, a Mermaid flowchart of places and rails,
  a numbered list of steps (title, text, tip), and the quiz as a list.
- **`clarify serve`** live preview works for lessons.
- **SKILL.md** gets a short lesson section (when to use a lesson vs a route tour, the story
  shape, writing rules: plain words first then the term, one idea per step, every step changes
  the machine, show a failure and its fix). Full syntax goes in `references/syntax.md`. Add
  `examples/git-commit-lesson.md`, the Git lesson ported to the new block.

## 6. How we know it is done

1. `clarify render examples/git-commit-lesson.md` gives a page whose lesson matches the approved
   mockup at 1440 (in light, and in a dark variant) and follows §5.2 at 390 (there is no phone
   mockup), with 0 warnings.
2. **The 10-minute test:** a fresh agent with only the updated skill writes and renders lessons
   for two unseen topics (one concept, one codebase) in ≤ 10 minutes each, with at most one
   re-render to fix warnings. Measure wall-clock time.
3. All existing unit and visual tests pass. The one deliberate test change: the page-size check in
   `test/render.test.js` keeps its 160 KB budget for every page without a lesson and gains a
   450 KB budget for pages with one. Lesson CSS and JS are only added to pages that contain a
   lesson (`platform-topology.md` is already 157 KB). New visual baselines cover lesson light,
   dark, phone, and a failure step.
   **Where this is checked (owner's answer):** the existing baselines were made on the owner's Mac
   and fonts differ on Windows, so:
   - On this Windows PC, now: teach `test/visual/cdp.mjs` to find Chrome on Windows (it
     currently returns null and the suite silently skips), then prove existing pages are
     unchanged with before/after screenshots of `main` versus the branch on this machine (pixel
     diff, every existing example, light and dark, 1440 and 390). Never report a skipped visual
     run as a pass.
   - On the owner's Mac, next time: `npm run visual` once. It checks the 13 existing scenarios
     against their committed baselines and writes the 4 missing lesson baselines; review and
     commit those four. Do not use `visual:update`: it would overwrite the 13 existing baselines
     and hide any regression. Until then `test/visual/PENDING-MAC.md` records this step.
4. Reduced motion: no travel or loop, and the state still changes.
5. Keyboard works as in §5.9 alongside a route tour on the same page.
6. Body text is 16px; nothing is below 12px, counting HTML text, SVG text and name tags, at 1440
   and at 390.
7. A page with one 5-place lesson weighs ≤ 450 KB (clarify pages are about 85–130 KB today; the
   mockup's unoptimised scene was about 270 KB).

## 7. Risks

- **Page weight** from detailed objects: one-decimal coordinates, merging many tiny parts into
  fewer paths, and `<symbol>`/`<use>` for repeated objects (two laptops share one drawing).
- **Too few object kinds** for some topics: the box fallback plus a warning; add kinds over time.
- **Painter's-order mistakes** as layouts vary: keep layout on a grid with fixed spacing; cover
  each kind and each neighbour direction in visual tests.
- **Arrow-key conflicts** with route tours: scope keys to the focused component.
- **Look origin:** style C descends from the owner's Git course, which was modelled on
  designed-to-scale.vercel.app (no licence shown). The bench and objects here are new (drawn with
  the MIT anatomy kit) and the lesson uses clarify's own typography; keep it that way and do not
  copy that site's assets.

## 8. Left to the builder

Exact draft syntax and warning wording; the final object list and their drawings; tint values
and the dark variant; puck timing and easing; how branch rails are laid out; the quiz's look;
the md export details; the file layout inside `src/` (for example `src/lesson/` and `src/iso/`);
and how lesson comments plug into the existing comment system.

## 9. Calls made after the builder check

A fresh reviewer read this design as a builder would and raised three questions:

1. **Labels (designer's call):** engraved pad labels could not meet the 12px rule or read on a
   phone, so places get flat name tags (§5.1) with a numbered-tag + key fallback at phone width.
2. **Page size (designer's call):** the existing size test caps every example page at 160 KB,
   which a lesson page cannot meet with the approved detail. That test keeps 160 KB for pages
   without a lesson and gets a 450 KB budget for pages with one (§6.3).
3. **Visual tests (owner's answer: "mac next time"):** Windows before/after checks now, Mac
   baselines next time (§6.3).

## 10. References

- Clarify: `src/render.js` (block dispatch), `src/diagram/index.js` (fence → model → SVG),
  `src/runtime/client.js` (route tours, keys), `src/runtime/themes.css`, `test/visual/run.mjs`.
- anatomy kit: `kit/iso-kit.mjs`, `kit/iso.css`, rules in `SKILL.md` and `references/craft.md`.
- The Git lesson this ports: `Documents\Craft Anything\designed-to-scale-vercel-app\app\src\course\lessons\commit-journey.js`.
  Its review found five factual slips in the Git lessons; the example port must use the
  corrected wording (`git add` copies, `git restore` restores from the staging area by default,
  `git show` prints a diff, a commit id also covers parent, author, time and message).
