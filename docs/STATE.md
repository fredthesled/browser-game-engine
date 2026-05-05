# State

Last updated: 2026-05-05

## Current status

Engine implemented. Proof-of-concept scene runs. First single-file HTML build exists at `build/poc-square.html`. Verification by the user is the next step.

## What was done in the most recent session

- Implemented all six engine modules under `engine/`: `signal-bus.js` (with global `Engine.signals` instance), `input.js` (`Engine.Input` class; instance is created by Game and assigned to `Engine.input`), `script.js` (base class with no-op hooks), `game-object.js`, `scene.js`, `game.js`.
- Implemented two scripts under `scripts/`: `RectRenderer` (renders a colored rectangle at host position, configurable size and color), `KeyboardMover` (arrow-key driven motion with diagonal normalization, configurable speed).
- Implemented one scene under `scenes/`: `POCSquareScene` (a single moveable square at canvas center).
- Produced the first single-file HTML build at `build/poc-square.html`. The file contains all engine source, the two scripts, the scene, and a small bootstrap snippet. Open it in any browser to verify.
- Updated `scripts/_registry.md` and `scenes/_registry.md` with the new entries.

## Currently in progress

Nothing.

## Next up

Two natural directions, pick whichever fits the moment:

1. Verify the POC actually works in your browser. Download or open `build/poc-square.html` directly. If anything is broken, report specifics and we fix in the engine source (then regenerate the build).
2. Once verified, choose the next feature to add. Likely candidates:
   - A `Collider` script and a registration-based collision system (probably a small change to Scene to maintain a collider list).
   - A `Sprite` script that renders an `Image`. Will need to think about asset loading.
   - A small starter game (Pong, Snake, an asteroids clone) under `games/<name>/`.
   - A `Game.pause()` and `Game.resume()` capability.

## Open questions

None at the engine-core level. The POC verification is the gate before treating the engine as stable.

## Notes for the next session

- The engine uses a global `Engine` namespace pattern. Engine classes attach to it: `Engine.SignalBus`, `Engine.signals`, `Engine.Input`, `Engine.input` (instance), `Engine.Script`, `Engine.GameObject`, `Engine.Scene`, `Engine.Game`. Scripts and scenes are top-level classes, no namespace, since they tend to be project-specific.
- The build process is currently manual concatenation in dependency order: engine modules first (in order: signal-bus, input, script, game-object, scene, game), then scripts (any order, since they only depend on Engine.Script and Engine.input), then scenes (after the scripts they reference), then a bootstrap snippet at the end.
- Each source file begins with a header comment block: what the file does, what it depends on, what depends on it. Match this when adding new files.
- The build file `build/poc-square.html` carries a notice that it is auto-generated. When source changes, regenerate the build file rather than editing it directly.
