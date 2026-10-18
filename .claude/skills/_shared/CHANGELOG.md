# Ludea engine — what's new

Plain-words notes per engine version (newest first). Written by **triage-upstream** for every
batch it merges; read by `update-check.cjs` to tell creators what a new version brings.
One line per change, written for a game creator (what they can now do / what got fixed).

## 2026-10-18.9
- Missions: each offer can have its own rules (one leg or round trip, its own messages, target,
  extra counter); offers are saved by `id`, so reordering them keeps saved games valid.
- Chase: `caughtKeepsMission` — when caught, the player only pays the fine and keeps the mission
  (gentler for young kids); can be set per offer.
- The guide's off-screen arrow no longer covers the HUD buttons.
- new-game confirms the hero (species + name) before drawing it (voice dictation mishears),
  turns GitHub Pages on before the first push, and checks its hand-back list.
- More reliable tests (race overtake, chase on Safari, guide arrow in small worlds); `playtest.cjs --help`.
- Ludea loop: report-upstream, /ludea-feedback, /ludea-publish; the author of a game is filled
  from its GitHub data.
