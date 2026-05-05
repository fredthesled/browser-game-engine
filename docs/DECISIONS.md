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
