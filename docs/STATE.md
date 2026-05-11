# State

Last updated: 2026-05-11

## Current status

Three games in the repo: Pong, Survivors v3, Clown Brawler. Survivors level-1 difficulty raised this session (swarm clusters appear from wave 1, faster spawn cadence). Shop menu gained WASD navigation. No game currently uses SpriteSheet; it is infrastructure waiting for assets.

## What was done in the most recent session

**Session 2026-05-11 (this session):**

- **Survivors difficulty tuning** (`games/survivors/scenes/survivors-match.js`):
  - Spawn interval base lowered from 1.5s to 1.3s, per-level decrement adjusted from 0.15s to 0.13s. Floor unchanged at 0.22s. Level 1 now runs ~23 spawn ticks per 30s wave (up from ~20).
  - Level-1 enemy pool now `['basic', 'basic', 'swarm']` (was `['basic', 'basic']`). Adds ~33% swarm roll rate to the opening wave.
  - `_spawnEnemy` refactored. New helpers `_pickEdgePosition()` (returns side index plus coords) and `_spawnOne(type, x, y)` (creates a single enemy). When the rolled type is `swarm`, the spawn produces three enemies along the same edge offset by +/-36px perpendicular to entry direction so the cluster reads as a coordinated group. Non-swarm rolls spawn one enemy as before.
  - Expected level-1 enemy count per wave rises from ~20 to ~38 (33% chance of 3-enemy cluster, otherwise 1 enemy, across 23 ticks).
  - Level-5+ "second spawn at 25% chance" logic unchanged; combined with cluster spawning a single tick can now produce up to six enemies on chaotic mid-game waves.

- **Survivors shop WASD navigation** (`games/survivors/scenes/survivors-shop.js`):
  - Cursor up/down now accepts `W/w` or `S/s` in addition to `ArrowUp/ArrowDown`. Matches the player controller's existing dual-binding pattern (both lowercase and uppercase variants are checked, since `e.key` differs with shift state).
  - Footer hint updated from `UP/DOWN navigate` to `WASD or ARROWS navigate`.

- **Build regenerated** (`build/survivors.html`): Two scene blocks reminified to match new source. Engine, libraries, and all other scripts unchanged.

## Previously done

See prior STATE entries: engine (all six modules), Pong, PauseOverlay, Survivors v1-v3 (wave-clear, shop, coin magnet, fades), Clown Brawler initial build, SpriteSheet script, sprite generator artifact.

## Currently in progress

Nothing. Check-in with user before proceeding to next step.

## Next up

1. **Sprite generator artifact**: confirm end-to-end working in Artifact runtime (pending from prior session).
2. **Wire SpriteSheet into Clown Brawler**: Replace canvas-primitive clown and gorilla draw() methods with SpriteSheet instances. Requires sprites from generator first.
3. **Pong pause retrofit**: PauseOverlay + fade, regenerate pong.html.
4. **Survivors SFX**: jsfxr sounds (fire, hit, death, coin, level complete).
5. **WASD parity for other menus**: Pause overlay still uses arrow-only navigation. The levelup scene (`survivors-levelup.js`) is marked Superseded in the registry and not in the current build, so no change made there. If the pause overlay should match the shop's input scheme, that's a small consistency pass.
6. **Common scenes**: Credits, loading, main menu template.
7. **Multiplayer**: PeerJS Network module. Deferred until at least two verified games exist.

## Open questions

- Difficulty curve sanity: level-1 expected enemy count nearly doubles with this session's changes (~20 to ~38). User asked for an increase; whether the magnitude lands correctly is verifiable only by playtest. Easy to dial back by raising the base spawn interval, reducing swarm pool weight, or shrinking cluster size from 3 to 2.
- Swarm cluster spread: fixed at 36px. Could be randomized within a range for more natural-looking formations, but the current uniform spacing reads as a deliberate group rather than coincidental spawns.
- The `_ssImageCache` is module-global (shared across all games in a single build). This is fine for single-game builds, since each build is its own HTML file. It would be a naming-collision risk if two games were ever combined in one build, which is not a current use case.

## Notes for the next session

- The pause overlay's arrow-only navigation is now the only Survivors-side menu that doesn't accept WASD. Worth noting if menu input parity becomes a stated goal.
- Cluster spawning is type-checked against the literal string `'swarm'`. If a future enemy type also warrants group spawning, factor cluster-spawn-eligibility into the enemy config object instead.
- The `_spawnEnemy` split into `_pickEdgePosition` and `_spawnOne` is purely refactor; no behavioural change for non-swarm types.
