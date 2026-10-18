/*
 * racerivals — a REAL race (race.rivals): grid start behind the field, 3-2-1 countdown (nobody moves),
 * rivals move and are drawn, live place chip "n/N" updates, overtaking raises the place, the finish
 * opens the results modal (full ranking, player row highlighted, reward by place), stats updated.
 *   OUT=/tmp/rr node .claude/skills/_shared/playtest.cjs --engine webkit --device "iPhone 13" --port N \
 *       --probe .claude/skills/_shared/probes/racerivals.cjs
 * LOOK at rr-grid.png (countdown + field ahead), rr-race.png, rr-results.png.
 */
const { wait, shot } = require("./lib.cjs");

module.exports = async (page) => {
  const r = { errors: [] };
  const check = (ok, msg) => { if (!ok) r.errors.push(msg); };
  const has = await page.evaluate(() => !!(GAME.race && GAME.race.rivals && (GAME.race.rivals.list || []).length));
  if (!has) return { skipped: "no race.rivals", errors: [] };
  await page.evaluate(() => {
    const RD = GAME.creature.ride || {};
    const c = state.creatures.find((q) => !isYoung(q)) || state.creatures[0]; c.age = 20; if (RD.fatigueNeed) c[RD.fatigueNeed] = 100;
    player.x = c.x - 60; player.y = c.y; activeTarget = c;
    creatureAction(GAME.creature.actions.find((a) => a.type === "ride").id); startRace();
  });
  await wait(page, 900);
  const g = await page.evaluate(() => ({ count: R3.count, pos: R3.pos, n: R3.rivals.length, ahead: R3.rivals.filter((x) => x.z > r3PlayerZ()).length,
    chip: document.querySelector("#rh-place b") && document.querySelector("#rh-place b").textContent }));
  await shot(page, "rr-grid");
  // the starting grid must not overlap the player's ride (opaque art ~ the central 70 % of each frame)
  const ov = await page.evaluate(() => {
    const c = R3.carRect, shrink = (r) => ({ l: r.l + r.w * 0.15, r: r.l + r.w * 0.85, t: r.t + r.h * 0.1, b: r.t + r.h * 0.95 });
    if (!c) return null; const P = shrink(c);
    return R3.rivals.filter((x) => x.rect && x.rect.w).map((x) => ({ n: x.name, q: shrink(x.rect) }))
      .filter((x) => x.q.l < P.r && x.q.r > P.l && x.q.t < P.b && x.q.b > P.t).map((x) => x.n);
  });
  check(ov && !ov.length, "rivals overlap the player on the starting grid: " + JSON.stringify(ov));
  check(g.n === (await page.evaluate(() => Math.min(GAME.race.rivals.count || 99, GAME.race.rivals.list.length))), "not every rival was created: " + JSON.stringify(g));
  check(g.count > 0 && g.pos === 0, "the countdown does not hold the start: " + JSON.stringify(g));
  check(g.ahead === g.n, "the player should start behind the whole field: " + JSON.stringify(g));
  const line = await page.evaluate(() => { const i = R3.segs.findIndex((x) => x.start); return i < 0 ? null : { lineZ: i * R3.segLen, front: Math.max(r3PlayerZ(), ...R3.rivals.map((x) => x.z)) }; });
  check(!line || line.front < line.lineZ, "a racer starts past the start line: " + JSON.stringify(line));
  r.grid = g;
  await page.waitForFunction(() => R3.count <= 0, null, { timeout: 15000 }); await wait(page, 2500);
  const m = await page.evaluate(() => ({ pos: Math.round(R3.pos), rz: R3.rivals.map((x) => Math.round(x.z)), place: R3.place,
    chip: document.querySelector("#rh-place b").textContent }));
  check(m.pos > 0, "the player does not move after GO");
  check(m.place >= 1 && /\//.test(m.chip), "no live place chip: " + JSON.stringify(m));
  await shot(page, "rr-race");
  // overtake: put the player just ahead of the whole field → place 1
  const o = await page.evaluate(() => new Promise((res) => {
    const top = Math.max(...R3.rivals.map((x) => x.z)); R3.pos = top - (R3.carDepth || 0) + R3.segLen * 15;   // 15 segments ≈ 0.3 s at race speed: a bump right after must not let the pack straight back past
    // wait for a few frames (slow WebKit in CI): the place is recomputed each frame
    const t0 = Date.now(), poll = () => (R3.place === 1 || Date.now() - t0 > 4000) ? res({ place: R3.place, chip: document.querySelector("#rh-place b").textContent }) : setTimeout(poll, 100);
    setTimeout(poll, 200);
  }));
  check(o.place === 1, "overtaking everybody does not give 1st place: " + JSON.stringify(o));
  // finish line → results modal
  const before = await page.evaluate(() => ({ coins: state.coins, win: state.stats[GAME.race.stat || "raceWin"] || 0 }));
  await page.evaluate(() => { R3.rivals.forEach((x) => { x.z = Math.min(x.z, R3.finishZ - R3.segLen * 40); }); R3.pos = R3.finishZ - (R3.carDepth || 0) - 5; });
  await wait(page, 1200);
  const fin = await page.evaluate(() => ({ on: R3.on, modal: !document.getElementById("modal").classList.contains("hidden"),
    rows: document.querySelectorAll(".rr-row").length, you: [...document.querySelectorAll(".rr-row")].findIndex((x) => x.classList.contains("you")),
    coins: state.coins, win: state.stats[GAME.race.stat || "raceWin"] || 0, podium: state.stats.racePodium || 0 }));
  await shot(page, "rr-results");
  check(!fin.on && fin.modal, "the finish did not open the results: " + JSON.stringify(fin));
  check(fin.rows === g.n + 1 && fin.you === 0, "results list wrong (rows / player 1st): " + JSON.stringify(fin));
  const gaps = await page.evaluate(() => [...document.querySelectorAll(".rr-row .rr-time")].slice(1).map((e) => parseFloat(e.textContent.replace("+", ""))));
  check(gaps.every((v, i) => i === 0 || v >= gaps[i - 1]), "results gaps are not in ranking order: " + JSON.stringify(gaps));
  check(fin.coins > before.coins && fin.win === before.win + 1 && fin.podium >= 1, "reward / stats not applied: " + JSON.stringify({ before, fin }));
  r.final = fin;
  return r;
};
