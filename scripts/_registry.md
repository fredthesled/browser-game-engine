# Scripts Registry

Authoritative list of all attachable behavior scripts in this repo. When you create a new script, add a row here in the same session. When you delete or rename one, update this immediately.

## Format

Each entry includes the script name, the file path, current status, a one-line purpose, and the lifecycle hooks the script implements.

## Notes on non-Script entries

`PauseOverlay` is a plain utility class, not a Script subclass. It lives in `scripts/` as the closest available folder. A `utils/` folder may be warranted once more non-Script utilities accumulate.

## Entries

| Script | File | Status | Purpose | Lifecycle hooks used |
|--------|------|--------|---------|----------------------|
| RectRenderer | scripts/rect-renderer.js | Implemented | Draws a filled rectangle centered at the host's position. Configurable width, height, and color. | draw |
| KeyboardMover | scripts/keyboard-mover.js | Implemented | Moves the host based on arrow keys. Diagonal movement is normalized so diagonal speed equals cardinal speed. | update |
| Collider | scripts/collider.js | Implemented | AABB collision. Detected pairs invoke onCollide(other) on each. Configurable width, height, tag, and onCollide callback. Detected by Scene via duck-typing on `isCollider`. | (none directly; relies on Scene's collision pass) |
| PauseOverlay | scripts/pause-overlay.js | Implemented | Plain utility class (not a Script subclass). ESC-to-pause overlay with volume/mute controls and optional quit-to-menu. Owned and delegated to by any game scene. | (plain class: toggle(), isPaused(), update(dt), draw(ctx)) |
| PongBall | games/pong/scripts/ball.js | Implemented | Ball movement, wall bouncing, and scoring for Pong. isCollider=true per ADR-0010. Emits `ball_scored`. | update, draw, isCollider |
| PongPaddlePlayer | games/pong/scripts/paddle-player.js | Implemented | Player-controlled paddle. Arrow Up/Down or W/S. | update |
| PongAI | games/pong/scripts/paddle-ai.js | Implemented | AI opponent paddle. Chases ball Y at 250 px/s. | update |
| SurvivorsPlayerController | games/survivors/scripts/player-controller.js | Implemented | Player movement (WASD/arrows) and auto-fire for Survivors. Finds nearest enemy, fires SurvivorsProjectile at stats.fireRate. Multi-shot fans around aim angle. | update |
| SurvivorsProjectile | games/survivors/scripts/projectile.js | Implemented | Projectile for Survivors. isCollider=true. Handles all enemy damage in onCollide (order-independent design). Emits survivors_remove and survivors_enemy_died. | update, draw, isCollider |
| SurvivorsEnemy | games/survivors/scripts/enemy.js | Implemented | Enemy for Survivors. isCollider=true. 'straight' or 'sine' movement toward player. Emits survivors_player_hit on contact. | update, draw, isCollider |
