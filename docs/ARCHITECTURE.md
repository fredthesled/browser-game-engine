# Architecture

This document describes the engine's design as of the most recent locked-in decisions (see `docs/DECISIONS.md`). When you change the engine, update this document in the same commit.

## Overview

The engine is composed of eight classes/modules, each in its own file under `engine/`:

| File | Class/module | Role |
|------|--------------|------|
| `engine/game.js` | `Game` | Owns the animation loop, the canvas, and the active scene. Constructs the engine-level singletons. |
| `engine/scene.js` | `Scene` | Owns a collection of GameObjects. Has lifecycle hooks. Runs the per-frame collision pass. |
| `engine/game-object.js` | `GameObject` | Transform host. Owns a list of attached Scripts. |
| `engine/script.js` | `Script` | Base class for attachable behaviors. |
| `engine/signal-bus.js` | `SignalBus` (global instance) | Pub/sub for decoupled events. |
| `engine/input.js` | `Input` (global instance) | Latched keyboard and mouse state, queried per frame. |
| `engine/audio.js` | `Audio` (global instance) | Procedural sound effects via vendored jsfxr. |
| `engine/storage.js` | `Storage` (global instance) | Key/value persistence backed by localStorage, with optional per-game namespacing. |

The runtime expects a single Game instance, a single SignalBus instance, a single Input instance, a single Audio instance, and a single Storage instance. Scenes, GameObjects, and Scripts are instantiated freely.

Vendored third-party code lives under `engine/lib/`. Currently this contains `riffwave.js` and `sfxr.js` (jsfxr v1.4.0, public domain), used by `engine/audio.js`. See `engine/lib/README.md` for the source and update procedure.

## Class contracts

### Game

Responsibilities: own the loop, hold the active scene, drive input updates each frame, manage the canvas reference, construct the engine-level singletons.

Public API:

- `constructor(canvas, options = {})` takes a `<canvas>` DOM element and an options object. Constructs `Engine.input = new Engine.Input(canvas)`, `Engine.audio = new Engine.Audio()`, and `Engine.storage = new Engine.Storage(options.gameName)`.
  - `options.gameName` (optional string): becomes the namespace prefix for `Engine.storage`. Omit for a no-namespace storage instance. See ADR-0014.
- `start()` begins the requestAnimationFrame loop.
- `stop()` cancels the loop.
- `setScene(scene)` at the next frame boundary, calls `currentScene.exit()` if a scene is active, then `scene.enter()`, and swaps the reference.
- `currentScene` read-only reference to the active scene (or null before any scene is set).
- `gameName` read-only string set from the `gameName` option, or empty string if not provided.

Internal state: `lastFrameTime` for delta time calculation, `_pendingScene` for queued transitions, `_animationHandle` for cancellation.

### Scene

Responsibilities: own a collection of GameObjects, provide lifecycle hooks, apply per-object transforms during draw, run the per-frame collision pass.

Public API:

- `constructor()` initializes an empty object list.
- `enter()` called when this scene becomes active. Subclasses populate the scene here.
- `exit()` called when this scene is being replaced. Subclasses tear down here.
- `update(dt)` iterates GameObjects and calls `obj.update(dt)` on each, then runs `_collisionPass()`.
- `draw(ctx)` iterates GameObjects, applies each one's transform via `ctx.save/translate/rotate/scale`, calls `obj.draw(ctx)`, then `ctx.restore()`.
- `add(gameObject)` adds a GameObject to the scene.
- `remove(gameObject)` removes one.

Internal:

- `_collisionPass()` walks every GameObject's scripts looking for instances marked with `isCollider === true`, gathers them into a list, and runs pairwise AABB tests. For each colliding pair (a, b), invokes `a.onCollide(b)` and `b.onCollide(a)`. Collisions fire every frame the boxes overlap, not only on entry. See ADR-0010 for design rationale and the duck-typing contract.

Subclasses typically override `enter()` to populate the scene with GameObjects. They may override `update` or `draw` to add scene-level logic before or after the per-object iteration; subclasses should call `super.update(dt)` or `super.draw(ctx)` when doing so. Overriding `update` without calling super disables the collision pass.

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

Scripts that participate in collision detection (Collider and any future variants) set `this.isCollider = true` and implement `getAabb()` and `onCollide(other)`. See ADR-0010 for the contract.

A Script does not have to be attached to a host's scripts list to be useful. A controlling script can construct a Script-derived object as a private member and drive its lifecycle manually (calling its `update(dt)` and `draw(ctx)` itself). `ShapeSprite` is used this way by character scripts in Clown Brawler: the controller script owns the sprite, sets its animation state and alpha each frame, and forwards lifecycle calls. This pattern keeps draw ordering deterministic (the controller decides when its effects layer relative to the sprite) and avoids the need to look up sibling scripts on the host.

### SignalBus (global)

Responsibilities: provide a global pub/sub mechanism for decoupled events.

Public API:

- `emit(name, payload)` fires a signal. Payload is a single argument, conventionally an object literal.
- `on(name, handler)` registers a listener. Returns an unregister function for convenience.
- `off(name, handler)` manually unregisters.

Exported as a single instance from `engine/signal-bus.js` as `Engine.signals`. The class itself is `Engine.SignalBus`.

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

Internal: attaches DOM event listeners (`keydown`, `keyup`, `mousemove`, `mousedown`, `mouseup`) at construction. The constructor accepts an optional canvas element so mouse coordinates are computed relative to it. Instantiated by Game and assigned to `Engine.input`.

### Audio (global)

Responsibilities: register and play procedural sound effects defined as JSON parameter objects. Wraps the vendored jsfxr library (`engine/lib/sfxr.js` and `engine/lib/riffwave.js`).

Public API:

- `register(name, paramsOrPreset)` registers a sound under a name. `paramsOrPreset` is either a jsfxr params object (e.g. copied as JSON from sfxr.me) or a preset name string. Available presets: `'pickupCoin'`, `'laserShoot'`, `'explosion'`, `'powerUp'`, `'hitHurt'`, `'jump'`, `'blipSelect'`, `'synth'`, `'tone'`, `'click'`, `'random'`. Note that preset names roll up randomized parameters, so registering the same preset twice produces two different-sounding sounds.
- `play(name)` plays a registered sound by name. Silent no-op if name is unknown or if `setMuted(true)` is in effect. The compiled audio buffer is cached on first play.
- `setVolume(v)` master volume in `[0, 1]`. Affects all subsequent plays.
- `getVolume()` returns current master volume.
- `setMuted(bool)` mute or unmute.
- `isMuted()` returns mute state.

Instantiated by Game and assigned to `Engine.audio`. See ADR-0011 for the rationale that audio is an engine module rather than a Script.

Browser autoplay caveat: AudioContext may start suspended until a user gesture. The first `play()` after any keydown/mousedown will unlock audio. Calls before any gesture may produce no sound in some browsers (silent no-op rather than error).

### Storage (global)

Responsibilities: provide key/value persistence backed by `localStorage`, with optional per-game namespacing transparently applied to all keys. Falls back to an in-memory `Map` if localStorage is unavailable so calls never throw.

Public API:

- `save(key, value)` JSON-serializes and stores. Returns `true` on success, `false` if serialization fails, the quota is exceeded, or `value` is `undefined`.
- `load(key, defaultValue = null)` JSON-parses and returns the stored value. Returns `defaultValue` if the key is missing or stored data cannot be parsed.
- `has(key)` `true` if a value is stored under the key.
- `clear(key)` removes a single key. Silent if the key does not exist.
- `clearAll()` removes every key in this namespace. With no namespace, removes every key on the origin (use carefully; affects other apps sharing the origin).
- `keys()` returns an array of unprefixed keys present in this namespace.
- `isAvailable()` `true` if `localStorage` is the underlying store; `false` if the in-memory fallback is in use (data does not persist across reloads).
- `getNamespace()` returns the configured namespace string (empty string if none).

Instantiated by Game and assigned to `Engine.storage`. The namespace is taken from the Game constructor's `options.gameName`; with no `gameName`, keys are stored as-is. See ADR-0014 for the rationale that storage is a Game-configured singleton rather than a per-game instance or a flat-prefix wrapper.

Serialization caveats: `undefined` cannot round-trip through JSON; `save()` refuses it with a console warning. Callers wanting to remove a key should call `clear()` explicitly. `null` is a valid value and round-trips correctly. Be aware that `load()` returning `null` is ambiguous (missing vs. explicitly stored null); use `has()` to disambiguate when needed.

## Frame lifecycle

For each animation frame the Game class executes, in order:

1. Compute `dt` from `(now - lastFrameTime) / 1000`. Clamp to a maximum (e.g. 0.1 seconds) to avoid huge jumps after tab inactivity.
2. If a scene transition is pending, perform it: `currentScene?.exit()`, set new currentScene, `currentScene.enter()`.
3. `Engine.input.update()` to advance "just pressed/released" tracking.
4. `currentScene.update(dt)`. Internally:
   1. Iterates GameObjects and calls each one's `update(dt)`, which calls `update(dt)` on each attached Script.
   2. Runs `_collisionPass()`: gathers all `isCollider`-marked scripts, runs pairwise AABB tests, invokes `a.onCollide(b)` and `b.onCollide(a)` for each overlapping pair.
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

Note that collision response between a colliding pair is dispatched via direct method call (`a.onCollide(b)`, `b.onCollide(a)`), not via the SignalBus. Scripts that want collisions to fan out (e.g., to play a sound) should emit their own signals from inside `onCollide`. See ADR-0010.

## File layout summary

```
engine/
├── game.js
├── scene.js
├── game-object.js
├── script.js
├── signal-bus.js
├── input.js
├── audio.js
├── storage.js
└── lib/
    ├── README.md
    ├── UNLICENSE
    ├── riffwave.js   (vendored, public domain)
    └── sfxr.js       (vendored, public domain)
```

## Build concatenation order

The single-file HTML build (`build/<name>.html`) inlines source files in the following order. Files later in the list may depend on globals defined by files earlier in the list.

1. `engine/lib/riffwave.js`
2. `engine/lib/sfxr.js` (depends on `RIFFWAVE` global from riffwave.js)
3. `engine/signal-bus.js`
4. `engine/input.js`
5. `engine/script.js`
6. `engine/game-object.js`
7. `engine/scene.js`
8. `engine/audio.js` (depends on `jsfxr` global from sfxr.js)
9. `engine/storage.js` (no engine dependencies)
10. `engine/game.js` (instantiates `Engine.Audio` and `Engine.Storage` in its constructor)
11. Scripts. The general rule is "any order," with the constraint that a script must be defined before any other script that references it via the `Engine` namespace. In particular, `scripts/shape-sprite.js` must be defined before any character script that wraps a `ShapeSprite` instance (`games/clown-brawler/scripts/*` from v2 onward). Other scripts depend only on `Engine.Script`, `Engine.input`, `Engine.signals`, `Engine.audio`, and `Engine.storage`.
12. Scenes (after the scripts they reference).
13. A small bootstrap snippet that gets the canvas element, instantiates `Engine.Game` (optionally with `{ gameName: '<name>' }`), sets the initial scene, and calls `start()`.

## Open questions and future work

Not in scope for the initial engine version, to be designed with an ADR when needed:

- Multi-scene support (deferred per ADR-0006).
- Asset loading and caching for images. For now, scripts can construct `Image` objects directly when needed.
- File-backed audio playback (mp3/ogg/wav). Will live in `scripts/audio-player.js` wrapping Howler.js. Distinct from `Engine.audio`, which handles procedural SFX. See ADR-0011.
- Frame-rate-independent physics. Current dt-based motion is naive and acceptable for early POCs.
- Spatial partitioning for collision. The current O(N²) pairwise pass is fine up to ~20 colliders. See ADR-0010.
- Networking and multiplayer. See `docs/resources/multiplayer.md`.
