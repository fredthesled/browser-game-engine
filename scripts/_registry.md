# Scripts Registry

Authoritative list of all attachable behavior scripts in this repo. When you create a new script, add a row here in the same session. When you delete or rename one, update this immediately.

## Notes on non-Script entries

`PauseOverlay` is a plain utility class, not a Script subclass. It lives in `scripts/` as the closest available folder.

## Entries

| Script | File | Status | Purpose | Lifecycle hooks used |
|--------|------|--------|---------|----------------------|
| RectRenderer | scripts/rect-renderer.js | Implemented | Draws a filled rectangle centered at the host's position. | draw |
| KeyboardMover | scripts/keyboard-mover.js | Implemented | Moves host based on arrow keys. Normalized diagonal. | update |
| Collider | scripts/collider.js | Implemented | AABB collision via ADR-0010 duck-type contract. | (relies on Scene collision pass) |
| PauseOverlay | scripts/pause-overlay.js | Implemented | Utility (not Script subclass). ESC pause with volume/mute controls and optional quit. | (plain class: toggle, isPaused, update, draw) |
| SpriteSheet | scripts/sprite-sheet.js | Implemented | Sprite sheet animation player. Loads image by data URI, cuts frames by (col,row), manages named animation states with fps and loop control. Module-level image cache. API: play(name,force), isDone(), setFlipX(bool), .alpha, .currentAnim, setSrc(src). | on_enter, update, draw |
| ShapeSprite | scripts/shape-sprite.js | Implemented | Procedural sprite renderer (Shape DSL). Animations are JS draw functions receiving { anim, t, flipX } where t is normalized 0..1 over duration. Sister to SpriteSheet; method surface deliberately matches: play(name,force), isDone(), setFlipX(b), getFlipX(), .alpha, .currentAnim. Performance acceptable for under ~20 entities; for higher counts prefer cached rasters via SpriteSheet. See ADR-0015. | update, draw |
| PongBall | games/pong/scripts/ball.js | Implemented | Ball movement, wall bouncing, scoring. Emits `ball_scored`. | update, draw, isCollider |
| PongPaddlePlayer | games/pong/scripts/paddle-player.js | Implemented | Player paddle. Arrow Up/Down or W/S. | update |
| PongAI | games/pong/scripts/paddle-ai.js | Implemented | AI paddle. Chases ball Y at 250 px/s. | update |
| SurvivorsPlayerController | games/survivors/scripts/player-controller.js | Implemented | Player movement + auto-fire within stats.range. Draws subtle range circle. Multi-shot fires odd counts (always includes center shot). | update, draw |
| SurvivorsProjectile | games/survivors/scripts/projectile.js | Implemented | Projectile. isCollider. Handles enemy damage in onCollide (order-independent). Passes coinValue in survivors_enemy_died. | update, draw, isCollider |
| SurvivorsEnemy | games/survivors/scripts/enemy.js | Implemented | Enemy. isCollider. 'straight' or 'sine' movement. Carries coinValue. Emits survivors_player_hit on player contact. | update, draw, isCollider |
| SurvivorsCoin | games/survivors/scripts/coin.js | Implemented | Coin dropped on enemy death. Stationary, 20s lifetime. Emits survivors_coin_collected on player contact, survivors_remove on collect or expire. | update, draw, isCollider |
| ClownPlayer | games/clown-brawler/scripts/clown-player.js | Implemented | Player controller for Clown Brawler. Belt-plane movement (WASD/arrows), punch with per-swing hit dedup (punchHitSet). i-frames on hit. Emits brawler_player_hurt, brawler_player_died. | update, draw |
| GorillaEnemy | games/clown-brawler/scripts/gorilla-enemy.js | Implemented | Gorilla enemy AI. States: walking/attacking/stunned/dying/dead. Draws party balloon while alive; balloon detaches on death. Emits brawler_gorilla_attack, brawler_balloon_release, brawler_remove. | update, draw |
| FloatingBalloon | games/clown-brawler/scripts/floating-balloon.js | Implemented | Detached balloon spawned on gorilla death. Floats upward with random lateral drift, fades over ~2.5s. Emits brawler_remove at alpha 0. | update, draw |
