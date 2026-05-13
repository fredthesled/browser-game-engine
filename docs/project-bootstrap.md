# Browser Game Engine: Project Bootstrap for AI Assistants

## What this file is

This is the canonical orientation document for AI assistants working in the **simple browser game dev** Claude Project. Read it in full at the start of any new conversation in this project, before taking any action on a user request.

It is the bootstrap. The repo itself contains more detailed and continuously-updated documentation (see "Where things live" below). The job of this file is to give a fresh Claude instance enough context to know how to read those, what conventions to follow, and what tools are available, without making the user re-explain every session.

This document also lives in the repo at `docs/project-bootstrap.md` so its history is tracked. The version in Claude Project knowledge is the authoritative one for session loading; the repo version is the source for regenerating it. When updating, edit the repo file, then upload the regenerated copy to project knowledge.

## The project in one paragraph

A Godot-inspired 2D game framework built (almost) entirely in browser-based AI chat sessions. The user (`fredthesled`, addressed in chat as Trevor) develops via browser surfaces on mobile while normal desktop interactions are on a locked-down corporate network where no local development tools can be installed (translation: he wants to develop games while he's bored at work without breaking the rules). Every game produced by this framework must be a single self-contained HTML file that runs in any browser. Source code is organized as separate JS files in a Git repo for clarity and version control, then concatenated into a single-file HTML build as the deliverable. The framework is long-running infrastructure intended to support many games over time, not a one-off project.

## Where things live

- **GitHub repo**: https://github.com/fredthesled/browser-game-engine (private)
- **Default branch**: `main`
- **GitHub MCP connector**: Connected to this project. Use the GitHub MCP tools to read files (`get_file_contents`), commit changes (`push_files`, `create_or_update_file`), and inspect history (`list_commits`, `get_commit`). Note that `raw.githubusercontent.com` is not on the sandbox network allowlist, so dynamic fetches from that host via `bash` will fail; always go through MCP.
- **Other connectors that may be available**: Google Drive, Notion, Lucid, Gmail, Google Calendar. These have not been used for engine work so far. Don't reach for them unless Trevor explicitly asks.
- **Tool surface caveat**: the available tool set can change mid-session. In particular, `bash` and local file tools (`view`, `create_file`, `str_replace`, `present_files`) are sometimes unavailable, leaving only GitHub MCP. Plan work so that anything important can be completed via GitHub MCP alone if needed. Don't rely on `bash` to verify code (`node --check`, etc.) without checking it's actually available first.

## User communication preferences

Project-level preferences are already in effect via `userPreferences`, but for clarity, they are:

- No em-dashes. Use commas, parentheses, or rephrasing.
- No emojis.
- No "X isn't just Y, it's also Z" patterns or similar LLM tropes.
- No positive pandering or unnecessary reassurance.
- Direct, factually accurate language. Prioritize accuracy over user-sensitivity.
- Act as an academic/professional peer in the relevant domain, but assume Trevor is a hobbyist may need complex concepts explained and simplified.

These apply to chat responses, code comments, and committed prose alike.

## Session startup checklist

When Trevor starts a new conversation in this project, perform these reads in order before responding to their substantive request:

1. **Read `CLAUDE.md`** at repo root. Authoritative AI operating manual including the Complexity Score, pre-flight checklist, anti-pattern catalog, and engine-specific operating rules.
2. **Read `docs/STATE.md`**. What was done last session, what is in progress, and what is queued.
3. **Read `docs/ARCHITECTURE.md`**. Engine design and lifecycle contracts.
4. **Read `docs/DECISIONS.md`**. ADRs covering settled architectural questions, so you don't re-litigate them.
5. **Read the relevant `_registry.md`** files (`scripts/`, `scenes/`, `objects/`) for whatever subsystem you'll be touching.
6. **If the task touches engine source**, fetch `engine/engine.bundle.js`. This is the canonical single-file representation of the engine (per ADR-0016). Do not fetch individual engine modules or extract from old build files. The bundle's header lists the source SHAs at generation time, which lets you detect drift relative to the live `engine/` directory.
7. Only then start working.

The `.md` files in the repo are the authoritative source of current state, more so than your training data or any prior conversation memory. The engine bundle is the authoritative source of current engine code.

A copy of `engine/engine.bundle.js` is also uploaded to Claude Project knowledge as a parallel optimization. When the in-context copy is current, you have zero-fetch access to the engine. When it might be stale (any time the project knowledge upload is older than the most recent engine-touching commit), fetch from the repo to verify.

## Architecture summary

Sufficient context to start acting. Not a substitute for reading `docs/ARCHITECTURE.md`.

**Folder layout** (mirrors Godot's conceptual model):

- `engine/` framework code (eight modules plus vendored libraries plus the bundle)
- `engine/lib/` vendored third-party code (currently jsfxr: `riffwave.js` and `sfxr.js`, both public domain)
- `engine/engine.bundle.js` auto-generated single-file concatenation of the engine (see ADR-0016)
- `scenes/` scene subclasses
- `objects/` GameObject subclasses (currently mostly empty; composition pattern means most "objects" are plain GameObjects with scripts attached)
- `scripts/` attachable behaviors that go onto GameObjects
- `games/` specific game folders, each with its own scenes/scripts/credits manifest
- `build/` concatenated single-file HTML outputs
- `docs/` project documentation including `docs/resources/` for third-party reference

**Engine modules** (in dependency order, which is also the build concatenation order):

1. `engine/lib/riffwave.js` vendored RIFF wave encoder, defines `RIFFWAVE` global
2. `engine/lib/sfxr.js` vendored jsfxr SFX synth, defines `jsfxr` global, depends on `RIFFWAVE`
3. `engine/signal-bus.js` global pub/sub. `Engine.SignalBus` class plus `Engine.signals` singleton instance.
4. `engine/input.js` latched keyboard/mouse state. `Engine.Input` class. The `Game` constructor instantiates it as `Engine.input`.
5. `engine/script.js` base class for attachable behaviors. No-op lifecycle hooks: `on_enter`, `update(dt)`, `draw(ctx)`, `on_exit`.
6. `engine/game-object.js` transform host (x, y, rotation, scale) plus a list of attached Scripts. Delegates `update` and `draw` to each script.
7. `engine/scene.js` owns GameObjects, applies per-object transforms during draw via `ctx.save/translate/rotate/scale/restore`, runs a per-frame collision pass. Iteration over snapshots so add/remove during update is safe.
8. `engine/audio.js` procedural SFX wrapper around vendored jsfxr. `Engine.Audio` class, instantiated as `Engine.audio` by Game. Per ADR-0011.
9. `engine/storage.js` localStorage-backed key/value persistence with optional per-game namespacing. `Engine.Storage` class, instantiated as `Engine.storage` by Game. Per ADR-0014.
10. `engine/game.js` owns the `requestAnimationFrame` loop, the canvas, and the active scene. Constructs the engine-level singletons (`Engine.input`, `Engine.audio`, `Engine.storage`). Pending scene transitions are applied at the next frame boundary.

The `engine/engine.bundle.js` artifact concatenates all ten of these in this order. Per CLAUDE.md section 8, any commit that touches an engine module must regenerate the bundle in the same commit.

**Frame lifecycle** (per frame, in order):

1. Compute `dt`, clamped to 0.1s max (avoids huge jumps after tab inactivity).
2. Apply pending scene transition if any (call `exit()` on outgoing, `enter()` on incoming).
3. `Engine.input.update()` to advance just-pressed/just-released tracking.
4. `currentScene.update(dt)`, which calls `update` on each GameObject, which calls `update` on each attached Script. Then runs `_collisionPass()`: gathers all scripts with `isCollider === true`, runs pairwise AABB tests, invokes `a.onCollide(b)` and `b.onCollide(a)` for each overlapping pair.
5. `ctx.clearRect`.
6. `currentScene.draw(ctx)`, which translates/rotates/scales for each object then calls `obj.draw`, which calls `draw` on each Script (in host-local space, origin at host position).

**Composition over inheritance** (ADR-0004): A "Player" is not a class. It's a generic GameObject with scripts attached (e.g., `RectRenderer` + `KeyboardMover` + `Collider` + `Health`). Do not introduce GameObject subclasses unless there's a specific reason that composition can't address.

**Coordinate system** (ADR-0008): Top-left origin, Y-down (Canvas default). Positive Y is "down" everywhere in engine code, scripts, and game logic.

**Namespace pattern**: Engine modules attach to a global `Engine` object: `Engine.SignalBus`, `Engine.signals`, `Engine.Input`, `Engine.input`, `Engine.Script`, `Engine.GameObject`, `Engine.Scene`, `Engine.Audio`, `Engine.audio`, `Engine.Storage`, `Engine.storage`, `Engine.Game`. Scripts and scenes are top-level classes (no namespace), since they tend to be project-specific.

**Sprite rendering**: Procedural drawing via the Shape DSL is the primary path. `scripts/shape-sprite.js` (the `ShapeSprite` script) is the engine's sprite primitive (per ADR-0015): each animation is a JS draw function `(ctx, state) => void` that draws into a canvas context in host-local space, with `t` normalized over the animation's duration. The earlier raster-sheet primitive (`SpriteSheet`) still exists for any future imported raster path. The text-prompted pixel-grid sprite generator concept is retired (see ADR-0015 context and the 2026-05-09 retro in CLAUDE.md).

**Pause convention** (ADR-0012): All pauseable games provide ESC-to-pause via the `PauseOverlay` utility class in `scripts/pause-overlay.js`. It is a plain class (not a Script subclass) that each pauseable scene instantiates and delegates to. Includes audio volume and mute controls, plus optional restart and quit-to-menu callbacks. The engine itself remains pause-agnostic.

## File and naming conventions

- `kebab-case.js` for code files.
- `UPPER_CASE.md` for canonical docs at repo root or in `docs/` (`CLAUDE.md`, `STATE.md`, `ARCHITECTURE.md`, etc.).
- `_registry.md` for per-folder indexes.
- Each `.js` file starts with a header comment block: what it does, what it depends on, what depends on it. (Some smaller modules use a condensed form.)
- Build files in `build/` carry an "auto-generated" notice at the top.
- `engine/engine.bundle.js` carries its own auto-generation notice including source SHAs and a regeneration recipe.

## Update protocol (mandatory)

When you change code, update the matching documentation in the same response:

| Change | Update |
|--------|--------|
| New scene | Row in `scenes/_registry.md` |
| New object subclass | Row in `objects/_registry.md` |
| New script | Row in `scripts/_registry.md` |
| Engine module touched | Regenerate `engine/engine.bundle.js` in the same commit |
| Architectural change | `docs/ARCHITECTURE.md` and a new ADR in `docs/DECISIONS.md` |
| Any meaningful work | `docs/STATE.md` at end of session |

If code and docs disagree, treat the disagreement as a bug to be reconciled, not a normal state.

## Resource lookup

Before researching any third-party asset, library, or tool, check `docs/resources/` first:

- `docs/resources/INDEX.md` map of the folder.
- `docs/resources/assets.md` art, sound, music, font sources.
- `docs/resources/libraries.md` JS libraries we may bundle.
- `docs/resources/multiplayer.md` networking architecture.
- `docs/resources/attribution.md` crediting third-party work, plus the credits-manifest schema.

If you find or evaluate something not yet documented, add it to the relevant file in the same session.

## License policy (ADR-0009)

- **Prefer**: CC0, public domain, MIT, BSD, ISC, Apache 2.0.
- **Accept with credit**: CC-BY (must add to credits manifest).
- **Accept with caveat**: CC-BY-SA (commits the using game to also being CC-BY-SA, a deliberate choice).
- **Avoid**: GPL for bundled code (viral copyleft), NC (non-commercial) variants.

When license is unclear, do not use the asset.

## Dead-file convention

Files no longer in use are not always deletable (the available GitHub MCP tool surface may not include `delete_file`). The convention is to mark dead files with a `DEAD-FILE` banner header. Such files are inert: do not modify them, do not include them in builds, do not surface them as backlog. `docs/DEAD_FILES.md` carries the full convention and the active disposal queue. A grep for `DEAD-FILE` across the repo enumerates every parked file.

## Action recipes

How to handle common requests in this project.

### "Build [game name]"

1. Run the startup checklist (including fetching `engine/engine.bundle.js` if the build needs the engine source).
2. Plan: which scenes, which scripts, which assets or SFX. State assumptions explicitly before coding so Trevor can correct them.
3. For each new attachable behavior: `scripts/<name>.js` plus row in `scripts/_registry.md`.
4. For each new scene: `scenes/<name>.js` plus row in `scenes/_registry.md`.
5. Game-specific files (credits manifest, scenes that aren't reusable across games) go in `games/<game-name>/`.
6. Generate single-file build at `build/<game-name>.html` with engine + scripts + scenes + bootstrap inlined in dependency order. The engine portion can be either the individual modules in canonical order or the prebuilt bundle inlined as a single block.
7. Update `docs/STATE.md`.
8. Commit with `<area>: <what changed>` format. Multiple commits if logically distinct.

Per ADR-0013, games during engine development are experimental probes, not shipping products. Visible polish gaps (missing SFX, missing pause, primitive rendering) are accepted as intentional. The list of deferred per-game polish items lives in STATE.md's "Deferred to shipping mode" section. Do not interpret it as a backlog crisis.

### "Update an engine module"

1. Run the startup checklist; in particular fetch `engine/engine.bundle.js` to compare its header SHAs against the live `engine/` directory listing.
2. Make the source change in the relevant `engine/*.js` file.
3. Regenerate `engine/engine.bundle.js` per the recipe in its own header.
4. Update `docs/ARCHITECTURE.md` if the public API or module set changed.
5. If the change is architectural, add an ADR in `docs/DECISIONS.md`.
6. Update `docs/STATE.md`.
7. Commit the source change and the regenerated bundle in the same commit. Per CLAUDE.md section 8 this is mandatory, not optional.
8. Remind Trevor at session close that the project-knowledge mirror of the bundle is now stale and a manual re-upload would refresh it.

### "Add [URL] as a resource"

1. Determine the category (asset source, JS library, networking tool, etc.) and the right file in `docs/resources/`.
2. Verify the license. If unclear, ask Trevor before committing.
3. Add an entry following the existing format in that file: name, URL, license, what it does, when to use, any caveats.
4. For libraries, also note approximate size and integration approach.
5. Commit with `docs:` prefix.

### "Regenerate the build for [game]"

The single-file HTML build is manual concatenation. Two equivalent approaches:

Approach A (individual modules): concatenate the ten engine source files in canonical order, then the game's scripts (in dependency order), then its scenes (after the scripts they reference), then the bootstrap snippet.

Approach B (use the bundle): inline `engine/engine.bundle.js` as a single block (it covers all ten engine files), then scripts, then scenes, then bootstrap. Cleaner and shorter when assembling builds via tool calls.

Either way, build files live in `build/<name>.html` and carry an "auto-generated" notice. Edit source files, then regenerate. Never edit a build file directly.

### "Add a new attachable behavior"

1. Create `scripts/<name>.js` with the standard header comment block.
2. Class extends `Engine.Script`. Implement only the lifecycle hooks the script actually needs.
3. Add row to `scripts/_registry.md`.
4. If the script is used in any existing game, regenerate that game's build.
5. Commit with `scripts:` prefix.

### "Add a new scene"

1. Create `scenes/<name>.js` (or `games/<game>/scenes/<name>.js` for game-specific scenes) with the standard header comment block.
2. Class extends `Engine.Scene`. Override `enter`/`exit`/`update`/`draw` as needed. If overriding `update` or `draw`, call `super` so the collision pass and per-object draw still run.
3. Add row to `scenes/_registry.md`.
4. Commit with `scenes:` prefix.

### "Update something in docs only"

1. Edit the file.
2. If it's `STATE.md`, update the date at the top.
3. Commit with `docs:` prefix.

### "Add multiplayer to [game]"

This is a larger change. Before implementing:

1. Confirm the game has been verified to work single-player (multiplayer should not be the first time the engine is exercised).
2. Read `docs/resources/multiplayer.md` for the architectural options and the WebRTC signaling problem.
3. Decide on the architecture pattern (lockstep, authoritative-server, state-sync). Authoritative-server is the recommended default.
4. This will likely warrant a new `engine/network.js` module and a new ADR. Surface this to Trevor before writing code, and propose the API surface for review.

## What to refuse without explicit approval

These are things to push back on or ask about, not silently do:

- Add npm dependencies. The runtime is the browser; we have no install step.
- Use ES module `import`/`export` statements at runtime. They cause CORS issues when HTML files are opened directly from the filesystem. Source organization is via concatenation order.
- Add CDN dependencies. The corporate network blocks most external services. Inline everything into the build.
- Refactor unrelated code while editing a file. Make the requested change; surface other issues separately.
- Rewrite a file from scratch unless explicitly asked.
- Pull in full game frameworks (Phaser, Pixi, p5.js). Our engine is the framework.
- Add a bundler (webpack, rollup, esbuild). Manual concatenation is the build step.

## Large payload safety check

Before any single tool call with very large content (>30KB single file, >50KB total across files), pause and check in with Trevor about splitting the work across multiple smaller commits. Long single-shot tool calls have a history of failing to complete the response, requiring Trevor to paste content back to resume. Better to plan two clean commits than burn a turn on a truncated one.

## What to do when you don't know

If something is genuinely ambiguous (which game variant to build, which library to integrate first when several would work, what license a found asset carries), ask Trevor once with a concrete proposal rather than guessing.

If something is settled (the namespace pattern, license policy, file conventions, the composition-over-inheritance rule, the experimental-probe framing, the bundle regeneration rule), don't ask. Act.

## Closing a session

Before ending substantive work:

1. Update `docs/STATE.md` to reflect what was done and what remains open.
2. If a meaningful design decision was made, add an ADR entry to `docs/DECISIONS.md`.
3. If an engine module was touched, confirm the bundle was regenerated.
4. Commit with `<area>: <what changed>` format. Examples:
   - `engine: add storage module`
   - `engine: regenerate bundle for storage change`
   - `scripts: add shape-sprite`
   - `scenes: add credits template`
   - `docs: revise STATE for rhythm-game work`
   - `init: scaffold repo`
5. Confirm to Trevor what was committed and what remains open.
6. If an engine module changed in this session, remind Trevor that the project-knowledge mirror of `engine/engine.bundle.js` is now stale and a manual re-upload would refresh it.

## Snapshot of repo state at time this bootstrap was written

Date: 2026-05-13 (regenerated after the engine-bundle work on the same day).

Engine modules (all settled): `signal-bus`, `input`, `script`, `game-object`, `scene`, `audio`, `storage`, `game`. Vendored `lib/`: `riffwave.js`, `sfxr.js`. The auto-generated `engine/engine.bundle.js` is the canonical single-file representation.

Settled engine concepts: composition over inheritance (ADR-0004), hybrid input model (ADR-0005), single active scene (ADR-0006), Game owns the loop (ADR-0007), Y-down coordinates (ADR-0008), license policy (ADR-0009), duck-typed AABB collision (ADR-0010), audio as engine module (ADR-0011), ESC-to-pause via `PauseOverlay` (ADR-0012), games as experimental probes (ADR-0013), Engine.Storage with Game-configured namespace (ADR-0014), procedural Shape DSL via `ShapeSprite` (ADR-0015), engine bundle as canonical artifact (ADR-0016).

Games shipped to repo (as experimental probes per ADR-0013): `poc-square` (engine smoke test), Pong, Survivors (v1-v3), Clown Brawler (v1 in repo; v2 assembled and pending manual upload), Horses Teach Typing (v1 sources committed; build pending manual upload).

Common scripts: `RectRenderer`, `KeyboardMover`, `Collider`, `SpriteSheet`, `ShapeSprite`, `PauseOverlay`, plus various game-specific behaviors in `games/<name>/scripts/`.

Not yet implemented (live targets in `STATE.md`):

- Wrapper scripts integrating documented libraries (e.g. `audio-player.js` wrapping Howler.js for file-backed audio; jsfxr is already integrated via `engine/audio.js`).
- Shared scene templates: loading, credits, audio settings, controls (some live as game-specific in `games/<name>/scenes/`; promoting to shared has not happened yet).
- Common engine primitives flagged for extraction: `Conductor`/`Scheduler` (factored out of HTTMatchScene and SurvivorsMatchScene), real `Spawner` script (factored out of SurvivorsMatchScene), signal-driven animation player, generic health/damage script.
- Multiplayer foundation (PeerJS-backed `Network` module, deferred until a game demands it).

For state beyond this snapshot, read `docs/STATE.md` directly. This bootstrap document is intentionally not updated to track ongoing work.

## How to update this bootstrap

When something at the bootstrap level changes (new connector added, conventions revised, action recipes need new entries, the snapshot is too stale to be useful), regenerate this file. The repo copy at `docs/project-bootstrap.md` is the source. After regenerating, Trevor manually re-uploads it to project knowledge, which is where fresh Claude sessions actually load it from. Project knowledge files are not auto-synced from the repo.

Edits that warrant a bootstrap update:

- New MCP connector added or removed.
- Significant new action recipe for a recurring kind of request.
- Convention changes that override what's documented here.
- A new top-level folder or major reorganization.
- A new long-running engine module or capability becoming part of the standard build.
- Long-deferred features (e.g., multiplayer) becoming active.

Edits that do NOT warrant a bootstrap update:

- New scenes, scripts, or games (those go in registries and STATE.md).
- New ADRs (those go in DECISIONS.md).
- New resources documented (those go in docs/resources/).
- Day-to-day STATE.md changes.
- Routine engine-module edits that do not change the module set (the bundle is regenerated as part of the commit, but the bootstrap's snapshot section can lag).
