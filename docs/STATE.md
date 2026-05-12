# State

Last updated: 2026-05-11

## Current status

`scripts/sprite-sheet.js` committed. Three games in the repo: Pong, Survivors v3, Clown Brawler. No game currently uses SpriteSheet; it is infrastructure waiting for assets.

## What was done in the most recent session

**Session 2026-05-11 (this session):**

Survivors difficulty and UX adjustments. No engine or architectural changes; no new scenes or scripts; no registry rows added.

- **`games/survivors/scenes/survivors-match.js`**:
  - `_getSpawnInterval` tightened from `1.5 - (level-1)*0.15` to `1.2 - (level-1)*0.12`. Floor unchanged at 0.22s, so late-game pacing (level 9+) is effectively the same; early waves spawn ~20% faster.
  - `_getEnemyTypePool` level-1 base now includes `swarm` (one entry alongside two `basic`). To preserve level 2+ composition, the level-2 "+swarm" was reduced from 2 entries to 1. Pools for level 3 and above are byte-identical to the previous version.
  - `_spawnEnemy` produces a cluster of three when the rolled type is `swarm`. The first is at the chosen edge point; the second and third get a `(Math.random()-0.5)*36` offset on x and y. Counted as one spawn tick; cadence is unchanged.
  - Net effect on the opening wave: roughly 2x enemy density vs the previous tuning, with swarm clusters as a new threat shape from level 1.
  - Header comment block updated with a "Swarm clustering" paragraph alongside the existing wave/fade/magnet sections.

- **`games/survivors/scenes/survivors-shop.js`**:
  - Added `w`/`W` to up navigation and `s`/`S` to down navigation, matching the case-pair pattern used in `player-controller.js`. Help text updated to read `'UP/DOWN or W/S navigate   ENTER buy or continue'`. Header comment block updated to list the navigation bindings.

- **`build/survivors.html`**: regenerated. Five condensed-style patches in `SurvivorsShopScene.update`, the shop help text, and `SurvivorsMatchScene._getSpawnInterval / _getEnemyTypePool / _spawnEnemy`. Engine modules, library code, and other scenes unchanged.

- **Not changed**: `survivors-levelup.js` (Superseded in the registry; left alone). Pong, Clown Brawler, engine modules. No new ADRs.

## Previously done

See prior STATE entries: engine (all six modules), Pong, PauseOverlay, Survivors v1-v3 (wave-clear, shop, coin magnet, fades), Clown Brawler initial build, SpriteSheet script.

## Currently in progress

Nothing. Awaiting playtest feedback on the new difficulty curve. If the level-1 density feels too aggressive, the obvious knobs are (a) revert `_getSpawnInterval` to the old curve while keeping cluster spawning, or (b) drop the cluster size from 3 to 2.

## Next up

1. **Sprite generator artifact**: Claude-powered in-browser tool that paints pixel art frames, previews animations, and exports a sprite sheet PNG as a base64 data URI ready to paste into game source. This is the next explicit user request.
2. **Wire SpriteSheet into Clown Brawler**: Replace canvas-primitive clown and gorilla draw() methods with SpriteSheet instances. Requires sprites from step 1 first.
3. **Pong pause retrofit**: PauseOverlay + fade, regenerate pong.html.
4. **Survivors SFX**: jsfxr sounds (fire, hit, death, coin, level complete).
5. **Common scenes**: Credits, loading, main menu template.
6. **Multiplayer**: PeerJS Network module. Deferred until at least two verified games exist.

## Open questions

- Sprite sheet origin convention: frame centred at (offsetX, offsetY) relative to host. This means `offsetY = -(frameH * scale / 2)` to keep feet at host Y. An alternative `anchorY` fraction (0 = top, 0.5 = centre, 1 = bottom) was considered but adds complexity for marginal gain. Revisit if games need it.
- Asset embedding pattern: `const ASSETS = { player: 'data:image/png;base64,...' }` at the top of each game's entry file is the current plan. Evaluate whether a separate `assets.js` per game is cleaner once Clown Brawler is sprited.
- The `_ssImageCache` is module-global (shared across all games in a single build). This is fine for single-game builds, since each build is its own HTML file. It would be a naming-collision risk if two games were ever combined in one build, which is not a current use case.
- Whether the WASD-in-shop binding should propagate to `survivors-levelup.js` (currently marked Superseded). Trivial to add if levelup is ever revived. Not done in this session per scope.

## Notes for the next session

- SpriteSheet build order: it depends only on `Engine.Script`, so it slots in after `engine/game.js` and before any game scripts that use it. The existing build order in ARCHITECTURE.md covers this (scripts after engine, before scenes).
- Flip behaviour: `setFlipX(true)` applies `ctx.scale(-1,1)` around the host origin before drawing. The offsetX shift is applied after, so the frame stays correctly positioned regardless of flip state.
- `isDone()` stays true until `play()` is called again. The owning script is responsible for transitioning back to idle (or whatever follows), typically by checking `sprite.isDone()` in its own update loop.
- Difficulty tuning lives in `_getSpawnInterval`, `_getEnemyTypePool`, and `_getEnemyConfig` (health/speed multipliers) inside `survivors-match.js`. Future balance passes start there.
