---
name: capitalize-learnings
description: Capture the learnings from a game change (new feature OR bug fix) back into the ENGINE, the SKILLS, the shared tooling and the docs — so the template gets richer every time, and the engine/game separation stays clean. Use systematically after evolving a game built on this engine: once a feature works or a bug is fixed, before moving on. Triggers: "we just added/fixed X", "capitalise this", "generalise it into the engine", "harvest the learnings", "fold this back into the template", after test-debug / before release-deploy.
---

# capitalize-learnings

Every change teaches something. This skill turns that into durable value: a **generic
engine capability**, a **documented pitfall**, a **better/!new skill**, or a **tooling
improvement** — never a one-off. It also **guards the golden rule**: game content never
leaks into the engine.

Run it **after** a feature works or a bug is fixed (proven via **test-debug**), and
**before** **release-deploy**. The orchestrators (**feedback-session**) should call it for
each item that produced a reusable insight.

## 1. Name the learnings
From the diff just made, list what was actually learned (be concrete):
- A **new capability** that other games could want (a loop, an indicator, an action type…).
- A **bug class + its fix pattern** (e.g. an iOS pointer-capture freeze → geometry hit-test).
- A **tooling gap** you hit (a missing test mode, an emulation, a check).
- A **content/UX rule** (audience safety, early-reader text, touch ergonomics).
- Something that is **purely this game** (art, copy, palette) → it stays in the game.

## 2. Route each learning to its home
| The learning is… | Put it in… |
| --- | --- |
| A reusable mechanic/system | `engine.js` as a **generic, config-gated** feature (no game words) **+** document the config in `ENGINE.md` (and its capability line). |
| A pitfall / pattern to never re-discover | a **"notes" section in `ENGINE.md`** (e.g. *iOS / touch robustness*) and/or the relevant skill. |
| A repeatable procedure | an **existing skill** (extend it) or a **new skill** in `.claude/skills/<name>/SKILL.md` (game-agnostic, operates on the config). |
| A missing test/visual/check capability | the **shared tooling** in `.claude/skills/_shared/` (e.g. a `playtest.cjs` flag). |
| A golden-rule nuance / cross-cutting convention | `CLAUDE.md` (§ Conventions). |
| Game-specific art/copy | the **game** only (`game.config.js`, `tools/…`, assets) — **not** the engine. |
| **Owner / user feedback on quality** ("ugly", "not pro", "the head floats", "emoji icons") | a rule in **`CLAUDE.md` §9 (quality bar)** **+** a check in **visual-review** (checklist line) or `_shared/art-check.cjs` / `probes/` so the same class of defect is caught automatically next time. |

Prefer **extending** an existing skill over creating a new one. Create a new skill only
when the procedure is distinct and reusable across games. New skills follow the house
style: YAML frontmatter (`name`, `description` with **Triggers:**), then a short
procedure + guard-rails + chaining; English; act on `GAME`/config, never hard-code a game.

## 3. Enforce separation (golden rule)
Any engine addition must be **generic and config-gated** — read from `GAME`, no-op when
absent, no game nouns/strings (use `META.x || "English fallback"`). Then **prove it**:
```bash
node .claude/skills/_shared/separation-audit.cjs   # engine has no game text; config has no logic
```
Fix anything it flags (move copy to config as a fallback-guarded string; move logic out of
the config). Exit 0 = clean.

## 4. Verify, document, register
1. **Static + runtime**: `node --check engine.js && node --check game.config.js`, then a
   **test-debug** pass (and `--engine webkit` if the learning is touch/iOS).
2. **Docs**: update `ENGINE.md` (schema + the *Capabilities* list) for any new engine
   feature; update `_shared/README.md` for any new tooling; update `CLAUDE.md` skill list
   for any new skill.
3. **Look**: run **visual-review** (art-check + tour screenshots + checklist) whenever art
   or UI changed — and add any new defect class you discovered to its checklist.
4. **Report upstream**: in a game repo (not `ludea-ai/game-engine` / `ludea-ai/nebula`), every
   learning that belongs to the engine layer — an engine/skill/tooling change made here, or a
   failure of a skill/tool/doc you hit — goes back to Ludea with **report-upstream** (automatic,
   silent, de-duplicated). In the template you ARE upstream: the change ships in the engine
agent's batch PR (procedure in `ludea-ai/agents`), tried on Nebula first.
5. **Engine version**: `node .claude/skills/_shared/update-check.cjs` — if a newer Ludea engine or a
   catalogue update is pending, mention it to the creator in one sentence (update / publish).
6. **Ship**: hand off to **release-deploy** (bumps `vN`, commits, deploys, verifies).

## Guard-rails
- **Never put game content in `engine.js`.** If the engine truly lacks something, add it as
  a generic, config-gated feature — never tied to one game. The audit must stay green.
- A learning isn't captured until it's **in code/docs and verified**, not just described.
- Don't create a near-duplicate skill — extend the closest existing one.
- Keep new engine features **off by default** (config-gated), so existing games are unaffected.

## Chaining
After **test-debug** (proof) → **capitalize-learnings** (harvest) → **report-upstream** (games
only: tell Ludea) → **release-deploy** (ship).
Called by **feedback-session** for any item that produced a reusable insight.
