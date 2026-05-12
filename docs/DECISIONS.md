# Architecture Decisions

A running log of choices made about how this framework works. Each entry includes context and rationale, so future revisits can determine whether the original reason still applies. Newer entries go at the bottom.

## ADR-0001: Repo structure mirrors Godot's conceptual model

Date: 2026-05-05

**Decision**: Use top-level folders for `engine/`, `scenes/`, `objects/`, `scripts/`, `games/`, and `build/`.

**Context**: The user is comfortable with Godot's separation of scenes, nodes, and scripts and wants the framework to feel familiar. Browser JS allows arbitrary structure, so we adopted Godot's conceptual hierarchy as a starting point.

**Consequences**: Anyone familiar with Godot can navigate the repo with minimal ramp-up. We commit to the scene/object/script trichotomy.

## ADR-0002: Single-file HTML build target

Date: 2026-05-05

**Decision**: Source lives as separate JS files. Each shipped game is a single HTML file in `build/` with all JS inlined.

**Context**: Browser-only constraints (corporate network, no installable tools). Single HTML runs anywhere offline and avoids ES module CORS issues when opened from the filesystem.

**Consequences**: No ES module `import` at runtime. No external CDN. Manual build step (Claude concatenates). No bundler.

## ADR-0003: Documentation as source of truth

Date: 2026-05-05

**Decision**: Markdown files in `docs/` and per-folder `_registry.md` are authoritative. Code is the implementation of the documented spec.

**Context**: Across many AI chat sessions with fresh contexts, stable reference docs are essential. The .md files travel with the repo and survive context loss.

**Consequences**: Every code change requires a documentation update in the same response. If code and docs disagree, it is a bug.

## ADR-0004: Composition over inheritance for GameObject specialization

Date: 2026-05-05

**Decision**: GameObject specialization is achieved through attachable Scripts, not subclassing.

**Context**: Composition matches Godot's model and avoids deep hierarchies. Reusable behaviors attach to any GameObject.

**Consequences**: The base GameObject stays minimal. A "Player" is a generic GameObject with Mover, Renderer, Collider scripts attached. Scripts communicate via signals when cross-script coupling is needed.

## ADR-0005: Hybrid input model (latched state plus signal events)

Date: 2026-05-05

**Decision**: Raw input lives in the `Input` module (queried per-frame). Higher-level game events flow through the SignalBus.

**Context**: Per-frame polling is natural for movement. Signal-bus events are natural for one-time occurrences like scoring. A split keeps each in its natural shape.

**Consequences**: `Input.isDown`, `Input.wasJustPressed` for raw state. `SignalBus.emit/on` for game events. The two are not mixed.

## ADR-0006: Single active scene from day one

Date: 2026-05-05

**Decision**: The engine supports exactly one active scene at a time. Multi-scene composition is deferred.

**Context**: Multi-scene adds API complexity without a concrete use case to design against.

**Consequences**: `Game.setScene(scene)` transitions at the next frame boundary. Pause overlays and HUDs live inside the single active scene. When a real need for scene stacking arises, a new ADR will cover it.

## ADR-0007: Game class owns the animation loop, not Scene

Date: 2026-05-05

**Decision**: A standalone `Game` class owns `requestAnimationFrame`, the canvas, and the active scene. Scenes only receive `update(dt)` and `draw(ctx)`.

**Context**: Putting the loop inside Scene makes transitions awkward. Externalizing it cleanly separates "the engine is running" from "this scene is active."

**Consequences**: `Game.start()` boots the loop. `Game.setScene(scene)` swaps at the next frame boundary. Pausing is a game-side concern (scenes skip their update when paused).

## ADR-0008: Top-left origin, Y-down coordinate system

Date: 2026-05-05

**Decision**: Use the Canvas default: origin top-left, X right, Y down.

**Context**: Matching Canvas avoids a per-call coordinate translation. Raw Canvas examples from the web work without modification.

**Consequences**: Positive Y means "down" everywhere. Trigonometry that assumes Y-up needs a sign flip.

## ADR-0009: License policy for third-party resources

Date: 2026-05-05

**Decision**: Prefer CC0/public domain/MIT/BSD/ISC/Apache 2.0. Accept CC-BY with credit. Accept CC-BY-SA knowingly (commits the game to share-alike). Avoid GPL bundled code and NC variants.

**Context**: Consistent policy prevents per-asset re-evaluation and keeps future licensing options open.

**Consequences**: Every asset requires reading the license before inclusion. `docs/resources/` pre-vets sources.

## ADR-0010: AABB collision via duck-typed Collider scripts with method-based response

Date: 2026-05-06

**Decision**: Scene locates colliders by duck-typing on `script.isCollider`. Detected pairs invoke `a.onCollide(b)` and `b.onCollide(a)` directly each frame. Broad-phase is naive O(N²).

**Context**: `instanceof` would create an upward dependency from `engine/scene.js` to `scripts/`. Duck-typing avoids that. Direct method calls are preferred over SignalBus for pairwise-local collision response; scripts can emit their own signals from inside `onCollide` when fan-out is needed.

**Consequences**: Scripts that participate in collision set `isCollider = true` and implement `getAabb()` and `onCollide(other)`. The Scene's collision pass treats this as a contract, not a class identity. O(N²) is acceptable for hobby-scale games (N < 20). Spatial partitioning is the documented upgrade path.

## ADR-0011: Audio as engine-level service, not a Script

Date: 2026-05-06

**Decision**: `Engine.Audio` lives in `engine/audio.js` and is instantiated as `Engine.audio` by the `Game` constructor alongside `Engine.input`. It is not a Script.

**Context**: Audio has no per-host meaning. Volume and mute are global controls. Caching belongs on the audio system. The Input module follows the same singleton pattern and audio should match.

**Consequences**: `Engine.audio.register(name, params)` / `Engine.audio.play(name)`. Build concatenation order: riffwave.js, sfxr.js, then audio.js, then game.js. File-backed audio (Howler.js) is still appropriate as a Script (`scripts/audio-player.js`) for per-host spatial sounds.

## ADR-0012: ESC-to-pause as a game-level convention

Date: 2026-05-06

**Decision**: All games built on the engine should provide ESC-to-pause. Implemented via the `PauseOverlay` utility class (`scripts/pause-overlay.js`). The pause menu includes audio volume (Left/Right) and mute (M) controls, and optionally a quit-to-menu action.

**Context**: Pause is a near-universal player expectation. Options considered:

1. Engine-level pause: `Game.pause()`/`Game.resume()` that halt the loop. Requires Game to know game-specific pause semantics (still draw? freeze audio?).
2. Scene-level hook: a virtual `Scene.onPause()` the Game calls on ESC. Couples the engine to a specific key binding.
3. Game-level convention: a reusable plain class each scene instantiates and delegates to.

Option 3 keeps the engine ignorant of pause entirely while still providing shared behavior. `PauseOverlay` is consistent with ADR-0006 (pause UI lives inside the active scene) and ADR-0007 (Game owns the loop, not scene-specific concerns).

Audio controls are included in the pause menu as the simplest path to per-session audio adjustment without a dedicated settings scene.

**Consequences**:

- Every pauseable game scene instantiates `new PauseOverlay(game, { onQuit: ... })` and calls `this._pause.update(dt)` / `this._pause.draw(ctx)`. The scene gates its game logic on `!this._pause.isPaused()`.
- The engine (Game, Scene, Input) is unchanged. Pause is entirely game-side.
- `PauseOverlay` is a plain class in `scripts/`, not a Script subclass. This is a documented exception to the normal role of that folder.
- Pong needs to be retrofitted (tracked in STATE.md). All games created after this ADR include PauseOverlay from the start.
- If a game needs custom pause layout, it can subclass PauseOverlay or write its own.

## ADR-0013: Games are experimental probes during engine development

Date: 2026-05-12

**Decision**: Games built during the engine's development phase are treated as experimental probes rather than shipping products. Each game is a vehicle for exercising and stressing the engine across a different shape of problem (lockstep two-player input, large enemy counts and progression systems, sprite work and side-scrolling cameras, and so on). Gaps in shipped polish (missing SFX, missing pause, primitive-only rendering, untuned difficulty) are accepted as intentional during this phase.

**Context**: The engine is the long-running deliverable. Specific games are short-running explorations whose value is in what they teach the engine. Clown Brawler, for example, was an explicit probe of image-generation limits and animation assumptions; its lack of real sprites is the lesson, not a defect. Forcing every game to ship-grade completion before moving on would slow engine iteration and conflate two distinct kinds of work.

Without this framing, fresh Claude sessions land on a STATE.md showing three games with three different unaddressed gaps and reasonably interpret the situation as a backlog crisis. That interpretation is incorrect under the current development mode but defensible given the artifacts visible. The ADR exists to make the mode explicit.

**Consequences**:

- Three or more games in the repo may carry small unaddressed gaps simultaneously. This is expected.
- Future Claude instances should not nag about incomplete games or push to close every loose end before the next experiment. The default is to learn and move on.
- A separate, explicit "ship this game" pass would address the deferred items (Pong PauseOverlay, Survivors SFX, Clown Brawler sprites, etc.) for any game that gets promoted.
- The "next up" list in STATE.md is engine-oriented, not game-completion-oriented, while this ADR is in effect.
- Per-game polish items are tracked in a "Deferred to shipping mode" section of STATE.md so they remain visible without competing with engine priorities.
- Promotion is an explicit decision by the user. It is not a drift state Claude can declare.
- Reversing the framing is straightforward: a future ADR can move a specific game (or all games) into shipping mode and reactivate the deferred items.
