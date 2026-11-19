# Clarify

Interactive architecture and decision boards for AI coding agents. The agent writes a Markdown draft. Clarify compiles it into one self-contained HTML page with zero runtime dependencies.

![Clarify page for examples/ecommerce-architecture.md: hover card, narrated route tour, then answering the decision and copying the reply for the agent](docs/demo.gif)

- **A real layout engine.** Layered (Sugiyama) layout with cycle breaking, crossing minimization, label lanes, and nested boundary groups that never overlap. Fuzz-tested on 300 random layouts.
- **An interactive canvas.** Pan, cursor-anchored zoom, pinch, keyboard control, a minimap for large estates, fullscreen, and hover/selection focus that dims everything outside a node's neighborhood.
- **Hover cards and an inspector.** Hover any component (or Tab to it) for a quick card: what it is, its status, key facts, connection counts and the routes through it. Click for the full inspector, with files, every incoming and outgoing call (click to jump), and comments.
- **Narrated route tours.** `trace "Checkout" { A -> B: what happens… }` turns a request path into a guided tour. The path becomes a colored transit line, a station strip shows each stop with its narration, and the camera glides from hop to hop (←/→ to step).
- **Step-through lessons.** A ```` ```lesson ```` block teaches how something moves between places: crafted 3D objects on a bench, pucks riding the rails between them, counters that change, and a guide that walks through each step, a failure and its fix, a recap and a quiz. Try `examples/git-commit-lesson.md`.
- **Free sections.** When no block shows a part, the agent draws it by hand. A ```` ```free ```` fence holds an HTML or SVG section in the page's own tokens and a small shared kit, so it looks right in every theme, light and dark, wide and on a phone. A static lint warns about CSS and ids that are not scoped to the section, colours that are not tokens (colour names too), images, stylesheets and other external URLs, a section over 40 KB, and what would spoil the rest of the page: a comment, `<style>` or `<script>` left open, or a `{` never closed. A page with a free section loads nothing from the network. Try `examples/wireless-mouse.md`, a page of seven.
- **A browser check.** `clarify check` opens the page in Chrome or Edge in four views (1440px and 390px, light and dark) and checks every panel: a part that sticks out, text that is too small, text on top of text, text cut off, page errors, a panel half empty, text too faint and a panel missing from the page. It saves a picture of every panel in every view, so the agent can look at what the numbers cannot say. When the browser does not start or stops partway, it says so. Only `check` drives a browser: it loads the page and reads what the reader sees.
- **Context built in.** The hero header has a section index and an open-questions count. Each diagram gets a map key that lists only the line styles and markers it actually uses. SKILL.md has the agent think first: gather the facts, split them into parts, name the kind of each part, choose the form that shows it, and order the parts as a story. The answer comes first, each drawing says how to read it and ends with a takeaway, and every trade-off carries its reasons.
- **Mermaid in, Mermaid out.** Paste Mermaid flowcharts and sequence diagrams unchanged. Every diagram exports back to Mermaid for GitHub.
- **A two-way agent loop.** Readers answer `ask` blocks and comment on any node, edge or panel. **Copy reply for agent** produces a structured reply with draft line numbers.
- **Exports.** SVG (standalone, themed), high-DPI PNG, Mermaid per diagram, and the whole page as GitHub Markdown. A free section exports its "How to read this" line, its takeaway and a note that the drawing is on the HTML page.
- **Live preview.** `clarify serve draft.md` reloads the page on every save and keeps zoom, pan and scroll. It also reloads when a file that a free section reads (`file=`) changes.
- **Eight themes.** Auto (system), Light, Dark, Tokyo Night, Nord, Catppuccin, Paper (e-ink), Blueprint.

The visual direction is the course look, after [designed-to-scale](https://designed-to-scale.vercel.app): warm paper with a faint grain, one monospace face for everything (JetBrains Mono, embedded so pages look the same on every machine), warm lines, small-caps labels, green for the active thing and a hard offset shadow on it. Color still means something: routes use their own line colors, statuses and brand marks keep theirs, and each panel key takes a folder color in turn. The named presets keep their palettes and take the same shapes; Paper keeps its serif.

## Install

```bash
npx skills add KJ-AIML/clarify -g    # Claude Code, Codex, Cursor and other agents
npx skills update clarify -g         # pull the latest version later
```

Then ask your agent to "clarify" or "diagram" something. No `npx`? Clone this repo into your agent's skills folder (for Claude Code, `~/.claude/skills/clarify`).

## Quick start

```bash
node clarify/bin/clarify.mjs render clarify/examples/ecommerce-architecture.md
node clarify/bin/clarify.mjs render clarify/examples/git-commit-lesson.md     # step-through lesson
node clarify/bin/clarify.mjs render clarify/examples/wireless-mouse.md        # a page of free sections
node clarify/bin/clarify.mjs check  clarify/examples/wireless-mouse.md        # browser check, with pictures
node clarify/bin/clarify.mjs serve  clarify/examples/platform-topology.md     # live preview
node clarify/bin/clarify.mjs md     clarify/examples/checkout-sequence.md     # GitHub Markdown
cat draft.md | node clarify/bin/clarify.mjs render - --out page.html --no-open
```

Requires Node ≥ 20. No `npm install`. `check` also needs Chrome or Edge (set `CHROME_PATH` if it is not found); without one, a draft gets only the lint, and says so.

Draft syntax: see [SKILL.md](SKILL.md) (what agents load), [references/syntax.md](references/syntax.md) (the full reference), [references/free-sections.md](references/free-sections.md) (free sections: rules, kit, warnings) and [references/forms.md](references/forms.md) (forms that fit a kind of content). The `examples/` directory has one draft per feature area.

## Layout

```text
clarify/
├── SKILL.md, references/syntax.md   agent instructions (lean) + full reference (on demand)
├── references/forms.md              forms that fit a kind of content, each with its nearest block
├── references/free-sections.md      free sections: rules, the kit, panel widths, every warning and its fix
├── bin/clarify.mjs                  CLI: render · serve · md · check · view
├── src/
│   ├── parser.js                    frontmatter, Lead, panels (with draft line numbers)
│   ├── markdown.js                  block tokenizer + safe inline formatter
│   ├── render.js                    page compiler, block renderers, grid row packing
│   ├── serve.js                     live-reload server (SSE, loopback only)
│   ├── types.d.ts                   shared contracts (Graph, Layout, Draft, …)
│   ├── diagram/
│   │   ├── arch-parser.js           Clarify diagram syntax
│   │   ├── mermaid.js               Mermaid flowchart/sequence parser + exporters
│   │   ├── layout.js                layered layout engine
│   │   ├── svg.js, sequence-svg.js  renderers (class-based, themed by CSS tokens)
│   │   └── index.js                 fence → model → SVG dispatch
│   ├── lesson/
│   │   ├── parse.js, state.js       lesson fence → model + warnings → one state per step
│   │   ├── layout.js, stage.js      bench layout → the stage, drawn once as SVG
│   │   ├── objects/, pen.js         the 15 crafted objects + their drawing helpers
│   │   ├── render.js, kinds.js      lesson HTML + runtime model; shared vocabulary
│   │   └── markdown.js              lesson → GitHub Markdown
│   ├── free/                        the free fence: section.js (read a section), lint.js (static lint),
│   │                                kit.js (hatch patterns), markdown.js (Markdown export)
│   ├── check/                       clarify check: index.js (views, pictures, report), audit.js (in-page checks), cdp.js (browser)
│   ├── iso/kit.js, kit.css          vendored isometric anatomy kit (MIT)
│   ├── export/markdown.js           draft → GitHub Markdown
│   ├── brand-marks/brands.js        22 inline brand marks + lookup + sprite
│   └── runtime/                     themes.css, page.css, svg.css, client.js (inlined at compile time),
│                                    plus lesson.css and lesson.js on pages with a lesson, and fx.css (the free-section kit)
│                                    on pages with a free section;
│                                    fonts/ holds JetBrains Mono (Latin, one variable file for weights 100–800, OFL), inlined into every page
└── test/
    ├── *.test.js                    node:test unit tests (parser, layout + fuzz, mermaid, render, serve, lessons)
    └── visual/                      CDP-driven browser audit + screenshot regression (no Playwright)
```

## Testing

```bash
npm test                 # 256 unit tests, including the 300-layout fuzz pass
npm run visual           # browser audit + pixel diff against test/visual/baselines
npm run visual:update    # accept intentional visual changes
```

The visual suite drives headless Chromium over the DevTools pipe. It finds Chromium through `$CHROME_PATH`, Playwright's browser cache or a system Chrome, and skips cleanly if none exists. Each scenario first runs in-page checks: no console errors, the embedded font loaded, every node label fits its box, every tech node has an icon, and no horizontal page overflow. It then compares the screenshot against its baseline, and diff images go to `test/visual/output/`. Of the 30 scenarios, 19 compare a screenshot. The other 11 check behaviour end to end: the reply loop, SVG/PNG export, Thai labels fitting their boxes, a page with a free section under its no-network policy (one broken section stops nothing), and the lesson player (stepping, motion and keys, reduced motion, round trips at rest, compact name tags, the quiz and step comments). The unit tests run `clarify check` in a browser too, and skip those tests when no Chrome or Edge is found.

Baselines depend on the machine's fonts. Regenerate them with `npm run visual:update` on the machine (or CI image) that runs the comparison.

On Windows, run `node test/visual/run.mjs --baselines .tmp/before --output .tmp/out` instead of `npm run visual`: the committed baselines come from a Mac, so plain `npm run visual` fails on text rendering and writes any missing baselines into `test/visual/baselines/`. The first run fills `.tmp/before` (git-ignored), and later runs compare against it.

## Design notes

- **Plain ESM with JSDoc types.** There's no build step. `src/types.d.ts` defines the contracts, and modules reference them via `@typedef {import("./types")…}`, so editors and `tsc --checkJs` type-check without a compile pass.
- **Deterministic text measurement.** Node-side layout measures text in the page's monospace face (0.6em per character, 1em for CJK, nothing for non-spacing marks), and never less than the older per-letter estimate for proportional faces, so Paper's serif fits too. The browser audit verifies that labels actually fit.
- **Untrusted input.** All draft text is escaped, except a `free` fence: it is the one place raw HTML and script enter a page, so a page with one carries a policy in its head that loads nothing from the network (inline styles and scripts, `data:` fonts, and `data:` and `blob:` images only). Links in Markdown are limited to http/https/mailto/relative URLs, and embedded JSON is `<`-escaped. The live server binds to loopback and rejects foreign `Host` headers.
- **Only `check` drives a browser.** `render`, `serve` and `md` never do: `render` and `serve` only hand the page to your default browser (`--no-open` skips that). `clarify check` loads the page and reads it, and it needs no package: it talks to Chrome or Edge over the DevTools pipe, with the same small driver the visual tests use.
- **Size.** The engine, eight themes, inspector, route tours, exports and live reload live in about 81 KB of inlined CSS and JS per page, and the embedded font adds about 53 KB. Brand paths are emitted once per page as a `<symbol>` sprite. Pages without a lesson or a free section are typically 165–215 KB. A page with a lesson is roughly 355–465 KB: it also carries the lesson player (about 36 KB of CSS and JS) and the stage, drawn as one SVG. A page with free sections also carries the kit (about 8.5 KB on the page: `fx.css`, minified, and the hatch patterns) and each section as written, up to 40 KB each. `examples/wireless-mouse.md`, with seven sections, makes a page of about 254 KB.

## License

[MIT](LICENSE) for Clarify's own code. The bundled brand marks are third-party trademarks with their own terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
