---
name: asset-search
description: Find new graphics (pixel-art sprites) for a game built on this engine from a natural-language description, then propose a short list of suitable, correctly-licensed candidates to choose from. Use to add a new decoration, creature variant, character, obstacle, etc. ALWAYS verifies each asset (content suitability for the game's audience + license) before proposing it. Triggers: "I want to add a …", "find me a sprite of …", "search a new decor/creature/element".
---

# asset-search

From a **description** ("a stone fountain", "a grey companion", "a white fence",
"a blossoming tree"), search for assets, **verify them**, and present a short list.

## Flow
1. **Understand the need**: reframe as keywords (object, colour, style). Stay within
   the **game's theme and art style** (see `GAME.meta` + `style.css` + the art module in
   `tools/art/`). Never drift off-theme: external pixel-art next to smooth vector art looks
   amateur — when nothing matches, **generate** the asset in the art module instead.
2. **Search** sources allowed by the network policy (test access with
   `curl -s -o /dev/null -w '%{http_code}' <url>` via Bash when unsure):
   - Good starting point: `opengameart.org` (LPC style), `cdn.jsdelivr.net`,
     `upload.wikimedia.org`. Use **WebSearch** / **WebFetch** to find pages + metadata.
3. **🔒 MANDATORY verification of each candidate BEFORE proposing it**
   (blocking — see `references/content-policy.md`):
   - **Actually look at the image** (download the preview and open it with **Read**)
     + read the source page (title, description, tags, author).
   - **Content suitability** for the game's declared audience (`GAME.meta.audience`
     if set). Reject anything unsuitable for that audience or off-theme. The stricter
     the audience (e.g. young children), the more conservative the bar.
   - **License — the accepted list, nothing else**: **CC0**, **public domain**, **CC BY**,
     **CC BY-SA** (any version). Refuse everything else, in particular **ND** (NoDerivatives:
     we crop, recolour and slice), **NC** (NonCommercial), GPL/OGA-BY variants you can't map to
     the list, "free for personal use", "all rights reserved", or no licence stated. Read the
     licence on the asset's own page: search filters lie (Openverse's
     `license_type=commercial` still returns **CC BY-ND**). Note author + exact licence + URL.
     `publish-check.cjs` re-reads every line of `assets/CREDITS.md` against this list.
   - **When in doubt → don't propose it.** One safe option beats three doubtful ones.
4. **Propose** via **AskUserQuestion** a list of 2-3 candidates (all verified), each
   with: short description, **preview** (already looked at), source/URL, author,
   **license**, sheet dimensions, fit-with-style note.
5. **Output**: the chosen asset (URL, license, author, dimensions, planned slicing) is
   handed to the **asset-add** skill.

## Guard-rails
- **Content suitability is blocking**: nothing unsuitable for the audience is ever shown.
- Keep the **art style** consistent with the game.
- Always keep **license + attribution** (for `assets/CREDITS.md`).
- Respect the network policy (don't hit blocked domains without checking).

## Chaining
→ **asset-add** (integration) → **map-verify** (if visible on the map) → **release-deploy**.
