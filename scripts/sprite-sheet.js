// scripts/sprite-sheet.js
// Sprite sheet animation player. Cuts frames from a sheet by (col, row) index and
// renders them centred on the host's origin (or offset by config.offsetX/Y).
//
// Image loading is asynchronous. The script draws nothing until the image is ready;
// everything else in the frame continues normally, so there is no blocking stall.
//
// A module-level cache keyed by src string ensures that multiple objects sharing the
// same sheet (e.g. eight gorilla instances) trigger only one Image load.
//
// Usage:
//   const sprite = new SpriteSheet(host, {
//     src:    ASSETS.player,           // data URI (preferred) or relative URL
//     frameW: 32,                      // source pixels per frame, width
//     frameH: 32,                      // source pixels per frame, height
//     scale:  2,                       // draw at 2x (output: 64x64). Default 1.
//     offsetX: 0,                      // shift draw origin X (default 0)
//     offsetY: -32,                    // shift draw origin Y (negative = up, so feet stay at host Y)
//     anims: {
//       idle:  { frames: [[0,0],[1,0]], fps: 4,  loop: true  },
//       walk:  { frames: [[0,1],[1,1],[2,1],[3,1]], fps: 10, loop: true },
//       punch: { frames: [[0,2],[1,2],[2,2]], fps: 12, loop: false },
//       hurt:  { frames: [[0,3]], fps: 4, loop: false },
//       dead:  { frames: [[0,4]], fps: 4, loop: false },
//     },
//     default: 'idle',                 // animation to play on attach
//   });
//   host.attach(sprite);
//
// API (call from other scripts attached to the same host, or from the scene):
//   sprite.play(name, force=false)  -- switch to named anim (force restarts if already playing)
//   sprite.isDone()                 -- true when a non-looping anim has played through once
//   sprite.currentAnim              -- name of the currently playing animation
//   sprite.setFlipX(bool)           -- mirror horizontally (for left-facing characters)
//   sprite.alpha                    -- readable/writable, applied each draw (default 1)
//
// Depends on: Engine.Script
// Used by: any character script that wants sprited rendering

// Module-level image cache. Keyed by src string; value is an HTMLImageElement.
// Populated on first use, shared across all SpriteSheet instances in the build.
const _ssImageCache = new Map();

function _loadImage(src) {
  if (_ssImageCache.has(src)) return _ssImageCache.get(src);
  const img = new Image();
  img.src = src;
  _ssImageCache.set(src, img);
  return img;
}

class SpriteSheet extends Engine.Script {
  constructor(host, config = {}) {
    super(host);

    // Sheet geometry.
    this._frameW  = config.frameW || 16;
    this._frameH  = config.frameH || 16;
    this._scale   = config.scale  || 1;
    this._offsetX = config.offsetX ?? 0;
    this._offsetY = config.offsetY ?? 0;

    // Animation definitions: { [name]: { frames: [[col,row],...], fps, loop } }
    this._anims   = config.anims  || {};

    // State.
    this._current  = null;   // current animation name
    this._frameIdx = 0;      // index into current anim's frames array
    this._elapsed  = 0;      // seconds since last frame advance
    this._done     = false;  // true when a non-looping anim has finished
    this._flipX    = false;
    this.alpha     = 1;

    // Image (may still be loading when draw is first called).
    this._img = config.src ? _loadImage(config.src) : null;

    // Start on the default animation, but don't call play() yet -- on_enter does that.
    this._defaultAnim = config.default || Object.keys(this._anims)[0] || null;
  }

  // ---- Public API ----

  /** Switch to the named animation. Does nothing if already playing that anim, unless
   *  force=true. Resets frame index and done flag on switch. */
  play(name, force = false) {
    if (!this._anims[name]) {
      console.warn(`SpriteSheet: unknown animation '${name}'`);
      return;
    }
    if (this._current === name && !force) return;
    this._current  = name;
    this._frameIdx = 0;
    this._elapsed  = 0;
    this._done     = false;
  }

  /** True when a non-looping animation has played through its last frame. Stays true
   *  until play() is called with a different (or forced) animation. */
  isDone() { return this._done; }

  /** The name of the currently playing animation, or null if none has been set. */
  get currentAnim() { return this._current; }

  /** Mirror the sprite horizontally. Call this whenever your character changes facing. */
  setFlipX(bool) { this._flipX = !!bool; }

  /** Replace the source image (e.g. swapping character skins). Clears the done flag. */
  setSrc(src) {
    this._img  = _loadImage(src);
    this._done = false;
  }

  // ---- Engine lifecycle ----

  on_enter() {
    if (this._defaultAnim) this.play(this._defaultAnim);
  }

  update(dt) {
    if (!this._current || this._done) return;
    const anim = this._anims[this._current];
    if (!anim || anim.frames.length === 0) return;

    const frameDur = 1 / (anim.fps || 10);
    this._elapsed += dt;

    if (this._elapsed >= frameDur) {
      this._elapsed -= frameDur;
      const next = this._frameIdx + 1;

      if (next >= anim.frames.length) {
        if (anim.loop) {
          this._frameIdx = 0;
        } else {
          // Hold on last frame and mark done.
          this._frameIdx = anim.frames.length - 1;
          this._done = true;
        }
      } else {
        this._frameIdx = next;
      }
    }
  }

  draw(ctx) {
    if (!this._img || !this._img.complete || this._img.naturalWidth === 0) return;
    if (!this._current) return;
    const anim = this._anims[this._current];
    if (!anim || anim.frames.length === 0) return;

    const [col, row] = anim.frames[this._frameIdx];
    const dw = this._frameW * this._scale;
    const dh = this._frameH * this._scale;

    ctx.save();

    if (this.alpha !== 1) ctx.globalAlpha *= this.alpha;

    if (this._flipX) {
      // Mirror around the host origin so offsetX still points the right direction.
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      this._img,
      col * this._frameW,       // source x
      row * this._frameH,       // source y
      this._frameW,             // source w
      this._frameH,             // source h
      this._offsetX - dw / 2,   // dest x: centred, then shifted
      this._offsetY - dh / 2,   // dest y: centred, then shifted
      dw,                       // dest w
      dh,                       // dest h
    );

    ctx.restore();
  }
}
