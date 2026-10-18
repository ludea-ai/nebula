/* =========================================================
   Generic top-down 2D game engine — Phaser 3.
   Data-driven: this file contains NO game-specific content.
   A game is defined entirely by a global `GAME` config object
   (see game.config.js and ENGINE.md for the schema), plus its
   assets. Swap the config + assets to get a different game.
   100% static (browser save). No build step.
   ========================================================= */

"use strict";

// Surface any uncaught error on-screen. A thrown error inside Phaser's update loop
// silently freezes the game (the canvas stops, DOM panels stay) — exactly the kind of
// device-only "it's stuck" report that's invisible without this. Tap the bar to dismiss.
(function () {
  function show(msg) {
    let el = document.getElementById("err-overlay");
    if (!el) {
      el = document.createElement("div"); el.id = "err-overlay";
      el.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(176,28,40,0.96);color:#fff;font:12px/1.45 ui-monospace,monospace;padding:10px 12px calc(10px + env(safe-area-inset-bottom));white-space:pre-wrap;max-height:45vh;overflow:auto";
      el.addEventListener("click", function () { el.remove(); });
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = "⚠ " + msg + "\n\n(tap to dismiss — please screenshot this)";
  }
  window.addEventListener("error", function (e) {
    // Opaque errors ("Script error.", no file/line) come from scripts the page does not own
    // (Safari extensions, content blockers, translation, injected scripts): the browser hides
    // their details and they don't affect the game → log only. Same for other origins.
    const file = String(e.filename || "");
    if ((!file && !e.error && /^(script error\.?)?$/i.test(String(e.message || "").trim())) ||
        (file && !/^https?:/i.test(file)) || (file && file.indexOf(location.origin) !== 0)) {
      try { console.warn("ignored foreign error:", e.message, file); } catch (_) {}
      return;
    }
    show((e.message || "error") + (e.filename ? (" @ " + String(e.filename).split("/").pop() + ":" + e.lineno + ":" + e.colno) : ""));
  });
  window.addEventListener("unhandledrejection", function (e) {
    show("promise rejection: " + ((e.reason && (e.reason.stack || e.reason.message)) || e.reason || "?"));
  });
})();

// iOS home-screen apps (standalone + black-translucent status bar): WebKit reports a
// viewport SHORTER than the screen by the status-bar height at launch (100dvh, fixed
// inset:0 and innerHeight stop short → a plain band at the bottom), then may silently
// correct it later without a resize event. So never trust the reported height there:
// a standalone app always fills the whole screen → pin the full-screen layers to the
// PHYSICAL screen height (`html.ios-app` + --app-h, see engine.css).
(function () {
  if (navigator.standalone !== true || !window.screen) return;
  const root = document.documentElement;
  root.classList.add("ios-app");
  function fit() {
    const portrait = window.matchMedia ? window.matchMedia("(orientation: portrait)").matches : window.innerHeight >= window.innerWidth;
    const h = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    root.style.setProperty("--app-h", h + "px");
  }
  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", function () { setTimeout(fit, 300); });
  window.addEventListener("pageshow", fit);
})();

// iOS scrolls the DOCUMENT behind our fixed layers (rubber-band, a focused input lifted
// above the keyboard, a viewport resize) and often leaves it scrolled → every layer shifts
// and the page background shows as a band. The game never scrolls the document: snap it
// back whenever it moves (scroll, keyboard closed, viewport change, back to foreground).
(function () {
  const reset = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
  const later = () => { reset(); setTimeout(reset, 80); setTimeout(reset, 350); };
  window.addEventListener("scroll", reset, { passive: true });
  document.addEventListener("focusout", later);
  window.addEventListener("orientationchange", later);
  window.addEventListener("pageshow", later);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", later);
})();

// Edge colour: whatever iOS shows outside our layers (behind the toolbars, a band while
// the viewport settles) uses the page background → match it to the screen on display
// (html[data-screen] + --edge-* theme variables in engine.css / style.css).
function syncEdge() {
  const vis = (id) => { const e = document.getElementById(id); return e && !e.classList.contains("hidden"); };
  const scr = vis("closeup") ? "closeup" : vis("screen-game") ? "game" : vis("screen-create") ? "create" : "home";
  if (document.documentElement.dataset.screen !== scr) document.documentElement.dataset.screen = scr;
}
document.addEventListener("DOMContentLoaded", function () {
  syncEdge();
  if (!window.MutationObserver) return;
  const mo = new MutationObserver(syncEdge);
  ["screen-home", "screen-create", "screen-game", "closeup"].forEach((id) => {
    const e = document.getElementById(id); if (e) mo.observe(e, { attributes: true, attributeFilter: ["class"] });
  });
});

// The whole game definition lives here (set by game.config.js, loaded first).
const G = window.GAME;
if (!G) throw new Error("engine.js: window.GAME is missing — load game.config.js before engine.js");

/* ===================== Languages (config-gated: GAME_I18N) ===================== */
// A game is written in ONE source language (meta.lang, default "en"). Other languages live in
// game.i18n.js, loaded between game.config.js and engine.js:
//   window.GAME_I18N = { fr: { "Source text": "Texte traduit", ... } }
// keyed by the EXACT source string (config strings AND the engine's own English fallbacks).
// The active language = saved choice > browser language > meta.lang. The whole GAME object is
// translated once here, before anything reads it, so every system stays language-agnostic.
// A missing entry falls back to the source text. A non-English game may also give its own
// language a section that only translates the engine's English fallbacks. Tool: _shared/i18n-extract.cjs.
const I18N = window.GAME_I18N || {};
const SRC_LANG = (G.meta && G.meta.lang) || "en";
const LANG_ORDER = ["fr", "en"];   // display order of the flags (others after, alphabetical)
const LANGS = [SRC_LANG].concat(Object.keys(I18N).filter((l) => l !== SRC_LANG && Object.keys(I18N[l]).some((k) => I18N[l][k])))
  .filter((l, i, a) => a.indexOf(l) === i)
  .sort((a, b) => ((LANG_ORDER.indexOf(a) + 1 || 99) - (LANG_ORDER.indexOf(b) + 1 || 99)) || a.localeCompare(b));
const LANG_KEY = ((G.meta && G.meta.saveKey) || "game") + "-lang";
const LANG = (function () {
  let l = null; try { l = localStorage.getItem(LANG_KEY); } catch (_) {}
  if (l && LANGS.indexOf(l) >= 0) return l;
  const nav = (navigator.languages || [navigator.language || ""]).map((x) => String(x).slice(0, 2).toLowerCase());
  return nav.find((x) => LANGS.indexOf(x) >= 0) || SRC_LANG;
})();
const DICT = I18N[LANG] || null;   // for the source language it only holds the engine fallbacks (when not English)
function L(s) { return DICT && typeof s === "string" && DICT[s] != null && DICT[s] !== "" ? DICT[s] : s; }
// Keys that hold identifiers / asset refs, never text: never translated.
const I18N_SKIP = /^(id|ids|saveKey|legacySave|audience|author|url|href|assetVersion|path|src|sheet|sprite|img|image|thumb|icon|color|tint|stat|need|type|kind|mode|font|key|lang)$|(Id|Ids|Sheet|Sprite|Icon|Bg|BgDone|BgWide|BgWideDone|Img|Color|Path|Key)$/;
(function tr(o, d) {
  if (!DICT || !o || d > 14) return;
  for (const k in o) {
    const v = o[k];
    if (typeof v === "string") { if (!I18N_SKIP.test(k)) o[k] = L(v); }
    else if (v && typeof v === "object" && !I18N_SKIP.test(k)) tr(v, d + 1);
  }
})(G, 0);
try { document.documentElement.lang = LANG; } catch (_) {}
// Round flag for a language code (language switch). A game may supply GAME.icons["flag_xx"].
const FLAG_SVG = {
  fr: '<rect width="30" height="30" fill="#fff"/><rect width="10" height="30" fill="#002395"/><rect x="20" width="10" height="30" fill="#ed2939"/>',
  en: '<rect width="30" height="30" fill="#012169"/><path d="M-6 0L36 30M36 0L-6 30" stroke="#fff" stroke-width="6"/><path d="M-6 0L36 30M36 0L-6 30" stroke="#c8102e" stroke-width="2.4"/><path d="M15 0v30M0 15h30" stroke="#fff" stroke-width="9"/><path d="M15 0v30M0 15h30" stroke="#c8102e" stroke-width="5"/>',
};
function flagHTML(l) {
  const ic = G.icons && G.icons["flag_" + l];
  if (ic) return `<img class="flag" src="${av(ic)}" alt="" draggable="false" />`;
  if (FLAG_SVG[l]) return `<svg class="flag" viewBox="0 0 30 30" aria-hidden="true">${FLAG_SVG[l]}</svg>`;
  return `<span class="flag flag-txt">${esc(l.toUpperCase())}</span>`;
}
function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (_) {} location.reload(); }

// Asset cache-busting version (bump when an IMAGE changes, to force reload).
const ASSET_VER = (G.meta && G.meta.assetVersion) || "v1";
function av(p) { return p + "?v=" + ASSET_VER; }

// Stale page guard: GitHub Pages serves index.html with max-age=600, so after a deploy
// iOS can keep running the previous page (and its ?v= files) for up to 10 minutes — the
// <meta no-cache> tags don't change HTTP caching. Ask the server (no-store) which build
// is live; if it differs, reload once with a fresh URL. Also re-checked when the app
// comes back to the foreground. The save is untouched.
(function () {
  if (!window.fetch || !/^https?:/.test(location.protocol)) return;
  let tried = false;
  try { tried = sessionStorage.getItem("engine-fresh-try") === ASSET_VER; } catch (_) {}
  function check() {
    fetch(location.pathname + "?vcheck=" + Date.now(), { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        const m = /engine\.js\?v=([\w.-]+)/.exec(t || "");
        if (!m || m[1] === ASSET_VER || tried) return;
        tried = true;
        try { sessionStorage.setItem("engine-fresh-try", ASSET_VER); } catch (_) {}
        const u = new URL(location.href); u.searchParams.set("fresh", Date.now());
        location.replace(u.toString());
      }).catch(() => {});
  }
  check();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
})();

// iOS ignores user-scalable=no: block pinch-zoom and double-tap zoom here
// (otherwise tapping a button zooms the screen). Double-tap to RUN still works
// (it relies on two pointerdown events, unaffected by this).
["gesturestart", "gesturechange", "gestureend"].forEach((ev) =>
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

/* ===================== Config shortcuts ===================== */

const META = G.meta || {};
const WORLD = G.world || { width: 2800, height: 2100 };
WORLD.w = WORLD.width; WORLD.h = WORLD.height;            // internal short aliases
const CHARACTERS = G.characters || [];
const CREATURE = G.creature || null;                      // creature system (optional)
const VARIANTS = (CREATURE && CREATURE.variants) || [];
const NEEDS = (CREATURE && CREATURE.needs) || [];
const ACTIONS = (CREATURE && CREATURE.actions) || [];
const DECOR = G.decor || [];
const STATIONS = G.stations || [];
const ZONES = G.zones || [];
const SHOP = G.shop || {};
const ECON = G.economy || {};
const LEVELS = (G.objectives && G.objectives.levels) || [];
const ENV = G.environment || null;
const UNLOCKS = G.unlocks || [];
const GUIDE = G.guide || null;                            // optional "where to go" arrow (kids)
const RENDER = G.render || {};                            // rendering / look & feel options
// The "/capacity" suffix on the creature count is only meaningful when the group
// size can actually change (breeding, a spawn station, or a capacity shop). With
// none of those it's a fixed cap the player can't act on, so show the bare count.
// META.showCapacity forces it on/off; otherwise auto-detect.
const CAP_GROWS = !!((CREATURE && CREATURE.breeding && CREATURE.breeding.enabled) ||
  STATIONS.some((s) => s.action === "spawn") || SHOP.capacity);
const SHOW_CAP = META.showCapacity != null ? !!META.showCapacity : CAP_GROWS;
const MOOD_NEED = (CREATURE && CREATURE.moodNeed) || null;
const MOOD_SHAPE = (CREATURE && CREATURE.moodIcon) || "heart";  // particle shape of the mood indicator
const WANT = (CREATURE && CREATURE.wantBubble) || null;         // optional "needs care" bubble (image) replacing the mood shape
const ALL_HAPPY = (CREATURE && CREATURE.allHappy) || null;      // optional day-arc reward when every creature is happy at rest
const PLAYER_NAME_Y = (G.player && G.player.nameY != null) ? G.player.nameY : -80;  // y offset of the player's name label (above the head)

// Primary playable zone where creatures roam (first zone flagged home, else first).
const HOME_ZONE = ZONES.find((z) => z.home) || ZONES[0] || null;

// Rendering: pixel-art (nearest, rounded) or smooth hi-res art; HiDPI canvas.
const PIXEL_ART = RENDER.pixelArt !== false;
const DPR = Math.max(1, Math.min(RENDER.maxDpr || 3, window.devicePixelRatio || 1));
const TEXT_RES = Math.max(1, Math.ceil(DPR * Math.max(1, (G.camera && G.camera.max) || 1)));

// UI strings: every label has an English fallback; a game overrides any of them in
// META.strings (or, for back-compat, directly on META). {vars} are interpolated.
function T(key, fallback, vars) {
  let s = (META.strings && META.strings[key] != null) ? META.strings[key] : (META[key] != null ? META[key] : L(fallback));
  if (vars) Object.keys(vars).forEach((k) => { s = String(s).split("{" + k + "}").join(vars[k]); });
  return s;
}

/* ===================== Icons ===================== */
// GAME.icons = { key: "assets/ui/icons/key.png", … } — illustrated icons used everywhere
// (HUD, buttons, panel, toasts, help, close-up). Any text in the config can embed one
// with a {i:key} token. Unknown keys fall back to a built-in monochrome glyph, then to
// the raw text (so legacy emoji configs keep working).
const ICONS = G.icons || {};
const ICON_SVG = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M4 12.5l5 5L20 6.5"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>', resume: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 1 1 3.6 2.8c-.8.3-.8.9-.8 1.6M12 17.2v.3"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  soundOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  avatar: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  star: '<path d="M12 3.5l2.6 5.6 6 .6-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.4 9.7l6-.6z" fill="currentColor"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/>',
  heartEmpty: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  arrow: '<path d="M12 3v15M5.5 12.5L12 19l6.5-6.5"/>', hand: '<path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L4 15.5a1.5 1.5 0 0 1 2.5-1.6L9 16"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>', calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20h7"/>',
  home: '<path d="M4 11l8-7 8 7M6.5 9.5V20h11V9.5"/>', gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S12 9 12 9zm0 0c2-4 6-4 6-1.5S12 9 12 9z"/>',
};
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }
function iconHTML(k, cls) {
  if (!k) return "";
  const c = "ico" + (cls ? " " + cls : "");
  if (ICONS[k]) return `<img class="${c}" src="${av(ICONS[k])}" alt="" draggable="false" />`;
  if (/\.(png|svg|webp|jpg)$/i.test(k)) return `<img class="${c}" src="${av(k)}" alt="" draggable="false" />`;
  if (ICON_SVG[k]) return `<svg class="${c} ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[k]}</svg>`;
  return `<span class="${c} ico-text">${esc(k)}</span>`;
}
// Escape a config/user string, then expand {i:key} icon tokens. html=true keeps markup (help).
function fmt(s, html) { return (html ? String(s == null ? "" : s) : esc(s)).replace(/\{i:([\w-]+)\}/g, (_, k) => iconHTML(k)); }
function coinTok() { const k = META.coinIcon || "star"; return (ICONS[k] || ICON_SVG[k]) ? "{i:" + k + "}" : k; }
function stripIcons(s) { return String(s == null ? "" : s).replace(/\{i:[\w-]+\}\s*/g, "").trim(); }
// A button: optional leading icon + label (the label may also carry {i:key} tokens).
function btnHTML(label, icon) {
  const hasTok = /\{i:/.test(label || "");
  return (hasTok ? "" : (icon ? iconHTML(icon, "btn-ico") : "")) + `<span>${fmt(label)}</span>`;
}

/* ===================== Stats / objectives ===================== */

// The set of counters tracked in state.stats: one per action that declares a
// stat id, plus engine-tracked extras (births, decor placed, zone visits).
function statKeys() {
  const keys = new Set();
  ACTIONS.forEach((a) => { if (a.stat) keys.add(a.stat); });
  keys.add("births"); keys.add("decor");
  (G.objectives && G.objectives.extraStats || []).forEach((k) => keys.add(k));
  if (G.missions) { keys.add(G.missions.stat || "missions"); (G.missions.offers || []).forEach((o) => { if (o.stat) keys.add(o.stat); }); }
  if (G.race) keys.add(G.race.stat || "raceWin");
  return [...keys];
}
function freshStats() { const o = {}; statKeys().forEach((k) => (o[k] = 0)); return o; }

function currentLevel() { return LEVELS[Math.min((state.level || 1) - 1, LEVELS.length - 1)]; }
// level = number of fully-completed objective tiers (+1). Always derived from the
// objectives done, so it's robust (recomputed on load and after each objective).
function recalcLevel() {
  let n = 1;
  while (n < LEVELS.length && LEVELS[n - 1].goals.every((o) => state.goalsDone[o.id])) n++;
  state.level = n;
}

/* ===================== State ===================== */

let state = null;
const SAVE_KEY = META.saveKey || "generic-engine-save";

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(l) { return l[randInt(0, l.length - 1)]; }
function clamp01(v) { return Math.max(0, Math.min(100, Math.round(v))); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function $(id) { return document.getElementById(id); }
// iOS status-bar colour (Safari) = colour of the top of the current screen.
function themeColor(c) { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", c); }
const TINT_HOME = (META.theme && META.theme.home) || "#ffce8f";
const TINT_PLAY = (META.theme && META.theme.play) || "#b5572b";
function hexInt(hex) { return typeof hex === "number" ? hex : parseInt(String(hex).replace("#", ""), 16); }
// Asset resolution: an image/sheet drawn at N x its logical size (crisp on HiDPI phones)
// declares `res: N` in GAME.assets; the engine loads it full-size and displays it at its
// logical size. Images may be a path string or { path, res }.
// Character thumbnail: a path ("assets/ui/x.webp") or a bare name (legacy → assets/ui/<name>.png).
function thumbSrc(ch) { const t = (ch && ch.thumb) || ""; return av(/[./]/.test(t) ? t : "assets/ui/" + t + ".png"); }
function assetPath(k) { const v = G.assets && G.assets.images && G.assets.images[k]; return v ? (typeof v === "string" ? v : v.path) : null; }
function RES(k) {
  const a = G.assets || {}, im = a.images && a.images[k], sh = a.sheets && a.sheets[k];
  return (sh && sh.res) || (im && typeof im === "object" && im.res) || 1;
}
function nowMs() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

// Variant id of a creature (with migration of old/unknown values to the first one).
function variantId(c) {
  if (c && VARIANTS.some((v) => v.id === c.variant)) return c.variant;
  return VARIANTS.length ? VARIANTS[0].id : null;
}
function variantDef(id) { return VARIANTS.find((v) => v.id === id) || VARIANTS[0]; }
function charDef(id) { return CHARACTERS.find((p) => p.id === id) || CHARACTERS[0]; }

/* ===================== Creatures ===================== */

let idCounter = 1;
function nameUsed(name, except) {
  const list = (state && state.creatures) || [];
  return list.some((c) => c !== except && (c.name || "").toLowerCase() === name.toLowerCase());
}
function freeName() {
  const pool = (CREATURE && CREATURE.names) || ["One", "Two", "Three"];
  const avail = pool.filter((n) => !nameUsed(n, null));
  if (avail.length) return pick(avail);
  let base = pick(pool), i = 2;
  while (nameUsed(base + " " + i, null)) i++;
  return base + " " + i;
}
// A fresh variant, preferring one not already on screen (more variety, e.g. distinct kids).
function freshVariant() {
  if (!VARIANTS.length) return null;
  const used = new Set(((state && state.creatures) || []).map((c) => c.variant));
  const free = VARIANTS.filter((v) => !used.has(v.id));
  return pick(free.length ? free : VARIANTS).id;
}
function newCreature(o = {}) {
  const variant = o.variant || freshVariant();
  const vd = variant ? VARIANTS.find((v) => v.id === variant) : null;
  // a variant can carry its own fixed name (e.g. each child patient is a person)
  const nm = o.name || (vd && vd.fixedName && !nameUsed(vd.name, null) ? vd.name : freeName());
  const c = {
    id: idCounter++,
    name: nm,
    variant,
    age: o.age != null ? o.age : randInt((CREATURE.aging && CREATURE.aging.adultAge) || 5, ((CREATURE.aging && CREATURE.aging.adultAge) || 5) + 4),
    x: 0, y: 0, tx: 0, ty: 0, nextStep: 0, obj: null,
  };
  // optional per-creature mount stats (e.g. a faster car bought from `models`):
  // speedMul (ride speed), grip (race steering), drainMul (ride fatigue rate), model (its id)
  ["model", "speedMul", "grip", "drainMul"].forEach((k) => { if (o[k] != null) c[k] = o[k]; });
  NEEDS.forEach((n) => { c[n.id] = n.start != null ? n.start : 80; });
  placeInHome(c);
  return c;
}
function homeRect() { return HOME_ZONE ? HOME_ZONE.rect : { x: 200, y: 200, w: WORLD.w - 400, h: WORLD.h - 400 }; }
function placeInHome(c) {
  const p = freeSpotIn(homeRect(), 80);
  c.x = p.x; c.y = p.y; c.tx = c.x; c.ty = c.y;
}
const ADULT_AGE = (CREATURE && CREATURE.aging && CREATURE.aging.adultAge) || 5;
function isYoung(c) { return CREATURE && CREATURE.aging ? c.age < ADULT_AGE : false; }
function needAverage(c) {
  const ids = (CREATURE && CREATURE.moodFrom) || NEEDS.map((n) => n.id);
  return ids.reduce((s, id) => s + (c[id] || 0), 0) / ids.length;
}
function moodColor(m) {
  const mc = (CREATURE && CREATURE.moodColors) || ["#e05656", "#f4b942", "#6fcf5f"];
  return hexInt(m > 60 ? mc[2] : m > 35 ? mc[1] : mc[0]);
}

/* ===================== Save ===================== */

function save() {
  if (!state) return;
  state.idCounter = idCounter;
  const skip = { obj: 1, bodyT: 1, heartT: 1, wantT: 1, nameT: 1, shadowT: 1, _scEmptyWarned: 1 };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state, (k, v) => skip[k] ? undefined : v)); } catch (e) {}
}
// Names stored in a save (creatures, mission places) were written in the language active at the
// time: map any known config text (a source string or a translation in any language) to the
// current language, so a game started in French shows "Viper" after switching to English.
function relang(t) {
  if (typeof t !== "string") return t;
  if (DICT && DICT[t]) return DICT[t];
  for (const l in I18N) for (const k in I18N[l]) if (I18N[l][k] === t && l !== LANG) return L(k);
  return t;
}
function relangSave(st) {
  if (!st || !Object.keys(I18N).length) return st;
  (st.creatures || []).forEach((c) => { c.name = relang(c.name); });
  if (st.mission) ["name", "pname"].forEach((k) => { if (st.mission[k]) st.mission[k] = relang(st.mission[k]); });
  return st;
}
function load() {
  try {
    const b = localStorage.getItem(SAVE_KEY) || migrateLegacySave();
    return b ? relangSave(JSON.parse(b)) : null;
  } catch (e) { return null; }
}
// meta.legacySave = { key: "old-key" | ["k1","k2"], migrate: (old) => newStateLike }:
// a game rebuilt on this engine keeps its players' progress. When there is no save under
// SAVE_KEY yet, the first legacy save found is converted by the game's migrate() and
// stored under SAVE_KEY (the legacy key is left untouched, so nothing is ever lost).
// continueGame() then fills any missing field with its defaults, as for any old save.
function migrateLegacySave() {
  const L = META.legacySave; if (!L) return null;
  for (const k of [].concat(L.key || [])) {
    let old = null;
    try { const raw = localStorage.getItem(k); old = raw ? JSON.parse(raw) : null; } catch (e) { old = null; }
    if (!old) continue;
    let s = null;
    try { s = typeof L.migrate === "function" ? L.migrate(old) : old; } catch (e) { console.warn("legacy save migration failed", e); s = null; }
    if (!s) continue;
    const out = JSON.stringify(s);
    try { localStorage.setItem(SAVE_KEY, out); } catch (e) {}
    return out;
  }
  return null;
}

/* ===================== Sound (procedural WebAudio — no audio files) ===================== */
// Config: GAME.audio = { volume, sfx:{name:false|{notes,type,vol,dur,gap}}, music:{...}|false }.
// Every sound is synthesised, so a game needs no audio assets. Muted state persists.
const AUDIO = G.audio || null;
const Sound = (() => {
  let ctx = null, master = null, musicBus = null, muted = false, musicTimer = null, nextBeat = 0, beat = 0;
  const KEY = SAVE_KEY + ":muted";
  try { muted = localStorage.getItem(KEY) === "1"; } catch (e) {}
  const vol0 = () => (AUDIO && AUDIO.volume != null ? AUDIO.volume : 0.6);
  function ensure() {
    if (!AUDIO) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : vol0(); master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = (AUDIO.music && AUDIO.music.volume) || 0.22; musicBus.connect(master);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function tone(f, t0, dur, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f + o.slide), t0 + dur);
    const v = o.vol != null ? o.vol : 0.25, a = o.attack || 0.006;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.dest || master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(t0, dur, o = {}) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.filter || "bandpass"; f.frequency.value = o.freq || 2500; f.Q.value = o.q || 1;
    const g = ctx.createGain(); const v = o.vol != null ? o.vol : 0.12;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || master); src.start(t0); src.stop(t0 + dur + 0.05);
  }
  // Built-in palette of short, soft "toy" sounds. p = pitch multiplier.
  const PRESETS = {
    tap: (t, p) => tone(700 * p, t, 0.07, { type: "triangle", vol: 0.10 }),
    click: (t, p) => tone(520 * p, t, 0.06, { type: "triangle", vol: 0.12, slide: 120 }),
    select: (t, p) => { tone(523 * p, t, 0.10, { type: "sine", vol: 0.16 }); tone(784 * p, t + 0.06, 0.14, { type: "sine", vol: 0.14 }); },
    action: (t, p) => { tone(587 * p, t, 0.10, { type: "triangle", vol: 0.16 }); tone(880 * p, t + 0.08, 0.16, { type: "triangle", vol: 0.14 }); },
    pop: (t, p) => { tone(660 * p, t, 0.12, { type: "sine", vol: 0.26, slide: 700 * p }); noise(t, 0.05, { freq: 4000, vol: 0.05 }); },
    scrub: (t, p) => noise(t, 0.08, { freq: 2600 * p, q: 0.9, vol: 0.09 }),
    celebrate: (t, p) => [0, 4, 7, 12, 16].forEach((s, i) => tone(midi(72 + s) * p, t + i * 0.075, 0.28, { type: "triangle", vol: 0.15 })),
    reward: (t, p) => { tone(988 * p, t, 0.08, { type: "square", vol: 0.06 }); tone(1319 * p, t + 0.07, 0.22, { type: "square", vol: 0.06 }); },
    spawn: (t, p) => { tone(1319 * p, t, 0.9, { type: "sine", vol: 0.20 }); tone(1976 * p, t, 0.7, { type: "sine", vol: 0.08 }); tone(1319 * p, t + 0.22, 0.9, { type: "sine", vol: 0.14 }); },
    night: (t, p) => [12, 7, 4, 0].forEach((s, i) => tone(midi(67 + s) * p, t + i * 0.16, 0.7, { type: "sine", vol: 0.12, attack: 0.03 })),
    morning: (t, p) => [0, 4, 7, 11, 14].forEach((s, i) => tone(midi(67 + s) * p, t + i * 0.09, 0.5, { type: "sine", vol: 0.12 })),
    goal: (t, p) => [0, 7, 12].forEach((s, i) => tone(midi(72 + s) * p, t + i * 0.1, 0.35, { type: "square", vol: 0.05 })),
    open: (t, p) => noise(t, 0.18, { filter: "lowpass", freq: 900 * p, vol: 0.08 }),
    whoosh: (t, p) => noise(t, 0.35, { filter: "bandpass", freq: 700 * p, q: 0.6, vol: 0.10 }),
    error: (t, p) => tone(220 * p, t, 0.18, { type: "triangle", vol: 0.12, slide: -60 }),
    unlock: (t, p) => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(midi(72 + s) * p, t + i * 0.07, 0.25, { type: "sine", vol: 0.13 })),
  };
  function play(name, opts = {}) {
    if (!AUDIO || muted) return;
    const ov = AUDIO.sfx && AUDIO.sfx[name];
    if (ov === false) return;
    if (!ensure()) return;
    const t = ctx.currentTime + 0.005, p = (opts.pitch || 1) * ((AUDIO.pitch) || 1);
    if (ov && ov.notes) {                       // custom note list from config
      ov.notes.forEach((n, i) => tone(midi(n) * p, t + i * (ov.gap || 0.08), ov.dur || 0.2, { type: ov.type || "sine", vol: ov.vol || 0.15 }));
      return;
    }
    const fn = PRESETS[(ov && ov.preset) || name]; if (fn) fn(t, p);
  }
  // Gentle generative background music: soft pad chords + a sparse pentatonic melody.
  const SCALES = { majorPenta: [0, 2, 4, 7, 9], minorPenta: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
  function musicTick() {
    const M = AUDIO && AUDIO.music; if (!M || !ctx || muted) return;
    const spb = 60 / (M.tempo || 80);
    while (nextBeat < ctx.currentTime + 0.25) {
      const prog = M.progression || [0, 5, 3, 4];
      const root = (M.root || 57) + (prog[Math.floor(beat / 8) % prog.length] || 0);
      const scale = SCALES[M.scale || "majorPenta"] || SCALES.majorPenta;
      if (beat % 8 === 0) [0, 4, 7].forEach((s) => tone(midi(root - 12 + s), nextBeat, spb * 8.2, { type: M.pad || "sine", vol: 0.05, attack: 0.6, dest: musicBus }));
      if (Math.random() < (M.density || 0.45)) {
        const n = scale[randInt(0, scale.length - 1)] + 12 * randInt(0, 1);
        tone(midi((M.root || 57) + 12 + n), nextBeat, spb * 1.6, { type: M.lead || "triangle", vol: 0.07, dest: musicBus });
      }
      nextBeat += spb; beat++;
    }
  }
  function startMusic() {
    if (!AUDIO || !AUDIO.music || musicTimer || muted || !ensure()) return;
    nextBeat = ctx.currentTime + 0.1; beat = 0;
    musicTimer = setInterval(musicTick, 120);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) {}
    if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : vol0(), ctx.currentTime, 0.05);
    if (muted) stopMusic(); else if (state) startMusic();
  }
  // iOS/Safari only allow audio after a user gesture: unlock on the first touch.
  const unlock = () => { if (AUDIO && !muted) { ensure(); if (state) startMusic(); } };
  ["pointerdown", "touchend", "keydown"].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
  return { play, setMuted, isMuted: () => muted, startMusic, stopMusic, enabled: () => !!AUDIO };
})();

/* ===================== Screen flow ===================== */

let pendingPlayer = null, placeNameTmp = META.startName || L("My Place");

function init() {
  applyStaticText();
  // The panel stays hidden until it has something to show (an empty card would show as a
  // bare strip at the bottom while the world loads).
  const pn = $("panel"); if (pn) { pn.innerHTML = ""; pn.classList.add("idle"); }
  $("btn-start").addEventListener("click", () => {
    placeNameTmp = $("place-name-input").value.trim() || (META.startName || L("My Place"));
    openCreate({ avatar: CHARACTERS[0].id }, () => newGame(placeNameTmp, pendingPlayer));
  });
  $("btn-continue").addEventListener("click", continueGame);
  let resume = false;
  try { resume = sessionStorage.getItem("engine-resume") === "1"; sessionStorage.removeItem("engine-resume"); } catch (_) {}
  if (resume && load()) setTimeout(continueGame, 0);       // back from a freeze-recovery reload
  const br = $("btn-refresh"); if (br) br.addEventListener("click", clearCacheAndReload);
  $("place-name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btn-start").click(); });
  if (load()) { $("home-msg").textContent = T("continueHint", "A saved game exists: tap “Continue”."); $("btn-continue").classList.add("btn-pulse"); }
  else $("btn-continue").classList.add("hidden");

  $("btn-me").addEventListener("click", () => openCreate({ ...state.player }, () => {
    state.player = pendingPlayer; save();
    if (playerSprite) { playerSprite.setTexture(charDef(state.player.avatar).sheet); playerFacing = "down"; playerSprite.setFrame(18); }
    if (playerName) playerName.setText(state.player.name || "");
  }));
  $("btn-help").addEventListener("click", openHelp);
  $("btn-goals").addEventListener("click", openGoals);
  const bs = $("btn-sound");
  if (bs) {
    if (!Sound.enabled()) bs.classList.add("hidden");
    const paint = () => { bs.innerHTML = iconHTML(Sound.isMuted() ? "soundOff" : "sound"); bs.title = T("soundLabel", "Sound"); };
    paint();
    bs.addEventListener("click", () => { Sound.setMuted(!Sound.isMuted()); paint(); Sound.play("click"); });
  }

  $("btn-close-modal").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  $("btn-action").addEventListener("click", () => { if (placingDecor) placeDecor(); else interact(activeTarget); });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    if (btn.id !== "btn-sound") Sound.play("click");
    if (btn.dataset.choice !== undefined) choicePick(+btn.dataset.choice);
    else if (btn.dataset.creature) creatureAction(btn.dataset.creature);
    else if (btn.dataset.station) interact({ type: btn.dataset.station, station: true });
    else if (btn.dataset.shop) buy(btn.dataset.shop);
    else if (btn.dataset.decor) buyDecor(btn.dataset.decor);
    else if (btn.dataset.place) placeDecor();
    else if (btn.dataset.cancelPlace) cancelPlacement();
  });

  // Close-up mini-scene: scrub/tap spots (pointer works for both mouse & touch).
  const cuStage = $("closeup-stage");
  if (cuStage) {
    cuStage.addEventListener("pointerdown", (e) => {
      if (!closeupOpen || !cuState) return;
      e.preventDefault(); cuState.pressed = true; cuPid = e.pointerId;
      // Capture on the STAGE (a stable element that's never removed) so a continuous
      // scrub keeps working AND the pointer never ends up captured by a spot we delete
      // mid-drag (which on iOS leaves the pointer stuck and freezes later taps).
      try { cuStage.setPointerCapture(e.pointerId); } catch (_) {}
      cuMoveBrush(e); cuRub(e);
    });
    cuStage.addEventListener("pointermove", (e) => { if (!closeupOpen) return; e.preventDefault(); cuMoveBrush(e); if (cuState && cuState.pressed) cuRub(e); });
    const cuRelease = () => { if (cuState) cuState.pressed = false; cuReleaseCapture(); };
    window.addEventListener("pointerup", cuRelease);
    window.addEventListener("pointercancel", cuRelease);
  }
  const cuClose = $("closeup-close");
  if (cuClose) {
    cuClose.setAttribute("aria-label", T("closeLabel", "Close"));  // localise the generic shell
    cuClose.addEventListener("click", () => closeCloseup());
  }
  window.addEventListener("resize", () => { if (closeupOpen) cuPlaceSpots(); });
  // Never start a text selection / iOS callout from a tap-drag in the game world —
  // a stray selection hijacks subsequent touches (e.g. the player stops responding).
  document.addEventListener("selectstart", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    e.preventDefault();
  });
}

// Inject configured labels/titles into the static HTML shell.
function applyStaticText() {
  const set = (id, txt) => { const el = $(id); if (el != null && txt != null) el.textContent = txt; };
  const setHTML = (id, html) => { const el = $(id); if (el != null && html != null) el.innerHTML = html; };
  document.title = META.title || "Game";
  const logo = $("home-logo");
  if (logo && META.logo) { logo.src = av(META.logo); logo.classList.remove("hidden"); setHTML("home-title", esc(META.title || "Game")); document.body.classList.add("has-logo"); }
  else setHTML("home-title", (META.titleIcon ? iconHTML(META.titleIcon) + " " : "") + esc(META.title || "Game"));
  const splash = $("home-bg");
  if (META.splash) document.querySelectorAll(".home-bg").forEach((el) => { el.style.backgroundImage = `url("${av(META.splash)}")`; });
  setHTML("place-icon", iconHTML(META.titleIcon || ""));   // in-game HUD icon (generic shell)
  set("home-tagline", META.tagline || "");
  set("home-name-label", (META.namePrompt && META.namePrompt.label) || L("Name your place:"));
  const inp = $("place-name-input"); if (inp && META.namePrompt) inp.placeholder = META.namePrompt.placeholder || "";
  setHTML("btn-start", btnHTML(META.startLabel || L("New game"), META.startIcon || "play"));
  setHTML("btn-continue", btnHTML(META.continueLabel || L("Continue"), META.continueIcon || "resume"));
  setHTML("btn-refresh", iconHTML("refresh") + " " + esc(stripIcons(T("refreshLabel", "Refresh (clear cache)"))));
  set("app-version", "build " + ASSET_VER);   // visible build tag (helps confirm the cache is fresh)
  // Language switch (only when game.i18n.js provides another language): ONE toggle button pinned
  // to the home screen's top-left corner, a themed pill with the round flags and a knob behind the
  // active one. A tap slides the knob to the next language, saves it and reloads (texts are applied
  // at boot). Flags: GAME.icons["flag_<lang>"] or the built-in fr / en ones.
  const home = $("screen-home");
  if (home && LANGS.length > 1 && !$("lang-switch")) {
    const idx = Math.max(0, LANGS.indexOf(LANG)), next = LANGS[(idx + 1) % LANGS.length];
    const ls = document.createElement("button"); ls.type = "button"; ls.id = "lang-switch"; ls.className = "lang-switch";
    ls.style.setProperty("--n", LANGS.length); ls.style.setProperty("--i", idx);
    ls.setAttribute("aria-label", LANG.toUpperCase() + " / " + next.toUpperCase());
    ls.innerHTML = `<span class="lang-knob"></span>` + LANGS.map((l) => `<span class="lang-flag${l === LANG ? " on" : ""}" data-lang="${l}">${flagHTML(l)}</span>`).join("");
    ls.addEventListener("click", () => {
      if (ls.classList.contains("busy")) return; ls.classList.add("busy");
      Sound.play("click"); ls.style.setProperty("--i", LANGS.indexOf(next));
      ls.querySelectorAll(".lang-flag").forEach((f) => f.classList.toggle("on", f.dataset.lang === next));
      setTimeout(() => setLang(next), 220);   // let the knob slide first
    });
    home.appendChild(ls);
  }
  setHTML("create-title", fmt(META.createTitle || L("Choose your character")));
  setHTML("btn-create-ok", btnHTML(META.createOkLabel || L("Let's go!"), META.createOkIcon || "check"));
  setHTML("btn-goals", iconHTML("goals")); setHTML("btn-me", iconHTML("avatar")); setHTML("btn-help", iconHTML("help"));
  setHTML("btn-close-modal", iconHTML("close")); setHTML("closeup-close", iconHTML("close"));
  if (RENDER.vignette) document.documentElement.style.setProperty("--vignette", String(RENDER.vignette));
}

// Dev tool: clear caches and reload with a fresh URL (without touching the save).
async function clearCacheAndReload() {
  try {
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); }
    if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); }
  } catch (e) {}
  const u = new URL(location.href);
  u.searchParams.set("fresh", Date.now());
  location.replace(u.toString());
}

function newGame(name, player) {
  idCounter = 1;
  state = {
    placeName: name, player, coins: ECON.startCoins || 0,
    resources: Object.assign({}, ECON.startResources || {}),
    day: 1, capacity: ECON.startCapacity || 4,
    creatures: [], decors: [], speed: 1, actionsSinceRest: 0, lastBirth: 0,
    stats: freshStats(), goalsDone: {}, level: 1, unlocked: {},
    mission: null, heat: 0, lastRide: null,
  };
  const startN = (CREATURE && CREATURE.startCount) || 0;
  for (let i = 0; i < startN; i++) {
    const seed = (CREATURE.startCreatures && CREATURE.startCreatures[i]) || {};
    state.creatures.push(newCreature(seed));
  }
  save(); startGame();
}

function continueGame() {
  const s = load();
  if (!s) { $("home-msg").textContent = T("noSave", "No saved game."); return; }
  state = s;
  if (!state.player) state.player = { avatar: CHARACTERS[0].id };
  if (!charDef(state.player.avatar) || !CHARACTERS.some((p) => p.id === state.player.avatar)) state.player.avatar = CHARACTERS[0].id;
  if (!state.resources) state.resources = Object.assign({}, ECON.startResources || {});
  if (!state.decors) state.decors = [];
  state.decors = state.decors.filter((d) => d && DECOR.some((x) => x.id === d.id) && typeof d.x === "number");
  if (typeof state.speed !== "number") state.speed = 1;
  if (typeof state.actionsSinceRest !== "number") state.actionsSinceRest = 0;
  if (typeof state.lastBirth !== "number") state.lastBirth = 0;
  if (typeof state.capacity !== "number") state.capacity = ECON.startCapacity || 4;
  state.stats = Object.assign(freshStats(), state.stats || {});
  if (!state.goalsDone) state.goalsDone = {};
  if (!state.unlocked) state.unlocked = {};
  if (state.mission === undefined) state.mission = state.job || null;   // older engine builds called it "job"
  delete state.job;
  if (typeof state.heat !== "number") state.heat = 0;
  if (state.lastRide === undefined) state.lastRide = state.lastCar != null ? state.lastCar : null;
  delete state.lastCar;
  recalcLevel();
  state.creatures = (state.creatures || []).map((c) => {
    const base = newCreature({}); // ensures any new need fields exist with defaults
    const merged = Object.assign(base, c);
    merged.obj = null; merged.nextStep = 0; merged.variant = variantId(merged);
    return merged;
  });
  idCounter = s.idCounter || (state.creatures.length + 1);
  startGame();
}

function startGame() {
  $("screen-home").classList.add("hidden");
  $("screen-create").classList.add("hidden");
  $("screen-game").classList.remove("hidden");
  themeColor(TINT_PLAY);
  $("place-name").textContent = state.placeName;
  buildHud();
  refreshHud();
  startPhaser();
  Sound.startMusic();
}

/* ===================== HUD / messages ===================== */

// Build the resource bar from config (coins, each resource, day, capacity, level).
function buildHud() {
  const bar = $("hud-resources"); if (!bar) return;
  // The goals button only makes sense when objective levels exist.
  const gb = $("btn-goals"); if (gb) gb.classList.toggle("hidden", !LEVELS.length);
  const chip = (id, icon, title, valId) => `<span class="resource" id="${id}" title="${esc(title)}"><span class="r-ico">${iconHTML(icon)}</span><b id="${valId}">0</b></span>`;
  let html = META.showCoins === false ? "" : chip("chip-coins", META.coinIcon || "star", T("coinsLabel", "Coins"), "hud-coins");
  (SHOP.resources || []).forEach((r) => { html += chip("chip-res-" + r.id, r.icon || "gift", r.name, "hud-res-" + r.id); });
  if (META.showDay !== false) html += chip("chip-day", "calendar", T("dayLabel", "Day"), "hud-day");
  if (CREATURE && META.showCreatureCount !== false) html += chip("chip-cap", CREATURE.icon || "heart", CREATURE.label || "creatures", "hud-cap");
  if (LEVELS.length) html += chip("chip-level", "trophy", T("levelLabel", "Level"), "hud-level");
  if (G.missions && (G.missions.pickups || (G.missions.offers || []).some((o) => o.pickups && o.pickups.length))) html += `<span class="resource cargo hidden" id="chip-cargo" title="${esc(stripIcons(G.missions.cargoLabel || ""))}"><span class="r-ico">${iconHTML(G.missions.cargoIcon || G.missions.marker || "gift")}</span><b>1</b></span>`;
  if (G.chase) html += `<span class="resource heat hidden" id="chip-heat" title="${esc(stripIcons(G.chase.label || ""))}"><span class="heat-icons"></span></span>`;
  bar.innerHTML = html;
  if (G.chase) refreshHeat();
  if (G.missions && state) refreshCargo();
  bar.classList.toggle("hidden", !html);
  const pa = $("place-avatar");
  if (pa && state && state.player) pa.innerHTML = `<img src="${thumbSrc(charDef(state.player.avatar))}" alt="" />`;
}

function refreshHud() {
  const set = (id, v) => { const el = $(id); if (el && el.textContent !== String(v)) el.textContent = v; };
  if (META.showCoins !== false) set("hud-coins", state.coins);
  (SHOP.resources || []).forEach((r) => set("hud-res-" + r.id, (state.resources[r.id] || 0)));
  set("hud-day", state.day);
  if (CREATURE) set("hud-cap", SHOW_CAP ? state.creatures.length + "/" + state.capacity : String(state.creatures.length));
  checkGoals();
  checkUnlocks();
  if (LEVELS.length) set("hud-level", state.level || 1);
  save();
}

// Mark newly-met goals of the current level, notify, recompute level.
function checkGoals() {
  if (!state || !LEVELS.length) return;
  const before = state.level || 1;
  const done = [];
  currentLevel().goals.forEach((o) => {
    if (!state.goalsDone[o.id] && safeCheck(o.check)) { state.goalsDone[o.id] = true; done.push(o); }
  });
  recalcLevel();
  if (done.length) {
    Sound.play("goal");
    message(done.length === 1 ? T("goalComplete", "{i:goals} Goal complete: {name}!", { name: done[0].name }) : T("goalsComplete", "{i:goals} {n} goals complete!", { n: done.length }));
  }
  if ((state.level || 1) > before) {
    const n = state.level;
    message(T("levelUp", "{i:trophy} Well done! You reached level {n}!", { n }));
    confetti();
  }
}
function safeCheck(fn) { try { return !!fn(state); } catch (e) { return false; } }

// Unlocks: progress milestones that add scenery to the world (no reading needed —
// the place visibly grows richer). when = (state)=>bool | {stat, atLeast} | {coins}.
function unlockMet(u) {
  const w = u.when;
  if (typeof w === "function") return safeCheck(w);
  if (w && w.stat) return (state.stats[w.stat] || 0) >= (w.atLeast || 1);
  if (w && w.coins != null) return state.coins >= w.coins;
  return false;
}
function checkUnlocks() {
  if (!state || !UNLOCKS.length) return;
  if (closeupOpen) return;               // reveal once the world is visible again (closeCloseup re-checks)
  UNLOCKS.forEach((u, i) => {
    const id = u.id || ("u" + i);
    if (state.unlocked[id] || !unlockMet(u)) return;
    state.unlocked[id] = true;
    if (!sc) return;
    const o = addSceneryItem(u.scenery || u, true);
    if (o) { revealScenery(o, 450); COLLISIONS_DIRTY = true; }
    if (u.message) setTimeout(() => message(u.message), 600);
  });
}

// Toast messages: queued so a burst of events doesn't overwrite each other
// (each stays readable for a moment; the queue keeps only the latest few).
const msgQueue = [];
let msgBusyUntil = 0, msgTimer = null;
function message(t) {
  if (!t) return;
  const el = $("game-message"); if (!el) return;
  const now = nowMs();
  if (!el.classList.contains("hidden") && now < msgBusyUntil) {
    if (el.dataset.raw !== t && !msgQueue.includes(t)) { msgQueue.push(t); if (msgQueue.length > 3) msgQueue.shift(); }
    clearTimeout(msgTimer); msgTimer = setTimeout(nextMessage, msgBusyUntil - now);
    return;
  }
  showMessage(t);
}
function showMessage(t) {
  const el = $("game-message");
  el.dataset.raw = t;
  el.innerHTML = `<span class="gm-text">${fmt(t)}</span>`;
  el.classList.toggle("text-only", !/\{i:/.test(t));
  el.classList.remove("hidden");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  msgBusyUntil = nowMs() + 1400;
  clearTimeout(msgTimer); msgTimer = setTimeout(nextMessage, 2800);
}
function nextMessage() {
  if (msgQueue.length) showMessage(msgQueue.shift());
  else { const el = $("game-message"); if (el) el.classList.add("hidden"); }
}

// Screen-space confetti burst (DOM; used for level-ups and big moments).
function confetti(n) {
  const layer = document.body;
  const cols = RENDER.confetti || ["#ff5db1", "#ffd24a", "#3fe0e8", "#8df06b", "#b58bff", "#ffffff"];
  for (let i = 0; i < (n || 36); i++) {
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.left = rand(5, 95) + "vw";
    d.style.background = cols[i % cols.length];
    d.style.setProperty("--dx", rand(-30, 30) + "vw");
    d.style.setProperty("--rot", randInt(-720, 720) + "deg");
    d.style.animationDelay = randInt(0, 300) + "ms";
    d.style.animationDuration = randInt(1400, 2200) + "ms";
    layer.appendChild(d);
    setTimeout(() => d.remove(), 2700);
  }
}

// World point → CSS pixel position on screen.
function worldToScreen(x, y) {
  const cam = sc.cameras.main, el = sc.game.canvas.getBoundingClientRect();
  const z = cam.zoom / DPR;
  return { x: el.left + (x - cam.worldView.x) * z, y: el.top + (y - cam.worldView.y) * z };
}
// A reward that flies from a world point to its HUD chip (then the chip bumps).
function flyReward(x, y, text, chipId) {
  if (!sc) return;
  const chip = $(chipId || "chip-coins");
  const p = worldToScreen(x, y);
  const d = document.createElement("div");
  d.className = "fly-reward"; d.innerHTML = fmt(text);
  d.style.left = p.x + "px"; d.style.top = p.y + "px";
  document.body.appendChild(d);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    d.classList.add("rise");
    setTimeout(() => {
      if (chip && !chip.closest(".hidden")) {
        const r = chip.getBoundingClientRect();
        d.classList.add("go");
        d.style.left = (r.left + 18) + "px"; d.style.top = (r.top + r.height / 2) + "px";
      } else d.classList.add("fade");
    }, 520);
  }));
  setTimeout(() => {
    d.remove();
    if (chip) { chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump"); }
    Sound.play("reward");
  }, 1150);
}

/* ===================== Character creation (DOM) ===================== */

function openCreate(player, onValidate) {
  pendingPlayer = player;
  $("screen-home").classList.add("hidden");
  $("screen-game").classList.add("hidden");
  $("screen-create").classList.remove("hidden");
  themeColor(TINT_HOME);
  const idx = () => Math.max(0, CHARACTERS.findIndex((c) => c.id === pendingPlayer.avatar));
  const draw = (dir) => {
    const ch = charDef(pendingPlayer.avatar);
    $("avatar-preview").innerHTML = `<div class="podium"></div><img class="thumb-big ${dir ? "swap-" + dir : ""}" src="${thumbSrc(ch)}" alt="" /><div class="avatar-name">${esc(ch.name)}</div>`;
    document.querySelectorAll("#grp-avatar .btn-avatar").forEach((b) => b.classList.toggle("chosen", b.dataset.id === ch.id));
  };
  const step = (k) => { const i = (idx() + k + CHARACTERS.length) % CHARACTERS.length; pendingPlayer.avatar = CHARACTERS[i].id; draw(k > 0 ? "next" : "prev"); };
  const cont = $("create-controls");
  const many = CHARACTERS.length > 1;
  ["car-prev", "car-next"].forEach((id, i) => {
    const b = $(id); if (!b) return;
    b.innerHTML = iconHTML("arrow"); b.classList.toggle("hidden", !many);
    b.onclick = () => step(i ? 1 : -1);
  });
  cont.innerHTML = `<div class="avatar-row" id="grp-avatar"></div>
    <label class="field-label" for="create-name">${esc(META.namePromptYou || L("Your name"))}</label>
    <input id="create-name" type="text" maxlength="14" placeholder="${esc(META.namePromptYou || L("Your name"))}" value="${esc(pendingPlayer.name || "")}" />`;
  const ga = $("grp-avatar");
  if (!many) ga.classList.add("hidden");
  CHARACTERS.forEach((p) => {
    const b = document.createElement("button");
    b.className = "btn-avatar btn-thumb"; b.dataset.id = p.id; b.title = p.name;
    b.innerHTML = `<img src="${thumbSrc(p)}" alt="" />`;
    b.addEventListener("click", () => { const k = CHARACTERS.indexOf(p) - idx(); pendingPlayer.avatar = p.id; draw(k >= 0 ? "next" : "prev"); });
    ga.appendChild(b);
  });
  draw();
  $("btn-create-ok").onclick = () => {
    const n = $("create-name").value.trim();
    pendingPlayer.name = n || pendingPlayer.name || charDef(pendingPlayer.avatar).name;
    onValidate();
    if (state) { $("screen-create").classList.add("hidden"); $("screen-game").classList.remove("hidden"); themeColor(TINT_PLAY); buildHud(); refreshHud(); }
  };
}

/* ===================== Phaser ===================== */

let game = null, sc = null;
let player = null, playerSprite = null, playerShadow = null, playerName = null, playerFacing = "down";
let cursors = null, wasd = null;
let moveTarget = null, navPath = [], pendingInteract = null, followCreature = null, followRepath = 0, followAuto = false, followStart = 0;
let placingDecor = null, ghostDecor = null, ghostSide = 1;
let nightRunning = false;
let running = false, lastTapT = 0, lastInputT = 0;
let rideFatigueAcc = 0, playerMoving = false;
let jumpRunning = false;
const jumpAnim = { h: 0 };
let activeTarget = null, panelId = null, mounted = null;
// Sentinel meaning "panel is stale, rebuild on the next refreshInteraction" — distinct
// from a real panel id AND from null (which is a valid id: "nothing selected"). Using
// null to invalidate hid a bug: deselecting to null left the panel showing the old target.
const PANEL_DIRTY = " dirty";
let closeupOpen = false, cuState = null, cuPid = null;   // generic close-up mini-scene
let selRing = null, guideArrow = null;
let decorObjs = [], ambient = [];
let COLLISIONS = [], COLLISIONS_DIRTY = true;

function fontFamily() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--game-font").trim();
  return RENDER.font || v || "sans-serif";
}
// Shared text style for in-world labels (crisp on HiDPI thanks to `resolution`).
function txtStyle(size, o = {}) {
  const t = RENDER.text || {};
  return {
    fontSize: size + "px", fontFamily: fontFamily(), fontStyle: o.weight || t.weight || "bold",
    color: o.color || t.color || "#fff8ec", stroke: o.stroke || t.stroke || "#3a2716",
    strokeThickness: o.strokeThickness != null ? o.strokeThickness : (t.strokeThickness != null ? t.strokeThickness : Math.max(3, Math.round(size / 4))),
    resolution: TEXT_RES,
  };
}

function startPhaser() {
  if (game) { buildWorld(); return; }
  const worldEl = $("world");
  const ready = (document.fonts && document.fonts.load) ? Promise.race([
    document.fonts.load("700 20px " + fontFamily().split(",")[0]).catch(() => {}),
    new Promise((r) => setTimeout(r, 1200)),
  ]) : Promise.resolve();
  ready.then(() => {
    const w = worldEl.clientWidth || window.innerWidth, h = worldEl.clientHeight || window.innerHeight;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "world",
      backgroundColor: (G.world && G.world.bg) || "#6fae4f",
      pixelArt: PIXEL_ART,
      antialias: !PIXEL_ART,
      roundPixels: PIXEL_ART,
      // HiDPI: the canvas has DPR x more pixels than its CSS size (crisp on phones).
      scale: { mode: Phaser.Scale.NONE, width: Math.round(w * DPR), height: Math.round(h * DPR), zoom: 1 / DPR },
      scene: { preload: scenePreload, create: sceneCreate, update: sceneUpdate },
    });
    window.game = game;
    const fit = () => {
      if (!game || !game.scale) return;
      game.scale.resize(Math.round(worldEl.clientWidth * DPR), Math.round(worldEl.clientHeight * DPR));
      game.scale.setZoom(1 / DPR);
      fitZoom();
    };
    if (window.ResizeObserver) new ResizeObserver(fit).observe(worldEl);
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", () => setTimeout(fit, 200));
    startWatchdog();
  });
}

// Freeze watchdog. On iPhone the world can stop being drawn while the DOM still works
// (help opens, the player "won't move"): the game loop isn't woken after the app comes
// back from the background, or iOS drops the WebGL context and never restores it.
// 1) wake the loop explicitly on every return to the foreground / touch;
// 2) a DOM timer (independent of Phaser) checks frames still advance; if the world stays
//    frozen, save and reload straight back into the game (no detour via the home screen).
function startWatchdog() {
  if (startWatchdog.on) return; startWatchdog.on = true;
  const wake = () => { try { if (game && game.loop && !game.loop.running) game.loop.wake(); } catch (_) {} };
  ["pageshow", "focus"].forEach((ev) => window.addEventListener(ev, wake));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  $("world").addEventListener("pointerdown", wake);
  let last = -1, stale = 0, lostFor = 0, done = false;
  const recover = () => {
    if (done) return; done = true;
    try { save(); sessionStorage.setItem("engine-resume", "1"); } catch (_) {}
    location.reload();
  };
  setInterval(() => {
    if (!game || !game.loop || document.hidden) { stale = 0; lostFor = 0; return; }
    // the loop keeps ticking while a lost WebGL context draws nothing → check it separately
    lostFor = game.renderer && game.renderer.contextLost ? lostFor + 1 : 0;
    if (lostFor >= 3) return recover();
    const f = game.loop.frame;
    if (f !== last) { last = f; stale = 0; return; }
    stale++; wake();
    if (stale >= 5) recover();
  }, 1000);
}

let baseZoom = 1;
function fitZoom() {
  if (!sc) return;
  const cam = G.camera || {};
  const w = sc.scale.width / DPR, h = sc.scale.height / DPR;
  const z = clamp(Math.min(w / (cam.fitW || 780), h / (cam.fitH || 820)), cam.min || 0.5, cam.max || 0.9);
  baseZoom = z * DPR;
  if (!closeupOpen && !zoomFx) sc.cameras.main.setZoom(baseZoom);
}
let zoomFx = false;

/* ===================== Asset loading ===================== */

// Images only ever shown by the DOM (close-up backdrops + their "done" version, spots, brush) are NOT
// uploaded to the GPU: on iPhone, N variants x ~4.7 Mpx backdrops cost hundreds of MB of WebGL memory,
// enough for Safari to drop the context (frozen world / reload loop). A key also used in the world stays.
function domOnlyImageKeys() {
  const keys = new Set(), add = (k) => { if (k) keys.add(k); };
  ACTIONS.forEach((a) => { const c = a.closeup; if (!c) return; add(c.bg); add(c.bgDone); add(c.spotSprite); (c.spotSprites || []).forEach(add); add(c.brush); });
  VARIANTS.forEach((v) => { add(v.closeupBg); add(v.closeupBgDone); });
  const world = JSON.stringify([G.scenery, G.decor, G.stations, G.environment, G.unlocks, G.missions, G.chase, G.race, G.zones, G.world, G.fence,
    CREATURE && CREATURE.wantBubble, G.economy, G.shop]);
  return [...keys].filter((k) => !world.includes('"' + k + '"'));
}
function scenePreload() {
  const imgs = (G.assets && G.assets.images) || {}, domOnly = domOnlyImageKeys();
  Object.keys(imgs).forEach((k) => { if (!domOnly.includes(k)) this.load.image(k, av(assetPath(k))); });
  // warm the HTTP cache for the DOM-only images (no decoding, no GPU) so the close-up opens instantly
  setTimeout(() => domOnly.forEach((k) => { const u = assetPath(k); if (u) fetch(av(u)).catch(() => {}); }), 4000);
  const sheets = (G.assets && G.assets.sheets) || {};
  Object.keys(sheets).forEach((k) => {
    const s = sheets[k];
    const r = s.res || 1;   // frame sizes are LOGICAL in the config; the file holds res x pixels
    this.load.spritesheet(k, av(s.path), { frameWidth: s.frameWidth * r, frameHeight: s.frameHeight * r });
  });
  // Loading screen (DOM, themed): the player's character floating over a rounded
  // progress gauge; hidden by the canvas reveal in sceneCreate.
  const ld = showWorldLoader(), fillEl = ld.querySelector(".wl-bar i");
  this.load.on("progress", (v) => { if (fillEl) fillEl.style.width = Math.round(v * 100) + "%"; });
}

// Animations: player walk (4 directions) and creature side-walk.
const DIRS = { up: 0, left: 1, down: 2, right: 3 }; // LPC walkcycle rows (9 frames/row)
function creatureSheets() {
  const sheets = new Set([CREATURE.sheet]);
  VARIANTS.forEach((v) => { if (v.sheet) sheets.add(v.sheet); if (v.happySheet) sheets.add(v.happySheet); });
  if (CREATURE.happySheet) sheets.add(CREATURE.happySheet);
  return sheets;
}
function buildAnims() {
  const pr = (G.player && G.player.frameRate) || 10;
  CHARACTERS.forEach((p) => {
    Object.entries(DIRS).forEach(([dir, row]) => {
      const key = `${p.sheet}-${dir}`;
      if (!sc.anims.exists(key)) sc.anims.create({
        key, frames: sc.anims.generateFrameNumbers(p.sheet, { start: row * 9 + 1, end: row * 9 + 8 }),
        frameRate: pr, repeat: -1,
      });
    });
  });
  if (CREATURE) {
    const w = CREATURE.walk || { start: 0, end: 3, frameRate: 6 };
    // One walk anim per distinct sheet (base + any variant with its own sheet), so
    // variants that ship a dedicated spritesheet animate instead of snapping back
    // to the base sheet's frames. A directional sheet (creature.dirSheet) gets one
    // anim per direction (rows up/left/down/right, like a character walkcycle).
    creatureSheets().forEach((sheet) => {
      if (!sc.textures.exists(sheet)) return;
      (DIR_SHEET ? Object.keys(DIRS) : [null]).forEach((dir) => {
        const key = "creature-walk-" + sheet + (dir ? "-" + dir : "");
        const base = dir ? DIRS[dir] * dirCols() : 0;
        if (!sc.anims.exists(key)) sc.anims.create({
          key, frames: sc.anims.generateFrameNumbers(sheet, { start: base + w.start, end: base + w.end }),
          frameRate: w.frameRate || 6, repeat: -1,
        });
      });
    });
  }
}
// creature.dirSheet: true | { cols } — the creature sheet has 4 rows (up, left, down, right)
// instead of one side-view strip flipped left/right (e.g. vehicles seen from above).
const DIR_SHEET = CREATURE && CREATURE.dirSheet ? (CREATURE.dirSheet === true ? {} : CREATURE.dirSheet) : null;
function dirCols() { const w = (CREATURE && CREATURE.walk) || {}; return (DIR_SHEET && DIR_SHEET.cols) || ((w.end != null ? w.end : 3) + 1); }
function dirOf(dx, dy, cur) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  // hysteresis: near 45° keep the current axis (a diagonal used to flip rows every frame = flicker)
  if (cur === "left" || cur === "right") { if (ax >= ay * 0.75) return dx < 0 ? "left" : dx > 0 ? "right" : cur; }
  else if (cur === "up" || cur === "down") { if (ay >= ax * 0.75) return dy < 0 ? "up" : dy > 0 ? "down" : cur; }
  return ax > ay ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}
// Turn a creature towards a direction of travel (or towards something it looks at).
function faceCreature(c, dx, dy) {
  if (!c || !c.bodyT) return;
  if (!DIR_SHEET) { if (dx) c.bodyT.setFlipX(dx > 0); return; }
  if (!dx && !dy) return;
  const dir = dirOf(dx, dy, c.facing);
  if (c.facing === dir) return;
  c.facing = dir;
  const k = creatureWalkKey(c), playing = c.bodyT.anims.isPlaying;
  c.bodyT.play(k, true);
  if (!playing) { c.bodyT.anims.stop(); c.bodyT.setFrame(idleFrameOf(c)); }
}
// The ridden creature faces where the player drives it.
function faceMount(c) {
  if (DIR_SHEET) faceCreature(c, playerFacing === "left" ? -1 : playerFacing === "right" ? 1 : 0, playerFacing === "up" ? -1 : playerFacing === "down" ? 1 : 0);
  else if (c.bodyT) c.bodyT.setFlipX(playerFacing === "right");
}
// creature.walk.idleFrame: frame (within the walk strip) shown while standing still;
// omitted → the walk loop keeps playing (legacy behaviour).
function idleFrameOf(c) {
  const w = (CREATURE && CREATURE.walk) || {};
  return (DIR_SHEET ? DIRS[c.facing || "down"] * dirCols() : 0) + (w.start || 0) + (w.idleFrame || 0);
}

/* ===================== Fences & zones ===================== */

// Picket fence around a rectangle, with a gate. opts.gates = "both" | "left" | "right".
function fenceRect(r, opts = {}) {
  const s = (G.fence && G.fence.step) || 32, x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
  const gA = y0 + r.h * (opts.gateA || 0.4), gB = y0 + r.h * (opts.gateB || 0.6);
  const fr = (G.fence && G.fence.frames) || { post: 1, side: 17, cornerTL: 32, cornerTR: 34 };
  const sheet = (G.fence && G.fence.sheet) || "fence";
  const fs = (G.fence && G.fence.scale) || 1;
  const add = (x, y, frame, flipY) => { const o = sc.add.image(x, y, sheet, frame).setOrigin(0.5, 0.7).setScale(fs / RES(sheet)).setDepth(y); if (flipY) o.setFlipY(true); };
  for (let x = x0 + s; x < x1; x += s) { add(x, y0, fr.post, false); add(x, y1, fr.post, false); }
  const gates = opts.gates || "left";
  for (let y = y0 + s; y < y1; y += s) {
    const inGate = (y > gA && y < gB);
    const leftOpen = (gates === "both" || gates === "left") && inGate;
    const rightOpen = (gates === "both" || gates === "right") && inGate;
    if (!leftOpen) add(x0, y, fr.side, false);
    if (!rightOpen) add(x1, y, fr.side, false);
  }
  add(x0, y0, fr.cornerTL, false); add(x1, y0, fr.cornerTR, false);
  add(x0, y1, fr.cornerTL, true); add(x1, y1, fr.cornerTR, true);
  // collision walls (with the gate opening(s) left clear)
  const t = 14;
  COLLISIONS.push({ x: x0, y: y0 - t / 2, w: r.w, h: t }, { x: x0, y: y1 - t / 2, w: r.w, h: t });
  const leftHasGate = gates === "both" || gates === "left";
  const rightHasGate = gates === "both" || gates === "right";
  if (leftHasGate) COLLISIONS.push({ x: x0 - t / 2, y: y0, w: t, h: gA - y0 }, { x: x0 - t / 2, y: gB, w: t, h: y1 - gB });
  else COLLISIONS.push({ x: x0 - t / 2, y: y0, w: t, h: r.h });
  if (rightHasGate) COLLISIONS.push({ x: x1 - t / 2, y: y0, w: t, h: gA - y0 }, { x: x1 - t / 2, y: gB, w: t, h: y1 - gB });
  else COLLISIONS.push({ x: x1 - t / 2, y: y0, w: t, h: r.h });
}

// A world label: plain outlined text, or a soft "sign" pill when render.label.bg is set.
function worldLabel(x, y, txt, depth, size) {
  const L = RENDER.label || {};
  const t = sc.add.text(0, 0, txt, txtStyle(size || L.size || 24, L.bg ? { color: L.color, stroke: L.stroke || L.bg, strokeThickness: L.bg ? 0 : undefined } : {})).setOrigin(0.5, 1);
  if (!L.bg) { t.setPosition(x, y).setDepth(depth); return t; }
  const padX = 14, padY = 6, w = t.width / 1 + padX * 2, h = t.height + padY * 2;
  const g = sc.add.graphics();
  g.fillStyle(0x000000, 0.14); g.fillRoundedRect(-w / 2, -h + 3, w, h, h / 2);
  g.fillStyle(hexInt(L.bg), L.alpha != null ? L.alpha : 0.92); g.fillRoundedRect(-w / 2, -h, w, h, h / 2);
  if (L.border) { g.lineStyle(2, hexInt(L.border), 1); g.strokeRoundedRect(-w / 2, -h, w, h, h / 2); }
  t.setPosition(0, -padY);
  return sc.add.container(x, y, [g, t]).setDepth(depth);
}

/* ===================== Environment (forest band + trail loop) ===================== */

let LOOP_SEG = [], OPENINGS = [], PATHS = [], LOGS = [], BAND = 0, PW = 0, SAND = 0;

function computeEnvironment() {
  LOOP_SEG = []; OPENINGS = []; PATHS = []; LOGS = []; BAND = 0; PW = 0; SAND = 0;
  if (!ENV || !ENV.path) return;
  const p = ENV.path;
  BAND = ENV.band || 440; PW = p.width || 240; SAND = p.sand || 46;
  const inset = p.inset || 90;
  LOOP_SEG = [
    { x: inset, y: inset, w: WORLD.w - 2 * inset, h: PW },
    { x: inset, y: WORLD.h - inset - PW, w: WORLD.w - 2 * inset, h: PW },
    { x: inset, y: inset, w: PW, h: WORLD.h - 2 * inset },
    { x: WORLD.w - inset - PW, y: inset, w: PW, h: WORLD.h - 2 * inset },
  ];
  OPENINGS = (p.openings || []).map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
  PATHS = LOOP_SEG.concat(OPENINGS);
  // jumpable logs across the horizontal sides
  if (p.logs && p.logs.xs) {
    const dec = p.logs.dec || 14;
    LOGS = [
      ...p.logs.xs.map((x) => ({ x, y: inset + PW / 2 - dec })),
      ...p.logs.xs.map((x) => ({ x, y: WORLD.h - inset - PW / 2 - dec })),
    ];
  }
}

function inBand(x, y) { return x < BAND || x > WORLD.w - BAND || y < BAND || y > WORLD.h - BAND; }
function onPath(x, y, m) { return PATHS.some((s) => x > s.x - m && x < s.x + s.w + m && y > s.y - m && y < s.y + s.h + m); }
function nearStation(x, y) { return STATIONS.some((s) => Math.abs(x - s.x) < 120 && Math.abs(y - s.y) < 160); }
function inProtectedZone(x, y) {
  const within = (r) => x > r.x - 24 && x < r.x + r.w + 24 && y > r.y - 24 && y < r.y + r.h + 24;
  if (HOME_ZONE && within(HOME_ZONE.rect)) return true;
  if (ENV && ENV.arena && within(ENV.arena.rect)) return true;
  return false;
}

// Visible (opaque) bounds of a texture in LOGICAL px from its top-left, cached: collision footprints are
// fitted to what is actually drawn (transparent margins and soft glows — alpha < 55% — excluded).
const OPAQUE = {};
function opaqueBounds(key) {
  if (OPAQUE[key]) return OPAQUE[key];
  const img = sc.textures.get(key).getSourceImage(), r = RES(key), W = img.width, H = img.height;
  let b = { x0: 0, y0: 0, x1: W / r, y1: H / r, w: W / r, h: H / r };
  try {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) {
      if (d[(yy * W + xx) * 4 + 3] > 140) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    }
    if (x1 >= 0) b = { x0: x0 / r, y0: y0 / r, x1: (x1 + 2) / r, y1: (y1 + 2) / r, w: W / r, h: H / r };
  } catch (_) {}
  return (OPAQUE[key] = b);
}
// World box of the visible part of an image placed at (x,y) with origin (ox,oy) at logical scale s.
function drawnBox(key, x, y, ox, oy, s) {
  const b = opaqueBounds(key);
  const L = x + (b.x0 - ox * b.w) * s, R = x + (b.x1 - ox * b.w) * s, T = y + (b.y0 - oy * b.h) * s, B = y + (b.y1 - oy * b.h) * s;
  return { x: L, y: T, w: R - L, h: B - T };
}

function buildEnvironment() {
  if (!ENV) return;
  // --- Arena (fenced obstacle area) ---
  if (ENV.arena) {
    const a = ENV.arena;
    if (a.tile) sc.add.tileSprite(a.rect.x, a.rect.y, a.rect.w, a.rect.h, a.tile).setOrigin(0, 0).setDepth(-19).setTileScale(1 / RES(a.tile));
    if (a.label) worldLabel(a.rect.x + a.rect.w / 2, a.rect.y - 36, a.label, 99990);
    if (a.fence) fenceRect(a.rect, { gates: a.gates || "left", gateA: a.gateA, gateB: a.gateB });   // gate span as fractions of the height
    (a.obstacles || []).forEach((h) => {
      sc.add.image(h.x, h.y, a.obstacleSprite).setOrigin(0.5, 0.92).setScale((a.obstacleScale || 1) / RES(a.obstacleSprite)).setDepth(h.y);
      const b = a.obstacleBox || { dx: -33, dy: -18, w: 66, h: 30 };
      COLLISIONS.push({ x: h.x + b.dx, y: h.y + b.dy, w: b.w, h: b.h, jumpable: true });
    });
  }
  // --- Trail loop (sand path around the map, inside a forest band) ---
  if (ENV.path) {
    const p = ENV.path, tile = p.tile || "dirt";
    PATHS.forEach((s) => sc.add.tileSprite(s.x - SAND, s.y - SAND, s.w + 2 * SAND, s.h + 2 * SAND, tile).setOrigin(0, 0).setDepth(-19).setTileScale(1 / RES(tile)));
    if (p.label) worldLabel(WORLD.w / 2, p.labelY || 300, p.label, 99990);
    // Vegetation by a SINGLE declarative rule → continuous & identical everywhere,
    // openings and corners handled automatically (cells "on the path" stay empty).
    const f = ENV.forest || {};
    const step = f.step || 44, tree = f.tree || "tree", bush = f.bush || "bush";
    const hedgeM = f.hedgeMargin || 80;
    // sprite scales: [min, max] (defaults sized for the legacy 64-px pixel-art sprites)
    const tS = f.treeScale || [1.5, 1.9], bS = f.bushScale || [1.1, 1.4], hb = f.hedgeBox || { dx: -22, dy: -10, w: 44, h: 14 };
    // Collision footprints FIT THE DRAWING: on a side facing the path or the play area, the box stops at the
    // visible edge of the sprite (its opaque pixels, at its scale) so the player walks right up to it; on a side
    // facing another band cell it extends to the cell boundary, so the band stays gapless (no slipping between
    // two bushes / rocks). forest.hedgeSolid:false → legacy small hedgeBox; trees collide only with treeBox.
    const bandCell = (cx, cy) => cx >= 24 && cy >= 24 && cx <= WORLD.w && cy <= WORLD.h && inBand(cx, cy) && !nearStation(cx, cy) &&
      !inProtectedZone(cx, cy) && !onPath(cx, cy, 6) && !LOGS.some((l) => Math.abs(cx - l.x) < 34 && Math.abs(cy - l.y) < PW);
    const fitBox = (key, x, y, oy, s, gx, gy) => {
      const d = drawnBox(key, x, y, 0.5, oy, s);
      const L = bandCell(gx - step, gy) ? Math.min(d.x, gx - step / 2) : d.x, R = bandCell(gx + step, gy) ? Math.max(d.x + d.w, gx + step / 2) : d.x + d.w;
      const T = bandCell(gx, gy - step) ? Math.min(d.y, gy - step / 2) : d.y, B = bandCell(gx, gy + step) ? Math.max(d.y + d.h, gy + step / 2) : d.y + d.h;
      return { x: L, y: T, w: R - L, h: B - T };
    };
    for (let gy = 24; gy <= WORLD.h; gy += step) {
      for (let gx = 24; gx <= WORLD.w; gx += step) {
        if (!bandCell(gx, gy)) continue;
        const x = gx + randInt(-7, 7), y = gy + randInt(-6, 6);
        if (onPath(gx, gy, hedgeM)) {                          // path edge → low hedge (bush)
          const s = rand(bS[0], bS[1]);
          sc.add.image(x, y, bush).setOrigin(0.5, 0.9).setScale(s / RES(bush)).setDepth(y);
          if (f.hedgeSolid === false) COLLISIONS.push({ x: x + hb.dx, y: y + hb.dy, w: hb.w, h: hb.h });
          else COLLISIONS.push(fitBox(bush, x, y, 0.9, s, gx, gy));
        } else {                                               // farther → forest (trees: no collision unless forest.treeBox)
          const s = rand(tS[0], tS[1]);
          sc.add.image(x, y, tree).setOrigin(0.5, 0.95).setScale(s / RES(tree)).setDepth(y);
          if (f.treeBox === "fit") COLLISIONS.push(fitBox(tree, x, y, 0.95, s, gx, gy));
          else if (f.treeBox) COLLISIONS.push({ x: gx + f.treeBox.dx, y: gy + f.treeBox.dy, w: f.treeBox.w, h: f.treeBox.h });   // on the grid → no gaps
        }
      }
    }
    // decorative forest just beyond the world edges (no gaps at the border) — no collision
    const M = 260;
    for (let gy = -M; gy <= WORLD.h + M; gy += 90) {
      for (let gx = -M; gx <= WORLD.w + M; gx += 90) {
        if (gx > -10 && gx < WORLD.w + 10 && gy > -10 && gy < WORLD.h + 10) continue;
        const x = gx + randInt(-13, 13), y = gy + randInt(-13, 13);
        { const k = (gx + gy) % 4 === 0 ? bush : tree, r = k === bush ? bS : tS; sc.add.image(x, y, k).setOrigin(0.5, 0.95).setScale(rand(r[0], r[1]) * (k === bush ? 1.3 : 1) / RES(k)).setDepth(y); }
      }
    }
    // jumpable logs across the horizontal sides — centred on the visible path
    if (p.logs) {
      const sprite = p.logs.sprite || "logs", scale = p.logs.scale || 1.3;
      LOGS.forEach((r) => {
        sc.add.image(r.x, r.y, sprite).setOrigin(0.5, 0.5).setScale(scale / RES(sprite)).setDepth(r.y + (p.logs.depthLift != null ? p.logs.depthLift : 30));
        // default: the barrier blocks the WHOLE width of the path, out to the hedge rows (sand edges and the
        // corridor between sand and hedges included) — nobody slips around it
        const seg = r.y < WORLD.h / 2 ? LOOP_SEG[0] : LOOP_SEG[1], bw = p.logs.boxW || 44;
        const ext = Math.max(SAND, (ENV.forest && ENV.forest.hedgeMargin) || 80);
        const lb = p.logs.box || { dx: -bw / 2, dy: seg.y - ext - r.y, w: bw, h: seg.h + 2 * ext };
        COLLISIONS.push({ x: r.x + lb.dx, y: r.y + lb.dy, w: lb.w, h: lb.h, jumpable: true });
      });
    }
  }
}

// Interior scenery. Each entry is either the legacy array [x, y, sprite, scale, box]
// (box = {dx,dy,w,h} | false for none | omitted for a default footprint) or an object
// { x, y, sprite, scale, box, ground, depth, origin:{x,y}, flip, alpha, anim, glow }.
//   ground:true → flat floor decal (rug, mat…) drawn under everything, no collision.
//   anim: "sway" | "bob" | "pulse" | "spin" — gentle ambient life.
//   glow: "#hex" → a soft additive halo behind the sprite (lamps, crystals…).
function normScenery(e) {
  if (Array.isArray(e)) return { x: e[0], y: e[1], sprite: e[2], scale: e[3], box: e[4] };
  return e;
}
function addSceneryItem(raw, isNew) {
  const s = normScenery(raw);
  if (!s || !s.sprite || !sc.textures.exists(s.sprite)) return null;
  const sc0 = s.scale || 1;
  const o = s.origin || (s.ground ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 0.95 });
  let glow = null;
  if (s.glow) {
    const gl = sc.add.image(s.x, s.y - (s.glowY != null ? s.glowY : 30 * sc0), ensureGlow()).setTint(hexInt(s.glow))
      .setBlendMode(Phaser.BlendModes.ADD).setScale((s.glowSize || 1.6) * sc0).setAlpha(0.55).setDepth(s.ground ? -16 : s.y - 1);
    sc.tweens.add({ targets: gl, alpha: 0.25, scale: gl.scale * 0.85, duration: randInt(1400, 2200), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    glow = gl;
  }
  const img = sc.add.image(s.x, s.y, s.sprite).setOrigin(o.x, o.y).setScale(sc0 / RES(s.sprite))
    .setDepth(s.depth != null ? s.depth : (s.ground ? -17 : s.y));
  if (s.flip) img.setFlipX(true);
  if (s.alpha != null) img.setAlpha(s.alpha);
  img._scGround = !!s.ground; img._scAlpha = s.alpha; img._scAnim = s.anim;
  if (s.anim && !isNew) animateScenery(img, s.anim);     // new items: started by revealScenery
  img._scGlow = glow;
  if (s.ground) return img;
  const box = s.box;
  if (box === false) return img;
  if (box) COLLISIONS.push({ x: s.x + box.dx, y: s.y + box.dy, w: box.w, h: box.h, scen: isNew });
  else COLLISIONS.push({ x: s.x - 16 * sc0, y: s.y - 16, w: 32 * sc0, h: 20, scen: isNew });
  return img;
}
// Entrance of a newly unlocked item: a soft light halo opens, the item drops in with a
// small squash on landing (floor items fade + grow), sparkles, then its idle animation
// starts. One continuous motion — the idle tween must NOT run during the entrance (two
// tweens fighting over the scale made items flicker in and out).
function revealScenery(img, delay) {
  const s = img.scaleX, y = img.y, ground = !!img._scGround, gl = img._scGlow;
  img.setAlpha(0);
  if (gl) gl.setVisible(false);
  const halo = sc.add.image(img.x, ground ? y : y - img.displayHeight * 0.45, ensureGlow())
    .setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff2a8).setAlpha(0).setScale(0.3).setDepth(img.depth - 0.5);
  sc.tweens.add({ targets: halo, alpha: 0.9, scale: Math.max(1.4, img.displayWidth / 70), duration: 380, delay, ease: "Sine.easeOut",
    onComplete: () => sc.tweens.add({ targets: halo, alpha: 0, duration: 650, delay: 250, ease: "Sine.easeIn", onComplete: () => halo.destroy() }) });
  const land = () => {
    emitBurst(img.x, ground ? y + 20 : y, { shape: "star", colors: ["#fff2a8", "#ffd24a", "#ffffff", "#a8e6ff"], count: 12, y0: ground ? 20 : img.displayHeight * 0.5, spread: Math.max(40, img.displayWidth * 0.45) });
    if (gl) { gl.setVisible(true); }
    if (img._scAnim) animateScenery(img, img._scAnim);
  };
  sc.time.delayedCall(delay + 120, () => Sound.play("unlock"));
  if (ground) {
    img.setScale(s * 0.85);
    sc.tweens.add({ targets: img, alpha: img._scAlpha != null ? img._scAlpha : 1, scaleX: s, scaleY: s, duration: 600, delay: delay + 150, ease: "Cubic.easeOut", onComplete: land });
    return;
  }
  img.y = y - 70; img.setScale(s * 0.9, s * 1.08);
  sc.tweens.add({ targets: img, alpha: img._scAlpha != null ? img._scAlpha : 1, duration: 200, delay: delay + 150 });
  sc.tweens.add({ targets: img, y, scaleX: s * 0.96, scaleY: s * 1.04, duration: 420, delay: delay + 150, ease: "Quad.easeIn",
    onComplete: () => {
      land();
      sc.tweens.chain({ targets: img, tweens: [
        { scaleX: s * 1.12, scaleY: s * 0.88, duration: 90, ease: "Quad.easeOut" },
        { scaleX: s * 0.97, scaleY: s * 1.03, duration: 140, ease: "Sine.easeInOut" },
        { scaleX: s, scaleY: s, duration: 160, ease: "Sine.easeOut" },
      ] });
    } });
}
function animateScenery(img, anim) {
  const d = randInt(1800, 2800), s = img.scaleX;
  if (anim === "sway") sc.tweens.add({ targets: img, angle: { from: -2.5, to: 2.5 }, duration: d, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: randInt(0, 800) });
  else if (anim === "bob") sc.tweens.add({ targets: img, y: img.y - 6, duration: d, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: randInt(0, 800) });
  else if (anim === "pulse") sc.tweens.add({ targets: img, scaleX: s * 1.04, scaleY: s * 1.04, duration: d * 0.7, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  else if (anim === "spin") sc.tweens.add({ targets: img, angle: 360, duration: d * 4, repeat: -1 });
  else if (anim === "breathe") sc.tweens.add({ targets: img, scaleY: s * 1.03, duration: d * 0.6, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
}
function buildScenery() {
  (G.scenery || []).forEach((e) => addSceneryItem(e, false));
  UNLOCKS.forEach((u, i) => { if (state.unlocked && state.unlocked[u.id || ("u" + i)]) addSceneryItem(u.scenery || u, false); });
}

// Block the player from crossing obstacles (fence, trees, buildings) — per-axis AABB.
function pushOut(o, hw, hh) {
  COLLISIONS.forEach((m) => {
    const px = o.x, py = o.y;
    if (px + hw > m.x && px - hw < m.x + m.w && py + hh > m.y && py - hh < m.y + m.h) {
      const penX = Math.min(px + hw - m.x, m.x + m.w - (px - hw));
      const penY = Math.min(py + hh - m.y, m.y + m.h - (py - hh));
      if (penX < penY) o.x += (o.x < m.x + m.w / 2 ? -penX : penX);
      else o.y += (o.y < m.y + m.h / 2 ? -penY : penY);
    }
  });
}
// Riding: the body box = the clearance the path planner keeps (NAV.hw/hh) — a wider box made
// rides bump into gaps the planner thought were free, re-plan, bump again: visible jitter.
function blockObstacles() { pushOut(player, mounted ? NAV.hw : 15, mounted ? NAV.hh : 10); }

/* ===================== Navigation (A* on a grid built from COLLISIONS) ===================== */
// Tap-to-move walks AROUND obstacles instead of pushing into them, and creatures only
// pick wander targets they can actually reach.
const NAV = { cell: 20, cols: 0, rows: 0, grid: null, hw: 20, hh: 12 };
function buildNav() {
  NAV.cell = (G.nav && G.nav.cell) || 20;
  const c = NAV.cell;
  NAV.cols = Math.ceil(WORLD.w / c); NAV.rows = Math.ceil(WORLD.h / c);
  NAV.grid = new Uint8Array(NAV.cols * NAV.rows);
  const m = 40;                                                        // world edge margin
  for (let r = 0; r < NAV.rows; r++) for (let q = 0; q < NAV.cols; q++) {
    const x = q * c + c / 2, y = r * c + c / 2;
    if (x < m || x > WORLD.w - m || y < m || y > WORLD.h - m) NAV.grid[r * NAV.cols + q] = 1;
  }
  COLLISIONS.forEach((b) => {
    const x0 = b.x - NAV.hw, x1 = b.x + b.w + NAV.hw, y0 = b.y - NAV.hh, y1 = b.y + b.h + NAV.hh;
    for (let r = Math.max(0, Math.floor(y0 / c)); r <= Math.min(NAV.rows - 1, Math.floor(y1 / c)); r++) {
      const cy = r * c + c / 2; if (cy <= y0 || cy >= y1) continue;
      for (let q = Math.max(0, Math.floor(x0 / c)); q <= Math.min(NAV.cols - 1, Math.floor(x1 / c)); q++) {
        const cx = q * c + c / 2, k = r * NAV.cols + q;
        if (cx > x0 && cx < x1) NAV.grid[k] = b.jumpable ? (NAV.grid[k] || 2) : 1;   // 2 = a barrier you can hop on foot
      }
    }
  });
  COLLISIONS_DIRTY = false;
}
function navCell(x, y) { return { q: clamp(Math.floor(x / NAV.cell), 0, NAV.cols - 1), r: clamp(Math.floor(y / NAV.cell), 0, NAV.rows - 1) }; }
function navFree(q, r) { if (q < 0 || r < 0 || q >= NAV.cols || r >= NAV.rows) return false; const v = NAV.grid[r * NAV.cols + q]; return !v || (v === 2 && NAV.hop); }
function freeAt(x, y) { if (!NAV.grid) return true; const p = navCell(x, y); return navFree(p.q, p.r); }
function nearestFree(q, r, maxR) {
  if (navFree(q, r)) return { q, r };
  for (let d = 1; d <= (maxR || 12); d++) {
    let best = null, bd = Infinity;
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      if (navFree(q + dx, r + dy)) { const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = { q: q + dx, r: r + dy }; } }
    }
    if (best) return best;
  }
  return null;
}
function lineFree(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / (NAV.cell * 0.5));
  for (let i = 1; i <= n; i++) { if (!freeAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false; }
  return true;
}
// hop: plan THROUGH jumpable barriers (the player on foot hops over them, see footHop)
function findPath(sx, sy, tx, ty, hop) {
  NAV.hop = !!hop;
  try { return findPathIn(sx, sy, tx, ty); } finally { NAV.hop = false; }
}
function findPathIn(sx, sy, tx, ty) {
  if (COLLISIONS_DIRTY || !NAV.grid) buildNav();
  const C = NAV.cols, cell = NAV.cell;
  const s0 = navCell(sx, sy), t0 = navCell(tx, ty);
  const s = nearestFree(s0.q, s0.r, 4), t = nearestFree(t0.q, t0.r, 14);
  if (!s || !t) return null;
  const goal = navFree(t0.q, t0.r) ? { x: tx, y: ty } : { x: t.q * cell + cell / 2, y: t.r * cell + cell / 2 };
  if (lineFree(sx, sy, goal.x, goal.y)) return [goal];
  const N = C * NAV.rows, start = s.r * C + s.q, end = t.r * C + t.q;
  const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [];   // binary heap of [f, idx]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = (i) => { const q = i % C, r = (i / C) | 0; const dx = Math.abs(q - t.q), dy = Math.abs(r - t.r); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
  g[start] = 0; push(h(start), start);
  let found = false, guard = 0;
  while (heap.length && guard++ < 40000) {
    const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
    if (i === end) { found = true; break; }
    const q = i % C, r = (i / C) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nq = q + dx, nr = r + dy; if (!navFree(nq, nr)) continue;
      if (dx && dy && (!navFree(q + dx, r) || !navFree(q, r + dy))) continue;   // no corner cutting
      const j = nr * C + nq; if (closed[j]) continue;
      const ng = g[i] + (dx && dy ? 1.4142 : 1);
      if (ng < g[j]) { g[j] = ng; from[j] = i; push(ng + h(j), j); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let i = end; i !== -1 && i !== start; i = from[i]) cells.push({ x: (i % C) * cell + cell / 2, y: ((i / C) | 0) * cell + cell / 2 });
  cells.reverse(); cells[cells.length - 1] = goal;
  // string-pulling: keep only the waypoints needed for straight, natural lines
  const out = []; let ax = sx, ay = sy, k = 0;
  while (k < cells.length) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--) { if (lineFree(ax, ay, cells[j].x, cells[j].y)) { far = j; break; } }
    out.push(cells[far]); ax = cells[far].x; ay = cells[far].y; k = far + 1;
  }
  return out;
}
// Walk the player to (x,y) along a path (falls back to a straight line).
function walkTo(x, y) {
  x = clamp(x, 40, WORLD.w - 40); y = clamp(y, 40, WORLD.h - 40);
  const p = findPath(player.x, player.y, x, y, !mounted);
  navPath = p && p.length ? p : [{ x, y }];
  moveTarget = navPath[0];
}
// A random reachable point inside a rect (used by creatures and spawns).
function freeSpotIn(r, m) {
  m = m || 70;
  for (let i = 0; i < 24; i++) {
    const x = randInt(r.x + m, r.x + r.w - m), y = randInt(r.y + m, r.y + r.h - m);
    if (!COLLISIONS.length || freeAt(x, y)) return { x, y };
  }
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function showWorldLoader() {
  const zone = $("world").parentNode;
  let el = $("world-loader");
  if (!el) { el = document.createElement("div"); el.id = "world-loader"; el.className = "world-loader"; zone.appendChild(el); }
  const th = state && state.player ? thumbSrc(charDef(state.player.avatar)) : "";
  el.innerHTML = `${th ? `<img src="${th}" alt="" draggable="false" />` : ""}<div class="wl-bar"><i></i></div>`;
  el.classList.remove("done");
  return el;
}
function hideWorldLoader() {
  const el = $("world-loader"); if (!el) return;
  el.classList.add("done"); setTimeout(() => el.remove(), 450);
}

function sceneCreate() {
  sc = this;
  computeEnvironment();
  // camera.clampToWorld: never show past the world edges (e.g. a closed room)
  if (G.camera && G.camera.clampToWorld) this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
  else this.cameras.main.setBounds(-700, -700, WORLD.w + 1400, WORLD.h + 1400);
  this.cameras.main.setBackgroundColor((G.world && G.world.bg) || "#6fae4f");
  // Reveal the canvas only once the world has been drawn (no black first frame while
  // loading; #world shows the edge colour meanwhile, then the world fades in).
  const wEl = $("world"), reveal = () => { if (wEl) wEl.classList.add("ready"); hideWorldLoader(); };
  this.game.events.once("postrender", () => requestAnimationFrame(reveal));
  setTimeout(reveal, 2500);
  buildAnims();
  buildWorld();
  cursors = this.input.keyboard.createCursorKeys();
  // Support both QWERTY (WASD) and AZERTY (ZQSD) without capturing keys from inputs.
  wasd = this.input.keyboard.addKeys({ up: "W", down: "S", left: "A", right: "D", up2: "Z", left2: "Q" }, false);
  this.input.keyboard.clearCaptures();
  hookInputFocus();
  this.input.on("pointerdown", (p) => onPointer(p));
}

// Disable the Phaser keyboard while a text <input>/<textarea> is focused.
let focusHooked = false;
function hookInputFocus() {
  if (focusHooked) return;
  focusHooked = true;
  const isField = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  document.addEventListener("focusin", (e) => {
    if (isField(e.target) && sc && sc.input && sc.input.keyboard) { sc.input.keyboard.enabled = false; sc.input.keyboard.resetKeys(); }
  });
  document.addEventListener("focusout", (e) => {
    if (isField(e.target) && sc && sc.input && sc.input.keyboard) sc.input.keyboard.enabled = true;
  });
}

function buildWorld() {
  sc.children.removeAll();
  decorObjs = []; ambient = [];
  COLLISIONS = []; COLLISIONS_DIRTY = true;
  placingDecor = null; ghostDecor = null; jumpRunning = false; navPath = []; moveTarget = null;
  if (R3.on) r3Teardown();
  msRing = msMarker = msArrow = null; chasers = []; catchT = 0; evadeT = 0;

  // Ground: tiled, extending beyond the world so no gaps show at the edges.
  const ground = (G.world && G.world.groundTile) || "grass";
  const gt = sc.add.tileSprite(-700, -700, WORLD.w + 1400, WORLD.h + 1400, ground).setOrigin(0, 0).setDepth(-20);
  gt.setTileScale(((G.world && G.world.groundScale) || 1) / RES(ground));
  // Optional single backdrop image under the world (e.g. a painted room floor).
  if (G.world && G.world.backdrop) {
    const b = G.world.backdrop;
    sc.add.image(b.x || 0, b.y || 0, b.sprite).setOrigin(0, 0).setDisplaySize(b.w || WORLD.w, b.h || WORLD.h).setDepth(-19.5);
  }

  // Configured ground patches (paths in front of buildings, etc.).
  (G.world && G.world.patches || []).forEach((q) => {
    const t = sc.add.tileSprite(q.x, q.y, q.w, q.h, q.tile || "dirt").setOrigin(q.ox != null ? q.ox : 0, q.oy != null ? q.oy : 0).setDepth(-19);
    t.setTileScale((q.tileScale || 1) / RES(q.tile || "dirt"));
  });

  // Zones (e.g. the pen): floor image / tinted ground + fence + label.
  ZONES.forEach((z) => {
    const r = z.rect;
    if (z.floor) {
      sc.add.image(r.x + r.w / 2, r.y + r.h / 2, z.floor).setDisplaySize(r.w + (z.floorPad || 0) * 2, r.h + (z.floorPad || 0) * 2).setDepth(-18);
    } else if (z.tint) {
      const g = sc.add.graphics();
      g.fillStyle(hexInt(z.tint), z.tintAlpha != null ? z.tintAlpha : 0.55);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, 18); g.setDepth(-18);
    }
    if (z.fence) fenceRect(r, { gates: z.gates || "both", gateA: z.gateA, gateB: z.gateB });
    if (z.label) worldLabel(r.x + r.w / 2, r.y - (z.labelLift != null ? z.labelLift : 14), z.label, 99990);
  });

  buildEnvironment();
  buildScenery();

  // Buildings (+ base collision footprint).
  STATIONS.forEach((s) => {
    if (s.glow) {
      const gl = sc.add.image(s.x, s.y - 40, ensureGlow()).setTint(hexInt(s.glow)).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.5).setDepth(s.y - 1);
      sc.tweens.add({ targets: gl, alpha: 0.2, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    const b = sc.add.image(s.x, s.y, s.sprite).setOrigin(0.5, 0.88).setScale((s.scale || 1.2) / RES(s.sprite)).setDepth(s.y);
    if (s.anim) animateScenery(b, s.anim);
    if (s.label) worldLabel(s.x, s.y + (s.labelY != null ? s.labelY : 44), s.label, 99990, 20);
    s.obj = b;
    const box = s.box === false ? null : (s.box || { dx: -70, dy: -60, w: 140, h: 75 });   // box:false → walk onto it (a pad)
    if (box) COLLISIONS.push({ x: s.x + box.dx, y: s.y + box.dy, w: box.w, h: box.h });
  });

  buildDecors();
  buildNav();
  // clear any transient mid-action flags from a save taken during a cure/celebration,
  // so a reloaded creature can never get stranded (unselectable / never departs).
  state.creatures.forEach((c) => { c.departing = false; c.celebrating = false; c.leaving = false; c.arriving = false; });
  state.creatures.forEach((c) => { if (!freeAt(c.x, c.y)) placeInHome(c); buildCreatureObj(c); });

  // Player
  const PL = G.player || {};
  const sh = PL.shadow || { w: 34, h: 12 };
  playerShadow = sc.add.image(0, 2, ensureShadow()).setDisplaySize(sh.w * 1.25, sh.h * 1.6).setAlpha(RENDER.shadowAlpha != null ? RENDER.shadowAlpha : 0.32);
  const sheet = charDef(state.player.avatar).sheet;
  playerSprite = sc.add.sprite(0, 0, sheet, 18).setOrigin(0.5, PL.originY || 0.97).setScale((PL.scale || 1.7) / RES(sheet));
  playerFacing = "down";
  playerName = sc.add.text(0, 0, state.player.name || "", txtStyle(15)).setOrigin(0.5).setDepth(99980);
  if (PL.showName === false) playerName.setVisible(false);
  const sp = PL.spawn || (HOME_ZONE ? { x: HOME_ZONE.rect.x - 240, y: HOME_ZONE.rect.y + HOME_ZONE.rect.h * 0.5 } : { x: 560, y: 700 });
  player = sc.add.container(sp.x, sp.y, [playerShadow, playerSprite]);
  player.setSize(40, 40);
  mounted = null;

  // Selection ring (soft, pulsing) + tap marker + guide arrow.
  const selCol = hexInt(RENDER.selectColor || "#ffd54a");
  selRing = sc.add.ellipse(0, 0, 96, 40, selCol, 0.16);
  selRing.setStrokeStyle(3, selCol, 0.95); selRing.setVisible(false); selRing.setDepth(2);
  sc.tweens.add({ targets: selRing, scaleX: 1.12, scaleY: 1.12, alpha: 0.7, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  guideArrow = null;
  if (GUIDE) {
    guideArrow = sc.add.image(0, 0, ensureShape("arrow")).setTint(hexInt(GUIDE.color || RENDER.selectColor || "#ffd54a")).setScale((GUIDE.scale || 1.3) * 0.5).setDepth(99997).setVisible(false);
  }
  buildAmbient();

  sc.cameras.main.startFollow(player, true, RENDER.cameraLerp || 0.12, RENDER.cameraLerp || 0.12);
  fitZoom();
  sc.cameras.main.centerOn(player.x, player.y);
  lastInputT = nowMs();
  panelId = PANEL_DIRTY;
}

/* ===================== Ambient particles (dust motes, stars, sparkles…) ===================== */
// render.ambient = { particle, colors, count, speed, alpha:[min,max], scale:[min,max], drift:"up"|"down"|"float", blend:"add" }
function buildAmbient() {
  const A = RENDER.ambient; if (!A) return;
  const key = ensureShape(A.particle || "dot");
  const cols = (A.colors || ["#ffffff"]).map(hexInt);
  for (let i = 0; i < (A.count || 24); i++) {
    const p = sc.add.image(rand(0, WORLD.w), rand(0, WORLD.h), key).setTint(cols[i % cols.length]).setDepth(A.depth || 99000);
    if (A.blend === "add") p.setBlendMode(Phaser.BlendModes.ADD);
    p.a0 = rand((A.alpha || [0.2, 0.7])[0], (A.alpha || [0.2, 0.7])[1]);
    p.setScale(rand((A.scale || [0.25, 0.6])[0], (A.scale || [0.25, 0.6])[1]) * 0.5);
    p.ph = rand(0, Math.PI * 2); p.sp = (A.speed || 14) * rand(0.5, 1.3);
    ambient.push(p);
  }
}
function updateAmbient(t, dt) {
  if (!ambient.length) return;
  const A = RENDER.ambient, v = sc.cameras.main.worldView, pad = 40;
  const dir = A.drift === "down" ? 1 : A.drift === "float" ? 0 : -1;
  ambient.forEach((p) => {
    p.y += dir * p.sp * dt; p.x += Math.sin(t / 1700 + p.ph) * 8 * dt;
    if (dir === 0) p.y += Math.cos(t / 2100 + p.ph) * 6 * dt;
    if (p.y < v.y - pad) p.y = v.bottom + pad; else if (p.y > v.bottom + pad) p.y = v.y - pad;
    if (p.x < v.x - pad) p.x = v.right + pad; else if (p.x > v.right + pad) p.x = v.x - pad;
    p.setAlpha(A.twinkle === false ? p.a0 : p.a0 * (0.55 + 0.45 * Math.sin(t / 600 + p.ph * 3)));
  });
}

/* ===================== Creature objects ===================== */

function creatureScale(c) {
  if (!CREATURE.aging) return CREATURE.scale || 1;
  if (!isYoung(c)) return CREATURE.aging.scaleAdult || 2.0;
  const t = clamp(c.age / ADULT_AGE, 0, 1);
  const a = CREATURE.aging.scaleBaby || 1.15, b = CREATURE.aging.scaleAdult || 2.0;
  return a + (b - a) * t;
}
// Height of the creature's head above its feet: configurable, else derived from the
// frame size (the legacy formula for 64-px frames is preserved exactly).
function creatureFrameH() { const s = G.assets && G.assets.sheets && G.assets.sheets[CREATURE.sheet]; return (s && s.frameHeight) || 64; }
function heartY(c) {
  if (CREATURE.headY != null) return -(CREATURE.headY * creatureScale(c) + 14);
  return -(61 * (creatureFrameH() / 64) * creatureScale(c) + 14);
}

function applyVariantTint(sprite, c) {
  const v = variantDef(variantId(c));
  if (v && v.tint != null) sprite.setTint(typeof v.tint === "string" ? hexInt(v.tint) : v.tint);
  else sprite.clearTint();
}
function isHappy(c) {
  const at = CREATURE.happyAt != null ? CREATURE.happyAt : 100;
  return MOOD_NEED ? (c[MOOD_NEED] || 0) >= at : needAverage(c) >= at;
}
function creatureTexture(c) {
  // variant may specify its own sheet (+ an optional "happy" version once its mood is maxed);
  // otherwise base sheet + tint
  const v = variantDef(variantId(c));
  const happy = isHappy(c);
  if (happy && v && v.happySheet && sc.textures.exists(v.happySheet)) return v.happySheet;
  if (happy && !(v && v.sheet) && CREATURE.happySheet && sc.textures.exists(CREATURE.happySheet)) return CREATURE.happySheet;
  return (v && v.sheet) ? v.sheet : CREATURE.sheet;
}
function creatureWalkKey(c) { return "creature-walk-" + creatureTexture(c) + (DIR_SHEET ? "-" + (c.facing || "down") : ""); }

function buildCreatureObj(c) {
  const scale = creatureScale(c);
  const orig = CREATURE.origin || { x: 0.5, y: 0.85 };
  const shw = (CREATURE.shadow && CREATURE.shadow.w) || 58, shh = (CREATURE.shadow && CREATURE.shadow.h) || 16;
  const shadow = sc.add.image(0, 2, ensureShadow()).setDisplaySize(shw * 1.25 * scale, shh * 1.6 * scale).setAlpha(RENDER.shadowAlpha != null ? RENDER.shadowAlpha : 0.32);
  shadow.baseW = shw * 1.25; shadow.baseH = shh * 1.6;
  const tex = creatureTexture(c);
  const body = sc.add.sprite(0, 0, tex).setOrigin(orig.x, orig.y).setScale(scale / RES(tex));
  const wk = (CREATURE.walk || {}), nFrames = Math.max(1, ((wk.end != null ? wk.end : 3) - (wk.start || 0)) + 1);
  body.play({ key: creatureWalkKey(c), startFrame: randInt(0, nFrames - 1) });   // desync, within the strip
  applyVariantTint(body, c);
  // WANT replaces the mood shape, UNLESS wantBubble.withMood: then both coexist
  // (mood shape stays as the always-on colour gauge, want bubble pops in above it).
  const wantOnly = WANT && !WANT.withMood;
  const heart = wantOnly
    ? sc.add.image(0, heartY(c) - (WANT.lift || 6), WANT.sprite).setOrigin(0.5, 1).setScale((WANT.scale || 1) / RES(WANT.sprite)).setVisible(!WANT.intermittent)
    : sc.add.image(0, heartY(c), ensureShape(MOOD_SHAPE)).setOrigin(0.5).setScale(0.95 * 0.5 * (CREATURE.moodScale || 1)).setTint(0x6fcf5f);
  if (CREATURE.showMood === false && !wantOnly) heart.setVisible(false);
  const kids = [shadow, body, heart];
  let wantT = null;
  if (WANT && WANT.withMood) {
    wantT = sc.add.image(0, heartY(c) - (WANT.lift || 22), WANT.sprite).setOrigin(0.5, 1).setScale((WANT.scale || 1) / RES(WANT.sprite)).setVisible(false);
    kids.push(wantT);
  }
  // the name lives on a top layer (never hidden behind furniture); it follows the creature
  const nameT = sc.add.text(c.x, c.y + (CREATURE.nameY != null ? CREATURE.nameY : 22), c.name, txtStyle(CREATURE.nameSize || 16)).setOrigin(0.5).setDepth(99970);
  if (CREATURE.showName === false) nameT.setVisible(false);
  const cont = sc.add.container(c.x, c.y, kids);
  c.obj = cont; c.bodyT = body; c.heartT = heart; c.wantT = wantT; c.nameT = nameT; c.shadowT = shadow;
  c.baseScale = scale; c.k = scale / RES(tex); c.ph = rand(0, Math.PI * 2); c.texKey = body.texture.key;
}

function refreshCreatureVisual(c) {
  if (!c.obj) return;
  const scale = creatureScale(c);
  const tex = creatureTexture(c);
  if (c.bodyT.texture.key !== tex) { c.bodyT.setTexture(tex); c.texKey = tex; }
  c.bodyT.play(creatureWalkKey(c), true);
  applyVariantTint(c.bodyT, c);
  c.baseScale = scale; c.k = scale / RES(tex); c.bodyT.setScale(c.k);
  if (c.shadowT) c.shadowT.setDisplaySize(c.shadowT.baseW * scale, c.shadowT.baseH * scale);
  c.heartT.y = heartY(c) - ((WANT && !WANT.withMood) ? (WANT.lift || 6) : 0);
  if (c.wantT) c.wantT.y = heartY(c) - (WANT.lift || 22);
  c.nameT.setText(c.name);
}

function buildDecors() {
  decorObjs.forEach((o) => o.destroy()); decorObjs = [];
  COLLISIONS = COLLISIONS.filter((m) => !m.deco);
  state.decors.forEach((it) => {
    const d = DECOR.find((x) => x.id === it.id);
    if (!d) return;
    const o = sc.add.image(it.x, it.y, d.sprite).setOrigin(0.5, 0.95).setScale((d.scale || 1.2) / RES(d.sprite)).setDepth(it.y);
    decorObjs.push(o);
    if (d.collision) {
      const b = d.collision;
      COLLISIONS.push({ x: it.x + (b.dx || 0), y: it.y + (b.dy || 0), w: b.w, h: b.h, deco: true });
    }
  });
  COLLISIONS_DIRTY = true;
}

// Animate the player by direction (or idle pose facing the last direction).
function animatePlayer(mvx, mvy, t) {
  if (!playerSprite) return;
  const ch = charDef(state.player.avatar), sheet = ch.sheet;
  const ps = ((G.player && G.player.scale) || 1.7) / RES(sheet);
  if (mounted) {
    const RIDE = (CREATURE && CREATURE.ride) || {};
    if (DIR_SHEET) { if (mvx || mvy) playerFacing = dirOf(mvx, mvy, playerFacing); }       // a vehicle seen from above: 4 directions
    else if (Math.abs(mvx) > 0.3) playerFacing = mvx < 0 ? "left" : "right";   // side-view mount: turn only on a real sideways move (no flip-flop when going up/down)
    else if (playerFacing !== "left" && playerFacing !== "right") playerFacing = "right";
    playerSprite.anims.stop();
    playerSprite.setVisible(!RIDE.hideRider);                                // e.g. a driver hidden inside the car
    // character.rideSheet: a seated pose (one frame, facing left) instead of the standing idle frame
    const rs = ch.rideSheet && sc.textures.exists(ch.rideSheet) ? ch.rideSheet : null;
    if (rs) {
      if (playerSprite.texture.key !== rs) playerSprite.setTexture(rs, 0);
      playerSprite.setFlipX(playerFacing === "right");
      playerSprite.setScale(((G.player && G.player.scale) || 1.7) / RES(rs));
    } else {
      playerSprite.setFrame(DIRS[playerFacing] * 9);
      playerSprite.setScale(ps);
    }
    return;
  }
  if (playerSprite.texture.key !== sheet) playerSprite.setTexture(sheet, DIRS[playerFacing] * 9);
  if (playerSprite.flipX) playerSprite.setFlipX(false);
  if (!playerSprite.visible) playerSprite.setVisible(true);
  if (mvx || mvy) {
    const dir = dirOf(mvx, mvy, playerFacing);
    playerFacing = dir;
    const ak = `${sheet}-${dir}`;
    const cur = playerSprite.anims.currentAnim;
    if (!playerSprite.anims.isPlaying || !cur || cur.key !== ak) playerSprite.play(ak, true);
    playerSprite.timeScale = running ? 1.5 : 1;
    playerSprite.setScale(ps);
  } else {
    playerSprite.anims.stop();
    playerSprite.setFrame(DIRS[playerFacing] * 9);
    // idle "breathing" so the character never looks frozen
    const b = RENDER.breathe === false ? 0 : 0.018 * Math.sin(t / 420);
    playerSprite.setScale(ps * (1 - b * 0.5), ps * (1 + b));
  }
}

/* ===================== Loop ===================== */

function sceneUpdate(time, delta) {
  if (!player) return;
  const dt = Math.min(delta / 1000, 0.1);
  const modalOpen = !$("modal").classList.contains("hidden") || nightRunning || closeupOpen || R3.on;
  if (COLLISIONS_DIRTY) buildNav();

  let vx = 0, vy = 0;
  if (!modalOpen) {
    if (cursors.left.isDown || wasd.left.isDown || wasd.left2.isDown) vx -= 1;
    if (cursors.right.isDown || wasd.right.isDown) vx += 1;
    if (cursors.up.isDown || wasd.up.isDown || wasd.up2.isDown) vy -= 1;
    if (cursors.down.isDown || wasd.down.isDown) vy += 1;
  }

  if (vx || vy) { followCreature = null; lastInputT = nowMs(); }
  if (followCreature && !mounted && !modalOpen) {
    const c = followCreature, dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy) || 1;
    if (d < 92) {
      const auto = followAuto; followCreature = null; followAuto = false; moveTarget = null; navPath = [];
      if (auto) autoAction(c);
    } else if (nowMs() - followStart > 5000) {
      // never chase a wandering / unreachable creature forever (the player "moving by itself")
      followCreature = null; followAuto = false; moveTarget = null; navPath = []; running = false;
    } else if (time > followRepath || !moveTarget) {
      followRepath = time + 280;
      walkTo(c.x + (dx / d) * 72, c.y + (dy / d) * 72);
    }
  }

  const RIDE = CREATURE && CREATURE.ride;
  let mvx = 0, mvy = 0, stepMax = Infinity;
  if (!jumpRunning) {
    const sp = (G.player && G.player.speed) || { walk: 200, run: 370, rideWalk: 340, rideRun: 560 };
    const spd = mounted ? (running ? sp.rideRun : sp.rideWalk) * (mounted.speedMul || 1) * rideEmptyMul() : (running ? sp.run : sp.walk);
    if (vx || vy) {
      moveTarget = null; navPath = []; pendingInteract = null; running = false;
      const n = Math.hypot(vx, vy); mvx = vx / n; mvy = vy / n;
    } else if (moveTarget && !modalOpen) {
      const dx = moveTarget.x - player.x, dy = moveTarget.y - player.y, d = Math.hypot(dx, dy);
      stepMax = d;                                   // land ON the waypoint, never past it
      if (d < 8) {
        navPath.shift();
        if (navPath.length) moveTarget = navPath[0];
        else { moveTarget = null; running = false; if (pendingInteract) { const r = pendingInteract; pendingInteract = null; interact(r); } }
      } else { mvx = dx / d; mvy = dy / d; }
    }
    if (mvx || mvy) {
      const ox = player.x, oy = player.y;
      const step = Math.min(spd * dt, stepMax);
      // sub-steps of <= 8 px, each checked against the obstacles: a slow frame (big dt) must never carry a
      // fast ride THROUGH a thin wall (hedge, rail) in one jump
      const n = Math.max(1, Math.ceil(step / 8));
      let hopped = false;
      for (let i = 0; i < n && !hopped; i++) {
        const sx = player.x, sy = player.y;
        player.x = clamp(player.x + mvx * step / n, 40, WORLD.w - 40);
        player.y = clamp(player.y + mvy * step / n, 40, WORLD.h - 40);
        hopped = !mounted && footHop(sx, sy, mvx, mvy);   // on foot: climb over a barrier
        if (!hopped) blockObstacles();
      }
      // stuck against something while auto-walking → re-plan the route
      if (hopped) player.stuck = 0;
      else if (moveTarget && Math.hypot(player.x - ox, player.y - oy) < spd * dt * 0.25) {
        player.stuck = (player.stuck || 0) + dt;
        if (player.stuck > 0.35) {
          player.stuck = 0; const now = nowMs();
          player.replans = (now - (player.replanT || 0) < 2500) ? (player.replans || 0) + 1 : 1; player.replanT = now;
          const last = navPath[navPath.length - 1];
          if (player.replans > 3 || !last) { moveTarget = null; navPath = []; running = false; pendingInteract = null; followCreature = null; followAuto = false; }   // unreachable: stop, don't shake (nor keep following)
          else walkTo(last.x, last.y);
        }
      } else player.stuck = 0;
    }
    animatePlayer(mvx, mvy, time);
  } else {
    animatePlayer(0, 0, time);
  }
  playerMoving = !!(mvx || mvy) || jumpRunning;
  player.setDepth(player.y + (jumpRunning ? 400 : 0));     // in the air: drawn over the barrier it clears

  // Decor placement: ghost stays beside the player, red if the spot is forbidden.
  if (placingDecor && ghostDecor) {
    if (playerFacing === "left") ghostSide = -1; else if (playerFacing === "right") ghostSide = 1;
    const g = ghostXY();
    ghostDecor.x = g.x; ghostDecor.y = g.y; ghostDecor.setDepth(g.y + 0.5);
    if (placementError(placingDecor, g.x, g.y)) ghostDecor.setTint(0xff5555); else ghostDecor.clearTint();
  }

  // Riding: the creature is on the ground under the player, who sits on its back.
  if (mounted && RIDE) {
    const arc = jumpAnim.h * 70;
    mounted.obj.x = player.x; mounted.obj.y = player.y - arc; mounted.x = player.x; mounted.y = player.y;
    mounted.obj.setDepth(player.y - 1 + (jumpRunning ? 400 : 0));
    faceMount(mounted);
    playerSprite.y = (RIDE.sitY || -58) - arc; playerShadow.setVisible(false);
    // ride.sitX: shift the rider towards the tail (side-view mounts face left by default)
    if (RIDE.sitX && !DIR_SHEET) playerSprite.x = playerFacing === "right" ? -RIDE.sitX : RIDE.sitX;
    if (playerName) playerName.setPosition(player.x, player.y + (RIDE.nameY || -138) - arc);
    if (RIDE.fatigueNeed) {
      const rate = ((mvx || mvy) ? (running ? 2.4 : 1.1) : 0.3) * (mounted.drainMul || 1);
      rideFatigueAcc += rate * dt;
      if (rideFatigueAcc >= 1) {
        const dn = Math.floor(rideFatigueAcc); rideFatigueAcc -= dn;
        mounted[RIDE.fatigueNeed] = clamp01(mounted[RIDE.fatigueNeed] - dn);
        if (mounted[RIDE.fatigueNeed] > 0) mounted._scEmptyWarned = false;
        if (mounted[RIDE.fatigueNeed] <= 0) {
          if (RIDE.empty === "slow") rideEmptyWarn(mounted);     // stay on board, crawling (e.g. out of fuel)
          else dismount(mounted, true);
        }
      }
    }
  } else if (!mounted) {
    if (footHopping) { playerSprite.y = -jumpAnim.h * 34; playerSprite.x = 0; }        // little hop over a barrier
    else if (playerSprite.y !== 0 || playerSprite.x !== 0) { playerSprite.y = 0; playerSprite.x = 0; playerShadow.setVisible(true); }
    if (playerName) playerName.setPosition(player.x, player.y + PLAYER_NAME_Y);
  }

  // Trail-visit stat (marked once when the player steps onto the path).
  if (state.stats && PATHS.length && !state.stats.trailVisit && player && onPath(player.x, player.y, 0)) {
    if (statKeys().includes("trailVisit")) { state.stats.trailVisit = 1; refreshHud(); }
  }

  if (!modalOpen) { if (MISSIONS) missionTick(dt, time); if (CHASE) chaseTick(dt); }
  updateCreatures(time, dt);
  updateAmbient(time, dt);
  refreshInteraction();
  updateGuide(time);
}

function updateCreatures(now, dt) {
  const departed = [];
  const W = CREATURE ? (CREATURE.walk || {}) : {};
  const wanderSpeed = W.speed || 40;
  state.creatures.forEach((c) => {
    if (!c.obj) return;
    let moving = false;
    if (c.departing) {                                    // cured → walk OUT of the room, then fade out
      const dp = (CREATURE && CREATURE.depart) || {};
      const sp = dp.speed || 110;
      const dx = c.exitX - c.x, dy = c.exitY - c.y, d = Math.hypot(dx, dy) || 1;
      if (d > 6) { c.x += (dx / d) * sp * dt; c.y += (dy / d) * sp * dt; faceCreature(c, dx, dy); moving = true; }
      c.obj.x = c.x; c.obj.y = c.y; c.obj.setDepth(c.y);
      c.departT = (c.departT || 0) + dt;
      // don't start fading until the creature has actually walked out of the home zone,
      // so they never vanish mid-room; once outside they fade quickly and are removed.
      if (leftHome(c)) c.obj.alpha = Math.max(0, c.obj.alpha - dt * 1.6);
      if (d < 10 || c.obj.alpha <= 0.03 || c.departT > 10) departed.push(c);
      animateCreatureBody(c, now, true);
      return;
    }
    if (c !== mounted) {
      if (c.celebrating) {
        c.obj.x = c.x; c.obj.y = c.y; c.obj.setDepth(c.y);
      } else if (!c.arriving && distPlayer(c.x, c.y) < 115) {
        c.nextStep = now + 800;
        if (!DIR_SHEET) faceCreature(c, player.x - c.x, 0);   // turn to look at the player (side-view sheets)
        c.obj.x = c.x; c.obj.y = c.y; c.obj.setDepth(c.y);
      } else {
        if (!c.arriving && now > c.nextStep && CREATURE.wander !== false) {   // wander:false → stays put (parked cars)
          const p = freeSpotIn(homeRect(), 70);
          // only accept a target reachable in a straight line (no walking through furniture)
          if (lineFree(c.x, c.y, p.x, p.y)) { c.tx = p.x; c.ty = p.y; }
          c.nextStep = now + randInt(2500, 6000);
        }
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
        const spd = c.arriving ? ((CREATURE.arrive && CREATURE.arrive.speed) || 120) : wanderSpeed;
        if (d > 3) { c.x += (dx / d) * spd * dt; c.y += (dy / d) * spd * dt; if (Math.abs(dx) > 1 || DIR_SHEET) faceCreature(c, Math.abs(dx) > 1 ? dx : 0, dy); moving = true; }
        else if (c.arriving) { c.arriving = false; c.nextStep = now + randInt(1200, 3000); }
        if (!c.arriving) {
          const o = { x: c.x, y: c.y }; pushOut(o, 12, 8); c.x = o.x; c.y = o.y;      // never sink into furniture
        }
        c.obj.x = c.x; c.obj.y = c.y; c.obj.setDepth(c.y);
      }
    } else {
      faceMount(c);
      moving = playerMoving;
    }
    animateCreatureBody(c, now, moving);
    updateMood(c, now);
  });
  // gentle separation so creatures don't stack on top of each other
  const list = state.creatures;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (!a.obj || !b.obj || a === mounted || b === mounted || a.departing || b.departing) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const minD = (CREATURE.spacing || 46);
    if (d > 0.01 && d < minD) {
      const push = (minD - d) * 0.5 * Math.min(1, dt * 6), ux = dx / d, uy = dy / d;
      a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
    }
  }
  if (departed.length) {
    departed.forEach(removeCreature);
    refreshHud(); panelId = PANEL_DIRTY;
    const dp = CREATURE && CREATURE.depart;
    if (dp && dp.emptyMessage && !state.creatures.some((c) => !c.departing)) message(dp.emptyMessage);
  }
}

// Procedural body life: idle breathing and (optionally) a bouncy hop while walking.
function animateCreatureBody(c, now, moving) {
  if (c.nameT && c.obj) { c.nameT.setPosition(c.obj.x, c.obj.y + (CREATURE.nameY != null ? CREATURE.nameY : 22)); c.nameT.setAlpha(c.obj.alpha); }
  const t = c.bodyT; if (!t || c.celebrating || (sc.tweens.isTweening && sc.tweens.isTweening(t))) return;
  const s = c.baseScale || 1, k = c.k || s, W = CREATURE.walk || {};
  if (W.idleFrame != null) {                     // stand still on a pose instead of walking in place
    if (moving) { const key = creatureWalkKey(c), cur = t.anims.currentAnim; if (!t.anims.isPlaying || !cur || cur.key !== key) t.play(key); }
    else if (t.anims.isPlaying || t.frame.name !== idleFrameOf(c)) { t.anims.stop(); t.setFrame(idleFrameOf(c)); }
  }
  if (moving && W.hop) {
    const ph = (now / (W.hopPeriod || 300)) * Math.PI + c.ph;
    const h = Math.abs(Math.sin(ph));
    t.y = -h * W.hop * s;
    const sq = (1 - h) * (W.squash != null ? W.squash : 0.08);
    t.setScale(k * (1 + sq), k * (1 - sq));
    if (c.shadowT) c.shadowT.setAlpha((RENDER.shadowAlpha || 0.32) * (1 - 0.35 * h));
  } else {
    const b = RENDER.breathe === false ? 0 : (CREATURE.breathe != null ? CREATURE.breathe : 0.025) * Math.sin(now / 480 + c.ph);
    t.y = 0; t.setScale(k * (1 - b * 0.6), k * (1 + b));
  }
}

function updateMood(c, now) {
  if (WANT) {
    // a "needs care" bubble: shown while the creature still wants the treatment, hidden once cured / leaving.
    // withMood → the bubble lives in its own slot (c.wantT) and the mood shape (c.heartT) stays on as a gauge.
    const wt = WANT.withMood ? c.wantT : c.heartT;
    const nv = WANT.need ? (c[WANT.need] || 0) : needAverage(c);
    const wants = wt && nv < (WANT.below != null ? WANT.below : 100) && !c.departing && !c.celebrating && !c.arriving;
    const lift = WANT.lift || (WANT.withMood ? 22 : 6), base = WANT.scale || 1;
    if (wt) {
      if (!wants) {
        wt.setVisible(false); c.wantUntil = null;             // cured/leaving → no bubble
      } else if (WANT.intermittent) {
        // pop up for a moment, then hide for a random gap (desynced per creature) — they "pipe up" now and then
        if (c.wantUntil == null) {                            // first eligibility: stay quiet a random while
          c.wantPhase = "hide"; c.wantUntil = now + randInt(300, (WANT.hideMax || 9) * 1000);
        }
        if (now >= c.wantUntil) {
          if (c.wantPhase === "show") { c.wantPhase = "hide"; c.wantUntil = now + randInt((WANT.hideMin || 5) * 1000, (WANT.hideMax || 11) * 1000); }
          else { c.wantPhase = "show"; c.wantShownAt = now; c.wantUntil = now + (WANT.showFor || 2.5) * 1000; }
        }
        const showing = c.wantPhase === "show";
        wt.setVisible(showing);
        if (showing) {
          const e = Math.min(1, (now - c.wantShownAt) / 220); // springy pop-in
          const k = e < 1 ? (1 + 0.25 * Math.sin(e * Math.PI)) * e : 1;
          wt.setScale(base / RES(WANT.sprite) * (0.4 + 0.6 * k));
          wt.y = heartY(c) - lift + Math.sin(now / 300 + c.ph) * 3;
        }
      } else {
        wt.setVisible(true);
        wt.y = heartY(c) - lift + Math.sin(now / 320 + c.ph) * 3;  // gentle bob
      }
    }
    if (WANT.withMood) {                                       // mood shape keeps its colour gauge alongside the bubble
      c.heartT.setTint(moodColor(needAverage(c)));
      c.heartT.y = heartY(c) + Math.sin(now / 400 + c.ph) * 2;
    }
  } else {
    c.heartT.setTint(moodColor(needAverage(c)));
    c.heartT.y = heartY(c) + Math.sin(now / 400 + c.ph) * 2;
  }
}

// True once a departing creature has crossed outside the home zone (so fading can begin).
function leftHome(c) {
  const z = HOME_ZONE && HOME_ZONE.rect;
  if (!z) return (c.departT || 0) > 0.4;
  const m = 8;
  return c.x < z.x - m || c.x > z.x + z.w + m || c.y < z.y - m || c.y > z.y + z.h + m;
}
// A cured creature walks off to an exit and is removed (generic; see creature.depart).
function departCreature(c) {
  if (!CREATURE || !CREATURE.depart || c.departing) return;
  const to = CREATURE.depart.to || { x: (G.player && G.player.spawn && G.player.spawn.x) || c.x, y: WORLD.h + 80 };
  c.departing = true; c.departT = 0; c.exitX = to.x; c.exitY = to.y;
  if (c === activeTarget) { activeTarget = null; panelId = PANEL_DIRTY; }
}
function removeCreature(c) {
  if (c.obj) { c.obj.destroy(); c.obj = null; }
  if (c.nameT) { c.nameT.destroy(); c.nameT = null; }
  const i = state.creatures.indexOf(c);
  if (i >= 0) state.creatures.splice(i, 1);
  save();
}

// A station with action "spawn" brings a random number of fresh creatures (up to a cap).
// spawn.from = {x,y} → they walk in from there (a door) instead of popping in place.
function spawnCreatures(st) {
  const sp = st.spawn || {};
  const cap = sp.cap === "capacity" ? state.capacity : (sp.cap || 8);   // "capacity" → the shop-upgradable room
  const active = state.creatures.filter((c) => !c.departing).length;
  const room = cap - active;
  if (room <= 0) { message(sp.fullMessage || L("Full!")); Sound.play("error"); return; }
  const n = Math.min(randInt(sp.min || 1, sp.max || 3), room);
  Sound.play(st.sfx || "spawn");
  if (st.obj && sc) { const s = st.obj.scaleX; sc.tweens.add({ targets: st.obj, scaleX: s * 1.08, scaleY: s * 0.92, duration: 110, yoyo: true, repeat: 1 }); }
  const from = sp.from || (CREATURE.arrive && CREATURE.arrive.from);
  for (let i = 0; i < n; i++) {
    const c = newCreature({});
    state.creatures.push(c);
    if (from) {
      const dest = { x: c.x, y: c.y };
      c.x = from.x + randInt(-20, 20); c.y = from.y + i * 26; c.tx = dest.x; c.ty = dest.y; c.arriving = true;
    }
    if (sc) {
      buildCreatureObj(c);
      if (c.obj) {
        c.obj.alpha = 0;
        sc.tweens.add({ targets: c.obj, alpha: 1, duration: 350, delay: i * 220 });
      }
      if (!from) actionAnim(c, { motion: "hop", particle: "spark", colors: ["#ffffff", "#ffd24a", "#a8e6ff"], count: 4, y0: 30 });
    }
  }
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (sp.message) message(sp.message.replace("{n}", n));
  refreshHud(); save(); panelId = PANEL_DIRTY; refreshInteraction();
}

function distPlayer(x, y) { return Math.hypot(player.x - x, player.y - y); }
// Money in: coins + the lifetime "earned" stat (when a game tracks it in objectives.extraStats).
function earn(n) { if (!n) return; state.coins += n; if (state.stats && statKeys().includes("earned")) state.stats.earned = (state.stats.earned || 0) + n; }
function spend(n) { if (state.coins < n) { Sound.play("error"); message(META.notEnough || L("Not enough coins!")); return false; } state.coins -= n; return true; }

function refreshInteraction() {
  if (placingDecor) {
    activeTarget = null;
    if (selRing) selRing.setVisible(false);
    if (panelId !== "place") { panelId = "place"; buildPanel(); }
    $("btn-action").classList.add("hidden");
    return;
  }
  let best = null, dmin = Infinity;
  if (mounted) {
    best = mounted;
    // station.whileRiding: reachable without getting off (e.g. a gas station you drive into)
    STATIONS.forEach((s) => { if (!s.whileRiding && !s.requireMounted) return; const d = distPlayer(s.x, s.y); if (d < (s.reach || 110) * 1.4 && d < dmin) { dmin = d; best = s; } });
  } else {
    STATIONS.forEach((s) => { const d = distPlayer(s.x, s.y); if (d < (s.reach || 110) && d < dmin) { dmin = d; best = s; } });
    state.creatures.forEach((c) => { if (c.departing || c.celebrating || c.leaving || c.arriving) return; const d = distPlayer(c.x, c.y); if (d < 95 && d < dmin) { dmin = d; best = c; } });
  }
  const prev = activeTarget;
  activeTarget = best;
  const id = best ? (best.variant !== undefined && !best.station ? "c" + best.id : "s" + best.type) : null;
  if (id !== panelId) {
    panelId = id; buildPanel();
    if (best && best !== prev) {
      Sound.play("select");
      if (isCreature(best) && best.bodyT && sc && !best.celebrating && CREATURE.hello !== false) {   // a little "hello!" hop
        sc.tweens.add({ targets: best.bodyT, y: -14 * (best.baseScale || 1), duration: 140, yoyo: true, ease: "Quad.easeOut" });
      }
    }
  }
  if (best && isCreature(best)) refreshBars(best);

  if (best && selRing) {
    selRing.setPosition(best.x, best.y + 6).setVisible(true).setDepth(best.y - 1);
  } else if (selRing) selRing.setVisible(false);

  $("btn-action").classList.add("hidden");
}
function isCreature(t) { return t && t.variant !== undefined && !t.station; }

/* ===================== Guide arrow (where to go next) ===================== */
// guide = { idle: seconds before it shows, color, scale, moodBelow, station:true }
let guideTarget = null, guideRepick = 0;
function pickGuideTarget() {
  const active = state.creatures.filter((c) => c.obj && !c.departing && !c.celebrating && !c.leaving && !c.arriving);
  const wants = (c) => WANT ? ((WANT.need ? (c[WANT.need] || 0) : needAverage(c)) < (WANT.below != null ? WANT.below : 100))
    : needAverage(c) < (GUIDE.moodBelow || 60);
  const cands = active.filter(wants);
  if (cands.length) return cands.reduce((a, b) => (distPlayer(a.x, a.y) <= distPlayer(b.x, b.y) ? a : b));
  if (GUIDE.station === false) return null;
  if (!active.length) return STATIONS.find((s) => s.action === "spawn") || null;            // nobody here → bring more
  if (GUIDE.rest && (state.actionsSinceRest || 0) > 0) return STATIONS.find((s) => s.action === "nextDay") || null;
  return null;
}
function updateGuide(time) {
  const edge = guideEdgeEl();
  if (!GUIDE || !guideArrow) { if (edge) edge.classList.add("hidden"); return; }
  const idle = (nowMs() - lastInputT) / 1000;
  const busy = activeTarget || moveTarget || followCreature || closeupOpen || nightRunning || placingDecor || !$("modal").classList.contains("hidden");
  if (busy || idle < (GUIDE.idle != null ? GUIDE.idle : 4)) { guideArrow.setVisible(false); guideTarget = null; if (edge) edge.classList.add("hidden"); return; }
  if (!guideTarget || time > guideRepick || (isCreature(guideTarget) && (guideTarget.departing || guideTarget.celebrating || !state.creatures.includes(guideTarget)))) {
    guideTarget = pickGuideTarget(); guideRepick = time + 1500;
  }
  const tg = guideTarget;
  if (!tg) { guideArrow.setVisible(false); if (edge) edge.classList.add("hidden"); return; }
  const top = isCreature(tg) ? tg.y + heartY(tg) - 34 : tg.y - ((tg.obj && tg.obj.displayHeight) || 120) * 0.95 - 10;
  guideArrow.setPosition(tg.x, top + Math.sin(time / 180) * 9).setVisible(true);
  // off-screen → an arrow on the screen edge pointing towards it
  const v = sc.cameras.main.worldView;
  const inView = tg.x > v.x + 20 && tg.x < v.right - 20 && tg.y > v.y + 40 && tg.y < v.bottom - 20;
  if (edge) {
    if (inView) edge.classList.add("hidden");
    else {
      const cx = v.centerX, cy = v.centerY, ang = Math.atan2(tg.y - cy, tg.x - cx);
      // keep the pointer in the free band between the HUD bar and the bottom panel (never over a button)
      const r = sc.game.canvas.getBoundingClientRect(), bar = document.querySelector("#screen-game .top-bar"), pn = $("panel");
      const barB = bar ? bar.getBoundingClientRect().bottom : r.top, pr = pn && pn.offsetHeight ? pn.getBoundingClientRect() : null;
      const top = Math.max(r.top, barB) + 34, bot = Math.min(r.bottom, pr && pr.top > top + 80 ? pr.top : r.bottom) - 34;
      const lft = r.left + 34, rgt = r.right - 34, mx = (lft + rgt) / 2, my = (top + bot) / 2;
      const k = Math.min(Math.abs((rgt - lft) / 2 / (Math.cos(ang) || 1e-6)), Math.abs((bot - top) / 2 / (Math.sin(ang) || 1e-6)));
      edge.style.left = (mx + Math.cos(ang) * k) + "px";
      edge.style.top = (my + Math.sin(ang) * k) + "px";
      edge.style.setProperty("--ang", (ang * 180 / Math.PI) + "deg");
      edge.classList.remove("hidden");
    }
  }
}
let guideEdge = null;
function guideEdgeEl() {
  if (!GUIDE) return null;
  if (!guideEdge) { guideEdge = document.createElement("div"); guideEdge.className = "guide-edge hidden"; guideEdge.innerHTML = `<span>${iconHTML("arrow")}</span>`; document.body.appendChild(guideEdge); }
  return guideEdge;
}

/* ===================== Pointer ===================== */

function onPointer(p) {
  if (!$("modal").classList.contains("hidden") || closeupOpen || nightRunning || R3.on) return;
  const wx = p.worldX, wy = p.worldY;
  const tnow = nowMs();
  running = (tnow - lastTapT) < 350;
  lastTapT = tnow; lastInputT = tnow;

  followCreature = null; followAuto = false;
  let target = null, dmin = Infinity;
  STATIONS.forEach((s) => { const d = Math.hypot(s.x - wx, (s.y - 30) - wy); if (d < (s.tapRadius || 80) && d < dmin) { dmin = d; target = s; } });
  state.creatures.forEach((c) => {
    if (c === mounted || c.departing || c.celebrating || c.leaving) return;
    const d = Math.hypot(c.x - wx, (c.y + heartY(c) * 0.45) - wy);           // tap anywhere on the body
    if (d < 62 * Math.max(1, c.baseScale || 1) && d < dmin) { dmin = d; target = c; }
  });
  if (target && isCreature(target)) {
    followCreature = target; pendingInteract = null; followRepath = 0; followStart = nowMs();
    followAuto = !!(CREATURE.tapAction);
    tapRipple(target.x, target.y + 6, true);
  } else if (target) {
    const dx = player.x - target.x, dy = player.y - target.y, d = Math.hypot(dx, dy) || 1;
    walkTo(target.x + (dx / d) * 90, target.y + (dy / d) * 90);
    pendingInteract = target;
    tapRipple(target.x, target.y + 6, true);
  } else {
    walkTo(wx, wy); pendingInteract = null;
    tapRipple(clamp(wx, 40, WORLD.w - 40), clamp(wy, 40, WORLD.h - 40));
  }
  Sound.play("tap");
}

// A ripple on the ground where the player tapped (clear "I'm going there" feedback).
function tapRipple(x, y, strong) {
  if (!sc || RENDER.tapMarker === false) return;
  const col = hexInt(RENDER.tapColor || RENDER.selectColor || "#ffffff");
  const r = sc.add.ellipse(x, y, 54, 22).setStrokeStyle(strong ? 4 : 3, col, 0.95).setDepth(1).setScale(0.3);
  sc.tweens.add({ targets: r, scaleX: 1.25, scaleY: 1.25, alpha: 0, duration: 520, ease: "Quad.easeOut", onComplete: () => r.destroy() });
  const d = sc.add.ellipse(x, y, 10, 5, col, 0.9).setDepth(1);
  sc.tweens.add({ targets: d, alpha: 0, duration: 700, onComplete: () => d.destroy() });
}

// creature.tapAction: tapping a creature walks to it AND starts this action on arrival
// (one tap instead of two — great for young kids). Only while it still "wants" it.
function autoAction(c) {
  const id = CREATURE.tapAction; if (!id || !state.creatures.includes(c) || c.departing || c.leaving || c.celebrating) return;
  if (WANT) { const nv = WANT.need ? (c[WANT.need] || 0) : needAverage(c); if (nv >= (WANT.below != null ? WANT.below : 100)) return; }
  activeTarget = c;
  creatureAction(id);
}

/* ===================== Panel ===================== */

function buildPanel() {
  const p = $("panel");
  p.classList.remove("idle");
  if (placingDecor) {
    p.innerHTML = `<div class="pc-card"><div class="pc-main"><div class="pc-tag">${fmt((META.placeHint || L("Walk anywhere, then place {item}.")).replace("{item}", placingDecor.name))}</div></div></div>
      <div class="pc-actions">
        <button class="act" style="--c:var(--good)" data-place="1"><span class="act-ico">${iconHTML("check")}</span><span class="act-lbl">${esc(META.placeHere || L("Place here"))}</span></button>
        <button class="act" style="--c:var(--bad)" data-cancel-place="1"><span class="act-ico">${iconHTML("close")}</span><span class="act-lbl">${esc(META.cancel || L("Cancel"))}</span></button>
      </div>`;
    panelPop(p);
    return;
  }
  if (!activeTarget) {
    p.classList.add("idle");
    p.innerHTML = META.idleHint === "" ? "" : `<p class="panel-hint">${iconHTML(META.idleIcon || "hand")}<span>${fmt(META.idleHint || L("Walk around and approach something to act."))}</span></p>`;
    return;
  }
  const actBtn = (attr, icon, label, color, cls) => `<button class="act ${cls || ""}" ${attr} style="--c:${color || "var(--primary)"}"><span class="act-ico">${iconHTML(icon)}</span><span class="act-lbl">${fmt(stripIcons(label))}</span></button>`;
  if (isCreature(activeTarget)) {
    const c = activeTarget, isMounted = mounted === c;
    let actions;
    if (isMounted) {
      const rideAct = ACTIONS.find((a) => a.type === "ride");
      const jumpAct = ACTIONS.find((a) => a.type === "jump");
      // several race actions = several race modes (e.g. a race against rivals AND a chase): one button each
      const raceActs = RACE ? ACTIONS.filter((a) => a.type === "race") : [];
      actions = raceActs.map((ra, i) => actBtn(`data-creature="${ra.id}"`, ra.icon, ra.label, ra.color, i === 0 ? "act-primary" : "")).join("")
        + (jumpAct ? actBtn(`data-creature="${jumpAct.id}"`, jumpAct.icon, jumpAct.label, jumpAct.color) : "")
        + actBtn(`data-creature="${rideAct.id}"`, rideAct.dismountIcon || "close", rideAct.dismountLabel || L("Get off"), "var(--bad)");
    } else {
      const list = ACTIONS.filter((a) => a.type !== "jump" && a.type !== "race");
      const single = list.length === 1;
      actions = list.map((a) => actBtn(`data-creature="${a.id}"`, a.icon, a.label, a.color,
        (a.type === "closeup" ? "act-primary" : "") + (single ? " act-wide" : "") + (a.type === "customize" ? " act-soft" : ""))).join("");
    }
    const ageTxt = CREATURE.aging ? `${stripIcons(isYoung(c) ? (CREATURE.youngLabel || L("Young")) : (CREATURE.adultLabel || L("Adult")))} · ${c.age}${META.ageUnit || "d"}` : "";
    const v = variantDef(variantId(c));
    const thumb = v && v.thumb ? av(v.thumb) : null;
    p.innerHTML = `
      <div class="pc-card">
        <div class="pc-portrait" style="--c:${(v && v.color) || "var(--primary)"}">${thumb ? `<img src="${thumb}" alt="" />` : iconHTML(CREATURE.icon || "heart")}</div>
        <div class="pc-main">
          <div class="pc-title"><span class="pc-name">${esc(c.name)}</span>${ageTxt ? `<span class="pc-tag">${esc(ageTxt)}</span>` : ""}</div>
          ${CREATURE.showMood === false ? "" : '<div class="pc-mood" id="pc-mood"></div>'}
        </div>
      </div>
      ${CREATURE.showBars === false ? "" : '<div class="pc-needs" id="pc-bars"></div>'}
      <div class="pc-actions${(isMounted ? (RACE ? 3 : 2) : ACTIONS.filter((a) => a.type !== "jump" && a.type !== "race").length) >= 3 ? " tiles" : ""}">${actions}</div>`;
    refreshBars(c);
  } else {
    const s = activeTarget;
    const st = STATIONS.find((x) => x.type === s.type);
    const img = st && assetPath(st.sprite) ? av(assetPath(st.sprite)) : null;
    p.innerHTML = `<div class="pc-card">
        <div class="pc-portrait station">${img ? `<img src="${img}" alt="" />` : iconHTML(st.icon || "home")}</div>
        <div class="pc-main"><div class="pc-title"><span class="pc-name">${fmt(stripIcons(st.label || ""))}</span></div>${st.hint ? `<div class="pc-tag">${fmt(st.hint)}</div>` : ""}</div>
      </div>
      <div class="pc-actions">${actBtn(`data-station="${s.type}"`, st.icon || "check", st.actionLabel || st.label, st.color, "act-primary act-wide")}</div>`;
  }
  panelPop(p);
}
function panelPop(p) { p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop"); }

function refreshBars(c) {
  const mood = $("pc-mood");
  if (mood) {
    const m = needAverage(c);
    let html;
    if (CREATURE.moodFaces) {
      const f = CREATURE.moodFaces;
      html = iconHTML(f[Math.min(f.length - 1, Math.floor(m / (100 / f.length + 0.001)))], "mood-face");
    } else {
      const n = Math.round(m / 25);
      html = [0, 1, 2, 3].map((i) => iconHTML(i < n ? "heart" : "heartEmpty", "mood-heart")).join("");
    }
    if (mood.dataset.h !== html) { mood.innerHTML = html; mood.dataset.h = html; }
  }
  const cont = $("pc-bars"); if (!cont) return;
  const key = NEEDS.map((n) => Math.round(c[n.id] || 0)).join(",");
  if (cont.dataset.k === key && cont.dataset.c === String(c.id)) return;
  if (cont.dataset.c !== String(c.id) || !cont.children.length) {
    cont.innerHTML = NEEDS.map((n) => `<div class="need" title="${esc(n.label || n.id)}"><span class="need-ico">${iconHTML(n.icon)}</span><div class="gauge"><i id="g-${n.id}"></i></div></div>`).join("");
  }
  NEEDS.forEach((n) => {
    const v = c[n.id] || 0, el = $("g-" + n.id); if (!el) return;
    el.style.width = Math.max(4, v) + "%";
    el.className = v < 25 ? "r-red" : v < 50 ? "r-yellow" : "r-green";
  });
  cont.dataset.k = key; cont.dataset.c = String(c.id);
}

/* ===================== Interactions ===================== */

function interact(target) {
  if (!target) return;
  if (isCreature(target)) return;
  const st = STATIONS.find((x) => x.type === target.type);
  if (!st) return;
  lastInputT = nowMs();
  if (st.requireMounted && !mounted) { Sound.play("error"); message(st.needMountMessage || L("Come back riding!")); return; }
  // While riding, only stations made for it (whileRiding / requireMounted) can be used: the others
  // (a shop, a house…) are on foot — e.g. you can't carry a bought tree back on horseback.
  if (mounted && !st.whileRiding && !st.requireMounted) { Sound.play("error"); message(st.onFootMessage || T("dismountFirst", "Get off first!")); return; }
  if (st.action === "nextDay") nextDay();
  else if (st.action === "spawn") spawnCreatures(st);
  else if (st.action === "openShop") openShop();
  else if (st.action === "menu") openStationMenu(st);
  else if (st.action === "restyle") openRestyle(Object.assign({ label: st.label }, st.restyle || {}));
  else if (st.action === "missions") openMissions();
  else if (st.action === "models") openModels();
  else if (st.action === "custom" && typeof st.onUse === "function") st.onUse(state, stationApi());
}

function creatureAction(actionId) {
  const c = activeTarget; if (!c || !isCreature(c)) return;
  const a = ACTIONS.find((x) => x.id === actionId); if (!a) return;
  lastInputT = nowMs();

  if (a.type === "ride") { toggleRide(c); return; }
  if (a.type === "jump") { doJump(); return; }
  if (a.type === "customize") { openCustomize(c); return; }
  if (a.type === "closeup") { openCloseup(c, a); return; }
  if (a.type === "race") { if (R3.on) endRace(false, true); else startRace(a); return; }

  // resource cost
  if (a.cost) {
    if ((state.resources[a.cost.resource] || 0) < a.cost.amount) { message(a.outOfStock || `Out of ${a.cost.resource}!`); Sound.play("error"); return; }
  }
  // need requirement (e.g. needs enough energy to play)
  if (a.require) {
    for (const k in a.require) { if ((c[k] || 0) < a.require[k]) { message((a.tooLow || L("{name} is too tired.")).replace("{name}", c.name)); Sound.play("error"); return; } }
  }
  if (a.cost) state.resources[a.cost.resource] = (state.resources[a.cost.resource] || 0) - a.cost.amount;

  const moodBefore = MOOD_NEED ? (c[MOOD_NEED] || 0) : 0;
  // apply need effects
  Object.keys(a.effects || {}).forEach((k) => { c[k] = clamp01((c[k] || 0) + a.effects[k]); });
  if (a.reward) { earn(a.reward); flyReward(c.x, c.y - 40, "+" + a.reward + " " + coinTok()); }
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (a.stat) state.stats[a.stat] = (state.stats[a.stat] || 0) + 1;
  if (a.anim) actionAnim(c, a.anim);
  Sound.play(a.sfx || "action");

  // celebrate when the mood need reaches max during this action (adults only)
  let celebrated = false;
  if (canCelebrate(c, a) && moodBefore < 100 && (c[MOOD_NEED] || 0) >= 100) {
    sc && sc.time.delayedCall(700, () => celebrate(c));
    celebrated = true;
  }
  message(a.message ? (celebrated && a.celebrateMessage ? a.celebrateMessage : a.message).replace("{name}", c.name) : "");

  refreshBars(c); refreshHud();
}

// ride.empty:"slow" → when the fatigue need hits 0 the rider stays on board but the ride crawls
// at ride.emptySpeed (default 0.25) — e.g. a car out of fuel you drive to the gas station.
function rideEmpty(c) { const R = CREATURE && CREATURE.ride; return !!(c && R && R.empty === "slow" && R.fatigueNeed && (c[R.fatigueNeed] || 0) <= 0); }
function rideEmptyMul() { return rideEmpty(mounted) ? ((CREATURE.ride.emptySpeed != null) ? CREATURE.ride.emptySpeed : 0.25) : 1; }
function rideEmptyWarn(c) {
  if (c._scEmptyWarned) return;
  c._scEmptyWarned = true; Sound.play("error");
  message((CREATURE.ride.emptyMessage || CREATURE.ride.exhaustedMessage || L("{name} is running on empty!")).replace("{name}", c.name));
}
function toggleRide(c) {
  const RIDE = CREATURE.ride; if (!RIDE) return;
  if (mounted === c) { dismount(c, false); return; }
  if (placingDecor) { Sound.play("error"); message(T("placeFirst", "Place your decoration first!")); return; }   // decor is placed on foot
  if (RIDE.adultsOnly && isYoung(c)) { message((RIDE.tooYoung || L("{name} is too young to ride.")).replace("{name}", c.name)); return; }
  if (RIDE.empty !== "slow" && RIDE.minEnergy && RIDE.fatigueNeed && (c[RIDE.fatigueNeed] || 0) < RIDE.minEnergy) { message((RIDE.tooTired || L("{name} is too tired.")).replace("{name}", c.name)); return; }
  mounted = c; c._scEmptyWarned = false;
  if (rideEmpty(c)) setTimeout(() => rideEmptyWarn(c), 900); state.lastRide = c.id;
  if (RIDE.onMount) Object.keys(RIDE.onMount).forEach((k) => (c[k] = clamp01((c[k] || 0) + RIDE.onMount[k])));
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (statKeys().includes("ride")) state.stats.ride = (state.stats.ride || 0) + 1;
  rideFatigueAcc = 0;
  Sound.play("action");
  message((RIDE.mountMessage || L("Riding {name}!")).replace("{name}", c.name));
  panelId = PANEL_DIRTY; refreshInteraction(); refreshHud();
}

// On foot, a jumpable barrier (logs, rocks, hurdles) is never walked THROUGH: walking into it makes the
// character climb over with a small hop (so nobody gets stuck between two barriers either). Riding,
// the barrier blocks and only the Jump action clears it.
let footHopping = false;
function footHop(ox, oy, mvx, mvy) {
  if (jumpRunning || !sc) return false;
  const hw = 15, hh = 10, hit = (x, y, m) => x + hw > m.x && x - hw < m.x + m.w && y + hh > m.y && y - hh < m.y + m.h;
  const m = COLLISIONS.find((b) => b.jumpable && hit(player.x, player.y, b) && !hit(ox, oy, b));
  if (!m) return false;
  let tx = player.x, ty = player.y;
  if (Math.abs(mvx) >= Math.abs(mvy)) tx = mvx > 0 ? m.x + m.w + hw + 6 : m.x - hw - 6;
  else ty = mvy > 0 ? m.y + m.h + hh + 6 : m.y - hh - 6;
  if (COLLISIONS.some((b) => b !== m && hit(tx, ty, b))) { player.x = ox; player.y = oy; return true; }   // no room behind: stay
  player.x = ox; player.y = oy;
  jumpRunning = true; footHopping = true; moveTarget = moveTarget && navPath.length ? moveTarget : null;
  Sound.play("whoosh");
  jumpAnim.h = 0;
  sc.tweens.add({ targets: jumpAnim, h: 1, duration: 200, yoyo: true, ease: "Sine.easeOut" });
  sc.tweens.add({ targets: player, x: tx, y: ty, duration: 400, ease: "Sine.easeInOut", onComplete: () => {
    jumpRunning = false; footHopping = false; jumpAnim.h = 0;
    // drop route waypoints on (or just around) the barrier we cleared, so we never hop back
    const pad = 34; while (navPath.length && navPath[0].x > m.x - pad && navPath[0].x < m.x + m.w + pad && navPath[0].y > m.y - pad && navPath[0].y < m.y + m.h + pad) navPath.shift();
    if (moveTarget) moveTarget = navPath[0] || null;
  } });
  return true;
}
function doJump() {
  const RIDE = CREATURE.ride, J = RIDE && RIDE.jump;
  if (!mounted || jumpRunning || !sc || !J) return;
  const c = mounted;
  if (J.minEnergy && RIDE.fatigueNeed && (c[RIDE.fatigueNeed] || 0) < J.minEnergy) { message((J.tooTired || L("{name} is too tired to jump!")).replace("{name}", c.name)); return; }
  if (J.cost && RIDE.fatigueNeed) c[RIDE.fatigueNeed] = clamp01(c[RIDE.fatigueNeed] - J.cost);
  rideFatigueAcc = 0; state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (statKeys().includes("jump")) state.stats.jump = (state.stats.jump || 0) + 1;
  jumpRunning = true; moveTarget = null; navPath = []; followCreature = null;
  // leap forward where the player faces (left/right for side views, 4 ways for dirSheet vehicles)
  const dx = playerFacing === "left" ? -1 : playerFacing === "right" ? 1 : 0, dy = playerFacing === "up" ? -1 : playerFacing === "down" ? 1 : 0;
  const fx = (dx || dy) ? dx : 1, dist = J.distance || 165;
  const targetX = clamp(player.x + fx * dist, 40, WORLD.w - 40), targetY = clamp(player.y + dy * dist, 40, WORLD.h - 40);
  Sound.play("whoosh");
  sc.tweens.add({ targets: player, x: targetX, y: targetY, duration: 560, ease: "Quad.easeOut", onComplete: () => {
    jumpRunning = false;
    if (J.reward) { earn(J.reward); flyReward(player.x, player.y - 60, "+" + J.reward + " " + coinTok()); if (J.rewardMessage) message(J.rewardMessage.replace("{r}", J.reward)); refreshHud(); }
  } });
  jumpAnim.h = 0;
  sc.tweens.add({ targets: jumpAnim, h: 1, duration: 290, yoyo: true, ease: "Sine.easeOut" });
  if (MOOD_NEED) c[MOOD_NEED] = clamp01((c[MOOD_NEED] || 0) + 4);
  refreshHud();
}

function dismount(c, exhausted) {
  mounted = null; moveTarget = null; navPath = []; running = false; rideFatigueAcc = 0; jumpRunning = false;
  if (playerSprite) { playerSprite.x = 0; playerSprite.y = 0; playerSprite.setVisible(true); }
  if (playerShadow) playerShadow.setVisible(true);
  c.x = clamp(player.x + 135, 40, WORLD.w - 40);
  c.y = clamp(player.y, 40, WORLD.h - 40);
  c.tx = c.x; c.ty = c.y; c.nextStep = 0;
  if (c.obj) { c.obj.x = c.x; c.obj.y = c.y; }
  panelId = PANEL_DIRTY; refreshInteraction(); refreshHud();
  const RIDE = CREATURE.ride || {};
  message(exhausted ? (RIDE.exhaustedMessage || L("{name} is exhausted!")).replace("{name}", c.name) : (RIDE.dismountMessage || L("You get off {name}.")).replace("{name}", c.name));
}

/* ===================== Animations / effects ===================== */

// --- Procedural particle textures (drawn white so they tint to any colour) ---
// Drawn at 2x (48 px) and displayed at half scale → crisp on HiDPI screens.
function starPoints(cx, cy, R, r, n) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = (i % 2) ? r : R, a = -Math.PI / 2 + i * Math.PI / n;
    pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
  }
  return pts;
}
// Built-in particle shapes. A theme can ask for any of these per action; an
// unknown name falls back to a soft dot. Cached once per shape.
function ensureShape(shape) {
  const key = "pt_" + shape;
  if (sc.textures.exists(key)) return key;
  const g = sc.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  const S = 48, c = 24;
  if (shape === "heart") {
    g.fillCircle(14, 17, 12.5); g.fillCircle(34, 17, 12.5); g.fillTriangle(2.5, 21, 45.5, 21, 24, 46);
  } else if (shape === "star") {
    g.fillPoints(starPoints(c, c + 1, 22, 9.5, 5), true);
  } else if (shape === "spark") {
    g.fillPoints([{ x: c, y: 0 }, { x: c + 7, y: c - 7 }, { x: S, y: c }, { x: c + 7, y: c + 7 }, { x: c, y: S }, { x: c - 7, y: c + 7 }, { x: 0, y: c }, { x: c - 7, y: c - 7 }], true);
  } else if (shape === "diamond") {
    g.fillPoints([{ x: c, y: 2 }, { x: S - 6, y: c }, { x: c, y: S - 2 }, { x: 6, y: c }], true);
  } else if (shape === "bubble" || shape === "ring") {
    g.lineStyle(5, 0xffffff, 1); g.strokeCircle(c, c, 18); g.fillCircle(c - 7, c - 7, 4);
  } else if (shape === "arrow") {           // big downward pointer (guide)
    g.fillRoundedRect(c - 8, 0, 16, 22, 5); g.fillTriangle(4, 18, S - 4, 18, c, S - 2);
  } else if (shape === "soft") {            // blurry dot (dust motes / bokeh)
    for (let r = 22; r > 0; r -= 2) { g.fillStyle(0xffffff, 0.09); g.fillCircle(c, c, r); }
  } else { // dot / default
    g.fillCircle(c, c, 10);
  }
  g.generateTexture(key, S, S); g.destroy();
  return key;
}
// Soft radial ground shadow (much nicer than a flat ellipse).
function ensureShadow() {
  const key = "fx_shadow";
  if (sc.textures.exists(key)) return key;
  const W = 128, H = 48, t = sc.textures.createCanvas(key, W, H), ctx = t.getContext();
  const gr = ctx.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W / 2);
  gr.addColorStop(0, "rgba(0,0,0,0.95)"); gr.addColorStop(0.55, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save(); ctx.scale(1, H / W); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  t.refresh();
  return key;
}
// Soft radial glow (white → tinted; used for halos with additive blending).
function ensureGlow() {
  const key = "fx_glow";
  if (sc.textures.exists(key)) return key;
  const S = 128, t = sc.textures.createCanvas(key, S, S), ctx = t.getContext();
  const gr = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.4, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, S, S); t.refresh();
  return key;
}

// Emit a burst of particles. spec: {shape, colors:[hex], count, fall, spread, y0, riseMin/Max, scaleMin/Max}.
function emitBurst(x, y, spec) {
  if (!sc) return;
  spec = spec || {};
  const key = ensureShape(spec.shape || "dot");
  const colors = (spec.colors && spec.colors.length ? spec.colors : ["#ffffff"]).map(hexInt);
  const n = spec.count || 5, fall = !!spec.fall;
  const spread = spec.spread || 24, y0 = spec.y0 != null ? spec.y0 : 46;
  const sMin = spec.scaleMin || 0.7, sMax = spec.scaleMax || 1.1;
  for (let i = 0; i < n; i++) {
    const sc0 = rand(sMin, sMax) * 0.5;
    const p = sc.add.image(x + randInt(-spread, spread), y - y0, key)
      .setDepth(99998).setScale(sc0 * 0.4).setTint(colors[i % colors.length]).setAngle(randInt(-20, 20));
    const dy = fall ? randInt(16, 30) : -randInt(spec.riseMin || 46, spec.riseMax || 82);
    const dx = randInt(-spread, spread) * 0.6;
    sc.tweens.add({ targets: p, scaleX: sc0, scaleY: sc0, duration: 140, ease: "Back.easeOut" });
    sc.tweens.add({ targets: p, x: p.x + dx, y: p.y + dy, alpha: 0, angle: p.angle + randInt(-60, 60), duration: randInt(spec.durMin || 600, spec.durMax || 1000),
      ease: fall ? "Quad.easeIn" : "Sine.easeOut", delay: 60, onComplete: () => p.destroy() });
  }
}

// Body motion presets used by action animations.
function applyMotion(c, motion) {
  if (!c.bodyT || !sc || motion === "none") return;
  const m = motion || "bounce", s = c.baseScale || 1, k = c.k || s, t = c.bodyT;
  const done = () => { if (c.bodyT) { c.bodyT.y = 0; c.bodyT.setScale(k); } };
  if (m === "nod") sc.tweens.add({ targets: t, y: 7 * s, scaleY: k * 0.92, duration: 120, yoyo: true, repeat: 1, ease: "Sine.easeInOut", onComplete: done });
  else if (m === "hop") {
    t.setScale(k * 1.12, k * 0.88);
    sc.tweens.add({ targets: t, y: -26 * s, scaleX: k * 0.92, scaleY: k * 1.1, duration: 200, yoyo: true, ease: "Quad.easeOut", onComplete: done });
  } else if (m === "wiggle") sc.tweens.add({ targets: t, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => { if (c.bodyT) c.bodyT.angle = 0; done(); } });
  else sc.tweens.add({ targets: t, y: -12 * s, duration: 130, yoyo: true, ease: "Quad.easeOut", onComplete: done });
}

// Legacy string presets (back-compat) for action.anim.
const ANIM_PRESETS = {
  eat: { motion: "nod", shape: "dot", colors: ["#e8b34a", "#c98a2e"], count: 5, fall: true, y0: 36 },
  cheer: { motion: "hop", shape: "heart", colors: ["#ff7eb6", "#7fd06f", "#ffd24a"], count: 5 },
  sparkle: { motion: "bounce", shape: "spark", colors: ["#ffffff", "#fff2a8", "#a8e6ff"], count: 5 },
};

// THEME-DRIVEN action animation. `anim` is a preset string OR an object:
//   { motion:"nod"|"hop"|"bounce"|"wiggle"|"none", particle:"star"|"heart"|"spark"|"bubble"|"diamond"|"dot"|"soft",
//     colors:[hex...], count, fall, spread, y0 }
function actionAnim(c, anim) {
  if (!c.obj || !c.bodyT || !sc) return;
  const spec = (typeof anim === "string") ? (ANIM_PRESETS[anim] || { motion: "bounce" }) : (anim || {});
  applyMotion(c, spec.motion);
  const shape = spec.shape || spec.particle;
  if (shape || (spec.colors && spec.colors.length)) {
    emitBurst(c.x, c.y, { shape, colors: spec.colors, count: spec.count, fall: spec.fall, y0: spec.y0,
      spread: spec.spread, riseMin: spec.riseMin, riseMax: spec.riseMax, scaleMin: spec.scaleMin, scaleMax: spec.scaleMax });
  }
}

// Does reaching the max mood with this action trigger the celebration? celebrate.adultsOnly,
// and celebrate.actions:[ids] to reserve it to some actions (e.g. only when playing).
function canCelebrate(c, a) {
  const cel = CREATURE && CREATURE.celebrate;
  if (!MOOD_NEED || !cel) return false;
  if (cel.adultsOnly && isYoung(c)) return false;
  return !cel.actions || cel.actions.includes(a.id);
}
// Celebration: a happy hop (or rear) + a configurable particle burst.
function celebrate(c) {
  if (!c.bodyT || !sc || c.celebrating) return;
  c.celebrating = true;
  const cel = CREATURE.celebrate || {};
  const mode = cel.mode || "hop";
  const t = c.bodyT, s = c.baseScale || 1, k = c.k || s;
  refreshCreatureVisual(c);                       // e.g. swap to the "happy" sheet
  Sound.play("celebrate");
  if (mode === "rear") {
    const orig = CREATURE.origin || { x: 0.46, y: 0.734 };
    const oxN = t.flipX ? 0.30 : 0.70, oyN = 0.95;
    t.setOrigin(oxN, oyN);
    t.x += (oxN - orig.x) * t.displayWidth; t.y += (oyN - orig.y) * t.displayHeight;
    const dir = t.flipX ? -1 : 1;
    sc.tweens.add({
      targets: t, angle: dir * 42, duration: 300, ease: "Back.easeOut", yoyo: true, hold: 420,
      onComplete: () => { if (t) { t.angle = 0; t.setOrigin(orig.x, orig.y); t.x = 0; t.y = 0; } c.celebrating = false; if (CREATURE.depart) departCreature(c); },
    });
  } else {
    // squash → big hop with a little spin of joy → land
    t.setScale(k * 1.15, k * 0.85);
    sc.tweens.add({
      targets: t, y: -38 * s, scaleX: k * 0.92, scaleY: k * 1.1, duration: 230, yoyo: true, repeat: 1, ease: "Quad.easeOut",
      onComplete: () => { if (t) { t.y = 0; t.setScale(k); } c.celebrating = false; if (CREATURE.depart) departCreature(c); },
    });
  }
  emitBurst(c.x, c.y, { shape: cel.particle || "heart", colors: cel.colors || ["#ff7eb6", "#7fd06f", "#ffd24a"], count: cel.count || 5, y0: 50, riseMin: 48, riseMax: 90, spread: 34 });
  sc.time.delayedCall(260, () => emitBurst(c.x, c.y, { shape: "spark", colors: ["#ffffff", "#fff2a8"], count: 4, y0: 70, spread: 40, scaleMin: 0.5, scaleMax: 0.8 }));
  if (cel.message) message(cel.message.replace("{name}", c.name));
}

/* ===================== Day cycle ===================== */

function nextDay() {
  if (nightRunning) return;
  if ((state.actionsSinceRest || 0) === 0 && CREATURE) {
    message(META.restBlockedHint || L("You just woke up! Take care of someone first."));
    Sound.play("error");
    return;
  }
  // Day-arc reward: if every creature is happy at rest, give a synchronized send-off before the night.
  state.allHappyTonight = !!(ALL_HAPPY && state.creatures.length &&
    state.creatures.every((c) => needAverage(c) >= (ALL_HAPPY.mood || 75)));
  if (state.allHappyTonight && ALL_HAPPY.celebrate !== false) {
    state.creatures.forEach((c, i) => { if (sc) sc.time.delayedCall(i * 140, () => celebrate(c)); });
  }
  nightRunning = true; moveTarget = null; navPath = []; message(META.nightMessage || L("{i:moon} Night falls…"));
  Sound.play("night");
  const v = $("night-veil");
  if (v) {
    v.classList.add("on");
    setTimeout(applyDay, 1250);
    setTimeout(() => { v.classList.remove("on"); Sound.play("morning"); }, 2000);
    setTimeout(() => { nightRunning = false; }, 3000);
  } else { applyDay(); nightRunning = false; }
}

function applyDay() {
  state.day++; state.coins += (ECON.dayReward || 0); state.actionsSinceRest = 0;
  const neglected = [];
  state.creatures.forEach((c) => {
    if (CREATURE.aging) c.age++;
    // apply per-day need decay
    NEEDS.forEach((n) => { if (n.perDay) c[n.id] = clamp01((c[n.id] || 0) + n.perDay); });
    // mood need special rule
    if (MOOD_NEED) {
      const dm = CREATURE.moodDay || { base: -12, lowPenalty: -10, lowAt: 25, highBonus: 8, highAt: 60 };
      let adj = dm.base;
      const others = NEEDS.filter((n) => n.id !== MOOD_NEED);
      if (others.some((n) => (c[n.id] || 0) < dm.lowAt)) adj += dm.lowPenalty;
      if (others.every((n) => (c[n.id] || 0) > dm.highAt)) adj += dm.highBonus;
      c[MOOD_NEED] = clamp01((c[MOOD_NEED] || 0) + adj);
    }
    if (c.obj) refreshCreatureVisual(c);
    const lowMood = MOOD_NEED && (c[MOOD_NEED] || 0) < 25;
    const firstNeed = NEEDS[0] && (c[NEEDS[0].id] || 0) < 20;
    if (lowMood || firstNeed) neglected.push(c.name);
  });
  mounted = null;
  if (playerSprite) { playerSprite.x = 0; playerSprite.y = 0; playerSprite.setVisible(true); }
  if (playerShadow) playerShadow.setVisible(true);
  const baby = tryBirth();
  refreshHud(); save();
  const allHappy = state.allHappyTonight; state.allHappyTonight = false;
  if (baby) message((CREATURE.breeding && CREATURE.breeding.message || L("{i:heart} A baby was born: {name}!")).replace("{name}", baby.name));
  else if (allHappy && ALL_HAPPY && ALL_HAPPY.message) { message(ALL_HAPPY.message.replace("{day}", state.day)); setTimeout(() => confetti(), 900); }
  else if (neglected.length) message((META.neglectMessage || L("Day {day}. Take care of {names}!")).replace("{day}", state.day).replace("{names}", listFr(neglected)));
  else message((META.morningMessage || L("{i:sparkle} Day {day}: everyone slept well.")).replace("{day}", state.day));
}

// Breeding: two happy adults can produce one baby overnight (with guard-rails).
function tryBirth() {
  const B = CREATURE && CREATURE.breeding;
  if (!B || !B.enabled) return null;
  const happyAdults = state.creatures.filter((c) => !isYoung(c) && (!MOOD_NEED || (c[MOOD_NEED] || 0) >= (B.minMood || 80)));
  const hasYoung = state.creatures.some(isYoung);
  const room = state.creatures.length < state.capacity;
  const cooldownOk = (state.day - (state.lastBirth || 0)) >= (B.cooldown || 3);
  if (happyAdults.length < 2 || hasYoung || !room || !cooldownOk) return null;
  const parent = pick(happyAdults);
  const baby = newCreature({ age: 0, variant: pick(happyAdults).variant });
  const z = homeRect();
  baby.x = clamp(parent.x + randInt(-50, 50), z.x + 60, z.x + z.w - 60);
  baby.y = clamp(parent.y + randInt(-50, 50), z.y + 60, z.y + z.h - 60);
  baby.tx = baby.x; baby.ty = baby.y;
  state.creatures.push(baby);
  state.lastBirth = state.day;
  state.stats.births = (state.stats.births || 0) + 1;
  if (sc) { buildCreatureObj(baby); actionAnim(baby, "cheer"); }
  return baby;
}

function listFr(arr) {
  if (arr.length <= 1) return arr.join("");
  return arr.slice(0, -1).join(", ") + " " + (META.and || "and") + " " + arr[arr.length - 1];
}

/* ===================== Modal / shop / customize ===================== */

function openModal(t, html) { $("modal-title").innerHTML = fmt(t); $("modal-body").innerHTML = html; $("modal").classList.remove("hidden"); Sound.play("open"); }
function closeModal() { $("modal").classList.add("hidden"); lastInputT = nowMs(); }

function openShop() {
  const room = state.creatures.length < state.capacity;
  // rows share the choice-list look (icon tile, title, subtitle, price pill)
  const row = (attr, icon, name, sub, price, img) => `<button class="choice" ${attr}><span class="ch-ico">${img ? `<img src="${av(img)}" alt="" draggable="false" />` : iconHTML(icon || "gift")}</span>
      <span class="ch-txt"><b>${fmt(name)}</b>${sub ? `<small>${fmt(sub)}</small>` : ""}</span><span class="ch-price">${iconHTML(META.coinIcon || "star")}<b>${price}</b></span></button>`;
  let html = `<div class="choice-list">`;
  (SHOP.resources || []).forEach((r) => {
    html += row(`data-shop="res:${r.id}"`, r.icon, r.name + (r.amount > 1 ? " x" + r.amount : ""), r.desc, r.price);
  });
  if (SHOP.capacity && CREATURE) {
    html += row(`data-shop="capacity"`, SHOP.capacity.icon || CREATURE.icon, SHOP.capacity.name, `${state.creatures.length}/${state.capacity} ${CREATURE.label || ""}`, SHOP.capacity.price);
  }
  html += `</div>`;
  if (DECOR.length) {
    html += `<h3>${fmt(SHOP.decorHeading || L("{i:gift} Decorations"))}</h3><div class="decor-grid">`;
    DECOR.forEach((d) => {
      html += `<button class="decor-card" data-decor="${d.id}">
        <img class="d-img" src="${av(d.thumb || assetPath(d.sprite) || ("assets/img/" + d.sprite + ".png"))}" alt="" /><span>${fmt(d.name)}</span><span class="d-price">${iconHTML(META.coinIcon || "star")}${d.price}</span></button>`;
    });
    html += `</div>`;
  }
  if (SHOP.buyCreature && CREATURE) {
    html += `<h3>${fmt(SHOP.buyCreature.heading || L("{i:heart} Adopt"))}</h3>`;
    if (!room) html += `<p class="choice-sub">${fmt(SHOP.fullMessage || L("No room! Expand first."))}</p>`;
    else html += `<div class="choice-list">${row(`data-shop="creature"`, SHOP.buyCreature.icon || CREATURE.icon, SHOP.buyCreature.label || L("Adopt"), SHOP.buyCreature.hint || "", SHOP.buyCreature.price, SHOP.buyCreature.img)}</div>`;
  }
  openModal(SHOP.title || L("{i:gift} Shop"), html);
}

function buy(what) {
  const notEnough = () => { Sound.play("error"); message(META.notEnough || L("Not enough coins!")); };
  if (what.startsWith("res:")) {
    const id = what.slice(4);
    const r = (SHOP.resources || []).find((x) => x.id === id); if (!r) return;
    if (state.coins < r.price) return notEnough();
    state.coins -= r.price; state.resources[id] = (state.resources[id] || 0) + (r.amount || 1);
    message(r.boughtMessage || `${r.icon && (ICONS[r.icon] || ICON_SVG[r.icon]) ? "{i:" + r.icon + "} " : ""}+${r.amount || 1} ${r.name}`);
  } else if (what === "capacity") {
    if (state.coins < SHOP.capacity.price) return notEnough();
    state.coins -= SHOP.capacity.price; state.capacity++;
    message(SHOP.capacity.boughtMessage || L("Expanded!"));
  } else if (what === "creature") {
    if (state.creatures.length >= state.capacity) return message(SHOP.fullMessage || L("No room!"));
    if (state.coins < SHOP.buyCreature.price) return notEnough();
    state.coins -= SHOP.buyCreature.price;
    const c = newCreature({}); state.creatures.push(c); if (sc) buildCreatureObj(c);
    message((SHOP.buyCreature.boughtMessage || L("Welcome, {name}!")).replace("{name}", c.name));
  }
  Sound.play("reward");
  refreshHud(); openShop();
}

function buyDecor(id) {
  const d = DECOR.find((x) => x.id === id); if (!d) return;
  if (state.coins < d.price) { Sound.play("error"); return message(META.notEnough || L("Not enough coins!")); }
  state.coins -= d.price;
  placingDecor = d; ghostSide = 1;
  closeModal();
  if (sc) {
    if (ghostDecor) ghostDecor.destroy();
    ghostDecor = sc.add.image(player.x, player.y, d.sprite).setOrigin(0.5, 0.95).setScale((d.scale || 1.2) / RES(d.sprite)).setAlpha(0.6).setDepth(99999);
  }
  refreshHud(); panelId = PANEL_DIRTY; refreshInteraction();
  message((META.boughtDecorMessage || L("{name} bought! Walk around and tap “Place here”.")).replace("{name}", d.name));
}

function ghostXY() {
  const x = player.x + ghostSide * 60, y = player.y + 6;
  return { x: clamp(x, 40, WORLD.w - 40), y: clamp(y, 70, WORLD.h - 30) };
}

// Placement rules. Returns null if OK, otherwise an error message.
function placementError(d, x, y) {
  for (const s of STATIONS) {
    if (x > s.x - 80 && x < s.x + 80 && y > s.y - 150 && y < s.y + 24) return META.noOnBuilding || L("Not on a building!");
  }
  if (HOME_ZONE && !d.allowInHome) {
    const r = HOME_ZONE.rect;
    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return META.noInHome || L("Not inside the pen!");
  }
  return null;
}

// A decoration may go anywhere it doesn't CUT OFF the way: everything the player could reach before
// (stations, creatures, the home zone) must still be reachable with it in place. Checked once, on placement.
function placementBlocksWay(d, x, y) {
  if (!d.collision || !player) return false;
  const c = d.collision, box = { x: x + c.dx, y: y + c.dy, w: c.w, h: c.h };
  const targets = STATIONS.map((st) => ({ x: st.x, y: st.y + 60 }))
    .concat(state.creatures.filter((k) => !k.departing && k !== mounted).map((k) => ({ x: k.x, y: k.y })));
  const hz = HOME_ZONE && HOME_ZONE.rect; if (hz) targets.push({ x: hz.x + hz.w / 2, y: hz.y + hz.h / 2 });
  const reach = () => targets.map((t) => !!findPath(player.x, player.y, t.x, t.y));
  if (COLLISIONS_DIRTY || !NAV.grid) buildNav();
  const before = reach();
  COLLISIONS.push(box); buildNav();
  const after = reach();
  COLLISIONS.pop(); buildNav();
  return before.some((ok, i) => ok && !after[i]);
}
function placeDecor() {
  if (!placingDecor) return;
  const { x, y } = ghostXY();
  const err = placementError(placingDecor, x, y) || (placementBlocksWay(placingDecor, x, y) ? (META.blocksPath || L("Not here: it would block the way!")) : null);
  if (err) { message(err); Sound.play("error"); return; }
  state.decors.push({ id: placingDecor.id, x, y });
  state.stats.decor = (state.stats.decor || 0) + 1;
  if (CREATURE && MOOD_NEED) state.creatures.forEach((c) => (c[MOOD_NEED] = clamp01((c[MOOD_NEED] || 0) + 5)));
  const name = placingDecor.name; placingDecor = null;
  if (ghostDecor) { ghostDecor.destroy(); ghostDecor = null; }
  buildDecors(); save(); refreshHud(); panelId = "upd"; refreshInteraction();
  emitBurst(x, y, { shape: "star", colors: ["#fff2a8", "#ffd24a", "#ffffff"], count: 8, y0: 30, spread: 40 });
  Sound.play("unlock");
  message((META.placedMessage || L("{i:sparkle} {name} placed!")).replace("{name}", name));
}

function cancelPlacement() {
  if (!placingDecor) return;
  state.coins += placingDecor.price;
  placingDecor = null;
  if (ghostDecor) { ghostDecor.destroy(); ghostDecor = null; }
  refreshHud(); panelId = "upd"; refreshInteraction();
  message(META.refundMessage || L("Placement cancelled, refunded."));
}

function openCustomize(c) {
  const cz = CREATURE.customize || {};
  let html = `<div class="customize-preview" id="cz-preview"></div>`;
  if (cz.rename) html += `<label class="cz-label">${META.nameLabel || L("Name:")}</label><input id="cz-name" type="text" maxlength="14" value="${c.name}" />`;
  if (cz.variant && VARIANTS.length) html += `<div class="group"><span class="group-title">${CREATURE.variantLabel || L("Colour")}</span><div class="avatar-row" id="cz-variant"></div></div>`;
  html += `<button class="btn btn-giant btn-primary" id="cz-ok">${btnHTML(META.confirm || L("Confirm"), "check")}</button>`;
  openModal((CREATURE.customizeTitle || L("{i:palette} Customize")) + " " + c.name, html);

  // Preview: the creature's own (variant) thumbnail if available, else a colour blob.
  const drawPreview = () => {
    const v = variantDef(variantId(c));
    const col = (v && v.color) || "#cccccc";
    const thumb = v && v.thumb ? av(v.thumb) : null;
    $("cz-preview").innerHTML = thumb
      ? `<div class="variant-blob has-thumb" style="--c:${col}"><img src="${thumb}" alt="" /></div>`
      : `<div class="variant-blob" style="background:${col};color:${col}"></div>`;
    const b = $("cz-preview").firstElementChild; if (b) b.classList.add("bump");
  };
  if (cz.variant && VARIANTS.length) {
    VARIANTS.forEach((v) => {
      const b = document.createElement("button");
      b.className = "btn-avatar swatch" + (variantId(c) === v.id ? " chosen" : "");
      b.style.background = v.color || "#ccc";
      b.title = v.name;
      b.addEventListener("click", () => { c.variant = v.id; $("cz-variant").querySelectorAll(".btn-avatar").forEach((x) => x.classList.remove("chosen")); b.classList.add("chosen"); drawPreview(); refreshCreatureVisual(c); });
      $("cz-variant").appendChild(b);
    });
  }
  $("cz-ok").addEventListener("click", () => {
    if (cz.rename) {
      const name = $("cz-name").value.trim();
      if (name && nameUsed(name, c)) { message((META.nameTaken || L("Another one is already called {name}!")).replace("{name}", name)); return; }
      if (name) c.name = name;
    }
    refreshCreatureVisual(c); save(); closeModal(); panelId = PANEL_DIRTY;
    actionAnim(c, { motion: "hop", particle: "spark", colors: [(variantDef(variantId(c)) || {}).color || "#ffffff", "#ffffff"], count: 8 });
    Sound.play("action");
    message((CREATURE.customizedMessage || L("{i:sparkle} {name} updated!")).replace("{name}", c.name));
  });
  drawPreview();
}

/* ===================== Close-up mini-scene (generic) ===================== */
// A creature action of type "closeup" opens a full-screen scene: the player
// scrubs/taps "spots" off a backdrop image until it's clean, then the action's
// effects / reward / celebrate are applied (exactly like finishing a normal
// action). Entirely config-driven via action.closeup — see ENGINE.md.
function cuEl(id, cls, tag, parent) {
  let e = $(id);
  if (!e) { e = document.createElement(tag || "div"); e.id = id; e.className = cls; (parent || $("closeup-stage")).appendChild(e); }
  return e;
}
function openCloseup(c, a) {
  const root = $("closeup"); if (!root || !a || closeupOpen) return;
  const cfg = a.closeup || {};
  const stage = $("closeup-stage"), bg = $("closeup-bg"), brush = $("closeup-brush");
  const imgPath = (k, def) => av(assetPath(k) || ("assets/img/" + (k || def) + ".png"));
  // The backdrop can be overridden per creature variant (e.g. each child's own face).
  const cv = variantDef(variantId(c));
  const bgKey = (cv && cv.closeupBg) || cfg.bg;
  // optional "after" backdrop revealed on finish (e.g. the same face, now smiling)
  const doneKey = (cv && cv.closeupBgDone) || cfg.bgDone;
  // optional LANDSCAPE backdrop (closeup.wide): used while the screen is wider than tall,
  // swapped live on rotation; spots keep their place relative to their area.
  const wide = cfg.wide ? {
    bg: (cv && cv.closeupBgWide) || cfg.wide.bg, done: (cv && cv.closeupBgWideDone) || cfg.wide.bgDone,
    areas: cfg.wide.area ? (Array.isArray(cfg.wide.area) ? cfg.wide.area : [cfg.wide.area]) : null, size: cfg.wide.size,
    brushRest: cfg.wide.brushRest,
  } : null;
  const bg2 = cuEl("closeup-bg2", "closeup-bg closeup-bg2", "img");
  bg2.draggable = false; bg2.alt = "";
  if (bg) bg.classList.remove("cu-fade");
  bg2.classList.remove("show");
  if (bg && bg.nextSibling !== bg2) bg.parentNode.insertBefore(bg2, bg.nextSibling);   // just above the backdrop, under the spots
  stage.querySelectorAll(".cu-spot, .cu-emoji, .cu-foam, .cu-hint").forEach((n) => n.remove());

  const sp = cfg.spots || {};
  const cured = (a.stat && state.stats[a.stat]) || 0;       // ramps difficulty with progress
  const base = sp.base || 4, grow = sp.growEvery || 0, max = sp.max || 10;
  const count = clamp(base + (grow ? Math.floor(cured / grow) : 0), 1, max);
  const rubs = sp.rubs || 3, size = sp.size || 64;
  // `area` may be one region or several (e.g. upper + lower teeth); spots alternate
  // between them so every region gets some. Spots avoid overlapping each other.
  const areas = Array.isArray(sp.area) ? sp.area : [sp.area || { x: 0.18, y: 0.42, w: 0.64, h: 0.28 }];
  const placed = [];
  const sprites = cfg.spotSprites || (cfg.spotSprite ? [cfg.spotSprite] : null);
  for (let i = 0; i < count; i++) {
    // area.max caps the spots one region gets (a small panel holds one); the others take the rest
    const used = placed.reduce((m, p) => (m[p.ai] = (m[p.ai] || 0) + 1, m), {});
    let ai = i % areas.length; for (let t = 0; t < areas.length && areas[ai].max != null && (used[ai] || 0) >= areas[ai].max; t++) ai = (ai + 1) % areas.length;
    const ar = areas[ai];
    let fx = 0, fy = 0, u = 0, v = 0;
    for (let tries = 0; tries < 20; tries++) {
      u = Math.random(); v = Math.random(); [fx, fy] = cuAreaPoint(ar, u, v);
      if (!placed.some((p) => Math.hypot((p.x - fx) * 1.3, p.y - fy) < (sp.minGap || 0.07))) break;
    }
    placed.push({ x: fx, y: fy, ai });
    const s = document.createElement(sprites ? "img" : "div");
    s.className = "cu-spot" + (sp.wiggle === false ? "" : " wiggle"); s.draggable = false;
    if (sprites) s.src = imgPath(sprites[i % sprites.length], "spot");
    // store the spot's position/size as fractions of the BACKDROP IMAGE; it's mapped
    // to screen pixels in cuPlaceSpots() so it stays on the subject under object-fit:cover.
    s.dataset.fx = fx.toFixed(4);
    s.dataset.fy = fy.toFixed(4);
    s.dataset.ai = String(ai); s.dataset.u = u.toFixed(4); s.dataset.v = v.toFixed(4);   // re-mapped onto closeup.wide areas
    s.dataset.k = String(rand(0.88, 1.12));
    s.dataset.sz = String(size * parseFloat(s.dataset.k));
    s.style.setProperty("--rot", (sp.rotate === false ? 0 : Math.floor(Math.random() * 50 - 25)) + "deg");
    s.style.animationDelay = (-Math.random() * 2).toFixed(2) + "s";
    s.dataset.rubs0 = String(rubs); s.dataset.rubs = String(rubs); s.dataset.t = "0";
    stage.appendChild(s);
  }
  if (brush) {
    if (cfg.brush) {
      brush.src = imgPath(cfg.brush, "brush"); brush.classList.remove("hidden");
      brush.style.left = ""; brush.style.top = ""; brush.style.transform = "";   // reset to the visible CSS start position
    } else brush.classList.add("hidden");
  }
  // progress stars — a clear "how much is left" for non-readers. The bar always shows
  // every slot up to spots.max (fixed size, no reflow as difficulty grows): this round's
  // stars ("todo" → "on" when a spot is cleared) and, dimmed, the ones still to come.
  const prog = cuEl("cu-progress", "cu-progress", "div", root);
  const slots = Math.max(count, Math.min(max, 12));
  prog.innerHTML = Array.from({ length: slots }, (_, k) => `<i class="${k < count ? "todo" : "future"}">${iconHTML("star")}</i>`).join("");
  prog.classList.toggle("hidden", cfg.progress === false);
  // a pulsing finger hint on the first spot until the first scrub
  if (cfg.hint !== false) {
    const h = document.createElement("div"); h.className = "cu-hint"; h.innerHTML = iconHTML(cfg.hint || "hand");
    stage.appendChild(h);
  }
  cuState = { c, a, remaining: count, total: count, pressed: false, ang: 0, lx: null, foamT: 0, scrubT: 0, bgRes: RES(bgKey),
              narrow: { bg: bgKey, done: doneKey, areas, size, brushRest: cfg.brushRest }, wide: wide && wide.bg ? wide : null, mode: null };
  // Cinematic in: the camera swoops onto the creature, then the scene fades in.
  if (sc && RENDER.closeupZoom !== false) {
    zoomFx = true;
    const cam = sc.cameras.main; cam.stopFollow();
    cam.pan(c.x, c.y - 30, 300, "Sine.easeInOut"); cam.zoomTo(baseZoom * 1.9, 320, "Sine.easeIn");
  }
  Sound.play("whoosh");
  closeupOpen = true; navPath = []; moveTarget = null; followCreature = null;
  clearSelection();
  root.classList.remove("hidden");
  root.classList.remove("cu-enter"); void root.offsetWidth; root.classList.add("cu-enter");
  themeColor((META.theme && META.theme.closeup) || (META.theme && META.theme.play) || TINT_PLAY);
  cuPlaceSpots();
  if (bg) bg.onload = cuPlaceSpots;        // re-place once natural size is known
}

// A point of a spot area at (u, v) in 0..1: a box {x,y,w,h}, or a QUAD {quad:[[x,y]x4]} (a slanted panel seen
// in perspective, corners in order around it) sampled bilinearly — kept a little inside its edges.
function cuAreaPoint(ar, u, v) {
  if (!ar.quad) return [ar.x + u * ar.w, ar.y + v * ar.h];
  const m = ar.margin != null ? ar.margin : 0.15, a = m + u * (1 - 2 * m), b = m + v * (1 - 2 * m), q = ar.quad;
  const lerp = (p, r, t) => [p[0] + (r[0] - p[0]) * t, p[1] + (r[1] - p[1]) * t];
  const top = lerp(q[0], q[1], a), bot = lerp(q[3], q[2], a);
  return lerp(top, bot, b);
}
// Pick the portrait or landscape (closeup.wide) backdrop for the current stage shape and
// re-map every spot onto that backdrop's areas (same area index, same relative u/v).
function cuSetMode() {
  if (!cuState) return;
  const stage = $("closeup-stage"), bg = $("closeup-bg"), bg2 = $("closeup-bg2");
  const isWide = !!cuState.wide && stage && stage.clientWidth > stage.clientHeight * 1.05;
  const mode = isWide ? "wide" : "narrow";
  if (cuState.mode === mode) return;
  cuState.mode = mode;
  const m = isWide ? cuState.wide : cuState.narrow, n = cuState.narrow;
  const imgPath = (k) => av(assetPath(k) || ("assets/img/" + k + ".png"));
  cuState.bgRes = RES(m.bg);
  if (bg) bg.src = imgPath(m.bg);
  if (bg2) { if (m.done) bg2.src = imgPath(m.done); else bg2.removeAttribute("src"); }
  const areas = m.areas || n.areas, size = m.size || n.size;
  // closeup.brushRest / wide.brushRest {x,y} (fractions of the screen): where the sponge waits, on empty floor
  const br = $("closeup-brush"), rest = m.brushRest || n.brushRest;
  if (br && rest && !cuState.scrubT) { br.style.left = (rest.x * 100) + "%"; br.style.top = (rest.y * 100) + "%"; }
  stage.querySelectorAll(".cu-spot").forEach((s) => {
    const ar = areas[(parseInt(s.dataset.ai, 10) || 0) % areas.length];
    if (s.dataset.u == null || !ar) return;
    const pt = cuAreaPoint(ar, parseFloat(s.dataset.u), parseFloat(s.dataset.v));
    s.dataset.fx = pt[0].toFixed(4); s.dataset.fy = pt[1].toFixed(4);
    s.dataset.sz = String(size * (parseFloat(s.dataset.k) || 1));
  });
}

// Map each spot's image-fraction (fx,fy) to screen px under object-fit:cover, so the
// backdrop can fill the whole screen (cropped) while spots stay glued to the subject.
function cuCover() {
  const stage = $("closeup-stage"), bg = $("closeup-bg");
  const Wc = stage.clientWidth, Hc = stage.clientHeight;
  // spot sizes are in LOGICAL backdrop pixels: divide a HiDPI backdrop (res: N) back down
  const r = (cuState && cuState.bgRes) || 1;
  const iw = ((bg && bg.naturalWidth) || 900) / r, ih = ((bg && bg.naturalHeight) || 1160) / r;
  const s = Math.max(Wc / iw, Hc / ih);
  return { s, dw: iw * s, dh: ih * s, ox: (Wc - iw * s) / 2, oy: (Hc - ih * s) / 2 };
}
function cuPlaceSpots() {
  const stage = $("closeup-stage"); if (!stage) return;
  cuSetMode();
  const c = cuCover();
  stage.querySelectorAll(".cu-spot").forEach((s) => {
    const px = (parseFloat(s.dataset.sz) || 64) * c.s;
    s.style.left = (c.ox + parseFloat(s.dataset.fx) * c.dw) + "px";
    s.style.top = (c.oy + parseFloat(s.dataset.fy) * c.dh) + "px";
    s.style.width = px + "px"; s.style.height = px + "px";
  });
  const first = stage.querySelector(".cu-spot"), h = stage.querySelector(".cu-hint");
  if (first && h) { h.style.left = first.style.left; h.style.top = first.style.top; }
}

function cuMoveBrush(e) {
  const brush = $("closeup-brush"); if (!brush || brush.classList.contains("hidden")) return;
  const r = $("closeup-stage").getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  brush.style.left = x + "px";
  brush.style.top = y + "px";
  // the brush tilts with the stroke direction (feels like real scrubbing)
  if (cuState) {
    if (cuState.lx != null) {
      const target = clamp((x - cuState.lx) * 2.2, -24, 24);
      cuState.ang += (target - cuState.ang) * 0.35;
    }
    cuState.lx = x;
    brush.style.transform = `translate(-50%,-50%) rotate(${cuState.ang.toFixed(1)}deg)`;
  }
}

function cuReleaseCapture() {
  try {
    const stage = $("closeup-stage");
    if (stage && cuPid != null && stage.hasPointerCapture && stage.hasPointerCapture(cuPid)) stage.releasePointerCapture(cuPid);
  } catch (_) {}
  cuPid = null;
}

// The active scrub point: the BRUSH HEAD (closeup.brushTip, fractions of the sprite),
// computed from the brush's centre + its rotation (not the rotated bounding box).
function cuTip(e) {
  let x = e.clientX, y = e.clientY;
  const brush = $("closeup-brush");
  const tip = cuState && cuState.a && cuState.a.closeup && cuState.a.closeup.brushTip;
  if (tip && brush && !brush.classList.contains("hidden")) {
    const w = brush.offsetWidth, h = brush.offsetHeight;
    const ox = ((tip.x != null ? tip.x : 0.5) - 0.5) * w, oy = ((tip.y != null ? tip.y : 0.5) - 0.5) * h;
    const a = (cuState.ang || 0) * Math.PI / 180;
    x += ox * Math.cos(a) - oy * Math.sin(a); y += ox * Math.sin(a) + oy * Math.cos(a);
  }
  return { x, y };
}

// Hit-test spots by GEOMETRY (the spots are pointer-events:none, so the pointer target
// is always the stable stage). This makes a continuous finger-scrub clean every spot it
// passes over, and never leaves the pointer captured by a removed element.
function cuRub(e) {
  if (!cuState) return;
  const { x, y } = cuTip(e);
  const now = nowMs();
  const stage = $("closeup-stage"), sr = stage.getBoundingClientRect();
  const hint = stage.querySelector(".cu-hint"); if (hint) hint.remove();
  // foam bubbles while brushing (anywhere), throttled
  const foam = cuState.a.closeup && cuState.a.closeup.foam;
  if (foam !== false && now - cuState.foamT > 55 && stage.querySelectorAll(".cu-foam").length < 40) {
    cuState.foamT = now;
    const f = document.createElement("div"); f.className = "cu-foam";
    const cols = (foam && foam.colors) || ["#ffffff", "#e9fbff", "#dff3ff"];
    f.style.background = pick(cols);
    const s = randInt(8, 22); f.style.width = s + "px"; f.style.height = s + "px";
    f.style.left = (x - sr.left + randInt(-18, 18)) + "px"; f.style.top = (y - sr.top + randInt(-12, 12)) + "px";
    stage.appendChild(f); setTimeout(() => f.remove(), 900);
  }
  const spots = stage.querySelectorAll(".cu-spot");
  const pad = 10;
  for (let i = 0; i < spots.length; i++) {
    const t = spots[i], r = t.getBoundingClientRect();
    if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) continue;
    if (now - (parseFloat(t.dataset.t) || 0) < 90) return;   // cooldown so a scrub isn't instant
    t.dataset.t = String(now);
    const left = (parseInt(t.dataset.rubs, 10) || 1) - 1;
    t.dataset.rubs = String(left);
    const f = Math.max(0, left) / (parseInt(t.dataset.rubs0, 10) || 1);
    t.style.opacity = (0.3 + 0.7 * f).toFixed(2);
    t.style.transform = `translate(-50%,-50%) rotate(var(--rot)) scale(${(0.45 + 0.55 * f).toFixed(2)})`;
    t.classList.remove("hit"); void t.offsetWidth; t.classList.add("hit");
    if (now - cuState.scrubT > 70) { cuState.scrubT = now; Sound.play("scrub", { pitch: rand(0.85, 1.2) }); }
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
    if (left <= 0) cuPop(t);
    return;
  }
}

function cuPop(spot) {
  const done = cuState ? cuState.total - cuState.remaining : 0;
  cuEmoji(spot.style.left, spot.style.top, (cuState && cuState.a.closeup && cuState.a.closeup.popParticles) || ["sparkle", "star"], false);
  const ring = document.createElement("div"); ring.className = "cu-ring"; ring.style.left = spot.style.left; ring.style.top = spot.style.top;
  $("closeup-stage").appendChild(ring); setTimeout(() => ring.remove(), 600);
  spot.remove();
  if (!cuState) return;
  Sound.play("pop", { pitch: 1 + done * 0.09 });               // rising pitch: progress you can hear
  cuState.remaining = Math.max(0, cuState.remaining - 1);
  const dots = document.querySelectorAll("#cu-progress i");
  if (dots[done]) { dots[done].classList.remove("todo"); dots[done].classList.add("on"); }
  if (cuState.remaining === 0) cuFinish();
}

function cuEmoji(left, top, glyphs, burst) {
  const stage = $("closeup-stage"); if (!stage) return;
  glyphs.forEach((g, k) => {
    const e = document.createElement("div");
    e.className = "cu-emoji" + (burst ? " cu-burst" : "");
    e.innerHTML = iconHTML(g); e.style.left = left; e.style.top = top;
    e.style.setProperty("--dx", randInt(-40, 40) + "px");
    e.style.animationDelay = (burst ? Math.floor(Math.random() * 300) : k * 70) + "ms";
    stage.appendChild(e); setTimeout(() => e.remove(), 1600);
  });
}

function cuFinish() {
  const { c, a } = cuState;
  // Release the pointer capture NOW (stage still visible) rather than later when the
  // overlay hides — on iOS a finger still down when a captured element is removed/hidden
  // leaves the capture stuck and freezes later taps. Releasing early avoids that.
  if (cuState) cuState.pressed = false;
  cuReleaseCapture();
  const cfg = a.closeup || {};
  const parts = cfg.finishParticles || ["star", "heart", "sparkle"];
  const bg2 = $("closeup-bg2");
  const reveal = bg2 && bg2.getAttribute("src");
  if (reveal) bg2.classList.add("show");                       // e.g. the patient's big happy smile
  const shine = cuEl("cu-shine", "cu-shine", "div", $("closeup")); shine.classList.remove("go"); void shine.offsetWidth; shine.classList.add("go");
  const brush = $("closeup-brush"); if (brush) brush.classList.add("hidden");
  for (let i = 0; i < 18; i++) cuEmoji((8 + Math.random() * 84) + "%", (15 + Math.random() * 60) + "%", [parts[i % parts.length]], true);
  Sound.play("celebrate");
  // Apply the outcome once, and close only THIS close-up: the player may already have
  // closed it by hand (then the reward is applied right away) or opened another one.
  const st = cuState; st.finished = true;
  st.finishTimer = setTimeout(() => { if (cuState === st) closeCloseup(); }, cfg.finishDelay || (reveal ? 1900 : 1100));
}

// Apply the action's outcome — mirrors the tail of creatureAction().
function cuApply(c, a) {
  const moodBefore = MOOD_NEED ? (c[MOOD_NEED] || 0) : 0;
  Object.keys(a.effects || {}).forEach((k) => { c[k] = clamp01((c[k] || 0) + a.effects[k]); });
  if (a.reward) { earn(a.reward); setTimeout(() => flyReward(c.x, c.y - 50, "+" + a.reward + " " + coinTok()), 350); }
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (a.stat) state.stats[a.stat] = (state.stats[a.stat] || 0) + 1;
  let celebrated = false;
  if (canCelebrate(c, a) && moodBefore < 100 && (c[MOOD_NEED] || 0) >= 100) {
    if (sc) sc.time.delayedCall(350, () => celebrate(c)); celebrated = true;
    if (CREATURE.depart) c.leaving = true;   // cured & about to leave → stop selecting it (panel clears now, not 250ms later)
  }
  refreshCreatureVisual(c);
  if (a.message) message((celebrated && a.celebrateMessage ? a.celebrateMessage : a.message).replace("{name}", c.name));
  refreshBars(c); refreshHud(); panelId = PANEL_DIRTY; refreshInteraction();
}

function clearSelection() {
  try { const s = window.getSelection && window.getSelection(); if (s && s.removeAllRanges) s.removeAllRanges(); } catch (e) {}
}

function closeCloseup() {
  const done = cuState && cuState.finished ? cuState : null;
  if (done) clearTimeout(done.finishTimer);
  cuReleaseCapture();
  const root = $("closeup"); if (root) { root.classList.add("hidden"); root.classList.remove("cu-enter"); root.style.backgroundImage = ""; }
  const stage = $("closeup-stage"); if (stage) stage.querySelectorAll(".cu-spot, .cu-emoji, .cu-foam, .cu-hint, .cu-ring").forEach((n) => n.remove());
  const bg2 = $("closeup-bg2"); if (bg2) bg2.classList.remove("show");
  closeupOpen = false; cuState = null; clearSelection();
  setTimeout(checkUnlocks, 650);                         // unlocks earned in the close-up: reveal now, in view
  // Make sure the world is fully interactive again (belt-and-braces: clear any
  // transient input/movement state and re-assert camera follow + keyboard).
  moveTarget = null; navPath = []; pendingInteract = null; followCreature = null;
  running = false; jumpRunning = false; lastInputT = nowMs();
  themeColor((META.theme && META.theme.play) || TINT_PLAY);
  if (sc && sc.input) {                                  // re-assert pointer + keyboard input
    sc.input.enabled = true;
    if (sc.input.manager) sc.input.manager.enabled = true;
    if (sc.input.keyboard) { sc.input.keyboard.enabled = true; sc.input.keyboard.resetKeys(); }
  }
  if (sc && player) {
    const cam = sc.cameras.main;
    cam.startFollow(player, true, RENDER.cameraLerp || 0.12, RENDER.cameraLerp || 0.12);
    if (zoomFx) {
      cam.zoomTo(baseZoom, 420, "Sine.easeOut", true, (_c, p) => { if (p >= 1) zoomFx = false; });
      // safety net: an interrupted zoom tween must never leave the camera zoomed in
      setTimeout(() => { if (zoomFx && !closeupOpen && sc) { sc.cameras.main.setZoom(baseZoom); zoomFx = false; } }, 700);
    }
  }
  if (done) cuApply(done.c, done.a);                     // a finished scrub always pays out, exactly once
}

/* ===================== Choice menus (generic modal list) ===================== */
// A mobile-game list of options in the modal: icon/thumbnail tile, title, subtitle, price
// pill. Used by station menus, missions, models and restyle. items: [{ label, sub, icon,
// img, price, disabled, accent, tag, onPick }] — label/sub may carry {i:key} tokens.
let choiceOpts = null;
function openChoice(title, subtitle, items) {
  choiceOpts = items;
  let html = subtitle ? `<p class="choice-sub">${fmt(subtitle)}</p>` : "";
  html += `<div class="choice-list">`;
  items.forEach((o, i) => {
    const ico = o.img ? `<img src="${av(o.img)}" alt="" draggable="false" />` : iconHTML(o.icon || "check");
    const right = o.tag ? `<span class="ch-tag">${iconHTML(o.tag)}</span>`
      : (o.price != null ? `<span class="ch-price">${iconHTML(META.coinIcon || "star")}<b>${o.price}</b></span>` : "");
    html += `<button class="choice${o.accent ? " accent" : ""}${o.disabled ? " off" : ""}" data-choice="${i}"${o.disabled ? " disabled" : ""}${o.color ? ` style="--c:${o.color}"` : ""}>
      <span class="ch-ico">${ico}</span><span class="ch-txt"><b>${fmt(o.label)}</b>${o.sub ? `<small>${fmt(o.sub).replace(/\n/g, "<br>")}</small>` : ""}</span>${right}</button>`;
  });
  openModal(title, html + `</div>`);
}
function choicePick(i) { const o = choiceOpts && choiceOpts[i]; if (!o || o.disabled) return; if (o.onPick) o.onPick(); }

// Station "menu": { title, subtitle, items:[{ label, sub, icon, price?, do, … }] } where
// do = "nextDay" | "openShop" | "missions" | "models" | "restyle" | "spawn" | "custom" (onPick(state, api)).
// highlight:"chase" accents an item while a chase is on (e.g. a repaint that loses pursuers).
function openStationMenu(st) {
  const M = st.menu || {};
  openChoice(M.title || st.label || "", M.subtitle || "", (M.items || []).map((it) => ({
    label: it.label, sub: it.sub, icon: it.icon, img: it.img, price: it.price, color: it.color,
    accent: it.highlight === "chase" ? (state.heat || 0) > 0 : !!it.accent,
    onPick: () => runMenuItem(st, it),
  })));
}
function runMenuItem(st, it) {
  const d = it.do;
  if (d === "restyle") { openRestyle(it); return; }
  if (d === "missions") { openMissions(); return; }
  if (d === "models") { openModels(); return; }
  closeModal();
  if (d === "nextDay") nextDay();
  else if (d === "openShop") openShop();
  else if (d === "spawn") spawnCreatures(st);
  else if (typeof it.onPick === "function") it.onPick(state, stationApi());
}
// The helper API handed to config callbacks (station.onUse, menu item onPick).
function stationApi() {
  return { ride: mounted, message, refreshHud, save, earn, spend, addHeat, clearHeat, fx: (x, y) => emitBurst(x, y, { shape: "star", colors: ["#fff2a8", "#ffffff"], count: 8, y0: 40, spread: 40 }) };
}

/* ---- Restyle: change the look (variant) of the creature you last rode, for a price ---- */
// menu item { do:"restyle", price, title, subtitle, clearsChase, message, chaseMessage }
function openRestyle(it) {
  const c = state.creatures.find((x) => x.id === state.lastRide) || state.creatures[0];
  if (!c) { closeModal(); message(it.noneMessage || L("Nothing to restyle yet.")); return; }
  const price = it.price || 0;
  openChoice(it.title || it.label, (it.subtitle || "").replace("{name}", esc(c.name)), VARIANTS.map((v) => {
    const cur = variantId(c) === v.id;
    return {
      label: v.name, img: v.thumb, icon: v.icon || "palette", color: v.color, tag: cur ? "check" : null, price: cur ? null : price, disabled: cur,
      onPick: () => {
        if (!spend(price)) return;
        c.variant = v.id; refreshCreatureVisual(c);
        const had = (state.heat || 0) > 0 && it.clearsChase;
        if (it.clearsChase) clearHeat();
        closeModal(); Sound.play("unlock");
        if (c.obj) actionAnim(c, { motion: "hop", particle: "spark", colors: [v.color || "#ffffff", "#ffffff"], count: 10 });
        message(((had && it.chaseMessage) || it.message || L("{i:sparkle} {name}")).replace("{name}", c.name).replace("{v}", v.name));
        refreshHud(); save();
      },
    };
  }));
}

/* ===================== Missions: go to a destination on the map (config: GAME.missions) ===================== */
// missions = { title, subtitle, radius, color, marker:"<image key>", stat:"missions",
//   offers:[{ label, sub, icon, pay, heat? }], dests:[{ x, y, name }],
//   takenMessage("{d}"), hotMessage("{d}"), doneMessage("{p}"), busyMessage }
// Take one at a station (action:"missions" or a menu item) → a pulsing ring + marker at the
// destination and an arrow around the player; reach it to be paid. heat>0 starts a chase.
const MISSIONS = G.missions || null;
let msRing = null, msMarker = null, msArrow = null;
function openMissions() {
  if (!MISSIONS) return;
  if (state.mission) { closeModal(); message(MISSIONS.busyMessage || L("Finish your current mission first!")); return; }
  openChoice(MISSIONS.title || L("Missions"), MISSIONS.subtitle || "", (MISSIONS.offers || []).map((of) => ({
    label: of.label, sub: of.sub, icon: of.icon, accent: !!of.heat, price: null, tag: null,
    onPick: () => { closeModal(); takeMission(of); },
  })));
}
// With missions.pickups, a mission has two legs: first go and pick the cargo up (marker =
// missions.marker), then bring it to the destination (a ground target = missions.target).
// A "hot" offer starts its chase once the cargo is picked up.
// An offer may override the mission-wide settings for its own missions: pickups (array, or false =
// one leg even when the others have two), dests, target / marker (false = none), the messages
// (takenMessage, hotMessage, pickedMessage, hotPickedMessage, doneMessage), an extra `stat` it
// counts on completion (e.g. a "big treasure" counter that drives its own unlocks), and how a chase
// ends when caught (caughtKeepsMission, caughtMessage — see chase). The save remembers the offer by
// its `id` (index when it has none), so reordering offers in the config keeps saved missions right.
function offerRef(of) { const i = (MISSIONS.offers || []).indexOf(of); return i < 0 ? null : (of.id != null ? of.id : i); }
function missionOffer(m) {
  if (!m || m.offer == null || !MISSIONS) return {};
  const offers = MISSIONS.offers || [];
  return (typeof m.offer === "number" ? offers[m.offer] : offers.find((o) => o.id === m.offer)) || {};
}
function mOpt(m, k) { const o = missionOffer(m); return o[k] !== undefined ? o[k] : MISSIONS[k]; }
function missionGoal(m) { return m.stage === "pickup" ? { x: m.px, y: m.py, name: m.pname } : { x: m.x, y: m.y, name: m.name }; }
function farPick(list, from, avoid) {
  const far = list.filter((d) => Math.hypot(d.x - from.x, d.y - from.y) > 300 && (!avoid || Math.hypot(d.x - avoid.x, d.y - avoid.y) > 300));
  return pick(far.length ? far : list);
}
function takeMission(of) {
  const probe = { offer: offerRef(of) };
  const dests = mOpt(probe, "dests") || [{ x: WORLD.w / 2, y: WORLD.h / 2, name: "" }];
  const pks = mOpt(probe, "pickups");
  const pk = pks && pks.length ? farPick(pks, player) : null;
  const d = farPick(dests, pk || player, pk);
  state.mission = { x: d.x, y: d.y, name: d.name || "", pay: of.pay || 30, heat: of.heat || 0, offer: probe.offer };
  if (pk) Object.assign(state.mission, { stage: "pickup", px: pk.x, py: pk.y, pname: pk.name || "" });
  buildMissionVisual(); refreshCargo();
  Sound.play("open");
  const m = state.mission, fill = (t) => t.replace("{d}", m.name).replace("{p}", m.pname || "");
  if (pk) message(fill(mOpt(m, "takenMessage") || L("Pick up the cargo at {p}!")));
  else if (of.heat) { addHeat(of.heat); message(fill(mOpt(m, "hotMessage") || mOpt(m, "takenMessage") || L("Go to {d}!"))); }
  else message(fill(mOpt(m, "takenMessage") || L("Go to {d}!")));
  refreshHud(); save();
}
function pickUpCargo() {
  const m = state.mission; if (!m) return;
  m.stage = "deliver";
  buildMissionVisual(); refreshCargo();
  Sound.play("reward");
  emitBurst(player.x, player.y, { shape: "star", colors: ["#fff2a8", "#ffffff"], count: 8, y0: 50, spread: 40 });
  const t = (m.heat ? (mOpt(m, "hotPickedMessage") || mOpt(m, "pickedMessage")) : mOpt(m, "pickedMessage")) || L("Now deliver it to {d}!");
  message(t.replace("{d}", m.name));
  if (m.heat) addHeat(m.heat);
  refreshHud(); save();
}
// HUD chip while carrying the cargo (missions.cargoIcon).
function refreshCargo() {
  const el = $("chip-cargo"); if (!el) return;
  el.classList.toggle("hidden", !(state.mission && state.mission.stage === "deliver"));
}
function clearMissionVisual() { [msRing, msMarker, msArrow].forEach((o) => o && o.destroy()); msRing = msMarker = msArrow = null; }
function buildMissionVisual() {
  clearMissionVisual(); if (!state.mission || !sc || !MISSIONS) return;
  const col = hexInt(MISSIONS.color || "#4fe0a0"), m = state.mission, g = missionGoal(m);
  msRing = sc.add.graphics().setDepth(-15);
  const deliver = m.stage === "deliver" || !m.stage;
  const tKey = mOpt(m, "target"), mKey = mOpt(m, "marker");
  const tgt = deliver && tKey && sc.textures.exists(tKey) ? tKey : null;
  const key = tgt || (mKey && sc.textures.exists(mKey) ? mKey : null);
  if (key) {
    msMarker = sc.add.image(g.x, g.y, key).setOrigin(0.5, tgt ? 0.5 : 0.9).setScale((tgt ? (mOpt(m, "targetScale") || 1) : (mOpt(m, "markerScale") || 1)) / RES(key)).setDepth(tgt ? -14 : g.y + 1);
    msMarker._scKey = tgt;
    msMarker._scGround = !!tgt;
  }
  msArrow = sc.add.image(0, 0, ensureShape("arrow")).setTint(col).setScale(0.6).setDepth(99996);
}
function missionTick(dt, now) {
  const m = state.mission; if (!m || !sc || !player) return;
  if (!msRing) buildMissionVisual();
  const g = missionGoal(m);
  const col = hexInt(MISSIONS.color || "#4fe0a0"), R = (MISSIONS.radius || 80);
  const r = R * 0.8 + Math.sin(now / 260) * 6;
  msRing.clear();
  if (!(msMarker && msMarker._scGround)) {
    msRing.fillStyle(col, 0.16); msRing.fillEllipse(g.x, g.y, r * 2.2, r * 1.2);
    msRing.lineStyle(5, col, 0.9); msRing.strokeEllipse(g.x, g.y, r * 2.2, r * 1.2);
  }
  if (msMarker) {
    if (msMarker._scGround) { const k = (mOpt(m, "targetScale") || 1) / RES(msMarker._scKey) * (1 + Math.sin(now / 300) * 0.05); msMarker.setScale(k); }
    else msMarker.y = g.y - 6 + Math.sin(now / 300) * 6;
  }
  const ang = Math.atan2(g.y - player.y, g.x - player.x), dist = Math.hypot(g.x - player.x, g.y - player.y);
  if (msArrow) {
    msArrow.setVisible(dist > R * 1.4);
    msArrow.x = player.x + Math.cos(ang) * 70; msArrow.y = player.y - 40 + Math.sin(ang) * 46;
    msArrow.rotation = ang - Math.PI / 2;                    // the arrow shape points down (+y)
  }
  if (dist < R) { if (m.stage === "pickup") pickUpCargo(); else completeMission(); }
}
function completeMission() {
  const m = state.mission; if (!m) return;
  state.mission = null; clearMissionVisual(); refreshCargo();
  earn(m.pay); flyReward(player.x, player.y - 60, "+" + m.pay + " " + coinTok());
  const st = MISSIONS.stat || "missions", ost = missionOffer(m).stat;
  state.stats[st] = (state.stats[st] || 0) + 1;
  if (ost && ost !== st) state.stats[ost] = (state.stats[ost] || 0) + 1;
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  emitBurst(player.x, player.y, { shape: "star", colors: ["#fff2a8", "#ffd24a", "#ffffff"], count: 12, y0: 50, spread: 50 });
  Sound.play("goal");
  message((mOpt(m, "doneMessage") || L("{i:check} +{p}")).replace("{p}", m.pay));
  // A delivered mission ends the chase it started: pursuers drive off and fade out
  // (missions.clearsChase:false keeps them on your tail).
  if (CHASE && MISSIONS.clearsChase !== false && (state.heat || 0) > 0) {
    clearHeat(true);
    if (MISSIONS.chaseEndMessage || CHASE.escapedMessage) message(MISSIONS.chaseEndMessage || CHASE.escapedMessage);
  }
  refreshHud(); save();
}

/* ===================== Chase: a "heat" level with pursuers (config: GAME.chase) ===================== */
// chase = { sprite, dirSheet?:{cols}, scale, icon, maxLevel, maxUnits, speed, catchRadius, catchSeconds,
//   loseRadius, loseAfter, fine, spawnDist, escapedMessage, caughtMessage("{f}") }
// Missions with heat raise the level; pursuers spawn around the player and home in; staying
// close for catchSeconds = caught (a fine + the mission is lost; with caughtKeepsMission — on the
// chase, or overridden by the current mission's offer — only the fine: the pursuers leave, the mission goes on). Lose them by staying far
// for loseAfter seconds (−1 level each time), or clear it (e.g. a restyle with clearsChase).
const CHASE = G.chase || null;
let chasers = [], catchT = 0, evadeT = 0;
function chaseMax() { return (CHASE && CHASE.maxLevel) || 3; }
function addHeat(n) { if (!CHASE || !n) return; state.heat = clamp((state.heat || 0) + n, 0, chaseMax()); evadeT = 0; refreshHeat(); }
function clearHeat(fade) { if (!state) return; state.heat = 0; clearChasers(fade); catchT = 0; evadeT = 0; refreshHeat(); }
function refreshHeat() {
  const el = $("chip-heat"); if (!el) return;
  const h = (state && state.heat) || 0;
  el.classList.toggle("hidden", h <= 0);
  const html = Array.from({ length: chaseMax() }, (_, i) => iconHTML(CHASE.icon || "star", i < h ? "on" : "off")).join("");
  const box = el.querySelector(".heat-icons"); if (box && box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
}
// fade=true: each pursuer drives away from the player while fading out (no pop out).
function clearChasers(fade) {
  chasers.forEach((u) => {
    if (!u.obj) return;
    if (!fade || !sc) { u.obj.destroy(); return; }
    const a = Math.atan2(u.y - player.y, u.x - player.x);
    sc.tweens.add({ targets: u.obj, x: u.x + Math.cos(a) * 260, y: u.y + Math.sin(a) * 260, alpha: 0, duration: 900, ease: "Quad.easeIn",
      onComplete: () => u.obj.destroy() });
  });
  chasers = [];
}
function chaserFrame(u) {
  if (!CHASE.dirSheet) return 0;
  const cols = CHASE.dirSheet.cols || 2;
  return DIRS[u.dir || "down"] * cols + (Math.floor(u.blink * (CHASE.blinkRate || 6)) % cols);
}
function spawnChaser() {
  const key = CHASE.sprite || "chaser"; if (!sc.textures.exists(key)) return;
  const a = rand(0, Math.PI * 2), d = CHASE.spawnDist || 640;
  const x = clamp(player.x + Math.cos(a) * d, 60, WORLD.w - 60), y = clamp(player.y + Math.sin(a) * d, 60, WORLD.h - 60);
  const u = { x, y, dir: "down", blink: rand(0, 1) };
  u.obj = sc.add.sprite(x, y, key, chaserFrame(u)).setOrigin(0.5, CHASE.originY || 0.6).setScale((CHASE.scale || 1) / RES(key)).setDepth(y);
  chasers.push(u);
}
function chaseTick(dt) {
  if (!CHASE || !sc || !player) return;
  const heat = state.heat || 0;
  const want = heat > 0 ? Math.min(heat, CHASE.maxUnits || 3) : 0;
  while (chasers.length < want) spawnChaser();
  while (chasers.length > want) { const u = chasers.pop(); if (u.obj) u.obj.destroy(); }
  if (!chasers.length) { catchT = 0; return; }
  const speed = (CHASE.speed || 230) * (1 + (heat - 1) * 0.12);
  let nearest = 1e9;
  chasers.forEach((u) => {
    const dx = player.x - u.x, dy = player.y - u.y, d = Math.hypot(dx, dy) || 1;
    if (d > 34) { u.x += (dx / d) * speed * dt; u.y += (dy / d) * speed * dt; }
    const o = { x: u.x, y: u.y }; pushOut(o, 18, 10); u.x = clamp(o.x, 40, WORLD.w - 40); u.y = clamp(o.y, 40, WORLD.h - 40);
    u.dir = dirOf(dx, dy, u.dir); u.blink += dt;
    u.obj.setPosition(u.x, u.y).setDepth(u.y);
    if (CHASE.dirSheet) u.obj.setFrame(chaserFrame(u)); else u.obj.setFlipX(dx > 0);
    nearest = Math.min(nearest, d);
  });
  if (nearest < (CHASE.catchRadius || 66)) { catchT += dt; evadeT = 0; if (catchT >= (CHASE.catchSeconds || 3.5)) caught(); }
  else catchT = Math.max(0, catchT - dt * 0.7);
  if (nearest > (CHASE.loseRadius || 820)) {
    evadeT += dt;
    if (evadeT >= (CHASE.loseAfter || 7)) {
      state.heat = Math.max(0, heat - 1); evadeT = 0; refreshHeat();
      if (!state.heat) { clearChasers(); Sound.play("goal"); message(CHASE.escapedMessage || L("You got away!")); save(); }
    }
  } else evadeT = 0;
}
function caught() {
  const fine = Math.min(state.coins, CHASE.fine || 40);
  state.coins -= fine;
  // caughtKeepsMission: the pursuer only takes its fine and leaves; the mission goes on (gentler, kids).
  // The current mission's offer may override it (and caughtMessage) for its own errands.
  const of = MISSIONS && state.mission ? missionOffer(state.mission) : {};
  const keep = !!(of.caughtKeepsMission !== undefined ? of.caughtKeepsMission : CHASE.caughtKeepsMission);
  const msg = of.caughtMessage || CHASE.caughtMessage || L("Caught! −{f}");
  if (state.mission && !keep) { state.mission = null; clearMissionVisual(); refreshCargo(); }
  clearHeat(keep); Sound.play("error");
  if (sc) sc.cameras.main.shake(260, 0.006);
  message(msg.replace("{f}", fine));
  refreshHud(); save();
}

/* ===================== Models: buy creatures with stats (config: GAME.models) ===================== */
// models = { title, subtitle, items:[{ id, name, price, variant, speedMul, grip, drainMul, desc, img? }],
//   stats:[{ key:"speedMul", icon:"speed" }, …], boughtMessage("{name}"), fullMessage, ownedTag:"check" }
// Each model is bought once; the new creature appears next to the player with the model's stats.
const MODELS = G.models || null;
function openModels() {
  if (!MODELS) return;
  openChoice(MODELS.title || L("Shop"), MODELS.subtitle || "", (MODELS.items || []).map((m) => {
    const owned = state.creatures.some((c) => c.model === m.id);
    const v = variantDef(m.variant);
    const statTxt = (MODELS.stats || []).map((s) => `{i:${s.icon}} ${Math.round((m[s.key] != null ? (s.invert ? 2 - m[s.key] : m[s.key]) : 1) * 100)}%`).join("  ");
    return {
      label: m.name, sub: statTxt + (m.desc ? "\n" + m.desc : ""), img: m.img || (v && v.thumb), icon: m.icon || (CREATURE && CREATURE.icon), color: v && v.color,
      price: owned ? null : m.price, tag: owned ? (MODELS.ownedTag || "check") : null, disabled: owned,
      onPick: () => buyModel(m),
    };
  }));
}
function buyModel(m) {
  if (state.creatures.some((c) => c.model === m.id)) return;
  if (state.creatures.length >= state.capacity) { Sound.play("error"); message(MODELS.fullMessage || L("No room!")); return; }
  if (!spend(m.price)) return;
  const c = newCreature({ variant: m.variant, name: m.name, model: m.id, speedMul: m.speedMul, grip: m.grip, drainMul: m.drainMul });
  const p = freeSpotNear(player.x + 110, player.y);
  c.x = p.x; c.y = p.y; c.tx = c.x; c.ty = c.y;
  state.creatures.push(c);
  if (sc) { buildCreatureObj(c); actionAnim(c, { motion: "hop", particle: "star", colors: ["#fff2a8", "#ffd24a", "#ffffff"], count: 12 }); }
  Sound.play("unlock"); confetti(24);
  closeModal();
  message((MODELS.boughtMessage || L("{name} is yours!")).replace("{name}", c.name));
  refreshHud(); save();
}
function freeSpotNear(x, y) {
  for (let r = 0; r < 260; r += 30) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, px = clamp(x + Math.cos(a) * r, 60, WORLD.w - 60), py = clamp(y + Math.sin(a) * r, 60, WORLD.h - 60);
    if (freeAt(px, py)) return { x: px, y: py };
  }
  return { x: clamp(x, 60, WORLD.w - 60), y: clamp(y, 60, WORLD.h - 60) };
}

/* ===================== Race: pseudo-3D "behind the vehicle" mini-game (config: GAME.race) ===================== */
// Mounted action type:"race". The top-down world is covered by a full-screen canvas: the road
// recedes to a horizon, your ride (race.sprite, tinted to its variant) sits at the bottom, and
// you steer (left/right half of the screen, or arrow keys) to reach the finish before the
// timer runs out while dodging obstacles. The HUD (timer, distance, speed, quit) is DOM with
// the game's icons. Track, colours, sprites, obstacles, reward and strings come from config:
// race = { time, reward, stat:"raceWin", hitPenalty, sprite, roadside:[keys], spriteZoom,
//   track:{ segments, speed, steer, centrifugal, curveEvery, seed },
//   obstacles:[{ sprite, every, phase, scale, hw, spread }],
//   colors:{ sky:[top,mid,horizon], sun:[top,bottom]|false, skyline, ground, grass:[a,b], road:[a,b], rumble:[a,b], lane, finish:[a,b] },
//   icons:{ time, distance, speed, quit, left, right }, speedUnit, distUnit,
//   startMessage, hitMessage("{n}"), winMessage("{r}"), loseMessage, quitMessage, hint }
const RACE = G.race || null;
const R3 = { on: false, canvas: null, ctx: null, W: 0, H: 0, segLen: 200, roadW: 1100, camH: 1100, camD: 0.84, draw: 240,
  segs: [], finishZ: 0, pos: 0, prevPos: 0, playerX: 0, speed: 0, maxSpeed: 0, time: 0, over: false, raf: 0, last: 0,
  shake: 0, hitFlash: 0, input: { left: false, right: false }, img: {}, car: null, listeners: [], hud: null };
function raceColors() {
  return Object.assign({ sky: ["#241a4d", "#5b2a6e", "#e0566e"], sun: ["#ffd36a", "#ff5d7a"], skyline: "#2a1c4a", ground: "#203524",
    grass: ["#243d2b", "#203524"], road: ["#3b404c", "#33373f"], rumble: ["#eef2f7", "#c8405d"], lane: "#e7ecf2", finish: ["#e9edf2", "#1a1330"] },
  (RACE && RACE.colors) || {});
}
function r3Rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function r3Img(key) { return key && sc && sc.textures.exists(key) ? sc.textures.get(key).getSourceImage() : null; }
function r3Tint(img, hex) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  if (hex) { x.globalCompositeOperation = "multiply"; x.fillStyle = hex; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = "destination-in"; x.drawImage(img, 0, 0); }
  return c;
}
// startRace(action): action.mode "chase" = escape a pursuer to the finish (race.chase); otherwise a race against
// race.rivals when configured, else the classic time trial
function startRace(a) {
  if (!RACE || R3.on || !mounted || !sc) return;
  let cv = $("race3d");
  if (!cv) { cv = document.createElement("canvas"); cv.id = "race3d"; cv.className = "race3d"; document.body.appendChild(cv); }
  R3.canvas = cv; R3.ctx = cv.getContext("2d");
  R3.img = { roadside: (RACE.roadside || []).map(r3Img).filter(Boolean), obst: (RACE.obstacles || []).map((o) => r3Img(o.sprite)) };
  // variant.raceSprite: a dedicated rear view per variant (variants drawn as separate sheets, not tints)
  const v = variantDef(variantId(mounted)) || {}, base = r3Img(v.raceSprite || RACE.sprite);
  R3.car = base ? r3Tint(base, v.raceSprite ? null : (v.tint || null)) : null;
  // character.raceRider: the player's own rider seen from behind, a layer drawn over the mount's rear view
  // (same frame size) so any character x any mount works; none when the ride hides its rider (cars).
  const rc = charDef(state.player.avatar), hide = CREATURE && CREATURE.ride && CREATURE.ride.hideRider;
  R3.rider = !hide && rc && rc.raceRider ? r3Img(rc.raceRider) : null;
  r3Track();
  const T = RACE.track || {};
  R3.pos = R3.prevPos = R3.playerX = R3.speed = 0;
  R3.grip = mounted.grip || 1;
  R3.baseMax = R3.segLen * 60 * (T.speed || 1) * (mounted.speedMul || 1);
  R3.maxSpeed = R3.baseMax * rideEmptyMul(); R3.drainAcc = 0; R3.tired = false;
  R3.time = RACE.time || 60; R3.over = false; R3.shake = R3.hitFlash = 0;
  R3.input = { left: false, right: false };
  R3.mode = (a && a.mode) || (RACE.rivals ? "rivals" : "time");
  if (R3.mode === "chase" && !RACE.chase) R3.mode = RACE.rivals ? "rivals" : "time";
  r3Rivals();
  const kd = (e) => r3Key(e, true), ku = (e) => r3Key(e, false);
  const set = (e) => { const r = cv.getBoundingClientRect(); const x = e.clientX - r.left; R3.input.left = x < r.width / 2; R3.input.right = x >= r.width / 2; };
  const pd = (e) => { try { cv.setPointerCapture(e.pointerId); } catch (_) {} set(e); };
  const pm = (e) => { if (R3.input.left || R3.input.right) set(e); };
  const pu = (e) => { R3.input.left = R3.input.right = false; try { if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId); } catch (_) {} };
  R3.listeners = [["keydown", kd, window], ["keyup", ku, window], ["resize", r3Resize, window], ["pointerdown", pd, cv], ["pointermove", pm, cv], ["pointerup", pu, cv], ["pointercancel", pu, cv]];
  R3.listeners.forEach(([t, fn, tg]) => tg.addEventListener(t, fn));
  r3Hud(true);
  cv.classList.remove("hidden"); r3Resize();
  document.documentElement.dataset.screen = "race";
  navPath = []; moveTarget = null;
  Sound.play("whoosh");
  message((R3.chaser && RACE.chase.startMessage) || (R3.rivals.length && RACE.rivals.startMessage) || RACE.startMessage || L("Go!"));
  R3.on = true; R3.last = 0; R3.raf = requestAnimationFrame(r3Loop);
  panelId = PANEL_DIRTY; refreshInteraction();
}
function r3Key(e, down) {
  const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A" || k === "q" || k === "Q") { R3.input.left = down; e.preventDefault(); }
  else if (k === "ArrowRight" || k === "d" || k === "D") { R3.input.right = down; e.preventDefault(); }
  else if (down && k === "Escape") endRace(false, true);
}
function r3Resize() {
  const cv = R3.canvas; if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  R3.W = cv.clientWidth || window.innerWidth; R3.H = cv.clientHeight || window.innerHeight;
  cv.width = Math.floor(R3.W * dpr); cv.height = Math.floor(R3.H * dpr);
  R3.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function r3Track() {
  const T = RACE.track || {}, N = T.segments || 900, rnd = r3Rng(T.seed || 1234567), C = raceColors(), every = T.curveEvery || 55;
  R3.segs = []; let curve = 0;
  for (let i = 0; i < N; i++) {
    if (i % every === 0) curve = (i > 40 && rnd() < 0.7) ? (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 2.4) : 0;
    const light = Math.floor(i / 3) % 2 === 0;
    R3.segs.push({ i, z: i * R3.segLen, curve: curve * 0.5, road: C.road[light ? 0 : 1], grass: C.grass[light ? 0 : 1],
      rumble: C.rumble[light ? 0 : 1], lane: light, sprites: [], obstacles: [] });
  }
  const road = R3.img.roadside;
  if (road.length) for (let i = 18; i < N - 6; i += 7) {
    const side = rnd() < 0.5 ? -1 : 1;
    R3.segs[i].sprites.push({ img: road[Math.floor(rnd() * road.length)], offset: side * (1.4 + rnd() * 1.7), scale: RACE.roadsideScale || 3.4 });
  }
  (RACE.obstacles || []).forEach((ob, k) => {
    const img = R3.img.obst[k]; if (!img) return;
    const ev = ob.every || 30, ph = (ob.phase || 0) % ev, spread = ob.spread != null ? ob.spread : 0.55;
    for (let i = 60; i < N - 24; i++) if (i % ev === ph) R3.segs[i].obstacles.push({ img, offset: (rnd() * 2 - 1) * spread, scale: ob.scale || 3.5, hw: ob.hw != null ? ob.hw : 0.3 });
  });
  R3.finishZ = (N - 12) * R3.segLen;
  for (let i = N - 14; i < N - 10; i++) R3.segs[i].finish = true;
}
function r3Loop(ts) {
  if (!R3.on) return;
  if (!R3.last) R3.last = ts;
  const dt = Math.min((ts - R3.last) / 1000, 0.05); R3.rawDt = Math.min((ts - R3.last) / 1000, 0.25); R3.last = ts;
  r3Update(dt); if (!R3.on) return;
  r3Render(); r3Hud(false);
  R3.raf = requestAnimationFrame(r3Loop);
}
function r3Update(dt) {
  if (R3.over) return;
  const T = RACE.track || {};
  // grid start: the field lines up ahead of the player (once the ride's drawn depth is known), then waits for 3-2-1
  if (R3.rivals.length && !R3.gridSet && R3.carDepth) r3Grid();
  if (R3.chaser && !R3.chaser.set && R3.carDepth) { R3.chaser.z = r3PlayerZ() - R3.segLen * (RACE.chase.startGap || 30); R3.chaser.set = true; }
  if (R3.count > 0) {
    const before = Math.ceil(R3.count); R3.count -= R3.rawDt || dt; const after = Math.ceil(R3.count);   // real seconds, even at a low fps
    if (after !== before) Sound.play(after > 0 ? "tap" : "goal");
    if (R3.count > 0) return;
  }
  if (R3.count > -1) R3.count -= R3.rawDt || dt;     // lets the "GO!" fade out
  if (R3.rivals.length || R3.chaser) R3.time += dt; else R3.time -= dt;
  R3.prevPos = R3.pos;
  // race.drain (per second, default 2.4 like running): the ride's fatigue need burns while racing
  const RD = CREATURE && CREATURE.ride;
  if (RD && RD.fatigueNeed && mounted && RACE.drain !== 0) {
    R3.drainAcc += dt * (RACE.drain != null ? RACE.drain : 2.4) * (mounted.drainMul || 1);
    if (R3.drainAcc >= 1) { const dn = Math.floor(R3.drainAcc); R3.drainAcc -= dn; mounted[RD.fatigueNeed] = clamp01((mounted[RD.fatigueNeed] || 0) - dn); }
    if (rideEmpty(mounted)) { R3.maxSpeed = R3.baseMax * rideEmptyMul(); rideEmptyWarn(mounted); }
    else if ((mounted[RD.fatigueNeed] || 0) <= 0 && !R3.tired) {
      // a mount out of energy without ride.empty:"slow" (e.g. a tired horse): it slows down for the rest of the race
      R3.tired = true; R3.maxSpeed = R3.baseMax * (RACE.tiredSpeed != null ? RACE.tiredSpeed : 0.5);
      if (RACE.tiredMessage) message(RACE.tiredMessage.replace("{name}", mounted.name));
    }
  }
  R3.speed += (R3.maxSpeed - R3.speed) * Math.min(1, dt * 0.8);
  if (Math.abs(R3.playerX) > 1) R3.speed *= (1 - dt * 1.1);              // off-road drag
  R3.pos += R3.speed * dt;
  const steer = dt * (T.steer || 2.4) * R3.grip * (0.35 + R3.speed / R3.maxSpeed);
  if (R3.input.left) R3.playerX -= steer;
  if (R3.input.right) R3.playerX += steer;
  const seg = R3.segs[Math.floor(R3.pos / R3.segLen)] || R3.segs[0];
  R3.playerX -= dt * (R3.speed / R3.maxSpeed) * (seg.curve || 0) * (T.centrifugal || 0.7);
  R3.playerX = clamp(R3.playerX, -2.2, 2.2);
  // obstacles hit the car where it is DRAWN: R3.carDepth ahead of the camera (set by r3Render)
  const D = R3.carDepth || 0, a0 = R3.prevPos + D, a1 = R3.pos + D;
  for (let i = Math.floor(a0 / R3.segLen); i <= Math.floor(a1 / R3.segLen) + 1 && i < R3.segs.length; i++) {
    const s = R3.segs[i]; if (!s || !s.obstacles.length || s.z <= a0 || s.z > a1) continue;
    s.obstacles.forEach((o) => {
      if (o.dead || Math.abs(R3.playerX - o.offset) >= o.hw + 0.16) return;
      o.dead = true; R3.speed *= 0.32; R3.shake = 0.4; R3.hitFlash = 0.5;
      Sound.play("error");
      if (R3.rivals.length || R3.chaser) { const hm = (R3.chaser ? RACE.chase : RACE.rivals).hitMessage; if (hm) message(hm); }   // a real race: the hit costs speed, not time
      else { R3.time -= (RACE.hitPenalty || 3); message((RACE.hitMessage || "−{n}s").replace("{n}", RACE.hitPenalty || 3)); }
    });
  }
  if (R3.rivals.length) r3RivalsUpdate(dt);
  if (R3.chaser) { r3ChaseUpdate(dt); if (R3.over) return; }
  if (R3.shake > 0) R3.shake = Math.max(0, R3.shake - dt);
  if (R3.hitFlash > 0) R3.hitFlash = Math.max(0, R3.hitFlash - dt * 1.6);
  if (R3.chaser) {
    if (R3.caught) return;                                          // the "caught" beat plays, then the results
    if (r3PlayerZ() >= R3.finishZ || R3.time >= (RACE.chase.maxTime || 240)) { R3.over = true; endRace(true); }
  } else if (R3.rivals.length) {
    // a real race ends when the player crosses the line (place = rivals already home + 1), or at the safety cap
    if (R3.pos + (R3.carDepth || 0) >= R3.finishZ || R3.time >= (RACE.rivals.maxTime || 240)) { R3.over = true; endRace(true); }
  } else if (R3.pos >= R3.finishZ) { R3.over = true; endRace(true); }
  else if (R3.time <= 0) { R3.time = 0; R3.over = true; endRace(false); }
}

/* ---- race.rivals: a fixed field of competitors to overtake (grid start, ranking, results) ---- */
function r3Rivals() {
  const RV = RACE.rivals; R3.rivals = []; R3.count = 0; R3.place = 0; R3.bumpT = 0; R3.chaser = null; R3.caught = 0;
  if (R3.mode === "chase") { r3ChaseInit(); return; }
  if (R3.mode !== "rivals" || !RV || !(RV.list || []).length) return;
  const n = Math.min(RV.count || RV.list.length, RV.list.length), sk = RV.skill || [0.84, 0.97];
  // each race shuffles who is fast: a strong rider can start at the back and come through the field
  const rnd = r3Rng((Date.now() & 0xffff) + 7), order = [...Array(n).keys()].sort(() => rnd() - 0.5), av = RV.avoid || [0.7, 0.95];
  for (let k = 0; k < n; k++) {
    const d = RV.list[k], base = r3Img(d.sprite); if (!base) continue;
    const rid = d.rider ? r3Img(d.rider) : null;
    R3.rivals.push({
      name: d.name || "#" + (k + 1), color: d.color || null, head: d.head || null, img: r3Tint(base, d.tint || null), rider: rid ? r3Tint(rid, d.riderTint || null) : null,
      scale: d.scale || RV.scale || 6.5, hw: d.hw != null ? d.hw : (RV.hw != null ? RV.hw : 0.28),
      // the front of the grid is the strongest; everybody gets a little personality (wobble phase, lane)
      skill: n > 1 ? sk[1] - (sk[1] - sk[0]) * (order[k] / (n - 1)) : sk[1], row: k,
      // a personal start (reaction 0–0.4 s, launch 0.6–1.5) and how often it dodges an obstacle in time
      react: rnd() * 0.4, launch: 0.6 + rnd() * 0.9, avoid: av[0] + rnd() * (av[1] - av[0]), seen: new Set(), slowT: 0,
      x: RV.lanes ? RV.lanes[k % RV.lanes.length] : (k % 2 ? 0.45 : -0.45), tx: RV.lanes ? RV.lanes[k % RV.lanes.length] : (k % 2 ? 0.45 : -0.45),
      ph: k * 1.7, z: 0, speed: 0, done: 0,
    });
  }
  R3.count = RV.countdown != null ? RV.countdown : 3.2;
  R3.time = 0; R3.gridSet = false;
}
/* ---- race.chase (action.mode "chase"): a pursuer starts behind and closes in; reach the finish before it
   catches you. Obstacles and bumps slow you down, so they are what lets it catch up. ---- */
function r3ChaseInit() {
  const C = RACE.chase, base = r3Img(C.sprite); if (!base) return;
  const rid = C.rider ? r3Img(C.rider) : null;
  const fr = C.front ? r3Img(C.front) : null;
  R3.chaser = { name: C.name || "", img: r3Tint(base, C.tint || null), rider: rid ? r3Tint(rid, C.riderTint || null) : null, front: fr,
    scale: C.scale || 6.5, x: 0, z: -1e9, speed: 0, set: false };
  R3.count = C.countdown != null ? C.countdown : 3.2; R3.time = 0; R3.sirenT = 0;
}
function r3ChaseUpdate(dt) {
  const C = RACE.chase, ch = R3.chaser, pz = r3PlayerZ(); if (!ch.set) return;
  if (R3.caught) {
    R3.caught -= dt; R3.speed *= (1 - Math.min(1, dt * 2.5));
    ch.z = Math.max(ch.z, pz + R3.segLen * 1.2) + R3.speed * dt * 0.6;     // it pulls alongside, then in front
    ch.x += ((R3.playerX > 0 ? -0.55 : 0.55) - ch.x) * Math.min(1, dt * 3);
    if (R3.caught <= 0) { R3.caught = 0.0001; R3.over = true; endRace(true); }
    return;
  }
  // the pursuer's pace ramps from skill[0] to skill[1] of the player's top speed over the race, so a clean
  // run escapes and a few crashes get you caught
  const sk = C.skill || [0.9, 1.04], prog = clamp(pz / R3.finishZ, 0, 1);
  const target = R3.baseMax * (sk[0] + (sk[1] - sk[0]) * prog);
  ch.speed += (target - ch.speed) * Math.min(1, dt * 0.8); ch.z += ch.speed * dt;
  ch.x += (R3.playerX - ch.x) * Math.min(1, dt * 1.5);
  const gap = pz - ch.z;
  if (gap <= R3.segLen * (C.catchGap || 0.8)) {
    R3.caught = C.caughtBeat || 1.4; R3.shake = 0.35; Sound.play("error");
    if (C.caughtMessage) message(C.caughtMessage.replace("{name}", ch.name));
    return;
  }
  // a siren cue that speeds up as it closes in
  const close = clamp(1 - gap / (R3.segLen * (C.startGap || 30) * 1.6), 0, 1);
  R3.sirenT += dt * (2 + close * 6);
  if (close > 0.55 && Math.floor(R3.sirenT) !== Math.floor(R3.sirenT - dt * (2 + close * 6))) Sound.play("tap");
}
function r3ChaserDraw(seg) {
  const ch = R3.chaser; if (!ch || !ch.set || Math.floor(ch.z / R3.segLen) !== seg.i || ch.z - R3.pos < R3.camD) return;
  r3Billboard(seg, { img: ch.img, offset: ch.x, scale: ch.scale });
  if (ch.rider) r3Billboard(seg, { img: ch.rider, offset: ch.x, scale: ch.scale });
}
// red / blue glow on the screen edges, stronger as the pursuer closes in (race.chase.siren:false disables)
function r3Siren() {
  const ch = R3.chaser; if (!ch || !ch.set || RACE.chase.siren === false) return;
  const gap = r3PlayerZ() - ch.z, close = R3.caught ? 1 : clamp(1 - gap / (R3.segLen * (RACE.chase.startGap || 30) * 1.6), 0, 1);
  if (close < 0.2) return;
  const ctx = R3.ctx, W = R3.W, H = R3.H, on = Math.floor(R3.sirenT * 2 + (R3.caught ? R3.time * 6 : 0)) % 2;
  const cols = RACE.chase.sirenColors || ["255,60,80", "60,120,255"], a = Math.min(0.75, (close - 0.2) * 1.0);
  [[0, cols[on]], [W, cols[1 - on]]].forEach(([x, c]) => {
    const g = ctx.createLinearGradient(x, 0, x === 0 ? W * 0.34 : W * 0.66, 0);
    g.addColorStop(0, `rgba(${c},${a.toFixed(3)})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(x === 0 ? 0 : W * 0.66, 0, W * 0.34, H);
  });
}
// how close the pursuer is: 0 (start gap x1.6 or more) → 1 (caught)
function r3Close() {
  const ch = R3.chaser; if (!ch || !ch.set) return 0;
  return R3.caught ? 1 : clamp(1 - (r3PlayerZ() - ch.z) / (R3.segLen * (RACE.chase.startGap || 30) * 1.6), 0, 1);
}
// A REAR-VIEW MIRROR at the top of the screen (race.chase.front = the pursuer seen from the front): the road behind
// recedes to a horizon and the pursuer grows as it closes in, its lights flashing. race.chase.mirror:false hides it.
function r3Mirror() {
  const ch = R3.chaser, C = RACE.chase; if (!ch || !ch.set || C.mirror === false || R3.caught) return;
  const ctx = R3.ctx, W = R3.W, H = R3.H, col = raceColors(), close = r3Close();
  const mw = Math.min(W * 0.46, 230), mh = mw * 0.42, mx = (W - mw) / 2, my = Math.max(150, H * 0.17), rad = mh * 0.45;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  ctx.save();
  // frame + drop shadow
  ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  rr(mx - 5, my - 5, mw + 10, mh + 10, rad + 5); ctx.fillStyle = C.mirrorFrame || "#2a2340"; ctx.fill();
  ctx.shadowColor = "transparent";
  rr(mx, my, mw, mh, rad); ctx.clip();
  // what is behind: sky, ground, the road narrowing to the horizon (mirrored: no left/right sway needed)
  const hz = my + mh * 0.38, g = ctx.createLinearGradient(0, my, 0, hz);
  g.addColorStop(0, col.sky[1]); g.addColorStop(1, col.sky[2]); ctx.fillStyle = g; ctx.fillRect(mx, my, mw, hz - my);
  if (col.stars) { ctx.fillStyle = "#fff"; const rnd = r3Rng(77); for (let i = 0; i < 14; i++) { ctx.globalAlpha = 0.5 + 0.5 * rnd(); ctx.fillRect(mx + rnd() * mw, my + rnd() * (hz - my), 1.2, 1.2); } ctx.globalAlpha = 1; }
  ctx.fillStyle = col.ground; ctx.fillRect(mx, hz, mw, my + mh - hz);
  ctx.fillStyle = col.road[0]; ctx.beginPath(); ctx.moveTo(mx + mw * 0.48, hz); ctx.lineTo(mx + mw * 0.52, hz); ctx.lineTo(mx + mw * 0.9, my + mh); ctx.lineTo(mx + mw * 0.1, my + mh); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col.lane || "#fff"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -(R3.pos * 0.05) % 11;
  ctx.beginPath(); ctx.moveTo(mx + mw * 0.5, hz); ctx.lineTo(mx + mw * 0.5, my + mh); ctx.stroke(); ctx.setLineDash([]);
  // the pursuer: tiny on the horizon when far, big at the bottom when close
  const img = ch.front || ch.img;
  if (img) {
    const k = 0.18 + close * 0.95, w = mw * 0.5 * k, h = w * img.height / img.width, x = mx + mw / 2 - w / 2 - (R3.playerX - ch.x) * mw * 0.08;
    const y = hz + (my + mh - hz) * (0.05 + close * 0.85) - h * 0.85;
    ctx.drawImage(img, x, y, w, h);
    // flashing lights in the mirror
    const on = Math.floor(R3.sirenT * 2) % 2, cols = C.sirenColors || ["255,60,80", "60,120,255"];
    [[-0.25, cols[on]], [0.25, cols[1 - on]]].forEach(([dx, c]) => {
      const gx = x + w / 2 + dx * w, gy = y + h * 0.12, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, w * 0.35);
      gr.addColorStop(0, `rgba(${c},.75)`); gr.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = gr; ctx.fillRect(gx - w * 0.35, gy - w * 0.35, w * 0.7, w * 0.7);
    });
  }
  // glass sheen
  const sh = ctx.createLinearGradient(mx, my, mx + mw, my + mh); sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = sh; ctx.fillRect(mx, my, mw, mh);
  ctx.restore();
  R3.mirrorRect = { l: mx - 5, t: my - 5, w: mw + 10, h: mh + 10 };
}
// red chevrons rising on both sides of the ride: more, brighter and faster as the pursuer closes in
function r3Chevrons() {
  if (!R3.chaser || !R3.chaser.set || !R3.carRect || RACE.chase.arrows === false) return;
  const close = r3Close(); if (close < 0.3) return;
  const ctx = R3.ctx, c = R3.carRect, n = close > 0.75 ? 3 : close > 0.5 ? 2 : 1, t = (R3.time || 0) * (1.2 + close * 2.5);
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  [c.l - 18, c.l + c.w + 18].forEach((x) => {
    for (let i = 0; i < n; i++) {
      const f = (t + i / n) % 1, y = c.t + c.h * (0.95 - f * 0.55), a = Math.sin(f * Math.PI) * (0.5 + close * 0.5), s = 11 + close * 7;
      ctx.globalAlpha = a; ctx.lineWidth = 7; ctx.strokeStyle = "rgba(30,10,30,.7)";
      ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.6); ctx.lineTo(x, y - s * 0.4); ctx.lineTo(x + s, y + s * 0.6); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = RACE.chase.arrowColor || "#ff4d6a"; ctx.stroke();
    }
  });
  ctx.restore();
}
function r3ChaseResults() {
  const C = RACE.chase, escaped = !R3.caught && r3PlayerZ() >= R3.finishZ, r = escaped ? (C.reward || 0) : (C.caughtReward || 0);
  if (r) earn(r);
  state.stats.chaseRun = (state.stats.chaseRun || 0) + 1;
  if (escaped) { const k = C.stat || "chaseEscape"; state.stats[k] = (state.stats[k] || 0) + 1; }
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (escaped) { Sound.play("celebrate"); confetti(); } else Sound.play("error");
  const msg = escaped ? (C.escapeMessage || L("{i:trophy} You escaped!")) : (C.caughtTitle || L("Caught!"));
  openModal(C.resultsTitle || L("{i:flag} Results"), `<div class="race-results"><p class="rr-head">${fmt(msg.replace("{name}", (R3.chaser && R3.chaser.name) || ""))}</p>
    <p class="rr-sub">${fmt((escaped ? C.escapeHint : C.caughtHint) || "").replace("{t}", R3.time.toFixed(1))}</p>
    ${r ? `<p class="rr-reward">${fmt("+" + r + " " + coinTok())}</p>` : ""}</div>`);
  if (r && player) setTimeout(() => flyReward(player.x, player.y - 60, "+" + r + " " + coinTok()), 300);
  lastInputT = nowMs(); refreshHud(); save();
  panelId = PANEL_DIRTY; refreshInteraction();
}
// two-by-two grid ahead of the player: the strongest (row 0) in front, the player starts last
function r3Grid() {
  // gridFirst (segments): the first row starts far enough ahead not to overlap the player's sprite
  const RV = RACE.rivals, gap = R3.segLen * (RV.gridGap || 4), first = R3.segLen * (RV.gridFirst || 0), pz = r3PlayerZ(), n = R3.rivals.length;
  R3.rivals.forEach((r) => { r.z = pz + first + gap * (Math.floor((n - 1 - r.row) / 2) + 1) + (r.row % 2) * gap * 0.5; });
  // the chequered start line is just in FRONT of the whole field: everybody starts behind it
  // (rivals.startLine:false hides it)
  const front = Math.max(pz, ...R3.rivals.map((r) => r.z));
  if (RV.startLine !== false) {
    const i0 = Math.floor((front + R3.segLen * 1.2) / R3.segLen); for (let i = i0; i < i0 + 2 && R3.segs[i]; i++) R3.segs[i].start = true;
    // rivals.startGate (image key): an arch / gantry across the road over the line, readable above the pack
    const gi = RV.startGate && r3Img(RV.startGate);
    if (gi && R3.segs[i0 + 1]) R3.segs[i0 + 1].sprites.push({ img: gi, offset: 0, scale: RV.startGateScale || 9, gate: true });
  }
  R3.gridSet = true;
}
// player's track position = where the ride is DRAWN (camera + carDepth)
function r3PlayerZ() { return R3.pos + (R3.carDepth || 0); }
function r3RivalsUpdate(dt) {
  const RV = RACE.rivals, pz = r3PlayerZ();
  if (!R3.gridSet) r3Grid();
  const rubber = RV.rubber != null ? RV.rubber : 0.12, reach = R3.segLen * 60;
  R3.rivals.forEach((r) => {
    if (r.done) return;
    // target speed: own skill x the player's top speed, a slow wobble, and a rubber band that keeps the pack in reach
    const lead = clamp((r.z - pz) / reach, -1, 1);
    const target = R3.baseMax * r.skill * (1 + 0.04 * Math.sin(R3.time * 0.7 + r.ph)) * (1 - rubber * lead) * (r.slowT > 0 ? 0.45 : 1);
    if (R3.time >= r.react) r.speed += (target - r.speed) * Math.min(1, dt * 0.9 * r.launch);   // own reaction + launch
    if (r.slowT > 0) r.slowT -= dt;
    const z0 = r.z; r.z += r.speed * dt;
    // obstacles: dodged in time most of the time (r.avoid), sometimes hit → it stumbles and slows down
    const si = Math.floor(r.z / R3.segLen); let avoid = null;
    for (let i = si + 1; i < si + 9 && i < R3.segs.length; i++) {
      const o = R3.segs[i].obstacles.find((ob) => !ob.dead && Math.abs(ob.offset - r.tx) < ob.hw + r.hw + 0.1);
      if (!o) continue;
      if (!r.seen.has(o)) { r.seen.add(o); o["miss" + r.row] = Math.random() > r.avoid; }
      if (!o["miss" + r.row]) { avoid = o; break; }
    }
    for (let i = Math.floor(z0 / R3.segLen) + 1; i <= si && i < R3.segs.length; i++) R3.segs[i].obstacles.forEach((ob) => {
      if (!ob.dead && Math.abs(ob.offset - r.x) < ob.hw + r.hw * 0.6 && !ob["hit" + r.row]) { ob["hit" + r.row] = true; r.slowT = 1.1; r.speed *= 0.5; }
    });
    if (avoid) r.tx = clamp(avoid.offset + (avoid.offset > 0 ? -1 : 1) * (avoid.hw + r.hw + 0.2), -0.85, 0.85);
    else if (Math.random() < dt * 0.25) r.tx = clamp(r.tx + (Math.random() - 0.5) * 0.6, -0.7, 0.7);
    r.x += (r.tx - r.x) * Math.min(1, dt * 2.2);
    if (r.z >= R3.finishZ) { r.done = R3.time; r.z = R3.finishZ + R3.segLen * 3; }
  });
  // bumping a rival: the player loses speed and is pushed aside (no time penalty)
  if (R3.bumpT > 0) R3.bumpT -= dt;
  else R3.rivals.forEach((r) => {
    if (r.done || R3.bumpT > 0) return;
    const dz = r.z - pz;
    if (dz > -R3.segLen * 0.6 && dz < R3.segLen * 1.4 && Math.abs(R3.playerX - r.x) < r.hw + 0.22) {
      R3.speed *= 0.62; R3.shake = 0.25; R3.bumpT = 0.7;
      const side = R3.playerX >= r.x ? 1 : -1; R3.playerX += side * 0.28; r.x -= side * 0.12; r.speed *= 1.03;
      Sound.play("error"); if (RV.bumpMessage) message(RV.bumpMessage.replace("{name}", r.name));
    }
  });
  // live place (1 = first): rivals home or ahead of the player
  const place = 1 + R3.rivals.filter((r) => r.done || r.z > pz).length;
  if (R3.place && place < R3.place) { Sound.play("reward"); const c = $("rh-place"); if (c) { c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); } }
  R3.place = place;
}
// rivals are billboards on their segment, drawn far → near with the scenery
function r3RivalsDraw(seg) {
  if (!R3.rivals.length) return;
  R3.rivals.forEach((r) => {
    if (Math.floor(r.z / R3.segLen) !== seg.i || r.z - R3.pos < R3.camD) return;
    const bob = Math.sin(R3.time * 9 + r.ph) * 0.004;
    r.rect = r.rect || {}; r3Billboard(seg, { img: r.img, offset: r.x, scale: r.scale, lift: bob, rect: r.rect });
    if (r.rider) r3Billboard(seg, { img: r.rider, offset: r.x, scale: r.scale, lift: bob });   // the rider moves WITH its mount
  });
}
function r3Countdown() {
  if (!(R3.count > 0) && !(R3.count > -0.7 && (R3.rivals.length || R3.chaser))) return;
  const ctx = R3.ctx, W = R3.W, H = R3.H, n = Math.ceil(R3.count), f = R3.count > 0 ? R3.count - Math.floor(R3.count) : (R3.count + 0.7) / 0.7;
  const txt = R3.count > 0 ? String(n) : (((R3.chaser ? RACE.chase : RACE.rivals) || {}).goLabel || L("GO!"));
  ctx.save(); ctx.globalAlpha = Math.min(1, f * 2.2);
  ctx.font = `800 ${Math.round(Math.min(W, H) * (0.22 + (1 - f) * 0.06))}px ${getComputedStyle(document.body).fontFamily || "sans-serif"}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const cyT = R3.mirrorRect ? Math.max(H * 0.36, R3.mirrorRect.t + R3.mirrorRect.h + Math.min(W, H) * 0.16) : H * 0.36;   // below the mirror
  ctx.lineWidth = Math.max(6, W * 0.02); ctx.strokeStyle = "rgba(20,14,40,.85)"; ctx.strokeText(txt, W / 2, cyT);
  ctx.fillStyle = R3.count > 0 ? "#fff" : (raceColors().rumble[1] || "#ffd24a"); ctx.fillText(txt, W / 2, cyT);
  ctx.restore();
}
// race.horizon: the horizon height as a fraction of the screen (0.5); lower it (0.4) on tall phones so the road
// and the field fill more of the screen instead of empty sky
function r3Hz() { return RACE.horizon || 0.5; }
function r3Project(p, camX) {
  const sc0 = R3.camD / Math.max(p.z - R3.pos, 1);
  p.sc = sc0; p.sx = R3.W / 2 - sc0 * camX * R3.W / 2; p.sy = R3.H * r3Hz() + sc0 * R3.camH * R3.H / 2; p.sw = sc0 * R3.roadW * R3.W / 2;
}
function r3Render() {
  const ctx = R3.ctx, W = R3.W, H = R3.H, C = raceColors();
  ctx.save(); ctx.translate(R3.shake > 0 ? (Math.random() - 0.5) * 18 * R3.shake : 0, 0);
  r3Sky(C);
  ctx.fillStyle = C.ground; ctx.fillRect(0, H * r3Hz(), W, H * (1 - r3Hz()));
  const base = Math.floor(R3.pos / R3.segLen), drawn = []; let x = 0, dx = 0, maxy = H;
  for (let n = 0; n < R3.draw; n++) {
    const seg = R3.segs[base + n]; if (!seg) break;
    const camX = R3.playerX * R3.roadW - x, p1 = { z: seg.z }, p2 = { z: seg.z + R3.segLen };
    r3Project(p1, camX); r3Project(p2, camX - dx);
    x += dx; dx += seg.curve; seg._p1 = p1; seg._clip = maxy;
    if (p1.z - R3.pos < R3.camD || p2.sy >= maxy) continue;
    r3Segment(seg, p1, p2, C); maxy = p2.sy; drawn.push(seg);
  }
  for (let n = drawn.length - 1; n >= 0; n--) { const s = drawn[n]; s.sprites.forEach((sp) => r3Billboard(s, sp)); s.obstacles.forEach((o) => { if (!o.dead) r3Billboard(s, o); }); r3RivalsDraw(s); r3ChaserDraw(s); }
  if (R3.car) {
    // race.rideWidth: the ride's FRAME width as a fraction of the screen (0.32); a narrow drawing (e.g. a horse
    // from behind) needs a larger frame. Capped so the ride never exceeds 55 % of the height (landscape).
    const asp = R3.car.height / R3.car.width, w = Math.min(W * (RACE.rideWidth || 0.32), H * 0.55 / asp), h = w * asp, bob = Math.sin(R3.pos * 0.05) * 2;
    // the depth (world units ahead of the camera) whose road row is under the car's wheels
    const carY = H - Math.max(90, H * 0.12) - h * 0.12;
    const hzY = H * r3Hz();
    R3.carDepth = carY > hzY + 1 ? R3.camD * R3.camH * (H / 2) / (carY - hzY) : 0;
    const lean = R3.playerX * 16 + (R3.input.left ? -10 : 0) + (R3.input.right ? 10 : 0);
    ctx.drawImage(R3.car, W / 2 - w / 2 + lean, H - h - Math.max(90, H * 0.12) + bob, w, h);
    R3.carRect = { l: W / 2 - w / 2 + lean, t: H - h - Math.max(90, H * 0.12) + bob, w, h };   // for probes
    // the rider layer moves WITH the mount (an independent bob opened a gap at the saddle)
    if (R3.rider) ctx.drawImage(R3.rider, W / 2 - w / 2 + lean, H - h - Math.max(90, H * 0.12) + bob, w, h);
  }
  ctx.restore();
  if (R3.hitFlash > 0) { ctx.fillStyle = "rgba(255,60,60," + (R3.hitFlash * 0.4).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); }
  r3Siren(); r3Mirror(); r3Chevrons();
  r3Countdown();
}
function r3Sky(C) {
  const ctx = R3.ctx, W = R3.W, H = R3.H, hz = H * r3Hz(), g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, C.sky[0]); g.addColorStop(0.55, C.sky[1]); g.addColorStop(1, C.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz);
  // colors.stars {count, color, twinkle}: a starfield in the sky (space / night races), with a slight parallax
  if (C.stars) {
    const S = C.stars === true ? {} : C.stars, n = S.count || 90, rnd = r3Rng(4242), t = (R3.time || 0);
    ctx.fillStyle = S.color || "#ffffff";
    for (let i = 0; i < n; i++) {
      const sx = ((rnd() * W * 1.2 - R3.playerX * 18 * (0.5 + rnd())) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * 0.1;
      const sy = rnd() * hz * 0.96, r = 0.5 + rnd() * 1.4, ph = rnd() * 6.28;
      ctx.globalAlpha = (S.twinkle === false ? 0.8 : 0.45 + 0.45 * Math.sin(t * (1 + ph % 2) + ph)) * (0.4 + 0.6 * (1 - sy / hz));
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      if (r > 1.6) { ctx.globalAlpha *= 0.5; ctx.fillRect(sx - r * 2.2, sy - 0.4, r * 4.4, 0.8); ctx.fillRect(sx - 0.4, sy - r * 2.2, 0.8, r * 4.4); }
    }
    ctx.globalAlpha = 1;
  }
  if (C.sun) {
    // colors.sunPos {x, y, r} (fractions: x of the width, y of the sky height, r of min(W,H)) moves the sun
    // off the centre — the countdown is drawn there
    const SP = C.sunPos || {}, cx = W * (SP.x != null ? SP.x : 0.5) - R3.playerX * 46, cy = hz * (SP.y != null ? SP.y : 0.82), r = Math.min(W, H) * (SP.r || 0.15), sg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    sg.addColorStop(0, C.sun[0]); sg.addColorStop(1, C.sun[1]);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    if (C.sunOutline) { ctx.lineWidth = Math.max(2, r * 0.07); ctx.strokeStyle = C.sunOutline; ctx.stroke(); }   // match an outlined art style
  }
  if (C.skyline) {
    ctx.fillStyle = C.skyline; const bx = -((R3.playerX * 60) % 90);
    for (let i = -1; i < W / 90 + 1; i++) { const bh = 22 + ((i * 53 + 7) % 6) * 9; ctx.fillRect(bx + i * 90, hz - bh, 66, bh); }
  }
}
function r3Trap(x1, y1, w1, x2, y2, w2, col) {
  const ctx = R3.ctx; ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2); ctx.closePath(); ctx.fill();
}
function r3Segment(seg, p1, p2, C) {
  const ctx = R3.ctx;
  ctx.fillStyle = seg.grass; ctx.fillRect(0, p2.sy, R3.W, p1.sy - p2.sy + 1);
  r3Trap(p1.sx, p1.sy, p1.sw * 1.15, p2.sx, p2.sy, p2.sw * 1.15, seg.rumble);
  if (seg.finish || seg.start) {
    const n = 10;
    for (let c = 0; c < n; c++) { const t = (c + 0.5) / n - 0.5; r3Trap(p1.sx + t * p1.sw * 2, p1.sy, p1.sw / n, p2.sx + t * p2.sw * 2, p2.sy, p2.sw / n, C.finish[(c + seg.i) % 2]); }
  } else {
    r3Trap(p1.sx, p1.sy, p1.sw, p2.sx, p2.sy, p2.sw, seg.road);
    if (seg.lane) r3Trap(p1.sx, p1.sy, p1.sw * 0.03, p2.sx, p2.sy, p2.sw * 0.03, C.lane);
  }
}
function r3Billboard(seg, sp) {
  const p = seg._p1; if (!p || p.sc <= 0 || !sp.img) return;
  const w = p.sw * (sp.scale || 1) * (RACE.spriteZoom || 0.045), h = w * (sp.img.height / sp.img.width);
  if (w < 1 || h < 1 || w > R3.W * 4) return;
  if (sp.rect) Object.assign(sp.rect, { l: p.sx + sp.offset * p.sw - w / 2, t: p.sy - h - (sp.lift || 0) * h * 10, w, h });
  const ctx = R3.ctx; ctx.save();
  if (seg._clip != null) { ctx.beginPath(); ctx.rect(0, 0, R3.W, seg._clip); ctx.clip(); }
  ctx.drawImage(sp.img, p.sx + sp.offset * p.sw - w / 2, p.sy - h - (sp.lift || 0) * h * 10, w, h);
  ctx.restore();
}
// DOM HUD over the race canvas: chips with the game's icons + a quit button + steering hints.
function r3Hud(build) {
  const I = RACE.icons || {};
  if (build) {
    let h = $("race-hud");
    if (!h) { h = document.createElement("div"); h.id = "race-hud"; h.className = "race-hud"; document.body.appendChild(h); }
    // race.showNeed (default on): the ride's fatigue need (fuel, energy…) as a gauge under the chips, so a ride
    // that slows down mid-race (an empty tank, ride.empty:"slow") is understood
    const RN = RACE.showNeed !== false && CREATURE && CREATURE.ride && CREATURE.ride.fatigueNeed && NEEDS.find((n) => n.id === CREATURE.ride.fatigueNeed);
    h.innerHTML = `<div class="rh-head"><div class="rh-top"><span class="resource" id="rh-time"><span class="r-ico">${iconHTML(I.time || "calendar")}</span><b>0</b></span>
        ${R3.rivals.length ? `<span class="resource rh-place" id="rh-place"><span class="r-ico">${iconHTML(I.place || "trophy")}</span><b>0</b></span>`
          : `<span class="resource" id="rh-dist"><span class="r-ico">${iconHTML(I.distance || "arrow")}</span><b>0</b></span>`}
        <span class="resource" id="rh-speed"><span class="r-ico">${iconHTML(I.speed || "star")}</span><b>0</b></span>
        <button class="mini-btn rh-quit" id="rh-quit" aria-label="${esc(stripIcons(RACE.quitLabel || L("Quit")))}">${iconHTML(I.quit || "close")}</button></div>
      ${R3.chaser ? `<span class="resource rh-need rh-chase" id="rh-chase"><span class="r-ico">${iconHTML(RACE.chase.icon || "wanted")}</span><span class="rh-gauge"><i></i></span><b>0</b></span>` : ""}
      ${RN ? `<span class="resource rh-need" id="rh-need"><span class="r-ico">${iconHTML(RN.icon || "battery")}</span><span class="rh-gauge"><i></i></span><b>0%</b></span>` : ""}</div>
      <div class="rh-steer"><span class="rh-l">${iconHTML(I.left || "arrow")}</span><span class="rh-hint">${fmt(RACE.hint || "")}</span><span class="rh-r">${iconHTML(I.right || "arrow")}</span></div>`;
    $("rh-quit").addEventListener("click", (e) => { e.stopPropagation(); endRace(false, true); });
    h.classList.remove("hidden"); R3.hud = h;
    return;
  }
  const set = (id, v) => { const b = $(id) && $(id).querySelector("b"); if (b && b.textContent !== v) b.textContent = v; };
  set("rh-time", Math.max(0, R3.time).toFixed(1) + "s");
  if (R3.rivals.length) set("rh-place", r3PlaceLabel(R3.place || R3.rivals.length + 1) + "/" + (R3.rivals.length + 1));
  else set("rh-dist", Math.max(0, Math.round((R3.finishZ - R3.pos) / 100)) + " " + (RACE.distUnit || "m"));
  set("rh-speed", Math.round((R3.speed / R3.maxSpeed) * (RACE.topSpeed || 210)) + " " + (RACE.speedUnit || "km/h"));
  const t = $("rh-time"); if (t) t.classList.toggle("warn", !R3.rivals.length && !R3.chaser && R3.time <= 8);
  const ch = $("rh-chase");
  if (ch && R3.chaser) {
    // the pursuer's distance: the gauge fills as it closes in (full = caught)
    const gap = Math.max(0, r3PlayerZ() - R3.chaser.z), start = R3.segLen * (RACE.chase.startGap || 30);
    const close = R3.caught ? 1 : clamp(1 - gap / (start * 1.6), 0, 1), w = Math.round(close * 100) + "%";
    const bar = ch.querySelector(".rh-gauge i"); if (bar && bar.style.width !== w) bar.style.width = w;
    set("rh-chase", Math.round(gap / 100) + " " + (RACE.distUnit || "m")); ch.classList.toggle("low", close > 0.7);
  }
  const ng = $("rh-need");
  if (ng && mounted) {
    const v = Math.max(0, Math.min(100, mounted[CREATURE.ride.fatigueNeed] || 0)), w = Math.round(v) + "%";
    const bar = ng.querySelector(".rh-gauge i"); if (bar && bar.style.width !== w) bar.style.width = w;
    set("rh-need", w); ng.classList.toggle("low", v < 25); ng.classList.toggle("empty", v <= 0);
  }
  R3.hud.classList.toggle("steer-l", R3.input.left); R3.hud.classList.toggle("steer-r", R3.input.right);
}
function r3Teardown() {
  R3.on = false; if (R3.raf) cancelAnimationFrame(R3.raf); R3.raf = 0;
  R3.listeners.forEach(([t, fn, tg]) => tg.removeEventListener(t, fn)); R3.listeners = [];
  if (R3.canvas) R3.canvas.classList.add("hidden");
  if (R3.hud) R3.hud.classList.add("hidden");
  syncEdge();
}
// End the race: win → reward + stat; quit → neutral; else → time-out.
function r3PlaceLabel(p) { const PL = (RACE.rivals && RACE.rivals.placeLabels) || ["1st", "2nd", "3rd"].map(L); return PL[p - 1] || (p + ((RACE.rivals && RACE.rivals.placeSuffix) || L("th"))); }
function endRace(win, quit) {
  if (!R3.on) return;
  r3Teardown();
  if (R3.chaser && !quit) { r3ChaseResults(); return; }
  if (R3.rivals.length && !quit) { r3Results(); return; }
  if (win) {
    const r = RACE.reward || 0; earn(r);
    const st = RACE.stat || "raceWin"; state.stats[st] = (state.stats[st] || 0) + 1;
    state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
    Sound.play("celebrate"); confetti();
    message((RACE.winMessage || L("{i:trophy} +{r}")).replace("{r}", r));
    if (r && player) setTimeout(() => flyReward(player.x, player.y - 60, "+" + r + " " + coinTok()), 300);
  } else if (quit) message(RACE.quitMessage || "");
  else { Sound.play("error"); message(RACE.loseMessage || L("Time's up!")); }
  lastInputT = nowMs(); refreshHud(); save();
  panelId = PANEL_DIRTY; refreshInteraction();
}

// Results of a race with rivals: final ranking (rivals not yet home are ranked by distance), reward by place,
// stats (raceWin for 1st, racePodium for top 3), results modal with the podium.
function r3Results() {
  const RV = RACE.rivals, pz = r3PlayerZ(), you = { name: state.player.name || L("You"), you: true, done: R3.time, z: pz };
  const field = R3.rivals.map((r) => ({ name: r.name, color: r.color, head: r.head, done: r.done, z: r.z, speed: r.speed })).concat([you]);
  you.head = (charDef(state.player.avatar) || {}).raceHead || null;
  // racers still on the course get an estimated finish time (remaining distance / their pace): the ranking and
  // the gaps shown are both based on it, so they always agree
  field.forEach((f) => { f.total = f.done || (R3.time + Math.max(0, R3.finishZ - f.z) / Math.max(f.speed || R3.baseMax * 0.8, R3.baseMax * 0.3)); });
  field.sort((a, b) => (a.done && b.done) ? a.done - b.done : a.done ? -1 : b.done ? 1 : a.total - b.total);
  const place = field.indexOf(you) + 1;
  const rewards = RV.rewards || [RACE.reward || 30, 15, 8, 4];
  const r = rewards[Math.min(place, rewards.length) - 1] || 0;
  if (r) earn(r);
  const bump = (k) => { state.stats[k] = (state.stats[k] || 0) + 1; };
  bump("raceRun"); if (place === 1) bump(RACE.stat || "raceWin"); if (place <= 3) bump(RV.podiumStat || "racePodium");
  state.stats.raceBest = Math.min(state.stats.raceBest || 99, place);
  state.actionsSinceRest = (state.actionsSinceRest || 0) + 1;
  if (place <= 3) { Sound.play("celebrate"); confetti(); } else Sound.play("reward");
  const medal = (k) => k <= 3 ? `<span class="rr-medal m${k}">${iconHTML(RV.medalIcon || "trophy")}</span>` : `<span class="rr-medal">${k}</span>`;
  // rivals.list[].color: a swatch of the colour seen in the race (jacket, car), so the names match the field
  // rivals.list[].head / character.raceHead: a small portrait (the helmet seen in the race) instead of the swatch;
  // a rival still racing shows its estimated gap to the finish ("+n.n s")
  const tag = (f) => f.head && assetPath(f.head) ? `<img class="rr-head-ico" src="${av(assetPath(f.head))}" alt="">` : f.color ? `<i class="rr-swatch" style="background:${esc(f.color)}"></i>` : "";
  const est = (f) => f.done ? f.done.toFixed(1) + "s" : "+" + Math.max(0.1, f.total - R3.time).toFixed(1) + "s";
  const rows = field.map((f, i) => `<div class="rr-row${f.you ? " you" : ""}">${medal(i + 1)}${tag(f)}<b>${esc(f.name)}</b>
      <span class="rr-time">${est(f)}</span></div>`).join("");
  const msgs = RV.placeMessages || [];
  const head = (msgs[Math.min(place, msgs.length) - 1] || L("{place}")).replace("{place}", r3PlaceLabel(place)).replace("{r}", r);
  openModal(RV.resultsTitle || L("{i:flag} Results"), `<div class="race-results"><p class="rr-head">${fmt(head)}</p>
    <div class="rr-list">${rows}</div>${r ? `<p class="rr-reward">${fmt("+" + r + " " + coinTok())}</p>` : ""}</div>`);
  if (r && player) setTimeout(() => flyReward(player.x, player.y - 60, "+" + r + " " + coinTok()), 300);
  lastInputT = nowMs(); refreshHud(); save();
  panelId = PANEL_DIRTY; refreshInteraction();
}

/* ===================== Goals / help ===================== */

function openGoals() {
  if (!LEVELS.length) { openModal(T("goalsTitle", "{i:goals} Goals"), `<p>${T("noGoals", "No goals configured.")}</p>`); return; }
  const idx = Math.min((state.level || 1) - 1, LEVELS.length - 1);
  const lvl = LEVELS[idx];
  const list = lvl.goals;
  const done = list.filter((o) => state.goalsDone[o.id]).length;
  const pct = Math.round((done / list.length) * 100);
  const last = idx === LEVELS.length - 1;
  const allDone = last && done === list.length;
  const lines = list.map((o) => {
    const ok = !!state.goalsDone[o.id];
    return `<div class="goal-row ${ok ? "goal-ok" : ""}"><span class="goal-check">${ok ? iconHTML("check") : ""}</span>
      <span class="goal-txt"><b>${fmt(o.name)}</b><small>${fmt(o.desc)}</small></span></div>`;
  }).join("");
  const sub = allDone ? T("allGoalsDone", "You finished every goal!") : T("goalsProgress", "{done}/{total} goals — finish them to reach level {next}", { done, total: list.length, next: idx + 2 });
  openModal(T("goalsTitle", "{i:goals} Goals"), `
    <div class="level-box">
      <div class="level-top"><b>${iconHTML("trophy")} ${T("levelLabel", "Level")} ${idx + 1}</b><span>“${esc(lvl.name)}”</span></div>
      <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
      <p class="level-sub">${sub}</p>
    </div>
    ${allDone ? `<p class="goal-done">${fmt(T("topLevel", "{i:trophy} You reached the top level!"))}</p>` : ""}
    <div class="goal-list">${lines}</div>`);
}

function openHelp() {
  const items = (G.help || []).map((h, i) => `<div class="help-row${i === 0 ? " lead" : ""}">${fmt(h, true)}</div>`).join("");
  // optional small legal links at the very bottom (meta.legalLinks: [{ label, url }]) — out of the
  // way of young players, but always reachable (publisher's legal notice / privacy policy)
  const legal = (META.legalLinks || []).filter((l) => l && l.label && /^(https:\/\/|\/|\.\.?\/)/.test(l.url || ""))
    .map((l) => `<a href="${l.url}">${L(l.label)}</a>`).join(" · ");
  openModal(META.helpTitle || L("How to play"), `<div class="help-text">${items}</div>${legal ? `<p class="help-legal">${legal}</p>` : ""}`);
}

/* ===================== Boot ===================== */

document.addEventListener("DOMContentLoaded", init);
