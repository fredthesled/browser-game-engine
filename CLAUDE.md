# CLAUDE.md

Operating manual for AI assistants working in this repository. Read this in full at the start of every session, before any other action.

## What this repo is

A browser-only 2D game framework, Godot-inspired, designed for use in environments where:

- No local development tools can be installed
- All editing happens in browser-based AI chat sessions
- The final deliverable must be a single HTML file that runs in any browser

This repo is a long-running framework template intended to support multiple game projects over time. Treat it as durable infrastructure, not a one-off project.

## Read these first, in this order

At the start of every session:

1. `docs/STATE.md` for what was done last and what is in progress
2. `docs/CONVENTIONS.md` for non-negotiable rules
3. `docs/ARCHITECTURE.md` for engine design and lifecycle contracts
4. The relevant `_registry.md` for whatever subsystem you are touching (scenes, objects, or scripts)
5. The specific files you will be modifying

Do not start writing code or planning changes before completing this read. The .md files are the source of truth, not your memory of prior conversations.

## Critical constraints

- Runtime is the browser only. No Node.js, no npm packages at runtime, no bundlers, no build step that requires installation.
- Final deliverable for any game is a single HTML file in `build/` that the user can open directly.
- The user develops on a locked-down corporate network where most external services are blocked. Do not introduce CDN dependencies or third-party API calls without explicit approval.
- Code is organized as separate JS files for clarity, version control, and human readability, but shipped as a concatenated single-file HTML.

## Edit discipline

- Make minimal, targeted changes. Do not refactor unrelated code while editing a file.
- Do not rewrite a file from scratch unless the user has explicitly asked for that.
- Preserve existing comments, function order, and naming unless you have a stated reason to change them.
- If you discover a problem outside the scope of the current task, surface it in your response. Do not silently fix it.
- If you are unsure whether a change is in scope, ask before making it.

## Update protocol

When you change code, you also update the matching documentation in the same response:

- New scene → add an entry to `scenes/_registry.md`
- New object type → add an entry to `objects/_registry.md`
- New script → add an entry to `scripts/_registry.md`
- Architectural change → update `docs/ARCHITECTURE.md` and add an ADR to `docs/DECISIONS.md`
- Any meaningful work → update `docs/STATE.md` at the end of the session

The .md files are authoritative. Code is the implementation of the documented spec. If they disagree, treat the disagreement as a bug to be reconciled, not a normal state.

## Where new things go

- A new reusable GameObject type → `objects/<name>.js` plus registry entry
- A new scene → `scenes/<name>.js` plus registry entry
- A new attachable behavior (mover, collider, animator, etc.) → `scripts/<name>.js` plus registry entry
- A core engine change → existing or new file in `engine/` plus DECISIONS entry
- A specific game built on the engine → `games/<game-name>/` with its own subfolder structure
- A buildable preview → `build/<game-name>.html` (concatenated single-file output)

## Anti-patterns to avoid

- Adding npm dependencies. The runtime is the browser; we have no install step.
- Using ES module `import` statements in the runtime HTML. They are fine in source for organization, but the build step inlines everything into ordered script tags.
- Creating files outside the documented structure without flagging it.
- Skipping the registry update step when adding a new module.
- Assuming you remember prior state from earlier in the conversation. Always re-read STATE.md.
- Producing visual flourishes, marketing language, or padding in code comments and docs. The user values precision.

## Communication style in this Project

The user has explicit preferences that apply to all chat responses and any prose written into the repo:

- No em-dashes. Use commas, parentheses, or rephrasing.
- No emojis.
- No "X isn't just Y, it's also Z" patterns or similar LLM tropes.
- Direct, factually accurate language over softening or pandering.
- Academic and professional tone, treating the user as a domain peer rather than a customer to be reassured.

These apply in chat, in markdown documentation, in code comments, and in commit messages.

## Closing a session

Before ending substantive work in a session:

1. Update `docs/STATE.md` to reflect what was done and what is next.
2. If a meaningful design decision was made, add an ADR entry to `docs/DECISIONS.md`.
3. Commit changes with a descriptive message in the format `<area>: <what changed>`.
   - Examples: `engine: add signal bus`, `docs: revise STATE for sprite work`, `scenes: add main menu`, `init: scaffold repo`.
4. Confirm to the user what was committed and what remains open.
