// games/survivors/scripts/coin.js
// Coin dropped by enemies on death. Stationary, 10-second lifetime.
// Fades to half opacity in the last 3 seconds as a pickup warning.
// 16x16 AABB around 8x8 visual for forgiving collection.
// ADR-0010 extension contract: isCollider + getAabb + onCollide.
// Depends on: Engine.Script, Engine.signals.
// Used by: SurvivorsMatchScene (spawns on enemy death).

class SurvivorsCoin extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.value      = options.value ?? 1;
    this._lifetime  = 10;  // 10 seconds; fades to half at < 3s
    this._dead      = false;
    this.isCollider = true;
    this.tag        = 'coin';
  }

  getAabb() {
    return { x: this.host.x - 8, y: this.host.y - 8, w: 16, h: 16 };
  }

  onCollide(other) {
    if (this._dead) return;
    if (other.tag === 'player') {
      this._dead = true;
      Engine.signals.emit('survivors_coin_collected', { value: this.value });
      Engine.signals.emit('survivors_remove', { obj: this.host });
    }
  }

  update(dt) {
    if (this._dead) return;
    this._lifetime -= dt;
    if (this._lifetime <= 0) {
      this._dead = true;
      Engine.signals.emit('survivors_remove', { obj: this.host });
    }
  }

  draw(ctx) {
    if (this._dead) return;
    // Above 3s: fully opaque. Last 3s: eases from 1.0 to 0.5 (stays visible, signals urgency).
    const alpha = this._lifetime < 3 ? 0.5 + 0.5 * (this._lifetime / 3.0) : 1.0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}
