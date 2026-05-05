# State

Last updated: 2026-05-05

## Current status

Architecture locked in. Ready to implement engine.

## What was done in the most recent session

- Resolved the five open architectural questions and recorded them as ADR-0004 through ADR-0008 in `docs/DECISIONS.md`.
- Expanded `docs/ARCHITECTURE.md` from a stub into a full spec covering all six engine classes/modules, their public APIs, the frame lifecycle, transform handling, signal naming conventions, and file layout.

## Currently in progress

Nothing.

## Next up

1. Implement `engine/signal-bus.js`. Smallest and most independent piece; good first build.
2. Implement `engine/input.js`. Standalone module; depends only on the canvas reference for mouse coordinates.
3. Implement `engine/script.js` (base class with no-op hooks).
4. Implement `engine/game-object.js`.
5. Implement `engine/scene.js`.
6. Implement `engine/game.js`.
7. Build the proof-of-concept: a colored square that moves with arrow keys. This will require creating the first object type, the first script (input-driven movement), and the first scene, exercising the entire stack end to end.
8. Produce the first single-file HTML build in `build/` to verify the engine runs in a browser.

## Open questions

None at the engine-core level. Future-work items (multi-scene, asset loading, audio, save/load, physics, collision) are tracked at the bottom of `docs/ARCHITECTURE.md` and will be addressed with new ADRs when needed.
