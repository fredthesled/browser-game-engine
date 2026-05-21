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
#   "game":    "drift",               -- short identifier (used in logs)
#   "title":   "Drift",               -- inserted into the HTML <title> tag
#   "output":  "build/drift.html",    -- output path relative to repo root
#
#   "assets": [                       -- OPTIONAL. Binary files to inline as
#     "games/drift/assets/ship.png",  -- base64 data URIs. Injected before
#     "games/drift/assets/bg.webp"    -- source files as ASSETS["key"] vars.
#   ],                                -- Key = filename without extension.
#                                     -- Supported: png, jpg/jpeg, webp, gif.
#                                     -- SVG is not supported here; use
#                                     -- ShapeSprite for procedural SVG-like
#                                     -- content instead.
#
#   "concat": [                       -- source files in strict concat order
#     "engine/lib/inkjs.js",          -- load-order-sensitive: list carefully
#     "engine/engine.bundle.js",
#     "scripts/bootstrap.js",
#     "scripts/pause-overlay.js",
#     "games/drift/scenes/menu.js",
#     "games/drift/scenes/match.js"
#   ],
#   "bootstrap": "bootstrapGame({...});"  -- JS appended after all sources
# }
#
# ----------------------------------------------------------------------------
# Asset inlining details
# ----------------------------------------------------------------------------
# Each file in "assets" is base64-encoded (GNU base64 -w 0, no line wrapping)
# and written into the HTML as a JS variable before the concatenated sources:
#
#   var ASSETS = {};
#   ASSETS["ship"] = "data:image/png;base64,iVBOR...";
#   ASSETS["bg"]   = "data:image/webp;base64,UklGR...";
#
# Game source files can then reference:
#   const sprite = new SpriteSheet(host, { src: ASSETS['ship'], ... });
#
# Size note: base64 encodes at ~4:3. A 60 KB PNG becomes ~80 KB of text.
# Staying under ~200 KB total assets keeps the HTML file below 1 MB.
#
# ----------------------------------------------------------------------------
# Notes
# ----------------------------------------------------------------------------
# - All paths in "concat" and "assets" are relative to the repository root.
# - Files are validated before any output is written; the build fails fast
#   if a listed file is missing rather than producing a broken HTML.
# - The script writes a single <script> block containing all concatenated
#   source files followed by the bootstrap call. No ES modules; no bundler.
# - Depends on: bash, cat, jq, base64  (all present on ubuntu-latest).
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

GAME=$(jq -r '.game'           "$MANIFEST")
TITLE=$(jq -r '.title'          "$MANIFEST")
OUTPUT=$(jq -r '.output'        "$MANIFEST")
BOOTSTRAP=$(jq -r '.bootstrap'  "$MANIFEST")

# ---- Validate asset files (optional section) --------------------------------

ASSET_FILES=()
if jq -e '.assets // empty' "$MANIFEST" > /dev/null 2>&1; then
  while IFS= read -r filepath; do
    if [ ! -f "$filepath" ]; then
      echo "ERROR: Asset file not found: $filepath" >&2
      echo "       (referenced in $MANIFEST)" >&2
      exit 1
    fi
    ASSET_FILES+=("$filepath")
  done < <(jq -r '.assets[]' "$MANIFEST")
fi

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

  # ---- Inline binary assets as base64 data URIs ---------------------------
  # Emits a global ASSETS object before all source files so game code can
  # reference ASSETS["key"] as the src argument to SpriteSheet or any other
  # image consumer.
  if [ "${#ASSET_FILES[@]}" -gt 0 ]; then
    printf '\n/* ==== assets (auto-inlined from manifest) ==== */\n'
    printf 'var ASSETS = {};\n'
    for filepath in "${ASSET_FILES[@]}"; do
      filename=$(basename "$filepath")
      key="${filename%.*}"          # strip extension to get the ASSETS key
      ext="${filename##*.}"
      case "${ext,,}" in            # match lowercase extension
        png)       mime="image/png"  ;;
        jpg|jpeg)  mime="image/jpeg" ;;
        webp)      mime="image/webp" ;;
        gif)       mime="image/gif"  ;;
        *)
          echo "WARNING: Unsupported asset type '.$ext' for $filepath; skipping." >&2
          echo "         Supported types: png, jpg, jpeg, webp, gif." >&2
          continue
          ;;
      esac
      b64=$(base64 -w 0 "$filepath")
      printf 'ASSETS["%s"] = "data:%s;base64,%s";\n' "$key" "$mime" "$b64"
      echo "  asset: $filepath  ->  ASSETS[\"$key\"]  ($(( ${#b64} / 1024 )) KB base64)" >&2
    done
  fi

  # ---- Concatenate source files -------------------------------------------
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
