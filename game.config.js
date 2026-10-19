/* =========================================================
   GAME DEFINITION — "Nebula Nursery" (engine SHOWCASE demo)
   ---------------------------------------------------------
   This file is the ENTIRE game: data + asset references.
   The engine (engine.js) contains no game content; it reads
   this `window.GAME` object. Swap this file + assets to make
   a brand-new game from the same engine.

   This demo is the engine's SHOWCASE: it turns on (nearly)
   every system so you can see how each one is wired —
   needs/mood/close-up care, variants + happy faces, aging,
   breeding, riding + jumps (Gravity Park arena, Star Ring road),
   economy + shop + decorations, station menus + paid
   restyle, a spawn portal, delivery missions with a chase,
   buyable models with stats and a pseudo-3D race.
   A NEW game should start small: see
   .claude/skills/new-game/references/minimal-seed.config.js.

   Theme: a space nursery where a keeper robot looks after
   glowing alien critters. All art is generated from
   tools/art/nebula.cjs (SVG → WebP, CC0).
   ========================================================= */

window.GAME = {
  /* ---- Identity, theming, UI strings ---- */
  meta: {
    lang: "en",                        // source language of every text below (translations: game.i18n.js)
    title: "Nebula Nursery",
    titleIcon: "critter",
    logo: "assets/img/logo.webp",       // big illustrated logo on the home screen
    splash: "assets/img/splash.webp",   // full-screen illustration behind the home & create screens
    shortName: "Nebula",
    tagline: "Look after the little glowing critters!",
    description: "Care for glowing alien critters on a space station: feed them, raise their babies, ride them through the asteroid belt and deliver parcels across the Star Ring.",
    saveKey: "nebula-nursery",
    legalLinks: [{ label: "Legal notice", url: "https://ludea.ai/legal/" }, { label: "Privacy", url: "https://ludea.ai/privacy/" }],
    audience: { minAge: 6, notes: "all-ages, gentle, cute, no violence" },
    assetVersion: "v63",
    theme: { home: "#120c34", play: "#0b1029", closeup: "#1b1150" },
    showCoins: true,
    coinIcon: "shard",                // the currency: star shards
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
    idleHint: "Tap a critter or a building",
    notEnough: "Not enough star shards!",
    placeHint: "Float around, then drop {item} where you like.",
    placeHere: "Place here", cancel: "Cancel",
    boughtDecorMessage: "{name} bought! Walk to a spot and tap Place here.",
    placedMessage: "{i:sparkle} {name} placed!",
    refundMessage: "Placement cancelled, shards refunded.",
    noOnBuilding: "Not on a building!", noInHome: "Not inside the nursery!", blocksPath: "Not here: it would block the way!",
    strings: {
      dismountFirst: "{i:ride} Hop off your critter first!",
      placeFirst: "{i:gift} Place your decoration first!",
    },
  },

  /* ---- Illustrated UI icons (tools/art/nebula.cjs → assets/ui/icons). Any text can embed {i:key}. ---- */
  icons: {
    star: "assets/ui/icons/star.webp", heart: "assets/ui/icons/heart.webp", heartEmpty: "assets/ui/icons/heartEmpty.webp", sound: "assets/ui/icons/sound.webp",
    soundOff: "assets/ui/icons/soundOff.webp", help: "assets/ui/icons/help.webp", avatar: "assets/ui/icons/avatar.webp", goals: "assets/ui/icons/goals.webp",
    close: "assets/ui/icons/close.webp", play: "assets/ui/icons/play.webp", resume: "assets/ui/icons/resume.webp", check: "assets/ui/icons/check.webp",
    calendar: "assets/ui/icons/calendar.webp", gift: "assets/ui/icons/gift.webp", hand: "assets/ui/icons/hand.webp", sparkle: "assets/ui/icons/sparkle.webp",
    moon: "assets/ui/icons/moon.webp", refresh: "assets/ui/icons/refresh.webp", arrow: "assets/ui/icons/arrow.webp", trophy: "assets/ui/icons/trophy.webp",
    palette: "assets/ui/icons/palette.webp", ball: "assets/ui/icons/ball.webp", battery: "assets/ui/icons/battery.webp", smile: "assets/ui/icons/smile.webp",
    meh: "assets/ui/icons/meh.webp", sad: "assets/ui/icons/sad.webp", joy: "assets/ui/icons/joy.webp", critter: "assets/ui/icons/critter.webp",
    keeper: "assets/ui/icons/keeper.webp", polish: "assets/ui/icons/polish.webp",
    shard: "assets/ui/icons/shard.webp", nectar: "assets/ui/icons/nectar.webp", shop: "assets/ui/icons/shop.webp", crate: "assets/ui/icons/crate.webp",
    drone: "assets/ui/icons/drone.webp", flag: "assets/ui/icons/flag.webp", timer: "assets/ui/icons/timer.webp", distance: "assets/ui/icons/distance.webp",
    speed: "assets/ui/icons/speed.webp", quit: "assets/ui/icons/quit.webp", left: "assets/ui/icons/left.webp", right: "assets/ui/icons/right.webp",
    grip: "assets/ui/icons/grip.webp", range: "assets/ui/icons/range.webp", egg: "assets/ui/icons/egg.webp", ride: "assets/ui/icons/ride.webp",
    jump: "assets/ui/icons/jump.webp", pad: "assets/ui/icons/pad.webp", portal: "assets/ui/icons/portal.webp", stall: "assets/ui/icons/stall.webp",
    home: "assets/ui/icons/home.webp", lock: "assets/ui/icons/lock.webp",
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
  // A space station: open space (void) all around, a metal deck island with a glowing rim,
  // and districts painted as ground patches (plaza, walkways).
  world: { width: 2800, height: 2100, groundTile: "void", bg: "#070a1f",
    patches: [
      { x: 440, y: 440, w: 1920, h: 1220, tile: "ground" },                                   // the deck island
      { x: 428, y: 428, w: 1944, h: 14, tile: "rim" }, { x: 428, y: 1658, w: 1944, h: 14, tile: "rim" },
      { x: 428, y: 428, w: 14, h: 1244, tile: "rim" }, { x: 2358, y: 428, w: 14, h: 1244, tile: "rim" },
      { x: 1240, y: 820, w: 520, h: 450, tile: "plaza" },                                     // Delivery Plaza
      { x: 1120, y: 720, w: 120, h: 72, tile: "walkway" },                                    // nursery gate → plaza
      { x: 1465, y: 1270, w: 70, h: 180, tile: "walkway" },                                   // plaza → Energy Pad
      { x: 1760, y: 1300, w: 60, h: 90, tile: "walkway" },                                    // → Gravity Park gate
      { x: 1300, y: 680, w: 1060, h: 60, tile: "walkway" },                                   // the shop street
    ] },
  camera: { fitW: 520, fitH: 620, min: 0.5, max: 1.2 },

  /* ---- Assets (all generated, CC0) ---- */
  assets: {
    images: {
      ground: { path: "assets/img/ground.webp", res: 2 }, pen_floor: "assets/img/pen_floor.webp",
      crystal: { path: "assets/img/crystal.webp", res: 2 }, crystal_b: { path: "assets/img/crystal_b.webp", res: 2 }, alienplant: { path: "assets/img/alienplant.webp", res: 2 },
      orblamp: { path: "assets/img/orblamp.webp", res: 2 }, starball: { path: "assets/img/starball.webp", res: 2 }, fountain: { path: "assets/img/fountain.webp", res: 2 },
      pod_rest: { path: "assets/img/pod_rest.webp", res: 2 },
      // buildings
      market: { path: "assets/img/market.webp", res: 2 }, salon: { path: "assets/img/salon.webp", res: 2 }, dock: { path: "assets/img/dock.webp", res: 2 },
      hatchery: { path: "assets/img/hatchery.webp", res: 2 }, energy_pad: { path: "assets/img/energy_pad.webp", res: 2 }, portal: { path: "assets/img/portal.webp", res: 2 },
      // space station: void, deck, plaza, road ring, asteroid belt, Gravity Park
      void: { path: "assets/img/void.webp", res: 2 }, road: { path: "assets/img/road.webp", res: 2 }, plaza: { path: "assets/img/plaza.webp", res: 2 },
      walkway: { path: "assets/img/walkway.webp", res: 2 }, rim: { path: "assets/img/rim.webp", res: 2 }, bollard: { path: "assets/img/bollard.webp", res: 2 },
      rock: { path: "assets/img/rock.webp", res: 2 }, container: { path: "assets/img/container.webp", res: 2 }, neon_sign: { path: "assets/img/neon_sign.webp", res: 2 },
      antenna: { path: "assets/img/antenna.webp", res: 2 }, shuttle: { path: "assets/img/shuttle.webp", res: 2 }, landing_pad: { path: "assets/img/landing_pad.webp", res: 2 },
      arena_floor: { path: "assets/img/arena_floor.webp", res: 2 },
      spire: { path: "assets/img/spire.webp", res: 2 },
      beam_v: { path: "assets/img/beam_v.webp", res: 2 }, comet_rock: { path: "assets/img/comet_rock.webp", res: 2 },
      // deliveries + race
      crate: { path: "assets/img/crate.webp", res: 2 }, target: { path: "assets/img/target.webp", res: 2 },
      asteroid: { path: "assets/img/asteroid.webp", res: 2 }, beacon: { path: "assets/img/beacon.webp", res: 2 },
      critter_back_rose: { path: "assets/img/critter_back_rose.webp", res: 2 }, critter_back_amber: { path: "assets/img/critter_back_amber.webp", res: 2 },
      critter_back_aqua: { path: "assets/img/critter_back_aqua.webp", res: 2 }, critter_back_lime: { path: "assets/img/critter_back_lime.webp", res: 2 },
      critter_back_violet: { path: "assets/img/critter_back_violet.webp", res: 2 },
      // race: the keeper robot seen from behind, drawn over the critter (character.raceRider)
      drone_back: { path: "assets/img/drone_back.webp", res: 2 }, drone_front: { path: "assets/img/drone_front.webp", res: 2 }, start_gate: { path: "assets/img/start_gate.webp", res: 2 },   // the Escape pursuer (race.chase)
      rider_back_aqua: { path: "assets/img/rider_back_aqua.webp", res: 2 },
      rider_rival_1: { path: "assets/img/rider_rival_1.webp", res: 2 },
      rider_rival_2: { path: "assets/img/rider_rival_2.webp", res: 2 },
      rider_rival_3: { path: "assets/img/rider_rival_3.webp", res: 2 },
      rider_rival_4: { path: "assets/img/rider_rival_4.webp", res: 2 },
      rider_rival_5: { path: "assets/img/rider_rival_5.webp", res: 2 }, rider_back_amber: { path: "assets/img/rider_back_amber.webp", res: 2 },
      dust: "assets/img/dust.webp", dust_b: "assets/img/dust_b.webp", cloth: "assets/img/cloth.webp",
      want_dust: { path: "assets/img/want_dust.webp", res: 2 },
      // per-variant close-up backdrops (+ the happy "after" version revealed when clean)
      critter_closeup_rose: { path: "assets/img/critter_closeup_rose.webp", res: 2 }, critter_closeup_rose_done: { path: "assets/img/critter_closeup_rose_done.webp", res: 2 },
      critter_closeup_rose_wide: { path: "assets/img/critter_closeup_rose_wide.webp", res: 2 }, critter_closeup_rose_wide_done: { path: "assets/img/critter_closeup_rose_wide_done.webp", res: 2 },
      critter_closeup_amber: { path: "assets/img/critter_closeup_amber.webp", res: 2 }, critter_closeup_amber_done: { path: "assets/img/critter_closeup_amber_done.webp", res: 2 },
      critter_closeup_amber_wide: { path: "assets/img/critter_closeup_amber_wide.webp", res: 2 }, critter_closeup_amber_wide_done: { path: "assets/img/critter_closeup_amber_wide_done.webp", res: 2 },
      critter_closeup_aqua: { path: "assets/img/critter_closeup_aqua.webp", res: 2 }, critter_closeup_aqua_done: { path: "assets/img/critter_closeup_aqua_done.webp", res: 2 },
      critter_closeup_aqua_wide: { path: "assets/img/critter_closeup_aqua_wide.webp", res: 2 }, critter_closeup_aqua_wide_done: { path: "assets/img/critter_closeup_aqua_wide_done.webp", res: 2 },
      critter_closeup_lime: { path: "assets/img/critter_closeup_lime.webp", res: 2 }, critter_closeup_lime_done: { path: "assets/img/critter_closeup_lime_done.webp", res: 2 },
      critter_closeup_lime_wide: { path: "assets/img/critter_closeup_lime_wide.webp", res: 2 }, critter_closeup_lime_wide_done: { path: "assets/img/critter_closeup_lime_wide_done.webp", res: 2 },
      critter_closeup_violet: { path: "assets/img/critter_closeup_violet.webp", res: 2 }, critter_closeup_violet_done: { path: "assets/img/critter_closeup_violet_done.webp", res: 2 },
      critter_closeup_violet_wide: { path: "assets/img/critter_closeup_violet_wide.webp", res: 2 }, critter_closeup_violet_wide_done: { path: "assets/img/critter_closeup_violet_wide_done.webp", res: 2 },
    },
    sheets: {
      keeper: { path: "assets/sheet/keeper.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      keeper_amber: { path: "assets/sheet/keeper_amber.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      keeper_ride: { path: "assets/sheet/keeper_ride.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      keeper_amber_ride: { path: "assets/sheet/keeper_amber_ride.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_rose: { path: "assets/sheet/critter_rose.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_amber: { path: "assets/sheet/critter_amber.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_aqua: { path: "assets/sheet/critter_aqua.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_lime: { path: "assets/sheet/critter_lime.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_violet: { path: "assets/sheet/critter_violet.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_happy_rose: { path: "assets/sheet/critter_happy_rose.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_happy_amber: { path: "assets/sheet/critter_happy_amber.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_happy_aqua: { path: "assets/sheet/critter_happy_aqua.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_happy_lime: { path: "assets/sheet/critter_happy_lime.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      critter_happy_violet: { path: "assets/sheet/critter_happy_violet.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      drone: { path: "assets/sheet/drone.webp", frameWidth: 128, frameHeight: 128, res: 2 },
      fence: { path: "assets/sheet/fence.webp", frameWidth: 80, frameHeight: 80, res: 2 },
    },
  },
  // force-field fence: 80-px frames drawn at half size, one pylon every 40 px
  fence: { sheet: "fence", step: 40, scale: 0.5, frames: { post: 0, side: 1, cornerTL: 2, cornerTR: 2 } },

  /* ---- Player (the keeper robot) ---- */
  player: {
    scale: 0.89,
    speed: { walk: 220, run: 390, rideWalk: 330, rideRun: 520 },
    spawn: { x: 1180, y: 760 },
    nameY: -112,                 // keep the name label above the keeper's antenna
    shadow: { w: 40, h: 12 },
  },
  characters: [
    { id: "aqua", name: "Bolt", sheet: "keeper", rideSheet: "keeper_ride", raceRider: "rider_back_aqua", thumb: "assets/ui/keeper_thumb.webp" },
    { id: "amber", name: "Sol", sheet: "keeper_amber", rideSheet: "keeper_amber_ride", raceRider: "rider_back_amber", thumb: "assets/ui/keeper_amber_thumb.webp" },
  ],

  /* ---- Creature system (3 needs, 3 actions, variants, aging) ---- */
  creature: {
    label: "critters", icon: "critter",
    sheet: "critter_rose",
    origin: { x: 0.5, y: 0.86 },
    walk: { start: 0, end: 3, frameRate: 7, hop: 9, hopPeriod: 260, speed: 46 },   // bouncy little hops
    shadow: { w: 66, h: 18 },
    spacing: 70,
    // Critters hatch tiny and grow over a few cycles; grown ones are big enough to ride.
    aging: { adultAge: 4, scaleBaby: 0.55, scaleAdult: 1.05 },
    // Two happy grown critters resting well → an egg hatches overnight.
    breeding: { enabled: true, minMood: 75, cooldown: 2, message: "{i:egg} An egg hatched overnight: welcome, {name}!" },
    // The panel shows a face for the mood (instead of hearts), and a critter whose Fun is
    // full switches to its happy-eyed sheet (variant.happySheet).
    moodFaces: ["sad", "meh", "smile", "joy"],
    happyAt: 100,
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
      { id: "rose", name: "Rose", color: "#ff5db1", sheet: "critter_rose", happySheet: "critter_happy_rose", raceSprite: "critter_back_rose", closeupBg: "critter_closeup_rose", closeupBgDone: "critter_closeup_rose_done", closeupBgWide: "critter_closeup_rose_wide", closeupBgWideDone: "critter_closeup_rose_wide_done", thumb: "assets/ui/critter_rose.webp" },
      { id: "amber", name: "Amber", color: "#ffb43a", sheet: "critter_amber", happySheet: "critter_happy_amber", raceSprite: "critter_back_amber", closeupBg: "critter_closeup_amber", closeupBgDone: "critter_closeup_amber_done", closeupBgWide: "critter_closeup_amber_wide", closeupBgWideDone: "critter_closeup_amber_wide_done", thumb: "assets/ui/critter_amber.webp" },
      { id: "aqua", name: "Aqua", color: "#3fe0e8", sheet: "critter_aqua", happySheet: "critter_happy_aqua", raceSprite: "critter_back_aqua", closeupBg: "critter_closeup_aqua", closeupBgDone: "critter_closeup_aqua_done", closeupBgWide: "critter_closeup_aqua_wide", closeupBgWideDone: "critter_closeup_aqua_wide_done", thumb: "assets/ui/critter_aqua.webp" },
      { id: "lime", name: "Lime", color: "#86e55a", sheet: "critter_lime", happySheet: "critter_happy_lime", raceSprite: "critter_back_lime", closeupBg: "critter_closeup_lime", closeupBgDone: "critter_closeup_lime_done", closeupBgWide: "critter_closeup_lime_wide", closeupBgWideDone: "critter_closeup_lime_wide_done", thumb: "assets/ui/critter_lime.webp" },
      { id: "violet", name: "Violet", color: "#a97bff", sheet: "critter_violet", happySheet: "critter_happy_violet", raceSprite: "critter_back_violet", closeupBg: "critter_closeup_violet", closeupBgDone: "critter_closeup_violet_done", closeupBgWide: "critter_closeup_violet_wide", closeupBgWideDone: "critter_closeup_violet_wide_done", thumb: "assets/ui/critter_violet.webp" },
    ],
    variantLabel: "Glow colour",
    customize: { rename: true, variant: true },
    customizeTitle: "{i:palette} Customize",
    customizedMessage: "{i:sparkle} {name} looks great!",
    actions: [
      // Quick in-world taps — each tops up one need only.
      { id: "feed", label: "Feed", icon: "nectar", color: "#5ad18a",
        cost: { resource: "nectar", amount: 1 }, outOfStock: "{i:nectar} Out of nectar! Buy some at the Star Market.",
        effects: { fuel: 38 }, reward: 1, stat: "feed",
        // themed particles: little cyan energy sparks float up as it recharges
        anim: { motion: "nod", particle: "spark", colors: ["#9fe8ff", "#6fb7e8", "#ffffff"], count: 7, y0: 38 },
        message: "{i:battery} {name} recharged happily!" },
      { id: "play", label: "Play", icon: "ball", color: "#ffb43a",
        require: { fuel: 12 }, tooLow: "{name} is too low on energy to play.",
        effects: { joy: 30, fuel: -6 }, reward: 2, stat: "play",
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
          // phone held sideways: a landscape backdrop (same 4 areas, same order — wideAreas() in nebula.cjs)
          wide: { bg: "critter_closeup_rose_wide", bgDone: "critter_closeup_rose_wide_done",
                  size: 98, area: [{ x: 0.3848, y: 0.4546, w: 0.0461, h: 0.2367 }, { x: 0.5691, y: 0.4546, w: 0.0461, h: 0.2367 },
                         { x: 0.4539, y: 0.3777, w: 0.0922, h: 0.0237 }, { x: 0.4539, y: 0.7505, w: 0.0922, h: 0.0355 }] },
          finishParticles: ["star", "sparkle", "heart"],
          foam: { colors: ["#ffffff", "#e3f9ff", "#ffe3f4"] },
        },
        effects: { shine: 100 }, reward: 3,
        message: "{i:sparkle} {name} is sparkling clean!" },
      // Ride a grown critter (the keeper sits on top), jump obstacles, race.
      { id: "ride", type: "ride", label: "Ride", icon: "ride", color: "#3fe0e8", dismountLabel: "Hop off", dismountIcon: "close" },
      { id: "jump", type: "jump", label: "Jump", icon: "jump", color: "#ffd24a" },
      { id: "race", type: "race", label: "Race", icon: "flag", color: "#ff5db1" },
      // race variant: the station's security drone chases you to the finish (race.chase)
      { id: "escape", type: "race", mode: "chase", label: "Escape", icon: "drone", color: "#3fe0e8" },
      // open the customize menu (recolour the glow / rename) — no effect on needs
      { id: "style", type: "customize", label: "Style", icon: "palette", color: "#a97bff" },
    ],
    // Riding drains Energy; at 0 the critter keeps you on board but crawls (ride.empty:"slow")
    // → float to the Energy Pad (a station that only works while riding).
    ride: {
      adultsOnly: true, minEnergy: 15, fatigueNeed: "fuel", empty: "slow", emptySpeed: 0.3,
      sitY: -59, sitX: 4, nameY: -158,
      onMount: { joy: 8 },
      tooYoung: "{name} is still a hatchling, too small to ride.",
      tooTired: "{name} is too low on energy to carry you.",
      mountMessage: "{i:ride} Off you go on {name}!",
      dismountMessage: "You hop off {name}.",
      emptyMessage: "{i:battery} {name} is out of energy and slows right down: float to the Energy Pad!",
      jump: { distance: 170, cost: 6, minEnergy: 8, reward: 2, rewardMessage: "{i:jump} What a leap! +{r}", tooTired: "{name} is too tired to jump!" },
    },
    // Only PLAYING can trigger the joy celebration (not feeding or polishing).
    celebrate: { mode: "hop", actions: ["play"], particle: "star", colors: ["#fff2a8", "#ffd24a", "#a8e6ff", "#ff9ed8"], count: 9 },
    names: ["Zib", "Quor", "Lumi", "Vex", "Orbit", "Pulse", "Nova", "Echo", "Bly", "Pixl"],
    startCount: 3,
    // Two grown critters (ridable, can lay an egg) and one fresh hatchling (grows over ~4 cycles).
    // speedMul / grip / drainMul tune each critter as a mount (the Hatchery sells better ones).
    startCreatures: [{ name: "Zib", variant: "aqua", age: 6, speedMul: 1, grip: 1, drainMul: 1 },
                     { name: "Lumi", variant: "rose", age: 5, speedMul: 0.95, grip: 1.05, drainMul: 1 },
                     { name: "Pulse", variant: "lime", age: 0 }],
  },

  /* ---- Race: a pseudo-3D "Comet Race" behind your critter (mounted action "Race") ---- */
  race: {
    time: 60, reward: 40, stat: "raceWin", hitPenalty: 3,
    sprite: "critter_back_aqua",          // fallback; each variant has its own rear view (variant.raceSprite)
    roadside: ["spire", "crystal", "crystal_b", "orblamp"], roadsideScale: 5,
    spriteZoom: 0.13, rideWidth: 0.34,     // ride frame width / screen width (a narrow drawing needs more)
    track: { segments: 900, speed: 0.9, steer: 2.4, centrifugal: 0.55 },
    obstacles: [
      { sprite: "beacon", every: 30, phase: 0, scale: 2.2, hw: 0.2, spread: 0.6 },
      { sprite: "asteroid", every: 46, phase: 18, scale: 3.2, hw: 0.3, spread: 0.45 },
    ],
    // a REAL race: 5 rival riders to overtake (you start last), ranking, results with a reward per place.
    // Rival robots: the keeper's rear view in their own accent colour (rider_rival_N, pre-rendered palettes).
    horizon: 0.42,                           // tall phones: more road, less empty sky
    // CHASE variant ("Escape"): a security drone starts behind and closes in; obstacles slow you, it catches up
    chase: {
      name: "the drone", sprite: "drone_back", front: "drone_front", scale: 5.5, icon: "drone",
      startGap: 28, skill: [0.9, 1.05], catchGap: 0.8,
      reward: 35, caughtReward: 3, stat: "chaseEscape",
      startMessage: "{i:drone} A security drone is after you! Reach the finish before it catches you!",
      hitMessage: "Bump! The drone is closing in…",
      caughtMessage: "{i:drone} Caught by {name}!",
      resultsTitle: "{i:drone} Escape",
      escapeMessage: "{i:trophy} You outran the drone!", escapeHint: "Finished in {t} s without being caught.",
      caughtTitle: "{i:drone} The drone caught you!", caughtHint: "Dodge the asteroids: every bump slows you down.",
      goLabel: "GO!",
    },
    rivals: {
      list: [
        { name: "Zip", sprite: "critter_back_violet", rider: "rider_rival_1", color: "#ff8a3d" },
        { name: "Nova", sprite: "critter_back_rose", rider: "rider_rival_2", color: "#5fd36a" },
        { name: "Pixel", sprite: "critter_back_lime", rider: "rider_rival_3", color: "#a06bff" },
        { name: "Comet", sprite: "critter_back_amber", rider: "rider_rival_4", color: "#ff5db1" },
        { name: "Orbit", sprite: "critter_back_aqua", rider: "rider_rival_5", color: "#ffd24a" },
      ],
      scale: 6.5, hw: 0.3, skill: [0.82, 0.97], gridGap: 3, gridFirst: 5, startGate: "start_gate", startGateScale: 17, lanes: [-0.62, 0.62],
      rewards: [40, 25, 15, 8, 5, 3],
      placeMessages: ["{i:trophy} You won the Comet Race!", "{i:star} 2nd place, so close!", "{i:star} 3rd: you made the podium!", "You finished {place}. Overtake more riders next time!"],
      resultsTitle: "{i:flag} Results",
      startMessage: "{i:flag} Overtake the 5 riders and cross the line first!",
      bumpMessage: "Bump! You hit {name}.",
      goLabel: "GO!",
    },
    colors: { sky: ["#0b1029", "#2a1d6e", "#7a3fc0"], sun: ["#ffd6ef", "#ff5db1"], sunPos: { x: 0.78, y: 0.55, r: 0.07 }, stars: { count: 110, color: "#e9f3ff" }, skyline: false, ground: "#0e1430",
              grass: ["#18214a", "#141c43"], road: ["#2e3b78", "#283470"], rumble: ["#3fe0e8", "#ff5db1"], lane: "#bff6ff", finish: ["#ffffff", "#1d2147"] },
    icons: { time: "timer", distance: "distance", speed: "speed", quit: "quit", left: "left", right: "right", place: "flag" },
    quitLabel: "Quit", hint: "Tap left or right to steer",
    startMessage: "{i:flag} 3… 2… 1… Go! Reach the finish before the timer runs out!",
    hitMessage: "Bump! −{n} s",
    winMessage: "{i:trophy} You won the Comet Race! +{r}",
    loseMessage: "{i:timer} Time's up! Try again!",
    quitMessage: "{i:flag} You left the race.",
  },

  /* ---- Zone (the nursery pen where critters roam; gates on both sides) ---- */
  zones: [
    { id: "pen", home: true, rect: { x: 520, y: 520, w: 600, h: 470 }, floor: "pen_floor",
      fence: true, gates: "right", gateA: 0.32, gateB: 0.6, label: "Nursery", labelLift: 26 },
  ],

  /* ---- Stations: one of each kind the engine supports ---- */
  stations: [
    // rest → next cycle (also reachable while riding)
    { type: "rest", x: 640, y: 1190, sprite: "pod_rest", scale: 0.8, label: "Recharge Pod", labelY: 34, glow: "#3fe0e8", whileRiding: true,
      box: { dx: -78, dy: -44, w: 156, h: 46 }, action: "nextDay", actionLabel: "Rest", icon: "moon", color: "#7b6cff", hint: "Sleep until the next cycle" },
    // shop (on foot only: buying + placing decorations)
    { type: "market", x: 1850, y: 610, sprite: "market", scale: 0.8, label: "Star Market", labelY: 34, glow: "#ffd24a",
      box: { dx: -86, dy: -50, w: 172, h: 52 }, action: "openShop", actionLabel: "Shop", icon: "shop", color: "#ffb43a", hint: "Nectar, decorations, new critters" },
    // a MENU station: paid restyle (also shakes off the drones) + a custom bubble bath
    { type: "salon", x: 1000, y: 1190, sprite: "salon", scale: 0.8, label: "Glow Salon", labelY: 34, glow: "#ff5db1",
      requireMounted: true, needMountMessage: "{i:ride} Ride a critter into the Glow Salon to pamper it!",
      box: { dx: -86, dy: -50, w: 172, h: 52 }, action: "menu", actionLabel: "Visit the salon", icon: "palette", color: "#ff5db1", hint: "Ride in: glow makeover or bubble bath",
      menu: { title: "{i:palette} Glow Salon", subtitle: "What would you like?",
        items: [
          { label: "Glow makeover", sub: "A new glow colour for the critter you ride (drones lose your trail!)", icon: "palette", price: 12, do: "restyle", highlight: "chase",
            title: "{i:palette} Glow makeover", subtitle: "Pick a new glow for {name}:", clearsChase: true,
            message: "{i:palette} {name} now glows {v}!", chaseMessage: "{i:palette} {name} glows {v} — the drones lost your trail!",
            noneMessage: "Ride a critter first, then come back for a makeover." },
          { label: "Bubble bath", sub: "The critter you ride gets all sparkly (+40)", icon: "sparkle", price: 10, do: "custom",
            onPick: (state, api) => {
              const c = api.ride;                                   // only the critter you came in on
              if (!c) return;
              if (c.shine >= 100) { api.message("{i:sparkle} " + c.name + " is already sparkling clean!"); return; }
              if (!api.spend(10)) return;
              c.shine = Math.min(100, (c.shine || 0) + 40);
              api.message("{i:sparkle} Bubble bath! " + c.name + " sparkles all over.");
              api.refreshHud(); api.save();
            } },
        ] } },
    // missions: deliveries with a pickup then a ground target; the "rare" one brings the drones
    { type: "dock", x: 1500, y: 960, sprite: "dock", scale: 0.8, label: "Delivery Dock", labelY: 34, glow: "#6ef0a0", whileRiding: true,
      box: { dx: -86, dy: -50, w: 172, h: 52 }, action: "missions", actionLabel: "Take a delivery", icon: "crate", color: "#6ef0a0", hint: "Deliver star crates for shards" },
    // models: buy special critters with mount stats
    { type: "hatchery", x: 2220, y: 610, sprite: "hatchery", scale: 0.8, label: "Hatchery", labelY: 34, glow: "#a97bff", whileRiding: true,
      box: { dx: -80, dy: -48, w: 160, h: 50 }, action: "models", actionLabel: "See rare critters", icon: "egg", color: "#a97bff", hint: "Rare critters: faster, nimbler" },
    // custom station that ONLY works while riding: recharge the critter you ride
    { type: "pad", x: 1500, y: 1530, sprite: "energy_pad", scale: 0.8, label: "Energy Pad", labelY: 30, glow: "#3fe0e8",
      box: false, requireMounted: true, needMountMessage: "{i:ride} Ride a critter onto the pad to recharge it!",
      action: "custom", actionLabel: "Recharge (6)", icon: "pad", color: "#3fe0e8", hint: "Recharge the critter you ride",
      onUse: (state, api) => {
        const c = api.ride;
        if (c.fuel >= 100) { api.message("{i:battery} " + c.name + " is already full of energy!"); return; }
        if (!api.spend(6)) return;
        c.fuel = 100;
        api.message("{i:pad} " + c.name + " is fully recharged!");
        api.refreshHud(); api.save();
      } },
    // spawn: wild critters float in through the wormhole (up to a cap)
    { type: "portal", x: 1450, y: 610, sprite: "portal", scale: 0.8, label: "Wormhole", labelY: 30, glow: "#a97bff", anim: "pulse",
      box: { dx: -80, dy: -40, w: 160, h: 42 }, action: "spawn", actionLabel: "Call a critter", icon: "portal", color: "#a97bff", hint: "A wild critter may float in",
      spawn: { min: 1, max: 1, cap: "capacity", from: { x: 1450, y: 650 }, message: "{i:portal} A wild critter floated in!", fullMessage: "The nursery is full, no more room for now." } },
  ],

  /* ---- Economy + Star Market + decorations ---- */
  economy: { startCoins: 30, startResources: { nectar: 6 }, startCapacity: 5, dayReward: 4 },
  shop: {
    title: "{i:shop} Star Market",
    resources: [{ id: "nectar", name: "Star nectar", desc: "Feeds one critter", icon: "nectar", price: 3, amount: 2, boughtMessage: "{i:nectar} +2 star nectar!" }],
    capacity: { name: "Bigger nursery", icon: "stall", price: 60, boughtMessage: "{i:stall} One more place in the nursery!" },
    decorHeading: "{i:gift} Decorations",
    buyCreature: { price: 35, heading: "{i:critter} New critter", label: "Adopt a critter", hint: "It hops into the nursery", icon: "critter", img: "assets/ui/critter_violet.webp",
                   boughtMessage: "{i:joy} Welcome, {name}!" },
    fullMessage: "The nursery is full! Make it bigger first.",
  },
  decor: [
    { id: "crystal", name: "Pink crystal", sprite: "crystal", price: 18, scale: 0.7, allowInHome: true, collision: { dx: -34, dy: -16, w: 68, h: 20 } },
    { id: "crystal_b", name: "Blue crystal", sprite: "crystal_b", price: 18, scale: 0.7, allowInHome: true, collision: { dx: -34, dy: -16, w: 68, h: 20 } },
    { id: "plant", name: "Glow plant", sprite: "alienplant", price: 12, scale: 0.75, allowInHome: true },
    { id: "lamp", name: "Orb lamp", sprite: "orblamp", price: 14, scale: 0.65, allowInHome: true, collision: { dx: -14, dy: -10, w: 28, h: 14 } },
    { id: "ball", name: "Star ball", sprite: "starball", price: 8, scale: 0.6, allowInHome: true },
    { id: "fountain", name: "Stardust fountain", sprite: "fountain", price: 40, scale: 0.75, allowInHome: true, collision: { dx: -66, dy: -28, w: 132, h: 32 } },
  ],

  /* ---- Gravity Park (arena with jump beams) + Star Ring (a road around the station, through an asteroid belt) ---- */
  environment: {
    band: 440,
    arena: { rect: { x: 1820, y: 1100, w: 480, h: 500 }, tile: "arena_floor", label: "Gravity Park", fence: true, gates: "left", gateA: 0.35, gateB: 0.65,
             obstacleSprite: "beam_v", obstacleScale: 1, obstacleBox: { dx: -18, dy: -170, w: 36, h: 170 },
             obstacles: [{ x: 1950, y: 1300 }, { x: 2080, y: 1300 }, { x: 2210, y: 1300 }, { x: 1950, y: 1570 }, { x: 2080, y: 1570 }, { x: 2210, y: 1570 }] },
    // the "forest" rule scatters an asteroid belt in the void, with guard rails along the road
    forest: { tree: "rock", bush: "bollard", step: 60, hedgeMargin: 42, treeScale: [0.55, 0.95], bushScale: [0.8, 0.9], hedgeBox: { dx: -30, dy: -8, w: 60, h: 12 },
              treeBox: "fit" },   // the asteroid belt is solid, each rock fitted to its drawing: no walking in space or through them
    path: { width: 160, sand: 12, inset: 90, tile: "road", label: "Star Ring", labelY: 170,
            openings: [{ x: 200, y: 1410, w: 440, h: 160 }, { x: 2160, y: 830, w: 440, h: 160 }],
            logs: { xs: [640, 1040, 1440, 1840, 2240], dec: 0, sprite: "comet_rock", scale: 1 } },
  },

  /* ---- Deliveries: pick a crate up, bring it to a ground target. Rare cargo → drones chase you.
     Each offer may override the mission-wide settings (per-offer overrides): the star post is ONE leg
     (pickups:false), the express and the egg have their own messages, the egg counts its own stat
     (an unlock) and is the one errand the drones can still ruin (caughtKeepsMission:false). ---- */
  missions: {
    title: "{i:crate} Delivery Dock", subtitle: "Pick a delivery:",
    stat: "jobs", radius: 80, color: "#6ef0a0", marker: "crate", markerScale: 0.6,
    offers: [
      { id: "easy", label: "Easy delivery", sub: "Fetch the crate, drop it on the target: {i:shard} 15", icon: "crate", pay: 15 },
      { id: "post", label: "Star post", sub: "Fly a little gift straight to its ring: {i:shard} 10", icon: "gift", pay: 10, pickups: false,
        takenMessage: "{i:gift} Star post for {d}! Follow the arrow.", doneMessage: "{i:check} Post delivered! +{p}" },
      { id: "express", label: "Express parcel", sub: "{i:shard} 25 — one drone will try to pinch some shards {i:drone}", icon: "crate", pay: 25, heat: 1,
        hotPickedMessage: "{i:drone} Got the parcel… a drone is coming! Hurry to {d}!" },
      { id: "egg", label: "Rare comet egg", sub: "{i:shard} 40 — but snatcher drones chase you once you hold it {i:drone}{i:drone}", icon: "drone", pay: 40, heat: 2,
        stat: "eggRuns", caughtKeepsMission: false, caughtMessage: "{i:drone} The drones snatched the egg! −{f}",
        hotPickedMessage: "{i:drone} Got the egg… here come the drones! Hurry to {d}!", doneMessage: "{i:egg} The comet egg is safe! +{p}" },
    ],
    pickups: [{ x: 860, y: 170, name: "the north ring" }, { x: 2630, y: 1300, name: "the east ring" },
              { x: 420, y: 1490, name: "the west dock" }, { x: 2100, y: 1930, name: "the south ring" }, { x: 2050, y: 760, name: "the shop street" }],
    target: "target", targetScale: 1, cargoIcon: "crate", cargoLabel: "Crate",
    dests: [{ x: 760, y: 1400, name: "the habitat yard" }, { x: 170, y: 800, name: "the west ring" }, { x: 1300, y: 1180, name: "the plaza" },
            { x: 1500, y: 1930, name: "the south ring" }, { x: 2630, y: 400, name: "the north-east ring" }, { x: 1700, y: 1450, name: "the park gate" }],
    takenMessage: "{i:crate} Fetch the crate at {p}. Follow the arrow!",
    pickedMessage: "{i:crate} Got it! Bring it to the target: {d}.",
    hotPickedMessage: "{i:drone} Got it… here come the drones! Hurry to {d}!",
    doneMessage: "{i:check} Delivered! +{p}",
    busyMessage: "{i:crate} Finish your current delivery first!",
    clearsChase: true, chaseEndMessage: "{i:drone} Delivered — the drones give up and fly home.",
  },

  /* ---- Snatcher drones (gentle chase): stay away from them, or get a makeover at the salon.
     caughtKeepsMission: a drone only pinches a few shards and flies off, the delivery goes on
     (the rare egg offer overrides it: there, the drones snatch the egg) ---- */
  chase: {
    sprite: "drone", dirSheet: { cols: 2 }, scale: 0.8, originY: 0.7, icon: "drone", label: "Drones",
    maxLevel: 3, maxUnits: 2, speed: 210, catchRadius: 60, catchSeconds: 3.5,
    loseRadius: 720, loseAfter: 6, fine: 12, spawnDist: 620,
    escapedMessage: "{i:drone} You left the drones behind!",
    caughtKeepsMission: true, caughtMessage: "{i:drone} A drone pinched {f} shards and flew off. Keep going!",
  },

  /* ---- Hatchery: rare critters with better mount stats ---- */
  models: {
    title: "{i:egg} Hatchery", subtitle: "Rare critters are faster in the world AND in the race",
    stats: [{ key: "speedMul", icon: "speed" }, { key: "grip", icon: "grip" }, { key: "drainMul", icon: "range", invert: true }],
    items: [
      { id: "sprinter", name: "Comet Sprinter", price: 90, variant: "amber", speedMul: 1.2, grip: 1.05, drainMul: 0.95, desc: "Quick on its feet" },
      { id: "glider", name: "Nebula Glider", price: 180, variant: "violet", speedMul: 1.3, grip: 1.25, drainMul: 0.85, desc: "Smooth and nimble" },
      { id: "royal", name: "Star Royal", price: 320, variant: "rose", speedMul: 1.5, grip: 1.35, drainMul: 0.8, desc: "The fastest critter in the galaxy" },
    ],
    boughtMessage: "{i:egg} {name} hatched for you! Go and ride it.",
    fullMessage: "The nursery is full! Make it bigger at the Star Market.",
  },

  /* ---- Ambient scenery (crystals, alien plants) with a little life ---- */
  scenery: [
    // Delivery Plaza: landing pad with a parked shuttle, cargo, neon signs
    { x: 1640, y: 1170, sprite: "landing_pad", ground: true, scale: 0.9 },
    { x: 1640, y: 1200, sprite: "shuttle", scale: 0.7, box: { dx: -70, dy: -26, w: 140, h: 30 } },
    { x: 1310, y: 960, sprite: "container", scale: 0.6, box: { dx: -56, dy: -24, w: 112, h: 28 } },
    { x: 1700, y: 960, sprite: "container", scale: 0.55, flip: true, box: { dx: -52, dy: -22, w: 104, h: 26 } },
    { x: 1270, y: 1250, sprite: "neon_sign", scale: 0.6, glow: "#ff5db1", glowY: 90, box: { dx: -12, dy: -8, w: 24, h: 12 } },
    { x: 1270, y: 830, sprite: "neon_sign", scale: 0.6, glow: "#3fe0e8", glowY: 90, box: { dx: -12, dy: -8, w: 24, h: 12 } },
    // shop street lamps + an antenna by the habitats
    { x: 1660, y: 670, sprite: "orblamp", scale: 0.55, glow: "#ffe68a", glowY: 75, box: { dx: -12, dy: -8, w: 24, h: 12 } },
    { x: 2050, y: 670, sprite: "orblamp", scale: 0.55, glow: "#ffe68a", glowY: 75, box: { dx: -12, dy: -8, w: 24, h: 12 } },
    { x: 820, y: 1410, sprite: "antenna", scale: 0.65, anim: "sway", box: { dx: -20, dy: -12, w: 40, h: 16 } },
    { x: 2280, y: 960, sprite: "container", scale: 0.55, box: { dx: -52, dy: -22, w: 104, h: 26 } },
    // a little greenery in the habitat corner
    { x: 500, y: 1050, sprite: "alienplant", scale: 0.65, anim: "sway", box: false },
    { x: 1180, y: 1420, sprite: "crystal_b", scale: 0.55, glow: "#8ff6ff", anim: "pulse", box: { dx: -28, dy: -12, w: 56, h: 16 } },
    { x: 1800, y: 1000, sprite: "crystal", scale: 0.5, glow: "#ff8fd8", anim: "pulse", box: { dx: -24, dy: -12, w: 48, h: 16 } },
  ],

  /* ---- Unlocks: the nursery grows richer as you play (no reading needed) ---- */
  unlocks: [
    { id: "ball", when: { stat: "play", atLeast: 3 }, message: "{i:gift} A new toy appeared in the nursery!",
      scenery: { x: 820, y: 760, sprite: "starball", scale: 0.6, anim: "bob", box: { dx: -18, dy: -10, w: 36, h: 14 } } },
    { id: "lamps", when: { stat: "feed", atLeast: 4 }, message: "{i:gift} Cosy orb lamps light up the way!",
      scenery: { x: 1180, y: 850, sprite: "orblamp", scale: 0.7, glow: "#ffe68a", glowY: 90, box: { dx: -14, dy: -10, w: 28, h: 14 } } },
    { id: "fountain", when: { stat: "polish", atLeast: 3 }, message: "{i:gift} A stardust fountain for the critters!",
      scenery: { x: 1250, y: 1440, sprite: "fountain", scale: 0.7, glow: "#ff8fd8", glowY: 70, box: { dx: -62, dy: -28, w: 124, h: 32 } } },
    { id: "spire", when: { stat: "jump", atLeast: 3 }, message: "{i:jump} A crystal spire grows by the Gravity Park!",
      scenery: { x: 1760, y: 1640, sprite: "spire", scale: 1, glow: "#8ff6ff", glowY: 90, box: { dx: -18, dy: -12, w: 36, h: 16 } } },
    { id: "rich", when: { coins: 120 }, message: "{i:shard} So many shards — a golden crystal appears!",
      scenery: { x: 520, y: 1100, sprite: "crystal", scale: 0.8, glow: "#ffd24a", anim: "pulse", box: { dx: -36, dy: -16, w: 72, h: 20 } } },
    { id: "eggnest", when: { stat: "eggRuns", atLeast: 1 }, message: "{i:egg} The rare egg is safe — a blue crystal grows by the Delivery Dock!",
      scenery: { x: 1395, y: 1050, sprite: "crystal_b", scale: 0.7, glow: "#8ff6ff", glowY: 70, anim: "pulse", box: { dx: -34, dy: -16, w: 68, h: 20 } } },
    { id: "family", when: (s) => (s.stats.births || 0) >= 1, message: "{i:egg} A glow plant blooms for the new hatchling!",
      scenery: { x: 1080, y: 560, sprite: "alienplant", scale: 0.65, anim: "sway", box: false } },
  ],

  /* ---- Objectives: four levels that walk through every system ---- */
  objectives: {
    extraStats: ["ride", "jump", "trailVisit", "earned"],
    levels: [
      { name: "Caretaker", goals: [
        { id: "feed1", name: "First charge", desc: "Feed a critter {i:nectar}", check: (s) => s.stats.feed >= 1 },
        { id: "play1", name: "Playtime", desc: "Play with a critter {i:ball}", check: (s) => s.stats.play >= 1 },
        { id: "polish1", name: "Sparkle clean", desc: "Polish a critter {i:polish}", check: (s) => s.stats.polish >= 1 },
        { id: "happy", name: "All aglow", desc: "Get a critter's mood fully up", check: (s) => s.creatures.some((c) => (c.fuel + c.shine + c.joy) / 3 >= 85) },
      ] },
      { name: "Courier", goals: [
        { id: "ride1", name: "Hop on!", desc: "Ride a grown critter {i:ride}", check: (s) => (s.stats.ride || 0) >= 1 },
        { id: "job1", name: "First delivery", desc: "Fetch a crate and drop it on its target {i:crate}", check: (s) => (s.stats.jobs || 0) >= 1 },
        { id: "trail", name: "Star Ring", desc: "Ride out onto the Star Ring", check: (s) => (s.stats.trailVisit || 0) >= 1 },
        { id: "job3", name: "Busy courier", desc: "Make 3 deliveries {i:crate}", check: (s) => (s.stats.jobs || 0) >= 3 },
      ] },
      { name: "Racer", goals: [
        { id: "race1", name: "Comet racer", desc: "Finish a race on the podium {i:flag}", check: (s) => (s.stats.racePodium || 0) >= 1 || (s.stats.raceWin || 0) >= 1 },
        { id: "jump3", name: "Gravity Park", desc: "Jump 3 obstacles {i:jump}", check: (s) => (s.stats.jump || 0) >= 3 },
        { id: "decor1", name: "Decorator", desc: "Place a decoration {i:gift}", check: (s) => (s.stats.decor || 0) >= 1 },
        { id: "earn200", name: "Shard saver", desc: "Earn 200 {i:shard} in total", check: (s) => (s.stats.earned || 0) >= 200 },
      ] },
      { name: "Star Keeper", goals: [
        { id: "rare", name: "Rare friend", desc: "Get a critter from the Hatchery {i:egg}", check: (s) => (s.creatures || []).some((c) => c.model) },
        { id: "egg1", name: "A new hatchling", desc: "Have an egg hatch {i:egg}", check: (s) => (s.stats.births || 0) >= 1 },
        { id: "job8", name: "Star courier", desc: "Make 8 deliveries {i:crate}", check: (s) => (s.stats.jobs || 0) >= 8 },
        { id: "race3", name: "Champion", desc: "Win 3 races {i:flag}", check: (s) => (s.stats.raceWin || 0) >= 3 },
        { id: "escape1", name: "Slippery", desc: "Outrun the drone in an Escape {i:drone}", check: (s) => (s.stats.chaseEscape || 0) >= 1 },
      ] },
    ],
  },

  /* ---- Help screen ---- */
  help: [
    "<b>Welcome to Nebula Station!</b> Look after your critters, ride them around the station and make deliveries. This demo shows everything the engine can do.",
    "{i:hand} <b>Move:</b> tap the floor — your keeper floats there, around obstacles (double-tap to run). Tap a critter or a building to use it. (Keyboard: arrows or WASD/ZQSD.)",
    "{i:heart} <b>Care:</b> {i:battery} Energy (Feed, costs {i:nectar} nectar), {i:ball} Fun (Play) and {i:sparkle} Sparkle (Polish — zoom in and rub the dust away). A full Fun makes a critter beam with happy eyes!",
    "{i:crate} <b>Deliveries:</b> at the <b>Delivery Dock</b>, pick a job. Follow the arrow to the crate, pick it up, then drop it on the glowing target ({i:gift} a star post gift goes straight to its target). Express and rare jobs pay more but {i:drone} drones chase you: a drone that catches you pinches a few shards, and the drones snatch a rare egg! Outrun them, or ride into the {i:palette} <b>Glow Salon</b> for a makeover.",
    "{i:ride} <b>Ride:</b> hop on a grown critter, cruise the <b>Star Ring</b> road and {i:jump} jump the comet rocks and the beams of the <b>Gravity Park</b>. Riding uses Energy: recharge on the {i:pad} <b>Energy Pad</b>.",
    "{i:flag} <b>Race:</b> while riding, tap Race. You start behind 5 rival riders: steer left and right to overtake them and dodge the asteroids. The higher you finish, the more you win! {i:drone} <b>Escape:</b> a security drone starts behind you, reach the finish before it catches you.",
    "{i:shop} <b>Star Market:</b> nectar, a bigger nursery, decorations and new critters. {i:egg} <b>Hatchery:</b> rare, faster critters. {i:portal} <b>Wormhole:</b> call a wild critter.",
    "{i:moon} <b>Recharge Pod:</b> rest to reach the next cycle. Two happy grown critters may lay an egg overnight!",
    "{i:goals} <b>Goals:</b> four levels to complete. The game saves automatically.",
  ],
};
