#!/usr/bin/env bash
# sync-engine — copy the ENGINE LAYER from a source repo (where it evolved: the showcase,
# or a game) INTO this repo (the template, the showcase or a game).
#
# A template-generated game shares NO git history with the template, so this can't be a
# merge. But the engine layer is a known set of files with NO game content (proven by
# separation-audit), so we just check those paths out of the game and review.
#
# Pulls ONLY: engine.js, engine.css, ENGINE.md, .claude/skills/ (incl. _shared tooling).
# Never touches game content: game.config.js, assets/, index.html, style.css,
# manifest.webmanifest, README.md, tools/, .claude/settings*.json.
# Does NOT commit — you review the diff, then commit. Run from the TARGET repo root.
#
# Refuses to overwrite LOCAL engine-layer changes that Ludea doesn't have yet (they would be
# lost): report them first (skill report-upstream), or pass --force once they are reported.
# Afterwards it rewrites .claude/skills/_shared/engine-manifest.json (the engine fingerprint).
#
#   bash .claude/skills/_shared/sync-engine.sh <game-git-url|remote-name> [ref] [--force]
#   (a game outside the Ludea organisation updates from https://github.com/ludea-ai/game-engine.git)
set -euo pipefail
FORCE=""; ARGS=(); for a in "$@"; do [ "$a" = "--force" ] && FORCE=1 || ARGS+=("$a"); done; set -- "${ARGS[@]}"
SRC="${1:?usage: sync-engine.sh <game-git-url|remote-name> [ref=main]}"
REF="${2:-main}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$ROOT"

# Safety: refuse on a dirty tree so the review diff is unambiguous.
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean — commit or stash first, then re-run."; exit 1; fi

# Safety: local engine changes not yet upstream would be overwritten.
UP=.claude/skills/_shared/upstream.cjs
if [ -z "$FORCE" ] && [ -f "$UP" ] && [ -f .claude/skills/_shared/engine-manifest.json ]; then
  if ! node "$UP" drift --upstream >/tmp/sync-drift.txt 2>&1; then
    cat /tmp/sync-drift.txt
    echo "This repo changed the engine layer and Ludea doesn't have it yet — the sync would erase it."
    echo "Run the report-upstream skill first (or re-run with --force once it is reported)."; exit 1; fi
fi

# Resolve SRC to a remote (reuse an existing remote name, else add a temp one).
TMP=""
if git remote get-url "$SRC" >/dev/null 2>&1; then REMOTE="$SRC"; else
  REMOTE="_syncsrc"; TMP=1
  git remote remove "$REMOTE" 2>/dev/null || true
  git remote add "$REMOTE" "$SRC"
fi
cleanup() { [ -n "$TMP" ] && git remote remove "$REMOTE" 2>/dev/null || true; }
trap cleanup EXIT

echo "Fetching $REMOTE ($REF)…"
git fetch --depth=1 "$REMOTE" "$REF"

PATHS=(engine.js engine.css ENGINE.md .claude/skills)
echo "Pulling engine layer: ${PATHS[*]}"
git checkout "$REMOTE/$REF" -- "${PATHS[@]}"

echo; echo "== engine manifest =="; node .claude/skills/_shared/upstream.cjs write-manifest && git add .claude/skills/_shared/engine-manifest.json
echo; echo "== separation audit =="; node .claude/skills/_shared/separation-audit.cjs || true
echo; echo "== engine syntax ==";   node --check engine.js && echo "engine.js OK"

cat <<'NEXT'

Engine layer staged. Next:
  1. Review:  git status   &&   git diff --cached
  2. Game files were intentionally NOT touched (config/assets/index.html/style.css/
     manifest/README/tools). Merge CLAUDE.md conventions by hand if they changed.
  3. In the showcase, upgrade its config to exercise any new flagship capability —
     that's game content, authored there, not pulled.
  4. Verify on this repo's game:  bash .claude/skills/_shared/serve.sh
       node .claude/skills/_shared/playtest.cjs            # + --engine webkit for touch
  5. Commit.
NEXT
