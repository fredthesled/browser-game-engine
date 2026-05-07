// games/survivors/scenes/survivors-match.js
// Core gameplay for Survivors. Owns wave timer, spawner, player, HUD, pause.
// Transitions to SurvivorsLevelupScene on wave end, SurvivorsMenuScene on death.
//
// Spawning runs BEFORE super.update(dt) each frame so enemies are in
// this.objects before projectiles. This keeps enemy index < projectile index in
// _collisionPass(), which is required by the damage contract in projectile.js.
//
// Signals (all 'survivors_' prefixed to avoid cross-game collisions):
//   survivors_remove      { obj }         remove a GameObject
//   survivors_enemy_died  { obj, xp }     increment kill count
//   survivors_player_hit  { damage }      reduce player health
//
// Depends on: Engine.Scene, Engine.GameObject, Engine.signals, Engine.input,
//   RectRenderer, Collider, PauseOverlay,
//   SurvivorsPlayerController, SurvivorsProjectile, SurvivorsEnemy,
//   SurvivorsMenuScene, SurvivorsLevelupScene.
// Used by: SurvivorsMenuScene, SurvivorsLevelupScene.

class SurvivorsMatchScene extends Engine.Scene {
  constructor(game, options = {}) {
    super();
    this._game  = game;
    this._level = options.level ?? 1;
    this._stats = options.stats ?? {
      maxHealth: 100, currentHealth: 100,
      speed: 180,     fireRate: 1.5,
      damage: 25,     projectileCount: 1, projectileSize: 6,
      playerSize: 20, canvasW: 800,       canvasH: 600,
    };
    this.WAVE_DURATION  = 30;
    this._playerHealth  = 0;
    this._kills         = 0;
    this._waveTimer     = this.WAVE_DURATION;
    this._spawnTimer    = 1.0;
    this._enemies       = [];
    this._playerObj     = null;
    this._state         = 'playing';
    this._deadTimer     = 3.0;
    this._pause         = null;
    this._unsubscribers = [];
  }

  _getSpawnInterval() { return Math.max(0.38, 2.0 - (this._level - 1) * 0.13); }

  _getEnemyTypePool() {
    const pool = ['basic', 'basic'];
    if (this._level >= 3) pool.push('swarm', 'swarm', 'swarm');
    if (this._level >= 4) pool.push('sine');
    if (this._level >= 5) pool.push('tank');
    if (this._level >= 6) pool.push('swarm', 'swarm');
    if (this._level >= 8) pool.push('sine', 'sine');
    return pool;
  }

  _getEnemyConfig(type) {
    const c = {
      basic: { speed:80,  maxHealth:40,  size:18, damage:10, color:'#e74c3c', xp:1, pattern:'straight' },
      swarm: { speed:150, maxHealth:12,  size:10, damage:6,  color:'#e67e22', xp:1, pattern:'straight' },
      tank:  { speed:45,  maxHealth:220, size:32, damage:20, color:'#8e44ad', xp:3, pattern:'straight' },
      sine:  { speed:95,  maxHealth:30,  size:14, damage:8,  color:'#3498db', xp:1, pattern:'sine'     },
    };
    return c[type] || c.basic;
  }

  _spawnEnemy() {
    const { canvasW, canvasH } = this._stats, m = 40;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
      case 0: x = Math.random() * canvasW; y = -m;          break;
      case 1: x = canvasW + m;             y = Math.random() * canvasH; break;
      case 2: x = Math.random() * canvasW; y = canvasH + m; break;
      default: x = -m;                    y = Math.random() * canvasH;
    }
    const pool = this._getEnemyTypePool();
    const type = pool[Math.floor(Math.random() * pool.length)];
    const cfg  = this._getEnemyConfig(type);
    const enemy = new Engine.GameObject(x, y);
    enemy.attach(new SurvivorsEnemy(enemy, { ...cfg, player: this._playerObj }));
    this._enemies.push(enemy);
    this.add(enemy);
  }

  enter() {
    this._playerHealth = this._stats.currentHealth;
    this._kills        = 0;
    this._waveTimer    = this.WAVE_DURATION;
    this._spawnTimer   = 1.0;
    this._enemies      = [];
    this._state        = 'playing';
    this._deadTimer    = 3.0;
    const { canvasW, canvasH, playerSize } = this._stats;
    this._playerObj = new Engine.GameObject(canvasW / 2, canvasH / 2);
    this._playerObj.attach(new RectRenderer(this._playerObj, { width:playerSize, height:playerSize, color:'#2ecc71' }));
    this._playerObj.attach(new SurvivorsPlayerController(this._playerObj, { stats:this._stats, scene:this, enemies:this._enemies }));
    this._playerObj.attach(new Collider(this._playerObj, { width:playerSize, height:playerSize, tag:'player' }));
    this.add(this._playerObj);
    this._pause = new PauseOverlay(this._game, { onQuit: () => this._game.setScene(new SurvivorsMenuScene(this._game)) });
    this._unsubscribers.push(
      Engine.signals.on('survivors_remove', ({ obj }) => {
        const idx = this._enemies.indexOf(obj); if (idx !== -1) this._enemies.splice(idx, 1);
        this.remove(obj);
      }),
      Engine.signals.on('survivors_enemy_died', () => { this._kills++; }),
      Engine.signals.on('survivors_player_hit', ({ damage }) => {
        if (this._state !== 'playing') return;
        this._playerHealth = Math.max(0, this._playerHealth - damage);
        this._stats.currentHealth = this._playerHealth;
        if (this._playerHealth <= 0) this._state = 'dead';
      }),
    );
  }

  exit() {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = []; this.objects.length = 0; this._enemies = [];
  }

  update(dt) {
    this._pause.update(dt);
    if (this._pause.isPaused()) return;
    if (this._state === 'dead') {
      this._deadTimer -= dt;
      if (this._deadTimer <= 0 || Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' '))
        this._game.setScene(new SurvivorsMenuScene(this._game));
      return;
    }
    this._waveTimer -= dt;
    if (this._waveTimer <= 0) {
      this._state = 'levelcomplete';
      this._stats.currentHealth = this._playerHealth;
      for (const e of [...this._enemies]) this.remove(e);
      this._enemies.length = 0;
      this._game.setScene(new SurvivorsLevelupScene(this._game, { level:this._level, stats:this._stats, kills:this._kills }));
      return;
    }
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) { this._spawnEnemy(); this._spawnTimer = this._getSpawnInterval(); }
    super.update(dt);
  }

  _bgColor() {
    const p = ['#050510','#051005','#100505','#050a10','#0d0510','#051010'];
    return p[(this._level - 1) % p.length];
  }

  draw(ctx) {
    const W = this._stats.canvasW, H = this._stats.canvasH;
    ctx.fillStyle = this._bgColor(); ctx.fillRect(0, 0, W, H);
    super.draw(ctx);
    this._drawHUD(ctx);
    if (this._state === 'dead') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 62px monospace'; ctx.fillText('GAME OVER', W/2, H/2 - 44);
      ctx.fillStyle = '#aaaaaa'; ctx.font = '20px monospace'; ctx.fillText('Level '+this._level+'   Kills: '+this._kills, W/2, H/2+14);
      ctx.fillStyle = '#666666'; ctx.font = '16px monospace'; ctx.fillText('SPACE or ENTER to continue', W/2, H/2+54);
      ctx.restore();
    }
    this._pause.draw(ctx);
  }

  _drawHUD(ctx) {
    const W = this._stats.canvasW, H = this._stats.canvasH;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = '#dddddd'; ctx.font = '14px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('LEVEL '+this._level+'   '+Math.ceil(Math.max(0,this._waveTimer))+'s   KILLS: '+this._kills, W/2, 7);
    const bw=220, bh=12, bx=W/2-bw/2, by=H-22;
    const ratio = Math.max(0, this._playerHealth / this._stats.maxHealth);
    ctx.fillStyle = '#222'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.fillStyle = '#888'; ctx.font = '10px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(this._playerHealth)+' / '+this._stats.maxHealth, W/2, by+bh/2);
    ctx.fillStyle = '#333'; ctx.font = '11px monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('ESC: pause', W-6, H-4);
    ctx.restore();
  }
}
