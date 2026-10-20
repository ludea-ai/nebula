/*
 * playername — the player's name on the create screen, both ways (game-engine#20).
 * meta.askPlayerName:false → no "Your name" field; the name is the chosen character's and follows
 * a change of avatar; a name typed in an older save is replaced on load.
 * Default (asks) → the field is there and a typed name is kept.
 *
 *   node .claude/skills/_shared/playtest.cjs --port 8099 --viewport 390x844 \
 *       --probe .claude/skills/_shared/probes/playername.cjs
 * Green = probe.errors [] and pageErrors [].
 */
const { wait } = require("./lib.cjs");

module.exports = async (page) => {
  const r = { errors: [] };
  const check = (ok, msg) => { if (!ok) r.errors.push(msg); };
  r.asks = await page.evaluate(() => META.askPlayerName !== false);

  // "Change my look": the create screen opened on the current player.
  await page.evaluate(() => document.getElementById("btn-me").click());
  await wait(page, 400);
  const field = await page.evaluate(() => !!document.getElementById("create-name"));
  check(field === r.asks, r.asks ? "the name field is missing" : "the name field is shown although askPlayerName is false");

  const many = await page.evaluate(() => CHARACTERS.length > 1);
  if (r.asks) await page.evaluate(() => { document.getElementById("create-name").value = "Probe"; });
  else if (many) await page.evaluate(() => document.getElementById("car-next").click());
  await page.evaluate(() => document.getElementById("btn-create-ok").click());
  await wait(page, 400);
  const after = await page.evaluate(() => ({ name: state.player.name, hero: charDef(state.player.avatar).name, label: playerName && playerName.text }));
  r.after = after;
  if (r.asks) check(after.name === "Probe", `typed name not kept (${after.name})`);
  else check(after.name === after.hero, `the name is not the chosen character's (${after.name} ≠ ${after.hero})`);
  check(after.label === after.name, `the label above the player shows "${after.label}", not "${after.name}"`);

  // An older save holding a typed name, loaded again.
  const loaded = await page.evaluate(() => { state.player.name = "Typed"; save(); continueGame(); return { name: state.player.name, hero: charDef(state.player.avatar).name }; });
  r.loaded = loaded;
  if (r.asks) check(loaded.name === "Typed", `a saved name was lost on load (${loaded.name})`);
  else check(loaded.name === loaded.hero, `a typed name from an old save was kept (${loaded.name})`);
  return r;
};
