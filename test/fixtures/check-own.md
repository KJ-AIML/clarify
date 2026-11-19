---
title: Check own
cols: 3
---

Lead: Every part of this page comes from clarify's own blocks, so `clarify check` has nothing to report on it.

## A The map {span=3}
A small map with two routes. It is the first diagram on a full-row panel, so it is the hero diagram, and each route button holds a play glyph.

```arch LR
[Browser] -> [Gateway]: request
[Gateway] -> [Service]: forward
[Service] -> [(Store)]: write

trace "Order" {
  Browser -> Gateway: The browser sends the request.
  Gateway -> Service: The gateway forwards it.
  Service -> Store: The service writes the order.
}
trace "Retry" {
  Gateway -> Service: The gateway forwards it again.
  Service -> Store: The service writes the order once.
}
```

## B The commands {span=3}
| `Command` | What it does | In `a draft` |
| --- | --- | --- |
| `render` | Compiles a draft into one HTML page. | `## A Title` |
| `check` | Opens the page in a browser and reports what a reader would see as a fault. | `clarify check` |
| `serve` | Shows the page and reloads it when the draft changes. | `clarify serve` |
