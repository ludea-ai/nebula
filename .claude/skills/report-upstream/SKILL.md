---
name: report-upstream
description: Report back to the Ludea engine, AUTOMATICALLY and without asking the creator anything technical, what this game's work taught — bugs hit in the engine / skills / tooling / docs / template, and engine improvements ALREADY implemented in this game (the engine-layer drift, with its patch). Creates de-duplicated issues on ludea-ai/game-engine (or gives a one-click prefilled link when this session can't write there). Run by capitalize-learnings after every feature/bugfix, at the end of new-game, and before any sync-engine that would overwrite local engine changes. Triggers: "report this to the engine", "send the improvements back to Ludea", "tell the engine team", after capitalize-learnings.
---

# report-upstream (game → Ludea engine, automatic)

A game made from the template lives in its **own repo**: whatever it fixes or adds to the
engine stays there unless it is reported. This skill sends it back to the **engine inbox**
(`ludea-ai/game-engine` issues), where the maintainers' **triage-upstream** agent qualifies
it, integrates it in Nebula, and propagates it to the template and every catalogue game.

## 0. Should it run here?
```bash
node .claude/skills/_shared/upstream.cjs context      # repo, game, engine version, drift, already reported
```
- `isUpstream: true` (in `ludea-ai/nebula` or `ludea-ai/game-engine`) → **don't report**: you
  ARE upstream, fix it directly (capitalize-learnings → sync-engine).
- The creator said they don't want reports → honour it, write `Upstream reports: off` in
  CLAUDE.md §10, stop. (Never ask by default: reporting is the expected behaviour.)
- Read the drift: `drift.changed/added/removed` = what to report; `drift.alreadyUpstream` = the
  same files Ludea already has (came with a sync) → nothing to do; `driftUnreported` = what is
  still not reported (empty = nothing left).
- No `engine-manifest.json` (game created before this mechanism) → bootstrap it once from the
  commit that copied the template (usually the first one), then commit it:
  `node .claude/skills/_shared/upstream.cjs write-manifest --from $(git rev-list --max-parents=0 HEAD)`.

## 1. Collect the items (from this session's work + the drift)
| Kind | What | Title prefix |
| --- | --- | --- |
| **contribution** | An engine-layer change ALREADY made here (engine.js, engine.css, ENGINE.md, a skill, `_shared/` tooling) — `upstream.cjs drift --upstream` lists it. One issue per coherent change (group files that serve one purpose). | `[contribution]` |
| **bug** | A failure in the engine / a skill / the tooling / the docs / the template that was hit — fixed locally or worked around or not. Include the reproduction. | `[bug]` |
| **idea** | A capability the game wanted but did NOT build (it worked around it in config, or gave up). | `[idea]` |

Not reported: game content (art, copy, config tuning), the creator's taste, anything specific to
this game. Ask yourself "would another game hit/want this?" — if no, skip it.

**Report while it is fresh**: a later session has no transcript of today's failures — run this
right after capitalize-learnings, in the session that hit them. Good sources: the session's own failures (a skill step that was wrong or missing, a probe that
lied or was flaky, a script error, a doc that contradicted reality, a tool missing from the
environment), every `engine.js` edit, every skill/`_shared` edit made by capitalize-learnings.

## 2. De-duplicate
- Local log: `upstream.cjs context` → `reported` (what this repo already sent). Skip those.
- Remote: `list_issues` on `ludea-ai/game-engine` (state open AND closed, fields number/title —
  the inbox is small, read the titles) and, for a precise topic, `search_issues` with a
  natural-language query (it is semantic: "guide pointer overlaps HUD", not `repo:` syntax). An
  empty list from `list_issues` = empty inbox; an empty search alone proves nothing. Same problem already there → add a short **comment**
  with the new evidence ("also hit in <repo>: …") instead of a new issue.

## 3. Write each issue (public — keep it clean)
Title: `[kind] <short, generic description>` (no game name in the title).
Body (Markdown, **English** — every Ludea issue is in English, whatever the creator's language):
```
<!-- ludea-report v1 kind=<bug|contribution|idea> game=<owner/repo> engine=<engine version> -->
### What
<one paragraph, generic: what is wrong / what the change does>
### Where
<engine.js system | skill <name> | _shared/<tool> | ENGINE.md | template>
### Evidence
<repro steps, probe output, error message — short quotes>
### Proposed change
<contribution: files + the game commit(s): https://github.com/<owner/repo>/commit/<sha> and the patch
 in a <details> block — `upstream.cjs patch out.diff --files a,b` limits it to this change's files;
 when one file mixes several changes, keep only this change's hunks (if > 40 KB: commit links only).
 bug: the fix if one was made (it is then a contribution: report it as one, mention the bug in it),
 else a suggested fix or "none yet". idea: the wished behaviour + a sketch of the config it could take.>
### Game context
<repo · live URL · engine version · audience age>

---
_Generated by [Claude Code](https://claude.ai/code)_
```
**Never** include: personal data (names of children or testers, emails), secrets/tokens, the
creator's private messages verbatim, whole transcripts. Describe, don't paste.

## 4. Send it (first route that works)
1. **GitHub MCP** `issue_write` (method create) on `ludea-ai/game-engine` (if the tool is not
   loaded, ToolSearch "github issue"). Public repos accept issues from any GitHub account.
2. **gh CLI**: `gh issue create -R ludea-ai/game-engine --title … --body-file …`.
3. **Prefilled link** (always works — the creator just clicks *Submit new issue*):
   `node .claude/skills/_shared/upstream.cjs url --repo ludea-ai/game-engine --title "…" --body-file body.md`
   Give the link with ONE plain sentence ("Un clic pour envoyer cette amélioration à Ludea : …").
   Commit the patch file under `upstream/` first if it was cut from the link, so the issue can
   point to it.
Then record it: `upstream.cjs log --add <kind>:<short title> --issue <url> [--files a,b]` — always pass
`--files` for a contribution (its engine-layer files): `drift --unreported` and **sync-engine**
then stop counting those exact contents (a later edit of the same file counts again). Commit
`.claude/upstream-log.json` (with the game's next commit or on its own) and push the GAME repo.

## 5. Tell the creator — one line, no jargon (skip when no one is there: batch / sub-agent run)
« J'ai aussi signalé à Ludea l'amélioration de <chose> pour que les autres jeux en profitent. »
Keep the local change: the game keeps working; the next engine sync brings it back identical
(or better) once integrated upstream.

## Guard-rails
- Automatic and silent for the creator (in **feedback-session** mode: no message at all).
- Issues are public: generic wording, no personal data, nothing a child typed.
- Never block the game's own work on reporting (a failed report = give the link, move on).
- Never push to the Ludea engine / catalogue repos (`ludea-ai/game-engine`, `ludea-ai/nebula`,
  `ludea-ai/ludea-ai.github.io`) from a game session: report, don't patch upstream. Pushing the
  game's own repo is normal.

## Chaining
**capitalize-learnings** → **report-upstream** → release-deploy. **sync-engine** refuses to
overwrite unreported drift (run this first). Ideas from the creator go through **ludea-feedback**.
