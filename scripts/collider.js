// scripts/collider.js
// Axis-aligned bounding box collision detection.
// Width and height define the box centered on the host's position.
// Detected collisions invoke onCollide(other) on each Collider in the pair.
// Subclass to override onCollide, or pass an onCollide callback in options.
// Depends on: Engine.Script. Engine.Scene runs the pairwise check via duck-typing on isCollider.
// Used by: any GameObject that should participate in collision detection.

class Collider extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.width = options.width ?? 32;
    this.height = options.height ?? 32;
    this.tag = options.tag ?? '';        // game-defined string for filtering, e.g., 'ball', 'paddle', 'wall'
    this.isCollider = true;               // duck-type marker for Scene to find us
    this._onCollideCallback = options.onCollide ?? null;
  }

  /** Get the AABB in world-space, centered on the host's position. */
  getAabb() {
    return {
      x: this.host.x - this.width / 2,
      y: this.host.y - this.height / 2,
      w: this.width,
      h: this.height
    };
  }

  /** Called by Scene when this Collider overlaps another.
   *  Default: invoke the onCollide callback if one was provided.
   *  Subclasses may override this directly. */
  onCollide(other) {
    if (this._onCollideCallback) {
      this._onCollideCallback(other);
    }
  }
}
