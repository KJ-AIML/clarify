---
title: How a Wireless Mouse and Keyboard Work
subtitle: Follow one mouse move and one key press from your hand to the screen
eyebrow: Device explainer
theme: auto
cols: 3
---

Lead: Neither device draws anything on screen. Each one sends a few bytes by radio to a small receiver, and the computer turns them into a moving arrow or a letter.

## A Why this matters {span=3}
You use a mouse and keyboard all day, and only think about them when something goes wrong: the arrow stutters, a key types the wrong letter, the mouse stops on a glass desk. Each of those problems lives at one stop on the path below, so knowing the path tells you where to look.

## B In numbers {span=3}
```free numbers
<ul class="stats">
  <li class="stat">
    <div class="big"><span class="fx-num">thousands</span></div>
    <p class="line">of desk photos a second, taken by the mouse's sensor</p>
  </li>
  <li class="stat">
    <div class="big"><span class="fx-num">4</span> <span class="fx-unit">bytes</span></div>
    <p class="line">in one basic mouse report: buttons, left-right, up-down, wheel</p>
  </li>
  <li class="stat">
    <div class="big"><span class="fx-num">1,000</span></div>
    <p class="line">times a second a fast receiver is checked for news (125 on a basic one)</p>
  </li>
  <li class="stat">
    <div class="big"><span class="fx-num">months</span></div>
    <p class="line">on one battery, because the mouse naps between moves</p>
  </li>
</ul>
<style>
.fx-numbers .stats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.fx-numbers .stat { padding: 14px 0 15px; border-top: 1px solid var(--border); }
.fx-numbers .stat:first-child { padding-top: 2px; border-top: 0; }
.fx-numbers .stat:last-child { padding-bottom: 0; }
.fx-numbers .big { display: flex; align-items: baseline; gap: 8px; }
.fx-numbers .line { margin: 8px 0 0; max-width: 40ch; font-size: 13px; line-height: 1.55; color: var(--text); text-wrap: pretty; }

/* Wide section (a three-column panel, or two): one row of four equal columns, a vertical hairline between them. */
@container (width >= 700px) {
  .fx-numbers .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .fx-numbers .stat,
  .fx-numbers .stat:first-child,
  .fx-numbers .stat:last-child { padding: 2px 18px 0; border-top: 0; border-left: 1px solid var(--border); }
  .fx-numbers .stat:first-child { padding-left: 0; border-left: 0; }
  .fx-numbers .fx-num { font-size: clamp(26px, 3.7cqi, 52px); }
  .fx-numbers .line { max-width: none; }
}
</style>
```

## C Inside the keyboard {span=2}
```free key-matrix
<p class="fx-how"><b>How to read this:</b> the chip at the bottom powers one row wire at a time (orange). A pressed key closes its little switch, so its column wire answers (green). Click any key to press it.</p>
<div class="km-art km-wide" data-w="860" data-h="404" data-kw="42" data-kh="38"><svg viewBox="0 0 860 404" role="img" aria-label="A key matrix: 4 row wires and 6 column wires with a key switch at each of the 24 crossings, wired to the keyboard chip. The chip is powering row 2. The key at row 2, column 3 is pressed, so column 3 answers and the chip reads row 2, column 3. All other switches are open."><defs><g id="fx-key-matrix-key-wide"><rect style="fill:var(--drop);opacity:var(--km-sh,1)" x="1.5" y="2.5" width="42" height="38" rx="6"/><rect style="fill:var(--km-face,var(--node-bg));stroke:var(--km-edge,var(--node-border));stroke-width:1.3;transform:translate(var(--km-dx,0px),var(--km-dy,0px))" width="42" height="38" rx="6"/><path style="fill:none;stroke:var(--km-rl,var(--node-border));stroke-width:var(--km-rlw,1.3)" d="M12 -12V25"/><path style="fill:none;stroke:var(--km-cl,var(--node-border));stroke-width:var(--km-clw,1.3)" d="M30 25H56"/><path style="fill:none;stroke:var(--km-bl,var(--node-border));stroke-width:2;stroke-linecap:round;transform-box:fill-box;transform-origin:0 50%;transform:rotate(var(--km-rot,-36deg))" d="M12 25H30"/><circle style="fill:var(--node-bg);stroke:var(--km-ctl,var(--node-border));stroke-width:1.3" cx="12" cy="25" r="2.6"/><circle style="fill:var(--node-bg);stroke:var(--km-ctl,var(--node-border));stroke-width:1.3" cx="30" cy="25" r="2.6"/></g></defs><g class="km-row" data-row="0" data-y="56"><path class="km-w" d="M26 330V56H572"/><rect class="km-pin" x="23" y="325" width="6" height="5"/><text class="km-lab" x="76" y="50">row 1</text></g><g class="km-row is-on" data-row="1" data-y="120"><path class="km-w" d="M39 330V120H572"/><rect class="km-pin" x="36" y="325" width="6" height="5"/><text class="km-lab" x="76" y="114">row 2</text></g><g class="km-row" data-row="2" data-y="184"><path class="km-w" d="M52 330V184H572"/><rect class="km-pin" x="49" y="325" width="6" height="5"/><text class="km-lab" x="76" y="178">row 3</text></g><g class="km-row" data-row="3" data-y="248"><path class="km-w" d="M65 330V248H572"/><rect class="km-pin" x="62" y="325" width="6" height="5"/><text class="km-lab" x="76" y="242">row 4</text></g><g class="km-col" data-col="0" data-x="216"><path class="km-w" d="M216 40V51.5a4.5 4.5 0 0 1 0 9V115.5a4.5 4.5 0 0 1 0 9V179.5a4.5 4.5 0 0 1 0 9V243.5a4.5 4.5 0 0 1 0 9V330"/><rect class="km-pin" x="213" y="325" width="6" height="5"/><text class="km-lab" x="216" y="30" text-anchor="middle">col 1</text></g><g class="km-col" data-col="1" data-x="296"><path class="km-w" d="M296 40V51.5a4.5 4.5 0 0 1 0 9V115.5a4.5 4.5 0 0 1 0 9V179.5a4.5 4.5 0 0 1 0 9V243.5a4.5 4.5 0 0 1 0 9V330"/><rect class="km-pin" x="293" y="325" width="6" height="5"/><text class="km-lab" x="296" y="30" text-anchor="middle">col 2</text></g><g class="km-col is-ans" data-col="2" data-x="376"><path class="km-w" d="M376 40V51.5a4.5 4.5 0 0 1 0 9V115.5a4.5 4.5 0 0 1 0 9V179.5a4.5 4.5 0 0 1 0 9V243.5a4.5 4.5 0 0 1 0 9V330"/><rect class="km-pin" x="373" y="325" width="6" height="5"/><text class="km-lab" x="376" y="30" text-anchor="middle">col 3</text></g><g class="km-col" data-col="3" data-x="456"><path class="km-w" d="M456 40V51.5a4.5 4.5 0 0 1 0 9V115.5a4.5 4.5 0 0 1 0 9V179.5a4.5 4.5 0 0 1 0 9V243.5a4.5 4.5 0 0 1 0 9V330"/><rect class="km-pin" x="453" y="325" width="6" height="5"/><text class="km-lab" x="456" y="30" text-anchor="middle">col 4</text></g><g class="km-col" data-col="4" data-x="536"><path class="km-w" d="M536 40V51.5a4.5 4.5 0 0 1 0 9V115.5a4.5 4.5 0 0 1 0 9V179.5a4.5 4.5 0 0 1 0 9V243.5a4.5 4.5 0 0 1 0 9V330"/><rect class="km-pin" x="533" y="325" width="6" height="5"/><text class="km-lab" x="536" y="30" text-anchor="middle">col 5</text></g><g class="km-col" data-col="5" data-x="616"><path class="km-w" d="M616 40V51.5a4.5 4.5 0 0 1 0 9V115.5a4.5 4.5 0 0 1 0 9V179.5a4.5 4.5 0 0 1 0 9V243.5a4.5 4.5 0 0 1 0 9V330"/><rect class="km-pin" x="613" y="325" width="6" height="5"/><text class="km-lab" x="616" y="30" text-anchor="middle">col 6</text></g><use href="#fx-key-matrix-key-wide" class="km-key" data-r="0" data-c="0" x="160" y="68"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="0" data-c="1" x="240" y="68"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="0" data-c="2" x="320" y="68"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="0" data-c="3" x="400" y="68"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="0" data-c="4" x="480" y="68"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="0" data-c="5" x="560" y="68"/><use href="#fx-key-matrix-key-wide" class="km-key is-live" data-r="1" data-c="0" x="160" y="132"/><use href="#fx-key-matrix-key-wide" class="km-key is-live" data-r="1" data-c="1" x="240" y="132"/><use href="#fx-key-matrix-key-wide" class="km-key is-live is-pressed is-ans" data-r="1" data-c="2" x="320" y="132"/><use href="#fx-key-matrix-key-wide" class="km-key is-live" data-r="1" data-c="3" x="400" y="132"/><use href="#fx-key-matrix-key-wide" class="km-key is-live" data-r="1" data-c="4" x="480" y="132"/><use href="#fx-key-matrix-key-wide" class="km-key is-live" data-r="1" data-c="5" x="560" y="132"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="2" data-c="0" x="160" y="196"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="2" data-c="1" x="240" y="196"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="2" data-c="2" x="320" y="196"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="2" data-c="3" x="400" y="196"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="2" data-c="4" x="480" y="196"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="2" data-c="5" x="560" y="196"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="3" data-c="0" x="160" y="260"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="3" data-c="1" x="240" y="260"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="3" data-c="2" x="320" y="260"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="3" data-c="3" x="400" y="260"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="3" data-c="4" x="480" y="260"/><use href="#fx-key-matrix-key-wide" class="km-key" data-r="3" data-c="5" x="560" y="260"/><g class="km-chip"><rect class="km-chip-sh" x="16" y="333" width="616" height="66" rx="7"/><rect class="km-chip-body" x="14" y="330" width="616" height="66" rx="7"/><circle class="km-chip-dot" cx="24" cy="386" r="2.6"/><text class="km-head" x="84" y="356">Keyboard chip</text><text class="km-note" x="84" y="374">powers rows, listens to columns</text></g><path class="km-trace" d="M376 330V348H430" data-top="330" data-dy="18" data-bx="430" data-by="338"/><g class="km-read is-ans"><rect class="km-read-box" x="430" y="338" width="192" height="48" rx="6"/><text class="km-head" x="440" y="355">Chip reads</text><text class="km-read-t" x="440" y="374">row 2, column 3</text></g><g class="km-badge km-b1 km-mark" data-x="128" style="transform:translate(128px,120px)"><circle r="9"/><text y="4" text-anchor="middle">1</text></g><g class="km-badge km-b2 km-mark" data-dx="-3" data-dy="-1" style="transform:translate(317px,131px)"><circle r="9"/><text y="4" text-anchor="middle">2</text></g><g class="km-badge km-b3 km-mark" data-y="314" style="transform:translate(376px,314px)"><circle r="9"/><text y="4" text-anchor="middle">3</text></g><g class="km-say-g"><g class="km-badge km-b1" style="transform:translate(656px,120px)"><circle r="9"/><text y="4" text-anchor="middle">1</text></g><text class="km-say" x="673" y="124"><tspan x="673" dy="0">The chip powers one</tspan><tspan x="673" dy="16">row at a time.</tspan></text></g><g class="km-say-g"><g class="km-badge km-b2" style="transform:translate(656px,208px)"><circle r="9"/><text y="4" text-anchor="middle">2</text></g><text class="km-say" x="673" y="212"><tspan x="673" dy="0">A pressed key joins</tspan><tspan x="673" dy="16">its row to its column.</tspan></text></g><g class="km-say-g"><g class="km-badge km-b3" style="transform:translate(656px,296px)"><circle r="9"/><text y="4" text-anchor="middle">3</text></g><text class="km-say" x="673" y="300"><tspan x="673" dy="0">That column answers</tspan><tspan x="673" dy="16">back to the chip.</tspan></text></g></svg></div>
<div class="km-art km-narrow" data-w="328" data-h="398" data-kw="26" data-kh="24"><svg viewBox="0 0 328 398" role="img" aria-label="A key matrix: 4 row wires and 6 column wires with a key switch at each of the 24 crossings, wired to the keyboard chip. The chip is powering row 2. The key at row 2, column 3 is pressed, so column 3 answers and the chip reads row 2, column 3. All other switches are open."><defs><g id="fx-key-matrix-key-narrow"><rect style="fill:var(--drop);opacity:var(--km-sh,1)" x="1.5" y="2.5" width="26" height="24" rx="4.5"/><rect style="fill:var(--km-face,var(--node-bg));stroke:var(--km-edge,var(--node-border));stroke-width:1.3;transform:translate(var(--km-dx,0px),var(--km-dy,0px))" width="26" height="24" rx="4.5"/><path style="fill:none;stroke:var(--km-rl,var(--node-border));stroke-width:var(--km-rlw,1.3)" d="M7 -8V15"/><path style="fill:none;stroke:var(--km-cl,var(--node-border));stroke-width:var(--km-clw,1.3)" d="M19 15H30"/><path style="fill:none;stroke:var(--km-bl,var(--node-border));stroke-width:2;stroke-linecap:round;transform-box:fill-box;transform-origin:0 50%;transform:rotate(var(--km-rot,-36deg))" d="M7 15H19"/><circle style="fill:var(--node-bg);stroke:var(--km-ctl,var(--node-border));stroke-width:1.3" cx="7" cy="15" r="2.1"/><circle style="fill:var(--node-bg);stroke:var(--km-ctl,var(--node-border));stroke-width:1.3" cx="19" cy="15" r="2.1"/></g></defs><g class="km-row" data-row="0" data-y="44"><path class="km-w" d="M8 222V44H293"/><rect class="km-pin" x="5" y="217" width="6" height="5"/><text class="km-lab" x="38" y="40">row 1</text></g><g class="km-row is-on" data-row="1" data-y="84"><path class="km-w" d="M16 222V84H293"/><rect class="km-pin" x="13" y="217" width="6" height="5"/><text class="km-lab" x="38" y="80">row 2</text></g><g class="km-row" data-row="2" data-y="124"><path class="km-w" d="M24 222V124H293"/><rect class="km-pin" x="21" y="217" width="6" height="5"/><text class="km-lab" x="38" y="120">row 3</text></g><g class="km-row" data-row="3" data-y="164"><path class="km-w" d="M32 222V164H293"/><rect class="km-pin" x="29" y="217" width="6" height="5"/><text class="km-lab" x="38" y="160">row 4</text></g><g class="km-col" data-col="0" data-x="126"><path class="km-w" d="M126 34V40a4 4 0 0 1 0 8V80a4 4 0 0 1 0 8V120a4 4 0 0 1 0 8V160a4 4 0 0 1 0 8V222"/><rect class="km-pin" x="123" y="217" width="6" height="5"/><text class="km-lab" x="126" y="26" text-anchor="middle">1</text></g><g class="km-col" data-col="1" data-x="164"><path class="km-w" d="M164 34V40a4 4 0 0 1 0 8V80a4 4 0 0 1 0 8V120a4 4 0 0 1 0 8V160a4 4 0 0 1 0 8V222"/><rect class="km-pin" x="161" y="217" width="6" height="5"/><text class="km-lab" x="164" y="26" text-anchor="middle">2</text></g><g class="km-col is-ans" data-col="2" data-x="202"><path class="km-w" d="M202 34V40a4 4 0 0 1 0 8V80a4 4 0 0 1 0 8V120a4 4 0 0 1 0 8V160a4 4 0 0 1 0 8V222"/><rect class="km-pin" x="199" y="217" width="6" height="5"/><text class="km-lab" x="202" y="26" text-anchor="middle">3</text></g><g class="km-col" data-col="3" data-x="240"><path class="km-w" d="M240 34V40a4 4 0 0 1 0 8V80a4 4 0 0 1 0 8V120a4 4 0 0 1 0 8V160a4 4 0 0 1 0 8V222"/><rect class="km-pin" x="237" y="217" width="6" height="5"/><text class="km-lab" x="240" y="26" text-anchor="middle">4</text></g><g class="km-col" data-col="4" data-x="278"><path class="km-w" d="M278 34V40a4 4 0 0 1 0 8V80a4 4 0 0 1 0 8V120a4 4 0 0 1 0 8V160a4 4 0 0 1 0 8V222"/><rect class="km-pin" x="275" y="217" width="6" height="5"/><text class="km-lab" x="278" y="26" text-anchor="middle">5</text></g><g class="km-col" data-col="5" data-x="316"><path class="km-w" d="M316 34V40a4 4 0 0 1 0 8V80a4 4 0 0 1 0 8V120a4 4 0 0 1 0 8V160a4 4 0 0 1 0 8V222"/><rect class="km-pin" x="313" y="217" width="6" height="5"/><text class="km-lab" x="316" y="26" text-anchor="middle">6</text></g><text class="km-head" x="114" y="26" text-anchor="end">col</text><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="0" data-c="0" x="96" y="52"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="0" data-c="1" x="134" y="52"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="0" data-c="2" x="172" y="52"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="0" data-c="3" x="210" y="52"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="0" data-c="4" x="248" y="52"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="0" data-c="5" x="286" y="52"/><use href="#fx-key-matrix-key-narrow" class="km-key is-live" data-r="1" data-c="0" x="96" y="92"/><use href="#fx-key-matrix-key-narrow" class="km-key is-live" data-r="1" data-c="1" x="134" y="92"/><use href="#fx-key-matrix-key-narrow" class="km-key is-live is-pressed is-ans" data-r="1" data-c="2" x="172" y="92"/><use href="#fx-key-matrix-key-narrow" class="km-key is-live" data-r="1" data-c="3" x="210" y="92"/><use href="#fx-key-matrix-key-narrow" class="km-key is-live" data-r="1" data-c="4" x="248" y="92"/><use href="#fx-key-matrix-key-narrow" class="km-key is-live" data-r="1" data-c="5" x="286" y="92"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="2" data-c="0" x="96" y="132"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="2" data-c="1" x="134" y="132"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="2" data-c="2" x="172" y="132"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="2" data-c="3" x="210" y="132"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="2" data-c="4" x="248" y="132"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="2" data-c="5" x="286" y="132"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="3" data-c="0" x="96" y="172"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="3" data-c="1" x="134" y="172"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="3" data-c="2" x="172" y="172"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="3" data-c="3" x="210" y="172"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="3" data-c="4" x="248" y="172"/><use href="#fx-key-matrix-key-narrow" class="km-key" data-r="3" data-c="5" x="286" y="172"/><g class="km-chip"><rect class="km-chip-sh" x="5" y="225" width="321" height="70" rx="7"/><rect class="km-chip-body" x="3" y="222" width="321" height="70" rx="7"/><circle class="km-chip-dot" cx="13" cy="282" r="2.6"/><text class="km-head" x="42" y="248">Keyboard chip</text><text class="km-note" x="42" y="266">powers rows,</text><text class="km-note" x="42" y="282">reads columns</text></g><path class="km-trace" d="M202 222V230" data-top="222" data-dy="14" data-bx="168" data-by="230"/><g class="km-read is-ans"><rect class="km-read-box" x="168" y="230" width="150" height="48" rx="6"/><text class="km-head" x="178" y="247">Chip reads</text><text class="km-read-t" x="178" y="266">row 2, column 3</text></g><g class="km-badge km-b1 km-mark" data-x="82" style="transform:translate(82px,84px)"><circle r="8"/><text y="4" text-anchor="middle">1</text></g><g class="km-badge km-b2 km-mark" data-dx="-2" data-dy="-1" style="transform:translate(170px,91px)"><circle r="8"/><text y="4" text-anchor="middle">2</text></g><g class="km-badge km-b3 km-mark" data-y="209" style="transform:translate(202px,209px)"><circle r="8"/><text y="4" text-anchor="middle">3</text></g><g class="km-say-g"><g class="km-badge km-b1" style="transform:translate(11px,320px)"><circle r="8"/><text y="4" text-anchor="middle">1</text></g><text class="km-say" x="27" y="324"><tspan x="27" dy="0">The chip powers one row at a time.</tspan></text></g><g class="km-say-g"><g class="km-badge km-b2" style="transform:translate(11px,346px)"><circle r="8"/><text y="4" text-anchor="middle">2</text></g><text class="km-say" x="27" y="350"><tspan x="27" dy="0">A pressed key joins its row</tspan><tspan x="27" dy="16">to its column.</tspan></text></g><g class="km-say-g"><g class="km-badge km-b3" style="transform:translate(11px,388px)"><circle r="8"/><text y="4" text-anchor="middle">3</text></g><text class="km-say" x="27" y="392"><tspan x="27" dy="0">That column answers back to the chip.</tspan></text></g></svg></div>
<div class="km-bar"><p class="fx-cap">The open switches on the powered row get power but have a gap: nothing reaches their columns. Only the pressed key closes the gap.</p><button class="fx-btn km-pause" type="button" aria-pressed="false" hidden>Pause the scan</button></div>
<div class="fx-grid-2 km-pair">
  <div class="fx-tile km-count">
    <p class="fx-eyebrow">Count the wires</p>
    <p class="km-eqs"><span class="km-op">4 rows + 6 columns =</span><span class="fx-num">10</span><span class="fx-unit">wires</span><span class="km-op">4 rows × 6 columns =</span><span class="fx-num">24</span><span class="fx-unit">keys</span></p>
    <p class="km-line"><b>4 + 6 = 10 wires watch 24 keys.</b> Wires add up, keys multiply: every row crosses every column, and a key sits at each crossing.</p>
    <p class="fx-cap">A real keyboard does the same at full size: a couple of dozen wires watch over a hundred keys.</p>
  </div>
  <div class="fx-tile km-bounce">
    <p class="fx-eyebrow">Bounce</p>
    <svg class="km-sig" viewBox="0 0 300 112" role="img" aria-label="A signal line: when the key goes down, the contacts bounce between open and closed a few times, then hold closed. The chip waits about 5 ms, then counts one press."><path class="fx-axis" d="M50 26H296M50 70H296" stroke-dasharray="2 4"/><text class="km-note" x="0" y="30">closed</text><text class="km-note" x="0" y="74">open</text><g class="km-sig-draw"><path class="km-sig-line" d="M50 70H96V26H101V58H105V26H110V48H113V26H118V38H120V26H176"/><path class="fx-good-line" d="M176 26H296" fill="none"/><circle class="km-sig-dot" cx="176" cy="26" r="4"/><text class="km-t" x="184" y="16">1 press counted</text></g><text class="km-t" x="96" y="12" text-anchor="middle">press</text><path class="fx-slow-line" d="M96 82V88H176V82" fill="none"/><text class="km-note" x="96" y="104">chip waits about 5 ms</text></svg>
    <p class="fx-cap">Metal contacts <b class="fx-term">bounce</b> for a moment when they close. The chip waits about 5 ms for them to settle, then counts one press.</p>
  </div>
</div>
<p class="fx-take">The chip never watches every key on its own wire. It powers one row at a time and listens for the column that answers: the row and the column together name the key.</p>
<style>
/* key-matrix: the grid of wires under the keys, with the chip that scans it. */

/* two drawings of the same matrix: wide for the two-column panel, narrow for phones */
.fx-key-matrix .km-art { position: relative; }
.fx-key-matrix .km-narrow { display: none; }
@container (width < 600px) {
  .fx-key-matrix .km-wide { display: none; }
  .fx-key-matrix .km-narrow { display: block; }
}

/* wires, pins and their labels */
.fx-key-matrix .km-w { fill: none; stroke: var(--node-border); stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; }
.fx-key-matrix .km-pin { fill: var(--node-border); }
.fx-key-matrix .km-row.is-on .km-w { stroke: var(--trace-0); stroke-width: 2.6; }
.fx-key-matrix .km-row.is-on .km-pin { fill: var(--trace-0); }
.fx-key-matrix .km-col.is-ans .km-w { stroke: var(--ok-line); stroke-width: 2.6; }
.fx-key-matrix .km-col.is-ans .km-pin { fill: var(--ok-line); }
.fx-key-matrix .km-lab { font: 600 11px var(--mono); fill: var(--muted); }
.fx-key-matrix .km-row.is-on .km-lab,
.fx-key-matrix .km-col.is-ans .km-lab { font-weight: 800; fill: var(--title); }
.fx-key-matrix .km-head { font: 800 11px var(--mono); letter-spacing: 0.08em; text-transform: uppercase; fill: var(--muted); }
.fx-key-matrix .km-note { font: 500 11px var(--mono); fill: var(--muted); }
.fx-key-matrix .km-t { font: 600 11px var(--mono); fill: var(--text); }
.fx-key-matrix .km-say { font: 500 12px var(--mono); fill: var(--text); }

/* a key: drawn once in <defs> with inline paint; each <use> passes its state in through these custom properties */
.fx-key-matrix .km-key.is-pressed { --km-rot: 0deg; --km-face: var(--accent); --km-edge: var(--ink-2); --km-sh: 0; --km-dx: 1px; --km-dy: 1.5px; --km-bl: var(--ink-2); --km-ctl: var(--ink-2); }
.fx-key-matrix .km-key.is-live { --km-rl: var(--trace-0); --km-rlw: 2.2; --km-bl: var(--trace-0); }
.fx-key-matrix .km-key.is-ans { --km-cl: var(--ok-line); --km-clw: 2.2; }

/* the chip, the answer trace and the readout */
.fx-key-matrix .km-chip-sh { fill: var(--drop); }
.fx-key-matrix .km-chip-body { fill: var(--surface-2); stroke: var(--node-border); stroke-width: 1.4; }
.fx-key-matrix .km-chip-dot { fill: var(--node-border); }
.fx-key-matrix .km-trace { fill: none; stroke: var(--ok-line); stroke-width: 2.2; stroke-dasharray: 4 3; }
.fx-key-matrix .km-trace.is-off { visibility: hidden; }
.fx-key-matrix .km-read-box { fill: var(--node-bg); stroke: var(--node-border); stroke-width: 1.3; }
.fx-key-matrix .km-read.is-ans .km-read-box { fill: color-mix(in srgb, var(--ok-line) 24%, var(--node-bg)); stroke: var(--ink-2); }
.fx-key-matrix .km-read-t { font: 700 12px var(--mono); fill: var(--muted); }
.fx-key-matrix .km-read.is-ans .km-read-t { fill: var(--title); }
.fx-key-matrix .km-read .km-head { fill: var(--text); }

/* numbered markers: 1 the powered row, 2 the pressed key, 3 the answering column */
.fx-key-matrix .km-badge circle { stroke: var(--ink-2); stroke-width: 1.3; }
.fx-key-matrix .km-badge text { font: 800 11px var(--mono); fill: var(--ink); }
.fx-key-matrix .km-b1 circle { fill: color-mix(in srgb, var(--trace-0) 50%, var(--node-bg)); }
.fx-key-matrix .km-b2 circle { fill: var(--accent); }
.fx-key-matrix .km-b3 circle { fill: color-mix(in srgb, var(--ok-line) 38%, var(--node-bg)); }
.fx-key-matrix .km-b3.is-dim { opacity: 0.35; }

/* click areas over the keys (made by the JS) */
.fx-key-matrix .km-hit { position: absolute; margin: 0; padding: 0; border: 0; border-radius: 6px; background: transparent; cursor: pointer; }
.fx-key-matrix .km-hit:hover { background: color-mix(in srgb, var(--accent) 40%, transparent); }
.fx-key-matrix .km-hit:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.fx-key-matrix .km-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap; }
.fx-key-matrix .km-pause[hidden] { display: none; }

/* the two tiles under the drawing */
.fx-key-matrix .km-pair > .fx-tile { display: flex; flex-direction: column; gap: 10px; }
.fx-key-matrix .km-pair p { margin: 0; }
.fx-key-matrix .km-eqs { display: grid; grid-template-columns: max-content max-content minmax(0, 1fr); align-items: baseline; gap: 8px 10px; }
.fx-key-matrix .km-op { font-size: 13px; font-weight: 700; color: var(--muted); }
.fx-key-matrix .km-eqs .fx-num { justify-self: end; font-size: clamp(32px, 5cqi, 42px); }
.fx-key-matrix .km-line { font-size: 13px; line-height: 1.55; text-wrap: pretty; }
.fx-key-matrix .km-line b { font-weight: 800; color: var(--title); }
.fx-key-matrix .km-sig { max-width: 360px; }
.fx-key-matrix .km-sig-line { fill: none; stroke: var(--ink-2); stroke-width: 1.8; stroke-linejoin: round; }
.fx-key-matrix .km-sig-dot { fill: var(--ok-line); stroke: var(--ink-2); stroke-width: 1.3; }
.fx-key-matrix .fx-cap .fx-term { color: var(--text); }

@media (prefers-reduced-motion: no-preference) {
  .fx-key-matrix .km-w,
  .fx-key-matrix .km-pin { transition: stroke 0.4s, fill 0.4s; }
  .fx-key-matrix .km-mark { transition: transform 0.5s ease, opacity 0.4s; }
  .fx-key-matrix .km-sig-draw { animation: fx-key-matrix-draw 6s linear infinite; }
}
@keyframes fx-key-matrix-draw {
  0% { clip-path: inset(0 100% 0 0); opacity: 1; }
  45%, 90% { clip-path: inset(0 0 0 0); opacity: 1; }
  100% { clip-path: inset(0 0 0 0); opacity: 0.25; }
}
</style>
<script>
// key-matrix: press any key; with motion allowed, the powered row sweeps down the rows.
const ROWS = 4;
const st = { r: 1, c: 2, scan: 1 };
const arts = [...root.querySelectorAll(".km-art")];
const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
const pauseBtn = root.querySelector(".km-pause");
let timer = 0;
let paused = false;

const move = (el, x, y) => { el.style.transform = `translate(${x}px, ${y}px)`; };

function paint() {
  const ans = st.scan === st.r;
  for (const art of arts) {
    let rowY = 0;
    let colX = 0;
    let key = null;
    art.querySelectorAll(".km-row").forEach((g) => {
      const on = +g.dataset.row === st.scan;
      g.classList.toggle("is-on", on);
      if (on) rowY = +g.dataset.y;
    });
    art.querySelectorAll(".km-col").forEach((g) => {
      const me = +g.dataset.col === st.c;
      g.classList.toggle("is-ans", me && ans);
      if (me) colX = +g.dataset.x;
    });
    art.querySelectorAll(".km-key").forEach((u) => {
      const r = +u.dataset.r;
      const me = r === st.r && +u.dataset.c === st.c;
      u.classList.toggle("is-live", r === st.scan);
      u.classList.toggle("is-pressed", me);
      u.classList.toggle("is-ans", me && ans);
      if (me) key = u;
    });
    art.querySelectorAll(".km-hit").forEach((b) => {
      b.setAttribute("aria-pressed", String(+b.dataset.r === st.r && +b.dataset.c === st.c));
    });
    const b1 = art.querySelector(".km-b1.km-mark");
    const b2 = art.querySelector(".km-b2.km-mark");
    const b3 = art.querySelector(".km-b3.km-mark");
    move(b1, +b1.dataset.x, rowY);
    if (key) move(b2, key.x.baseVal.value + +b2.dataset.dx, key.y.baseVal.value + +b2.dataset.dy);
    move(b3, colX, +b3.dataset.y);
    b3.classList.toggle("is-dim", !ans);
    const tr = art.querySelector(".km-trace");
    const top = +tr.dataset.top;
    const bx = +tr.dataset.bx;
    tr.setAttribute("d", colX < bx ? `M${colX} ${top}V${top + +tr.dataset.dy}H${bx}` : `M${colX} ${top}V${tr.dataset.by}`);
    tr.classList.toggle("is-off", !ans);
    const read = art.querySelector(".km-read");
    read.classList.toggle("is-ans", ans);
    read.querySelector(".km-read-t").textContent = ans ? `row ${st.r + 1}, column ${st.c + 1}` : `row ${st.scan + 1}: no answer`;
  }
}

function stop() { clearInterval(timer); timer = 0; }
function start() {
  stop();
  if (motion.matches && !paused) timer = setInterval(() => { st.scan = (st.scan + 1) % ROWS; paint(); }, 1600);
}

// click areas: one real button over each key, placed in percent of the drawing
for (const art of arts) {
  const W = +art.dataset.w;
  const H = +art.dataset.h;
  const kw = +art.dataset.kw;
  const kh = +art.dataset.kh;
  const pad = W < 500 ? 5 : 4;
  for (const u of art.querySelectorAll(".km-key")) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "km-hit";
    b.dataset.r = u.dataset.r;
    b.dataset.c = u.dataset.c;
    b.setAttribute("aria-label", `Press the key at row ${+u.dataset.r + 1}, column ${+u.dataset.c + 1}`);
    const x = u.x.baseVal.value - pad;
    const y = u.y.baseVal.value - pad;
    Object.assign(b.style, { left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${((kw + 2 * pad) / W) * 100}%`, height: `${((kh + 2 * pad) / H) * 100}%` });
    b.addEventListener("click", () => {
      st.r = +b.dataset.r;
      st.c = +b.dataset.c;
      st.scan = st.r;
      paint();
      start();
    });
    art.appendChild(b);
  }
}

function syncMotion() {
  pauseBtn.hidden = !motion.matches;
  if (!motion.matches) st.scan = st.r;
  paint();
  start();
}
pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.setAttribute("aria-pressed", String(paused));
  start();
});
motion.addEventListener("change", syncMotion);
syncMotion();
</script>
```

## D A position, not a letter
```free key-code
<p class="fx-how"><b>How to read this:</b> read down. Each key sends a number for its spot on the board, the computer's layout looks the number up, and you get a letter. Flip the layout and watch which band changes.</p>
<div class="kc-where">
  <svg viewBox="0 0 300 62" role="img" aria-label="A keyboard with four keys marked: the first four keys of the middle row, under the left hand.">
    <g class="kc-kb">
      <rect x="2" y="2" width="22" height="16" rx="3"/><rect x="28" y="2" width="22" height="16" rx="3"/><rect x="54" y="2" width="22" height="16" rx="3"/><rect x="80" y="2" width="22" height="16" rx="3"/><rect x="106" y="2" width="22" height="16" rx="3"/><rect x="132" y="2" width="22" height="16" rx="3"/><rect x="158" y="2" width="22" height="16" rx="3"/><rect x="184" y="2" width="22" height="16" rx="3"/><rect x="210" y="2" width="22" height="16" rx="3"/><rect x="236" y="2" width="22" height="16" rx="3"/><rect x="262" y="2" width="34" height="16" rx="3"/>
      <rect x="2" y="22" width="11" height="16" rx="3"/><rect x="121" y="22" width="22" height="16" rx="3"/><rect x="147" y="22" width="22" height="16" rx="3"/><rect x="173" y="22" width="22" height="16" rx="3"/><rect x="199" y="22" width="22" height="16" rx="3"/><rect x="225" y="22" width="22" height="16" rx="3"/><rect x="251" y="22" width="45" height="16" rx="3"/>
      <rect x="2" y="42" width="24" height="16" rx="3"/><rect x="30" y="42" width="22" height="16" rx="3"/><rect x="56" y="42" width="22" height="16" rx="3"/><rect x="82" y="42" width="22" height="16" rx="3"/><rect x="108" y="42" width="22" height="16" rx="3"/><rect x="134" y="42" width="22" height="16" rx="3"/><rect x="160" y="42" width="22" height="16" rx="3"/><rect x="186" y="42" width="22" height="16" rx="3"/><rect x="212" y="42" width="84" height="16" rx="3"/>
    </g>
    <g class="kc-kb-on">
      <rect x="17" y="22" width="22" height="16" rx="3"/><rect x="43" y="22" width="22" height="16" rx="3"/><rect x="69" y="22" width="22" height="16" rx="3"/><rect x="95" y="22" width="22" height="16" rx="3"/>
    </g>
  </svg>
  <p class="fx-cap">These four keys, under the left hand. Their spots are named A, S, D and F.</p>
</div>
<div class="kc-band">
  <p class="kc-head"><span class="kc-n">1</span>The keyboard sends a key code <span class="fx-chip">never changes</span></p>
  <div class="kc-grid kc-keys">
    <span class="kc-side">key code</span>
    <span class="kc-cap"><span class="kc-face">4</span></span>
    <span class="kc-cap"><span class="kc-face">22</span></span>
    <span class="kc-cap"><span class="kc-face">7</span></span>
    <span class="kc-cap"><span class="kc-face">9</span></span>
  </div>
  <div class="kc-grid kc-arrows is-hot" aria-hidden="true"><span class="kc-side">sends</span><i></i><i></i><i></i><i></i></div>
</div>
<div class="kc-band">
  <p class="kc-head"><span class="kc-n">2</span>The computer's <b class="fx-term">layout</b> looks it up</p>
  <div class="kc-card">
    <div class="kc-grid kc-codes"><span class="kc-side">code</span><span>4</span><span>22</span><span>7</span><span>9</span></div>
    <div class="kc-grid kc-lay is-on" data-lay="en">
      <span class="kc-side"><button class="fx-btn" type="button" aria-pressed="true">English</button></span>
      <span>a</span><span>s</span><span>d</span><span>f</span>
    </div>
    <div class="kc-grid kc-lay" data-lay="th">
      <span class="kc-side"><button class="fx-btn" type="button" aria-pressed="false">Thai</button></span>
      <span lang="th">ฟ</span><span lang="th">ห</span><span lang="th">ก</span><span lang="th">ด</span>
    </div>
  </div>
  <div class="kc-grid kc-arrows is-ok" aria-hidden="true"><span class="kc-side">gives</span><i></i><i></i><i></i><i></i></div>
</div>
<div class="kc-band">
  <p class="kc-head"><span class="kc-n">3</span>You get a letter <span class="fx-chip is-ok">changes with the layout</span></p>
  <div class="kc-grid kc-out" aria-live="polite">
    <span class="kc-side">typed<br><b class="kc-out-name">English</b></span>
    <span class="kc-letter">a</span><span class="kc-letter">s</span><span class="kc-letter">d</span><span class="kc-letter">f</span>
  </div>
</div>
<p class="fx-take">The keyboard sends a position, and the computer picks the letter. When keys type the wrong letters, the computer has usually switched layouts: switch it back.</p>
<style>
/* key-code: the keyboard sends a position; the computer's layout picks the letter. */
.fx-key-code { --kc-side: 80px; --kc-gap: 6px; --kc-in: 11.3px; }

/* where the four keys are */
.fx-key-code .kc-where { display: flex; flex-direction: column; gap: 6px; }
.fx-key-code .kc-where svg { max-width: 300px; }
.fx-key-code .kc-kb rect { fill: var(--surface-2); stroke: var(--line-ctl); stroke-width: 1.2; }
.fx-key-code .kc-kb-on rect { fill: var(--accent); stroke: var(--ink-2); stroke-width: 1.4; }

/* the three bands share one grid, so a code, its lookup and its letter sit in one column */
.fx-key-code .kc-band { display: flex; flex-direction: column; gap: 8px; }
.fx-key-code .kc-head { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 13px; font-weight: 700; color: var(--title); }
.fx-key-code .kc-n { display: inline-grid; place-items: center; width: 20px; height: 20px; border: 1.3px solid var(--ink-2); border-radius: 6px; background: var(--node-bg); font-size: 11px; font-weight: 800; }
.fx-key-code .kc-grid { display: grid; grid-template-columns: var(--kc-side) repeat(4, minmax(0, 1fr)); gap: var(--kc-gap); align-items: center; padding: 0 var(--kc-in); }
.fx-key-code .kc-side { font-size: 11px; font-weight: 600; line-height: 1.35; color: var(--muted); }
.fx-key-code .kc-side b { font-weight: 800; color: var(--text); }

/* band 1: keycaps that carry only a number */
.fx-key-code .kc-cap { justify-self: center; width: 100%; max-width: 62px; height: 52px; padding: 3px 4px 7px; border: 1.3px solid var(--ink-2); border-radius: 10px; background: var(--surface-2); box-shadow: var(--pop); }
.fx-key-code .kc-face { display: grid; place-items: center; height: 100%; border: 1px solid var(--line-ctl); border-radius: 7px; background: var(--node-bg); font-size: 18px; font-weight: 800; color: var(--title); font-variant-numeric: tabular-nums; }

/* arrows between the bands: orange is the code on its way, green is the answer */
.fx-key-code .kc-arrows { height: 18px; }
.fx-key-code .kc-arrows .kc-side { font-size: 11px; }
.fx-key-code .kc-arrows i { justify-self: center; position: relative; width: 2px; height: 16px; background: var(--kc-ar); }
.fx-key-code .kc-arrows i::after { content: ""; position: absolute; left: -4px; bottom: -2px; border: 5px solid transparent; border-top: 6px solid var(--kc-ar); border-bottom: 0; }
.fx-key-code .kc-arrows.is-hot { --kc-ar: var(--trace-0); }
.fx-key-code .kc-arrows.is-ok { --kc-ar: var(--ok-line); }

/* band 2: the lookup card; the layout in use is the solid row */
.fx-key-code .kc-card { display: flex; flex-direction: column; gap: 4px; padding: 8px 0 9px; border: 1.3px solid var(--ink-2); border-radius: 10px; background: var(--surface-2); box-shadow: var(--pop); }
.fx-key-code .kc-card .kc-grid { padding: 0 calc(var(--kc-in) - 1.3px); }
.fx-key-code .kc-card .kc-codes { padding-bottom: 4px; border-bottom: 1px dashed var(--line-ctl); }
.fx-key-code .kc-codes > span:not(.kc-side) { text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
.fx-key-code .kc-card .kc-lay { margin: 0 4px; padding: 4px calc(var(--kc-in) - 6.6px); border: 1.3px dashed var(--line-ctl); border-radius: 8px; }
.fx-key-code .kc-lay > span:not(.kc-side) { text-align: center; font-size: 19px; font-weight: 700; line-height: 1.4; color: var(--muted); }
.fx-key-code .kc-lay.is-on { border-style: solid; border-color: var(--ink-2); background: var(--node-bg); }
.fx-key-code .kc-lay.is-on > span:not(.kc-side) { color: var(--title); font-weight: 800; }
.fx-key-code .kc-lay .fx-btn { width: 100%; padding: 0 8px; }

/* band 3: what you get */
.fx-key-code .kc-letter { display: grid; place-items: center; height: 56px; border: 1.3px solid var(--ink-2); border-radius: 10px; background: color-mix(in srgb, var(--ok-line) 22%, var(--node-bg)); font-size: 30px; font-weight: 800; line-height: 1; color: var(--title); }

@media (prefers-reduced-motion: no-preference) {
  .fx-key-code .kc-letter.is-new { animation: fx-key-code-flip 0.5s ease both; }
  .fx-key-code .kc-letter.is-new:nth-of-type(3) { animation-delay: 0.05s; }
  .fx-key-code .kc-letter.is-new:nth-of-type(4) { animation-delay: 0.1s; }
  .fx-key-code .kc-letter.is-new:nth-of-type(5) { animation-delay: 0.15s; }
  .fx-key-code .kc-lay { transition: background 0.2s, border-color 0.2s; }
}
@keyframes fx-key-code-flip {
  from { transform: perspective(240px) rotateX(80deg); opacity: 0.2; }
  to { transform: none; opacity: 1; }
}
</style>
<script>
// key-code: flip the layout; only the letters in band 3 change.
const LETTERS = { en: ["a", "s", "d", "f"], th: ["ฟ", "ห", "ก", "ด"] };
const NAMES = { en: "English", th: "Thai" };
const rows = [...root.querySelectorAll(".kc-lay")];
const letters = [...root.querySelectorAll(".kc-letter")];
const name = root.querySelector(".kc-out-name");

function setLayout(lay) {
  for (const row of rows) {
    const on = row.dataset.lay === lay;
    row.classList.toggle("is-on", on);
    row.querySelector(".fx-btn").setAttribute("aria-pressed", String(on));
  }
  letters.forEach((el, i) => {
    el.textContent = LETTERS[lay][i];
    el.lang = lay === "th" ? "th" : "en";
    el.classList.remove("is-new");
    void el.offsetWidth; // restart the flip
    el.classList.add("is-new");
  });
  name.textContent = NAMES[lay];
}

for (const row of rows) {
  row.querySelector(".fx-btn").addEventListener("click", () => setLayout(row.dataset.lay));
}
</script>
```

## E The crowded air {span=3}
```free spectrum
<p class="fx-how"><b>How to read this:</b> the strip at the top is the air around your desk, from 2,400 to 2,483.5 MHz, cut into thin slices called <b class="fx-term">channels</b>. Below it, time runs down: each row is one report from the mouse, drawn on the channel it was sent on.</p>
<ul class="key" aria-label="What the marks mean">
  <li><svg viewBox="0 0 16 16" aria-hidden="true"><circle class="dot" cx="8" cy="8" r="5.5"/></svg>a report from the mouse</li>
  <li><svg viewBox="0 0 16 16" aria-hidden="true"><circle class="ok-c" cx="8" cy="8" r="5.5"/><path class="ok-k" d="M5.4 8.2L7.3 10.2L10.8 6"/></svg>“got it”: the answer came back</li>
  <li><svg viewBox="0 0 16 16" aria-hidden="true"><circle class="dot-no" cx="8" cy="8" r="5.5"/><path class="x" d="M5.7 5.7L10.3 10.3M10.3 5.7L5.7 10.3"/></svg>lost: no answer</li>
  <li><svg viewBox="0 0 16 16" aria-hidden="true"><rect class="burst" x="1.5" y="3.5" width="13" height="9" rx="2.5"/></svg>Wi-Fi sending at that moment</li>
</ul>
<div class="fx-scroll big" style="--fx-min: 1080px">
<svg class="wide" viewBox="0 0 1300 544" role="img" aria-label="The 2.4 GHz band from 2,400 to 2,483.5 MHz, with Wi-Fi channels 1, 6 and 11 as wide humps and 79 thin Bluetooth channels. Below, eight reports in time order, each on a different channel. Report 4 lands where Wi-Fi is sending and is lost; it is sent again on a quiet channel and gets its got it.">
<rect class="col" x="206.2" y="116" width="261.6" height="426"/>
<rect class="col" x="533.1" y="116" width="261.6" height="426"/>
<rect class="col" x="860" y="116" width="261.6" height="426"/>
<path class="dim" d="M206.2 30H467.7M206.2 26v8M467.7 26v8"/>
<text class="fx-t-m" x="336.9" y="22" text-anchor="middle">about 20 MHz</text>
<path class="mw" d="M833.9 28V152"/>
<text class="fx-t-m" x="833.9" y="22" text-anchor="middle">microwave ovens: about 2,450</text>
<path class="fx-ink fx-cool-fill" d="M206.2 116C232.3 116 238.9 46 271.5 46H402.3C435 46 441.6 116 467.7 116Z"/>
<text class="fx-t" x="336.9" y="86" text-anchor="middle">Wi-Fi channel 1</text>
<path class="fx-ink fx-cool-fill" d="M533.1 116C559.3 116 565.8 46 598.5 46H729.3C762 46 768.5 116 794.7 116Z"/>
<text class="fx-t" x="663.9" y="86" text-anchor="middle">Wi-Fi channel 6</text>
<path class="fx-ink fx-cool-fill" d="M860 116C886.2 116 892.7 46 925.4 46H1056.2C1088.9 46 1095.4 116 1121.6 116Z"/>
<text class="fx-t" x="990.8" y="86" text-anchor="middle">Wi-Fi channel 11</text>
<path class="bt" d="M201.3 124h9.7v14h-9.7zM214.4 124h9.7v14h-9.7zM227.5 124h9.7v14h-9.7zM240.6 124h9.7v14h-9.7zM253.6 124h9.7v14h-9.7zM266.7 124h9.7v14h-9.7zM279.8 124h9.7v14h-9.7zM292.9 124h9.7v14h-9.7zM305.9 124h9.7v14h-9.7zM319 124h9.7v14h-9.7zM332.1 124h9.7v14h-9.7zM345.2 124h9.7v14h-9.7zM358.3 124h9.7v14h-9.7zM371.3 124h9.7v14h-9.7zM384.4 124h9.7v14h-9.7zM397.5 124h9.7v14h-9.7zM410.6 124h9.7v14h-9.7zM423.6 124h9.7v14h-9.7zM436.7 124h9.7v14h-9.7zM449.8 124h9.7v14h-9.7zM462.9 124h9.7v14h-9.7zM476 124h9.7v14h-9.7zM489 124h9.7v14h-9.7zM502.1 124h9.7v14h-9.7zM515.2 124h9.7v14h-9.7zM528.3 124h9.7v14h-9.7zM541.3 124h9.7v14h-9.7zM554.4 124h9.7v14h-9.7zM567.5 124h9.7v14h-9.7zM580.6 124h9.7v14h-9.7zM593.7 124h9.7v14h-9.7zM606.7 124h9.7v14h-9.7zM619.8 124h9.7v14h-9.7zM632.9 124h9.7v14h-9.7zM646 124h9.7v14h-9.7zM659 124h9.7v14h-9.7zM672.1 124h9.7v14h-9.7zM685.2 124h9.7v14h-9.7zM698.3 124h9.7v14h-9.7zM711.4 124h9.7v14h-9.7zM724.4 124h9.7v14h-9.7zM737.5 124h9.7v14h-9.7zM750.6 124h9.7v14h-9.7zM763.7 124h9.7v14h-9.7zM776.7 124h9.7v14h-9.7zM789.8 124h9.7v14h-9.7zM802.9 124h9.7v14h-9.7zM816 124h9.7v14h-9.7zM829.1 124h9.7v14h-9.7zM842.1 124h9.7v14h-9.7zM855.2 124h9.7v14h-9.7zM868.3 124h9.7v14h-9.7zM881.4 124h9.7v14h-9.7zM894.4 124h9.7v14h-9.7zM907.5 124h9.7v14h-9.7zM920.6 124h9.7v14h-9.7zM933.7 124h9.7v14h-9.7zM946.8 124h9.7v14h-9.7zM959.8 124h9.7v14h-9.7zM972.9 124h9.7v14h-9.7zM986 124h9.7v14h-9.7zM999.1 124h9.7v14h-9.7zM1012.1 124h9.7v14h-9.7zM1025.2 124h9.7v14h-9.7zM1038.3 124h9.7v14h-9.7zM1051.4 124h9.7v14h-9.7zM1064.5 124h9.7v14h-9.7zM1077.5 124h9.7v14h-9.7zM1090.6 124h9.7v14h-9.7zM1103.7 124h9.7v14h-9.7zM1116.8 124h9.7v14h-9.7zM1129.8 124h9.7v14h-9.7zM1142.9 124h9.7v14h-9.7zM1156 124h9.7v14h-9.7zM1169.1 124h9.7v14h-9.7zM1182.2 124h9.7v14h-9.7zM1195.2 124h9.7v14h-9.7zM1208.3 124h9.7v14h-9.7zM1221.4 124h9.7v14h-9.7z"/>
<path class="ax" d="M180 152H1272"/>
<path class="tick" d="M180 152V158"/>
<text class="fx-t" x="180" y="172" text-anchor="middle">2,400</text>
<path class="tick" d="M336.9 152V158"/>
<text class="fx-t" x="336.9" y="172" text-anchor="middle">2,412</text>
<path class="tick" d="M663.9 152V158"/>
<text class="fx-t" x="663.9" y="172" text-anchor="middle">2,437</text>
<path class="tick" d="M990.8 152V158"/>
<text class="fx-t" x="990.8" y="172" text-anchor="middle">2,462</text>
<path class="tick" d="M1272 152V158"/>
<text class="fx-t" x="1272" y="172" text-anchor="middle">2,483.5</text>
<text class="fx-t-h" x="0" y="80">Wi-Fi</text>
<text class="fx-t-m" x="0" y="96">3 wide channels</text>
<text class="fx-t-h" x="0" y="133">Bluetooth</text>
<text class="fx-t-m" x="0" y="149">79 thin channels</text>
<text class="fx-t-m" x="0" y="172">frequency, MHz</text>
<text class="fx-t-h" x="0" y="206">Time, one report per row</text>
<path class="time" d="M5 216V536M1 531L5 537L9 531"/>
<g class="row" style="--i:0"><path class="track" d="M180 236H1272"/><rect class="burst" x="209.2" y="223" width="255.6" height="26" rx="5"/><text class="fx-t-m on-burst" x="217.2" y="240">Wi-Fi sending</text><text class="fx-t" x="18" y="240">report 1</text><path class="ok-l" d="M1171.3 236H1184.3"/><circle class="ok-c" cx="1190.8" cy="236" r="6"/><path class="ok-k" d="M1188 236.2L1190 238.4L1193.8 233.6"/><text class="ok-t" x="1200.8" y="240" text-anchor="start">got it</text><circle class="dot" cx="1160.8" cy="236" r="7.5"/></g>
<g class="row" style="--i:1"><path class="track" d="M180 276H1272"/><text class="fx-t" x="18" y="280">report 2</text><path class="ok-l" d="M595.9 276H608.9"/><circle class="ok-c" cx="615.4" cy="276" r="6"/><path class="ok-k" d="M612.6 276.2L614.6 278.4L618.4 273.6"/><text class="ok-t" x="625.4" y="280" text-anchor="start">got it</text><circle class="dot" cx="585.4" cy="276" r="7.5"/></g>
<g class="row" style="--i:2"><path class="track" d="M180 316H1272"/><text class="fx-t" x="18" y="320">report 3</text><path class="ok-l" d="M242.8 316H255.8"/><circle class="ok-c" cx="262.3" cy="316" r="6"/><path class="ok-k" d="M259.5 316.2L261.5 318.4L265.3 313.6"/><text class="ok-t" x="272.3" y="320" text-anchor="start">got it</text><circle class="dot" cx="232.3" cy="316" r="7.5"/></g>
<g class="row" style="--i:3"><path class="track" d="M180 356H1272"/><rect class="burst" x="536.1" y="343" width="255.6" height="26" rx="5"/><text class="fx-t-m on-burst" x="544.1" y="360">Wi-Fi sending</text><text class="fx-t strong" x="18" y="360">report 4</text><path class="lostline" d="M765.9 356H798.7"/><circle class="dot-no" cx="755.4" cy="356" r="7.5"/><path class="x" d="M752 352.6L758.8 359.4M758.8 352.6L752 359.4"/><text class="lost-t" x="802.7" y="360">lost: no “got it” came back</text></g>
<g class="row" style="--i:4"><path class="track" d="M180 396H1272"/><text class="fx-t strong" x="18" y="400">report 4 again</text><path class="ok-l" d="M517.4 396H530.4"/><circle class="ok-c" cx="536.9" cy="396" r="6"/><path class="ok-k" d="M534.1 396.2L536.1 398.4L539.9 393.6"/><text class="ok-t" x="546.9" y="400" text-anchor="start">got it</text><circle class="dot" cx="506.9" cy="396" r="7.5"/><text class="again-t" x="602.9" y="400">same report, sent again on a quiet channel</text></g>
<g class="row" style="--i:5"><path class="track" d="M180 436H1272"/><rect class="burst" x="863" y="423" width="255.6" height="26" rx="5"/><text class="fx-t-m on-burst" x="871" y="440">Wi-Fi sending</text><text class="fx-t" x="18" y="440">report 5</text><path class="ok-l" d="M399.7 436H412.7"/><circle class="ok-c" cx="419.2" cy="436" r="6"/><path class="ok-k" d="M416.4 436.2L418.4 438.4L422.2 433.6"/><text class="ok-t" x="429.2" y="440" text-anchor="start">got it</text><circle class="dot" cx="389.2" cy="436" r="7.5"/></g>
<g class="row" style="--i:6"><path class="track" d="M180 476H1272"/><text class="fx-t" x="18" y="480">report 6</text><path class="ok-l" d="M1066.7 476H1079.7"/><circle class="ok-c" cx="1086.2" cy="476" r="6"/><path class="ok-k" d="M1083.4 476.2L1085.4 478.4L1089.2 473.6"/><text class="ok-t" x="1096.2" y="480" text-anchor="start">got it</text><circle class="dot" cx="1056.2" cy="476" r="7.5"/></g>
<g class="row" style="--i:7"><path class="track" d="M180 516H1272"/><text class="fx-t" x="18" y="520">report 7</text><path class="ok-l" d="M909.8 516H922.8"/><circle class="ok-c" cx="929.3" cy="516" r="6"/><path class="ok-k" d="M926.5 516.2L928.5 518.4L932.3 513.6"/><text class="ok-t" x="939.3" y="520" text-anchor="start">got it</text><circle class="dot" cx="899.3" cy="516" r="7.5"/></g>
<g class="row" style="--i:4"><path class="again" d="M750.2 361.6C740.2 380.8 572.5 376 512.5 390"/><path class="again-h" d="M513.5 383L512.5 390L519.5 391.5"/></g>
</svg>
</div>
<div class="small">
<svg class="narrow" viewBox="0 0 330 485" role="img" aria-label="The 2.4 GHz band from 2,400 to 2,483.5 MHz, with Wi-Fi channels 1, 6 and 11 as wide humps and 79 thin Bluetooth channels. Below, eight reports in time order, each on a different channel. Report 4 lands where Wi-Fi is sending and is lost; it is sent again on a quiet channel and gets its got it.">
<rect class="col" x="18.9" y="100" width="69" height="383"/>
<rect class="col" x="105.1" y="100" width="69" height="383"/>
<rect class="col" x="191.4" y="100" width="69" height="383"/>
<path class="dim" d="M18.9 30H87.9M18.9 26v8M87.9 26v8"/>
<text class="fx-t-m" x="53.4" y="22" text-anchor="middle">about 20 MHz</text>
<path class="mw" d="M184.5 28V121"/>
<text class="fx-t-m" x="184.5" y="22" text-anchor="middle">microwave oven</text>
<path class="fx-ink fx-cool-fill" d="M18.9 100C25.8 100 27.5 44 36.1 44H70.6C79.3 44 81 100 87.9 100Z"/>
<text class="fx-t" x="53.4" y="90" text-anchor="middle">Wi-Fi 1</text>
<path class="fx-ink fx-cool-fill" d="M105.1 100C112 100 113.7 44 122.4 44H156.9C165.5 44 167.2 100 174.1 100Z"/>
<text class="fx-t" x="139.6" y="90" text-anchor="middle">Wi-Fi 6</text>
<path class="fx-ink fx-cool-fill" d="M191.4 100C198.3 100 200 44 208.6 44H243.1C251.7 44 253.4 100 260.3 100Z"/>
<text class="fx-t" x="225.8" y="90" text-anchor="middle">Wi-Fi 11</text>
<path class="bt-n" d="M18.1 106h1.6v12h-1.6zM21.5 106h1.6v12h-1.6zM25 106h1.6v12h-1.6zM28.4 106h1.6v12h-1.6zM31.9 106h1.6v12h-1.6zM35.3 106h1.6v12h-1.6zM38.8 106h1.6v12h-1.6zM42.2 106h1.6v12h-1.6zM45.7 106h1.6v12h-1.6zM49.1 106h1.6v12h-1.6zM52.6 106h1.6v12h-1.6zM56 106h1.6v12h-1.6zM59.5 106h1.6v12h-1.6zM62.9 106h1.6v12h-1.6zM66.4 106h1.6v12h-1.6zM69.8 106h1.6v12h-1.6zM73.3 106h1.6v12h-1.6zM76.7 106h1.6v12h-1.6zM80.2 106h1.6v12h-1.6zM83.6 106h1.6v12h-1.6zM87.1 106h1.6v12h-1.6zM90.5 106h1.6v12h-1.6zM94 106h1.6v12h-1.6zM97.4 106h1.6v12h-1.6zM100.9 106h1.6v12h-1.6zM104.3 106h1.6v12h-1.6zM107.8 106h1.6v12h-1.6zM111.2 106h1.6v12h-1.6zM114.7 106h1.6v12h-1.6zM118.1 106h1.6v12h-1.6zM121.6 106h1.6v12h-1.6zM125 106h1.6v12h-1.6zM128.5 106h1.6v12h-1.6zM131.9 106h1.6v12h-1.6zM135.4 106h1.6v12h-1.6zM138.8 106h1.6v12h-1.6zM142.3 106h1.6v12h-1.6zM145.7 106h1.6v12h-1.6zM149.2 106h1.6v12h-1.6zM152.6 106h1.6v12h-1.6zM156.1 106h1.6v12h-1.6zM159.5 106h1.6v12h-1.6zM163 106h1.6v12h-1.6zM166.4 106h1.6v12h-1.6zM169.9 106h1.6v12h-1.6zM173.3 106h1.6v12h-1.6zM176.8 106h1.6v12h-1.6zM180.2 106h1.6v12h-1.6zM183.7 106h1.6v12h-1.6zM187.1 106h1.6v12h-1.6zM190.6 106h1.6v12h-1.6zM194 106h1.6v12h-1.6zM197.5 106h1.6v12h-1.6zM200.9 106h1.6v12h-1.6zM204.3 106h1.6v12h-1.6zM207.8 106h1.6v12h-1.6zM211.2 106h1.6v12h-1.6zM214.7 106h1.6v12h-1.6zM218.1 106h1.6v12h-1.6zM221.6 106h1.6v12h-1.6zM225 106h1.6v12h-1.6zM228.5 106h1.6v12h-1.6zM231.9 106h1.6v12h-1.6zM235.4 106h1.6v12h-1.6zM238.8 106h1.6v12h-1.6zM242.3 106h1.6v12h-1.6zM245.7 106h1.6v12h-1.6zM249.2 106h1.6v12h-1.6zM252.6 106h1.6v12h-1.6zM256.1 106h1.6v12h-1.6zM259.5 106h1.6v12h-1.6zM263 106h1.6v12h-1.6zM266.4 106h1.6v12h-1.6zM269.9 106h1.6v12h-1.6zM273.3 106h1.6v12h-1.6zM276.8 106h1.6v12h-1.6zM280.2 106h1.6v12h-1.6zM283.7 106h1.6v12h-1.6zM287.1 106h1.6v12h-1.6z"/>
<path class="ax" d="M12 140H300"/>
<path class="tick" d="M12 140V146"/>
<text class="fx-t" x="12" y="160" text-anchor="start">2,400</text>
<path class="tick" d="M53.4 140V159"/>
<text class="fx-t" x="53.4" y="174" text-anchor="middle">2,412</text>
<path class="tick" d="M139.6 140V146"/>
<text class="fx-t" x="139.6" y="160" text-anchor="middle">2,437</text>
<path class="tick" d="M225.8 140V159"/>
<text class="fx-t" x="225.8" y="174" text-anchor="middle">2,462</text>
<path class="tick" d="M300 140V146"/>
<text class="fx-t" x="300" y="160" text-anchor="middle">2,483.5</text>
<text class="fx-t-m" x="12" y="133">Bluetooth: 79 channels, 1 MHz each</text>
<text class="fx-t-m" x="328" y="174" text-anchor="end">MHz</text>
<text class="fx-t-h" x="12" y="195">Time runs down, one report per row</text>
<g class="row" style="--i:0"><path class="track" d="M12 222H300"/><rect class="burst" x="21.9" y="211" width="63" height="22" rx="5"/><text class="fx-t-m on-burst" x="26.9" y="226">Wi-Fi</text><path class="ok-l" d="M261.2 222H253.2"/><circle class="ok-c" cx="246.7" cy="222" r="6"/><path class="ok-k" d="M243.9 222.2L245.9 224.4L249.7 219.6"/><text class="ok-t" x="236.7" y="226" text-anchor="end">got it</text><circle class="dot" cx="270.7" cy="222" r="6.5"/></g>
<g class="row" style="--i:1"><path class="track" d="M12 256H300"/><path class="ok-l" d="M128.4 256H136.4"/><circle class="ok-c" cx="142.9" cy="256" r="6"/><path class="ok-k" d="M140.1 256.2L142.1 258.4L145.9 253.6"/><text class="ok-t" x="152.9" y="260" text-anchor="start">got it</text><circle class="dot" cx="118.9" cy="256" r="6.5"/></g>
<g class="row" style="--i:2"><path class="track" d="M12 290H300"/><path class="ok-l" d="M35.3 290H43.3"/><circle class="ok-c" cx="49.8" cy="290" r="6"/><path class="ok-k" d="M47 290.2L49 292.4L52.8 287.6"/><text class="ok-t" x="59.8" y="294" text-anchor="start">got it</text><circle class="dot" cx="25.8" cy="290" r="6.5"/></g>
<g class="row" style="--i:3"><path class="track" d="M12 324H300"/><rect class="burst" x="108.1" y="313" width="63" height="22" rx="5"/><text class="fx-t-m on-burst" x="113.1" y="328">Wi-Fi</text><path class="lostline" d="M173.3 324H178.1"/><circle class="dot-no" cx="163.8" cy="324" r="6.5"/><path class="x" d="M160.9 321.1L166.7 326.9M166.7 321.1L160.9 326.9"/><text class="lost-t" x="182.1" y="328">lost: no answer</text></g>
<g class="row" style="--i:4"><path class="track" d="M12 358H300"/><path class="ok-l" d="M107.7 358H115.7"/><circle class="ok-c" cx="122.2" cy="358" r="6"/><path class="ok-k" d="M119.4 358.2L121.4 360.4L125.2 355.6"/><text class="ok-t" x="132.2" y="362" text-anchor="start">got it</text><circle class="dot" cx="98.2" cy="358" r="6.5"/><text class="again-t" x="188.2" y="362">sent again</text></g>
<g class="row" style="--i:5"><path class="track" d="M12 392H300"/><rect class="burst" x="194.4" y="381" width="63" height="22" rx="5"/><text class="fx-t-m on-burst" x="199.4" y="396">Wi-Fi</text><path class="ok-l" d="M76.7 392H84.7"/><circle class="ok-c" cx="91.2" cy="392" r="6"/><path class="ok-k" d="M88.4 392.2L90.4 394.4L94.2 389.6"/><text class="ok-t" x="101.2" y="396" text-anchor="start">got it</text><circle class="dot" cx="67.2" cy="392" r="6.5"/></g>
<g class="row" style="--i:6"><path class="track" d="M12 426H300"/><path class="ok-l" d="M233.6 426H225.6"/><circle class="ok-c" cx="219.1" cy="426" r="6"/><path class="ok-k" d="M216.3 426.2L218.3 428.4L222.1 423.6"/><text class="ok-t" x="209.1" y="430" text-anchor="end">got it</text><circle class="dot" cx="243.1" cy="426" r="6.5"/></g>
<g class="row" style="--i:7"><path class="track" d="M12 460H300"/><path class="ok-l" d="M211.2 460H219.2"/><circle class="ok-c" cx="225.7" cy="460" r="6"/><path class="ok-k" d="M222.9 460.2L224.9 462.4L228.7 457.6"/><text class="ok-t" x="235.7" y="464" text-anchor="start">got it</text><circle class="dot" cx="201.7" cy="460" r="6.5"/></g>
<g class="row" style="--i:4"><path class="again" d="M159.3 328.9C149.3 345.1 125.1 341 103.1 352.8"/><path class="again-h" d="M104.1 345.8L103.1 352.8L110.1 354.3"/></g>
</svg>
</div>
<div class="who">
  <p class="fx-eyebrow">Who else makes noise here</p>
  <ul class="who-list">
    <li><svg viewBox="0 0 28 18" aria-hidden="true"><path class="fx-ink fx-cool-fill" d="M2 16C4 16 5 3 8 3H20C23 3 24 16 26 16Z"/></svg><p><b>Wi-Fi</b> channels 1, 6 and 11, each about 20 MHz wide</p></li>
    <li><svg viewBox="0 0 28 18" aria-hidden="true"><path class="bt" d="M2 4h3v10h-3zM7.5 4h3v10h-3zM13 4h3v10h-3zM18.5 4h3v10h-3zM24 4h2.5v10h-2.5z"/></svg><p><b>Bluetooth</b> 79 channels, 1 MHz each; hops up to 1,600 times a second and skips busy ones</p></li>
    <li><svg viewBox="0 0 28 18" aria-hidden="true"><rect class="fx-ink fx-fill" x="2" y="2.5" width="24" height="13" rx="2"/><rect class="fx-ink fx-fill-2" x="5" y="5.5" width="13" height="7" rx="1"/><path class="fx-ink" d="M22 6v6"/></svg><p><b>Microwave ovens</b> about 2,450 MHz, in the middle of the band</p></li>
    <li><svg viewBox="0 0 28 18" aria-hidden="true"><rect class="fx-ink fx-fill" x="3" y="4" width="22" height="10" rx="2"/><rect class="fx-ink fx-fill-2" x="7" y="7" width="14" height="4" rx="0.5"/></svg><p><b>USB 3 ports</b> noise in the same band; a receiver does better in a USB 2 port or on a short extension cable</p></li>
  </ul>
</div>
<p class="fx-cap">This is a drawing of the idea, not a measurement: the rows and their channels are picked to show how it works.</p>
<p class="fx-take">A lost report is normal. The device hears no “got it”, so it sends the same report again a moment later, on another channel, and you never see it. You only notice when it keeps happening: then the arrow stutters or jumps.</p>
<style>
/* spectrum: the 2.4 GHz band as a map, with a waterfall of reports under it */
.fx-spectrum .key { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: var(--text); }
.fx-spectrum .key li { display: inline-flex; align-items: center; gap: 7px; }
.fx-spectrum .key svg { width: 15px; height: 15px; flex: none; }

/* one drawing per width: the wide map scrolls if it must; the narrow one is redrawn for a phone */
.fx-spectrum .big { padding-bottom: 2px; }
.fx-spectrum .small { display: none; }
@container (width < 640px) {
  .fx-spectrum .big { display: none; }
  .fx-spectrum .small { display: block; }
}

/* the band */
.fx-spectrum .col { fill: color-mix(in srgb, var(--trace-1) 8%, var(--node-bg)); }
.fx-spectrum .dim { stroke: var(--edge); stroke-width: 1; fill: none; }
.fx-spectrum .mw { stroke: var(--edge); stroke-width: 1.2; stroke-dasharray: 3 4; fill: none; }
.fx-spectrum .bt { fill: var(--node-bg); stroke: var(--node-border); stroke-width: 1; }
.fx-spectrum .bt-n { fill: var(--node-border); }
.fx-spectrum .ax { stroke: var(--node-border); stroke-width: 1.4; fill: none; }
.fx-spectrum .tick { stroke: var(--node-border); stroke-width: 1.2; fill: none; }
.fx-spectrum .time { stroke: var(--line-ctl); stroke-width: 1.2; fill: none; stroke-linecap: round; stroke-linejoin: round; }

/* the reports */
.fx-spectrum .track { stroke: var(--border); stroke-width: 1; stroke-dasharray: 1 5; stroke-linecap: round; fill: none; }
.fx-spectrum .burst { fill: color-mix(in srgb, var(--trace-1) 30%, var(--node-bg)); stroke: var(--trace-1); stroke-width: 1.3; }
.fx-spectrum .on-burst { fill: var(--text); }
.fx-spectrum .strong { font-weight: 800; }
.fx-spectrum .dot { fill: var(--trace-0); stroke: var(--node-border); stroke-width: 1.4; }
.fx-spectrum .dot-no { fill: var(--no-line); stroke: var(--node-border); stroke-width: 1.4; }
.fx-spectrum .x { stroke: var(--node-bg); stroke-width: 1.8; stroke-linecap: round; fill: none; }
.fx-spectrum .ok-l { stroke: var(--ok-line); stroke-width: 1.6; stroke-linecap: round; fill: none; }
.fx-spectrum .ok-c { fill: color-mix(in srgb, var(--ok-line) 26%, var(--node-bg)); stroke: var(--ok-line); stroke-width: 1.4; }
.fx-spectrum .ok-k { stroke: var(--ok); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.fx-spectrum .ok-t { font: 700 12px var(--mono); fill: var(--ok); }
.fx-spectrum .lostline { stroke: var(--no-line); stroke-width: 1.6; stroke-dasharray: 2 4; stroke-linecap: round; fill: none; }
.fx-spectrum .lost-t { font: 700 12px var(--mono); fill: var(--no); }
.fx-spectrum .again { stroke: var(--trace-0); stroke-width: 1.6; stroke-dasharray: 4 4; stroke-linecap: round; fill: none; }
.fx-spectrum .again-h { stroke: var(--trace-0); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.fx-spectrum .again-t { font: 700 12px var(--mono); fill: var(--text); }

/* the neighbours */
.fx-spectrum .who { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
.fx-spectrum .who-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 22px; }
.fx-spectrum .who-list li { display: flex; gap: 10px; align-items: flex-start; min-width: 0; }
.fx-spectrum .who-list svg { width: 28px; height: 18px; flex: none; margin-top: 1px; }
.fx-spectrum .who-list p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--muted); text-wrap: pretty; }
.fx-spectrum .who-list b { display: block; font-weight: 700; color: var(--text); }
@container (width < 900px) {
  .fx-spectrum .who-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (width < 480px) {
  .fx-spectrum .who-list { grid-template-columns: minmax(0, 1fr); }
}

/* motion: the rows arrive one by one, slowly, once the section is on screen */
@media (prefers-reduced-motion: no-preference) {
  .fx-spectrum.is-armed .row { opacity: 0; }
  .fx-spectrum.is-live .row { animation: fx-spectrum-in 0.9s ease-out both; animation-delay: calc(var(--i) * 0.75s + 0.2s); }
}
@keyframes fx-spectrum-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
}
.fx-spectrum .narrow .fx-t-h { font-size: 11px; }
</style>
<script>
// Rows of reports appear one by one when the section scrolls into view (motion allowed only).
if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches && "IntersectionObserver" in window) {
  root.classList.add("is-armed");
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      root.classList.add("is-live");
      io.disconnect();
    }
  }, { threshold: 0.3 });
  io.observe(root);
}
</script>
```

## F Receiver or Bluetooth? {span=3}
```free radio-choice
<p class="fx-how"><b>How to read this:</b> two ways for a wireless mouse or keyboard to reach the computer, side by side. Read each row across: one question, two answers. A green chip is the easy answer, amber is a cost, red is the catch.</p>
<div class="cmp" role="table" aria-label="USB receiver compared with Bluetooth">
  <div class="row head" role="row">
    <div class="lab" role="columnheader"><span class="fx-eyebrow">Read each row across</span></div>
    <div class="cell rec" role="columnheader">
      <svg viewBox="0 0 280 84" role="img" aria-label="The mouse sends by radio to a small receiver plugged into a USB port on the computer.">
        <path class="fx-ink fx-fill" d="M32 12C44 12 50 22 50 36V54C50 65 42 72 32 72C22 72 14 65 14 54V36C14 22 20 12 32 12Z"/>
        <path class="fx-ink" d="M14 36H50M32 12V36"/>
        <rect class="fx-ink fx-fill-2" x="29.5" y="19" width="5" height="10" rx="2.5"/>
        <path class="fx-hot-line" d="M61 37.5A7 7 0 0 1 61 46.5M66 33.6A13 13 0 0 1 66 50.4M70.6 29.8A19 19 0 0 1 70.6 54.2"/>
        <path class="fx-hot-line dash" d="M80 42C104 42 112 58 120 66"/>
        <rect class="fx-ink fx-hot-fill" x="120" y="62" width="22" height="14" rx="3"/>
        <rect class="fx-ink fx-fill" x="142" y="65" width="9" height="8" rx="1"/>
        <rect class="fx-ink fx-fill" x="164" y="8" width="96" height="58" rx="5"/>
        <rect class="fx-ink fx-fill-2" x="171" y="15" width="82" height="44" rx="2"/>
        <path class="fx-ink fx-fill" d="M151 66H272L266 76H157Z"/>
      </svg>
      <p class="name">USB receiver</p>
      <p class="path">mouse → receiver in a USB port → computer</p>
    </div>
    <div class="cell bt" role="columnheader">
      <svg viewBox="0 0 280 84" role="img" aria-label="The mouse sends by radio straight to the computer's own built-in radio.">
        <path class="fx-ink fx-fill" d="M32 12C44 12 50 22 50 36V54C50 65 42 72 32 72C22 72 14 65 14 54V36C14 22 20 12 32 12Z"/>
        <path class="fx-ink" d="M14 36H50M32 12V36"/>
        <rect class="fx-ink fx-fill-2" x="29.5" y="19" width="5" height="10" rx="2.5"/>
        <path class="fx-hot-line" d="M61 37.5A7 7 0 0 1 61 46.5M66 33.6A13 13 0 0 1 66 50.4M70.6 29.8A19 19 0 0 1 70.6 54.2"/>
        <path class="fx-hot-line dash" d="M80 42C118 42 150 29 177 29"/>
        <rect class="fx-ink fx-fill" x="164" y="8" width="96" height="58" rx="5"/>
        <rect class="fx-ink fx-fill-2" x="171" y="15" width="82" height="44" rx="2"/>
        <path class="fx-ink fx-fill" d="M151 66H272L266 76H157Z"/>
        <circle class="fx-ink fx-hot-fill" cx="190" cy="29" r="11"/>
        <path class="fx-ink" d="M190 36V25M193.5 21.5A5 5 0 0 1 193.5 28.5M186.5 21.5A5 5 0 0 0 186.5 28.5"/>
      </svg>
      <p class="name">Bluetooth</p>
      <p class="path">mouse → the computer's own radio</p>
    </div>
  </div>

  <div class="row" role="row">
    <div class="lab" role="rowheader">Set-up</div>
    <div class="cell rec" role="cell"><span class="tag">Receiver</span><span class="fx-chip is-ok">Nothing to pair</span><p>Plug it in. It introduces itself as a wired mouse and keyboard, so no driver either.</p></div>
    <div class="cell bt" role="cell"><span class="tag">Bluetooth</span><span class="fx-chip is-warn">Pair once</span><p>Pair it with the computer one time.</p></div>
  </div>

  <div class="row" role="row">
    <div class="lab" role="rowheader">Needs a USB port?</div>
    <div class="cell rec" role="cell"><span class="tag">Receiver</span><span class="fx-chip is-warn">Yes, one</span><p>The receiver takes a USB port.</p></div>
    <div class="cell bt" role="cell"><span class="tag">Bluetooth</span><span class="fx-chip is-ok">No</span><p>It uses the computer's own radio.</p></div>
  </div>

  <div class="row" role="row">
    <div class="lab" role="rowheader">Works before the system starts?<small>the BIOS or boot menu</small></div>
    <div class="cell rec" role="cell"><span class="tag">Receiver</span><span class="fx-chip is-ok">Yes</span><p>It acts like a wired keyboard, so it works from the very start.</p></div>
    <div class="cell bt" role="cell"><span class="tag">Bluetooth</span><span class="fx-chip is-warn">Often not</span><p>It often waits until the operating system has loaded.</p></div>
  </div>

  <div class="row" role="row">
    <div class="lab" role="rowheader">Reports a second<small>both bars on one scale, 0 to 1,000</small></div>
    <div class="cell rec rate" role="cell"><span class="tag">Receiver</span>
      <p class="v"><b>125 or 1,000</b> checks a second</p>
      <div class="bar" role="img" aria-label="125 on a basic receiver, 1,000 on a fast one, on a scale of 0 to 1,000"><span class="fill"></span><span class="more"></span></div>
      <div class="scale" aria-hidden="true"><span class="at">125</span><span class="end">1,000</span></div>
    </div>
    <div class="cell bt rate" role="cell"><span class="tag">Bluetooth</span>
      <p class="v"><b>about 125</b> a second</p>
      <div class="bar" role="img" aria-label="about 125, on a scale of 0 to 1,000"><span class="fill"></span></div>
      <div class="scale" aria-hidden="true"><span class="at">125</span><span class="end">1,000</span></div>
    </div>
  </div>

  <div class="row" role="row">
    <div class="lab" role="rowheader">What else it can reach</div>
    <div class="cell rec" role="cell"><span class="tag">Receiver</span><span class="fx-chip is-warn">One computer</span><p>Only the computer its receiver is plugged into.</p></div>
    <div class="cell bt" role="cell"><span class="tag">Bluetooth</span><span class="fx-chip is-ok">Phone, tablet too</span><p>It can also pair with a phone or tablet.</p></div>
  </div>

  <div class="row" role="row">
    <div class="lab" role="rowheader">The catch</div>
    <div class="cell rec" role="cell"><span class="tag">Receiver</span><span class="fx-chip is-no">Easy to lose</span><p>A tiny plug that goes missing.</p></div>
    <div class="cell bt" role="cell"><span class="tag">Bluetooth</span><span class="fx-chip is-no">Late start</span><p>Often not working until the system has loaded.</p></div>
  </div>

  <div class="row pick" role="row">
    <div class="lab" role="rowheader">Pick this when</div>
    <div class="cell rec" role="cell"><span class="tag">Receiver</span><p>you need the keyboard in the BIOS or boot menu, want 1,000 checks a second, or don't want to pair.</p></div>
    <div class="cell bt" role="cell"><span class="tag">Bluetooth</span><p>your USB ports are few or taken, or you want the same mouse or keyboard on a phone or tablet.</p></div>
  </div>
</div>
<p class="fx-take">Both send the same tiny reports by radio. The receiver is plug-in-and-go and works from the moment the computer starts; Bluetooth saves a USB port and can reach a phone or tablet too.</p>
<style>
/* radio-choice: two columns with matched rows; on a phone each row keeps both answers side by side */
.fx-radio-choice .cmp { display: flex; flex-direction: column; }
.fx-radio-choice .row { display: grid; grid-template-columns: minmax(150px, 230px) minmax(0, 1fr) minmax(0, 1fr); column-gap: 18px; }

/* row labels: like the page's key/value tables */
.fx-radio-choice .lab { padding: 14px 0 12px; border-top: 1px solid var(--border); font-size: 13px; font-weight: 700; line-height: 1.45; color: var(--text); }
.fx-radio-choice .lab small { display: block; margin-top: 3px; font-size: 12px; font-weight: 500; color: var(--muted); }
.fx-radio-choice .head .lab { border-top: 0; align-self: end; padding-bottom: 14px; }

/* the two columns: cells that join into one tall card each */
.fx-radio-choice .cell { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-width: 0; padding: 13px 18px 14px; background: var(--node-bg); border-inline: 1.3px solid var(--ink-2); border-top: 1px solid var(--border); box-shadow: 1.5px 0 0 var(--drop); }
.fx-radio-choice .cell p { margin: 0; max-width: 46ch; font-size: 13px; line-height: 1.5; color: var(--text); text-wrap: pretty; }
.fx-radio-choice .head .cell { border-top: 1.3px solid var(--ink-2); border-radius: 10px 10px 0 0; padding-top: 14px; gap: 4px; }
.fx-radio-choice .row:last-child .cell { border-bottom: 1.3px solid var(--ink-2); border-radius: 0 0 10px 10px; box-shadow: var(--pop); }
.fx-radio-choice .head svg { max-width: 300px; margin-bottom: 6px; }
.fx-radio-choice .head svg * { vector-effect: non-scaling-stroke; }
.fx-radio-choice .head .dash { stroke-dasharray: 3 5; fill: none; }
.fx-radio-choice .name { font-size: 15px; font-weight: 800; color: var(--title); }
.fx-radio-choice .head .path { font-size: 12px; color: var(--muted); }
.fx-radio-choice .tag { display: none; }

/* reports a second: two bars on one shared 0 to 1,000 scale */
.fx-radio-choice .rate { align-items: stretch; }
.fx-radio-choice .v b { font-size: 15px; font-weight: 800; color: var(--title); font-variant-numeric: tabular-nums; }
.fx-radio-choice .v { color: var(--muted); }
.fx-radio-choice .bar { position: relative; height: 14px; border: 1.3px solid var(--ink-2); border-radius: 4px; background: var(--surface-2); overflow: hidden; }
.fx-radio-choice .bar .fill { position: absolute; inset: 0 auto 0 0; width: 12.5%; background: var(--trace-0); border-right: 1.3px solid var(--ink-2); }
.fx-radio-choice .bar .more { position: absolute; inset: 0 0 0 12.5%; background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--trace-0) 55%, transparent) 0 2px, transparent 2px 6px); }
.fx-radio-choice .scale { position: relative; height: 16px; font-size: 11px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.fx-radio-choice .scale span { position: absolute; top: 0; }
.fx-radio-choice .scale .at { left: 12.5%; transform: translateX(-50%); }
.fx-radio-choice .scale .end { right: 0; }

/* the last row: what to pick, in the page's light green */
.fx-radio-choice .pick .cell { background: color-mix(in srgb, var(--accent) 55%, var(--node-bg)); }
.fx-radio-choice .pick .lab { color: var(--title); }

/* phone: each row is a label over one two-part card, so both answers stay side by side */
@container (width < 560px) {
  .fx-radio-choice .cmp { gap: 14px; }
  .fx-radio-choice .row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 0; }
  .fx-radio-choice .lab { grid-column: 1 / -1; border-top: 0; padding: 0 0 7px; }
  .fx-radio-choice .head .lab { display: none; }
  .fx-radio-choice .head { column-gap: 10px; }
  .fx-radio-choice .cell,
  .fx-radio-choice .head .cell,
  .fx-radio-choice .row:last-child .cell { padding: 10px 11px 11px; border: 1.3px solid var(--ink-2); box-shadow: var(--pop); }
  .fx-radio-choice .row:not(.head) .cell.rec { border-radius: 10px 0 0 10px; border-right: 0; }
  .fx-radio-choice .row:not(.head) .cell.bt { border-radius: 0 10px 10px 0; border-left: 1px dashed var(--border-strong); }
  .fx-radio-choice .head .cell { border-radius: 10px; }
  .fx-radio-choice .cell p { font-size: 12.5px; }
  .fx-radio-choice .name { font-size: 14px; }
  .fx-radio-choice .head .path { font-size: 11.5px; }
  .fx-radio-choice .tag { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .fx-radio-choice .v b { font-size: 14px; }
  .fx-radio-choice .v { font-size: 12px; }
}

/* wide: chip and sentence side by side, so the chips form a column the eye can run down and across */
@container (width >= 900px) {
  .fx-radio-choice .row:not(.head):not(.pick) .cell:not(.rate) { display: grid; grid-template-columns: 168px minmax(0, 1fr); align-items: start; column-gap: 14px; }
  .fx-radio-choice .row:not(.head):not(.pick) .cell:not(.rate) p { padding-top: 2px; }
  .fx-radio-choice .cell .fx-chip { justify-self: start; }
  .fx-radio-choice .rate { display: grid; grid-template-columns: 168px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 14px; row-gap: 4px; align-items: center; }
  .fx-radio-choice .rate .v { grid-row: 1 / 3; align-self: start; padding-top: 1px; }
  .fx-radio-choice .rate .v b { display: block; }
}
</style>
```

## G One key press, in milliseconds {span=3}
```free time-ruler
<p class="fx-how"><b>How to read this:</b> time runs left to right in milliseconds (ms), and each bar is one stop of a key press. Top row: a fast receiver, checked 1,000 times a second. Bottom row: a basic one, checked 125 times a second. A <b>solid</b> bar is a fixed time; a <b>striped</b> bar is an “up to” or “varies” time.</p>

<ul class="key" aria-hidden="true">
  <li><span class="sw is-solid"></span>solid: a fixed time</li>
  <li><span class="sw is-striped"></span>striped: "up to", or varies</li>
  <li><span class="sw is-radio"></span>orange: the report on the radio</li>
  <li><span class="sw is-wait"></span>amber: waiting</li>
</ul>

<svg class="rl rl-wide" viewBox="0 0 1346 332" role="img" aria-label="A ruler from 0 to 35 milliseconds. A key press on a fast receiver: contacts settle about 5 ms, radio trip and got it about 1 ms, wait for the computer's check up to 1 ms, the computer's own work a few ms, wait for the screen's redraw up to 16.7 ms. On a basic receiver only the wait for the check changes, to up to 8 ms. A blink, roughly 100 ms or more, runs far off the ruler.">
  <defs>
    <pattern id="fx-time-ruler-w-wait" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hb-wait"/><line x1="1" y1="0" x2="1" y2="7" class="hl-wait"/></pattern>
    <pattern id="fx-time-ruler-w-work" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="hb-work"/><line x1="1" y1="0" x2="1" y2="7" class="hl-work"/></pattern>
  </defs>

  <g class="grid">
    <line x1="220" y1="116" x2="220" y2="300"/><line x1="370" y1="116" x2="370" y2="300"/><line x1="520" y1="116" x2="520" y2="300"/><line x1="670" y1="116" x2="670" y2="300"/>
    <line x1="820" y1="116" x2="820" y2="300"/><line x1="970" y1="116" x2="970" y2="300"/><line x1="1120" y1="116" x2="1120" y2="300"/><line x1="1270" y1="116" x2="1270" y2="300"/>
  </g>
  <g class="guide">
    <line x1="430" y1="118" x2="430" y2="222"/><line x1="640" y1="178" x2="640" y2="222"/>
    <line x1="1021" y1="118" x2="1021" y2="160"/><line x1="1231" y1="178" x2="1231" y2="220"/>
  </g>

  <!-- labels: a staircase in time order, each leader to its bar on the fast row -->
  <g class="tiers">
    <path class="fx-leader" d="M295 11 V124"/><circle class="pin" cx="295" cy="124" r="2.4"/>
    <text class="fx-t" x="302" y="20">Contacts settle<tspan class="fx-t-m"> · about 5 ms</tspan></text>
    <path class="fx-leader" d="M385 33 V124"/><circle class="pin" cx="385" cy="124" r="2.4"/>
    <text class="fx-t" x="392" y="42">Radio trip and “got it”<tspan class="fx-t-m"> · about 1 ms</tspan></text>
    <path class="fx-leader" d="M415 55 V124"/><circle class="pin" cx="415" cy="124" r="2.4"/>
    <text class="fx-t" x="422" y="64">Wait for the computer’s next check<tspan class="fx-t-m"> · up to 1 ms here</tspan></text>
    <path class="fx-leader" d="M475 77 V124"/><circle class="pin" cx="475" cy="124" r="2.4"/>
    <text class="fx-t" x="482" y="86">The computer’s own work<tspan class="fx-t-m"> · a few ms</tspan></text>
    <path class="fx-leader" d="M600 99 V124"/><circle class="pin" cx="600" cy="124" r="2.4"/>
    <text class="fx-t" x="607" y="108">Wait for the screen’s next redraw<tspan class="fx-t-m"> · up to 16.7 ms on a 60 Hz screen</tspan></text>
  </g>

  <text class="fx-t" x="0" y="136">Fast receiver</text>
  <text class="fx-t-m" x="0" y="151">1,000 checks a second</text>
  <g class="row">
    <rect class="bar is-key" x="220" y="124" width="150" height="30" rx="4"/>
    <rect class="bar is-radio" x="370" y="124" width="30" height="30" rx="4"/>
    <rect class="bar is-wait is-check" x="400" y="124" width="30" height="30" rx="4" fill="url(#fx-time-ruler-w-wait)"/>
    <rect class="bar is-work" x="430" y="124" width="90" height="30" rx="4" fill="url(#fx-time-ruler-w-work)"/>
    <rect class="bar is-wait" x="520" y="124" width="501" height="30" rx="4" fill="url(#fx-time-ruler-w-wait)"/>
  </g>
  <text class="fx-t-m" x="1029" y="143">on screen</text>

  <text class="fx-t" x="0" y="196">Basic receiver</text>
  <text class="fx-t-m" x="0" y="211">125 checks a second</text>
  <g class="row">
    <rect class="bar is-key" x="220" y="184" width="150" height="30" rx="4"/>
    <rect class="bar is-radio" x="370" y="184" width="30" height="30" rx="4"/>
    <rect class="bar is-wait is-check" x="400" y="184" width="240" height="30" rx="4" fill="url(#fx-time-ruler-w-wait)"/>
    <rect class="bar is-work" x="640" y="184" width="90" height="30" rx="4" fill="url(#fx-time-ruler-w-work)"/>
    <rect class="bar is-wait" x="730" y="184" width="501" height="30" rx="4" fill="url(#fx-time-ruler-w-wait)"/>
  </g>
  <text class="fx-t-m" x="1239" y="203">on screen</text>
  <path class="brace" d="M400 222 V228 H640 V222"/>
  <text class="fx-t" x="400" y="245">Up to 8 ms<tspan class="fx-t-m"> at 125 checks a second: the only bar that differs. Everything after it slides right.</tspan></text>

  <text class="fx-t" x="0" y="266">A blink</text>
  <text class="fx-t-m" x="0" y="281">roughly 100 ms or more</text>
  <path class="blink" d="M220 260 H1314 V254 L1336 267 L1314 280 V274 H220 Z"/>
  <text class="fx-t-m" x="1336" y="249" text-anchor="end">runs far past this ruler</text>

  <g class="axis">
    <line class="fx-axis" x1="220" y1="300" x2="1290" y2="300"/>
    <path class="minor" d="M250 300v4M280 300v4M310 300v4M340 300v4M400 300v4M430 300v4M460 300v4M490 300v4M550 300v4M580 300v4M610 300v4M640 300v4M700 300v4M730 300v4M760 300v4M790 300v4M850 300v4M880 300v4M910 300v4M940 300v4M1000 300v4M1030 300v4M1060 300v4M1090 300v4M1150 300v4M1180 300v4M1210 300v4M1240 300v4"/>
    <path class="major" d="M220 300v8M370 300v8M520 300v8M670 300v8M820 300v8M970 300v8M1120 300v8M1270 300v8"/>
    <text class="fx-t-m" x="217" y="324">0 key down</text>
    <text class="fx-t-m" x="370" y="324" text-anchor="middle">5</text>
    <text class="fx-t-m" x="520" y="324" text-anchor="middle">10</text>
    <text class="fx-t-m" x="670" y="324" text-anchor="middle">15</text>
    <text class="fx-t-m" x="820" y="324" text-anchor="middle">20</text>
    <text class="fx-t-m" x="970" y="324" text-anchor="middle">25</text>
    <text class="fx-t-m" x="1120" y="324" text-anchor="middle">30</text>
    <text class="fx-t-m" x="1270" y="324" text-anchor="middle">35 ms</text>
  </g>
</svg>

<svg class="rl rl-narrow" viewBox="0 0 328 354" role="img" aria-label="A ruler from 0 to 35 milliseconds. A key press on a fast receiver: contacts settle about 5 ms, radio trip and got it about 1 ms, wait for the computer's check up to 1 ms, the computer's own work a few ms, wait for the screen's redraw up to 16.7 ms. On a basic receiver only the wait for the check changes, to up to 8 ms. A blink, roughly 100 ms or more, runs far off the ruler.">
  <defs>
    <pattern id="fx-time-ruler-n-wait" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="hb-wait"/><line x1="1" y1="0" x2="1" y2="6" class="hl-wait"/></pattern>
    <pattern id="fx-time-ruler-n-work" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="hb-work"/><line x1="1" y1="0" x2="1" y2="6" class="hl-work"/></pattern>
  </defs>

  <g class="grid">
    <line x1="54" y1="162" x2="54" y2="326"/><line x1="91" y1="162" x2="91" y2="326"/><line x1="128" y1="162" x2="128" y2="326"/><line x1="165" y1="162" x2="165" y2="326"/>
    <line x1="202" y1="162" x2="202" y2="326"/><line x1="239" y1="162" x2="239" y2="326"/><line x1="276" y1="162" x2="276" y2="326"/><line x1="313" y1="162" x2="313" y2="326"/>
  </g>
  <g class="guide">
    <line x1="105.8" y1="162" x2="105.8" y2="244"/><line x1="157.6" y1="208" x2="157.6" y2="244"/>
    <line x1="251.6" y1="162" x2="251.6" y2="196"/><line x1="303.4" y1="208" x2="303.4" y2="242"/>
  </g>

  <g class="tiers">
    <path class="fx-leader" d="M72.5 5 V168"/><circle class="pin" cx="72.5" cy="168" r="2.2"/>
    <text class="fx-t" x="78.5" y="14">Contacts settle</text><text class="fx-t-m" x="78.5" y="28">about 5 ms</text>
    <path class="fx-leader" d="M94.7 37 V168"/><circle class="pin" cx="94.7" cy="168" r="2.2"/>
    <text class="fx-t" x="100.7" y="46">Radio trip and “got it”</text><text class="fx-t-m" x="100.7" y="60">about 1 ms</text>
    <path class="fx-leader" d="M102.1 69 V168"/><circle class="pin" cx="102.1" cy="168" r="2.2"/>
    <text class="fx-t" x="108.1" y="78">Wait for the next check</text><text class="fx-t-m" x="108.1" y="92">up to 1 ms here</text>
    <path class="fx-leader" d="M116.9 101 V168"/><circle class="pin" cx="116.9" cy="168" r="2.2"/>
    <text class="fx-t" x="122.9" y="110">The computer’s own work</text><text class="fx-t-m" x="122.9" y="124">a few ms</text>
    <path class="fx-leader" d="M150 133 V168"/><circle class="pin" cx="150" cy="168" r="2.2"/>
    <text class="fx-t" x="156" y="142">Wait for the screen</text><text class="fx-t-m" x="156" y="156">up to 16.7 ms (60 Hz)</text>
  </g>

  <text class="fx-t" x="0" y="178">Fast</text>
  <text class="fx-t-m" x="0" y="191">1,000/s</text>
  <g class="row">
    <rect class="bar is-key" x="54" y="168" width="37" height="22" rx="3"/>
    <rect class="bar is-radio" x="91" y="168" width="7.4" height="22" rx="2"/>
    <rect class="bar is-wait is-check" x="98.4" y="168" width="7.4" height="22" rx="2" fill="url(#fx-time-ruler-n-wait)"/>
    <rect class="bar is-work" x="105.8" y="168" width="22.2" height="22" rx="3" fill="url(#fx-time-ruler-n-work)"/>
    <rect class="bar is-wait" x="128" y="168" width="123.6" height="22" rx="3" fill="url(#fx-time-ruler-n-wait)"/>
  </g>
  <text class="fx-t-m" x="257" y="183">on screen</text>

  <text class="fx-t" x="0" y="224">Basic</text>
  <text class="fx-t-m" x="0" y="237">125/s</text>
  <g class="row">
    <rect class="bar is-key" x="54" y="214" width="37" height="22" rx="3"/>
    <rect class="bar is-radio" x="91" y="214" width="7.4" height="22" rx="2"/>
    <rect class="bar is-wait is-check" x="98.4" y="214" width="59.2" height="22" rx="3" fill="url(#fx-time-ruler-n-wait)"/>
    <rect class="bar is-work" x="157.6" y="214" width="22.2" height="22" rx="3" fill="url(#fx-time-ruler-n-work)"/>
    <rect class="bar is-wait" x="179.8" y="214" width="123.6" height="22" rx="3" fill="url(#fx-time-ruler-n-wait)"/>
  </g>
  <path class="brace" d="M98.4 242 V247 H157.6 V242"/>
  <text class="fx-t" x="98.4" y="262">Up to 8 ms<tspan class="fx-t-m"> · the only change;</tspan></text>
  <text class="fx-t-m" x="98.4" y="276">everything after it slides right</text>

  <text class="fx-t" x="0" y="306">Blink</text>
  <text class="fx-t-m" x="54" y="292">roughly 100 ms or more →</text>
  <path class="blink" d="M54 298 H312 V294 L326 303 L312 312 V308 H54 Z"/>

  <g class="axis">
    <line class="fx-axis" x1="54" y1="326" x2="318" y2="326"/>
    <path class="major" d="M54 326v7M91 326v7M128 326v7M165 326v7M202 326v7M239 326v7M276 326v7M313 326v7"/>
    <text class="fx-t-m" x="0" y="347">ms</text>
    <text class="fx-t-m" x="54" y="347" text-anchor="middle">0</text>
    <text class="fx-t-m" x="91" y="347" text-anchor="middle">5</text>
    <text class="fx-t-m" x="128" y="347" text-anchor="middle">10</text>
    <text class="fx-t-m" x="165" y="347" text-anchor="middle">15</text>
    <text class="fx-t-m" x="202" y="347" text-anchor="middle">20</text>
    <text class="fx-t-m" x="239" y="347" text-anchor="middle">25</text>
    <text class="fx-t-m" x="276" y="347" text-anchor="middle">30</text>
    <text class="fx-t-m" x="313" y="347" text-anchor="middle">35</text>
  </g>
</svg>

<p class="fx-cap">These are typical sizes. Real ones vary by device.</p>

<div class="fx-grid-2 pair">
  <div class="stat">
    <div class="big"><span class="fx-unit">about</span><span class="fx-num">1</span><span class="fx-unit">ms</span></div>
    <span class="mini is-radio" style="--ms: 1"></span>
    <p class="line">for the radio trip and its “got it”. One of the shortest stops on the whole trip.</p>
  </div>
  <div class="stat">
    <div class="big"><span class="fx-unit">up to</span><span class="fx-num">16.7</span><span class="fx-unit">ms</span></div>
    <span class="mini is-wait" style="--ms: 16.7"></span>
    <p class="line">waiting for a 60 Hz screen to redraw. Usually the longest stop. Both bars are drawn to the same scale.</p>
  </div>
</div>

<p class="fx-take">The radio is one of the shortest stops; waiting for the screen to redraw is usually the longest. A faster receiver shortens only one small bar.</p>
<style>
/* time-ruler: one key press laid along a millisecond ruler. Two drawings (wide, narrow) so SVG text stays at 11-12px. */
.fx-time-ruler .rl-narrow { display: none; }
@container (width < 760px) {
  .fx-time-ruler .rl-wide { display: none; }
  .fx-time-ruler .rl-narrow { display: block; }
}

/* the key above the ruler */
.fx-time-ruler .key { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 12px; color: var(--muted); }
.fx-time-ruler .key li { display: inline-flex; align-items: center; gap: 8px; }
.fx-time-ruler .sw { display: inline-block; width: 26px; height: 13px; border: 1.3px solid var(--node-border); border-radius: 3px; background: var(--surface-2); }
.fx-time-ruler .sw.is-striped { background: repeating-linear-gradient(135deg, var(--node-border) 0 1.3px, var(--surface-2) 1.3px 5px); }
.fx-time-ruler .sw.is-radio { background: color-mix(in srgb, var(--trace-0) 72%, var(--node-bg)); }
.fx-time-ruler .sw.is-wait { background: color-mix(in srgb, var(--warn-line) 45%, var(--node-bg)); }

/* bars */
.fx-time-ruler .row { filter: var(--node-shadow); }
.fx-time-ruler .bar { stroke: var(--node-border); stroke-width: 1.4; stroke-linejoin: round; }
.fx-time-ruler .bar.is-key { fill: var(--surface-2); }
.fx-time-ruler .bar.is-radio { fill: color-mix(in srgb, var(--trace-0) 72%, var(--node-bg)); }
.fx-time-ruler .bar.is-check { stroke: var(--ink); stroke-width: 1.8; }
.fx-time-ruler .hb-wait { fill: color-mix(in srgb, var(--warn-line) 30%, var(--node-bg)); }
.fx-time-ruler .hl-wait { stroke: var(--warn-line); stroke-width: 2.2; }
.fx-time-ruler .hb-work { fill: var(--surface-2); }
.fx-time-ruler .hl-work { stroke: color-mix(in srgb, var(--node-border) 55%, var(--surface-2)); stroke-width: 1.6; }

/* ruler furniture */
.fx-time-ruler .grid line { stroke: var(--border); stroke-width: 1; }
.fx-time-ruler .guide line { stroke: var(--edge); stroke-width: 1; stroke-dasharray: 3 3; }
.fx-time-ruler .pin { fill: var(--node-border); }
.fx-time-ruler .brace { fill: none; stroke: var(--warn-line); stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
.fx-time-ruler .blink { fill: var(--surface-2); stroke: var(--line-ctl); stroke-width: 1.2; stroke-dasharray: 4 3; stroke-linejoin: round; opacity: 0.85; }
.fx-time-ruler .axis .minor { stroke: var(--line-ctl); stroke-width: 1; }
.fx-time-ruler .axis .major { stroke: var(--node-border); stroke-width: 1.3; }
.fx-time-ruler .rl text { font-variant-numeric: tabular-nums; }

/* the two numbers that matter */
.fx-time-ruler .pair { padding-top: 14px; border-top: 1px solid var(--border); gap: 14px 40px; }
.fx-time-ruler .stat { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.fx-time-ruler .big { display: flex; align-items: baseline; gap: 8px; }
.fx-time-ruler .mini { display: block; height: 14px; width: calc(var(--ms) / 16.7 * 100%); min-width: 6px; border: 1.3px solid var(--node-border); border-radius: 3px; box-shadow: 0 1.5px 0 var(--drop-2); }
.fx-time-ruler .mini.is-radio { background: color-mix(in srgb, var(--trace-0) 72%, var(--node-bg)); }
.fx-time-ruler .mini.is-wait { background: repeating-linear-gradient(135deg, var(--warn-line) 0 2px, color-mix(in srgb, var(--warn-line) 30%, var(--node-bg)) 2px 6px); }
.fx-time-ruler .line { margin: 0; max-width: 52ch; font-size: 13px; line-height: 1.55; color: var(--text); text-wrap: pretty; }
</style>
```

## H When something goes wrong {span=3}
```free trouble-path
<p class="fx-how"><b>How to read this:</b> the line is the path a mouse move or key press takes, in order, from your hand to the screen. Each problem card hangs under the stop where that problem lives. A quiet grey stop has no card.</p>

<ol class="path">
  <li class="stop has-cards">
    <div class="head">
      <span class="icon"><svg viewBox="0 0 40 40" role="img" aria-label="Mouse and keyboard"><rect class="fx-ink fx-fill" x="1.5" y="14" width="26" height="17" rx="2.5"/><path class="fx-ink" d="M5.5 19h2M10 19h2M14.5 19h2M19 19h2M23 19h1M5.5 23h2M10 23h2M14.5 23h2M19 23h5M8.5 27h12"/><rect class="fx-ink fx-fill" x="29.5" y="10" width="9" height="18" rx="4.5"/><path class="fx-ink" d="M34 10v6"/></svg></span>
      <span class="label"><b class="name">Mouse and keyboard</b><span class="role">sense your hand</span></span>
    </div>
    <div class="cards">
      <article class="card fx-tile">
        <span class="fx-chip is-warn">Common</span>
        <p class="say">“My mouse stops on my glass desk.”</p>
        <p class="why"><b>Why</b>The <b class="fx-term">sensor</b> photographs the desk, and clear glass has no texture to photograph.</p>
        <p class="try"><b>Try first</b>Use a mouse pad.</p>
      </article>
      <article class="card fx-tile">
        <span class="fx-chip is-ok">Normal</span>
        <p class="say">“The first move after a break lags.”</p>
        <p class="why"><b>Why</b>The mouse naps to save its battery. Your first move wakes it up.</p>
        <p class="try"><b>Try first</b>Nothing: it is normal. If the lag never goes away, check the battery.</p>
      </article>
    </div>
  </li>

  <li class="stop has-cards">
    <div class="head">
      <span class="icon"><svg viewBox="0 0 40 40" role="img" aria-label="Radio"><circle class="fx-ink fx-fill" cx="20" cy="27" r="2.6"/><path class="fx-ink" d="M14.5 21.5a7.8 7.8 0 0 1 11 0M10.5 17.5a13.4 13.4 0 0 1 19 0M6.5 13.5a19 19 0 0 1 27 0"/><path class="fx-ink" d="M20 29.6V35"/></svg></span>
      <span class="label"><b class="name">Radio</b><span class="role">carries each report</span></span>
    </div>
    <div class="cards">
      <article class="card fx-tile">
        <span class="fx-chip is-warn">Common</span>
        <p class="say">“My arrow stutters or jumps.”</p>
        <p class="why"><b>Why</b>Noise or distance loses reports, and the mouse has to send them again.</p>
        <p class="try"><b>Try first</b>Move the receiver closer: a front USB 2 port or a short extension cable.</p>
      </article>
    </div>
  </li>

  <li class="stop is-quiet">
    <div class="head">
      <span class="icon"><svg viewBox="0 0 40 40" role="img" aria-label="USB receiver"><rect class="fx-ink fx-fill" x="13" y="6" width="14" height="20" rx="3"/><rect class="fx-ink fx-fill" x="15" y="26" width="10" height="8" rx="1"/><path class="fx-ink" d="M18 29.5h1.5M20.5 29.5H22"/><circle class="fx-ink" cx="20" cy="13" r="2"/></svg></span>
      <span class="label"><b class="name">Receiver</b><span class="role">acts like a cable</span></span>
    </div>
  </li>

  <li class="stop has-cards">
    <div class="head">
      <span class="icon"><svg viewBox="0 0 40 40" role="img" aria-label="Computer"><rect class="fx-ink fx-fill" x="11" y="5" width="18" height="30" rx="2.5"/><path class="fx-ink" d="M15 11h10M15 15h10"/><circle class="fx-ink" cx="20" cy="27" r="2.6"/></svg></span>
      <span class="label"><b class="name">Computer</b><span class="role">turns codes into letters</span></span>
    </div>
    <div class="cards">
      <article class="card fx-tile">
        <span class="fx-chip is-ok">Easy fix</span>
        <p class="say">“My keys type the wrong letters.”</p>
        <p class="why"><b>Why</b>The computer switched its <b class="fx-term">keyboard layout</b>. The keys still send the same codes.</p>
        <p class="try"><b>Try first</b>Switch the layout back.</p>
      </article>
    </div>
  </li>

  <li class="stop is-quiet">
    <div class="head">
      <span class="icon"><svg viewBox="0 0 40 40" role="img" aria-label="Screen"><rect class="fx-ink fx-fill" x="5" y="7" width="30" height="20" rx="2.5"/><path class="fx-ink" d="M20 27v5M13.5 33h13"/><path class="fx-ink" d="M17 14l3 3 -3 3"/></svg></span>
      <span class="label"><b class="name">Screen</b><span class="role">shows the result</span></span>
    </div>
  </li>
</ol>

<p class="fx-take">Find the stop first, then the fix. Ask where on the path the trouble starts, and the first thing to try follows from it.</p>
<style>
/* trouble-path: the path from hand to screen, with each problem pinned under the stop where it lives. */
.fx-trouble-path .path { --gap: 18px; --icon: 56px; list-style: none; margin: 0; padding: 4px 0 2px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0 var(--gap); }
.fx-trouble-path .stop { position: relative; display: flex; flex-direction: column; min-width: 0; }

/* the line that joins the stops, with a chevron halfway */
.fx-trouble-path .stop:not(:last-child)::before { content: ""; position: absolute; z-index: 0; top: calc(var(--icon) / 2); left: 50%; width: calc(100% + var(--gap)); border-top: 1.4px solid var(--node-border); }
.fx-trouble-path .stop:not(:last-child)::after { content: ""; position: absolute; z-index: 0; top: calc(var(--icon) / 2); left: calc(100% + var(--gap) / 2); width: 7px; height: 7px; border-top: 1.4px solid var(--node-border); border-right: 1.4px solid var(--node-border); background: var(--surface); transform: translate(-50%, -50%) rotate(45deg); }

/* the stop: icon tile and its name */
.fx-trouble-path .head { display: flex; flex-direction: column; align-items: center; gap: 9px; text-align: center; }
.fx-trouble-path .icon { position: relative; z-index: 1; display: grid; place-items: center; flex: none; width: var(--icon); height: var(--icon); border: 1.3px solid var(--ink-2); border-radius: 12px; background: var(--node-bg); box-shadow: var(--pop); }
.fx-trouble-path .icon svg { width: 42px; height: 42px; }
.fx-trouble-path .label { display: flex; flex-direction: column; gap: 2px; }
.fx-trouble-path .name { font-size: 13px; font-weight: 800; color: var(--title); line-height: 1.35; }
.fx-trouble-path .role { font-size: 11.5px; color: var(--muted); line-height: 1.4; }
.fx-trouble-path .is-quiet .icon { border-color: var(--line-ctl); background: var(--surface-2); box-shadow: none; }
.fx-trouble-path .is-quiet .icon .fx-ink { stroke: var(--line-ctl); }
.fx-trouble-path .is-quiet .icon .fx-fill { fill: var(--surface-2); }
.fx-trouble-path .is-quiet .name { color: var(--muted); }

/* the cards, pinned under their stop */
.fx-trouble-path .cards { display: flex; flex-direction: column; gap: 18px; margin-top: 18px; }
.fx-trouble-path .card { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; }
.fx-trouble-path .card::before { content: ""; position: absolute; left: 50%; top: -19px; height: 17px; border-left: 1.4px solid var(--node-border); }
.fx-trouble-path .card::after { content: ""; position: absolute; left: 50%; top: -21px; width: 7px; height: 7px; border: 1.4px solid var(--node-border); border-radius: 50%; background: var(--node-bg); transform: translateX(-50%) translateX(0.7px); }
.fx-trouble-path .card > p { margin: 0; text-wrap: pretty; }
.fx-trouble-path .say { font-size: 13px; font-weight: 800; line-height: 1.45; color: var(--title); }
.fx-trouble-path .why, .fx-trouble-path .try { font-size: 12.5px; line-height: 1.5; color: var(--text); }
.fx-trouble-path .why > b:first-child, .fx-trouble-path .try > b:first-child { display: block; margin-bottom: 1px; font: 800 11px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.fx-trouble-path .try > b:first-child { color: var(--ok); }
.fx-trouble-path .try { padding-top: 8px; border-top: 1px dashed var(--border-strong); align-self: stretch; }

/* narrow: the path turns vertical, cards sit beside their stop */
@container (width < 760px) {
  .fx-trouble-path .path { --gap: 22px; grid-template-columns: minmax(0, 1fr); gap: var(--gap) 0; }
  .fx-trouble-path .stop { display: grid; grid-template-columns: var(--icon) minmax(0, 1fr); column-gap: 14px; align-items: start; }
  .fx-trouble-path .head { display: contents; }
  .fx-trouble-path .icon { grid-column: 1; grid-row: 1 / span 2; }
  .fx-trouble-path .label { grid-column: 2; grid-row: 1; min-height: var(--icon); justify-content: center; text-align: left; }
  .fx-trouble-path .cards { grid-column: 2; grid-row: 2; margin-top: 8px; gap: 14px; }
  .fx-trouble-path .card::before, .fx-trouble-path .card::after { display: none; }
  .fx-trouble-path .stop:not(:last-child)::before { top: calc(var(--icon) / 2); left: calc(var(--icon) / 2); width: 0; height: calc(100% + var(--gap)); border-top: 0; border-left: 1.4px solid var(--node-border); }
  .fx-trouble-path .stop:not(:last-child)::after { top: calc(100% + var(--gap) / 2); left: calc(var(--icon) / 2 + 0.7px); transform: translate(-50%, -50%) rotate(135deg); }
}
</style>
```
