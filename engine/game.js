// engine/game.js
// Owns the animation loop, the canvas, and the active scene. Constructs the Input singleton.
// Depends on: Engine.Input (instantiated here), an active scene (held but not imported).
// Used by: top-level bootstrap code in build/ and games/ subfolders.

var Engine = Engine || {};

class Game {
  constructor(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new Error('Game requires a canvas element.');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentScene = null;
    this._pendingScene = null;
    this._lastFrameTime = 0;
    this._animationHandle = null;
    this._running = false;

    // Create the Input singleton with this game's canvas reference.
    Engine.input = new Engine.Input(canvas);
  }

  /** Begin the requestAnimationFrame loop. Idempotent. */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();
    this._animationHandle = requestAnimationFrame((t) => this._frame(t));
  }

  /** Cancel the loop. */
  stop() {
    this._running = false;
    if (this._animationHandle !== null) {
      cancelAnimationFrame(this._animationHandle);
      this._animationHandle = null;
    }
  }

  /** Queue a scene transition. The swap occurs at the next frame boundary. */
  setScene(scene) {
    this._pendingScene = scene;
  }

  _frame(now) {
    if (!this._running) return;

    let dt = (now - this._lastFrameTime) / 1000;
    if (dt > 0.1) dt = 0.1; // clamp to avoid huge jumps after tab inactivity or breakpoints
    this._lastFrameTime = now;

    // Apply pending scene transition before any per-frame work.
    if (this._pendingScene) {
      if (this.currentScene) this.currentScene.exit();
      this.currentScene = this._pendingScene;
      this._pendingScene = null;
      this.currentScene.enter();
    }

    // Advance input "just pressed/released" tracking before scene reads it.
    Engine.input.update();

    if (this.currentScene) {
      this.currentScene.update(dt);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.currentScene.draw(this.ctx);
    }

    this._animationHandle = requestAnimationFrame((t) => this._frame(t));
  }
}

Engine.Game = Game;
