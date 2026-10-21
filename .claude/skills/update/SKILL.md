---
name: update
description: Update THIS game to the latest Ludea engine (from the public template ludea-ai/game-engine), safely and in plain words — after the creator said yes. Reports any local engine change first (nothing is lost), copies the new engine layer, checks the game still works (tour on phone + Safari, translations, separation), puts it online and tells the creator what is new and which build number to look for. The SessionStart hook (update-check.cjs) tells you when a new version exists. Triggers: "/update", "update the engine", "mets à jour le moteur", "get the latest Ludea version", "is there a new engine version?", after the update-check notice and the creator's yes.
---

# update (Ludea template → this game, on the creator's yes)

For games made from the template, in the creator's OWN repo. (Ludea's own games are updated
by the maintainers' engine agent — `update-check.cjs` stays silent there.)

## 0. Is there something new?
```bash
node .claude/skills/_shared/update-check.cjs        # "up to date" or the new version + what's new
```
Tell the creator in ONE plain sentence what it brings for THEIR game (pick the lines that matter
for the systems their config uses), and ask. Never update without a yes.

## 1. Keep what the game changed in the engine
`node .claude/skills/_shared/upstream.cjs drift --upstream --unreported` — anything listed is a
local engine change Ludea doesn't have yet → run **report-upstream** first (the sync refuses
otherwise, so nothing is lost silently). If the creator needs that local change and the new
engine doesn't include it yet, say so and ask before going on.

## 2. Update
```bash
git status --porcelain            # must be clean (commit the game's work first)
bash .claude/skills/_shared/sync-engine.sh https://github.com/ludea-ai/game-engine.git main
```
It copies only the engine layer (engine.js, engine.css, ENGINE.md, .claude/skills), never the
game (config, art, texts). It lists the **skills it changed** — this one included: from here on,
**invoke this skill again** (Skill tool) and follow the new version for the remaining steps, and
invoke every other skill you still have to run; never go on from the copy read before the sync
(game-engine#23). Read `ENGINE.md` / `_shared/CHANGELOG.md` for anything the config
must adapt to (renamed option, new required field) and adapt the config if needed.

## 3. Check the game still works (all must be green)
- `node --check engine.js && node --check game.config.js`
- `node .claude/skills/_shared/i18n-extract.cjs --to <other lang> --check`
- `node .claude/skills/_shared/separation-audit.cjs`
- tour on a phone: `playtest.cjs --viewport 390x844 --probe .claude/skills/_shared/probes/tour.cjs`
  and on Safari: `--engine webkit --device "iPhone 13"` (pageErrors [], errors []). Run them one
  at a time (several WebKit browsers at once make timing checks flaky).
- the probes of the systems the game uses (`probes/systems.cjs`, `racerivals.cjs` for a race…).
Red → don't publish: fix if it is the game's config; if it is the engine, undo the update
(`git checkout -- . && git clean -fd .claude`), **report-upstream** it as a bug, tell the creator
plainly that the update waits for a fix.

## 4. Report what looked wrong in the engine
**Engine problems noticed along the way are reported now** (game-engine#18): anything wrong in the
engine layer or its tooling that you noticed during this task — a tool output that looks wrong, a
file the sync left behind, a missing browser, a doc that misled you — goes to **report-upstream**
before you tell the creator, even when the task itself succeeded. Never leave it at a mention or a
link for the creator to click. (In `ludea-ai/*` you ARE upstream: fix it there instead.)
Also make the README's « Play » link lead to where the game is served (a moved game kept a dead
link, game-engine#19): `node .claude/skills/_shared/public-url.cjs --readme --fix`.

## 5. Put it online and tell
`node .claude/skills/_shared/bump-version.mjs`, commit (`Engine <version> from the Ludea template`),
push, check the deploy is green (release-deploy). Then, in their language, 2–3 lines: what is new
for their game, what was checked, what was NOT (real phone, sound), and the build number to look
for at the bottom of the home screen. If the game is in the Ludea catalogue, a new
**/publish** sends the updated version for review.

## 6. Suggest what the game could now do (never switch it on alone)
Read the `### New — you can switch it on` lines of every version between the old and the new
engine (`update-check.cjs --json` → `news`, or `_shared/CHANGELOG.md`). Keep the 1–3 that fit THIS
game (look at its config: missions? a chase? riding? young players?) and offer them as ideas, in
their words: « Maintenant, ton jeu pourrait aussi… Tu veux que je l'ajoute ? ». A yes = normal
work on the game (config + art + tests + deploy), one idea at a time. If the game is published in
the Ludea catalogue, remind them that **/publish** sends the improved version for review.

## Guard-rails
- Only with the creator's yes; never in the middle of their task or during a feedback session.
- Never overwrite an unreported local engine change (report it first).
- Never touch game content during the update.
