---
title: How a Wireless Mouse and Keyboard Work
subtitle: Follow one mouse move and one key press from your hand to the screen
eyebrow: Throwaway sample
theme: auto
cols: 3
---

Lead: Neither device draws anything on screen. Each one sends a few bytes by radio to a small receiver, and the computer turns them into a moving arrow or a letter.

## A Why this matters {span=3}
You use a mouse and keyboard all day, and only think about them when something goes wrong: the arrow stutters, a key types the wrong letter, the mouse stops on a glass desk. Each of those problems lives at one stop on the path below, so knowing the path tells you where to look.

## B In numbers {span=3}
@@FREE:numbers@@

## C The whole trip {span=3}
Follow the whole trip once. The sections after it open up each stop.

```lesson Wireless Mouse and Keyboard
subtitle: Follow one mouse move and one key press from your hand to the screen.
meta: 8 min · Beginner
places: mouse = mouse "Mouse" | dongle = receiver "USB receiver" | os = queue "Input queue" | screen = monitor "Screen" | kbd = keyboard "Keyboard" | layout = layout "Layout"
rails: mouse - dongle - os - screen | kbd - dongle | os - layout
counters: Photos | Report | Radio | Polling | Screen
pucks: change = report | reply = got it | fail = lost report | slow = late wake-up
goals: How a mouse sees movement @2 | What travels over the radio @4 | Why no driver is needed @6 | Why one key can type a or ฟ @9 | Why the first move can lag @11

step Start: No cable, yet the arrow moves [problem]
  You slide the mouse and the arrow follows. You press a key and a letter appears. There is no cable, so how does the computer know?

  Let's follow one movement and one key press from your hand to the screen. Each stop does one small job.
  tip Key idea: The mouse and keyboard never draw anything. They only send small messages, and the computer does the rest.
  show: mouse, kbd, screen
  focus: mouse

step Sensor: The mouse takes photos [how]
  Under the mouse, a small light shines on the desk. A tiny ==camera sensor== takes thousands of pictures of the surface every second.

  A chip compares each picture with the one before. When the desk's tiny bumps shift, it knows how far you moved, and which way.
  tip Why not glass?: Clear glass has no texture to photograph, so many mice stop tracking on it. A mouse pad fixes that.
  focus: mouse
  set: Photos = thousands/s good
  note: mouse = thousands of photos/s

step Report: A few bytes of news [how]
  The chip packs what changed into a ==report==: which buttons are down, how far you moved left or right and up or down, and how much the wheel turned.

  A report is only a few bytes, and the mouse sends a new one whenever you move, click or scroll.
  tip Key idea: The mouse never knows where the arrow is. It only reports how far it moved since the last report.
  focus: mouse
  set: Report = 4 right, 2 up good
  note: mouse = 4 right, 2 up
  card: The report, 4 bytes | buttons: none down | left-right: +4 | up-down: +2 | wheel: 0

step Radio: A radio message and a reply [how]
  The mouse sends the report by radio on the ==2.4 GHz== band, the same busy band as Wi-Fi and Bluetooth. A small ==receiver== plugged into the computer catches it.

  The receiver answers "got it" in a split second, so the mouse knows the report arrived.
  tip Key idea: Every report is a short radio message, and every message expects an answer.
  move: mouse <-> dongle
  focus: dongle
  set: Radio = got it good
  note: dongle = got it good

step Lost: Noise eats a report [case]
  The 2.4 GHz band is crowded: Wi-Fi, Bluetooth, even a nearby USB 3 port make noise there. Sometimes a report is lost, and no "got it" comes back.

  Then the mouse simply sends the same report again, a moment later. You only notice when it keeps happening: the arrow stutters.
  tip try Fix a stutter: Move the receiver closer to the mouse: plug it into a front USB 2 port, or use a short extension cable.
  move: mouse -> dongle fail
  cut: mouse - dongle
  focus: mouse
  set: Radio = lost, resent warn
  note: dongle = no answer bad | mouse = sends it again warn

step Receiver: It pretends to be a cable [why]
  The receiver plugs into USB and introduces itself as an ordinary wired mouse and keyboard. The computer already knows how to talk to those, so no special driver is needed.

  The computer checks the receiver for news, often 125 or 1,000 times a second: its ==polling rate==.
  tip Bluetooth?: Bluetooth skips the receiver. The computer's own radio listens instead, once you pair the two.
  move: mouse -> dongle, dongle -> os
  focus: dongle
  set: Polling = 1,000/s good | Radio = got it good
  note: dongle = checked 1,000/s good | mouse = 4 right, 2 up

step Cursor: The computer moves the arrow [how]
  The computer lines each report up in its ==input queue==, then moves the arrow by the distance in it. A fast flick moves the arrow further than a slow push of the same length: ==pointer acceleration==.

  Then the screen redraws the arrow in its new spot.
  tip try Try it: Turn off pointer acceleration ("Enhance pointer precision" on Windows). The same hand movement then always moves the arrow the same distance.
  move: os -> screen
  focus: screen
  set: Screen = arrow moved good
  note: screen = arrow moved good

step Keys: A grid of switches [how]
  Under the keys is a grid of wires, the ==key matrix==. The keyboard's chip powers one row at a time and checks which columns answer, hundreds of times a second.

  A pressed key joins its row to its column. The chip waits a few milliseconds for the metal contacts to stop bouncing, then counts one press.
  tip Key idea: Scanning a grid lets a couple of dozen wires watch over a hundred keys.
  show: kbd
  focus: kbd
  set: Report = A key down good
  note: kbd = A key down
  card: The key report | key code: 4 | state: down

step Key code: A position, not a letter [why]
  The keyboard doesn't send the letter A. It sends a ==key code==, the number of the spot that was pressed: 4. The computer's ==keyboard layout== looks up which letter belongs in that spot.

  Switch the layout to Thai and the same key types ฟ. The keyboard didn't change; only the lookup did.
  tip try Try it: Switch your computer to Thai and press the key marked A. You get ฟ, from the same key code 4.
  move: kbd -> dongle, dongle -> os, os <-> layout, os -> screen
  focus: layout
  set: Report = key code 4 good | Screen = a or ฟ good
  note: kbd = key code 4 | layout = 4 → a, or ฟ in Thai | screen = a or ฟ good

step Hold: The computer does the repeat [how]
  Hold a key down and you get aaaaaa. The keyboard reports only two things: the key went down, and later it came up.

  Everything in between is the computer. It types the letter again and again until it hears that the key came up.
  tip Key idea: Repeat speed and delay are computer settings, not keyboard features. Change them in your keyboard settings.
  move: kbd -> dongle, dongle -> os, os -> screen x4
  focus: os
  set: Report = A key up good | Screen = aaaaaa good
  note: kbd = still down | screen = aaaaaa good

step Asleep: The first move can lag [case]
  To make a small battery last for months, the mouse naps. After a short pause it takes fewer photos; after a long one it turns its radio off.

  Your first move wakes it up, and the first report arrives a moment late. That's normal, not a fault.
  tip warn Watch out: If the lag never goes away, check the battery first. A weak battery can make the mouse lag and drop out.
  move: mouse -> dongle slow
  focus: mouse
  set: Photos = asleep warn | Radio = waking up warn
  note: mouse = asleep warn | kbd =
  card: none

step Recap: From your hand to the screen [recap]
  One move and one key press, each a few bytes on a short trip:
  - The mouse photographs the desk; the keyboard scans a grid of switches.
  - Each change becomes a tiny report, sent by radio and answered with "got it".
  - The receiver acts like a wired device, so the computer simply reads it.
  - The computer moves the arrow, looks up letters in its layout, and repeats held keys.
  move: mouse -> dongle & kbd -> dongle, dongle -> os, os -> screen
  set: Photos = thousands/s good | Report = key code 4 good | Radio = got it good | Polling = 1,000/s good | Screen = aaaaaa good
  note: mouse = thousands of photos/s | dongle = got it · 1,000/s good | kbd = key code 4 | layout = 4 → a, or ฟ in Thai | screen = aaaaaa good

quiz You switch from English to Thai. Why does the A key now type ฟ?
  * The computer's layout picks a new letter | the keyboard still sends key code 4; only the computer's lookup changed
  - The keyboard sends a different signal | it sends the same key code in every language
  - The receiver translates the letter | it passes key codes on unchanged
```

## D Inside the mouse {span=3}
@@FREE:mouse-cutaway@@

## E Inside the keyboard {span=2}
@@FREE:key-matrix@@

## F A position, not a letter
@@FREE:key-code@@

## G The crowded air {span=3}
@@FREE:spectrum@@

## H Receiver or Bluetooth? {span=3}
@@FREE:radio-choice@@

## I One key press, in milliseconds {span=3}
@@FREE:time-ruler@@

## J When something goes wrong {span=3}
@@FREE:trouble-path@@
