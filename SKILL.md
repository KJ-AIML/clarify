---
name: clarify
argument-hint: "[render | serve | md] <draft.md>"
description: >-
  Renders interactive visual briefs: architecture maps with pan, zoom, brand icons,
  boundaries, an inspector and narrated route tours, step-through lessons on a bench of
  crafted 3D objects, plus decision cards, trade-off tables and a two-way reply loop. Use
  proactively when structure beats prose: system architecture, request flows, sequences,
  multi-option trade-offs, codebase tours, PR or design reviews, or when the user asks to
  "diagram", "draw", "visualize", "clarify" or "compare". Make a lesson when the user asks
  for a "lesson", to "teach", to "explain step by step", for a "course", or to "walk me
  through how X works".
---

# Clarify

You write a Markdown **draft**. The bundled CLI compiles it into one standalone HTML page. Write the draft in the user's language.

## Commands

```bash
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" render - <<'EOF'   # stdin → ~/.clarify/pages/*.html, opens it
...draft...
EOF
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" serve draft.md       # live preview, reloads on every save
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" md draft.md          # GitHub Markdown (diagrams → mermaid)
```

In hosts without `CLAUDE_SKILL_DIR`, use the absolute path of this skill directory.

## Context checklist (a picture without context is not an explanation)

The reader has none of your context. Every page must answer these questions in this order:

1. **The answer first.** `Lead:` states the conclusion or recommendation in 1–3 sentences, not a description of the page.
2. **Why it matters.** A panel that explains the problem or goal in plain language before any diagram.
3. **How to read each diagram.** One bold "How to read this" sentence right above it: what boxes, arrows, dashed lines and zones mean here.
4. **What each component does.** Give every important node a `{ desc: … }`, plus `files:` and one or two facts (`owner:`, `rps:`) when you know them. Hover cards show them instantly, and the inspector shows everything on click.
5. **The main flow, narrated.** A `trace "Name" { … }` block with one sentence per hop, explaining what happens and why. The page plays it as a guided tour.
6. **The takeaway.** A `callout ok Takeaway` directly after each diagram, saying what the reader should conclude from it.
7. **Trade-offs with reasons.** Tables include a *why* or *trade-off* column, not just names and checkmarks.
8. **What happens next.** An `ask` block when a decision is needed, otherwise next steps or risks.

Explanations usually need 4–8 panels. Use 1–3 only for a quick answer to a narrow question.

## Draft skeleton

````markdown
---
title: Checkout Architecture
subtitle: How an order travels from browser to database
eyebrow: Architecture brief
theme: auto        # auto | light | dark | tokyo-night | nord | catppuccin | paper | blueprint
cols: 3
---

Lead: Checkout is synchronous until the DB write and asynchronous after it. Kafka partitions are the scaling risk.

## A Why This Matters {span=3}
Plain-language problem statement: who is affected, what breaks, what we are deciding.

## B System Map {span=3}
**How to read this map:** boxes are services, arrows are calls (dashed = async), zones are network boundaries.

```arch LR
[Web:react] -> [API Gateway:cloudflare]: HTTPS
group "VPC" {
  [API Gateway] -> [Checkout:go]: POST /checkout
  [Checkout] -> [(Orders DB:postgres)]: tx
  [Checkout] --> [Events:kafka]: OrderPlaced
}
[Checkout] { desc: Owns pricing and order creation; files: svc/checkout/; status: warn }
trace "Checkout" {
  Web -> API Gateway: The browser posts the cart over HTTPS.
  API Gateway -> Checkout: The gateway routes the order to checkout.
  Checkout -> Orders DB: Order and payment intent commit in one transaction.
}
```

```callout ok Takeaway
A slow consumer delays emails, never checkouts.
```

## C Trade-offs {span=2}
| Option | Latency | Why / trade-off | Status |
| --- | ---: | --- | --- |
| Postgres | 18ms | Strong consistency, team knows it | ok Chosen |
| DynamoDB | 9ms | Faster, but vendor lock-in | warn Rejected |

## D Decision
```ask
Which failover strategy?
* Multi-region replicas | zero data loss
- Snapshot restore | cheaper, slower
```
````

## Diagram syntax (arch / flow)

- Nodes: `[Box]` `[(Database)]` `{Decision?}` `(Rounded)` `((Circle))`. A `:tech` suffix adds a brand icon (`redis`, `postgres`, `kafka`, `docker`, `k8s`, `go`, `node`, `python`, `react`, `cloudflare`, …).
- Nodes are identified by label. After the first mention, `[Checkout]` is enough.
- Edges: `->` call, `-->` async, `=>` main flow, `<->` two-way, `--` plain. `: label` labels the edge. Keep labels to 4 words or fewer.
- `group "Name" { … }` draws a boundary (nestable). A node joins the group where it is first mentioned, so put a shared hub (database, store, event bus) in its own group or outside every group, never inside one path's group. `[Node] { desc: …; files: …; owner: …; status: ok|warn|no }` adds inspector details.
- `trace "Name" { A -> B: narration … }` is a narrated route. A line with only `[Node]: text` is a stop without movement. `trace "Name": A -> B -> C` is the short form, without narration.
- Raw Mermaid also works: a ```` ```mermaid ```` fence, or `flowchart`/`sequenceDiagram` inside `arch`.

Other blocks: ```` ```sequence ```` (Mermaid sequence syntax), ```` ```callout ok|warn|err|info Title ````, ```` ```ask ```` (`*` = suggested option, `-` = option, `[ ]`/`[x]` = multi-select), ```` ```kv ````, ```` ```tree ````, tables with `ok`/`warn`/`no` status cells, and ordinary Markdown. Full reference: `references/syntax.md`.

## Lessons

Use a ```` ```lesson ```` block to teach **how something moves between places over time**: a change through Git, a request through a network, a job through a pipeline. The page draws one machine of crafted 3D objects, and each step moves pucks along its rails, lights up places and changes counters, beside a guide with Back and Next. When the reader only needs to follow one path through a map, a `trace` route tour is enough.

**Story shape:** 6–12 steps, then one quiz. A `[problem]` step in plain words, `[how]` steps that add one idea each, a `[why]` step, one or two `[case]` steps that show what goes wrong, and a `[recap]` step.

**Writing rules:**
- Plain words first, then the term: "a waiting tray for your next snapshot, the ==staging area==".
- One idea per step: a title of at most 32 characters, one or two paragraphs (a blank line between them) of at most 45 words each, and one `tip`.
- Every step changes the machine: it moves a puck, focuses or fails a place, or sets a counter.
- Show a failure and its fix: a `fail` puck, `fail:` on the place, `cut:` on the rail, and the fix in the text.
- End with a `[recap]` step (takeaways as `- ` lines) and one `quiz`: one right answer marked `*`, and a reason after `|` on every option.

A lesson page needs only a `Lead:`, a short panel on why the topic matters, and the lesson in its own panel. The skeleton shows two steps of a full lesson. `step` and `quiz` lines start at column 0; indent the lines under them.

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
  The worker takes the job and looks up your address, but the mail server does not answer. The job goes back in the queue to try again later.
  move: queue -> worker, worker <-> db, worker -> mail fail
  fail: mail
  cut: worker - mail
  set: Sent = failed bad

quiz Why does the app queue the email?
  * To answer you at once | the slow sending happens later
  - To send it faster | a queue adds a wait; it does not speed up sending
```
````

- **Objects** (`id = kind "Label"`, at most 7 places): `laptop`, `phone`, `monitor` (a browser), `server`, `database`, `cabinet` (history, an archive), `tray` (staging, pending work), `queue`, `cache`, `gate` (auth, a firewall), `router` (a gateway, DNS, a load balancer), `mailbox` (email, notifications), `folder` (files), `cloud` (a provider, a datacenter), `box` (anything else).
- **Pucks:** `change` (orange, the default), `reply` (green), `fail` (red, stops short), `store` (violet), `slow` (amber). `a <-> b` sends a green `reply` back.
- **Layout** is automatic: places follow the first rail chain in a zigzag, and a place on a later chain (`| worker - db`) stands next to the place it joins. A rail runs straight along a row or column of the grid, so a place can have at most 4 rails (one per side), and a rail that closes a loop usually warns `can't be drawn straight`. Prefer one main chain plus short branches; `at=x,y` pins a place to a cell.
- **Counters:** `set: Label = value level | Label = value`. The level word (`good`, `warn`, `bad` or `none`) is optional and goes after the value; it colours the chip and is never shown, so never use one of those words as a value or as its last word (`Status = all good` shows `all`).
- **Lessons about code:** places are the modules, files or services a request passes through: `router` for a CLI, an entry point or a gateway, `server` for a service, `database` for a store, `queue` for a queue, `tray` for a parse or staging step, `folder` for files, `monitor` for the output page. Rails are the calls along the main path. Pucks are what moves: `change` the data or request, `reply` what a call returns, `store` output being written, `fail` an error or a rejection, `slow` a warning or a slow path.

Full syntax and every warning with its fix: the Lessons section of `references/syntax.md`.

## Rules

1. Render with the CLI as the primary action. Do not paste the draft or the HTML into chat.
2. If the CLI prints `⚠` warnings, they cite draft line numbers. Fix the draft and re-render.
3. After `✓ <path>`, reply with a 2–3 line summary and the link `[file:///abs/path.html](file:///abs/path.html)`.
4. When the user pastes a reply starting with `# Re: <title>`, apply its decisions and review comments. `(line N)` points into the draft.
5. Keep each diagram to 25 nodes or fewer. Split larger systems into an overview map plus detail maps.
