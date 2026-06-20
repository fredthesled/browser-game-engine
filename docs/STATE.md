# State

Last updated: 2026-06-20

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, and the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`).

## What was done in the most recent session

**Session 2026-06-20 (Drift crew AI + Balance.damage):**

1. **`_redistributeCrew()` implemented in `games/drift/scenes/match.js`.** The stub that had been commented out since Drift v1 is now live. After each encounter resolves, `_redistributeCrew()` fills any vacant critical room (helm → weapons → shields → engines) from idle crew in the medical bay first, then from surplus members in rooms with more than one active crew. Uses a snapshot of counts before any moves to avoid order-dependent bugs. The crew header comment updated to remove the "deferred" note.

2. **`Engine.Balance.damage(atk, def, opts)` added to `engine/balance.js`.** Multiplicative damage formula: `atk * k / (k + def)`, `k` defaulting to 100. At `def=0`, full `atk` is dealt; at `def=k`, half; defense never drives damage to zero. `docs/resources/balance.md` updated: "Base attack vs defense" row promoted from deferred to implemented; a `damage` subsection added under Implemented primitives (matching the style of existing entries). Editing `engine/balance.js` triggers CI bundle regeneration (ADR-0021) — no manual bundle work needed.

**Note on open PRs:** Six draft PRs (#1–#7, minus #4 which uses `claude/balance-diminish`) are queued on the same base commit as this session. All touch `docs/STATE.md` and some touch `docs/DECISIONS.md`; ADR numbers in those PRs will collide on merge. Resolve by renumbering sequentially from ADR-0022 after merging, keeping all session log entries in STATE.md.

## What was done in the most recent session (prior)

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

Nothing blocked. Six PRs (#1–#3, #5–#7) and PR #4 are queued for review. ADR renumbering needed on merge. Drift crew redistribution is live; balance primitives growing incrementally.

## Next up

### Immediate: first real raster asset

The asset pipeline is in place but untested against a real image. The natural first exercise is Clown Brawler's gorilla or player sprite. Options, in order of effort:

- **Option A (Kenney adapt):** Find the closest Kenney pack ("Toon Characters 1"), commit the sheet, write `gorilla-sheet.anim.json` describing the walk/attack/die frames, and let Claude rewrite `GorillaEnemy` to use `SpriteSheet` instead of inline canvas calls. Fast, but the aesthetic match to "Clown Brawler" is loose.
- **Option B (Piskel custom):** Draw a 48x48 gorilla in Piskel (piskelapp.com, browser-based), export as PNG sprite sheet, commit, write the `.anim.json` sidecar. More work but full aesthetic control.

Either path requires Trevor to upload the PNG via GitHub web UI. Claude handles everything after that.

### Balance primitive expansion

`Engine.Balance` (ADR-0020) currently covers difficulty curves, cost scaling, and multiplicative damage. The deferred primitives, each its own ADR and commit, are recorded with formulas in `docs/resources/balance.md`: diminishing-returns reducer `x/(x+k)`, pseudo-random distribution plus pity timers, XP-curve generators, prestige (cube-root) curves, and a DDA controller (EWMA smoothing + proportional correction + dead-zone hysteresis). Add the next one when a game needs it rather than speculatively.

### ParallaxBackground script

`docs/ANIM_CONFIG.md` defines the `parallax.anim.json` sidecar schema, but the `ParallaxBackground` script does not yet exist. Build it when the first game needs scrolling backgrounds. Natural candidate: Clown Brawler (belt-plane side-scroller) or a future driving/runner game. Takes a `layers` config array in its constructor; the sidecar is the communication format Trevor uses to specify it.

### Pipeline improvements

1. **GitHub Releases step.** `softprops/action-gh-release@v2` with a rolling `latest-build` tag. Permanent public download URLs for built games.
2. **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.
3. **Game scaffolding script.** `scripts/scaffold-game.sh` via `workflow_dispatch`. Reduces per-session boilerplate.
4. **Registry validation workflow.** Fails the build if a `.js` file in `scripts/` or `scenes/` lacks a registry entry.

### Other game work

5. **Drift v1 bug fixes.**
6. ~~**Drift crew AI.** `_redistributeCrew()` implemented (session 2026-06-20).~~
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
- **PUSH BLOCKER (session 2026-06-20):** This session's branch `claude/youthful-maxwell-x3bqxe` could not be pushed to GitHub — all write operations return 403 (both git push and GitHub API). The code is committed locally. The next session should push these changes or re-apply them: `_redistributeCrew()` in `games/drift/scenes/match.js` and `Engine.Balance.damage()` in `engine/balance.js`.
