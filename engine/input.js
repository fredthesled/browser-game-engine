// engine/input.js
// Latched keyboard and mouse state, queried per frame by the active scene.
// Depends on: nothing (uses DOM APIs directly).
// Used by: scripts and scenes that need to read user input. The Game class
// constructs the singleton instance and assigns it to Engine.input.

var Engine = Engine || {};

class Input {
  constructor(canvas = null) {
    this._down = new Set();          // keys currently held down
    this._justPressed = new Set();   // keys pressed this frame
    this._justReleased = new Set();  // keys released this frame
    this._pendingPressed = new Set();
    this._pendingReleased = new Set();

    this.mouse = {
      x: 0,
      y: 0,
      left: false,
      right: false
    };

    this._canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (!this._down.has(e.key)) {
        this._pendingPressed.add(e.key);
      }
      this._down.add(e.key);
    });

    window.addEventListener('keyup', (e) => {
      if (this._down.has(e.key)) {
        this._pendingReleased.add(e.key);
      }
      this._down.delete(e.key);
    });

    // Mouse coordinates are computed relative to the canvas if one was provided,
    // accounting for any CSS scaling between the canvas's display size and its drawing buffer.
    const moveTarget = canvas || window;
    moveTarget.addEventListener('mousemove', (e) => {
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;
      } else {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }
    });

    // Mousedown attaches to the canvas (or window fallback). Mouseup attaches to window
    // so a button held outside the canvas still releases properly.
    const downTarget = canvas || window;
    downTarget.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
  }

  /** True if the named key is currently held down. Uses KeyboardEvent.key values. */
  isDown(key) {
    return this._down.has(key);
  }

  /** True only on the frame the key transitioned from up to down. */
  wasJustPressed(key) {
    return this._justPressed.has(key);
  }

  /** True only on the frame the key transitioned from down to up. */
  wasJustReleased(key) {
    return this._justReleased.has(key);
  }

  /** Called once per frame by Game. Advances "just pressed/released" tracking. */
  update() {
    this._justPressed = this._pendingPressed;
    this._justReleased = this._pendingReleased;
    this._pendingPressed = new Set();
    this._pendingReleased = new Set();
  }
}

Engine.Input = Input;
