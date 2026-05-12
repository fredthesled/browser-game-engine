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
