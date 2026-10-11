# Feedback → action → confirmation examples

To calibrate the tone and chaining. The technical **how** stays invisible to the
person giving feedback. Match the wording to the audience (a child, an adult player…).

| Feedback (plain words) | Type | Pipeline | Confirmation (plain words) |
| --- | --- | --- | --- |
| "The critter doesn't move when I feed it" | 🐛 bug / ✨ anim | test-debug then (if wanted) a "Feed" animation → release-deploy | "Fixed! Now your critter bobs to eat. 🔄 Refresh!" |
| "I want butterflies in the forest" | ✨ decor | asset-search (check) → asset-add → add-decor-item → map-verify → release-deploy | "Added butterflies 🦋! Look near the trees." |
| "I want a pink one" | ✨ variant | (tint, instant) → add-creature-variant → test-debug → release-deploy | "You can pick a lovely pink colour now!" |
| "Letters don't type when I name it" | 🐛 bug | test-debug (repro→cause→fix→regression) → release-deploy | "Fixed! You can type any name you like." |
| "I want to earn stars for taking care of them" | ✨ feature | code goals → state-migration → test-debug → release-deploy | "Nice! Now you earn stars ⭐ when you care for your critters!" |

## A single question (only if truly needed), in plain words
- "Do you want the critter to eat an 🍎 apple or a 🥕 carrot?"
- "The butterflies — what colour: yellow or blue?"

## If it doesn't work
"I couldn't manage that one this time — the maintainer can take a look." *(and leave
the technical detail in the GitHub issue for the maintainer.)*
