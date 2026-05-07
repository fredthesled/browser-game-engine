// games/survivors/scripts/projectile.js
// Projectile for Survivors. Handles all enemy damage in onCollide (order-
// independent design -- see file header of the previous version for the
// ordering rationale). Now also passes coinValue through survivors_enemy_died
// so the match scene can spawn a coin at the enemy's last position.
// ADR-0010 extension contract: isCollider + getAabb + onCollide.
// Depends on: Engine.Script, Engine.signals.
// Used by: SurvivorsPlayerController (spawns), SurvivorsMatchScene (removes).

class SurvivorsProjectile extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this._vx      = options.vx      ?? 0;
    this._vy      = options.vy      ?? 0;
    this.damage   = options.damage  ?? 25;
    this.size     = options.size    ?? 6;
    this._canvasW = options.canvasW ?? 800;
    this._canvasH = options.canvasH ?? 600;
    this._dead    = false;
    this.isCollider = true;
    this.tag        = 'projectile';
  }

  getAabb() {
    return { x: this.host.x - this.size / 2, y: this.host.y - this.size / 2, w: this.size, h: this.size };
  }

  onCollide(other) {
    if (this._dead) return;
    if (other.tag !== 'enemy' || other._dead) return;
    this._dead   = true;
    other.health -= this.damage;
    if (other.health <= 0) {
      other._dead = true;
      Engine.signals.emit('survivors_enemy_died', {
        obj:       other.host,
        xp:        other.xp,
        coinValue: other.coinValue ?? 0,
      });
      Engine.signals.emit('survivors_remove', { obj: other.host });
    }
    Engine.signals.emit('survivors_remove', { obj: this.host });
  }

  update(dt) {
    if (this._dead) return;
    this.host.x += this._vx * dt;
    this.host.y += this._vy * dt;
    const m = 24;
    if (this.host.x < -m || this.host.x > this._canvasW + m ||
        this.host.y < -m || this.host.y > this._canvasH + m) {
      this._dead = true;
      Engine.signals.emit('survivors_remove', { obj: this.host });
    }
  }

  draw(ctx) {
    if (this._dead) return;
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
  }
}
