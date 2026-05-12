// games/clown-brawler/scripts/floating-balloon.js
// Spawned by ClownMatchScene when a gorilla dies. The balloon floats upward
// with slight lateral drift and fades out over ~2.5 seconds, then emits
// brawler_remove so the match scene can clean up the host object.
//
// Refactored to use ShapeSprite for the visual (per ADR-0015). The balloon
// has a single static animation; position and alpha are driven by this script.
//
// Emits unchanged:
//   brawler_remove  { obj }  when alpha reaches zero
//
// Depends on: Engine.Script, Engine.signals, Engine.ShapeSprite
// Used by: ClownMatchScene

function _balloonAnimations(color) {
  return {
    drift: {
      duration: 1.0,  // unused; the visual is static, position/alpha are external
      loop: true,
      draw: (ctx) => {
        // Short trailing string.
        ctx.strokeStyle = '#9e9e9e';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.bezierCurveTo(4, 4, -3, -10, 0, -22);
        ctx.stroke();

        // Balloon body.
        ctx.fillStyle = color;
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
      },
    },
  };
}

class FloatingBalloon extends Engine.Script {
  constructor(host, config = {}) {
    super(host);
    this._color    = config.color || '#ff1744';
    this._vy       = -110;
    this._vx       = (Math.random() - 0.5) * 55;
    this._alpha    = 1.0;
    this._fadeRate = 0.42;
    this._done     = false;

    this._sprite = new Engine.ShapeSprite(host, {
      animations:  _balloonAnimations(this._color),
      initialAnim: 'drift',
    });
  }

  update(dt) {
    if (this._done) return;
    this.host.x += this._vx * dt;
    this.host.y += this._vy * dt;
    this._alpha -= this._fadeRate * dt;
    if (this._alpha <= 0) {
      this._alpha = 0;
      this._done  = true;
      Engine.signals.emit('brawler_remove', { obj: this.host });
      return;
    }
    this._sprite.alpha = this._alpha;
    this._sprite.update(dt);
  }

  draw(ctx) {
    if (this._done) return;
    this._sprite.draw(ctx);
  }
}
