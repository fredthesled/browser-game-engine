#!/usr/bin/env bash
# =============================================================================
# scripts/build-game.sh
# =============================================================================
# Assembles one self-contained HTML game file from a build manifest.
# Called by .github/workflows/build.yml for every game that has a manifest.
# Can also be run locally if bash and jq are available.
#
# Usage:
#   bash scripts/build-game.sh games/<name>/build-manifest.json
#
# ----------------------------------------------------------------------------
# Manifest format  (games/<name>/build-manifest.json)
# ----------------------------------------------------------------------------
# {
#   "game":      "drift",              -- short identifier (used in logs)
#   "title":     "Drift",              -- inserted into the HTML <title> tag
#   "output":    "build/drift.html",   -- output path relative to repo root
#   "concat": [                        -- source files in strict concat order
#     "engine/lib/inkjs.js",           -- load-order-sensitive: list carefully
#     "engine/engine.bundle.js",
#     "scripts/bootstrap.js",
#     "scripts/pause-overlay.js",
#     "games/drift/encounters/sources.js",
#     "games/drift/scenes/menu.js",
#     "games/drift/scenes/match.js",
#     "games/drift/scenes/game-over.js"
#   ],
#   "bootstrap": "bootstrapGame({...});"  -- JS appended after all sources;
#                                           use bootstrapGame() for new games
# }
#
# ----------------------------------------------------------------------------
# Notes
# ----------------------------------------------------------------------------
# - All paths in "concat" are relative to the repository root.
# - Files are validated before any output is written; the build fails fast
#   if a listed file is missing rather than producing a broken HTML.
# - The script writes a single <script> block containing all concatenated
#   source files followed by the bootstrap call. No ES modules; no bundler.
# - Depends on: bash, cat, jq  (all present on ubuntu-latest runners).
# =============================================================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path-to-build-manifest.json>" >&2
  exit 1
fi

MANIFEST="$1"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: Manifest not found: $MANIFEST" >&2
  exit 1
fi

GAME=$(jq -r '.game'      "$MANIFEST")
TITLE=$(jq -r '.title'     "$MANIFEST")
OUTPUT=$(jq -r '.output'   "$MANIFEST")
BOOTSTRAP=$(jq -r '.bootstrap' "$MANIFEST")

# ---- Validate source files before writing anything -------------------------

CONCAT_FILES=()
while IFS= read -r filepath; do
  if [ ! -f "$filepath" ]; then
    echo "ERROR: Source file not found: $filepath" >&2
    echo "       (referenced in $MANIFEST)" >&2
    exit 1
  fi
  CONCAT_FILES+=("$filepath")
done < <(jq -r '.concat[]' "$MANIFEST")

if [ "${#CONCAT_FILES[@]}" -eq 0 ]; then
  echo "ERROR: .concat array is empty in $MANIFEST" >&2
  exit 1
fi

# ---- Assemble the HTML -----------------------------------------------------

mkdir -p "$(dirname "$OUTPUT")"

{
  cat <<HTML
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<style>
  html, body {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    background: #000;
    overflow: hidden;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="game"></canvas>
<script>
HTML

  for filepath in "${CONCAT_FILES[@]}"; do
    printf '\n/* ==== %s ==== */\n' "$filepath"
    cat "$filepath"
  done

  printf '\n%s\n' "$BOOTSTRAP"

  cat <<HTML
</script>
</body>
</html>
HTML
} > "$OUTPUT"

SIZE=$(wc -c < "$OUTPUT")
echo "OK  ${OUTPUT}  (${SIZE} bytes)"
