# Architecture Decisions

A running log of choices made about how this framework works. Each entry includes context and rationale, so future revisits can determine whether the original reason still applies. Newer entries go at the bottom.

## ADR-0001: Repo structure mirrors Godot's conceptual model

Date: 2026-05-05

**Decision**: Use top-level folders for `engine/`, `scenes/`, `objects/`, `scripts/`, `games/`, and `build/`.

**Context**: The user is comfortable with Godot's separation of scenes, nodes, and scripts and wants the framework to feel familiar. Browser JS allows arbitrary structure, so we adopted Godot's conceptual hierarchy as a starting point rather than a pure component-based ECS or a single-file flat layout.

**Consequences**:

- Anyone familiar with Godot can navigate the repo with minimal ramp-up.
- We commit to the scene/object/script trichotomy. Pure ECS would require a different organization.
- Migration to a different model later would require renames and registry rewrites, but is not blocked.

## ADR-0002: Single-file HTML build target

Date: 2026-05-05

**Decision**: Source code lives as separate JS files. The shipped artifact for each game is a single HTML file in `build/` with all JS inlined.

**Context**: The user has browser-only development constraints (corporate network, no installable tools). A single HTML file runs anywhere, including offline, and avoids module-loading complications when opened from the local filesystem (where ES modules trigger CORS errors in some browsers).

**Consequences**:

- ES module `import` statements are not used at runtime. They may be used in source files for organization, with the build step inlining everything into ordered script tags.
- No external CDN dependencies unless explicitly approved.
- The build step is currently manual: Claude concatenates files into the HTML on request.
- This couples deployment simplicity with a slight loss of in-browser modularity. Acceptable for the target audience and constraints.

## ADR-0003: Documentation as source of truth

Date: 2026-05-05

**Decision**: Markdown files in `docs/` and per-folder `_registry.md` files are authoritative for what exists, what it does, and why. Code is the implementation of the documented spec.

**Context**: Across many AI chat sessions with potentially fresh contexts, we need a stable reference that does not depend on conversation memory. The .md files travel with the repo and survive any context loss.

**Consequences**:

- Every code change requires a documentation update in the same response.
- The CONVENTIONS.md update protocol enforces this.
- If code and docs disagree, the disagreement is a bug to be reconciled, not a normal state.
- Some friction is introduced for small code changes, in exchange for long-term consistency.
