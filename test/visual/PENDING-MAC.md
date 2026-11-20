# Pending on the Mac: regenerate every baseline for the course look

The course look (`docs/superpowers/specs/2026-11-19-course-ui-design.md`) changed every page on purpose: palette, type, borders and shadows. So every screenshot baseline must be regenerated, and they must come from the Mac, because screenshots depend on the machine's text rendering. The lesson block's four scenarios (`lesson-light`, `lesson-dark`, `lesson-mobile`, `lesson-fail`) never had Mac baselines, so they are created in the same run. PNGs made on Windows are kept out of `test/visual/baselines/` on purpose.

On Windows, run `node test/visual/run.mjs --baselines .tmp/before --output .tmp/out`, never plain `npm run visual`: that compares against the Mac baselines (text rendering differs, so it fails) and writes any missing PNGs into `test/visual/baselines/` as untracked files.

Also new: `wireless-light` and `wireless-mobile` (`examples/wireless-mouse.md`, free sections). The same `npm run visual:update` creates them, so there are 6 new PNGs in all: the 4 lesson ones and these 2. Check them like the others and commit them with the rest.

Also changed, on purpose, by `fix/polish-0.3.0`: on a page 560px wide or narrower the first diagram on a full-row panel (the hero diagram) now stays inside its panel instead of sticking out 3px on each side, and inline `code` in a table header is 10.5px instead of 9.7px. Against the baselines of the branch before this fix, two phone-width scenarios differ and nothing else does: `ecommerce-mobile` (0.65% of the pixels) and `codebase-tour-mobile` (3.29%), where only the diagram, its tools and its route strip moved in by a few pixels. No scenario has code in a table header, so that change shows in none of them. The same `npm run visual:update` regenerates these two baselines from the Mac, so there is nothing more to do for them.

On the Mac, once, on the branch that has the course look:

1. Run `npm test`. It must pass.
2. Run `npm run visual:update`. It regenerates the 13 existing baselines and creates the 6 new ones (the 4 lesson ones, `wireless-light` and `wireless-mobile`). The 11 behaviour scenarios (`reply-loop`, `export`, `thai-labels`, `free-csp` and the seven `lesson-*` checks without a picture) still run their checks: each must print `✓`. `thai-labels` checks that Thai labels fit their boxes in the Mac's Thai face (Thonburi), which Windows cannot check. A `✗` there is a regression to fix, not a baseline to accept.
3. `git status` should show 13 modified and 6 new PNGs in `test/visual/baselines/`. Open each one and check it against the course look: warm paper, one monospace face, tinted panel keys, outlined tools, the green primary button with its hard shadow; the named presets (nord, blueprint, catppuccin, tokyo, paper) in their own colours; the lesson on step 1 in light and dark, on a phone, and on step 9 (the refused push); the wireless page wide and on a phone.
4. Commit the 19 PNGs (the 13 changed and the 6 new, `wireless-light` and `wireless-mobile` among them), then delete this file.
