var Engine = Engine || {};
class EngineAudio {
  constructor() { this._sounds=new Map(); this._cache=new Map(); this._volume=0.5; this._muted=false; }
  register(name, paramsOrPreset) {
    const params = typeof paramsOrPreset==='string' ? jsfxr.sfxr.generate(paramsOrPreset) : paramsOrPreset;
    this._sounds.set(name, params); this._cache.delete(name);
  }
  play(name) {
    if (this._muted) return;
    const params = this._sounds.get(name);
    if (!params) { console.warn(`Engine.audio: unknown sound '${name}'`); return; }
    let audio = this._cache.get(name);
    if (!audio) { audio = jsfxr.sfxr.toAudio(params); this._cache.set(name, audio); }
    audio.setVolume(this._volume); audio.play();
  }
  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }
  getVolume()  { return this._volume; }
  setMuted(b)  { this._muted = !!b; }
  isMuted()    { return this._muted; }
}
Engine.Audio = EngineAudio;
