# State

Last updated: 2026-06-20

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, and the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`).

## What was done in the most recent session

**Session 2026-06-20 (GitHub Releases step — duplicate PR situation):**

1. **Implemented rolling `latest-build` GitHub Release in build.yml.** Added two steps to the build job: delete existing `latest-build` tag/release, then create fresh release via `softprops/action-gh-release@v2` with all `build/*.html` as assets. Added `releases: write` permission. However, this session discovered that 14 draft PRs had already accumulated from other automated runs today (all on the same base commit), including three that implement the same releases step (#1, #5, #12). This session's work is a duplicate; the updated STATE.md with backlog table is the primary deliverable.

2. **Identified PR backlog and sent merge guide.** Posted a comment on PR #14 with a suggested merge order. Created a Gmail draft to trevordoner@gmail.com with the full backlog analysis.

## PR BACKLOG — ACTION NEEDED

14 draft PRs open as of 2026-06-20, all from today, all on base `9dbb232`. Main has not advanced since 2026-06-03. **Trevor needs to do a merge session.**

| PR | Branch | What it adds | Keep? |
|----|--------|-------------|-------|
| #1 | claude/github-releases | Rolling release + Minesweeper manifest | **KEEP** |
| #2 | claude/registry-validation | Registry validation in CI validate job | Keep |
| #3 | claude/scaffolding-script | scaffold-game.sh + workflow | Keep |
| #4 | claude/balance-diminish | Engine.Balance.diminish | Keep |
| #5 | claude/youthful-maxwell-htyyao | Rolling release (simpler) | Close (dup of #1) |
| #6 | claude/youthful-maxwell-j3hn33 | ParallaxBackground + Clown Brawler Tween | **KEEP** |
| #7 | claude/youthful-maxwell-8a9yhz | Build manifests: Pong/Survivors/HTT/Party House | Close (dup of #13) |
| #8 | claude/youthful-maxwell-x3bqxe | Drift crew AI + Engine.Balance.damage | Keep |
| #9 | claude/youthful-maxwell-44qml1 | Engine.PRNG seeded RNG | Keep |
| #10 | claude/youthful-maxwell-svehku | ParallaxBackground (less complete) | Close (dup of #6) |
| #11 | claude/youthful-maxwell-euq85u | Engine.Balance.xp + prestige | Keep |
| #12 | claude/youthful-maxwell-mgpm11 | Rolling release (gh CLI, push-only) | Close (dup of #1) |
| #13 | claude/youthful-maxwell-1ehw8v | Build manifests for all 6 remaining games | **KEEP** |
| #14 | claude/youthful-maxwell-2nmh37 | Engine.Balance.DDA controller | Keep |

**Suggested merge order** (minimizes rebase conflicts):
1. #3 (scaffold), #9 (PRNG) — touch unique files
2. #4 → #8 → #11 → #14 — sequential balance.js additions
3. #6 — ParallaxBackground + Clown Brawler
4. #13 — build manifests for remaining games
5. #2 — registry validation (modifies build.yml validate job)
6. #1 — rolling release (modifies build.yml build job)

After all merges: one cleanup commit to fix ADR number collisions in DECISIONS.md.

## Previously done in sessions

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

PR backlog needs merging (see table above). Once merged, main will reflect: Engine.PRNG, Engine.Balance (diminish/damage/xp/prestige/DDA), ParallaxBackground script, build manifests for all 9 games, rolling GitHub Release, scaffolding workflow, and registry validation.

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

- **MERGE THE PR BACKLOG FIRST.** See the PR table above. Main is stale; every new automated run will redo work already done in open PRs.
- **After merging**: `docs/DECISIONS.md` ADR numbers need cleanup (multiple PRs claimed sequential numbers from the same base). One cleanup commit.
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).**
- **Name the balance math (ADR-0020).** When building or changing a difficulty ramp, cost/upgrade curve, damage, drop rate, or progression, name the applicable `Engine.Balance` primitive or `docs/resources/balance.md` formula in the plan before coding.
- **Asset pipeline ready.** Upload PNG to `games/<name>/assets/` via GitHub web UI, add path to manifest `"assets"` array, commit.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
