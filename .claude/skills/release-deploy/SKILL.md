---
name: release-deploy
description: Publish a game built on this engine to production (static GitHub Pages site, deployed from main). Use when changes to engine.js / engine.css / game.config.js / style.css / index.html / assets are ready to go live. Handles cache-busting (vN), commit, push to main, then verifies the GitHub Actions deploy succeeded. Triggers: "deploy", "publish", "ship it", "put it online", "release".
---

# release-deploy

Cleanly publish a change to production.

## What to know
- **100% static** site, deployed to **GitHub Pages from `main`**. Pushing to `main`
  triggers `.github/workflows/deploy.yml`. **No PR** unless explicitly asked.
- **Cache-busting required** whenever JS/CSS/images change: the version `vN` must be
  bumped in **two places** (`assetVersion` in `game.config.js` + every `?v=vN` in
  `index.html`). Otherwise iOS/Safari serves the stale version.

## Procedure (Claude Code tools)
1. **Bash**: `git status` + `git branch --show-current`. Work on the configured
   branch; don't switch branches or open a PR without permission.
2. **Cache-bust** if a *site* file changed (engine.js / engine.css / game.config.js / style.css /
   index.html / assets) — **Bash**:
   ```bash
   node .claude/skills/_shared/bump-version.mjs
   ```
   (Skip if you only touched `.claude/` or docs.)
   Then the **share preview** (the card a shared link shows in iMessage / WhatsApp: image +
   "Ludea – <title>" + tagline) — it only re-renders when the splash, logo, title or tagline changed:
   ```bash
   node .claude/skills/_shared/share-preview.cjs        # writes assets/share.jpg + the tags in index.html
   ```
   Look at `assets/share.jpg` when it changed (title readable, logo not cut, no box around it).
   And the README's « Play » link must lead to where the game is served (a moved game kept a dead
   link, game-engine#19) — it rewrites a wrong one, no network:
   ```bash
   node .claude/skills/_shared/public-url.cjs --readme --fix
   ```
3. **Verify** — Bash: `node --check engine.js && node --check game.config.js`, the
   separation audit, `art-check.cjs`, and the regression tour (`probes/tour.cjs`, errors
   must be empty). If art/UI changed, **visual-review** must have been done.
   (and JSON validity of the manifest if it changed).
4. **Commit** with a clear message (what + why).
5. **Push with retry** — Bash:
   ```bash
   for i in 1 2 3 4; do git push -u origin "$(git branch --show-current)" && break || sleep $((2**i)); done
   ```
6. **Verify the deploy**: load the GitHub tools with **ToolSearch**
   (`select:mcp__github__actions_list,mcp__github__actions_get`), fetch the latest
   `deploy.yml` run on the branch, and confirm `conclusion = success`.
   The task is **not done** until it's green.
7. **Confirm** the live URL (and remind about the "Refresh" button on iPhone).

## Guard-rails
- Always the configured branch, never another branch / PR without explicit permission.
- Never skip cache-busting when a site file changes (the script does it).
- GitHub Pages caches `index.html` for 10 min (`max-age=600`): the engine's stale-page guard
  reloads to the live build, but tell testers to check the **build number** on the home
  screen and to wait 1–2 min. Batch fixes into fewer deploys while someone is testing —
  rapid successive deploys make results look random.
- If the run fails: read the log (GitHub MCP `get_job_logs`), fix, re-push.
- **First deploy of a new repo fails at "Configure Pages"** ("Create Pages site failed. Resource not
  accessible by integration"): Pages is not on yet and the workflow's `GITHUB_TOKEN` cannot create it.
  Turn it on with the user's token — `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`
  (or Settings → Pages → Source: GitHub Actions) — then re-run the failed run (`gh run rerun <id>`).

## Chaining
**Engine problems noticed along the way are reported now** (game-engine#18): anything wrong in the
engine layer or its tooling that you noticed during this task — a tool output that looks wrong, a
file the sync left behind, a missing browser, a doc that misled you — goes to **report-upstream**
before you tell the creator, even when the task itself succeeded. Never leave it at a mention or a
link for the creator to click. (In `ludea-ai/*` you ARE upstream: fix it there instead.)
Last step, after **test-debug** (the feature works) and, for a map change, after **map-verify**.
