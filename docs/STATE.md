# State

Last updated: 2026-06-21

## Current status

Nine games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, Drift v1, Libromancer, and Marginalia. Plus `poc-square` as an engine smoke test. All nine games have `build-manifest.json` files and build via CI.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`), rolling GitHub Releases with permanent public download URLs (ADR-0022), registry validation in CI (ADR-0023), and `ParallaxBackground` script.

## What was done in the most recent session

**Session 2026-06-21 (ADR-0023 write-up + STATE.md cleanup):**

This session started from a stale local clone predating several merged PRs and initially attempted to re-implement the Marginalia combat scene (already completed in PR #17). The duplicate PR #18 was opened and immediately closed. The remainder of the session was spent on the "ADR number cleanup" task from the backlog:

1. **ADR-0023 written in `docs/DECISIONS.md`.** Registry validation was merged in `1bde3ce` (`ci: registry validation in validate job (ADR-0023)`) but had no formal entry in DECISIONS.md. ADR-0023 now documents the decision, the two alternatives considered (pre-commit hook, auto-generation), and the consequences.

2. **`docs/STATE.md` updated.** Corrected stale entries: registry validation and ParallaxBackground are both done; all games have build manifests; removed the "ParallaxBackground script not yet built" note from the session notes.

## Previously done

**Session 2026-06-20 (Marginalia + ADR-0022 + ADR-0023 + ParallaxBackground + all game manifests):**

Multiple PRs merged from concurrent sessions:

1. **`games/marginalia/scenes/match.js` added** (PR #17) — `LibraryMatchScene` completes Marginalia. Full state machine: `PLAYER_TURN → ANIMATING → resolveEnemy → PLAYER_TURN`, terminals `ENCOUNTER_WIN`, `VICTORY`, `GAME_OVER`. Player starts at 24 HP, heals 4 HP between encounters. Unlocks one spell per encounter via `Engine.storage`. Marginalia balance is untested; tuning targets: starting HP (24 may be low against Grand Index's 6+8-piercing-per-cycle) and inter-encounter heal (4 HP).

2. **ADR-0022: rolling `latest-build` GitHub Release** — permanent public download URLs for all built games via `softprops/action-gh-release@v2`. URLs: `github.com/fredthesled/browser-game-engine/releases/download/latest-build/<game>.html`.

3. **ADR-0023: registry validation in CI** — `scripts/` and `scenes/` root `.js` files must appear in their `_registry.md`. Blocks the build if any are missing.

4. **`scripts/parallax-background.js` added** — `ParallaxBackground` script; first consumer is Clown Brawler. Config via `parallax.anim.json` sidecar (see `docs/ANIM_CONFIG.md`).

5. **Clown Brawler Tween refactor** — `FloatingBalloon` alpha fade and gorilla dying-state transition converted to `Tween`.

6. **All games now have `build-manifest.json`** — Pong, Minesweeper, Libromancer, and Marginalia were the remaining holdouts; now every game builds via CI.

**Session 2026-06-03 (balance primitives + bundle CI):**

`engine/balance.js` added (ADR-0020, `Engine.Balance` with difficulty curves and cost scaling); bundle regeneration moved to CI (ADR-0021, `scripts/build-bundle.sh` + `.github/workflows/bundle.yml`); `docs/resources/balance.md` added; CLAUDE.md §8 updated with balance-check authoring step and bundle CI rules.

**Session 2026-05-26 (raster asset pipeline + animation communication format):**

`scripts/build-game.sh` gained a functional `"assets"` array; `docs/resources/assets.md` updated; `docs/ANIM_CONFIG.md` committed.

- See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

Nothing blocked. All planned infrastructure items from the 2026-06-20 merge session are complete.

## Next up

- **Marginalia balance pass.** Unplayed; first targets: starting HP (24), inter-encounter heal (4), whether stun prevents alt-attacks (currently it does not). Adjust after Trevor plays.
- **Pity timer / pseudo-random distribution primitive.** Formula in `docs/resources/balance.md`. Implement as `Engine.Balance.prd(p, streak)` when a game needs it.
- **Apply Engine.Balance.DDA to Survivors wave scaling.** First real game use of the DDA controller.
- **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.
- **Game scaffolding script.** `scripts/scaffold-game.sh` via `workflow_dispatch`. Reduces per-session boilerplate.
- **First real raster asset.** Still requires Trevor to upload a PNG. Options: Kenney adapt or Piskel custom for Clown Brawler gorilla.

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
- **Project knowledge bundle mirror is stale.** Trevor should re-upload `engine/engine.bundle.js` to Project knowledge at convenience.
- **`docs/project-bootstrap.md` is out of date.** Describes old manual bundle process; needs a refresh.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

## Notes for the next session

- **Game builds have permanent download URLs.** `https://github.com/fredthesled/browser-game-engine/releases/download/latest-build/<name>.html`. Rolling `latest-build` release recreated on every main push by `.github/workflows/build.yml`.
- **All 9 games build via CI.** Every game has a `build-manifest.json`. Adding a new game: create `games/<name>/build-manifest.json`; the workflow discovers it automatically.
- **Registry validation is enforced in CI.** Any new `.js` at the root of `scripts/` or `scenes/` needs a `_registry.md` entry in the same commit or the validate job blocks the build (ADR-0023).
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).** Edit source files and update `engine/bundle-manifest.json` for module additions/removals. `.github/workflows/bundle.yml` regenerates the bundle and commits it back.
- **Name the balance math (ADR-0020).** When introducing a difficulty ramp, cost curve, damage formula, or progression mechanic, name the applicable `Engine.Balance` primitive or `docs/resources/balance.md` formula in the plan before coding.
- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array. ASSETS global is injected before source files.
- **Animation communication format.** Read `docs/ANIM_CONFIG.md` when working on any sprite or parallax setup. `ParallaxBackground` script is in `scripts/parallax-background.js`.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
