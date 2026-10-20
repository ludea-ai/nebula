---
name: visual-review
description: Rigorous visual QA of a game built on this engine — art (anatomy, clipping, gaps, outlines, readability) and UI (layout, overflow, icons, short/tall screens) — with automated checks AND a mandatory checklist-driven look at full-size renders and real screenshots. Run after ANY art or UI change and before every publish. Triggers: "check the graphics", "does it look right", "review the art", "is it professional", "polish", after asset generation, before release-deploy.
---

# visual-review

"It renders without errors" is not "it looks right". A floating head (no neck), a cut
antenna or an emoji where an icon should be are invisible to every automated test — and
obvious to a player in one second. This skill makes looking **systematic**.

> Lesson that created this skill: a close-up face shipped with the head floating above
> the shoulders (no neck). The art had only been looked at as tiny thumbnails on a contact
> sheet. Always inspect **full-size crops** of characters and faces.

## 1. Automated art checks
```bash
node .claude/skills/_shared/art-check.cjs --out /tmp/art-check      # all assets in GAME.assets
node .claude/skills/_shared/art-check.cjs --only kid_,mouth_        # a subset
```
Flags: **clipping** (opaque pixels touching a frame edge — antenna/hair cut off),
**empty frames**, **feet line jumping** / **centre drifting** between walk frames,
**detached parts** (a floating head/hand/speck — sparkles are fine, body parts are not).
Every ⚠ must be either fixed or explicitly justified. Full-bleed backdrops can't be
checked for gaps automatically → step 2 is mandatory for them.

## 2. Look at the art — FULL SIZE
Open the review sheets written by art-check (`<key>.png`, 2× on a checkerboard with the
frame grid) and, for every character / face / backdrop, a **full-resolution crop** of the
critical areas (head–neck–shoulders, hands–arms, feet–ground, mouth/eyes):
```bash
python3 -c "from PIL import Image; Image.open('assets/img/X.png').crop((x0,y0,x1,y1)).save('/tmp/crop.png')"
```
Checklist — answer each explicitly (write down the defects you find):
- **Anatomy connected**: head joined to the body by a neck/collar, limbs attached at the
  shoulder/hip, no gap between body parts, nothing floating.
- **Proportions consistent** between frames, directions and variants (same head size…).
- **Outlines** closed and of consistent weight; no stray strokes; no fill spilling outside
  its shape (e.g. a tongue outside the mouth) — clip inner details to their container.
- **Silhouette readable at the in-game size** (a phone shows sprites at ~40–90 px).
- **Walk cycles**: feet stay on the same line, no sliding, arms/legs alternate.
- **Facing**: a side-view walker / mount (flipped left↔right by the engine) must LOOK where it
  goes — draw its walk strip with the face turned ~3/4 towards the left (eye, mouth, cheeks
  shifted; e.g. `critter({look, turn})` in nebula.cjs), never a straight front face. Check a
  ridden one going left AND right (rider and mount face the same way).
- **Realistic proportions in unusual views** (rear view for a race, 3/4…): compare with a real
  reference in your head and SCRIPT a ratio check. A horse from behind is TALL and NARROW (rump
  ≤ ~2× the rider's back, art ≤ ~half the frame width); a rider's thighs are hidden by the rump,
  only the lower legs hang along the flanks. (The owner once saw "big buttocks" and frog legs.)
  A narrow drawing then needs a bigger frame in-game (`race.rideWidth`), not a wider drawing.
- **Glows that vanish**: a `filter` (glow/blur) on a `<line>` or a purely horizontal/vertical path renders NOTHING
  (zero-size filter region). render-svg.cjs warns about it — never ignore that warning; use a thin `<rect>`.
- **Variants** differ clearly (colour, hair…) but share the same anatomy.
- **Sharpness (no blur)**: crop at the DPR-3 (iPhone) resolution — art must be rendered at
  ≥ 2× its displayed size (`svg-kit` `hidpi()` rules + `res` in `GAME.assets`, see ENGINE.md
  "Resolution"). A soft/blurry edge on a home-screen character = wrong scale, not "fine".
- **App icons**: look at `apple-touch-icon`, `icon-192` and the maskable icon cropped to a
  circle — subject centred, nothing touching the edge, readable at 60 px.
- **Backdrops / close-ups**: the subject's important area stays inside the phone crop
  (portrait cover-fit crops ~17% on each side of a 900-wide image). A close-up that should also
  look good with the phone held sideways gets a `closeup.wide` landscape backdrop.

## 3. Look at the game — real screenshots
```bash
bash .claude/skills/_shared/serve.sh 8099
OUT=/tmp/tour node .claude/skills/_shared/playtest.cjs --viewport 390x844 \
  --probe .claude/skills/_shared/probes/tour.cjs        # tall phone (PWA / no toolbar)
OUT=/tmp/tour-short node .claude/skills/_shared/playtest.cjs --engine webkit --device "iPhone 13" \
  --probe .claude/skills/_shared/probes/tour.cjs        # short Safari viewport (664 px)
python3 .claude/skills/_shared/contact-sheet.py /tmp/tour
```
The tour asserts the core loop (tap → walk, close-up → reveal → world responsive, stations,
unlocks, guide, save) and screenshots home, create, world, panel, close-up, help, stations.
Checklist:
- **No emoji in the UI** — every icon is an illustrated icon (`GAME.icons`, `{i:key}`).
- **Text**: nothing cut/overflowing, no orphan "!" lines, readable contrast, correct language.
- **Layout**: HUD/panel/toasts don't hide the action; nothing under the notch/home bar;
  the home splash's subject is visible between the hero and the sheet on BOTH tall and
  short screens.
- **World**: characters big enough on a phone; labels readable and never hidden behind
  furniture; nothing walks through furniture; depth sorting correct.
- **Buttons & icons proportion**: slim buttons (44–50 px pills), BIG icons (icon fills
  ~80 % of a tile, or overflows a pill). A fat button with a small icon looks amateur.
- **Transitions** (home → create → world loading, close-up in/out): film the first
  frames after each tap (screenshots every ~120 ms) — no black frame, no empty card/strip
  while things load, nothing popping in place. An empty panel is hidden until it has
  content; the canvas fades in once drawn.
- **Icon highlights**: shines are clipped INSIDE the shape and the outline is drawn last
  (icon-kit `glossy()`); a shine crossing the outline reads as a second shape stacked on
  top, especially greyed out / small.
- **Round buttons**: depth goes INSIDE the disc (inset shade) + a soft drop shadow. A hard
  offset coloured edge under a contrasting ring reads as a second disc stuck under the
  first ("double button") — check them zoomed on BOTH a light and a dark theme.
- **Consistency**: one art style, one outline colour, one icon style, theme colours used.
- **Animations** (unlock reveal, pop-ins): run `probes/reveal.cjs` (`REVEAL=<unlock id>`)
  and look at the frames in order — no flicker / disappear-reappear, no two tweens on the
  same property, item lands and settles before its idle loop.
- **Worst case HUD**: the close-up at max spots (`reveal.cjs` asserts the progress bar
  never overlaps the close button); the race HUD at its longest values on 390 / 360 / 320 px
  (`racehud.cjs`: one row, no overlap, values inside their pills); longest names; short screen.
- **Feedback**: every tap/action has a visible + audible response.

## 3b. Adversarial fresh-eyes review — MANDATORY for new/redrawn art and UI redesigns
Before showing new art to the owner, spawn an INDEPENDENT reviewer agent (no shared context,
never the one that drew it) with the template in `references/adversarial-review.md`, triage
its findings against the owner's decisions, fix, and loop with a NEW reviewer until ≥ 8/10
with nothing that reads wrong at game size. This replaces owner round-trips: the owner
should see art that already survived a critical review.

## 4. Report
List what you checked and every defect found → fix → re-run 1–3. Never declare "done"
on art/UI without having looked at full-size crops and the tour screenshots.

## Chaining
**Engine problems noticed along the way are reported now** (game-engine#18): anything wrong in the
engine layer or its tooling that you noticed during this task — a tool output that looks wrong, a
file the sync left behind, a missing browser, a doc that misled you — goes to **report-upstream**
before you tell the creator, even when the task itself succeeded. Never leave it at a mention or a
link for the creator to click. (In `ludea-ai/*` you ARE upstream: fix it there instead.)
asset generation / UI change → **visual-review** (incl. the adversarial review) → test-debug → release-deploy.
