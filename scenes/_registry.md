# Scenes Registry

Authoritative list of all scenes in this repo. When you create a new scene, add a row here in the same session. When you delete or rename one, update this immediately.

## Format

Each entry includes the scene name, the file path, current status, a one-line purpose, and any notable dependencies (object types or scripts the scene relies on).

## Entries

| Scene | File | Status | Purpose | Dependencies |
|-------|------|--------|---------|-------------|
| POCSquareScene | scenes/poc-square.js | Implemented | Proof-of-concept scene with a single arrow-key-controlled square. Verifies the engine end to end. | RectRenderer, KeyboardMover |
| PongMenuScene | games/pong/scenes/pong-menu.js | Implemented | Title and start screen for Pong. Registers SFX and waits for Space/Enter to begin match. | (none; no GameObjects) |
| PongMatchScene | games/pong/scenes/pong-match.js | Implemented | Core Pong match: paddles, ball, scoring via ball_scored signal, win detection, transition back to menu. | RectRenderer, Collider, PongBall, PongPaddlePlayer, PongAI |
