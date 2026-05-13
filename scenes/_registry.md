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
| HTTMenuScene | games/horses-teach-typing/scenes/htt-menu.js | Implemented | Title screen for Horses Teach Typing. Pictographic layout: horse silhouette, mini mechanic demo (three letters approaching brackets), blinking SPACE prompt. Black-on-white Apple II Oregon Trail aesthetic. | (none) |
| HTTMatchScene | games/horses-teach-typing/scenes/htt-match.js | Implemented | Core rhythm typing gameplay. 90 BPM conductor, time-driven letter spawn/movement, judgement windows (perfect 60ms / great 120ms / good 180ms), score/combo HUD, horse silhouette, pulsing hit zone. Pause overlay supports both restart and quit. | PauseOverlay, RhythmLetter, HTTMenuScene |
| PHMenuScene | games/party-house/scenes/menu.js | Implemented | Title screen for Party House. Pictographic house silhouette with flickering windows, animated music notes, and drifting guest silhouettes. Displays high-score save state (fewest-days-to-win, total wins). SPACE/ENTER/click starts a run. | (none) |
| PHMatchScene | games/party-house/scenes/match.js | Implemented | Core Party House gameplay. Single-scenario MVP study of UFO 50 #25. Nine guest types (Old Friend, Wild Buddy, Rich Pal, Cute Dog, Hippie, Auctioneer, Rock Star, Celebrity, Dragon), 25-day clock, trouble cap of 3 (cop shutdown). Phase machine: day-start, party, party-end, shutdown, ban, shop, win, lose. Win condition is four star guests at one successful party. Persistent save state via Engine.storage ('best' key: fewestDays, totalWins). | PauseOverlay, PHMenuScene |
