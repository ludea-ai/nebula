# Shared skill tooling

Reusable building blocks for the **Claude Code skills** of this game engine
(`.claude/skills/<name>/SKILL.md`). The scripts are plain Node / Python / bash,
run by Claude Code through the **Bash** tool.

| File | Role |
| --- | --- |
| `serve.sh` | Serve the game statically: `bash .claude/skills/_shared/serve.sh [port]` (def. 8099). |
| `bump-version.mjs` | Bump the cache version `vN` in **both places** (`assetVersion` in game.config.js + every `?v=` in index.html). `node .claude/skills/_shared/bump-version.mjs`. |
| `playtest.cjs` | Headless Playwright harness (`--help` lists the options): starts a game, takes zone screenshots (`--shots`), checks trail-loop walkability (`--walk`), evaluates expressions (`--eval`), runs assertions (`--probe`), picks the browser engine (`--engine`) and emulates a device (`--device`), and **reports page errors**. |
| `separation-audit.cjs` | Prove the engine/game boundary: engine.js has no game text, game.config.js no engine logic, the shell body stays neutral. `node .claude/skills/_shared/separation-audit.cjs` (exit ≠ 0 on a likely leak). Used by **capitalize-learnings**. |
| `prune-assets.cjs` | List (or `--delete`) files under `assets/` that no game/shell file references — e.g. leftover demo art after **new-game** replaces the demo. Dry-run by default; keeps files referenced by path **or** key. |
| `render-svg.cjs` | Render a game's art module (`tools/art/<game>.cjs` → `[{file,width,height,svg}]`) to PNG with headless Chromium: `node .claude/skills/_shared/render-svg.cjs tools/art/<game>.cjs [--only key]`. |
| `svg-kit.cjs` | Helpers for writing art as SVG: `svg/sheet/job`, gradients, glow/blur filters, `shade`/`mix`, `star`, `blob`, seeded `rng`. |
| `icon-kit.cjs` | Illustrated UI icon set (star, heart, sound, help, avatar, goals, close, play, resume, check, calendar, gift, hand, sparkle, moon, bell, refresh, arrow, trophy, palette, ball, battery, faces…) themed by a palette: `IK.jobs(PAL, names, "assets/ui/icons")` in a game's art module. |
| `art-check.cjs` | Automated art QA over `GAME.assets`: clipping at frame edges, empty frames, walk-cycle feet/centre jitter, detached parts; writes 2× review sheets on a checkerboard. Used by **visual-review**. |
| `probes/reveal.cjs` | Filmstrip of an unlock's entrance (`REVEAL=<id>`, frame every 80 ms) + close-up progress bar at the easiest and max level: same width + no overlap with the close button. Used by **visual-review**. |
| `probes/stress.cjs` | Monkey-test (`STEPS`, `SEED`): random fast play, asserts the world still responds after every step, dumps flags on a freeze. Used by **test-debug**. |
| `probes/watchdog.cjs` | Freeze recovery: sleeping loop woken, frozen world / lost WebGL context → save + reload into the game, no spurious reload. |
| `ios-standalone-check.cjs` | Simulates the iOS home-screen viewport bug in WebKit (viewport short by the status bar) and checks every full-screen layer reaches the real screen bottom. Used by **ios-pwa-check**. |
| `contact-sheet.py` | Labelled contact sheet(s) of a folder of screenshots: `python3 contact-sheet.py DIR`. |
| `probes/jitter.cjs` | A ridden creature/vehicle must not shake: three tap-to-move rides at ~15 fps (CPU ×6), fails on flip-flopping facing or a destination never reached. |
| `probes/racehud.cjs` | Race HUD on one row: time / distance / speed chips never wrap, overlap or spill their value, even with the longest values. Run on 390, 360 and 320 px wide devices. |
| `probes/racerivals.cjs` | Real race (`race.rivals`): grid start behind the field, countdown holds the start, live place chip, overtaking gives 1st, finish opens the results (full ranking, player highlighted), reward + raceWin/racePodium stats. |
| `probes/cuwide.cjs` | Close-up rotation (`closeup.wide`): portrait → landscape → portrait swaps the backdrop, keeps every spot on the subject, finishes on the wide "done" image. Run on WebKit iPhone 13 for any game whose close-up has a `wide` backdrop. |
| `probes/i18n.cjs` | The game in its OTHER language (`game.i18n.js`): `<html lang>`, the home flag-pill toggle (on screen, tap target ≥ 30 px, clear of title/tagline/buttons, round-trip), and no source-language text left on the home, HUD, panel, help or goals screens (`I18N_TO=xx` to pick the language). |
| `i18n-extract.cjs` | Build/check `game.i18n.js`: `--to <lang>` adds missing keys (config texts + engine fallbacks), `--check` fails on untranslated ones, `--prune` drops stale keys. Run after ANY text change. |
| `probes/barriers.cjs` | Trail-loop barriers seal the path: riding, nothing gets past at any height (only Jump clears it); on foot the character hops over and tap-to-move reaches every section (no soft-lock). |
| `probes/edges.cjs` | The trail-loop edges are a wall: walking from the path towards each edge (on foot and riding) never ends up past the hedge band. |
| `probes/edgegap.cjs` | The player stops right at the drawn edge of the band (hedges, rocks): gap <= 14 px walking towards it in the 4 directions, never inside the drawing. |
| `probes/systems.cjs` | Functional checks of the optional systems a game enables (ride + facing, jump, station menu + restyle, missions — incl. every offer's per-offer overrides: legs, saved offer id, own stat —, chase — incl. a deterministic "caught during each hot offer" check of `caughtKeepsMission`, safe on WebKit —, models, race, legacy save) with a screenshot each; blocks skip themselves when a system is off. |
| `probes/smoke.cjs` | The QUICK check after an engine update (a few seconds): the world is drawn, a tap moves the player, the help opens and closes; page errors come from the harness. Every game gets it; the full tour is for the showcase, the template and the games that use a touched system. |
| `game-systems.cjs` | Which engine systems this game turns on (from its config): `node .claude/skills/_shared/game-systems.cjs [--json]`, `--uses race,chase` (exit 0 = uses one). Picks the games that need the full tour after an engine change. |
| `probes/tour.cjs` | The standard regression tour (home, create, tap→walk, close-up→reveal→world responsive, help, stations, unlocks, guide, save) with screenshots; `probes/lib.cjs` = helpers for your own probes. |
| `upstream.cjs` | The link game ↔ Ludea engine: `context` (repo, game, engine version, drift), `drift [--upstream]` (engine-layer files changed here, minus what Ludea already has; exit 2 = drift), `patch [out.diff]` (exact diff vs the engine the game was built from — base files fetched from the public Ludea repos), `write-manifest [--from <ref>]`, `url` (prefilled "new issue" link), `log` (what was already reported, `.claude/upstream-log.json`). Used by **report-upstream**, **idea**, **publish**, **sync-engine**. |
| `engine-manifest.json` | The engine fingerprint: version + git blob hash of every engine-layer file. Rewritten by `sync-engine.sh` / `upstream.cjs write-manifest`; never edit by hand. |
| `update-check.cjs` | Is a newer Ludea engine available? Compares this repo's `engine-manifest.json` with the template's (public) and lists what's new from `CHANGELOG.md`. `--hook` = SessionStart hook output (a note for Claude, or nothing); silent in Ludea's own repos, never fails. Installed as a hook by `sync-engine.sh`; used by **update**. |
| `CHANGELOG.md` | What's new per engine version, in plain words for creators. Written by Ludea's engine agent (`ludea-ai/agents`) for each merged batch. |
| `publish-check.cjs` | Catalogue readiness + child safety of a game folder: catalogue fields (title, tagline, age, FR+EN, icons, credits), risky code in the game files (trackers, iframes, forms, external scripts/links, network calls, camera/location, eval), unreported engine changes, and a Chromium run that fails on ANY request leaving the game's origin or any page error. `node publish-check.cjs [gameDir] [--json] [--no-run] [--shots DIR]` (exit 0 ready · 1 blocking · 2 warnings). Used by **publish** and the catalogue review. |
| `sync-engine.sh` | Copy the engine layer (`engine.js`, `engine.css`, `ENGINE.md`, `.claude/skills/`) FROM a source repo (normally the template) INTO this repo, removing the layer files the source deleted or renamed; runs the separation audit + syntax check; never commits. `bash .claude/skills/_shared/sync-engine.sh <game-url|remote> [ref]`. Used by **sync-engine**. |

## Requirements
- `python3` (static server), `node` + **Playwright** (Chromium); for asset skills:
  `Pillow`/`numpy` (image slicing/generation).
- Playwright is found via `require("playwright")` then `/opt/node22/lib/node_modules/playwright`.
- The harness loads the game over a static server; if outbound HTTPS goes through a
  proxy it points the browser at `HTTPS_PROXY` automatically (Chromium via a CLI flag,
  WebKit/Firefox via `launch.proxy`). Phaser is **vendored locally**
  (`vendor/phaser.min.js`), so tests don't depend on a CDN.

## Testing on the real Safari engine (WebKit) — for iOS bugs
Some touch/pointer bugs **do not reproduce in headless Chromium** (e.g. the implicit
pointer-capture *freeze* and the blue text-selection in the close-up — see ENGINE.md
"iOS / touch robustness"). Drive the actual Safari engine instead:
```bash
node .claude/skills/_shared/playtest.cjs --engine webkit --device "iPhone 13" \
  --probe ./touch-scenario.cjs
```
- `--engine chromium|webkit|firefox` (def. chromium); `--device "iPhone 13"` adds the
  touch/UA/viewport profile (any Playwright device name works).
- **One-time install** of the WebKit binary (it is not bundled):
  `npx playwright install webkit` then `npx playwright install-deps webkit`
  (or, with the vendored CLI: `node /opt/node22/lib/node_modules/playwright/cli.js install webkit`).
  The harness prints this hint and exits 3 if WebKit is missing.
- In a probe, drive touch with **real pointer events** (`page.mouse` / dispatched
  `pointerdown`/`pointermove`/`pointerup`), not `page.fill`, to actually exercise the bug.

## Engine globals exposed to `page.evaluate`
`GAME` (the config), `state`, `player`, `COLLISIONS`, `WORLD`, `PATHS`, `LOOP_SEG`,
`OPENINGS`, `LOGS`, `sc`, `game`, `onPointer`, `creatureAction`, `navPath`, `findPath`,
`worldToScreen` (world → CSS px, to tap a creature with `page.mouse.click`), `closeupOpen`,
`cuState`, `activeTarget`, …

Notes: with a device profile (`--device "iPhone 13"`, DPR 3) screenshots are slow
(~1 s) in headless Chromium — use `--viewport 390x844` to catch short-lived moments
(e.g. the close-up's finish reveal).

## Full example
```bash
bash .claude/skills/_shared/serve.sh 8099
node .claude/skills/_shared/playtest.cjs --walk \
  --shots "spawn:560:860:0.9,pen:1210:300:0.8,arena:2010:760:0.8"
```
The JSON report lists screenshots, walkability and `pageErrors` (exit code ≠ 0 on a page error).
