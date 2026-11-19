# Free sections: the contract

A free section is a hand-made HTML/SVG drawing, made for one piece of content. It sits inside an
ordinary clarify panel and uses clarify's own tokens, so it looks like it belongs.

## How a section works

A section named `name` is:

- `sections/name.html`: a fragment. No `<html>`, `<head>`, `<body>`, `<style>` or `<script>` tags.
- `sections/name.css`: every selector starts with `.fx-name`. Name keyframes `fx-name-...`.
- `sections/name.js` (optional): `root` is the section element. No globals.

`build.mjs` renders `draft.md` with clarify and swaps the marker `@@FREE:name@@` for
`<div class="fx fx-name" data-fx="name">` + your fragment + `</div>`. Your CSS and JS are added to the page.
A JS error in your file is logged to the console and does not stop other sections.

Preview from the repo root:

    node .tmp/spike-free/shot.mjs name

Then Read the PNGs in `.tmp/spike-free/shots/` (`name-1440-light.png`, `name-1440-dark.png`,
`name-390-light.png`). Each one is the whole panel. `shot.mjs` also prints a line like
`⚠ name @390 light: ...` for every problem it finds: a part sticking out of the section, text under 10.5px,
two texts on top of each other, text cut off by `overflow: hidden`, a page error. It also lints your files
(raw colours, unscoped selectors, tags in the fragment, size). Fix each line, or say why it stays.

The whole page, with every section that exists: `node .tmp/spike-free/build.mjs` (writes `page.html`).

Do not edit `build.mjs`, `shot.mjs`, `fx-base.css`, `draft.md` or another author's section.
Report what is missing instead.

How wide is your panel? Inside the panel the section is 410px wide in a one-column panel at 1440px,
878px in a two-column panel and 1346px in a three-column panel. At 390px every panel is 328px.
Your section must work at both 1440px and 390px.

## Rules

1. The section is the explanation. Someone who looks at it for ten seconds gets the point without the text
   around it. Start with one `.fx-how` line
   (`<p class="fx-how"><b>How to read this:</b> ...</p>`) and end with one `.fx-take` takeaway.
2. Colours come only from clarify tokens (`src/runtime/themes.css`). No raw hex, no external images, fonts or
   scripts. It must look right in light and dark.
3. One face: the inherited mono font. Body text 13px, labels 11 to 12px, nothing under 11px on screen.
   SVG text shrinks with the drawing, so check the 390px shot and put a wide drawing in `.fx-scroll`
   with a `min-width`.
4. Shapes match the page: 1.3 to 1.5px outlines in `--node-border`, fills `--node-bg` or `--surface-2`, the hard
   shadow `var(--pop)` on raised things, radius 10px on tiles.
5. Colour means the same thing everywhere: orange (`--trace-0`) is the thing that moves (a report); green
   (`--ok-line`, `--accent`) is an answer or success; red (`--no-line`) is lost or failed; amber (`--warn-line`)
   is slow or waiting; blue (`--trace-1`) is other traffic such as Wi-Fi. Never colour alone: every coloured
   thing also has a label.
6. Motion only inside `@media (prefers-reduced-motion: no-preference)`. The still state tells the whole story
   (screenshots use reduced motion). Loops are slow (2.4 s or more) and nothing flashes.
7. Plain words for a beginner: short sentences, the plain words first and then the term in
   `<b class="fx-term">`.
8. Use only the facts below. Do not add numbers of your own.
9. `<svg role="img" aria-label="...">`; controls are real `<button class="fx-btn">` elements.
10. Keep a section under about 40 KB of HTML+CSS+JS (the mouse drawing may reach 80 KB).

## The kit (`fx-base.css`)

Use these before you write your own. Each is built on tokens, so light and dark come free.

The section

- `.fx`: the section itself (already on your wrapper). A flex column with a 14px gap. It is a size container,
  so `cqi` units and `@container` queries in your CSS measure the section, not the screen.
- `.fx svg`: every SVG is a block, 100% wide, height auto. Give it a `viewBox`.
- `.fx-missing`: the dashed placeholder for a section that is not written yet.

Text

- `.fx-how`: the "How to read this" line, 13px. Its `<b>` lead-in is bold.
- `.fx-take`: the takeaway at the end. A compact green box. The "Takeaway" label is added by the CSS, so write
  only the sentence.
- `.fx-cap`: a caption, 12.5px, muted, at most 72 characters wide.
- `.fx-eyebrow`: a small-caps label (800, 10.5px, uppercase, muted), the same as the page's section heads.
- `.fx-term`: a named term. Bold with the amber highlight the lesson gives `==term==`. Write
  `<b class="fx-term">key matrix</b>`.

Pieces

- `.fx-chip`: a pill like a status badge. Add one of `.is-ok` (green), `.is-warn` (amber), `.is-no` (red),
  `.is-info` (violet), `.is-accent` (the active green) or `.is-hot` (orange, the thing that moves).
- `.fx-tile`: an inner card: 1.3px outline, radius 10px, `--node-bg`, the hard shadow, 12px 14px padding.
- `.fx-num`: a big number, 34 to 64px, scaled to the section width.
- `.fx-unit`: the small unit next to a big number (13px, muted).
- `.fx-btn`: a real button that looks like the page's buttons. `aria-pressed="true"` turns it green with the
  hard shadow. Set the pressed state yourself in JS.
- `.fx-grid-2`, `.fx-grid-3`: grids with equal columns. They drop to one column when the section is under 560px.
- `.fx-scroll`: a box that scrolls sideways. Put a wide drawing inside and give the drawing a `min-width`, or set
  `style="--fx-min: 640px"` on `.fx-scroll`.

SVG shapes (combine them: `class="fx-ink fx-fill"`, `class="fx-ink fx-hot-fill"`)

- `.fx-ink`: an outline: `--node-border`, 1.4px, round joins, no fill.
- `.fx-fill`: fill `--node-bg`. `.fx-fill-2`: fill `--surface-2`.
- `.fx-hot-fill`, `.fx-hot-line`: orange (`--trace-0`), the thing that moves. A soft fill, or a 1.8px stroke.
- `.fx-good-fill`, `.fx-good-line`: green (`--ok-line`), an answer or success.
- `.fx-bad-fill`, `.fx-bad-line`: red (`--no-line`), lost or failed.
- `.fx-slow-fill`, `.fx-slow-line`: amber (`--warn-line`), slow or waiting.
- `.fx-cool-fill`, `.fx-cool-line`: blue (`--trace-1`), other traffic.
- `.fx-leader`: a 1px leader line (`--edge`) from a label to the part it names.
- `.fx-axis`: a 1px axis or ruler line (`--line-ctl`).

SVG text

- `.fx-t`: 600 12px mono, `--text`. For names and values.
- `.fx-t-m`: 500 11px, `--muted`. For notes.
- `.fx-t-h`: 800 10.5px uppercase, `--muted`. For small-caps heads.

Sizes in an SVG are drawing units. A 12px label in a 1000-unit-wide drawing is about 4px on a phone. Draw about as
wide as the section (400 to 900 units), or use `.fx-scroll`.

## Facts

Use only these. Do not add numbers of your own.

**Mouse.** An LED lights the desk at a low angle. A lens puts the surface onto a small image sensor that takes
thousands of pictures a second, each only a few dozen pixels wide. A chip compares each picture with the one
before to get how far the mouse moved left-right and up-down. Clear glass has no texture to photograph. A small
chip packs a report of a few bytes (a basic mouse report is 4 bytes: buttons, left-right, up-down, wheel) and
sends one when you move, click or scroll. Parts inside: LED, lens, image sensor, main chip, radio chip with a
small antenna printed on the circuit board, two button switches, a scroll wheel with its turn sensor, a battery,
an on/off switch. The mouse naps to save power, so a battery can last months; the first move after a nap arrives
a moment late.

**Keyboard.** Under the keys is a grid of wires, the key matrix. The chip powers one row at a time and checks
which columns answer, hundreds of times a second. A pressed key joins its row to its column. The chip waits a few
milliseconds (about 5 ms) for the contacts to stop bouncing. A couple of dozen wires watch over a hundred keys.
The keyboard sends a key code (a position), not a letter: the key in the A position is key code 4, S is 22, D is
7, F is 9. The computer's keyboard layout turns the code into a letter: on the English layout those four type
a s d f; on the Thai layout they type ฟ ห ก ด. A basic keyboard report is 8 bytes. The keyboard reports only
"key down" and later "key up"; the computer does the repeating.

**Radio.** The 2.4 GHz band runs from 2,400 to 2,483.5 MHz and is shared. Wi-Fi channels 1, 6 and 11 sit at
2,412, 2,437 and 2,462 MHz and are each about 20 MHz wide. Bluetooth has 79 channels 1 MHz wide and hops between
them up to 1,600 times a second, skipping channels it finds busy. Many USB receivers pick a quiet channel and
move when it gets noisy. Microwave ovens and USB 3 ports also make noise in this band. Every report expects a
"got it" answer; when none comes the device sends the same report again a moment later.

**Receiver or Bluetooth.** A USB receiver introduces itself as an ordinary wired mouse and keyboard, so it needs
no driver and no pairing, works before the operating system has started (the BIOS or boot menu), and is checked
by the computer 125 or 1,000 times a second; it takes a USB port and is easy to lose. Bluetooth needs no receiver
and no USB port, uses the computer's own radio, must be paired once, usually sends about 125 reports a second,
often does not work until the operating system has loaded, and can also pair with a phone or tablet.

**Time for one key press** (typical sizes; they vary by device). Contacts settle: about 5 ms. Radio trip and
"got it": about 1 ms. Wait for the computer's next check: up to 1 ms at 1,000 checks a second, up to 8 ms at 125.
The computer's own work: a few ms. Wait for the screen's next redraw: up to 16.7 ms on a 60 Hz screen. The radio
is one of the shortest stops; the screen is usually the longest. A blink takes roughly 100 ms or more.

**Problems and where they live.**

- The arrow stutters or jumps: the radio. Noise or distance loses reports. Move the receiver closer, to a front
  USB 2 port or a short extension cable.
- The mouse stops on a glass desk: the sensor. There is no texture. Use a mouse pad.
- Keys type the wrong letters: the keyboard layout on the computer. It switched layouts. Switch back.
- The first move after a break lags: sleep in the mouse. It is waking up. Normal, unless a weak battery makes it
  constant.

## When you finish, report

- The files you wrote.
- The last output of `shot.mjs` for each of your sections.
- At most five bullets on what you needed that the kit or clarify did not give you.
