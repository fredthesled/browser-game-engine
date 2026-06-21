# State

Last updated: 2026-06-20

## Current status

Nine games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, Drift v1, Libromancer, and Marginalia. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`), and rolling GitHub Releases with permanent public download URLs (ADR-0022).

## What was done in the most recent session

**Session 2026-06-20 (marginalia combat scene):**

1. **`games/marginalia/scenes/match.js` added.** `LibraryMatchScene` — the combat loop that was missing from the Marginalia scaffold. Implements the full state machine: `PLAYER_TURN → ANIMATING → resolveEnemy → PLAYER_TURN`, with `ENCOUNTER_WIN`, `VICTORY`, and `GAME_OVER` terminals. Spell casting applies the `effect(state)` contract from `spells.js` — including `applySpellEffect` for the `citation` spell's repeat mechanic, `chainBonus` accumulation, `extraCastThisTurn` multi-cast, and encounter `armor` absorption. Enemy turns handle heal intervals (`healEvery`/`healAmount`), alt-attacks that bypass defense (`altAttackEvery`/`altAttackDmg`), stun from `ex_libris`, and `redaction`'s attack modifier. Victory/game-over auto-transitions (0.65s) to `LibraryGameOverScene` with outcome data. Player starts at 24 HP; heals 4 HP between encounters (capped at 24). Unlocks one of the six `UNLOCK_SPELL_IDS` per encounter cleared (in order), persisted via `Engine.storage`.

2. **`games/marginalia/build-manifest.json` added.** Puts Marginalia on the CI build pipeline (`.github/workflows/build.yml`). Canvas preset: regular 900×620, compact 600×820. Concat order: engine bundle → bootstrap → spells → encounters → menu → deck-select → game-over → match.
** Posted a comment on PR #14 with a suggested merge order. Created a Gmail draft to trevordoner@gmail.com with the full backlog analysis.


Merges complete as of 2026-06-20.
After all merges: one cleanup commit to fix ADR number collisions in DECISIONS.md.

### Marginalia balance tuning

Playable but untuned. After a test run, adjust:
- Starting HP (currently 24; grand_index does 6+8-pierce per cycle — may be too punishing)
- Inter-encounter heal (currently 4 HP)
- Whether stun should prevent alt-attacks (currently it does not)

No code changes needed until someone has played it.

### Immediate: first real raster asset

**Session 2026-06-03 (balance primitives + bundle CI):**

1. **Minesweeper build manifest added (`games/minesweeper/build-manifest.json`).** Puts Minesweeper on the CI build pipeline, fixing the "Minesweeper build bundle drift" deferred item. Concat order: `engine/engine.bundle.js` → `scripts/bootstrap.js` → `scripts/pause-overlay.js` → `games/minesweeper/scenes/menu.js` → `games/minesweeper/scenes/match.js`. Bootstrap upgraded from the old manual inline IIFE to `bootstrapGame(...)` per ADR-0017. `suppressContextMenu: true` preserved (right-click toggles flags). CI will regenerate `build/minesweeper.html` on the next main-branch push, and the rolling `latest-build` release will include `minesweeper.html` as a permanent download URL.

**Session 2026-06-19 (GitHub Releases — rolling permanent download URLs):**

1. **ADR-0022: rolling `latest-build` GitHub Release.** Added a "Publish rolling `latest-build` GitHub Release" step to the `build` job in `.github/workflows/build.yml`. After every successful build the step creates or upserts a release tagged `latest-build`, attaches all `build/*.html` files as assets (replacing any same-named asset from the prior run), and marks the release as the repo's latest. Produces stable public download URLs of the form `releases/download/latest-build/<game>.html`. `fail_on_unmatched_files: false` keeps docs-only pushes non-fatal. No new permissions needed; `contents: write` already covers release creation.

2. **ADR-0022 added to `docs/DECISIONS.md`.** Records the decision, the two alternatives considered (per-build tags and GitHub Pages), and the consequences.

## Previously done

- **Session 2026-06-03 (balance primitives + bundle CI):** `engine/balance.js` added (ADR-0020, `Engine.Balance` with difficulty curves and cost scaling); bundle regeneration moved to CI (ADR-0021, `scripts/build-bundle.sh` + `.github/workflows/bundle.yml`); `docs/resources/balance.md` added; CLAUDE.md §8 updated with balance-check authoring step and bundle CI rules.
- **Session 2026-05-26 (raster asset pipeline + animation communication format):** `scripts/build-game.sh` gained a functional `"assets"` array (base64-inlines PNG/JPG/WebP/GIF into an `ASSETS` global before sources); `docs/resources/assets.md` gained an asset-pipeline section and Piskel; `docs/ANIM_CONFIG.md` committed, defining the sprite-sheet sidecar (`<sheet>.anim.json`) and parallax sidecar (`parallax.anim.json`) formats.
- See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

1. ~~**GitHub Releases step.**~~ Done (2026-06-20). Rolling `latest-build` release publishes all `build/*.html` files as assets on every main push.
2. **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.
3. **Game scaffolding script.** `scripts/scaffold-game.sh` via `workflow_dispatch`. Reduces per-session boilerplate.
4. **Registry validation workflow.** Fails the build if a `.js` file in `scripts/` or `scenes/` lacks a registry entry.

## Next up (after merge session)

- **Pity timer / pseudo-random distribution primitive** — depends on Engine.PRNG (PR #9) being merged first. Formula in `docs/resources/balance.md`.
- **Apply Engine.Balance.DDA to Survivors wave scaling** — first real game use of the DDA controller.
- **Apply Engine.PRNG to Minesweeper / procedural games** — replace `Math.random()` for seeded/reproducible runs.
- **First real raster asset** — still requires Trevor to upload a PNG. Options: Kenney adapt or Piskel custom for Clown Brawler gorilla.
- **Ink pre-compilation** — `npx inkjs` at build time, ~100 KB saving for narrative games. Needs scoping.
- **ADR number cleanup** — one commit after all PRs merge, renumber from ADR-0022 sequentially.

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
- **Minesweeper build bundle drift.** Addressed by PR #1 (new manifest triggers fresh build).
- **Project knowledge bundle mirror is stale.** Trevor should re-upload `engine/engine.bundle.js` to Project knowledge at convenience.
- **`docs/project-bootstrap.md` is out of date.** Needs refresh after PRs merge.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

## Notes for the next session

- **Game builds have permanent download URLs.** `https://github.com/fredthesled/browser-game-engine/releases/download/latest-build/<name>.html`. The rolling `latest-build` release is recreated on every main push by `.github/workflows/build.yml`. Marked `--prerelease` so it doesn't surface as "latest release".
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).** To change the engine: edit the source file(s), and add or remove a line in `engine/bundle-manifest.json` when adding or removing a module. `.github/workflows/bundle.yml` regenerates `engine/engine.bundle.js`, `node --check`s it, and commits it back. Expect the committed bundle to lag a source push by one short CI run. Do not emit the bundle in a tool call; that path timed out this session (retro 9b).
- **Name the balance math (ADR-0020).** When building or changing a difficulty ramp, cost/upgrade curve, damage, drop rate, or progression, name the applicable `Engine.Balance` primitive or `docs/resources/balance.md` formula in the plan before coding. `balance.md` carries the formulas and the deferred roadmap.
- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array, commit. ASSETS global is injected before source files in the build.
- **Animation communication format.** Read `docs/ANIM_CONFIG.md` when working on any sprite or parallax setup. When Trevor pastes or references a `.anim.json` sidecar, that is the authoritative source for frame layout and animation parameters.
- **ezgif.com/sprite-cutter** is the recommended browser tool for verifying Kenney sheet dimensions before upload.
- **ParallaxBackground script not yet built.** Schema for its config is in `docs/ANIM_CONFIG.md`. Build the script when the first game needs it.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
