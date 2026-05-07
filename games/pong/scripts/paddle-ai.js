// games/pong/scripts/paddle-ai.js
// Simple AI opponent paddle for Pong.
// Chases the ball's Y position each frame at a fixed maximum speed.
// Speed is intentionally below the player's (250 vs 340 px/s) so that
// an angled shot to a paddle edge can outpace the AI, making the game
// winnable with skilled play.
// Depends on: Engine.Script.
// Used by: PongMatchScene.

class PongAI extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.speed        = options.speed        ?? 250;
    this.paddleHeight = options.paddleHeight ?? 90;
    this.canvasHeight = options.canvasHeight ?? 600;
    this._ball        = options.ball         ?? null; // reference to the ball's GameObject
  }

  update(dt) {
    if (!this._ball) return;
    const targetY  = this._ball.y;
    const dy       = targetY - this.host.y;
    const maxMove  = this.speed * dt;
    this.host.y   += Math.sign(dy) * Math.min(Math.abs(dy), maxMove);
    const half     = this.paddleHeight / 2;
    this.host.y    = Math.max(half, Math.min(this.canvasHeight - half, this.host.y));
  }
}
