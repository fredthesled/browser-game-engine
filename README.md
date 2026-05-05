# browser-game-engine

A Godot-inspired framework for browser-based 2D games, designed for development entirely through AI chat sessions with no local tooling required. Source code lives as separate JS modules. The shipped artifact is a single HTML file that opens in any browser.

## Structure

- `engine/` — core framework (Scene, GameObject, signals, rendering, input)
- `scenes/` — individual scene definitions, one file per scene
- `objects/` — reusable GameObject types, one file per type
- `scripts/` — attachable behaviors (the equivalent of Godot attached scripts)
- `games/` — actual games built on the engine, each in its own subfolder
- `build/` — compiled single-file HTML outputs for testing
- `docs/` — architecture, conventions, current state, and decisions log

## Reading order for new contributors

1. `docs/STATE.md` for what is currently in progress
2. `docs/ARCHITECTURE.md` for engine design
3. `docs/CONVENTIONS.md` for code rules and edit discipline

If you are an AI assistant joining this repo, start with `CLAUDE.md` at the root.

## Development workflow

This repo is designed to be edited primarily through Claude in browser-based sessions. Source modules are concatenated into a single HTML file in `build/` for testing. No installation, no build tooling, no node_modules at runtime.
