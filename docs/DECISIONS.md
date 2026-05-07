# Architecture Decisions

A running log of choices made about how this framework works. Each entry includes context and rationale, so future revisits can determine whether the original reason still applies. Newer entries go at the bottom.

## ADR-0001: Repo structure mirrors Godot's conceptual model

Date: 2026-05-05

**Decision**: Use top-level folders for `engine/`, `scenes/`, `objects/`, `scripts/`, `games/`, and `build/`.

**Context**: The user is comfortable with Godot's separation of scenes, nodes, and scripts and wants the framework to feel familiar. Browser JS allows arbitrary structure, so we adopted Godot's conceptual hierarchy as a starting point rather than a pure component-based ECS or a single-file flat layout.

**Consequences**:

- Anyone familiar with Godot can navigate the repo with minimal ramp-up.
- We commit to the scene/object/script trichotomy. Pure ECS would require a different organization.
- Migration to a different model later would require renames and registry rewrites, but is not blocked.

## ADR-0002: Single-file HTML build target

Date: 2026-05-05

**Decision**: Source code lives as separate JS files. The shipped artifact for each game is a single HTML file in `build/` with all JS inlined.

**Context**: The user has browser-only development constraints (corporate network, no installable tools). A single HTML file runs anywhere, including offline, and avoids module-loading complications when opened from the local filesystem (where ES modules trigger CORS errors in some browsers).

**Consequences**:

- ES module `import` statements are not used at runtime. They may be used in source files for organization, with the build step inlining everything into ordered script tags.
- No external CDN dependencies unless explicitly approved.
- The build step is currently manual: Claude concatenates files into the HTML on request.
- This couples deployment simplicity with a slight loss of in-browser modularity. Acceptable for the target audience and constraints.

## ADR-0003: Documentation as source of truth

Date: 2026-05-05

**Decision**: Markdown files in `docs/` and per-folder `_registry.md` files are authoritative for what exists, what it does, and why. Code is the implementation of the documented spec.

**Context**: Across many AI chat sessions with potentially fresh contexts, we need a stable reference that does not depend on conversation memory. The .md files travel with the repo and survive any context loss.

**Consequences**:

- Every code change requires a documentation update in the same response.
- The CONVENTIONS.md update protocol enforces this.
- If code and docs disagree, the disagreement is a bug to be reconciled, not a normal state.
- Some friction is introduced for small code changes, in exchange for long-term consistency.

## ADR-0004: Composition over inheritance for GameObject specialization

Date: 2026-05-05

**Decision**: GameObject specialization is achieved through attachable Scripts (composition), not subclassing.

**Context**: Two main patterns are available for giving GameObjects specific behavior. Inheritance (a `Player` class extends `GameObject`) is conceptually simple but produces deep hierarchies and resists code reuse across unrelated types. Composition (a generic GameObject with attached Script behaviors) is the model Godot uses and matches the user's mental model.

**Consequences**:

- The base GameObject class stays minimal: a transform host with a list of attached scripts.
- Reusable behaviors (e.g., a `Mover` that responds to input) can attach to any GameObject without inheritance gymnastics.
- A `Player` is not a class; it is a GameObject with `Mover`, `Renderer`, and `Collider` scripts attached.
- Scripts may read each other's state via `this.host.scripts`, but should prefer signals for cross-script communication when possible.

## ADR-0005: Hybrid input model (latched state plus signal events)

Date: 2026-05-05

**Decision**: Raw input (keys, mouse) is collected into an `Input` module that scenes query each frame. Higher-level game events (`player_died`, `level_complete`) flow through the SignalBus.

**Context**: Two extremes exist. Pure event-driven input forces every consumer to register and unregister handlers, which is verbose for per-frame polling like "is the left arrow held down right now." Pure polled input loses the benefit of decoupled event semantics. A split keeps each concern in its natural shape.

**Consequences**:

- Input has a query API: `Input.isDown('ArrowLeft')`, `Input.wasJustPressed('Space')`, `Input.mouse.x`.
- The Input module updates once per frame, called by the Game loop before scene update.
- Game events that should reach unrelated systems (UI, audio, scoreboard) use `SignalBus.emit(name, payload)`.
- The SignalBus is not for input, and Input is not for events. The split is by data lifetime: input is "what is currently true," signals are "what just happened."

## ADR-0006: Single active scene from day one

Date: 2026-05-05

**Decision**: The engine supports exactly one active scene at a time in its initial version. Multi-scene composition (overlays, scene stacks) is deferred.

**Context**: Multi-scene support adds API surface and conceptual complexity (which scenes receive input, who renders on top of whom, how transitions work). Without a concrete use case, designing it now risks getting it wrong in a way that constrains later choices.

**Consequences**:

- The Game class holds a single `currentScene` reference and a `setScene(scene)` method.
- Scene transitions call `exit()` on the outgoing scene and `enter()` on the incoming one, giving each a chance to set up or tear down state.
- Pause overlays, HUDs, and UI screens will initially live as additional GameObjects within a single scene, not as separate scenes.
- When a real need for stacked scenes arises, it will be added with a known concrete use case in mind, recorded as a new ADR.

## ADR-0007: Game class owns the animation loop, not Scene

Date: 2026-05-05

**Decision**: A standalone `Game` class owns the `requestAnimationFrame` loop, the canvas reference, and the active scene. Scenes are loop-agnostic and only receive `update(dt)` and `draw(ctx)` calls.

**Context**: Putting the loop inside Scene couples scene logic to lifecycle plumbing and makes scene transitions awkward (the new scene has to take over the loop). Externalizing the loop into a Game orchestrator cleanly separates "the engine is running" from "this scene is what's running."

**Consequences**:

- `Game.start()` boots the loop. `Game.setScene(scene)` swaps the active scene at the next frame boundary.
- Scenes are pure logic and rendering containers. They do not call `requestAnimationFrame` themselves.
- Pausing is a Game-level concern (skip update calls, optionally still draw) rather than a scene-level one.
- The Game class is thin and stable; most of the framework's growth happens in Scene, GameObject, and Script.

## ADR-0008: Top-left origin, Y-down coordinate system

Date: 2026-05-05

**Decision**: The engine uses the Canvas default coordinate system: origin at the top-left of the canvas, X increasing right, Y increasing down.

**Context**: Some 2D engines flip Y to match math conventions (origin at bottom-left, Y up). This is friendlier for physics and trigonometry but requires translating every Canvas API call. Keeping the Canvas default avoids that translation and means raw Canvas examples from the web work without modification.

**Consequences**:

- Positive Y means "down" in all engine code, scripts, and game logic.
- Trigonometry that assumes Y-up needs a sign flip when applied to motion (for example, `dy = -sin(angle) * speed` if you want angle 0 to point right and angle 90 to point up).
- Documentation and code comments should make Y-down explicit when discussing motion or angles, to avoid silent confusion.

## ADR-0009: License policy for third-party resources

Date: 2026-05-05

**Decision**: Prefer permissive licenses (CC0, public domain, MIT, BSD, ISC, Apache 2.0). CC-BY is acceptable when properly credited. CC-BY-SA is acceptable but commits the project that uses it to also being CC-BY-SA. Avoid GPL for code we bundle and avoid NC (non-commercial) variants.

**Context**: The framework is a long-running template intended to support multiple games over time. Some of those games may eventually be made source-available, shared, or relicensed. License decisions made today constrain those options. A consistent policy means we do not have to re-evaluate the same trade-off per asset.

**Consequences**:

- Every asset and library inclusion requires reading the license. The `docs/resources/` files pre-vet sources for license clarity so the cost of this is amortized.
- A single CC-BY-SA asset propagates the share-alike requirement to the entire game it appears in. That is acceptable but should be a deliberate choice rather than an accidental one.
- This policy applies to assets bundled in the build. It does not apply to authoring tools (like BeepBox or jsfxr's web UI) that we use to create content but do not ship.
- When the license is unclear or the source is anonymous, the safe choice is not to use the asset.

## ADR-0010: AABB collision via duck-typed Collider scripts with method-based response

Date: 2026-05-06

**Decision**: Collision detection lives in `scripts/collider.js` as a `Collider` Script. Scenes locate Colliders by duck-typing on the boolean marker `script.isCollider` rather than using `instanceof`. Detected pairs invoke `a.onCollide(b)` and `b.onCollide(a)` directly each frame, rather than emitting collision events through the SignalBus. The broad-phase is naive O(N²) iteration.

**Context**: The plan recorded in earlier session notes was to emit collision pairs through the SignalBus. Several alternatives were weighed during implementation:

1. Direct `instanceof Collider` checks in Scene.
2. Duck-typing on a marker like `script.isCollider`.
3. Explicit registration in a Scene-side collider list, populated by the Collider script's `on_enter` and cleared by `on_exit`.
4. SignalBus events of the form `collision_started({ a, b })`, `collision_ended({ a, b })`.

Duck-typing was preferred over `instanceof` because the engine code in `engine/scene.js` does not import or otherwise know about the `Collider` class (which lives in `scripts/`); requiring it would introduce an upward dependency from the engine module to the scripts folder. The marker is a single boolean property, costs almost nothing, and lets future Collider variants (CircleCollider, PolygonCollider) share the same Scene contract by setting the same flag.

Explicit registration via `on_enter`/`on_exit` was rejected for the initial version because it adds bookkeeping (the Scene must maintain a separate list of colliders, kept in sync as objects are added or removed) that O(N²) iteration over the existing object list does not need. Registration is a future optimization once colliders are common enough to dominate the per-frame cost.

Direct method calls (`a.onCollide(b)`) were preferred over SignalBus events for collision response because:

- Collisions are inherently pairwise and local to the two objects involved. A signal subscription model would force every collider to filter incoming events to find collisions involving itself, which is wasteful and verbose.
- The SignalBus is for events that should fan out to unrelated systems (HUD, score, audio). Collision response is rarely fan-out work; it is the affected objects updating their own state.
- A `Collider` subclass overriding `onCollide` (or passing an `onCollide` callback in options) reads more naturally than `Engine.signals.on('collision', ev => ev.a === this || ev.b === this ? ... : ...)`.
- When a collision **does** need to fan out (e.g., "play a sound"), the script's `onCollide` handler can emit a signal of its own, e.g. `Engine.signals.emit('hit', { other })`. This composes cleanly: signals are still available for the cases that actually need them.

O(N²) broad-phase was chosen because all anticipated games for the foreseeable future have N < 20 colliders. At N = 20, that is 190 pairs per frame, well under any modern browser's per-frame budget. When this budget is approached, spatial partitioning (uniform grid, quadtree) can replace the loop without changing the Collider script's API.

**Consequences**:

- `engine/scene.js` runs `_collisionPass()` after the per-object update loop and before draw. The pass walks every object's scripts looking for `isCollider`-marked instances, builds a list, and pairwise-tests their AABBs.
- A Collider's AABB is computed on the fly via `getAabb()` on each pass, so moving a collider just means moving its host's `x` and `y`; nothing else needs to be invalidated.
- The order of `onCollide` calls within a frame is deterministic (insertion order of the colliders, then alphabetical pair order). Game code should not rely on this ordering for correctness, but it is reproducible for debugging.
- Collisions fire every frame the boxes overlap, not just on entry. If a game needs "on entry" semantics, the Collider's `onCollide` handler should track previously-touching peers and dedupe. A future enhancement could move this dedupe into Scene as `onCollisionEnter`/`onCollisionExit` if it becomes a recurring need.
- Scripts other than Collider may also set `isCollider = true` and implement `getAabb()` and `onCollide()` to participate in collision. This is intentional: the Scene's collision pass treats the marker as a contract, not as a class identity.
- The naive broad-phase is documented as a known scaling cliff. Replacing it is recorded in `engine/scene.js` as a comment and is not blocked by any other decision in this ADR.

## ADR-0011: Audio as engine-level service, not a Script

Date: 2026-05-06

**Decision**: Audio playback is provided by the `Engine.Audio` class in `engine/audio.js` as an engine module, instantiated as a singleton at `Engine.audio` by the `Game` constructor (alongside `Engine.input`). It is **not** a Script attached to a GameObject.

**Context**: The earlier plan called for `scripts/sfx-player.js`, treating audio playback as an attachable behavior. During implementation it became clear that audio is an engine-level service, structurally identical to Input:

- Audio has no per-host meaning. There is no GameObject whose audio output is being modeled by the script. Every GameObject that wants to play a sound is just calling into a global capability.
- Sound libraries live in a single namespace, not per-host. Multiple GameObjects can register sounds, but they all live in one shared dictionary; there is no notion of "this GameObject's sounds" as a distinct concept.
- Volume and mute are global controls, not per-host.
- Caching of compiled audio buffers belongs on the audio system, not on individual hosts.

Forcing audio into the Script abstraction would have required either (a) attaching the SFX player to one designated "manager" GameObject and routing every play call through `manager.scripts.find(s => s instanceof SfxPlayer).play(name)`, which is awkward, or (b) attaching a duplicate SfxPlayer to every host that needed sound, which is wasteful. The Input module avoided this by being an engine module from the start; audio follows the same pattern.

**Consequences**:

- `engine/audio.js` defines `Engine.Audio` (the class) and the `Game` constructor instantiates `Engine.audio = new Engine.Audio()` alongside `Engine.input = new Engine.Input(canvas)`. The pattern is uniform across both global services.
- The build concatenation order requires `engine/lib/riffwave.js` and `engine/lib/sfxr.js` (the vendored jsfxr library) before `engine/audio.js`, and `engine/audio.js` before `engine/game.js` (which instantiates `Engine.Audio` in its constructor body).
- Public API on `Engine.audio`: `register(name, paramsOrPreset)`, `play(name)`, `setVolume(v)`, `getVolume()`, `setMuted(bool)`, `isMuted()`. Sounds are registered up front (in a scene's `enter()` or in the bootstrap) and played by name.
- Game code calls `Engine.audio.play('hit')` directly. This stays consistent with the way Input is used (`Engine.input.isDown('ArrowLeft')`).
- Browser autoplay policy: AudioContext may start in the suspended state until a user gesture. The first `play()` call inside or shortly after a user gesture (keydown, mousedown) unlocks audio for the rest of the session. Calls before any gesture are silent no-ops in some browsers. This is an upstream browser behavior, not something the wrapper attempts to mask. If a future game needs guaranteed first-frame audio, an explicit `Engine.audio.unlock()` method can be added that resumes the context inside a known user-gesture handler.
- jsfxr internally accumulates a `channels` array on each cached audio object that grows on every `play()` call. This is a slow memory leak inherent to the upstream library. For our hobby-scale games (thousands of plays per session, not millions), it does not matter. If a future long-running game encounters this, the wrapper can manage its own BufferSource objects rather than relying on jsfxr's `play()` method, or periodically rebuild the cached audio.
- The `audio-player.js` Script wrapping Howler.js (in the original plan) is still appropriate: Howler is for file-backed audio playback (mp3/ogg/wav), where there **is** a per-host concept (a positional sound emitter, a music track owned by a level scene, etc.). When audio-player lands, it will live in `scripts/` precisely because the per-host concept is real for it. The two wrappers do not duplicate functionality: `Engine.audio` is for procedural SFX defined as JSON in source, the future `audio-player.js` is for sound files.
