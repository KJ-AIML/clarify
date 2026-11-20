# Skill test: content-driven pages

Local paths are shortened to `<repo>`; the runs used the full path.

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
Use the clarify skill to give a new contributor a tour of the clarify codebase at <repo>.
```

`device-designed` (the Designed run, after the change only)

```text
Make it good: use the clarify skill to make a designed explainer of how an electric kettle boils water and switches itself off.
```

## The agent prompt

Fill in `<phase>` (`before` or `after`), `<brief>` (one brief above) and `<id>` (`device`, `postmortem`, `tour` or `device-designed`).

```text
The clarify skill is at <repo>. Read its SKILL.md and do what it says. Run its CLI as: node <repo>/bin/clarify.mjs
Task: <brief>
Save your draft as <repo>/.tmp/skill-test/<phase>/<id>.md and render it with --out <repo>/.tmp/skill-test/<phase>/<id>.html --no-open. Do not change any other file in that repo.
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
| device | after (new SKILL.md, commit c7a44a5) | 2026-11-19T20:22:03Z | 2026-11-19T20:27:56Z | 5.9 | 2 | 0 | agent ran it once (6 problems; fixed the half-empty panel H and a wrong how-to-read line). Controller's check afterwards: 4 lines, all from clarify's own blocks (the 3px overflow of the full-row map at 390, twice; the route play glyph at 4.44:1, twice). Passes with those discounted. Checked again after commit c701277 (the three skips for clarify's own blocks): no problems, 8 panels x 4 views. | A Why this matters: text; B In numbers: kv; C Inside the kettle: free: the kettle cut open, with numbered parts and the steam path; D How it knows to stop: arch map (LR, with routes), callout; E The disc that snaps: table, callout; F From cold to click: table, callout; G When something goes wrong: table, callout; H What to do next: list | .tmp/skill-test/after/device.png |
| postmortem | after (new SKILL.md, commit c7a44a5) | 2026-11-19T20:22:03Z | 2026-11-19T20:25:43Z | 3.7 | 2 | 0 | agent ran it once (8 problems in block panels A and F: a badge 56px out of its panel, two half-empty panels; fixed). Controller's check afterwards: no problems, 6 panels x 4 views. | A Why it matters: text, kv, callout; B What happened, and when: free: an incident timeline (a bar of the whole wait in three stretches, a legend, then the timed events down the page); C The failing path: arch map (LR, with a route), callout; D The cause: text, list, callout; E Fixes compared: table, callout; F What we decide: kv, ask | .tmp/skill-test/after/postmortem.png |
| tour (attempt 1) | after (new SKILL.md, commit c7a44a5) | 2026-11-19T20:22:03Z | 2026-11-19T20:24:05Z | 2.0 | 1 | 0 | agent did not run it (a Quick page with no free section). Controller's check: panel A half-empty at 1440 (30% of its height), a real fault; plus two kinds from clarify's own blocks (the 3px overflow at 390; inline code in a table at 9.7px). MISS on the guard. | A Why this matters to you: text; B What is in the repo: tree; C How a draft becomes a page: arch map (LR, with a route), callout; D One fence, one engine: table, text; E The five commands: kv, text; F Inside clarify check: sequence, text; G Rules the code keeps: table; H Where to change things: kv, callout; I Your first hour: numbered list, ask | .tmp/skill-test/after/tour-attempt1.png |
| tour (attempt 2) | after (new SKILL.md, commit cf59044: Quick checks every page once) | 2026-11-19T20:56:20Z | 2026-11-19T20:59:53Z | 3.6 | 1 | 0 | agent ran it once: no problems, 10 panels x 4 views. Controller's check afterwards: no problems. | A Why read this first: text, callout; B What is in the repo: tree; C How a draft becomes a page: arch map (LR, with a route), callout; D Inside the three fence engines: table, text; E The five commands: table, text; F Which module do I open?: kv; G Rules the code keeps: table; H Running the tests: kv, callout; I Your first change: numbered list; J Your call: ask | .tmp/skill-test/after/tour.png |
| device-designed | after (new SKILL.md, commit c7a44a5), Designed | 2026-11-19T20:28:22Z | 2026-11-19T20:44:45Z | 16.4 | 2, plus 3 check runs | 0 | agent read every panel's pictures over two rounds; last run: no problems, 10 panels x 4 views. Controller's check afterwards: no problems. | A Why this matters: text; B Inside the kettle: free: the kettle cut open, with numbered parts and a parts list; C In numbers: free: big numbers (power, current, time) with a line each; D The disc that snaps: free: the switch drawn twice, cold and hit by steam, then what happens in order; E From cold water to click: free: a heating curve with six sound stages you can press; F Heat it, or boil it away: free: energy bars for the same litre, heating against turning it all to steam; G Two switches, two jobs: free: a grid read across, one question asked of the steam switch and the boil-dry cutout; H When something goes wrong: free: the path of one boil with each problem pinned where it starts; I Boil what you need: free: energy and time bars for each amount of water; J What to do next: list, callout. 8 free sections; three subagents drew the three heaviest in parallel | .tmp/skill-test/after/device-designed.png |

### What the three before pages have in common

All three use the same blocks (text, kv, table, arch map, callout; the tour adds a tree and a sequence, the post-mortem an ask) in the same order: a prose panel A (two are titled "Why This Matters"), a small kv or tree panel, the diagrams, then tables, and a last panel of next steps. Every one of the six diagrams opens with a "How to read this" line and is followed by a "Takeaway" callout. The post-mortem's incident timeline is a plain table, the same form as the device page's minute-by-minute panel.

## After runs: what happened

1. All three agents chose Quick and wrote a plan before the draft.
2. The kettle page now has one drawn section: the kettle cut open, with numbered parts and the steam path. The post-mortem opens its story with a drawn incident timeline. The tour uses blocks only: a tree, a module map with a route, a sequence diagram and tables.
3. Times, before to after: the kettle took 2.8 minutes before and 5.9 after, 2.1 times as long. The post-mortem took 3.9 before and 3.7 after, 0.9 times. The tour took 3.0 before and 2.0 after, 0.7 times. The kettle run is over 1.5 times its before run but under 8 minutes, so by the dated note it is reported to the owner, not counted as a miss.
4. In the two runs that ran `check`, it found real faults in ordinary block panels (a badge sticking out of its panel, half-empty panels), not only in the drawn section.
5. The tour missed the guard because a Quick page with no free section was never checked. Two commits fixed that: c701277 (`check` skips three things that come from clarify's own blocks) and cf59044 (in Quick, `check` runs once on every page). The tour was then run again with a fresh agent, as attempt 2 on its own row. It passed in 3.6 minutes with a clean check.
6. One limit of this test: `SKILL.md` shows an outline for a device explainer and for a bug post-mortem, so those two runs had a pattern to follow. The tour had none.

## Result against the pass line

- Visibly different shapes: the builder's judgment is yes. The kettle page is led by a cut-open drawing, the post-mortem by a drawn timeline, and the tour by a folder tree, a module map and tables. The owner has the last word. The pictures to compare are the three before PNGs in `.tmp/skill-test/before/` and the after PNGs `device.png`, `postmortem.png` and `tour.png` in `.tmp/skill-test/after/`, plus `device-designed.png`.
- No warnings and the guard: all three pass after the fix. The tour needed a second attempt.
- Time: the three Quick runs took 5.9, 3.7 and 3.6 minutes. All are under 12 minutes. The kettle run is 2.1 times its before run and under 8 minutes, so it is reported to the owner, not counted as a miss.
- The Designed run took 16.4 minutes. It has no limit.
- Two facts on the designed page are the agent's own and were not checked against a source: that the first kettle to switch itself off was the Russell Hobbs K1 in 1955, and its timings, which are textbook figures.
- The limit stated in point 6 still holds: the device and post-mortem runs had an outline in `SKILL.md` to follow, and the tour had none.
