# State

Last updated: 2026-05-05

## Current status

Scaffolding complete. No engine code written yet.

## What was done in the last session

- Created the GitHub repo `browser-game-engine` (private).
- Established the folder structure: `engine/`, `scenes/`, `objects/`, `scripts/`, `games/`, `build/`, `docs/`.
- Wrote initial documentation: `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md` (stub), `docs/CONVENTIONS.md`, `docs/STATE.md`, `docs/DECISIONS.md`.
- Created empty registries: `scenes/_registry.md`, `objects/_registry.md`, `scripts/_registry.md`.

## Currently in progress

Nothing.

## Next up

1. Finalize the engine core design in `docs/ARCHITECTURE.md`. Specifically: the exact Scene and GameObject API, the signal bus contract, how input is routed.
2. Implement the first version of the engine in `engine/core.js` (or split across `engine/scene.js`, `engine/game-object.js`, `engine/signal-bus.js` if cleaner).
3. Build a minimal proof-of-concept scene to verify the architecture works end to end. Suggested first POC: a colored square that moves with arrow keys, demonstrating Scene lifecycle, GameObject, an attachable input-driven Script, and a render call.
4. Produce the first single-file HTML build in `build/` so the user can open and verify it runs.

## Open questions

These affect the architecture and need answers before significant code is written:

- Component pattern vs. inheritance for GameObject specialization. Current lean: composition via attachable scripts (per the Godot-inspired design).
- Input dispatch: directly to the active scene, or via signal bus events. Trade-off is decoupling vs. simplicity.
- Whether to support multiple simultaneous active scenes (e.g., UI overlaid on gameplay) from day one or defer to a later version.
- Whether to use `requestAnimationFrame` directly in the Scene class or in a separate `Game` orchestrator class.
- Coordinate system: top-left origin (Canvas default) or center origin. Default lean: top-left.
