# Scripts Registry

Authoritative list of all attachable behavior scripts in this repo. When you create a new script, add a row here in the same session. When you delete or rename one, update this immediately.

## Format

Each entry includes the script name, the file path, current status, a one-line purpose, and the lifecycle hooks the script implements.

## Entries

| Script | File | Status | Purpose | Lifecycle hooks used |
|--------|------|--------|---------|----------------------|
| RectRenderer | scripts/rect-renderer.js | Implemented | Draws a filled rectangle centered at the host's position. Configurable width, height, and color. | draw |
| KeyboardMover | scripts/keyboard-mover.js | Implemented | Moves the host based on arrow keys. Diagonal movement is normalized so diagonal speed equals cardinal speed. | update |
| Collider | scripts/collider.js | Implemented | AABB collision. Detected pairs invoke onCollide(other) on each. Configurable width, height, tag, and onCollide callback. Detected by Scene via duck-typing on `isCollider`. | (none directly; relies on Scene's collision pass) |
| PongBall | games/pong/scripts/ball.js | Implemented | Ball movement, wall bouncing, and scoring for Pong. Sets isCollider=true and implements getAabb()/onCollide() directly per ADR-0010. Emits `ball_scored` signal. | update, draw, (isCollider: getAabb, onCollide) |
| PongPaddlePlayer | games/pong/scripts/paddle-player.js | Implemented | Player-controlled paddle for Pong. Arrow Up/Down or W/S. Vertical movement only, clamped to canvas bounds. | update |
| PongAI | games/pong/scripts/paddle-ai.js | Implemented | AI opponent paddle for Pong. Chases ball Y at fixed speed (250 px/s, below player's 340). | update |
