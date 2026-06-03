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
- Every commit that touches an engine module (`engine/*.js` or `engine/lib/*.js`) must regenerate the bundle in the same commit. CLAUDE.md §8 carries this rule. The bundle's own header documents the regeneration recipe. (Superseded by ADR-0021: regeneration is now automated in CI; the bundle remains canonical and the fetch target, but is no longer regenerated by hand or committed in the same commit as the source change.)
- The header records generation date and a SHA for each source file at generation time. A mismatch between header SHAs and the live `engine/` listing is the detection mechanism for missed regenerations.
- Adding or removing an engine module requires updating three things in the same commit: the bundle (regenerated), the bundle header (module list), and ARCHITECTURE.md's "Build concatenation order" section. (Under ADR-0021 the bundle and its header are produced by CI from `engine/bundle-manifest.json`; the human-side step for a new module is the manifest line plus ARCHITECTURE.md.)
- Game builds (`build/<game>.html`) may continue to inline the individual source files in the canonical order, or may switch to inlining the bundle. The two approaches produce equivalent output. Build scripts that already work do not need to change.
- The bundle is engine-only. Engine-adjacent code (scripts, scenes, games) is not included. If a similar one-fetch pattern is later wanted for a heavily-shared scripts library (`PauseOverlay`, `ShapeSprite`, etc.), a separate bundle can be added by a future ADR.
- The user manually uploads the bundle to Claude Project knowledge as the parallel optimization. The repo bundle remains the authoritative source; the project knowledge mirror is a best-effort cache. Sessions trust the in-context copy unless they have reason to suspect drift, in which case they verify by fetching the repo bundle.
- A note on the bundle's verbatim faithfulness: the 2026-05-13 initial bundle has lightly condensed inline comments in the vendored library files (`engine/lib/riffwave.js`, `engine/lib/sfxr.js`) for compactness. All executable code is preserved verbatim. The header SHAs reference the canonical source files, not the bundle's slightly trimmed copies. Future regenerations may either preserve this trimming convention or restore full comments; either is acceptable as long as runtime behavior is unchanged.

## ADR-0017: Visual language and responsive layout

Date: 2026-05-14

**Decision**: Establish a project-wide visual language for menus and UI surfaces, structured as design tokens (semantic-named values for spacing, typography, hit targets, and color roles) plus a logical-canvas convention that lets games render legibly across mobile and desktop viewports. The bootstrap selects a logical canvas size at startup based on the viewport and touch capability, and scenes draw in logical coordinates throughout. Touch capability detection enlarges hit-target minimums but does not yet introduce a touch-to-input mapping. UI primitive Scripts (button, panel, label) are not implemented in this ADR; the first concrete application is a Minesweeper menu polish pass that exercises the tokens through inline drawing. Primitive extraction is deferred to a follow-up ADR once the language has been validated against at least two games.

**Context**: Three pressures converge.

First, structural: every menu in the repo (Pong, Survivors, Clown Brawler, Horses Teach Typing, Party House, Minesweeper) is assembled from raw canvas calls with hand-tuned coordinates. There is no shared notion of "button," "panel," or "spacing," so each menu re-invents these from scratch.

Second, responsive: the project's primary developer codes on mobile while games are also played on desktop. Current canvases are fixed at 900x600 pixels, which assumes a landscape viewport considerably wider than a phone in portrait.

Third, forcing function: the next planned commit is a Minesweeper menu polish pass. Doing the language work first is cheaper than retrofitting a polished menu later.

**Consequences** (abbreviated; full context in commit history):

- Forward, every new menu references the ADR-0017 design tokens.
- First concrete application is the Minesweeper menu polish pass.
- Existing menus are not retrofitted by this ADR; retrofits remain in the deferred-to-shipping-mode bucket per ADR-0013.
- The Game constructor is unchanged. The responsive convention lives in the per-game bootstrap snippet.
- UI primitives (`UiButton`, `UiPanel`, `UiLabel`) are deferred until a second game needs the same vocabulary.

## ADR-0018: Optional vendored library pattern; narrative module added via inkjs

Date: 2026-05-19

**Decision**: Establish an "optional vendored library" pattern: a vendored library may live under `engine/lib/` while being explicitly excluded from `engine/engine.bundle.js`. Games that need the library include it separately in their build, before the engine bundle. Add `engine/narrative.js` as the first engine module that depends on an optional library, and vendor `engine/lib/inkjs.js` (inkjs 2.4.0, MIT) as the optional library it wraps. Narrative is added to the bundle; inkjs is not.

**Context**: The next planned game, Drift, wants branching narrative content for encounters. inkjs (MIT, zero dependencies) is the canonical browser-side ink runtime. At ~249 KB, bundling it into the engine would bloat every game that does not use narrative. Per-game include (placed before the engine bundle in the build) pays the cost only for games that need it.

**Consequences** (abbreviated):

- `engine/narrative.js` wraps `inkjs.Story` with a clean surface: `continue()`, `getChoices()`, `choose()`, `getVar/setVar()`, `bindExternal()`, `observe()`, `goTo()`, `saveState/loadState()`, `hasEnded`, `story` escape hatch.
- `engine/lib/inkjs.js` is vendored from the npm registry tarball (`inkjs@2.4.0`), MIT-licensed, 248,826 bytes. It is NOT included in the engine bundle.
- Build concat order for narrative games: `engine/lib/inkjs.js` BEFORE `engine/engine.bundle.js` (load-order critical).
- The pattern is reusable for future optional libraries under `engine/lib/`.

## ADR-0019: GitHub Actions as the canonical automated build pipeline

Date: 2026-05-20

**Decision**: Automated game build assembly is handled by a GitHub Actions workflow (`.github/workflows/build.yml`) that triggers on every push to `main` and on manual dispatch. The workflow discovers all games that have a `games/<name>/build-manifest.json`, assembles each into a self-contained HTML file via `scripts/build-game.sh`, uploads the results as downloadable workflow artifacts, and commits the built files back to `build/` in the repository. The `build-manifest.json` format is the canonical source of truth for a game's concat order and bootstrap call.

**Context**: Prior to this ADR, game builds were assembled manually inside Claude sessions. This created three compounding problems:

1. *Size ceiling.* Claude's `push_files` API call has a practical reliability ceiling around 80 KB total payload. The Drift build (inkjs at 249 KB plus engine and game code) far exceeds this, making manual single-session assembly impossible for any narrative game and fragile for large non-narrative games.
2. *Context cost.* Assembling a build required Claude to hold all source files in context simultaneously, consuming tokens that could otherwise be spent on game logic. A 300 KB build occupied a meaningful fraction of a session's usable context.
3. *Session coupling.* A Claude session could not be considered complete until the build was verified. This tied implementation quality to whether a manual upload step succeeded, which varied by file size and session state.

Several alternatives were evaluated:

1. *Claude Artifact with GitHub PAT.* Rejected; ties the build pipeline to a private Claude account, incompatible with the project's goal of universally accessible distribution.
2. *Google Drive assembly.* Viable as a fallback; does not require a PAT; but requires Claude to hold the entire built content in context, which hit the context ceiling for large builds.
3. *Chunked push and manual Notepad assembly.* Viable but error-prone; any missed or misordered chunk produces a broken build.
4. *GitHub Actions (chosen).* Runs entirely on GitHub's infrastructure; free for private repos (2,000 Linux minutes/month on the Free plan, of which a concat build uses ~15 seconds); requires no local tooling; scales to arbitrarily large builds; produces both workflow artifacts (temporary) and committed files (permanent); and is discoverable and auditable via the Actions tab.

**Consequences**:

- Claude sessions are no longer responsible for build assembly. A session commits source files; the workflow builds. This removes the 80 KB ceiling from game complexity entirely.
- Every game that wants automated builds commits a `games/<name>/build-manifest.json` listing its concat order and bootstrap call. The workflow discovers manifests automatically; no changes to the YAML are needed when adding a new game.
- The `build-manifest.json` schema is documented in the header of `scripts/build-game.sh`. Fields: `game` (identifier), `title` (HTML title), `output` (output path), `concat` (ordered array of source paths relative to repo root), `bootstrap` (JS string appended after all sources).
- Built HTML files are committed back to `build/` by `stefanzweifel/git-auto-commit-action`. Pushes made by `GITHUB_TOKEN` do not retrigger the workflow. The repo setting "Settings > Actions > General > Workflow permissions > Read and write permissions" is required for this step.
- Workflow artifacts (zip of all built HTML files) are retained for 90 days and downloadable from the Actions tab without requiring repo access beyond what the user already has.
- Existing games without `build-manifest.json` files are unaffected. Manifests are added when each game is next touched, which is also the natural moment to migrate its bootstrap to `bootstrapGame()` if it has not been already.
- The `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` environment variable opts the workflow into Node.js 24 ahead of the June 2, 2026 forced migration. This variable becomes a no-op after that date and can be removed or left in place.
- Future workflow improvements (JS syntax validation, GitHub Releases, ink pre-compilation, game scaffolding) are additive and do not require changes to the manifest schema or the build script.
- The `scripts/build-game.sh` script validates all source files exist before writing any output, so a misconfigured manifest fails fast with a clear error message rather than producing a silently broken build.

## ADR-0020: Balance primitives module (Engine.Balance) and balance-check authoring step

Date: 2026-06-03

**Decision**: Add `engine/balance.js` exposing `Engine.Balance`, a namespace of pure, stateless balance primitives. The first increment provides `difficulty(t, opts)` (a curve dispatcher over `linear`, `exponential`, `logarithmic`, and `logistic`, defaulting to `logistic`) and `cost(n, opts)` (`base * rate^n`, default `rate` 1.10 within a documented 1.07-1.15 band), plus the closed-form helpers `bulkCost(owned, count, opts)` and `maxAffordable(owned, currency, opts)` that replace summation loops. Default constants follow the values established in `docs/resources/balance.md`. Additionally adopt a balance-check authoring step (CLAUDE.md §8): any build or change that introduces or modifies a mechanic with a difficulty ramp, a cost or upgrade curve, damage, drop rates, or progression names the applicable `Engine.Balance` primitive (or `balance.md` formula) in the plan before coding, for both initial builds and incremental changes.

**Context**: A recurring pattern across games was difficulty overcorrection (an encounter judged too hard is retuned until all challenge is gone, and the reverse) alongside ad hoc, per-game cost and progression math. A research pass, summarized in `docs/resources/balance.md`, consolidated the field's standard formulas (curve families, exponential cost scaling, diminishing returns, dynamic difficulty adjustment, incremental-economy and prestige math, reward schedules). Defining a small set of these once, consistently, saves tokens and prevents per-game re-derivation, which is aligned with the engine's thin-tool goal (CLAUDE.md §0).

Naming was the main open choice. Three options were considered: top-level `Engine.difficulty`/`Engine.cost` (pollutes the top-level namespace), a lowercase `Engine.balance` instance (lowercase connotes a stateful singleton like `Engine.input`/`Engine.audio`, which this is not), and a PascalCase `Engine.Balance` static namespace of pure functions (chosen; reads like JavaScript's `Math`). The cost default `rate` of 1.10 is the midpoint of the documented 1.07-1.15 band; `difficulty` defaults to `logistic` as the general-purpose pacing curve (slow start, steep middle, bounded plateau).

**Consequences**:

- `Engine.Balance` is opt-in. The engine core does not call it, so it adds no runtime cost to games that ignore it.
- `difficulty(t)` and `cost(n)` are now defined once and consistently across games. `bulkCost` and `maxAffordable` are exact closed forms (verified against brute-force summation, and against the Clicker Heroes cost reference) so games do not re-implement purchase math with loops.
- The module uses nullish-coalescing defaults (`??`) deliberately so an explicit `0` (for example `d0: 0`) is respected rather than overridden.
- Future increments extend `Engine.Balance` per the staged roadmap in `balance.md`: a diminishing-returns reducer `x/(x+k)`, a multiplicative damage form `atk * k/(k+def)`, pseudo-random distribution plus pity timers, XP-curve generators, prestige (cube-root) curves, and a dynamic-difficulty controller (EWMA-smoothed performance, proportional correction, dead-zone hysteresis to prevent oscillation). Each is its own ADR and commit.
- `balance.js` is a bundled engine module, so changing it triggers bundle regeneration (now via CI, ADR-0021).
- The balance-check authoring step makes formula selection explicit, which is the direct countermeasure to the overcorrection pattern that motivated the work.

## ADR-0021: Engine bundle regeneration automated in CI

Date: 2026-06-03

**Decision**: Regenerate `engine/engine.bundle.js` on the GitHub Actions runner rather than by hand. Add `engine/bundle-manifest.json` (the ordered source list), `scripts/build-bundle.sh` (concatenates the listed sources behind file-boundary banners under an auto-generated header that records each source's git blob SHA and the generation date), and `.github/workflows/bundle.yml` (runs the script on any change to an engine source, the script, or the workflow; runs `node --check` on the result; and commits it back as `github-actions[bot]`). CLAUDE.md §8 changes from "regenerate the bundle in the same commit as the engine change" to "edit sources only; CI regenerates the bundle; never hand-edit, hand-regenerate, or hand-push it." This supersedes the manual-regeneration portion of ADR-0016. The bundle remains the canonical single-file artifact and the session fetch target, exactly as ADR-0016 established; only the means of producing it changes.

**Context**: `engine/engine.bundle.js` is approximately 49 KB and grows with each module. ADR-0016's manual recipe requires emitting the entire bundle in a single tool call to regenerate it. In the 2026-06-03 balance-module session this failed in practice: a single-call emission of the full bundle exceeded the reliable payload size and timed out, and the same constraint blocks every future engine-module change. This is the same class of problem ADR-0019 solved for game builds (the ~80 KB push ceiling), with the same remedy: move the assembly off the chat surface and onto the runner.

Options mirrored ADR-0019's. Manual MCP push is the failing status quo. Chunked pushes are error-prone for a single concatenated file (a missed or misordered chunk silently corrupts the bundle). Runner-side regeneration (chosen) has no payload limit, is auditable in the Actions tab, and reuses the build pipeline's existing commit-back mechanism and Node 24 opt-in.

**Consequences**:

- Engine-module changes no longer require Claude to emit the bundle. Adding a module is a source edit plus one line in `engine/bundle-manifest.json`; removing one is the reverse.
- The committed bundle lags a source push by one short CI run (seconds), not by a manual step. This is an accepted, brief window; no game build runs against the intermediate state because game builds and engine commits are separate events.
- Loop prevention is twofold: `engine/engine.bundle.js` is excluded from the workflow's trigger paths, and `GITHUB_TOKEN` commits do not retrigger workflows (the same property build.yml relies on).
- `build.yml`'s existing `validate` job already runs `node --check` on `engine/engine.bundle.js`, and `bundle.yml` also `node --check`s the regenerated file before committing, so a malformed concatenation fails fast rather than landing.
- The degraded-tools fallback still applies for build assembly: when a build is assembled by hand, the bundle is inlined byte-for-byte from a `get_file_contents` fetch, never reconstructed from memory. Only regeneration is automated, not consumption.
- The bundle header's manual regeneration recipe is replaced by an "auto-generated by `scripts/build-bundle.sh`, do not edit" notice that points at this ADR.
- The repo's existing "Read and write permissions" Actions setting (already required by ADR-0019) covers the commit-back step. No new permission is needed.
- The 2026-06-03 session also left one transitional artifact: the bundle was briefly out of sync with `balance.js` (committed in `engine: add balance module`) until this workflow's first run regenerated it. This is the last time the bundle is expected to drift, since regeneration is no longer a manual step that can be forgotten.
