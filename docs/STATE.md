# State

Last updated: 2026-05-13

## Current status

Four games in the repo: Pong, Survivors v3, Clown Brawler (v1 in repo; v2 committed, visual verification pending), and Horses Teach Typing v1 (sources and build committed, visual verification pending). Plus `poc-square` as an engine smoke test, with a v2 sibling build (`build/poc-square-v2.html`) verified to behave identically to v1, validating the engine-bundle workflow as a drop-in for individual-module concatenation. The engine, audio service, collision contract, pause utility (now with optional onRestart in addition to onQuit), persistent storage, procedural Shape DSL sprite primitive (`ShapeSprite`), canonical engine bundle (`engine/engine.bundle.js`, per ADR-0016), and bundle-inlining build-assembly convention (`docs/CONVENTIONS.md`, validated against poc-square v1/v2) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`.

## What was done in the most recent session

**Session 2026-05-13 (later, engine bundle work, verification, and convention codification):**

1. **Engine bundle introduced.** `engine/engine.bundle.js` committed (commit `2c338bec`) as the canonical single-file representation of the engine. Concatenates the ten source files (`engine/lib/riffwave.js`, `engine/lib/sfxr.js`, `engine/signal-bus.js`, `engine/input.js`, `engine/script.js`, `engine/game-object.js`, `engine/scene.js`, `engine/audio.js`, `engine/storage.js`, `engine/game.js`) in the canonical concat order. Header records generation date, source SHAs at the time of generation, and a regeneration recipe explicit enough that future Claude can rebuild without consulting other docs. Vendored library inline comments were lightly condensed in the bundle to keep the artifact compact; behavior is identical to the source files and the header SHAs reference the canonical source files (not the bundle's condensed copies).

2. **Operating rule added.** CLAUDE.md §8 now carries a bullet directing engine fetches at `engine/engine.bundle.js` and requiring bundle regeneration in any commit that touches an engine module. The rule is enforced by convention, not tooling.

3. **ADR-0016 added.** Documents the bundle as the canonical engine artifact, the rationale (avoiding ten per-session fetches, stale-build-fallback drift observed in the Horses Teach Typing session, and failed `raw.githubusercontent.com` dynamic fetches), the choice of "bundle in repo plus mirror in project knowledge" over "project knowledge only" or "per-file fetch with manifest," and consequences including the regeneration-on-engine-commit obligation.

4. **ARCHITECTURE.md updated.** The bundle is listed in the file layout summary, mentioned in the overview prose, and noted in the build concatenation order section (a build may inline the bundle in place of steps 1–10).

5. **Project bootstrap regenerated.** `docs/project-bootstrap.md` committed (commit `a794c205`) as the canonical repo copy. Updates the bootstrap to reflect current state: eight engine modules, vendored libs, the bundle artifact, ADRs 0001-0016, four shipped games, ShapeSprite as the sprite primitive, PauseOverlay convention, experimental-probe framing, dead-file convention, and the large-payload safety check. The repo file is the source for future regenerations; the project knowledge upload is where fresh Claude sessions actually load from.

6. **Project knowledge contents settled.** The regenerated `project-bootstrap.md` replaced the prior bootstrap. `engine/engine.bundle.js` was added as a new file (the parallel optimization per ADR-0016 option 3). Trevor initially also uploaded the four recent game builds (Pong, Survivors, Clown Brawler v2, Horses Teach Typing) as supplementary reference material, but subsequently deleted them to keep project knowledge lean (the ~200KB combined size would have taxed every session-start regardless of whether the games were actually consulted). Project knowledge now holds only canonical session-startup material: `project-bootstrap.md` and `engine/engine.bundle.js`. Game builds and other reference material remain in the repo and are fetched on demand.

7. **Engine bundle workflow tested via `build/poc-square-v2.html`.** Committed (commit `90fd0485`) as a sibling iteration of the original poc-square build. Inlines `engine/engine.bundle.js` as a single block in place of concatenating the ten individual engine modules, then layers the same game-specific scripts and scenes on top. Trevor visually verified the v2 build behaves identically to v1 (teal square responds to arrow keys, clean console). The bundle is validated as a drop-in for individual-module concatenation. Size went from 8KB (v1, pre-audio/storage) to 45KB (v2, with the full modern engine) because the bundle includes audio.js and storage.js even though poc-square does not exercise them. This trade-off is documented in the build header.

8. **Build-assembly convention codified.** `docs/CONVENTIONS.md` updated with a new "Build assembly (bundle-inlining convention)" section establishing bundle inlining as the default for new builds, with `build/poc-square-v2.html` as the canonical reference template. The section also documents when the individual-module path remains appropriate (minimal POCs not using audio/storage, diagnostic builds). Replaces no prior convention; existing builds are unaffected.

9. **Operational notes.** Two earlier attempts at a single atomic five-file commit failed to complete the response due to combined payload size (bundle plus four doc files at ~115KB total). The work was split into commits (bundle, smaller docs, DECISIONS.md) to fit within response-length limits. A memory rule was added to check in with the user before tool calls with very large payloads.

**Session 2026-05-13 (earlier, Horses Teach Typing):**

1. **New game: Horses Teach Typing v1.** Rhythm typing where letters scroll right-to-left toward a fixed hit zone next to a horse silhouette. Black-on-white Apple II Oregon Trail aesthetic. Minimal English on the menu beyond the title. Scope was deliberately small per direction from Trevor: minimal UI, start menu, pause menu (volume + restart), base rhythm mechanic. No score screen, no progression, no music, no horse hint-bubble (deferred to v2).

2. **PauseOverlay extension.** `scripts/pause-overlay.js` now accepts an optional `onRestart` callback in addition to the existing `onQuit`. Row layout is data-driven: RESUME and AUDIO always present; RESTART present only if `onRestart` provided; QUIT present only if `onQuit` provided. The panel height scales with row count so a 4-row layout doesn't crowd. Existing callers (`SurvivorsMatchScene`) pass only `onQuit` and are unaffected: same 3-row appearance.

3. **New script:** `RhythmLetter` (`games/horses-teach-typing/scripts/rhythm-letter.js`). Owns one letter character, a spawn time, and a target hit time. Position is time-driven (`x === hitZoneX` exactly when `scene.conductorTime === targetTime`), making the game frame-rate-independent. State machine: alive -> judged -> dead. On entering `judged`, runs a 0.5s feedback animation (floats up, fades out) showing the judgement label, then emits `htt_letter_dead` for the scene to remove the host GameObject.

4. **New scenes:**
   - `HTTMenuScene` (`games/horses-teach-typing/scenes/htt-menu.js`). Pictographic title screen. Distant mountain silhouette, trail/ground line, animated horse silhouette with subtle head-bob, mini mechanic demo (three letters A/S/D continuously approaching a bracket pictograph), blinking SPACE bar pictograph at the bottom. SPACE or ENTER transitions to match with a 0.35s fade.
   - `HTTMatchScene` (`games/horses-teach-typing/scenes/htt-match.js`). Core gameplay. 90 BPM conductor advancing at dt per frame, spawns letters at beat-locked times with a 2s lead time. Judgement windows: perfect <=60ms, great <=120ms, good <=180ms, otherwise auto-miss after target+50ms cushion. Scoring: perfect 300, great 200, good 100. Lenient input policy: wrong-key or out-of-window presses are ignored; only letters that pass the hit zone are auto-missed. HUD: SCORE (left), BPM (center), COMBO (right), recent-judgement banner above the hit zone. SFX: `htt-perfect` (laserShoot), `htt-good` (pickupCoin), `htt-miss` (hitHurt) registered in `enter()`. Pause overlay wired with both `onRestart` (re-enters the match scene) and `onQuit` (back to menu).

5. **Build assembled.** `build/horses-teach-typing.html` committed via the single-file `create_or_update_file` payload approach. Concat order: lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap. Bootstrap passes `{ gameName: 'horses-teach-typing' }` to the Game constructor so storage is namespaced if v2 adds persistence (e.g., high score).

6. **Registries updated.** `scripts/_registry.md` has a revised PauseOverlay description (mentions onRestart) and a new RhythmLetter row. `scenes/_registry.md` has new HTTMenuScene and HTTMatchScene rows.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio, storage), Pong, PauseOverlay original, Survivors v1-v3, Clown Brawler v1 and v2, SpriteSheet and ShapeSprite scripts.

## Currently in progress

1. **Visual verification of `build/clown-brawler-v2.html`** (from 2026-05-12). Build is in repo; needs browser load to confirm.
2. **Visual verification of `build/horses-teach-typing.html`** (from 2026-05-13 earlier). Build is in repo; needs browser load to confirm.

## Next up

1. **(In progress)** Visual verification of the two pending builds above.

2. **Horses Teach Typing v2 candidates** (post-verification): horse keyboard-hint speech bubble showing finger placement for the next letter, BPM progression as score climbs, high-score persistence via `Engine.storage`, optional metronome tick SFX on each beat for a stronger rhythm anchor.

3. **Revisit Konva-style raster sprite path** (user-flagged on 2026-05-12). Carrying over from prior session. Not actionable until v2 of Clown Brawler is verified and asset sourcing is decided.

4. **Engine primitives.** Common attachable behaviors reinvented across multiple games:
   - **Conductor primitive.** The clock/spawn-cursor pattern in HTTMatchScene is similar to the wave-spawn pattern in SurvivorsMatchScene. A shared `Conductor` or `Scheduler` script could host beat-locked or interval-locked event scheduling.
   - **Real spawner script.** Replaces inlined spawn logic in `SurvivorsMatchScene._spawnEnemy`.
   - **Signal-driven animation player.** Decouples animation state changes from per-script update logic.
   - **Generic health/damage script.** Centralizes the HP, damage, death-emit pattern.

## Deferred to shipping mode

Real items, blocked behind ADR-0013.

- **Pong**: PauseOverlay retrofit, then regenerate `build/pong-v2.html` (per the sibling-iteration convention).
- **Survivors**: jsfxr SFX. Also: persist stats and coins via `Engine.storage`.
- **Clown Brawler**: any further visual upgrades after v2.
- **Horses Teach Typing**: progression curve, high-score, keyboard-hint bubble, optional music asset path.
- **Common scenes**: shared credits, loading, and main-menu templates.

## Deferred housekeeping (tool-gated)

- **Actual deletion of dead files** in `docs/DEAD_FILES.md`'s disposal queue. Blocked on `GitHub:delete_file` approval.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module, authoritative-server pattern. Not currently demanded by any game.
- **Touch / pointer input**: `engine/input.js` is keyboard+mouse only.

## Open questions

- **Asset sourcing for the eventual raster path**: carrying over from prior session.
- **Clown Brawler v1 disposition once v2 is verified**: carrying over from prior session.
- **poc-square v1 disposition**: now that v2 is verified and is the canonical bundle-inlining reference, the v1 build (`build/poc-square.html`, ~8KB) could be marked DEAD or kept as the documented "individual-module path" example. Recommendation: keep as the example reference per the new CONVENTIONS.md section, since it cleanly shows the alternate path.

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Engine bundle is the canonical engine fetch target.** Per ADR-0016, fetch `engine/engine.bundle.js` for current engine source; do not reconstruct from individual modules and do not extract from old build files. The bundle header includes a SHA list for each source file at generation time, so drift relative to live `engine/` content is detectable by listing the engine directory and comparing. Any commit that touches an engine module must regenerate the bundle in the same commit (CLAUDE.md §8).
- **Project knowledge scope is lean by default.** Project knowledge holds canonical session-startup material only: `project-bootstrap.md` and `engine/engine.bundle.js`. Specific game builds and other reference material live in the repo and are fetched on demand via `GitHub:get_file_contents`. The reasoning: project knowledge loads every session whether consulted or not, so eagerly cached reference material pays a per-session token tax for occasional benefit. Specific files can be promoted back to project knowledge if usage demonstrates they earn the cost, but the default is lean.
- **Bundle inlining is the default build-assembly path.** Per CONVENTIONS.md ("Build assembly" section) and validated against `build/poc-square-v2.html` against `build/poc-square.html`, new game builds inline the bundle as a single block, then layer scripts, scenes, and bootstrap. The individual-module path is reserved for minimal POCs that do not use audio or storage, or for diagnostic builds.
- **`poc-square-v2` is the reference template for the bundle-inlining build pattern.** Its header documents the inlined files and their blob SHAs at the time of assembly. Read it as a template before writing a new build.
- **Bundle cost trade-off** for games that do not use audio or storage: the bundle adds ~37KB of jsfxr code and a few KB of audio/storage modules even if the game never calls them. For poc-square this took the build from 8KB to 45KB. For non-trivial games (Pong, Survivors, etc., already at ~45KB with the individual-module path), the trade is roughly neutral. If a future game wants the smallest possible build and does not use audio or storage, the individual-module path remains valid per CONVENTIONS.md.
- **Tooling state on 2026-05-13**: Mid-session the available tool surface dropped to GitHub MCP only (no bash, no local file creation, no present-files). Several builds had to be assembled by inlining all source content into a single `create_or_update_file` payload rather than the usual local concat + manual upload workflow. The memory rule about checking in for very large payloads (>30KB single file, >50KB total) was added in response. Past sessions have succeeded at single 45-60KB pushes; the rule is about asking before attempting larger ones.
- **Horses Teach Typing concat order** (individual-module path, used at the time of the HTT build): lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap. Bootstrap: `new Engine.Game(canvas, { gameName: 'horses-teach-typing' })`, then `game.setScene(new HTTMenuScene(game))`, then `game.start()`. Going forward, equivalent builds use the bundle-inlining path.
- **PauseOverlay row layout**: data-driven now. Add new row kinds by extending `_buildRows()` and the keypress dispatch in `update()`. Existing semantics (RESUME, AUDIO with volume+mute, optional RESTART, optional QUIT) preserved.
- **RhythmLetter ownership pattern**: each RhythmLetter holds a reference to the scene via `options.scene` so its `update(dt)` can read `scene.conductorTime`. The position-time function ensures determinism. Compare to dt-driven movement: it converges over long runs but can drift over many frames with variable dt.
- **Auto-miss policy**: `cutoff = goodWindow + 0.05` (= 230ms past target). Tunable. The +50ms cushion gives the player a slight overshoot zone past 'good' before the letter is locked into a miss.
- **Build verification step convention**: prior sessions ran `node --check` on the extracted script tag of the assembled build. This is unavailable when bash is not in the tool surface; the fallback is per-source-file validation before assembly plus visual verification on browser load.
- **Engine.storage usage pattern**: bootstrap with `new Engine.Game(canvas, { gameName: 'mygame' })`; thereafter `Engine.storage.save('key', value)` / `Engine.storage.load('key')`.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
