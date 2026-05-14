# State

Last updated: 2026-05-14

## Current status

Six games in the repo: Pong, Survivors v3, Clown Brawler (v1 in repo; v2 committed, visual verification pending), Horses Teach Typing v1 (sources and build committed, visual verification pending), Party House (sources committed, build pending manual upload, visual verification pending), and Minesweeper (sources committed, build pending manual upload, visual verification pending). Plus `poc-square` as an engine smoke test, with a v2 sibling build (`build/poc-square-v2.html`) verified to behave identically to v1, validating the engine-bundle workflow as a drop-in for individual-module concatenation. The engine, audio service, collision contract, pause utility (now with optional onRestart in addition to onQuit), persistent storage, procedural Shape DSL sprite primitive (`ShapeSprite`), canonical engine bundle (`engine/engine.bundle.js`, per ADR-0016), and bundle-inlining build-assembly convention (`docs/CONVENTIONS.md`, validated against poc-square v1/v2) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`.

## What was done in the most recent session

**Session 2026-05-14 (latest, Minesweeper):**

1. **New game: Minesweeper.** Classic Win 3.1 Minesweeper with three difficulties: Beginner (9x9, 10 mines), Intermediate (16x16, 40 mines), Expert (30x16, 99 mines). Cell size scales per difficulty (28px Beginner, 26px Intermediate, 18px Expert) so all three boards fit comfortably inside the 900x600 canvas. Standard rules: left click reveals, right click flags, chord click on a satisfied number reveals adjacent unflagged cells. First click is always safe -- mines are placed lazily on the first reveal, excluding both the clicked cell and its 3x3 neighborhood, which guarantees the first click clears at least nine cells.

2. **Save state.** Best times persisted per difficulty via `Engine.storage` under keys `best_beginner`, `best_intermediate`, `best_expert`, each storing a number of seconds (smaller is better). The menu displays the current best for the selected difficulty. New-record callout on the win screen. Game name passed to the Game constructor is `'minesweeper'` so storage keys are namespaced as `minesweeper:best_<key>`.

3. **Two new scenes** under `games/minesweeper/scenes/`:
   - `MinesweeperMenuScene` (`menu.js`). Title, difficulty select (Up/Down or 1/2/3, or mouse hover + click), best-time panel rendering only when a record exists for the selected difficulty. ENTER or click on the highlighted option transitions to match.
   - `MinesweeperMatchScene` (`match.js`). All gameplay including board state, lazy mine placement with first-click safety, iterative flood-fill, chord click, timer, mine counter, smiley face restart, win/loss end states with mine-reveal animation, and PauseOverlay integration. No GameObjects: state is scene-level since the game is intrinsically discrete and turn-based, following the Party House pattern. PauseOverlay wired with both `onRestart` (re-enters the match scene with the same difficulty) and `onQuit` (back to menu).

4. **No new scripts.** Minesweeper does not need GameObject-attached behaviors; the board is scene-level state. Reuses the existing PauseOverlay utility.

5. **Mouse-edge-before-pause convention followed.** Mouse just-pressed detection is computed before the PauseOverlay early-return, so clicks made while paused are consumed on their own frame and do not fire as phantom clicks on resume (per the PHMatchScene reference established in the prior session).

6. **Build pending manual upload.** The assembled `build/minesweeper.html` is ~76KB (engine bundle 46KB + pause-overlay 5KB + menu 6KB + match 18KB + bootstrap/HTML wrapper ~1KB). Per the large-payload safety rule, this exceeds the comfortable single-file API push threshold, so the source files were pushed and the build is delivered to Trevor for manual upload.

7. **Registries updated.** `scenes/_registry.md` has new rows for MinesweeperMenuScene and MinesweeperMatchScene. No new entries needed in `scripts/_registry.md` since the game uses only the existing PauseOverlay utility.

**Session 2026-05-13 (Party House):**

1. **New game: Party House.** Single-scenario MVP study of UFO 50 #25 ("Party House" -- note the original title is *Party House*, not the colloquial transposition "House Party"). Deckbuilder where guests are cards in a rolodex; each day you throw a party, guests enter one at a time, generate popularity/cash/trouble, and the goal is four star guests at one successful party within 25 days. Trouble cap of 3 triggers a cop shutdown (no rewards). After a shutdown the player picks one guest type to ban from the next party (one rolodex instance is skipped for one party then returns). Nine guest types in this scope: three free starters (Old Friend, Wild Buddy, Rich Pal) and six shop guests (Cute Dog and Hippie for trouble removal, Auctioneer for Old-Friend-synergy cash, Rock Star for high pop with trouble, Celebrity and Dragon as the two star guests). Five starting house slots, expansion cost starts at $2 and scales by +1 per expansion to a max of $12.

2. **Save state.** Persistent high-score record via `Engine.storage` under key `'best'` with shape `{ fewestDays: number|null, totalWins: number }`. `fewestDays` is updated only when the new run clears in fewer days than the prior best (or there is no prior best). `totalWins` increments on every successful clear. Displayed on the menu scene; new-record callout on the win screen. Game name passed to the Game constructor is `'party-house'` so the storage key is namespaced as `party-house:best`.

3. **Two new scenes** under `games/party-house/scenes/`:
   - `PHMenuScene` (`menu.js`). Title with pictographic house silhouette, flickering window light, animated music notes, drifting guest silhouettes at the bottom. Best-record panel renders only when a record exists.
   - `PHMatchScene` (`match.js`). All gameplay lives here including the phase state machine, party simulation, shop UI, ban screen, win/lose end overlays, and PauseOverlay integration. No GameObjects: rendering is direct canvas calls per phase, since the game state is intrinsically discrete and turn-based. PauseOverlay wired with both `onRestart` (re-enters the match scene) and `onQuit` (back to menu).

4. **No new scripts.** Party House does not need GameObject-attached behaviors -- the game state is scene-level. Compare to action games (Survivors, Clown Brawler) where many entities run per-frame logic.

5. **Mouse-edge fix during pause.** Mouse "just-pressed" detection is now recomputed every frame including during pause, so a click made while paused is consumed on its own frame rather than firing as a phantom click on resume. This pattern should propagate to any future scene that mixes mouse input with PauseOverlay (Pong's eventual PauseOverlay retrofit, etc.).

6. **Build pending manual upload.** The assembled `build/party-house.html` is ~85KB (engine bundle 46KB + pause-overlay 5KB + menu 5KB + match 30KB + bootstrap/HTML wrapper ~1KB). Per the large-payload safety rule, this exceeds the single-file API push threshold, so the source files were pushed and the build is delivered to Trevor for manual upload.

7. **Registries updated.** `scenes/_registry.md` has new rows for PHMenuScene and PHMatchScene. No new entries needed in `scripts/_registry.md` since the game uses only the existing PauseOverlay utility.

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
4. **Visual verification of `build/minesweeper.html`** (from 2026-05-14). Build assembled locally and delivered to Trevor for manual upload; needs upload then browser load to confirm.

## Next up

1. **(In progress)** Visual verification of the four pending builds above.

2. **Minesweeper v2 candidates** (post-verification): question-mark cell state (third right-click cycle, between flag and clear), keyboard navigation (arrow keys move a cursor, space reveal, F flag) for accessibility, custom difficulty input screen, win-streak/loss-streak persistence in addition to best times, optional safe-corner-start variant where the top-left cell is also forced safe.

3. **Party House v2 candidates** (post-verification): hover tooltips on guest cards with full ability description, party-flow animation (guests slide in rather than appear), end-of-day balance sheet (cumulative pop/cash earned), a "view rolodex" toggle on the shop screen, second scenario unlocked after first clear, randomization of starting rolodex shuffle visible to player.

4. **Horses Teach Typing v2 candidates** (post-verification): horse keyboard-hint speech bubble showing finger placement for the next letter, BPM progression as score climbs, high-score persistence via `Engine.storage`, optional metronome tick SFX on each beat for a stronger rhythm anchor.

5. **Revisit Konva-style raster sprite path** (user-flagged on 2026-05-12). Carrying over from prior session. Not actionable until v2 of Clown Brawler is verified and asset sourcing is decided.

6. **Engine primitives.** Common attachable behaviors reinvented across multiple games:
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
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only.

## Open questions

- **Asset sourcing for the eventual raster path**: carrying over from prior session.
- **Clown Brawler v1 disposition once v2 is verified**: carrying over from prior session.
- **poc-square v1 disposition**: keep as the documented "individual-module path" example per the CONVENTIONS.md section.
- **Party House art direction**: the MVP uses flat colored cards with text labels. The original is pixel art. Future iterations could either commit to a small ShapeSprite-based character set or stay with the abstract card aesthetic.
- **Minesweeper visual treatment**: the v1 uses the classic Win 3.1 raised/sunken bevel aesthetic rendered procedurally with canvas rectangles. Alternative paths include a ShapeSprite-based tile set (consistent with the engine's procedural-sprite direction) or a flat modern aesthetic in the style of Google's web Minesweeper. The v1 was the safest choice for an MVP; v2 could explore either.

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Engine bundle is the canonical engine fetch target.** Per ADR-0016, fetch `engine/engine.bundle.js` for current engine source; do not reconstruct from individual modules and do not extract from old build files. Any commit that touches an engine module must regenerate the bundle in the same commit (CLAUDE.md §8).
- **Project knowledge scope is lean by default.** Project knowledge holds canonical session-startup material only: `project-bootstrap.md` and `engine/engine.bundle.js`. Specific game builds and other reference material live in the repo and are fetched on demand.
- **Bundle inlining is the default build-assembly path.** Per CONVENTIONS.md ("Build assembly" section), new game builds inline the bundle as a single block, then layer scripts, scenes, and bootstrap. `poc-square-v2` is the reference template.
- **Tooling state on 2026-05-13**: Mid-session the available tool surface dropped to GitHub MCP only (no bash, no local file creation, no present-files). Several builds had to be assembled by inlining all source content into a single `create_or_update_file` payload rather than the usual local concat + manual upload workflow. The memory rule about checking in for very large payloads (>30KB single file, >50KB total) was added in response.
- **Horses Teach Typing concat order** (individual-module path, pre-bundle): lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap.
- **Party House concat order** (bundle-inlining path): engine.bundle.js, pause-overlay, menu, match, bootstrap. Bootstrap: `new Engine.Game(canvas, { gameName: 'party-house' })`, then `game.setScene(new PHMenuScene(game))`, then `game.start()`.
- **Minesweeper concat order** (bundle-inlining path): engine.bundle.js, pause-overlay, menu, match, bootstrap. Bootstrap: `new Engine.Game(canvas, { gameName: 'minesweeper' })`, then `game.setScene(new MinesweeperMenuScene(game))`, then `game.start()`. The bootstrap also disables the canvas context menu (`canvas.oncontextmenu = e => e.preventDefault()`) since right-click is used for flagging.
- **PauseOverlay row layout**: data-driven. Add new row kinds by extending `_buildRows()` and the keypress dispatch in `update()`.
- **RhythmLetter ownership pattern**: each RhythmLetter holds a reference to the scene via `options.scene` so its `update(dt)` can read `scene.conductorTime`. The position-time function ensures determinism.
- **Auto-miss policy (HTT)**: `cutoff = goodWindow + 0.05` (= 230ms past target).
- **Build verification step convention**: prior sessions ran `node --check` on the extracted script tag of the assembled build. The fallback when bash is unavailable is per-source-file validation before assembly plus visual verification on browser load.
- **Engine.storage usage pattern**: bootstrap with `new Engine.Game(canvas, { gameName: 'mygame' })`; thereafter `Engine.storage.save('key', value)` / `Engine.storage.load('key')`.
- **Pause + mouse-edge interaction**: any scene that mixes PauseOverlay with mouse-click input should compute `_mouseClicked = !_prevMouseLeft && Engine.input.mouse.left` followed by `_prevMouseLeft = Engine.input.mouse.left` BEFORE the `if (this._pause.isPaused()) return;` early-return. PHMatchScene is the reference implementation; MinesweeperMatchScene also follows this pattern (with both left and right mouse buttons tracked).
- **Right-click input convention**: `Engine.input.mouse.right` is read; the canvas's `contextmenu` event must be suppressed at the bootstrap level. MinesweeperMatchScene is the first scene to use right-click; reference its bootstrap snippet in `build/minesweeper.html` when adding right-click to another game.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
