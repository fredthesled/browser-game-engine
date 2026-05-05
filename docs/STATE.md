# State

Last updated: 2026-05-05

## Current status

Engine implemented and verified. Resource reference documentation in place. Ready to build wrapper scripts and common scenes that integrate the documented tools.

## What was done in the most recent session

- Verified the POC build runs in the browser. Movement and rendering work as expected.
- Researched and documented free and freely-licensed resources for game development: assets (sprites, sound, music, fonts), JavaScript libraries (audio, collision, physics, networking, utility), multiplayer architecture options, and attribution practices.
- Created `docs/resources/` folder with five files: `INDEX.md`, `assets.md`, `libraries.md`, `multiplayer.md`, `attribution.md`.
- Added ADR-0009 establishing the license policy (prefer CC0/MIT/permissive, accept CC-BY with credit, avoid GPL/NC).
- Updated `CLAUDE.md` with a "Looking up resources" section so future sessions consult `docs/resources/` before re-researching.

## Currently in progress

Nothing.

## Next up

The resource research phase is complete. The natural next phase is integration: writing wrapper scripts and common scenes that pull these resources into the framework. Several reasonable starting points:

1. **Wrapper scripts that integrate documented libraries**:
   - `scripts/sfx-player.js` wrapping jsfxr for retro sound effects defined as JSON in source. Smallest first step, no asset files needed.
   - `scripts/audio-player.js` wrapping Howler.js for actual audio file playback (mp3/ogg/wav).
   - `scripts/collider.js` providing AABB collision detection with a registration system inside Scene.

2. **Common scenes (the framework's reusable scaffolding)**:
   - `scenes/loading-scene.js` (base class) for asset preloading screens.
   - `scenes/main-menu-scene.js` (base class with override hooks).
   - `scenes/credits-scene.js` consuming the manifest format from `docs/resources/attribution.md`.
   - `scenes/audio-settings-scene.js` (volume, mute, tied to a settings store).
   - `scenes/controls-scene.js` showing key bindings.

3. **Common scripts (gameplay primitives)**:
   - `scripts/sprite-renderer.js` rendering an `Image` instead of a colored rectangle.
   - `scripts/animation-player.js` for sprite-sheet animation.
   - `scripts/spawner.js` for enemy or pickup spawning over time.
   - `scripts/health.js` and `scripts/damage.js` for combat primitives.

4. **First real game**: build `games/pong/` to exercise everything (two scenes, several scripts, AABB collision, jsfxr SFX). Pong is the canonical first-real-game because it touches every subsystem without requiring artwork.

5. **Multiplayer foundation**: integrate PeerJS into the engine via a new `Network` module, then build a multiplayer-capable POC. This is a larger commitment and should follow at least one single-player game so the engine is exercised first.

## Open questions

None at the engine-core level. License policy is now codified (ADR-0009).

## Notes for the next session

- The engine uses a global `Engine` namespace pattern. Engine classes attach to it: `Engine.SignalBus`, `Engine.signals`, `Engine.Input`, `Engine.input` (instance), `Engine.Script`, `Engine.GameObject`, `Engine.Scene`, `Engine.Game`. Scripts and scenes are top-level classes, no namespace, since they tend to be project-specific.
- The build process is currently manual concatenation in dependency order: engine modules first (in order: signal-bus, input, script, game-object, scene, game), then scripts (any order, since they only depend on Engine.Script and Engine.input), then scenes (after the scripts they reference), then a bootstrap snippet at the end.
- Each source file begins with a header comment block: what the file does, what it depends on, what depends on it. Match this when adding new files.
- The build file `build/poc-square.html` carries a notice that it is auto-generated. When source changes, regenerate the build file rather than editing it directly.
- For any third-party asset or library, consult `docs/resources/` first. Add new findings there in the same session you discover them.
