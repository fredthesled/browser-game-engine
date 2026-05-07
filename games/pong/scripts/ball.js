// games/pong/scripts/ball.js
// Ball movement, wall bouncing, and scoring for Pong.
// Implements the ADR-0010 extension contract directly: sets isCollider = true
// and provides getAabb() and onCollide() so Scene._collisionPass() treats this
// script as a collider without requiring a separate Collider attachment.
// Depends on: Engine.Script, Engine.signals, Engine.audio.
// Used by: PongMatchScene.

class PongBall extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.width        = options.width       ?? 12;
    this.height       = options.height      ?? 12;
    this.speed        = options.speed       ?? 280;
    this.canvasWidth  = options.canvasWidth ?? 800;
    this.canvasHeight = options.canvasHeight ?? 600;

    // ADR-0010 duck-type marker.
    this.isCollider = true;

    this._vx = 0;
    this._vy = 0;
    this._active = false;      // false while waiting to serve
    this._resetTimer = 0;      // counts down to serve
    this._collideCooldown = 0; // prevents multi-fire for a single paddle overlap

    this._serve();
  }

  // Place ball at canvas center and queue a serve after a short delay.
  // Called at construction and after each score.
  _serve() {
    this.host.x = this.canvasWidth  / 2;
    this.host.y = this.canvasHeight / 2;
    this._active          = false;
    this._resetTimer      = 1.0;
    this._collideCooldown = 0;

    // Random angle in [-35, +35] degrees from horizontal, random left/right.
    const angle = (Math.random() * 70 - 35) * (Math.PI / 180);
    const dir   = Math.random() < 0.5 ? 1 : -1;
    this._vx = Math.cos(angle) * this.speed * dir;
    this._vy = Math.sin(angle) * this.speed;
  }

  // ADR-0010: world-space AABB centered on host position.
  getAabb() {
    return {
      x: this.host.x - this.width  / 2,
      y: this.host.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }

  // ADR-0010: invoked by Scene._collisionPass() when this AABB overlaps another.
  // 'other' is the colliding script (a Collider with tag='paddle' in Pong).
  onCollide(other) {
    if (!this._active || this._collideCooldown > 0) return;
    if (other.tag !== 'paddle') return;

    // Guard: only respond when moving toward this paddle, not away from it.
    // This prevents a bounce from triggering again on the same overlap.
    const paddleIsToRight = other.host.x > this.host.x;
    if ( paddleIsToRight && this._vx <= 0) return;
    if (!paddleIsToRight && this._vx >= 0) return;

    this._collideCooldown = 0.15;

    // Deflect angle based on how far from paddle center the ball hit.
    // relativeY in [-1, 1]: -1 = top edge, 0 = center, +1 = bottom edge.
    const relativeY = (this.host.y - other.host.y) / (other.height / 2);
    const clamped   = Math.max(-1, Math.min(1, relativeY));
    const deflect   = clamped * (Math.PI / 3); // up to 60-degree deflection

    const xDir  = paddleIsToRight ? -1 : 1;
    this._vx = xDir * Math.cos(deflect) * this.speed;
    this._vy =        Math.sin(deflect) * this.speed;

    Engine.audio.play('paddle_hit');
  }

  update(dt) {
    if (this._collideCooldown > 0) this._collideCooldown -= dt;

    if (!this._active) {
      this._resetTimer -= dt;
      if (this._resetTimer <= 0) this._active = true;
      return;
    }

    this.host.x += this._vx * dt;
    this.host.y += this._vy * dt;

    // Top and bottom wall bounces.
    if (this.host.y - this.height / 2 < 0) {
      this.host.y = this.height / 2;
      this._vy    = Math.abs(this._vy);
      Engine.audio.play('wall_hit');
    } else if (this.host.y + this.height / 2 > this.canvasHeight) {
      this.host.y = this.canvasHeight - this.height / 2;
      this._vy    = -Math.abs(this._vy);
      Engine.audio.play('wall_hit');
    }

    // Scoring zones: ball exits past the canvas left or right edge.
    if (this.host.x < -this.width) {
      Engine.signals.emit('ball_scored', { side: 'right' });
      this._serve();
    } else if (this.host.x > this.canvasWidth + this.width) {
      Engine.signals.emit('ball_scored', { side: 'left' });
      this._serve();
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
  }
}
