# Resources Index

This folder is the durable reference for third-party resources, libraries, and tools we use or might use in this framework. The intent is that future sessions consult these documents before researching from scratch.

## Files

- `assets.md` for sources of sprites, sound effects, music, and fonts. Mostly CC0 and CC-BY libraries.
- `libraries.md` for JavaScript libraries we may bundle (audio playback, sound generation, collision detection, utilities).
- `multiplayer.md` for networking architectures, library choices, and the WebRTC signaling problem.
- `attribution.md` for crediting third-party work inside games, including a credits scene template.

## License policy (summary)

For the formal version, see ADR-0009 in `docs/DECISIONS.md`. In short:

- Prefer CC0, public domain, MIT, BSD, ISC, and Apache 2.0.
- CC-BY is acceptable when attribution is properly handled.
- CC-BY-SA is acceptable but commits the game that uses it to also being CC-BY-SA.
- Avoid GPL for code we bundle (its viral copyleft applies to the rest of the bundle).
- Avoid NC (non-commercial) variants if commercial use is conceivable.

When in doubt, paste the exact license text and source URL into a session and we will evaluate it.

## When adding a new resource

1. Verify the license. Read it (or its standard summary). 30 seconds saves headaches.
2. Add an entry to the relevant file in this folder with: name, URL, license, what it is good for, any caveats.
3. If you use it in a game, add a credits entry per `attribution.md`.
4. If you write a wrapper script for it (e.g., `scripts/sfx-player.js`), update `scripts/_registry.md`.
