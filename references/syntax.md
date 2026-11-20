# Clarify draft syntax reference

Load this file only when you need a construct beyond what `SKILL.md` shows.

## Frontmatter

| Key | Values | Default |
| --- | --- | --- |
| `title` | text (inline Markdown allowed) | `Clarify Board` |
| `subtitle` | text | — |
| `eyebrow` | small label above the title, e.g. `Architecture brief`, `PR review`, `Incident` | `Clarify brief` |
| `date` | free text appended to the eyebrow | — |
| `theme` | `auto` · `light` · `dark` · `tokyo-night` · `nord` · `catppuccin` · `paper` · `blueprint` (`modern` = `auto`) | `auto` |
| `layout` | `hybrid` (grid) · `sheet` (grid) · `canvas` (every panel full width) | `hybrid` |
| `cols` | 1–4 | 3 |

Other keys are kept in `meta` and ignored by the renderer.

## Panels

`## [Letter] Title {span=N}`. The letter is optional (auto-assigned A, B, …). `span` is clamped to `cols`, and `span=full` spans the row. A panel may mix any number of blocks. Content with no `##` heading becomes one full-width "Overview" panel.

Layout behavior: a wide diagram (aspect > 2.2, wider than 1100px) claims the full row. When a row leaves columns empty, the card with a table or diagram widens to fill it. Below 960px wide, everything stacks.

## `arch` / `flow` diagrams

The fence info sets direction: `arch LR` (default) or `arch TD`.

| Construct | Example |
| --- | --- |
| Box / rounded / database / decision / circle | `[API]` `(Job)` `[(DB)]` `{Valid?}` `((Start))` |
| Tech icon | `[Cache:redis]`, `[(Orders:postgres)]`. A spaced colon (`[Store: redis]`) tags only when the word is a known brand |
| Edge styles | `->` solid · `-->` dashed · `=>` thick · `<->` / `<-->` / `<=>` both · `--` / `---` no arrow · `<-` reversed |
| Label | `[A] -> [B]: POST /orders` (labels may contain `->` and `:`) |
| Chain | `[A] -> [B] -> [C]: last hop label` |
| Metadata | `[A] { desc: …; owner: …; files: a.go, b.go; status: warn; rps: 1.2k }` (also after an edge label) |
| Boundary | `group "VPC" { … }`, also `subgraph`, `boundary`, `zone`; nestable |
| Narrated route | `trace "Checkout" {` … `}` with one step per line: `A -> B: what happens and why` (a hop) or `[A]: text` (a stop without movement). A chain `A -> B -> C: text` narrates its last hop. |
| Short route | `trace "Checkout": A -> B -> C`. Missing hops are created as edges. |
| Legacy trace | `[A] -> [D]: *trace: Name*` follows the existing path A…D when there is one |
| Comment | lines starting with `%%` or `//` |

Node identity is the label, matched case- and whitespace-insensitively. The first explicit shape and tech win, and later mentions may omit them. A node joins the group where it is first mentioned.

Routes appear in the map key under the diagram. Pressing one plays a guided tour: the path becomes a colored transit line, the camera moves from stop to stop, and the station strip shows the narration. Use ←/→ to step, the station dots to jump, and Esc to close. A step without narration shows the edge label instead. Hops may run against an edge's direction (a reply going back), and the pulse then travels backwards.

Hovering a node (or focusing it with Tab) shows a hover card: its description, status, the first three other keys, in/out connection counts, file count and routes. Hovering an edge shows its kind (call, async, …), label and metadata. Clicking opens the full inspector.

Inspector metadata keys: `desc`/`description`/`note` (About), `status` (`ok`/`warn`/`no`, which also colors the node), `files`/`file`/`repo`/`path` (comma-separated, shown as code). Any other key appears under Details.

## Mermaid

Use a ```` ```mermaid ```` fence, or put a `flowchart`/`graph`/`sequenceDiagram` header inside `arch`. Supported:

- Flowchart: every node shape, `-->` `---` `-.->` `-.-` `==>` `===` `<-->` `--o` `--x`, `|label|` and `-- label -->`, chains, `A & B --> C`, `subgraph id [Title] … end` (nested), `;`. `classDef`/`style`/`click`/`linkStyle` are ignored. A node listed inside a subgraph moves into it.
- Sequence: `participant`/`actor` with `as` aliases, `->>` `-->>` `->` `-->` `-x` `--x` `-)` `--)`, `+`/`-` activation, `Note over/left of/right of`, `loop`/`alt`/`else`/`opt`/`par`/`and`/`critical`/`option`/`break`/`rect` … `end`, `autonumber`.
- A `:tech` suffix on a label (`db[(Ledger:postgres)]`, `participant A as Auth:node`) adds the icon.

## `sequence`

Same grammar as a Mermaid sequence, without the header. Participant names may contain spaces: `Web Client -> API Gateway: POST /checkout`. Undeclared participants are added in order of first use.

## Other blocks

Callout types are `ok`, `warn`, `err` and `info`. In `kv` values, an `ok` / `warn` / `no` prefix becomes a badge. In `tree`, indentation sets depth and `| note` adds a muted note.

````markdown
```callout warn Title
Body text with **inline** Markdown.
```

```ask
Question one?
* Suggested option | optional note
- Other option
Question two (multi-select)?
[x] Checked by default
[ ] Unchecked
```

```kv
Owner: Payments
Status: warn Degraded
```

```tree
src/
  diagram/ | layout engine
    layout.js
```
````

Tables: GFM, with `:--`/`--:`/`:-:` alignment. A cell starting with `ok`, `warn` or `no` becomes a status badge. Inline Markdown: `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, `[link](https://…)` (only http/https/mailto/relative links are kept).

## Free sections

A ```` ```free NAME ```` fence holds a part you draw by hand, because no block shows it: an HTML fragment with SVG, its own `<style>` and, when it needs one, a `<script>`. It is the one place raw HTML enters a page. It sits in an ordinary panel, so give the panel a `span` as for any block. It uses the page's colour tokens and a small shared kit, so it looks right in every theme, light and dark, wide and on a phone.

This section is the syntax and the warnings. The rules for authors, the kit's classes, the panel widths, the `<use>` trap and a worked section are in [references/free-sections.md](free-sections.md); forms that fit a kind of content are in [references/forms.md](forms.md). Read the first before you draw one.

````text
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

- **The name** comes right after `free`: lowercase letters, digits and dashes, starting with a letter or digit (`key-code`, `step-2`). Use each name once per page. Do not use a kit class name (`how`, `take`, `cap`, `chip`, `tile`, `num`, `bar`, `legend`, `hit`, `dot`, `missing`, …): the section would take that class's style, so the lint warns. Do not name one `hatch` either: the kit owns the ids `fx-hatch-ROLE`, and the ids of a section named `hatch` would collide with them, so the lint warns about that too.
- **Inline:** the fence body is the fragment.
- **`file=path`** (or `file="a path with spaces"`): the fragment comes from that file, and the fence body is ignored. The path starts from the draft's folder; for a draft read from stdin, from the working directory. `clarify serve` reloads when the file changes.

What the renderer does:

1. It wraps the fragment in `<div class="fx fx-NAME" data-fx="NAME">`. The name scopes the section: its CSS starts with `.fx-NAME`, its ids and keyframes with `fx-NAME-`.
2. It moves each `<style>` to the head, after the kit, as a style element of its own, so a `{` left open spoils only the rest of that `<style>`. It moves every `<script>` to the end of the page. Each script runs once with `root` set to the section, inside its own function, so one broken section stops nothing. An error thrown while the script runs is caught and logged as `fx NAME: …`, and `clarify check` reports it on the section's panel. A script that does not parse, an error thrown later (in a click or a timer) and a load that the page's policy blocks are reported on the page instead (`⚠ page @…`). A `<script src="…">` is dropped without a warning: write the script inline.
3. It adds the kit (`src/runtime/fx.css` and the hatch patterns) to a page that has a free section, and to no other page.
4. A page with a free section loads nothing from the network: a policy in its head allows inline styles and scripts, `data:` fonts, and `data:` and `blob:` images, and nothing else. A plain link (`<a href="https://…">`) is fine, because it loads nothing until the reader clicks it.
5. `clarify md` and **Copy as Markdown** keep three things of a section: its "How to read this" line, its takeaway, and a note that the drawing is on the HTML page.

### Free section warnings

`clarify render` and `clarify check` read each section as text, the static lint, and print one line per problem: `⚠ panel C: line 56: free "key-code": …`. The line is the fence's line in the draft. A section with a lint warning is still drawn, so fix each one and render again. The fixes in full, with the check's own kinds, are in [references/free-sections.md](free-sections.md).

| Warning | Fix |
| --- | --- |
| `free section needs a name of lowercase letters, digits and dashes ("…")` | Name it after `free`: `free key-code`. |
| `free section "NAME" is used twice on this page; give each one its own name` | Rename one of them. |
| `free section file not found: PATH` | Fix the path: it starts from the draft's folder. The panel shows a dashed box until then. |
| `free "NAME": the name "NAME" is a kit class (.fx-NAME): the section would take its style; choose another name` | Rename the section: `free colour-key`, not `free legend`. |
| `free "NAME": the name "hatch" belongs to the kit: its hatch patterns are fx-hatch-ROLE; choose another name` | Rename the section. |
| `free "NAME": "<!--" is never closed, so the rest of the page disappears into the comment; close it with "-->"` | Close the comment with `-->`. Until then every panel after it, and the page's own script (theme, replies, Copy as Markdown), is gone. |
| `free "NAME": "<script>" is never closed, so the rest of the page disappears into it; close it with "</script>"` (or `"<style>"`) | Close it with its end tag. |
| `free "NAME": "<textarea>" is left open, so the page shows everything after it as text, or hides it; close it with "</textarea>"` (or `title`, `template`, `xmp`, `iframe`, `noscript`) | Close the tag you left open with its end tag; a closed one is fine, and so is a `<title>` inside an `<svg>` (the drawing's own). Until it is closed, every panel after it is gone and `check` reports them as `missing`. |
| `free "NAME": a "{" in a <style> is never closed: the rules after it in that <style> are lost; add the "}"` | Add the missing `}`. |
| `free "NAME": selectors must start with .fx-NAME: …` | Start every rule with `.fx-NAME`, inside `@media` and `@container` too. |
| `free "NAME": @keyframes "X" must start with fx-NAME-` | Rename it `fx-NAME-X`, in `animation` too. |
| `free "NAME": id "X" must start with fx-NAME-` | Rename it `fx-NAME-X`, and every `href="#…"` and `url(#…)` that points to it. |
| `free "NAME": duplicate id "X" on the page` | Give the id another name. |
| `free "NAME": raw colour "…"; use a token such as var(--trace-0)` | Use a token, or a `color-mix()` of tokens. A colour's name (`white`, `black`, `navy`) is a raw colour too; `none`, `currentColor`, `transparent` and `inherit` are fine. |
| `free "NAME": external URL "…"; a page loads nothing from the network` | Draw it inline, or embed it as `data:`. Only things that load warn: images, stylesheets, `url(…)`, `@import`, `<use href>`. A plain link (`<a href>`) does not. |
| `free "NAME": <meta http-equiv="refresh"> reloads the page or leaves it; take it out` | Take it out. |
| `free "NAME": N KB is over the 40 KB budget for a section` | Draw less, draw a repeated shape once and place it with `<use>`, or split the part into two sections. |

## Checking a page

`clarify check` opens a page in a real browser and looks at every panel. It works on any page, not only one with a free section. `render` only hands the page to your browser to show; `check` drives a browser itself, loads the page and reads what the reader sees.

```bash
clarify check draft.md              # pictures in ~/.clarify/checks/<slug>/
clarify check draft.md --out dir    # pictures in dir
clarify check page.html             # a page that is already rendered
```

- **The input.** A draft (`.md`) is rendered first into `<dir>/page.html` without opening it, and its static lint comes along. A page (`.html`) is checked as it is, without the lint. A page rendered from stdin has no draft, so check the `.html` path that `render` printed.
- **The views.** Four, each with reduced motion: 1440px light, 1440px dark, 390px light, 390px dark.
- **The checks.** Per panel and view: `overflow` (a part sticks out of its panel), `small text` (under 10.5px on screen), `overlap` (two texts on top of each other), `clipped` (text cut off), `page error` (an exception or a `console.error`; `fx NAME: …` is a free section's script), `half-empty` (at 1440px, content fills under half of the panel's height) and `low contrast` (under 4.5:1, or 3:1 for large text). For a draft, `missing` says a panel is not on the page at all: a free section above it left a comment, `<style>`, `<script>` or another tag that swallows the rest of the page open, and the lint names which, except `<plaintext>`, `<noembed>` and `<noframes>`, which also swallow the rest of the page and which the lint does not know: with a `missing` panel and no lint line, look in the sections above it for one of those. A page wider than the window is reported on the page, not on a panel.
- **When a view cannot finish.** Each step has 10 seconds. A step that runs out of time adds one `page error` on the page that names it (`the page did not finish loading in 10 s …`, `the checks did not finish in 10 s …`, `the picture of panel C did not finish in 10 s`), and the views after it are skipped. A browser that stops partway adds `the browser stopped (…); this view and the ones after it were not checked`, and any other failure adds `this view could not be checked: …`; the views that finished keep their results.
- **The pictures.** One per panel per view, named `<panel>-<width>-<scheme>.png` (`D-390-light.png`), with 8px of room round the card. A new run deletes only its own old pictures from the folder. Without `--out`, the folder is `~/.clarify/checks/<slug>/`, named after the title; a title with no ASCII letters (Thai, Chinese) is named after the file instead, or a short hash of its path.
- **The output, in this order.** (1) The picture paths of the panels that have a problem. (2) The lint lines, `⚠ panel D: line 56: free "…": …`. (3) One line per problem, `⚠ panel D @390 light: kind: …` (`⚠ page @…` when the problem belongs to the page), at most five per kind, panel and view, then `… and N more`. (4) A summary line. The command exits 0 whatever problems it finds, so read the lines. It never ends without a line.
- **No browser.** It looks for Chrome or Edge (`CHROME_PATH` first). With none, it prints `⚠ no Chrome or Edge found (set CHROME_PATH): only the static lint ran` and the lint lines for a draft, or says nothing was checked for a page. A browser that is found but does not start gives `⚠ the browser did not start (PATH: the browser exited (code N); set CHROME_PATH to Chrome or Edge): only the static lint ran` instead. Run as root (in a container, say), it starts Chrome without its sandbox, as Chrome requires there.

The summary line is one of these two:

```text
✓ check: 8 panels × 4 views, no problems · pictures in C:\Users\you\.clarify\checks\how-a-wireless-mouse-and-keyboard-work
⚠ check: 26 problems in 7 panels · pictures in C:\Users\you\.clarify\checks\check-broken
```

When a problem belongs to the page and not to a panel, the summary says so: `⚠ check: 1 problem on the page · …`, or `⚠ check: 5 problems in 2 panels and the page · …`.

Look at the pictures of the panels with a `⚠`: they show what the checks cannot, such as a leader line that crosses a label. What each kind means and how to fix it: [references/free-sections.md](free-sections.md), "Every warning and its fix". How many rounds to run follows the depth in `SKILL.md`.

## Lessons

A ```` ```lesson Title ```` fence draws a step-through lesson: a bench of crafted objects (the places) joined by rails, pucks that ride the rails, counter chips, a numbered timeline, and a guide with one article per step, then a quiz. A lesson always takes a full-width panel. Its title goes on the fence line (32 characters or fewer). Inside the fence come the header lines, then the steps, then the quiz.

### Header lines

One `key: value` per line, before the first `step`. Lists split on `|`. A list key may repeat, and its items add up.

- `subtitle: Follow one saved change hop by hop.` One sentence under the title.
- `meta: 10 min · Beginner` Tags under the title, split on `·` or `|`. The step count is added for you.
- `places: you = laptop "Your folder" | repo = cabinet "Local repo" tint=violet` The places, at most 7 (see Places and objects).
- `rails: you - tray - repo - origin | repo - cache` Chains of place ids joined by ` - ` (spaces around the dash). `|` starts another chain. Pucks only travel along rails.
- `counters: Edited | Staged | Pushed` The counter chips. Each starts as `—`.
- `pucks: change = your change | reply = teammate's change | fail = refused` Legend labels by puck kind. The legend lists only the kinds your moves use, so label each of those.
- `goals: Why staging lets you choose @3 | What a commit saves @4` The "You'll learn" checklist. A goal ticks when the reader reaches step N.

Any other line before the first `step` raises an `unknown key` warning. There is no `title:` key.

### Places and objects

`id = kind "Label"`, optionally followed by `tint=<name>` and `at=<x>,<y>`:

- The id is one word with no spaces (`you`, `origin`, `web-app`). Rails and steps refer to places by id.
- The label, in double quotes, is the name tag under the object.
- `tint=` is `neutral`, `amber`, `violet`, `blue`, `green`, `rose` or `teal`. Without it, tints are handed out along the rail chain.
- `at=x,y` pins the place to a grid cell. You rarely need it (see Layout).
- A place stays grey until a step first names it in `show:`, `focus:`, `fail:`, `cut:` or `move:`, so the whole machine is visible from step 1.

| Kind | Drawn as | Use it for |
| --- | --- | --- |
| `laptop` | an open laptop with code on its screen | a person's computer, a working copy |
| `phone` | a phone in a desk stand | a mobile app, a user on the go |
| `monitor` | a screen showing a browser window | a browser, a web page, a front end |
| `server` | a tower server with drive bays | a back end, an API, a remote such as `origin` |
| `database` | stacked drums with status lights | a database, stored records |
| `cabinet` | a card-file cabinet with its top drawer open | history, an archive, a repository |
| `tray` | a desk in-tray with papers | a staging area, an inbox, a buffer |
| `queue` | a conveyor belt with parcels | a message queue, a job line, a stream |
| `cache` | a low rack of small lit drawers | a cache, fast storage |
| `gate` | a barrier with a lock panel and keypad | login, auth, a firewall, a permission check |
| `router` | a router with two antennas | a gateway, a load balancer, DNS, a network hop |
| `mailbox` | a post-mounted mailbox with letters | email, notifications, webhooks |
| `folder` | a box file of folders and papers | files, a directory, a file system |
| `cloud` | a small datacenter building | a cloud provider, a region, a datacenter |
| `box` | a wooden crate with a label plate | a real box, never a stand-in: a thing with no kind of its own gets a free section (an unknown kind is drawn as a box, with a warning) |

### Layout

The bench lays itself out from `rails:`. The first chain zigzags from left to right: its first place stands in cell `0,0`, the next in `1,0`, then `1,-1`, `2,-1`, `2,0`, `3,0` and `3,-1` (right, back, right, front, …). A place on a later chain stands next to the place it joins. Every rail is drawn as a straight line between neighbours, so:

- Make the main path one chain: `rails: you - tray - repo - origin - mate`. A chain of up to 7 places always fits.
- Hang side places off it with more chains: `rails: you - tray - repo - origin | repo - cache`. A place has four sides, so it can join at most four others.
- Every place needs a rail (else `has no rail`), and a rail that closes a loop, such as `c - a` in `a - b - c - a`, usually can't be drawn straight. Avoid loops.
- `at=x,y` overrides a cell. Use it only to fix a layout warning.

### Steps

```text
step Short: Title [chapter]
```

- `step` starts at column 0, in lowercase. The short name (one or two words before the first `: `) labels the timeline and the Next button ("Next: Pull"). Without it, the first two words of the title are used.
- The title has 32 characters or fewer.
- The chapter sets the tag in the guide: `[problem]` Problem, `[how]` How it works (the default), `[why]` Why it helps, `[case]` What goes wrong, `[recap]` Recap. Any other word in brackets stays in the title.

Indent every line under a step (leading spaces are ignored). Each line is one of these:

- **Text.** Lines in a row join into one paragraph, and a blank line starts the next. Keep each paragraph to 45 words or fewer. Inline Markdown works, and `==term==` highlights a key term.
- `tip Title: text` The tip box under the paragraphs. `tip try Title: text` and `tip warn Title: text` change its colour. Without `Title:`, the title is Key idea, Try it or Watch out. One tip per step: a second one replaces the first.
- `- text` A takeaway, in a ticked list under the tip. Use them in the recap.
- `show: a, b` Brings places in without focusing them.
- `focus: a` The dashed orange ring around a place, for this step.
- `fail: a` The red ✕ badge on a place, for this step.
- `cut: a - b, c - d` Turns rails red, for this step.
- `move: …` Sends pucks (see Moves).
- `set: …` Changes counters (see Counters).

Directives are lowercase, with the colon right after the word: `move:`, not `Move:` or `move :`.

### Moves

- `move: you -> tray` sends one puck along the rail from `you` to `tray`. A move may run either way along a rail.
- After the two places, add a puck kind, `xN`, or both: `you -> tray store`, `you -> tray x2`, `you -> tray store x2`. Up to 5 pucks are drawn.
- `a <-> b` is a round trip: out, then a green `reply` puck back.
- `,` plays the next move after this one, and `&` starts the next move together with this one: `move: you -> tray, tray -> repo & mate -> origin reply`.
- A step's moves loop until the reader moves on. Pause holds them and Replay restarts them. With reduced motion, the pucks rest partway along their rails.

| Kind | Colour | Use it for |
| --- | --- | --- |
| `change` | orange (the default) | the thing on the move: a change, a request, a job |
| `reply` | green | something coming back: a response, a teammate's change |
| `fail` | red | refused or lost: the puck stops halfway |
| `store` | violet | something being saved or stored |
| `slow` | amber | something late, slow or forgotten |

### Counters

`set: Staged = 2 files good | Edited = 1 file warn` sets chips, split on `|`. The label must match a name in `counters:` (any case). The level word (`good`, `warn`, `bad` or `none`) is optional and goes after the value: `good`, `warn` and `bad` colour the value green, amber or red, and without one (or with `none`) it is plain. The level word is never shown, so never use one of those words as a value or as its last word: `Status = all good` shows `all`, and `Teammates = — none` shows `—`. A value stays until a later step sets it again, and a chip is highlighted on the step that changes it.

### Quiz

```text
quiz Your push was refused. What do you run first?
  * git pull | it brings your teammate's commit down, then your push can go through
  - git push --force | it would erase your teammate's commit from origin
```

`quiz` starts at column 0, after the last step. Give 2–4 options: exactly one right answer marked `*`, the others `-`, and a reason after `|` on each. Picking an option marks it right or wrong and shows every reason.

### Warnings

`clarify render` prints each problem with its panel and draft line, for example `⚠ panel B: line 42: unknown place "srv"`. The item with the problem is skipped (an unknown object kind is drawn as a box), so fix every warning and render again.

| Warning | Fix |
| --- | --- |
| `unknown key "…"` | Header keys are `subtitle`, `meta`, `places`, `rails`, `counters`, `pucks` and `goals`; the title goes on the fence line. An indented `step` line before the first step lands here too: `step` starts at column 0. |
| `could not read place "…"` | Write `id = kind "Label"` with the label in double quotes. Only `tint=name` and `at=x,y` may follow it. |
| `duplicate place "…"` | Give each place its own id. |
| `more than 7 places; only the first 7 are drawn` | Merge places into 7 or fewer. |
| `unknown object "…", drawn as a box` | Use one of the 15 kinds above. |
| `unknown tint "…"` | Use `neutral`, `amber`, `violet`, `blue`, `green`, `rose` or `teal`, or drop `tint=`. |
| `unknown place "…"` | Declare the id in `places:` or fix its spelling. In `rails:`, put spaces around the dash (`a - b`) and a vertical bar, not a comma, between chains. In `show:`, `focus:` and `fail:`, separate ids with commas. |
| `unknown puck kind "…" (use change, reply, fail, store, slow)` | Use one of the five kinds, in `pucks:` and in moves. |
| `could not read goal "…"` | End each goal with `@N`, the step that ticks it. |
| `title has N characters (keep it to 32)` | Shorten the lesson title (on the fence line) or the step title (after `Short:`). |
| `step needs a title` | Write `step Short: Title`. |
| `more than 12 steps` | Merge steps into 12 or fewer. |
| `paragraph has N words (keep it to 45)` | Cut words, or split the paragraph with a blank line. Lines with no blank line between them are one paragraph. |
| `could not read move "…"` | Write `a -> b` or `a <-> b`, then at most one puck kind and one `xN`. |
| `no rail between "…" and "…"` | Add the rail to `rails:`, or move one hop at a time along existing rails (`a -> b, b -> c`). |
| `could not read cut "…"` | Write `cut: a - b`, with spaces around the dash and cuts separated by `,`. |
| `counter "…" is not declared in counters:` | Add it to `counters:` (names are split by vertical bars, not commas) or fix its spelling. Write `set: Label = value`. |
| `quiz needs one correct option, marked with *` | Mark exactly one option with `*` and the others with `-`. |
| `quiz needs a question` | Write the question on the `quiz` line, after `quiz `. |
| `quiz has N options (give 2 to 4)` | Give two to four options, one per line, each starting with `* ` or `- `. |
| `option "…" needs a reason after \|` | End every option, right or wrong, with `\|` and the reason: picking an option shows them all. |
| `more than one quiz; only the first is kept` | A lesson has one quiz, after its last step. Keep one question. |
| `"…" has no rail` | Join the place to the machine in `rails:`. |
| `rail … - … can't be drawn straight` | A rail closes a loop, a place has more than four rails, or an `at=` cell is not in line with its partner. Drop a rail or reorder the chains; pin a place with `at=` only as a last resort. |
| `"…" overlaps "…"` | Two places want one cell: change or remove `at=`. |

Some slips raise no warning, because the line is still valid paragraph text. If a step looks wrong on the page, check for a `step` or `quiz` line that is indented or capitalised (it becomes text of the step above), a directive in capitals or with a space before its colon, a `* ` line inside a step (takeaways use `- `), and an unknown `[chapter]` word (it stays in the title).

### Worked example

Panel B of `examples/git-commit-lesson.md`: ten steps and a quiz, 0 warnings. In step 9, `Teammates = — none` shows a plain `—`: the level word is never shown, so never use one of those words as a value.

````markdown
```lesson How a Commit Travels
subtitle: Follow one saved change hop by hop, from your laptop to your teammate's.
meta: 10 min · Beginner
places: you = laptop "Your folder" | tray = tray "Staging area" | repo = cabinet "Local repo" | origin = server "Origin" | mate = laptop "Teammate"
rails: you - tray - repo - origin - mate
counters: Edited | Staged | Snapshot | Pushed | Teammates
pucks: change = your change | reply = teammate's change | fail = refused | slow = the forgotten file
goals: What the working directory is @2 | Why staging lets you choose @3 | What a commit really saves @4 | The path: laptop → tray → repo → server → teammate @7 | Cases: a missing file, a refused push @9

step Hit Save: Your work lives on one laptop [problem]
  You fixed a bug in the shop app and pressed Save. The change is real, but only your laptop knows about it.

  Let's follow that one change all the way to a teammate's screen. Every stop has a name and does one job.
  tip Key idea: Git moves changes through a few places, one step at a time. Know the places and every command makes sense.
  show: you
  focus: you

step Edit: Changes start in your folder [how]
  Your project folder is the ==working directory==. When you ask, Git compares it with the last snapshot: three files are different now.

  Nothing is saved in Git yet. Run `git status` any time to see what changed.
  tip try Try it: `git status` only looks. It never changes anything, so run it as often as you like.
  focus: you
  set: Edited = 3 files warn

step Stage: Pick what goes in the snapshot [how]
  `git add` copies the changes you choose into the ==staging area==, a waiting tray for your next snapshot.

  You picked two of the three files. The third one stays out, on purpose.
  tip Why a tray?: Staging lets one messy afternoon become several clean, focused snapshots.
  move: you -> tray x2
  focus: tray
  set: Staged = 2 files good

step Commit: Take the snapshot [how]
  `git commit` turns everything in the tray into a ==commit==: a saved snapshot with a message, an author and a time.

  Each commit gets an id like `a1f9e2c`, worked out from the files, the message, the author, the time and the commit before it. Change any of them and the id changes too.
  tip try Good habit: Write the message as what the commit does: Fix total when cart is empty.
  move: tray -> repo
  focus: repo
  set: Edited = 1 file warn | Staged = 0 files good | Snapshot = a1f9e2c good

step History: Commits form a chain [why]
  Every commit remembers the one before it. Together they make your project's ==history==, and you can step back to any point.

  Small commits with clear messages are easy places to return to.
  tip Key idea: Git never edits old commits. It only adds new ones on top.
  focus: repo
  set: Snapshot = 3 in chain good

step Push: Send it to the shared copy [how]
  So far everything happened on your laptop. `git push` sends new commits to a ==remote==: a shared copy on a server, usually called `origin`.

  Git only sends what the remote is missing, so pushing stays quick even for big projects.
  tip Key idea: Your laptop and the server each hold a full copy. Push and pull just keep them in step.
  move: repo -> origin
  focus: origin
  set: Pushed = 1 commit good

step Pull: Your teammate gets the change [why]
  Your teammate runs `git pull`. Git asks the remote what's new, downloads your commit and updates their folder.

  Now two laptops hold the exact same snapshot. That's the whole journey.
  tip try Habit: Pull before you start work. You'll build on the newest version and avoid surprises.
  move: origin -> mate
  focus: mate
  set: Teammates = 1 person good

step Forgot file: The snapshot is missing a file [case]
  Remember the third file you didn't add? If the fix needed it, the commit is incomplete, and your teammate's app breaks.

  The fix is simple: `git add` that file and make one more commit.
  tip warn Watch out: A commit only holds what was staged. Saving a file is not the same as adding it.
  move: you -> tray slow
  focus: tray
  fail: mate
  set: Snapshot = missing 1 warn | Teammates = broken bad

step Rejected: The push is refused [case]
  Your teammate pushed first. Now the remote has a commit you don't, so Git refuses your push rather than lose their work.

  Run `git pull` to bring their commit down, then push again. Git joins both lines of history.
  tip warn Never force it: `git push --force` would erase their commit. Pull first, then push.
  move: mate -> origin reply & repo -> origin fail
  cut: repo - origin
  fail: origin
  set: Snapshot = a1f9e2c good | Pushed = rejected bad | Teammates = — none

step Recap: Where the change went [recap]
  One change, five stops. Each command moves it one hop:
  - **Save** puts the change in your working directory.
  - `git add` copies it into the staging area.
  - `git commit` turns it into a snapshot in your local repo.
  - `git push` copies it to the shared remote; `git pull` brings it to others.
  move: you -> tray, tray -> repo, repo -> origin, origin -> mate
  set: Edited = 0 files good | Staged = 0 files good | Snapshot = b7c03d1 good | Pushed = 2 commits good | Teammates = 1 person good

quiz Your push was refused. What do you run first?
  * git pull | it brings your teammate's commit down, then your push can go through
  - git push --force | it would erase your teammate's commit from origin
  - git commit again | origin would still have a commit you don't have
```
````

## The reply loop

Readers can pick options, add notes, and comment on any node, edge or panel. **Copy reply for agent** produces:

```text
# Re: <title>
Draft: /abs/path/draft.md

## Decisions
1. [C] Which failover strategy?
   → Multi-region replicas (confirmed suggestion)
   > reader note

## Review comments
- [A · node] Session Cache (Redis) (line 18)
  Replace Redis with Dragonfly
```

Line numbers point into the draft, so apply each comment there (or to the code it describes) and re-render.

Readers can also comment on a lesson step or its quiz with the comment button at the top of the guide. That comment cites the step's line: `- [B · step] Step 3 · Pick what goes in the snapshot (line 40)`.
