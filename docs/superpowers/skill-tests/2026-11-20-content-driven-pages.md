# Skill test: content-driven pages

This tests the change to `SKILL.md` described in `docs/superpowers/specs/2026-11-19-content-driven-pages-design.md` ("How we test the skill change"). Fresh agents get the same three contents. Each content runs in Quick, once with today's `SKILL.md` (before) and once with the new one (after). Every run is timed. One extra Designed run of the device content is timed and reported.

The briefs and the agent prompt below are used word for word in every run, before and after.

## The briefs

Each brief is the text of one code block. The id is the `<id>` in the agent prompt.

`device`

```text
Use the clarify skill to explain how an electric kettle boils water and switches itself off.
```

`postmortem` (the brief is the first line plus the incident text under it; the incident was written once and is reused for every run)

```text
Use the clarify skill to write up this incident as a post-mortem page:

Northfield Goods, an online shop: orders stuck at "paid, not shipped". All times are UTC, on 14 October.

What happened: a deploy changed the queue consumer that turns a paid order into a shipping label. It then skipped every message, and 412 paid orders sat at "paid, not shipped". The first was paid at 09:12 and shipped at 12:05, a wait of 2 hours 53 minutes. No payment was lost.

Timeline:
- 09:10 Version 3.8.0 deploys. It changes the queue consumer to read the field orderId.
- 09:40 First support ticket: "I paid but my order has not shipped."
- 10:25 Support has 31 tickets and pages the on-call engineer.
- 10:35 The engineer sees the label queue growing, with nothing consumed since the deploy.
- 11:05 Cause found: the sender still writes the field as order_id. The consumer finds no orderId and skips the message without an error.
- 11:20 Mitigated: roll back to version 3.7.9. The queue starts to drain.
- 12:05 The queue is empty. All 412 orders are shipped.
- 15:30 Fixed: version 3.8.1 deploys with fix A below.

Cause: the consumer changed, the sender did not, and nothing checked that they agreed.

Two fixes:
- A (shipped): the consumer accepts both orderId and order_id. It is small and safe to ship today. But a later mismatch would again skip messages in silence.
- B (proposed): check every message, send a bad one to a dead-letter queue, and page us when the oldest message is over 10 minutes old. It would have paged us at about 09:22, not 10:25. But it takes two days to build.

Open decision: do we hold the next release, planned for 21 October, until B is done? Support says yes. The team lead has not decided.
```

`tour`

```text
Use the clarify skill to give a new contributor a tour of the clarify codebase at C:\Users\KongphopJamreansuk\Documents\clarify.
```

`device-designed` (the Designed run, after the change only)

```text
Make it good: use the clarify skill to make a designed explainer of how an electric kettle boils water and switches itself off.
```

## The agent prompt

Fill in `<phase>` (`before` or `after`), `<brief>` (one brief above) and `<id>` (`device`, `postmortem`, `tour` or `device-designed`).

```text
The clarify skill is at C:\Users\KongphopJamreansuk\Documents\clarify. Read its SKILL.md and do what it says. Run its CLI as: node C:/Users/KongphopJamreansuk/Documents/clarify/bin/clarify.mjs
Task: <brief>
Save your draft as C:/Users/KongphopJamreansuk/Documents/clarify/.tmp/skill-test/<phase>/<id>.md and render it with --out C:/Users/KongphopJamreansuk/Documents/clarify/.tmp/skill-test/<phase>/<id>.html --no-open. Do not change any other file in that repo.
Run `date -u +%FT%TZ` as your very first and your very last command. Report both times, how many times you rendered, and the output of your last render.
```

## The pass line

The change passes when all of these hold:
- The three new pages have visibly different shapes. The builder judges from screenshots and shows them to the owner. The owner has the last word.
- Each new page renders with no warnings and passes the guard (`clarify check`).
- No new Quick run takes more than 12 minutes.
- No new Quick run is much slower than its old run. Much slower means more than 1.5 times the before time.

The Designed run of the device content is only timed and reported. It has no limit.

Note (2026-11-20, set by the controller after the before runs and before any after run): the before runs took 2.8 to 3.9 minutes, so 1.5 times is only 4.2 to 5.8 minutes, far inside the owner's 10-minute rule. A new Quick run over 1.5 times its old run counts as a miss only when it also takes more than 8 minutes. Otherwise it is reported to the owner with both times, and the owner has the last word. The 12-minute cap is unchanged.

## Results

One row per run. `minutes` is end minus start. `shape` lists the panel titles in order, each with its block or form. `picture` is the screenshot made by `node .tmp/skill-test/shot.mjs <page.html> <out.png>`.

| content | skill | start (UTC) | end (UTC) | minutes | renders | warnings | check | shape (panel titles in order, with each one's block or form) | picture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| device | before (today's SKILL.md, main at 0fc0f41) | 2026-11-19T17:40:23Z | 2026-11-19T17:43:09Z | 2.8 | 1 | 0 | not run (no `clarify check` yet) | A Why This Matters: text, kv; B The Parts and the Path: arch map (LR, with routes), callout; C The Snap That Switches It Off: arch map (TD, reads as a flowchart), callout; D The Bimetal Disc: kv; E Minute by Minute: text, table, callout; F When Things Go Wrong: text, table, callout; G If Your Kettle Misbehaves: callout | .tmp/skill-test/before/device.png |
| postmortem | before (today's SKILL.md, main at 0fc0f41) | 2026-11-19T17:40:23Z | 2026-11-19T17:44:16Z | 3.9 | 2 | 0 | not run (no `clarify check` yet) | A Why This Matters: text; B Impact: kv; C How Orders Got Stuck: arch map (LR, with routes), callout; D Timeline: table; E Where the Time Went: kv, callout; F Root Cause: text, table, callout; G Two Fixes: table, callout; H Open Decision: ask | .tmp/skill-test/before/postmortem.png |
| tour | before (today's SKILL.md, main at 0fc0f41) | 2026-11-19T17:40:23Z | 2026-11-19T17:43:24Z | 3.0 | 1 | 0 | not run (no `clarify check` yet) | A Why This Codebase Exists: text, list; B Repo at a Glance: text, tree; C The Compile Pipeline: arch map (LR, with routes), callout; D Inside the Lesson Engine: arch map (LR, with routes), callout; E The Reply Loop: sequence, callout; F Design Rules You Must Keep: table, callout; G Where to Make Your First Change: table; H Your First Hour: numbered list, 2 callouts | .tmp/skill-test/before/tour.png |


### What the three before pages have in common

All three use the same blocks (text, kv, table, arch map, callout; the tour adds a tree and a sequence, the post-mortem an ask) in the same order: a prose panel A (two are titled "Why This Matters"), a small kv or tree panel, the diagrams, then tables, and a last panel of next steps. Every one of the six diagrams opens with a "How to read this" line and is followed by a "Takeaway" callout. The post-mortem's incident timeline is a plain table, the same form as the device page's minute-by-minute panel.
