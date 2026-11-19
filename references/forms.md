# Forms that fit a kind of content

These are examples, not a list to pick from. Each one is a form that fit one part of one page. Name your part's kind first, in your own words (`SKILL.md`, "Think before you draw"). If a form here shows that kind, adapt it to your facts. If none does, draw the form your part needs: the kit and the rules are in `references/free-sections.md`.

Each free form names its **nearest block**: in a Quick page, use that block when the drawing does not fit the time, and say in your reply which part deserves the drawing.

Every snippet below compiles without a warning and passes `clarify check` at 1440px and 390px. The free ones are cut down from `examples/wireless-mouse.md`, which has the full sections.

## A number that matters: big number, small unit, one line of meaning

Fits when a few numbers carry the point: a size, a rate, a count the reader will remember. Each number gets one line that says what it means. Nearest block: `kv`.

````markdown
## B In numbers {span=3}
```free numbers
<ul class="fx-grid-3 nm-list">
  <li><span class="fx-num">4</span> <span class="fx-unit">bytes</span><p class="nm-line">in one basic mouse report: buttons, left-right, up-down, wheel</p></li>
  <li><span class="fx-num">1,000</span><p class="nm-line">times a second a fast receiver is checked for news (125 on a basic one)</p></li>
  <li><span class="fx-num">months</span><p class="nm-line">on one battery, because the mouse naps between moves</p></li>
</ul>
<style>
.fx-numbers .nm-list { list-style: none; margin: 0; padding: 0; }
.fx-numbers .nm-line { margin: 8px 0 0; max-width: 40ch; font-size: 13px; line-height: 1.55; }
</style>
```
````

## A thing with parts: an outline with numbered dots and a legend

Fits when the reader must know what is inside a thing and where each part sits. Number each part on the drawing, and say what it does in the list beside it. Nearest block: `kv` (part: what it does).

````markdown
## C Inside the mouse {span=2}
```free mouse-parts
<p class="fx-how"><b>How to read this:</b> the mouse seen from above, with its shell cut open. Each number points at one part; the list says what it does.</p>
<div class="fx-grid-2">
  <svg viewBox="0 0 320 200" role="img" aria-label="A mouse seen from above, cut open: 1 the LED and lens at the front, 2 the image sensor behind them, 3 the radio chip, 4 the battery at the back.">
    <path class="fx-ink fx-fill" d="M90 10C140 10 160 50 160 90V140C160 175 135 192 90 192C45 192 20 175 20 140V90C20 50 40 10 90 10Z"/>
    <path class="fx-ink" d="M20 70H160M90 10V70"/>
    <circle class="fx-ink fx-hot-fill" cx="90" cy="96" r="10"/>
    <rect class="fx-ink fx-fill-2" x="80" y="113" width="20" height="14" rx="3"/>
    <rect class="fx-ink fx-fill-2" x="46" y="138" width="30" height="16" rx="3"/>
    <rect class="fx-ink fx-fill-2" x="60" y="164" width="60" height="18" rx="4"/>
    <path class="fx-leader" d="M100 96H203M100 120H203M76 146H203M120 173H203"/>
    <g class="fx-dot" transform="translate(212 96)"><circle r="9"/><text>1</text></g>
    <g class="fx-dot" transform="translate(212 120)"><circle r="9"/><text>2</text></g>
    <g class="fx-dot" transform="translate(212 146)"><circle r="9"/><text>3</text></g>
    <g class="fx-dot" transform="translate(212 173)"><circle r="9"/><text>4</text></g>
    <text class="fx-t" x="228" y="100">LED, lens</text>
    <text class="fx-t" x="228" y="124">sensor</text>
    <text class="fx-t" x="228" y="150">radio</text>
    <text class="fx-t" x="228" y="177">battery</text>
  </svg>
  <ol class="mp-list">
    <li><b>LED and lens.</b> Light the desk at a low angle and focus it onto the sensor.</li>
    <li><b>Image sensor.</b> Takes thousands of tiny pictures of the desk a second.</li>
    <li><b>Radio chip.</b> Sends each report through an antenna printed on the board.</li>
    <li><b>Battery.</b> Lasts months, because the mouse naps between moves.</li>
  </ol>
</div>
<p class="fx-take">The mouse never sees your hand. It photographs the desk and sends how far the pictures moved.</p>
<style>
.fx-mouse-parts .fx-grid-2 { align-items: center; }
.fx-mouse-parts svg { max-width: 420px; }
.fx-mouse-parts .mp-list { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.5; }
.fx-mouse-parts .mp-list b { color: var(--title); }
</style>
```
````

## A hidden mechanism: a grid you can press, showing what answers

Fits when something happens out of sight and the reader learns it by trying: press a part, see what answers. The still state shows one press, so the page works without a click. Nearest block: `arch` with a `trace`.

````markdown
## D Inside the keyboard {span=2}
```free key-grid
<p class="fx-how"><b>How to read this:</b> under the keys runs a grid of wires. The chip powers one row at a time (orange). A pressed key joins its row to its column, so that column answers (green). Press a key.</p>
<div class="kg-grid">
  <span></span><span class="fx-chip" data-col="1">col 1</span><span class="fx-chip" data-col="2">col 2</span><span class="fx-chip is-ok" data-col="3">col 3</span>
  <span class="fx-chip" data-row="1">row 1</span><button class="fx-btn" type="button" aria-pressed="false" data-r="1" data-c="1">Q</button><button class="fx-btn" type="button" aria-pressed="false" data-r="1" data-c="2">W</button><button class="fx-btn" type="button" aria-pressed="false" data-r="1" data-c="3">E</button>
  <span class="fx-chip is-hot" data-row="2">row 2</span><button class="fx-btn" type="button" aria-pressed="false" data-r="2" data-c="1">A</button><button class="fx-btn" type="button" aria-pressed="false" data-r="2" data-c="2">S</button><button class="fx-btn" type="button" aria-pressed="true" data-r="2" data-c="3">D</button>
</div>
<p class="fx-cap" aria-live="polite">The chip reads <b class="kg-say">row 2, column 3: the key D</b>.</p>
<p class="fx-take">The chip never watches each key on its own wire. The powered row and the column that answers name the key together.</p>
<style>
.fx-key-grid .kg-grid { display: grid; grid-template-columns: 64px repeat(3, minmax(0, 1fr)); gap: 8px; align-items: center; justify-items: center; max-width: 360px; }
.fx-key-grid .kg-grid .fx-btn { width: 100%; }
</style>
<script>
const keys = [...root.querySelectorAll("button[data-r]")];
const say = root.querySelector(".kg-say");
for (const key of keys) {
  key.addEventListener("click", () => {
    for (const k of keys) k.setAttribute("aria-pressed", String(k === key));
    for (const r of root.querySelectorAll("[data-row]")) r.classList.toggle("is-hot", r.dataset.row === key.dataset.r);
    for (const c of root.querySelectorAll("[data-col]")) c.classList.toggle("is-ok", c.dataset.col === key.dataset.c);
    say.textContent = `row ${key.dataset.r}, column ${key.dataset.c}: the key ${key.textContent}`;
  });
}
</script>
```
````

## A lookup: a table that flips between two settings

Fits when one input gives different answers under different settings, and the point is what changes and what stays. Nearest block: a table with one column per setting.

````markdown
## E A position, not a letter
```free key-code
<p class="fx-how"><b>How to read this:</b> the top row is what the keyboard sends, a key code. The bottom row is the letter you get. Flip the layout: only the bottom row changes.</p>
<div class="kc-flip"><button class="fx-btn" type="button" aria-pressed="true" data-lay="en">English</button><button class="fx-btn" type="button" aria-pressed="false" data-lay="th">Thai</button></div>
<div class="kc-table">
  <span class="fx-eyebrow">key code</span><span class="kc-cell">4</span><span class="kc-cell">22</span><span class="kc-cell">7</span><span class="kc-cell">9</span>
  <span class="fx-eyebrow">letter</span><span class="kc-cell kc-out">a</span><span class="kc-cell kc-out">s</span><span class="kc-cell kc-out">d</span><span class="kc-cell kc-out">f</span>
</div>
<p class="fx-take">The keyboard sends a position, and the computer's layout picks the letter.</p>
<style>
.fx-key-code .kc-flip { display: flex; gap: 8px; }
.fx-key-code .kc-table { display: grid; grid-template-columns: 76px repeat(4, minmax(0, 1fr)); gap: 8px; align-items: center; }
.fx-key-code .kc-cell { display: grid; place-items: center; height: 44px; border: 1.3px solid var(--ink-2); border-radius: 10px; background: var(--node-bg); font-size: 18px; font-weight: 800; color: var(--title); }
.fx-key-code .kc-out { background: color-mix(in srgb, var(--ok-line) 22%, var(--node-bg)); }
</style>
<script>
const LETTERS = { en: ["a", "s", "d", "f"], th: ["ฟ", "ห", "ก", "ด"] };
const outs = [...root.querySelectorAll(".kc-out")];
for (const btn of root.querySelectorAll("[data-lay]")) {
  btn.addEventListener("click", () => {
    for (const b of root.querySelectorAll("[data-lay]")) b.setAttribute("aria-pressed", String(b === btn));
    outs.forEach((el, i) => { el.textContent = LETTERS[btn.dataset.lay][i]; });
  });
}
</script>
```
````

## A shared space: a map of the space and who uses which slice

Fits when several users share one space (a radio band, a budget, a schedule, a shelf) and the trouble comes from where they meet. Draw the space to scale and label each user's slice on it. Nearest block: a table of user and slice.

````markdown
## F The crowded air
```free band
<p class="fx-how"><b>How to read this:</b> the strip is the air around your desk, from 2,400 to 2,483.5 MHz. Each hump is one Wi-Fi channel; the thin bars are Bluetooth's channels.</p>
<svg viewBox="0 0 320 176" role="img" aria-label="The band from 2,400 to 2,483.5 MHz: Wi-Fi channels 1, 6 and 11 as three humps about 20 MHz wide, 79 thin Bluetooth channels under them, and microwave ovens at about 2,450 MHz.">
  <text class="fx-t-m" x="53.4" y="12" text-anchor="middle">about 20 MHz</text>
  <path class="fx-axis" d="M18.9 22H87.9M18.9 18v8M87.9 18v8"/>
  <text class="fx-t-m" x="184.5" y="12" text-anchor="middle">microwave ovens</text>
  <path class="bd-mw" d="M184.5 20V122"/>
  <text class="fx-t" x="53.4" y="44" text-anchor="middle">Wi-Fi 1</text>
  <text class="fx-t" x="139.6" y="44" text-anchor="middle">Wi-Fi 6</text>
  <text class="fx-t" x="225.8" y="44" text-anchor="middle">Wi-Fi 11</text>
  <path class="fx-ink fx-cool-fill" d="M18.9 104C25.8 104 27.5 52 36.1 52H70.6C79.3 52 81 104 87.9 104Z"/>
  <path class="fx-ink fx-cool-fill" d="M105.1 104C112 104 113.7 52 122.4 52H156.9C165.5 52 167.2 104 174.1 104Z"/>
  <path class="fx-ink fx-cool-fill" d="M191.4 104C198.3 104 200 52 208.6 52H243.1C251.7 52 253.4 104 260.3 104Z"/>
  <path class="bd-bt" d="M12 116H300"/>
  <path class="fx-axis" d="M12 130H300M12 130v6M139.6 130v6M300 130v6"/>
  <text class="fx-t" x="12" y="150">2,400</text>
  <text class="fx-t" x="139.6" y="150" text-anchor="middle">2,437</text>
  <text class="fx-t" x="300" y="150" text-anchor="end">2,483.5</text>
  <text class="fx-t-m" x="12" y="170">Bluetooth: 79 channels, 1 MHz each</text>
</svg>
<p class="fx-take">Wi-Fi, Bluetooth and microwave ovens all share this band. A report that lands where Wi-Fi is sending gets lost and is sent again.</p>
<style>
.fx-band svg { max-width: 480px; }
.fx-band .bd-bt { stroke: var(--node-border); stroke-width: 12; stroke-dasharray: 1.6 2; fill: none; }
.fx-band .bd-mw { stroke: var(--edge); stroke-width: 1.2; stroke-dasharray: 3 4; fill: none; }
</style>
```
````

## A choice between two: two columns with the same rows

Fits when the reader must pick one of two, and the answer depends on what they need. Ask the same questions of both, one row each, so the eye runs across. Nearest block: a table with the same rows and `ok`/`warn`/`no` status cells.

````markdown
## G Receiver or Bluetooth? {span=2}
```free radio-choice
<p class="fx-how"><b>How to read this:</b> read each row across: one question, two answers. A green chip is the easy answer, amber is a cost.</p>
<div class="rc-table" role="table" aria-label="USB receiver compared with Bluetooth">
  <div class="rc-row rc-head" role="row"><span class="rc-q" role="columnheader"></span><b role="columnheader">USB receiver</b><b role="columnheader">Bluetooth</b></div>
  <div class="rc-row" role="row"><span class="rc-q" role="rowheader">Set-up</span><span role="cell"><span class="fx-chip is-ok">Nothing to pair</span></span><span role="cell"><span class="fx-chip is-warn">Pair once</span></span></div>
  <div class="rc-row" role="row"><span class="rc-q" role="rowheader">Needs a USB port?</span><span role="cell"><span class="fx-chip is-warn">Yes, one</span></span><span role="cell"><span class="fx-chip is-ok">No</span></span></div>
  <div class="rc-row" role="row"><span class="rc-q" role="rowheader">Works before the system starts?</span><span role="cell"><span class="fx-chip is-ok">Yes</span></span><span role="cell"><span class="fx-chip is-warn">Often not</span></span></div>
</div>
<p class="fx-take">The receiver works from the moment the computer starts; Bluetooth saves a USB port.</p>
<style>
.fx-radio-choice .rc-row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--border); font-size: 13px; }
.fx-radio-choice .rc-head { border-top: 0; color: var(--title); }
.fx-radio-choice .rc-q { font-weight: 700; }
@container (width < 560px) {
  .fx-radio-choice .rc-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .fx-radio-choice .rc-q { grid-column: 1 / -1; }
  .fx-radio-choice .rc-head .rc-q { display: none; }
}
</style>
```
````

## A length of time: a ruler with solid and striped bars

Fits when the point is where the time goes: a few stops in a row, some fixed and some that vary. Draw them on one scale so the long ones look long. Solid is a fixed time; striped is "up to", or varies. Nearest block: a table with a "how long" column.

````markdown
## H One key press, in milliseconds {span=3}
```free time-ruler
<p class="fx-how"><b>How to read this:</b> time runs left to right, from the key press (0) to 35 ms. Each bar is one stop, on one scale. A solid bar is a fixed time; a striped bar is "up to".</p>
<div class="tr-rows">
  <span>Contacts settle · about 5 ms</span><span class="tr-track"><span class="fx-bar" style="width: 14.3%"></span></span>
  <span>Radio trip and "got it" · about 1 ms</span><span class="tr-track"><span class="fx-bar is-hot" style="margin-left: 14.3%; width: 2.9%"></span></span>
  <span>Wait for the next check · up to 8 ms</span><span class="tr-track"><span class="fx-bar is-slow is-varies" style="margin-left: 17.1%; width: 22.9%"></span></span>
  <span>The computer's own work · a few ms</span><span class="tr-track"><span class="fx-bar is-varies" style="margin-left: 40%; width: 8.6%"></span></span>
  <span>Wait for the screen · up to 16.7 ms</span><span class="tr-track"><span class="fx-bar is-slow is-varies" style="margin-left: 48.6%; width: 47.7%"></span></span>
  <span></span><span class="tr-scale"><span style="left: 0">0</span><span style="left: 28.6%">10</span><span style="left: 57.1%">20</span><span style="left: 85.7%">30 ms</span></span>
</div>
<p class="fx-cap">Typical sizes, on a basic receiver and a 60 Hz screen. Real ones vary by device.</p>
<p class="fx-take">The radio is one of the shortest stops; waiting for the screen to redraw is usually the longest.</p>
<style>
.fx-time-ruler .tr-rows { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 10px 14px; align-items: center; font-size: 12px; color: var(--muted); }
.fx-time-ruler .tr-track { display: flex; background: linear-gradient(var(--border), var(--border)) left center / 100% 1px no-repeat; }
.fx-time-ruler .tr-scale { position: relative; height: 16px; font-size: 11px; }
.fx-time-ruler .tr-scale span { position: absolute; top: 0; }
@container (width < 560px) {
  .fx-time-ruler .tr-rows { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .fx-time-ruler .tr-track { margin-bottom: 8px; }
}
</style>
```
````

## A failure and its fix: problems pinned on the path where they live

Fits when the reader has a symptom and needs to know where to look. Draw the path in order, and hang each problem at the stop where it starts, with what to try first. Nearest block: a table of problem, where it lives, and what to try first.

````markdown
## I When something goes wrong {span=3}
```free trouble-path
<p class="fx-how"><b>How to read this:</b> the line is the path from your hand to the screen, in order. Each problem hangs at the stop where it starts. A grey stop has none.</p>
<ol class="tp-path">
  <li class="tp-stop"><b class="tp-name">Mouse</b><div class="fx-tile"><span class="fx-chip is-warn">Common</span><p><b>"It stops on my glass desk."</b> The sensor needs texture to photograph. <b>Try:</b> a mouse pad.</p></div></li>
  <li class="tp-stop"><b class="tp-name">Radio</b><div class="fx-tile"><span class="fx-chip is-warn">Common</span><p><b>"The arrow stutters."</b> Noise or distance loses reports. <b>Try:</b> move the receiver closer.</p></div></li>
  <li class="tp-stop is-quiet"><b class="tp-name">Receiver</b></li>
  <li class="tp-stop"><b class="tp-name">Computer</b><div class="fx-tile"><span class="fx-chip is-ok">Easy fix</span><p><b>"Keys type the wrong letters."</b> The layout switched. <b>Try:</b> switch it back.</p></div></li>
</ol>
<p class="fx-take">Find the stop first, then the fix.</p>
<style>
.fx-trouble-path .tp-path { list-style: none; margin: 0; padding: 0; }
.fx-trouble-path .tp-stop { position: relative; display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 8px 14px; padding: 0 0 14px 24px; }
.fx-trouble-path .tp-stop::before { content: ""; position: absolute; left: 6px; top: 8px; bottom: -8px; border-left: 1.4px solid var(--node-border); }
.fx-trouble-path .tp-stop:last-child::before { display: none; }
.fx-trouble-path .tp-stop::after { content: ""; position: absolute; left: 0; top: 2px; width: 10px; height: 10px; border: 1.3px solid var(--ink-2); border-radius: 50%; background: var(--accent); }
.fx-trouble-path .tp-stop.is-quiet::after { background: var(--surface-2); border-color: var(--line-ctl); }
.fx-trouble-path .tp-name { font-size: 13px; color: var(--title); }
.fx-trouble-path .is-quiet .tp-name { color: var(--muted); }
.fx-trouble-path .fx-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; max-width: 560px; }
.fx-trouble-path .fx-tile p { margin: 0; font-size: 13px; line-height: 1.5; }
@container (width < 560px) {
  .fx-trouble-path .tp-stop { grid-template-columns: minmax(0, 1fr); }
}
</style>
```
````

## Something moving between places over time: a `lesson`

Fits when the reader must follow one thing through several places, step by step: a request through a network, a change through Git, a job through a queue. A block: the page draws the places as objects, and the reader steps with Back and Next. Every place is a kind that is that thing. Syntax: the Lessons section of `SKILL.md`.

````markdown
## J One page load {span=3}
```lesson How a Page Loads
subtitle: Follow one click from the browser to the database and back.
meta: 3 min · Beginner
places: me = laptop "Your laptop" | web = server "Web server" | db = database "Pages"
rails: me - web - db

step Ask: The browser asks for the page [how]
  You click a link. The browser sends a ==request== to the web server.
  tip Key idea: The browser only asks; the server does the work.
  move: me -> web
  focus: web

step Answer: The server reads and replies [how]
  The server reads the page from the database and sends it back to you.
  move: web <-> db, web -> me
  focus: me

quiz Who stores the page?
  * The database | the server reads it from there
  - The browser | it only shows what comes back
```
````

## A structure: an `arch` map, or a `tree`

Fits when the parts and how they connect are the point: services and their calls, folders and what lives in them. An `arch` map with a `trace` narrates the one path that matters; a `tree` shows nesting. Blocks.

````markdown
## K The path of one photo {span=2}
**How to read this map:** boxes are services, arrows are calls, the dashed arrow is a message that waits in a queue.
```arch LR
[Phone app:react] -> [Upload API:go]: POST /photos
[Upload API] -> [(Photos:postgres)]: save
[Upload API] --> [Resize jobs:redis]: PhotoAdded
[Upload API] { desc: Checks the photo and stores it; status: ok }
trace "One photo" {
  Phone app -> Upload API: The app sends the photo.
  Upload API -> Photos: The photo is saved.
  Upload API -> Resize jobs: A job asks for the small copies.
}
```

## L Where the code lives {span=3}
```tree
app/
  upload/ | takes photos in
  resize/ | makes the small copies
  web/ | the pages people see
```
````

## A decision for the reader: an `ask`

Fits when the page ends in a choice the reader has to make. The suggested option comes first, and every option carries its reason after `|`. A block: the reader's answer comes back to you in the reply loop.

````markdown
## M What we decide
```ask
Which mice should the office buy?
* With a USB receiver | they work in the boot menu and need no pairing
- Bluetooth only | they save a USB port and pair with phones too
```
````

## Events in order: an incident timeline

Fits a post-mortem, a history, any story where *when* matters: what broke, when someone noticed, when it was fixed. Put the whole incident on one scale first, so the reader sees where the time went, then each event with its time. Nearest block: a table of time and event.

````markdown
## N What happened, and when {span=2}
```free incident
<p class="fx-how"><b>How to read this:</b> the bar is the whole outage on one scale. Below it, time runs down; each dot is one event, coloured by what it did: red broke, amber waited, green fixed.</p>
<div class="ic-strip" role="img" aria-label="47 minutes in all: 31 minutes before anyone knew, 9 minutes to find the cause, 7 minutes to fix it.">
  <span class="fx-bar is-slow" style="width: 66%"></span><span class="fx-bar" style="width: 19%"></span><span class="fx-bar is-good" style="width: 15%"></span>
</div>
<ul class="fx-legend">
  <li><span class="fx-swatch is-slow"></span>31 min: nobody knew</li>
  <li><span class="fx-swatch"></span>9 min: finding the cause</li>
  <li><span class="fx-swatch is-good"></span>7 min: fixing it</li>
</ul>
<ol class="ic-list">
  <li class="is-bad"><time>02:00</time><span class="ic-dot"></span><p><b>Breaks:</b> the sign-in certificate expires, and every sign-in fails.</p></li>
  <li class="is-slow"><time>02:31</time><span class="ic-dot"></span><p><b>Noticed:</b> an alert fires on sign-in errors and pages the on-call engineer.</p></li>
  <li class="is-slow"><time>02:40</time><span class="ic-dot"></span><p><b>Cause found:</b> the certificate expired at 02:00.</p></li>
  <li class="is-good"><time>02:47</time><span class="ic-dot"></span><p><b>Fixed:</b> a new certificate is in place; sign-ins work again.</p></li>
</ol>
<p class="fx-take">Sign-ins were down for 47 minutes, and for 31 of them nobody knew. Noticing took longer than fixing.</p>
<style>
.fx-incident .ic-strip { display: flex; }
.fx-incident .ic-strip .fx-bar { height: 16px; border-radius: 0; }
.fx-incident .ic-strip .fx-bar:first-child { border-radius: 4px 0 0 4px; }
.fx-incident .ic-strip .fx-bar:last-child { border-radius: 0 4px 4px 0; }
.fx-incident .ic-list { list-style: none; margin: 0; padding: 0; }
.fx-incident .ic-list li { position: relative; display: grid; grid-template-columns: 46px 12px minmax(0, 1fr); gap: 10px; padding-bottom: 14px; font-size: 13px; line-height: 1.5; }
.fx-incident .ic-list li:not(:last-child)::before { content: ""; position: absolute; left: 61.3px; top: 14px; bottom: 0; border-left: 1.4px solid var(--node-border); }
.fx-incident .ic-list time { font-weight: 800; color: var(--title); font-variant-numeric: tabular-nums; }
.fx-incident .ic-dot { width: 12px; height: 12px; margin-top: 4px; border: 1.3px solid var(--ink-2); border-radius: 50%; background: var(--node-bg); }
.fx-incident .is-bad .ic-dot { background: var(--no-line); }
.fx-incident .is-slow .ic-dot { background: var(--warn-line); }
.fx-incident .is-good .ic-dot { background: var(--ok-line); }
.fx-incident .ic-list p { margin: 0; }
</style>
```
````
