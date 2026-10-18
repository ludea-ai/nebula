#!/usr/bin/env node
// publish-check — is a game ready (and safe) for the Ludea catalogue?
// Runs on THIS repo, or on any game folder (the catalogue reviewer points it at a clone of a
// submitted game, using its OWN trusted copy of this script — never the submitted one).
//
//   node .claude/skills/_shared/publish-check.cjs [gameDir] [--json] [--no-run] [--shots DIR]
//
// Static part: catalogue fields (title, tagline, audience age, language + translation, app
// icons, README, credits), forbidden/risky code in the GAME files (external links, network
// calls, trackers, forms, camera/micro/location, iframes…), engine layer changed but not reported.
// Runtime part (Chromium): loads the game, starts it, plays a few seconds and records every
// request to ANOTHER origin (must be none) + page errors; screenshots home + world.
// Exit 0 = ready, 1 = blocking problems, 2 = warnings only.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), vm = require("vm"), net = require("net");

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const DIR = path.resolve(argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--shots") || path.resolve(__dirname, "../../.."));
const rd = (f) => { try { return fs.readFileSync(path.join(DIR, f), "utf8"); } catch (e) { return null; } };
const exists = (f) => fs.existsSync(path.join(DIR, f));

const blockers = [], warnings = [], info = {};
const B = (m) => blockers.push(m), W = (m) => warnings.push(m);

// ---------- 1. Catalogue fields
let G = null;
const cfg = rd("game.config.js");
if (!cfg) B("game.config.js missing — not a Ludea engine game");
else {
  try { const sb = { window: {} }; vm.runInNewContext(cfg, sb, { timeout: 2000 }); G = sb.window.GAME || sb.GAME; }
  catch (e) { B("game.config.js does not evaluate: " + e.message); }
}
const M = (G && G.meta) || {};
info.title = M.title; info.tagline = M.tagline; info.lang = M.lang; info.audience = M.audience;
if (G) {
  if (!M.title) B("meta.title missing (the game's name)");
  if (!M.tagline) B("meta.tagline missing (one-line description shown in the catalogue)");
  const a = M.audience || {};
  if (typeof a.minAge !== "number") B("meta.audience.minAge missing — the catalogue needs the target age");
  else if (a.minAge < 3) W("meta.audience.minAge < 3 — the engine's games are designed for 5+");
  if (!a.notes) W("meta.audience.notes empty — describe the content level (e.g. 'gentle, no violence')");
  if (!M.lang) B("meta.lang missing (source language)");
  const au = M.author || {};
  info.author = au;
  if (!au.name) B("meta.author.name missing — how the creator is credited on the catalogue card");
  if (!au.github) W("meta.author.github missing — the creator's GitHub login (credit link)");
}
const i18n = rd("game.i18n.js");
if (!i18n) B("game.i18n.js missing — every Ludea game is bilingual French / English");
else {
  const empty = (i18n.match(/^\s*"(?:[^"\\]|\\.)+"\s*:\s*""\s*,?\s*$/gm) || []).length;
  if (empty) B(`game.i18n.js: ${empty} untranslated text(s) ("")`);
  const langs = [...i18n.matchAll(/GAME_I18N(?:\.|\[["'])([a-z]{2})["'\]]?\s*=/g)].map((m) => m[1]);
  info.translations = langs;
  const want = M.lang === "fr" ? "en" : "fr";
  if (G && !langs.includes(want)) W(`game.i18n.js: no "${want}" dictionary found — expected French + English`);
}
const man = rd("manifest.webmanifest");
if (!man) B("manifest.webmanifest missing (app install + icon)");
else {
  try {
    const mj = JSON.parse(man); const icons = mj.icons || [];
    if (!icons.some((i) => /512/.test(i.sizes || ""))) B("no 512×512 app icon in manifest.webmanifest");
    icons.forEach((i) => { if (!exists(i.src.replace(/^\.\//, ""))) B("app icon file missing: " + i.src); });
    info.icon = (icons.find((i) => /512/.test(i.sizes || "") && i.purpose !== "maskable") || icons[0] || {}).src;
  } catch (e) { B("manifest.webmanifest is not valid JSON"); }
}
if (!exists("README.md")) W("README.md missing");
if (!exists("assets/CREDITS.md")) W("assets/CREDITS.md missing — list the origin + licence of every asset");
else {
  const cr = rd("assets/CREDITS.md");
  if (/(unknown|inconnu|\?\?\?)/i.test(cr)) W("assets/CREDITS.md mentions an unknown origin/licence");
}
if (!exists("index.html")) B("index.html missing");

// ---------- 2. Risky content in the GAME files (the engine layer is reviewed upstream)
// The engine shell's own name field (#place-name-input: a name for the place, max 20 chars, kept on the
// device) is allowed: nothing leaves the device (the runtime check proves it).
const GAME_FILES = ["game.config.js", "game.i18n.js", "index.html", "style.css", "manifest.webmanifest"];
const ALLOW_HOST = /^(ludea\.ai|www\.ludea\.ai|github\.com|[a-z0-9-]+\.github\.io|www\.w3\.org)$/i;
const RISKY = [
  [/<iframe/i, "iframe (embeds another site)", B],
  [/<form\b|<textarea\b|contenteditable|<input\b(?![^>]*id="place-name-input")/i, "form / text input (children could type personal data)", B],
  [/google-analytics|googletagmanager|gtag\(|fbq\(|facebook\.net|tiktok|hotjar|segment\.(io|com)|mixpanel|plausible|matomo|doubleclick|adsbygoogle|adservice/i, "tracker / advertising code", B],
  [/getUserMedia|geolocation|navigator\.(mediaDevices|contacts|bluetooth|usb)|Notification\.requestPermission/i, "camera / micro / location / notification access", B],
  [/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/i, "dynamic code (eval / new Function / document.write)", B],
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/i, "network call from game files", B],
  [/document\.cookie/i, "cookies", B],
  [/window\.open\s*\(|target\s*=\s*["']_blank|mailto:|tel:|sms:/i, "opens another site / app (links out of the game)", W],
  [/<script[^>]+src\s*=\s*["']https?:/i, "script loaded from another site", B],
];
const found = [];
for (const f of GAME_FILES) {
  const t = rd(f); if (!t) continue;
  for (const [re, what, sev] of RISKY) if (re.test(t)) { sev(`${f}: ${what}`); found.push(f + ": " + what); }
  for (const m of t.matchAll(/https?:\/\/([a-z0-9.-]+)[^\s"'<>)]*/gi)) {
    if (!ALLOW_HOST.test(m[1])) W(`${f}: external address ${m[0].slice(0, 80)}`);
  }
}
// any .js outside the engine layer + config/i18n = extra code to review by hand
const extraJs = [];
(function walk(rel) {
  const abs = path.join(DIR, rel);
  for (const f of fs.existsSync(abs) ? fs.readdirSync(abs) : []) {
    const r = path.join(rel, f); if (/^(\.git|node_modules|\.claude|tools|vendor)$/.test(f) && !rel) continue;
    if (fs.statSync(path.join(DIR, r)).isDirectory()) walk(r);
    else if (/\.(m?js|cjs|wasm)$/.test(f) && !["engine.js", "game.config.js", "game.i18n.js"].includes(r)) extraJs.push(r);
  }
})("");
if (extraJs.length) W("extra code shipped with the game (review by hand): " + extraJs.join(", "));
const idx = rd("index.html") || "";
const scripts = [...idx.matchAll(/<script[^>]*src\s*=\s*["']([^"'?]+)/gi)].map((m) => m[1]);
const okScripts = ["vendor/phaser.min.js", "game.config.js", "game.i18n.js", "engine.js"];
scripts.filter((s) => !okScripts.includes(s.replace(/^\.\//, ""))).forEach((s) => W("index.html loads an unexpected script: " + s));
if (/<script(?![^>]*src)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(idx)) info.inlineScript = true;

// ---------- 3. Engine layer: changed but not reported upstream?
const up = path.join(DIR, ".claude/skills/_shared/upstream.cjs");
if (fs.existsSync(path.join(DIR, ".claude/skills/_shared/engine-manifest.json"))) {
  try {
    const own = path.join(__dirname, "upstream.cjs"); // trusted copy, run against DIR via cwd-less ROOT? → run the target's only if it is ours
    const out = cp.execSync(`node ${JSON.stringify(fs.existsSync(up) && DIR === path.resolve(__dirname, "../../..") ? up : own)} drift --json`, { cwd: DIR, encoding: "utf8" });
    const d = JSON.parse(out); const n = d.changed.length + d.added.length + d.removed.length;
    info.engine = d.manifest && d.manifest.version;
    if (n && DIR === path.resolve(__dirname, "../../..")) W(`engine layer changed in ${n} file(s) — run report-upstream so Ludea gets it (and the next sync doesn't overwrite it)`);
  } catch (e) { /* drift exit 2 is fine */ }
}

// ---------- 4. Runtime: no request leaves the game's origin, no page error
async function runtime() {
  if (flag("--no-run")) return;
  let pw = null;
  for (const c of ["playwright", "/opt/node22/lib/node_modules/playwright"]) { try { pw = require(c); break; } catch (e) {} }
  if (!pw) { W("Playwright not found — runtime check skipped"); return; }
  const port = await new Promise((r) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
  const srv = cp.spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: DIR, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await pw.chromium.launch({ executablePath: fs.existsSync("/opt/pw-browsers/chromium") ? undefined : undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const outside = new Set(), errors = [];
  page.on("request", (rq) => { const u = new URL(rq.url()); if (!/^(data|blob):/.test(rq.url()) && u.host !== `127.0.0.1:${port}`) outside.add(u.host + u.pathname.slice(0, 40)); });
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    const shots = opt("--shots"); if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, "home.png") }); }
    for (const sel of ["#btn-play", "#btn-continue", "#btn-new", ".home .btn-primary", "button.primary"]) {
      const b = await page.$(sel); if (b && await b.isVisible()) { await b.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(2500);
    const c = await page.$("canvas"); if (c) { const bb = await c.boundingBox(); for (let i = 0; i < 6; i++) { await page.mouse.click(bb.x + bb.width * (0.3 + 0.08 * i), bb.y + bb.height * (0.35 + 0.05 * i)); await page.waitForTimeout(600); } }
    if (shots) await page.screenshot({ path: path.join(shots, "world.png") });
  } catch (e) { B("the game did not load: " + e.message); }
  await browser.close(); srv.kill();
  info.outsideRequests = [...outside]; info.pageErrors = errors;
  if (outside.size) B("requests leave the game (must be none): " + [...outside].slice(0, 8).join(", "));
  if (errors.length) B(`${errors.length} page error(s): ` + errors.slice(0, 3).join(" | "));
}

runtime().then(() => {
  const res = { dir: DIR, ready: !blockers.length, blockers, warnings, info };
  if (flag("--json")) console.log(JSON.stringify(res, null, 1));
  else {
    console.log(`publish-check: ${info.title || "?"} (${DIR})`);
    console.log(blockers.length ? `\nBLOCKING (${blockers.length}):` : "\nNo blocking problem.");
    blockers.forEach((m) => console.log("  ✗ " + m));
    if (warnings.length) { console.log(`\nTo look at (${warnings.length}):`); warnings.forEach((m) => console.log("  ! " + m)); }
    console.log("\nInfo: " + JSON.stringify(info));
  }
  process.exitCode = blockers.length ? 1 : warnings.length ? 2 : 0;
});
