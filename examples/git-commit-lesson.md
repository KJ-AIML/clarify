---
title: Git, One Change at a Time
eyebrow: Git explained · Lesson
subtitle: The places a change passes through on its way to your team, and the command that moves it at each stop
theme: auto
cols: 3
---

## A Before you start {span=3}
Git keeps a history of your project and lets a team share it. Every change you make travels through a few places on its way to your teammates, and each Git command moves it one stop.

The lesson below follows **one change**, from the moment you press Save until your teammate has it. Use **Next** and **Back**, click a numbered step, or focus the lesson and press the ← → keys. Places drawn in grey are ones the story has not reached yet.

## B The lesson, step by step {span=3}
```lesson How a Commit Travels
subtitle: Follow one saved change hop by hop, from your laptop to your teammate's.
meta: 10 min · Beginner
places: you = laptop "Your folder" | tray = tray "Staging area" | repo = cabinet "Local repo" | origin = server "Origin" | mate = laptop "Teammate"
rails: you - tray - repo - origin - mate
counters: Edited | Staged | Snapshot | Pushed | Teammates
pucks: change = your change | reply = teammate's change | fail = refused | slow = the forgotten file
goals: What the working directory is @2 | Why staging lets you choose @3 | What a commit really saves @4 | The path: laptop → tray → repo → server → teammate @7 | Cases: a missing file, a refused push @9

step Hit Save: Your work lives on one laptop [problem]
  You fixed a bug in the shop app and pressed Save. The change is real, but only your laptop knows about it.

  Let's follow that one change all the way to a teammate's screen. Every stop has a name and does one job.
  tip Key idea: Git moves changes through a few places, one step at a time. Know the places and every command makes sense.
  show: you
  focus: you

step Edit: Changes start in your folder [how]
  Your project folder is the ==working directory==. When you ask, Git compares it with the last snapshot: three files are different now.

  Nothing is saved in Git yet. Run `git status` any time to see what changed.
  tip try Try it: `git status` only looks. It never changes anything, so run it as often as you like.
  focus: you
  set: Edited = 3 files warn

step Stage: Pick what goes in the snapshot [how]
  `git add` copies the changes you choose into the ==staging area==, a waiting tray for your next snapshot.

  You picked two of the three files. The third one stays out, on purpose.
  tip Why a tray?: Staging lets one messy afternoon become several clean, focused snapshots.
  move: you -> tray x2
  focus: tray
  set: Staged = 2 files good

step Commit: Take the snapshot [how]
  `git commit` turns everything in the tray into a ==commit==: a saved snapshot with a message, an author and a time.

  Each commit gets an id like `a1f9e2c`, worked out from the files, the message, the author, the time and the commit before it. Change any of them and the id changes too.
  tip try Good habit: Write the message as what the commit does: Fix total when cart is empty.
  move: tray -> repo
  focus: repo
  set: Edited = 1 file warn | Staged = 0 files good | Snapshot = a1f9e2c good

step History: Commits form a chain [why]
  Every commit remembers the one before it. Together they make your project's ==history==, and you can step back to any point.

  Small commits with clear messages are easy places to return to.
  tip Key idea: Git never edits old commits. It only adds new ones on top.
  focus: repo
  set: Snapshot = 3 in chain good

step Push: Send it to the shared copy [how]
  So far everything happened on your laptop. `git push` sends new commits to a ==remote==: a shared copy on a server, usually called `origin`.

  Git only sends what the remote is missing, so pushing stays quick even for big projects.
  tip Key idea: Your laptop and the server each hold a full copy. Push and pull just keep them in step.
  move: repo -> origin
  focus: origin
  set: Pushed = 1 commit good

step Pull: Your teammate gets the change [why]
  Your teammate runs `git pull`. Git asks the remote what's new, downloads your commit and updates their folder.

  Now two laptops hold the exact same snapshot. That's the whole journey.
  tip try Habit: Pull before you start work. You'll build on the newest version and avoid surprises.
  move: origin -> mate
  focus: mate
  set: Teammates = 1 person good

step Forgot file: The snapshot is missing a file [case]
  Remember the third file you didn't add? If the fix needed it, the commit is incomplete, and your teammate's app breaks.

  The fix is simple: `git add` that file and make one more commit.
  tip warn Watch out: A commit only holds what was staged. Saving a file is not the same as adding it.
  move: you -> tray slow
  focus: tray
  fail: mate
  set: Snapshot = missing 1 warn | Teammates = broken bad

step Rejected: The push is refused [case]
  Your teammate pushed first. Now the remote has a commit you don't, so Git refuses your push rather than lose their work.

  Run `git pull` to bring their commit down, then push again. Git joins both lines of history.
  tip warn Never force it: `git push --force` would erase their commit. Pull first, then push.
  move: mate -> origin reply & repo -> origin fail
  cut: repo - origin
  fail: origin
  set: Snapshot = a1f9e2c good | Pushed = rejected bad | Teammates = — none

step Recap: Where the change went [recap]
  One change, five stops. Each command moves it one hop:
  - **Save** puts the change in your working directory.
  - `git add` copies it into the staging area.
  - `git commit` turns it into a snapshot in your local repo.
  - `git push` copies it to the shared remote; `git pull` brings it to others.
  move: you -> tray, tray -> repo, repo -> origin, origin -> mate
  set: Edited = 0 files good | Staged = 0 files good | Snapshot = b7c03d1 good | Pushed = 2 commits good | Teammates = 1 person good

quiz Your push was refused. What do you run first?
  * git pull | it brings your teammate's commit down, then your push can go through
  - git push --force | it would erase your teammate's commit from origin
  - git commit again | origin would still have a commit you don't have
```

## C The same trip as a map {span=3}
The first four stops again, as a plain map. Press **One change** under it to follow the change stop by stop.

```arch LR
[Working directory] -> [Staging area]: git add
[Staging area] -> [Local repo]: git commit
[Local repo] -> [Origin:github]: git push

trace "One change" {
  Working directory -> Staging area: `git add` copies the files you picked into the staging area.
  Staging area -> Local repo: `git commit` saves them as one snapshot with a message, an author and a time.
  Local repo -> Origin: `git push` sends the new commit to the shared copy, where your teammate can pull it.
}
```
