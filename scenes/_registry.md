# Scenes Registry

Authoritative list of all scenes in this repo.

## Entries

| Scene | File | Status | Purpose | Dependencies |
|-------|------|--------|---------|-------------|
| POCSquareScene | scenes/poc-square.js | Implemented | Proof-of-concept: single arrow-key-controlled square. | RectRenderer, KeyboardMover |
| PongMenuScene | games/pong/scenes/pong-menu.js | Implemented | Title screen for Pong. | (none) |
| PongMatchScene | games/pong/scenes/pong-match.js | Implemented | Core Pong match. TODO: retrofit with PauseOverlay. | RectRenderer, Collider, PongBall, PongPaddlePlayer, PongAI |
| SurvivorsMenuScene | games/survivors/scenes/survivors-menu.js | Implemented | Title screen for Survivors. Creates fresh stats. | (none) |
| SurvivorsLevelupScene | games/survivors/scenes/survivors-levelup.js | Superseded | Original upgrade screen. Replaced by SurvivorsShopScene. Not included in current build. | (none) |
| SurvivorsShopScene | games/survivors/scenes/survivors-shop.js | Implemented | Between-wave shop. All 7 upgrades visible, prices scale per purchase, coins carry over. | (none) |
| SurvivorsMatchScene | games/survivors/scenes/survivors-match.js | Implemented | Core Survivors gameplay. Wave timer, spawner, coin drops, pause overlay. | RectRenderer, Collider, PauseOverlay, SurvivorsPlayerController, SurvivorsProjectile, SurvivorsEnemy, SurvivorsCoin |
