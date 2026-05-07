// games/pong/scripts/paddle-player.js
// Player-controlled paddle for Pong. Responds to Arrow Up/Down or W/S.
// Vertical movement only. Position is clamped to canvas bounds.
// Depends on: Engine.Script, Engine.input.
// Used by: PongMatchScene.

class PongPaddlePlayer extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.speed        = options.speed        ?? 340;
    this.paddleHeight = options.paddleHeight ?? 90;
    this.canvasHeight = options.canvasHeight ?? 600;
  }

  update(dt) {
    const input = Engine.input;
    let dy = 0;
    if (input.isDown('ArrowUp')   || input.isDown('w') || input.isDown('W')) dy -= 1;
    if (input.isDown('ArrowDown') || input.isDown('s') || input.isDown('S')) dy += 1;
    this.host.y += dy * this.speed * dt;
    const half  = this.paddleHeight / 2;
    this.host.y = Math.max(half, Math.min(this.canvasHeight - half, this.host.y));
  }
}
