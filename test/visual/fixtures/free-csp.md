---
title: Free sections and the network policy
subtitle: Test-only fixture. A page with a free section blocks the network, and one broken section must not stop the others.
---

Lead: The sections below run their own script. Two of them fail on purpose (boom throws, broken does not parse); ok and after must still run.

## A Map
```arch LR
[Browser:react] -> [API:go]: request
[API] -> [(Store:postgres)]: save
```

## B Sections that run {span=3}
```free ok
<p class="fx-how">How to read this: the button below stays hidden.</p>
<button class="fx-btn" hidden>never</button>
<script>root.dataset.ran = "yes"</script>
```

```free boom
<p class="fx-how">How to read this: the script of this section throws.</p>
<script>throw new Error("on purpose")</script>
```

## C Sections after a failure {span=3}
```free broken
<p class="fx-how">How to read this: the script of this section does not parse.</p>
<script>}{</script>
```

```free after
<p class="fx-how">How to read this: this section runs after two others failed.</p>
<script>root.dataset.ran = "yes"</script>
```
