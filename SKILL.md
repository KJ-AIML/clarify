---
name: clarify
argument-hint: "[render | serve | md | check] <draft.md>"
description: >-
  Use when structure or a picture would explain something better than prose, even if the user
  did not ask for a page: how a device, a process or a system works; what is inside a thing; a
  timeline, an incident or a post-mortem; a comparison, a trade-off or a choice; system
  architecture, request flows and sequences; a codebase tour; a PR or design review; a decision
  the user has to make. Use when the user asks to "diagram", "draw", "visualize", "clarify" or
  "compare", or asks for a "lesson", to "teach", to "explain step by step", for a "course", or
  to "walk me through how X works".
---

# Clarify

You write a Markdown **draft**. The bundled CLI compiles it into one standalone HTML page. Write the draft in the user's language.

## Commands

```bash
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" render - <<'EOF'   # stdin → ~/.clarify/pages/*.html, opens it
...draft...
EOF
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" render draft.md      # a draft file (--out page.html, --no-open)
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" check draft.md       # every panel in Chrome or Edge, with pictures
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" serve draft.md       # live preview, reloads on every save
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" md draft.md          # GitHub Markdown (diagrams → mermaid)
```

In hosts without `CLAUDE_SKILL_DIR`, use the absolute path of this skill directory. Save a page with a free section as a draft file: `check` reads it, and `file=` paths start from its folder. A page rendered from stdin has no draft file, so run `check` on the `.html` path that `render` printed: a draft file gets the lint and the browser check, a rendered page is checked as it is, without the lint.

## Depth and time

Pick the depth from the request. Before you start, tell the user which depth and a rough time, in one line ("A quick page, about 10 minutes.").

| | **Quick** (the default) | **Designed** |
| --- | --- | --- |
| When | most requests, including "explain how X works" | the user asks for it in words: a course, a designed page or a designed explainer, "make it good", "take your time" |
| Time | about 10 minutes | about 20 to 35 minutes |
| The page | blocks, chosen and ordered by the steps below; at most one small free section, when it fits the time | as many free sections as the content needs, drawn in parallel by subagents when the host has them |
| The check | on every page: one run, one fix round | every panel's pictures, up to three rounds |

In Quick, the time is the hard rule: everything else gives way to it. A part that deserves a drawing that does not fit the time gets the nearest block; your reply names that part and offers the designed page.

## Think before you draw

A page is its content's parts, each shown in the form that fits it, in the order a reader needs. Its shape comes from the content, so two contents give two shapes. Six steps:

1. **Gather.** Write the facts down first, as a short list: names, numbers, causes, times. Only these facts go on the page.
2. **Split.** Cut the content into its parts. Each part becomes a panel, titled with what it is ("Inside the keyboard", "What happened, and when").
3. **Name the kind.** Say in a few words what kind of thing each part is. Kinds to think with: a thing with parts; a hidden mechanism; something moving between places over time; a length of time; events in order; a choice between two; a shared space; a lookup; a structure; a failure and its fix; a number that matters; a decision for the reader. This list is a prompt for thinking, not a menu: a part may be a kind nobody listed.
4. **Choose the form.** Use a block when it truly shows that kind: `arch` for a structure (with a `trace` for the path that matters), `sequence` for messages between parts, `isokit` (preferred) or `lesson` for something moving between places over time (see Lessons), `tree` for nesting, a table for rows that share columns, `kv` for named values, `ask` for a decision. Otherwise draw a free section, within the depth's limit. When the content needs a form nobody listed, draw it. Worked forms, each with when it fits and its nearest block: `references/forms.md`.
5. **Order as a story.** The answer first (`Lead:`). The whole before its parts. What to do next comes last. In between, follow the content's own order: the clock, the path, the steps.
6. **Check.** Render and fix every `⚠`. Then run `check` once on every page and read its pictures, as the depth says ("The check loop", under Free sections).

Steps 1 to 5 give a plan: one line per part, `part: kind → form`, in page order. Write it before the draft; the draft follows it.

## What every page guarantees

These are outcomes, met where they fit the content, not panels in a fixed order:
- The answer comes first: `Lead:` states the conclusion in 1–3 sentences.
- The page says why it matters to the reader.
- Every drawing says how to read it and ends with a takeaway: a bold line before a block and a sentence or a `callout ok` after it; `.fx-how` and `.fx-take` in a free section.
- Trade-offs carry reasons: a table of options has a *why* column.
- The reader knows what happens next: an `ask` for a decision, or the next steps.

## Two page shapes

Two pages made with these steps. Their contents differ, so their shapes differ; yours follows its own parts.

**A device explainer**: how a wireless mouse and keyboard work. This is `examples/wireless-mouse.md`, panel for panel.

| Panel | Kind | Form |
| --- | --- | --- |
| `Lead:` neither device draws on screen; each sends a few bytes by radio | the answer | lead |
| Why this matters | why it matters | text |
| In numbers | numbers that matter | free: big numbers |
| Inside the keyboard · A position, not a letter | a hidden mechanism · a lookup | free: a grid you press · a table that flips |
| The crowded air | a shared space | free: a map of the band |
| Receiver or Bluetooth? | a choice between two | free: two columns, the same rows |
| One key press, in milliseconds | a length of time | free: a ruler |
| When something goes wrong | a failure and its fix | free: problems pinned on the path |

**A bug post-mortem**:

| Panel | Kind | Form |
| --- | --- | --- |
| `Lead:` what broke, the fix, are we safe now | the answer | lead |
| What happened, and when | events in order | free: an incident timeline |
| The failing path | a structure, and one path through it | `arch` + `trace` |
| The cause | a failure and its cause | text |
| Fixes compared | a choice | table with a *why* column |
| What we decide | a decision for the reader | `ask` |

The explainer goes from the whole to its parts; the post-mortem follows the clock.

## Draft basics

````markdown
---
title: How a Wireless Mouse Works   # also: subtitle, eyebrow (the label above the title), date
theme: auto                         # auto | light | dark | tokyo-night | nord | catppuccin | paper | blueprint
cols: 3                             # grid columns on a wide screen, 1–4
---
Lead: The answer, in 1–3 sentences.

## C Inside the keyboard {span=2}
Text and blocks for this part.
````

`## A Title {span=N}`: the letter names the panel in replies; `span` is how many columns it takes. Panels in one row are drawn equally tall, so put parts of similar length side by side, or give a long one the whole row.

## Diagram syntax (arch / flow)

- Nodes: `[Box]` `[(Database)]` `{Decision?}` `(Rounded)` `((Circle))`. A `:tech` suffix adds a brand icon (`redis`, `postgres`, `kafka`, `docker`, `k8s`, `go`, `node`, `python`, `react`, `cloudflare`, …).
- Nodes are identified by label. After the first mention, `[Checkout]` is enough.
- Edges: `->` call, `-->` async, `=>` main flow, `<->` two-way, `--` plain. `: label` labels the edge. Keep labels to 4 words or fewer.
- `group "Name" { … }` draws a boundary (nestable). A node joins the group where it is first mentioned, so put a shared hub (database, store, event bus) in its own group or outside every group, never inside one path's group. `[Node] { desc: …; files: …; owner: …; status: ok|warn|no }` adds inspector details.
- `trace "Name" { A -> B: narration … }` is a narrated route. A line with only `[Node]: text` is a stop without movement. `trace "Name": A -> B -> C` is the short form, without narration.
- Raw Mermaid also works: a ```` ```mermaid ```` fence, or `flowchart`/`sequenceDiagram` inside `arch`.

Other blocks: ```` ```sequence ```` (Mermaid sequence syntax), ```` ```callout ok|warn|err|info Title ````, ```` ```ask ```` (`*` = suggested option, `-` = option, `[ ]`/`[x]` = multi-select), ```` ```kv ````, ```` ```tree ````, ```` ```free ```` (a section you draw, below), tables with `ok`/`warn`/`no` status cells, and ordinary Markdown. Full reference: `references/syntax.md`.

## Free sections

A **free section** is a part you draw by hand when no block shows it: an HTML fragment with SVG, its own `<style>` and, when it needs one, a `<script>` (`root` is the section). It sits in an ordinary panel and uses the page's tokens and kit, so it looks like the page. A page with one loads nothing from the network. Read `references/free-sections.md` before you draw one: its rules, the kit, the panel widths and every warning with its fix.

````markdown
## D A position, not a letter
```free key-code
<p class="fx-how"><b>How to read this:</b> …</p>
<svg viewBox="0 0 320 120" role="img" aria-label="…">…</svg>
<p class="fx-take">…</p>
<style>.fx-key-code .row { … }</style>
```

## E Inside the mouse {span=3}
```free mouse-parts file=sections/mouse-parts.html
```
````

The name: lowercase letters, digits and dashes, once per page. `file=` reads the fragment from a file; the path starts from the draft's folder (from stdin, the working directory).

**The check loop** (on every page, not only one with a free section). `check` opens the page at 1440px and 390px, light and dark, checks every panel and saves one picture per panel and view. A check takes about 15 seconds. It prints the pictures of the panels with a problem first, then one `⚠ panel D @390 light: …` line per problem.
- Quick: run it once on every page. Read the pictures of every panel with a `⚠`, and of the free section's panel when the page has one. Fix in one round, then render again.
- Designed: read every panel's pictures. Up to three rounds of fix and check.

## Lessons (powered by isokit)

Use an ```` ```isokit ```` block (**preferred**) or the compact ```` ```lesson ```` Markdown shorthand to teach **how something moves between places over time**: a request through a system, a change through Git, a job through a pipeline, a failure and its fix. Both render on the live animated **isokit** isometric stage (`IsoDiagram.Stage`) with smooth drop-in/exit transitions, dynamic camera framing, pan/zoom gestures, animated traffic packets, count-up metrics, and a synced guide with Back/Next, timeline, goals, and optional quiz. When the reader only needs to follow one path through a map, a `trace` route tour is enough.

### Preferred: Native ```` ```isokit ```` (JSON)
Prefer ```` ```isokit ```` whenever the story benefits from rich isometric primitives (`block`, `db` with tank fill, `device`, `crowd`, `zone`, `queue`, docked `panel` with `bars`/`hockey` charts, `note`, `ring`, `ghost`), elbow links with labels, CPU/load meters, tags, heat/failure states, `changes` lists, and 127 Lucide icons. Full spec, placement rules, and copy-paste example: `references/isokit.md`.

**Story & placement essentials:**
- **4–10 steps**, one change per step, ending with `recap` and an optional `quiz`.
- **Keep entity ids stable** across steps so entities glide and morph; new ids drop in with a floor spotlight; removed ids sink away.
- **Space size-4 blocks ≥ 7–10 units apart** centre-to-centre, keep total scene width under ~28 units, and use `"pills": "below"` on front-edge blocks so pills never cover blocks behind them.
- Clarify validates `isokit` JSON at compile time (types, icons, overlaps, spacing, zone-label crossings, route hops). Fix every `⚠` warning, then run `clarify check`.

### Shorthand option: Markdown ```` ```lesson ````
For quick linear step-throughs without coordinates, Clarify's Markdown `lesson` syntax still compiles directly onto the isokit stage:

````markdown
```lesson How a Background Job Runs
subtitle: Follow one welcome email from the sign-up form to the mail server.
meta: 6 min · Beginner
places: app = server "Web app" | queue = queue "Job queue" | worker = server "Worker" | mail = mailbox "Mail server" | db = database "Users"
rails: app - queue - worker - mail | worker - db
counters: Account | Waiting | Sent
pucks: change = job | reply = address | fail = no answer
goals: Why the app hands work off @1 | What happens when sending fails @2

step Hand off: The app queues the job [how]
  You sign up. The app saves a ==job== to send your welcome email, and answers you at once.
  tip Key idea: Slow work waits in a queue, so nobody waits for it.
  move: app -> queue
  focus: queue
  set: Account = created good | Waiting = 1 job warn

step Down: The mail server is down [case]
  The worker takes the job and looks up your address, but the mail server does not answer.
  move: queue -> worker, worker <-> db, worker -> mail fail
  fail: mail
  cut: worker - mail
  set: Sent = failed bad

quiz Why does the app queue the email?
  * To answer you at once | the slow sending happens later
  - To send it faster | a queue adds a wait; it does not speed up sending
```
````

- **Objects** (`id = kind "Label"`, at most 7 places): `laptop`, `phone`, `monitor`, `server`, `database`, `cabinet`, `tray`, `queue`, `cache`, `gate`, `router`, `mailbox`, `folder`, `cloud`, `box` (a real box, never a stand-in: a thing with no kind of its own gets a free section).
- **Pucks:** `change` (orange), `reply` (green), `fail` (red), `store` (violet), `slow` (amber). `a <-> b` bounces a green reply back.
- Full Markdown lesson syntax: `references/syntax.md`. Full native isokit spec: `references/isokit.md`.

## Rules

1. Render with the CLI as the primary action. Do not paste the draft or the HTML into chat.
2. If the CLI prints `⚠` warnings, they cite draft line numbers. Fix the draft and re-render. Then run `node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" check` on every page and work through it as "Free sections" says.
3. After `✓ <path>`, reply with a 2–3 line summary and the link `[file:///abs/path.html](file:///abs/path.html)`.
4. When the user pastes a reply starting with `# Re: <title>`, apply its decisions and review comments. `(line N)` points into the draft.
5. Keep each diagram to 25 nodes or fewer. Split larger systems into an overview map plus detail maps.
