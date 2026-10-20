#!/usr/bin/env node
/*
 * public-url — the game's public address, and the README's « Play » link checked against it.
 * No network: the address is derived from the git remote (ludea-ai/<repo> → https://ludea.ai/<repo>/,
 * <owner>/<repo> → https://<owner>.github.io/<repo>/, <owner>/<owner>.github.io → https://<owner>.github.io/).
 *
 *   node .claude/skills/_shared/public-url.cjs                  # prints the address
 *   node .claude/skills/_shared/public-url.cjs --readme         # exit 1 if the README's play link points elsewhere
 *   node .claude/skills/_shared/public-url.cjs --readme --fix   # rewrites that link to the address
 *   … --url https://example.org/my-game/                        # a custom domain the remote can't tell
 *
 * The play link = the first Markdown link on a line starting with « ▶ », else the first link whose
 * text starts with Play / Jouer. A game that moved (published under ludea.ai then back to its
 * creator, a renamed repo) kept a link that answered 404 (game-engine#19). Used by share-preview,
 * publish-check, update and release-deploy. The template (ludea-ai/game-engine) publishes nothing:
 * its README links to the showcase, so it is not checked.
 */
"use strict";
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process");

function remoteOf(root) {
  let remote = "";
  try { remote = cp.execSync("git remote get-url origin", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) {}
  const m = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/) || remote.match(/\/git\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

// The game's public address, or null when the remote can't tell (pass --url).
function publicUrl(root, override) {
  if (override) return override.replace(/\/?$/, "/");
  const r = remoteOf(root);
  if (!r) return null;
  if (r.owner.toLowerCase() === "ludea-ai") return `https://ludea.ai/${r.repo}/`;
  if (r.repo.toLowerCase() === `${r.owner.toLowerCase()}.github.io`) return `https://${r.repo.toLowerCase()}/`;
  return `https://${r.owner.toLowerCase()}.github.io/${r.repo}/`;
}

const isTemplate = (root) => { const r = remoteOf(root); return !!r && r.owner.toLowerCase() === "ludea-ai" && r.repo === "game-engine"; };

// { text, url, line } of the README's play link, or null.
function playLink(readme) {
  const links = [];
  readme.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) links.push({ text: m[1].replace(/[*_]/g, "").trim(), url: m[2], line: i + 1, play: /^\s*▶/.test(l) });
  });
  return links.find((k) => k.play) || links.find((k) => /^(play|jouer)\b/i.test(k.text)) || null;
}

const norm = (u) => { try { const x = new URL(u); return (x.host.toLowerCase() + x.pathname.replace(/\/?$/, "/")); } catch (e) { return u; } };
const sameUrl = (a, b) => norm(a) === norm(b);

// { ok, url, link, reason } — ok:true when there is nothing to fix.
function checkReadme(root, override) {
  const url = publicUrl(root, override);
  if (isTemplate(root) && !override) return { ok: true, url, reason: "template: publishes nothing, its README links to the showcase" };
  const f = path.join(root, "README.md");
  if (!fs.existsSync(f)) return { ok: true, url, reason: "no README.md" };
  const link = playLink(fs.readFileSync(f, "utf8"));
  if (!link) return { ok: true, url, reason: "no play link in README.md" };
  if (!url) return { ok: true, url, link, reason: "address unknown (no GitHub remote) — pass --url" };
  return { ok: sameUrl(link.url, url), url, link };
}

function fixReadme(root, override) {
  const c = checkReadme(root, override);
  if (c.ok || !c.link) return c;
  const f = path.join(root, "README.md");
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines[c.link.line - 1] = lines[c.link.line - 1].split(`(${c.link.url})`).join(`(${c.url})`);
  fs.writeFileSync(f, lines.join("\n"));
  return Object.assign(c, { fixed: true });
}

module.exports = { publicUrl, playLink, checkReadme, fixReadme, isTemplate };

if (require.main === module) {
  const argv = process.argv.slice(2), i = argv.indexOf("--url"), override = i >= 0 ? argv[i + 1] : undefined;
  const root = process.cwd();
  if (!argv.includes("--readme")) {
    const u = publicUrl(root, override);
    if (!u) { console.error("public-url: cannot tell the game's public address from the git remote — pass --url"); process.exit(2); }
    console.log(u); process.exit(0);
  }
  const c = argv.includes("--fix") ? fixReadme(root, override) : checkReadme(root, override);
  if (c.fixed) console.log(`README play link fixed: ${c.link.url} → ${c.url} (line ${c.link.line})`);
  else if (c.ok) console.log(`README play link OK${c.reason ? ` (${c.reason})` : ` (${c.url})`}`);
  else console.log(`README play link points to ${c.link.url} (line ${c.link.line}), the game is served at ${c.url} — run with --fix`);
  process.exit(c.ok || c.fixed ? 0 : 1);
}
