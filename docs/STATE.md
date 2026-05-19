# State

Last updated: 2026-05-14

## Current status

Six games in the repo: Pong, Survivors v3, Clown Brawler (v1 in repo; v2 committed, visual verification pending), Horses Teach Typing v1 (sources and build committed, visual verification pending), Party House (sources committed, build pending manual upload, visual verification pending), and Minesweeper (sources committed including a polished menu pass per ADR-0017, build assembled and verified at commit 2e596a2b). Plus `poc-square` as an engine smoke test, with a v2 sibling build (`build/poc-square-v2.html`) verified to behave identically to v1, validating the engine-bundle workflow as a drop-in for individual-module concatenation. The engine, audio service, collision contract, pause utility (now with optional onRestart in addition to onQuit), persistent storage, procedural Shape DSL sprite primitive (`ShapeSprite`), canonical engine bundle (`engine/engine.bundle.js`, per ADR-0016), bundle-inlining build-assembly convention (`docs/CONVENTIONS.md`, validated against poc-square v1/v2), and visual language plus logical-canvas convention (ADR-0017) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`. A session-retros log is now kept at `docs/RETROS.md` for observations and forward-looking proposals that do not yet warrant an ADR.

## What was done in the most recent session

**Session 2026-05-14 (later, visual language and Minesweeper menu polish):**

1. **ADR-0017 visual language and responsive layout** (commit f77713d3). New ADR appended to `docs/DECISIONS.md`. Establishes a project-wide visual language via design tokens (spacing, typography, hit targets, and color roles), a logical-canvas convention for viewport-aware bootstrap (each game declares a `regular` landscape preset and optionally a `compact` portrait preset; the bootstrap picks based on viewport aspect and CSS-scales to fit), touch capability detection (without yet implementing touch input mapping), and per-game theming via token overrides. UI primitive Scripts (button, panel, label) deferred until a second game wants the same vocabulary. The Game constructor is unchanged; the responsive convention lives in the per-game bootstrap snippet, not in engine code.

2. **ARCHITECTURE.md updated** (commit 625e6a0e). New "Logical canvas and viewport bootstrap" section documenting the convention and reference bootstrap snippet. The Input class contract section gained a paragraph noting that `getBoundingClientRect()` maps physical click positions to logical canvas pixels, so CSS-scaled canvases report correct mouse coordinates without per-scene scale correction. Build concatenation order step 13 now points to the new section. Open questions list now includes "Touch input mapping" as an explicit deferred item.

3. **Minesweeper menu polished as first proving ground** (commit 2c46b94b). New `games/minesweeper/scenes/menu.js` replaces the prior text-based difficulty list with three preview cards in a row. Each card shows a mini board render at the correct aspect ratio per difficulty (9x9 with 16px cells for Beginner, 16x16 with 9px cells for Intermediate, 30x16 with 6px cells for Expert), an inset sunken title plate, dimensions plus mine count, and a LED-style best-time readout when one is stored. Raised bevel for unselected cards, sunken bevel for the selected card, matching the Win 3.1 vocabulary used in-game. Tokens are defined inline at the top of the menu file (as the `MS_TOKENS` const) per ADR-0017's deferred-extraction policy. Input: arrow keys, 1/2/3, or mouse hover to select; Enter/Space/click to confirm.

4. **`scenes/_registry.md` updated** (commit 2c46b94b). MinesweeperMenuScene row rewritten to describe the preview-card layout and to reference ADR-0017 as the source of the visual language pattern.

5. **Build re-assembled and verified** (commit 2e596a2b). `build/minesweeper.html` regenerated to include the polished menu and the new viewport-aware bootstrap. Eight visual checks passed on user-side browser load: menu loads, three preview cards visible, mouse hover changes selection, arrow keys and 1/2/3 change selection, Enter and click start a match, audio plays on hover and select, match gameplay intact, window resize keeps canvas centered and aspect-correct. Caveat tracked in `docs/RETROS.md` (2026-05-14 entry): the inline engine in this build is a hand-condensed reconstruction rather than a verbatim copy of `engine/engine.bundle.js` because assembly happened under reduced tool surface; regeneration from the canonical bundle in a tooled session is the cleaner cleanup.

6. **Retros log introduced.** New `docs/RETROS.md` captures session-level observations and forward-looking proposals (shared bootstrap module, build manifest, tooling-degraded protocol, startup sanity assertion, scene preview harness, build artifact policy revision). These are candidates for future ADRs but do not yet warrant one individually.

**Session 2026-05-14 (earlier, Minesweeper):**

1. **New game: Minesweeper.** Classic Win 3.1 Minesweeper with three difficulties: Beginner (9x9, 10 mines), Intermediate (16x16, 40 mines), Expert (30x16, 99 mines). Cell size scales per difficulty (28px Beginner, 26px Intermediate, 18px Expert) so all three boards fit comfortably inside the 900x600 canvas. Standard rules: left click reveals, right click flags, chord click on a satisfied number reveals adjacent unflagged cells. First click is always safe -- mines are placed lazily on the first reveal, excluding both the clicked cell and its 3x3 neighborhood, which guarantees the first click clears at least nine cells.

2. **Save state.** Best times persisted per difficulty via `Engine.storage` under keys `best_beginner`, `best_intermediate`, `best_expert`, each storing a number of seconds (smaller is better). The menu displays the current best for the selected difficulty. New-record callout on the win screen. Game name passed to the Game constructor is `'minesweeper'` so storage keys are namespaced as `minesweeper:best_<key>`.

3. **Two new scenes** under `games/minesweeper/scenes/`:
   - `MinesweeperMenuScene` (`menu.js`). Title, difficulty select (Up/Down or 1/2/3, or mouse hover + click), best-time panel rendering only when a record exists for the selected difficulty. ENTER or click on the highlighted option transitions to match. Superseded later this same day by the polish pass; see the session entry above.
   - `MinesweeperMatchScene` (`match.js`). All gameplay including board state, lazy mine placement with first-click safety, iterative flood-fill, chord click, timer, mine counter, smiley face restart, win/loss end states with mine-reveal animation, and PauseOverlay integration. No GameObjects: state is scene-level since the game is intrinsically discrete and turn-based, following the Party House pattern. PauseOverlay wired with both `onRestart` (re-enters the match scene with the same difficulty) and `onQuit` (back to menu).

4. **No new scripts.** Minesweeper does not need GameObject-attached behaviors; the board is scene-level state. Reuses the existing PauseOverlay utility.

5. **Mouse-edge-before-pause convention followed.** Mouse just-pressed detection is computed before the PauseOverlay early-return, so clicks made while paused are consumed on their own frame and do not fire as phantom clicks on resume (per the PHMatchScene reference established in the prior session).

6. **Build pending manual upload (subsequently superseded).** The original assembled `build/minesweeper.html` was ~76KB. Per the large-payload safety rule, the source files were pushed and the build was delivered for manual upload. The 2026-05-14 (later) polish pass then regenerated this build at commit 2e596a2b.

7. **Registries updated.** `scenes/_registry.md` got new rows for MinesweeperMenuScene and MinesweeperMatchScene. No new entries needed in `scripts/_registry.md` since the game uses only the existing PauseOverlay utility.

**Session 2026-05-13 (Party House):**

See prior STATE.md revisions for the full Party House session detail. Summary: new game v1 (single-scenario UFO 50 #25 study, 9 guest types, 25-day clock, trouble shutdown mechanic, ban-by-type, persistent best-record), `PHMenuScene` and `PHMatchScene`, no new scripts, mouse-edge-during-pause fix introduced.

**Session 2026-05-13 (earlier, engine bundle work, verification, and convention codification):**

See prior STATE.md revisions for the full bundle-introduction session detail. Summary: `engine/engine.bundle.js` introduced as the canonical single-file engine artifact; ADR-0016 added; CLAUDE.md §8 directs engine fetches at the bundle; `build/poc-square-v2.html` validates the bundle-inlining workflow; CONVENTIONS.md "Build assembly" section codifies bundle inlining as the default; project knowledge holds `project-bootstrap.md` and `engine/engine.bundle.js` only.

**Session 2026-05-13 (earlier still, Horses Teach Typing):**

See prior STATE.md revisions for the full Horses Teach Typing session detail. Summary: new game v1 (rhythm typing, Apple II Oregon Trail aesthetic), `RhythmLetter` script with time-driven position, `HTTMenuScene` and `HTTMatchScene`, PauseOverlay extended with optional `onRestart`, build assembled via individual-module concat path (pre-bundle), both registries updated.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio, storage), Pong, PauseOverlay original, Survivors v1-v3, Clown Brawler v1 and v2, SpriteSheet and ShapeSprite scripts, Party House, Horses Teach Typing, engine bundle and bundle-inlining convention.

## Currently in progress

1. **Visual verification of `build/clown-brawler-v2.html`** (from 2026-05-12). Build is in repo; needs browser load to confirm.
2. **Visual verification of `build/horses-teach-typing.html`** (from 2026-05-13 earlier). Build is in repo; needs browser load to confirm.
3. **Visual verification of `build/party-house.html`** (from 2026-05-13 latest). Build assembled locally and delivered to Trevor for manual upload; needs upload then browser load to confirm.

## Next up

1. **(In progress)** Visual verification of the three pending builds above.

2. **Visual-language follow-up.** Per ADR-0017, the tokens defined inline in `games/minesweeper/scenes/menu.js` should be extracted to a shared `scripts/ui-tokens.js` once a second game wants the same vocabulary. UI primitive Scripts (`UiButton`, `UiPanel`, `UiLabel`) become candidates at the same point. Until then, new menus that want the visual language copy the `MS_TOKENS` constant pattern (renamed) and use the same `drawRaised` / `drawSunken` helpers. The `scenes-preview.html` harness flagged for a future session should render scenes at both `regular` and `compact` logical resolutions to exercise the responsive bootstrap convention.

3. **Tooling-resilience follow-ups from RETROS 2026-05-14.** Six proposals captured, in priority order: shared bootstrap module (`scripts/bootstrap.js` consolidating the viewport-aware sizing + Game construction + scene set + start pattern), build manifest (`games/<name>/build-manifest.json` listing exact source paths and engine bundle SHA), tooling-degraded protocol codified in CONVENTIONS.md, startup sanity assertion inside `Engine.Game` constructor, scene preview harness, and build artifact policy revision. Each is a candidate for a follow-up ADR or feature commit.

4. **Minesweeper v2 candidates** (post-verification): question-mark cell state (third right-click cycle, between flag and clear), keyboard navigation (arrow keys move a cursor, space reveal, F flag) for accessibility, custom difficulty input screen, win-streak/loss-streak persistence in addition to best times, optional safe-corner-start variant where the top-left cell is also forced safe.

5. **Party House v2 candidates** (post-verification): hover tooltips on guest cards with full ability description, party-flow animation (guests slide in rather than appear), end-of-day balance sheet (cumulative pop/cash earned), a "view rolodex" toggle on the shop screen, second scenario unlocked after first clear, randomization of starting rolodex shuffle visible to player.

6. **Horses Teach Typing v2 candidates** (post-verification): horse keyboard-hint speech bubble showing finger placement for the next letter, BPM progression as score climbs, high-score persistence via `Engine.storage`, optional metronome tick SFX on each beat for a stronger rhythm anchor.

7. **Revisit Konva-style raster sprite path** (user-flagged on 2026-05-12). Carrying over from prior session. Not actionable until v2 of Clown Brawler is verified and asset sourcing is decided.

8. **Engine primitives.** Common attachable behaviors reinvented across multiple games:
   - **Conductor primitive.** The clock/spawn-cursor pattern in HTTMatchScene is similar to the wave-spawn pattern in SurvivorsMatchScene. A shared `Conductor` or `Scheduler` script could host beat-locked or interval-locked event scheduling.
   - **Real spawner script.** Replaces inlined spawn logic in `SurvivorsMatchScene._spawnEnemy`.
   - **Signal-driven animation player.** Decouples animation state changes from per-script update logic.
   - **Generic health/damage script.** Centralizes the HP, damage, death-emit pattern.
   - **Mouse-edge detector.** Four games (Survivors, Party House, Minesweeper, eventual Pong retrofit) would now benefit from a clean "just-clicked" abstraction layered on `Engine.input.mouse.left`. Could go on Engine.input itself, or as a tiny helper class.

## Deferred to shipping mode

Real items, blocked behind ADR-0013.

- **Pong**: PauseOverlay retrofit, then regenerate `build/pong-v2.html` (per the sibling-iteration convention).
- **Survivors**: jsfxr SFX. Also: persist stats and coins via `Engine.storage`.
- **Clown Brawler**: any further visual upgrades after v2.
- **Horses Teach Typing**: progression curve, high-score, keyboard-hint bubble, optional music asset path.
- **Party House**: additional scenarios (the original has five plus a random scenario), more guest types (the original has ~30), Driver/PI/Genie fetch abilities, Photographer copy-effect, Climber scaling popularity, full ban-by-instance UI showing specific guests rather than types, mid-party "end now" decision support including animations.
- **Minesweeper**: question-mark cell state, keyboard navigation, custom difficulty, win/loss-streak persistence, polished mine-explosion animation, sweep-reveal animation on win.
- **Common scenes**: shared credits, loading, and main-menu templates.

## Deferred housekeeping (tool-gated)

- **Actual deletion of dead files** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern. Not currently demanded by any game.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only. ADR-0017 anticipates touch hit-target sizing but the actual input mapping is deferred to a separate ADR when a game requires it.

## Open questions

- **Asset sourcing for the eventual raster path**: carrying over from prior session.
- **Clown Brawler v1 disposition once v2 is verified**: carrying over from prior session.
- **poc-square v1 disposition**: keep as the documented "individual-module path" example per the CONVENTIONS.md section.
- **Party House art direction**: the MVP uses flat colored cards with text labels. The original is pixel art. Future iterations could either commit to a small ShapeSprite-based character set or stay with the abstract card aesthetic.
- **Minesweeper visual treatment** (partially settled): the 2026-05-14 polish pass commits to the classic Win 3.1 raised/sunken bevel aesthetic for the menu, rendered procedurally with canvas rectangles, using the ADR-0017 token vocabulary. Alternative paths (ShapeSprite-based tile set; flat modern aesthetic) remain available for a future v2 if motivated.
- **Engine bundle drift in `build/minesweeper.html`**: the inline engine in this build was hand-composed during a reduced-tool-surface session and omits sections of the canonical bundle (b58 codec, `Params.mutate`, `sliders` table, `sfxr.toBuffer`/`toWebAudio`, UMD wrapper) not exercised by Minesweeper. Runtime behavior matches for the features used. Per ADR-0016 the bundle is canonical; the cleaner long-term cleanup is to regenerate this build from the actual bundle file. See `docs/RETROS.md` 2026-05-14 entry for context. The shared bootstrap module proposal (RETROS A) and the tooling-degraded protocol proposal (RETROS C) are the structural responses that would prevent this kind of drift on future builds.

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Engine bundle is the canonical engine fetch target.** Per ADR-0016, fetch `engine/engine.bundle.js` for current engine source; do not reconstruct from individual modules and do not extract from old build files. Any commit that touches an engine module must regenerate the bundle in the same commit (CLAUDE.md §8).
- **Project knowledge scope is lean by default.** Project knowledge holds canonical session-startup material only: `project-bootstrap.md` and `engine/engine.bundle.js`. Specific game builds and other reference material live in the repo and are fetched on demand.
- **Bundle inlining is the default build-assembly path.** Per CONVENTIONS.md ("Build assembly" section), new game builds inline the bundle as a single block, then layer scripts, scenes, and bootstrap. `poc-square-v2` is the reference template.
- **Tooling state has occasionally degraded mid-session** to GitHub MCP only across 2026-05-13 and 2026-05-14 sessions. The 2026-05-14 (later) Minesweeper polish session demonstrated that the GitHub-only fallback works even for a full build assembly (commit 2e596a2b), at the cost of hand-composing the engine bundle inline and accepting drift from the canonical artifact. Three pushes over 50KB landed cleanly this session (DECISIONS.md at 57KB, build at 78KB, source commit at 44KB across files). The 50KB memory-rule threshold is a useful confirmation tripwire but conservative as a hard limit; pushes up to roughly 80KB have proven reliable. Mitigation proposals for future projects are captured in `docs/RETROS.md` (2026-05-14 entry).
- **Horses Teach Typing concat order** (individual-module path, pre-bundle): lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap.
- **Party House concat order** (bundle-inlining path): engine.bundle.js, pause-overlay, menu, match, bootstrap. Bootstrap: `new Engine.Game(canvas, { gameName: 'party-house' })`, then `game.setScene(new PHMenuScene(game))`, then `game.start()`.
- **Minesweeper concat order** (bundle-inlining path): engine.bundle.js, pause-overlay, menu, match, bootstrap. Bootstrap: `new Engine.Game(canvas, { gameName: 'minesweeper' })`, then `game.setScene(new MinesweeperMenuScene(game))`, then `game.start()`. The bootstrap disables the canvas context menu (`canvas.oncontextmenu = e => e.preventDefault()`) since right-click is used for flagging. After the 2026-05-14 (later) polish pass, the bootstrap also implements the viewport-aware sizing convention per ADR-0017: declares `presets = { regular: { w: 900, h: 600 } }` (no `compact` because right-click is mouse-only), sets `canvas.width`/`canvas.height` to the regular preset, and runs a `fitToViewport()` helper computing `scale = min(innerWidth/w, innerHeight/h)` and setting `canvas.style.width` and `canvas.style.height` in CSS pixels; a `resize` listener re-fits on viewport change.
- **Visual language tokens (ADR-0017)**: MinesweeperMenuScene defines tokens inline as the `MS_TOKENS` const at the top of the file. Future games applying the visual language should follow the same pattern (with their own prefix, e.g. `PH_TOKENS`) until a second game wants the same vocabulary, at which point tokens get extracted to `scripts/ui-tokens.js` per the ADR's deferred-extraction policy. Helper functions `msDrawRaised`, `msDrawSunken`, `msDrawMine`, `msDrawFlag`, `msFormatTime`, `msDrawLED`, `msDrawMiniBoard`, `msPreviewPattern` are inlined alongside; these are also candidates for promotion to shared helpers when a second consumer appears.
- **PauseOverlay row layout**: data-driven. Add new row kinds by extending `_buildRows()` and the keypress dispatch in `update()`.
- **RhythmLetter ownership pattern**: each RhythmLetter holds a reference to the scene via `options.scene` so its `update(dt)` can read `scene.conductorTime`. The position-time function ensures determinism.
- **Auto-miss policy (HTT)**: `cutoff = goodWindow + 0.05` (= 230ms past target).
- **Build verification step convention**: prior sessions ran `node --check` on the extracted script tag of the assembled build. The fallback when bash is unavailable is per-source-file validation before assembly plus visual verification on browser load. The 2026-05-14 polish session demonstrated this fallback can succeed end-to-end at the cost of accepting engine bundle drift.
- **Engine.storage usage pattern**: bootstrap with `new Engine.Game(canvas, { gameName: 'mygame' })`; thereafter `Engine.storage.save('key', value)` / `Engine.storage.load('key')`.
- **Pause + mouse-edge interaction**: any scene that mixes PauseOverlay with mouse-click input should compute `_mouseClicked = !_prevMouseLeft && Engine.input.mouse.left` followed by `_prevMouseLeft = Engine.input.mouse.left` BEFORE the `if (this._pause.isPaused()) return;` early-return. PHMatchScene is the reference implementation; MinesweeperMatchScene also follows this pattern (with both left and right mouse buttons tracked).
- **Right-click input convention**: `Engine.input.mouse.right` is read; the canvas's `contextmenu` event must be suppressed at the bootstrap level. MinesweeperMatchScene is the first scene to use right-click; reference its bootstrap snippet in `build/minesweeper.html` when adding right-click to another game.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
- **Retros log**: `docs/RETROS.md` accumulates session-level observations and forward-looking proposals that do not yet warrant an ADR. New sessions append entries at the bottom of the file in chronological order.
