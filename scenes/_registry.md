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
| HTTMenuScene | games/horses-teach-typing/scenes/htt-menu.js | Implemented | Title screen for Horses Teach Typing. Pictographic layout: horse silhouette, mini mechanic demo, blinking SPACE prompt. Black-on-white Apple II Oregon Trail aesthetic. | (none) |
| HTTMatchScene | games/horses-teach-typing/scenes/htt-match.js | Implemented | Core rhythm typing gameplay. 90 BPM conductor, time-driven letter spawn/movement, judgement windows (perfect 60ms / great 120ms / good 180ms), score/combo HUD, pause overlay. | PauseOverlay, RhythmLetter, HTTMenuScene |
| PHMenuScene | games/party-house/scenes/menu.js | Implemented | Title screen for Party House. Pictographic house silhouette, flickering windows, drifting guest silhouettes. Displays high-score save state. | (none) |
| PHMatchScene | games/party-house/scenes/match.js | Implemented | Core Party House gameplay. Nine guest types, 25-day clock, trouble cap of 3. Phase machine: day-start, party, party-end, shutdown, ban, shop, win, lose. | PauseOverlay, PHMenuScene |
| MinesweeperMenuScene | games/minesweeper/scenes/menu.js | Implemented | Title screen for Minesweeper. Three difficulty cards with mini board previews and LED best-time readout. First use of ADR-0017 visual language tokens. | (none) |
| MinesweeperMatchScene | games/minesweeper/scenes/match.js | Implemented | Core Minesweeper gameplay. First-click safety, iterative flood-fill, chord click. HUD: LED mine counter, smiley restart, LED timer. PauseOverlay with onRestart and onQuit. | PauseOverlay, MinesweeperMenuScene |
| DriftMenuScene | games/drift/scenes/menu.js | Implemented | Title screen for Drift. Static star field, title, flavor text, begin button. | (none) |
| DriftMatchScene | games/drift/scenes/match.js | Implemented | Core Drift gameplay. Parametric layout (landscape/portrait). Five-sector travel loop with inkjs-driven encounter resolution. Ship interior: five rooms, hull pip bar, four crew circles. State machine: traveling / encounter_active. | PauseOverlay, Engine.Narrative, DRIFT_ENCOUNTER_SOURCES, DriftMenuScene, DriftGameOverScene |
| DriftGameOverScene | games/drift/scenes/game-over.js | Implemented | Win or loss screen for Drift. Displays outcome, final stats, return-to-menu button. | DriftMenuScene |
| LibromancerMenuScene | games/libromancer/scenes/LibromancerMenuScene.js | Implemented | Title screen for Libromancer. Loads unlocked spells and run stats from storage. Builds run state (deck = starters + unlocks, HP 20) and transitions to LibromancerCombatScene on click. | LIBROMANCER_SPELLS, LibromancerCombatScene |
| LibromancerCombatScene | games/libromancer/scenes/LibromancerCombatScene.js | Implemented | All combat for Libromancer. Deck-builder: shuffle deck, draw 3/turn, play 1. Five encounters in one scene; HP carries across. Status effects: Dust (player debuff), Fray (enemy bleed). Rest button (skip turn, +3 HP). Look-ahead shows next two enemy actions. Enemy block resets each enemy turn. Procedural animated sprites for all five enemies. | PauseOverlay, LIBROMANCER_SPELLS, LIBROMANCER_ENCOUNTERS, LibromancerMenuScene |
