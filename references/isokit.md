# Isokit Lessons Reference

Use a ```` ```isokit ```` fence (JSON) for **animated, step-through isometric lessons** inside a Clarify page. Clarify validates the JSON at compile time (`clarify render` / `clarify check`) and renders it inside the Clarify lesson player with live `IsoDiagram.Stage` transitions, camera planning, pan/zoom, count-up metric chips, `What changed` lists, goals, optional quiz, and full 8-theme light/dark sync.

## Minimal example

````markdown
## B How a cache works {span=3}
```isokit
{
  "title": "Add a cache",
  "subtitle": "Take read load off the database in two steps.",
  "meta": ["3 min", "Beginner"],
  "legend": ["req", "res"],
  "metrics": [
    { "key": "db", "label": "DB load", "unit": "%" },
    { "key": "p95", "label": "P95", "unit": " ms" }
  ],
  "components": {
    "api":   { "type": "block", "x": 0, "y": 0, "color": "orange", "glyph": "server", "label": ["API"] },
    "cache": { "type": "block", "x": -8, "y": 10, "color": "green", "glyph": "zap", "label": ["Cache"] },
    "store": { "type": "db", "x": 4, "y": 10, "color": "purple", "label": "products" }
  },
  "wires": {
    "in":    { "from": "users", "to": "api", "pts": ["users", "api"], "label": "GET /item" },
    "query": { "from": "api", "to": "db", "pts": ["api", ["db", "api"], "db"], "label": "SQL" },
    "hit":   { "from": "api", "to": "cache", "pts": ["api", ["cache", "api"], "cache"], "label": "hit 90%" }
  },
  "steps": [
    {
      "short": "Slow DB",
      "chapter": "problem",
      "title": "Every page hits the database",
      "body": ["Each request runs the same query. The database sits at **92%** load."],
      "changes": ["+ Users", "+ API", "+ Database"],
      "metrics": { "db": 92, "p95": 180 },
      "scene": {
        "entities": {
          "users": { "type": "crowd", "x0": -4, "x1": 4, "y0": -16, "y1": -9, "count": 18, "label": "5,000 users" },
          "api":   { "use": "api", "cpu": 0.45 },
          "db":    { "use": "store", "cpu": 0.92, "heat": 0.85 }
        },
        "links": ["in", "query"],
        "flows": [{ "route": ["in", "query"], "bounce": true, "rate": 2.2, "hold": 0.45 }]
      }
    },
    {
      "short": "Add cache",
      "chapter": "solution",
      "title": "Serve hot reads from memory",
      "body": ["Most reads hit the cache and return in **18 ms**. Database load drops to **14%**."],
      "changes": ["+ In-memory cache", "~ Database load drops to 14%"],
      "metrics": { "db": 14, "p95": 18 },
      "scene": {
        "entities": {
          "users": { "type": "crowd", "x0": -4, "x1": 4, "y0": -16, "y1": -9, "count": 18, "label": "5,000 users" },
          "api":   { "use": "api", "cpu": 0.35 },
          "cache": { "use": "cache", "cpu": 0.28, "tags": [{ "text": "90% hits", "tone": "green", "icon": "check" }] },
          "db":    { "use": "store", "cpu": 0.14 }
        },
        "links": ["in", "hit", "query"],
        "flows": [
          { "routes": [["in", "hit"], ["in", "query"]], "weights": [9, 1], "bounce": true, "rate": 2.2 }
        ]
      }
    }
  ],
  "quiz": {
    "question": "Why did database load drop from 92% to 14%?",
    "options": [
      { "text": "90% of reads are answered from the cache before reaching the database", "correct": true, "why": "Only cache misses fall through to SQL." },
      { "text": "The database got faster hardware", "correct": false, "why": "The database is unchanged; fewer queries reach it." }
    ]
  }
}
```
````

## Top-level fields

| Field | Meaning |
| --- | --- |
| `title`, `subtitle`, `meta` | Heading, one-line subtitle, pill badges (`["5 min", "Architecture"]`). |
| `legend` | Packet kinds to show under the stage: `"req"`, `"res"`, `"heavy"`, `"ping"`, `"write"`, `"msg"`, `"mine"`, `"slow"`, `"kill"`, or `{ "kind": "req", "label": "draft" }`. |
| `metrics` | Counter chips above the stage: `{ "key": "p95", "label": "P95", "unit": " ms" }`. Numbers animate with count-up; `{ "value": "1 fail", "level": "bad" }` sets a semantic color (`good`, `warn`, `bad`). |
| `components`, `wires` | Named templates reused in scenes with `"use": "name"`. |
| `goals` | Checklist under the guide: `{ "text": "...", "at": 3 }`. |
| `steps` | Required array of step objects. Each carries `short` (≤ 12 chars), `chapter` (`setup`, `problem`, `solution`, `technique`, `tradeoff`, `insight`, `recap`), `title`, `body` (string or array of paragraphs), optional `callout` (`{ "kind": "tip" \| "insight" \| "warn", "text": "..." }`), `changes` (`"+ "`, `"~ "`, `"- "`), `takeaways`, `metrics`, and `scene: { entities, links, flows }`. |
| `quiz` | Optional quiz step: `{ "question": "...", "options": [{ "text": "...", "correct": true, "why": "..." }] }`. |

## Primitives

| Type | Position | Key fields |
| --- | --- | --- |
| `block` | `x, y` | `s` (default `4`), `h` (`46`), `color`, `glyph`, `label` (1–2 short lines), `sub`, `cpu` (`0..1`), `tags`, `pills` (`"above"` \| `"below"`), `heat` (`0..1`), `dead` (`0..1`), `dim` (`0..1`) |
| `db` | `x, y` | `r` (`1.7`), `h` (`38`), `color`, `glyph`, `label`, `cpu` (tank fill + meter), `tags`, `heat` |
| `device` | `x, y` | `form` (`"laptop"` \| `"phone"`), `label`, `tags` |
| `crowd` | `x0, x1, y0, y1` | `count`, `label` |
| `zone` | `x0, x1, y0, y1` | `label`, `labelAlong` (`"x"` \| `"y"`), `labelX`, `labelY` |
| `queue` | `x, y` | `n`, `dir` (`[0, -1]`), `gap` (`1.2`), `color` (hex), `label`, `labelDx`, `labelDy` |
| `panel` | docked (no `x, y`) | `title`, `icon`, `lines` (`"+ "` green, `"! "` red, `"# "` muted), `chart` (`"bars"` \| `"hockey"`), `bars`, `marker`, `w` |
| `note` | `x, y, z` + `dx, dy` | World-anchored callout card (`title`, `icon`, `lines`, `w`); omit `x, y` to dock like `panel` |
| `ring` | `x, y` | `r` (`10`), `nodes` (`{ a, color, mark }`), `keys`, `moved`, `label` |
| `ghost` | `x, y` | `s` (`6`), `h` (`90`), `label` (dashed wireframe placeholder) |

## Placement & visual rules

- **Axes:** `+x` goes down-right on screen; `+y` goes up-right. Larger `x - y` is nearer the viewer and drawn on top.
- **Keep blocks spaced:** size-4 blocks must be at least **7–10 units apart** centre-to-centre so the nearer block never hides its neighbour's label.
- **Keep scenes compact:** keep total scene span under ~28 units across so labels and pills stay large and readable.
- **Keep entity ids stable across steps:** same id glides and morphs; a new id drops in with a floor spotlight; a removed id sinks away.
- **Route links with elbows:** `["lb", ["app", "lb"], "app"]` follows the isometric grid cleanly.
- **Pill placement:** use `"pills": "below"` on front-edge blocks that have clear floor in front of them so top pills never cover a block behind them.
- **Zone labels:** if a link crosses a zone's floor label, widen the zone or set `"labelAlong": "y"` / `"labelX"` / `"labelY"`.

## Built-in names

- **Colors:** `blue`, `orange`, `green`, `yellow`, `purple`, `rose`, `teal`, `slab`, `store` (aliases: `sky`, `coral`, `mint`, `lemon`, `lilac`).
- **Tag / link tones:** `paper`, `red`, `green`, `amber`, `violet`, `blue`, `gray`.
- **Link styles:** `solid`, `dashed`, `off` (`muted`), `beat`, `cut`. **Heads:** `end`, `both`, `none`.
- **Packet kinds:** `req`, `heavy`, `ping`, `write`, `msg`, `slow`, `mine`, `kill`, `poison`, `push`, `empty`.
- **Common icons (127 Lucide icons bundled):** `server`, `database`, `network`, `route`, `layers`, `zap`, `shield`, `lock`, `key`, `globe`, `cpu`, `code`, `braces`, `file`, `scroll`, `inbox`, `mail`, `message`, `window`, `smartphone`, `users`, `user`, `bot`, `chart`, `chartLine`, `gauge`, `clock`, `timer`, `check`, `circleCheck`, `alert`, `flame`, `bug`, `box`, `package`, `packageCheck`, `sparkles`, `gitBranch`, `gitCommit`, `gitPull`, `workflow`, `refresh`, `search`, `eye`, `trendingUp`.
