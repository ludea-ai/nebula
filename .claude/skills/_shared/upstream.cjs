#!/usr/bin/env node
// upstream — the link between a game and the Ludea engine it was built from.
//
// The ENGINE LAYER (engine.js, engine.css, ENGINE.md, .claude/skills/**) is identical in every
// repo. Its fingerprint (git blob hash of every file) is stored in
// .claude/skills/_shared/engine-manifest.json, rewritten by every sync. So any repo can tell:
//   - which engine it runs (manifest.version),
//   - what IT changed in the engine layer since (drift = files whose hash differs),
//   - the exact patch of that change (base blobs fetched from the public Ludea repos).
// Used by the report-upstream / idea / publish skills (games → Ludea) and by
// sync-engine (refuses to overwrite unreported drift).
//
//   node .claude/skills/_shared/upstream.cjs context [--offline]  # JSON: repo, game, engine, drift
//   node .claude/skills/_shared/upstream.cjs drift [--json] [--upstream] [--unreported]  # engine-layer files changed here
//                                         # (--upstream: minus what Ludea already has, and files that
//                                         #  are an older/newer Ludea version → "behind"; exit 2 = drift)
//   node .claude/skills/_shared/upstream.cjs patch [out.diff] [--files a,b]  # unified diff of that drift
//                                         (one issue = one coherent change: limit it to its files)
//   node .claude/skills/_shared/upstream.cjs write-manifest [--from <ref>]
//                                         # after a sync / an engine commit upstream; --from <first commit>
//                                         # bootstraps a game created before the manifest existed
//   node .claude/skills/_shared/upstream.cjs author                # the creator, from the repo's GitHub data (for meta.author)
//   node .claude/skills/_shared/upstream.cjs url --repo o/r --title T --body-file F
//                                                                  # prefilled "new issue" link (fallback)
//   node .claude/skills/_shared/upstream.cjs log --add kind:key --issue URL [--files a,b]
//                                         # remember what was reported; with --files, `drift --unreported`
//                                         # (and sync-engine) stop counting those exact contents
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

const ROOT = path.resolve(__dirname, "../../..");
const MANIFEST = ".claude/skills/_shared/engine-manifest.json";
const LOG = ".claude/upstream-log.json";               // game-side, NOT engine layer (never synced)
const LAYER = ["engine.js", "engine.css", "ENGINE.md", ".claude/skills"];
const UPSTREAM_REPOS = ["ludea-ai/game-engine", "ludea-ai/nebula"]; // where base blobs live
const ENGINE_REPO = "ludea-ai/game-engine";            // issues inbox: bugs / contributions / ideas
const CATALOGUE_REPO = "ludea-ai/ludea-ai.github.io";  // publication requests
const UPSTREAM_SELF = ["ludea-ai/nebula", "ludea-ai/game-engine"]; // engine is developed here: no reports

const sh = (cmd, opts = {}) => cp.execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
const tryS = (cmd, opts) => { try { return sh(cmd, opts); } catch (e) { return ""; } };

function layerFiles() {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) { for (const f of fs.readdirSync(abs).sort()) walk(path.join(rel, f)); return; }
    if (rel === MANIFEST || /(^|\/)(node_modules|__pycache__)\//.test(rel) || /\.pyc$/.test(rel)) return;
    out.push(rel.split(path.sep).join("/"));
  };
  LAYER.forEach(walk);
  return out;
}
const blob = (rel) => sh(`git hash-object ${JSON.stringify(rel)}`);
function readManifest() {
  const p = path.join(ROOT, MANIFEST);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

function repoSlug() {
  const u = tryS("git remote get-url origin");
  const m = u.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?\/?$/) || u.match(/\/git\/([^/]+\/[^/.]+?)(?:\.git)?\/?$/);
  return m ? m[1] : null;
}

function drift(opts = {}) {
  const man = readManifest();
  if (!man) return { manifest: null, changed: [], added: [], removed: [], note: "no engine-manifest.json — engine older than the upstream mechanism; diff against ludea-ai/game-engine main instead" };
  const now = {}; layerFiles().forEach((f) => (now[f] = blob(f)));
  const changed = [], added = [], removed = [];
  for (const f of Object.keys(now)) if (!(f in man.files)) added.push(f); else if (man.files[f] !== now[f]) changed.push(f);
  for (const f of Object.keys(man.files)) if (!(f in now)) removed.push(f);
  let alreadyUpstream = [], behind = [];
  if (opts.upstream) { // --upstream: drop what the Ludea repos already have (network)
    const up = upstreamBlobs(); const keep = (f) => !up.has(f + " " + now[f]);
    alreadyUpstream = [...changed, ...added].filter((f) => !keep(f));
    changed.splice(0, changed.length, ...changed.filter(keep)); added.splice(0, added.length, ...added.filter(keep));
    // behind: content that IS a Ludea version of that file (copied from an older/newer engine), just
    // not the current one — an engine update is available, not a local change to report.
    const hist = (f) => upstreamHistory(f).has(now[f]);
    behind = [...changed, ...added].filter(hist);
    changed.splice(0, changed.length, ...changed.filter((f) => !hist(f))); added.splice(0, added.length, ...added.filter((f) => !hist(f)));
  }
  let reported = [];
  if (opts.unreported) { // --unreported: drop files whose CURRENT content was already reported (log --files)
    const rep = {}; readLog().forEach((e) => Object.assign(rep, e.files || {}));
    const keep = (f) => rep[f] !== (now[f] || "deleted");
    reported = [...changed, ...added, ...removed].filter((f) => !keep(f));
    [changed, added, removed].forEach((a) => a.splice(0, a.length, ...a.filter(keep)));
  }
  return { manifest: { version: man.version, from: man.from }, changed, added, removed, alreadyUpstream, behind, reported };
}

function gameInfo() {
  const p = path.join(ROOT, "game.config.js");
  if (!fs.existsSync(p)) return null;
  try {
    const sandbox = { window: {} }; const vm = require("vm");
    vm.runInNewContext(fs.readFileSync(p, "utf8"), sandbox, { timeout: 2000 });
    const G = sandbox.window.GAME || sandbox.GAME || {}; const M = G.meta || {};
    return { title: M.title, tagline: M.tagline || M.subtitle, audience: M.audience, lang: M.lang, version: G.assetVersion || M.assetVersion };
  } catch (e) { return { error: String(e.message || e) }; }
}

function context() {
  const slug = repoSlug();
  const d = drift({ upstream: !process.argv.includes("--offline") });
  const owner = slug ? slug.split("/")[0] : null;
  return {
    repo: slug,
    isUpstream: !!slug && UPSTREAM_SELF.includes(slug),
    pagesUrl: slug ? (owner === "ludea-ai" ? `https://ludea.ai/${slug.split("/")[1]}/` : `https://${owner.toLowerCase()}.github.io/${slug.split("/")[1]}/`) : null,
    head: tryS("git rev-parse HEAD"),
    game: gameInfo(),
    engine: d.manifest,
    drift: { changed: d.changed, added: d.added, removed: d.removed, alreadyUpstream: d.alreadyUpstream, behind: d.behind, note: d.note },
    // same upstream filter as `drift`: a file can't be both "already upstream" and "unreported"
    driftUnreported: (() => { const u = drift({ upstream: !process.argv.includes("--offline"), unreported: true }); return [...u.changed, ...u.added, ...u.removed]; })(),
    inbox: { engine: ENGINE_REPO, catalogue: CATALOGUE_REPO },
    reported: readLog(),
  };
}

// Base content of a drifted file = the blob recorded in the manifest, fetched lazily from
// blob-less clones of the public upstream repos (cached in the OS temp dir).
const fetched = {};
function cacheDir(r) {
  const dir = path.join(os.tmpdir(), "ludea-upstream-cache", r.replace("/", "__"));
  if (!fetched[r]) {
    if (!fs.existsSync(path.join(dir, "HEAD")))
      tryS(`git clone -q --bare --filter=blob:none https://github.com/${r}.git ${dir}`, { timeout: 180000 });
    else tryS(`git -C ${dir} fetch -q origin "+refs/heads/*:refs/heads/*"`, { timeout: 120000 });
    fetched[r] = true;
  }
  return dir;
}
// Blobs of the engine layer on the upstream repos' main branch: a local change that is already
// there (came with a partial sync) is not a contribution.
function upstreamBlobs() {
  const set = new Set();
  for (const r of UPSTREAM_REPOS) tryS(`git -C ${cacheDir(r)} ls-tree -r main -- ${LAYER.join(" ")}`)
    .split("\n").filter(Boolean).forEach((l) => set.add(l.split("\t")[1] + " " + l.split(" ")[2].split("\t")[0]));
  return set;
}
// Every blob a file ever had on the upstream repos (any branch): from the commits' tree diffs, so
// the blob-less cache doesn't download any content.
const histCache = {};
function upstreamHistory(f) {
  if (!histCache[f]) {
    const set = new Set();
    for (const r of UPSTREAM_REPOS) tryS(`git -C ${cacheDir(r)} log --all --raw --no-abbrev --format= -- ${JSON.stringify(f)}`)
      .split("\n").forEach((l) => { const m = l.match(/^:\S+ \S+ ([0-9a-f]{40}) ([0-9a-f]{40})/); if (m) { set.add(m[1]); set.add(m[2]); } });
    histCache[f] = set;
  }
  return histCache[f];
}
function baseContent(sha) {
  for (const r of UPSTREAM_REPOS) {
    const dir = cacheDir(r);
    try { return cp.execSync(`git -C ${dir} cat-file -p ${sha}`, { encoding: "buffer", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); }
    catch (e) { /* not in this repo — try the next */ }
  }
  return null;
}

function patch(out, only) {
  const man = readManifest(); const d = drift({ upstream: true });
  if (!man) throw new Error(d.note);
  const files = [...d.changed, ...d.added, ...d.removed].filter((f) => !only || only.includes(f));
  if (!files.length) { console.error("No engine-layer drift."); return ""; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ludea-patch-"));
  let diff = "";
  for (const f of files) {
    let A = "/dev/null", B = "/dev/null";
    if (man.files[f]) {
      const c = baseContent(man.files[f]);
      if (!c) { diff += `# ${f}: base ${man.files[f]} not found upstream — changed file listed only\n`; continue; }
      fs.mkdirSync(path.dirname(path.join(tmp, "a", f)), { recursive: true }); fs.writeFileSync(path.join(tmp, "a", f), c); A = "a/" + f;
    }
    if (fs.existsSync(path.join(ROOT, f))) { fs.mkdirSync(path.dirname(path.join(tmp, "b", f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(tmp, "b", f)); B = "b/" + f; }
    try { cp.execSync(`git diff --no-index --no-color --no-prefix -- ${JSON.stringify(A)} ${JSON.stringify(B)}`, { cwd: tmp, encoding: "utf8", maxBuffer: 64 << 20 }); }
    catch (e) { diff += (e.stdout || "").replace(/^diff --git .*$/m, `diff --git a/${f} b/${f}`); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (out) fs.writeFileSync(out, diff);
  return diff;
}

function writeManifest(fromRef) {
  const files = {};
  if (fromRef) { // bootstrap a game created before the manifest existed: its first commit = the template copy
    sh(`git ls-tree -r ${fromRef} -- ${LAYER.join(" ")}`).split("\n").filter(Boolean).forEach((l) => {
      const [meta, f] = l.split("\t"); if (f !== MANIFEST) files[f] = meta.split(" ")[2]; });
  } else layerFiles().forEach((f) => (files[f] = blob(f)));
  const prev = readManifest();
  const same = prev && JSON.stringify(prev.files) === JSON.stringify(files);
  const today = new Date().toISOString().slice(0, 10);
  let version = prev && prev.version;
  if (fromRef) version = `${tryS(`git log -1 --format=%cs ${fromRef}`) || "0000-00-00"}.0`; // bootstrapped: dated by that commit
  else if (!same) { const n = prev && prev.version && prev.version.startsWith(today) ? +prev.version.split(".").pop() + 1 : 1; version = `${today}.${n}`; }
  const man = { version, from: same ? prev.from : (repoSlug() || "?") + "@" + (tryS(`git rev-parse --short ${fromRef || "HEAD"}`) || "?"), files };
  fs.writeFileSync(path.join(ROOT, MANIFEST), JSON.stringify(man, null, 1) + "\n");
  console.log(same ? `engine-manifest unchanged (${version})` : `engine-manifest → ${version} (${Object.keys(files).length} files)`);
}

// Author of the game, from what the repo itself says (sessions can only call repo-scoped GitHub
// endpoints): owner + human contributors (bots / Claude left out), real names taken from their
// commits. Without gh, falls back to git log (+ GitHub noreply e-mails, which carry the login).
const BOT = /\[bot\]$|^(claude|github-actions|dependabot|actions-user)$/i;
function author() {
  const slug = repoSlug(); const owner = slug ? slug.split("/")[0] : null;
  const names = {}; // login → name from commits
  const ghJson = (p) => { const t = tryS(`gh api ${p}`); try { return JSON.parse(t); } catch (e) { return null; } };
  const repo = slug && ghJson(`repos/${slug}`);
  const commits = slug && ghJson(`repos/${slug}/commits?per_page=100`);
  (Array.isArray(commits) ? commits : []).forEach((c) => { if (c.author && c.author.login && !names[c.author.login]) names[c.author.login] = c.commit.author.name; });
  tryS("git log --format=%an%x09%ae").split("\n").filter(Boolean).forEach((l) => {
    const [n, e] = l.split("\t"); const m = (e || "").match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/);
    if (m && !names[m[1]]) names[m[1]] = n;
  });
  let contrib = ghJson(`repos/${slug}/contributors`);
  contrib = (Array.isArray(contrib) ? contrib : Object.keys(names).map((login) => ({ login, type: "User" })))
    .filter((c) => c.type !== "Bot" && !BOT.test(c.login))
    .map((c) => ({ login: c.login, name: names[c.login] || null, url: `https://github.com/${c.login}` }));
  const ownerIsOrg = repo && repo.owner && repo.owner.type === "Organization";
  const main = ownerIsOrg ? (contrib[0] || { login: owner }) : { login: owner };
  return {
    name: names[main.login] || main.login, github: main.login, url: `https://github.com/${main.login}`,
    owner: owner, ownerIsOrg: !!ownerIsOrg,
    contributors: contrib,
    note: "proposal from the repo's GitHub data — confirm with the creator before publishing",
  };
}

function readLog() { const p = path.join(ROOT, LOG); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : []; }
function addLog(entry) {
  const log = readLog(); log.push({ at: new Date().toISOString(), ...entry });
  fs.mkdirSync(path.dirname(path.join(ROOT, LOG)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, LOG), JSON.stringify(log, null, 1) + "\n");
}

// Prefilled issue link: works for ANY GitHub user, no API rights needed (the person clicks
// "Submit"). GitHub caps URLs around 8 KB → the body is cut with a pointer to the full text.
function issueUrl(repo, title, body) {
  const base = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=`;
  let b = body, url = base + encodeURIComponent(b);
  if (url.length > 7800) {
    const tail = "\n\n…(cut to fit a link — full text in the reporter's repository)";
    while (url.length > 7800 && b.length > 200) { b = b.slice(0, Math.floor(b.length * 0.9)); url = base + encodeURIComponent(b + tail); }
  }
  return url;
}

// ---- CLI
const [cmd, ...rest] = process.argv.slice(2);
const arg = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
try {
  if (cmd === "context") console.log(JSON.stringify(context(), null, 1));
  else if (cmd === "drift") {
    const d = drift({ upstream: rest.includes("--upstream"), unreported: rest.includes("--unreported") });
    if (rest.includes("--json")) console.log(JSON.stringify(d, null, 1));
    else if (!d.manifest) console.log(d.note);
    else { const n = d.changed.length + d.added.length + d.removed.length;
      console.log(n ? `Engine layer differs from engine ${d.manifest.version}:` : `Engine layer identical to engine ${d.manifest.version}.`);
      d.changed.forEach((f) => console.log("  M " + f)); d.added.forEach((f) => console.log("  A " + f)); d.removed.forEach((f) => console.log("  D " + f));
      if (d.behind && d.behind.length) console.log(`Behind Ludea (an engine update is available — run sync-engine / update; nothing to report):\n` + d.behind.map((f) => "  < " + f).join("\n"));
      process.exitCode = n ? 2 : 0; }
  }
  else if (cmd === "patch") { const out = rest[0] && !rest[0].startsWith("--") ? rest[0] : undefined; const fl = arg("--files"); const d = patch(out, fl && fl.split(",")); if (!out) process.stdout.write(d); else console.log(`patch → ${out} (${d.length} bytes)`); }
  else if (cmd === "author") console.log(JSON.stringify(author(), null, 1));
  else if (cmd === "write-manifest") writeManifest(arg("--from"));
  else if (cmd === "url") {
    const repo = arg("--repo") || ENGINE_REPO, title = arg("--title"), bf = arg("--body-file");
    if (!title || !bf) throw new Error("usage: url --repo owner/repo --title T --body-file F");
    console.log(issueUrl(repo, title, fs.readFileSync(bf, "utf8")));
  }
  else if (cmd === "log") {
    const a = arg("--add");
    if (a) {
      const [kind, ...k] = a.split(":"); const fl = arg("--files"); const files = {};
      if (fl) fl.split(",").forEach((f) => (files[f] = fs.existsSync(path.join(ROOT, f)) ? blob(f) : "deleted"));
      addLog({ kind, key: k.join(":"), issue: arg("--issue") || null, ...(fl ? { files } : {}) });
      console.log(`logged ${kind}: ${k.join(":")}${fl ? ` (${Object.keys(files).length} file(s))` : ""}`);
    } else console.log(JSON.stringify(readLog(), null, 1));
  }
  else { console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1).filter((l, i, a) => i < a.findIndex((x) => !x.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exitCode = cmd ? 1 : 0; }
} catch (e) { console.error("upstream: " + (e.message || e)); process.exitCode = 1; }
