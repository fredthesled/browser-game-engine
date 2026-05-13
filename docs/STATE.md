# State

Last updated: 2026-05-13

## Current status

Four games in the repo: Pong, Survivors v3, Clown Brawler (v1 in repo; v2 assembled locally and pending manual upload from the prior session), and Horses Teach Typing v1 (sources committed this session; build pending manual upload). Plus `poc-square` as an engine smoke test. The engine, audio service, collision contract, pause utility (now with optional onRestart in addition to onQuit), persistent storage, and procedural Shape DSL sprite primitive (`ShapeSprite`) are settled.

Per ADR-0013, games in the repo are experimental probes rather than shipping products. Per the sibling-iteration convention (CONVENTIONS.md), iterations get versioned build artifacts.

A dead-file convention is in effect, defined in `docs/DEAD_FILES.md`.

## What was done in the most recent session

**Session 2026-05-13 (this session):**

1. **New game: Horses Teach Typing v1.** Rhythm typing where letters scroll right-to-left toward a fixed hit zone next to a horse silhouette. Black-on-white Apple II Oregon Trail aesthetic. Minimal English on the menu beyond the title. Scope was deliberately small per direction from Trevor: minimal UI, start menu, pause menu (volume + restart), base rhythm mechanic. No score screen, no progression, no music, no horse hint-bubble (deferred to v2).

2. **PauseOverlay extension.** `scripts/pause-overlay.js` now accepts an optional `onRestart` callback in addition to the existing `onQuit`. Row layout is data-driven: RESUME and AUDIO always present; RESTART present only if `onRestart` provided; QUIT present only if `onQuit` provided. The panel height scales with row count so a 4-row layout doesn't crowd. Existing callers (`SurvivorsMatchScene`) pass only `onQuit` and are unaffected: same 3-row appearance.

3. **New script:** `RhythmLetter` (`games/horses-teach-typing/scripts/rhythm-letter.js`). Owns one letter character, a spawn time, and a target hit time. Position is time-driven (`x === hitZoneX` exactly when `scene.conductorTime === targetTime`), making the game frame-rate-independent. State machine: alive -> judged -> dead. On entering `judged`, runs a 0.5s feedback animation (floats up, fades out) showing the judgement label, then emits `htt_letter_dead` for the scene to remove the host GameObject.

4. **New scenes:**
   - `HTTMenuScene` (`games/horses-teach-typing/scenes/htt-menu.js`). Pictographic title screen. Distant mountain silhouette, trail/ground line, animated horse silhouette with subtle head-bob, mini mechanic demo (three letters A/S/D continuously approaching a bracket pictograph), blinking SPACE bar pictograph at the bottom. SPACE or ENTER transitions to match with a 0.35s fade.
   - `HTTMatchScene` (`games/horses-teach-typing/scenes/htt-match.js`). Core gameplay. 90 BPM conductor advancing at dt per frame, spawns letters at beat-locked times with a 2s lead time. Judgement windows: perfect <=60ms, great <=120ms, good <=180ms, otherwise auto-miss after target+50ms cushion. Scoring: perfect 300, great 200, good 100. Lenient input policy: wrong-key or out-of-window presses are ignored; only letters that pass the hit zone are auto-missed. HUD: SCORE (left), BPM (center), COMBO (right), recent-judgement banner above the hit zone. SFX: `htt-perfect` (laserShoot), `htt-good` (pickupCoin), `htt-miss` (hitHurt) registered in `enter()`. Pause overlay wired with both `onRestart` (re-enters the match scene) and `onQuit` (back to menu).

5. **Build assembly pending.** The build HTML file (`build/horses-teach-typing.html`) is being assembled and pushed in a follow-up commit. Concat order matches the established convention: lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap. Bootstrap passes `{ gameName: 'horses-teach-typing' }` to the Game constructor so storage is namespaced if v2 adds persistence (e.g., high score).

6. **Registries updated.** `scripts/_registry.md` has a revised PauseOverlay description (mentions onRestart) and a new RhythmLetter row. `scenes/_registry.md` has new HTTMenuScene and HTTMatchScene rows.

## Previously done

See prior STATE entries: engine (signal-bus, input, script, game-object, scene, game, audio, storage), Pong, PauseOverlay original, Survivors v1-v3, Clown Brawler v1 and v2 (the v2 build is awaiting manual upload from the 2026-05-12 session), SpriteSheet and ShapeSprite scripts.

## Currently in progress

1. **Awaiting manual upload and visual verification of `build/clown-brawler-v2.html`** (from prior session). Carrying over.
2. **Awaiting manual upload and visual verification of `build/horses-teach-typing.html`** (this session). The HTML is being assembled and pushed via the API rather than presented locally because the local file/bash tools were not available this turn; if the push fails due to size, fall back to manual upload following the established convention.

## Next up

1. **(In progress)** Upload and verify the two pending builds.

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

## Sprite generator retirement note

The original sprite generator concept is retired. The forward path is the procedural Shape DSL (`ShapeSprite`, per ADR-0015).

## Notes for the next session

- **Tooling state on 2026-05-13**: Mid-session the available tool surface dropped to GitHub MCP + Google Drive metadata only (no bash, no local file creation, no present-files). The Horses Teach Typing build had to be assembled by inlining all source content into a single `create_or_update_file` payload rather than the usual local concat + manual upload workflow. If the build push failed for size reasons, the assembled HTML lives in this session's transcript and can be recovered for manual upload.
- **Horses Teach Typing concat order**: lib/riffwave, lib/sfxr, signal-bus, input, script, game-object, scene, audio, storage, game, pause-overlay, rhythm-letter, htt-menu, htt-match, bootstrap. Bootstrap: `new Engine.Game(canvas, { gameName: 'horses-teach-typing' })`, then `game.setScene(new HTTMenuScene(game))`, then `game.start()`.
- **PauseOverlay row layout**: data-driven now. Add new row kinds by extending `_buildRows()` and the keypress dispatch in `update()`. Existing semantics (RESUME, AUDIO with volume+mute, optional RESTART, optional QUIT) preserved.
- **RhythmLetter ownership pattern**: each RhythmLetter holds a reference to the scene via `options.scene` so its `update(dt)` can read `scene.conductorTime`. The position-time function ensures determinism. Compare to dt-driven movement: it converges over long runs but can drift over many frames with variable dt.
- **Auto-miss policy**: `cutoff = goodWindow + 0.05` (= 230ms past target). Tunable. The +50ms cushion gives the player a slight overshoot zone past 'good' before the letter is locked into a miss.
- **Build verification step convention**: prior sessions ran `node --check` on the extracted script tag of the assembled build. This session did the equivalent only on the source files locally before the tool environment changed; the build HTML push relies on each individual source file having passed `node --check` and on the concat order matching what was used successfully for Clown Brawler v2.
- **Engine.storage usage pattern**: bootstrap with `new Engine.Game(canvas, { gameName: 'mygame' })`; thereafter `Engine.storage.save('key', value)` / `Engine.storage.load('key')`.
- **Dead files**: run `grep -r DEAD-FILE` to find every parked file. Convention in `docs/DEAD_FILES.md`.
