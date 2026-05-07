# State

Last updated: 2026-05-07

## Current status

Survivors v2 committed as `build/survivors.html`. Verified working in browser by user (v1 build). v2 adds coin economy, shop, range system, harder difficulty, and multi-shot fix.

## What was done in the most recent sessions

**Session (2026-05-06, session 1):** Engine audio + collision + jsfxr vendored.

**Session (2026-05-06, session 2, Sonnet 4.6):** Pong built and committed as `build/pong.html`.

**Session (2026-05-07, session 3):** PauseOverlay + Survivors v1 built. Verified working by user.

**Session (2026-05-07, session 4):** Survivors v2:
- **Range system**: `stats.range = 200` (starting). Player only fires at enemies within range. Range indicator: subtle 10% opacity circle drawn by SurvivorsPlayerController. Range upgradeable in shop (+60 per purchase, base price 18 coins).
- **Multi-shot fix**: MULTI-SHOT upgrade now adds 2 projectiles (not 1), keeping `projectileCount` odd (1, 3, 5...). Odd counts always produce a center-aimed shot, fixing the previous "even count misses center" problem.
- **Coin economy**: SurvivorsCoin script (new). Enemies carry `coinValue` (basic 3, swarm 1, tank 8, sine 2). On death, match scene spawns a coin at the enemy's position. Player walks over coins to collect. Coins have a 20-second lifetime (fade out at < 3s). Stats: `coins` carries over between waves; `upgradeLevels: {}` tracks purchase counts for price scaling.
- **Shop**: SurvivorsShopScene (new) replaces SurvivorsLevelupScene. Shows all 7 upgrades with prices: `basePrice + purchaseCount * priceInc`. Player can buy 0 or more per wave; unspent coins carry over. Includes current stats summary line.
- **Difficulty**: Spawn interval `max(0.22, 1.5 - (level-1)*0.15)` (was `max(0.38, 2.0 - ...)`). Enemy type pool grows earlier (swarm at 2, sine at 3, tank at 4). Health scales +10% per level, speed +4% per level. Burst spawn at level 5+ (25% chance for second enemy per interval).
- **New signal**: `survivors_coin_collected { value }` -- subscribed by match scene, adds to stats.coins.

## Currently in progress

Nothing.

## Next up

1. **Browser verification of v2 build**: test coin drops, collection, shop buying, price scaling, range indicator, multi-shot fix.
2. **Pong pause retrofit**: add PauseOverlay to PongMatchScene, regenerate pong.html.
3. **Survivors SFX**: once v2 mechanics confirmed, add jsfxr sounds (fire, hit, death, coin pickup, level complete).
4. **Common scenes**: loading, credits, audio settings base classes.
5. **Common scripts**: sprite renderer, animation player, health/damage primitives.
6. **Multiplayer**: PeerJS Network module. Defer until multiple verified games exist.

## Open questions

- Whether enemy health/speed scaling (+10%/+4% per level) is balanced. May need tuning after play.
- Coin economy balance: with ~15 basic enemies at 3 coins each per wave, player earns ~45 coins/wave early. First-wave shop has items at 14-45 coins. Should be able to afford 1-2 cheap upgrades. Mid-game: more kills, bigger coin drops, more enemies, so shop becomes more accessible while prices scale too.
- Whether 20s coin lifetime is long enough. Can extend to 30s or make coins permanent if pickup feels frustrating.

## Notes for the next session

- Survivors stats fields: `maxHealth`, `currentHealth`, `speed`, `fireRate`, `damage`, `projectileCount`, `projectileSize`, `playerSize`, `canvasW`, `canvasH`, `range`, `coins`, `upgradeLevels`.
- Build concatenation order for survivors: riffwave, sfxr, engine modules, rect-renderer, collider, pause-overlay, player-controller, projectile, enemy, **coin** (new - must precede match scene), survivors-menu, **survivors-shop** (new - replaces levelup), survivors-match, bootstrap.
- SurvivorsLevelupScene source still exists at `games/survivors/scenes/survivors-levelup.js` but is NOT included in the build and is marked superseded in the registry.
- The shop reads `stats.upgradeLevels` (an object, keys are upgrade ids) for price scaling. This is initialized as `{}` in the menu scene's fresh stats.
- MULTI-SHOT adds 2 per purchase: `projectileCount` goes 1 → 3 → 5 → 7. Spread is 0.14 * (count-1) total, always symmetric with center shot.
