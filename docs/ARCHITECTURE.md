# Architecture

This document describes the engine's design as of the most recent locked-in decisions (see `docs/DECISIONS.md`). When you change the engine, update this document in the same commit.

## Overview

The engine is composed of six classes/modules, each in its own file under `engine/`:

| File | Class/module | Role |
|------|--------------|------|
| `engine/game.js` | `Game` | Owns the animation loop, the canvas, and the active scene. |
| `engine/scene.js` | `Scene` | Owns a collection of GameObjects. Has lifecycle hooks. |
| `engine/game-object.js` | `GameObject` | Transform host. Owns a list of attached Scripts. |
| `engine/script.js` | `Script` | Base class for attachable behaviors. |
| `engine/signal-bus.js` | `SignalBus` (global instance) | Pub/sub for decoupled events. |
| `engine/input.js` | `Input` (global instance) | Latched keyboard and mouse state, queried per frame. |

The runtime expects a single Game instance, a single SignalBus instance, and a single Input instance. Scenes, GameObjects, and Scripts are instantiated freely.

## Class contracts

### Game

Responsibilities: own the loop, hold the active scene, drive input updates each frame, manage the canvas reference.

Public API:

- `constructor(canvas)` takes a `<canvas>` DOM element.
- `start()` begins the requestAnimationFrame loop.
- `stop()` cancels the loop.
- `setScene(scene)` at the next frame boundary, calls `currentScene.exit()` if a scene is active, then `scene.enter()`, and swaps the reference.
- `currentScene` read-only reference to the active scene (or null before any scene is set).

Internal state: `lastFrameTime` for delta time calculation, `_pendingScene` for queued transitions, `_animationHandle` for cancellation.

### Scene

Responsibilities: own a collection of GameObjects, provide lifecycle hooks, apply per-object transforms during draw.

Public API:

- `constructor()` initializes an empty object list.
- `enter()` called when this scene becomes active. Subclasses populate the scene here.
- `exit()` called when this scene is being replaced. Subclasses tear down here.
- `update(dt)` iterates GameObjects and calls `obj.update(dt)` on each.
- `draw(ctx)` iterates GameObjects, applies each one's transform via `ctx.save/translate/rotate/scale`, calls `obj.draw(ctx)`, then `ctx.restore()`.
- `add(gameObject)` adds a GameObject to the scene.
- `remove(gameObject)` removes one.

Subclasses typically override `enter()` to populate the scene with GameObjects. They may override `update` or `draw` to add scene-level logic before or after the per-object iteration; subclasses should call `super.update(dt)` or `super.draw(ctx)` when doing so.

### GameObject

Responsibilities: hold transform state, hold attached Scripts, delegate lifecycle to those scripts.

Public API:

- `constructor(x = 0, y = 0)` initializes transform.
- `x, y` position.
- `rotation` radians.
- `scale` scalar, default 1.
- `scripts` array of attached Script instances.
- `attach(scriptInstance)` adds a script. Calls the script's `on_enter()` if defined.
- `detach(scriptInstance)` removes one. Calls `on_exit()` if defined.
- `update(dt)` iterates scripts and calls each one's `update(dt)` if defined.
- `draw(ctx)` iterates scripts and calls each one's `draw(ctx)` if defined. Called inside the Scene's transform context, so (0, 0) is the GameObject's position.

The GameObject base class is intentionally minimal. It does not draw anything by default. Behavior comes from attached scripts.

### Script

Responsibilities: define a reusable behavior that mounts to a host GameObject.

Public API:

- `constructor(host)` receives the host GameObject. Subclass constructors should call `super(host)`.
- `host` reference to the host GameObject.
- `on_enter()` optional. Called when attached and the host is in an active scene.
- `update(dt)` optional. Called each frame.
- `draw(ctx)` optional. Called each frame, in host-local space (origin at host position).
- `on_exit()` optional. Called when detached or the host is removed from its scene.

The base class provides no-op implementations so subclasses only define the hooks they need.

### SignalBus (global)

Responsibilities: provide a global pub/sub mechanism for decoupled events.

Public API:

- `emit(name, payload)` fires a signal. Payload is a single argument, conventionally an object literal.
- `on(name, handler)` registers a listener. Returns an unregister function for convenience.
- `off(name, handler)` manually unregisters.

Exported as a single instance from `engine/signal-bus.js`. Referenced via the engine's namespace (the build step exposes engine modules under a single global, e.g. `Engine.signals`).

### Input (global)

Responsibilities: maintain latched keyboard and mouse state, expose query methods.

Public API:

- `isDown(key)` true if `key` is currently pressed.
- `wasJustPressed(key)` true only on the frame `key` transitioned from up to down.
- `wasJustReleased(key)` true only on the frame `key` transitioned from down to up.
- `mouse.x, mouse.y` current mouse position relative to the canvas.
- `mouse.left, mouse.right` current button state.
- `update()` called once per frame by Game; advances "just pressed/released" tracking.

Key identifiers follow the standard `KeyboardEvent.key` values (`'ArrowLeft'`, `'Space'`, `'a'`, etc.).

Internal: attaches DOM event listeners (`keydown`, `keyup`, `mousemove`, `mousedown`, `mouseup`) at construction. The constructor accepts an optional canvas element so mouse coordinates are computed relative to it.

## Frame lifecycle

For each animation frame the Game class executes, in order:

1. Compute `dt` from `(now - lastFrameTime) / 1000`. Clamp to a maximum (e.g. 0.1 seconds) to avoid huge jumps after tab inactivity.
2. If a scene transition is pending, perform it: `currentScene?.exit()`, set new currentScene, `currentScene.enter()`.
3. `Input.update()` to advance "just pressed/released" tracking.
4. `currentScene.update(dt)`, which iterates GameObjects and their attached Scripts.
5. Clear the canvas.
6. `currentScene.draw(ctx)`, which iterates GameObjects, applies each transform, calls each one's `draw(ctx)`, restores.
7. Schedule the next frame via `requestAnimationFrame`.

## Transform handling

When Scene draws each GameObject, it wraps the call in canvas state changes:

```js
for (const obj of this.objects) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.rotate(obj.rotation);
  ctx.scale(obj.scale, obj.scale);
  obj.draw(ctx);
  ctx.restore();
}
```

Scripts that draw treat (0, 0) as the host GameObject's position. A `Renderer` script drawing a 32x32 square would draw it at `(-16, -16, 32, 32)` to be centered on the host, not at `(host.x - 16, host.y - 16, 32, 32)`. Scripts may still read `this.host.x` and `this.host.y` for game logic such as distance checks.

## Coordinate system

Canvas default: origin at top-left of the canvas, X increasing right, Y increasing down. See ADR-0008 for trade-off rationale. Trigonometry that assumes Y-up requires a sign flip on Y components.

## Signal naming convention

Signals are lowercase, snake_case. Use past-tense verbs for events that have happened, present-tense or noun phrases for state changes:

- `player_died`
- `level_complete`
- `enemy_spawned`
- `score_changed`
- `pause_requested`

Payload is a single object literal. When a script or object type emits or listens to a signal, document it in the relevant `_registry.md` so the signal contract is discoverable without grepping code.

## File layout summary

```
engine/
├── game.js
├── scene.js
├── game-object.js
├── script.js
├── signal-bus.js
└── input.js
```

## Open questions and future work

Not in scope for the initial engine version, to be designed with an ADR when needed:

- Multi-scene support (deferred per ADR-0006).
- Asset loading and caching. For now, scripts can construct `Image` objects directly when needed.
- Audio.
- Save and load of persistent state.
- Frame-rate-independent physics. Current dt-based motion is naive and acceptable for early POCs.
- Collision system. Will live in `scripts/` as a `Collider` script with a registration registry inside Scene; design when needed.
