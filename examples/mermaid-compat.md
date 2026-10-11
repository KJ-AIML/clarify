---
title: Mermaid Compatibility
subtitle: Raw Mermaid flowcharts and sequence diagrams, rendered on Clarify's interactive canvas
theme: tokyo-night
cols: 2
---

Lead: Paste existing Mermaid unchanged. Clarify lays it out with its own layered engine and adds pan, zoom, the inspector and exports.

## A Order State Machine (flowchart) {span=2}
```mermaid
flowchart LR
  %% Mermaid comments and classDefs are ignored
  classDef hot fill:#f96
  cart([Cart]) --> checkout{Payment ok?}
  checkout -->|yes| paid[Paid]:::hot
  checkout -->|no| retry[Retry payment]
  retry -.-> checkout
  paid --> ship[[Ship order]]
  ship --> done((Delivered))
  subgraph fulfil [Fulfillment]
    ship
    done
  end
  paid --> ledger[(Ledger:postgres)]
```

## B Login Handshake (sequence)
```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as Web App:react
  participant A as Auth API:node
  participant R as Session Store:redis
  U->>W: Submit credentials
  W->>+A: POST /login
  A->>R: Create session
  alt MFA enabled
    A-->>W: 202 MFA challenge
    W->>A: TOTP code
  else MFA disabled
    Note over A: Skip second factor
  end
  A-->>-W: 200 Set-Cookie
  W-->>U: Dashboard
```

## C What carries over
- Shapes: `[box]`, `(round)`, `([stadium])`, `[(database)]`, `{decision}`, `((circle))`
- Edges: `-->`, `---`, `-.->`, `==>`, `<-->`, `|labels|`, chains and `&`
- `subgraph … end` becomes a boundary box, nested to any depth
- Sequence: `participant`/`actor`, all arrow types, notes, `loop`/`alt`/`opt`/`par` frames, `autonumber`
- A `:tech` suffix on a label (`Ledger:postgres`) adds the brand icon
