# State

Last updated: 2026-05-21

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1 (sources committed and verified 2026-05-20 via automated build). Plus `poc-square` as an engine smoke test.

The engine, audio service, collision contract, pause utility, persistent storage, procedural Shape DSL sprite primitive (`ShapeSprite`), canonical engine bundle (`engine/engine.bundle.js`, per ADR-0016), visual language plus logical-canvas convention (ADR-0017), narrative module (`Engine.Narrative`, per ADR-0018), shared game bootstrap helper (`bootstrapGame` in `scripts/bootstrap.js`), the **GitHub Actions automated build pipeline** (ADR-0019, `.github/workflows/build.yml` + `scripts/build-game.sh`), the **Tween utility** (`scripts/tween.js`), and **ShapeSprite animation callbacks** are all settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`. A session-retros log is kept at `docs/RETROS.md`.

## What was done in the most recent session

**Session 2026-05-21 (animation primitives: Tween + ShapeSprite enhancements):**

1. **`scripts/tween.js` committed.** Lightweight `Tween` utility class (plain class, not a Script subclass). Interpolates any numeric properties on any target object over a specified duration. API: `new Tween(target, props, duration, easing).onComplete(fn)`. `tween.update(dt)` returns true when done and fires the callback on the completion frame. Easing library (10 static methods): `linear`, `easeIn/OutQuad`, `easeInOutQuad`, `easeIn/OutCubic`, `easeInOutCubic`, `easeOutElastic`, `easeOutBounce`, `easeInBack`, `easeOutBack`. Works with GameObject properties (x, y, rotation, scale), Script properties (alpha), and plain objects. Two idiomatic management patterns documented in the header comment.

2. **`scripts/shape-sprite.js` enhanced.** Three additions:
   - `play()` now returns `this` for fluent chaining.
   - `onDone(fn)` method: registers a one-shot callback invoked when a non-looping animation completes. Cleared automatically on the next `play()` call to prevent stale callbacks when animations are interrupted. Allows reactive state transitions without polling `isDone()` each frame: `sprite.play('dying').onDone(() => scene.remove(host))`.
   - Per-animation `easing` field: optional `(t) => t` function (same signature as `Tween` easing functions) applied to raw t before the draw call. Decouples visual timing curve from animation duration without requiring easing logic inside the draw function.

3. **`scripts/_registry.md` updated.** Tween row added; ShapeSprite row updated to describe the new API surface.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio, storage, narrative), Pong, PauseOverlay original, Survivors v1-v3, Clown Brawler v1 and v2, SpriteSheet and ShapeSprite scripts, Party House, Horses Teach Typing, Minesweeper, engine bundle and bundle-inlining convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame shared bootstrap helper, inkjs vendor upload and Engine.Narrative wrapper, Drift v1 and GitHub Actions build pipeline (ADR-0019).

## Currently in progress

Nothing blocked. Tween and ShapeSprite enhancements are committed. Build pipeline will validate syntax on next push.

## Next up

### Pipeline improvements (additive; no changes to manifest schema or build script required)

1. **GitHub Releases step.** Add one step to the existing workflow: `softprops/action-gh-release@v2` with a rolling `latest-build` tag. Produces permanent public download URLs for every built game even though the source repo is private. Enables the "send someone a link" distribution story.

2. **Ink pre-compilation in the build step.** The Actions runner has Node available, which means `npx inkjs` can compile `.ink` files to JSON at build time. This eliminates the `sources.js` wrapper pattern (no more manual sync between `.ink` files and their JS string mirrors), drops the inkjs compiler from the build (~100 KB saving per narrative game), and replaces the `gain_crew` / `lose_crew` external-function pattern with a cleaner compiled-story path. Warrants its own scoping conversation before implementation.

3. **Game scaffolding script.** A `scripts/scaffold-game.sh` (runnable via `workflow_dispatch` with a `game_name` input) that creates `games/<name>/`, stub scene files, and a `build-manifest.json`. Claude fills in the stubs rather than creating structure from scratch, reducing per-session boilerplate cost.

4. **Registry validation workflow.** Checks that every `.js` file in `scripts/` and `scenes/` has an entry in the corresponding `_registry.md`. Fails the build if not. Enforces documentation discipline automatically rather than relying on Claude to remember.

### Game work

5. **Drift v1 bug fixes.** Trevor flagged several issues during verification. Address in a dedicated bug-fix session.

6. **Drift crew AI session.** Design and implement autonomous crew redistribution. Replaces the `_redistributeCrew()` stub in `DriftMatchScene._resolveEncounter()`. Captain macro-orders (Red Alert, Retreat, Defend) belong in the same session.

7. **Apply Tween to Clown Brawler.** The most natural first consumer: knockback arcs on gorilla hits, scale pulse on player damage (squash), alpha fade on balloon death. Currently `FloatingBalloon` manually decrements alpha each frame; a `new Tween(this._sprite, { alpha: 0 }, 2.5, Tween.easeOutQuad).onComplete(...)` replaces ~10 lines. GorillaEnemy's dying state can use `sprite.play('dying').onDone(() => ...)` instead of a manual `_dieTimer` counter.

8. **Build manifests for existing games.** Pong, Survivors, Clown Brawler, Horses Teach Typing, Party House, and Minesweeper do not yet have `build-manifest.json` files. Add manifests as each game is next touched; the bootstrap migration to `bootstrapGame()` is the natural trigger.

9. **Visual-language follow-up.** Extract shared tokens to `scripts/ui-tokens.js` once a second game uses the same vocabulary.

10. **Engine primitives.** Conductor/Scheduler, real Spawner script, generic health/damage script, mouse-edge detector. (Signal-driven animation player is largely covered by ShapeSprite.onDone + Tween.)

## Deferred to shipping mode

- **Pong**: PauseOverlay retrofit.
- **Survivors**: jsfxr SFX, persist stats and coins.
- **Clown Brawler**: further visual upgrades.
- **Horses Teach Typing**: progression curve, high-score, keyboard-hint bubble.
- **Party House**: additional scenarios, more guest types, full ban-by-instance UI.
- **Minesweeper**: question-mark state, keyboard navigation, custom difficulty, win/loss-streak.
- **Common scenes**: shared credits, loading, main-menu templates.

## Deferred housekeeping (tool-gated)

- **Dead file deletion** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval.
- **Minesweeper build bundle drift.** Deferred until Minesweeper is next regenerated.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: companion public repo + GitHub Pages, or Cloudflare Pages, for permanent hosted play URLs. The build pipeline is now the only prerequisite that was missing.

## Open questions

- **Drift v1 known issues**: flagged during verification; scope TBD.
- **Asset sourcing for the raster path**: carrying over.
- **Clown Brawler v1 disposition**: candidate for dead-files retirement.
- **Ink pre-compilation architecture**: see Next up item 2.
- **Minesweeper engine bundle drift**: deferred per size constraints.

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml`. Claude commits source files; GitHub builds. No manual assembly or upload step for games with a `build-manifest.json`.
- **To add a new game to the pipeline:** commit source files plus `games/<name>/build-manifest.json`. The workflow picks it up automatically on the next push.
- **Manifest schema** is documented in the header of `scripts/build-game.sh`. Required fields: `game`, `title`, `output`, `concat` (ordered array of repo-relative paths), `bootstrap` (JS string).
- **Engine bundle is the canonical engine fetch target.** Per ADR-0016, fetch `engine/engine.bundle.js`. Project knowledge copy is current as of 2026-05-20 (11 modules, blob SHA `91d7adf9861156a4149c6e23564737a973038212`).
- **Tween build-order note.** `scripts/tween.js` has no runtime dependencies; it can appear anywhere in the concat order before the scripts that use it. For games that use ShapeSprite easing, Tween does not need to be loaded first (the easing functions are just plain functions; no class reference is required at ShapeSprite's load time). But including Tween before game scripts is the natural convention.
- **Drift concat order**: `engine/lib/inkjs.js` -> `engine/engine.bundle.js` -> `scripts/bootstrap.js` -> `scripts/pause-overlay.js` -> `games/drift/encounters/sources.js` -> `games/drift/scenes/menu.js` -> `games/drift/scenes/match.js` -> `games/drift/scenes/game-over.js` -> `bootstrapGame({...})`.
- **Drift crew AI stub**: `_redistributeCrew()` stub inside `DriftMatchScene._resolveEncounter()`, clearly commented.
- **`create_or_update_file` over `push_files` for large single files.** Proven more reliable for files >20 KB (shorter response, lower truncation risk).
- **Node.js 24 opt-in** is active in the workflow via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'`. Becomes a no-op after June 2, 2026.
- **Workflow permissions**: Settings > Actions > General must be set to "Read and write permissions" for the commit-back step to work.
- **Engine.Narrative usage pattern**: `const n = new Engine.Narrative(src); n.bindExternal('fn', (...) => ...); n.setVar('x', val); n.continue(); n.getChoices(); n.choose(choice.index);`.
- **Dead files**: `grep -r DEAD-FILE` to enumerate. Convention in `docs/DEAD_FILES.md`.
- **Retros log**: `docs/RETROS.md` accumulates session-level observations chronologically.
