# Ludea engine — release notes

What each engine version brings to a game, in plain words (newest first). Written by
**triage-upstream** for every batch it merges; shown to creators by `update-check.cjs` (at the
start of a session) and by **ludea-update** (which also suggests which new capabilities fit
their game). Two lists per version:
- `### New — you can switch it on`: capabilities a game must opt into in its config. One line each:
  **what it lets you do** — `config key` — the kind of game it suits.
- `### Better — automatic`: fixes and improvements every game gets just by updating.

## 2026-10-18.9
### New — you can switch it on
- **Each mission offer can have its own rules** (one trip or a round trip, its own target, messages and counter — e.g. a small and a big treasure) — `missions.offers[].pickups / dests / target / messages / stat` — games with deliveries or treasure hunts.
- **A gentle chase**: when caught, the player only pays a small fine and keeps the mission — `chase.caughtKeepsMission` (also per offer) — games for young kids with a pursuer.
### Better — automatic
- The guide's off-screen arrow no longer covers the buttons at the top of the screen.
- Saved games stay valid when mission offers are reordered (offers are saved by `id`).
- Creating a game now confirms the hero (species + name) before drawing it, and turns the website on before the first upload.
- More reliable automatic tests (race, chase on Safari, guide arrow in small worlds).
- Ludea loop: engine problems and improvements are reported to Ludea automatically; `/ludea-feedback`, `/ludea-publish`.
