// scripts/shape-sprite.js
// Procedural sprite renderer. Animation states are JavaScript draw functions
// that receive a normalized time t in [0, 1] and draw into the host-local
// canvas context. The script manages timing, looping, flip, and alpha.
// Sister to SpriteSheet (which renders raster frames); use ShapeSprite when
// sprite content is procedurally drawn, use SpriteSheet when it is a raster
// image. The two are interchangeable from the host's perspective and share
// the same lifecycle and method surface.
// Depends on: Engine.Script.
// Used by: game scripts that want procedurally drawn animated sprites.
// See ADR-0015 for design rationale.

var Engine = Engine || {};

class ShapeSprite extends Engine.Script {
  /**
   * @param {GameObject} host
   * @param {object} options
   * @param {object} options.animations - Map of animation name to { duration, loop, draw }.
   *   - duration: seconds the animation runs from t=0 to t=1. Defaults to 1.0.
   *   - loop: if false, the animation stops at t=1 and isDone() becomes true.
   *           Defaults to true.
   *   - draw: function(ctx, state) called each frame to draw the current animation.
   *           state is { anim, t, flipX }. t is normalized 0..1 over duration.
   *           Draws in host-local space; (0,0) is the host position.
   * @param {string} [options.initialAnim] - Animation to start in. Defaults to the
   *   first key in options.animations.
   */
  constructor(host, options = {}) {
    super(host);
    this._animations = options.animations || {};
    const names = Object.keys(this._animations);
    this._currentAnim = options.initialAnim || names[0] || '';
    this._elapsed = 0;
    this._flipX = false;
    this._done = false;
    this.alpha = 1.0;
  }

  /** Current animation name. */
  get currentAnim() { return this._currentAnim; }

  /**
   * Switch to a different animation. No-op if name is already current unless
   * force is true. Resets elapsed time and clears done state.
   */
  play(name, force = false) {
    if (!force && name === this._currentAnim && !this._done) return;
    if (!this._animations[name]) {
      console.warn(`ShapeSprite.play: unknown animation '${name}'`);
      return;
    }
    this._currentAnim = name;
    this._elapsed = 0;
    this._done = false;
  }

  /**
   * True when a non-looping animation has finished. Stays true until play()
   * is called with a new animation (or the same one with force=true). The
   * owning script is responsible for transitioning by checking this each frame.
   */
  isDone() { return this._done; }

  /** Mirror horizontally around the host origin. */
  setFlipX(b) { this._flipX = !!b; }

  /** Read current flip state. */
  getFlipX() { return this._flipX; }

  update(dt) {
    if (this._done) return;
    const anim = this._animations[this._currentAnim];
    if (!anim) return;
    const duration = anim.duration > 0 ? anim.duration : 1.0;
    this._elapsed += dt;
    if (this._elapsed >= duration) {
      if (anim.loop === false) {
        this._elapsed = duration;
        this._done = true;
      } else {
        this._elapsed = this._elapsed % duration;
      }
    }
  }

  draw(ctx) {
    const anim = this._animations[this._currentAnim];
    if (!anim || typeof anim.draw !== 'function') return;
    const duration = anim.duration > 0 ? anim.duration : 1.0;
    const t = Math.min(1, this._elapsed / duration);
    const state = { anim: this._currentAnim, t, flipX: this._flipX };

    ctx.save();
    if (this.alpha !== 1) ctx.globalAlpha *= this.alpha;
    if (this._flipX) ctx.scale(-1, 1);
    anim.draw(ctx, state);
    ctx.restore();
  }
}

Engine.ShapeSprite = ShapeSprite;
