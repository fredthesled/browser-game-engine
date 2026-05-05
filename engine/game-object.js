// engine/game-object.js
// Transform host. Owns a list of attached Scripts and delegates lifecycle to them.
// Depends on: Script (only as a contract; not a hard import).
// Used by: Scene, which contains GameObjects; game code, which instantiates them.

var Engine = Engine || {};

class GameObject {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.rotation = 0;  // radians
    this.scale = 1;
    this.scripts = [];
  }

  /** Attach a Script instance. Calls its on_enter hook. Returns the script for chaining. */
  attach(script) {
    this.scripts.push(script);
    if (typeof script.on_enter === 'function') {
      script.on_enter();
    }
    return script;
  }

  /** Detach a Script instance. The structural removal happens before on_exit, so a hook
   * that throws still leaves the object in a consistent state. */
  detach(script) {
    const i = this.scripts.indexOf(script);
    if (i === -1) return;
    this.scripts.splice(i, 1);
    if (typeof script.on_exit === 'function') {
      script.on_exit();
    }
  }

  /** Called by Scene each frame. Delegates to each attached Script. */
  update(dt) {
    for (const s of this.scripts) {
      if (typeof s.update === 'function') s.update(dt);
    }
  }

  /** Called by Scene each frame in host-local space (origin at this.x, this.y, after
   * the Scene has applied translate, rotate, and scale). */
  draw(ctx) {
    for (const s of this.scripts) {
      if (typeof s.draw === 'function') s.draw(ctx);
    }
  }
}

Engine.GameObject = GameObject;
