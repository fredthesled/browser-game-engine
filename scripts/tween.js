// scripts/tween.js
// Lightweight tween utility for animating numeric object properties over time.
// Not a Script subclass. Works with any object that has numeric properties:
// GameObjects (x, y, rotation, scale), Scripts (alpha), plain state objects.
//
// The caller is responsible for calling tween.update(dt) each frame and
// discarding tweens when done. Two idiomatic patterns:
//
//   Single active tween per script:
//     if (this._tween && this._tween.update(dt)) this._tween = null;
//
//   Managed array in a scene:
//     this._tweens = this._tweens.filter(t => !t.update(dt));
//
// Easing functions are static methods on Tween, all with the signature
// (t: number) => number where t is in [0, 1]. They are also the functions
// accepted by ShapeSprite's per-animation `easing` field.
//
// Depends on: nothing.
// Depended on by: any script or scene that wants property animation.

class Tween {
  /**
   * @param {object}   target   Object whose properties will be interpolated.
   * @param {object}   props    Map of property name to target (end) value.
   *   Each named property must currently exist on target and be numeric.
   *   Start values are captured at construction time.
   * @param {number}   duration Duration in seconds. Clamped to min 0.001.
   * @param {function} [easing] (t) => t easing function. Default linear.
   *   Use any Tween.ease* static for common curves.
   */
  constructor(target, props, duration, easing) {
    this._target   = target;
    this._props    = props;
    this._duration = duration > 0 ? duration : 0.001;
    this._easing   = easing || Tween.linear;
    this._elapsed  = 0;
    this._done     = false;
    this._onComplete = null;

    // Capture start values at construction time.
    this._startValues = {};
    for (const key in props) {
      this._startValues[key] = target[key];
    }
  }

  /**
   * Register a callback invoked once when the tween finishes.
   * Returns `this` for chaining from the constructor:
   *   const t = new Tween(host, { x: 400 }, 0.3, Tween.easeOutQuad)
   *     .onComplete(() => this._state = 'idle');
   */
  onComplete(fn) {
    this._onComplete = fn;
    return this;
  }

  /** True once the tween has completed. Subsequent update() calls return true immediately. */
  isDone() { return this._done; }

  /**
   * Advance the tween by dt seconds. Applies interpolated values to the
   * target object. Returns true on the frame the tween completes (same
   * frame onComplete fires). Safe to call after completion.
   * @param {number} dt
   * @returns {boolean} true if done.
   */
  update(dt) {
    if (this._done) return true;
    this._elapsed += dt;
    const rawT = Math.min(1, this._elapsed / this._duration);
    const et   = this._easing(rawT);

    for (const key in this._props) {
      this._target[key] = this._startValues[key] +
        (this._props[key] - this._startValues[key]) * et;
    }

    if (rawT >= 1) {
      this._done = true;
      if (this._onComplete) this._onComplete();
    }
    return this._done;
  }

  // ── Easing library ──────────────────────────────────────────────────────
  // All functions map t in [0, 1] to approximately [0, 1].
  // easeOutElastic and easeOutBounce briefly overshoot 1 (intentional).
  // easeInBack and easeOutBack briefly undershoot 0 or overshoot 1.
  // Naming follows CSS timing-function convention:
  //   In  = accelerates from rest (slow start)
  //   Out = decelerates to rest (slow end)
  //   InOut = slow start and slow end

  static linear(t) { return t; }

  static easeInQuad(t)    { return t * t; }
  static easeOutQuad(t)   { return t * (2 - t); }
  static easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeInCubic(t)    { return t * t * t; }
  static easeOutCubic(t)   { return (--t) * t * t + 1; }
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Elastic: overshoots then snaps to target. Good for UI pops and hits.
  static easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) *
      Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  }

  // Bounce: simulates a ball bouncing to rest. Good for drops and landings.
  static easeOutBounce(t) {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d)       return n * t * t;
    if (t < 2 / d)       return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d)     return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }

  // Back: briefly overshoots the target before settling. Good for UI buttons.
  static easeInBack(t) {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  }
  static easeOutBack(t) {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
}
