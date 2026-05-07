# State

Last updated: 2026-05-06

## Current status

Pong is built as `build/pong.html`. All engine subsystems (audio, collision, signals, input, scene transitions) are exercised by the game for the first time in a complete build. The build has not yet been opened in a browser; verification is the next step.

## What was done in the most recent sessions

**Session (2026-05-06, first session):**
- Added `engine/audio.js` (Engine.Audio class). Public API: `register(name, paramsOrPreset)`, `play(name)`, `setVolume`, `getVolume`, `setMuted`, `isMuted`. Caches compiled audio buffers; documents browser autoplay caveats. Constructed by `Game` as `Engine.audio`. (Commit `e96f9d5`.)
- Added `scripts/collider.js` (Collider Script). AABB collision with width/height/tag/onCollide. Duck-typed via `isCollider = true`. Detected pairs invoke `onCollide(other)` directly. (Commit `e96f9d5`.)
- Updated `engine/scene.js` to run a `_collisionPass()` after the per-object update loop. O(N^2) broad-phase walking every object's scripts. (Commit `e96f9d5`.)
- Updated `engine/game.js` to instantiate `Engine.audio` alongside `Engine.input`. (Commit `e96f9d5`.)
- Vendored jsfxr v1.4.0 in `engine/lib/`: `sfxr.js` (35,898 bytes), `riffwave.js` (5,447 bytes), `UNLICENSE` (public domain), `README.md` documenting the source and update procedure. The first commit pass missed `sfxr.js`; this was fixed in `ef223d8`. Both files are now a matched pair from the same upstream npm release. (Commits `e96f9d5` and `ef223d8`.)
- Updated `scripts/_registry.md` with the new Collider entry.
- Added ADR-0010 (collision design: duck-typed scripts, method-based response, naive O(N^2) broad-phase).
- Added ADR-0011 (audio as engine-level service rather than Script).
- Updated `docs/ARCHITECTURE.md` to reflect the seventh engine module (Audio), the Scene collision pass, the updated frame lifecycle, the build concatenation order, and the third-party vendored library convention.

**Session (2026-05-06, second session, Sonnet 4.6):**
- Built `games/pong/` with three game-specific scripts (`PongBall`, `PongPaddlePlayer`, `PongAI`) and two scenes (`PongMenuScene`, `PongMatchScene`).
- `PongBall` uses the ADR-0010 extension contract: sets `isCollider = true` and implements `getAabb()` + `onCollide()` directly, without a separate Collider attachment. Includes a `_collideCooldown` guard to prevent multi-fire on sustained overlap. Emits `ball_scored` signal with `{ side: 'left' | 'right' }` payload.
- `PongMatchScene` subscribes to `ball_scored`, updates score, checks win condition, unsubscribes on `exit()` to prevent ghost listeners.
- `build/pong.html` generated as a complete single-file build. First build to include `engine/audio.js` and vendored jsfxr libs.
- `scripts/_registry.md` and `scenes/_registry.md` updated with all pong entries.

## Currently in progress

Nothing. Pong is committed; browser verification is next.

## Next up

1. **Browser verification of `build/pong.html`**: open in a real browser and confirm audio, collision, scoring, and scene transitions all function. The `_collideCooldown` approach to multi-fire prevention is an assumption; if it causes issues (e.g., ball sticking to paddle), switching to per-pair entry tracking inside `_collisionPass()` is the next step.
2. **`scripts/audio-player.js`** wrapping Howler.js for file-backed audio (mp3/ogg/wav). Lower priority while jsfxr covers all current game needs.
3. **Common scenes** (loading, main menu base class, credits, audio settings, controls) as reusable scaffolding for future games.
4. **Common scripts** (sprite renderer, animation player, spawner, health, damage).
5. **Multiplayer foundation**: PeerJS-backed Network module, deferred until at least one single-player game is verified working.

## Open questions

- Whether `build/pong.html` behaves correctly in a real browser. Audio and frame-accurate collision are exercised for the first time. If the cooldown guard is insufficient for multi-fire prevention, per-pair entry/exit tracking in `_collisionPass()` is the next iteration.
- AI difficulty: AI speed is 250 px/s vs player 340 px/s. Tuning may be needed after play-testing.

## Notes for the next session

- Pong source files are in `games/pong/scripts/` and `games/pong/scenes/`.
- The `ball_scored` signal payload is `{ side: 'left' | 'right' }`. `PongMatchScene` subscribes in `enter()` and unsubscribes in `exit()`.
- `build/pong.html` inlines libs in the documented concatenation order. If regenerating, follow ARCHITECTURE.md exactly.
- Speed constants are in `PongMatchScene`: `BALL_SPEED = 280`, `PLAYER_SPEED = 340`, `AI_SPEED = 250`. Adjust all three there for difficulty tuning without touching script files.
- `PongMenuScene` registers SFX on every `enter()`, so sounds are re-randomized each session (jsfxr presets produce different results each call). This is intentional for variety.
- The engine namespace is unchanged: `Engine.SignalBus`, `Engine.signals`, `Engine.Input`, `Engine.input`, `Engine.Script`, `Engine.GameObject`, `Engine.Scene`, `Engine.Audio`, `Engine.audio`, `Engine.Game`.
