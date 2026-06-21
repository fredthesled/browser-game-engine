#!/usr/bin/env bash
# =============================================================================
# scripts/scaffold-game.sh
# =============================================================================
# Creates a new game skeleton under games/<name>/.
# Called by .github/workflows/scaffold.yml on workflow_dispatch.
# Can also be run locally if bash is available.
#
# Usage:
#   bash scripts/scaffold-game.sh <name> <title>
#
# Arguments:
#   name    Game slug — lowercase, URL-safe (e.g. "snake", "my-game").
#           Becomes the directory name, the output filename, and the gameName
#           passed to bootstrapGame.
#   title   Display title shown in the browser tab and the placeholder scene
#           (e.g. "Snake", "My Game").
#
# Creates:
#   games/<name>/scenes/menu.js          — placeholder MenuScene
#   games/<name>/build-manifest.json     — build manifest skeleton
#
# After scaffolding, edit the manifest and scenes to taste, then push.
# The CI build pipeline (ADR-0019) discovers manifests automatically.
# If you add a new shared script to scripts/ or scenes/, register it in
# the folder's _registry.md before pushing (ADR-0023).
# =============================================================================

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <name> <title>" >&2
  exit 1
fi

NAME="$1"
TITLE="$2"
GAME_DIR="games/$NAME"

# ---- Validate name ----------------------------------------------------------
if [[ ! "$NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "ERROR: name must start with a lowercase letter and contain only" >&2
  echo "       lowercase letters, digits, and hyphens. Got: $NAME" >&2
  exit 1
fi

if [ -d "$GAME_DIR" ]; then
  echo "ERROR: $GAME_DIR already exists. Aborting to avoid overwriting." >&2
  exit 1
fi

# ---- Create directory structure ---------------------------------------------
mkdir -p "$GAME_DIR/scenes"

# ---- Write build manifest ---------------------------------------------------
cat > "$GAME_DIR/build-manifest.json" <<JSON
{
  "game":    "$NAME",
  "title":   "$TITLE",
  "output":  "build/$NAME.html",
  "concat": [
    "engine/engine.bundle.js",
    "scripts/bootstrap.js",
    "scripts/pause-overlay.js",
    "games/$NAME/scenes/menu.js"
  ],
  "bootstrap": "bootstrapGame({ canvas: document.getElementById('game'), gameName: '$NAME', initialScene: () => new MenuScene() });"
}
JSON

# ---- Write placeholder menu scene ------------------------------------------
cat > "$GAME_DIR/scenes/menu.js" <<JS
// games/$NAME/scenes/menu.js
// Placeholder MenuScene — replace with real logic.
class MenuScene extends Engine.Scene {
  constructor(game) {
    super(game);
  }

  on_enter() {
    // Called once when this scene becomes active.
  }

  update(dt) {
    // Menu input handling goes here.
  }

  draw(ctx) {
    const W = this.game.width, H = this.game.height;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$TITLE', W / 2, H / 2 - 24);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('(placeholder — edit menu.js)', W / 2, H / 2 + 24);
  }
}
JS

echo "Scaffolded $GAME_DIR:"
echo "  $GAME_DIR/build-manifest.json"
echo "  $GAME_DIR/scenes/menu.js"
