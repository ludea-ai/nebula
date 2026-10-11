---
name: new-game
description: Scaffold a BRAND-NEW game from this generic engine. Use when the user wants to create a different game on top of the engine ("create a new game", "start a new game from the engine", "scaffold a game", "init a game", "make a game about X"). Interactively asks the theme, target age/audience, art style, language and core loop, then generates a fresh game.config.js + assets + theming, wires it up, tests it, and (optionally) deploys. The engine code (engine.js) is never modified.
---

# new-game ⭐ (initializer / scaffolder)

Turn the engine into a specific game **without touching `engine.js`**. A game =
`game.config.js` (the whole definition) + assets + CSS theme. This skill authors them
from a short interview.

## ⭐ Start MINIMAL
A new game should ship **small**: the core loop and little else. Features get added by
**iterating** afterwards (that's the whole point). A good seed is roughly: one world
zone, one or two characters, a creature with **1–2 needs** and **2 care actions**, maybe
one station and a tiny objectives set — and **nothing more**. Leave variants, shop,
riding/obstacles, breeding, decorations, trail loops OFF until the user asks. Use
`meta.showCoins:false` when there's no economy; omit `objectives` to hide goals. The
engine stays fully capable — you're choosing what to enable, not removing anything.

**Two references, two roles:** `references/minimal-seed.config.js` is the small seed to
START from (one pen, 3 needs, 4 actions, one rest station, one level) — it is also the
`game.config.js` of the template's starter game, with its art in `tools/art/starter.cjs`.
The showcase **Nebula Nursery** lives in its own repo (https://github.com/ludea-ai/nebula):
it turns on every engine system — read its `game.config.js` / `tools/art/nebula.cjs` to see
how a feature is wired when the user later asks for it, but never copy it whole into a new game.

## Step 1 — Interview (AskUserQuestion)
Ask only what changes the output. Bundle into 1–2 `AskUserQuestion` calls:
- **Theme / subject**: what is the game about? (e.g. space pets, plant garden, robot
  workshop, monster ranch). Free text encouraged.
- **Target audience / age**: e.g. "young kids (6–8)", "kids (9–11)", "teens", "all
  ages", "adults". → sets `GAME.meta.audience` and the content-suitability bar used by
  **asset-search** (`references/content-policy.md`).
- **Art style**: smooth cartoon vector art generated from SVG (default — see the starter's
  `tools/art/starter.cjs`), or pixel-art (`render.pixelArt:true`).
- **Language**: the source language of the texts (`meta.lang`; the starter ships English). Every
  game is bilingual French / English by default: also generate `game.i18n.js` for the other one
  (`node .claude/skills/_shared/i18n-extract.cjs --to <lang>`, fill every value, `--check` passes;
  in a non-English game also `--to <meta.lang>` for the engine's English fallbacks).
- **Core loop**: the main entity to care for / interact with, and the 3–5 main
  **actions** (feed/clean/play/ride… or theme equivalents). Keep it close to the
  engine's supported systems (see `ENGINE.md` for the full list of capabilities).
  - A common kid-friendly loop is the **zoom / close-up** (`action.type:"closeup"`): the
    view zooms onto a backdrop and the player **scrubs spots off it** with a finger/brush
    (clean a mouth, wash a pet, polish a gem…). Pairs well with **`creature.depart`** (the
    cured one walks off) + a **`station.action:"spawn"`** (ring to bring more) and a
    **`creature.wantBubble`** (who needs help) — the "treat → leave → ring for more" loop.
    Almost text-free, so it's ideal for early readers. See ENGINE.md.
- **Optional systems**: variants, customization, riding+obstacles, breeding, aging,
  shop, decorations, objectives/levels, trail loop, close-up scrub, depart+spawn,
  want-bubble, unlocks, guide arrow. **Default = OFF.** (Always ON, they're just
  presentation: `render` look & feel and procedural `audio`. For young kids also turn on
  `guide` + `creature.tapAction` + `unlocks` — progression with no reading.) Only enable one if the user explicitly wants it in the
  first version.

If an answer is obvious from the theme, pick a sensible default and say so — don't
over-ask. Bias toward the smallest playable game.

## Step 2 — Author `game.config.js`
Write a new `game.config.js` (the **whole** game) following the schema in **`ENGINE.md`**.
Start from `references/minimal-seed.config.js` (NOT the full showcase) and replace,
section by section:
- `meta` (title, icons, logo, save key, theme colours, **audience**, UI strings incl.
  `meta.strings` for engine labels, language)
- `render` (pixelArt:false, vignette, label pills, ambient particles), `audio` (music mood)
- `world` + `camera`, `assets` (images/sheets), `player` + `characters`
- `creature` (label, needs, actions with effects/costs/rewards, variants, customize,
  ride/jump, celebrate, aging, breeding, names, start state) — omit systems not wanted
- `zones`, `stations`, `economy` + `shop`, `decor`
- `environment` (band + arena + trail loop + forest scatter) if used; else drop it
- `objectives.levels` (gamification), `help`
Use a fresh `meta.saveKey` so it doesn't collide with other games' saves.
Once the game is live, add its card to the Ludea site's catalogue (repo `ludea-ai/ludea.ai`:
`src/index.html` + a 390×844 screenshot in `shots/` + its app icon in `icons/` + a QR code, then
`node build.cjs`).

## Step 3 — Assets
- **Reuse** the generic environment assets already in `assets/` when they fit
  (ground, trees, bushes, fences, buildings).
- **New themed assets — generate them**: write `tools/art/<game>.cjs` (copy the starter's
  `tools/art/starter.cjs` structure: one parametric function per thing — character,
  creature, props, close-up backdrop, icon) and render with
  `node .claude/skills/_shared/render-svg.cjs tools/art/<game>.cjs`. Fully original, no
  licensing, crisp on phones. Always look at a contact sheet of the renders before wiring
  them. External sprites remain possible via **asset-search** → **asset-add** (respect
  the audience's content policy).
- Variants can be **tints** of one base sheet (no new asset needed) — see
  **add-creature-variant**.
- Generate fresh **PWA icons** (`assets/favicon.png` 512, `assets/apple-touch-icon.png`
  180) matching the new theme.
- Generate the **UI icon set** in the theme's palette with the shared kit
  (`IK.jobs(PAL, [...], "assets/ui/icons")` from `_shared/icon-kit.cjs`) + a few
  game-specific icons (the creature, the main tool…), and list them in `GAME.icons`.
  **No emoji anywhere in the UI**: labels, toasts and help use `{i:key}` tokens.
- Generate a **home splash** (`meta.splash`, 900×1600 portrait; keep its subject in the
  band between the logo and the bottom sheet, inside the phone crop x 80–820) and a
  **logo** (`meta.logo`).
- **Remove the previous game's leftover themed art** the new game no longer uses. Always
  **dry-run first and review** — never blanket-`--delete`:
  ```bash
  node .claude/skills/_shared/prune-assets.cjs            # list unreferenced files
  node .claude/skills/_shared/prune-assets.cjs --delete   # remove them (after review)
  ```
  It keeps any file referenced by path **or key** (and `CREDITS.md`). From the list,
  delete only the **old game's theme-specific art**. **KEEP the generic, reusable
  building blocks** even if unused now — ground tiles, trees, bushes, fences, generic
  buildings: you'll likely want them when you later add an arena/forest/trail (see
  `environment`). They're cheap to keep and costly to regenerate.
  Then prune the matching now-dead `assets` entries / old `tools/` art generators and
  update `assets/CREDITS.md`.
- Note: pruning runs **after** the new game is authored, and only touches asset *files* —
  the lasting references for building/iterating are **`ENGINE.md`** (full schema) + the
  per-feature skills + your own new `game.config.js`, none of which are removed.

## Step 4 — Theme & shell
- Restyle `style.css` — it holds ONLY the theme (CSS variables, `@font-face`, a couple of
  decorative rules); never edit `engine.css` (shared structure). Update titles/ids in
  `index.html` + `manifest.webmanifest` (`name`, `short_name`, `theme_color`,
  `apple-mobile-web-app-title`). Keep the iOS/PWA rules (see **ios-pwa-check**).

## Step 5 — Refresh the project `README.md`
The repo ships a README describing the **engine/template**. Rewrite its **top** to lead
with the game you just created, and **keep all the technical/template content below**
(how the template works, iterating, the link to `ENGINE.md`). Concretely:
1. **Derive the live URL from the repo's own remote** (GitHub Pages serves the default
   branch — so the link is reconstructed from the repo itself, no guessing). If the owner's
   Pages site has a custom domain (Ludea: every `ludea-ai` repo is served at
   `https://ludea.ai/<repo>/`), `github.io` redirects to it — follow the redirect:
   ```bash
   url=$(git remote get-url origin)
   slug=$(echo "$url" | sed -E 's#.*[/:]([^/]+/[^/]+?)(\.git)?/?$#\1#')
   owner=${slug%%/*}; repo=${slug##*/}
   gh="https://$owner.github.io/$repo/"
   curl -s -o /dev/null -w '%{redirect_url}\n' "$gh"   # non-empty → the custom-domain URL to use
   echo "$gh"
   ```
2. **Replace the engine intro** (the template's `# …` title + tagline + old "Play the
   demo" line) with a **game header** built from `meta`: `# <titleIcon> <title>`, the
   `meta.tagline`, one line on the core loop, the **target audience**, and a prominent
   **▶ [Play <title>](<pages url>)**.
3. Add one line that the game is **built on a reusable engine** and that the rest of the
   README explains how to make your own — then leave the existing sections (*Create a new
   game*, *iterate*, *ENGINE.md*) **intact**.
Keep it short and faithful to `meta` — don't invent features the game doesn't have. (The
**capitalize-learnings** skill keeps this in sync when the game later changes substantially.)

**Write the README in English** (the repo's documentation language) **even if the game's
UI is in another language** — don't mix languages. Mention the game's language in passing
(e.g. "the game itself is in French") rather than dropping foreign copy into the prose.

## Step 6 — Verify & ship
Run **visual-review** (art-check + full-size crops + tour screenshots on a tall AND a
short screen) before anything else in this step.
- **test-debug**: `node --check`, serve, run the harness — 0 page errors, core actions
  work, state correct. Look at the screenshots.
- **map-verify** if the map geometry is custom (walkability empty).
- **Tag the repo for discovery**: add a GitHub **topic** `built-with-<template>` to the
  new game's repo (via the GitHub API / `gh repo edit --add-topic`). There's no API to
  list repos generated from a template, so this topic is how the template later finds its
  games to harvest learnings (see **sync-engine**).
- **release-deploy** when the user wants it live (or hand back for review first).

## Guard-rails
- **Never edit `engine.js`.** If the engine genuinely lacks a capability, say so and
  propose adding it to the engine as a separate, generic feature (not game-specific).
- Keep `game.config.js` the single source of game content.
- Set `GAME.meta.audience` honestly — the asset skills rely on it for content safety.
- **Update `README.md`** to lead with the created game + its live GitHub Pages link
  (derived from the remote), while keeping the template/usage docs below.
- One safe, coherent, working game beats a half-wired ambitious one.

## Chaining
**new-game** → asset-search/asset-add (themed assets) → add-* skills → test-debug →
map-verify → release-deploy.
