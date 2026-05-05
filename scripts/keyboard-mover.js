// scripts/keyboard-mover.js
// Moves the host GameObject based on arrow key input each frame.
// Diagonal movement is normalized so diagonal speed equals cardinal speed.
// Depends on: Engine.Script, Engine.input.
// Used by: any GameObject that should be moved by the player via arrow keys.

class KeyboardMover extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.speed = options.speed ?? 200; // pixels per second
  }

  update(dt) {
    const input = Engine.input;
    let dx = 0;
    let dy = 0;
    if (input.isDown('ArrowLeft')) dx -= 1;
    if (input.isDown('ArrowRight')) dx += 1;
    if (input.isDown('ArrowUp')) dy -= 1;
    if (input.isDown('ArrowDown')) dy += 1;
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }
    this.host.x += dx * this.speed * dt;
    this.host.y += dy * this.speed * dt;
  }
}
