// engine/scene.js
// Owns a collection of GameObjects, provides lifecycle hooks, and applies per-object
// transforms during draw.
// Depends on: GameObject (only as a contract; not a hard import).
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

  /** Iterate GameObjects and update each. Subclasses may override but should call super.update(dt). */
  update(dt) {
    // Snapshot so objects added or removed during update do not corrupt iteration.
    for (const obj of [...this.objects]) {
      obj.update(dt);
    }
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
}

Engine.Scene = Scene;
