# Architecture Decision Records

This file records significant decisions made during development. Each ADR captures what was decided, why, what was considered and rejected, and what consequences follow.

## ADR-0001: Repo structure mirrors Godot's conceptual model

Date: 2026-04-19

**Decision**: Organize the repo with top-level `engine/`, `scripts/`, `scenes/`, and `games/` directories. `engine/` holds the engine core; `scripts/` holds reusable game-logic components (analogous to Godot Scripts); `scenes/` holds top-level scene files; `games/` holds per-game assets and scene overrides.

**Context**: We need a structure that scales from one proof-of-concept game to many games while keeping shared code clearly separated from game-specific code.

**Consequences**: New game-specific scripts live under `games/<game>/`, shared scripts under `scripts/`. Engine internals are never mixed with game code.

## ADR-0002: Single-file HTML build target

Date: 2026-04-19

**Decision**: Each game builds to a single self-contained `.html` file with all JS inlined. No external dependencies at runtime.

**Context**: Distribution simplicity is the top priority. A single file can be opened locally, sent by email, or hosted anywhere without a build server or CDN.

**Consequences**: No ES modules, no dynamic imports. All code concatenated in dependency order. Build step is a shell script, not a bundler.

## ADR-0003: Documentation as source of truth

Date: 2026-04-19

**Decision**: Key decisions, architecture, and session state live in committed Markdown files (`docs/`). Claude reads these at session start rather than inferring state from code.

**Context**: LLM sessions are stateless. Without explicit state tracking, each session wastes tokens re-inferring what already exists.

**Consequences**: `docs/STATE.md` is updated at the end of every session. `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/resources/` accumulate durable knowledge.

## ADR-0004: Composition over inheritance for GameObject specialization

Date: 2026-04-19

**Decision**: Game objects are plain JS objects. Behavior is added by attaching Script instances (`obj.addScript(new SomeScript(obj))`). Scripts implement `update(dt)` and optionally `draw(ctx)`. The engine calls these in registration order.

**Context**: Inheritance hierarchies are brittle and hard to inspect. Composition makes behavior explicit and stackable.

**Consequences**: No class hierarchy for game objects. Scripts are the unit of reuse. A game object's behavior is fully described by its scripts list.

## ADR-0005: Hybrid input model (latched state plus signal events)

Date: 2026-04-19

**Decision**: `Engine.input` exposes two surfaces: latched state (`Engine.input.keys`, `Engine.input.mouse`) readable any time, and signal events (`Engine.input.on('keydown', cb)`) for one-shot responses. Both coexist.

**Context**: Continuous movement needs per-frame state checks. UI clicks need one-shot signals. Neither alone handles both cleanly.

**Consequences**: Scenes use state checks in `update()` for movement, event callbacks for discrete actions. The engine maintains both surfaces from the same DOM listeners.

## ADR-0006: Single active scene from day one

Date: 2026-04-19

**Decision**: The engine supports exactly one active scene at a time. Scene transitions are explicit calls to `game.setScene(new OtherScene())`. No scene stack.

**Context**: Scene stacks add complexity (ordering, lifecycle management) that isn't needed for the game types planned. A single scene is simpler and sufficient.

**Consequences**: Overlay UI (pause, HUD) lives inside the active scene or as a Script, not as a separate scene layer. Scene transitions are instant by default.

## ADR-0007: Game class owns the animation loop, not Scene

Date: 2026-04-19

**Decision**: `Engine.Game` runs `requestAnimationFrame` and calls `scene.update(dt)` and `scene.draw(ctx)` each frame. Scenes do not call `rAF` themselves.

**Context**: If scenes owned the loop, scene transitions would require careful loop teardown and restart. Centralizing in Game avoids this and makes delta-time calculation consistent.

**Consequences**: Scenes are passive recipients of `update` and `draw` calls. Pausing is implemented at the Game level or via a flag checked at the top of `update`.

## ADR-0008: Top-left origin, Y-down coordinate system

Date: 2026-04-19

**Decision**: All coordinates use canvas-native top-left origin, Y-down. No coordinate transforms are applied by the engine.

**Context**: Canvas 2D API is Y-down. Introducing a Y-up system would require a transform on every draw call and confuse anyone reading canvas docs.

**Consequences**: All sprite and layout math is Y-down. "Up" on screen is a smaller Y value.

## ADR-0009: License policy for third-party resources

Date: 2026-04-19

**Decision**: Only use assets and libraries with licenses compatible with this project (MIT, CC0, CC-BY, CC-BY-SA, or equivalent permissive licenses). No GPL, no proprietary assets.

**Context**: The project may eventually be made public. Incompatible licenses would block distribution.

**Consequences**: Every third-party resource must be audited before use. License and source are documented in the file or in `docs/resources/`.

## ADR-0010: AABB collision via duck-typed Collider scripts with method-based response

Date: 2026-04-28

**Decision**: Collision detection uses axis-aligned bounding boxes (AABB). The `Collider` script attaches to a host object and exposes a `bounds()` method. The engine provides `Engine.collision.check(a, b)` and `Engine.collision.group(a, list)`. Response is implemented in the scene, not in the engine.

**Context**: AABB is sufficient for all planned game types and is cheap. Duck-typing (checking for `bounds()`) avoids requiring a specific class hierarchy. Decoupled response keeps the engine free of game-specific logic.

**Consequences**: No circle or polygon collision. No built-in physics response. Each scene implements its own collision response loop.

## ADR-0011: Audio as engine-level service, not a Script

Date: 2026-04-28

**Decision**: Audio is a singleton accessible as `Engine.audio`. It is initialized once by the engine and usable from any scene or script without dependency injection. It wraps `jsfxr`/`riffwave` for procedural sound effects.

**Context**: Audio needs to be accessible from many places. Passing it as a parameter everywhere is boilerplate. A singleton matches how `Engine.input` works.

**Consequences**: `Engine.audio.register(name, params)` and `Engine.audio.play(name)` are the API. Games call these from scene `enter()` and `update()`. No streaming audio; only short procedural SFX.

## ADR-0012: ESC-to-pause as a game-level convention

Date: 2026-04-28

**Decision**: Pause behavior is implemented by attaching a `PauseOverlay` Script to the active match scene. The script checks for ESC each frame, renders a pause overlay, and suppresses the parent scene's update when paused. It is not built into the engine loop.

**Context**: Pause UX varies by game (some games want ESC to quit, not pause; menus have no pause). Building it into the engine would force one pattern on all games.

Three options were considered:
1. **Engine-level pause flag**: `game.pause()` / `game.resume()` methods on the Game class. Simple, but locks all games into the same behavior.
2. **Pause scene**: Push a PauseScene onto a scene stack. Requires a scene stack (see ADR-0006: rejected). Not compatible with single-scene model.
3. **PauseOverlay Script** (chosen): A reusable Script that any scene can attach. The script handles ESC detection, overlay rendering, and update suppression. Scenes opt in by instantiating it.

Option 3 keeps the engine ignorant of pause entirely while still providing shared behavior. `PauseOverlay` is consistent with ADR-0006 (pause UI lives inside the active scene) and ADR-0007 (Game owns the loop, not scene-specific concerns).

**Consequences**: Every match scene that wants pause attaches `new PauseOverlay(game, opts)` and calls `this._pause.update(dt)` at the top of its own `update()`. If the overlay is paused, the scene returns early. The overlay renders on top via `this._pause.draw(ctx)`. Menu scenes and game-over screens skip the overlay entirely.

## ADR-0013: Games are experimental probes during engine development

Date: 2026-04-28

**Decision**: Each new game is primarily a vehicle for discovering and validating engine capabilities. The game's design is chosen to exercise something the engine doesn't yet support well. This framing is explicit and shared: games are probes, not products.

**Context**: Without a guiding principle, session scope tends to drift — either toward over-engineering the engine speculatively, or toward gold-plating games that aren't the main point. Both waste time.

This framing provides a clear answer to "how far should we take this game?": far enough to validate the capability being probed, then stop. Polish and additional game content go into a deferred "shipping mode" bucket.

**Consequences**:
- Each game session starts by naming what capability it's probing.
- The game is considered done when the probe is complete, regardless of feature completeness.
- A separate "shipping mode" pass (deferred to later) adds polish, sound, and content depth.
- Engine generalization follows probe validation: once the probe confirms a pattern works, the pattern is promoted to engine-level infrastructure.

## ADR-0014: Persistent storage via Engine.Storage with Game-configured namespace

Date: 2026-05-03

**Decision**: Persistent storage is provided by `engine/storage.js`, instantiated by the `Game` constructor as `Engine.storage` (parallel to `Engine.input` and `Engine.audio` per ADR-0011). The Game constructor accepts an optional `gameName` option which becomes the storage namespace; all keys are stored as `${gameName}:${key}` in localStorage. If `gameName` is omitted, keys are stored as-is.

**Context**: Games need to persist stats, high scores, and unlock state across sessions. localStorage is the only available persistence mechanism in the single-file HTML target (ADR-0002). Three design options were considered:

1. **Global namespace only**: All games share the same key namespace. Collisions are possible if two games use the same key name (e.g., `"score"`). Unacceptable for a multi-game repo.
2. **Per-game instance**: API has only the `Engine.Storage` class; each game's bootstrap creates `const save = new Engine.Storage('survivors')`. Clean separation, but breaks the existing singleton pattern from ADR-0011 (audio) and requires every game to thread a save object through its scene tree.
3. **Namespaced singleton** (chosen): `Engine.storage` is a singleton like `Engine.audio`, but the namespace is configured once at bootstrap via `gameName`. Scene and script callsites use the clean `Engine.storage.save(key, val)` API without carrying a reference.

Option 3 was chosen because it matches the established engine pattern (ADR-0011), minimizes ceremony at callsites, and makes per-game isolation the default behavior rather than a per-callsite responsibility.

**Consequences**:
- The `bootstrapGame` helper passes `gameName` to the `Game` constructor, so all manifested games get automatic namespace isolation.
- `Engine.storage.save(key, val)` and `Engine.storage.load(key, default)` are the full API. No delete, no enumerate — not needed yet.
- When a game wants to use storage, its bootstrap passes `gameName`: `new Engine.Game(canvas, { gameName: 'survivors' })`. The first natural consumer is Survivors stats and coins, queued as a follow-up commit per the experimental-probe framing of ADR-0013.

## ADR-0015: Procedural sprite primitive (ShapeSprite Script) as the Shape DSL

Date: 2026-05-09

**Decision**: Introduce `scripts/shape-sprite.js` as the canonical way to define procedural, animated vector sprites. A `ShapeSprite` is a Script that takes a `shapes` array in its constructor. Each shape object has a `type` (rect, circle, line, polygon, arc), style properties, and optional `anim` (animation spec: `prop`, `from`, `to`, `duration`, `easing`, `loop`, `bounce`). The sprite draws all shapes each frame, interpolating animated properties over time.

**Context**: Games need reusable, animated procedural sprites. Alternatives considered:

1. **Inline canvas calls per game object**: Already the status quo in Clown Brawler. Non-reusable, verbose, hard to animate.
2. **LLM-generated SVG**: Rejected per §4 of CLAUDE.md — benchmarks show poor fidelity at FID 82.89 for Claude-3.5; token-expensive; no spatial feedback loop.
3. **Raster sprite sheets**: Right answer for high-fidelity assets, but requires external tooling and an asset pipeline. Deferred to when the first game needs it.
4. **Shape DSL** (chosen): A structured description of geometric primitives with built-in animation. Plays to LLM strengths (structured data, named properties), is cheap to generate (a few shapes per sprite), and produces deterministic output without a pixel grid.

**Consequences**:
- `ShapeSprite` is a Script; it attaches to a host object and draws relative to the host's `(x, y)` position.
- Animation is per-property, per-shape: any numeric style or geometry property can be animated with `from`/`to`/`duration`/`easing`.
- `onDone` callback fires when a non-looping animation completes. Used for dying-state transitions.
- Per-animation easing functions: `linear`, `easeIn`, `easeOut`, `easeInOut`.
- **Drawing convention**: matches the engine's host-local convention (ADR-0008 and the Scene transform handling in ARCHITECTURE.md). The draw function sees `(0, 0)` as the host's position and draws shapes relative to it.
- **SVG note**: LLM-generated SVG has the same limitations as pixel-grid placement (§4). `ShapeSprite` is the preferred alternative for procedural sprites in this engine. For high-fidelity raster, route to a diffusion model or import hand-made sheets.
- **Integration**: Clown Brawler's existing inline drawing is the natural first conversion target. No visual change expected; the goal is converting ad-hoc per-script drawing into reusable infrastructure with a uniform animation lifecycle. Queued as a follow-up commit per the experimental-probe framing of ADR-0013.

## ADR-0016: Engine bundle as canonical single-file source artifact

Date: 2026-05-13

**Decision**: Maintain `engine/engine.bundle.js` as a concatenation of all engine source files in load order. This file is the canonical artifact that sessions fetch when they need the current engine source. Game builds inline this file rather than the individual engine modules.

**Context**: The engine is split across ten files (eight modules under `engine/` plus two vendored libraries under `engine/lib/`) and must be concatenated in a specific order to be usable (ADR-0011 and ADR-0014 define the order; ARCHITECTURE.md records it in full). Fresh sessions need the current engine source to build games and engine-adjacent tools. The pre-existing workflow had three problems, all observed in the 2026-05-13 Horses Teach Typing session:

1. *Multiple fetch calls.* Loading ten files individually costs tokens and risks loading them in the wrong order.
2. *Stale build fallback.* Sessions sometimes attempted to reuse the inlined engine from an existing game build (e.g., `build/survivors.html`), but games are built at different points in time and may inline an outdated engine version. In the Horses Teach Typing session, the inlined `game.js` in `build/survivors.html` predated ADR-0014 and did not match the current engine, forcing additional fetches and reasoning about which version was authoritative.
3. *No canonical reference.* Without a designated artifact, every session had to decide independently how to assemble the engine.

**Consequences**:

- One `get_file_contents` call on `engine/engine.bundle.js` loads the complete, current engine source in the correct order.
- Every commit that touches an engine module (`engine/*.js` or `engine/lib/*.js`) must regenerate the bundle in the same commit. CLAUDE.md §8 carries this rule. The bundle's own header documents the regeneration recipe. (Superseded by ADR-0021: regeneration is now automated in CI; the bundle remains canonical and the fetch target, but is no longer regenerated by hand or committed in the same commit as the source change.)
- Adding or removing an engine module requires updating three things in the same commit: the bundle (regenerated), the bundle header (module list), and ARCHITECTURE.md's "Build concatenation order" section. (Under ADR-0021 the bundle and its header are produced by CI from `engine/bundle-manifest.json`; the human-side step for a new module is the manifest line plus ARCHITECTURE.md.)
- Build game files reference `engine/engine.bundle.js` in their concat list; they do not list individual engine modules.
- The bundle file is committed to the repo and tracked in version control (not gitignored). This is intentional: it makes the bundle fetchable as a GitHub API blob without requiring a build step.

## ADR-0017: Visual language and responsive layout

Date: 2026-05-17

**Decision**: All new game UI uses a consistent visual language defined by a set of design tokens. The first token set: `#1a1008` background, `#d4b896` primary text, `#8a6f4e` secondary text, `#3a2518` border/subtle, `#c0392b` danger/health, `#27ae60` positive, `#f39c12` highlight, `#2980b9` info. Typography: `serif` for all game text. Layout: canvas-relative sizing (`W * 0.n`, `H * 0.n`) rather than fixed pixel values, so layouts adapt to both the `regular` (landscape) and `compact` (portrait) presets.

**Context**: Minesweeper was the first game to establish explicit UI conventions. Previous games (Pong, Survivors, Clown Brawler) have ad-hoc color choices. A shared visual language makes the engine feel like a coherent platform rather than a collection of one-offs, and makes UI authoring faster (pick from the token set rather than invent per-game).

**Consequences**:
- Every new menu and match scene uses colors from the token set. Exact pixel values remain flexible; color and font family do not.
- The `bootstrapGame` helper accepts two presets: `regular: { w: 900, h: 600 }` (landscape) and `compact: { w: 600, h: 800 }` (portrait). All layout math uses `game.canvas.width` / `game.canvas.height` rather than hardcoded values.
- Forward, every new menu references the ADR-0017 design tokens.

- Existing menus are not retrofitted by this ADR; retrofits remain in the deferred-to-shipping-mode bucket per ADR-0013.

## ADR-0018: Optional vendored library pattern; narrative module added via inkjs

Date: 2026-05-20

**Decision**: Optional third-party libraries that are not needed by every game are placed in `engine/lib/` but excluded from `engine/engine.bundle.js`. Games that need them list the library explicitly in their `build-manifest.json` concat order before the bundle. The first use of this pattern is `engine/lib/inkjs.js` (the inkjs runtime, ~100 KB), required only by narrative games. The `Engine.Narrative` module (`engine/narrative.js`) wraps the inkjs API and is included in the main bundle; the inkjs runtime is not.

**Context**: The engine bundle (ADR-0016) is already ~49 KB. Adding inkjs (~100 KB) unconditionally would triple the bundle size for games that never use narrative. The optional-vendored-library pattern avoids this: only games that use inkjs pay the cost.

**Consequences**: Narrative games list `engine/lib/inkjs.js` before `engine/engine.bundle.js` in their build-manifest concat arrays. Non-narrative games omit it entirely. The bundle remains self-contained for the common case. New optional libraries follow the same pattern: `engine/lib/<library>.js`, not in the bundle, listed explicitly by consumers.

## ADR-0019: GitHub Actions as the canonical automated build pipeline

Date: 2026-05-23

**Decision**: Game builds are automated via `.github/workflows/build.yml`. On every push to `main` and on manual dispatch, the workflow runs `scripts/build-game.sh` for every `games/*/build-manifest.json` it finds. Built HTML files are committed back to `build/` in the repo and uploaded as downloadable workflow artifacts.

**Context**: Game builds require concatenating many files in a specific order. Building manually in a session requires fetching each source file, assembling them, and pushing the result — a process that is token-expensive and error-prone (the 2026-05-20 party-house session pushed a ~80 KB build via the MCP file API and hit a size ceiling). Two alternatives were considered:

1. *Claude builds each game in session*: Already the failing status quo. Token-expensive, size-ceiling problems, fragile to session interruptions.
2. *Runner-side build on push*: The workflow checks out the repo and runs the shell script on the runner. No token cost, no size limit, reproducible. Builds are always derived from the committed source.

Option 2 was chosen. The runner has bash, jq, and base64 (all dependencies of `build-game.sh`). Committing builds back to `build/` makes them browsable in the repo without downloading an artifact.

**Consequences**:

- `build/` is now maintained by the CI runner, not by hand. Claude commits source files; CI builds.
- The workflow uses `GITHUB_TOKEN` with `contents: write` permissions to commit back. This requires "Read and write permissions" in Settings > Actions > General.
- Built HTML files in `build/` may lag source files by one CI run after a source push.
- The `validate` job runs `node --check` on all authored JS files and blocks the `build` job on any syntax error. This catches typos before they reach a game build.
- Games without a `build-manifest.json` are silently skipped. Adding a manifest to an existing game immediately enrolls it in CI.
- `build-game.sh` is the authoritative build script; its header documents the manifest schema.

## ADR-0020: Balance primitives module (Engine.Balance) and balance-check authoring step

Date: 2026-06-03

**Decision**: Add `engine/balance.js` as the twelfth bundled engine module. It exports `Engine.Balance`, a namespace of pure, stateless functions for common game-balance calculations. First increment: `difficulty(t, opts)` (logistic/linear/exponential/logarithmic difficulty curves), `cost(n, opts)` (exponential cost scaling for upgrades), `bulkCost(owned, count, opts)` (closed-form sum), and `maxAffordable(owned, currency, opts)`. Add a balance-check authoring step to CLAUDE.md §8: any session build or change that introduces or modifies a difficulty ramp, cost/upgrade curve, damage formula, drop rate, or progression mechanic must name the applicable `Engine.Balance` primitive (or formula in `docs/resources/balance.md`) in the plan before coding.

**Context**: Difficulty overcorrection is a recurring pattern in this project (documented in CLAUDE.md retro §9). Sessions adjust numbers by feel and land in one of two failure modes: too easy (no tension) or too hard (unplayable). The root cause is the absence of a principled starting point. `Engine.Balance` provides concrete mathematical primitives — the same formulas used in published games — that give sessions a defensible anchor before coding.

**Consequences**:

- `Engine.Balance` is opt-in: the engine core does not call it. Games use it at their discretion.
- The module is pure and stateless: no side effects, no engine references. It can be tested in isolation with `node`.
- `docs/resources/balance.md` carries the formula reference, default constants, and the deferred-primitive roadmap (diminishing returns, pseudo-random distribution, XP curves, prestige curves, DDA controller). Formulas are recorded there even for primitives not yet implemented.
- The balance-check authoring step in CLAUDE.md §8 is the enforcement mechanism. It does not guarantee correct tuning; it guarantees that the math is named and visible before numbers are chosen.
- `balance.js` is a bundled module, so changing it triggers bundle regeneration (now via CI, ADR-0021).

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

## ADR-0022: Rolling GitHub Release for permanent game download URLs

Date: 2026-06-19

**Decision**: Add a "Publish rolling `latest-build` GitHub Release" step to the `build` job in `.github/workflows/build.yml`. After each successful build, the step creates or updates a GitHub Release tagged `latest-build`, attaching every file in `build/*.html` as release assets. If an asset with the same filename already exists on the release it is replaced. This produces permanent, stable public download URLs of the form `https://github.com/fredthesled/browser-game-engine/releases/download/latest-build/<game>.html`.

**Context**: Game builds are committed to `build/` in the repository (ADR-0019) and are also available as downloadable workflow artifacts for 90 days. Neither surface is well-suited for sharing: the `build/` path requires repo access to navigate, and workflow artifact URLs are ephemeral (expire at 90 days) and require a GitHub login. For games to be playable by anyone with a link — the intended end state for this engine — a stable, public, zero-login URL is needed.

GitHub Releases are the natural solution: assets attached to a release receive a permanent, stable URL that is public by default for a public repo. The rolling-tag pattern (`latest-build`, force-updated on each push) means there is one stable URL family per game rather than a tag per build. Two alternative designs were considered:

1. *Per-build tags* (`build-20260619`, `build-20260620`, …): Clean versioning but no stable URL. Users who bookmark `latest-build/drift.html` would need to update the link after each build. Not suitable as a distribution mechanism.
2. *GitHub Pages*: Would serve all games from a root URL and support HTML-directory browsing. Requires a separate deploy step and a Pages configuration; a meaningful additional scope. Added to the longer-horizon backlog rather than built now.

**Consequences**:

- The `latest-build` release is created on the first run. Subsequent runs upsert the release (name and body stay the same; assets are replaced file-by-file).
- Permanent download URLs are live for every game that has a `build-manifest.json`. Adding a new game automatically adds it to the next release.
- `fail_on_unmatched_files: false` means a push that produces no built HTML (e.g. a docs-only change with no manifests) silently updates the release with no new assets rather than failing the workflow.
- `make_latest: true` marks the `latest-build` release as the repo's latest release in the GitHub UI, making it discoverable from the repo homepage.
- `generate_release_notes: false` suppresses the auto-generated commit-range diff, which would be noise (the release body is kept simple and static).
- No new permissions are required; the existing `contents: write` at the workflow level covers release creation and asset upload.
- The `softprops/action-gh-release@v2` action (MIT) is the standard choice for this pattern and is already widely adopted across the GitHub ecosystem. It handles the delete-then-re-upload cycle for same-named assets internally.
- GitHub Pages remains the right next step when the project wants indexed browsing rather than direct-download links.

## ADR-0023: Registry validation in the CI validate job

Date: 2026-06-20

**Decision**: Add a registry-validation step to the `validate` job in `.github/workflows/build.yml`. Each `.js` file at the root level of `scripts/` and `scenes/` must appear by filename in that directory's `_registry.md`. The step fails the validate job — which gates the build job — if any such file is absent.

**Context**: `scripts/` and `scenes/` maintain `_registry.md` files (one per directory) that list every script and scene with status, purpose, and dependencies. These registries serve as an authoritative navigation index for future sessions: a fresh session that fetches a registry can understand what already exists without reading every source file. In practice the registries have drifted: scripts have been added without a corresponding registry entry, making the index unreliable. Adding a CI check enforces the convention without requiring per-author discipline.

Game-specific scene directories (`games/*/scenes/`) are excluded from the automated check. Their authors add entries to the root registries manually as part of each game session; the check only covers shared engine-level scripts and the root scene directory.

Alternatives considered:

1. *Pre-commit hook*: Catches the error earlier (at commit time rather than push time) but requires every contributor's environment to be configured, and is trivially bypassed with `--no-verify`. CI is the enforceable backstop regardless.
2. *Registry auto-generation from source*: Fragile (requires parsing JS to extract metadata the file may not contain) and loses the human-written purpose and dependency fields. Rejected.

**Consequences**:

- Any new root-level script or scene in `scripts/` or `scenes/` must include a registry entry in the same commit or PR; otherwise the validate job fails and all game builds are blocked.
- The check is a simple `grep -qF` for the filename in `_registry.md`; it cannot verify that the entry's content is accurate. Accuracy remains a social convention.
- Game-specific subdirectory files (`games/*/scenes/*.js`) are not checked; authors add their entries manually, as before. This is an accepted limitation — enforcing it automatically would require parsing the nested directory structure and attributing files to the correct registry.
- The validate job already ran `node --check` on all authored JS files; adding this step keeps all pre-build safety checks co-located in one job.
