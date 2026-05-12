# Scenes Registry

Authoritative list of all scenes in this repo.

Status values: `Implemented` (active, in at least one build), `DEAD` (marked for removal, banner-tagged per `docs/DEAD_FILES.md`).

## Entries

| Scene | File | Status | Purpose | Dependencies |
|-------|------|--------|---------|-------------|
| POCSquareScene | scenes/poc-square.js | Implemented | Proof-of-concept: single arrow-key-controlled square. | RectRenderer, KeyboardMover |
| PongMenuScene | games/pong/scenes/pong-menu.js | Implemented | Title screen for Pong. | (none) |
| PongMatchScene | games/pong/scenes/pong-match.js | Implemented | Core Pong match. TODO: retrofit with PauseOverlay. | RectRenderer, Collider, PongBall, PongPaddlePlayer, PongAI |
| SurvivorsMenuScene | games/survivors/scenes/survivors-menu.js | Implemented | Title screen for Survivors. Creates fresh stats. | (none) |
| SurvivorsLevelupScene | games/survivors/scenes/survivors-levelup.js | DEAD | Superseded by SurvivorsShopScene. See docs/DEAD_FILES.md. | (none) |
| SurvivorsShopScene | games/survivors/scenes/survivors-shop.js | Implemented | Between-wave shop. All 7 upgrades visible, prices scale per purchase, coins carry over. | (none) |
| SurvivorsMatchScene | games/survivors/scenes/survivors-match.js | Implemented | Core Survivors gameplay. Wave timer, spawner, coin drops, pause overlay. | RectRenderer, Collider, PauseOverlay, SurvivorsPlayerController, SurvivorsProjectile, SurvivorsEnemy, SurvivorsCoin |
| ClownMenuScene | games/clown-brawler/scenes/clown-menu.js | Implemented | Title screen for Clown Brawler. Circus stripe background, animated balloon floats. | (none) |
| ClownMatchScene | games/clown-brawler/scenes/clown-match.js | Implemented | Core brawler gameplay. 2400px belt scroll, Y-sort, 3 waves (4/6/8 gorillas), parallax background (clouds 0.08, buildings 0.28, floor tiles 1.0), camera lag follow. | PauseOverlay, ClownPlayer, GorillaEnemy, FloatingBalloon |
