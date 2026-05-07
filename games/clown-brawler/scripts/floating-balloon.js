// games/clown-brawler/scripts/floating-balloon.js
// Spawned by ClownMatchScene when a gorilla dies.
// The balloon floats upward with slight lateral drift and fades out over ~2.5 seconds,
// then emits brawler_remove so the match scene can clean up the host object.
//
// The host object lives in world space, so the balloon drifts relative to the stage.
//
// Emits:
//   brawler_remove  { obj }  when alpha reaches zero
//
// Depends on: Engine.Script, Engine.signals
// Used by: ClownMatchScene

class FloatingBalloon extends Engine.Script {
  constructor(host, config = {}) {
    super(host);
    this._color    = config.color || '#ff1744';
    this._vy       = -110;                          // upward velocity (px/s)
    this._vx       = (Math.random() - 0.5) * 55;   // random lateral drift
    this._alpha    = 1.0;
    this._fadeRate = 0.42;                          // alpha lost per second
    this._done     = false;
  }

  update(dt) {
    if (this._done) return;
    this.host.x  += this._vx  * dt;
    this.host.y  += this._vy  * dt;
    this._alpha  -= this._fadeRate * dt;
    if (this._alpha <= 0) {
      this._alpha = 0;
      this._done  = true;
      Engine.signals.emit('brawler_remove', { obj: this.host });
    }
  }

  draw(ctx) {
    if (this._done) return;

    ctx.globalAlpha = this._alpha;

    // Short trailing string.
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.bezierCurveTo(4, 4, -3, -10, 0, -22);
    ctx.stroke();

    // Balloon body.
    ctx.fillStyle = this._color;
    ctx.beginPath();
    ctx.ellipse(0, -36, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knot.
    ctx.beginPath();
    ctx.arc(0, -19, 3, 0, Math.PI * 2);
    ctx.fill();

    // Shine.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-4, -43, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}
