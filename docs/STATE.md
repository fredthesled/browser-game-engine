# State

Last updated: 2026-05-12

## Current status

Three games in the repo: Pong, Survivors v3, Clown Brawler. Plus `poc-square` as an engine smoke test. The engine, audio service, collision contract, pause utility, persistent storage, and procedural Shape DSL sprite primitive (`ShapeSprite`) are settled. `scripts/sprite-sheet.js` is implemented but no game consumes it yet.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Gaps in any given game (missing SFX, missing pause, primitive-only rendering, untuned difficulty) are intentional during this phase. The "next up" list below is engine-oriented; per-game polish lives in "Deferred to shipping mode" and is unblocked only when a specific game is explicitly promoted.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`. Files that should be removed but cannot (because `GitHub:delete_file` requires an in-browser approval not always available) are banner-tagged with `DEAD-FILE`, tracked in the disposal queue, and marked `DEAD` in their respective registries.

## What was done in the most recent session

**Session 2026-05-12 (this session):**

1. **ADR-0013** added: experimental-probe framing for in-development games.
2. **STATE.md restructured**: engine-oriented "Next up" list, "Deferred to shipping mode" section, formal retirement of the original pixel-grid sprite generator.
3. **Dead-file convention established** in `docs/DEAD_FILES.md`. Two dead files identified and marked: `games/survivors/scenes/survivors-levelup.js` and `build/clown-brawler-header-placeholder.txt`. Actual deletion deferred to tool approval.
4. **`CLAUDE.md` §8** gained a bullet pointing to the dead-file convention.
5. **`scenes/_registry.md`** updated: `SurvivorsLevelupScene` status changed to standardized `DEAD`.
6. **ADR-0014** added: persistent storage design (Game-configured namespace via `gameName` option).
7. **`engine/storage.js`** added: `Engine.Storage` class providing localStorage-backed save/load/has/clear/clearAll/keys, with automatic per-game namespacing, JSON serialization, and an in-memory fallback for environments without localStorage.
8. **`engine/game.js`** updated: constructor signature is now `(canvas, options = {})`; instantiates `Engine.storage` alongside the existing input and audio singletons. Backward-compatible.
9. **`docs/ARCHITECTURE.md`** updated: storage module added to overview, class contract, file layout, and build concatenation order.
10. **ADR-0015** added: procedural Shape DSL sprite primitive design, plus rationale for deferring SVG-rasterize.
11. **`scripts/shape-sprite.js`** added: `Engine.ShapeSprite` Script. Each animation is `{ duration, loop, draw: (ctx, state) => void }`. Method surface mirrors `SpriteSheet`: `play(name, force)`, `isDone()`, `setFlipX(b)`, `getFlipX()`, plus public `.alpha` and `.currentAnim`. State passed to draw functions is `{ anim, t, flipX }` with normalized t.
12. **`scripts/_registry.md`** updated: row added for `ShapeSprite` with usage notes.
13. **`CLAUDE.md` §4** updated: pixel-grid bullet now also covers LLM SVG limitations, citing the SVGenius/LLM4SVG benchmarks. Points future sessions at Shape DSL as the chosen path.

No game scripts or scenes were modified. No game builds were regenerated.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio), Pong, PauseOverlay, Survivors v1-v3, Clown Brawler initial build, SpriteSheet script.

## Currently in progress

Nothing.

## Next up

Engine-oriented priorities, in order.

1. **Test Shape DSL in a new version of Clown Brawler.** User-confirmed next step on 2026-05-12. Refactor `ClownPlayer`, `GorillaEnemy`, and `FloatingBalloon` to use `ShapeSprite` instead of inline canvas drawing. Goal is zero visual change: existing primitive shapes become parametric draw functions inside a `ShapeSprite` per host. The existing animation state machines (walking/attacking/stunned/dying in `GorillaEnemy`; idle/walking/punching/hurt in `ClownPlayer`) become `ShapeSprite.play()` calls. Add WASD-or-arrows control parity if convenient (currently arrow-keys only). Regenerate `build/clown-brawler.html` (or a sibling like `build/clown-brawler-v2.html`) for testing. This is the first end-to-end exercise of the Shape DSL and will surface any API gaps before they're locked in by additional games.

2. **Revisit Konva-style raster sprite path.** User-flagged on 2026-05-12. Konva's `Sprite` API expects a raster sheet (PNG with frame rectangles); to use it (or a similar raster-driven approach), we'd need a source of hand-made sprite sheets. Open questions to resolve: where to host raster assets (in-repo `assets/` folder, a separate fork, or external CC0/CC-BY sources like OpenGameArt), how to embed them in single-file HTML builds (base64 data URIs, similar to the audio embedding pattern), and what the integration shape would be (extend `SpriteSheet`, wrap Konva, or build a thin raster-sheet Script). Not actionable until step 1 lands and the user gives direction on asset sourcing.

3. **Engine primitives** (deferred from previous next-up list). Common attachable behaviors reinvented across multiple games:
   - **Real spawner script.** Configurable interval, pool of object types, optional ramp-up curve. Replaces the inlined spawn logic in `SurvivorsMatchScene._spawnEnemy`.
   - **Signal-driven animation player.** Decouples animation state changes from per-script update logic. Scripts emit "requested anim X" signals; the animation player resolves transitions and drives `SpriteSheet` or `ShapeSprite`. Particularly useful once step 1 produces real procedural sprites.
   - **Generic health/damage script.** Centralizes the HP, damage, death-emit pattern that `SurvivorsEnemy`, `ClownPlayer`, and `GorillaEnemy` each reinvent inline.
   
   These can be tackled individually as games demand them rather than as a batch.

## Deferred to shipping mode

Real items, blocked behind ADR-0013. They become active when a specific game is explicitly promoted from experimental probe to shipping target.

- **Pong**: PauseOverlay retrofit, then regenerate `build/pong.html`.
- **Survivors**: jsfxr SFX (fire, hit, death, coin, level complete). Also: persist stats and coins via `Engine.storage` (the natural first consumer of the storage wrapper).
- **Clown Brawler**: replace primitive clown/gorilla rendering with finalized sprite output once the Shape DSL pass (next-up #1) settles, or upgrade further if the raster path (next-up #2) lands.
- **Common scenes**: shared credits, loading, and main-menu templates. Worth doing only when at least one game is being seriously polished; before that, each game's bespoke menu is fine.

## Deferred housekeeping (tool-gated)

Work that can only proceed when a currently-unavailable tool becomes available.

- **Actual deletion of dead files** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern (see `docs/resources/multiplayer.md`). The original gating condition is met but no game currently demands it.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only. Adding pointer/touch handlers would unlock phone-share use cases. Not currently prioritized.

## Open questions

- **SpriteSheet origin convention**: frame centered at (offsetX, offsetY) relative to host. `offsetY = -(frameH * scale / 2)` keeps feet at host Y. An alternative `anchorY` fraction was considered but adds complexity for marginal gain. Revisit if games need it.
- **Asset sourcing for the eventual raster path** (next-up #2): in-repo `assets/` folder vs. external host vs. CC0 sources like OpenGameArt or Kenney. Affects build size, license accounting, and offline behavior. Decision deferred until step 1 produces real Shape DSL output and the user chooses whether to pursue the raster path.

## Sprite generator retirement note

The original sprite generator concept (Claude-powered in-browser tool emitting 2D integer pixel grids per frame, rendered to canvas, exported as PNG) is retired. Root cause is documented in `CLAUDE.md` §9: direct LLM pixel placement is fundamentally weak.

The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015), now implemented. The standalone "sprite generator artifact" deliverable is not on the roadmap; sprite production is an in-session collaboration with Claude (Claude writes parametric draw functions), not a packaged tool that runs separately.

The `sprite-generator.html` artifact from the earlier session is left as-is (not maintained, not deleted). The `scripts/sprite-sheet.js` runtime remains available for raster sprite sheets if and when the Konva-style path (next-up #2) lands.

## Notes for the next session

- **ShapeSprite usage pattern**: instantiate as `new Engine.ShapeSprite(host, { initialAnim: 'idle', animations: { idle: { duration: 1.0, loop: true, draw: (ctx, { t }) => { /* canvas calls */ } }, ... } })`. Then `host.attach(sprite)`. Call `sprite.play('punch')` to transition. State passed to draw is `{ anim, t, flipX }`; `t` is normalized 0..1 over the animation's `duration`. Draw in host-local space (origin at host position) per ADR-0008. Build concatenation order: same as any other script (after `engine/game.js`, before scenes that reference it).
- **ShapeSprite flip behavior**: `setFlipX(true)` applies `ctx.scale(-1, 1)` around the host origin before calling the user's draw function. Authoring draw functions should assume "facing right" by default; flipping is handled by the script.
- **ShapeSprite non-looping animations**: `isDone()` stays true until `play()` is called again. The owning script is responsible for transitioning back to idle (or whatever follows), typically by checking `sprite.isDone()` in its own update loop. Same pattern as SpriteSheet.
- **SpriteSheet build order**: depends only on `Engine.Script`, so it slots in after `engine/game.js` and before any game scripts that use it. Same applies to `ShapeSprite`.
- **Engine.storage usage pattern**: bootstrap a game with `new Engine.Game(canvas, { gameName: 'mygame' })`; thereafter `Engine.storage.save('stats', obj)` / `Engine.storage.load('stats')` round-trip JSON-serializable values with automatic `mygame:stats` keying under the hood.
- **Survivors difficulty tuning** lives in `_getSpawnInterval`, `_getEnemyTypePool`, and `_getEnemyConfig` inside `survivors-match.js`. Not a current priority.
- **Dead files**: run `grep -r DEAD-FILE` (or GitHub search) to find every parked file. Convention and disposal queue in `docs/DEAD_FILES.md`. Do not modify or surface as backlog.
- **The Clown Brawler v2 refactor** (next-up #1) is a moderate-complexity task that does NOT need fresh pre-flight; the approach is settled (use ShapeSprite, preserve visuals, regenerate build). Score it as moderate (~4-5) and proceed.
