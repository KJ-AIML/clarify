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
