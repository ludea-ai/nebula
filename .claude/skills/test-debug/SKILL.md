---
name: test-debug
description: Test and debug what was implemented in a game built on this engine, with proof, before publishing. Use to validate a new feature end-to-end, or to reproduce/fix a described bug (e.g. "this action does nothing", "this letter won't type"). Combines static checks, headless execution (Playwright), assertions on game state, and a repro→cause→fix→regression loop. Triggers: "test", "debug", "check it works", "it doesn't work", "reproduce the bug".
---

# test-debug

Prove a feature **really works**, or reproduce+fix a bug — never "it should work".
Requirements: `python3`, `node` + Playwright.

## Procedure (Claude Code tools)

1. **Static check** — Bash: `node --check engine.js && node --check game.config.js`
   (+ JSON validity of the manifest if it changed).

2. **Serve** — Bash: `bash .claude/skills/_shared/serve.sh 8099`.

3. **Standard regression tour** (always, in addition to your own scenario) — it asserts
   the core loop and screenshots every screen; then LOOK at them (skill **visual-review**):
   ```bash
   OUT=/tmp/tour node .claude/skills/_shared/playtest.cjs --viewport 390x844 \
     --probe .claude/skills/_shared/probes/tour.cjs && python3 .claude/skills/_shared/contact-sheet.py /tmp/tour
   ```
   `probe.errors` must be empty. Reusable helpers for your own probes are in
   `_shared/probes/lib.cjs` (`visibleCreature`, `scrubAll`, `shot`). Tap a creature with a
   real click at `worldToScreen(c.x, c.y)` — and pick one that is ON screen.

4. **Runtime + assertions** — Bash, via the `playtest.cjs` harness:
   ```bash
   # read a state value
   node .claude/skills/_shared/playtest.cjs --eval "state.creatures.length"
   # capture a zone
   node .claude/skills/_shared/playtest.cjs --shots "spawn:560:860:0.9"
   # full feature scenario (free assertions)
   node .claude/skills/_shared/playtest.cjs --probe ./scenario.cjs
   ```
   A *probe* = a `.cjs` module exporting `async (page) => {…}` that drives the page
   (clicks, `page.keyboard.type`, `page.evaluate`) and returns an assertions object.
   The harness **always reports `pageErrors`** (exit ≠ 0 if any).
   - Globals in `page.evaluate`: `GAME`, `state`, `player`, `COLLISIONS`, `WORLD`,
     `PATHS`, `LOOP_SEG`, `OPENINGS`, `sc`, `onPointer`, `creatureAction`, …
   - **Real keyboard test**: `page.focus("#field")` then `page.keyboard.type("abc…")`
     (NOT `page.fill`, which bypasses the event and wouldn't exercise the bug).

4. **Look at the screenshots** — **Read** the PNGs (`/tmp/engine-shots/*.png`) to
   validate visually (Claude Code renders images).

5. **For a BUG — loop**: reproduce (failing probe) → isolate the cause
   (`file:line`, via Grep/Read) → fix (Edit) → re-run until it passes **and** nothing
   else breaks. Not a single attempt.

6. **Report**: what works / what breaks (exact output & error), the cause, the fix —
   with screenshots + assertion values as **proof**.

## Testing on the real Safari engine (WebKit) — for iOS / touch bugs
Headless **Chromium does not reproduce some iOS bugs** (touch, pointer capture, text
selection). When the report is about iPhone/iPad, or any **drag / scrub / multi-touch**
interaction, re-run the probe on the actual Safari engine:
```bash
node .claude/skills/_shared/playtest.cjs --engine webkit --device "iPhone 13" --probe ./touch.cjs
```
- One-time install if missing (the harness prints this and exits 3):
  `npx playwright install webkit` (+ `npx playwright install-deps webkit`).
- In the probe, drive **real pointer events** so the bug actually fires:
  ```js
  module.exports = async (page) => {
    await page.mouse.move(x0, y0); await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 12 }); await page.mouse.up();
    // then assert game state, e.g. that the player can still move after a close-up:
    return await page.evaluate(() => ({ canMove: !window.__stuck /* your check */ }));
  };
  ```
- Real iOS pitfalls already guarded in the engine (regress against these): **implicit
  pointer-capture freeze** (capture a removed element → all later touches swallowed) and
  **blue text-selection** from a tap-drag. See ENGINE.md "iOS / touch robustness".

## Guard-rails
- **Never say "it works" without proof** (screenshot + assertions + 0 pageError).
- Test the **real player scenario**, not just the absence of a JS error.
- A touch/iOS bug report is only "fixed" once it's reproduced **and** verified under
  `--engine webkit` (Chromium-green is not enough).
- If a functional choice is ambiguous, ask via **AskUserQuestion**.

## Chaining
**Engine problems noticed along the way are reported now** (game-engine#18): anything wrong in the
engine layer or its tooling that you noticed during this task — a tool output that looks wrong, a
file the sync left behind, a missing browser, a doc that misled you — goes to **report-upstream**
before you tell the creator, even when the task itself succeeded. Never leave it at a mention or a
link for the creator to click. (In `ludea-ai/*` you ARE upstream: fix it there instead.)
Before **map-verify** (map visuals) and **release-deploy** (publish).
Called by the **feedback-session** orchestrator for each item.

## "The player is stuck / nothing moves" (phones)
1. Monkey-test: `STEPS=80 SEED=n OUT=/tmp/s node .claude/skills/_shared/playtest.cjs --engine
   webkit --device "iPhone 13" --probe .claude/skills/_shared/probes/stress.cjs` — random
   fast play (close-up closed mid-zoom, double taps, panel actions…), asserts the world
   still responds after every step and dumps the engine flags on a freeze. Try several seeds.
2. If the logic never freezes but players report it, suspect the CANVAS freezing (loop
   asleep after background, WebGL context lost): `probes/watchdog.cjs` checks the engine's
   recovery. A frozen frame mid-animation (e.g. camera stuck zoomed) is the tell-tale sign.

## On-screen error bar (red, "tap to dismiss")
`engine.js` shows uncaught errors from the game's own files with file:line — screenshot
requests from players are actionable. Opaque errors ("Script error.", no file) and errors
from other origins/extensions are only logged (Safari extensions, content blockers,
translation inject them; they don't affect the game). A player report showing a file and
line = a real engine/config bug → reproduce under WebKit.
