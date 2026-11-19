---
title: The kit for free sections
cols: 1
---

Lead: One panel per piece of the kit. Each must look like the page, in light and dark, at 1440px and 390px.

## A The blue chip
```free chips
<p class="fx-cap">Blue is other traffic, such as Wi-Fi.</p>
<div class="fx-chips-row"><span class="fx-chip is-cool">Wi-Fi: other traffic</span><span class="fx-chip is-hot">a report: moves</span><span class="fx-chip is-ok">ok</span><span class="fx-chip is-warn">warn</span><span class="fx-chip is-no">no</span><span class="fx-chip is-info">info</span><span class="fx-chip is-accent">accent</span><span class="fx-chip">plain</span></div>
<style>.fx-chips .fx-chips-row { display: flex; flex-wrap: wrap; gap: 8px; }</style>
```

## B A wide drawing and a phone drawing
```free swap
<p class="fx-cap">Two drawings of one path: the wide one at 560px and wider, the phone one under 560px.</p>
<svg class="fx-wide" viewBox="0 0 640 96" role="img" aria-label="The wide drawing: hand, mouse, radio and screen in one row.">
  <text class="fx-t-h" x="0" y="12">The wide drawing: one row</text>
  <rect class="fx-ink fx-fill" x="0" y="30" width="118" height="50" rx="10"/><text class="fx-t" x="59" y="59" text-anchor="middle">hand</text>
  <path class="fx-hot-line" d="M128 55H164" fill="none"/>
  <rect class="fx-ink fx-fill" x="174" y="30" width="118" height="50" rx="10"/><text class="fx-t" x="233" y="59" text-anchor="middle">mouse</text>
  <path class="fx-hot-line" d="M302 55H338" fill="none"/>
  <rect class="fx-ink fx-hot-fill" x="348" y="30" width="118" height="50" rx="10"/><text class="fx-t" x="407" y="59" text-anchor="middle">radio</text>
  <path class="fx-hot-line" d="M476 55H512" fill="none"/>
  <rect class="fx-ink fx-fill" x="522" y="30" width="116" height="50" rx="10"/><text class="fx-t" x="580" y="59" text-anchor="middle">screen</text>
</svg>
<svg class="fx-phone" viewBox="0 0 320 250" role="img" aria-label="The phone drawing: hand, mouse, radio and screen in one column.">
  <text class="fx-t-h" x="0" y="12">The phone drawing: one column</text>
  <rect class="fx-ink fx-fill" x="60" y="26" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="49" text-anchor="middle">hand</text>
  <path class="fx-hot-line" d="M160 70V82" fill="none"/>
  <rect class="fx-ink fx-fill" x="60" y="88" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="111" text-anchor="middle">mouse</text>
  <path class="fx-hot-line" d="M160 132V144" fill="none"/>
  <rect class="fx-ink fx-hot-fill" x="60" y="150" width="200" height="38" rx="10"/><text class="fx-t" x="160" y="173" text-anchor="middle">radio</text>
  <path class="fx-hot-line" d="M160 194V206" fill="none"/>
  <rect class="fx-ink fx-fill" x="60" y="212" width="200" height="36" rx="10"/><text class="fx-t" x="160" y="234" text-anchor="middle">screen</text>
</svg>
<style>.fx-swap .fx-wide { max-width: 640px; }</style>
```

## C Solid bars
```free bars
<p class="fx-cap">A solid bar is a fixed length, in its role colour.</p>
<div class="fx-bars-rows">
  <span>hot: moves</span><span class="fx-bar is-hot" style="width: 72%"></span>
  <span>good: answers</span><span class="fx-bar is-good" style="width: 54%"></span>
  <span>bad: fails</span><span class="fx-bar is-bad" style="width: 30%"></span>
  <span>slow: waits</span><span class="fx-bar is-slow" style="width: 88%"></span>
  <span>cool: other traffic</span><span class="fx-bar is-cool" style="width: 44%"></span>
  <span>plain</span><span class="fx-bar" style="width: 62%"></span>
</div>
<svg viewBox="0 0 320 62" role="img" aria-label="Five solid shapes in a drawing, one per role: hot, good, bad, slow and cool.">
  <rect class="fx-ink fx-hot-solid" x="2" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="28" y="50" text-anchor="middle">hot</text>
  <rect class="fx-ink fx-good-solid" x="68" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="94" y="50" text-anchor="middle">good</text>
  <rect class="fx-ink fx-bad-solid" x="134" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="160" y="50" text-anchor="middle">bad</text>
  <rect class="fx-ink fx-slow-solid" x="200" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="226" y="50" text-anchor="middle">slow</text>
  <rect class="fx-ink fx-cool-solid" x="266" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="292" y="50" text-anchor="middle">cool</text>
</svg>
<style>
.fx-bars .fx-bars-rows { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px 12px; align-items: center; font-size: 12px; color: var(--muted); }
.fx-bars svg { max-width: 480px; }
</style>
```

## D The hatch: up to, or varies
```free varies
<p class="fx-cap">Solid is a fixed time; striped is "up to", or a time that varies.</p>
<div class="fx-varies-rows">
  <span>hot</span><span class="fx-varies-track"><span class="fx-bar is-hot" style="width: 30%"></span><span class="fx-bar is-hot is-varies" style="width: 40%"></span></span>
  <span>good</span><span class="fx-varies-track"><span class="fx-bar is-good" style="width: 20%"></span><span class="fx-bar is-good is-varies" style="width: 30%"></span></span>
  <span>bad</span><span class="fx-varies-track"><span class="fx-bar is-bad" style="width: 12%"></span><span class="fx-bar is-bad is-varies" style="width: 50%"></span></span>
  <span>slow</span><span class="fx-varies-track"><span class="fx-bar is-slow" style="width: 8%"></span><span class="fx-bar is-slow is-varies" style="width: 80%"></span></span>
  <span>cool</span><span class="fx-varies-track"><span class="fx-bar is-cool" style="width: 25%"></span><span class="fx-bar is-cool is-varies" style="width: 25%"></span></span>
  <span>plain</span><span class="fx-varies-track"><span class="fx-bar" style="width: 35%"></span><span class="fx-bar is-varies" style="width: 35%"></span></span>
</div>
<svg viewBox="0 0 320 62" role="img" aria-label="Five hatched shapes in a drawing, one per role: hot, good, bad, slow and cool.">
  <rect class="fx-ink" fill="url(#fx-hatch-hot)" x="2" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="28" y="50" text-anchor="middle">hot</text>
  <rect class="fx-ink" fill="url(#fx-hatch-good)" x="68" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="94" y="50" text-anchor="middle">good</text>
  <rect class="fx-ink" fill="url(#fx-hatch-bad)" x="134" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="160" y="50" text-anchor="middle">bad</text>
  <rect class="fx-ink" fill="url(#fx-hatch-slow)" x="200" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="226" y="50" text-anchor="middle">slow</text>
  <rect class="fx-ink" fill="url(#fx-hatch-cool)" x="266" y="4" width="52" height="24" rx="4"/><text class="fx-t-m" x="292" y="50" text-anchor="middle">cool</text>
</svg>
<style>
.fx-varies .fx-varies-rows { display: grid; grid-template-columns: 60px minmax(0, 1fr); gap: 8px 12px; align-items: center; font-size: 12px; color: var(--muted); }
.fx-varies .fx-varies-track { display: flex; }
.fx-varies svg { max-width: 480px; }
</style>
```

## E Numbered dots
```free dots
<p class="fx-cap">A numbered dot names a part through a leader line. The lit one is green.</p>
<svg viewBox="0 0 320 150" role="img" aria-label="A device with three parts, each named by a numbered dot: 1 sensor, 2 chip, 3 battery. Dot 2 is lit.">
  <rect class="fx-ink fx-fill" x="4" y="8" width="172" height="134" rx="14"/>
  <circle class="fx-ink fx-hot-fill" cx="50" cy="40" r="16"/>
  <rect class="fx-ink fx-fill-2" x="92" y="58" width="56" height="36" rx="4"/>
  <rect class="fx-ink fx-fill-2" x="28" y="102" width="92" height="24" rx="5"/>
  <path class="fx-leader" d="M66 40H213"/>
  <path class="fx-leader" d="M148 76H213"/>
  <path class="fx-leader" d="M120 114H213"/>
  <g class="fx-dot" transform="translate(222 40)"><circle r="9"/><text>1</text></g>
  <g class="fx-dot is-on" transform="translate(222 76)"><circle r="9"/><text>2</text></g>
  <g class="fx-dot" transform="translate(222 114)"><circle r="9"/><text>3</text></g>
  <text class="fx-t" x="238" y="44">sensor</text>
  <text class="fx-t" x="238" y="80">chip</text>
  <text class="fx-t" x="238" y="118">battery</text>
</svg>
<style>.fx-dots svg { max-width: 480px; }</style>
```

## F The legend
```free legend
<p class="fx-cap">A legend names each colour and the stripes. Colour never stands alone.</p>
<ul class="fx-legend">
  <li><span class="fx-swatch is-hot"></span>hot: moves</li>
  <li><span class="fx-swatch is-good"></span>good: answers</li>
  <li><span class="fx-swatch is-bad"></span>bad: fails</li>
  <li><span class="fx-swatch is-slow"></span>slow: waits</li>
  <li><span class="fx-swatch is-cool"></span>cool: other traffic</li>
  <li><span class="fx-swatch is-varies"></span>striped: up to, or varies</li>
  <li><span class="fx-swatch is-slow is-varies"></span>waits up to</li>
  <li><svg viewBox="0 0 16 16" aria-hidden="true"><circle class="fx-ink fx-hot-fill" cx="8" cy="8" r="5.5"/></svg>a report</li>
</ul>
```

## G Click areas over a drawing
```free hits
<div class="fx-hits-art">
  <svg viewBox="0 0 320 90" role="img" aria-label="Two keys, A and B.">
    <rect class="fx-ink fx-good-fill" data-key="A" x="20" y="14" width="120" height="62" rx="10"/><text class="fx-t" x="80" y="49" text-anchor="middle">A</text>
    <rect class="fx-ink fx-fill" data-key="B" x="180" y="14" width="120" height="62" rx="10"/><text class="fx-t" x="240" y="49" text-anchor="middle">B</text>
  </svg>
  <button type="button" class="fx-hit" data-key="A" aria-label="Press key A" aria-pressed="true" style="left: 5%; top: 11%; width: 40%; height: 78%"></button>
  <button type="button" class="fx-hit" data-key="B" aria-label="Press key B" aria-pressed="false" style="left: 55%; top: 11%; width: 40%; height: 78%"></button>
</div>
<p class="fx-cap fx-hits-say">Key A is pressed. Press a key, or Tab to one.</p>
<style>.fx-hits .fx-hits-art { position: relative; max-width: 480px; }</style>
<script>
const say = root.querySelector(".fx-hits-say");
for (const hit of root.querySelectorAll(".fx-hit")) {
  hit.addEventListener("click", () => {
    for (const b of root.querySelectorAll(".fx-hit")) b.setAttribute("aria-pressed", String(b === hit));
    for (const r of root.querySelectorAll("rect[data-key]")) r.setAttribute("class", r.dataset.key === hit.dataset.key ? "fx-ink fx-good-fill" : "fx-ink fx-fill");
    say.textContent = `Key ${hit.dataset.key} is pressed.`;
  });
}
</script>
```

## H The hidden attribute
```free hidden
<p class="fx-cap">Two buttons are written here. The second one has the hidden attribute, so only one shows.</p>
<div><button class="fx-btn" type="button">I am shown</button> <button class="fx-btn" type="button" hidden>I am hidden</button></div>
```
