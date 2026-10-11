---
title: E-Commerce Checkout Architecture
subtitle: How an order travels from the browser to the database, and where it can break under peak load
eyebrow: Architecture brief
theme: auto
cols: 3
---

Lead: Checkout is synchronous up to the database write and asynchronous after it. The design holds today; the scaling risk is Kafka's partition count, not the database. One decision is needed before Black Friday: which failover strategy to enable.

## A System Map {span=3}
**How to read this map:** boxes are services, arrows are calls (dashed means asynchronous), and the shaded zones are network boundaries. A colored edge marks components with a status. Press **▶ Checkout** to follow one order stop by stop.

```arch LR
[Web Client:react] -> [Edge CDN:cloudflare]: HTTPS / WAF
[Edge CDN:cloudflare] -> [API Gateway:docker]: Route traffic

group "VPC · us-east-1" {
  [API Gateway] -> [Auth Worker:node]: Validate JWT
  [API Gateway] -> [Checkout Service:go]: POST /api/checkout
  group "Private data subnet" {
    [Checkout Service] -> [(Session Cache:redis)]: Rate limit (hit 99.4%)
    [Checkout Service] -> [(Order DB:postgres)]: Atomic transaction { p99: 18ms; isolation: serializable }
  }
  [Checkout Service] -> [Event Stream:kafka]: Publish OrderPlaced
}

[Event Stream] -> [Inventory Worker:python]: Deduct stock
[Event Stream] --> [Email Worker:node]: Send confirmation

[Web Client] { desc: React storefront. Retries checkout once with the same idempotency key. }
[Edge CDN] { desc: Terminates TLS, runs WAF rules, caches catalog pages. Checkout is never cached. }
[API Gateway] { desc: Routes /api/* into the VPC and enforces per-tenant quotas. }
[Auth Worker] { desc: Validates JWTs against the session store. Stateless and horizontally scaled. }
[Checkout Service] { desc: Owns cart pricing, payment intent and order creation.; owner: Payments team; throughput: 1.2k rps peak; files: services/checkout/handler.go, services/checkout/tx.go; status: warn }
[Session Cache] { desc: Redis cluster holding sessions and rate-limit counters.; status: ok }
[Order DB] { desc: Neon Postgres, primary in us-east-1 with a read replica.; files: db/migrations/; status: ok }
[Event Stream] { desc: 3-broker Kafka cluster, 12 partitions on orders.v1. Partition count caps consumer parallelism.; status: warn }
[Inventory Worker] { desc: Consumes OrderPlaced and decrements stock. Idempotent on order id. }
[Email Worker] { desc: Sends the confirmation email. Failures are retried for 24h. }

trace "Checkout" {
  Web Client -> Edge CDN: The browser posts the cart over HTTPS. WAF rules screen it at the edge.
  Edge CDN -> API Gateway: Checkout is never cached, so the request goes straight into the VPC.
  API Gateway -> Auth Worker: The gateway asks Auth Worker to validate the session token.
  Auth Worker -> API Gateway: The token is valid, so control returns to the gateway.
  API Gateway -> Checkout Service: The order is routed to the checkout service.
  Checkout Service -> Session Cache: Rate-limit check. 99.4% of lookups are served from Redis.
  Checkout Service -> Order DB: Order and payment intent are written in one serializable transaction.
  Checkout Service -> Event Stream: OrderPlaced is published. Inventory and email react asynchronously.
}
```

```callout ok Takeaway
Everything before the database write is synchronous and fast (p99 under 35ms). Everything after it is asynchronous, so a slow consumer delays emails, not checkouts.
```

## B Reliability Targets {span=2}
Targets per tier, the redundancy behind each, and whether the tier meets the target today.

| Tier | Technology | Latency P99 | Availability | Redundancy | Status |
| --- | --- | ---: | ---: | --- | --- |
| Edge ingress | Cloudflare Workers | <15ms | 99.99% | Anycast global mesh | ok Active |
| Application API | Go + Docker | <35ms | 99.95% | K8s horizontal autoscaling | ok Optimal |
| Caching | Redis Cluster | <2ms | 99.99% | Multi-AZ replicas | ok Optimal |
| Primary storage | PostgreSQL (Neon) | <20ms | 99.95% | WAL replication | ok Robust |
| Event stream | Apache Kafka | <45ms | 99.9% | 3-node broker partition | warn Scaling |

## C Risks
```callout warn Kafka is the scaling risk
12 partitions cap consumer parallelism at 12. Black Friday load needs about 20.
```

- **Checkout Service** is the only writer to the order DB. A bad deploy stops all orders.
- **Email Worker** retries for 24h, so a long outage can send duplicate emails unless deduplicated.

## D Decision Needed {span=3}
```ask
Which database failover strategy should be enabled for peak traffic?
* Multi-region read replicas with auto-failover | Zero data loss, sub-second switchover, doubles DB cost
- Automated snapshot recovery | 2–5 min recovery, minimal extra cost
```
