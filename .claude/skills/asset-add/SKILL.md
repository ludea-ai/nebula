---
name: asset-add
description: Integrate a chosen graphic asset (from asset-search) into a game built on this engine — download, crop/slice pixel-art (Pillow), register the texture in GAME.assets, and update attribution. Use once a sprite has been selected. Triggers: "add this asset/sprite", "integrate the chosen image", "import this decor/creature".
---

# asset-add

Integrate a chosen asset end-to-end (output of **asset-search**), or a generated one.

## Where files go
- `assets/img/` : single ready-to-use images (ground, buildings, trees, decor).
- `assets/sheet/` : spritesheets used at runtime (creatures, characters, fences).
- `assets/ui/` : menu thumbnails.
- Generation (preferred for original art): the game's **SVG art module**
  `tools/art/<game>.cjs` rendered by `.claude/skills/_shared/render-svg.cjs` (headless
  Chromium; gradients, glows, anti-aliasing) — add a function, re-render with `--only`.
- Slicing external files: **Pillow + numpy** (`pip install pillow numpy` if needed) — Bash.

## Procedure
1. **Get the source** (Bash `curl` to download, or generate procedurally with Pillow
   for an abstract/neutral asset).
2. **Crop / slice** with a small Python (Pillow) script:
   - Crop a single sprite → `assets/img/<name>.png`.
   - Or slice an animated sheet (known grids: characters **64×64** of a 9-col sheet,
     fences **32×32** legacy / 80×80 drawn at `fence.scale:0.5`; the demo creature sheets are
     **128×128**, 4 frames).
   - Keep transparency (RGBA), don't distort the style.
3. **Register the texture** in `game.config.js` → `GAME.assets`:
   - Single image: add to `GAME.assets.images` → `key: "assets/img/<file>.png"`.
   - Spritesheet: add to `GAME.assets.sheets` → `key: { path, frameWidth, frameHeight }`.
   - The engine loads everything in `GAME.assets` automatically via `av()` (cache-busting).
4. **Wire the game entry** (delegate to the specialised skill):
   - buyable decor → **add-decor-item** (`GAME.decor`)
   - creature variant → **add-creature-variant** (`GAME.creature.variants`)
   - character → **add-character** (`GAME.characters`)
   - fixed/obstacle element → place it + **add-collision** if needed.
5. **Update attribution**: add a line in `assets/CREDITS.md` naming the FILE(S) (path or
   `name_*.webp` pattern), the source URL, the author and the exact **licence** (CC0, public
   domain, CC BY or CC BY-SA only). Procedurally-generated assets are your own (note CC0).
   `publish-check.cjs` flags every image no credit line covers.
6. **Verify**: **test-debug** (the image loads, no error) then **map-verify** if visible.

## Guard-rails
- **License + attribution required** in `assets/CREDITS.md` (for third-party assets).
- Respect the game's art style.
- New images load via `GAME.assets` + `av()`. The `vN` bump happens at publish
  (**release-deploy** / `bump-version.mjs`).

## Chaining
asset-search → **asset-add** → (add-decor-item / add-creature-variant / add-character /
add-collision) → test-debug → map-verify → release-deploy.
