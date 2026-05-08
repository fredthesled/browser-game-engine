# State

Last updated: 2026-05-07

## Current status

`scripts/sprite-sheet.js` committed. Three games in the repo: Pong, Survivors v3, Clown Brawler. No game currently uses SpriteSheet; it is infrastructure waiting for assets.

## What was done in the most recent session

**Session 2026-05-07 (this session):**

- **SpriteSheet script** (`scripts/sprite-sheet.js`): General-purpose sprite sheet animation player. Loads any image by data URI (or URL) via `_loadImage()`, which stores the result in a module-level Map keyed by src so multiple instances sharing a sheet only fire one Image load. Cuts frames by (col, row) index. Named animation states with per-state fps and loop flag. Non-looping animations hold the last frame and set `isDone() = true`. Public API: `play(name, force)`, `isDone()`, `setFlipX(bool)`, `.alpha`, `.currentAnim`, `setSrc(src)`. Origin convention: frame is centred at (host.x + offsetX, host.y + offsetY), so setting `offsetY = -(frameH * scale / 2)` keeps the sprite's feet at the host's Y coordinate.

- **engine/audio.js**: Default volume changed from 1.0 to 0.5 (landed last build session, recorded here for completeness).

- **Clown Brawler**: Parallax background with three layers (clouds 0.08, buildings 0.28, floor tiles 1.0). Build manually uploaded by user.

## Previously done

See prior STATE entries: engine (all six modules), Pong, PauseOverlay, Survivors v1-v3 (wave-clear, shop, coin magnet, fades), Clown Brawler initial build.

## Currently in progress

Nothing. Check-in with user before proceeding to next step.

## Next up

1. **Sprite generator artifact**: Claude-powered in-browser tool that paints pixel art frames, previews animations, and exports a sprite sheet PNG as a base64 data URI ready to paste into game source. This is the next explicit user request.
2. **Wire SpriteSheet into Clown Brawler**: Replace canvas-primitive clown and gorilla draw() methods with SpriteSheet instances. Requires sprites from step 1 first.
3. **Pong pause retrofit**: PauseOverlay + fade, regenerate pong.html.
4. **Survivors SFX**: jsfxr sounds (fire, hit, death, coin, level complete).
5. **Common scenes**: Credits, loading, main menu template.
6. **Multiplayer**: PeerJS Network module. Deferred until at least two verified games exist.

## Open questions

- Sprite sheet origin convention: frame centred at (offsetX, offsetY) relative to host. This means `offsetY = -(frameH * scale / 2)` to keep feet at host Y. An alternative `anchorY` fraction (0 = top, 0.5 = centre, 1 = bottom) was considered but adds complexity for marginal gain. Revisit if games need it.
- Asset embedding pattern: `const ASSETS = { player: 'data:image/png;base64,...' }` at the top of each game's entry file is the current plan. Evaluate whether a separate `assets.js` per game is cleaner once Clown Brawler is sprited.
- The `_ssImageCache` is module-global (shared across all games in a single build). This is fine for single-game builds, since each build is its own HTML file. It would be a naming-collision risk if two games were ever combined in one build, which is not a current use case.

## Notes for the next session

- SpriteSheet build order: it depends only on `Engine.Script`, so it slots in after `engine/game.js` and before any game scripts that use it. The existing build order in ARCHITECTURE.md covers this (scripts after engine, before scenes).
- Flip behaviour: `setFlipX(true)` applies `ctx.scale(-1,1)` around the host origin before drawing. The offsetX shift is applied after, so the frame stays correctly positioned regardless of flip state.
- `isDone()` stays true until `play()` is called again. The owning script is responsible for transitioning back to idle (or whatever follows), typically by checking `sprite.isDone()` in its own update loop.
