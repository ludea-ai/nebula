#!/usr/bin/env node
/*
 * game-systems — which engine systems THIS game turns on (read from game.config.js).
 * Used after an engine change to decide which games need the full tour: a game that does not
 * use the system a batch touched only gets the quick check (probes/smoke.cjs).
 *
 *   node .claude/skills/_shared/game-systems.cjs            # from the game root; one per line
 *   node .claude/skills/_shared/game-systems.cjs --json
 *   node .claude/skills/_shared/game-systems.cjs --uses race,chase   # exit 0 if it uses any, else 1
 */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ROOT = process.cwd(); // run from the game repo root
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game.config.js"), "utf8"), { window: win, console });
const G = win.GAME || {};
const C = G.creature || {};
const on = (v) => Array.isArray(v) ? v.length > 0 : !!v && (typeof v !== "object" || v.enabled !== false);

const systems = {
  creatures: on(C.needs) || on(C.actions),
  closeup: (C.actions || []).some((a) => a.type === "closeup"),
  ride: on(C.ride),
  aging: on(C.aging),
  breeding: on(C.breeding),
  variants: on(C.variants),
  customize: on(C.customize),
  dirSheet: !!C.dirSheet,
  characters: on(G.characters),
  stations: on(G.stations),
  rest: (G.stations || []).some((s) => s.type === "rest"),
  stationMenu: (G.stations || []).some((s) => on(s.menu)),
  economy: on(G.economy) && !(G.meta && G.meta.showCoins === false),
  shop: on(G.shop),
  decor: on(G.decor),
  environment: on(G.environment),
  zones: on(G.zones),
  race: on(G.race),
  missions: on(G.missions),
  chase: on(G.chase),
  models: on(G.models),
  unlocks: on(G.unlocks),
  objectives: on(G.objectives),
  guide: on(G.guide),
  i18n: fs.existsSync(path.join(ROOT, "game.i18n.js")),
  legalLinks: on(G.meta && G.meta.legalLinks),
};
const used = Object.keys(systems).filter((k) => systems[k]);

const a = process.argv.slice(2);
const i = a.indexOf("--uses");
if (i >= 0) {
  const want = String(a[i + 1] || "").split(",").map((s) => s.trim()).filter(Boolean);
  const hit = want.filter((w) => used.includes(w));
  console.log(hit.length ? "uses: " + hit.join(", ") : "uses none of: " + want.join(", "));
  process.exit(hit.length ? 0 : 1);
}
if (a.includes("--json")) console.log(JSON.stringify(used));
else console.log(used.join("\n"));
