// engine/scene.js
// Owns a collection of GameObjects, provides lifecycle hooks, applies per-object
// transforms during draw, and runs a pairwise AABB collision pass after object updates.
// Depends on: GameObject, Collider scripts (only by duck-typing the isCollider marker).
// Used by: Game, which holds the active scene; game code, which subclasses Scene to define each scene.

var Engine = Engine || {};

class Scene {
  constructor() {
    this.objects = [];
  }

  /** Called by Game when this scene becomes active. Subclasses populate the scene here. */
  enter() {}

  /** Called by Game when this scene is being replaced. Subclasses tear down here. */
  exit() {}

  /** Add a GameObject to the scene. Returns the object for chaining. */
  add(obj) {
    this.objects.push(obj);
    return obj;
  }

  /** Remove a GameObject from the scene. */
  remove(obj) {
    const i = this.objects.indexOf(obj);
    if (i !== -1) this.objects.splice(i, 1);
  }

  /** Iterate GameObjects, update each, then run the collision pass.
   *  Subclasses may override but should call super.update(dt). */
  update(dt) {
    // Snapshot so objects added or removed during update do not corrupt iteration.
    for (const obj of [...this.objects]) {
      obj.update(dt);
    }
    this._collisionPass();
  }

  /** Iterate GameObjects, apply each transform, draw each. Subclasses may override but
   * should call super.draw(ctx) to retain default per-object rendering. */
  draw(ctx) {
    for (const obj of this.objects) {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation);
      ctx.scale(obj.scale, obj.scale);
      obj.draw(ctx);
      ctx.restore();
    }
  }

  /** Find all Collider scripts (duck-typed via isCollider) and run pairwise AABB checks.
   *  Each colliding pair invokes a.onCollide(b) and b.onCollide(a) once per frame.
   *  Broad-phase is O(N^2). Acceptable for hobby-scale games (N < 20 or so).
   *  When a game outgrows this, spatial partitioning can replace this method. */
  _collisionPass() {
    const colliders = [];
    for (const obj of this.objects) {
      for (const s of obj.scripts) {
        if (s.isCollider) {
          colliders.push(s);
        }
      }
    }
    for (let i = 0; i < colliders.length; i++) {
      const a = colliders[i];
      const aBox = a.getAabb();
      for (let j = i + 1; j < colliders.length; j++) {
        const b = colliders[j];
        const bBox = b.getAabb();
        if (aBox.x < bBox.x + bBox.w && aBox.x + aBox.w > bBox.x &&
            aBox.y < bBox.y + bBox.h && aBox.y + aBox.h > bBox.y) {
          a.onCollide(b);
          b.onCollide(a);
        }
      }
    }
  }
}

Engine.Scene = Scene;
