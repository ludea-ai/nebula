---
name: publish
description: The creator asks to publish their game in the Ludea catalogue (https://ludea.ai/) — or to send an UPDATE of a game already published there. Checks the game is ready and safe for children (catalogue fields, age, description, French + English, icons, credits, no tracker / external link / data collection, no errors, engine changes reported), fixes what can be fixed with them, then files a publication request on ludea-ai/ludea-ai.github.io for the Ludea review. Triggers: "/publish", "publish my game on Ludea", "update my game in the catalogue", "envoie la mise à jour sur ludea.ai", "put my game in the catalogue", "submit my game", "je veux que mon jeu soit sur ludea.ai".
---

# publish (creator → Ludea catalogue: first publication OR update)

The game stays in the creator's repo. Publishing asks Ludea to **review** it and, once
accepted, to **copy (fork) it into the `ludea-ai` organisation** — the catalogue serves that
reviewed copy at `https://ludea.ai/<game>/`, so nothing un-reviewed ever reaches children.
Later updates are re-submitted the same way and re-reviewed.

## 0. First publication or update?
Look the game up in the catalogue registry
(`https://raw.githubusercontent.com/ludea-ai/ludea-ai.github.io/main/catalogue.json`, entry whose
`source` = this repo). `update-check.cjs` also says it at session start (« published version is behind »).
- **Not there → first publication** (all steps below).
- **There → update**: same steps, plus: list what changed **for the players** since the published
  version (`git log <reviewedCommit>..HEAD -- game.config.js game.i18n.js index.html style.css
  manifest.webmanifest assets tools`, rewritten in plain words: new things, changed things, fixes);
  new screenshots if something visible changed; updated catalogue description only if the game
  gained a mode. Nothing changed for players → say so and don't send.
- A request already open for this game → don't open a second one: comment on it with the new
  commit (the review restarts on that commit).

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
- **Author** (shown on the catalogue card as « par … » / "by …", linked to GitHub): fill it
  AUTOMATICALLY from the repo — `node .claude/skills/_shared/upstream.cjs author` (owner + human
  contributors, real names from their commits; bots and Claude left out). Write it in
  `game.config.js` as `meta.author: { name, github, url, contributors: [{ login, name }] }` and
  confirm with ONE simple question (« Sur la fiche, on affiche : par Jean-Louis Rigau (@jlrigau).
  C'est bon ? ») — they may prefer a pseudonym. Never a child's full real name.
  Commit + deploy it with the rest.

## 2b. The creator's consent (required — ask it every time, in their language)
One simple question (AskUserQuestion), word for word in substance:
« Pour que ton jeu soit sur ludea.ai, tu autorises Ludea à héberger, montrer et mettre à jour une
copie relue de ton jeu, avec ton nom, et tu peux demander son retrait à tout moment. Ton dépôt reste
le tien. D'accord ? » (EN: "To be on ludea.ai, you allow Ludea to host, show and update a reviewed
copy of your game, credited to you, and you can ask for its removal at any time. Your repository
stays yours. OK?"). No → stop, nothing is sent. The person must be the game's creator (or a
co-author); a child's game is submitted by the adult who manages it.

## 3. File the request (public issue on `ludea-ai/ludea-ai.github.io`)
Write it in **English** (all Ludea issues are), except the catalogue description, which is given
in both English and French (the catalogue is bilingual).
Title: `[publish] <Game title> — <owner/repo>` (first publication) or
`[update] <Game title> — <owner/repo>` (update). Body:
```
<!-- publish v1 kind=<publish|update> repo=<owner/repo> commit=<HEAD sha> previous=<reviewedCommit or none> engine=<engine version> -->
### Game
- **Title:** … · **Repo:** https://github.com/<owner/repo> · **Live:** <pages url>
- **Commit submitted:** <sha>   (the review covers exactly this version)
- **Age:** <minAge>–<maxAge> · **Languages:** <fr + en> · **Content notes:** <audience.notes>
### Description (catalogue card)
- **EN:** <one or two sentences> 
- **FR:** <une ou deux phrases>
- **Modes / tags:** <care, riding, race, treasure hunt…>
### Author
- **Credited as:** <meta.author.name> · **GitHub:** @<meta.author.github> · **Link:** <meta.author.url or none>
- **Contributors:** @<login> (<name>), … — linked on the card as open-source contributors
- The original repo stays theirs; Ludea serves a reviewed copy and credits them on the card.
### What changed for players (update only)
<plain-words list since the published version + screenshots if visible>
### Consent
- [x] The creator (@<login>) allows Ludea to host, show and update a reviewed copy of this game on
  ludea.ai, credited to them, and may ask for its removal at any time. (Given on <date> in the
  creator's session.)
### Readiness report
<publish-check output (blockers: none), tour result, i18n --check, engine drift: none / reported in #…>
```
Route: GitHub MCP `issue_write` → `gh issue create -R ludea-ai/ludea-ai.github.io` → prefilled link
(`upstream.cjs url --repo ludea-ai/ludea-ai.github.io …`). Log it:
`upstream.cjs log --add publish:<sha> --issue <url>`.

## 4. Tell the creator — plain words
« Ta demande est envoyée (lien). L'équipe Ludea va vérifier ton jeu — surtout qu'il est bien
adapté aux enfants — puis il apparaîtra sur ludea.ai. Tu seras prévenu sur cette page. »
Explain they can keep improving their game; a new version means a new `/publish`.
Talk to the creator in THEIR language (the one they write in).

## Guard-rails
- Never submit with a blocking item left, or with a game that is not live.
- The credit on the card uses what the creator chose — never a child's real name.
- Never push to `ludea-ai/*` from here: the request is an issue; Ludea does the copy.

## Chaining
**test-debug / visual-review** (green) → **report-upstream** (no unreported drift) →
**publish**. On the Ludea side: the catalogue's **review-submission** skill.
