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
- **A request already open for this game** (not yet published, or an update not yet accepted —
  open issues on `ludea-ai/ludea-ai.github.io` whose marker has `repo=<owner/repo>`) → never open a
  second one: post the new version as a **comment on that request**, with the SAME body as §3 (new
  marker with the new `commit`, all sections incl. Credit and Consent), first line « New version for
  review — replaces <previous commit> ». The catalogue agent reviews the new commit (and removes an
  `on-hold` label); the owner can only accept the latest reviewed version.

## 0b. Can this session reach Ludea? (ask before anything that needs it)
A session opened on a creator's game usually has GitHub access to **that repo only**: the MCP
tools answer "repository not configured for this session" for `ludea-ai/*`, and `gh` is often not
logged in. That is the normal case, not an error. Before the first step that needs Ludea's repos
(the catalogue lookup can use the public raw URL; the request itself and its de-duplication need
access), ask ONE plain question (AskUserQuestion), in their language:
« Je peux envoyer la demande moi-même (il me faut l'accès au dépôt Ludea) ou te donner un lien
déjà rempli. Que préfères-tu ? La demande sera publique. » (EN: "I can send the request myself
— I need access to the Ludea repository — or give you a ready-filled link. Which do you prefer?
The request will be public.")
- **Myself** → `add_repo` (`ludea-ai/ludea-ai.github.io`) if the tool exists, then the MCP route.
- **Link** → `upstream.cjs url …` (§3); de-duplicate by reading the public issues page instead.

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
  fix, re-run, commit + deploy (release-deploy). **Always bump the build number**
  (`bump-version.mjs`), even for a fix nobody sees (e.g. adding `meta.author`): the submitted
  commit then matches a build number the reviewer can check at the bottom of the home screen —
  put it in the request (§3). Ask only for what only they know: **the age range** and **a
  one- or two-sentence description** if `meta.description` is missing (AskUserQuestion, simple);
  write the answer in `meta.description` (+ its translation in `game.i18n.js`) so a later
  update reuses it instead of asking again.
- Child safety items (tracker, external link, form, camera…) → remove them; explain in one
  sentence that Ludea games for children can't contain them.
- Content items:
  - **first names** in the texts → ask ONE plain question (« Est-ce que Léa ou Hugo sont de vrais
    enfants ? ») and replace any real child's name with an invented one;
  - **the player's name** (`info.asksPlayerName: true`: the create screen asks « Your name », kept on
    the device only) → when the hero is a named character, suggest `meta.askPlayerName: false` so no
    child types a real first name; otherwise it is fine;
  - **well-known characters / brands** (Pikachu, Elsa, Minecraft…) → rename or redraw with the
    game's own characters;
  - **photo-format images** → check none is a personal photo (a child, a home, a school);
    replace it with drawn art otherwise;
  - **images with no credit line** → add the line (file, source, author, licence) or redraw the
    image in `tools/art`;
  - **licence not accepted** (only CC0, public domain, CC BY, CC BY-SA) → replace the asset.
- Engine-layer drift (`upstream.cjs context` → `driftUnreported`, which already leaves out
  files Ludea has) → a real local change: run **report-upstream** first (the reviewer will see it
  otherwise). Files listed only in `drift.behind` are just an older/newer copy of Ludea's engine
  (an engine update is available): fine to submit — offer **update** first if they like, and
  mention it in the readiness report.
- The game must be **live** (GitHub Pages) and the repo **public**. Its address is
  `upstream.cjs context` → `pagesUrl`: `https://<owner>.github.io/<repo>/` for a creator's own
  repo (only `ludea-ai/*` repos live at `https://ludea.ai/<repo>/`) — check it answers 200.
- **Author** (shown on the catalogue card as « par … » / "by …", linked to GitHub): fill it
  AUTOMATICALLY from the repo — `node .claude/skills/_shared/upstream.cjs author` (owner + human
  contributors, real names from their commits; bots and Claude left out). Write it in
  `game.config.js` as `meta.author: { name, github, url, contributors: [{ login, name }] }` and
  confirm with ONE simple question (« Sur la fiche, on affiche : par Jean-Louis Rigau (@jlrigau).
  C'est bon ? ») — they may prefer a pseudonym. Never a child's full real name.
  Commit + deploy it with the rest.
- **A child who made the game with them** (one plain question: « Un enfant a-t-il créé ce jeu avec
  toi ? Veux-tu qu'il soit crédité ? »). If yes:
  - the child is credited by a **first name or a nickname only** — never a surname, an age, a
    school, a town or a photo — in `meta.author.coAuthors: [{ name: "Léa" }]`;
  - optionally the credit sentence they like, in `meta.creditLine` (« Léa et son papa »; translated
    in `game.i18n.js`); default = the names joined;
  - **parental agreement** (required, one question): « Tu es son parent ou responsable légal, et
    vous êtes d'accord tous les deux pour que ce prénom ou ce pseudo apparaisse sur le jeu et sur
    ludea.ai ? Vous pourrez demander son retrait à tout moment. » No → no child credit (the game can
    still be published under the adult's credit).
  - Under 15 in France, the child's own agreement AND a parent's are both needed — that is why the
    question asks for both.

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
- **Commit submitted:** <sha> · **Build:** v<N> (bottom of the home screen)   (the review covers exactly this version)
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
### Credit
- **Shown as:** <meta.creditLine, or the names> · **Child co-author(s):** <first names / nicknames, or none>
### Consent
- [x] The creator (@<login>) allows Ludea to host, show and update a reviewed copy of this game on
  ludea.ai, credited to them, and may ask for its removal at any time. (Given on <date> in the
  creator's session.)
- [x] (only with a child co-author) The submitter is the child's parent or legal guardian; the child
  and the parent agree that the first name / nickname above is shown in the game and on ludea.ai,
  and may ask for its removal at any time. (Given on <date> in the creator's session.)
### Readiness report
<publish-check output (blockers: none), tour result, i18n --check, engine drift: none / reported in #…>
```
Route: GitHub MCP `issue_write` → `gh issue create -R ludea-ai/ludea-ai.github.io` → prefilled link
(`upstream.cjs url --repo ludea-ai/ludea-ai.github.io …`). Log it:
`upstream.cjs log --add publish:<sha> --issue <url>`, and commit `.claude/upstream-log.json`.
That commit comes **after** the submitted sha and is expected: it only touches the log (not the
game), so HEAD ≠ submitted commit is normal — the review uses the sha in the request.

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
