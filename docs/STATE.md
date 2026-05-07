# State

Last updated: 2026-05-07

## Current status

Survivors v1 is built and committed as `build/survivors.html`. The PauseOverlay utility is in `scripts/pause-overlay.js`. All source files for both the pause system and the survivors game are committed and documented. The build has not yet been verified in a real browser.

## What was done in the most recent sessions

**Session (2026-05-06, session 1):**
- Added `engine/audio.js`, `scripts/collider.js`, vendored jsfxr. See commit `e96f9d5`.

**Session (2026-05-06, session 2, Sonnet 4.6 -- Pong):**
- Built Pong: `games/pong/` with all scripts and scenes. `build/pong.html` committed.

**Session (2026-05-07, session 3 -- Pause + Survivors):**
- Added `scripts/pause-overlay.js` (`PauseOverlay` utility class). ADR-0012 documents the pause convention.
- Built `games/survivors/`: three scripts (`SurvivorsPlayerController`, `SurvivorsProjectile`, `SurvivorsEnemy`) and three scenes (`SurvivorsMenuScene`, `SurvivorsLevelupScene`, `SurvivorsMatchScene`).
- Generated `build/survivors.html` (single-file build).
- Updated `scripts/_registry.md`, `scenes/_registry.md`, `docs/DECISIONS.md`.

## Currently in progress

Nothing.

## Next up

1. **Browser verification of `build/survivors.html`**: open in a real browser. Key things to check: ESC pause (audio controls, quit-to-menu), enemy spawning + collision, projectile firing + enemy death, wave timer and level-up screen, damage scaling across levels.
2. **Pong retrofit**: add `PauseOverlay` to `PongMatchScene` per ADR-0012, regenerate `build/pong.html`. The source file and build are currently inconsistent with the convention.
3. **Survivors SFX**: now that mechanics are verified, add jsfxr-based sounds (fire, enemy hit, enemy die, player hit, level complete) registered in `SurvivorsMenuScene.enter()`.
4. **Difficulty tuning**: after real play, adjust `WAVE_DURATION`, spawn intervals, and enemy stat configs. Constants are all centralized in `SurvivorsMatchScene`.
5. **Common scenes**: loading, main menu base class, credits, audio settings, controls screens as reusable framework scaffolding.
6. **Common scripts**: sprite renderer, animation player, spawner, health/damage primitives.
7. **Multiplayer foundation**: PeerJS-backed Network module. Defer until at least one game is fully verified.

## Open questions

- Whether the projectile-enemy collision ordering assumption holds in the browser (enemies inserted before projectiles in `this.objects`). If sticking or missed hits are observed, switch to per-pair entry tracking in `_collisionPass()`.
- Survivors difficulty curve: spawn interval floor (0.38s at level 15+), enemy type introduction thresholds, and base stats are all first guesses. Play-testing required.
- AI difficulty in Pong (250 vs 340 px/s) -- unverified since pong.html predates browser testing.

## Notes for the next session

- Survivors stats object fields: `maxHealth`, `currentHealth`, `speed`, `fireRate`, `damage`, `projectileCount`, `projectileSize`, `playerSize`, `canvasW`, `canvasH`. The object is shared by reference across Match and Levelup scenes; mutations in Levelup persist to the next Match.
- Survivors signals: `survivors_remove { obj }`, `survivors_enemy_died { obj, xp }`, `survivors_player_hit { damage }`. All prefixed to avoid cross-game collisions on the shared SignalBus.
- Enemy type configs are in `SurvivorsMatchScene._getEnemyConfig()`. Type pool weighting is in `_getEnemyTypePool()`. Both are the right place for difficulty tuning.
- PauseOverlay usage pattern (mandatory for all new game scenes per ADR-0012):
  ```
  enter(): this._pause = new PauseOverlay(game, { onQuit: ... });
  update(dt): this._pause.update(dt); if (this._pause.isPaused()) return;
  draw(ctx): /* game content */ this._pause.draw(ctx); // last
  ```
- Pong source at `games/pong/`. The build at `build/pong.html` predates PauseOverlay and should be regenerated next session.
- `PauseOverlay` note: it is a plain class, not a Script subclass. `scripts/pause-overlay.js` is an exception to the normal folder convention.
