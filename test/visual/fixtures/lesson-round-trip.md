---
title: Round trips at rest
eyebrow: Test fixture
cols: 3
---

Lead: A test-only page for test/visual/run.mjs (scenario lesson-round-trip): with reduced motion, every round trip's outbound and reply pucks must rest apart, clear of the objects and name tags.

## A Round trips {span=3}

```lesson Round Trips at Rest
subtitle: Each step sends pucks out and back along one rail.
meta: Test fixture
places: app = server "Web app" | queue = queue "Job queue" | worker = server "Worker" | mail = mailbox "Mail server" | db = database "Users"
rails: app - queue - worker - mail | worker - db
counters: Trips
pucks: change = job | reply = answer

step Lookup: The worker asks the database [how]
  One request out to the database, one answer back.
  move: worker <-> db
  set: Trips = 1

step Two lookups: Two questions at once [how]
  Two requests out, two answers back, on the same rail.
  move: worker <-> db x2
  set: Trips = 2

step Hand off: The app queues a job [how]
  The queue answers the app.
  move: app <-> queue
  set: Trips = 3

step Two jobs: The app queues two jobs [how]
  Two jobs go in and two receipts come back.
  move: app <-> queue x2
  set: Trips = 5

step Take: The worker takes two jobs [how]
  The queue hands out two jobs; the worker confirms both.
  move: worker <-> queue x2
  set: Trips = 7

step Send: The worker sends two emails [how]
  Two emails out, two receipts back.
  move: worker <-> mail x2
  set: Trips = 9

step Rush: Five lookups at once [how]
  Five requests out, five answers back: the most a leg draws.
  move: worker <-> db x5
  set: Trips = 14
```
