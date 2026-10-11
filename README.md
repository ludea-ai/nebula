# Nebula Nursery

Look after the little glowing critters! A keeper robot tends alien critters on a space
station — and this game is the **showcase of the Ludea engine**: it switches on (nearly)
every system the engine has.

▶ **[Play Nebula Nursery](https://ludea.ai/nebula/)** · for all ages (6+), in English and French
(flag switch on the home screen).

What it shows: care actions and a close-up "polish" scene (scrub the cosmic dust off a
critter's face), colour variants and happy faces, growth and eggs, riding with jumps in the
Gravity Park and on the Star Ring road, a shop with placeable decorations, the Glow Salon
menu, a wormhole that brings new critters, pick-up → drop-off deliveries chased by drones,
rare critters with stats from the Hatchery, and a pseudo-3D race against five rivals —
all described in `game.config.js`, with no game code.

---

## Make your own game

Nebula is built on a reusable engine. To make **your** game, start from the template
**[ludea-ai/game-engine](https://github.com/ludea-ai/game-engine)** (**Use this template**,
then run `/new-game` in Claude Code) — it gives you the engine plus a small starter game to
grow. Read Nebula's `game.config.js` when you want to see how a feature is wired; the full
field-by-field schema is in **[ENGINE.md](ENGINE.md)**.

More games made with the engine: **[ludea.ai](https://ludea.ai/)**.

---

## How this repo is organised

```
index.html · style.css · game.config.js · game.i18n.js   the game (shell, theme, config, French texts)
engine.js · engine.css · ENGINE.md · vendor/              the engine layer (identical in every Ludea repo)
assets/ (img · sheet · ui · CREDITS.md)                   generated art (CC0)
tools/art/nebula.cjs                                      ALL the art, as parametric SVG → PNG/WebP
.claude/skills/ (+ _shared/ tooling)                      Claude Code skills, probes, art tooling
.github/workflows/deploy.yml                              GitHub Pages deploy on every push to main
```

Engine work is developed and tested here first (Nebula exercises every system), then copied
into the template and the other games with the **sync-engine** skill.

## Run & test locally

```bash
bash .claude/skills/_shared/serve.sh 8099    # open http://localhost:8099/
OUT=/tmp/shots node .claude/skills/_shared/playtest.cjs --port 8099 --viewport 390x844 \
    --probe .claude/skills/_shared/probes/tour.cjs
```

Re-render the art after editing `tools/art/nebula.cjs`:
`node .claude/skills/_shared/render-svg.cjs tools/art/nebula.cjs [--only key]`.

## Credits

All textures and icons are generated (CC0) and specific to Nebula's universe. Phaser 3 is
MIT; Fredoka is OFL. See [`assets/CREDITS.md`](assets/CREDITS.md).
