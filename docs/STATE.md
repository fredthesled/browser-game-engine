# State

Last updated: 2026-06-19

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`), and rolling GitHub Releases with permanent public download URLs (ADR-0022).

## What was done in the most recent session

**Session 2026-06-19 (GitHub Releases — rolling permanent download URLs):**

1. **ADR-0022: rolling `latest-build` GitHub Release.** Added a "Publish rolling `latest-build` GitHub Release" step to the `build` job in `.github/workflows/build.yml`. After every successful build the step creates or upserts a release tagged `latest-build`, attaches all `build/*.html` files as assets (replacing any same-named asset from the prior run), and marks the release as the repo's latest. Produces stable public download URLs of the form `releases/download/latest-build/<game>.html`. `fail_on_unmatched_files: false` keeps docs-only pushes non-fatal. No new permissions needed; `contents: write` already covers release creation.

2. **ADR-0022 added to `docs/DECISIONS.md`.** Records the decision, the two alternatives considered (per-build tags and GitHub Pages), and the consequences.

## Previously done

- **Session 2026-06-03 (balance primitives + bundle CI):** `engine/balance.js` added (ADR-0020, `Engine.Balance` with difficulty curves and cost scaling); bundle regeneration moved to CI (ADR-0021, `scripts/build-bundle.sh` + `.github/workflows/bundle.yml`); `docs/resources/balance.md` added; CLAUDE.md §8 updated with balance-check authoring step and bundle CI rules.
- **Session 2026-05-26 (raster asset pipeline + animation communication format):** `scripts/build-game.sh` gained a functional `"assets"` array (base64-inlines PNG/JPG/WebP/GIF into an `ASSETS` global before sources); `docs/resources/assets.md` gained an asset-pipeline section and Piskel; `docs/ANIM_CONFIG.md` committed, defining the sprite-sheet sidecar (`<sheet>.anim.json`) and parallax sidecar (`parallax.anim.json`) formats.
- See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

Nothing blocked. Rolling GitHub Releases just landed (ADR-0022); permanent download URLs will go live after the PR merges and CI runs once. `Engine.Balance` is ready to use; no game consumes it yet. The natural first application is a game with an explicit difficulty ramp or upgrade economy (Survivors wave scaling, or a future incremental game).

## Next up

### Immediate: first real raster asset

The asset pipeline is in place but untested against a real image. The natural first exercise is Clown Brawler's gorilla or player sprite. Options, in order of effort:

- **Option A (Kenney adapt):** Find the closest Kenney pack ("Toon Characters 1"), commit the sheet, write `gorilla-sheet.anim.json` describing the walk/attack/die frames, and let Claude rewrite `GorillaEnemy` to use `SpriteSheet` instead of inline canvas calls. Fast, but the aesthetic match to "Clown Brawler" is loose.
- **Option B (Piskel custom):** Draw a 48x48 gorilla in Piskel (piskelapp.com, browser-based), export as PNG sprite sheet, commit, write the `.anim.json` sidecar. More work but full aesthetic control.

Either path requires Trevor to upload the PNG via GitHub web UI. Claude handles everything after that.

### Balance primitive expansion

`Engine.Balance` (ADR-0020) currently covers difficulty curves and cost scaling. The deferred primitives, each its own ADR and commit, are recorded with formulas in `docs/resources/balance.md`: diminishing-returns reducer `x/(x+k)`, multiplicative damage `atk*k/(k+def)`, pseudo-random distribution plus pity timers, XP-curve generators, prestige (cube-root) curves, and a DDA controller (EWMA smoothing + proportional correction + dead-zone hysteresis). Add the next one when a game needs it rather than speculatively.

### ParallaxBackground script

`docs/ANIM_CONFIG.md` defines the `parallax.anim.json` sidecar schema, but the `ParallaxBackground` script does not yet exist. Build it when the first game needs scrolling backgrounds. Natural candidate: Clown Brawler (belt-plane side-scroller) or a future driving/runner game. Takes a `layers` config array in its constructor; the sidecar is the communication format Trevor uses to specify it.

### Pipeline improvements

1. ~~**GitHub Releases step.**~~ Done (ADR-0022). Permanent download URLs live at `releases/download/latest-build/<game>.html`.
2. **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.
3. **Game scaffolding script.** `scripts/scaffold-game.sh` via `workflow_dispatch`. Reduces per-session boilerplate.
4. **Registry validation workflow.** Fails the build if a `.js` file in `scripts/` or `scenes/` lacks a registry entry.
5. **GitHub Pages.** Indexed browsing of all built games from a root URL. Right next step after rolling releases when discoverability matters more than direct-download links.

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
- **Minesweeper build bundle drift.** Its inlined build is stale; deferred until the game is next rebuilt. Distinct from engine bundle regeneration, which is now automated (ADR-0021).
- **Project knowledge bundle mirror is stale.** The repo bundle is now ~70 KB and CI-regenerated; the Project knowledge copy is the older ~49 KB version (2026-05-20). Trevor should re-upload `engine/engine.bundle.js` to Project knowledge at convenience. Sessions can always fetch the current repo bundle, so this is an optimization, not a correctness issue.
- **`docs/project-bootstrap.md` is out of date.** It still describes the manual bundle-regeneration process and the (now-outdated) claim that `raw.githubusercontent.com` is not reachable. Needs a refresh to point at the CI bundle workflow, then a manual re-upload to Project knowledge.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

## Open questions

- **Clown Brawler sprite decision**: Kenney adapt vs. Piskel custom (see Next up).
- **Drift v1 known issues**: scope TBD.
- **Ink pre-compilation architecture**: see Next up item 2.
- **Bundle comment trimming**: the CI bundle restores full vendored-lib comments (~70 KB). If session fetch cost becomes a concern, `build-bundle.sh` could strip comments from the vendored libraries. Not worth doing now.

## Notes for the next session

- **Permanent game download URLs (ADR-0022).** Each merged push to main updates the rolling `latest-build` GitHub Release. Download URLs: `https://github.com/fredthesled/browser-game-engine/releases/download/latest-build/<game>.html`. Three games currently in the release: `drift.html`, `survivors-balance.html`, `libromancer.html`. Adding a new game with a `build-manifest.json` automatically includes it in the next release.
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).** To change the engine: edit the source file(s), and add or remove a line in `engine/bundle-manifest.json` when adding or removing a module. `.github/workflows/bundle.yml` regenerates `engine/engine.bundle.js`, `node --check`s it, and commits it back. Expect the committed bundle to lag a source push by one short CI run. Do not emit the bundle in a tool call; that path timed out this session (retro 9b).
- **Name the balance math (ADR-0020).** When building or changing a difficulty ramp, cost/upgrade curve, damage, drop rate, or progression, name the applicable `Engine.Balance` primitive or `docs/resources/balance.md` formula in the plan before coding. `balance.md` carries the formulas and the deferred roadmap.
- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array, commit. ASSETS global is injected before source files in the build.
- **Animation communication format.** Read `docs/ANIM_CONFIG.md` when working on any sprite or parallax setup. When Trevor pastes or references a `.anim.json` sidecar, that is the authoritative source for frame layout and animation parameters.
- **ezgif.com/sprite-cutter** is the recommended browser tool for verifying Kenney sheet dimensions before upload.
- **ParallaxBackground script not yet built.** Schema for its config is in `docs/ANIM_CONFIG.md`. Build the script when the first game needs it.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Manifest schema** documented in `scripts/build-game.sh` header. Optional `"assets"` array supported alongside `"concat"` and `"bootstrap"`.
- **Engine bundle fetch target**: `engine/engine.bundle.js`. Project knowledge copy is stale (see Deferred housekeeping); fetch the repo bundle when current source is needed.
- **Tween build-order**: no dependencies; include before game scripts.
- **`create_or_update_file` over `push_files` for large single files.** More reliable for files >20 KB. Large single-file pushes up to ~80 KB are reliable; beyond that, use the pipeline (this is exactly why the engine bundle moved to CI).
- **Drift concat order**: `engine/lib/inkjs.js` -> `engine/engine.bundle.js` -> `scripts/bootstrap.js` -> `scripts/pause-overlay.js` -> `games/drift/encounters/sources.js` -> scenes -> `bootstrapGame({...})`.
- **Node.js 24 opt-in** active via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` in both workflows. No-op after June 2, 2026.
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
