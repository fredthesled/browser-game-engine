# Architecture

Status: Stub. The engine has not been implemented yet. This document will be expanded as the design is finalized and code is written. The sketch below is the agreed conceptual starting point.

## Conceptual model (preliminary)

Inspired by Godot's scene tree and signal model:

- A `Scene` owns a collection of `GameObject` instances and has a lifecycle: `enter()`, `update(dt)`, `draw(ctx)`, `exit()`.
- A `GameObject` has spatial properties (position, rotation, scale) and a list of attached `Script` instances. The base class is intentionally minimal.
- A `Script` is an attachable behavior that mounts to a host GameObject and can hook into the lifecycle. Scripts are the primary unit of reusable game logic, in the spirit of Godot attached scripts.
- A global `SignalBus` provides loosely coupled communication. Objects emit named signals; other objects listen. This avoids hard references between unrelated objects.

Only one Scene is active at a time in the initial design. Multi-scene composition (e.g., a UI scene overlaid on a gameplay scene) is a possible future extension and is not built into the first version.

## Frame lifecycle (preliminary)

For each animation frame:

1. `Scene.update(dt)` runs.
2. Scene iterates its GameObjects, calling each one's `update(dt)`. Each GameObject in turn iterates its attached Scripts and calls their `update(dt)`.
3. `Scene.draw(ctx)` runs the same iteration with `draw`. The drawing context is a 2D Canvas context.
4. Input events have already been collected and made available to the active scene before `update` runs.

## Open design questions

See `docs/STATE.md` for the current list of open questions that affect this document.

## Implementation notes

To be filled in as the engine is written.
