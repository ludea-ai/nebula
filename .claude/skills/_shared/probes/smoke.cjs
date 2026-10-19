/*
 * smoke — the QUICK check of a game after an engine update (a few seconds, no screenshots
 * to review). The harness has already loaded the page and started a game; this asserts the
 * world is alive: frames advance, a tap on the ground moves the player, the help opens and
 * closes. Page errors are reported by the harness itself (pageErrors, exit code 1).
 *
 *   node .claude/skills/_shared/playtest.cjs --port 8100 --viewport 390x844 \
 *       --probe .claude/skills/_shared/probes/smoke.cjs
 * Green = probe.errors [] and pageErrors []. The full tour (tour.cjs) is for the showcase,
 * the template and the games that use a system the change touched.
 */
const { wait } = require("./lib.cjs");

module.exports = async (page) => {
  const r = { errors: [] };
  const check = (ok, msg) => { if (!ok) r.errors.push(msg); };

  // The world is drawn: Phaser's frame counter moves.
  const f0 = await page.evaluate(() => game.loop.frame);
  await wait(page, 600);
  const f1 = await page.evaluate(() => game.loop.frame);
  check(f1 > f0, "the world is not being drawn (frame counter stuck)");

  // A tap on free ground near the player moves them.
  const start = await page.evaluate(() => [player.x, player.y]);
  const target = await page.evaluate(() => {
    const W = innerWidth, H = innerHeight, p = worldToScreen(player.x, player.y);
    // free ground: on the canvas, inside the play area, away from every creature (a tap on one
    // would start an action — tapAction — instead of a walk)
    const z = sc.cameras.main.zoom;
    const nearCreature = (x, y) => state.creatures.some((c) => { const q = worldToScreen(c.x, c.y); return Math.hypot(q.x - x, q.y - y) < 110 * z; });
    for (const [dx, dy] of [[90, 0], [-90, 0], [0, 90], [0, -90], [70, 70], [-70, -70], [70, -70], [-70, 70], [140, 0], [-140, 0]]) {
      const x = p.x + dx, y = p.y + dy;
      const el = document.elementFromPoint(x, y);
      if (x > 20 && x < W - 20 && y > 120 && y < H - 200 && el && el.tagName === "CANVAS" && !nearCreature(x, y)) return { x, y };
    }
    return null;
  });
  if (target) {
    await page.mouse.click(target.x, target.y);
    await wait(page, 1500);
    const end = await page.evaluate(() => [player.x, player.y]);
    r.moved = Math.round(Math.hypot(end[0] - start[0], end[1] - start[1]));
    check(r.moved > 8, "tapping the ground did not move the player");
  } else r.moved = "n/a (no free ground on screen)";

  // Leave any action the tap may still have started (close-up, panel) before the help check.
  await page.evaluate(() => { if (closeupOpen) closeCloseup(); });
  await wait(page, 300);

  // The help modal opens and closes (DOM side of the engine).
  const help = await page.$("#btn-help");
  if (help && await help.isVisible()) {
    await help.click(); await wait(page, 400);
    r.helpOpen = await page.evaluate(() => !document.getElementById("modal").classList.contains("hidden"));
    check(r.helpOpen, "the help did not open");
    await page.click("#btn-close-modal"); await wait(page, 300);
    check(await page.evaluate(() => document.getElementById("modal").classList.contains("hidden")), "the help did not close");
  } else r.helpOpen = "n/a";

  return r;
};
