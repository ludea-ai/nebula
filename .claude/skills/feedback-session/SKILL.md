---
name: feedback-session
description: "Feedback session" mode where a NON-TECHNICAL person (a player — the game's creator or the people they made it for, even children) drives changes to a game built on this engine from their feedback, with NO technical questions. Enter when the user says e.g. "my daughter will give feedback" / "start a playtest session" / "the players have feedback"; exit with "we're done with feedback". Classifies each item (bug or idea), clarifies only the functional side in plain words, chains the other skills automatically, and confirms simply. Triggers: "feedback session", "they have feedback to give", "we're done with feedback".
---

# feedback-session ⭐ (orchestrator)

Let a **non-technical person** evolve the game **themselves**, speaking normally. All
the technical work happens **behind the scenes, silently**.

## 🔀 Mode toggle (respect strictly)
- **ENTER** when you hear: **"… will give feedback"** / **"… has feedback to give"** /
  **"start a feedback/playtest session"** (or clear variants). Note **who** is giving
  feedback and the game's **audience** (`GAME.meta.audience`) to set the tone.
- **STAY** in the mode for all following items — **persistent**.
- **EXIT** (back to normal dev mode) on: **"we're done with feedback"** / **"… is
  finished giving feedback"**.
- In dev mode (default): normal technical Claude Code behaviour.

## Rules of feedback mode (imperative)
- **NO technical questions.** No jargon, file names, code, or deploy options.
- **NEVER explain the "how".** The person must see none of your mechanics: no "I'm
  reading the sheet", "I edit the file", "I add the animation", no function/file names,
  no steps, no play-by-play between tools. All the work (reading code, screenshots,
  tests, deploy…) is done **in silence**.
- **At most 2 messages per item** addressed to the person:
  1. **One short, warm acknowledgement** at the start (e.g. "Great idea! Let me set
     that up for you… ✨"). No details on what you'll do or how long.
  2. **The final confirmation** once it's live (step 5).
  (+ optionally **one** functional question if truly necessary.)
  Between the two: **total silence** on their side — you work, you write nothing.
- **Allowed questions: functional only**, simple, and **only if needed**. Via
  **AskUserQuestion**, in the person's own words and tone.
- **Kind, encouraging language.** No technical errors shown.
- **Audience-appropriate safety** everywhere (especially `asset-search`).

## Per-item flow
1. **Listen** to the item (text/dictation), e.g. "the creature doesn't move when I feed
   it", "I want butterflies in the forest".
2. **Classify** yourself: 🐛 **bug** or ✨ **idea**.
3. **Clarify** only if needed (1 small functional question max).
4. **Do the work in silence** (no message during this step) by chaining the skills:
   - ✨ Visual idea (new element) → draw it in the game's art module (`tools/art/`)
     — or **asset-search** (with suitability check) → **asset-add** if an external asset
     really fits the style — → (**add-decor-item** / **add-creature-variant** /
     **add-character** / **add-collision** / **place-scatter**) → **visual-review** →
     **test-debug** → **map-verify** → **capitalize-learnings** → **release-deploy**.
   - ✨ Rule/feature idea (goals, breeding, …) → code → **state-migration** if it
     saves → **test-debug** → **capitalize-learnings** → **release-deploy**.
   - 🐛 Bug → **test-debug** (repro + cause + fix + regression) → **visual-review** /
     **map-verify** if visual → **capitalize-learnings** → **release-deploy**.
   - Feedback about QUALITY ("ugly", "not professional", "looks weird") → treat it as a
     bug of the checks too: fix the result AND extend **visual-review** so the defect
     class is caught next time; record the rule in CLAUDE.md §9 (quality bar).
   - In every branch, **capitalize-learnings** runs just before shipping: fold any
     reusable insight back into the engine/skills/docs and audit the separation.
   - **Keep a trail**: create/update a **GitHub issue** (via GitHub MCP) for the
     maintainer, and commit/push.
5. **Confirm in plain words** once it's live, e.g.: "Done! ✨ Now when you feed your
   critter, it bobs its head. Tap 🔄 Refresh and have a look!" — and offer to **undo**
   simply ("Want me to remove it?").

## When stuck
- Show no technical error. Fail **gently**: "I couldn't manage that one this time —
  the maintainer can take a look." — and **leave a technical trace in the issue**
  (diagnosis, file:line).

## Undo
- "Undo" = revert to the previous state (`git revert` of the last related commit, then
  **release-deploy**), confirmed in plain words.

## See also
`references/examples.md` (feedback → action → confirmation phrasing).
