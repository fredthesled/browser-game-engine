# State

Last updated: 2026-05-12

## Current status

Three games in the repo: Pong, Survivors v3, Clown Brawler. Plus `poc-square` as an engine smoke test. The engine, audio service, collision contract, and pause utility are settled. `scripts/sprite-sheet.js` is implemented but no game consumes it yet.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Gaps in any given game (missing SFX, missing pause, primitive-only rendering, untuned difficulty) are intentional during this phase. The "next up" list below is engine-oriented; per-game polish lives in "Deferred to shipping mode" and is unblocked only when a specific game is explicitly promoted.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`. Files that should be removed but cannot (because `GitHub:delete_file` requires an in-browser approval not always available) are banner-tagged with `DEAD-FILE`, tracked in the disposal queue, and marked `DEAD` in their respective registries.

## What was done in the most recent session

**Session 2026-05-12 (this session):**

1. **ADR-0013** added to `docs/DECISIONS.md`, formalizing the experimental-probe framing for in-development games. Fresh Claude sessions reading three games with three small gaps should now read that as expected state, not as a backlog crisis.
2. **STATE.md** rewritten: engine-oriented "Next up" list, dedicated "Deferred to shipping mode" section for per-game polish, formal retirement of the original pixel-grid sprite generator.
3. **Dead-file audit completed.** Two dead files identified:
   - `games/survivors/scenes/survivors-levelup.js` (superseded by `SurvivorsShopScene`)
   - `build/clown-brawler-header-placeholder.txt` (aborted/incomplete build fragment)
   
   Deletion via `GitHub:delete_file` failed ("No approval received"). Adopted alternative: dead-file marking convention.
4. **Dead-file convention established** in `docs/DEAD_FILES.md`. Three signals per dead file: banner with `DEAD-FILE` sentinel at the top of the file, row in the central disposal queue, and `DEAD` status in the relevant `_registry.md`. The two files identified above were marked accordingly.
5. **`CLAUDE.md` §8** updated with one bullet pointing to the convention, so future sessions reading the operating manual at startup know what `DEAD-FILE`-banner files mean.
6. **`scenes/_registry.md`** updated: `SurvivorsLevelupScene` status changed from `Superseded` to standardized `DEAD`, Notes column points to `docs/DEAD_FILES.md`. Status legend added at top of registry.

No code changes to the engine, scripts, or game scenes. No build regeneration.

## Previously done

See prior STATE entries: engine (all six modules), Pong, PauseOverlay, Survivors v1-v3 (wave-clear, shop, coin magnet, fades, swarm clusters in level 1), Clown Brawler initial build, SpriteSheet script.

## Currently in progress

Nothing.

## Next up

Engine-oriented priorities, in order. Driven by user direction on 2026-05-12.

1. **Save/load wrapper.** A small storage primitive backed by `localStorage`. Likely lives in a new `engine/storage.js`, instantiated as `Engine.storage` in the `Game` constructor alongside `Engine.input` and `Engine.audio` (parallel pattern, per ADR-0011). Minimal API: `save(key, value)`, `load(key)`, `clear(key)`, with JSON serialization on top of `localStorage`. Optional namespacing per game (e.g., `survivors:stats`) to avoid collisions when multiple game builds run on the same origin. Worth a small ADR if the API shape ends up non-obvious. Survivors stats and coins are the natural first consumer once the wrapper exists.

2. **SVG and/or shape-DSL sprites.** Replaces the retired pixel-grid sprite generator. Two viable approaches, possibly both:
   - **SVG-rasterize**: Claude emits SVG markup for each frame; loaded into an Image via a `data:image/svg+xml;base64,...` URI, drawn to an offscreen canvas, the resulting raster fed to `SpriteSheet` as if it were a PNG. Plays to Claude's strengths (structured markup), keeps `SpriteSheet` unchanged, and produces real bitmap output.
   - **Shape DSL**: sprites are composed of vector primitives (circles, rects, polygons, paths) drawn directly to the live canvas per frame. No rasterization step. Cheaper at runtime, more flexible for animation, but bypasses `SpriteSheet`. Lines up well with the canvas-primitive aesthetic Clown Brawler already has.
   
   Clown Brawler is the obvious first integration target since its clowns and gorillas are currently drawn from canvas primitives anyway. Worth scoping which approach (or both) before writing code; falls under the pre-flight rules in `CLAUDE.md` §2.

3. **Engine primitives.** Common attachable behaviors that have been reinvented across multiple games:
   - **Real spawner script.** Configurable interval, pool of object types, optional ramp-up curve. Replaces the inlined spawn logic in `SurvivorsMatchScene._spawnEnemy`.
   - **Signal-driven animation player.** Decouples animation state changes from per-script update logic. Scripts emit "requested anim X" signals; the animation player resolves transitions and drives `SpriteSheet`. Useful once #2 produces real animated assets.
   - **Generic health/damage script.** Centralizes the HP, damage, death-emit pattern that `SurvivorsEnemy`, `ClownPlayer`, and `GorillaEnemy` each reinvent inline. Likely emits standard `<host>_hurt` and `<host>_died` signals with a configurable signal-name prefix.
   
   These can be tackled individually as games demand them rather than as a batch.

## Deferred to shipping mode

Real items, blocked behind ADR-0013. They become active when a specific game is explicitly promoted from experimental probe to shipping target.

- **Pong**: PauseOverlay retrofit, then regenerate `build/pong.html`.
- **Survivors**: jsfxr SFX (fire, hit, death, coin, level complete). Wrapping pattern documented in `docs/resources/libraries.md`.
- **Clown Brawler**: replace primitive clown/gorilla rendering with real sprites or finalized DSL output (depends on next-up #2).
- **Common scenes**: shared credits, loading, and main-menu templates. Worth doing only when at least one game is being seriously polished; before that, each game's bespoke menu is fine.

## Deferred housekeeping (tool-gated)

Work that can only proceed when a currently-unavailable tool becomes available.

- **Actual deletion of dead files** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval. When the tool becomes available, run through the queue, deleting each file and removing its row from both the queue and the relevant registry per the convention in `DEAD_FILES.md`.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern (see `docs/resources/multiplayer.md`). The original gating condition ("at least two verified games exist") is met but no game currently demands it. Will warrant its own ADR when activated.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only. Adding pointer/touch handlers would unlock phone-share use cases for any game with simple controls. Not currently prioritized.

## Open questions

- **SpriteSheet origin convention**: frame centered at (offsetX, offsetY) relative to host. `offsetY = -(frameH * scale / 2)` keeps feet at host Y. An alternative `anchorY` fraction (0 = top, 0.5 = center, 1 = bottom) was considered but adds complexity for marginal gain. Revisit if games need it.
- **Asset embedding pattern after the SVG/shape-DSL pivot**: the previous plan was `const ASSETS = { player: 'data:image/png;base64,...' }` at the top of each game's entry file. With SVG sources, embedding SVG strings as plain text is cleaner than base64 PNG data URIs. The shape-DSL approach skips embedding entirely (the sprite is code). Decide per-game when next-up #2 lands.
- **`Engine.storage` namespace shape**: confirm whether a flat `save/load(key)` is enough, or whether per-game namespacing should be baked into the API (e.g., a `Storage` instance scoped to a game name) rather than left to caller convention.

## Sprite generator retirement note

The original sprite generator concept (Claude-powered in-browser tool emitting 2D integer pixel grids per frame, rendered to canvas, exported as PNG) is retired. Root cause is documented in `CLAUDE.md` §9: direct LLM pixel placement is fundamentally weak (no spatial awareness across rows, no error correction, expensive in tokens) and produces mediocre output regardless of effort, while contradicting this engine's stated token-economy goal.

The forward path is SVG and/or shape-DSL sprite production (next-up #2). The standalone "sprite generator artifact" deliverable is not on the roadmap; sprite production is now an in-session collaboration with Claude, not a packaged tool that runs separately.

The `sprite-generator.html` artifact from the earlier session is left as-is (not maintained, not deleted). The `scripts/sprite-sheet.js` runtime is unaffected by this retirement; it still consumes a rasterized image, just sourced from rendered SVG rather than from generated pixel grids.

## Notes for the next session

- **SpriteSheet build order**: depends only on `Engine.Script`, so it slots in after `engine/game.js` and before any game scripts that use it. Unchanged by the SVG/shape-DSL pivot.
- **SpriteSheet flip behavior**: `setFlipX(true)` applies `ctx.scale(-1,1)` around the host origin before drawing. The offsetX shift is applied after, so the frame stays correctly positioned regardless of flip state.
- **SpriteSheet non-looping animations**: `isDone()` stays true until `play()` is called again. The owning script is responsible for transitioning back to idle (or whatever follows), typically by checking `sprite.isDone()` in its own update loop.
- **Survivors difficulty tuning** lives in `_getSpawnInterval`, `_getEnemyTypePool`, and `_getEnemyConfig` inside `survivors-match.js`. Not a current priority. If Survivors is ever promoted to shipping mode, balance work starts there and should be playtest-driven, not in-chat-reasoning-driven.
- **The "deferred to shipping mode" list** is the natural starting point if a game gets promoted. Per ADR-0013, that promotion is an explicit user decision, not a default Claude can drift into.
- **Dead files**: run `grep -r DEAD-FILE` (or the equivalent through GitHub search) to find every parked file. Convention and disposal queue in `docs/DEAD_FILES.md`. Do not modify or surface as backlog.
