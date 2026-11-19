# Content-driven pages and lessons: each part of the content in the form that fits it

Date: 2026-11-19 · Branches: this document's home is `feat/content-driven-pages` (commit 2a51f6f); the throwaway `spike/lesson-content` adds two spike commits on top · Status: approved by the owner on 2026-11-20. Approach A and the object rule are the owner's calls. The rest was delegated and is open to veto. The owner's answers to the three questions are at the end.

## Intent and why

Today every clarify page has the same shape. `SKILL.md` gives the agent:

- one eight-point "Context checklist" that every page must answer "in this order";
- one draft skeleton (why it matters, a system map, trade-offs, a decision);
- eight block types: `arch`/`flow`, `sequence`, `callout`, `ask`, `kv`, `tree`, tables and `lesson`;
- six examples in `examples/`, all about software: three architecture or request-flow pages, a Mermaid demo, a codebase tour and a Git lesson.

So the agent fills a template. A page about a wireless mouse gets the same panels as a page about a checkout service.

The owner wants the opposite. The agent reads the content first. It works out what each part is. It serves each part in the form that fits it. There is no fixed list of shapes. The page must still look good, be complete and help the reader. The owner's words: "agent look at content … then analyse and serve the content as a section … no limit, because not every content is the same … some need this UI, style, workflow, type, diagram, so base on content, but still look good and comprehensive and help".

The same problem sits inside lessons. The owner called the sample's lesson (panel C, "The whole trip") "the black sheep": its objects are "not related or linked with the content". The mouse and the keyboard were wooden crates (the `box` fallback). A router stood in for the USB receiver, and a filing cabinet for the keyboard layout. The owner compared it with designed-to-scale.vercel.app, where clarify's look comes from, which is "more object or UI related than us". There, every object is the thing in the story (laptops named Ana and Ben, a tickets database with a ticket icon). A data pill on an object changes as you step ("seat 7 · left: 1"). A card on the stage shows the code the step talks about ("BOOK A SEAT"). Ours had only name tags, and values lived in the counters above the stage. This is not a limit of the drawing style: the cutaway in panel D drew a real mouse with the same pen. The limit is the lesson block. A place must be one of 15 ready-made kinds, and anything else becomes a crate. It is the page's fixed-menu problem again, inside the lesson.

## Goals, non-goals, anti-goals

Goals:
- The skill makes the agent think about the content before it chooses any form.
- A page may hold parts that no block type covers, drawn by hand: **free sections**. They look native to the page.
- clarify can check every page (every panel, not only free sections) and tells the agent what to fix.
- A lesson's stage shows the story's real things and its data.
- Existing drafts keep rendering exactly as they do now.
- A quick answer still takes about 10 minutes.

Non-goals:
- A bigger fixed block library as the answer.
- A new look. The course look (`2026-11-19-course-ui-design.md`) stays.
- A visual editor.
- Any npm dependency.
- 3D objects outside lessons in Stage 1. They are the last item of Stage 2.

Anti-goals (we must not build these by accident):
- A page where each section looks like a different product.
- A stand-in object for one of the story's main things.
- A page that needs JavaScript or animation to be understood.
- Quick pages that get slower.
- A page that loads anything from the network.

## Constraints

- Zero dependencies. Node >= 20.
- A page is one standalone HTML file.
- Colours only from the tokens in `src/runtime/themes.css`.
- Works on Windows and macOS.
- Every existing test stays green.
- Local commits only. Never push without asking the owner.
- Stage 1 makes the version 0.3.0 (`package.json` is 0.2.0 today).

## Approaches

| Approach | What it gets | Verdict |
| --- | --- | --- |
| **A. Thinking step + free sections + a guard, together** (*owner's call*) | The agent picks forms from the content; it can draw what no block covers; clarify checks the result | **Picked** |
| B. Only add more ready-made blocks | Faster pages for the shapes we add | Rejected: a list of blocks always misses some content, and it is still a fixed menu |
| C. The agent designs the whole page from zero every time | Total freedom | Rejected: the slowest, and pages stop looking like one product |

## What the spikes showed

### The first spike: pages

It lives in `.tmp/spike-free/` (git-ignored, throwaway). It is one page: "How a Wireless Mouse and Keyboard Work". The page was built from the content. Next to the existing lesson it has 8 free sections, each inside an ordinary panel:

| Panel | Section | What it shows |
| --- | --- | --- |
| B | `numbers` | big numbers |
| D | `mouse-cutaway` | a 3D cutaway of the mouse with numbered parts |
| E | `key-matrix` | the key grid; click a key to press it |
| F | `key-code` | a key-code lookup that flips between English and Thai |
| G | `spectrum` | a map of the 2.4 GHz band |
| H | `radio-choice` | USB receiver and Bluetooth side by side |
| I | `time-ruler` | one key press on a ruler in milliseconds |
| J | `trouble-path` | problems pinned on the path where they live |

What we learned:

- **It works.** With the tokens and a small shared kit (`fx-base.css`), sections drawn by four separate agents look like one page. This holds in light, in dark and at phone width (see `shots/*.png`).
- **The checks work.** `shot.mjs` has five checks: overflow, small text, text overlap, clipped text and page errors. Each one was proven to fire. Authors needed 2 to 5 check-and-fix rounds per section.
- **The checks missed two things** a person saw at once. One was a half-empty panel (a short text panel beside a tall one). The other was a label line crossing other labels, on the mouse cutaway. A person saw it, and it was fixed by hand: the generator now runs each leader level from its label (`gen/mouse-cutaway.mjs` line 359). At phone width, the dashed "microwave oven" line still runs through the Bluetooth label (`spectrum-390-light.png`).
- **Time.** Scaffold: 8 minutes. A flat section: about 5 to 10 minutes. The 3D cutaway: 25 minutes. With agents in parallel: about 35 minutes of wall-clock. So free sections do not fit a 10-minute run unless there are few of them.
- **Size.** The page was 585 KB. Rendered without its sections it was 409 KB, and 262 KB of that was the lesson (409 KB with the `lesson` fence, 146.5 KB without it). The eight sections add 168 KB of their own files. The cutaway alone is 72 KB; the seven flat sections together are 96 KB.
- **What authors built by hand more than once:** a wide drawing and a phone drawing swapped by container width (3 of 4 authors); a hatch for "up to / varies"; solid bars in a role colour; numbered callout dots with leader lines; legend swatches.
- **Traps they hit:** SVG `<use>` copies ignore scoped selectors (`lesson.css` lines 7–10 explain why). `.fx-btn` sets `display`, which beats the `hidden` attribute. The kit had no blue chip.
- **3D needs work.** The object tones (`--anatomy-*`) exist only inside `.c-lesson` (`lesson.css` lines 14–71). The cutaway rebuilt them by hand in its own CSS and imported the internal modules `src/lesson/pen.js` and `src/iso/kit.js`. There is no supported way to draw a pen object outside a lesson.

### The second spike: lessons

Branch `spike/lesson-content`: commit 9708f30 (pills and the card) and ab0f94e (four objects), plus scratch in `.tmp/spike-lesson/` (pictures in `shots/`, for example `s-full-1440-step09.png` and `b-solo-light.png`). It rebuilt the sample's lesson.

- **Four objects drawn for this lesson**, in the existing object format (`{ top, draw(pen) }`, no imports): `mouse`, `receiver`, `keyboard`, and `layout` (an easel chart: a key turns into "a"). Drawing time per object: receiver about 4 minutes, keyboard 6, mouse 10, layout 12. With reading and preview rounds: about 15 to 25 minutes per author. Drawn size: mouse about 28 KB, receiver 15 KB, layout 22 KB, keyboard 75 KB (the built-in laptop is 71 KB).
- **Two new step lines**, spike quality. `note: place = text [level] | …` puts a value pill above a place. It carries forward; an empty value removes it; at most 24 characters. `card: Title | line | …` puts a card on the stage (at most 6 lines); `card: none` hides it.
- **Layout at run time.** The runtime places pills and the card so they never cover an object, a tag or a resting puck. At phone width, pills that do not fit move to a row under the stage with their place name, and the card becomes a block under the stage.
- **Result.** All 13 states (12 steps and the quiz) checked at 1440, and two at 390: nothing covered, no page errors. The page grew from 585 KB to 647 KB.
- **Tests.** `npm test`: 160 of 162 pass. The two failures are expected shape changes: `lesson-parse.test.js` line 39 (a step now has `notes` and `card`) and `lesson-stage.test.js` line 46 (the pinned object tops now include the new kinds).
- **What the pen lacked** (both object authors and the cutaway author): a curved solid (the mouse shell is a hand-built mesh, `mouse.js` lines 56–125); solids along any axis or tilted (`lying` runs along y only); text on a face (the kit has `faceTextSvg`, `sideMatrix` and `topMatrix`, but the pen does not pass them on, `pen.js` lines 92–96); an accent fill and a thick dark line; helpers objects had to copy (a convex hull and the camera's sin/cos); a `dot` radius in screen units, not world units (`pen.js` lines 49–51).
- **What the stage author says a real version should change:** lay pills and the card out at build time, so the first paint and the no-JavaScript view are right (today `.l-pills` stays empty until the runtime fills it); test against object outlines, not bounding boxes; do not show the same value twice (counter chip and pill); give card lines a form that keeps indentation and allows `|`; decide the phone layout on purpose.

## The design

Four parts, plus one rule about depth and time. Parts 1 to 3 are about pages. Part 4 is about lessons.

### Part 1: the thinking step (`SKILL.md`, `references/`)

Remove the "Context checklist … in this order" and the single "Draft skeleton" from `SKILL.md`. Put a method in their place:

| Step | What the agent does |
| --- | --- |
| 1. Gather | Collect the facts first, as a short list. Only those facts go on the page. (The "Facts" list in the spike README is the model.) |
| 2. Split | Cut the content into its parts. |
| 3. Name the kind | For each part, say what kind of thing it is. |
| 4. Choose the form | Use a block when one truly fits. Otherwise draw a free section. |
| 5. Order as a story | The answer first. The whole before the parts. What to do next comes last. |
| 6. Check | Render and fix every warning. When the page has a free section, run `clarify check`, look at the pictures and fix, as the depth rule says. |

Kinds to think with: a thing with parts; a hidden mechanism; something moving between places over time; a length of time; a choice between two; a shared space; a lookup; a structure; a failure and its fix; a number that matters; a decision for the reader. This list is a prompt for thinking, not a menu. The skill says plainly: when the content needs a form nobody listed, draw it.

The reader guarantees stay, as outcomes, not as an order:
- The answer comes first (`Lead:`).
- The page says why it matters.
- Every drawing says how to read it and ends with a takeaway.
- Trade-offs carry reasons.
- The reader knows what happens next.

New file `references/forms.md`: about a dozen worked forms, each with when it fits and a small picture or snippet. It opens by saying these are examples, not a list to pick from. A first cut:

| Kind | A form that fit | From |
| --- | --- | --- |
| a number that matters | big number, small unit, one line of meaning | spike B |
| a thing with parts | cutaway with numbered dots and a legend | spike D |
| a hidden mechanism | a grid you can press, showing what answers | spike E |
| a lookup | a table that flips between two settings | spike F |
| a shared space | a map of the space and who uses which slice | spike G |
| a choice between two | two columns with the same rows | spike H |
| a length of time | a ruler with solid (fixed) and striped (varies) bars | spike I |
| a failure and its fix | problems pinned on the path where they live | spike J |
| moving between places over time | `lesson` (a block) | existing |
| a structure | `arch` map or `tree` (blocks) | existing |
| a decision for the reader | `ask` (a block) | existing |
| events in order | an incident timeline (for a post-mortem) | new |

`SKILL.md` shows two short page outlines of clearly different shapes instead of one skeleton:
- **A device explainer** (the wireless page): Lead → why it matters → big numbers → the whole trip (`lesson`) → inside each part (free) → a choice (free) → a time ruler (free) → problems on the path (free).
- **A bug post-mortem:** Lead (what broke, the fix, are we safe now) → incident timeline (free) → the failing path (`arch` + `trace`) → the cause → fixes compared (table with reasons) → what to do next (`ask`).

**The `description`.** The `description` in the frontmatter of `SKILL.md` names only software topics today (system architecture, request flows, codebase tours, PR or design reviews); only the lesson triggers are general. So the skill may not trigger for "how does a wireless mouse work". Widen it to any topic where structure or a picture beats prose. Keep it a list of when to use the skill: triggers only, no summary of the method.

**How we test the skill change** (as `superpowers:writing-skills` requires). The inputs and the pass line are designer decisions. Fresh agents get the same three contents. Each content runs in Quick, once with today's `SKILL.md` and once with the new one. Record the wall-clock time of every run.

| Content | Rule |
| --- | --- |
| a physical device | not the mouse |
| a bug post-mortem | made up but internally consistent; written once and reused for every run |
| a codebase tour | of the clarify repo itself |

The change passes when:
- the three new pages have visibly different shapes (the builder judges from screenshots and shows them to the owner, who has the last word);
- each new page renders with no warnings and passes the guard;
- no new Quick run takes more than 12 minutes, or is much slower than its old run.

Also one Designed run of the device content. Its time is recorded and reported; it has no limit.

### Part 2: free sections

A new fenced block, `free`, in two forms:

````markdown
## F A position, not a letter
```free key-code
<p class="fx-how"><b>How to read this:</b> read down. Each key sends a number …</p>
<svg viewBox="0 0 420 120" role="img" aria-label="…">…</svg>
<p class="fx-take">The keyboard sends a position, and the computer picks the letter.</p>
<style>.fx-key-code .kc-row { … }</style>
<script>root.querySelector(".kc-flip").addEventListener("click", …)</script>
```

## D Inside the mouse {span=3}
```free mouse-cutaway file=sections/mouse-cutaway.html
```
````

- The body is an HTML fragment. It may contain `<style>` and `<script>`.
- `file=` is for a large or generated drawing. The path is relative to the draft. When the draft comes from stdin, it is relative to the working directory.
- The name uses lowercase letters, digits and dashes, as in the spike.
- Raw HTML enters a page only through `free`. Everything else stays escaped (`markdown.js`; the escaping test in `render.test.js` stays).

What the renderer does:
1. Wraps the fragment in `<div class="fx fx-<name>" data-fx="<name>">`.
2. Moves every `<style>` into one style element in the page head, after the kit.
3. Moves every `<script>` to the end of the body. Each one is wrapped so that `root` is the section element, and an error is caught and logged with `console.error("fx <name>: …")`. One broken section never stops the others. (`build.mjs` in the spike does exactly this.)

A short check that reads the section without a browser, the **static lint**, runs inside `render`. It prints the usual `⚠ panel X: line N: …` warnings (as `bin/clarify.mjs` line 82 does today) for:
- a selector that does not start with `.fx-<name>`;
- an `@keyframes` name or an `id` without the prefix `fx-<name>-`;
- a duplicate `id` on the page;
- a raw colour (hex, `rgb()`, `hsl()` …) instead of a token;
- an external URL;
- a section over 40 KB.

Two more warnings follow from the design: a `free` name used twice on one page (`root` and the CSS scope would collide), and a `file=` that does not exist (the panel then shows the kit's dashed `.fx-missing` box).

**The kit**, `src/runtime/fx.css`. It ships only on pages with a free section, the same way `lesson.css` ships only with a lesson (`render.js` lines 43–45, 117). It starts from the spike's `fx-base.css`. It adds only what two or more spike sections needed: the wide/phone drawing swap by container width; the hatch for "up to / varies"; solid bars in each role colour; numbered callout dots with leader lines; legend swatches; a blue chip; a see-through button for click areas over a drawing; the `[hidden]` fix (`[hidden]` always wins inside `.fx`). Everything else stays in the section's own CSS.

**No network.** Pages with a free section also get a Content-Security-Policy meta tag. It goes right after `<meta charset>`, before the first inline script, and blocks every network request. The page must still work, so the policy allows inline scripts and styles, `data:` fonts (the embedded font), `data:` and `blob:` images (PNG export draws a `data:` SVG, `client.js` line 1055), and nothing else. Under `clarify serve`, `connect-src 'self'` stays allowed, because live reload opens an `EventSource` to `/__clarify/events` (`client.js` line 1087).

**Rules for authors** move from the spike README into `references/free-sections.md`:
1. The section is the explanation. Start with one "How to read this" line (`.fx-how`). End with one takeaway (`.fx-take`).
2. Tokens only. No raw colours.
3. One face: the inherited mono font.
4. Nothing under 10.5px on screen (the check's limit, and the size of the kit's small-caps labels). Body text 13px; labels 11 to 12px.
5. Colour means the same thing everywhere (orange moves, green answers, red fails, amber waits, blue is other traffic), and colour never stands alone: every coloured thing has a label.
6. Motion only when the reader allows it (`prefers-reduced-motion: no-preference`). The still state tells the whole story.
7. Plain words first, then the term.
8. Only gathered facts. No numbers of your own.

The file also carries the kit reference, the panel widths (from the spike README) and the `<use>` trap.

**Markdown export.** `clarify md` and the page's own "Copy as Markdown" write a free section as three things: its "How to read this" line, its takeaway, and a note that the drawing is on the HTML page. Without this, the default branch (`export/markdown.js` line 99) would copy the whole fragment as a code block, and every page would carry each section twice (the page embeds its Markdown, `render.js` line 153).

**Reply loop.** No change. A free section sits in an ordinary panel, so panel comments cite it as they do today.

**`clarify serve`.** It also watches the files named by `file=`. Today it watches only the draft's folder and ignores every other file name (`serve.js` lines 70–76), so a file in `sections/` would not trigger a reload.

### Part 3: the guard, `clarify check <page.html | draft.md>`

`render` stays fast and never starts a browser. A separate command opens the page in a real browser and checks what the reader sees.

- **The driver.** Promote the Chrome driver `test/visual/cdp.mjs` (no npm packages; it talks to Chrome over a pipe) to `src/`, so the CLI can use it. It must move, because `package.json` "files" does not ship `test/`. Its finder knows Edge only on Windows today (`cdp.mjs` lines 51–67); add the macOS Edge path.
- **Input.** A draft is rendered first, without opening it. A page is checked as it is.
- **Views.** Reduced motion, at 1440 light, 1440 dark, 390 light and 390 dark.
- **What it reports, for every panel** (not only free sections):

| Check | What it means | Status |
| --- | --- | --- |
| overflow | a part sticks out of its panel | proven in the spike |
| small text | text under 10.5px on screen | proven |
| overlap | two texts on top of each other | proven |
| clipped | text cut off by `overflow: hidden` | proven |
| page error | an exception or `console.error` | proven |
| half-empty | the panel's content fills well under its height; suggest another `span` | new |
| low contrast | text too faint on its background | new |

- **Pictures.** One PNG per panel per view, under `~/.clarify/checks/<slug>/` (`<slug>` from `slugify(title)`), so the agent can look at them.
- **Output.** First the picture paths of the panels with a problem, so an agent can read only those. Then lines like `⚠ panel D @390 light: …`, in the same style as render warnings.
- **No browser.** With no Chrome or Edge found, it says so and runs only the static lint (which needs the draft).
- **In the skill.** `SKILL.md` tells the agent: on every page that has a free section, run the check, read the pictures and fix. Which pictures and how many rounds follow the depth rule below.

### Part 4: lessons tied to the content

**The rule** (*owner's requirement*). Every place that is one of the story's main things is an object the reader recognises as that thing. A ready-made kind is used only when it is the thing. `box` stays a kind, for a real box, and is never a stand-in. Today `SKILL.md` (line 154) and `references/syntax.md` (line 139) both call `box` "anything else"; that changes.

**One fallback** (*designer*). Today an unknown kind is drawn as a box, with a warning (`parse.js` line 148). That changes: an unknown kind and a custom object that was not loaded are both drawn as the same neutral placeholder, with a warning. The warning says to pick the kind that is the thing, or draw an object.

**Things with no look of their own** (*designer's reading*). The rule is about things that have a real look: a mouse, a pump. A CLI or a parse step has no look, so it keeps the pictures that "Lessons about code" maps it to (`SKILL.md` line 158).

`SKILL.md` and `references/syntax.md` teach the rule, and the thinking step gets a lesson version:
1. List the story's things.
2. For each one, choose the ready-made kind that is that thing, or draw an object.
3. Decide what data sits on the stage: which value rides on which place (a pill), and which code or record the step talks about (the card).

**Value pills, `note:`**, as spiked. `note: db = seat 7 · left: 1 | s1 = read n = 1` puts a pill above each place. It carries forward to later steps; an empty value removes it; at most 24 characters; `good`, `warn` and `bad` tint it like a counter chip. Guidance: a counter is for a total or a global state; a pill is for what sits at one place. Never show the same value in both.

**The stage card, `card:`**, as spiked, plus a block form for code. The one-line form splits on `|`. In the block form, a `card: Title` line is followed by more-indented lines, kept exactly as written (indentation and `|` included). Either form holds at most 6 lines. `card: none` hides the card.

```text
  card: The key report | key code: 4 | state: down
  card: Book a seat
    n = SELECT left FROM seats
    if n > 0:
      UPDATE seats SET left = n - 1
```

**Layout.** Pills and the card are laid out at build time, where the geometry is known (`stage.js` places every object). The runtime adjusts only on resize and in the narrow layout. So the first paint and the no-JavaScript view are right. At phone width, as spiked: pills that do not fit go to a row under the stage with their place name, and the card becomes a block under the stage.

**Four new ready-made kinds**, from the spike: `mouse`, `keyboard`, `receiver`, and the easel chart renamed `chart` (a general "look it up" object, not only a keyboard layout).

**Custom objects, drawn for one lesson.** The author writes an object file in the same format as the built-in ones and names it in the draft: `places: pump = objects/pump.js "Pump"`.
- The path is relative to the draft. From stdin, the working directory counts as the draft's folder (as for `file=`).
- Loading the file runs its code, so it is opt-in. `clarify render` and `clarify serve` load object files only with the flag `--objects`, only from inside the draft's own folder, and print one line per file loaded. `clarify check` on a draft passes the flag on.
- Without the flag, such a place is drawn as the neutral placeholder, with a warning.
- `SKILL.md` tells the agent to pass `--objects` only for object files it wrote itself in this run.
- Rejected: pre-rendering objects to SVG, so `render` never runs code. It needs a second command in every run. And the stage's projection scale differs per lesson (`stage.js` line 126 fits the bench), so the drawing would have to be rescaled.

**`clarify object <file.js>`.** The preview both object authors had to build by hand (`.tmp/spike-lesson/preview-a.mjs`, `preview-b.mjs`). It draws the object alone and large, in light and dark, and at true size beside a laptop. It saves the PNGs and prints the object's `top`, its reach, and any contract warning: outside ±30 (`REACH`, `stage.js` line 52), or not standing on the pad (z 3). It also warns when the object's drawing is over 80 KB. It uses the browser driver from Part 3.

**The pen grows only by what the spike authors needed:** a curved solid (a mesh or a dome); solids along any axis; text on a face; an accent fill; a thick dark line; and the helpers they had to copy (a convex hull, the camera's sin/cos). New file `references/objects.md` documents the object contract and the pen.

**Depth.** A lesson stays Quick when every main thing in the story has a ready-made kind that is that thing. Then it keeps the earlier promise of about 10 minutes per lesson (`2026-11-18-lesson-block-design.md` line 30). A lesson becomes Designed when it needs a custom object. Custom objects are drawn in parallel by subagents when the host has them. In a Quick run, the agent never uses a stand-in: when an object does not exist, it says so and offers the designed page.

**Budgets, tests, export.**
- The lesson page budget grows by each custom object's own drawing size, not by a flat amount. Drawn sizes vary too much for one number: mouse about 28 KB, receiver 15 KB, keyboard 75 KB, the built-in laptop 71 KB. `clarify object` warns above 80 KB.
- The two tests that failed in the spike are updated on purpose.
- Markdown export: under each step, the pills as a short "On the stage:" line, and the card as a code block.

### Depth and time (confirmed by the owner, 2026-11-20)

Proposed: the agent picks a depth from the request. It tells the user which depth and a rough time. In Quick, the time is the hard rule: everything else gives way to it.

| | **Quick** (the default) | **Designed** |
| --- | --- | --- |
| When | most requests, including "explain how X works"; also a lesson whose main things all have a ready-made kind that is that thing | the user asks for it in words: a course, a designed page or a designed explainer, "make it good", "take your time"; also a lesson that needs a custom object (Stage 2) |
| Time | about 10 minutes | about 20 to 35 minutes |
| The page | blocks chosen and ordered by the thinking step; at most one small free section, and only when it fits the time | as many free sections and custom objects as the content needs, drawn in parallel by subagents when the host has them |
| The check | only when the page has a free section; one run; read the pictures of that section's panel and of every panel with a warning; at most one fix round | read every panel's pictures; at most three rounds |

Amended 2026-11-20 during the build: the depth follows the user's words only, to match the owner's answer 'quick by default, designed when asked'.

When a free section would not fit a Quick run, the agent uses the nearest block instead. In its reply it says which part deserves a drawing, and that the user can ask for the designed page.

## Build order

Two stages. Each has its own implementation plan, and each is usable when done.

| Stage | What | Why in this order |
| --- | --- | --- |
| **1. Pages** | Parts 1 to 3 | the thinking step, free sections and the browser check stand on their own |
| **2. Lessons** | Part 4. Its last item is what used to be "phase 2": object tones at page level and a supported drawing module, so a free section can show an object (the cutaway becomes a real example) | it reuses Stage 1's browser driver, so the agent can look at what it draws |

The spike branch `spike/lesson-content` and both `.tmp/` folders are throwaway. They are not merged. The plans rebuild from them on purpose.

## Deliverables

Stage 1, pages:
1. The rewritten `SKILL.md`: the method, the guarantees, two outlines, the depth rule, the check loop, the wider `description`.
2. `references/forms.md` and `references/free-sections.md`.
3. The `free` block in `render.js`, with its lint.
4. `src/runtime/fx.css`, the kit.
5. The CSP meta tag on pages with a free section.
6. `clarify check`, with the driver moved to `src/`.
7. The Markdown export fallback.
8. `clarify serve` watching `file=` files.
9. Unit tests for each of 3 to 8.
10. A new example, `examples/wireless-mouse.md`, ported from the spike's seven flat sections, **without the lesson**: the black sheep must not ship as an example. The example keeps its sections inline, because `render.test.js` compiles examples without a source path, so a `file=` path would resolve against the working directory.
11. The example size budget in `render.test.js` becomes the current budget (450 KB with a lesson, 164 KB without, plus `FONT_BYTES`) plus 40 KB per free section.
12. The skill test from Part 1: three contents in Quick, before and after, plus one Designed run, with every time recorded.
13. Version 0.3.0.

Stage 2, lessons:
1. The object rule and the lesson thinking step in `SKILL.md` and `references/syntax.md`; the neutral placeholder for an unknown kind, with its new warning.
2. `note:` and `card:` (both card forms) in the parser, the step states and the renderer, laid out at build time, with the phone layout.
3. The four new kinds: `mouse`, `keyboard`, `receiver`, `chart`.
4. Custom objects: the path form in `places:`, `--objects` on `render`, `serve` and `check`, and the placeholder.
5. `clarify object <file.js>`.
6. The pen additions and `references/objects.md`.
7. The Markdown export of pills and the card.
8. Tests: the two spike failures updated on purpose; unit tests for 2 to 7; the lesson budget plus each custom object's drawing size.
9. The lesson added to `examples/wireless-mouse.md`, with the real objects, pills and the card.
10. Last: object tones at page level and a supported drawing module for free sections; the mouse cutaway as a real example.

## Decided by the owner / decided by the designer

| Decision | Decided by |
| --- | --- |
| Approach A: the thinking step, free sections and the guard, together | Owner |
| The look stays (the course look) | Owner |
| Never push without asking | Owner |
| Every main thing in a lesson is an object the reader recognises; `box` is never a stand-in | Owner |
| The block name `free` and its two forms (inline body, `file=`) | Designer |
| A lint that warns, instead of rewriting selectors to scope them automatically | Designer |
| The kit holds only what two or more sections needed | Designer |
| The CSP meta tag on pages with a free section | Designer |
| The guard as a separate command; `render` never starts a browser | Designer |
| The depth rule (quick by default, designed when asked; a lesson is designed only when it needs a custom object) | Designer, confirmed by the owner (2026-11-20) |
| The Markdown export fallback | Designer |
| Widen the `SKILL.md` description to any topic where structure or a picture beats prose (triggers only) | Designer |
| The skill test's three contents, its Designed run and its pass line | Designer |
| Value pills (`note:`), the stage card (`card:`, two forms), laid out at build time | Designer |
| Four new kinds: `mouse`, `keyboard`, `receiver`, `chart` | Designer |
| Custom object files behind `--objects`; pre-rendered SVG rejected | Designer |
| `clarify object`; the pen grows only by what authors needed | Designer |
| One fallback: an unknown kind and an unloaded custom object are the same neutral placeholder | Designer |
| The rule covers things with a real look; a CLI or a parse step keeps the "Lessons about code" mappings | Designer |
| The lesson budget grows by each custom object's size; `clarify object` warns above 80 KB; the lesson export | Designer |
| Two stages, pages first; 3D objects outside lessons as the last item of Stage 2 | Designer, confirmed by the owner (2026-11-20) |

The owner delegated the "how". Each designer decision is open to veto.

## Notes for the plan

Checked facts a plan needs:
- `.tmp/` is git-ignored (`.gitignore` line 3). A fresh worktree will contain neither `.tmp/spike-free/` nor `.tmp/spike-lesson/`. Copy what each stage needs first.
- The spike keeps each section as three files: `sections/<name>.html`, `.css` and `.js`. A `free` fence holds one fragment, so porting a section means merging the three (the CSS into `<style>`, the JS into `<script>`).
- Some spike ids lack the `fx-<name>-` prefix: `fx-km-key-wide` and `fx-km-key-narrow` in `key-matrix` (used by 48 `<use href="#…">`), and four `fxtr-*` ids in `time-ruler` (used by `fill="url(#…)"`). Rename them and every reference, because `render.test.js` demands zero warnings from every example (line 15). The cutaway's `mc-rim-clip` waits for Stage 2.
- `cmdMarkdown` in `bin/clarify.mjs` (lines 86–88) never sets the draft's source path. `file=` sections need it for the export, so set it the way `cmdRender` does (line 73).
- Spike commit 9708f30 adds `note:` and `card:` (`parse.js`, `state.js`, `lesson/render.js`, `lesson.css`, `lesson.js`), with no export, docs or tests. Commit ab0f94e adds the four objects in `src/lesson/objects/` and registers them in `kinds.js` and `objects/index.js`.
- Two tests change on purpose: `lesson-parse.test.js` line 39 (the step shape) and `lesson-stage.test.js` line 46 (the pinned tops).
- `places:` reads the kind as one word (`[\w-]+`, `parse.js` line 40), so `objects/pump.js` does not parse today.
- `compile()` and `renderLesson()` are synchronous (`render.js` line 77, `lesson/render.js` line 43), but loading an object file needs `import()`, which is async. So the CLI loads the object files first and hands them to `compile`.

## Left to the builder

- Where the skill-test contents and results live.
- The exact CSS of the kit.
- How the lint parses CSS (the spike's brace walker in `shot.mjs` is a start).
- The thresholds of the two new checks (half-empty, low contrast).
- What the checks skip inside clarify's own blocks. Some things are small or clipped on purpose: diagram labels are 9.5 to 10px (`svg.css` lines 11, 39, 85), the `Suggested` tag in `ask` is 9.5px (`page.css` line 178), and a diagram canvas clips by design. Either lift them or skip them; run the check on the six existing examples and record the choice.
- The exact export text, for free sections and for lesson pills and cards.
- The exact layout algorithm for pills and the card.
- The names of the pen's new functions.
- The look of the neutral placeholder (for an unknown kind and for a custom object that was not loaded).
- The file layout under `src/`.
- How the driver is shared between the tests and the CLI.

## The owner's answers (2026-11-20)

1. Quick by default, designed when asked: **yes.** For lessons this means about 10 minutes when every main thing has a ready-made kind (the earlier promise), and a designed page when a custom object is needed.
2. Keep the wireless page as an example: **yes.**
3. Pages first, lessons second: **yes.**
