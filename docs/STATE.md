# State

Last updated: 2026-06-20

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, and the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`).

## What was done in the most recent session

**Session 2026-06-20 (build manifests for remaining games):**

Note: Five earlier draft PRs are open and awaiting review — #1/5 (rolling GitHub Release), #2 (registry validation), #3 (scaffolding script), #4 (balance diminish), #6 (ParallaxBackground + Clown Brawler Tween + manifest). All target `main`. Expect STATE.md merge conflicts when landing; resolve by keeping all session log entries.

1. **Build manifests added for all remaining games.** Four games now have `build-manifest.json` files that put them on the CI pipeline and (once PR #1/#5 lands) on the rolling GitHub Release:
   - **Pong** (`games/pong/build-manifest.json`): 800×600, `PongMenuScene`, deps: `RectRenderer`, `Collider`.
   - **Survivors** (`games/survivors/build-manifest.json`): 800×600, `SurvivorsMenuScene`, deps: `RectRenderer`, `Collider`, `PauseOverlay`. Note: `survivors-levelup.js` is a dead file (carries `DEAD-FILE` header) and is excluded from the manifest.
   - **Horses Teach Typing** (`games/horses-teach-typing/build-manifest.json`): 800×500, `HTTMenuScene`, deps: `PauseOverlay`, `RhythmLetter`.
   - **Party House** (`games/party-house/build-manifest.json`): 960×540, `PHMenuScene`, `gameName: 'party-house'` (storage for high score).

   All four use `bootstrapGame()` per ADR-0017. These are the last games without manifests — every game is now on the CI pipeline.

## Previously done

**Session 2026-06-03 (balance primitives + bundle CI):**

1. **`engine/balance.js` added (ADR-0020).** `Engine.Balance`, a namespace of pure, stateless functions. First increment: `difficulty(t, opts)` (curve dispatcher over linear / exponential / logarithmic / logistic, default logistic) and `cost(n, opts)` (`base * rate^n`, default rate 1.10, band 1.07-1.15), plus closed-form `bulkCost(owned, count, opts)` and `maxAffordable(owned, currency, opts)`. Opt-in per game; the engine core does not call it. Verified locally against brute-force summation and the Clicker Heroes cost reference. It is the twelfth bundled module (concat step 12).

2. **`docs/resources/balance.md` added.** Concise formula reference: the mechanic-to-formula table, the implemented primitives with formulas and default constants, the deferred-primitive roadmap (diminishing returns, multiplicative damage, pseudo-random distribution and pity timers, XP curves, prestige curves, a DDA controller) with formulas recorded, key constants, and caveats. Indexed in `docs/resources/INDEX.md`. This is the reference the new balance-check rule points at.

3. **Balance-check authoring step added to CLAUDE.md §8.** Any build or change that introduces or modifies a mechanic with a difficulty ramp, a cost or upgrade curve, damage, drop rates, or progression now names the applicable `Engine.Balance` primitive (or `balance.md` formula) in the plan before coding. Direct countermeasure to the difficulty-overcorrection pattern.

4. **Engine bundle regeneration moved to CI (ADR-0021).** Added `engine/bundle-manifest.json` (ordered source list), `scripts/build-bundle.sh` (concatenates the manifest sources behind banners under an auto-generated header with per-source git blob SHAs), and `.github/workflows/bundle.yml` (regenerates on any bundled-source change, runs `node --check`, commits the bundle back as `github-actions[bot]`). The bundle is no longer hand-built. CLAUDE.md §8 changed from "regenerate in the same commit" to "edit sources only; CI regenerates; never hand-build the bundle." Supersedes the manual-regeneration portion of ADR-0016.

5. **Bundle drift incident, resolved.** The balance module's first commit omitted the regenerated bundle, then a manual fix attempt (emitting the full ~49 KB bundle in one call) timed out. This motivated item 4. The CI workflow's first run regenerated the bundle correctly; it now includes `Engine.Balance`. Captured as retro 9b in CLAUDE.md. Note the regenerated bundle is ~70 KB (up from ~49 KB) because the runner concatenates the full vendored `sfxr.js` / `riffwave.js` sources, whereas the previous hand-built bundle had condensed comments. Runtime is identical; permitted by ADR-0016.

6. **Docs updated.** `docs/DECISIONS.md` (ADR-0020, ADR-0021, and supersession notes on ADR-0016), `docs/ARCHITECTURE.md` (balance module in the table, file layout, concat order, and a Balance class contract; CI bundle rule), `CLAUDE.md` (§8 rules above plus retro 9b and a §4 note that emitting large files in one call is a known-weak operation).

## Previously done

- **Session 2026-05-26 (raster asset pipeline + animation communication format):** `scripts/build-game.sh` gained a functional `"assets"` array (base64-inlines PNG/JPG/WebP/GIF into an `ASSETS` global before sources); `docs/resources/assets.md` gained an asset-pipeline section and Piskel; `docs/ANIM_CONFIG.md` committed, defining the sprite-sheet sidecar (`<sheet>.anim.json`) and parallax sidecar (`parallax.anim.json`) formats.
- See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

Nothing blocked. Five draft PRs open: #1/#5 (rolling GitHub Release), #2 (registry validation), #3 (scaffolding script), #4 (balance-diminish), #6 (ParallaxBackground + Clown Brawler Tween + manifest). All target `main`.

## Next up

### Immediate: first real raster asset

The asset pipeline is in place but untested against a real image. The natural first exercise is Clown Brawler's gorilla or player sprite. Options, in order of effort:

- **Option A (Kenney adapt):** Find the closest Kenney pack ("Toon Characters 1"), commit the sheet, write `gorilla-sheet.anim.json` describing the walk/attack/die frames, and let Claude rewrite `GorillaEnemy` to use `SpriteSheet` instead of inline canvas calls. Fast, but the aesthetic match to "Clown Brawler" is loose.
- **Option B (Piskel custom):** Draw a 48x48 gorilla in Piskel (piskelapp.com, browser-based), export as PNG sprite sheet, commit, write the `.anim.json` sidecar. More work but full aesthetic control.

Either path requires Trevor to upload the PNG via GitHub web UI. Claude handles everything after that.

### Balance primitive expansion

`Engine.Balance` (ADR-0020) currently covers difficulty curves and cost scaling. The deferred primitives, each its own ADR and commit, are recorded with formulas in `docs/resources/balance.md`: diminishing-returns reducer `x/(x+k)` (drafted in PR #4), multiplicative damage `atk*k/(k+def)`, pseudo-random distribution plus pity timers, XP-curve generators, prestige (cube-root) curves, and a DDA controller. Add the next one when a game needs it rather than speculatively.

### Pipeline improvements

1. ~~**GitHub Releases step.**~~ Drafted in PRs #1 and #5. Rolling `latest-build` pre-release gives permanent public download URLs.
2. **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.
3. ~~**Game scaffolding script.**~~ Drafted in PR #3.
4. ~~**Registry validation workflow.**~~ Drafted in PR #2.

### Other game work

5. **Drift v1 bug fixes.**
6. **Drift crew AI.** `_redistributeCrew()` stub in `DriftMatchScene._resolveEncounter()`.
7. ~~**Apply Tween to Clown Brawler.**~~ Drafted in PR #6.
8. ~~**Build manifests for all games.**~~ Done (2026-06-20). All seven games now have manifests.

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
- **Minesweeper build bundle drift.** Minesweeper now has a build manifest (PR #1 adds it), so it will get a fresh build once the CI pipeline is live.
- **Project knowledge bundle mirror is stale.** The repo bundle is now ~70 KB and CI-regenerated; the Project knowledge copy is the older ~49 KB version (2026-05-20). Trevor should re-upload `engine/engine.bundle.js` to Project knowledge at convenience.
- **`docs/project-bootstrap.md` is out of date.** It still describes the manual bundle-regeneration process. Needs a refresh.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

## Open questions

- **Clown Brawler sprite decision**: Kenney adapt vs. Piskel custom (see Next up).
- **Drift v1 known issues**: scope TBD.
- **Ink pre-compilation architecture**: see Next up item 2.
- **PR merge order**: PRs #1-#6 all target main from the same base commit. Merge order is arbitrary; expect STATE.md conflicts — resolve by keeping all session log entries.
- **Branch creation blocked in MCP**: The `mcp__github__*` server can't create branches (403); `mcp__GitHub__*` can. Use `mcp__GitHub__push_files` for future branch creation.

## Notes for the next session

- **5 draft PRs open** (#1/#5 GitHub releases, #2 registry validation, #3 scaffolding, #4 balance-diminish, #6 ParallaxBackground+Clown Brawler). Plus this PR (#7, build manifests). All target `main` from the same base commit. Merge order is arbitrary.
- **Every game now has a build manifest.** Once the PRs land, all seven games will build and appear on the rolling release.
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).** To change the engine: edit the source file(s), and add or remove a line in `engine/bundle-manifest.json` when adding or removing a module.
- **Name the balance math (ADR-0020).** When building or changing a difficulty ramp, cost/upgrade curve, damage, drop rate, or progression, name the applicable `Engine.Balance` primitive or `docs/resources/balance.md` formula in the plan before coding.
- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array, commit. ASSETS global is injected before source files in the build.
- **Animation communication format.** Read `docs/ANIM_CONFIG.md` when working on any sprite or parallax setup.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Drift concat order**: `engine/lib/inkjs.js` -> `engine/engine.bundle.js` -> `scripts/bootstrap.js` -> `scripts/pause-overlay.js` -> `games/drift/encounters/sources.js` -> scenes -> `bootstrapGame({...})`.
- **Dead files**: `grep -r DEAD-FILE` to enumerate. `survivors-levelup.js` is dead and excluded from the Survivors manifest.
- **Use `mcp__GitHub__push_files` (uppercase) for file pushes.** The lowercase `mcp__github__push_files` returns 403 when creating branches.
