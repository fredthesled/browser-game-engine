# State

Last updated: 2026-05-07

## Current status

Survivors v3 committed as `build/survivors.html`. User verified v2 working. v3 adds wave-clear model, fade transitions, coin magnet, and shorter coin lifetime.

## What was done in the most recent sessions

**Sessions 2026-05-06 and 2026-05-07 (sessions 1-4):** Engine audio/collision, Pong, PauseOverlay, Survivors v1, Survivors v2 (range, coin shop, difficulty). See prior STATE entries for details.

**Session (2026-05-07, session 5):** Survivors v3:
- **Wave-clear model**: Spawning stops after 30s (`_spawningDone = true`). Shop transition fires when `_spawningDone && _enemies.length === 0`. HUD swaps countdown for "DEFEAT ALL! (N left)" after timer expires. Player finishes the wave at their own pace.
- **Fade transitions**: All three match-side scenes now fade in (1.0 black overlay decrementing at 2.5/s on enter) and fade out (0.35s black overlay building before `setScene()`). `_pendingOut` queue pattern: when ready to transition, set `_pendingOut = new NextScene(...)` and let `_fadeOutTimer` tick. Applied to SurvivorsMenuScene, SurvivorsMatchScene, SurvivorsShopScene.
- **Coin magnet upgrade**: "COIN MAGNET +80px" in shop (basePrice 30, priceInc 22). `stats.magnetRange` starts at 0; each purchase adds 80px. `SurvivorsMatchScene._applyMagnet(dt)` runs after `super.update()`, pulls coins toward player at 220px/s within the magnet radius. Yellow range circle drawn by PlayerController when magnetRange > 0.
- **Coin lifetime**: Reduced 20s to 10s. Fade formula changed: fully opaque above 3s remaining, eases from 1.0 to 0.5 in last 3s (visible but signals urgency). Previously faded to 0 (invisible before despawn).
- **PauseOverlay quit action**: Now also triggers fade-out via `_pendingOut` rather than calling setScene directly.
- **Stats object additions**: `magnetRange: 0` added to initial stats in SurvivorsMenuScene.
- **Shop**: 8 upgrades now (COIN MAGNET added after RANGE). Stats summary line includes magnet range if > 0.

## Currently in progress

Nothing.

## Next up

1. **Browser verification of v3 build**: test fade transitions, wave-clear model, coin magnet, coin 10s lifetime.
2. **Pong pause retrofit**: add PauseOverlay + fade to PongMatchScene, regenerate pong.html.
3. **Survivors SFX**: jsfxr sounds (fire, hit, death, coin pickup, level complete) once v3 verified.
4. **Common scenes / scripts**: sprite renderer, animation player, health/damage primitives, credits scene.
5. **Multiplayer**: PeerJS Network module. Deferred until multiple verified games exist.

## Open questions

- Coin magnet pull speed (220px/s) and max range progression (80, 160, 240...) may need tuning after play.
- Wave-clear timing: with 30s of spawning + cleanup time, total wave duration is longer than before. Adjust WAVE_DURATION if it feels too long.
- Shop now has 9 rows total (8 upgrades + continue). Layout fits 600px canvas but is dense.

## Notes for the next session

- Stats fields: `maxHealth`, `currentHealth`, `speed`, `fireRate`, `damage`, `projectileCount`, `projectileSize`, `playerSize`, `canvasW`, `canvasH`, `range`, `coins`, `upgradeLevels`, `magnetRange`.
- Fade pattern (for reference when adding new scenes): `_fadeIn = 1.0` in enter(), decrement `2.5 * dt` in update, draw black overlay at `_fadeIn` alpha. Outgoing: set `_pendingOut = new NextScene(...)` and `_fadeOutTimer = 0`; increment timer in update; call setScene when >= 0.35; draw black overlay at `min(1, _fadeOutTimer / 0.35)` alpha over all content.
- Wave-clear: `_spawningDone` is false until WAVE_DURATION elapsed, then true. Transition fires when both true + `_enemies.length === 0`. The enemies array is maintained by the `survivors_remove` signal handler (both enemies and coins are removed this way).
- COIN MAGNET is a match-scene-level mechanic (`_applyMagnet(dt)`), not a new Script. It directly moves coin GameObjects (`obj.x`/`obj.y`) based on proximity to `_playerObj`.
