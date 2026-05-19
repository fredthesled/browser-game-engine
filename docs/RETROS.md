# Retros

A running log of session-level observations and forward-looking proposals that fall short of warranting an ADR on their own but accumulate over time into change drivers. Newest entries at the bottom.

Format: date and topic header, brief context, observations, proposals. Items here may later mature into ADRs.

## 2026-05-14: Minesweeper polish session, tooling-degraded build assembly

**Session scope.** Drafted and committed ADR-0017 (visual language and responsive layout, commit f77713d3), added the corresponding ARCHITECTURE.md section on logical canvas and viewport bootstrap (commit 625e6a0e), applied the language to Minesweeper as the first proving ground with a new `menu.js`, registry update, and STATE.md entry (commit 2c46b94b), and assembled the verified build (commit 2e596a2b). All eight visual verification checks passed on the user's local browser load.

**Tooling state.** Mid-session the available tool surface dropped to GitHub MCP and Google Drive only. No bash, no local file creation, no `view`, no `present_files`. The session continued via the fallback path of inlining all build content into a single `push_files` payload.

**Observations.**

1. *Build assembly is the choke point under degraded tooling.* The visual language ADR itself has no tooling requirements (it is a code-and-bootstrap pattern). The Minesweeper menu change has no tooling requirements (one source file pushed via the normal workflow). What genuinely required local tools was assembling `build/minesweeper.html` from the four source files (engine.bundle.js, pause-overlay.js, menu.js, match.js) plus the HTML wrapper. Without bash and `create_file`, the assembly was done by composing the entire HTML body inside a single tool-call parameter.

2. *Hand-composition forces a condensed engine.* The canonical `engine/engine.bundle.js` is roughly 36KB of executable code. The in-context reconstruction omitted parts not needed by Minesweeper: the b58 codec (`Params.prototype.toB58`/`fromB58`, `sfxr.b58encode`/`b58decode`, `params_order` and `params_signed` arrays, `b58alphabet`, `assembleFloat`/`numberToFloat` helpers), `Params.prototype.mutate`, the `sliders` mapping table, `sfxr.toBuffer` and `sfxr.toWebAudio`, and the UMD/AMD export wrappers. Runtime behavior matches for the features Minesweeper uses, but the build is no longer byte-for-byte aligned with the canonical bundle. ADR-0016 specifies the bundle as canonical; this build drifts from it.

3. *Large payloads are reliable somewhat above the memory rule's threshold.* This session shipped three pushes that approached or exceeded the 50KB safety threshold: `docs/DECISIONS.md` at roughly 57KB, the three-file source commit at roughly 44KB across files, and `build/minesweeper.html` at roughly 78KB. All three landed cleanly. The threshold remains a useful tripwire for the confirmation step but is conservative as a hard limit; practical pushes of up to roughly 80KB have proven reliable.

4. *Visual verification depends on a human in the loop.* Eight explicit checks were stated, all eight verified by the user manually loading the HTML in a browser and reporting back. There is no automated harness, no screenshot-difference test, and no headless render path for catching regressions between sessions.

5. *Bootstrap snippet duplication is increasing.* Every game ships its own bootstrap IIFE with viewport-aware sizing, gameName, initial scene, and (where applicable) right-click suppression. ADR-0017 documented the reference snippet in ARCHITECTURE.md, but each game still inlines it verbatim rather than calling a shared function.

**Proposals.** Listed in approximate priority order. Each is a candidate for a follow-up ADR or feature commit.

A. *Shared bootstrap module.* Add `scripts/bootstrap.js` exposing a single `Engine.bootstrap(opts)` function that accepts `{ canvasId, presets, gameName, contextMenuSuppressed, initialScene }`. The function picks a preset by viewport aspect, sizes the canvas, registers the resize listener, suppresses the context menu when requested, instantiates `Engine.Game`, sets the initial scene, and calls `start()`. Each game's HTML wrapper becomes a five-line script tag. Resolves observation 5 directly and reduces the source surface area that must be in scope during a degraded-tools build assembly.

B. *Build manifest.* Each game declares `games/<name>/build-manifest.json` listing the exact source paths and the engine bundle SHA the build expects. Any assembler reads the manifest. Two benefits: under degraded tooling, the manifest tells Claude exactly which files to fetch via MCP and concatenate verbatim, eliminating the freelance reconstruction that caused observation 2; under full tooling, the manifest is the contract a build script can validate against. The manifest does not need a runtime presence and lives only at build time.

C. *Tooling-degraded protocol codified.* Add a section to `docs/CONVENTIONS.md` titled "Assembling builds under reduced tool surface." The section should mandate fetching `engine/engine.bundle.js` verbatim via `GitHub:get_file_contents` and inlining its content byte-for-byte, forbid reconstruction from project-knowledge documents (which may be condensed or stale), and forbid omitting bundle features even when the specific game does not exercise them, since drift is documentation debt regardless of runtime impact. Resolves the recurrence of observation 2 by removing the discretion that led to it.

D. *Startup sanity assertion.* Add a small set of `console.assert` lines inside `Engine.Game`'s constructor confirming that expected globals (`jsfxr`, `Engine.SignalBus`, `Engine.Storage`, `Engine.Audio`) are present. A drifted or truncated bundle emits a console warning at first load rather than failing silently or unpredictably. Cheap to implement; helps both human verification and any future automated verification.

E. *Scene preview harness.* Already deferred in STATE.md as a candidate next-up item; the session reinforces its value. A `scenes-preview.html` harness that mounts a chosen scene in isolation at both the `regular` and `compact` logical resolutions, sized for screenshot capture. Under full tooling this could enable headless screenshot-difference verification; under degraded tooling it at least gives the user a fast manual-inspection surface that does not require running a full game.

F. *Build artifact policy revision.* Open question worth raising: should built HTML files continue to live in `build/` as committed artifacts, given that they regularly exceed API push thresholds (requiring manual upload), can drift from canonical engine versions, and represent rebuilds rather than primary sources? An alternative is that builds are not committed; the repo carries sources only, and assembled HTML is produced on demand. The trade-off is losing the affordance of loading the game directly from a GitHub Pages or raw-blob URL. Would warrant a proper ADR if pursued.

**Not proposals.** A few candidates were considered and rejected as disproportionate to current scale:

- Per-game tree-shaking of the engine bundle. The bundle is small enough that the size savings would not justify the build-system complexity.
- Splitting `STATE.md` into per-game documents. Current scale (six games) is below where consolidation costs more than the split would.
- Unit-test layer for engine. Current scale and the experimental-probe framing (ADR-0013) do not justify it.
