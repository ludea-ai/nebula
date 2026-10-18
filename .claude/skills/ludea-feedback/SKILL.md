---
name: ludea-feedback
description: The game's CREATOR gives feedback on the Ludea engine itself — "it would be great if the engine could…", "this skill annoyed me", "this was hard to do". Qualifies each item (bug, idea, or an improvement already built in this game), asks at most one plain-words question, de-duplicates and files it as an issue on ludea-ai/game-engine (or a one-click prefilled link). Not for feedback on the GAME by its players (that is feedback-session). Triggers: "/ludea-feedback", "feedback for the engine", "I'd like the engine to…", "suggest an engine improvement", "the engine should…".
---

# ludea-feedback (creator → Ludea, on demand)

**report-upstream** sends back automatically what the WORK taught. This skill is the
creator's own voice: wishes, irritations, ideas about the engine, the skills, the template,
the docs or the catalogue. Same inbox (`ludea-ai/game-engine` issues), same triage.

## Flow (per item — the creator may give several in one go)
1. **Listen.** Let them speak normally (often dictated by voice: re-read ambiguous words).
2. **Qualify** yourself, don't ask them to:
   - **bug** — something in the engine/skills/tooling misbehaved;
   - **contribution** — they describe something ALREADY built in their game
     (`node .claude/skills/_shared/upstream.cjs drift --upstream` shows it) → hand over to
     **report-upstream** for that item (it attaches the patch);
   - **idea** — a new capability / skill / workflow not built yet.
   - Purely about THIS game (art, a rule of their game) → it's not engine feedback: offer to
     do it in the game instead (feedback-session / normal work).
3. **Clarify** only if the item can't be understood or reproduced: ONE functional question
   (AskUserQuestion), in their words. Never technical.
4. **Generalise**: rewrite it so it is useful to every game ("let a mission be on foot OR
   riding", not "in Poulpy the turtle…") — keep their game as the example in *Context*.
5. **De-duplicate** (GitHub MCP `search_issues` on `ludea-ai/game-engine`, open + closed): if it
   exists, add a comment "+1 from <repo>: <their angle>" instead.
6. **File it** exactly as report-upstream §3–4 (same body format and marker, `kind=idea|bug`,
   plus a line `Source: creator feedback`), title `[idea] …` / `[bug] …`. Route: MCP → gh →
   prefilled link (`upstream.cjs url`).
7. **Confirm** in one or two plain sentences, in their language, with the issue link:
   « C'est noté ! Ton idée est arrivée chez Ludea (lien). Si elle est retenue, ton jeu en
   profitera automatiquement à la prochaine mise à jour du moteur. »
   Log it: `upstream.cjs log --add idea:<short key> --issue <url>`.

## Guard-rails
- Public issue: no personal data, no children's names, nothing private.
- No promise of a date or of acceptance — the maintainers decide.
- Don't implement engine changes here to "help": if they want it NOW in their game, build it
  in their game as a generic, config-gated feature, then **report-upstream** (contribution).

## Chaining
→ **report-upstream** for contributions. For player feedback on the game: **feedback-session**.
To submit the finished game to the catalogue: **ludea-publish**.
