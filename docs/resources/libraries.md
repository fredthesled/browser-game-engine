# Libraries

JavaScript libraries we may bundle into games. Every entry includes license, approximate size, what it does, and when to prefer it over rolling our own.

## Audio playback

### Howler.js

- **URL**: https://howlerjs.com/
- **License**: MIT.
- **Size**: ~8 KB gzipped (core).
- **What it does**: Cross-browser audio playback wrapper around Web Audio API and HTML5 Audio. Handles audio sprite sheets (multiple sounds packed in one file), spatial audio, fade in/out, looping, and graceful fallback.
- **When to use**: When loading actual audio files (mp3, ogg, wav) and playing them with effects.
- **When not to use**: For procedurally generated sounds, prefer jsfxr or raw Web Audio. For a single one-shot, raw `new Audio(src).play()` is enough.
- **Integration note**: When we eventually add an audio system to the engine, a `scripts/audio-player.js` script wrapping Howler is the natural shape. Loading and caching can be centralized in a singleton akin to `Engine.input`.

### jsfxr

- **Library URL**: https://github.com/chr15m/jsfxr
- **Web tool**: https://sfxr.me/
- **License**: MIT.
- **Size**: ~5 KB.
- **What it does**: Generates retro 8-bit-style sound effects from a parameter object. The web tool lets you tweak sliders, hear results, and copy a JSON object or short base58 string. The library plays that JSON in your game via Web Audio.
- **API**:
  ```js
  const sound = sfxr.generate('pickupCoin'); // or a custom params object
  sfxr.play(sound);
  ```
- **Available presets**: pickupCoin, laserShoot, explosion, powerUp, hitHurt, jump, blipSelect, synth, tone, click, random.
- **Why this matters**: Sounds live as small JSON in source code. No file management, no asset loading. Ideal for our single-file build.
- **Integration note**: A future `scripts/sfx-player.js` will wrap jsfxr so scripts can call `host.playSfx('pickup')` and have the audio be fully embedded in the build.

### ZzFX

- **URL**: https://github.com/KilledByAPixel/ZzFX
- **License**: MIT.
- **Size**: ~1 KB minified.
- **What it does**: Same idea as jsfxr (procedural retro SFX), even smaller. Single-function API: `zzfx(...params)` plays a sound from an array of numbers.
- **When to choose over jsfxr**: When you want maximum minimization. Sounds are arrays of numbers, often around 30 bytes each.
- **Caveat**: Tuning by ear is harder than jsfxr's slider interface. There is a companion ZzFX Designer tool at https://killedbyapixel.github.io/ZzFX/ for parameter exploration.

### Web Audio API (built in, no library needed)

- **URL**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **License**: N/A (browser standard).
- **What it does**: Low-level audio graph. OscillatorNode, BiquadFilterNode, GainNode, AudioBufferSourceNode.
- **When to use**: When jsfxr / ZzFX / Howler can't do what you need, or for tight in-house music synthesis (beeps, chiptune sequences).
- **When not to use**: When you just need to play a file. Howler is friendlier.

### Tone.js

- **URL**: https://tonejs.github.io/
- **License**: MIT.
- **Size**: ~190 KB minified. Large for our usual budget.
- **What it does**: Web Audio framework for music. Synthesizers, sequencers, timing, effects, transports.
- **When to use**: Procedural music generation, chiptune-style soundtracks composed in code, dynamic music that responds to game state.
- **When not to use**: SFX-only games, or games where music is a static file. The library is large and you would not use most of it.

## Speech

### Web Speech API (built in, no library needed)

- **URL**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **License**: N/A.
- **What it does**: Browser-native text-to-speech (SpeechSynthesis) and speech recognition (SpeechRecognition).
- **TTS minimal usage**:
  ```js
  const u = new SpeechSynthesisUtterance('Game over');
  speechSynthesis.speak(u);
  ```
- **Why this is great**: Zero dependencies, zero API keys. Voices come from the user's OS.
- **Caveats**:
  - Voice availability varies wildly across OSes and browsers. For a consistent voice across all players, do not rely on this.
  - Speech recognition has narrower browser support (mainly Chromium-based) and usually requires an internet connection.
  - Some browsers gate `speak()` until after a user gesture; trigger TTS from a click or keypress.

## Collision detection

### Roll-our-own AABB

For axis-aligned rectangles, the math is one line. Don't pull in a library for this:

```js
function aabbHits(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

A future `scripts/collider.js` will wrap this in a Script that registers itself with the active Scene's collider list. The Scene runs the broad-phase loop; each Collider checks against the others.

### SAT.js

- **URL**: https://github.com/jriecken/sat-js
- **License**: MIT.
- **Size**: ~2 KB gzipped.
- **What it does**: Separating Axis Theorem-based collision detection for circles, boxes, and convex polygons. Returns a Response object with overlap vector for resolution.
- **When to use**: Rotated shapes, polygons, anything beyond axis-aligned rectangles.
- **API**:
  ```js
  const c = new SAT.Circle(new SAT.Vector(10, 10), 20);
  const p = new SAT.Polygon(new SAT.Vector(0, 0), [/* vertices */]);
  const response = new SAT.Response();
  if (SAT.testPolygonCircle(p, c, response)) {
    // response.overlapV is the push-out vector
  }
  ```

### detect-collisions / check2d

- **URL**: https://www.npmjs.com/package/detect-collisions
- **License**: MIT.
- **What it does**: BVH-accelerated collision detection. Heavier than SAT.js but faster for many objects.
- **When to use**: Hundreds of colliders. Unlikely for hobby-scale games.

## Physics

### Matter.js

- **URL**: https://brm.io/matter-js/
- **License**: MIT.
- **Size**: ~85 KB minified.
- **What it does**: Full 2D rigid-body physics. Bodies, constraints, gravity, friction, restitution.
- **When to use**: Games where physics is the gameplay (Angry Birds clones, bridge builders, ragdoll experiments).
- **When not to use**: Most games. Physics adds nondeterminism and complicates multiplayer.

### p2.js

- **URL**: https://github.com/schteppe/p2.js
- **License**: MIT.
- **Status**: Less actively maintained than Matter.js. Mention here for completeness only.

## Networking

See `multiplayer.md` for the full discussion of architecture and trade-offs. Roster:

- **PeerJS** (https://peerjs.com/) is a WebRTC abstraction with a free public signaling broker. MIT.
- **simple-peer** (https://github.com/feross/simple-peer) is a lighter WebRTC wrapper, no broker. MIT. Useful when you want to handle signaling yourself.
- **NetplayJS** (https://github.com/rameshvarun/netplayjs) is a high-level P2P games framework with rollback netcode. MIT. Public matchmaking server provided.

## Utility

### LZ-string

- **URL**: https://github.com/pieroxy/lz-string
- **License**: WTFPL/MIT dual.
- **Size**: ~5 KB.
- **What it does**: Compress and decompress strings. Useful for compact save files in URL fragments or localStorage, or for transmitting larger states over peer-to-peer connections.

### nanoid

- **URL**: https://github.com/ai/nanoid
- **License**: MIT.
- **Size**: ~130 bytes (the browser variant).
- **What it does**: Generates short unique IDs. Useful for multiplayer room codes, save file names, signal correlation IDs.

## What we will not pull in

Worth being explicit about, since these are popular in the broader ecosystem:

- **Phaser, Pixi.js, p5.js**: Full game frameworks. Our engine is the framework. Pulling these in means we have two engines fighting for control of the loop.
- **jQuery, Lodash**: Modern JS makes these unnecessary for our use case.
- **A bundler (webpack, rollup, esbuild)**: We have a manual concatenation step. A real bundler is overkill and conflicts with the no-install constraint.
- **A test framework**: Useful in larger projects, but for a hobby browser-game framework, manual visual verification of each POC is sufficient. Revisit when complexity warrants.
