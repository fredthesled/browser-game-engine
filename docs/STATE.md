# State

Last updated: 2026-06-20

## Current status

Seven games in the repo: Pong, Survivors v3, Clown Brawler v2, Horses Teach Typing v1, Party House, Minesweeper, and Drift v1. Plus `poc-square` as an engine smoke test.

Settled infrastructure: engine (12 modules + bundle), audio, collision, pause, storage, `ShapeSprite` + `SpriteSheet`, engine bundle (ADR-0016, now CI-regenerated per ADR-0021), visual language (ADR-0017), narrative (ADR-0018), `bootstrapGame`, GitHub Actions build pipeline (ADR-0019), `Engine.Balance` difficulty/cost primitives (ADR-0020), `Tween` utility, `ShapeSprite.onDone` and per-animation easing, binary asset inlining in `build-game.sh`, and the `.anim.json` / `parallax.anim.json` sidecar communication format (`docs/ANIM_CONFIG.md`).

## What was done in the most recent session

**Session 2026-06-20 (GitHub Releases rolling tag):**

1. **Rolling `latest-build` GitHub Release added to CI.** Added a final step to `.github/workflows/build.yml` (build job, push-only — not triggered on manual dispatch). On each push to main, after games are built and committed back, the step: (a) deletes the existing `latest-build` release and tag if one exists, then (b) creates a fresh release tagged `latest-build`, attaches all `build/*.html` files, and marks it as the repo's latest release. Result: every built game now has a permanent public download URL of the form `github.com/fredthesled/browser-game-engine/releases/download/latest-build/<game>.html`. If no HTML files were produced (no build manifests found), the step exits cleanly. Step is conditioned on `github.event_name == 'push'` so manual workflow dispatches still upload the workflow artifact without clobbering the release tag. `GH_TOKEN` is wired from `secrets.GITHUB_TOKEN`; the existing `permissions: contents: write` grants the necessary release-creation scope. Uses `gh` CLI (pre-installed on `ubuntu-latest` runners) with `--latest` so the release appears as the repo's canonical latest.

**Note for merge:** This PR duplicates the rolling-release step in PRs #1 and #5. Approach differs: uses `gh release delete` + `gh release create` (CLI, no third-party action) rather than `softprops/action-gh-release`. All three achieve the same result; pick one and close the other two.

## Previously done

**Session 2026-06-03 (balance primitives + bundle CI):**

1. **`engine/balance.js` added (ADR-0020).** `Engine.Balance`, a namespace of pure, stateless functions. First increment: `difficulty(t, opts)` (curve dispatcher over linear / exponential / logarithmic / logistic, default logistic) and `cost(n, opts)` (`base * rate^n`, default rate 1.10, band 1.07-1.15), plus closed-form `bulkCost(owned, count, opts)` and `maxAffordable(owned, currency, opts)`. Opt-in per game; the engine core does not call it. Verified locally against brute-force summation and the Clicker Heroes cost reference. It is the twelfth bundled module (concat step 12).

2. **`docs/resources/balance.md` added.** Concise formula reference: the mechanic-to-formula table, the implemented primitives with formulas and default constants, the deferred-primitive roadmap (diminishing returns, multiplicative damage, pseudo-random distribution and pity timers, XP curves, prestige curves, a DDA controller) with formulas recorded, key constants, and caveats. Indexed in `docs/resources/INDEX.md`. This is the reference the new balance-check rule points at.

3. **Balance-check authoring step added to CLAUDE.md §8.** Any build or change that introduces or modifies a mechanic with a difficulty ramp, a cost or upgrade curve, damage, drop rates, or progression now names the applicable `Engine.Balance` primitive (or `balance.md` formula) in the plan before coding. Direct countermeasure to the difficulty-overcorrection pattern.

4. **Engine bundle regeneration moved to CI (ADR-0021).** Added `engine/bundle-manifest.json` (ordered source list), `scripts/build-bundle.sh` (concatenates the manifest sources behind banners under an auto-generated header with per-source git blob SHAs), and `.github/workflows/bundle.yml` (regenerates on any bundled-source change, runs `node --check`, commits the bundle back as `github-actions[bot]`). The bundle is no longer hand-built. CLAUDE.md §8 changed from "regenerate in the same commit" to "edit sources only; CI regenerates; never hand-build the bundle." Supersedes the manual-regeneration portion of ADR-0016.

5. **Bundle drift incident, resolved.** The balance module's first commit omitted the regenerated bundle, then a manual fix attempt (emitting the full ~49 KB bundle in one call) timed out. This motivated item 4. The CI workflow's first run regenerated the bundle correctly; it now includes `Engine.Balance`. Captured as retro 9b in CLAUDE.md. Note the regenerated bundle is ~70 KB (up from ~49 KB) because the runner concatenates the full vendored `sfxr.js` / `riffwave.js` sources, whereas the previous hand-built bundle had condensed comments. Runtime is identical; permitted by ADR-0016.

6. **Docs updated.** `docs/DECISIONS.md` (ADR-0020, ADR-0021, and supersession notes on ADR-0016), `docs/ARCHITECTURE.md` (balance module in the table, file layout, concat order, and a Balance class contract; CI bundle rule), `CLAUDE.md` (§8 rules above plus retro 9b and a §4 note that emitting large files in one call is a known-weak operation).

- **Session 2026-05-26 (raster asset pipeline + animation communication format):** `scripts/build-game.sh` gained a functional `"assets"` array (base64-inlines PNG/JPG/WebP/GIF into an `ASSETS` global before sources); `docs/resources/assets.md` gained an asset-pipeline section and Piskel; `docs/ANIM_CONFIG.md` committed, defining the sprite-sheet sidecar (`<sheet>.anim.json`) and parallax sidecar (`parallax.anim.json`) formats.
- See prior STATE entries: engine modules, Pong, Survivors v1-v3, Clown Brawler v1-v2, Party House, HTT, Minesweeper, Drift v1, SpriteSheet and ShapeSprite scripts, engine bundle convention, ADR-0017 visual language, ADR-0018 optional vendored library pattern, bootstrapGame, inkjs + Engine.Narrative, Tween utility, ShapeSprite.onDone and easing.

## Currently in progress

11 draft PRs open from routine runs on 2026-06-20. See "Open draft PR queue" below.

## Open draft PR queue (2026-06-20)

All PRs target main from the same base commit. Merge any order; resolve STATE.md conflicts by keeping all session entries. Renumber ADRs sequentially from ADR-0022 after each merge.

| PR | Branch | What it does | Duplicates |
|----|--------|-------------|------------|
| #1 | `claude/github-releases` | Rolling `latest-build` release + Minesweeper manifest | #5, and this PR (mgpm11) |
| #2 | `claude/registry-validation` | Registry validation step in CI (ADR-0023) | — |
| #3 | `claude/scaffolding-script` | `scripts/scaffold-game.sh` + workflow (ADR-0024) | — |
| #4 | `claude/balance-diminish` | `Engine.Balance.diminish()` (ADR-0025) | — |
| #5 | `claude/youthful-maxwell-htyyao` | Rolling `latest-build` release | #1, this PR |
| #6 | `claude/youthful-maxwell-j3hn33` | ParallaxBackground + Clown Brawler Tween + manifest | #10 |
| #7 | `claude/youthful-maxwell-8a9yhz` | Build manifests for Pong, Survivors, HTT, Party House | — |
| #8 | `claude/youthful-maxwell-x3bqxe` | Drift crew AI + `Engine.Balance.damage()` | — |
| #9 | `claude/youthful-maxwell-44qml1` | `Engine.PRNG` seeded PRNG (ADR-0026) | — |
| #10 | `claude/youthful-maxwell-svehku` | `ParallaxBackground` script | #6 |
| #11 | `claude/youthful-maxwell-euq85u` | `Engine.Balance.xp()` + `prestige()` | — |

**Duplicates to close:** #5 and #10 (or close #1 and #6 — same result). This PR (`mgpm11`) is a third rolling-release implementation; close it too if #1 or #5 is chosen.

**Suggested merge order** (avoids cascading STATE.md conflicts if done one at a time):
1. #2 (registry validation — no ADR conflict, CI-only)
2. #3 (scaffolding — no ADR conflict, new files only)
3. #1 (rolling release + Minesweeper manifest) → close #5 and this PR
4. #7 (remaining build manifests)
5. #4, #8, #9, #11, #6 in any order (balance + PRNG + Parallax + Clown Brawler)

**ADR renumbering:** After each merge, bump the next available ADR number before merging the next. PRs #4, #8, #9, #11 each claimed provisional numbers; the definitive sequence runs from ADR-0022 up.

## Next up (after PRs merge)

### Immediate: first real raster asset

The asset pipeline is in place but untested against a real image. The natural first exercise is Clown Brawler's gorilla or player sprite. Options, in order of effort:

- **Option A (Kenney adapt):** Find the closest Kenney pack ("Toon Characters 1"), commit the sheet, write `gorilla-sheet.anim.json` describing the walk/attack/die frames, and let Claude rewrite `GorillaEnemy` to use `SpriteSheet` instead of inline canvas calls. Fast, but the aesthetic match to "Clown Brawler" is loose.
- **Option B (Piskel custom):** Draw a 48x48 gorilla in Piskel (piskelapp.com, browser-based), export as PNG sprite sheet, commit, write the `.anim.json` sidecar. More work but full aesthetic control.

Either path requires Trevor to upload the PNG via GitHub web UI. Claude handles everything after that.

### Ink pre-compilation (pipeline improvement)

`npx inkjs` at build time eliminates `sources.js` wrappers and drops the inkjs compiler from narrative game builds (~100 KB saving). Needs a scoping session.

### Survivors: first Engine.Balance consumer

Now that `diminish`, `damage`, `xp`, `prestige`, `difficulty`, and `cost` are all in the engine (pending PR merges), Survivors is the natural first game to wire them in. `difficulty(waveNumber / totalWaves)` for spawn rate scaling; `cost(owned)` for upgrade pricing already in the shop.

### Longer horizon

- **Multiplayer**: PeerJS-backed `Network` module.
- **Touch / pointer input**: deferred to a separate ADR.
- **Public distribution**: GitHub Pages or Cloudflare Pages.

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
- **Project knowledge bundle mirror is stale.** The repo bundle is now ~70 KB and CI-regenerated; the Project knowledge copy is the older ~49 KB version (2026-05-20). Trevor should re-upload `engine/engine.bundle.js` to Project knowledge at convenience.
- **`docs/project-bootstrap.md` is out of date.** Needs a refresh to point at the CI bundle workflow.

## Open questions

- **Clown Brawler sprite decision**: Kenney adapt vs. Piskel custom (see Next up).
- **Ink pre-compilation architecture**: see Next up.
- **ADR numbering after merges**: renumber sequentially from ADR-0022; PRs used provisional numbers.

## Notes for the next session

- **11 open draft PRs.** Merge them before adding more work. Suggested order above. Close duplicates #5 and #10.
- **STATE.md conflicts on merge:** Keep all session log entries when resolving conflicts.
- **ADR renumbering:** Bump the next available number after each merge; don’t let two merged PRs share an ADR number.
- **After all PRs merge:** Update `## Current status` and `## Previously done`; the settled-infrastructure line needs PRNG, all balance primitives, ParallaxBackground, and the rolling-release pipeline added.
- **The engine bundle is CI-generated; never hand-build it (ADR-0021).**
- **Name the balance math (ADR-0020).** When adding difficulty ramps, cost curves, damage, drop rates, or progression, name the applicable `Engine.Balance` primitive in the plan.
- **Build pipeline is live.** Every push to `main` triggers `.github/workflows/build.yml` (game builds) and, for engine-source changes, `.github/workflows/bundle.yml` (bundle regeneration).
- **Engine bundle fetch target**: `engine/engine.bundle.js`.
- **Dead files**: `grep -r DEAD-FILE` to enumerate.
