/*
 * tour — the standard visual + functional regression tour of a game. Takes the
 * screenshots a reviewer needs and asserts the core loop works:
 *   home, create, world, panel (tap a creature → walk → panel/auto-action),
 *   close-up (scrub → finish reveal → back to world, world still responds),
 *   help modal, every station, unlocks, guide arrow, save round-trip.
 *
 *   OUT=/tmp/shots node .claude/skills/_shared/playtest.cjs --viewport 390x844 \
 *       --probe .claude/skills/_shared/probes/tour.cjs
 * (use --viewport, not --device: DPR-3 screenshots are too slow to catch short moments)
 * Then LOOK at every screenshot with the visual-review checklist.
 */
const { wait, shot, visibleCreature, scrubAll } = require("./lib.cjs");

module.exports = async (page) => {
  const r = { errors: [] };
  const check = (ok, msg) => { if (!ok) r.errors.push(msg); };

  // --- home & create (reload to see them; the harness already started a game) ---
  await page.goto(page.url().split("?")[0] + "?tour=" + Date.now()); await wait(page, 1300);
  await shot(page, "01-home");
  await page.click("#btn-start"); await wait(page, 700);
  await shot(page, "02-create");
  await page.click("#btn-create-ok");
  await page.waitForFunction(() => typeof sc !== "undefined" && sc && player, { timeout: 15000 });
  await wait(page, 1200);
  await shot(page, "03-world");

  // --- tap a visible creature: the player must walk to it ---
  const t = await visibleCreature(page);
  check(!!t, "no creature visible on screen");
  if (t) {
    const before = await page.evaluate(() => [player.x, player.y]);
    await page.mouse.click(t.x, t.y);
    await wait(page, 2600);
    const st = await page.evaluate(() => ({ p: [player.x, player.y], active: activeTarget && activeTarget.name, closeup: closeupOpen }));
    check(Math.hypot(st.p[0] - before[0], st.p[1] - before[1]) > 10 || st.active || st.closeup, "tapping a creature did not move the player");
    r.tapped = t.name; r.afterTap = st;
    await shot(page, "04-tapped");
    // --- close-up (auto via tapAction, or via the action button) ---
    const has = await page.evaluate(() => !!(GAME.creature && GAME.creature.actions.find((a) => a.type === "closeup")));
    if (has) {
      await page.evaluate((name) => {
        if (closeupOpen) return;
        const c = state.creatures.find((k) => k.name === name) || state.creatures[0];
        player.x = c.x - 70; player.y = c.y; activeTarget = c;
        creatureAction(GAME.creature.actions.find((a) => a.type === "closeup").id);
      }, t.name);
      await wait(page, 800);
      await shot(page, "05-closeup");
      const s1 = await scrubAll(page, { keepLast: true });
      await shot(page, "06-closeup-progress");
      const coins0 = await page.evaluate(() => state.coins);
      await scrubAll(page);
      await wait(page, 250);
      r.reveal = await page.evaluate(() => ({ open: closeupOpen, bg2: !!(document.getElementById("closeup-bg2") && document.getElementById("closeup-bg2").classList.contains("show")) }));
      await shot(page, "07-closeup-finish");
      await wait(page, 2600);
      r.closeupClosed = await page.evaluate(() => !closeupOpen);
      check(r.closeupClosed, "close-up did not close after cleaning");
      await shot(page, "08-after-closeup");
      // the world must still respond to taps after the close-up (iOS freeze regression)
      const b2 = await page.evaluate(() => [player.x, player.y]);
      // a free floor point away from every creature (tapping a creature may start an action)
      const tgt = await page.evaluate(() => {
        for (let k = 0; k < 40; k++) {
          const a = k * 0.7, d = 110 + k * 6, x = player.x + Math.cos(a) * d, y = player.y + Math.sin(a) * d;
          const p = worldToScreen(x, y);
          if (p.y < 150 || p.y > innerHeight - 220 || p.x < 30 || p.x > innerWidth - 30) continue;
          if (!freeAt(x, y) || state.creatures.some((c) => Math.hypot(c.x - x, c.y - y) < 130)) continue;
          const el = document.elementFromPoint(p.x, p.y); if (!el || el.tagName !== "CANVAS") continue;   // not under the panel/HUD
          return p;
        }
        return worldToScreen(player.x, player.y + 120);
      });
      // Headless WebKit can drop to 2-3 fps here (software rendering): judge the TAP, not the walking
      // speed — the world is responsive if the tap was taken (a walk target / path is set) or the
      // player moved. A toast can also slide over the point between the pick and the tap: wait for
      // the canvas to be on top first (game-engine#22).
      for (let k = 0; k < 6; k++) {
        const top = await page.evaluate((t) => { const el = document.elementFromPoint(t.x, t.y); return el && el.tagName === "CANVAS"; }, tgt);
        if (top) break; await wait(page, 500);
      }
      const busy = await page.evaluate(() => !!moveTarget || navPath.length > 0 || !!followCreature);
      await page.mouse.click(tgt.x, tgt.y); await wait(page, 300);
      const taken = !busy && await page.evaluate(() => !!moveTarget || navPath.length > 0 || !!followCreature);
      let a2 = await page.evaluate(() => [player.x, player.y]);
      for (let k = 0; k < 8 && !(Math.hypot(a2[0] - b2[0], a2[1] - b2[1]) > 10); k++) { await wait(page, 500); a2 = await page.evaluate(() => [player.x, player.y]); }
      const moved = Math.hypot(a2[0] - b2[0], a2[1] - b2[1]) > 10;
      r.afterCloseupTap = { taken, moved };
      if (!moved) r.afterCloseupFlags = await page.evaluate((t) => ({ tgt: t, jumpRunning, moveTarget: !!moveTarget, nav: navPath.length,
        closeupOpen, modal: !document.getElementById("modal").classList.contains("hidden"), input: sc.input.enabled, zoomFx, player: [Math.round(player.x), Math.round(player.y)],
        under: (document.elementFromPoint(t.x, t.y) || {}).id || (document.elementFromPoint(t.x, t.y) || {}).tagName, fps: Math.round(game.loop.actualFps) }), tgt);
      check(moved || taken, "world unresponsive after the close-up");
      r.spots = s1.total; r.coinsGained = (await page.evaluate(() => state.coins)) - coins0;
    }
  }

  await page.evaluate(() => { if (closeupOpen) closeCloseup(); });
  // --- help modal ---
  await page.evaluate(() => openHelp()); await wait(page, 500);
  await shot(page, "09-help");
  await page.evaluate(() => closeModal());

  // --- stations ---
  const types = await page.evaluate(() => GAME.stations.map((s) => s.type));
  for (const ty of types) {
    await page.evaluate((t) => { const s = GAME.stations.find((x) => x.type === t); player.x = s.x; player.y = s.y + 100; }, ty);
    await wait(page, 700);
    await shot(page, "10-station-" + ty);
    await page.evaluate((t) => { state.actionsSinceRest = Math.max(1, state.actionsSinceRest || 0); interact({ type: t, station: true }); }, ty);
    await wait(page, 3300);
  }

  // --- unlock everything → scenery appears ---
  r.unlocks = await page.evaluate(() => {
    (GAME.unlocks || []).forEach((u) => { if (u.when && u.when.stat) state.stats[u.when.stat] = Math.max(state.stats[u.when.stat] || 0, u.when.atLeast); });
    refreshHud(); return Object.keys(state.unlocked || {});
  });
  await wait(page, 1600);
  await shot(page, "11-unlocks");

  // --- idle → guide arrow ---
  if (await page.evaluate(() => !!GAME.guide)) {
    await page.evaluate(() => { const sp = (GAME.player && GAME.player.spawn) || { x: player.x, y: player.y }; player.x = sp.x; player.y = sp.y; lastInputT = nowMs() - 60000; moveTarget = null; navPath = []; followCreature = null; });
    await wait(page, 1500);
    r.guide = await page.evaluate(() => !!(guideArrow && (guideArrow.visible || !document.querySelector(".guide-edge.hidden"))));
    await shot(page, "12-guide");
    // the off-screen edge pointer must never sit on the HUD bar or the bottom panel: send the player far
    // from every creature, in each corner, and check the pointer's box against them (it once covered the help button)
    // make every creature needy so the guide has someone to point at
    await page.evaluate(() => { (GAME.creature && GAME.creature.needs || []).forEach((n) => state.creatures.forEach((c) => { c[n.id] = 10; })); guideTarget = null; if (typeof closeModal === "function") closeModal(); });
    let shown = 0;
    for (const [dx, dy] of [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]]) {
      // stand ~900 px from the guided creature in each of 8 directions (clamped to the world)
      const [x, y] = await page.evaluate(([dx, dy]) => { const t = guideTarget || pickGuideTarget() || state.creatures[0]; if (!t) return [player.x, player.y];
        const x = Math.max(60, Math.min(WORLD.w - 60, t.x + dx * 900)), y = Math.max(60, Math.min(WORLD.h - 60, t.y + dy * 900));
        player.x = x; player.y = y; lastInputT = nowMs() - 60000; activeTarget = null; moveTarget = null; return [Math.round(x), Math.round(y)]; }, [dx, dy]);
      await wait(page, 700);
      const hit = await page.evaluate(() => {
        // hidden = the guided target is on screen from here (a small world on a short screen can keep it
        // visible from everywhere): nothing to check at this position
        const e = document.querySelector(".guide-edge"); if (!e || e.classList.contains("hidden")) return null;
        window.__edgeShown = (window.__edgeShown || 0) + 1;
        const a = e.getBoundingClientRect(), hits = [];
        const over = (b) => b.width && b.height && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        document.querySelectorAll("#screen-game .top-bar .mini-btn, #screen-game .top-bar .resource, #screen-game .place-title").forEach((el) => { if (over(el.getBoundingClientRect())) hits.push(el.id || el.className); });
        const pn = document.getElementById("panel"); if (pn && pn.offsetHeight && over(pn.getBoundingClientRect())) hits.push("panel");
        return hits;
      });
      check(!hit || !hit.length, `guide edge pointer overlaps the HUD at (${x},${y}): ` + JSON.stringify(hit));
      if (hit) shown++;
    }
    // shown === 0 only when the target never left the screen (small world / short screen): not applicable
    r.guideEdge = shown ? `checked in ${shown} position(s)` : "n/a: the guided target stayed on screen from every test position";
  }

  // --- save round trip ---
  r.save = await page.evaluate(() => { save(); const s = load(); return !!(s && s.creatures && s.player); });
  check(r.save, "save/load failed");
  return r;
};
