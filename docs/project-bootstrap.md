# Browser Game Engine: Project Bootstrap for AI Assistants

## What this file is

This is the orientation pointer for AI assistants working in the **simple browser game dev** Claude Project. Read it at the start of a new conversation, before acting on a substantive request.

It is deliberately thin. The repository carries the authoritative, continuously-updated documentation; this file's only job is to point a fresh session at those documents in the right order and to record the few durable rules and tool caveats that are not obvious from the code. Volatile detail (the module set, the architecture, the current state) is **not** duplicated here, because a duplicated copy drifts stale. Where this file once enumerated such detail, it now points at the canonical source.

This document also lives in the repo at `docs/project-bootstrap.md`. A copy is uploaded to Claude Project knowledge for session loading; the repo version is the source. After editing the repo file, re-upload it to project knowledge. Project knowledge is not auto-synced from the repo.

## The project in one paragraph

A Godot-inspired 2D game framework built almost entirely in browser-based AI chat sessions. The user (`fredthesled`, addressed as Trevor) develops via browser surfaces, often on mobile, on a locked-down corporate network where no local development tools can be installed. Every game produced by the framework must be a single self-contained HTML file that runs in any browser with no server, no npm, no CDN, and no bundler. Source lives as separate JS files in a Git repo for clarity and version control, then is concatenated into the single-file build by CI. The framework is long-running infrastructure meant to support many games over time; individual games are experimental probes (ADR-0013), not shipping products.

## Where things live

- **GitHub repo**: https://github.com/fredthesled/browser-game-engine (private)
- **Default branch**: `main`
- **GitHub MCP connector**: the primary development surface. Read with `get_file_contents`, commit with `push_files` or `create_or_update_file`, inspect history with `list_commits` / `get_commit`. Because the repo is private, unauthenticated fetches from `raw.githubusercontent.com` fail even though that host is on the sandbox network allowlist; go through the MCP tools, not `bash` curl, for repo content.
- **Tool surface caveat**: the available tool set can change mid-session. `bash` and the local file tools (`view`, `create_file`, `str_replace`) are sometimes unavailable, leaving only GitHub MCP. Plan so anything important can be completed via GitHub MCP alone. Do not rely on `bash` (`node --check`, etc.) without confirming it is present.
- **Other connectors** (Google Drive, Notion, Lucid, Gmail, Calendar, and others) are not used for engine work. Do not reach for them unless Trevor asks.

## User communication preferences

Project-level `userPreferences` are already in effect. For clarity: no em-dashes (use commas, parentheses, or rephrasing); no emojis; no "X isn't just Y, it's also Z" constructions or similar LLM tropes; no positive pandering or unnecessary reassurance; direct, factually accurate language, accuracy over sensitivity; engage as an academic or professional peer in the relevant domain while assuming Trevor is a hobbyist who may want complex concepts explained plainly. These apply to chat, code comments, and committed prose alike.

## Session startup: read in this order

The `.md` files in the repo are the authoritative source of current state, ahead of training data or prior-conversation memory.

1. `CLAUDE.md` (repo root). The operating manual: Complexity Score, pre-flight, anti-pattern catalog, engine-specific rules.
2. `docs/STATE.md`. What was done last session, what is in progress, what is queued. This is the single source of truth for current state.
3. `docs/ARCHITECTURE.md`. Engine design, module set, lifecycle contracts, build concat order.
4. `docs/DECISIONS.md`. The ADR log of settled questions, so they are not re-litigated.
5. `docs/CONVENTIONS.md`. File, naming, and commit conventions.
6. The relevant `_registry.md` (`scripts/`, `scenes/`, `objects/`) for whatever subsystem the task touches.
7. If the task touches engine source, fetch `engine/engine.bundle.js`. This is the canonical single-file engine (ADR-0016). Its header lists source SHAs at generation time, which lets you detect drift against the live `engine/` directory. Do not fetch individual modules or extract the engine from an old build.

A copy of `engine/engine.bundle.js` is also in Claude Project knowledge as a zero-fetch optimization. When the in-context copy may be older than the most recent engine-touching commit, fetch from the repo to verify.

## Architecture, module set, and current state: read the canonical files

This bootstrap intentionally does **not** restate the engine's module list, frame lifecycle, or a dated state snapshot. Those drifted stale in earlier versions of this file. The authoritative, current sources are:

- **Module set and build concat order**: `engine/bundle-manifest.json` (the ordered source list CI concatenates) and `docs/ARCHITECTURE.md` (design and contracts).
- **Frame lifecycle, namespace pattern, coordinate system, collision model**: `docs/ARCHITECTURE.md`.
- **Current games, in-progress work, and queued items**: `docs/STATE.md`.

A few durable design facts, unlikely to drift, are worth stating here so a fresh session has them before reading further:

- **Composition over inheritance** (ADR-0004): a "Player" is a generic `GameObject` with Scripts attached, not a subclass. Do not add `GameObject` subclasses without a reason composition cannot serve.
- **Top-left origin, Y-down** (ADR-0008): positive Y is down everywhere.
- **Single active scene** (ADR-0006): `Game.setScene` swaps at the next frame boundary; pause and HUD live inside the active scene.
- **Engine namespace**: engine modules attach to a global `Engine` object (`Engine.Scene`, `Engine.input`, `Engine.PRNG`, and so on); scripts and scenes are top-level classes.
- **Sprites**: procedural Shape DSL via the `ShapeSprite` script is the primary path (ADR-0015). The text-prompted pixel-grid generator is retired (2026-05-09 retro).
- **Pause**: ESC-to-pause via the `PauseOverlay` plain class (ADR-0012); the engine itself is pause-agnostic.

## Build and bundle are CI-automated (do not hand-assemble)

This is the most important correction to make against any older mental model.

- **Game builds** are assembled by `.github/workflows/build.yml` on every push to `main` (ADR-0019). The workflow discovers every `games/<name>/build-manifest.json`, runs `scripts/build-game.sh` to concatenate sources into a single self-contained HTML file, commits the result to `build/`, and publishes it to a rolling `latest-build` GitHub Release with a permanent public download URL (ADR-0022). To add a game to the pipeline, commit a `build-manifest.json`; do not hand-concatenate builds in chat. The manifest schema is documented in the header of `scripts/build-game.sh`.
- **The engine bundle** is regenerated by `.github/workflows/bundle.yml` (ADR-0021), which runs `scripts/build-bundle.sh` over `engine/bundle-manifest.json`, runs `node --check`, and commits `engine/engine.bundle.js` back as `github-actions[bot]`. **Never hand-regenerate or hand-commit the bundle.** To change the engine: edit the source under `engine/`, and add or remove one line in `engine/bundle-manifest.json` when adding or removing a module. The committed bundle lags a source push by one short CI run.
- **A validate gate** in `build.yml` runs `node --check` on every authored `.js` file (excluding `engine/lib/` and `build/`) and fails the build if any root-level file in `scripts/` or `scenes/` is missing from its `_registry.md` (ADR-0023). Register new shared scripts and scenes before pushing.
- **New game skeletons** can be scaffolded by dispatching `.github/workflows/scaffold.yml` (ADR-0024), which runs `scripts/scaffold-game.sh <name> <title>` to create a `build-manifest.json` and a placeholder `MenuScene`, then commits them.

## Update protocol (mandatory)

When you change code, update the matching documentation in the same response.

| Change | Update |
|--------|--------|
| New scene / object / script | Row in the matching `_registry.md` (CI enforces this for root `scripts/` and `scenes/`) |
| Engine module added or removed | One line in `engine/bundle-manifest.json` (CI regenerates the bundle; do not hand-build it) |
| Architectural change | `docs/ARCHITECTURE.md` and a new ADR in `docs/DECISIONS.md` |
| Any meaningful work | `docs/STATE.md` at end of session |

If code and docs disagree, treat it as a bug to reconcile, not a normal state (ADR-0003).

## Resource lookup

Before researching any third-party asset, library, or tool, check `docs/resources/` first (`INDEX.md`, `assets.md`, `libraries.md`, `multiplayer.md`, `attribution.md`). Add anything newly evaluated to the relevant file in the same session.

## License policy (ADR-0009)

Prefer CC0, public domain, MIT, BSD, ISC, Apache 2.0. Accept CC-BY with a credits entry. Accept CC-BY-SA knowingly (commits the using game to share-alike). Avoid GPL for bundled code and NC variants. When a license is unclear, do not use the asset.

## Dead-file convention

Files no longer in use are marked with a `DEAD-FILE` banner header rather than deleted (deletion has historically been gated on tool availability and on Trevor's approval; default to the banner). Such files are inert: do not modify them, build them, or surface them as backlog. `docs/DEAD_FILES.md` carries the convention and the disposal queue. `grep -r DEAD-FILE` enumerates every parked file.

## Large payload safety check

Before any single tool call with very large content (over 30 KB in one file, or over 50 KB total across files), pause and check in with Trevor about splitting the work across smaller commits. Long single-shot tool calls have a history of failing to complete the response, which then requires Trevor to paste content back to resume. Two clean commits beat one truncated turn. Artifacts that genuinely cannot be split and exceed the ceiling (the engine bundle, large builds) are produced by CI, not emitted in chat.

## What to refuse without explicit approval

Push back on or ask about, rather than silently doing: adding npm or CDN dependencies; using ES module `import`/`export` at runtime (CORS breaks file-opened HTML); pulling in full frameworks (Phaser, Pixi, p5.js) or a bundler; refactoring unrelated code while making a change; rewriting a file from scratch unless asked.

## When you do not know

If something is genuinely ambiguous (which game variant, which library first, what license a found asset carries), ask Trevor once with a concrete proposal rather than guessing. If something is settled (namespace pattern, license policy, conventions, composition-over-inheritance, the experimental-probe framing, the CI build and bundle rules), act.

## Closing a session

Update `docs/STATE.md`; add an ADR to `docs/DECISIONS.md` if a design decision was made; confirm to Trevor what was committed and what remains open. If an engine module changed, remind Trevor that the project-knowledge mirror of `engine/engine.bundle.js` is now stale and a manual re-upload would refresh it. Commit messages follow `<area>: <what changed>` (see `docs/CONVENTIONS.md`).

## How to update this bootstrap

Edit the repo copy, then re-upload to project knowledge. Update it only when something at the bootstrap level changes: a connector added or removed, a durable convention revised, a new top-level folder, or a long-deferred capability becoming active. Do **not** update it for new scenes, scripts, games, ADRs, resources, or routine STATE changes; those live in their own files. Keep it thin. If a section here starts duplicating a canonical doc, replace it with a pointer.
