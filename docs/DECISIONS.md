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

## ADR-0014: Persistent storage via Engine.Storage with Game-configured namespace

Date: 2026-05-12

**Decision**: Persistent storage is provided by `engine/storage.js`, instantiated by the `Game` constructor as `Engine.storage` (parallel to `Engine.input` and `Engine.audio` per ADR-0011). The Game constructor accepts an optional `gameName` option which becomes the storage namespace; all keys are stored as `${gameName}:${key}` in localStorage. If `gameName` is omitted, keys are stored as-is.

**Context**: STATE.md flagged save/load as next-up engine work with an explicit open question on namespacing. Three options were considered:

1. **Caller-managed prefixes**: API takes raw keys; callers write `Engine.storage.save('survivors:stats', ...)`. Simplest engine code, but every callsite is responsible for the prefix and a typo silently splits keys across "namespaces."
2. **Per-game instance**: API has only the `Engine.Storage` class; each game's bootstrap creates `const save = new Engine.Storage('survivors')`. Clean separation, but breaks the existing singleton pattern from ADR-0011 (audio) and requires every game to thread a save object through its scene tree.
3. **Game-configured singleton (chosen)**: `Engine.storage` is auto-instantiated by Game with a namespace derived from the `gameName` option. Callsites use short keys (`Engine.storage.save('stats', ...)`), prefixing is transparent, and the pattern matches `Engine.input` / `Engine.audio`. Adds one option to the Game constructor signature, which is backward-compatible since `gameName` is optional.

Option 3 was chosen because it matches the established engine pattern (ADR-0011), minimizes ceremony at callsites, and makes per-game isolation the default behavior rather than a per-callsite responsibility.

**Consequences**:

- Game constructor signature is now `(canvas, options = {})`. The only currently-defined option is `gameName: string`. The change is backward-compatible: `new Engine.Game(canvas)` continues to work and instantiates `Engine.storage` with no namespace.
- Public API: `save(key, value)`, `load(key, defaultValue = null)`, `has(key)`, `clear(key)`, `clearAll()`, `keys()`, plus introspection helpers `isAvailable()` and `getNamespace()`. JSON serialization is automatic.
- If localStorage is unavailable (incognito, embedded contexts, disabled by the user), Storage falls back to an in-memory `Map` so calls do not throw. `isAvailable()` exposes the actual state. Data is lost when the page reloads in fallback mode.
- The build concatenation order grows to insert `engine/storage.js` after `engine/audio.js` and before `engine/game.js` (Game's constructor instantiates Storage). See ARCHITECTURE.md for the full updated order.
- Existing builds (Pong, Survivors, Clown Brawler) do not need to be regenerated. Their bootstrap snippets do not pass `gameName`, so `Engine.storage` exists with no namespace and is simply unused. The change is backward-compatible by design.
- When a game wants to use storage, its bootstrap passes `gameName`: `new Engine.Game(canvas, { gameName: 'survivors' })`. The first natural consumer is Survivors stats and coins, queued as a follow-up commit per the experimental-probe framing of ADR-0013.
- `save()` refuses `undefined` and logs a warning; callers wanting to remove a key should call `clear()` explicitly. This avoids the ambiguity of round-tripping `undefined` through JSON.
- `clearAll()` on an unnamespaced singleton wipes every key on the origin, including any that were set by other apps. This is acceptable because the only way to get an unnamespaced `Engine.storage` is to omit `gameName` from the Game constructor, which is a deliberate caller choice.

## ADR-0015: Procedural sprite primitive (ShapeSprite Script) as the Shape DSL

Date: 2026-05-12

**Decision**: Sprite content for engine-based games is produced via a procedural Shape DSL, embodied in the `ShapeSprite` Script (`scripts/shape-sprite.js`). Each animation is a JavaScript draw function `(ctx, state) => void` that draws into a canvas context in host-local space. The Script manages animation state (current name, normalized time t, loop/oneshot, flip, alpha) and dispatches to the appropriate draw function each frame. SVG-rasterize is deferred but not retired.

**Context**: The pixel-grid sprite generator was retired in the 2026-05-09 retro and the STATE.md sprite-generator retirement note. The forward path was identified as "SVG and/or shape-DSL sprites." Pre-flight research on 2026-05-12 (per CLAUDE.md §2) surveyed three relevant areas:

1. **LLM-generated SVG quality**: The SVGenius and LLM4SVG papers (December 2024) document fundamental limitations: flat-token representation loses spatial structure, models lack global visual coherence, and errors accumulate. Claude-3.5 specifically benchmarks middling (FID 82.89) compared to LLM4SVG's tuned model (FID 64.11). SVG generation is better than pixel grids for current LLMs but remains a known-weak domain.
2. **Shape DSL prior art**: Less direct precedent. Production canvas games predominantly use raster sprite sheets. Procedural canvas drawing appears in stylized indie work (Limbo, Sword & Sworcery) but is hand-built in vector tools rather than LLM-emitted.
3. **Existing engine state**: Clown Brawler's clowns and gorillas were already inline canvas-primitive code (rectangles, circles, paths). Shape DSL formalizes that pattern as reusable engine infrastructure with zero visual change required.

Three options were considered:

1. **SVG-rasterize**: Claude emits SVG markup per frame; rasterize to PNG via `data:image/svg+xml;base64,...` Image; feed to existing SpriteSheet. Pro: bitmap output, decouples authoring from runtime. Con: LLM SVG quality is documented-weak; per-frame markup multiplies token cost by frame count; runtime adds an asynchronous rasterization step.
2. **Shape DSL (chosen)**: Claude emits parametric JS draw functions. Pro: plays to Claude's strongest emission domain (code), one function can produce all animation states from a normalized time parameter (lower token cost), aligns with existing Clown Brawler aesthetic, no rasterization pipeline. Con: per-frame imperative drawing (acceptable for current entity counts under ~20), no built-in serialization (sprites are code, not assets).
3. **Both**: implement Shape DSL first, add SVG-rasterize later if needed. Compatible because SVG-rasterize would produce a raster that the unchanged SpriteSheet consumes.

Option 2 was chosen as the immediate path, with option 3 (later add SVG-rasterize as a sibling) preserved as a non-breaking future enhancement. Token economy (per CLAUDE.md §0) was the primary deciding factor: parametric draw functions emit fewer total tokens than equivalent SVG markup, and play to Claude's stronger code-generation domain rather than its weaker SVG domain.

**Consequences**:

- **API**: `new Engine.ShapeSprite(host, { animations, initialAnim })`. Each animation is `{ duration: seconds, loop: bool, draw: (ctx, state) => void }`. State is `{ anim, t, flipX }`. Method surface mirrors `SpriteSheet` for cognitive consistency: `play(name, force)`, `isDone()`, `setFlipX(b)`, `getFlipX()`, plus public `.alpha` and `.currentAnim`.
- **Drawing convention**: matches the engine's host-local convention (ADR-0008 and the Scene transform handling in ARCHITECTURE.md). The draw function sees `(0, 0)` as the host's position and draws shapes relative to it.
- **Animation model**: continuous parametric `t` (0..1 normalized over `duration`), not discrete frames. Smooth animation by default. The draw function can implement frame-by-frame snapping internally by quantizing t if a stepped look is wanted.
- **Performance**: imperative drawing per frame is acceptable for current scale (under ~20 entities). For very large entity counts, cached rasters (SpriteSheet, or future SVG-rasterize feeding SpriteSheet) would be more efficient. The threshold is documented in `scripts/_registry.md`; not a current concern.
- **Integration**: Clown Brawler's existing inline drawing is the natural first conversion target. No visual change expected; the goal is converting ad-hoc per-script drawing into reusable infrastructure with a uniform animation lifecycle. Queued as a follow-up commit per the experimental-probe framing of ADR-0013.
- **SVG-rasterize remains deferred**, not retired. If a game ever needs visual fidelity beyond canvas primitives (shading, gradients, complex curves not worth drawing imperatively), SVG-rasterize can be added as a sibling tool that produces input to `SpriteSheet`. No architectural change required.
- **Konva.Sprite API integration** is flagged as a separate future investigation. It would require imported raster sheets, which raises asset-sourcing questions (in-repo folder, third-party fork, or external host) that the user has flagged for revisit after Shape DSL is exercised.

## ADR-0016: Engine bundle as canonical single-file source artifact

Date: 2026-05-13

**Decision**: A committed file `engine/engine.bundle.js` is maintained as the canonical single-file representation of the engine, regenerated as a mandatory step of any commit that touches an engine module (`engine/*.js` or `engine/lib/*.js`). Fresh Claude sessions fetch this one file to obtain the current engine source instead of fetching the ten individual modules separately or extracting from a stale inlined copy in an old game build. A copy is also uploaded to Claude Project knowledge as a parallel optimization, refreshed manually by the user as engine modules change.

**Context**: The engine is split across ten files (eight modules under `engine/` plus two vendored libraries under `engine/lib/`) and must be concatenated in a specific order to be usable (ADR-0011 and ADR-0014 define the order; ARCHITECTURE.md records it in full). Fresh sessions need the current engine source to build games and engine-adjacent tools. The pre-existing workflow had three problems, all observed in the 2026-05-13 Horses Teach Typing session:

1. *Per-file fetches.* Ten `GitHub:get_file_contents` calls per session, each with non-trivial token overhead.
2. *Stale build fallback.* Sessions sometimes attempted to reuse the inlined engine from an existing game build (e.g., `build/survivors.html`), but games are built at different points in time and may inline an outdated engine version. In the Horses Teach Typing session, the inlined `game.js` in `build/survivors.html` predated ADR-0014 and did not match the current engine, forcing additional fetches and reasoning about which version was authoritative.
3. *Sandbox-restricted dynamic fetches.* Sessions sometimes attempted `raw.githubusercontent.com` URLs via bash, which fail because the host is not in the sandbox allowlist. This wastes turns on a failed approach before falling back to the MCP path.

The bundle file collapses all three failure modes into a single MCP fetch with header-recorded SHAs for drift detection.

Three options were considered:

1. **Bundle in repo only**. Commit `engine/engine.bundle.js`. Future Claude fetches one file. Drift is mitigated by the regeneration-on-engine-commit rule and by the SHA list in the bundle header (mismatch is detectable by comparing header SHAs to the live `engine/` directory listing).
2. **Bundle in project knowledge only**. Manual upload by the user; zero fetches at session start. Pro: lowest token cost when fresh. Con: project knowledge does not auto-sync from the repo, so the snapshot can be arbitrarily stale and Claude cannot detect staleness during a session.
3. **Hybrid: bundle in repo plus mirror in project knowledge (chosen)**. Bundle in repo is the source of truth. Mirror in project knowledge is an additional optimization: when fresh, sessions have the engine already in context; when stale, the repo bundle is one fetch away. The mirror is a manual upload the user performs after engine commits.

Option 3 was chosen because the repo bundle provides the canonical, always-current artifact while the project knowledge mirror provides the best-case zero-fetch path. Option 2 alone was rejected because staleness in project knowledge cannot be detected by Claude during a session.

**Consequences**:

- The repo now contains a committed artifact (`engine/engine.bundle.js`) whose contents are mechanically derivable from the source files. This is an intentional exception to the general "code is the source, build artifacts are not committed" pattern. The exception is justified by the MCP-fetchability requirement that motivates the bundle.
- Every commit that touches an engine module (`engine/*.js` or `engine/lib/*.js`) must regenerate the bundle in the same commit. CLAUDE.md §8 carries this rule. The bundle's own header documents the regeneration recipe.
- The header records generation date and a SHA for each source file at generation time. A mismatch between header SHAs and the live `engine/` listing is the detection mechanism for missed regenerations.
- Adding or removing an engine module requires updating three things in the same commit: the bundle (regenerated), the bundle header (module list), and ARCHITECTURE.md's "Build concatenation order" section.
- Game builds (`build/<game>.html`) may continue to inline the individual source files in the canonical order, or may switch to inlining the bundle. The two approaches produce equivalent output. Build scripts that already work do not need to change.
- The bundle is engine-only. Engine-adjacent code (scripts, scenes, games) is not included. If a similar one-fetch pattern is later wanted for a heavily-shared scripts library (`PauseOverlay`, `ShapeSprite`, etc.), a separate bundle can be added by a future ADR.
- The user manually uploads the bundle to Claude Project knowledge as the parallel optimization. The repo bundle remains the authoritative source; the project knowledge mirror is a best-effort cache. Sessions trust the in-context copy unless they have reason to suspect drift, in which case they verify by fetching the repo bundle.
- A note on the bundle's verbatim faithfulness: the 2026-05-13 initial bundle has lightly condensed inline comments in the vendored library files (`engine/lib/riffwave.js`, `engine/lib/sfxr.js`) for compactness. All executable code is preserved verbatim. The header SHAs reference the canonical source files, not the bundle's slightly trimmed copies. Future regenerations may either preserve this trimming convention or restore full comments; either is acceptable as long as runtime behavior is unchanged.
