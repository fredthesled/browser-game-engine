// engine/audio.js
// Wraps jsfxr to provide a register/play API for retro sound effects.
// Sounds live as parameter objects (JSON), no asset files needed.
// Depends on: jsfxr (loaded from engine/lib/sfxr.js, which depends on RIFFWAVE
// from engine/lib/riffwave.js). All three must be concatenated before this file.
// Used by: scripts and scenes that want to play SFX. The Game class
// constructs the singleton instance and assigns it to Engine.audio.
//
// Browser autoplay policy: AudioContext starts suspended until a user gesture.
// The first sound played from a user-gesture handler (keypress, click) unlocks
// audio for the rest of the session. Calling play() before any user gesture
// may produce no sound, depending on the browser; it is a silent no-op rather
// than an error.
//
// Naming note: the class is declared as EngineAudio rather than Audio to avoid
// shadowing the global window.Audio (HTMLAudioElement) inside concatenated
// build files. The public name on the engine namespace is still Engine.Audio.
// This matters because jsfxr's internal AudioContext-unavailable fallback uses
// `new Audio()` as a bare-name reference, which in classic-script context
// resolves to whichever `Audio` was declared most recently in the global
// lexical environment. Naming the class EngineAudio leaves window.Audio
// unshadowed for that fallback path.

var Engine = Engine || {};

class EngineAudio {
  constructor() {
    this._sounds = new Map();   // name -> jsfxr params object
    this._cache = new Map();    // name -> cached audio object (compiled once, played many times)
    this._volume = 1.0;
    this._muted = false;
  }

  /** Register a sound under a name.
   *  paramsOrPreset can be a jsfxr params object (e.g., copied from sfxr.me) or
   *  a preset name string. Available presets: 'pickupCoin', 'laserShoot',
   *  'explosion', 'powerUp', 'hitHurt', 'jump', 'blipSelect', 'synth', 'tone',
   *  'click', 'random'. */
  register(name, paramsOrPreset) {
    let params;
    if (typeof paramsOrPreset === 'string') {
      params = jsfxr.sfxr.generate(paramsOrPreset);
    } else {
      params = paramsOrPreset;
    }
    this._sounds.set(name, params);
    this._cache.delete(name);  // invalidate cache if previously registered
  }

  /** Play a registered sound by name. Silent no-op if name is unknown or muted. */
  play(name) {
    if (this._muted) return;
    const params = this._sounds.get(name);
    if (!params) {
      console.warn(`Engine.audio: unknown sound '${name}'. Did you call register(name, ...) first?`);
      return;
    }
    let audio = this._cache.get(name);
    if (!audio) {
      audio = jsfxr.sfxr.toAudio(params);
      this._cache.set(name, audio);
    }
    audio.setVolume(this._volume);
    audio.play();
  }

  /** Set the master volume (0.0 to 1.0). Affects all subsequent plays. */
  setVolume(volume) {
    this._volume = Math.max(0, Math.min(1, volume));
  }

  /** Get the current master volume. */
  getVolume() {
    return this._volume;
  }

  /** Mute or unmute all sounds. While muted, play() is a no-op. */
  setMuted(muted) {
    this._muted = !!muted;
  }

  /** True if currently muted. */
  isMuted() {
    return this._muted;
  }
}

Engine.Audio = EngineAudio;
