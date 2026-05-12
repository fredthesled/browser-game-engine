# Dead Files

This document defines the convention for marking files that should be deleted but cannot be, and it serves as the active disposal queue.

## Why dead files exist in this repo

The `GitHub:delete_file` tool requires an in-browser approval step that is not consistently available in our development environment. Files that should be removed sit in the repo until deletion becomes possible. To prevent them from being mistaken for active code in future sessions, dead files are explicitly marked using the convention below.

## Convention

A dead file carries three independent signals, in order of authority:

1. **A banner at the top of the file itself**, in whatever comment syntax fits the file type, containing the sentinel string `DEAD-FILE`. The banner includes:
   - **Status**: a single-line description, typically "Inactive. Not loaded by any build. Do not maintain, modify, or include in builds."
   - **Marked**: date marked dead, ISO format.
   - **Reason**: one line explaining why.
   - **Replacement**: path to the replacement, or "(none)".
   - **Disposal**: standard note pointing here.
   - **Convention**: pointer to this document.

2. **A row in the "Disposal queue" section below**, with the same metadata in tabular form.

3. **A `DEAD` status in the relevant `_registry.md`** if the file appears in a registry. The Notes column carries the human-readable reason and a back-pointer to this document.

The sentinel `DEAD-FILE` is short, distinctive, and grep-friendly. A future session can run a single search across the repo to find every currently-marked dead file without reading this index first.

## Rules for handling dead files

In any session, when a dead file is encountered:

- **Do not modify it** beyond updating its banner if circumstances change (e.g., deletion finally succeeds, or the file is reactivated and the banner is removed entirely).
- **Do not include it in any build.** The registries are the source of truth for build inclusion; a dead file should never appear in any registry as anything other than `DEAD`.
- **Do not flag it as a backlog item** or as something requiring user attention. It is intentionally parked.
- **Do not overwrite it with an empty file** as a pseudo-deletion. Empty files in the tree are worse than annotated dead files: they lose history and lose the signal.
- **Do attempt actual deletion** if the user explicitly requests cleanup AND the deletion tool is currently available.

When marking a new file as dead:

1. Prepend the banner to the file.
2. Add a row to the disposal queue below.
3. Update the relevant registry row to `DEAD` status with a brief Notes pointer.
4. Commit all three changes in one push.

When a dead file is finally deleted (tool approval comes through, the user does a manual `git rm`, etc.):

1. Remove the corresponding row from the disposal queue.
2. Remove the registry row entirely (not just flip the status).
3. Commit.

## Categories

Currently only one category is used: **DEAD**. If finer-grained categorization becomes useful later (e.g., `ARCHIVED` for files intentionally kept for reference, `DEPRECATED` for files still functional but discouraged), a separate ADR should define them. Adding categories prematurely is a documented anti-pattern in `CLAUDE.md` §8.

## Disposal queue

Files currently marked dead, oldest first.

| File | Marked | Reason | Replacement |
|---|---|---|---|
| `games/survivors/scenes/survivors-levelup.js` | 2026-05-12 | Superseded by `SurvivorsShopScene`. | `games/survivors/scenes/survivors-shop.js` |
| `build/clown-brawler-header-placeholder.txt` | 2026-05-12 | Aborted/incomplete HTML build fragment (head and opening `<script>` only). | `build/clown-brawler.html` |
