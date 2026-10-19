/*
 * legal — the "Made with Ludea · legal notice" line of the home screen and the help:
 * on screen, inside the home sheet, overlapping nothing, readable; the legal notice opens (generated
 * from meta.author, or meta.legalLinks when the game is served by a publisher with its own pages).
 *
 *   OUT=/tmp/shots node .claude/skills/_shared/playtest.cjs --engine webkit --device "iPhone 13" \
 *       --probe .claude/skills/_shared/probes/legal.cjs
 * Run on a short screen (iPhone 13 profile) AND 390x844. Screenshots: legal-home, legal-notice, legal-help.
 */
const { wait, shot } = require("./lib.cjs");

module.exports = async (page) => {
  const r = { errors: [] };
  const check = (ok, msg) => { if (!ok) r.errors.push(msg); };
  await page.goto(page.url().split("?")[0] + "?legal=" + Date.now()); await wait(page, 1300);

  const box = await page.evaluate(() => {
    const el = document.getElementById("home-legal");
    if (!el) return null;
    const b = el.getBoundingClientRect(), H = innerHeight, W = innerWidth;
    const others = [...document.querySelectorAll("#screen-home button, #screen-home input, #screen-home .home-foot, #screen-home .home-hero, #lang-switch")]
      .filter((o) => o.offsetParent !== null).map((o) => ({ id: o.id || o.className, b: o.getBoundingClientRect() }));
    const overlap = others.filter((o) => o.b.width && !(o.b.right <= b.left || o.b.left >= b.right || o.b.bottom <= b.top || o.b.top >= b.bottom)).map((o) => o.id);
    const links = [...el.querySelectorAll("a")].map((a) => { const q = a.getBoundingClientRect(); return { t: a.textContent, h: Math.round(q.height), w: Math.round(q.width) }; });
    const fs = parseFloat(getComputedStyle(el).fontSize);
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, H, W, overlap, links, fs };
  });
  check(!!box, "no #home-legal line on the home screen");
  if (box) {
    r.home = box;
    check(box.bottom <= box.H + 0.5 && box.top >= 0, "the legal line is off screen");
    check(box.left >= 0 && box.right <= box.W + 0.5, "the legal line overflows horizontally");
    check(!box.overlap.length, "the legal line overlaps: " + box.overlap.join(", "));
    check(box.links.length >= 2, "expected 'Made with Ludea' + the legal link(s)");
    check(box.fs >= 10, "legal line text too small (" + box.fs + "px)");
  }
  await shot(page, "legal-home");

  // the notice: generated (data-legal) or the publisher's links (external, not opened here)
  const generated = await page.$("#home-legal [data-legal]");
  r.mode = generated ? "generated" : "publisher-links";
  if (generated) {
    await generated.click(); await wait(page, 400);
    const m = await page.evaluate(() => ({ open: !document.getElementById("modal").classList.contains("hidden"), rows: document.querySelectorAll("#modal .legal-row").length, text: document.getElementById("modal-body").innerText.slice(0, 600) }));
    check(m.open, "the legal notice did not open");
    check(m.rows >= 4, "the legal notice misses sections (" + m.rows + ")");
    r.notice = m.text;
    await shot(page, "legal-notice");
    await page.click("#btn-close-modal"); await wait(page, 300);
  }
  // same line at the bottom of the help (once in the game)
  await page.click("#btn-start"); await wait(page, 500);
  await page.click("#btn-create-ok");
  await page.waitForFunction(() => typeof sc !== "undefined" && sc && player, { timeout: 15000 });
  await wait(page, 900);
  await page.click("#btn-help"); await wait(page, 400);
  r.helpLinks = await page.evaluate(() => [...document.querySelectorAll("#modal .help-legal a")].map((a) => a.textContent));
  check(r.helpLinks.length >= 2, "the help lacks the legal line");
  await shot(page, "legal-help");
  return r;
};
