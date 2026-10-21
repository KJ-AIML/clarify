# Clarify

Interactive architecture and decision boards for AI coding agents. The agent writes a Markdown draft. Clarify compiles it into one self-contained HTML page with zero runtime dependencies.

- **A real layout engine.** Layered (Sugiyama) layout with cycle breaking, crossing minimization, label lanes, and nested boundary groups that never overlap. Fuzz-tested on 300 random layouts.
- **An interactive canvas.** Pan, cursor-anchored zoom, pinch, keyboard control, a minimap for large estates, fullscreen, and hover/selection focus that dims everything outside a node's neighborhood.
- **Hover cards and an inspector.** Hover any component (or Tab to it) for a quick card: what it is, its status, key facts, connection counts and the routes through it. Click for the full inspector, with files, every incoming and outgoing call (click to jump), and comments.
- **Narrated route tours.** `trace "Checkout" { A -> B: what happens… }` turns a request path into a guided tour. The path becomes a colored transit line, a station strip shows each stop with its narration, and the camera glides from hop to hop (←/→ to step).
- **Context built in.** The hero header has a section index and an open-questions count. Each diagram gets a map key that lists only the line styles and markers it actually uses. SKILL.md gives agents a context checklist: the answer first, how to read each map, node descriptions, a narrated main flow, and a takeaway per diagram.
- **Mermaid in, Mermaid out.** Paste Mermaid flowcharts and sequence diagrams unchanged. Every diagram exports back to Mermaid for GitHub.
- **A two-way agent loop.** Readers answer `ask` blocks and comment on any node, edge or panel. **Copy reply for agent** produces a structured reply with draft line numbers.
- **Exports.** SVG (standalone, themed), high-DPI PNG, Mermaid per diagram, and the whole page as GitHub Markdown.
- **Live preview.** `clarify serve draft.md` reloads the page on every save and keeps zoom, pan and scroll.
- **Eight themes.** Auto (system), Light, Dark, Tokyo Night, Nord, Catppuccin, Paper (e-ink), Blueprint.

The visual direction is wayfinding. Chrome stays ink-and-paper and neutral, and color is reserved for meaning: routes use transit-line colors, statuses and brand marks keep theirs. Headings use system signage faces (DIN Alternate on macOS, Bahnschrift on Windows), and labels and counts use monospace.

## Quick start

```bash
node clarify/bin/clarify.mjs render clarify/examples/ecommerce-architecture.md
node clarify/bin/clarify.mjs serve  clarify/examples/platform-topology.md     # live preview
node clarify/bin/clarify.mjs md     clarify/examples/checkout-sequence.md     # GitHub Markdown
cat draft.md | node clarify/bin/clarify.mjs render - --out page.html --no-open
```

Requires Node ≥ 20. No `npm install`.

Draft syntax: see [SKILL.md](SKILL.md) (what agents load) and [references/syntax.md](references/syntax.md) (the full reference). The `examples/` directory has one draft per feature area.

## Layout

```text
clarify/
├── SKILL.md, references/syntax.md   agent instructions (lean) + full reference (on demand)
├── bin/clarify.mjs                  CLI: render · serve · md · view
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
│   ├── export/markdown.js           draft → GitHub Markdown
│   ├── brand-marks/brands.js        22 inline brand marks + lookup + sprite
│   └── runtime/                     themes.css, page.css, svg.css, client.js (inlined at compile time)
└── test/
    ├── *.test.js                    node:test unit tests (parser, layout + fuzz, mermaid, render, serve)
    └── visual/                      CDP-driven browser audit + screenshot regression (no Playwright)
```

## Testing

```bash
npm test                 # 75 unit tests, including the 300-layout fuzz pass
npm run visual           # browser audit + pixel diff against test/visual/baselines
npm run visual:update    # accept intentional visual changes
```

The visual suite drives headless Chromium over the DevTools pipe. It finds Chromium through `$CHROME_PATH`, Playwright's browser cache or a system Chrome, and skips cleanly if none exists. Each scenario first runs in-page checks: no console errors, every node label fits its box, every tech node has an icon, and no horizontal page overflow. It then compares the screenshot against its baseline, and diff images go to `test/visual/output/`. Two scenarios exercise the reply loop and SVG/PNG export end to end.

Baselines depend on the machine's fonts. Regenerate them with `npm run visual:update` on the machine (or CI image) that runs the comparison.

## Design notes

- **Plain ESM with JSDoc types.** There's no build step. `src/types.d.ts` defines the contracts, and modules reference them via `@typedef {import("./types")…}`, so editors and `tsc --checkJs` type-check without a compile pass.
- **Deterministic text measurement.** Node-side layout estimates text width per character class. The browser audit verifies that labels actually fit.
- **Untrusted input.** All draft text is escaped. Links are limited to http/https/mailto/relative URLs, and embedded JSON is `<`-escaped. The live server binds to loopback and rejects foreign `Host` headers.
- **Size.** The engine, eight themes, inspector, route tours, exports and live reload live in about 65 KB of inlined CSS and JS per page. Brand paths are emitted once per page as a `<symbol>` sprite. Typical pages are 110–160 KB.

## License

[MIT](LICENSE) for Clarify's own code. The bundled brand marks are third-party trademarks with their own terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
