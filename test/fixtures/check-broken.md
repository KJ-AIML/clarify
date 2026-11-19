---
title: Check broken
cols: 3
---

Lead: Each panel from B to I breaks one rule that `clarify check` looks for. A and G break none.

## A Nothing wrong here {span=3}
A short line of plain text. Nothing in this panel should be reported.

## B Too wide
```free too-wide
<div style="width: 900px; padding: 8px; border: 1px solid var(--border)">This box is 900px wide, in a panel about 400px wide.</div>
```

## C Tiny text
```free tiny
<p style="font-size: 8px">This line is set at 8px.</p>
```

## D Piled labels
```free pile
<div style="position: relative; height: 48px">
<span style="position: absolute; left: 0; top: 0">first label</span>
<span style="position: absolute; left: 2px; top: 2px">second label</span>
</div>
```

## E A cut line {span=3}
```free cut
<p style="width: 60px; overflow: hidden; white-space: nowrap">This line is far longer than sixty pixels.</p>
```

## F Short
One line.

## G Long {span=2}
- line 1
- line 2
- line 3
- line 4
- line 5
- line 6
- line 7
- line 8
- line 9
- line 10
- line 11
- line 12
- line 13
- line 14
- line 15
- line 16
- line 17
- line 18
- line 19
- line 20
- line 21
- line 22
- line 23
- line 24
- line 25
- line 26
- line 27
- line 28
- line 29
- line 30

## H A script that throws {span=3}
```free boom
<p>ok</p><script>throw new Error("on purpose")</script>
```

## I Faint text {span=3}
```free faint
<p style="color: var(--surface-2)">This text is nearly the colour of its panel.</p>
```
