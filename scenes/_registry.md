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
| PHMatchScene | games/party-house/scenes/match.js | Implemented | Core Party House gameplay. Single-scenario MVP study of UFO 50 #25. Nine guest types, 25-day clock, trouble cap of 3 (cop shutdown). Phase machine: day-start, party, party-end, shutdown, ban, shop, win, lose. Win condition is four star guests at one successful party. Persistent save state via Engine.storage. | PauseOverlay, PHMenuScene |
| MinesweeperMenuScene | games/minesweeper/scenes/menu.js | Implemented | Title screen for Minesweeper. Three preview cards (raised bevel; sunken when selected) showing mini board renders at correct aspect ratio per difficulty and a LED best-time readout when stored. First concrete application of the ADR-0017 visual language tokens. Arrow keys or 1/2/3 to select, Enter/Space/click confirms. | (none) |
| MinesweeperMatchScene | games/minesweeper/scenes/match.js | Implemented | Core Minesweeper gameplay. Scene-level state (no GameObjects). First-click safety, iterative flood-fill, chord click. HUD: LED mine counter, smiley restart button, LED timer. PauseOverlay with onRestart and onQuit. Best time per difficulty persisted via Engine.storage. | PauseOverlay, MinesweeperMenuScene |
| DriftMenuScene | games/drift/scenes/menu.js | Implemented | Title screen for Drift. Static star field, title, flavor text, begin button. Transitions to DriftMatchScene. | (none) |
| DriftMatchScene | games/drift/scenes/match.js | Implemented | Core Drift gameplay. Parametric layout (landscape: ship left / encounter right; portrait: ship top / encounter bottom). Five-sector travel loop with inkjs-driven encounter resolution. Ship interior: five rooms (Helm, Weapons, Shields, Med Bay, Engines) connected by hallways, hull pip bar (0-10), four crew as colored circles. State machine: traveling / encounter_active. Crew AI deferred (stub present). First consumer of Engine.Narrative and bootstrapGame. | PauseOverlay, Engine.Narrative, DRIFT_ENCOUNTER_SOURCES, DriftMenuScene, DriftGameOverScene |
| DriftGameOverScene | games/drift/scenes/game-over.js | Implemented | Win or loss screen for Drift. Displays outcome (win / loss_hull / loss_crew), final hull and crew stats, flavor line, return-to-menu button. | DriftMenuScene |
