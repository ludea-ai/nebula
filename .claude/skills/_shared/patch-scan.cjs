#!/usr/bin/env node
/*
 * patch-scan — security alarms on a change to the engine layer, BEFORE anyone trusts it.
 * Used by Ludea's engine agent on every contribution patch from a game and on its own batch
 * diff, and by the catalogue review on a submitted game's engine-layer drift. It reads text only:
 * it never runs the code it scans.
 *
 *   node .claude/skills/_shared/patch-scan.cjs change.diff            # a unified diff (added lines are scanned)
 *   git diff main...HEAD | node .claude/skills/_shared/patch-scan.cjs -
 *   node .claude/skills/_shared/patch-scan.cjs --json change.diff
 *
 * Exit 0 = no alarm, 1 = alarms (each with file, line, rule). An alarm is not a verdict: a human
 * (the agent, then the owner) reads that line. A "block" alarm (credentials, hooks, workflows,
 * obfuscation) means: reject the change unless the owner explicitly accepts it.
 */
"use strict";
const fs = require("node:fs");
const argv = process.argv.slice(2);
const json = argv.includes("--json");
const src = argv.find((a) => !a.startsWith("--")) || "-";
const text = fs.readFileSync(src === "-" ? 0 : src, "utf8");

const RULES = [
  // [id, severity, test(line, file), what]
  ["network", "warn", (l) => /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.connection|\bimport\s*\(\s*["'`]https?:/i.test(l), "network call"],
  ["remote-script", "block", (l) => /<script[^>]+src\s*=\s*["']https?:|\bimportScripts\s*\(/i.test(l), "loads code from another site"],
  ["eval", "block", (l) => /\beval\s*[()]|\[\s*["'`]eval["'`]\s*\]|\bFunction\s*\(|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`]/.test(l), "runs code built from a string"],
  ["process", "warn", (l, f) => /\.(c?js|mjs)$/.test(f) && /child_process|\bexecSync\b|\bspawn(Sync)?\s*\(|\bexecFile(Sync)?\s*\(/.test(l) && !/^\.claude\/skills\/_shared\/(sync-engine\.sh|upstream\.cjs|publish-check\.cjs|playtest\.cjs|render-svg\.cjs|update-check\.cjs|prune-assets\.cjs|share-preview\.cjs)$/.test(f), "starts other programs"],
  ["secrets", "block", (l) => /GITHUB_TOKEN|GH_TOKEN|process\.env\.(?!UPSTREAM_ROOT|SYNC_ENGINE_|LUDEA_|OUT\b|REVEAL|STEPS|SEED|HTTPS?_PROXY)|\.git-credentials|\bgh\s+auth\b|\.ssh\/|id_rsa|\.netrc|ANTHROPIC|api[_-]?key|Authorization:\s*Bearer/i.test(l), "touches credentials or secrets"],
  ["shell-download", "block", (l, f) => /\.(sh|bash|ya?ml)$/.test(f) && /\b(curl|wget)\b[^|]*\|\s*(ba)?sh|\bnc\s+-|base64\s+-d/.test(l), "downloads and runs something"],
  ["hooks", "block", (l, f) => /(^|\/)\.claude\/settings(\.local)?\.json$/.test(f) || /"(SessionStart|PreToolUse|PostToolUse|UserPromptSubmit|Stop)"\s*:/.test(l), "Claude Code hooks / settings (code run automatically in every session)"],
  ["workflow", "block", (l, f) => /^\.github\/workflows\//.test(f), "CI workflow change"],
  ["obfuscation", "block", (l) => (l.length > 400 && (l.match(/ /g) || []).length / l.length < 0.04) || /(\\x[0-9a-f]{2}){6,}|(\\u[0-9a-f]{4}){6,}|atob\s*\(|String\.fromCharCode\s*\((\s*\d+\s*,){5,}/i.test(l) || /[A-Za-z0-9+/]{200,}={0,2}/.test(l), "minified, encoded or obfuscated code"],
  ["storage-out", "warn", (l) => /document\.cookie|indexedDB\.open|navigator\.(geolocation|mediaDevices|clipboard|share)\b|Notification\.requestPermission/.test(l), "cookies, device access or sharing"],
  ["external-url", "warn", (l) => { const m = l.match(/https?:\/\/([a-z0-9.-]+)/gi) || []; return m.some((u) => !/^https?:\/\/((www\.)?ludea\.ai|github\.com|docs\.github\.com|support\.github\.com|[a-z0-9-]+\.github\.io|www\.w3\.org|creativecommons\.org|cdn\.jsdelivr\.net|opengameart\.org|upload\.wikimedia\.org|example\.(com|org))/i.test(u)); }, "address of another site"],
];

const alarms = [];
let file = null, line = 0;
const scanLine = (l, f, n) => { for (const [id, sev, test, what] of RULES) if (test(l, f)) alarms.push({ file: f, line: n, rule: id, severity: sev, what, text: l.trim().slice(0, 160) }); };
const isDiff = /^(diff --git|--- |\+\+\+ )/m.test(text);
if (isDiff) {
  for (const raw of text.split("\n")) {
    let m;
    if ((m = raw.match(/^\+\+\+ (?:b\/)?(.+)$/))) { file = m[1].trim(); if (file === "/dev/null") file = null; continue; }
    if ((m = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/))) { line = +m[1]; continue; }
    if (!file) continue;
    if (raw.startsWith("+")) { scanLine(raw.slice(1), file, line); line++; }
    else if (!raw.startsWith("-")) line++;
  }
  // a file the diff touches whose very path is sensitive (even when only lines are removed)
  for (const m of text.matchAll(/^\+\+\+ (?:b\/)?(\.github\/workflows\/\S+|\.claude\/settings(?:\.local)?\.json)$/gm))
    if (!alarms.some((a) => a.file === m[1] && (a.rule === "workflow" || a.rule === "hooks"))) alarms.push({ file: m[1], line: 0, rule: m[1].startsWith(".github") ? "workflow" : "hooks", severity: "block", what: "sensitive file changed", text: "" });
} else {
  text.split("\n").forEach((l, i) => scanLine(l, src, i + 1));
}

if (json) console.log(JSON.stringify({ alarms, blocking: alarms.filter((a) => a.severity === "block").length }, null, 1));
else if (!alarms.length) console.log("patch-scan: no alarm");
else {
  console.log(`patch-scan: ${alarms.length} alarm(s), ${alarms.filter((a) => a.severity === "block").length} blocking`);
  for (const a of alarms) console.log(`  ${a.severity === "block" ? "✗" : "!"} ${a.file}:${a.line} [${a.rule}] ${a.what}${a.text ? "\n      " + a.text : ""}`);
}
process.exitCode = alarms.length ? 1 : 0;
