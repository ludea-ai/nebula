/* =========================================================
   MINIMAL SEED — the starting point of a new game (new-game skill)
   It is also the template's starter game.config.js (a mini
   "Nebula Nursery"; the FULL showcase lives in its own repo,
   github.com/ludea-ai/nebula — start new games from THIS file)
   ---------------------------------------------------------
   This file is the ENTIRE game: data + asset references.
   The engine (engine.js) contains no game content; it reads
   this `window.GAME` object. Swap this file + assets to make
   a brand-new game from the same engine.

   This demo is deliberately MINIMAL — a clean starting point.
   The engine supports much more (shop/economy, riding,
   breeding, decorations, trail loops…); you add those by
   ITERATING on this config. See ENGINE.md for the schema.

   Theme: a tiny space nursery where a keeper robot looks
   after glowing alien critters. All art is generated from
   tools/art/starter.cjs (SVG → PNG, CC0).
   ========================================================= */

window.GAME = {
  /* ---- Identity, theming, UI strings ---- */
  meta: {
    lang: "en",                        // source language of every text (translations: game.i18n.js, see ENGINE.md Languages)
    title: "Nebula Nursery",
    titleIcon: "critter",
    logo: "assets/img/logo.webp",       // big illustrated logo on the home screen
    splash: "assets/img/splash.webp",   // full-screen illustration behind the home & create screens
    shortName: "Nebula",
    tagline: "Look after the little glowing critters!",
    saveKey: "starter-nursery",
    audience: { minAge: 6, notes: "all-ages, gentle, cute, no violence" },
    assetVersion: "v1",
    theme: { home: "#120c34", play: "#0b1029", closeup: "#1b1150" },
    showCoins: false,                 // minimal demo: no economy
    namePrompt: { label: "Name your nursery:", placeholder: "Starlight Bay" },
    startName: "My Nursery",
    namePromptYou: "Your name",
    avatarPrompt: "Pick your keeper",
    createTitle: "Choose your keeper",
    createOkLabel: "Let's go!",
    startLabel: "New game",
    continueLabel: "Continue",
    continueHint: "Your nursery is waiting for you!",
    helpTitle: "{i:help} How to play",
    ageUnit: "c", and: "and",
    nightMessage: "{i:moon} The lights dim…",
    restBlockedHint: "You just woke up! Look after a critter first.",
    neglectMessage: "Cycle {day}. Look after {names}!",
    morningMessage: "{i:sparkle} Cycle {day}: everyone rested well.",
    idleHint: "Tap a critter to look after it",
  },

  /* ---- Illustrated UI icons (tools/art/starter.cjs → assets/ui/icons). Any text can embed {i:key}. ---- */
  icons: {
    star: "assets/ui/icons/star.webp", heart: "assets/ui/icons/heart.webp", heartEmpty: "assets/ui/icons/heartEmpty.webp", sound: "assets/ui/icons/sound.webp",
    soundOff: "assets/ui/icons/soundOff.webp", help: "assets/ui/icons/help.webp", avatar: "assets/ui/icons/avatar.webp", goals: "assets/ui/icons/goals.webp",
    close: "assets/ui/icons/close.webp", play: "assets/ui/icons/play.webp", resume: "assets/ui/icons/resume.webp", check: "assets/ui/icons/check.webp",
    calendar: "assets/ui/icons/calendar.webp", gift: "assets/ui/icons/gift.webp", hand: "assets/ui/icons/hand.webp", sparkle: "assets/ui/icons/sparkle.webp",
    moon: "assets/ui/icons/moon.webp", refresh: "assets/ui/icons/refresh.webp", arrow: "assets/ui/icons/arrow.webp", trophy: "assets/ui/icons/trophy.webp",
    palette: "assets/ui/icons/palette.webp", ball: "assets/ui/icons/ball.webp", battery: "assets/ui/icons/battery.webp", smile: "assets/ui/icons/smile.webp",
    meh: "assets/ui/icons/meh.webp", sad: "assets/ui/icons/sad.webp", joy: "assets/ui/icons/joy.webp", critter: "assets/ui/icons/critter.webp",
    keeper: "assets/ui/icons/keeper.webp", polish: "assets/ui/icons/polish.webp",
  },

  /* ---- Look & feel (smooth hi-res art, glow, floating stardust) ---- */
  render: {
    pixelArt: false,
    vignette: 0.45,
    selectColor: "#3fe0e8",
    text: { color: "#f2f6ff", stroke: "#141a3f" },
    label: { bg: "#1a2348", color: "#bff6ff", border: "#3fe0e8", alpha: 0.88, size: 20 },
    ambient: { particle: "soft", colors: ["#9ff7ff", "#ff9ed8", "#ffffff"], count: 34, speed: 9, drift: "float", alpha: [0.15, 0.55], scale: [0.3, 0.9], blend: "add" },
    confetti: ["#3fe0e8", "#ff5db1", "#ffd24a", "#8df06b", "#b58bff", "#ffffff"],
  },

  /* ---- Sound: all procedural, no files ---- */
  audio: {
    volume: 0.6,
    music: { tempo: 70, root: 57, scale: "majorPenta", progression: [0, 5, 0, 7], pad: "sine", lead: "sine", density: 0.4, volume: 0.22 },
  },

  /* ---- A gentle arrow shows who needs you when you're idle ---- */
  guide: { idle: 6, color: "#ff5db1", moodBelow: 55 },

  /* ---- World ---- */
  world: { width: 1800, height: 1300, groundTile: "ground", bg: "#0b1029" },
  camera: { fitW: 520, fitH: 620, min: 0.5, max: 1.2 },

  /* ---- Assets (all generated, CC0) ---- */
  assets: {
    images: {
      ground: { path: "assets/img/ground.webp", res: 2 }, pen_floor: "assets/img/pen_floor.webp",
      crystal: { path: "assets/img/crystal.webp", res: 2 }, crystal_b: { path: "assets/img/crystal_b.webp", res: 2 }, alienplant: { path: "assets/img/alienplant.webp", res: 2 },
      orblamp: { path: "assets/img/orblamp.webp", res: 2 }, starball: { path: "assets/img/starball.webp", res: 2 }, fountain: { path: "assets/img/fountain.webp", res: 2 },
      pod_rest: { path: "assets/img/pod_rest.webp", res: 2 },
      dust: "assets/img/dust.webp", dust_b: "assets/img/dust_b.webp", cloth: "assets/img/cloth.webp",
      want_dust: { path: "assets/img/want_dust.webp", res: 2 },
      // per-variant close-up backdrops (+ the happy "after" version revealed when clean)
      critter_closeup_rose: { path: "assets/img/critter_closeup_rose.webp", res: 2 }, critter_closeup_rose_done: { path: "assets/img/critter_closeup_rose_done.webp", res: 2 },
      critter_closeup_amber: { path: "assets/img/critter_closeup_amber.webp", res: 2 }, critter_closeup_amber_done: { path: "assets/img/critter_closeup_amber_done.webp", res: 2 },
      critter_closeup_aqua: { path: "assets/img/critter_closeup_aqua.webp", res: 2 }, critter_closeup_aqua_done: { path: "assets/img/critter_closeup_aqua_done.webp", res: 2 },
      critter_closeup_lime: { path: "assets/img/critter_closeup_lime.webp", res: 2 }, critter_closeup_lime_done: { path: "assets/img/critter_closeup_lime_done.webp", res: 2 },
      critter_closeup_violet: { path: "assets/img/critter_closeup_violet.webp", res: 2 }, critter_closeup_violet_done: { path: "assets/img/critter_closeup_violet_done.webp", res: 2 },
    },
    sheets: {
      keeper: { path: "assets/sheet/keeper.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      keeper_amber: { path: "assets/sheet/keeper_amber.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_rose: { path: "assets/sheet/critter_rose.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_amber: { path: "assets/sheet/critter_amber.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_aqua: { path: "assets/sheet/critter_aqua.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_lime: { path: "assets/sheet/critter_lime.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_violet: { path: "assets/sheet/critter_violet.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      fence: { path: "assets/sheet/fence.webp", frameWidth: 80, frameHeight: 80, res: 2 },
    },
  },
  // force-field fence: 80-px frames drawn at half size, one pylon every 40 px
  fence: { sheet: "fence", step: 40, scale: 0.5, frames: { post: 0, side: 1, cornerTL: 2, cornerTR: 2 } },

  /* ---- Player (the keeper robot) ---- */
  player: {
    scale: 0.89,
    speed: { walk: 220, run: 390 },
    spawn: { x: 440, y: 680 },
    nameY: -112,                 // keep the name label above the keeper's antenna
    shadow: { w: 40, h: 12 },
  },
  characters: [
    { id: "aqua", name: "Bolt", sheet: "keeper", thumb: "assets/ui/keeper_thumb.webp" },
    { id: "amber", name: "Sol", sheet: "keeper_amber", thumb: "assets/ui/keeper_amber_thumb.webp" },
  ],

  /* ---- Creature system (3 needs, 3 actions, variants, aging) ---- */
  creature: {
    label: "critters", icon: "critter",
    sheet: "critter_rose",
    origin: { x: 0.5, y: 0.86 },
    walk: { start: 0, end: 3, frameRate: 7, hop: 9, hopPeriod: 260, speed: 46 },   // bouncy little hops
    shadow: { w: 66, h: 18 },
    // Critters hatch tiny and grow to full size over a few cycles.
    aging: { adultAge: 4, scaleBaby: 0.5, scaleAdult: 0.82 },
    youngLabel: "Hatchling", adultLabel: "Grown",
    // Mood = average of the three needs (the coloured heart above each critter).
    // joy is the MOOD_NEED: maxing it (via Play) triggers the little celebration,
    // and it gently drifts each cycle depending on how well the other needs are kept up.
    moodNeed: "joy",
    moodFrom: ["fuel", "shine", "joy"],
        moodDay: { base: -8, lowPenalty: -8, lowAt: 25, highBonus: 6, highAt: 60 },
    // Three clear needs, each looked after by exactly ONE action:
    //   Energy ← Feed   ·   Sparkle ← Polish (zoom)   ·   Fun ← Play
    needs: [
      { id: "fuel", icon: "battery", label: "Energy", start: 70, perDay: -22 },
      { id: "shine", icon: "sparkle", label: "Sparkle", start: 55, perDay: -20 },
      { id: "joy", icon: "ball", label: "Fun", start: 80 },
    ],
    // A dusty critter intermittently pops a "polish me" bubble (Sparkle low) — it cues
    // the close-up. The coloured mood heart stays on alongside it (wantBubble.withMood).
    wantBubble: { sprite: "want_dust", need: "shine", below: 45, withMood: true,
      intermittent: true, scale: 0.42, lift: 30, showFor: 2.6, hideMin: 5, hideMax: 10 },
    // Rest with EVERYONE happy → a synchronized send-off and a special morning line.
    allHappy: { mood: 75, message: "{i:trophy} Cycle {day}: every critter is glowing — what a wonderful day!" },
    // Each variant has its own glow colour (sheet), close-up face, happy face and thumbnail.
    variants: [
      { id: "rose", name: "Rose", color: "#ff5db1", sheet: "critter_rose", closeupBg: "critter_closeup_rose", closeupBgDone: "critter_closeup_rose_done", thumb: "assets/ui/critter_rose.webp" },
      { id: "amber", name: "Amber", color: "#ffb43a", sheet: "critter_amber", closeupBg: "critter_closeup_amber", closeupBgDone: "critter_closeup_amber_done", thumb: "assets/ui/critter_amber.webp" },
      { id: "aqua", name: "Aqua", color: "#3fe0e8", sheet: "critter_aqua", closeupBg: "critter_closeup_aqua", closeupBgDone: "critter_closeup_aqua_done", thumb: "assets/ui/critter_aqua.webp" },
      { id: "lime", name: "Lime", color: "#86e55a", sheet: "critter_lime", closeupBg: "critter_closeup_lime", closeupBgDone: "critter_closeup_lime_done", thumb: "assets/ui/critter_lime.webp" },
      { id: "violet", name: "Violet", color: "#a97bff", sheet: "critter_violet", closeupBg: "critter_closeup_violet", closeupBgDone: "critter_closeup_violet_done", thumb: "assets/ui/critter_violet.webp" },
    ],
    variantLabel: "Glow colour",
    customize: { rename: true, variant: true },
    customizeTitle: "{i:palette} Customize",
    customizedMessage: "{i:sparkle} {name} looks great!",
    actions: [
      // Quick in-world taps — each tops up one need only.
      { id: "feed", label: "Feed", icon: "battery", color: "#5ad18a",
        effects: { fuel: 38 }, stat: "feed",
        // themed particles: little cyan energy sparks float up as it recharges
        anim: { motion: "nod", particle: "spark", colors: ["#9fe8ff", "#6fb7e8", "#ffffff"], count: 7, y0: 38 },
        message: "{i:battery} {name} recharged happily!" },
      { id: "play", label: "Play", icon: "ball", color: "#ffb43a",
        effects: { joy: 30 }, stat: "play",
        // themed particles: a burst of STARS instead of hearts
        anim: { motion: "hop", particle: "star", colors: ["#fff2a8", "#ffd24a", "#a8e6ff", "#ff5db1"], count: 8 },
        message: "{i:ball} {name} had fun!", celebrateMessage: "{i:joy} {name} glows with joy!" },
      // the signature CLOSE-UP "moment fort": zoom in and scrub off the cosmic dust by hand
      { id: "polish", type: "closeup", label: "Polish", icon: "polish", color: "#ff5db1", stat: "polish",
        closeup: {
          bg: "critter_closeup_rose", spotSprites: ["dust", "dust_b"], brush: "cloth", brushTip: { x: 0.5, y: 0.38 },
          spots: { base: 4, growEvery: 2, max: 9, rubs: 3, size: 120, minGap: 0.1,
                   // around the big eye (never on it): left & right cheeks, forehead, chin
                   area: [{ x: 0.25, y: 0.45, w: 0.1, h: 0.2 }, { x: 0.65, y: 0.45, w: 0.1, h: 0.2 },
                          { x: 0.40, y: 0.385, w: 0.2, h: 0.02 }, { x: 0.40, y: 0.70, w: 0.2, h: 0.03 }] },
          finishParticles: ["star", "sparkle", "heart"],
          foam: { colors: ["#ffffff", "#e3f9ff", "#ffe3f4"] },
        },
        effects: { shine: 100 },
        message: "{i:sparkle} {name} is sparkling clean!" },
      // open the customize menu (recolour the glow / rename) — no effect on needs
      { id: "style", type: "customize", label: "Style", icon: "palette", color: "#a97bff" },
    ],
    celebrate: { mode: "hop", particle: "star", colors: ["#fff2a8", "#ffd24a", "#a8e6ff", "#ff9ed8"], count: 9 },
    names: ["Zib", "Quor", "Lumi", "Vex", "Orbit", "Pulse", "Nova", "Echo", "Bly", "Pixl"],
    startCount: 3,
    // A mix to show off growth: two grown critters and one fresh hatchling (grows over ~4 cycles).
    startCreatures: [{ name: "Zib", variant: "aqua", age: 6 }, { name: "Lumi", variant: "rose", age: 5 }, { name: "Pulse", variant: "lime", age: 0 }],
  },

  /* ---- Zone (the nursery pen where critters roam) ---- */
  zones: [
    { id: "pen", home: true, rect: { x: 520, y: 340, w: 780, h: 640 }, floor: "pen_floor",
      fence: true, gates: "left", gateA: 0.38, gateB: 0.62, label: "Nursery", labelLift: 26 },
  ],

  /* ---- One station: the recharge pod (rest → next cycle) ---- */
  stations: [
    { type: "rest", x: 300, y: 560, sprite: "pod_rest", scale: 0.8, label: "Recharge Pod", labelY: 34, glow: "#3fe0e8",
      box: { dx: -78, dy: -44, w: 156, h: 46 }, action: "nextDay", actionLabel: "Rest", icon: "moon", color: "#7b6cff", hint: "Sleep until the next cycle" },
  ],

  /* ---- Ambient scenery (crystals, alien plants) with a little life ---- */
  scenery: [
    { x: 200, y: 330, sprite: "crystal", scale: 0.8, glow: "#ff8fd8", anim: "pulse", box: { dx: -40, dy: -18, w: 80, h: 22 } },
    { x: 1480, y: 300, sprite: "crystal_b", scale: 0.9, glow: "#8ff6ff", anim: "pulse", box: { dx: -44, dy: -18, w: 88, h: 22 } },
    { x: 230, y: 940, sprite: "alienplant", scale: 0.8, anim: "sway", box: false },
    { x: 1560, y: 820, sprite: "alienplant", scale: 0.9, anim: "sway", box: false, flip: true },
    { x: 1420, y: 1120, sprite: "crystal", scale: 0.7, glow: "#ff8fd8", anim: "pulse", box: { dx: -34, dy: -16, w: 68, h: 20 } },
    { x: 560, y: 1150, sprite: "alienplant", scale: 0.75, anim: "sway", box: false },
    { x: 980, y: 1170, sprite: "crystal_b", scale: 0.65, glow: "#8ff6ff", anim: "pulse", box: { dx: -30, dy: -14, w: 60, h: 18 } },
    { x: 760, y: 250, sprite: "alienplant", scale: 0.7, anim: "sway", box: false },
  ],

  /* ---- Unlocks: the nursery grows richer as you care (no reading needed) ---- */
  unlocks: [
    { id: "ball", when: { stat: "play", atLeast: 3 }, message: "{i:gift} A new toy appeared in the nursery!",
      scenery: { x: 1080, y: 830, sprite: "starball", scale: 0.6, anim: "bob", box: { dx: -18, dy: -10, w: 36, h: 14 } } },
    { id: "lamps", when: { stat: "feed", atLeast: 4 }, message: "{i:gift} Cosy orb lamps light up the way!",
      scenery: { x: 470, y: 470, sprite: "orblamp", scale: 0.7, glow: "#ffe68a", glowY: 90, box: { dx: -14, dy: -10, w: 28, h: 14 } } },
    { id: "fountain", when: { stat: "polish", atLeast: 3 }, message: "{i:gift} A stardust fountain for the critters!",
      scenery: { x: 1520, y: 600, sprite: "fountain", scale: 0.8, glow: "#ff8fd8", glowY: 70, box: { dx: -70, dy: -30, w: 140, h: 34 } } },
  ],

  /* ---- Objectives (kept minimal: one level, a few simple goals) ---- */
  objectives: {
    levels: [
      { name: "Caretaker", goals: [
        { id: "feed1", name: "First charge", desc: "Feed a critter", check: (s) => s.stats.feed >= 1 },
        { id: "play1", name: "Playtime", desc: "Play with a critter", check: (s) => s.stats.play >= 1 },
        { id: "polish1", name: "Sparkle clean", desc: "Polish a critter", check: (s) => s.stats.polish >= 1 },
        { id: "happy", name: "All aglow", desc: "Get a critter's mood fully up", check: (s) => s.creatures.some((c) => (c.fuel + c.shine + c.joy) / 3 >= 85) },
      ] },
    ],
  },

  /* ---- Help screen ---- */
  help: [
    "<b>Welcome to your space nursery!</b>",
    "{i:hand} <b>Move:</b> tap the floor — your keeper floats there, around obstacles. Tap a critter to go straight to it. (Keyboard: arrows or WASD/ZQSD.)",
    "{i:heart} <b>Three needs:</b> {i:battery} Energy (Feed), {i:ball} Fun (Play) and {i:sparkle} Sparkle (Polish). The heart over each critter shows its mood — keep it green!",
    "{i:polish} <b>Polish:</b> a dusty critter pops a bubble. Tap Polish to zoom right in and rub the dust bunnies away with your finger!",
    "{i:palette} <b>Style:</b> rename a critter or change its glow colour.",
    "{i:gift} <b>Surprises:</b> the more you care, the more the nursery fills with toys and lights.",
    "{i:moon} <b>Recharge Pod:</b> rest to reach the next cycle. Send everyone to sleep happy for a glowing send-off!",
    "{i:avatar} {i:sound} change your keeper or turn the sound off. The game saves automatically.",
  ],
};
