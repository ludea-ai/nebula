---
name: sync-engine
description: Copy the engine layer (engine + skills + tooling) FROM the repo where it evolved INTO another repo — the template, the showcase or a game — so every repo runs the same engine. Run from the repo to UPDATE. Use when a repo has evolved the engine layer and the others must catch up. Triggers: "sync the engine", "backport the engine from <game>", "sync the template with <game>", "pull the learnings back into the template", "update the games' engine".
---

# sync-engine (target ⇐ source)

A template-generated repo shares **no git history** with the template (it's not a fork),
so this is **not a merge** — it's a deliberate, file-scoped copy. It works only
because the **engine layer is cleanly separated** (proven by `separation-audit.cjs`): it's
a known set of files with **zero game content**, so they port across unrelated repos.

> **Direction:** runs in the repo to **update**, pulls FROM the repo where the engine evolved.
> In the Ludea organisation engine work is developed and probe-tested in the showcase
> (`ludea-ai/nebula`, it exercises every system), then synced from Nebula into the template
> (`ludea-ai/game-engine`) and every game; the engine layer is identical everywhere. A
> learning made in a game goes the other way first (game → Nebula), then out to the rest.
> (The `capitalize-learnings` skill is what put each learning into the engine layer in the
> first place — this skill spreads it.)

## What moves vs what doesn't
- **Backported (engine layer):** `engine.js`, `engine.css`, `ENGINE.md`, `.claude/skills/`
  (incl. `_shared/` tooling). Optionally `vendor/` (Phaser, fonts), `.github/workflows/`.
- **Never backported (game layer):** `game.config.js`, `assets/`, `index.html`,
  `style.css`, `manifest.webmanifest`, `README.md`, `tools/`, `.claude/settings*.json`.
- **By hand:** `CLAUDE.md` (mixes engine conventions + template identity) — merge only the
  convention bullets.

## 1. Find the games (discovery)
There is **no GitHub API** that lists repos generated from a template (a generated repo
knows its template via the `template_repository` field, but not the reverse). So enumerate
them one of these ways:
- **Topic search (preferred):** `new-game` tags each game with a topic
  `built-with-ludea`; list via `GET /search/repositories?q=topic:built-with-ludea`. The Ludea
  catalogue games are listed in `ludea-ai/ludea-ai.github.io/catalogue.json`.
- **Account scan:** list your repos and keep those whose `template_repository.full_name`
  is your template.
- **Manual registry:** a `GAMES.md` in the template.

## 2. First time = manual bootstrap
You can't use this skill to import this skill. The **first** backport from the most-
evolved game is manual (it brings everything, including this skill):
```bash
git remote add <game> <url> && git fetch <game>
git checkout <game>/main -- engine.js ENGINE.md .claude/skills
node .claude/skills/_shared/separation-audit.cjs && node --check engine.js
# review, then commit
```

## Engine fingerprint & local changes
`_shared/engine-manifest.json` = the git blob hash of every engine-layer file + an engine
version (`YYYY-MM-DD.N`). `sync-engine.sh` rewrites it after each sync, so every repo knows
which engine it runs and `node .claude/skills/_shared/upstream.cjs drift --upstream` lists what
it changed locally that Ludea doesn't have. The script **refuses to sync over such changes**
(they would be lost): run **report-upstream** first, then `--force`. In Nebula, run
`upstream.cjs write-manifest` before committing any engine-layer change.
Games outside the Ludea organisation update from the template:
`bash .claude/skills/_shared/sync-engine.sh https://github.com/ludea-ai/game-engine.git main`.
Inside Ludea, merged engine batches are propagated by **triage-upstream** (phase A).

## 3. Routine harvest (after bootstrap)
```bash
bash .claude/skills/_shared/sync-engine.sh <game-git-url|remote> [ref]
```
It refuses on a dirty tree, fetches, checks out **only** the engine-layer paths, runs the
separation audit + `node --check`, and stops **without committing** so you review
`git diff --cached`. Then:
1. Resolve overlaps if several games touched `engine.js` differently — **one game at a
   time**, audit + tests after each.
2. **Show it in the showcase**: when Nebula is the target, upgrade its config to exercise
   any new flagship capability so it can't rot and is discoverable (game content authored in
   Nebula, not pulled). The template's starter stays MINIMAL (it is the new-game seed).
3. Verify on the target (**test-debug**, `--engine webkit` for touch), then **release-deploy**.

## Guard-rails
- Pull **only** the engine-layer paths; never a game's config/assets/theme/README.
- The **separation audit must stay green** after a sync — if a game leaked content into
  `engine.js`, fix it in the game (and via `capitalize-learnings`) before backporting.
- Keep new engine features config-gated, so the starter, the showcase and every game still run.
- Never `--force`; review every staged diff before committing.

## Chaining
Source side: **capitalize-learnings** (puts learnings into the engine layer).
Target side: **sync-engine** → (showcase: show the feature) → **test-debug** → **release-deploy**.
