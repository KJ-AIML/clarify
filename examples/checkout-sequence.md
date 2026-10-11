---
title: Checkout Request Lifecycle
subtitle: Synchronous path, idempotency and the async hand-off
theme: paper
cols: 2
---

## A Happy Path & Failure Handling {span=2}
```sequence
autonumber
participant Web Client:react
participant API Gateway:cloudflare
participant Checkout:go
participant Order DB:postgres
participant Event Bus:kafka
Web Client -> API Gateway: POST /checkout (Idempotency-Key)
API Gateway -> Checkout: forward + JWT claims
loop up to 3 attempts
  Checkout -> Order DB: INSERT order ... ON CONFLICT DO NOTHING
end
alt inserted
  Order DB --> Checkout: order_id
  Checkout -> Event Bus: OrderPlaced
  Checkout --> Web Client: 201 Created
else duplicate key
  Order DB --> Checkout: existing order_id
  Note over Checkout: Replay the original response
  Checkout --> Web Client: 200 OK (replayed)
end
```

## B Guarantees
| Property | Mechanism | Status |
| --- | --- | --- |
| Exactly-once order | Idempotency key + unique index | ok Enforced |
| Event delivery | Transactional outbox | warn Planned |
| Retry safety | Bounded retries, jittered backoff | ok Enforced |

## C Open Question
```ask
Should the outbox relay run in-process or as a separate worker?
* Separate worker | Isolates failure, one more deployable
- In-process relay | Simpler, but couples API latency to broker health
```
