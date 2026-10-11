---
title: Platform Topology Review
subtitle: 26-component production estate across edge, two clusters and a shared data plane
theme: catppuccin
cols: 3
---

Lead: A large estate in a single diagram. Zoom in and the minimap shows where you are. Cycles (the retry loop and the cache warmer) are laid out cleanly, and boundaries never overlap.

## A Production Estate {span=3}
```arch LR
[Browser:react] -> [Edge:cloudflare]: HTTPS
[Mobile App] -> [Edge]: HTTPS
[Edge] -> [WAF Rules]
[Edge] -> [Static Assets:vercel]: cache miss

group "Kubernetes · prod-east" {
  group "Ingress" {
    [Ingress Gateway:kubernetes]
  }
  [Ingress Gateway] -> [Web BFF:next]: /app
  [Ingress Gateway] -> [Public API:node]: /api
  [Public API] -> [Auth:go]
  [Public API] -> [Catalog:go]
  [Public API] -> [Orders:go]
  [Orders] -> [Payments:rust]: charge
  [Payments] -> [Orders]: webhook retry
  [Web BFF] -> [Public API]: SSR fetch
}

group "Kubernetes · workers" {
  [Fulfillment Worker:python]
  [Search Indexer:python]
  [Cache Warmer:go]
  [Notifier:node]
}

group "Shared data plane" {
  [(Orders DB:postgres)]
  [(Catalog DB:mongodb)]
  [(Session Cache:redis)]
  [Event Bus:kafka]
  [(Search Index)]
}

[WAF Rules] -> [Ingress Gateway]
[Auth] -> [Session Cache]: sessions
[Catalog] -> [Catalog DB]
[Catalog] -> [Session Cache]: read-through
[Orders] -> [Orders DB]: tx
[Orders] -> [Event Bus]: order.*
[Event Bus] -> [Fulfillment Worker]
[Event Bus] -> [Search Indexer]
[Event Bus] -> [Notifier]
[Search Indexer] -> [Search Index]
[Catalog DB] --> [Cache Warmer]: change stream
[Cache Warmer] --> [Session Cache]: warm
[Fulfillment Worker] -> [Orders]: status update
[Payments] { status: warn; desc: PSP latency regressions since v2.14; owner: Payments }
[Orders DB] { status: ok; files: infra/db/orders.tf }
[Notifier] { status: no; desc: Deprecated, replaced by the comms platform in Q3 }

trace "Place order": Browser -> Edge -> WAF Rules -> Ingress Gateway -> Public API -> Orders -> Payments
trace "Index product": Catalog -> Catalog DB -> Cache Warmer -> Session Cache
```

## B Hotspots
```kv
Components: 26
Boundaries: 4 (1 nested)
Cycles: 2 (handled)
Payments: warn PSP latency
Notifier: no Deprecated
```

## C Review Notes {span=2}
1. Payments ↔ Orders has a webhook retry cycle. Confirm idempotency keys are enforced.
2. `Cache Warmer` writes to the session cache through a change stream. Watch for thundering herds on deploy.
3. Notifier is still on the hot path for `order.*`. Plan the cut-over to the comms platform.
