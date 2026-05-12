# State

Last updated: 2026-05-12

## Current status

Three games in the repo: Pong, Survivors v3, Clown Brawler (v1; v2 in progress this session). Plus `poc-square` as an engine smoke test. The engine, audio service, collision contract, pause utility, persistent storage, and procedural Shape DSL sprite primitive (`ShapeSprite`) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the new sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts: the original Clown Brawler stays as `build/clown-brawler.html`, the in-progress refactor will land at `build/clown-brawler-v2.html`.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`.

## What was done in the most recent session

**Session 2026-05-12 (this session):**

1. **ADR-0013** added: experimental-probe framing for in-development games.
2. **STATE.md restructured**: engine-oriented "Next up," "Deferred to shipping mode" section, retirement of the original pixel-grid sprite generator.
3. **Dead-file convention established** in `docs/DEAD_FILES.md`. Two dead files marked.
4. **ADR-0014** added: persistent storage via `Engine.Storage` with Game-configured namespace.
5. **`engine/storage.js`** added; **`engine/game.js`** updated to instantiate it.
6. **ADR-0015** added: procedural Shape DSL sprite primitive design.
7. **`scripts/shape-sprite.js`** added: `Engine.ShapeSprite` Script.
8. **CLAUDE.md §4** updated to record SVG-generation weakness alongside pixel-grid.
9. **Build sibling-iteration convention** added to CONVENTIONS.md: iterations get `build/<game>-v2.html`, v3, etc., rather than overwriting.
10. **`docs/ARCHITECTURE.md`** clarified: build concatenation order rule for scripts that reference other scripts via the `Engine` namespace (relevant now that ShapeSprite is referenced by character scripts).
11. **Clown Brawler character scripts refactored to use `ShapeSprite`** (this commit's primary work):
    - `games/clown-brawler/scripts/clown-player.js`: `_drawBody` lifted into module-level `_drawClownBody`; animations `idle`, `punch`, `dying` defined as ShapeSprite states. ClownPlayer constructs a sprite internally, drives `play()` on state changes, sets `setFlipX` per facing, and applies effect alpha in its own `draw()` before forwarding to `sprite.draw()`. Public API and signal contract unchanged.
    - `games/clown-brawler/scripts/gorilla-enemy.js`: similar pattern. Animations `walking` (bob cycle), `attacking`, `stunned`, `dying` (animated tilt). Per-instance balloon color closed-over via factory function. Public API and signal contract unchanged.
    - `games/clown-brawler/scripts/floating-balloon.js`: single static `drift` animation. Position and alpha driven by the script. Slight overkill for a single-state visual but kept for consistency.

**Not yet done in this session**, planned next:

- Regenerate `build/clown-brawler-v2.html` with the refactored scripts and the new `scripts/shape-sprite.js`. The build file is too large to push reliably via the GitHub API; it will be written to local workspace and presented for manual upload.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio), Pong, PauseOverlay, Survivors v1-v3, Clown Brawler initial build (v1), SpriteSheet script.

## Currently in progress

**Clown Brawler v2 build regeneration.** The refactored scripts are committed; the build artifact needs to be assembled from current source files and saved as `build/clown-brawler-v2.html` per the new sibling-iteration convention. The original `build/clown-brawler.html` (v1) stays in place for visual comparison.

## Next up

1. **(In progress)** Generate `build/clown-brawler-v2.html` and verify behavior. Once verified, decide whether to mark `build/clown-brawler.html` (v1) DEAD or keep it as a reference build.

2. **Revisit Konva-style raster sprite path** (user-flagged on 2026-05-12). Konva's `Sprite` API expects a raster sheet (PNG with frame rectangles); using it (or a similar raster-driven approach) requires a source of hand-made sprite sheets. Open questions: where to host raster assets (in-repo `assets/` folder, separate fork, or external CC0/CC-BY sources like OpenGameArt or Kenney), how to embed them in single-file HTML builds (base64 data URIs, similar to audio embedding), what the integration shape would be (extend `SpriteSheet`, wrap Konva, build a thin raster-sheet Script). Not actionable until Clown Brawler v2 lands and the user gives direction on asset sourcing.

3. **Engine primitives.** Common attachable behaviors reinvented across multiple games:
   - **Real spawner script.** Replaces inlined spawn logic in `SurvivorsMatchScene._spawnEnemy`.
   - **Signal-driven animation player.** Decouples animation state changes from per-script update logic. Particularly useful now that Clown Brawler v2 has multiple ShapeSprite-driven characters.
   - **Generic health/damage script.** Centralizes the HP, damage, death-emit pattern.

## Deferred to shipping mode

Real items, blocked behind ADR-0013.

- **Pong**: PauseOverlay retrofit, then regenerate `build/pong-v2.html` (per the sibling-iteration convention).
- **Survivors**: jsfxr SFX. Also: persist stats and coins via `Engine.storage`.
- **Clown Brawler**: any further visual upgrades after v2. Could become v3 if the raster path (next-up #2) lands and gets adopted.
- **Common scenes**: shared credits, loading, and main-menu templates.

## Deferred housekeeping (tool-gated)

- **Actual deletion of dead files** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern. Not currently demanded by any game.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only.

## Open questions

- **Asset sourcing for the eventual raster path** (next-up #2): in-repo `assets/` folder vs. external host vs. CC0 sources like OpenGameArt or Kenney. Affects build size, license accounting, and offline behavior.
- **Clown Brawler v1 disposition once v2 is verified**: keep as reference build, mark DEAD, or delete via `GitHub:delete_file` when available.

## Sprite generator retirement note

The original sprite generator concept (Claude-powered in-browser tool emitting 2D integer pixel grids per frame) is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015), now implemented and exercised in Clown Brawler v2's character scripts.

The `sprite-generator.html` artifact from the earlier session is left as-is (not maintained, not deleted). The `scripts/sprite-sheet.js` runtime remains available for raster sprite sheets if the Konva-style path lands.

## Notes for the next session

- **ShapeSprite owned vs attached**: in Clown Brawler v2, character scripts (ClownPlayer, GorillaEnemy, FloatingBalloon) construct a ShapeSprite as a private member (`this._sprite = new Engine.ShapeSprite(host, ...)`) but do not attach it to `host.scripts`. The character script drives the sprite's lifecycle directly (calls `this._sprite.update(dt)` and `this._sprite.draw(ctx)`). This pattern is now documented in ARCHITECTURE.md's Script section. The benefit is deterministic draw ordering and the ability to layer effects (alpha flicker, fade) around the sprite draw call. The cost is one extra `update(dt)` / `draw(ctx)` forwarding call per character.
- **ShapeSprite usage pattern**: instantiate as `new Engine.ShapeSprite(host, { initialAnim: 'idle', animations: { idle: { duration: 1.0, loop: true, draw: (ctx, { t }) => { /* canvas calls */ } }, ... } })`.
- **Per-instance animation params** (e.g., gorilla balloon color): use a factory function that closes over the per-instance value and returns the animations object. See `_gorillaAnimations(balloonColor)` in `games/clown-brawler/scripts/gorilla-enemy.js`.
- **Build for v2**: concatenation order has shape-sprite.js before any clown-brawler script (per the updated ARCHITECTURE.md rule). Bootstrap should pass `{ gameName: 'clown-brawler' }` to the Game constructor so storage is namespaced if and when v2 starts using it.
- **Clown Brawler scene** (`games/clown-brawler/scenes/clown-match.js`): NOT modified. The scene instantiates character scripts with the same signatures and attaches them the same way; the refactor is entirely internal to the character scripts.
- **Engine.storage usage pattern**: bootstrap a game with `new Engine.Game(canvas, { gameName: 'mygame' })`; thereafter `Engine.storage.save('stats', obj)` / `Engine.storage.load('stats')` round-trip JSON-serializable values with automatic `mygame:stats` keying.
- **Survivors difficulty tuning** lives in `_getSpawnInterval`, `_getEnemyTypePool`, and `_getEnemyConfig` inside `survivors-match.js`. Not a current priority.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
