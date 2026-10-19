# Engine reference — `GAME` config schema

The engine (`engine.js`) is **data-driven** and contains no game content. A game is a
single global object `window.GAME` defined in `game.config.js`, plus its assets. This
file documents every field and the engine capabilities they drive. The showcase game
**Nebula Nursery** (its own repo: https://github.com/ludea-ai/nebula) turns on nearly every
system below, so its `game.config.js` is the working example of how each one is wired. Every
system is optional — a new game starts small from
`.claude/skills/new-game/references/minimal-seed.config.js` (the template's starter game) and
adds systems as it iterates.

> Load order in `index.html`: `engine.css` → `style.css` (theme) → `vendor/phaser.min.js` →
> `game.config.js` → `engine.js`.

## Files of the generic layer
- `engine.js` — all systems. `engine.css` — the shell's **structure** (layout, HUD, panel,
  modal, close-up, animations), shared verbatim by every game. `style.css` — the game's
  **theme only**: CSS variables (`--primary`, `--accent`, `--panel`, `--text`, `--chip-bg`,
  `--home-bg`, `--night`, `--closeup-bg`, `--glow`, `--game-font`…) plus a few decorative
  rules. `vendor/fonts/` — a vendored web font (Fredoka, OFL) referenced by the theme.
- Art pipeline: `.claude/skills/_shared/render-svg.cjs` renders a game's art module
  (`tools/art/<game>.cjs`, SVG strings built with `svg-kit.cjs`) to PNG with headless
  Chromium. Smooth, anti-aliased, HiDPI-ready sprites; one source of truth per character.

## Capabilities (all optional, config-gated)
- Top-down tiled world, smooth camera follow, adaptive zoom, **HiDPI canvas** (crisp on
  phones), pixel-art OR smooth hi-res rendering, soft shadows, ambient particles, vignette.
- Player avatar: 4-direction LPC walkcycle (any frame size), **tap-to-move with A\*
  pathfinding around obstacles**, tap ripple, keyboard (WASD/ZQSD), run on double-tap,
  idle breathing. Multiple selectable characters + create/change-look screen.
- Creatures: autonomous wandering NPCs (reachable targets only, no stacking, bouncy
  hop-walk, idle breathing, a "hello" hop when approached) with **needs**, mood heart, **actions**
  (effects/costs/rewards/animations), **variants** (tint or dedicated sheet),
  **customization** (rename + restyle), **aging/growth**, **breeding**, a **mount**
  system (ride + fatigue) and **hop/jump** over obstacles.
- Buildings (**stations**): "next day" rest, shop, or custom handlers.
- Economy + **shop**: coins, buyable resources, capacity upgrades, buy creatures,
  buyable **decorations** placed via a ghost-follow system.
- **Collisions** (AABB, with a `jumpable` flag).
- **Environment**: fenced **arena** with obstacles + a **trail loop** of sand paths in
  a forest band, scattered by a single declarative rule (no bare edges/corners).
- **Day/night** cycle with rest-gating; **objectives/levels** gamification.
- **Vehicles & city systems** (all optional): directional top-down sheets for creatures
  (`dirSheet`), hidden or **seated riders** (`ride.hideRider`, `character.rideSheet`), per-creature
  mount stats (`speedMul`/`grip`/`drainMul`), **station menus** (`action:"menu"`, incl. paid
  **restyle**), **missions** (go-to-destination jobs), a **chase** (heat level + pursuers),
  **models** (buy creatures with stats) and a pseudo-3D **race** mini-game.
- **Legacy save migration** (`meta.legacySave`) so a game rebuilt on the engine keeps its players' progress.
- **Juice**: toast queue, rewards that fly to the HUD, confetti, cinematic zoom into the
  close-up, particle bursts, squash & stretch.
- **Sound**: procedural WebAudio SFX + generative background music (no audio files), mute
  button, iOS unlock on first touch.
- **Guide arrow** (kids): after a few idle seconds, a bouncing arrow points at who needs
  you (with an edge pointer when off-screen). **Unlocks**: progress milestones add scenery.
- **Save** to localStorage with backward-compatible loading; **PWA/iOS** support.

## Top-level shape
```js
window.GAME = {
  meta, render, audio, guide, world, camera, assets, fence,
  player, characters,
  creature,            // the creature system (optional)
  zones, stations,
  economy, shop, decor,
  environment,         // arena + trail loop (optional)
  missions, chase, models, race,   // city / vehicle systems (optional)
  scenery,             // [[x,y,sprite,scale], ...] or [{x,y,sprite,…}, ...]
  unlocks,             // milestones that add scenery (optional)
  objectives, help,
};
```

### `meta`
Identity, theming and **all UI strings** (every label has an engine fallback, so you
can override only what you want). Texts are in `meta.lang`; translations: see **Languages**.
```
lang: "en" | "fr" | …,                // source language of every text in this config
title, titleIcon, logo ("assets/img/logo.png" — big home-screen image), shortName, tagline, saveKey, assetVersion: "vN",
description,                          // optional: 1–2 sentences for the Ludea catalogue card (source language; translated in game.i18n.js like any text); not shown in-game
legacySave: { key: "old-key" | ["k1","k2"], migrate: (old) => stateLike },   // see below
audience: { minAge, notes },          // used by the asset skills' content policy
author: { name, github, url, contributors: [{ login, name }] }, // credit in the Ludea catalogue (publish, filled from `upstream.cjs author`); not shown in-game
legalLinks: [{ label, url }],      // optional: small links at the bottom of the help screen (legal notice, privacy) — https or same-site URLs only
theme: { home, play, closeup },        // iOS theme-color per screen
showCoins,                             // false → hide the coins HUD (no economy)
showDay, showCreatureCount,            // false → hide the day / creature-count HUD chips (minimal HUD)
showCapacity,                          // creature count: show "n/cap" vs bare "n". Default auto: "/cap" only when group size can change (breeding / spawn station / capacity shop)
coinIcon, namePrompt:{label,placeholder}, startName, namePromptYou, avatarPrompt,
createTitle, createOkLabel, startLabel, continueLabel, continueHint, helpTitle,
ageUnit, and, nightMessage, restBlockedHint, neglectMessage, morningMessage,
notEnough, idleHint, placeHint, placeHere, cancel, boughtDecorMessage, placedMessage, blocksPath,
refundMessage, noOnBuilding, noInHome, nameLabel, confirm, nameTaken, closeLabel
```
Strings with `{name}`, `{day}`, `{names}`, `{item}` are interpolated by the engine, and
`{i:key}` tokens become icons (see Icons). User-typed names are HTML-escaped.

**`meta.legacySave`** — when there is no save under `saveKey` yet, the first legacy key found
is parsed and passed to `migrate(old)`, whose result is stored under `saveKey` (the legacy key
is never touched). Return the engine's state shape (`placeName, player:{avatar,name}, coins,
resources, day, capacity, creatures:[{id,name,variant,age,<need ids>,x,y}], decors:[{id,x,y}],
stats, goalsDone, level, idCounter…`); any missing field gets its default on load. Write it as
an arrow function inside `meta` (the separation audit rejects top-level functions in the config).

`meta.strings` overrides any **engine** UI label (each has an English fallback):
`dismountFirst, placeFirst, closeLabel, soundLabel, coinsLabel, dayLabel, levelLabel, noSave, refreshLabel,
goalComplete ("{name}"), goalsComplete ("{n}"), levelUp ("{n}"), goalsTitle, noGoals,
allGoalsDone, goalsProgress ("{done}/{total}…{next}"), topLevel`. (For back-compat a key
set directly on `meta` also works.)

### Icons (`GAME.icons`) — no emoji in the UI
```
icons: { star: "assets/ui/icons/star.png", sound: "…", help: "…", …, critter: "…" }
```
Every UI spot shows an **illustrated icon** by key: HUD chips (`meta.coinIcon`, `calendar`,
`creature.icon`, `trophy`), the round HUD buttons (`goals`, `avatar`, `sound`/`soundOff`,
`help`), `close`, the home/create buttons (`meta.startIcon` def. `play`, `continueIcon` def.
`resume`, `createOkIcon` def. `check`), action buttons (`action.icon`), needs (`need.icon`),
mood (`heart`/`heartEmpty`, or `creature.moodFaces` keys), stations (`station.icon`), the
idle hint (`meta.idleIcon` def. `hand`), the close-up (`hand` hint, `star` progress,
`popParticles` / `finishParticles` keys), the guide edge (`arrow`), rewards (`coinIcon`).
**Any config text** (messages, labels, help, titles) can embed an icon with a `{i:key}`
token: `message: "{i:sparkle} {name} is clean!"`. Unknown keys fall back to a built-in
monochrome SVG glyph (close, check, play, help, sound…), then to the raw text (legacy emoji
configs keep working). Generate a themed set with `_shared/icon-kit.cjs`.

### Home & panel look (config side)
- `meta.splash`: full-screen illustration behind the home and create screens (portrait,
  ~900×1600; keep the subject between the logo and the bottom sheet). `meta.logo` above it.
- Action buttons: round glossy buttons coloured by `action.color`; the `closeup` action
  gets a glowing ring; a creature with a single action / a station shows one big pill.
- The panel shows a **portrait** (`variant.thumb`, or the station sprite), the name, a
  subtitle (age, or `station.hint`), mood hearts (`creature.showMood:false` hides them),
  need gauges with their icons (`creature.showBars:false` hides them), then the actions.
- Theme variables (style.css): `--panel --panel2 --panel-edge --sheet-bg --sheet-fade
  --text --muted --title --title-fill --title-stroke --primary(-d) --accent(-d) --ribbon(-d)
  --chip-bg --chip-text --chip-edge --good --warn --bad --input-bg --border --overlay
  --night --closeup-bg --home-bg --shadow --glow --game-font`.
- Names of the player and creatures are drawn on a top layer (never hidden by furniture).

### `render` (look & feel)
```
render: {
  pixelArt: false,          // true (default, legacy) = nearest-neighbour pixel art; false = smooth hi-res art
  maxDpr: 3,                // HiDPI cap (canvas has DPR x CSS pixels); 3 = crisp on iPhones
  vignette: 0.3,            // 0..1 dark edge around the world view
  selectColor, tapColor,    // selection ring / tap ripple colours (tapMarker:false hides the ripple)
  text: { color, stroke, strokeThickness, weight },     // in-world labels (names…)
  label: { bg, color, border, alpha, size },            // zone/station signs: a pill when bg is set
  ambient: { particle:"soft"|"dot"|"star"|"spark"…, colors, count, speed,
             drift:"up"|"down"|"float", alpha:[min,max], scale:[min,max], blend:"add" },
  shadowAlpha, breathe:false, cameraLerp: 0.12, closeupZoom:false, confetti:[hex…], font,
}
```
In-world text uses the theme font (`--game-font`) rendered at device resolution.

### `audio` (procedural — no files)
```
audio: {
  volume: 0.6,
  sfx: { spawn:false, pop:{ notes:[72,76,79], type:"sine", gap:0.08, dur:0.2 }, … },  // disable / replace a sound
  music: { tempo, root (MIDI), scale:"majorPenta"|"minorPenta"|"major"|"dorian",
           progression:[semitones…], pad, lead (oscillator types), density, volume } | false,
}
```
Built-in sounds: `tap click select action pop scrub celebrate reward spawn night morning
goal open whoosh error unlock`. A station may pick its sound with `sfx`, an action too.
Omit `audio` entirely for a silent game (the sound button hides itself).

### `guide` (where to go next — great for young kids)
```
guide: { idle: 4, color, scale, moodBelow: 60, rest: false, station: true }
```
After `idle` seconds without input, an arrow bobs over the nearest creature that "wants"
something (wantBubble eligibility, else mood < `moodBelow`); with nobody around it points
at the `spawn` station (or the rest station when `rest:true`). Off-screen → an edge pointer.

### `world` / `camera`
```
world: { width, height, groundTile, groundScale?, bg, patches:[{x,y,w,h,tile,ox,oy,tileScale}],
         backdrop?:{ sprite, x, y, w, h } }   // a single painted floor image under everything
camera: { fitW, fitH, min, max, clampToWorld? }  // zoom = clamp(min(w/fitW,h/fitH), min, max)
                                       // clampToWorld: never show past the world edges (a closed room)
nav: { cell: 20 }                      // optional: pathfinding grid size (world px)
```

### `assets` / `fence`
**Resolution (no blur):** render every image at the size it is DISPLAYED on a phone (DPR
3). Sprites drawn at N× their logical size declare `res: N`; the engine loads them
full-size and shows them at the logical size (frame sizes stay LOGICAL in the config):
```
images: { chair: { path: "assets/img/chair.webp", res: 2 }, floor: "assets/img/floor.webp" }
sheets: { hero: { path: "assets/sheet/hero.webp", frameWidth: 128, frameHeight: 128, res: 2 } }
```
Close-up backdrops with `res` keep `spots.size` in logical pixels. Menu thumbnails
(character `thumb` — a path, e.g. `assets/ui/hero_thumb.webp`), icons, logo and splash are
DOM images: just render them big enough (thumbs ×6, icons ×2, backdrops ×2). Prefer
**WebP** (`render-svg` type "webp": 3–15× smaller than PNG, alpha, Safari ≥ 14); keep the
PWA icons (`favicon.png`, `apple-touch-icon.png`) in PNG.

```
assets.images: { key: "assets/img/x.png", ... }       // single images
assets.sheets: { key: { path, frameWidth, frameHeight }, ... }   // spritesheets
fence: { sheet, frames:{ post, side, cornerTL, cornerTR }, step: 32, scale: 1 }  // tiles every `step` px
```
Everything in `assets` is preloaded automatically (with cache-busting via `av()`).

### `player` / `characters`
```
player: { scale, speed:{walk,run,rideWalk,rideRun}, spawn:{x,y}, nameY, shadow:{w,h},
          frameRate, originY, showName }  // nameY = y offset of the name label above the head (default -80)
characters: [ { id, name, sheet, thumb, rideSheet?, raceRider?, raceHead? } ]   // sheet = LPC walkcycle (9 cols × 4 rows: up,left,down,right;
                                             // col 0 = idle) at any frame size; thumb in assets/ui/
                                             // rideSheet = ONE frame, the character SEATED (side view facing
                                             // left; flipped for right) shown while riding (ride.sitY places it)
                                             // raceRider = image key: this rider SEEN FROM BEHIND, drawn over the
                                             // mount's race rear view (same frame size) — see `race`
```

### `creature` (optional system)
```
label, icon, sheet, origin:{x,y}, moodIcon,  // moodIcon = particle shape of the floating mood indicator (default "heart")
walk: { start, end, frameRate, speed:40, hop:0, hopPeriod:300, squash:0.08, idleFrame? },  // hop>0 → bouncy hop-walk (px)
                                       // idleFrame: frame shown while standing still (omit → walks in place)
dirSheet: true | { cols },             // sheet has 4 rows up/left/down/right (top-down vehicles) instead of
                                       // one side-view strip flipped left/right; cols = frames per row
wander: false, hello: false,           // stay put (parked cars) / no "hello" hop when approached
headY,                                 // px from feet to head top at scale 1 (default: derived from frame size)
shadow:{w,h}, spacing:46, breathe:0.025, nameY, nameSize, showName, showMood, moodScale,
moodColors:[low,mid,high], moodFaces:["sad","meh","smile","joy"],   // icon keys: a face in the panel by mood (default: 4 hearts)
happySheet, happyAt:100,               // swap to a "happy" sheet once the mood need reaches happyAt
tapAction: "<action id>",              // tapping a creature walks to it AND starts this action (kids: one tap)
arrive: { speed, from:{x,y} },         // creatures brought by a spawn station walk in from a door
youngLabel, adultLabel, variantLabel, customizeTitle, customizedMessage,
moodNeed: "joy",                       // the need that drives celebration & day-mood
moodFrom: ["food","energy","clean","joy"],   // needs averaged into the mood heart
showBars: true,                        // false → hide the per-need bars in the panel (kid-friendly)
moodDay: { base, lowPenalty, lowAt, highBonus, highAt },   // overnight mood rule
needs: [ { id, icon, label, start, perDay } ],      // perDay = overnight delta (0..100 bars)
variants: [ { id, name, color, tint?, sheet?, happySheet?, closeupBg?, closeupBgDone?, closeupBgWide?, closeupBgWideDone?, thumb?, fixedName?, raceSprite? } ],
   // sheet = a dedicated, animated spritesheet for this variant (else base sheet + optional tint);
   // raceSprite = this variant's own rear-view image in the race (else race.sprite tinted by `tint`);
   // thumb = image path shown in the customize preview; fixedName = the variant IS a person
   // (new creatures of this variant take its name; new spawns prefer variants not on screen)
actions: [ {
  id, label, icon,
  cost:{resource,amount}?, require:{need:min}?, effects:{need:+/-}?, reward?,
  anim?, stat?, message?, celebrateMessage?,
  type: "ride"|"jump"|"customize"|"closeup"?,   // special actions (omit for a normal care action)
  sfx?: "<sound name>",                          // sound played (default "action")
} ],
wantBubble: { sprite, need?, below?, withMood?, scale?, lift? },  // see below — "needs action" image bubble (replaces, or with withMood sits beside, the mood shape)
allHappy: { mood, message, celebrate? },   // day-arc reward: rest with EVERYONE happy → synchronized celebration + special morning line
customize: { rename, variant },
ride: { adultsOnly, minEnergy, fatigueNeed, empty?:"slow", emptySpeed:0.25, emptyMessage, sitY, sitX?, nameY, onMount:{...}, *Message, hideRider?,
        jump:{ distance, cost, minEnergy, tooTired, reward?, rewardMessage?("{r}") } },
   // empty:"slow": when the fatigue need hits 0 you stay on board and the ride crawls at emptySpeed
   // (also during a race, which burns the need at race.drain/s, default 2.4) — e.g. a car out of fuel.
   // sitX: px the seated rider is moved towards the tail (side-view mounts).
   // hideRider: the player disappears while riding (a driver inside a car). The jump leaps the way the
   // player faces (4 ways with dirSheet). Per-creature fields speedMul (ride speed), drainMul (fatigue
   // rate) and grip (race steering) — set by `models`, or in startCreatures — scale the ride.
celebrate: { mode:"hop"|"rear", adultsOnly, actions?:[ids], message, particle, colors:[hex], count },
   // actions: only these action ids can trigger it (e.g. the rear of joy only when playing)
```

### Theme-driven animations (`action.anim`)
The engine owns the animation **system**; the theme picks the **look** per action.
`anim` is either a legacy preset string (`"eat"`, `"cheer"`, `"sparkle"`) or an object:
```
anim: {
  motion: "nod" | "hop" | "bounce" | "wiggle" | "none",   // body movement (squash & stretch)
  particle: "star" | "heart" | "spark" | "bubble" | "diamond" | "dot" | "soft",  // built-in shapes
  colors: ["#fff2a8", "#ffd24a", ...],          // tints cycled across particles
  count, fall, spread, y0, riseMin, riseMax, scaleMin, scaleMax,        // all optional
}
```
Particle textures are generated procedurally (white, then tinted), so no assets are
needed. Example: `{ motion:"hop", particle:"star", colors:["#fff2a8","#a8e6ff"], count:7 }`
emits a burst of stars. `celebrate` (mood-maxed) and `moodIcon` use the same shapes.
```
aging: { adultAge, scaleBaby, scaleAdult },
breeding: { enabled, minMood, cooldown, message },
names: [...], startCount, startCreatures:[{name,variant}],
```
Omit `ride`/`breeding`/`aging`/`celebrate`/`customize` to disable those systems.

### `creature.wantBubble` (a "needs action" indicator)
By default each creature floats an abstract mood shape (`moodIcon`) tinted by mood. When a
game's creatures arrive needy and **leave once satisfied** (e.g. patients), that heart is
always red and says nothing. `wantBubble` replaces it with a themed **image bubble** that is
shown only while the creature still wants the action, and hidden the moment it's satisfied —
a clear "who to go help" cue.
```
wantBubble: {
  sprite: "<image key>",   // the bubble image (e.g. a little dirty tooth)
  need: "propre",          // which need drives it (omit → mood average)
  below: 100,              // eligible while need < this (default 100 → until fully satisfied)
  scale: 0.6, lift: 8,     // size + extra px raised above the head
  intermittent: true,      // pop up now and then instead of showing permanently
  showFor: 2.5,            // seconds visible per appearance (intermittent only)
  hideMin: 5, hideMax: 12, // random gap (s) between appearances — desynced per creature
  withMood: true,          // keep the coloured mood heart ON and float the bubble in its own slot above it
}
```
It gently bobs (and pops in when `intermittent`), hides during celebration/departure, and
needs no other wiring. With `intermittent`, each creature shows its bubble on its own random
cadence, so they don't all appear at once. By default the bubble **replaces** the mood shape;
set `withMood: true` to keep the always-on mood heart as a gauge **and** pop the bubble above
it (e.g. an overall mood heart + a need-specific "do this action now" cue).

### `creature.allHappy` (day-arc collective reward)
Gives the day/rest cycle an arc: when the player rests (`station.action:"nextDay"`) with
**every** creature happy, the engine fires a synchronized celebration before the night and
shows a special morning line instead of the ordinary `morningMessage`.
```
allHappy: {
  mood: 75,                       // every creature's mood average must be ≥ this at rest
  message: "{i:trophy} Cycle {day}: ...",  // morning line on a perfect cycle ({day} substituted)
  celebrate: true,                // default true → each creature does its celebrate() hop, staggered
}
```
Mood is the same average shown by the mood heart (`moodFrom`). Omit the block to disable.

### `creature.depart` (leave after being cured)
```
depart: { to:{x,y}?, speed?, emptyMessage? }        // e.g. walk out through the door
```
When present, a creature that triggers `celebrate` (its mood need hits 100) finishes its
celebration, then **walks to `to` (default: off the bottom) at `speed` px/s (default 110)
and is removed**. It stays fully opaque while inside the **home zone** and only begins to
fade once it has **walked out of that zone**, so it never vanishes mid-room. When the last
one leaves, `emptyMessage` is shown. Pair with a `spawn` station to refill — the
"treat → leave → ring for more" loop.

### Close-up mini-scene (`action.type:"closeup"`)
A creature action of `type:"closeup"` opens a **full-screen scene** zoomed onto a
backdrop image; the player **scrubs/taps "spots" off it** (works with mouse *and*
touch) until it's clean, then the action's `effects` / `reward` / `stat` / `celebrate`
are applied exactly as if a normal action had completed. Generic — use it to clean a
mouth, wash a pet, polish a gem, wipe a window, etc.
```
action = {
  id, type:"closeup", label, icon,
  closeup: {
    bg: "<image key>",            // full-screen backdrop (e.g. a face) — overridable per
                                  //   creature via `variant.closeupBg` (e.g. each child's own face)
    bgDone: "<image key>"?,       // "after" backdrop cross-faded in when clean (e.g. a big smile) —
                                  //   per creature via `variant.closeupBgDone`
    spotSprite: "<image key>"?,   // sprite for a spot (omit → a plain CSS blob)
    spotSprites: ["k1","k2"]?,    // several spot looks, cycled (e.g. three cute germs)
    brush: "<image key>"?,        // cursor sprite that follows the finger (optional)
    brushTip: { x, y }?,          // active scrub point as fractions of the brush sprite (e.g. its
                                  //   bristle head) — spots are removed from HERE, not the raw finger.
                                  //   Omit → the finger position itself is the active point.
    spots: {
      base: 4,                    // spots on the first cure
      growEvery: 2, max: 12,      // +1 spot every N completions of this action (ramps up), capped
      rubs: 3,                    // scrubs needed to remove one spot
      size: 74,                   // spot size in BACKDROP-IMAGE px (scaled with the cover fit)
      minGap: 0.07,               // spots keep apart (fraction of the image); wiggle:false / rotate:false
      area: { x, y, w, h },       // spawn region as 0..1 fractions of the BACKDROP IMAGE
                                  //   (the backdrop fills the screen via object-fit:cover;
                                  //    spots are placed cover-aware so they stay on the teeth).
                                  //   May be an ARRAY of regions (e.g. upper + lower teeth) —
                                  //   spots alternate between them so each region gets some.
                                  //   A region can be a QUAD { quad:[[x,y],[x,y],[x,y],[x,y]], margin:0.15 }
                                  //   (corners in order) for a slanted panel seen in perspective (car door).
                                  //   Any region may set max:n (a small panel holds n spots at most).
    },
    finishParticles: ["star","heart"], // icon keys bursting when the scene is cleared
    popParticles: ["sparkle","star"], // icon keys when one spot is cleared
    foam: { colors:[…] } | false, // bubbles under the brush while scrubbing
    hint: "hand" | false,         // icon key: pulsing finger on the first spot until the first scrub
    progress: false,              // hide the progress bar (fixed size: one star slot per spot up to
                                  //   spots.max — this round's stars grey→gold, later ones dimmed)
    finishDelay: 1900,            // ms before returning to the world
    brushRest: { x, y }?,         // where the brush waits before the first scrub (screen fractions, default 0.5/0.82)
    keepVisible: [{x,y,w,h}]?,    // key art (a face, a car's nose) as image fractions: probes/cuwide.cjs fails when
                                  //   it falls out of the phone crop or under the HUD (progress bar, close button)
    wide: { bg, bgDone?, area?, size?, brushRest?, keepVisible? }?, // LANDSCAPE backdrop (e.g. the whole car in 3/4 view) used while the
                                  //   screen is wider than tall, swapped live on rotation; per creature via
                                  //   variant.closeupBgWide / closeupBgWideDone. `area` = the same NUMBER of
                                  //   regions in the same order as spots.area: a spot keeps its region and
                                  //   relative position when the backdrop swaps. Omitted → spots.area / size.
  },
  effects:{ need:+/- }, reward?, stat?, message?, celebrateMessage?,
}
```
Requires the `#closeup` overlay element in `index.html` and the `.closeup*` styles in
`engine.css` (both generic). The camera swoops onto the creature before the scene fades
in (`render.closeupZoom:false` to disable); each scrub plays a sound and each cleared spot
a rising-pitch pop, so progress can be *heard*. Difficulty ramps via `state.stats[stat]` (number of past
completions). The mood need reaching 100 via `effects` triggers `celebrate` in the
world, so the cured creature visibly rejoices when you return.
`meta.strings.closeLabel` localises the close button's `aria-label` (default `"Close"`).

#### iOS home-screen viewport (no bottom band)
Standalone iOS apps with a `black-translucent` status bar get a viewport reported short
by the status-bar height at launch, which iOS may later correct WITHOUT a resize event —
so measuring a gap is unreliable (it overshot: everything shifted down). `engine.js`
adds `html.ios-app` + `--app-h` (the physical screen height) when `navigator.standalone`;
`engine.css` pins `html/body/.screen` and every full-screen fixed layer to `top:0;
height:var(--app-h)` and makes the panel `absolute` inside `#screen-game`. New full-screen
layers must be added to that rule. Test: `_shared/ios-standalone-check.cjs` (launch +
corrected + Safari must print identical values).

#### Freeze watchdog (iPhone)
On phones the world can stop being drawn while the DOM still works (help opens, the player
"won't move"): the Phaser loop not woken after the app returns from the background, or a
WebGL context lost by iOS and never restored. `engine.js` wakes the loop on pageshow /
focus / visibility / touch, and a DOM timer checks frames advance and the context is
alive; if not (5 s frozen / 3 s context lost) it saves and reloads straight back into the
game (`sessionStorage["engine-resume"]` → auto-continue). Test: `probes/watchdog.cjs`.
The close-up's finish timer only closes ITS close-up and the reward is applied exactly
once, even if the player closes it by hand first.

#### World loading screen
While Phaser loads the world, `#world` shows the edge colour and a DOM loader (the
player's character thumbnail floating over a rounded `--primary` gauge, `.world-loader`);
the canvas fades in once its first frame is drawn (`game.events` `postrender`), and the
action panel stays hidden (empty + idle) until it has content.

#### iOS: no scroll, edge colours, stale page
- The document never scrolls: `body{position:fixed}` + `overscroll-behavior:none`, and
  `engine.js` snaps back to (0,0) on scroll / focusout / visualViewport resize / pageshow.
- `html[data-screen]` = home | create | game | closeup (kept in sync by engine.js); the
  page background is `--edge-home` / `--edge-game` / `--closeup-bg` (theme vars) so any
  area iOS shows outside our layers matches the screen's edge.
- Stale page guard: at start and when back in the foreground, engine.js fetches the live
  `index.html` (`cache:"no-store"`) and reloads once (`?fresh=`) if its `engine.js?v=`
  differs from `assetVersion` (GitHub Pages caches index.html 10 min).

#### iOS / touch robustness (why the close-up is built the way it is)
A finger-scrub over disappearing targets hits two real Safari/iOS bugs. The engine and
the generic `.closeup*` styles already guard against both — **keep these if you change
the close-up**, and reuse the pattern for any new drag-over-touch interaction:
- **Pointer-capture freeze.** When a spot under the finger is removed mid-drag, iOS keeps
  the pointer *implicitly captured* by the now-gone element, and every later touch is
  swallowed (the player "can't move" after a cure). Fix: spots are `pointer-events:none`
  and hit-tested **by geometry** (`cuRub`), the pointer is captured on the **stable stage**
  (`setPointerCapture` on `#closeup-stage`) and **released** on close / `pointerup` /
  `pointercancel` (`cuReleaseCapture`). Never capture on an element you may delete.
- **Blue text-selection.** A tap-drag starts a selection that hijacks subsequent touches —
  not just in the close-up but **anywhere in the world** (selecting a creature name / panel
  text freezes the player: "the panel stays and I can't move"). Fix: `user-select:none` +
  `-webkit-touch-callout:none` on **`html, body`** (re-enable on `input[type=text]`/`textarea`),
  plus `-webkit-user-drag:none` + `touch-action:none` on the overlay and a global
  `selectstart` `preventDefault` (skipping inputs/textareas). The global body rule is the
  important one — the overlay-only guard is not enough. These bugs **do not reproduce in
  headless Chromium OR Playwright WebKit** (no real text-selection) — only on a real iPhone;
  test with `--engine webkit` of `playtest.cjs` and the **test-debug** / **ios-pwa-check** skills.

### `zones` / `stations`
```
zones: [ { id, home, rect:{x,y,w,h}, fence, gates:"both"|"left"|"right",
           gateA, gateB, tint, tintAlpha, label } ]   // home zone = where creatures roam
zones[].floor: "<image key>"          // an image stretched over the rect (rug, mat…) instead of a tint
zones[].labelLift: 14                  // label offset above the rect
stations: [ { type, x, y, sprite, label, labelY?, scale?, box?, action, actionLabel,
              onUse?, spawn?, menu?, glow?, anim?, reach?:110, tapRadius?:80, sfx?, icon?, color?, hint? } ]
// box: {dx,dy,w,h} collision footprint (default 140×75 above the anchor); box:false → no collision (a pad you walk onto)
// action: "nextDay" | "spawn" | "openShop" | "menu" | "missions" | "models" | "restyle" | "custom"
// action:"restyle" → restyle: { price, title, subtitle, clearsChase, message, chaseMessage } (same fields as the menu item)
// While riding, other stations refuse (station.onFootMessage, else meta.strings.dismountFirst), and you
// can't mount while placing a decoration (meta.strings.placeFirst): shopping/decorating is on foot.
// whileRiding / requireMounted: the station can be used without getting off (requireMounted: ONLY
//   when riding — on foot it says needMountMessage); api.ride = the ridden creature.
// action:"custom" → onUse(state, api) with api = { ride, message, refreshHud, save, earn(n), spend(n)→bool,
//   addHeat(n), clearHeat(), fx(x,y) }
// action:"menu" → menu: { title, subtitle, items:[{ label, sub, icon, img?, price?, do, highlight?:"chase" }] }
//   do: "nextDay" | "openShop" | "spawn" | "missions" | "models" | "restyle" | "custom" (item.onPick(state, api))
//   do:"restyle" → pick a new variant for the creature you last rode, for `price`; fields: title,
//   subtitle("{name}"), clearsChase, message("{name}","{v}"), chaseMessage, noneMessage
// action:"spawn" → brings a random number of fresh creatures up to a cap:
//   spawn: { min, max, cap, from?:{x,y}, message?("{n}"), fullMessage? }   // from = they walk in from a door
//   cap:"capacity" → the room bought in the shop (state.capacity) instead of a fixed number
```

### `economy` / `shop` / `decor`
```
economy: { startCoins, startResources:{id:n}, startCapacity, dayReward }
shop: { title, resources:[{id,name,desc,icon,price,amount,boughtMessage}], capacity:{name,icon,price,boughtMessage},
        decorHeading, buyCreature:{price,heading,hint,label,icon,img,boughtMessage}, fullMessage }
decor: [ { id, name, sprite, thumb?, price, scale?, collision:{dx,dy,w,h}?, allowInHome? } ]
// A decoration is refused where it would cut off the way: anything reachable before placing it (stations,
// creatures, the home zone) must stay reachable (checked on "Place here"; message meta.blocksPath).
// allowInHome:true → may also go inside the home zone (e.g. the nursery, where unlocks appear too).
```
The shop, station menus, missions and models share one **choice list** look (engine.css
`.choice`): an icon/thumbnail tile, a title + subtitle (both accept `{i:key}`), a price pill
with the coin icon, or a check tag when owned. Coins earned anywhere go through `earn()`,
which also counts the `earned` stat when it is listed in `objectives.extraStats`.

### `missions` (go to a destination)
```
missions: { title, subtitle, stat:"missions", radius:80, color, marker:"<image key>", markerScale,
  offers:[{ id, label, sub, icon, pay, heat?, …per-offer overrides }], dests:[{ x, y, name }],
  takenMessage("{d}"), hotMessage("{d}"), doneMessage("{p}"), busyMessage,
  clearsChase:true, chaseEndMessage,   // completing a mission ends the chase (pursuers drive off + fade)
  pickups:[{ x, y, name }], target:"<image key>", targetScale, cargoIcon, cargoLabel,
  pickedMessage("{d}"), hotPickedMessage("{d}") }   // takenMessage may use {p} (pickup name)
```
**Per-offer overrides**: an offer may carry its own `pickups` (array, or `false` = one leg even when the
mission-wide list exists), `dests`, `target` / `marker` (`false` = none), `targetScale` / `markerScale`,
messages (`takenMessage`, `hotMessage`, `pickedMessage`, `hotPickedMessage`, `doneMessage`), an extra
`stat` counted on completion (on top of `missions.stat`; usable by objectives / unlocks) and the chase's
`caughtKeepsMission` / `caughtMessage` for its own errands — e.g. a small treasure = one leg to a hidden
chest, a big treasure = pick the chest up then bring it home with a pursuer (a treasure-hunt game); in Nebula a one-leg
star post (`pickups:false`) and a rare egg with its own stat (an unlock) that the drones can still snatch.
Give each offer an `id`: the chosen offer is saved as `state.mission.offer` = its id (its index when it has
none), so reordering `offers` never gives a saved mission another offer's settings. Older saves without it
use the mission-wide settings.
With `pickups`, a mission has **two legs**: go and pick the cargo up (the `marker`), then bring it
to the destination, shown as a flat ground `target` decal; a HUD chip (`cargoIcon`) shows you carry
it, and a hot offer's chase starts at pickup. Without `pickups`, one leg as below.
Taken at a station (`action:"missions"` or a menu item): a pulsing ring + bobbing marker
appear at a random destination (not the nearest one) and an arrow orbits the player towards
it; reaching it pays `pay`, counts `stat`, and saves. `heat` > 0 starts a chase.

### `chase` (heat level + pursuers)
```
chase: { sprite, dirSheet?:{cols}, scale, originY, icon, label, maxLevel:3, maxUnits:3, speed,
  catchRadius, catchSeconds, loseRadius, loseAfter, fine, spawnDist, escapedMessage, caughtMessage("{f}") }
```
`caughtKeepsMission: true` (gentler, kids): when caught, the pursuer only takes its `fine` and leaves —
the mission goes on (default: the mission is lost). A mission offer may override `caughtKeepsMission`
and `caughtMessage` for its own errands (see missions).
The HUD shows `maxLevel` icons (lit = current level). Up to `maxUnits` pursuers spawn
`spawnDist` away and home in (sliding along collisions; a dirSheet sprite turns and blinks
between its frames). Staying within `catchRadius` for `catchSeconds` = caught (the `fine`, and the
mission is lost unless `caughtKeepsMission`; the pursuers leave either way); staying beyond `loseRadius` for `loseAfter` s lowers the level by one. A restyle with
`clearsChase` (or `api.clearHeat()`) ends it.

### `models` (buy creatures with stats)
```
models: { title, subtitle, items:[{ id, name, price, variant, speedMul, grip, drainMul, desc, img? }],
  stats:[{ key, icon, invert? }], boughtMessage("{name}"), fullMessage, ownedTag:"check" }
```
Each model is bought once (station `action:"models"`); it appears next to the player with its
stats; `stats` renders `{i:icon} NN%` per key (`invert` for lower-is-better, e.g. fuel drain).

### `race` (pseudo-3D behind-the-vehicle mini-game)
A mounted action `type:"race"` covers the world with a full-screen canvas: the road recedes
to a horizon, your ride (`sprite`, multiplied by its variant tint) sits at the bottom, and
you steer (left/right half of the screen, or arrow keys) to reach the finish before the timer
runs out while dodging obstacles (hit where they reach the car on screen, not at the camera).
A character's `raceRider` (image key, same frame size as the mount's rear view) is drawn over the mount, so the player sees their own rider from behind (skipped when `ride.hideRider`).
A variant with its own `raceSprite` (e.g. creatures drawn as separate sheets) uses it instead of the tinted `race.sprite`. The ride's `speedMul` / `grip` change top speed / steering.
The HUD (timer, distance, speed, quit, steering hints) is DOM with the game's icons.
```
race: { time, reward, stat:"raceWin", hitPenalty, sprite, rideWidth:0.32 /* ride frame width / screen width (capped at 55 % of the height) */, roadside:[image keys], roadsideScale:3.4, spriteZoom,   // sprite width = road half-width × scale × spriteZoom
                                         // (≈0.13 makes an obstacle car the size of yours when it reaches you)
  track:{ segments, speed, steer, centrifugal, curveEvery, seed },
  obstacles:[{ sprite, every, phase, scale, hw, spread }],
  colors:{ sky:[top,mid,horizon], sun:[top,bottom]|false, skyline|false, ground, grass:[a,b], road:[a,b], rumble:[a,b], lane, finish:[a,b] },
  icons:{ time, distance, speed, quit, left, right }, speedUnit, distUnit, topSpeed, quitLabel, hint,
  startMessage, hitMessage("{n}"), winMessage("{r}"), loseMessage, quitMessage }
// drain (per s, default 2.4): the ride's fatigue need burns while racing; at 0 the ride slows to tiredSpeed (0.5)
// for the rest of the race (tiredMessage("{name}")), or to ride.emptySpeed with ride.empty:"slow".
// chase (optional; an action with mode:"chase") — escape a pursuer to the finish:
//   chase: { name, sprite /* rear view, shown when it catches you */, front /* front view, in the mirror */, tint?, scale,
//            icon, startGap:30 /* segments behind */, skill:[0.9,1.04] /* its pace, ramping over the race */, catchGap:0.8,
//            reward, caughtReward, stat:"chaseEscape", mirror:true, arrows:true, arrowColor, siren:true, sirenColors,
//            startMessage, hitMessage, caughtMessage("{name}"), resultsTitle, escapeMessage, escapeHint("{t}"),
//            caughtTitle, caughtHint, goLabel }
//   HUD: a gauge + distance to the pursuer; a REAR-VIEW MIRROR (top centre) shows it growing as it closes in;
//   red chevrons rise beside the ride and a red/blue glow pulses on the edges when it is near. Caught = it pulls
//   alongside and passes, then the "caught" result. Probe: probes/racechase.cjs.
// rivals (optional) — a REAL race instead of a time trial: a fixed field to overtake.
//   rivals: { list:[{ name, sprite, tint?, rider?, riderTint?, color? /* results swatch */, head? /* results portrait (image key) */, scale?, hw? }], count?, scale:6.5, hw:0.28,
//             lanes:[-0.45,0.45] /* grid lanes */, gridFirst:0 /* segments before the first row */,
//             skill:[0.84,0.97] /* top-speed share, front of the grid = strongest */, gridGap:4 /* segments */,
//             rubber:0.12 /* pack stays in reach */, avoid:[0.7,0.95] /* chance to dodge each obstacle */, countdown:3.2, maxTime:240,
//             rewards:[1st,2nd,3rd,...], placeLabels:["1st","2nd","3rd"], placeSuffix:"th",
//             placeMessages:["{place}"...] /* by place, last one reused */, resultsTitle, startMessage,
//             bumpMessage("{name}"), hitMessage, goLabel:"GO!", podiumStat:"racePodium", medalIcon:"trophy" }
//   Everybody starts BEHIND the chequered start line (the player in the last row) after a 3-2-1 countdown (real
//   seconds). Each race shuffles who is fast; every rival has its own reaction time and launch, a wobble and a
//   rubber band, and dodges obstacles most of the time (a hit makes it stumble and slow down for ~1 s); bumping one costs speed (no time penalty);
//   the time chip counts UP; a live place chip "n/N" (icons.place) replaces the distance and pops on overtakes.
//   At the line: results modal (ranking, medals, player row highlighted, reward by place); stats raceRun,
//   raceWin (1st), racePodium (top 3), raceBest. A rival = sprite (tinted) + optional rider layer (tinted).
//   Probe: probes/racerivals.cjs.
// horizon: 0.5 (fraction of the screen; 0.4 fills a tall phone with road); colors.sunPos:{x,y,r} moves the sun
// off the centre (the countdown is drawn there); colors.sunOutline:"#hex" outlines it; colors.stars:{count,color,twinkle} draws a
// twinkling starfield in the sky (space / night). rivals.startLine:false hides
// the chequered start line drawn in front of the field; rivals.startGate (image key) + startGateScale (9) raise an
// arch / gantry over it so the start reads above the pack.
// showNeed (default true): the ride's fatigue need (e.g. fuel) as a gauge under the HUD chips — turns red and
// pulses below 25 %, so a ride slowing down mid-race (empty tank, ride.empty:"slow") is understood. false hides it.
```

### `environment` (optional)
```
band,                                  // forest band thickness around the world
arena: { rect, tile, label, fence, gates:"left", gateA:0.4, gateB:0.6, obstacleSprite, obstacleScale, obstacleBox, obstacles:[{x,y}] },
forest: { tree, bush, step, hedgeMargin, treeScale:[min,max], bushScale:[min,max], hedgeBox:{dx,dy,w,h}, treeBox?:{dx,dy,w,h} },
   // hedges (bushes along the path) and solid trees get collision footprints FITTED TO THE DRAWING: on a side
   // facing the path / play area the box stops at the sprite's visible (opaque) edge at its scale, so the player
   // walks right up to it; on a side facing another band cell it extends to the cell boundary (gapless band).
   // hedgeSolid:false → the legacy small per-bush hedgeBox. treeBox:"fit" → trees fitted the same way (a solid
   // band, e.g. an asteroid belt); treeBox:{dx,dy,w,h} → a fixed box per grid cell; omit → walkable forest.
   // Tests: probes/edges.cjs (nobody gets past the edge) + probes/edgegap.cjs (stops <= 14 px from the drawing).
path: { width, sand, inset, tile, label, labelY,
        openings:[{x,y,w,h}], logs:{ xs:[...], dec, sprite, scale, boxW:44, box?:{dx,dy,w,h}, depthLift } },
   // logs: jumpable barriers across the top/bottom sides. Without `box`, each one blocks the WHOLE path width
   // out to the hedge rows (path ± max(sand, forest.hedgeMargin)) so nobody walks around it — draw the sprite as long as the path is wide.
   // Make the hedge (forest.hedgeBox) as wide as forest.step so the path edge has no gap to slip out by.
```
See the **place-scatter** skill for the single-rule vegetation system.

### `scenery` (object form) and `unlocks`
```
scenery: [
  [x, y, sprite, scale, box],                       // legacy array form (box: {dx,dy,w,h} | false)
  { x, y, sprite, scale, box, ground, depth, origin:{x,y}, flip, alpha, anim, glow, glowY, glowSize },
]
//  ground:true → flat floor decal (rug, doormat) under everything, no collision
//  origin {x:0,y:0} + depth → e.g. a back wall image anchored at the top-left
//  anim: "sway" | "bob" | "pulse" | "breathe" | "spin"   ·   glow: "#hex" soft additive halo
unlocks: [ { id, when: { stat, atLeast } | { coins } | (state)=>bool, scenery:{…}, message } ]
```
Unlocks are progression without reading: when a milestone is met, the item pops into the
world with sparkles + a jingle and stays (saved in `state.unlocked`, re-derived on load).
The entrance (`revealScenery`): a light halo opens, the item drops in and squashes on
landing (floor items fade + grow), sparkles, then its `anim` idle loop starts — never
during the entrance. Unlocks earned inside a close-up are revealed when it closes.
Engine-private fields on game objects use a `_sc` prefix (never `_alpha` etc.: Phaser
uses those internally).

### `objectives` / `help`
```
objectives: { extraStats:["ride","jump","trailVisit"],
              levels:[ { name, goals:[ { id, name, desc, check:(state)=>bool } ] } ] }
help: [ "html string", ... ]
```
`check` is a function receiving the full `state` (`state.coins`, `state.day`,
`state.creatures`, `state.stats`, `state.capacity`, `state.resources`, …).
Action `stat` ids are auto-tracked in `state.stats`; declare extra ones in `extraStats`.

### Languages (`meta.lang` + `game.i18n.js`)
A game is written in ONE source language (`meta.lang`, default `"en"`); every other language is a
**dictionary keyed by the exact source string** in `game.i18n.js` (loaded by `index.html` between
`game.config.js` and `engine.js`):
```
window.GAME_I18N = window.GAME_I18N || {};
window.GAME_I18N.en = { "Nourrir": "Feed", "{name} a faim !": "{name} is hungry!", ... };
window.GAME_I18N.fr = { "Shop": "Boutique", ... };   // in a FRENCH game: only the engine's English fallbacks
```
- Active language = saved choice (`<saveKey>-lang`) > browser language > `meta.lang`. The engine
  translates the whole `GAME` object once at boot (keys that hold ids/assets are skipped:
  `id`, `sheet`, `sprite`, `path`, `icon`, `*Id`, `*Sheet`, `*Bg`…), so every system stays
  language-agnostic and texts that reference each other (a mission target inside a message)
  stay consistent. Engine fallbacks go through `L("...")` / `T(key, "...")`.
- A missing or `""` entry falls back to the source text. Keep `{i:key}` / `{name}` tokens and
  `<b>` markup identical. Proper names may map to themselves.
- Names already stored in a save (creatures, current mission places) are re-languaged at load.
- UI: when a second language exists, two round flags (built-in fr / en, or `GAME.icons.flag_<lang>`)
  form ONE toggle at the home screen's top-left: a small pill (`--chip-bg`) with the round flags and
  a `--primary` knob sliding behind the active one (44 px tap target). A tap switches to
  the next language, saves it and reloads. Nothing in the game screen. Keep that corner of the logo clear.
- Tooling: `node .claude/skills/_shared/i18n-extract.cjs --to <lang>` adds the missing keys,
  `--check` lists untranslated ones (run it after ANY text change in the config), `--prune` drops
  stale keys. Probe: `probes/i18n.cjs` (other language: no source text left on screen, toggle
  placement, toggle round-trip). Text baked into images (logos, signs) is not translated: keep
  it language-neutral (names, numbers) or provide per-language art.

## Art pipeline (SVG → PNG)
```bash
node .claude/skills/_shared/render-svg.cjs tools/art/<game>.cjs            # all art
node .claude/skills/_shared/render-svg.cjs tools/art/<game>.cjs --only kid_ # a subset
```
The module exports a function returning `[{ file, width, height, svg }]`; `svg-kit.cjs`
provides `svg/sheet/job`, gradients (`lin`, `rad`), filters (`glow`, `blur`), colour helpers
(`shade`, `mix`), `star`, `blob`, and a seeded `rng` (same art every run). Draw each thing
once as a parametric function (e.g. `critter({c, eye, feet})`) and reuse it for the walk
sheet, thumbnails, close-up backdrops and app icon. Sheets for characters follow the LPC
layout (9 × 4, col 0 idle); creatures a 1-row walk strip. 128-px frames + `render.pixelArt:false`
+ `player.scale ≈ 0.8` give crisp sprites on phones.

## Making a new game
Use the **new-game** skill (interactive), or copy `game.config.js`, swap the assets,
and rewrite each section. Never edit `engine.js` for game content.
