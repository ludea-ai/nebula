---
name: ludea-publish
description: The creator asks to publish their game in the Ludea catalogue (https://ludea.ai/). Checks the game is ready and safe for children (catalogue fields, age, description, French + English, icons, credits, no tracker / external link / data collection, no errors, engine changes reported), fixes what can be fixed with them, then files a publication request on ludea-ai/ludea-ai.github.io for the Ludea review. Triggers: "/ludea-publish", "publish my game on Ludea", "put my game in the catalogue", "submit my game", "je veux que mon jeu soit sur ludea.ai".
---

# ludea-publish (creator → Ludea catalogue)

The game stays in the creator's repo. Publishing asks Ludea to **review** it and, once
accepted, to **copy (fork) it into the `ludea-ai` organisation** — the catalogue serves that
reviewed copy at `https://ludea.ai/<game>/`, so nothing un-reviewed ever reaches children.
Later updates are re-submitted the same way and re-reviewed.

## 1. Readiness check (silent)
```bash
node .claude/skills/_shared/publish-check.cjs --shots /tmp/publish-shots   # exit 0 ready · 1 blocking · 2 warnings
node .claude/skills/_shared/upstream.cjs context
```
Plus the game's usual QA (they must be green before submitting):
`node .claude/skills/_shared/playtest.cjs --probe .claude/skills/_shared/probes/tour.cjs`
(pageErrors [], errors []), `i18n-extract.cjs --to <other lang> --check`, `separation-audit.cjs`.

## 2. Fix what is missing — with the creator, in plain words
- Blocking items you can fix yourself (missing tagline, untranslated texts, icon, credits) →
  fix, re-run, commit + deploy (release-deploy). Ask only for what only they know:
  **the age range** and **a one-sentence description** if missing (AskUserQuestion, simple).
- Child safety items (tracker, external link, form, camera…) → remove them; explain in one
  sentence that Ludea games for children can't contain them.
- Engine-layer drift → run **report-upstream** first (the reviewer will see it otherwise).
- The game must be **live** (GitHub Pages) and the repo **public**.

## 3. File the request (public issue on `ludea-ai/ludea-ai.github.io`)
Title: `[publish] <Game title> — <owner/repo>`. Body:
```
<!-- ludea-publish v1 repo=<owner/repo> commit=<HEAD sha> engine=<engine version> -->
### Game
- **Title:** … · **Repo:** https://github.com/<owner/repo> · **Live:** <pages url>
- **Commit submitted:** <sha>   (the review covers exactly this version)
- **Age:** <minAge>–<maxAge> · **Languages:** <fr + en> · **Content notes:** <audience.notes>
### Description (catalogue card)
- **EN:** <one or two sentences> 
- **FR:** <une ou deux phrases>
- **Modes / tags:** <care, riding, race, treasure hunt…>
### Creator
- GitHub: @<login> — credit wanted on the card: <name/pseudonym or "GitHub login">
### Readiness report
<publish-check output (blockers: none), tour result, i18n --check, engine drift: none / reported in #…>
```
Route: GitHub MCP `issue_write` → `gh issue create -R ludea-ai/ludea-ai.github.io` → prefilled link
(`upstream.cjs url --repo ludea-ai/ludea-ai.github.io …`). Log it:
`upstream.cjs log --add publish:<sha> --issue <url>`.

## 4. Tell the creator — plain words
« Ta demande est envoyée (lien). L'équipe Ludea va vérifier ton jeu — surtout qu'il est bien
adapté aux enfants — puis il apparaîtra sur ludea.ai. Tu seras prévenu sur cette page. »
Explain they can keep improving their game; a new version means a new `/ludea-publish`.

## Guard-rails
- Never submit with a blocking item left, or with a game that is not live.
- The credit on the card uses what the creator chose — never a child's real name.
- Never push to `ludea-ai/*` from here: the request is an issue; Ludea does the copy.

## Chaining
**test-debug / visual-review** (green) → **report-upstream** (no unreported drift) →
**ludea-publish**. On the Ludea side: the catalogue's **review-submission** skill.
