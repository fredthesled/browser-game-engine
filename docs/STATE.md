# State

Last updated: 2026-05-06

## Current status

Engine has audio and AABB collision implemented. Vendored jsfxr (riffwave.js + sfxr.js) is in place. `engine/audio.js` provides procedural SFX as `Engine.audio`. `scripts/collider.js` provides AABB collision; the per-frame pass runs inside Scene. The architecture is documented up-to-date through ADR-0011.

The new modules have not yet been verified end-to-end in a real browser build. The most recent committed build (`build/poc-square.html`) predates these features and exercises only the original engine + RectRenderer + KeyboardMover. A small verification build that exercises audio + collision is the next concrete step.

## What was done in the most recent sessions

- Added `engine/audio.js` (Engine.Audio class). Public API: `register(name, paramsOrPreset)`, `play(name)`, `setVolume`, `getVolume`, `setMuted`, `isMuted`. Caches compiled audio buffers; documents browser autoplay caveats. Constructed by `Game` as `Engine.audio`. (Commit `e96f9d5`.)
- Added `scripts/collider.js` (Collider Script). AABB collision with width/height/tag/onCollide. Duck-typed via `isCollider = true`. Detected pairs invoke `onCollide(other)` directly. (Commit `e96f9d5`.)
- Updated `engine/scene.js` to run a `_collisionPass()` after the per-object update loop. O(N²) broad-phase walking every object's scripts. (Commit `e96f9d5`.)
- Updated `engine/game.js` to instantiate `Engine.audio` alongside `Engine.input`. (Commit `e96f9d5`.)
- Vendored jsfxr v1.4.0 in `engine/lib/`: `sfxr.js` (35,898 bytes), `riffwave.js` (5,447 bytes), `UNLICENSE` (public domain), `README.md` documenting the source and update procedure. The first commit pass missed `sfxr.js`; this was fixed in `ef223d8`. Both files are now a matched pair from the same upstream npm release. (Commits `e96f9d5` and `ef223d8`.)
- Updated `scripts/_registry.md` with the new Collider entry.
- Added ADR-0010 (collision design: duck-typed scripts, method-based response, naive O(N²) broad-phase).
- Added ADR-0011 (audio as engine-level service rather than Script).
- Updated `docs/ARCHITECTURE.md` to reflect the seventh engine module (Audio), the Scene collision pass, the updated frame lifecycle, the build concatenation order, and the third-party vendored library convention. Removed Audio and Collision from the "Open questions" list since both are now built; added file-backed audio (Howler) and spatial-partitioning collision as their replacements.

## Currently in progress

Nothing.

## Next up

1. **Verification POC build**: assemble `build/poc-audio-collision.html` that inlines the engine + jsfxr + scripts + a small inline scene with two squares (one arrow-key controlled, one WASD controlled) and a Collider on each. Each collision plays a `hitHurt` SFX and increments a visible counter. Verifies audio + collision + scene transforms end-to-end in a real browser. Will both prove out the new modules and serve as a reference build pattern for Pong.
2. **`scripts/audio-player.js`** wrapping Howler.js for file-backed audio (mp3/ogg/wav). Distinct from `Engine.audio` per ADR-0011. Lower priority for Pong, since jsfxr alone covers Pong's needs.
3. **First real game**: build `games/pong/`. Two scenes (menu, match), several scripts (ball, paddle player, paddle AI, score display), the existing Collider for AABB hit detection, and the existing Engine.audio for SFX. Pong is the canonical first-game because it touches every subsystem without requiring artwork.
4. **Common scenes** (the framework's reusable scaffolding): `scenes/loading-scene.js`, `scenes/main-menu-scene.js` (base classes with override hooks), `scenes/credits-scene.js` consuming the manifest format from `docs/resources/attribution.md`, `scenes/audio-settings-scene.js` (volume, mute), `scenes/controls-scene.js`.
5. **Common scripts** (gameplay primitives): `scripts/sprite-renderer.js` (Image rendering), `scripts/animation-player.js` (sprite-sheet animation), `scripts/spawner.js`, `scripts/health.js`, `scripts/damage.js`.
6. **Multiplayer foundation**: integrate PeerJS into the engine via a new `Network` module. Larger commitment, defer until at least one single-player game ships.

## Open questions

None at the engine-core level. Next decisions will surface naturally during the verification POC and Pong work.

## Notes for the next session

- The engine namespace pattern: `Engine.SignalBus`, `Engine.signals`, `Engine.Input`, `Engine.input`, `Engine.Script`, `Engine.GameObject`, `Engine.Scene`, `Engine.Audio`, `Engine.audio`, `Engine.Game`. Scripts and scenes are top-level classes (no namespace).
- Build concatenation order is now documented in `docs/ARCHITECTURE.md` under "Build concatenation order". Use that section as the authoritative spec when generating any new build file.
- The most recent committed build (`build/poc-square.html`) is from before audio + collision and does not include those modules. It still works as the original POC. When making the next POC build (`build/poc-audio-collision.html`), use the documented concatenation order and inline files verbatim.
- For any third-party asset or library, consult `docs/resources/` first. Add new findings there in the same session you discover them.
- The chr15m/jsfxr v1.4.0 source can be retrieved from `https://registry.npmjs.org/jsfxr/-/jsfxr-1.4.0.tgz` (npm registry, on the bash sandbox network allowlist). Direct GitHub raw URLs (`raw.githubusercontent.com`) are not currently on the allowlist.
