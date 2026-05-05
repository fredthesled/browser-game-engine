// engine/script.js
// Base class for attachable behaviors. Subclasses define only the lifecycle hooks they need.
// Depends on: nothing.
// Used by: anything in scripts/, indirectly via attachment to GameObjects.

var Engine = Engine || {};

class Script {
  constructor(host) {
    this.host = host;
  }

  // No-op defaults. Subclasses override the hooks they care about.
  on_enter() {}
  update(_dt) {}
  draw(_ctx) {}
  on_exit() {}
}

Engine.Script = Script;
