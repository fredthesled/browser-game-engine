# State

Last updated: 2026-05-26

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (11 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, and the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`).

## What was done in the most recent session

**Session 2026-05-26 (raster asset pipeline + animation communication format):**

1. **`scripts/build-game.sh` updated.** The `"assets"` array in `build-manifest.json` is now functional. The runner base64-encodes each listed PNG/JPG/WebP/GIF and injects `var ASSETS = {}; ASSETS["key"] = "data:...;base64,...";` before the concatenated sources. Unsupported extensions warn and skip rather than failing. Each asset logs its key and encoded size in KB.

2. **`docs/resources/assets.md` updated.** Added a top-level "Asset pipeline" section documenting the full end-to-end workflow (find asset, upload via GitHub web UI, add to manifest, commit, build inlines automatically). Added Piskel as a first-class browser-based authoring tool for custom sprite sheets.

3. **`docs/ANIM_CONFIG.md` committed.** Defines two sidecar JSON formats:
   - **Sprite sheet sidecar** (`<sheet-name>.anim.json`): `frameW`, `frameH`, `scale`, `offsetX/Y`, `notes`, and an `animations` map with `frames` (col/row pairs), `fps`, and `loop`. Placed alongside the PNG in `games/<name>/assets/`. Not inlined into the build; exists as a communication artifact between Trevor and Claude.
   - **Parallax sidecar** (`parallax.anim.json`): `layers` array with `asset`, `speedX`, `speedY`, `repeat`, and optional `tileW`. Tells Claude how to configure a `ParallaxBackground` script constructor call.
   - Documents the ezgif.com/sprite-cutter workflow for verifying Kenney sheet dimensions before upload.

## Previously done

See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

Nothing blocked. The raster pipeline is ready to use; it needs a real asset committed to exercise it end-to-end.

## Next up

### Immediate: first real raster asset

The pipeline is in place but untested against a real image. The natural first exercise is Clown Brawler's gorilla or player sprite. Options, in order of effort:

- **Option A (Kenney adapt):** Find the closest Kenney pack ("Toon Characters 1"), commit the sheet, write `gorilla-sheet.anim.json` describing the walk/attack/die frames, and let Claude rewrite `GorillaEnemy` to use `SpriteSheet` instead of inline canvas calls. Fast, but the aesthetic match to "Clown Brawler" is loose.
- **Option B (Piskel custom):** Draw a 48x48 gorilla in Piskel (piskelapp.com, browser-based), export as PNG sprite sheet, commit, write the `.anim.json` sidecar. More work but full aesthetic control.

Either path requires Trevor to upload the PNG via GitHub web UI. Claude handles everything after that.

### ParallaxBackground script

`docs/ANIM_CONFIG.md` defines the `parallax.anim.json` sidecar schema, but the `ParallaxBackground` script does not yet exist. Build it when the first game needs scrolling backgrounds. Natural candidate: Clown Brawler (belt-plane side-scroller) or a future driving/runner game. Takes a `layers` config array in its constructor; the sidecar is the communication format Trevor uses to specify it.

### Pipeline improvements

1. **GitHub Releases step.** `softprops/action-gh-release@v2` with a rolling `latest-build` tag. Permanent public download URLs for built games.
2. **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.
3. **Game scaffolding script.** `scripts/scaffold-game.sh` via `workflow_dispatch`. Reduces per-session boilerplate.
4. **Registry validation workflow.** Fails the build if a `.js` file in `scripts/` or `scenes/` lacks a registry entry.

### Other game work

5. **Drift v1 bug fixes.**
6. **Drift crew AI.** `_redistributeCrew()` stub in `DriftMatchScene._resolveEncounter()`.
7. **Apply Tween to Clown Brawler.** `FloatingBalloon` alpha fade, gorilla dying-state transition via `onDone`.
8. **Build manifests for existing games.** Add when each game is next touched.

## Deferred to shipping mode

- **Pong**: PauseOverlay retrofit.
- **Survivors**: jsfxr SFX, persist stats and coins.
- **Clown Brawler**: raster sprite upgrade (pending asset decision above).
- **Horses Teach Typing**: progression curve, high-score, keyboard-hint bubble.
- **Party House**: additional scenarios, more guest types.
- **Minesweeper**: question-mark state, keyboard nav, custom difficulty.
- **Common scenes**: shared credits, loading, main-menu templates.

## Deferred housekeeping (tool-gated)

- **Dead file deletion.** Blocked on `GitHub:delete_file` approval.
- **Minesweeper build bundle drift.** Deferred until next regeneration.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

## Open questions

- **Clown Brawler sprite decision**: Kenney adapt vs. Piskel custom (see Next up).
- **Drift v1 known issues**: scope TBD.
- **Ink pre-compilation architecture**: see Next up item 2.
- **Minesweeper engine bundle drift**: deferred.

## Notes for the next session

- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array, commit. ASSETS global is injected before source files in the build.
- **Animation communication format.** Read `docs/ANIM_CONFIG.md` when working on any sprite or parallax setup. When Trevor pastes or references a `.anim.json` sidecar, that is the authoritative source for frame layout and animation parameters.
- **ezgif.com/sprite-cutter** is the recommended browser tool for verifying Kenney sheet dimensions before upload. Upload sheet, enter guessed frame size, preview sliced frames, adjust until clean.
- **ParallaxBackground script not yet built.** Schema for its config is in `docs/ANIM_CONFIG.md`. Build the script when the first game needs it.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml`.
- **Manifest schema** documented in `scripts/build-game.sh` header. Optional `"assets"` array now supported alongside `"concat"` and `"bootstrap"`.
- **Engine bundle fetch target**: `engine/engine.bundle.js`. Project knowledge copy current as of 2026-05-20.
- **Tween build-order**: no dependencies; include before game scripts.
- **`create_or_update_file` over `push_files` for large single files.** More reliable for files >20 KB.
- **Drift concat order**: `engine/lib/inkjs.js` -> `engine/engine.bundle.js` -> `scripts/bootstrap.js` -> `scripts/pause-overlay.js` -> `games/drift/encounters/sources.js` -> scenes -> `bootstrapGame({...})`.
- **Node.js 24 opt-in** active via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'`. No-op after June 2, 2026.
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
