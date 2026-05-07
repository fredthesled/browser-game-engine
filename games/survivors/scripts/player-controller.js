// games/survivors/scripts/player-controller.js
// Player movement and auto-fire for Survivors.
// Only fires at enemies within stats.range pixels (range indicator drawn as a
// subtle circle). Multi-shot fires odd-count fans so a center-aimed shot is
// always included. Finding the nearest in-range enemy is separated from firing
// so the fire cooldown only resets when a shot is actually taken.
// Depends on: Engine.Script, Engine.input.
//   SurvivorsProjectile must be defined before this file in the build.
// Used by: SurvivorsMatchScene.

class SurvivorsPlayerController extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this._stats        = options.stats;
    this._scene        = options.scene;
    this._enemies      = options.enemies;
    this._fireCooldown = 0;
  }

  update(dt) {
    const input = Engine.input;
    let dx = 0, dy = 0;
    if (input.isDown('ArrowLeft')  || input.isDown('a') || input.isDown('A')) dx -= 1;
    if (input.isDown('ArrowRight') || input.isDown('d') || input.isDown('D')) dx += 1;
    if (input.isDown('ArrowUp')    || input.isDown('w') || input.isDown('W')) dy -= 1;
    if (input.isDown('ArrowDown')  || input.isDown('s') || input.isDown('S')) dy += 1;
    if (dx !== 0 && dy !== 0) { const inv = 1 / Math.sqrt(2); dx *= inv; dy *= inv; }

    const s = this._stats;
    this.host.x = Math.max(s.playerSize / 2, Math.min(s.canvasW - s.playerSize / 2, this.host.x + dx * s.speed * dt));
    this.host.y = Math.max(s.playerSize / 2, Math.min(s.canvasH - s.playerSize / 2, this.host.y + dy * s.speed * dt));

    this._fireCooldown -= dt;
    if (this._fireCooldown <= 0) {
      const target = this._nearestInRange();
      if (target) {
        this._fireAt(target);
        this._fireCooldown = 1 / s.fireRate;
      }
      // Cooldown is only reset when a shot fires; the player shoots instantly
      // when an enemy first enters range rather than waiting for the next interval.
    }
  }

  // Returns the nearest enemy within stats.range, or null.
  _nearestInRange() {
    let nearest = null, bestSq = Infinity;
    const rangeSq = this._stats.range * this._stats.range;
    for (const e of this._enemies) {
      const dx = e.x - this.host.x, dy = e.y - this.host.y;
      const sq = dx * dx + dy * dy;
      if (sq <= rangeSq && sq < bestSq) { bestSq = sq; nearest = e; }
    }
    return nearest;
  }

  _fireAt(target) {
    const dx = target.x - this.host.x, dy = target.y - this.host.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    const s = this._stats, count = s.projectileCount;
    // spread = (count-1)*0.14 ensures symmetric fan with a center shot when count is odd.
    const spread = (count - 1) * 0.14, base = Math.atan2(dy, dx);
    for (let i = 0; i < count; i++) {
      const angle = base + (count > 1 ? -spread / 2 + (spread / (count - 1)) * i : 0);
      const proj  = new Engine.GameObject(this.host.x, this.host.y);
      proj.attach(new SurvivorsProjectile(proj, {
        vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400,
        damage: s.damage, size: s.projectileSize, canvasW: s.canvasW, canvasH: s.canvasH,
      }));
      this._scene.add(proj);
    }
  }

  // Range indicator: subtle circle so the player can see their effective zone.
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, this._stats.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }
}
