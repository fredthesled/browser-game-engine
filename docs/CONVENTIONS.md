# Conventions

Code and process rules for this repo. Read once per session. These are non-negotiable unless changed via an ADR in `docs/DECISIONS.md`.

## File naming

- JS files: `kebab-case.js` (e.g., `signal-bus.js`, `main-menu.js`).
- MD files at the top level or in `docs/`: `UPPER_CASE.md` for canonical docs, `_registry.md` for module indexes.
- Folders: `lower-case/`.
- Filenames match the primary class they export, in kebab-case (`GameObject` lives in `game-object.js`).

## Build versioning (sibling-iteration convention)

Established 2026-05-12 in this session.

- The first build of a game is `build/<game>.html` (no version suffix; implicit v1).
- When iterating on a game that already has a build, create a sibling at `build/<game>-v2.html`, `build/<game>-v3.html`, and so on, rather than overwriting the previous build.
- The previous build stays unchanged and serves as a comparison reference during the iteration.
- Source files in `games/<game>/scripts/` and `games/<game>/scenes/` evolve in place; the build artifact is what gets versioned. Git history is the record of the previous source state, not parallel `-v2` source files.
- Once a new version is validated and the prior version is no longer needed for comparison, the prior `.html` build can be marked DEAD per `docs/DEAD_FILES.md` (or actually deleted if the deletion tool is available).
- The convention applies to material changes (refactors, new features, significant visual or gameplay revisions). Trivial fixes (a single typo, a one-line balance tweak) can overwrite without versioning if the difference is not worth preserving.
- The same convention applies to AI-powered artifacts and tooling shipped in `build/` or anywhere else under the repo (e.g. an eventual `build/sprite-tools-v2.html` if such a thing is ever made).

## Build assembly (bundle-inlining convention)

Established 2026-05-13, validated via `build/poc-square-v2.html` against `build/poc-square.html`. Underlying decision in ADR-0016.

The default approach for assembling a single-file HTML build:

1. Inline `engine/engine.bundle.js` as a single block. This covers the ten engine source files (vendored `lib/riffwave.js` and `lib/sfxr.js`, plus `signal-bus.js`, `input.js`, `script.js`, `game-object.js`, `scene.js`, `audio.js`, `storage.js`, `game.js`) in their canonical concat order.
2. Inline the game's scripts, in dependency order (scripts that other scripts reference via the `Engine` namespace or by class name must be defined first).
3. Inline the game's scenes, after the scripts they reference.
4. Inline the bootstrap snippet that retrieves the canvas, instantiates `Engine.Game` (optionally with `{ gameName: '<name>' }`), sets the initial scene, and calls `start()`.

This is equivalent in runtime behavior to the older individual-module concatenation. The bundle path is cleaner for builds assembled via tool calls (one block of engine source instead of ten) and is the default for new builds.

The reference build for this pattern is `build/poc-square-v2.html`. Its header documents the inlined files and their blob SHAs at the time of assembly; use it as a template when writing a new build.

When the bundle is regenerated (engine module changed), per CLAUDE.md §8 the bundle regeneration is committed in the same commit as the engine change. Existing game builds do not need to be regenerated; they continue to work with their inlined-at-build-time copy of the engine. Regeneration is only required when a build itself is intentionally being updated to pick up the latest engine.

### When the individual-module path is still appropriate

- Very small games that do not use audio or storage. The bundle adds ~37KB of jsfxr code plus a few KB of audio and storage modules even if unused. For minimal POCs where bundle inflation is undesirable (e.g., `build/poc-square.html`, the v1 build), inlining only the modules the game actually uses produces a smaller artifact.
- Diagnostic builds where isolating an issue benefits from reading engine source inline rather than as a single bundle block.

In both cases, the build's header documents which path was used and why.

## Code style

- ES2020+ syntax. Target: modern Chromium, Firefox, and Safari.
- Two-space indentation.
- Single quotes for strings, except where escaping makes double quotes cleaner.
- Semicolons required.
- One class per file in `engine/`, `objects/`, and `scripts/`.
- Avoid global state. The single allowed global is the engine's signal bus, exposed on a single namespace object.

## Class and function patterns

- Engine primitives (`Scene`, `GameObject`, `SignalBus`) are classes.
- Behaviors in `scripts/` are classes that take a host GameObject in their constructor and expose lifecycle methods (`update(dt)`, `draw(ctx)`, optional `on_enter`, `on_exit`).
- Communication between unrelated objects goes through the signal bus, not direct references.

## Documentation

- Every JS file starts with a short header comment block: what this file does, what it depends on, and what depends on it.
- Public methods get a one-line JSDoc-style comment describing intent and parameters.
- Internal helpers do not need comments unless their behavior is not obvious from the code.
- Prose comments and docs follow the same style as chat responses: no em-dashes, no emojis, no LLM tropes.

## Edit discipline

- Make the smallest change that accomplishes the goal.
- Do not reformat unrelated code.
- If a bug is found outside the current task, mention it in the response but do not fix it without asking.
- When a change crosses architectural boundaries (touches the engine, changes a public API, or affects multiple registries), pause and confirm before proceeding.

## Commit messages

Format: `<area>: <what changed>`. Examples:

- `engine: add signal bus`
- `docs: revise STATE for sprite work`
- `scenes: add main menu`
- `objects: introduce particle emitter`
- `init: scaffold repo`

Keep messages factual and concrete. No marketing tone, no padding.
