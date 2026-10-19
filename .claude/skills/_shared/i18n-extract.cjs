#!/usr/bin/env node
/*
 * i18n-extract — build / check a game's translation dictionary (game.i18n.js).
 *
 *   node .claude/skills/_shared/i18n-extract.cjs --to en          # add missing keys (value "") to game.i18n.js
 *   node .claude/skills/_shared/i18n-extract.cjs --to en --check  # exit 1 and list untranslated / stale keys
 *   node .claude/skills/_shared/i18n-extract.cjs --to en --prune  # also drop keys no longer in the game
 *   node .claude/skills/_shared/i18n-extract.cjs --to fr           # in a French game: engine fallbacks only
 * The engine's own texts are filled in automatically from _shared/engine-i18n.json.
 *
 * Run from the game's root. Keys = every player-facing string of game.config.js (same skip rules
 * as the engine's runtime walk) + the engine's own English fallbacks (L("...") / T(key, "...")),
 * which matter when the game's source language is not English or the config omits a label.
 * Values: the translation; "" = not translated yet (falls back to the source text at runtime);
 * a value equal to the key = intentionally identical (names, "OK"...).
 * NEVER translate identifiers: they are excluded here (lowercase ids, paths, colours, *Id/*Sheet keys).
 */
const fs = require("fs"), path = require("path");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const to = opt("--to"), check = args.includes("--check"), prune = args.includes("--prune");
if (!to) { console.error("usage: i18n-extract.cjs --to <lang> [--check] [--prune]"); process.exit(2); }
const root = process.cwd();

// game files are read in a sandboxed browser, never with node:vm (config-json.cjs)
const { readGlobals } = require("./config-json.cjs");
function load(file, name) { return readGlobals([[file, name]])[name]; }
const G = load(path.join(root, "game.config.js"), "GAME");
const SRC = (G.meta && G.meta.lang) || "en";
// --to <source language>: only the engine's English fallbacks (a French game must not show "Shop").
const ONLY_ENGINE = to === SRC;
if (ONLY_ENGINE && SRC === "en") { console.error("--to en: the game is already in English (meta.lang)"); process.exit(2); }

// Same skip rule as engine.js (I18N_SKIP) + text-shape filters.
const SKIP = /^(id|ids|saveKey|legacySave|audience|author|url|href|assetVersion|path|src|sheet|sprite|img|image|thumb|icon|color|tint|stat|need|type|kind|mode|font|key|lang)$|(Id|Ids|Sheet|Sprite|Icon|Bg|BgDone|BgWide|BgWideDone|Img|Color|Path|Key)$/;
const TEXTKEY = /label|name|title|text|unit|hint|message|prompt|placeholder|^and$|suffix|word/i;
function isText(s, k) {
  if (!/\p{L}/u.test(s)) return false;                                   // no letters
  if (/^(#|rgba?\(|hsla?\()/.test(s)) return false;                       // colours
  if (/^(assets|vendor|tools)\/|\.(png|webp|jpe?g|svg|js|css|json|woff2?)(\?|$)/i.test(s)) return false; // paths
  if (/^[a-z][A-Za-z0-9_-]*$/.test(s) && !TEXTKEY.test(String(k))) return false; // identifiers
  return true;
}
const keys = new Map();   // text -> where
(function walk(o, p, d) {
  if (!o || d > 14 || ONLY_ENGINE) return;
  for (const k in o) {
    const v = o[k], kp = p + (Array.isArray(o) ? `[${k}]` : "." + k);
    if (typeof v === "string") { if (!SKIP.test(k) && isText(v, Array.isArray(o) ? p.split(".").pop() : k) && !keys.has(v)) keys.set(v, kp.slice(1)); }
    else if (v && typeof v === "object" && !SKIP.test(k)) walk(v, kp, d + 1);
  }
})(G, "", 0);

// Engine fallbacks (English). Only needed when the target language is not English.
const engSrc = fs.readFileSync(path.join(root, "engine.js"), "utf8");
if (to !== "en") {
  const add = (t) => { if (t && !keys.has(t)) keys.set(t, "engine"); };
  for (const m of engSrc.matchAll(/\bL\("((?:[^"\\]|\\.)*)"\)/g)) add(m[1]);
  for (const m of engSrc.matchAll(/\bT\("\w+",\s*"((?:[^"\\]|\\.)*)"/g)) add(m[1]);
  for (const m of engSrc.matchAll(/\[([^\]]*)\]\.map\(L\)/g)) for (const q of m[1].matchAll(/"([^"]*)"/g)) add(q[1]);
}

// Existing dictionary.
const file = path.join(root, "game.i18n.js");
let all = {};
if (fs.existsSync(file)) all = load(file, "GAME_I18N") || {};
const dict = all[to] || {};
const missing = [...keys.keys()].filter((k) => !dict[k]);
const stale = Object.keys(dict).filter((k) => !keys.has(k));

if (check) {
  if (missing.length) console.log(`${missing.length} untranslated (${to}):\n` + missing.map((k) => `  ${JSON.stringify(k)}   <- ${keys.get(k)}`).join("\n"));
  if (stale.length) console.log(`${stale.length} stale keys (no longer in the game; --prune drops them):\n` + stale.map((k) => "  " + JSON.stringify(k)).join("\n"));
  console.log(missing.length ? `I18N ${to}: ${keys.size - missing.length}/${keys.size} translated ✗` : `I18N ${to}: ${keys.size}/${keys.size} translated ✓`);
  process.exit(missing.length ? 1 : 0);
}

// The engine's own texts come translated with the engine (_shared/engine-i18n.json): filled in
// automatically, never left for the creator to translate.
let ENGINE_I18N = {};
try { ENGINE_I18N = JSON.parse(fs.readFileSync(path.join(__dirname, "engine-i18n.json"), "utf8"))[to] || {}; } catch (e) {}
const out = {};
for (const k of keys.keys()) out[k] = dict[k] ? dict[k] : (ENGINE_I18N[k] || (dict[k] != null ? dict[k] : ""));
if (!prune) for (const k of stale) out[k] = dict[k];
all[to] = out;
const langs = Object.keys(all).sort();
let txt = `/* game.i18n.js — translations of game.config.js (source language: ${SRC}).\n` +
  ` * Keys are the EXACT source strings (config + engine fallbacks); "" = not translated yet.\n` +
  ` * Regenerate keys: node .claude/skills/_shared/i18n-extract.cjs --to <lang>  (see ENGINE.md, Languages). */\n` +
  `window.GAME_I18N = window.GAME_I18N || {};\n`;
for (const l of langs) {
  txt += `window.GAME_I18N.${l} = {\n` + Object.keys(all[l]).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(all[l][k])},`).join("\n") + `\n};\n`;
}
fs.writeFileSync(file, txt);
const auto = missing.filter((k) => out[k]).length;
console.log(`game.i18n.js: ${to} ${Object.keys(out).length} keys, ${missing.length - auto} to translate${auto ? `, ${auto} engine texts filled in` : ""}${stale.length ? `, ${stale.length} stale ${prune ? "dropped" : "kept"}` : ""}`);
