---
name: clarify
argument-hint: "[render | serve | md] <draft.md>"
description: >-
  Renders interactive visual briefs: architecture maps with pan, zoom, brand icons,
  boundaries, an inspector and narrated route tours, plus decision cards, trade-off tables
  and a two-way reply loop. Use proactively when structure beats prose: system
  architecture, request flows, sequences, multi-option trade-offs, codebase tours, PR or
  design reviews, or when the user asks to "diagram", "draw", "visualize", "clarify" or "compare".
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
- `group "Name" { … }` draws a boundary (nestable). `[Node] { desc: …; files: …; owner: …; status: ok|warn|no }` adds inspector details.
- `trace "Name" { A -> B: narration … }` is a narrated route. A line with only `[Node]: text` is a stop without movement. `trace "Name": A -> B -> C` is the short form, without narration.
- Raw Mermaid also works: a ```` ```mermaid ```` fence, or `flowchart`/`sequenceDiagram` inside `arch`.

Other blocks: ```` ```sequence ```` (Mermaid sequence syntax), ```` ```callout ok|warn|err|info Title ````, ```` ```ask ```` (`*` = suggested option, `-` = option, `[ ]`/`[x]` = multi-select), ```` ```kv ````, ```` ```tree ````, tables with `ok`/`warn`/`no` status cells, and ordinary Markdown. Full reference: `references/syntax.md`.

## Rules

1. Render with the CLI as the primary action. Do not paste the draft or the HTML into chat.
2. If the CLI prints `⚠` warnings, they cite draft line numbers. Fix the draft and re-render.
3. After `✓ <path>`, reply with a 2–3 line summary and the link `[file:///abs/path.html](file:///abs/path.html)`.
4. When the user pastes a reply starting with `# Re: <title>`, apply its decisions and review comments. `(line N)` points into the draft.
5. Keep each diagram to 25 nodes or fewer. Split larger systems into an overview map plus detail maps.
