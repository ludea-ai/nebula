# Ludea engine — release notes

What each engine version brings to a game, in plain words (newest first). Written by
Ludea's engine agent (procedure in `ludea-ai/agents`) for every batch it merges; shown to creators by `update-check.cjs` (at the
start of a session) and by **update** (which also suggests which new capabilities fit
their game). Two lists per version:
- `### New — you can switch it on`: capabilities a game must opt into in its config. One line each:
  **what it lets you do** — `config key` — the kind of game it suits.
- `### Better — automatic`: fixes and improvements every game gets just by updating.

## 2026-10-19.5
### Better — automatic
- **Safer tools**: the tools that read your game's settings (translations, link preview, systems map,
  game info) now read them inside a locked-down browser, like the publication check — a file can never
  act on the computer running them.

## 2026-10-19.4
### New — you can switch it on
- **Credit the child who made the game with you** (a first name or a nickname only, with your agreement
  and theirs) — `meta.author.coAuthors: [{ name }]`, `meta.creditLine` — asked by /publish.
### Better — automatic
- **« Made with Ludea » and a legal notice at the bottom of the home screen** (and of the help), on
  every game: the notice is written for you from `meta.author` (you are the publisher of your own
  site; host GitHub; nothing collected); Ludea's catalogue copies show Ludea's pages, with Contact.
- **Safer reviews**: a game sent for review is never run outside a locked-down browser; updates of a
  game never run the game's own scripts; alarms on suspicious engine changes.
- **A new version on a request still waiting** is reviewed again — only the latest reviewed version
  can be published.
- The engine's own texts come translated: `i18n-extract` fills them in for you.

## 2026-10-19.3
### New — you can switch it on
- **A nice card when someone shares your game's link** (its picture, its name and its one-line
  description in iMessage, WhatsApp, Slack…) — `node .claude/skills/_shared/share-preview.cjs`
  (release-deploy now runs it at every release) — every game.
### Better — automatic
- **Updating cleans up**: the engine files Ludea removed or renamed are removed from your game too
  (no more two commands for the same thing after a rename).
- **/publish checks more, for children's safety**: first names that could be a real child's, famous
  characters or brands, photos, and every image must have a credit line with an accepted licence
  (CC0, public domain, CC BY, CC BY-SA — never "no derivatives" or "non-commercial").
- **A quick check of the game after an update** (a few seconds: it loads, the world moves, a tap
  works, the help opens) — `probes/smoke.cjs`.

## 2026-10-19.2
### New — you can switch it on
- **Legal links at the bottom of the help screen** (legal notice, privacy), small and out of the way of young players — `meta.legalLinks: [{ label, url }]` — every game published on a website (Ludea's catalogue copies get Ludea's links).
- **A short description of the game for the Ludea catalogue card**, written once and reused by every update — `meta.description` — any game you publish on ludea.ai.
### Better — automatic
- Web addresses and the author's name are no longer treated as texts to translate.
- No more false « engine changes not reported » warnings: files that Ludea already has, or that are just an older/newer copy of Ludea's engine, are no longer counted (they show as « update available »).
- `/publish`, `/idea` and engine reports ask you first whether to send the request themselves or give you a ready-filled link, and `/publish` gives the right web address and build number.
- You are told when a newer engine exists (what it brings), and when your catalogue version is behind your game; `/update`, `/publish` (first publication or update), `/idea`.

## 2026-10-18.9
### New — you can switch it on
- **Each mission offer can have its own rules** (one trip or a round trip, its own target, messages and counter — e.g. a small and a big treasure) — `missions.offers[].pickups / dests / target / messages / stat` — games with deliveries or treasure hunts.
- **A gentle chase**: when caught, the player only pays a small fine and keeps the mission — `chase.caughtKeepsMission` (also per offer) — games for young kids with a pursuer.
### Better — automatic
- The guide's off-screen arrow no longer covers the buttons at the top of the screen.
- Saved games stay valid when mission offers are reordered (offers are saved by `id`).
- Creating a game now confirms the hero (species + name) before drawing it, and turns the website on before the first upload.
- More reliable automatic tests (race, chase on Safari, guide arrow in small worlds).
- Ludea loop: engine problems and improvements are reported to Ludea automatically; `/idea`, `/publish`.
