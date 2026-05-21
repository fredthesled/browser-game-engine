// scripts/shape-sprite.js
// Procedural sprite renderer. Animation states are JavaScript draw functions
// that receive a normalized time t in [0, 1] and draw into the host-local
// canvas context. The script manages timing, looping, flip, alpha, and
// optional per-animation easing.
//
// Sister to SpriteSheet (which renders raster frames); use ShapeSprite when
// sprite content is procedurally drawn, use SpriteSheet when it is a raster
// image. The two are interchangeable from the host's perspective and share
// the same lifecycle and method surface.
//
// Changes since initial implementation:
//   - play() now returns `this` for fluent chaining.
//   - onDone(fn) registers a one-shot callback invoked when a non-looping
//     animation completes. Cleared automatically on the next play() call.
//     Allows reactive state transitions without polling isDone() each frame:
//       sprite.play('dying').onDone(() => scene.remove(host));
//   - Animation definitions now accept an optional `easing` field:
//     a function (t) => t applied to the raw linear t before the draw call.
//     Accepts the same functions as Tween's easing library (Tween.easeOutElastic
//     etc.), decoupling visual timing curve from animation duration without
//     requiring per-frame easing logic inside the draw function itself.
//
// Depends on: Engine.Script.
// Used by: game scripts that want procedurally drawn animated sprites.
// See ADR-0015 for design rationale.

var Engine = Engine || {};

class ShapeSprite extends Engine.Script {
  /**
   * @param {GameObject} host
   * @param {object} options
   * @param {object} options.animations - Map of animation name to definition:
   *   {
   *     duration: number,      // seconds from t=0 to t=1. Default 1.0.
   *     loop: boolean,         // true loops, false stops at t=1. Default true.
   *     easing: function,      // optional (t) => t applied before draw.
   *                            // Same signature as Tween easing functions.
   *     draw: function(ctx, state)  // called each frame.
   *   }                        // state is { anim, t, flipX }.
   *                            // t is normalized 0..1 (after easing if set).
   *                            // draws in host-local space; (0,0) = host pos.
   * @param {string} [options.initialAnim] - Animation to start in. Defaults to
   *   the first key in options.animations.
   */
  constructor(host, options = {}) {
    super(host);
    this._animations  = options.animations || {};
    const names       = Object.keys(this._animations);
    this._currentAnim = options.initialAnim || names[0] || '';
    this._elapsed     = 0;
    this._flipX       = false;
    this._done        = false;
    this._onDone      = null;
    this.alpha        = 1.0;
  }

  /** Current animation name. */
  get currentAnim() { return this._currentAnim; }

  /**
   * Switch to a different animation. No-op if name is already current unless
   * force is true. Resets elapsed time and clears done state and any pending
   * onDone callback. Returns `this` for fluent chaining:
   *   sprite.play('dying').onDone(() => scene.remove(host));
   */
  play(name, force = false) {
    if (!force && name === this._currentAnim && !this._done) return this;
    if (!this._animations[name]) {
      console.warn(`ShapeSprite.play: unknown animation '${name}'`);
      return this;
    }
    this._currentAnim = name;
    this._elapsed     = 0;
    this._done        = false;
    this._onDone      = null;
    return this;
  }

  /**
   * Register a one-shot callback invoked when the current non-looping
   * animation completes. Cleared automatically on the next play() call,
   * preventing stale callbacks when animations are interrupted mid-way.
   * Ignored if the current animation is looping (a looping anim never fires
   * isDone and never calls this callback).
   * Returns `this` so it chains naturally from play():
   *   sprite.play('dying').onDone(() => this._state = 'dead');
   */
  onDone(fn) {
    this._onDone = fn;
    return this;
  }

  /**
   * True when a non-looping animation has finished. Stays true until play()
   * is called. Scripts may poll this or use onDone() for the callback path;
   * both are supported and may coexist (onDone fires first).
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
        this._done    = true;
        if (this._onDone) {
          // Clear before invoking to prevent re-entrancy if the callback
          // calls play() and triggers another animation.
          const cb = this._onDone;
          this._onDone = null;
          cb();
        }
      } else {
        this._elapsed = this._elapsed % duration;
      }
    }
  }

  draw(ctx) {
    const anim = this._animations[this._currentAnim];
    if (!anim || typeof anim.draw !== 'function') return;
    const duration = anim.duration > 0 ? anim.duration : 1.0;
    const rawT = Math.min(1, this._elapsed / duration);
    // Apply per-animation easing if defined. This lets the visual timing
    // curve be specified alongside the animation definition rather than
    // baked into the draw function.
    const t     = anim.easing ? anim.easing(rawT) : rawT;
    const state = { anim: this._currentAnim, t, flipX: this._flipX };

    ctx.save();
    if (this.alpha !== 1) ctx.globalAlpha *= this.alpha;
    if (this._flipX) ctx.scale(-1, 1);
    anim.draw(ctx, state);
    ctx.restore();
  }
}

Engine.ShapeSprite = ShapeSprite;
