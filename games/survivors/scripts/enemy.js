// games/survivors/scripts/enemy.js
// Enemy for Survivors. Approaches player via 'straight' or 'sine' pattern.
// Carries a coinValue that the projectile includes in survivors_enemy_died so
// the match scene can drop a coin at the death position.
// Damage from projectiles is handled entirely in SurvivorsProjectile.onCollide.
// Depends on: Engine.Script, Engine.signals.
// Used by: SurvivorsMatchScene.

class SurvivorsEnemy extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.speed      = options.speed      ?? 80;
    this.maxHealth  = options.maxHealth  ?? 40;
    this.health     = this.maxHealth;
    this.damage     = options.damage     ?? 10;
    this.size       = options.size       ?? 18;
    this.color      = options.color      ?? '#e74c3c';
    this.xp         = options.xp         ?? 1;
    this.coinValue  = options.coinValue  ?? 3;   // coins dropped on death
    this.pattern    = options.pattern    ?? 'straight';
    this._player         = options.player ?? null;
    this._sinePhase      = 0;
    this._damageCooldown = 0;
    this._dead     = false;
    this.isCollider = true;
    this.tag        = 'enemy';
  }

  getAabb() {
    return { x: this.host.x - this.size / 2, y: this.host.y - this.size / 2, w: this.size, h: this.size };
  }

  onCollide(other) {
    if (this._dead) return;
    if (other.tag === 'player' && this._damageCooldown <= 0) {
      Engine.signals.emit('survivors_player_hit', { damage: this.damage });
      this._damageCooldown = 0.6;
    }
    // Projectile damage handled by SurvivorsProjectile.onCollide.
  }

  update(dt) {
    if (this._dead) return;
    if (this._damageCooldown > 0) this._damageCooldown -= dt;
    if (!this._player) return;
    const dx = this._player.x - this.host.x, dy = this._player.y - this.host.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    let nx = dx / len, ny = dy / len;
    if (this.pattern === 'sine') {
      this._sinePhase += dt * 3.5;
      const px = -ny, py = nx, amp = Math.sin(this._sinePhase) * 0.65;
      nx += px * amp; ny += py * amp;
      const l2 = Math.sqrt(nx * nx + ny * ny);
      if (l2 > 0.001) { nx /= l2; ny /= l2; }
    }
    this.host.x += nx * this.speed * dt;
    this.host.y += ny * this.speed * dt;
  }

  draw(ctx) {
    if (this._dead) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    if (this.health < this.maxHealth) {
      const bw = this.size + 6, bh = 4, bx = -bw / 2, by = -this.size / 2 - 8;
      ctx.fillStyle = '#4b0000'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(bx, by, bw * Math.max(0, this.health / this.maxHealth), bh);
    }
  }
}
