---
title: Caching a Slow Database
eyebrow: System design · Isokit Lesson
subtitle: How an in-memory cache absorbs hot reads, cuts tail latency, and what happens when the cache goes down
theme: auto
cols: 3
---
Lead: Putting an in-memory **cache** in front of a read-heavy database absorbs ~90% of traffic, cutting database load from 92% to 14% and P95 latency from 180 ms to 18 ms — as long as misses still fall through cleanly when the cache restarts.

## A Interactive walkthrough {span=3}
Step through with **Next** and **Back**, press `← →`, `R` to replay, `Space` to pause packets, or `X` for coordinates.

```isokit
{
  "title": "Add a Read Cache",
  "subtitle": "Watch database load and tail latency shift as traffic moves from direct SQL to a cache-aside layer.",
  "meta": ["4 min", "Intermediate"],
  "legend": [
    { "kind": "req", "label": "read request" },
    { "kind": "res", "label": "response" },
    { "kind": "kill", "label": "cache miss / fail" }
  ],
  "metrics": [
    { "key": "db", "label": "DB load", "unit": "%" },
    { "key": "p95", "label": "P95 latency", "unit": " ms" },
    { "key": "hit", "label": "Cache hit", "unit": "%" }
  ],
  "goals": [
    { "text": "Why hot reads overload a single database", "at": 1 },
    { "text": "How cache-aside cuts latency and DB load", "at": 2 },
    { "text": "What happens during a cold cache restart", "at": 3 }
  ],
  "components": {
    "users": { "type": "crowd", "x0": -4, "x1": 4, "y0": -16, "y1": -9, "count": 20, "label": "5,000 users" },
    "api":   { "type": "block", "x": 0, "y": 0, "color": "orange", "glyph": "server", "label": ["API", "Server"], "pills": "below" },
    "cache": { "type": "block", "x": -9, "y": 10, "color": "green", "glyph": "zap", "label": ["Redis", "Cache"] },
    "db":    { "type": "db", "x": 5, "y": 10, "color": "purple", "glyph": "database", "label": "products" }
  },
  "wires": {
    "in":    { "from": "users", "to": "api", "pts": ["users", "api"], "label": "GET /item" },
    "query": { "from": "api", "to": "db", "pts": ["api", ["db", "api"], "db"], "label": "SQL" },
    "hit":   { "from": "api", "to": "cache", "pts": ["api", ["cache", "api"], "cache"], "label": "GET key" }
  },
  "steps": [
    {
      "short": "Hot DB",
      "chapter": "problem",
      "title": "Every request hits the database",
      "body": [
        "Five thousand users keep reading the same popular product pages. Every request runs an identical SQL query.",
        "Database CPU climbs to **92%** and P95 latency stretches to **180 ms**."
      ],
      "callout": { "kind": "insight", "text": "Read-heavy workloads repeat the same queries thousands of times per minute." },
      "changes": ["+ Users", "+ API server", "+ Products database at 92% load"],
      "metrics": { "db": 92, "p95": 180, "hit": 0 },
      "scene": {
        "entities": {
          "users": { "use": "users" },
          "api":   { "use": "api", "cpu": 0.48 },
          "db":    { "use": "db", "cpu": 0.92, "heat": 0.85 }
        },
        "links": ["in", "query"],
        "flows": [{ "route": ["in", "query"], "bounce": true, "rate": 2.4, "hold": 0.45 }]
      }
    },
    {
      "short": "Cache-aside",
      "chapter": "solution",
      "title": "Serve hot reads from Redis",
      "body": [
        "The API checks **Redis** first. Nine out of ten requests hit in memory and return in **18 ms**.",
        "Only the remaining 10% miss and query the database, dropping DB load to **14%**."
      ],
      "changes": ["+ Redis cache in front of SQL", "~ DB load 92% → 14%", "~ P95 latency 180 ms → 18 ms"],
      "metrics": { "db": 14, "p95": 18, "hit": 90 },
      "scene": {
        "entities": {
          "users": { "use": "users" },
          "api":   { "use": "api", "cpu": 0.36 },
          "cache": { "use": "cache", "cpu": 0.28, "tags": [{ "text": "90% hit", "tone": "green", "icon": "check" }] },
          "db":    { "use": "db", "cpu": 0.14 },
          "summary": {
            "type": "panel",
            "title": "P95 LATENCY",
            "icon": "chart",
            "chart": "bars",
            "bars": [
              { "label": "Direct DB", "to": 0.9, "tone": "red", "note": "180 ms" },
              { "label": "With Cache", "to": 0.12, "tone": "green", "note": "18 ms" }
            ],
            "lines": ["+ 10x faster hot reads"]
          }
        },
        "links": ["in", "hit", "query"],
        "flows": [
          { "routes": [["in", "hit"], ["in", "query"]], "weights": [9, 1], "bounce": true, "rate": 2.4 }
        ]
      }
    },
    {
      "short": "Cache down",
      "chapter": "tradeoff",
      "title": "A cold restart floods the database",
      "body": [
        "If Redis restarts empty or goes unreachable, 100% of reads miss and stampede straight to SQL.",
        "Keep timeouts short, coalesce duplicate in-flight misses (singleflight), and ensure the database survives brief spikes."
      ],
      "callout": { "kind": "warn", "text": "Never treat a cache as a permanent shield — plan for a 0% hit rate during deploys or failovers." },
      "changes": ["- Redis unreachable (0% hits)", "~ All traffic falls back to SQL"],
      "metrics": { "db": 95, "p95": 210, "hit": 0 },
      "scene": {
        "entities": {
          "users": { "use": "users" },
          "api":   { "use": "api", "cpu": 0.62 },
          "cache": { "use": "cache", "dead": 1, "heat": 0.85, "tags": [{ "text": "DOWN", "tone": "red", "icon": "alert" }] },
          "db":    { "use": "db", "cpu": 0.95, "heat": 0.9 }
        },
        "links": {
          "in": {},
          "hit": { "style": "cut", "fail": 1, "label": "timeout" },
          "query": { "label": "100% fallback" }
        },
        "flows": [
          { "route": ["hit"], "kind": "kill", "rate": 1.2 },
          { "route": ["in", "query"], "bounce": true, "rate": 2.6, "hold": 0.5 }
        ]
      }
    },
    {
      "short": "Recap",
      "chapter": "recap",
      "title": "Cache-aside in one glance",
      "body": ["Read from memory first, fall back to SQL on a miss, and populate the cache with a bounded TTL."],
      "takeaways": [
        "Hot reads stay in memory (~18 ms) instead of hitting disk",
        "Set sensible TTLs and invalidate on writes to bound staleness",
        "Guard against thundering herds with request coalescing"
      ],
      "metrics": { "db": 14, "p95": 18, "hit": 90 },
      "scene": {
        "entities": {
          "users": { "use": "users" },
          "api":   { "use": "api", "cpu": 0.36 },
          "cache": { "use": "cache", "cpu": 0.28, "tags": [{ "text": "Healthy", "tone": "green", "icon": "check" }] },
          "db":    { "use": "db", "cpu": 0.14 }
        },
        "links": ["in", "hit", "query"],
        "flows": [
          { "routes": [["in", "hit"], ["in", "query"]], "weights": [9, 1], "bounce": true, "rate": 2.2 }
        ]
      }
    }
  ],
  "quiz": {
    "question": "What happens first when the cache restarts empty under full traffic?",
    "options": [
      { "text": "All reads miss and hit the database until the cache warms back up", "correct": true, "why": "Cache-aside falls through to the source of truth on every miss." },
      { "text": "The API stops accepting requests permanently", "correct": false, "why": "With short cache timeouts, requests degrade to the database rather than failing outright." }
    ]
  }
}
```
