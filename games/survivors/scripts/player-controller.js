// games/survivors/scripts/player-controller.js
// Player movement (WASD/arrows, normalized diagonal) and auto-fire.
// Finds nearest enemy, fires SurvivorsProjectile objects at stats.fireRate.
// Multi-shot fans projectiles around the aim angle when projectileCount > 1.
// Depends on: Engine.Script, Engine.input.
//   SurvivorsProjectile must be defined before this file in the build.
// Used by: SurvivorsMatchScene.

class SurvivorsPlayerController extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this._stats   = options.stats;    // shared stats object, read live each frame
    this._scene   = options.scene;    // scene ref for spawning projectile GameObjects
    this._enemies = options.enemies;  // array of enemy GameObjects maintained by scene
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
    if (this._fireCooldown <= 0 && this._enemies.length > 0) {
      this._fire();
      this._fireCooldown = 1 / s.fireRate;
    }
  }

  _fire() {
    let nearest = null, bestSq = Infinity;
    for (const e of this._enemies) {
      const dx = e.x - this.host.x, dy = e.y - this.host.y;
      const sq = dx * dx + dy * dy;
      if (sq < bestSq) { bestSq = sq; nearest = e; }
    }
    if (!nearest) return;
    const dx = nearest.x - this.host.x, dy = nearest.y - this.host.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    const s = this._stats, count = s.projectileCount;
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
}
