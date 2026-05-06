# Third-party libraries

These files are vendored copies of external libraries, included verbatim from upstream sources. Do not modify them. Update them by replacing the file contents from the upstream source.

## jsfxr.js + riffwave.js

- **Source**: https://github.com/chr15m/jsfxr
- **License**: Unlicense (public domain). Full text in `UNLICENSE`.
- **Used by**: `engine/audio.js`
- **What it does**: Procedural retro-style sound effect generator. Sounds are defined as parameter objects; the library renders them to audio buffers via the Web Audio API.

The two files are co-dependent: `jsfxr.js` requires `RIFFWAVE` (from `riffwave.js`) to encode WAV data. Both files attach themselves to `globalThis` (or `window`) via UMD wrappers, exposing `jsfxr` and `RIFFWAVE` as globals. Concatenation order in the build: `riffwave.js`, then `jsfxr.js`, then `audio.js`.

`riffwave.js` is bundled with jsfxr and is also public domain (per its own file header, by Pedro Ladaria).

## How to update

When upstream releases a new version:

1. Replace `engine/lib/jsfxr.js` and `engine/lib/riffwave.js` with the new files from https://github.com/chr15m/jsfxr.
2. Verify the API surface used by `engine/audio.js` is unchanged: `jsfxr.sfxr.generate(presetName)`, `jsfxr.sfxr.toAudio(params)`, `jsfxr.sfxr.play(params)`.
3. Regenerate any game build that uses audio and verify playback.
4. If the API has changed, update `engine/audio.js` accordingly.
