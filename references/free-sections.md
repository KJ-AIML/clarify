# Free sections

A **free section** is a part of the page you draw by hand, because no block shows it: an HTML fragment with SVG, its own `<style>` and, when it needs one, a `<script>`. It sits inside an ordinary panel. It uses the page's colour tokens and a small shared kit, so it looks like the rest of the page in every theme, light and dark, wide and on a phone.

Read this file before you draw one. For forms that fit a kind of content, see `references/forms.md`. For a whole page built from seven free sections, see `examples/wireless-mouse.md`.

## The two forms

````text
## D A position, not a letter
```free key-code
<p class="fx-how"><b>How to read this:</b> …</p>
<svg viewBox="0 0 320 120" role="img" aria-label="…">…</svg>
<p class="fx-take">…</p>
<style>.fx-key-code .row { … }</style>
<script>root.querySelector(".fx-btn").addEventListener("click", …)</script>
```

## E Inside the mouse {span=3}
```free mouse-parts file=sections/mouse-parts.html
```
````

- **The name** comes right after `free`: lowercase letters, digits and dashes, starting with a letter or digit (`key-code`, `step-2`). It scopes the section: its CSS starts with `.fx-key-code`, its ids and keyframes with `fx-key-code-`. Use each name once per page. Do not give a section the name of a kit class (`how`, `take`, `cap`, `chip`, `tile`, `num`, `bar`, `legend`, `hit`, `dot`, `missing` and the rest under "The kit"): the wrapper is `div.fx.fx-NAME`, so the section would take that class's style, and the lint warns. Do not name one `hatch` either: the kit owns the ids `fx-hatch-ROLE`, and the lint warns about that too.
- **Inline:** the fence body is the fragment.
- **`file=path`** (or `file="a path with spaces"`): the fragment comes from that file, and the fence body is ignored. The path starts from the draft's folder. For a draft read from stdin, it starts from the working directory. Use it for a large or generated drawing. `clarify serve` reloads when the file changes.

## What the renderer does

1. It wraps the fragment in `<div class="fx fx-NAME" data-fx="NAME">`.
2. It moves each `<style>` to the page's head, after the kit, as a style element of its own. A `{` left open spoils only the rest of its own `<style>`, never another section's.
3. It moves every `<script>` to the end of the page, each in its own `<script>`, run once with `root` set to the section element. A `<script src="…">` is dropped without a warning: write the script inline. Each script runs inside its own function, so its `const`s stay local, and one broken section stops nothing. An error thrown while the script runs is caught and logged as `fx NAME: …`; `clarify check` reports it on that section's panel. A script that does not parse, an error thrown later (in a click or a timer) and a load that the page's policy blocks are reported on the page instead (`⚠ page @…`).
4. It adds the kit: `src/runtime/fx.css` and the hatch patterns. Only pages with a free section carry them.
5. A page with a free section loads nothing from the network. A policy in its head allows inline styles and scripts, `data:` fonts, and `data:` and `blob:` images, and nothing else. A plain link (`<a href="https://…">`) is fine: it loads nothing until the reader clicks it.
6. `clarify md` and the page's "Copy as Markdown" keep three things of a section: its "How to read this" line, its takeaway, and a note that the drawing is on the HTML page.

## Rules for authors

1. **The section is the explanation.** A reader who looks at it for ten seconds gets the point. A drawing starts with one "How to read this" line (`<p class="fx-how"><b>How to read this:</b> …</p>`) and ends with one takeaway (`<p class="fx-take">…</p>`; the kit writes the word "Takeaway" above it).
2. **Tokens only.** No raw colours. Write `var(--trace-0)`; make a tint with `color-mix(in srgb, var(--trace-0) 26%, var(--node-bg))`.
3. **One face:** the inherited mono font. Set sizes and weights; in a `font` shorthand, the family is `var(--mono)`.
4. **Nothing under 10.5px on screen** (the check's limit, and the size of the kit's small-caps labels). Body text 13px; labels 11 to 12px. SVG text shrinks with its drawing: see "Sizes in a drawing".
5. **Colour means the same thing everywhere,** and never stands alone: every coloured thing has a label.

   | Role | Token | Means |
   | --- | --- | --- |
   | `hot` | `--trace-0`, orange | the thing that moves (a report, a request) |
   | `good` | `--ok-line`, green | an answer, success |
   | `bad` | `--no-line`, red | lost, failed |
   | `slow` | `--warn-line`, amber | waiting, slow |
   | `cool` | `--trace-1`, blue | other traffic |

6. **Motion only when the reader allows it:** inside `@media (prefers-reduced-motion: no-preference)`. The still state tells the whole story; `clarify check` looks with reduced motion.
7. **Plain words first, then the term:** "a grid of wires, the <b class="fx-term">key matrix</b>".
8. **Only gathered facts.** No numbers of your own.

Also: give every `<svg>` a `viewBox`, `role="img"` and an `aria-label` that says what it shows; make controls real `<button>`s. A section may weigh 40 KB as written.

Other tokens you will need: `--text`, `--muted`, `--title` for text; `--node-bg`, `--surface`, `--surface-2` for fills; `--node-border`, `--ink-2`, `--border`, `--line-ctl`, `--edge` for lines; `--accent` for the active green; `--pop` for the hard shadow. All of them are in `src/runtime/themes.css`.

## The kit

Use these before you write your own. Each is built on tokens, so light and dark come free.

The section

- `.fx`: the section itself (already on the wrapper). A flex column with a 14px gap. It is a size container, so `cqi` units and `@container` queries in your CSS measure the section, not the screen.
- `.fx svg`: every SVG is a block, 100% wide, height auto. Give it a `viewBox`.
- `[hidden]`: always hides inside a section, even over a class that sets `display` (`.fx-btn` does).
- `.fx-wide` and `.fx-phone`: two drawings of one thing. The wide one shows when the section is 560px wide or more, the phone one below that.
- `.fx-missing`: the dashed box the renderer shows for a missing file or a bad name.

Text

- `.fx-how`: the "How to read this" line, 13px; its `<b>` lead-in is bold.
- `.fx-take`: the takeaway, a compact green box. Write only the sentence.
- `.fx-cap`: a caption, 12.5px, muted.
- `.fx-eyebrow`: a small-caps label, 10.5px, like the page's own section heads.
- `.fx-term`: a named term, bold with an amber highlight: `<b class="fx-term">key matrix</b>`. Inside an `.fx-cap` it takes the text colour, so it stays readable on the highlight.

Pieces

- `.fx-chip`: a pill like a status badge. Add `.is-ok` (green), `.is-warn` (amber), `.is-no` (red), `.is-info` (violet), `.is-accent` (the active green), `.is-hot` (orange) or `.is-cool` (blue).
- `.fx-tile`: an inner card with an outline, radius 10px and the hard shadow.
- `.fx-num` and `.fx-unit`: a big number (34 to 64px, scaled to the section) and its small unit.
- `.fx-btn`: a real button that looks like the page's buttons. `aria-pressed="true"` turns it green; set it yourself in the script.
- `.fx-grid-2`, `.fx-grid-3`: equal columns that drop to one column when the section is under 560px.
- `.fx-scroll`: a box that scrolls sideways, for a drawing that cannot shrink. Set `style="--fx-min: 640px"` on it.
- `.fx-bar`: a length (`style="width: 40%"`), 14px tall. Add a role (`.is-hot`, `.is-good`, `.is-bad`, `.is-slow`, `.is-cool`) for a solid bar in that colour, and `.is-varies` for stripes: "up to", or a time that varies. With no role it is plain, and its stripes are ink.
- `.fx-legend` with `.fx-swatch`: a list of what each colour or mark means. A swatch takes the same role classes as a bar; a small `<svg>` works too.
- `.fx-hit`: a see-through button over a drawing, for a click area. Put the drawing in a box with `position: relative`, place each hit with `left`, `top`, `width` and `height` in % of it, and give it an `aria-label`. Its hover tint stays after a tap on a touch screen, so show the chosen state with `aria-pressed` and the drawing, not with the hover.

SVG

- `.fx-ink`: an outline in `--node-border`, 1.4px, round joins. With no fill attribute it fills nothing; combine it with a fill class: `class="fx-ink fx-fill"`.
- `.fx-fill`, `.fx-fill-2`: fill `--node-bg` or `--surface-2`.
- `.fx-ROLE-fill`, `.fx-ROLE-line`, `.fx-ROLE-solid` for each role (`hot`, `good`, `bad`, `slow`, `cool`): a soft tint, a 1.8px stroke, the full colour.
- `fill="url(#fx-hatch-ROLE)"`: hatch a shape in a role colour, for "up to" or "varies" (`class="fx-ink"` keeps the hatch).
- `.fx-leader`: a 1px line from a label to the part it names.
- `.fx-dot`: a numbered callout: `<g class="fx-dot" transform="translate(212 96)"><circle r="9"/><text>1</text></g>`. `.is-on` turns it green.
- `.fx-axis`: a 1px axis or ruler line.
- `.fx-t` (12, names and values), `.fx-t-m` (11, muted notes), `.fx-t-h` (10.5, small-caps heads): SVG text, in drawing units.

## Panel widths

The width of a free section, measured on the current look:

| The panel | at 1440px | at 390px |
| --- | --- | --- |
| one column of a `cols: 3` page | 410px | 328px |
| `span=2` of a `cols: 3` page | 878px | 328px |
| `span=3`, the whole row | 1346px | 328px |
| one column of a `cols: 2` page | 644px | 328px |

A section must work at its width at 1440px and at 328px. Below 960px of window, every panel takes the whole row.

## Sizes in a drawing

SVG sizes are drawing units, and the drawing is scaled to the section's width. A drawing `U` units wide shown `W` pixels wide draws 12-unit text at `12 × W / U` pixels.

- **One drawing for every width:** at most 328 units wide (320 is safe), so one unit is at least one pixel on a phone. Give it a `max-width` (about 420 to 480px), so it does not grow huge in a wide panel.
- **A wide drawing and a phone drawing:** put `.fx-wide` on one and `.fx-phone` on the other. The swap happens at 560px of section width, so draw the wide one at 560 units or fewer (its text never shrinks below its size), and the phone one at about 320.
- **A drawing that cannot shrink:** put it in `.fx-scroll` with a `--fx-min`.
- **Labels beside bars:** put a label beside a solid bar, not on it. A bar shrinks with the panel, and text on a solid role colour fails the contrast check in dark themes.

## The `<use>` trap

An SVG `<use>` copies a shape drawn once in `<defs>`. A selector that needs an ancestor outside the drawing, like `.fx-key-matrix .key rect`, does not reach inside the copy. So paint the shape in `<defs>` with inline styles that read custom properties, `style="fill: var(--km-face, var(--node-bg))"`, and set the property on the `<use>` element with a scoped rule, `.fx-key-matrix .km-key.is-pressed { --km-face: var(--accent); }`. Custom properties inherit into the copy. (The lesson player has the same rule: `src/runtime/lesson.css`, lines 6 to 10.) The ids in `<defs>` need the section's prefix too: `id="fx-key-matrix-key"`, `href="#fx-key-matrix-key"`.

## Every warning and its fix

`render` and `check` read each section as text, the **static lint**. Its lines look like `⚠ panel C: line 56: free "key-code": …`, where the line is the fence's line in the draft.

| Warning | Fix |
| --- | --- |
| `free section needs a name of lowercase letters, digits and dashes ("…")` | Name it after `free`: `free key-code`. |
| `free section "NAME" is used twice on this page; give each one its own name` | Rename one of them. |
| `free section file not found: PATH` | Fix the path: it starts from the draft's folder (from stdin, the working directory). The panel shows a dashed box until then. |
| `free "NAME": the name "NAME" is a kit class (.fx-NAME): the section would take its style; choose another name` | Rename the section: `free colour-key`, not `free legend`. |
| `free "NAME": the name "hatch" belongs to the kit: its hatch patterns are fx-hatch-ROLE; choose another name` | Rename the section. |
| `free "NAME": "<!--" is never closed, so the rest of the page disappears into the comment; close it with "-->"` | Close the comment with `-->`. Until then every panel after it, and the page's own script (theme, replies, Copy as Markdown), is gone; `check` reports those panels as `missing`. |
| `free "NAME": "<script>" is never closed, so the rest of the page disappears into it; close it with "</script>"` (or `"<style>"`) | Close it with its end tag. |
| `free "NAME": "<textarea>" is left open, so the page shows everything after it as text, or hides it; close it with "</textarea>"` (or `title`, `template`, `xmp`, `iframe`, `noscript`) | Close the tag you left open with its end tag; a closed one is fine, and so is a `<title>` inside an `<svg>` (the drawing's own). Until it is closed, every panel after it is gone and `check` reports them as `missing`. |
| `free "NAME": a "{" in a <style> is never closed: the rules after it in that <style> are lost; add the "}"` | Add the missing `}`. Each `<style>` is its own sheet, so the other sections keep their style. |
| `free "NAME": selectors must start with .fx-NAME: …` | Start every rule with `.fx-NAME`: `.fx-NAME .row`, `.fx-NAME.is-on`. Rules inside `@media` and `@container` too; rules nested inside a scoped rule are fine. |
| `free "NAME": @keyframes "X" must start with fx-NAME-` | Rename it `fx-NAME-X`, in `animation` too. |
| `free "NAME": id "X" must start with fx-NAME-` | Rename it `fx-NAME-X`, and every `href="#…"` and `url(#…)` that points to it. |
| `free "NAME": duplicate id "X" on the page` | Give the id another name. |
| `free "NAME": raw colour "…"; use a token such as var(--trace-0)` | Use a token, or a `color-mix()` of tokens. A colour's name (`fill="white"`, `stroke: black`) is a raw colour too: it does not change with the theme. `none`, `currentColor`, `transparent` and `inherit` are fine. |
| `free "NAME": external URL "…"; a page loads nothing from the network` | Draw it inline, or embed it as `data:`. Only things that load warn: images, stylesheets, `url(…)`, `@import`, `<use href>`. A plain link (`<a href>`) does not. A `<script src="…">` is dropped without a warning, so write a section's script inline. |
| `free "NAME": <meta http-equiv="refresh"> reloads the page or leaves it; take it out` | Take it out: a section never moves the reader. |
| `free "NAME": N KB is over the 40 KB budget for a section` | Draw less, draw a repeated shape once and place it with `<use>` (see the `<use>` trap), or split the part into two sections. |

`clarify check` adds what only a browser sees. Its lines look like `⚠ panel D @390 light: overflow: …`.

| Kind | What it means | Fix |
| --- | --- | --- |
| `overflow` | a part sticks out of its panel (`svg sticks out 120px on the right of the panel`) | a `max-width`, a phone drawing, or `.fx-scroll` |
| `small text` | text under 10.5px on screen | bigger text, or a drawing fewer units wide |
| `overlap` | two texts on top of each other | move one; at 390, a phone drawing |
| `clipped` | text cut off by `overflow: hidden` | let the box grow, or let the text wrap |
| `page error` | an exception or a `console.error`; `fx NAME: …` is your script. On the page (`⚠ page @…`), it may also say that a view could not finish: a step ran out of time (it names which: the load, the checks, a picture), or the browser stopped | fix the script; for a time limit, a script that never ends or a page too big to measure |
| `half-empty` | at 1440, the panel's content fills under half of its height; it suggests a `span` | that `span`, or a neighbour panel of similar length |
| `low contrast` | text too faint on its background (it needs 4.5:1, or 3:1 for large text) | `--text` or `--title` for the text, or a lighter fill under it |
| `missing` | a panel of the draft is not on the page: a free section above it left a comment, `<style>`, `<script>` or another tag that swallows the rest of the page open | fix that section; its lint line names what is open, except for `<plaintext>`, `<noembed>` and `<noframes>`, which also swallow the rest of the page and which the lint does not know: with a `missing` panel and no lint line, look in the sections above it for one of those |

## The check loop

```bash
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" check draft.md            # pictures in ~/.clarify/checks/<slug>/
node "${CLAUDE_SKILL_DIR}/bin/clarify.mjs" check draft.md --out dir  # pictures in dir
```

- A draft is rendered first (it does not open), and the static lint comes along. A page (`.html`) is checked as it is, without the lint.
- It opens the page in Chrome or Edge in four views, each with reduced motion: 1440 light, 1440 dark, 390 light, 390 dark. With no browser found it says so and runs only the static lint; set `CHROME_PATH` to point at one. A browser that is found but does not start is reported the same way, with the reason: `⚠ the browser did not start (PATH: the browser exited (code N); set CHROME_PATH to Chrome or Edge): only the static lint ran`. It never ends without a line.
- It saves one picture per panel per view, `<panel>-<width>-<scheme>.png` (`D-390-light.png`), with 8px of room round the card. A new run deletes only its own old pictures. The folder is named after the title; a title with no ASCII letters (Thai, Chinese) gives the draft's file name instead, or a short hash of its path.
- It prints, in this order: the picture paths of the panels with a problem; the lint lines; one line per problem, `⚠ panel D @390 light: kind: …` (`⚠ page @…` when it belongs to the page, not a panel); and a summary line:

```text
✓ check: 8 panels × 4 views, no problems · pictures in C:\Users\you\.clarify\checks\how-a-wireless-mouse-and-keyboard-work
⚠ check: 26 problems in 7 panels · pictures in C:\Users\you\.clarify\checks\check-broken
```

When a problem belongs to the page and not to a panel, the summary says so: `⚠ check: 1 problem on the page · …`, or `⚠ check: 5 problems in 2 panels and the page · …`.

How far to go follows the depth (`SKILL.md`, "Depth and time"):

- **Quick:** one run, on every page. Read the pictures of every panel with a `⚠`, and of the free section's panel when the page has one. Fix what you see in one round, then render again.
- **Designed:** read every panel's pictures. Up to three rounds of fix and check.

Look at the pictures for what the checks cannot see: a leader line that crosses a label, a drawing that says something the facts do not, two sections that look like different products.

## A worked section

A wide drawing, its phone drawing, a legend and a takeaway. It compiles without a warning and passes the check at both widths.

````markdown
## B From your hand to the screen {span=3}
```free signal-path
<p class="fx-how"><b>How to read this:</b> read along the path. Orange is a report on its way; green is the "got it" that comes back.</p>
<svg class="fx-wide" viewBox="0 0 560 84" role="img" aria-label="Hand, mouse, receiver and screen in one row. The mouse sends a report by radio to the receiver, and a got it comes back.">
  <rect class="fx-ink fx-fill" x="1" y="18" width="108" height="48" rx="10"/><text class="fx-t" x="55" y="46" text-anchor="middle">hand</text>
  <path class="fx-ink" d="M113 42H145M139 37L145 42L139 47"/>
  <rect class="fx-ink fx-fill" x="151" y="18" width="108" height="48" rx="10"/><text class="fx-t" x="205" y="46" text-anchor="middle">mouse</text>
  <path class="fx-hot-line" d="M263 34H295M289 29L295 34L289 39" fill="none"/>
  <path class="fx-good-line" d="M295 52H263M269 47L263 52L269 57" fill="none"/>
  <rect class="fx-ink fx-hot-fill" x="301" y="18" width="108" height="48" rx="10"/><text class="fx-t" x="355" y="46" text-anchor="middle">receiver</text>
  <path class="fx-ink" d="M413 42H445M439 37L445 42L439 47"/>
  <rect class="fx-ink fx-fill" x="451" y="18" width="108" height="48" rx="10"/><text class="fx-t" x="505" y="46" text-anchor="middle">screen</text>
</svg>
<svg class="fx-phone" viewBox="0 0 320 236" role="img" aria-label="Hand, mouse, receiver and screen in one column. The mouse sends a report by radio to the receiver, and a got it comes back.">
  <rect class="fx-ink fx-fill" x="60" y="1" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="24" text-anchor="middle">hand</text>
  <path class="fx-ink" d="M160 43V59M155 53L160 59L165 53"/>
  <rect class="fx-ink fx-fill" x="60" y="65" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="88" text-anchor="middle">mouse</text>
  <path class="fx-hot-line" d="M144 107V125M139 119L144 125L149 119" fill="none"/>
  <path class="fx-good-line" d="M176 125V107M171 113L176 107L181 113" fill="none"/>
  <rect class="fx-ink fx-hot-fill" x="60" y="131" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="154" text-anchor="middle">receiver</text>
  <path class="fx-ink" d="M160 173V189M155 183L160 189L165 183"/>
  <rect class="fx-ink fx-fill" x="60" y="195" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="218" text-anchor="middle">screen</text>
</svg>
<ul class="fx-legend">
  <li><span class="fx-swatch is-hot"></span>a report on its way</li>
  <li><span class="fx-swatch is-good"></span>"got it": the answer</li>
</ul>
<p class="fx-take">Every report waits for its "got it". When none comes back, the mouse sends the same report again a moment later.</p>
<style>.fx-signal-path .fx-wide { max-width: 560px; }</style>
```
````
