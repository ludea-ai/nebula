/*
 * systems — functional checks of the optional engine systems a game enables:
 * ride (+ rideSheet / hideRider / dirSheet facing), jump, station menus + restyle,
 * missions, chase, models, race, shop (resource / capacity / creature), decoration
 * placement, spawn station, breeding, legacy save migration. Each block runs only when the
 * game's config has that system, so it is safe on any game.
 *
 *   OUT=/tmp/shots node .claude/skills/_shared/playtest.cjs --viewport 390x844 \
 *       --probe .claude/skills/_shared/probes/systems.cjs
 * Prints { errors:[…], <system>: {...} } and saves a screenshot per system in OUT.
 */
const { wait, shot } = require("./lib.cjs");

module.exports = async (page) => {
  const r = { errors: [] };
  const check = (ok, msg) => { if (!ok) r.errors.push(msg); };
  const has = await page.evaluate(() => ({
    ride: !!(GAME.creature && GAME.creature.ride), race: !!GAME.race, missions: !!GAME.missions, chase: !!GAME.chase,
    models: !!GAME.models, menu: (GAME.stations || []).some((s) => s.action === "menu"), legacy: !!(GAME.meta && GAME.meta.legacySave),
    shop: !!GAME.shop, decor: !!(GAME.decor && GAME.decor.length), spawn: (GAME.stations || []).some((s) => s.action === "spawn"),
    breeding: !!(GAME.creature && GAME.creature.breeding && GAME.creature.breeding.enabled),
  }));
  r.has = has;
  await page.evaluate(() => { state.coins = 5000; refreshHud();
    // reach every leg of the current mission (pickup → delivery) by teleporting onto each goal
    window.__finishMission = async () => {
      for (let k = 0; k < 3 && state.mission; k++) {
        const g = missionGoal(state.mission); player.x = g.x; player.y = g.y;
        await new Promise((res) => setTimeout(res, 400));
      }
    };
  });

  // ---- ride: mount the first adult creature, move, check facing / rider, then jump ----
  if (has.ride) {
    const out = await page.evaluate(async () => {
      const c = state.creatures.find((x) => !isYoung(x)) || state.creatures[0];
      player.x = c.x - 60; player.y = c.y; activeTarget = c;
      const ride = GAME.creature.actions.find((a) => a.type === "ride");
      creatureAction(ride.id);
      const o = { mounted: mounted === c, riderVisible: playerSprite.visible, riderTex: playerSprite.texture.key };
      return o;
    });
    check(out.mounted, "ride: could not mount");
    for (const [k, dir] of [["ArrowRight", "right"], ["ArrowDown", "down"], ["ArrowLeft", "left"]]) {
      await page.keyboard.down(k); await wait(page, 450); await page.keyboard.up(k); await wait(page, 120);
      const f = await page.evaluate(() => ({ facing: playerFacing, mountFacing: mounted && mounted.facing, flip: mounted && mounted.bodyT.flipX }));
      out["after_" + dir] = f;
    }
    await shot(page, "sys-ride");
    const j = await page.evaluate(async () => {
      const before = state.stats.jump || 0, x0 = player.x, y0 = player.y;
      const jump = GAME.creature.actions.find((a) => a.type === "jump");
      if (jump) creatureAction(jump.id);
      await new Promise((res) => setTimeout(res, 800));
      return { jumped: (state.stats.jump || 0) > before || !jump, moved: Math.hypot(player.x - x0, player.y - y0) };
    });
    out.jump = j; check(j.jumped, "ride: jump did not count");
    r.ride = out;
  }

  // ---- ride.empty:"slow": out of fuel = still on board, crawling; requireMounted stations ----
  if (has.ride) {
    const out = await page.evaluate(async () => {
      const R = GAME.creature.ride; if (!R || R.empty !== "slow" || !mounted) return { skipped: true };
      const need = R.fatigueNeed; mounted[need] = 0;
      const x0 = player.x; player.x = x0;
      await new Promise((res) => setTimeout(res, 800));
      return { stillMounted: !!mounted, empty: rideEmpty(mounted), mul: rideEmptyMul() };
    });
    if (!out.skipped) check(out.stillMounted && out.empty && out.mul < 1, "ride: an empty ride should stay mounted and slow down");
    const gas = await page.evaluate(async () => {
      const st = (GAME.stations || []).find((s) => s.requireMounted && s.action === "custom"); if (!st || !mounted) return { skipped: true };
      const need = GAME.creature.ride.fatigueNeed;
      moveTarget = null; navPath = [];
      player.x = st.x; player.y = st.y + 110;
      for (let k = 0; k < 15 && activeTarget !== st; k++) await new Promise((res) => setTimeout(res, 100));   // slow WebKit frames
      const targeted = activeTarget === st;
      interact({ type: st.type, station: true }); closeModal();
      return { targeted, refilled: mounted[need] > 50, notEmpty: rideEmptyMul() === 1 };
    });
    if (!gas.skipped) check(gas.targeted && gas.refilled && gas.notEmpty, "station: a ride-only station did not serve the mounted ride");
    r.empty = { out, gas };
  }

  // ---- race (mounted) ----
  if (has.race && has.ride) {
    const out = await page.evaluate(async () => {
      if (!mounted) return { skipped: "not mounted" };
      startRace();
      // a race with rivals / a chase holds the start for a 3-2-1 countdown (real seconds): wait for GO
      for (let i = 0; i < 80 && R3.count > 0; i++) await new Promise((res) => setTimeout(res, 100));
      await new Promise((res) => setTimeout(res, 1200));
      return { on: R3.on, hud: !!document.querySelector("#race-hud:not(.hidden)"), pos: Math.round(R3.pos), time: R3.time };
    });
    await shot(page, "sys-race");
    // steer with a real pointer on the right half
    await page.mouse.move(330, 600); await page.mouse.down(); await wait(page, 500);
    const steer = await page.evaluate(() => R3.playerX); await page.mouse.up();
    out.steerRight = steer;
    check(out.on && out.hud && out.pos > 0, "race: did not start / advance");
    check(steer > 0, "race: steering right did not move the car right");
    const fin = await page.evaluate(async () => {
      const wins = state.stats[GAME.race.stat || "raceWin"] || 0, coins = state.coins;
      // put the player past the whole field (a race with rivals ranks it 1st), then over the line
      (R3.rivals || []).forEach((x) => { x.z = Math.min(x.z, R3.finishZ - R3.segLen * 40); });
      R3.pos = R3.finishZ - (R3.carDepth || 0) - 10;
      for (let i = 0; i < 30 && R3.on; i++) await new Promise((res) => setTimeout(res, 100));
      if (typeof closeModal === "function") closeModal();
      return { off: !R3.on, won: (state.stats[GAME.race.stat || "raceWin"] || 0) === wins + 1, paid: state.coins - coins };
    });
    out.finish = fin; check(fin.off && fin.won, "race: finishing did not end + count a win");
    r.race = out;
  }
  await page.evaluate(() => { if (mounted) dismount(mounted, false); closeModal(); });

  // ---- station menu + restyle ----
  if (has.menu) {
    const out = await page.evaluate(async () => {
      const st = GAME.stations.find((s) => s.action === "menu");
      openStationMenu(st);
      const n = document.querySelectorAll("#modal-body .choice").length;
      const ri = (st.menu.items || []).findIndex((it) => it.do === "restyle");
      const o = { items: n };
      if (ri >= 0) {
        if (GAME.chase) addHeat(2);
        choicePick(ri);
        const opts = document.querySelectorAll("#modal-body .choice").length;
        const c = state.creatures.find((x) => x.id === state.lastRide) || state.creatures[0];
        const before = c.variant;
        const idx = choiceOpts.findIndex((x) => !x.disabled);
        choicePick(idx);
        o.restyle = { options: opts, changed: c.variant !== before, heat: state.heat };
      }
      closeModal();
      return o;
    });
    check(out.items > 0, "menu: no items");
    if (out.restyle) { check(out.restyle.changed, "restyle: variant unchanged"); }
    r.menu = out;
  }

  // ---- station action "restyle" (e.g. a paint shop you drive into) ----
  {
    const out = await page.evaluate(async () => {
      const st = (GAME.stations || []).find((s) => s.action === "restyle"); if (!st || !GAME.creature || !GAME.creature.ride) return null;
      const c = state.creatures[0]; if (mounted && mounted !== c) dismount(mounted, false);
      if (!mounted) { player.x = c.x - 60; player.y = c.y; activeTarget = c; creatureAction(GAME.creature.actions.find((a) => a.type === "ride").id); }
      const foot = st.requireMounted;
      player.x = st.x; player.y = st.y + 110; await new Promise((r) => setTimeout(r, 300));
      const before = mounted.variant; interact({ type: st.type, station: true });
      const opts = document.querySelectorAll("#modal-body .choice").length;
      choicePick(choiceOpts.findIndex((x) => !x.disabled));
      const changed = mounted.variant !== before; dismount(mounted, false);
      // on foot it must refuse when requireMounted
      await new Promise((r) => setTimeout(r, 200)); interact({ type: st.type, station: true });
      const refusedOnFoot = !foot || document.getElementById("modal").classList.contains("hidden");
      closeModal();
      return { opts, changed, refusedOnFoot };
    });
    if (out) { check(out.changed && out.refusedOnFoot, "restyle station: did not repaint the ridden creature / did not refuse on foot"); r.restyleStation = out; }
  }

  // ---- missions ----
  if (has.missions) {
    const out = await page.evaluate(async () => {
      state.mission = null; openMissions();
      const n = document.querySelectorAll("#modal-body .choice").length;
      choicePick(0);
      const m = state.mission && { x: state.mission.x, y: state.mission.y };
      return { offers: n, taken: !!m, m };
    });
    await wait(page, 400); await shot(page, "sys-mission");
    const done = await page.evaluate(async () => {
      const st = GAME.missions.stat || "missions", before = state.stats[st] || 0, coins = state.coins;
      const twoLegs = state.mission.stage === "pickup";
      await window.__finishMission();
      return { twoLegs, cleared: !state.mission, counted: (state.stats[st] || 0) === before + 1, paid: state.coins - coins };
    });
    out.done = done;
    check(out.offers > 0 && out.taken, "missions: could not take one");
    check(done.cleared && done.counted && done.paid > 0, "missions: reaching the destination did not complete it");
    // a "hot" mission (heat > 0) brings a chase; delivering it must end the chase
    if (has.chase) {
      const hot = await page.evaluate(async () => {
        const i = (GAME.missions.offers || []).findIndex((o) => o.heat);
        if (i < 0) return { skipped: "no hot offer" };
        state.mission = null; clearHeat(); openMissions(); choicePick(i);
        await new Promise((res) => setTimeout(res, 1500));
        if (state.mission.stage === "pickup") { const g = missionGoal(state.mission); player.x = g.x; player.y = g.y; await new Promise((res) => setTimeout(res, 1500)); }
        const o = { heatBefore: state.heat, unitsBefore: chasers.length, carrying: !document.getElementById("chip-cargo") || !document.getElementById("chip-cargo").classList.contains("hidden") };
        player.x = state.mission.x; player.y = state.mission.y;
        await new Promise((res) => setTimeout(res, 2500));
        o.heatAfter = state.heat; o.unitsAfter = chasers.length; o.chip = !document.getElementById("chip-heat").classList.contains("hidden");
        return o;
      });
      out.hot = hot;
      if (!hot.skipped) check(hot.heatBefore > 0 && hot.unitsBefore > 0 && hot.heatAfter === 0 && hot.unitsAfter === 0 && !hot.chip,
        "missions: delivering a hot mission did not end the chase");
      // caught during a hot mission: caughtKeepsMission (chase-wide, or the offer's override) decides
      // whether the mission survives. caught() is called directly — deterministic, so it does not depend
      // on frame timing (a wall-clock catch loop was too slow / flaky in headless WebKit).
      out.caught = await page.evaluate(async () => {
        const M = GAME.missions, res = [];
        for (let i = 0; i < (M.offers || []).length; i++) {
          const of = M.offers[i]; if (!of.heat) continue;
          state.mission = null; clearHeat(); openMissions(); choicePick(i);
          if (state.mission && state.mission.stage === "pickup") { const g = missionGoal(state.mission); player.x = g.x; player.y = g.y; await new Promise((r2) => setTimeout(r2, 800)); }
          if (!(state.heat > 0)) addHeat(of.heat);
          const keep = !!(of.caughtKeepsMission !== undefined ? of.caughtKeepsMission : GAME.chase.caughtKeepsMission);
          const coins = state.coins, had = !!state.mission;
          caught();
          res.push({ offer: of.id != null ? of.id : i, had, keep, kept: !!state.mission, heat: state.heat, units: chasers.length, fined: coins - state.coins });
          state.mission = null; clearMissionVisual(); refreshCargo(); clearHeat();
        }
        return res;
      });
      out.caught.forEach((c) => check(c.had && c.kept === c.keep && c.heat === 0 && c.units === 0 && c.fined > 0,
        `missions: caught during offer ${c.offer}: mission ${c.kept ? "kept" : "lost"} (expected ${c.keep ? "kept" : "lost"}), heat ${c.heat}, pursuers ${c.units}, fine ${c.fined}`));
    }
    // per-offer overrides: each offer takes the right number of legs, is saved by its id (index when it has
    // none), survives a save/load, and counts the mission stat + its own stat
    out.offers = await page.evaluate(async () => {
      const M = GAME.missions, res = [], st = M.stat || "missions";
      for (let i = 0; i < (M.offers || []).length; i++) {
        const of = M.offers[i];
        state.mission = null; clearHeat(); openMissions(); choicePick(i);
        if (!state.mission) { res.push({ offer: i, taken: false }); continue; }
        const pk = of.pickups !== undefined ? of.pickups : M.pickups;
        const o = { offer: of.id != null ? of.id : i, taken: true, twoLegs: state.mission.stage === "pickup", wantTwoLegs: !!(pk && pk.length) };
        o.refOk = state.mission.offer === (of.id != null ? of.id : i);
        save(); try { o.saveOk = JSON.parse(localStorage.getItem(SAVE_KEY)).mission.offer === state.mission.offer; } catch (e) { o.saveOk = false; }
        const before = state.stats[st] || 0, own = of.stat && of.stat !== st ? (state.stats[of.stat] || 0) : null;
        await window.__finishMission();
        o.done = !state.mission; o.counted = (state.stats[st] || 0) === before + 1;
        if (own != null) o.ownStat = (state.stats[of.stat] || 0) === own + 1;
        res.push(o);
        clearHeat();
      }
      return res;
    });
    out.offers.forEach((o) => check(o.taken && o.twoLegs === o.wantTwoLegs && o.refOk && o.saveOk && o.done && o.counted && o.ownStat !== false,
      "missions: offer " + o.offer + " override broken: " + JSON.stringify(o)));
    r.missions = out;
  }

  // ---- chase ----
  if (has.chase) {
    const out = await page.evaluate(async () => {
      clearHeat(); addHeat(2);
      await new Promise((res) => setTimeout(res, 600));
      const o = { units: chasers.length, chip: !document.getElementById("chip-heat").classList.contains("hidden") };
      // get caught: stand on a pursuer
      const coins = state.coins;
      const t0 = performance.now();
      while (state.heat > 0 && performance.now() - t0 < 20000) {   // generous: slow headless WebKit at DPR 3
        const u = chasers[0]; if (u) { player.x = u.x; player.y = u.y; }
        await new Promise((res) => setTimeout(res, 100));
      }
      o.caught = state.heat === 0; o.fined = coins - state.coins; o.unitsAfter = chasers.length;
      return o;
    });
    await shot(page, "sys-chase");
    check(out.units > 0 && out.chip, "chase: no pursuers / no HUD chip");
    check(out.caught && out.unitsAfter === 0, "chase: getting caught did not end it");
    r.chase = out;
  }

  // ---- models ----
  if (has.models) {
    const out = await page.evaluate(async () => {
      state.capacity = Math.max(state.capacity, state.creatures.length + 2);
      openModels();
      const n = document.querySelectorAll("#modal-body .choice").length;
      const before = state.creatures.length;
      choicePick(0);
      const m = state.creatures[state.creatures.length - 1];
      const o = { items: n, bought: state.creatures.length === before + 1, model: m && m.model, speedMul: m && m.speedMul };
      openModels(); o.ownedDisabled = !!(choiceOpts[0] && choiceOpts[0].disabled); closeModal();
      return o;
    });
    await shot(page, "sys-models");
    check(out.bought && out.model && out.ownedDisabled, "models: buying failed or not marked owned");
    r.models = out;
  }

  // ---- shop: buy a resource, a capacity upgrade and a creature ----
  if (has.shop) {
    const out = await page.evaluate(async () => {
      if (mounted) dismount(mounted);
      state.coins = 5000; const S = GAME.shop, o = {};
      const res = (S.resources || [])[0];
      if (res) { const b = state.resources[res.id] || 0; buy("res:" + res.id); o.resource = (state.resources[res.id] || 0) - b; }
      if (S.capacity) { const b = state.capacity; buy("capacity"); o.capacity = state.capacity - b; }
      if (S.buyCreature) { const b = state.creatures.length; buy("creature"); o.creature = state.creatures.length - b; }
      o.modal = !document.getElementById("modal").classList.contains("hidden");
      closeModal(); return o;
    });
    check(out.resource !== 0 && out.capacity !== 0 && out.creature !== 0, "shop: a purchase did not apply");
    r.shop = out;
  }

  // ---- decoration: buy → ghost follows → place it (outside the home zone) ----
  if (has.decor) {
    const out = await page.evaluate(async () => {
      const d = GAME.decor[0], b = state.decors.length, z = (GAME.zones || []).find((q) => q.home);
      // stand in a free spot: left of the home zone, away from stations
      if (mounted) dismount(mounted);
      // clear anything left by earlier blocks that could still move the player (a creature being followed,
      // a pending interaction, a running hop / jump tween)
      moveTarget = null; navPath = []; followCreature = null; followAuto = false; pendingInteract = null;
      sc.tweens.killTweensOf(player); jumpRunning = false;
      // a free spot outside the home zone where a decoration may go (no obstacle under the player or the ghost)
      const cands = [];
      for (let k = 0; k < 40; k++) cands.push({ x: 200 + Math.random() * (WORLD.w - 400), y: 200 + Math.random() * (WORLD.h - 400) });
      const okSpot = (p) => freeAt(p.x, p.y) && freeAt(p.x + 60, p.y + 6) && !placementError(d, p.x + 60, p.y + 6) &&
        !COLLISIONS.some((m) => p.x + 80 > m.x && p.x - 20 < m.x + m.w && p.y + 20 > m.y && p.y - 20 < m.y + m.h);
      const spot = (z ? [{ x: z.rect.x - 160, y: z.rect.y + z.rect.h / 2 }] : []).concat(cands).find(okSpot) || { x: player.x, y: player.y };
      player.x = spot.x; player.y = spot.y;
      playerFacing = "right"; buyDecor(d.id); const ghost = !!ghostDecor;   // ghost on the zone side (never over a station)
      await new Promise((res) => setTimeout(res, 200));
      const g = ghostXY(), err = placementError(d, g.x, g.y);
      placeDecor();
      return { ghost, placed: state.decors.length - b, placing: !!placingDecor, at: [Math.round(player.x), Math.round(player.y)], err, mounted: !!mounted };
    });
    if (out.placing) await page.evaluate(() => cancelPlacement());
    check(out.ghost && out.placed === 1, "decor: buy + place failed (" + JSON.stringify(out) + ")");
    await shot(page, "sys-decor");
    r.decor = out;
  }

  // ---- spawn station: brings creatures in (up to its cap) ----
  if (has.spawn) {
    const out = await page.evaluate(async () => {
      const st = GAME.stations.find((s) => s.action === "spawn");
      state.capacity = Math.max(state.capacity, state.creatures.length + 2);
      const b = state.creatures.length; spawnCreatures(st);
      await new Promise((res) => setTimeout(res, 600));
      return { added: state.creatures.length - b };
    });
    check(out.added >= 1, "spawn: no creature arrived");
    r.spawn = out;
  }

  // ---- breeding: two happy adults + room + no young → a baby overnight ----
  if (has.breeding) {
    const out = await page.evaluate(() => {
      const mood = GAME.creature.moodNeed;
      state.creatures.forEach((c) => { c.age = 20; if (mood) c[mood] = 100; });
      state.capacity = state.creatures.length + 2; state.lastBirth = -99;
      const b = state.creatures.length, births = state.stats.births || 0;
      applyDay();
      return { born: state.creatures.length - b, births: (state.stats.births || 0) - births };
    });
    check(out.born === 1 && out.births === 1, "breeding: no baby after a happy night");
    r.breeding = out;
  }

  // ---- texts: no raw markup visible in any choice window (e.g. a "<br>" printed as text) ----
  {
    const out = await page.evaluate(() => {
      const seen = [], raw = /<\/?[a-z][a-z0-9]*[^<>]*>|&lt;|&gt;|&amp;|\{i:[a-z0-9_]*\}/i;
      const look = (name, open) => { try { open(); } catch (e) { return; } const t = document.getElementById("modal").innerText || ""; const m = t.match(raw); if (m) seen.push(name + ": " + m[0]); closeModal(); };
      if (GAME.shop) look("shop", () => openShop());
      if (GAME.models) look("models", () => openModels());
      if (GAME.missions && !state.mission) look("missions", () => openMissions());
      (GAME.stations || []).filter((st) => st.action === "menu").forEach((st) => look("menu " + st.type, () => openStationMenu(st)));
      return seen;
    });
    out.forEach((m) => r.errors.push("raw markup shown as text in " + m));
    r.texts = out;
  }

  // ---- legacy save migration ----
  if (has.legacy) {
    const out = await page.evaluate(() => {
      const L = GAME.meta.legacySave, key = [].concat(L.key)[0];
      const keep = localStorage.getItem(GAME.meta.saveKey);
      localStorage.removeItem(GAME.meta.saveKey);
      const had = localStorage.getItem(key);
      const ok = !!had;
      const s = ok ? load() : null;
      if (keep) localStorage.setItem(GAME.meta.saveKey, keep); else localStorage.removeItem(GAME.meta.saveKey);
      return { legacyPresent: ok, migrated: !!s, creatures: s && s.creatures ? s.creatures.length : 0 };
    });
    r.legacy = out;
  }
  return r;
};
