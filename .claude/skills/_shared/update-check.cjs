#!/usr/bin/env node
// update-check — is a newer Ludea engine available for this game?
// Compares this repo's engine version (engine-manifest.json) with the template's
// (ludea-ai/game-engine main, public), and lists what's new (CHANGELOG.md).
// Never fails and never blocks: no network / no manifest → prints nothing, exit 0.
//
//   node .claude/skills/_shared/update-check.cjs          # human-readable
//   node .claude/skills/_shared/update-check.cjs --hook   # SessionStart hook: a note for Claude, or nothing
//   node .claude/skills/_shared/update-check.cjs --json
//   node .claude/skills/_shared/update-check.cjs --install-hook  # add the SessionStart hook to .claude/settings.json (once)
"use strict";
const fs = require("fs"), path = require("path"), https = require("https"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "../../..");
const RAW = "https://raw.githubusercontent.com/ludea-ai/game-engine/main/.claude/skills/_shared/";
const mode = process.argv.includes("--hook") ? "hook" : process.argv.includes("--json") ? "json" : "text";

function get(url) {
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
    if (!local || !latest || cmp(latest, local) <= 0) { if (mode === "text") console.log(`Ludea engine up to date (${local}).`); return; }
    const log = (await get(RAW + "CHANGELOG.md")) || "";
    const news = [];
    for (const sec of log.split(/^## /m).slice(1)) {
      const v = sec.split("\n")[0].trim();
      if (cmp(v, local) > 0) news.push(...sec.split("\n").slice(1).filter((l) => /^- /.test(l)).map((l) => l.slice(2)));
    }
    const res = { local, latest, news };
    if (mode === "json") return console.log(JSON.stringify(res, null, 1));
    if (mode === "text") { console.log(`A newer Ludea engine is available: ${latest} (this game: ${local}).`); news.forEach((n) => console.log("  - " + n)); return; }
    console.log([
      `[Ludea] A newer version of the Ludea engine is available for this game: ${latest} (this game runs ${local}).`,
      news.length ? "What's new:\n" + news.slice(0, 12).map((n) => "- " + n).join("\n") : "",
      "At a natural moment (not in the middle of a task, never during a feedback session), tell the creator in ONE plain sentence, in their language, what it brings for their game, and offer to update it (skill ludea-update). Do not update without their yes.",
    ].filter(Boolean).join("\n"));
  } catch (e) { /* never block a session */ }
})();
