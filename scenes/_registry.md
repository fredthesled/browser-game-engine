# Scenes Registry

Authoritative list of all scenes in this repo. When you create a new scene, add a row here in the same session. When you delete or rename one, update this immediately.

## Format

Each entry includes the scene name, the file path, current status, a one-line purpose, and any notable dependencies.

## Entries

| Scene | File | Status | Purpose | Dependencies |
|-------|------|--------|---------|-------------|
| POCSquareScene | scenes/poc-square.js | Implemented | Proof-of-concept: single arrow-key-controlled square. | RectRenderer, KeyboardMover |
| PongMenuScene | games/pong/scenes/pong-menu.js | Implemented | Title screen for Pong. Registers SFX, waits for Space/Enter. | (none) |
| PongMatchScene | games/pong/scenes/pong-match.js | Implemented | Core Pong match. TODO: retrofit with PauseOverlay (see STATE.md). | RectRenderer, Collider, PongBall, PongPaddlePlayer, PongAI |
| SurvivorsMenuScene | games/survivors/scenes/survivors-menu.js | Implemented | Title screen for Survivors. Creates fresh stats on start. | (none) |
| SurvivorsLevelupScene | games/survivors/scenes/survivors-levelup.js | Implemented | Post-wave upgrade selection. Fade-in, 3 upgrade cards, applies choice to stats. | (none) |
| SurvivorsMatchScene | games/survivors/scenes/survivors-match.js | Implemented | Core Survivors gameplay: wave timer, spawner, player, HUD, death screen, pause overlay. | RectRenderer, Collider, PauseOverlay, SurvivorsPlayerController, SurvivorsProjectile, SurvivorsEnemy |
