// games/survivors/scripts/coin.js
// Coin dropped by enemies on death. Sits at the drop position until the player
// walks over it or it expires (20 seconds). Emits survivors_coin_collected when
// collected and survivors_remove when collected or expired. The AABB is 16x16
// around an 8x8 visual for forgiving pickup.
// ADR-0010 extension contract: isCollider + getAabb + onCollide.
// Depends on: Engine.Script, Engine.signals.
// Used by: SurvivorsMatchScene (spawns on enemy death via survivors_enemy_died).

class SurvivorsCoin extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.value     = options.value ?? 1;
    this._lifetime = 20;  // seconds before auto-despawn
    this._dead     = false;
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
    // Fade out in the last 3 seconds to warn the player.
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, this._lifetime / 3.0);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}
