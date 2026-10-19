#!/usr/bin/env node
// update-check — is a newer Ludea engine available for this game?
// Compares this repo's engine version (engine-manifest.json) with the template's
// (ludea-ai/game-engine main, public), and lists what's new (CHANGELOG.md).
// Never fails and never blocks: no network / no manifest → prints nothing, exit 0.
//
//   node .claude/skills/_shared/update-check.cjs          # human-readable
//   node .claude/skills/_shared/update-check.cjs --hook   # SessionStart hook: a note for Claude, or nothing
//   node .claude/skills/_shared/update-check.cjs --json
// Also says when the game is published in the catalogue and its published version is behind.
//   node .claude/skills/_shared/update-check.cjs --install-hook  # add the SessionStart hook to .claude/settings.json (once)
"use strict";
const fs = require("fs"), path = require("path"), https = require("https"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "../../..");
// LUDEA_UPDATE_SOURCE / LUDEA_CATALOGUE override the sources (tests): an https URL or a local path.
const RAW = process.env.LUDEA_UPDATE_SOURCE || "https://raw.githubusercontent.com/ludea-ai/game-engine/main/.claude/skills/_shared/";
const CATALOGUE = process.env.LUDEA_CATALOGUE || "https://raw.githubusercontent.com/ludea-ai/ludea-ai.github.io/main/catalogue.json";
const mode = process.argv.includes("--hook") ? "hook" : process.argv.includes("--json") ? "json" : "text";

function get(url) {
  if (!/^https:/.test(url)) { try { return Promise.resolve(fs.readFileSync(url, "utf8")); } catch (e) { return Promise.resolve(null); } }
  return new Promise((res) => {
    const req = https.get(url, { timeout: 4000 }, (r) => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.setEncoding("utf8"); r.on("data", (c) => (b += c)); r.on("end", () => res(b));
    });
    req.on("timeout", () => { req.destroy(); res(null); }); req.on("error", () => res(null));
  });
}
const cmp = (a, b) => { // "YYYY-MM-DD.N"
  const [da, na] = String(a).split("."), [db, nb] = String(b).split(".");
  return da === db ? (+na || 0) - (+nb || 0) : da < db ? -1 : 1;
};

const out = [];
// Is this game published in the Ludea catalogue, and has it changed since the reviewed version?
const GAME_PATHS = ["game.config.js", "game.i18n.js", "index.html", "style.css", "manifest.webmanifest", "assets", "tools"];
async function publishedStatus(slug) {
  const m = String(slug).match(/github\.com[/:]([^/]+\/[^/.\s]+?)(?:\.git)?\s*$/); if (!m) return;
  const cat = await get(CATALOGUE); if (!cat) return;
  let g; try { g = (JSON.parse(cat).games || []).find((x) => String(x.source).toLowerCase() === m[1].toLowerCase() && x.reviewedCommit); } catch (e) { return; }
  if (!g) return;
  let n = 0, lines = [];
  try {
    const log = cp.execSync(`git log --oneline ${g.reviewedCommit}..HEAD -- ${GAME_PATHS.join(" ")}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    lines = log ? log.split("\n") : []; n = lines.length;
  } catch (e) { return; }
  if (!n) return;
  if (mode === "json") { console.log(JSON.stringify({ published: g.url, reviewedCommit: g.reviewedCommit, changesSince: n })); return; }
  out.push(`[Ludea] This game is published in the Ludea catalogue (${g.url}), but the published version is behind: ${n} change(s) to the game since the reviewed version. When the creator is happy with their current version, offer to send the update to the catalogue (/publish, it handles updates). Never send it without their yes.`);
}

function installHook() {
  const p = path.join(ROOT, ".claude/settings.json");
  let s = {}; try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) {}
  s.hooks = s.hooks || {}; const ss = (s.hooks.SessionStart = s.hooks.SessionStart || []);
  if (JSON.stringify(ss).includes("update-check.cjs")) return;
  ss.push({ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/_shared/update-check.cjs" --hook', timeout: 10 }] });
  fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
  console.log("SessionStart update-check hook added to .claude/settings.json");
}

(async () => {
  if (process.argv.includes("--install-hook")) return installHook();
  try {
    let slug = "";
    try { slug = cp.execSync("git remote get-url origin", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch (e) {}
    // Ludea's own repos are updated by the maintainers' engine agent: nothing to tell.
    if (/github\.com[/:]ludea-ai\//.test(slug) || /\/git\/ludea-ai\//.test(slug)) return;
    const mp = path.join(ROOT, ".claude/skills/_shared/engine-manifest.json");
    if (!fs.existsSync(mp)) return;
    const local = JSON.parse(fs.readFileSync(mp, "utf8")).version;
    const remoteTxt = await get(RAW + "engine-manifest.json"); if (!remoteTxt) return;
    const latest = JSON.parse(remoteTxt).version;
    if (!local || !latest || cmp(latest, local) <= 0) { if (mode === "text") console.log(`Ludea engine up to date (${local}).`); }
    else {
    const log = (await get(RAW + "CHANGELOG.md")) || "";
    const news = [], fixes = [];
    for (const sec of log.split(/^## /m).slice(1)) {
      const v = sec.split("\n")[0].trim(); if (cmp(v, local) <= 0) continue;
      let bucket = fixes;
      for (const l of sec.split("\n").slice(1)) {
        if (/^### New/i.test(l)) bucket = news; else if (/^### /.test(l)) bucket = fixes;
        else if (/^- /.test(l)) bucket.push(l.slice(2));
      }
    }
    const res = { local, latest, news, fixes };
    if (mode === "json") { console.log(JSON.stringify(res, null, 1)); return; }
    if (mode === "text") {
      console.log(`A newer Ludea engine is available: ${latest} (this game: ${local}).`);
      if (news.length) { console.log("New capabilities you can switch on:"); news.forEach((n) => console.log("  - " + n)); }
      if (fixes.length) { console.log("Better automatically:"); fixes.forEach((n) => console.log("  - " + n)); }
    } else
    out.push([
      `[Ludea] A newer version of the Ludea engine is available for this game: ${latest} (this game runs ${local}).`,
      news.length ? "New capabilities the game could switch on:\n" + news.slice(0, 8).map((n) => "- " + n).join("\n") : "",
      fixes.length ? "Better automatically:\n" + fixes.slice(0, 8).map((n) => "- " + n).join("\n") : "",
      "At a natural moment (not in the middle of a task, never during a feedback session), tell the creator in ONE or two plain sentences, in their language, what it brings for THEIR game (the fixes they'd notice, and the 1-2 new capabilities that fit it), and offer to update it (/update). Do not update without their yes.",
    ].filter(Boolean).join("\n"));
    }
    await publishedStatus(slug);
    if (out.length) console.log(out.join("\n\n"));
  } catch (e) { /* never block a session */ }
})();
