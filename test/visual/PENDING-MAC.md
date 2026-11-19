# Pending on the Mac: four lesson baselines

The lesson block added four screenshot scenarios: `lesson-light`, `lesson-dark`, `lesson-mobile` and `lesson-fail`. Their baselines must come from the Mac that made the 13 existing ones, because screenshots depend on the machine's fonts. PNGs made on Windows are kept out of `test/visual/baselines/` on purpose.

On Windows, run `node test/visual/run.mjs --baselines .tmp/before --output .tmp/out`, never plain `npm run visual`: that compares against these Mac baselines (fonts differ, so it fails) and writes the four lesson PNGs into `test/visual/baselines/` as untracked files.

On the Mac, once:

1. Run `npm run visual`. Do **not** use `npm run visual:update`: it would overwrite the 13 existing baselines and hide regressions.
2. It checks the 13 existing scenarios against their committed baselines. Each must print `✓`. A `✗` there is a regression to fix, not a baseline to update.
3. It writes the 4 missing lesson baselines: `test/visual/baselines/lesson-light.png`, `lesson-dark.png`, `lesson-mobile.png` and `lesson-fail.png`. `git status` should show exactly these four new files.
4. Review those four PNGs (the Git lesson on step 1 in light and dark at 1440, the phone view at 390 × 844, and step 9, the refused push), then commit them.
5. Then delete this file.
