#!/usr/bin/env node
/*
 * config-json — read a game's JS data files (game.config.js → window.GAME, game.i18n.js →
 * window.GAME_I18N) SAFELY: the file is evaluated inside headless Chromium with every request
 * blocked, and only JSON comes back. Never with node:vm, which is not a security boundary (a hostile
 * config can escape it and reach the machine — and an agent's credentials). Every _shared tool that
 * needs a game's config goes through here, so the same tools are safe on a game made by someone else
 * (a catalogue copy).
 *
 *   node .claude/skills/_shared/config-json.cjs game.config.js GAME [game.i18n.js GAME_I18N …]
 *     → prints {"GAME": {...}, "GAME_I18N": {...}}
 *   const { readGlobals } = require("./config-json.cjs");
 *   const { GAME } = readGlobals([["game.config.js", "GAME"]]);      // synchronous
 *
 * Functions in a config (e.g. legacySave.migrate) do not survive JSON: tools only need the data.
 */
"use strict";
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process");

function loadPlaywright() {
  for (const c of ["playwright", "/opt/node22/lib/node_modules/playwright"]) { try { return require(c); } catch (e) {} }
  return null;
}

async function evalFiles(pairs) {
  const pw = loadPlaywright();
  if (!pw) throw new Error("Playwright not found: a game's files are only evaluated inside a browser (install it: npx playwright install chromium)");
  const browser = await pw.chromium.launch();
  try {
    const ctx = await browser.newContext();
    await ctx.route("**/*", (r) => r.abort());
    const page = await ctx.newPage();
    await page.setContent("<!doctype html><title>config</title>");
    const out = {};
    for (const [file, name] of pairs) {
      if (!fs.existsSync(file)) { out[name] = null; continue; }
      await page.addScriptTag({ content: fs.readFileSync(file, "utf8") });
      out[name] = await page.evaluate((n) => JSON.parse(JSON.stringify(window[n] === undefined ? null : window[n])), name);
    }
    return out;
  } finally { await browser.close(); }
}

// Synchronous wrapper for the tools: runs this file in a child process and parses its output.
function readGlobals(pairs) {
  const args = [__filename];
  for (const [file, name] of pairs) args.push(path.resolve(file), name);
  const r = cp.spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("config-json: " + (r.stderr || r.stdout || "failed").trim());
  return JSON.parse(r.stdout);
}

module.exports = { readGlobals, evalFiles };

if (require.main === module) {
  const a = process.argv.slice(2);
  if (!a.length || a.length % 2) { console.error("usage: config-json.cjs <file> <GLOBAL> [<file> <GLOBAL> …]"); process.exit(2); }
  const pairs = []; for (let i = 0; i < a.length; i += 2) pairs.push([a[i], a[i + 1]]);
  evalFiles(pairs).then((o) => process.stdout.write(JSON.stringify(o))).catch((e) => { console.error(e.message); process.exit(1); });
}
