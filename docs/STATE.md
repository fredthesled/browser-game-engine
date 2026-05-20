# State

Last updated: 2026-05-20

## Current status

Six games in the repo: Pong, Survivors v3, Clown Brawler v2 (verified 2026-05-20), Horses Teach Typing v1 (verified 2026-05-20), Party House (verified 2026-05-20), and Minesweeper (sources committed including a polished menu pass per ADR-0017, build assembled and verified at commit 2e596a2b). Plus `poc-square` as an engine smoke test, with a v2 sibling build (`build/poc-square-v2.html`) verified to behave identically to v1, validating the engine-bundle workflow as a drop-in for individual-module concatenation. The engine, audio service, collision contract, pause utility (now with optional onRestart in addition to onQuit), persistent storage, procedural Shape DSL sprite primitive (`ShapeSprite`), canonical engine bundle (`engine/engine.bundle.js`, per ADR-0016), bundle-inlining build-assembly convention (`docs/CONVENTIONS.md`, validated against poc-square v1/v2), visual language plus logical-canvas convention (ADR-0017), narrative module (`Engine.Narrative`, a thin inkjs wrapper, per ADR-0018), and shared game bootstrap helper (`bootstrapGame` in `scripts/bootstrap.js`) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`. A session-retros log is now kept at `docs/RETROS.md` for observations and forward-looking proposals that do not yet warrant an ADR.

## What was done in the most recent session

**Session 2026-05-20 (Drift foundation cleanup, shared bootstrap module):**

1. **inkjs library manual upload completed.** `engine/lib/inkjs.js` (248,826 bytes, inkjs 2.4.0, MIT) landed in the repo via GitHub web UI. `Engine.Narrative` is now fully runnable; the wrapper's runtime dependency on the `inkjs` global is satisfied when the library is loaded before the engine bundle in a build.

2. **Visual verification completed** for the three previously pending builds: `build/clown-brawler-v2.html`, `build/horses-teach-typing.html`, `build/party-house.html`. All three confirmed working on browser load. The "Currently in progress" list is now fully cleared.

3. **Project knowledge refreshed.** `engine.bundle.js` mirror in Claude project knowledge updated to the 11-module 48,931-byte canonical version (blob SHA `91d7adf9861156a4149c6e23564737a973038212`). Fresh sessions now have the post-narrative engine source in context at startup with zero fetches required, per ADR-0016's hybrid pattern.

4. **Shared bootstrap module added** (commit 531082367). `scripts/bootstrap.js` exposes `bootstrapGame(options)` as a plain utility function (not a Script subclass, same pattern as `PauseOverlay`). Consolidates the boilerplate that every build's `<script>` tail currently repeats: viewport-aware canvas sizing per ADR-0017 with preset selection between regular and optional compact, fit-to-viewport CSS scaling with resize listener, touch capability detection, optional context-menu suppression, `Engine.Game` construction with optional `gameName`, initial scene set via factory, game start. Returns `{ game, preset, presetName, isTouch }`. Throws clear errors for missing canvas, missing `presets.regular`, or non-function `initialScene`. Adoption is per-build; existing builds continue to work with their inline bootstrap IIFEs and migrate naturally as each is regenerated. Drift v1 is the planned first build to adopt the helper from the start. `scripts/_registry.md` updated with the new row and a non-Script-entries paragraph parallel to the existing PauseOverlay one. Resolves RETROS 2026-05-14 item A.

5. **Minesweeper bundle drift cleanup deferred.** The hand-condensed inline engine in `build/minesweeper.html` remains. Pre-flight measurement showed a regen with the canonical 48,931-byte bundle would land the build at approximately 82-84KB, marginally over the documented ~80KB single-push reliability ceiling. The drift is cosmetic per STATE.md ("Runtime behavior matches for the features used"); continued deferral costs nothing functionally. The cleanup will land naturally when Minesweeper is next regenerated (e.g., for a future v2 polish pass) or via a dedicated tooling-improved session.

**Session 2026-05-19 (Drift engine foundation, narrative module):**

1. **ADR-0018 optional vendored library pattern; narrative via inkjs** (commit 15e6880). New ADR appended to `docs/DECISIONS.md`. Establishes the pattern of vendoring libraries under `engine/lib/` while explicitly excluding them from the engine bundle when their size or game-specificity makes inclusion costly. inkjs (2.4.0, MIT, ~249 KB) is the first such library, added in support of the upcoming Drift game (FTL-style space exploration with branching encounters). Four distribution options were considered (bundle inclusion, CDN, pre-compile to JSON, per-game include); option 4 (per-game include of `ink-full.js` alongside the engine bundle, with `engine/narrative.js` as a thin wrapper inside the bundle) was chosen. The pattern is reusable for future optional libraries.

2. **`engine/narrative.js` added** (commit 391bd86, blob SHA `daa78ed678039d5981e3968661c3cbfa7c24111a`). Thin (~100-line) wrapper around `inkjs.Story` exposing a clean JS-side surface: `constructor(source, {compiled})`, `continue()`, `getChoices()`, `choose(index)`, `getVar(name)`, `setVar(name, value)`, `bindExternal(name, fn)`, `observe(name, fn)`, `goTo(path)`, `saveState()`, `loadState(json)`, `hasEnded`, and `story` (escape hatch). The constructor throws a clear error if `inkjs` is not loaded, pointing at ADR-0018.

3. **Engine bundle regenerated** (commit 1244595, new bundle blob SHA `91d7adf9861156a4149c6e23564737a973038212`, 48,931 bytes, 11 modules). `engine/narrative.js` is included at position 11. `engine/lib/inkjs.js` is NOT included; the header SHA table reflects this. Bundle generation date updated to 2026-05-19. Note: the source commit (391bd86) initially omitted the bundle from its `files` array; the follow-up commit (1244595) restored same-state compliance with CLAUDE.md §8. The intermediate state was briefly inconsistent; final state is correct. Lesson captured in "Notes for next session" below.

4. **CLAUDE.md §8 clarified** (commit 959b5db, new CLAUDE.md blob SHA `cb5f6b210309dc8e7854db148b929c2686aa1554`). The "Engine source fetch" bullet now distinguishes bundled engine modules (regeneration required on change) from optional vendored libraries explicitly excluded from the bundle (no regeneration required on update). References ADR-0016 and ADR-0018.

5. **Documentation updates** (commit f6eeca1). `docs/resources/libraries.md` gained a new top-level "Narrative scripting" section with the inkjs entry. `docs/ARCHITECTURE.md` updated: module count nine, new Narrative row in the overview table, new Narrative class-contract subsection, file layout summary updated, build concatenation order updated to include `engine/narrative.js` at position 11 and to document the per-game `engine/lib/inkjs.js` inclusion for narrative games.

6. **inkjs library upload pending.** `engine/lib/inkjs.js` (248,826 bytes) was prepared from the npm registry tarball (`inkjs@2.4.0`, `package/dist/ink-full.js`, MIT) and presented for manual upload, consistent with the build/clown-brawler.html workflow for files exceeding the comfortable single-file MCP push threshold. (Subsequently completed 2026-05-20; see above.)

**Session 2026-05-14 (later, visual language and Minesweeper menu polish):**

1. **ADR-0017 visual language and responsive layout** (commit f77713d3). New ADR appended to `docs/DECISIONS.md`. Establishes a project-wide visual language via design tokens (spacing, typography, hit targets, and color roles), a logical-canvas convention for viewport-aware bootstrap (each game declares a `regular` landscape preset and optionally a `compact` portrait preset; the bootstrap picks based on viewport aspect and CSS-scales to fit), touch capability detection (without yet implementing touch input mapping), and per-game theming via token overrides. UI primitive Scripts (button, panel, label) deferred until a second game wants the same vocabulary. The Game constructor is unchanged; the responsive convention lives in the per-game bootstrap snippet, not in engine code.

2. **ARCHITECTURE.md updated** (commit 625e6a0e). New "Logical canvas and viewport bootstrap" section documenting the convention and reference bootstrap snippet. The Input class contract section gained a paragraph noting that `getBoundingClientRect()` maps physical click positions to logical canvas pixels, so CSS-scaled canvases report correct mouse coordinates without per-scene scale correction. Build concatenation order step 13 now points to the new section. Open questions list now includes "Touch input mapping" as an explicit deferred item.

3. **Minesweeper menu polished as first proving ground** (commit 2c46b94b). New `games/minesweeper/scenes/menu.js` replaces the prior text-based difficulty list with three preview cards in a row. Each card shows a mini board render at the correct aspect ratio per difficulty (9x9 with 16px cells for Beginner, 16x16 with 9px cells for Intermediate, 30x16 with 6px cells for Expert), an inset sunken title plate, dimensions plus mine count, and a LED-style best-time readout when one is stored. Raised bevel for unselected cards, sunken bevel for the selected card, matching the Win 3.1 vocabulary used in-game. Tokens are defined inline at the top of the menu file (as the `MS_TOKENS` const) per ADR-0017's deferred-extraction policy. Input: arrow keys, 1/2/3, or mouse hover to select; Enter/Space/click to confirm.

4. **`scenes/_registry.md` updated** (commit 2c46b94b). MinesweeperMenuScene row rewritten to describe the preview-card layout and to reference ADR-0017 as the source of the visual language pattern.

5. **Build re-assembled and verified** (commit 2e596a2b). `build/minesweeper.html` regenerated to include the polished menu and the new viewport-aware bootstrap. Eight visual checks passed on user-side browser load: menu loads, three preview cards visible, mouse hover changes selection, arrow keys and 1/2/3 change selection, Enter and click start a match, audio plays on hover and select, match gameplay intact, window resize keeps canvas centered and aspect-correct. Caveat tracked in `docs/RETROS.md` (2026-05-14 entry): the inline engine in this build is a hand-condensed reconstruction rather than a verbatim copy of `engine/engine.bundle.js` because assembly happened under reduced tool surface; regeneration from the canonical bundle in a tooled session is the cleaner cleanup. (2026-05-20 deferral confirmed; see Open questions section.)

6. **Retros log introduced.** New `docs/RETROS.md` captures session-level observations and forward-looking proposals (shared bootstrap module, build manifest, tooling-degraded protocol, startup sanity assertion, scene preview harness, build artifact policy revision). These are candidates for future ADRs but do not yet warrant one individually.

**Session 2026-05-14 (earlier, Minesweeper):**

See prior STATE.md revisions for the full Minesweeper session detail. Summary: new game v1 (classic Win 3.1, three difficulties with lazy mine placement and first-click safety), `MinesweeperMenuScene` and `MinesweeperMatchScene`, best-times persistence via `Engine.storage`, no new scripts, right-click flag with `contextmenu` suppression.

**Session 2026-05-13 (Party House):**

See prior STATE.md revisions for the full Party House session detail. Summary: new game v1 (single-scenario UFO 50 #25 study, 9 guest types, 25-day clock, trouble shutdown mechanic, ban-by-type, persistent best-record), `PHMenuScene` and `PHMatchScene`, no new scripts, mouse-edge-during-pause fix introduced.

**Session 2026-05-13 (earlier, engine bundle work, verification, and convention codification):**

See prior STATE.md revisions for the full bundle-introduction session detail. Summary: `engine/engine.bundle.js` introduced as the canonical single-file engine artifact; ADR-0016 added; CLAUDE.md §8 directs engine fetches at the bundle; `build/poc-square-v2.html` validates the bundle-inlining workflow; CONVENTIONS.md "Build assembly" section codifies bundle inlining as the default; project knowledge holds `project-bootstrap.md` and `engine/engine.bundle.js` only.

**Session 2026-05-13 (earlier still, Horses Teach Typing):**

See prior STATE.md revisions for the full Horses Teach Typing session detail. Summary: new game v1 (rhythm typing, Apple II Oregon Trail aesthetic), `RhythmLetter` script with time-driven position, `HTTMenuScene` and `HTTMatchScene`, PauseOverlay extended with optional `onRestart`, build assembled via individual-module concat path (pre-bundle), both registries updated.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio, storage, narrative), Pong, PauseOverlay original, Survivors v1-v3, Clown Brawler v1 and v2, SpriteSheet and ShapeSprite scripts, Party House, Horses Teach Typing, Minesweeper, engine bundle and bundle-inlining convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, `bootstrapGame` shared bootstrap helper.

## Currently in progress

(None. All Session 2026-05-19 follow-ups resolved in Session 2026-05-20: inkjs upload landed, three pending build verifications complete, project knowledge refreshed.)

## Next up

1. **Drift v1 implementation.** FTL-style space exploration prototype with an idle-autopilot mechanic: the ship travels between sectors automatically while the player manages crew (colored circles on a grid-based ship with helm, engines, shields, weapons rooms) and resolves inkjs-driven encounters at each stop. First consumer of `Engine.Narrative` and the new optional-library pattern. Also the planned first adopter of `bootstrapGame` from the start. Combat deferred for v1; encounters drive the prototype's loop. Bootstrap with `bootstrapGame({ gameName: 'drift', presets: { regular: { w: 900, h: 600 } }, initialScene: (game) => new DriftMenuScene(game) })`; build inlines `engine/lib/inkjs.js` before `engine.bundle.js`. `.ink` source files live under `games/drift/encounters/`. Sizable multi-session work; warrants its own scoping conversation before code lands.

2. **Visual-language follow-up.** Per ADR-0017, the tokens defined inline in `games/minesweeper/scenes/menu.js` should be extracted to a shared `scripts/ui-tokens.js` once a second game wants the same vocabulary. UI primitive Scripts (`UiButton`, `UiPanel`, `UiLabel`) become candidates at the same point. Until then, new menus that want the visual language copy the `MS_TOKENS` constant pattern (renamed) and use the same `drawRaised` / `drawSunken` helpers. The `scenes-preview.html` harness flagged for a future session should render scenes at both `regular` and `compact` logical resolutions to exercise the responsive bootstrap convention.

3. **Tooling-resilience follow-ups from RETROS 2026-05-14.** Item A (shared bootstrap module) landed on 2026-05-20 as `scripts/bootstrap.js`. Five proposals remain, in priority order: build manifest (`games/<name>/build-manifest.json` listing exact source paths and engine bundle SHA), tooling-degraded protocol codified in CONVENTIONS.md, startup sanity assertion inside `Engine.Game` constructor, scene preview harness, and build artifact policy revision. Each is a candidate for a follow-up ADR or feature commit.

4. **Minesweeper v2 candidates** (verified, not yet promoted): question-mark cell state (third right-click cycle, between flag and clear), keyboard navigation (arrow keys move a cursor, space reveal, F flag) for accessibility, custom difficulty input screen, win-streak/loss-streak persistence in addition to best times, optional safe-corner-start variant where the top-left cell is also forced safe.

5. **Party House v2 candidates** (verified, not yet promoted): hover tooltips on guest cards with full ability description, party-flow animation (guests slide in rather than appear), end-of-day balance sheet (cumulative pop/cash earned), a "view rolodex" toggle on the shop screen, second scenario unlocked after first clear, randomization of starting rolodex shuffle visible to player.

6. **Horses Teach Typing v2 candidates** (verified, not yet promoted): horse keyboard-hint speech bubble showing finger placement for the next letter, BPM progression as score climbs, high-score persistence via `Engine.storage`, optional metronome tick SFX on each beat for a stronger rhythm anchor.

7. **Revisit Konva-style raster sprite path** (user-flagged on 2026-05-12). Carrying over from prior session. Now actionable in principle since Clown Brawler v2 is verified, but asset sourcing remains undecided.

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
- **Minesweeper build bundle drift cleanup.** See Open questions section. Regen would land at approximately 82-84KB, marginally over the documented ~80KB single-push reliability ceiling. Deferred to a session with sufficient tool surface, or until Minesweeper is next regenerated for other reasons.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern. Not currently demanded by any game.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only. ADR-0017 anticipates touch hit-target sizing and the new `bootstrapGame` returns an `isTouch` flag for scenes to consult, but the actual touch-to-pointer event mapping is deferred to a separate ADR when a game requires it.

## Open questions

- **Asset sourcing for the eventual raster path**: carrying over from prior session.
- **Clown Brawler v1 disposition now that v2 is verified**: candidate for retirement to the dead-files convention. No action without explicit decision from Trevor.
- **poc-square v1 disposition**: keep as the documented "individual-module path" example per the CONVENTIONS.md section.
- **Party House art direction**: the MVP uses flat colored cards with text labels. The original is pixel art. Future iterations could either commit to a small ShapeSprite-based character set or stay with the abstract card aesthetic.
- **Minesweeper visual treatment** (partially settled): the 2026-05-14 polish pass commits to the classic Win 3.1 raised/sunken bevel aesthetic for the menu, rendered procedurally with canvas rectangles, using the ADR-0017 token vocabulary. Alternative paths (ShapeSprite-based tile set; flat modern aesthetic) remain available for a future v2 if motivated.
- **Engine bundle drift in `build/minesweeper.html`**: the inline engine in this build was hand-composed during a reduced-tool-surface session and omits sections of the canonical bundle (b58 codec, `Params.mutate`, `sliders` table, `sfxr.toBuffer`/`toWebAudio`, UMD wrapper) not exercised by Minesweeper. Runtime behavior matches for the features used. Per ADR-0016 the bundle is canonical; the cleaner long-term cleanup is to regenerate this build from the actual bundle file. A 2026-05-20 attempt measured the resulting build at approximately 82-84KB, marginally over the documented ~80KB single-push reliability ceiling, and was deferred. The cleanup will land naturally when Minesweeper is next regenerated (e.g., a v2 polish pass) or in a session with sufficient tool surface (bash/code-execution available for assembly outside the push payload). The shared bootstrap module (RETROS A, landed 2026-05-20 as `scripts/bootstrap.js`) and the tooling-degraded protocol proposal (RETROS C, still queued) are the structural responses that would prevent this kind of drift on future builds.
- **Drift authoring workflow**: `.ink` source files for encounters will live under `games/drift/encounters/`. Open: whether each encounter is inlined as a string literal in the build (simplest, larger build) or pre-compiled to JSON at author time and inlined as a const (smaller build, adds a compile step). Initial implementation uses inline source with runtime compilation by `inkjs.Compiler`; revisit if startup compile time becomes a measurable concern.

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Engine bundle is the canonical engine fetch target.** Per ADR-0016, fetch `engine/engine.bundle.js` for current engine source; do not reconstruct from individual modules and do not extract from old build files. Any commit that touches a bundled engine module must regenerate the bundle in the same commit (CLAUDE.md §8). Optional vendored libraries explicitly excluded from the bundle (per ADR-0018, e.g. `engine/lib/inkjs.js`) do not trigger regeneration when updated.
- **Project knowledge is current as of 2026-05-20.** The 11-module 48,931-byte bundle (blob SHA `91d7adf9861156a4149c6e23564737a973038212`) is in project knowledge. Fresh sessions have the engine source in context at startup with zero fetches required. If a future engine commit regenerates the bundle, project knowledge will need another manual refresh.
- **Bundle inlining is the default build-assembly path.** Per CONVENTIONS.md ("Build assembly" section), new game builds inline the bundle as a single block, then layer scripts, scenes, and bootstrap. `poc-square-v2` is the reference template. Games using narrative additionally inline `engine/lib/inkjs.js` BEFORE the engine bundle in their HTML build.
- **`bootstrapGame` helper is available for new builds.** `scripts/bootstrap.js` exposes `bootstrapGame(options)` per the registry entry. Usage: `bootstrapGame({ canvasId: 'game', gameName: 'mygame', presets: { regular: { w: 900, h: 600 }, compact: { w: 540, h: 900 } }, initialScene: (game) => new MyMenuScene(game), suppressContextMenu: false });`. Returns `{ game, preset, presetName, isTouch }`. Scenes can read `isTouch` to enlarge hit-target minimums per ADR-0017. Adopting the helper in new builds removes the inline IIFE from the build's `<script>` tail; existing builds keep their inline bootstrap until naturally regenerated.
- **Multi-file commit hazard.** A subtle bug observed in the 2026-05-19 session: the engine source commit (391bd86) was prepared as a multi-file push (narrative.js + bundle) but the bundle was inadvertently omitted from the `files` array sent to `push_files`. The follow-up commit (1244595) recovered. For future multi-file pushes that bundle code + bundle + docs, double-check the `files` array contents before submitting. CLAUDE.md §8 requires bundled engine source + bundle to land in the same commit; the recovery pattern (immediate follow-up commit) is acceptable as a tool-gated workaround but not as a habit.
- **Tooling state has occasionally degraded mid-session** to GitHub MCP only across 2026-05-13, 2026-05-14, 2026-05-19, and 2026-05-20 sessions. The 2026-05-14 (later) Minesweeper polish session demonstrated that the GitHub-only fallback works even for a full build assembly (commit 2e596a2b), at the cost of hand-composing the engine bundle inline and accepting drift from the canonical artifact. The 2026-05-20 session further demonstrated that a single-file push above ~80KB is a real risk surface: the Minesweeper bundle-drift cleanup was deferred on size grounds. The 50KB memory-rule threshold is a useful confirmation tripwire but conservative as a hard limit; pushes up to roughly 80KB have proven reliable; pushes beyond ~80KB should be split or deferred when possible.
- **Horses Teach Typing concat order** (individual-module path, pre-bundle): lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap.
- **Party House concat order** (bundle-inlining path): engine.bundle.js, pause-overlay, menu, match, bootstrap. Bootstrap currently inline IIFE: `new Engine.Game(canvas, { gameName: 'party-house' })`, then `game.setScene(new PHMenuScene(game))`, then `game.start()`. A future regeneration may migrate to `bootstrapGame`.
- **Minesweeper concat order** (bundle-inlining path): engine.bundle.js, pause-overlay, menu, match, bootstrap. Bootstrap currently inline IIFE per ADR-0017 viewport-aware sizing with `presets = { regular: { w: 900, h: 600 } }` (no compact because right-click is mouse-only), `canvas.oncontextmenu` suppression for right-click flagging. A future regeneration may migrate to `bootstrapGame({ ..., suppressContextMenu: true })`.
- **Drift concat order** (bundle-inlining path, narrative-enabled, bootstrap-helper-adopted): `engine/lib/inkjs.js`, `engine.bundle.js`, `scripts/bootstrap.js`, then game-specific scripts and scenes, then a final `bootstrapGame({...})` call. The inkjs UMD wrapper installs the global `inkjs` at script-load time; `engine/narrative.js` reads that global at construction time, so the order is load-bearing.
- **Engine.Narrative usage pattern**: `const n = new Engine.Narrative(inkSourceString); n.bindExternal('start_combat', (...) => ...); n.observe('hull', (v) => updateHud(v)); n.setVar('hull', ship.hull); const lines = n.continue(); const choices = n.getChoices(); n.choose(0);`. Persist with `Engine.storage.save('drift:narrative', n.saveState())`. The wrapper requires the `inkjs` global; the constructor throws a clear error if not loaded.
- **Visual language tokens (ADR-0017)**: MinesweeperMenuScene defines tokens inline as the `MS_TOKENS` const at the top of the file. Future games applying the visual language should follow the same pattern (with their own prefix, e.g. `PH_TOKENS`) until a second game wants the same vocabulary, at which point tokens get extracted to `scripts/ui-tokens.js` per the ADR's deferred-extraction policy. Helper functions `msDrawRaised`, `msDrawSunken`, `msDrawMine`, `msDrawFlag`, `msFormatTime`, `msDrawLED`, `msDrawMiniBoard`, `msPreviewPattern` are inlined alongside; these are also candidates for promotion to shared helpers when a second consumer appears.
- **PauseOverlay row layout**: data-driven. Add new row kinds by extending `_buildRows()` and the keypress dispatch in `update()`.
- **RhythmLetter ownership pattern**: each RhythmLetter holds a reference to the scene via `options.scene` so its `update(dt)` can read `scene.conductorTime`. The position-time function ensures determinism.
- **Auto-miss policy (HTT)**: `cutoff = goodWindow + 0.05` (= 230ms past target).
- **Build verification step convention**: prior sessions ran `node --check` on the extracted script tag of the assembled build. The fallback when bash is unavailable is per-source-file validation before assembly plus visual verification on browser load. The 2026-05-14 polish session demonstrated this fallback can succeed end-to-end at the cost of accepting engine bundle drift.
- **Engine.storage usage pattern**: bootstrap with `new Engine.Game(canvas, { gameName: 'mygame' })` (or `bootstrapGame({ gameName: 'mygame', ... })`); thereafter `Engine.storage.save('key', value)` / `Engine.storage.load('key')`.
- **Pause + mouse-edge interaction**: any scene that mixes PauseOverlay with mouse-click input should compute `_mouseClicked = !_prevMouseLeft && Engine.input.mouse.left` followed by `_prevMouseLeft = Engine.input.mouse.left` BEFORE the `if (this._pause.isPaused()) return;` early-return. PHMatchScene is the reference implementation; MinesweeperMatchScene also follows this pattern (with both left and right mouse buttons tracked).
- **Right-click input convention**: `Engine.input.mouse.right` is read; the canvas's `contextmenu` event must be suppressed at the bootstrap level. With `bootstrapGame` this is the `suppressContextMenu: true` option; with an inline bootstrap it is `canvas.oncontextmenu = (e) => e.preventDefault()`. MinesweeperMatchScene is the first scene to use right-click; reference its bootstrap snippet in `build/minesweeper.html` when adding right-click to another game.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
- **Retros log**: `docs/RETROS.md` accumulates session-level observations and forward-looking proposals that do not yet warrant an ADR. New sessions append entries at the bottom of the file in chronological order.
