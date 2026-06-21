# State

Last updated: 2026-06-20

## Current status

Nine games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, Drift v1, Libromancer, and Marginalia. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (module set in `engine/bundle-manifest.json`) + bundle, audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`), rolling GitHub Releases with permanent public download URLs (ADR-0022), CI registry validation (ADR-0023), game scaffolding via `workflow_dispatch` (ADR-0024), and seeded RNG (`Engine.PRNG`, ADR-0026).

## What was done in the most recent session

**Session 2026-06-20 (post-merge documentation cleanup):**

The accumulated PR backlog was merged to `main` (registry validation, game scaffolding, Engine.PRNG, ParallaxBackground, build manifests, rolling Releases, Minesweeper and Marginalia manifests, and others). This session reconciles the documentation against what the merge actually landed.

1. **`docs/project-bootstrap.md` refreshed** (commit `753e6a6e`). Corrected stale facts that contradicted settled ADRs (manual bundle regeneration and manual builds, both now CI per ADR-0019 and ADR-0021; the `raw.githubusercontent.com` allowlist note), and converted the drift-prone sections (module enumeration, architecture summary, dated 2026-05-13 snapshot) into pointers to `engine/bundle-manifest.json`, `docs/ARCHITECTURE.md`, and `docs/STATE.md` so they cannot drift stale again. Resolves the "project-bootstrap out of date" housekeeping item. The project-knowledge mirror of this file is now stale and should be re-uploaded.

2. **`docs/DECISIONS.md` ADR reconstruction (remaining).** The merge dropped the ADR bodies for registry validation, game scaffolding, and Engine.PRNG even though their code and workflows landed, leaving `DECISIONS.md` a clean ADR-0001..0022 sequence that disagrees with the repo (an ADR-0003 bug: PRs independently re-claimed ADR-0022 off the same base, and the later additions were clobbered during conflict resolution). Reconstruction is drafted: restore **ADR-0023 (registry validation)**, **ADR-0024 (game scaffolding)**, and **ADR-0026 (Engine.PRNG)** at the numbers their shipped code already references (`scaffold.yml` cites ADR-0023, `engine/prng.js` cites ADR-0026, and PR #9's `ARCHITECTURE.md` edit survived), record **ADR-0025 as withdrawn** (number claimed by a superseded draft PR), and correct **ADR-0022**'s prose to match the shipped implementation (gh-CLI delete-and-recreate of the `latest-build` release marked `--prerelease`, not a `softprops` upsert marked latest). Commit pending: `DECISIONS.md` is 44 KB, and a full-file rewrite exceeds the 30 KB single-push safety check, so the ADR bodies are delivered in chat for paste, or a direct push on request.

**Session 2026-06-20 (marginalia combat scene):**

1. **`games/marginalia/scenes/match.js` added.** `LibraryMatchScene` — the combat loop that was missing from the Marginalia scaffold. Implements the full state machine: `PLAYER_TURN → ANIMATING → resolveEnemy → PLAYER_TURN`, with `ENCOUNTER_WIN`, `VICTORY`, and `GAME_OVER` terminals. Spell casting applies the `effect(state)` contract from `spells.js` — including `applySpellEffect` for the `citation` spell's repeat mechanic, `chainBonus` accumulation, `extraCastThisTurn` multi-cast, and encounter `armor` absorption. Enemy turns handle heal intervals (`healEvery`/`healAmount`), alt-attacks that bypass defense (`altAttackEvery`/`altAttackDmg`), stun from `ex_libris`, and `redaction`'s attack modifier. Victory/game-over auto-transitions (0.65s) to `LibraryGameOverScene` with outcome data. Player starts at 24 HP; heals 4 HP between encounters (capped at 24). Unlocks one of the six `UNLOCK_SPELL_IDS` per encounter cleared (in order), persisted via `Engine.storage`.

2. **`games/marginalia/build-manifest.json` added.** Puts Marginalia on the CI build pipeline (`.github/workflows/build.yml`). Canvas preset: regular 900×620, compact 600×820. Concat order: engine bundle → bootstrap → spells → encounters → menu → deck-select → game-over → match.

### Marginalia balance tuning

Playable but untuned. After a test run, adjust:
- Starting HP (currently 24; grand_index does 6+8-pierce per cycle — may be too punishing)
- Inter-encounter heal (currently 4 HP)
- Whether stun should prevent alt-attacks (currently it does not)

No code changes needed until someone has played it.

## Previously done

- **Session 2026-06-19 (GitHub Releases — rolling permanent download URLs):** ADR-0022 added a "Publish rolling `latest-build` GitHub Release" step to the `build` job in `.github/workflows/build.yml`, producing stable public download URLs of the form `releases/download/latest-build/<game>.html`. (Note: the shipped step uses the `gh` CLI to delete and recreate the `latest-build` release and tag on each run, marked `--prerelease`; the ADR-0022 prose in `DECISIONS.md` predates that implementation and is corrected in the current cleanup session.)
- **Session 2026-06-03 (balance primitives + bundle CI):** `engine/balance.js` added (ADR-0020, `Engine.Balance` with difficulty curves and cost scaling); bundle regeneration moved to CI (ADR-0021, `scripts/build-bundle.sh` + `.github/workflows/bundle.yml`); `docs/resources/balance.md` added; CLAUDE.md §8 updated with balance-check authoring step and bundle CI rules. Minesweeper build manifest added (`games/minesweeper/build-manifest.json`), putting Minesweeper on the CI pipeline with `bootstrapGame(...)` and `suppressContextMenu: true`.
- **Session 2026-05-26 (raster asset pipeline + animation communication format):** `scripts/build-game.sh` gained a functional `"assets"` array (base64-inlines PNG/JPG/WebP/GIF into an `ASSETS` global before sources); `docs/resources/assets.md` gained an asset-pipeline section and Piskel; `docs/ANIM_CONFIG.md` committed, defining the sprite-sheet sidecar (`<sheet>.anim.json`) and parallax sidecar (`parallax.anim.json`) formats.
- See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

1. **Ink pre-compilation.** `npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.

(Game scaffolding and registry validation, previously listed here, merged this cycle as ADR-0024 and ADR-0023.)

## Next up

- **Pity timer / pseudo-random distribution primitive** — now unblocked: `Engine.PRNG` (ADR-0026) is merged. Formula in `docs/resources/balance.md`.
- **Apply Engine.Balance.DDA to Survivors wave scaling** — first real game use of the DDA controller.
- **Apply Engine.PRNG to Minesweeper / procedural games** — replace `Math.random()` for seeded/reproducible runs.
- **Exercise `ParallaxBackground`** — the script merged (PR #6) but no game uses it yet. Config schema is in `docs/ANIM_CONFIG.md`.
- **First real raster asset** — still requires Trevor to upload a PNG. Options: Kenney adapt or Piskel custom for the Clown Brawler gorilla.
- **Ink pre-compilation** — `npx inkjs` at build time, ~100 KB saving for narrative games. Needs scoping.

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
- **Project knowledge bootstrap mirror is stale.** `docs/project-bootstrap.md` was refreshed this session; re-upload it to Project knowledge so fresh sessions load the current version.

## Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

## Notes for the next session

- **Game builds have permanent download URLs.** `https://github.com/fredthesled/browser-game-engine/releases/download/latest-build/<name>.html`. The rolling `latest-build` release is recreated on every main push by `.github/workflows/build.yml`. Marked `--prerelease` so it doesn't surface as "latest release".
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).** To change the engine: edit the source file(s), and add or remove a line in `engine/bundle-manifest.json` when adding or removing a module. `.github/workflows/bundle.yml` regenerates `engine/engine.bundle.js`, `node --check`s it, and commits it back. Expect the committed bundle to lag a source push by one short CI run. Do not emit the bundle in a tool call; that path timed out (retro 9b).
- **New games can be scaffolded (ADR-0024).** Dispatch `.github/workflows/scaffold.yml` with a slug and title to create a `build-manifest.json` and placeholder `MenuScene` under `games/<name>/`.
- **Register shared scripts and scenes (ADR-0023).** CI fails the build if a root-level `.js` in `scripts/` or `scenes/` is missing from its `_registry.md`.
- **Seeded randomness is available (ADR-0026).** `new Engine.PRNG(seed)` with `float()`, `int(min,max)`, `pick(arr)`, `shuffle(arr)`. Use it instead of `Math.random()` wherever runs need to be reproducible.
- **Name the balance math (ADR-0020).** When building or changing a difficulty ramp, cost/upgrade curve, damage, drop rate, or progression, name the applicable `Engine.Balance` primitive or `docs/resources/balance.md` formula in the plan before coding.
- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array, commit. ASSETS global is injected before source files in the build.
- **Animation communication format.** Read `docs/ANIM_CONFIG.md` when working on any sprite or parallax setup. When Trevor pastes or references a `.anim.json` sidecar, that is the authoritative source for frame layout and animation parameters.
- **ezgif.com/sprite-cutter** is the recommended browser tool for verifying Kenney sheet dimensions before upload.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
