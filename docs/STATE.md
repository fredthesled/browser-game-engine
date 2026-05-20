# State

Last updated: 2026-05-20

## Current status

Six games in the repo: Pong, Survivors v3, Clown Brawler v2 (verified 2026-05-20), Horses Teach Typing v1 (verified 2026-05-20), Party House (verified 2026-05-20), and Minesweeper (sources committed including a polished menu pass per ADR-0017, build assembled and verified at commit 2e596a2b). Plus `poc-square` as an engine smoke test. Drift v1 sources committed (2026-05-20); build assembly and verification pending.

The engine, audio service, collision contract, pause utility, persistent storage, procedural Shape DSL sprite primitive (`ShapeSprite`), canonical engine bundle (`engine/engine.bundle.js`, per ADR-0016), bundle-inlining build-assembly convention (`docs/CONVENTIONS.md`), visual language plus logical-canvas convention (ADR-0017), narrative module (`Engine.Narrative`, a thin inkjs wrapper, per ADR-0018), and shared game bootstrap helper (`bootstrapGame` in `scripts/bootstrap.js`) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`. A session-retros log is now kept at `docs/RETROS.md`.

## What was done in the most recent session

**Session 2026-05-20 (Drift v1 implementation — sources committed):**

1. **Scoping conversation completed.** Key decisions: composite view (ship interior visible during encounters, encounter panel alongside it), mechanical crew from day one (crew-in-room counts set ink variables before each encounter), session-authored ink content. Ship layout: five rooms nose-to-tail (Helm, Weapons, Shields, Med Bay, Engines) connected by hallways. Four crew (rooms minus one); Medical Bay starts empty. Hull 0–10. Crew AI and captain orders (Red Alert, Retreat, Defend) deferred to their own session.

2. **Ink encounter files committed** (commit 61980b8). Five self-contained `.ink` stories under `games/drift/encounters/`: `nebula-storm.ink`, `distress-beacon.ink`, `pirate-hail.ink`, `asteroid-corridor.ink`, `final-beacon.ink`. Each declares all seven standard variables (`crew_in_*`, `hull`, `crew_total`) for safe `setVar` coverage and documents its branching logic in a header comment. `games/drift/encounters/sources.js` wraps all five as JS string constants in `DRIFT_ENCOUNTER_SOURCES`, with a full authoring guide covering variable/external API, ink syntax reference, and instructions for adding future encounters.

3. **DriftMenuScene and DriftGameOverScene committed** (commit 2b6796f). Star-field title screen with begin button; win/loss screen with outcome header, final stats, flavor line, and return-to-menu button. Both scenes render proportionally from canvas dimensions.

4. **DriftMatchScene committed** (commit b8f1581, 24 KB). Primary gameplay scene. Parametric layout system: `_driftBuildLayout(canvas)` detects portrait vs. landscape from aspect ratio and delegates to `_driftShipHorizontal` (regular, rooms left-to-right) or `_driftShipVertical` (compact, rooms top-to-bottom). All pixel coordinates derive from this layout object; no hardcoded coordinates appear in draw methods. State machine: `traveling` (sector progress timer, ship panel live) and `encounter_active` (ship panel dims, encounter panel drives ink loop). Encounter panel shows accumulated narrative text with word-wrap, choice buttons with hover audio, and a `[ CONTINUE ]` button to close resolved encounters. Crew rendered as colored circles in room slots; `lose_crew` incapacitates (removes circle), `gain_crew` adds to Medical Bay. Crew AI redistribution stub present with comment directing the future AI session. PauseOverlay integrated with quit-to-menu. `_pendingScene` deferred transition prevents scene swap mid-update.

5. **`scenes/_registry.md` updated** (commit 41493c1). Three new rows: DriftMenuScene, DriftMatchScene (with full dependency list and feature summary), DriftGameOverScene.

6. **Build assembly pending.** `build/drift.html` has not been assembled yet. Concat order for the build (all inlined as `<script>` blocks in this order):
   - `engine/lib/inkjs.js` (load order is critical: must precede engine bundle)
   - `engine/engine.bundle.js`
   - `scripts/bootstrap.js`
   - `scripts/pause-overlay.js`
   - `games/drift/encounters/sources.js`
   - `games/drift/scenes/menu.js`
   - `games/drift/scenes/match.js`
   - `games/drift/scenes/game-over.js`
   - Bootstrap call (inline script tag):
     ```javascript
     bootstrapGame({
       canvasId: 'game',
       gameName: 'drift',
       presets: {
         regular: { w: 900, h: 600 },
         compact: { w: 540, h: 900 },
       },
       initialScene: (g) => new DriftMenuScene(g),
       suppressContextMenu: false,
     });
     ```
   The resulting build will be large (~300+ KB due to inkjs); Trevor uploads manually per the established convention for large builds.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio, storage, narrative), Pong, PauseOverlay original, Survivors v1-v3, Clown Brawler v1 and v2, SpriteSheet and ShapeSprite scripts, Party House, Horses Teach Typing, Minesweeper, engine bundle and bundle-inlining convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, `bootstrapGame` shared bootstrap helper, inkjs vendor upload and Engine.Narrative wrapper.

## Currently in progress

**Drift v1 build assembly.** Sources are committed and complete. The HTML build needs to be assembled and uploaded manually by Trevor. See the concat order in "What was done" above.

## Next up

1. **Drift v1 build verification.** After Trevor assembles and uploads `build/drift.html`, verify: menu loads, begin button transitions to match, ship interior renders in both orientations, travel timer fires encounters, narrative text and choices display correctly, choice selection advances ink, CONTINUE button resolves encounter and resumes travel, hull pip bar updates on damage, crew circles disappear on loss, gain_crew adds a circle to Medical Bay, win and loss conditions transition to game-over, game-over returns to menu, ESC pause works.

2. **Drift crew AI session.** Design and implement the autonomous crew redistribution system. Inputs: current room assignments, ship state (hull, active encounters, outcome history). Outputs: crew movement decisions. Captain macro-orders (Red Alert, Retreat, Defend) influence crew priorities but never issue individual orders. Replaces the `_redistributeCrew()` stub in `DriftMatchScene._resolveEncounter()`.

3. **Visual-language follow-up.** Per ADR-0017, extract shared tokens to `scripts/ui-tokens.js` once a second game uses the same vocabulary. UI primitive Scripts (`UiButton`, `UiPanel`, `UiLabel`) become candidates at the same point.

4. **Tooling-resilience follow-ups from RETROS 2026-05-14.** Items B–E remain: build manifest, tooling-degraded protocol in CONVENTIONS.md, startup sanity assertion in Engine.Game constructor, scene preview harness, build artifact policy revision.

5. **Minesweeper v2 candidates** (verified, not yet promoted): question-mark state, keyboard navigation, custom difficulty, win/loss-streak persistence, mine-explosion animation, sweep-reveal animation.

6. **Party House v2 candidates** (verified, not yet promoted): hover tooltips, party-flow animation, end-of-day balance sheet, rolodex toggle, second scenario, shuffle reveal.

7. **Horses Teach Typing v2 candidates** (verified, not yet promoted): keyboard-hint speech bubble, BPM progression, high-score persistence, metronome tick SFX.

8. **Engine primitives.** Conductor/Scheduler, real Spawner script, signal-driven animation player, generic health/damage script, mouse-edge detector.

## Deferred to shipping mode

Real items, blocked behind ADR-0013.

- **Pong**: PauseOverlay retrofit, then regenerate `build/pong-v2.html`.
- **Survivors**: jsfxr SFX. Also: persist stats and coins via `Engine.storage`.
- **Clown Brawler**: any further visual upgrades after v2.
- **Horses Teach Typing**: progression curve, high-score, keyboard-hint bubble, optional music asset path.
- **Party House**: additional scenarios, more guest types, full ban-by-instance UI, animations.
- **Minesweeper**: question-mark state, keyboard navigation, custom difficulty, win/loss-streak, animations.
- **Common scenes**: shared credits, loading, and main-menu templates.

## Deferred housekeeping (tool-gated)

- **Actual deletion of dead files** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval.
- **Minesweeper build bundle drift cleanup.** Regen would land at approximately 82-84KB, marginally over the ~80KB single-push reliability ceiling. Deferred until Minesweeper is next regenerated for other reasons.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only. ADR-0017 anticipates touch hit-target sizing and `bootstrapGame` returns `isTouch`, but the actual touch-to-pointer event mapping is deferred to a separate ADR.

## Open questions

- **Asset sourcing for the eventual raster path**: carrying over from prior session.
- **Clown Brawler v1 disposition now that v2 is verified**: candidate for retirement to the dead-files convention.
- **Drift authoring workflow**: `.ink` source files inlined as strings in `sources.js`. If startup compile time ever becomes measurable, switch to pre-compiled JSON and the `compiled: true` option on `Engine.Narrative`.
- **Drift ink content expansion**: current five encounters cover one run. Trevor extends by editing `games/drift/encounters/*.ink` and updating the matching strings in `sources.js`, then reassembling the build. The authoring guide in `sources.js` documents the full variable/external API and ink syntax reference.
- **Minesweeper visual treatment** (partially settled): Win 3.1 raised/sunken bevel aesthetic committed. Alternative paths available for a future v2.
- **Engine bundle drift in `build/minesweeper.html`**: cleanup deferred per size constraints. Will land when Minesweeper is next regenerated.

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Engine bundle is the canonical engine fetch target.** Per ADR-0016, fetch `engine/engine.bundle.js`. Project knowledge copy is current as of 2026-05-20 (11 modules, 48,931 bytes, blob SHA `91d7adf9861156a4149c6e23564737a973038212`).
- **Bundle inlining is the default build-assembly path.** For narrative games, include `engine/lib/inkjs.js` BEFORE the engine bundle. Load order is critical: `engine/narrative.js` (inside the bundle) references the `inkjs` global which inkjs installs at script-load time.
- **`bootstrapGame` helper** is available from `scripts/bootstrap.js`. Usage: `bootstrapGame({ canvasId, gameName, presets: { regular: {w,h}, compact: {w,h} }, initialScene: (g) => new Scene(g), suppressContextMenu })`. Returns `{ game, preset, presetName, isTouch }`.
- **Drift concat order**: `engine/lib/inkjs.js` → `engine/engine.bundle.js` → `scripts/bootstrap.js` → `scripts/pause-overlay.js` → `games/drift/encounters/sources.js` → `games/drift/scenes/menu.js` → `games/drift/scenes/match.js` → `games/drift/scenes/game-over.js` → `bootstrapGame({...})` call.
- **Drift build will be large** (~300+ KB) due to inkjs. Trevor uploads manually, same as prior large builds.
- **Drift crew AI stub**: `_redistributeCrew()` stub is at the bottom of `DriftMatchScene._resolveEncounter()`. The AI session replaces it. The stub comment describes the expected contract.
- **CREW AI STUB location**: `games/drift/scenes/match.js`, inside `_resolveEncounter()`, clearly commented.
- **Multi-file commit hazard**: double-check `files` array contents before submitting large `push_files` calls. For very large single files, prefer `create_or_update_file` (shorter response, lower truncation risk).
- **Tooling state**: `create_or_update_file` proved more reliable than `push_files` for large single-file commits during this session (match.js at 24 KB).
- **Engine.Narrative usage pattern**: `const n = new Engine.Narrative(inkSourceString); n.bindExternal('fn', (...) => ...); n.setVar('x', val); const lines = n.continue(); const choices = n.getChoices(); n.choose(choice.index);`. Persist with `Engine.storage.save('key', n.saveState())`.
- **Drift ink variables**: all seven (`crew_in_helm`, `crew_in_weapons`, `crew_in_shields`, `crew_in_medical`, `crew_in_engines`, `hull`, `crew_total`) are declared with `VAR` in every `.ink` file so `setVar` calls never throw regardless of which variables a given story uses.
- **PauseOverlay row layout**: data-driven. Add new row kinds by extending `_buildRows()` and the keypress dispatch in `update()`.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
- **Retros log**: `docs/RETROS.md` accumulates session-level observations. New sessions append entries chronologically.
