# State

Last updated: 2026-05-07

## Current status

Clown Brawler shipped as `build/clown-brawler.html`. All three games (Pong, Survivors v3, Clown Brawler) are in the repo.

## What was done in the most recent session

**Session 2026-05-07 (this session):** Clown Brawler:
- **Game concept**: belt-scrolling brawler (Double Dragon style). Player is a canvas-primitive clown. Enemies are gorillas holding party balloons.
- **ClownPlayer script**: WASD/arrows movement on 2400x500 belt, Space/Z/X punch, per-swing hit dedup via `punchHitSet`, 0.8s i-frames on hit. Canvas-primitive art: big red shoes, polka-dot purple suit, yellow hair tufts, red nose.
- **GorillaEnemy script**: State machine (walking/attacking/stunned/dying/dead). Draws party balloon (bezier string, ellipse, shine) while alive. On death emits `brawler_balloon_release` then `brawler_remove`. Walking bob animation.
- **FloatingBalloon script**: Floats upward (-110 px/s) with random lateral drift, fades at 0.42 alpha/s, emits `brawler_remove` at zero.
- **ClownMenuScene**: Circus purple background with tent-stripe wedges, 8 animated balloon floats, blink prompt, fade in/out.
- **ClownMatchScene**: Belt scroll (2400px stage), smooth camera lag, Y-sort each frame, 3 waves. Parallax background: clouds (0.08x), buildings with window grids (0.28x), floor tile marks (1.0x, 80px period, primary motion readability cue). HUD: top wave/enemy count bar, bottom health bar. Wave-clear banner. Game-over and victory overlays.
- **Engine change**: `engine/audio.js` default volume changed from 1.0 to 0.5. PauseOverlay volume slider starts at 50%; players can adjust up from there.
- **Build**: `build/clown-brawler.html` assembled and committed.

## Previously done

**Sessions 2026-05-06 and 2026-05-07 (sessions 1-5):** Engine audio/collision, Pong, PauseOverlay, Survivors v1-v3 (range, coin shop, difficulty, wave-clear model, fade transitions, coin magnet). See prior STATE entries.

## Currently in progress

Nothing.

## Next up

1. **Pong pause retrofit**: add PauseOverlay + fade to PongMatchScene, regenerate pong.html.
2. **Survivors SFX**: jsfxr sounds (fire, hit, death, coin pickup, level complete).
3. **Common scenes**: loading, main menu template, credits scene.
4. **Common scripts**: sprite renderer, animation player, health/damage primitives, spawner.
5. **Multiplayer**: PeerJS Network module. Deferred until multiple verified games exist.

## Open questions

- Clown Brawler punch hit box (currently dx -20..92, dy +-55) may need tuning once played.
- Wave 3 gorilla speed (62 + 30 + jitter) vs player speed (180) -- may be trivial or brutal depending on enemy clustering.
- `brawler_wave_clear` audio preset (`powerUp`) plays immediately when enemies clear; may overlap with balloon release SFX if those are added later.

## Notes for the next session

- Engine.audio default volume is now 0.5. PauseOverlay reads/writes `Engine.audio.getVolume()` / `setVolume()` so the slider is already correct.
- Parallax constants in ClownMatchScene._drawBackground: CLOUD_TILE=1600, BLDG_TILE=1100, TILE_W=80. Floor tiles use `camX % TILE_W` offset directly.
- Fade pattern: `_fadeIn = 1.0` in enter(), decrement `2.5 * dt` in update, draw black overlay. Outgoing: `_pendingOut = new NextScene(...)`, `_fadeTimer`, setScene at >= 0.35, overlay at `min(1, _fadeTimer / 0.35)`.
- Signals: all `brawler_` prefixed. Gorilla attack -> match scene calls `playerScript.takeHit(1)`. Player death -> match sets `_state = 'game_over'`.
