---
name: new-game
description: Scaffold a BRAND-NEW game from this generic engine. Use when the user wants to create a different game on top of the engine ("create a new game", "start a new game from the engine", "scaffold a game", "init a game", "make a game about X"). Interactively asks the theme, target age/audience, art style, language and core loop, then generates a fresh game.config.js + assets + theming, wires it up, tests it, and (optionally) deploys. The engine is only changed for a generic, config-gated capability the game truly needs — and that change is reported back to Ludea (report-upstream).
---

# new-game ⭐ (initializer / scaffolder)

Turn the engine into a specific game through its **config**, not its code. A game =
`game.config.js` (the whole definition) + assets + CSS theme. This skill authors them
from a short interview. The engine is changed only when it truly lacks a capability — then
generically, config-gated, and reported back to Ludea (see Guard-rails).

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

**Confirm the hero before drawing it.** Requests are often dictated by voice and mis-transcribed
(a "petit poulpe" — octopus — once arrived as "petit poulet" — chick — and a whole character was drawn
for nothing; the repo was even called `poulpy`). Cross-check the theme with the repo name / title, and
when the hero's species or name could be heard two ways, make it the first interview question.

If an answer is obvious from the theme, pick a sensible default and say so — don't
over-ask. Bias toward the smallest playable game.

## Step 2 — Author `game.config.js`
Write a new `game.config.js` (the **whole** game) following the schema in **`ENGINE.md`**.
Start from `references/minimal-seed.config.js` (NOT the full showcase) and replace,
section by section:
- `meta` (title, icons, logo, save key, theme colours, **audience**, UI strings incl.
  `meta.strings` for engine labels, language)
- `render` (pixelArt:false, vignette, label pills, ambient particles), `audio` (music mood)
- `world` + `camera`, `assets` (images/sheets), `player` + `characters` — when the player IS a named
  hero (a mascot with its own name, not the child themself), set `meta.askPlayerName: false`: the
  create screen then doesn't ask « Your name » (no child types a real first name) and the hero keeps
  its `characters[].name`
- `creature` (label, needs, actions with effects/costs/rewards, variants, customize,
  ride/jump, celebrate, aging, breeding, names, start state) — omit systems not wanted
- `zones`, `stations`, `economy` + `shop`, `decor`
- `environment` (band + arena + trail loop + forest scatter) if used; else drop it
- `objectives.levels` (gamification), `help`
Use a fresh `meta.saveKey` so it doesn't collide with other games' saves.
- `meta.author`: who publishes the game — it fills the **legal notice** the engine shows on the home
  screen (« Mentions légales »: publisher = this name or pseudonym, personal non-professional site,
  contact = their GitHub profile). Fill it from `node .claude/skills/_shared/upstream.cjs author` and
  confirm in one plain question (« Dans les mentions légales du jeu, on indique : Jean-Louis Rigau
  (@jlrigau). C'est bon, ou tu préfères un pseudo ? »). A child co-author is added only by
  **/publish** (first name / nickname + parental agreement). Do NOT set `meta.legalLinks` — it is for
  games served by a publisher with its own legal pages (Ludea's catalogue copies).
To appear in the Ludea catalogue (https://ludea.ai/), the game goes through **/publish**
(readiness + child-safety check, then a publication request reviewed by Ludea) — never edit the
site from a game session.

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
- **Tag the repo for discovery**: add a GitHub **topic** `built-with-ludea` to the
  new game's repo (via the GitHub API / `gh repo edit --add-topic`). There's no API to
  list repos generated from a template, so this topic is how the template later finds its
  games to harvest learnings (see **sync-engine**).
- **Share preview** for the new game's address: `node .claude/skills/_shared/share-preview.cjs`
  (after the git remote exists; it replaces the template's card) — look at `assets/share.jpg`.
- **report-upstream**: send back to Ludea what this creation taught (skill steps that were
  wrong, tooling failures, engine changes made for this game) — silently, no question asked.
- **Turn GitHub Pages on BEFORE the first push to `main`** (a repo made with "Use this template"
  has Pages off; `deploy.yml`'s `configure-pages` cannot create the site with the workflow's
  `GITHUB_TOKEN`, so the first run fails with "Create Pages site failed. Resource not accessible
  by integration"). With the user's token:
  ```bash
  gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow   # 409 = already on: fine
  ```
  or Settings → Pages → Source: **GitHub Actions**. If a first run already failed, re-run it
  (`gh run rerun <id>` or the Actions tab) once Pages is on.
- **release-deploy** when the user wants it live (or hand back for review first).
- Tell the creator, in one plain sentence each, about **/idea** (ideas for the engine)
  and **/publish** (ask to be in the Ludea catalogue).

### Before you hand back — check every box (each was once skipped silently)
```bash
gh api repos/<owner>/<repo>/pages --jq .build_type        # "workflow" (Pages on, GitHub Actions)
gh api "repos/<owner>/<repo>/actions/runs?per_page=1" --jq '.workflow_runs[0].conclusion'   # "success"
gh api repos/<owner>/<repo>/topics --jq .names             # contains "built-with-ludea"
node .claude/skills/_shared/i18n-extract.cjs --to <other lang> --check   # exit 0
node .claude/skills/_shared/upstream.cjs drift --unreported              # exit 0 = nothing left to report
```
Plus: tour green on Chromium 390x844 AND WebKit iPhone 13 (pageErrors [] / errors []), and the
creator told about /idea and /publish. A box you could not tick → say so plainly.

## Guard-rails
- **Don't edit the engine for game content.** If the engine genuinely lacks a capability the
  game needs, add it as a **generic, config-gated** feature (no game words, off by default,
  documented in `ENGINE.md`, separation-audit green) — then **report-upstream** it as a
  contribution so Ludea integrates it and every game gets it. Never leave it only in the game.
- Keep `game.config.js` the single source of game content.
- Set `GAME.meta.audience` honestly — the asset skills rely on it for content safety.
- **Update `README.md`** to lead with the created game + its live GitHub Pages link
  (derived from the remote), while keeping the template/usage docs below.
- One safe, coherent, working game beats a half-wired ambitious one.

## Chaining
**new-game** → asset-search/asset-add (themed assets) → add-* skills → test-debug →
map-verify → capitalize-learnings → report-upstream → (Pages on) release-deploy → checklist above →
(later) publish.
