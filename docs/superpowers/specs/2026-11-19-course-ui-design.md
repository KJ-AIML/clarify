# Course UI: clarify in the designed-to-scale look

Date: 2026-11-19 · Branch: `feat/course-ui` (from `main` f79d9aa) · Status: approved by delegation ("I trust you"), owner's calls marked *call*.

## Intent

The owner loves the look of the reference site, designed-to-scale (their Git course is a near-copy of it), and wants clarify's **whole** page UI to look like it, so a lesson no longer sits inside a page that looks like a different product. The crafted objects stay exactly as they are ("the object is good, I love it").

Reference material, all local:
- tokens: `Documents/Craft Anything/designed-to-scale-vercel-app/app/src/theme.css`
- component rules: `…/app/src/style.css`
- screenshot: `…/capture/screenshot-1440.png`

## What the reference look is made of

1. **One typeface:** JetBrains Mono for everything, headings included; ligatures off (`"calt" 0, "liga" 0`); dense 13px UI text.
2. **Warm paper:** `--paper #f4ebe0`, cards `#f8f0e6`, lines `#ddd3c5` / strong `#c6bbac`, ink `#1d1b18`, muted `#6f6961`; green for "active" (`#cfe3b2`), violet tile for key ideas (`#ebe3f1` / `#d5c8e2`); a faint radial highlight and 5% paper grain on the window.
3. **Three border weights:** 1px warm line (cards), 1.3px warm/ink-2 (controls, pills, tiles), 1.5px ink (emphasis, the active thing).
4. **Two hard shadows:** pop `1.5px 2.5px 0 ink` on the primary/active control (pressing it removes the shadow and moves it 1px), drop `0 1.5px 0 ink-2` on tools and pills. Menus: `3px 4px 0 ink` plus a long soft blur.
5. **Small caps labels:** uppercase, letter-spaced, 9.5–11px, weight 700–800.
6. **Tinted pills** with outlines (sand `#f6e6c9`, violet `#e7ddf5`, mint `#dff0de`); counter chips with a 3px level bar on the left.
7. **Colour-coded sections:** nine folder colours (sand, violet, green, orange, blue, teal, rose, slate, olive) in the course tree.

## Approaches

| Approach | What it gets | Trade-off |
| --- | --- | --- |
| A. Re-token only | colours and type, everywhere at once | misses the signature: borders, hard shadows, pills, small caps, tinted keys |
| **B. Re-token + component pass** (*call*) | tokens plus a pass over every component to adopt the reference's borders, shadows and labels | more CSS to touch; every screenshot baseline changes |
| C. Rebuild as an app shell (top bar, sidebar tree, guide column) | closest to the reference layout | changes what a clarify page *is* (a brief, not an app); new HTML and JS; far bigger |

B, because the look is in the details (A) and clarify is a document, not an app (C).

## Decisions

1. **Type (*call*).** `--font`, `--font-display` and `--mono` all become `"JetBrains Mono", "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Consolas, "Leelawadee UI", Thonburi, monospace`. JetBrains Mono Latin 400 and 700 (`@fontsource/jetbrains-mono`, OFL-1.1, about 21 KB each) are embedded in every page as base64 `@font-face` with a Latin `unicode-range`, so pages look the same on Windows and macOS and Thai falls back per glyph to the system's Thai face. Ligatures off. Body text 13.5px/1.6; UI text 12–13px; titles weight 800 with slightly negative tracking.
2. **Palette.** Default light (`:root`, `auto`, `light`) takes the reference's light tokens; `dark` (and `auto` under `prefers-color-scheme: dark`) takes the reference's warm dark tokens. Status colours come from the reference swatches (ok `#2f8a43` on `#e8efd9`, warn `#a5650c` on `#f6e6c9`, no `#c0392b` on `#fbebe7`, info `#5a43a6` on `#ebe3f1`). Traces: orange, blue, green, amber from the reference's puck and folder colours. Highlight (hover, selection, focus ring of a node) is the lesson's orange, so diagrams and lessons share one "this one" colour.
3. **New tokens** (defined from existing ones with `color-mix` where they must work in every preset): `--ink-2`, `--line-ctl` (1.3px control border), `--accent` / `--accent-2` (green), `--drop` (the hard-shadow colour: ink in light themes, near-black in dark ones), `--pop`, `--tool-shadow`, `--pill-shadow`, `--menu-shadow`, and nine key tints `--key-0 … --key-8` (folder colours mixed into the surface).
4. **Surfaces.** Page: paper plus a radial highlight and a 5% grain overlay (inline SVG noise, no network). Cards: card colour, 1px line, radius 12, the reference card shadow. Controls: 1.3px `--line-ctl`, radius 8, tool drop. Primary control and the selected option: green fill, 1.5px ink, pop shadow, press-in on `:active`. Menus, hover cards and the reply drawer: 1.5px ink, radius 14, menu shadow.
5. **Components.** Hero: title mono 800, eyebrow as a bold small-caps label with clarify's three-colour mark; "On this page" reads like the reference's course tree. Panel keys (A, B, C…): outlined tiles tinted by panel order with the nine folder colours, in the card head and the index alike. Tables: small-caps header row on the second surface; status badges become outlined tinted pills. Callouts: tinted tiles like the reference's "Key idea" box, with a small-caps head. Choice options (`ask`): outlined cards; the checked one turns green with an ink border and pop shadow. Code: second surface, 1px line. Diagrams: warm canvas and dots; nodes on light card with an ink-2 outline and a hard drop; edges warm grey; groups warm dashed with small-caps labels; tools, zoom, menu, minimap, legend, route-tour bar and hover card restyled to match.
6. **Lessons.** The lesson already uses the reference palette (style C). It inherits the new type through the tokens; objects, tints, pucks and layout are untouched.
7. **Named presets** (tokyo-night, nord, catppuccin, paper, blueprint) keep their colours and inherit the new shapes. `paper` keeps its serif and `blueprint` its mono display face: they are deliberate type choices.

## Non-goals

- No layout restructure (no app shell, no sidebar, no scrollspy). No new syntax or features. Objects unchanged.
- Exported SVG/PNG files do not embed the font; they fall back to the viewer's mono face.

## Constraints

- Zero dependencies at runtime; standalone HTML with no network requests (the font is inlined).
- Page-weight budget (`test/render.test.js`) grows by the embedded font only (about 57 KB as base64); nothing else may grow it noticeably.
- Text contrast at least 4.5:1 (AA) in light and dark; reduced motion still removes motion.
- Every existing test passes; markup class names stay (tests and the reply loop rely on them).

## Verification

- `npm test` (Windows: long TEMP/TMP).
- Before/after screenshots of every harness scenario: before from `main` into `.tmp/ui-before`, after into `.tmp/ui-after` (`node test/visual/run.mjs --baselines .tmp/ui-before --output .tmp/ui-after`); every scenario is expected to differ, and each pair is reviewed by eye.
- The Mac baselines all change: after the owner approves the look, regenerate them on the Mac with `npm run visual:update` (record this in `test/visual/PENDING-MAC.md`).
- A fresh reviewer reads the whole diff against this document and the reference files.

## Tasks (native execution, one commit each)

1. Fonts: vendor the two woff2 files and the OFL licence, inline them as `@font-face`, adjust the size budget, credit them in `THIRD_PARTY_NOTICES.md`.
2. Tokens: new default light and dark palettes, font stacks, new tokens; check every named preset.
3. Page chrome: base type, page grain, hero, eyebrow, index, buttons and select, keys, cards.
4. Content blocks: tables and badges, callouts, kv, tree, code, lists and checks, ask options, warnings.
5. Diagrams: `svg.css` (nodes, edges, groups, labels, sequence) and the stage chrome in `page.css` (tools, zoom, menu, minimap, legend, route bar, hover card).
6. Reply drawer, lesson alignment and a dark-mode pass.
7. Verification and docs: screenshots of every scenario, contrast check, README and `PENDING-MAC.md`.
