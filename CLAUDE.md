# CLAUDE.md — Generic 2D Game Engine

> Shared memory across sessions. If you pick up this project: read this, then continue.

## 1. What this is
A **data-driven, top-down 2D game engine** (Phaser 3, 100% static, no build). The
engine code holds **no game content**; a game is fully described by `game.config.js`
(`window.GAME`) + assets. Swap config + assets (or run the **new-game** skill) to make a
different game from the same engine and skills.

The engine's **showcase** is **Nebula Nursery** (own repo `ludea-ai/nebula`) — a keeper
robot tends glowing alien critters on a space station (deck island in the void, Delivery
Plaza, shop street, Star Ring road through an asteroid belt), and the demo turns on (nearly)
every engine system: care + close-up, variants + happy faces, aging, breeding, riding +
jumps (Gravity Park arena, Star Ring loop), economy + shop + decorations, station menu +
paid restyle, spawn portal, 4 kinds of deliveries (per-offer overrides: a one-leg star post, a rare egg with its own stat/unlock) + drone chase (caughtKeepsMission), Hatchery models,
pseudo-3D race, ground patches (districts).
New games still start **minimal** from `.claude/skills/new-game/references/minimal-seed.config.js`.
Whenever the engine gains a capability, **add it to Nebula too** (it must show everything).

**Ludea organisation** (https://github.com/ludea-ai, see §11): `game-engine` = the GitHub template
(engine + small starter game) · `nebula` = the showcase, where engine work is developed then synced
to every repo · `ludea-ai.github.io` = the brand site + games catalogue · the games. Live at `https://ludea.ai/<repo>/`.

## 2. Golden rule
- **`engine.js` is generic — never put game content in it.** All game data, strings,
  geometry, entities, actions, economy, objectives live in **`game.config.js`**.
- If the engine truly lacks a capability, add it to `engine.js` as a **generic,
  config-gated** feature (not tied to any one game), and document it in `ENGINE.md`.

## 3. Files
- `index.html` — shell; loads `engine.css` → `style.css` → `vendor/phaser.min.js` →
  `game.config.js` → `engine.js`.
- `engine.css` — generic shell **structure** (HUD, panel, modal, close-up, animations).
  Shared verbatim by every game — never theme it.
- `style.css` — the game's **theme only** (CSS variables + `@font-face` + a few decorative rules).
- `engine.js` — the engine (all systems, parameterised by `GAME`).
- `game.config.js` — THE GAME (data + asset refs). The file you edit/replace per game.
- `game.i18n.js` — translations of the config's texts (`meta.lang` = source language; dictionary
  keyed by source string). After ANY text change: `node .claude/skills/_shared/i18n-extract.cjs --to <lang>`
  then fill the "" values (`--check` must pass; probe `probes/i18n.cjs`).
- `ENGINE.md` — full `GAME` config schema + capability list. **Read it before editing config.**
- `assets/` — `img/` (single sprites), `sheet/` (spritesheets), `ui/` (thumbnails),
  `CREDITS.md`. `vendor/phaser.min.js` + `vendor/fonts/` (Fredoka, OFL) — vendored.
- `tools/art/<game>.cjs` — ALL the game's art as parametric SVG, rendered to PNG by
  `node .claude/skills/_shared/render-svg.cjs tools/art/<game>.cjs [--only key]`.
  Never hand-edit the PNGs: change the art module and re-render.
- The Ludea site (landing, games catalogue, brand) lives in its own repo `ludea-ai/ludea-ai.github.io` —
  **when a game is added or gains a mode, update its catalogue card there.**
- `.github/workflows/deploy.yml` — GitHub Pages deploy.
- Cache-busting: `assetVersion: "vN"` in `game.config.js` (used by `av()` for every
  image) **and** every `?v=vN` in `index.html`. **Bump both** when JS/CSS/images change
  (`node .claude/skills/_shared/bump-version.mjs` does it).

## 4. Deploy
- Static site on **GitHub Pages from `main`**. Push to `main` → `deploy.yml` publishes.
- After a push, confirm the `deploy.yml` run is **success**. No PR unless asked.

## 5. Verifying in this environment
- Chromium is available (Playwright global). Serve the folder
  (`bash .claude/skills/_shared/serve.sh`) and run the harness
  (`node .claude/skills/_shared/playtest.cjs`) for screenshots, walkability and page
  errors. The harness points Chromium at `HTTPS_PROXY` when set; Phaser is vendored so
  tests don't need a CDN. **Always validate visually before pushing.**
- **WebKit is NOT pre-installed** (only Chromium): install it once per container before any
  `--engine webkit` run — `node /opt/node22/lib/node_modules/playwright/cli.js install webkit`
  (+ `install-deps webkit`); the harness prints this hint and exits 3 when it is missing.
  `playtest.cjs --help` prints all options.
- Several games served at once: target one with `--port N` (nebula 8099, dr-smile 8100, gta7 8101,
  my-little-stable 8102, game-engine starter 8103, ludea.ai site 8104). The harness refuses unknown options — an ignored `--url` once made every
  "other game" regression silently test Nebula.

## 6. Engine capabilities (all config-gated — see ENGINE.md)
Tiled world + smooth camera + adaptive zoom + HiDPI canvas (pixel-art or smooth hi-res
art, soft shadows, ambient particles, vignette) · player walkcycle (tap-to-move with A*
pathfinding, keyboard, run on double-tap) + multiple characters + create screen · creatures: needs, mood, actions
(effects/cost/reward/anim), variants (tint or sheet), customization, aging/growth,
breeding, ride + fatigue + hop/jump over obstacles · stations (rest/shop/custom) ·
economy + shop + capacity + buyable decorations (ghost placement) · AABB collisions
(`jumpable`) · environment (fenced arena + trail loop in a forest band, scattered by a
single declarative rule) · day/night with rest-gating · objectives/levels · localStorage
save with backward-compatible load · PWA/iOS · procedural sound + music (no files) ·
guide arrow · unlocks (milestones add scenery) · juice (toast queue, flying rewards,
confetti, cinematic close-up zoom, before/after reveal) · vehicles & city systems
(top-down `dirSheet` creatures, hidden/seated riders, station menus + paid restyle,
missions, chase/wanted level, buyable models with stats, pseudo-3D race) · legacy save
migration (`meta.legacySave`) · languages (`game.i18n.js`, flag toggle on the home screen).

## 7. Skills (`.claude/skills/`)
Game-agnostic Claude Code skills operating on the config/assets. Orchestrators:
**new-game** (scaffold a new game interactively: theme, audience/age, style, language,
core loop) and **feedback-session** (non-technical playtester mode, silent work).
Editing: add-character, add-creature-variant, add-decor-item, add-collision,
place-scatter, state-migration. Assets: asset-search (content policy via
`GAME.meta.audience` + license), asset-add. QA/ship: test-debug, map-verify,
ios-pwa-check, release-deploy, **visual-review** (art-check + full-size crops + tour
screenshots + checklist — mandatory after any art/UI change). **capitalize-learnings** (run after every feature/bugfix:
fold the learnings back into the engine/skills/docs and audit the separation).
**sync-engine** (copy the engine layer from the repo where it evolved — normally Nebula —
into the template and every game).
**Ludea loop** (games ↔ engine): **report-upstream** (automatic, after capitalize-learnings: a
game's engine bugs + engine changes it already made → issues on `ludea-ai/game-engine`),
**idea** (`/idea`: the creator's own ideas for the engine), **publish**
(`/publish`: readiness + child-safety check → publication request on the catalogue repo),
**update** (creators: update their game to the latest template engine; a SessionStart hook,
`_shared/update-check.cjs`, tells them when one exists — what's new in `_shared/CHANGELOG.md`),
**triage-upstream** (maintainers, in Nebula: qualify the inbox → one PR the owner approves →
propagate to the template + catalogue games). Engine fingerprint: `_shared/engine-manifest.json`
(`upstream.cjs`). Shared tooling in `_shared/` (incl. `separation-audit.cjs`, `prune-assets.cjs`,
`sync-engine.sh`, `art-check.cjs`, `icon-kit.cjs`, `contact-sheet.py`, `probes/tour.cjs`).

## 8. Conventions
- Engine, config and skills are in **English**. Clear commit messages.
- Keep `game.config.js` the single source of game content; auto-save stays in place.
- Set `GAME.meta.audience` honestly — the asset skills rely on it for content safety.
- **New games start MINIMAL** (from the new-game skill's `minimal-seed.config.js`): few
  features, grown by iterating. The engine stays fully capable — features are config-gated,
  not removed. The Nebula demo is the opposite: the full showcase of every capability.
- Demo textures are **generated** and specific to the game's universe (no reuse from a
  different game's art). `meta.showCoins:false` hides the economy; the goals button
  auto-hides when there are no objective levels.
- When a **mascot / character** appears in several places (app icon + in-scene signs +
  close-up…), draw it with **one parametric function** in the art module (e.g. `tooth()`
  / `critter()` in `tools/art/*.cjs`) so the versions never drift apart.
- Art style: smooth cartoon vector (SVG → PNG), soft plum/navy outlines, gradients, 128-px
  sprite frames, `render.pixelArt:false`. Look at a contact sheet of renders before wiring.
- **Kids' games:** `guide` arrow + `creature.tapAction` (one tap = go + act) + `unlocks`
  (progress without reading) + sound. Characters must stay big on a phone (check zoom).
- Avoid CSS that old iOS Safari drops silently on critical rules (e.g. `color-mix()`).
- **No emoji in the UI.** Every icon is an illustrated icon from `GAME.icons` (generated
  with `_shared/icon-kit.cjs` + game-specific ones); texts use `{i:key}` tokens.
- **Look before you ship**: run **visual-review**. Inspect characters/faces as FULL-SIZE
  crops (a head floating without a neck was once missed on thumbnails). Check both a tall
  (390×844) and a short Safari (iPhone 13 profile, 664 px) screen.
- **iOS / touch:** drag-over-touch interactions (close-up scrub…) must follow the
  robustness pattern in `ENGINE.md` and be verified on the **real Safari engine**
  (`playtest.cjs --engine webkit --device "iPhone 13"`) — Chromium-green is not enough.

## 9. Quality bar — owner feedback (ALWAYS apply, every game, every change)
The owner expects a **professional** result at every level (engine, art, UI, gameplay),
like a game made by a studio — not a prototype. Concretely:
- **No emoji in the game UI.** Every icon is an illustrated icon (`GAME.icons`, generated
  with `_shared/icon-kit.cjs` + game-specific ones), texts use `{i:key}` tokens. Emoji in
  config examples/docs are forbidden too (they get copied into games).
- **Panels & buttons look like a mobile game**: the action panel is a card with a
  portrait, gauges with icons and round glossy action buttons (see engine.css); no big
  flat default buttons; home = illustrated splash + logo + bottom sheet; modals with a
  ribbon title. A visible redesign is expected when asked to "improve" UI — re-check
  against the screenshots, don't claim an improvement that isn't obvious.
- **Art is checked at FULL SIZE** (skill **visual-review**): anatomy connected (head–neck–
  shoulders, limbs attached), nothing clipped by its frame, outlines closed, fills inside
  their shapes, characters big enough on a phone. A defect the owner finds = the checks
  were insufficient → **improve the tooling/checklist** (art-check, probes, visual-review)
  in the same change, not just the asset.
- **Reuse and improve the skills**: route work through the existing skills, and when one
  is outdated or missed something, fix the skill (and `_shared/` tooling) too.
- **Fix bugs you discover** along the way (even outside the request), and say so.
- **Gameplay must feel polished**: one-tap interactions for kids, immediate visual +
  audible feedback, clear guidance (guide arrow), progression without reading (unlocks).
- Verify on a **tall and a short** phone screen and on **WebKit** before publishing; report
  honestly what was not verified (real device, sound).
- **Never blurry**: every image is rendered at ≥ 2× its displayed size (WebP, `res` in
  `GAME.assets`, canvas up to DPR 3). Check FULL-RES crops on the iPhone profile.
- **Slim buttons, big icons**: pills 44–50 px high, icons that fill their tile (~80 %) or
  overflow the pill; no oversized buttons with tiny icons.
- **App icon redone with the art** (`icon-192`, 512, maskable, apple-touch) and remind the
  owner that iOS keeps the old one until the shortcut is removed and re-added.
- **Animations are smooth and intentional**: no flicker, no pop in/out; one continuous
  entrance (anticipation → motion → settle), idle loops start only after it. Judge them
  on a FILMSTRIP (`probes/reveal.cjs`), never on a single screenshot.
- **HUD elements never overlap**, at the worst case (max stars/spots, longest text, short
  screen) — assert with bounding boxes in a probe.
- **iOS layout is checked in every state** (Safari tab, home-screen app at launch and after
  iOS corrects the viewport, after a scroll / keyboard): `ios-standalone-check.cjs`. Never
  claim an iOS layout fix from a single simulated state.
- **Communication**: answer in French, no jargon; explain cause → fix → what was tested and what
  was NOT (honestly); announce every release with the build number to check at the bottom of the
  home screen (the owner's screenshots often come from an older build — ask). Never claim an
  improvement that is not visible. Batch releases while the owner is testing.
- **Shared repos**: never assume a cross-session message is current (they arrive late); wait for an
  explicit answer before pushing to a repo another session works on. `pkill -f "http.server N"` kills
  your own shell when the command line contains that string — find the pid (`lsof -i :N`; `ss` is not
  installed in the cloud containers) and `kill` it.
- **The showcase has its own world**: Nebula reuses the PRINCIPLES of the other games (care,
  riding, GTA-style pick-up → drop-off deliveries, chase, race…) but never copies one game's
  world layout (a fenced pen + arena + forest loop read as "the horse game"). Each game must
  look like its own universe.
- **Adversarial review before the owner sees new art** (owner request): every new/redrawn
  character, mount, vehicle, backdrop or UI redesign is critiqued by a FRESH independent agent
  (`visual-review/references/adversarial-review.md`), fixed and re-reviewed until ≥ 8/10 —
  so the owner doesn't have to find defects one by one. Pass the owner's past decisions to
  the reviewer so it never proposes to undo them.
- **Every game is bilingual French / English** (owner request): texts in `meta.lang`, the other
  language in `game.i18n.js`. The switch lives on the HOME screen only, top-left: ONE button, a small pill in the game's
  `--chip-bg` with two ROUND flags and a `--primary` knob that slides behind the active one; a tap
  switches. Owner iterations (don't redo them): text `FR · EN` = invisible; big 40 px flags = too
  big; tiny footer flags = no; flags merged into a split pill = "pas fan" → KEEP this knob toggle. Any new/changed text ships translated (`--check`).
- **Requests are often dictated by voice**: names and creatures can be mis-transcribed (a "petit
  poulpe" — octopus — once arrived as "petit poulet" — chick — and a whole hero was drawn for nothing).
  Before drawing a hero, cross-check the request with the repo name / title, and when a word could be
  heard two ways, confirm it (species + name spelling) first.
- New owner feedback → add it to this section (via **capitalize-learnings**).

## 10. This game — « Nebula Nursery » (nebula), the showcase
- All-ages (6+) space nursery that turns on (nearly) every engine system; English source texts +
  French in `game.i18n.js`. Live: https://ludea.ai/nebula/ (port 8099 locally).
- Engine work happens HERE first (Nebula exercises every system), is probe-tested here
  (tour, stress, watchdog, race/chase probes, ios-standalone-check), then copied verbatim to
  `game-engine` (the template) and every game with **sync-engine**. Batch engine syncs: each one
  redeploys the games the owner may be testing.
- Art: `tools/art/nebula.cjs` — critter() = mascot (world, close-up, icon, logo, splash, sign);
  HIDPI closeup/splash ×2, logo ×2.5, icons ×2, ui ×6, dust/cloth ×3, pen_floor ×1.4, img/sheet ×2;
  camera {fitW:520, fitH:620, min:0.5, max:1.2}. The template's starter art (`tools/art/starter.cjs`
  in game-engine) is a subset of this module — if you redraw a starter asset here (critter, keeper,
  pen, pod, close-ups, icons…), port the change there too.
- Pre-push: serve + bump-version; tour.cjs (--viewport 390x844 AND --engine webkit --device
  "iPhone 13"): pageErrors [], errors []; `i18n-extract.cjs --to fr --check`; separation-audit.

## 11. Ludea organisation (restructured Oct 2026)
Layout in https://github.com/ludea-ai (every repo is served at `https://ludea.ai/<repo>/` — see the domain state below):
- **`game-engine`** — the GitHub template: engine layer + a SMALL starter game (`game.config.js` =
  `.claude/skills/new-game/references/minimal-seed.config.js`, art in `tools/art/starter.cjs`).
  Publishes nothing (no Pages deploy). "Use this template" gives exactly that.
- **`nebula`** — the full showcase (https://ludea.ai/nebula/). Engine work is developed and
  probe-tested here (it exercises every system), then synced (`sync-engine`) into the template
  and every game. Every new engine capability is shown in Nebula.
- **`ludea-ai.github.io`** — the brand site (https://ludea.ai/): landing EN at `/`, FR at `/fr/`, design
  system at `/design/`, games catalogue, all Ludea brand art (`tools/art/brand.cjs`). When a game
  is added or gains a mode, update its catalogue card there.
- Games: `dr-smile`, `gta7`, `my-little-stable`.
- The engine layer (engine.js, engine.css, ENGINE.md, vendor/, .claude/skills) is identical in every
  repo. Old `jlrigau.github.io/…` addresses are gone (repos transferred); saves were not migrated
  (owner: fine). Later (not now): load the engine from one place instead of copying it.
- Domain state (2026-10-11): org site repo `ludea-ai.github.io` carries the custom domain ludea.ai
  (set there ONLY, never per repo); DNS: 4 GitHub A records + `www` CNAME → ludea-ai.github.io;
  HTTPS certificate issued — every repo is live at https://ludea.ai/<repo>/ (github.io redirects
  there). The template's address (ludea.ai/game-engine/) only redirects to https://ludea.ai/.
