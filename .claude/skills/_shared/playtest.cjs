#!/usr/bin/env node
/*
 * Headless test/visualisation harness (Playwright) for the engine.
 * Starts a game, takes zone screenshots, runs checks, and REPORTS page
 * errors (pageerror / console.error). Exit code != 0 if a page error occurs
 * (useful in CI / for skills).
 *
 * Portable: Node + Playwright + a static server already running (see serve.sh).
 * Reused by the `test-debug`, `map-verify` and `ios-pwa-check` skills.
 *
 * Examples:
 *   node playtest.cjs --shots "spawn:560:860:0.9,pen:1210:300:0.8"
 *   node playtest.cjs --walk --out /tmp/engine-shots
 *   node playtest.cjs --eval "state.coins"
 *   node playtest.cjs --probe ./my-asserts.cjs      # module exporting async (page)=>obj
 *   node playtest.cjs --engine webkit --device "iPhone 13" --probe ./touch.cjs
 *
 * Options:
 *   --port N        static server port (def. 8099)
 *   --out DIR       screenshots dir (def. /tmp/engine-shots)
 *   --shots LIST    "name:x:y:zoom,..." screenshots centred on world points
 *   --walk          walkability checks of the trail loop (openings + logs)
 *   --eval EXPR     evaluate an expression in the page and print it
 *   --probe FILE    .cjs module exporting async (page)=>result (free assertions)
 *   --viewport WxH  window size (def. 900x900; ignored when --device is set)
 *   --engine NAME   browser engine: chromium (def.) | webkit (real Safari engine) | firefox
 *   --device NAME   emulate a Playwright device (touch + UA), e.g. "iPhone 13"
 *   --url URL       accepted as --port (http://localhost:N/)
 *   --help, -h      print this usage and exit
 *
 * iOS / Safari note: several touch bugs (implicit pointer-capture freeze, blue
 * text-selection) do NOT reproduce in headless Chromium. Use `--engine webkit`
 * (optionally with `--device "iPhone 13"`) to drive the actual Safari engine.
 * Install it once: `npx playwright install webkit` (+ `... install-deps webkit`).
 */
function loadPlaywright() {
  for (const c of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
    try { return require(c); } catch (_) { /* next */ }
  }
  throw new Error("Playwright not found. Install it (npm i -g playwright) or adjust the path.");
}

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const has = (name) => process.argv.includes(name);
// --help / -h: print the usage block of this file's header comment (exit 0).
if (has("--help") || has("-h")) {
  const src = require("node:fs").readFileSync(__filename, "utf8"), m = src.match(/\/\*([\s\S]*?)\*\//);
  console.log(m ? m[1].split("\n").map((l) => l.replace(/^ \* ?/, "")).join("\n").trim() : "see the header of playtest.cjs");
  process.exit(0);
}
// Refuse unknown flags: a silently ignored option (e.g. --url) once made every "other game" test
// run against the default port's game instead. --url http://localhost:N/ is accepted as --port N.
const KNOWN = ["--device", "--engine", "--eval", "--out", "--port", "--probe", "--shots", "--viewport", "--walk", "--url"];
process.argv.slice(2).forEach((a) => { if (a.startsWith("--") && !KNOWN.includes(a)) { console.error(`PLAYTEST FAILED: unknown option ${a} (known: ${KNOWN.join(" ")})`); process.exit(2); } });
{ const u = arg("--url", ""); if (u) { const m = u.match(/:(\d+)/); if (!m) { console.error("PLAYTEST FAILED: --url needs a port, e.g. http://localhost:8100/"); process.exit(2); } const i = process.argv.indexOf("--port"); if (i >= 0) process.argv[i + 1] = m[1]; else process.argv.push("--port", m[1]); } }

(async () => {
  const pw = loadPlaywright();
  const port = arg("--port", "8099");
  const out = arg("--out", "/tmp/engine-shots");
  const [vw, vh] = arg("--viewport", "900x900").split("x").map(Number);
  require("node:fs").mkdirSync(out, { recursive: true });

  // Browser engine: chromium (default) | webkit (Safari engine) | firefox.
  const engineName = (arg("--engine", "chromium") || "chromium").toLowerCase();
  const engine = pw[engineName];
  if (!engine) throw new Error(`Unknown --engine "${engineName}" (use chromium | webkit | firefox).`);
  const deviceName = arg("--device", "");
  const device = deviceName ? pw.devices[deviceName] : null;
  if (deviceName && !device) throw new Error(`Unknown --device "${deviceName}" (see Playwright's device registry).`);

  // In sandboxed environments outbound HTTPS goes through a proxy (HTTPS_PROXY) that
  // re-terminates TLS. Chromium takes it as a CLI flag; webkit/firefox via launch.proxy.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const launchOpts = {};
  if (engineName === "chromium") {
    launchOpts.args = ["--ignore-certificate-errors"];
    if (proxy) launchOpts.args.push("--proxy-server=" + proxy, "--proxy-bypass-list=127.0.0.1;localhost;[::1]");
  } else if (proxy) {
    launchOpts.proxy = { server: proxy, bypass: "127.0.0.1,localhost" };
  }

  let browser;
  try {
    browser = await engine.launch(launchOpts);
  } catch (e) {
    // Most common cause for webkit/firefox: the browser binary isn't installed.
    if (engineName !== "chromium") {
      console.error(
        `PLAYTEST: could not launch ${engineName}. Install it once per machine/container, then retry:\n` +
        `  npx playwright install ${engineName}\n` +
        `  npx playwright install-deps ${engineName}    # system libraries (Linux)\n` +
        `  (no npx playwright? the global CLI: node /opt/node22/lib/node_modules/playwright/cli.js install ${engineName})\n` +
        `Original error: ${e.message}`);
      process.exit(3);
    }
    throw e;
  }

  const ctxOpts = { ignoreHTTPSErrors: true };
  if (device) Object.assign(ctxOpts, device);            // viewport + UA + touch from the device
  else ctxOpts.viewport = { width: vw, height: vh };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push("console: " + m.text()); });

  const url = `http://localhost:${port}/index.html?cb=${Date.now()}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // --- Start a new game (home -> creation -> game) ---
  await page.fill("#place-name-input", "Test");
  await page.click("#btn-start");
  await page.waitForTimeout(400);
  await page.click("#btn-create-ok");
  await page.waitForFunction(
    () => typeof sc !== "undefined" && sc && typeof player !== "undefined" && player,
    { timeout: 15000 }
  );
  await page.waitForTimeout(800);

  const report = { engine: engineName, device: deviceName || null, shots: [], pageErrors: [] };

  // --- Zone screenshots ---
  const shots = arg("--shots", "");
  if (shots) {
    for (const part of shots.split(",")) {
      const [name, x, y, z] = part.split(":");
      await page.evaluate(({ x, y, z }) => {
        const cam = sc.cameras.main;
        cam.stopFollow();
        cam.setZoom(parseFloat(z) || 0.85);
        cam.centerOn(parseFloat(x), parseFloat(y));
      }, { x, y, z });
      await page.waitForTimeout(220);
      const file = `${out}/${name}.png`;
      await page.screenshot({ path: file });
      report.shots.push(file);
    }
  }

  // --- Trail-loop walkability checks ---
  if (has("--walk")) {
    report.walk = await page.evaluate(() => {
      const HX = 16, HY = 10;
      const hit = (x, y) => COLLISIONS.some((c) =>
        x + HX > c.x && x - HX < c.x + c.w && y + HY > c.y && y - HY < c.y + c.h);
      const line = (x0, y0, x1, y1, n) => {
        const bad = [];
        for (let i = 0; i <= n; i++) {
          const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
          if (hit(x, y)) bad.push([Math.round(x), Math.round(y)]);
        }
        return bad;
      };
      const lo = OPENINGS[0], ro = OPENINGS[1], top = LOOP_SEG[0];
      return {
        openingLeft: line(lo.x + lo.w - 20, lo.y + lo.h / 2, 210, lo.y + lo.h / 2, 30),
        openingRight: line(ro.x + 20, ro.y + ro.h / 2, WORLD.w - 210, ro.y + ro.h / 2, 30),
        trailTop: line(400, top.y + 24, 2400, top.y + 24, 60),
        trailBottom: line(400, top.y + top.h - 24, 2400, top.y + top.h - 24, 60),
      };
    });
  }

  // --- Free evaluation ---
  const evalExpr = arg("--eval", "");
  if (evalExpr) {
    report.eval = await page.evaluate((e) => {
      try { return JSON.parse(JSON.stringify(eval(e))); } catch (err) { return "EVAL ERROR: " + err.message; }
    }, evalExpr);
  }

  // --- External probe (free assertions) ---
  const probe = arg("--probe", "");
  if (probe) {
    const fn = require(require("node:path").resolve(probe));
    report.probe = await (typeof fn === "function" ? fn : fn.default)(page);
  }

  report.pageErrors = pageErrors;
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(pageErrors.length ? 1 : 0);
})().catch((e) => { console.error("PLAYTEST FAILED:", e.message); process.exit(2); });
