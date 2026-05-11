// games/survivors/scenes/survivors-match.js
// Core gameplay scene for Survivors.
//
// Wave completion model:
//   Enemies spawn for WAVE_DURATION seconds, then _spawningDone = true.
//   The shop transition only fires when _spawningDone && _enemies.length === 0.
//   This lets the player feel like they finished the wave rather than being cut
//   off mid-fight at the timer expiry.
//
// Fade transitions: _fadeIn counts down from 1.0 on enter (black overlay).
//   _pendingOut holds the queued next scene; a 0.35s fade-to-black runs before
//   setScene() is called. All transitions (wave complete, death, quit) use this.
//
// Coin magnet: _applyMagnet(dt) runs after super.update() each frame. It pulls
//   any SurvivorsCoin objects within stats.magnetRange toward the player at
//   220 px/s. No structural change to the coin script required.
//
// Spawn model: _spawnEnemy rolls a type, then either spawns one enemy
//   (most types) or a cluster of three (swarm). Swarm clusters share an edge
//   and offset perpendicular to the entry direction so they enter the play
//   area as a small group. The level-1 pool includes 'swarm' so initial
//   difficulty already benefits from group spawning.
//
// Signals (all 'survivors_' prefixed):
//   survivors_remove      { obj }               remove a GameObject
//   survivors_enemy_died  { obj, xp, coinValue } increment kills, spawn coin
//   survivors_player_hit  { damage }             reduce player health
//   survivors_coin_collected { value }           add to stats.coins
//
// Depends on: Engine.Scene, Engine.GameObject, Engine.signals, Engine.input,
//   RectRenderer, Collider, PauseOverlay,
//   SurvivorsPlayerController, SurvivorsProjectile, SurvivorsEnemy,
//   SurvivorsCoin, SurvivorsMenuScene, SurvivorsShopScene.
// Used by: SurvivorsMenuScene, SurvivorsShopScene.

class SurvivorsMatchScene extends Engine.Scene {
  constructor(game, options = {}) {
    super();
    this._game  = game;
    this._level = options.level ?? 1;
    this._stats = options.stats ?? {
      maxHealth:100, currentHealth:100, speed:180, fireRate:1.5,
      damage:25, projectileCount:1, projectileSize:6,
      playerSize:20, canvasW:800, canvasH:600,
      range:200, coins:0, upgradeLevels:{}, magnetRange:0,
    };
    this.WAVE_DURATION  = 30;
    this._playerHealth  = 0;
    this._kills         = 0;
    this._waveTimer     = this.WAVE_DURATION;
    this._spawningDone  = false;
    this._spawnTimer    = 1.0;
    this._enemies       = [];
    this._playerObj     = null;
    this._state         = 'playing';
    this._deadTimer     = 3.0;
    this._pause         = null;
    this._unsubscribers = [];
    this._fadeIn        = 1.0;
    this._pendingOut    = null;
    this._fadeOutTimer  = 0;
  }

  // Spawn cadence. Base 1.3s at level 1 (down from 1.5s) so level 1 produces
  // more spawn ticks; combined with swarm-clustering this raises level-1
  // density meaningfully without removing the breathing-room feel of the
  // early game.
  _getSpawnInterval() {
    return Math.max(0.22, 1.3 - (this._level - 1) * 0.13);
  }

  // Enemy type pool. Level 1 now includes one 'swarm' entry (~33% roll rate)
  // so swarm clusters appear from the first wave.
  _getEnemyTypePool() {
    const pool = ['basic', 'basic', 'swarm'];
    if (this._level >= 2) pool.push('swarm', 'swarm');
    if (this._level >= 3) pool.push('sine',  'swarm');
    if (this._level >= 4) pool.push('tank');
    if (this._level >= 5) pool.push('swarm', 'swarm', 'sine');
    if (this._level >= 7) pool.push('tank',  'sine');
    return pool;
  }

  _getEnemyConfig(type) {
    const hm = 1 + (this._level - 1) * 0.10;
    const sm = 1 + (this._level - 1) * 0.04;
    const base = {
      basic: { speed:82,  maxHealth:45,  size:18, damage:10, color:'#e74c3c', xp:1, pattern:'straight', coinValue:3 },
      swarm: { speed:155, maxHealth:14,  size:10, damage:7,  color:'#e67e22', xp:1, pattern:'straight', coinValue:1 },
      tank:  { speed:48,  maxHealth:240, size:32, damage:22, color:'#8e44ad', xp:3, pattern:'straight', coinValue:8 },
      sine:  { speed:98,  maxHealth:32,  size:14, damage:9,  color:'#3498db', xp:1, pattern:'sine',     coinValue:2 },
    };
    const cfg = { ...(base[type] || base.basic) };
    cfg.maxHealth = Math.round(cfg.maxHealth * hm);
    cfg.speed     = Math.round(cfg.speed     * sm);
    return cfg;
  }

  // Picks a random off-screen edge position. Returns the side index so a
  // caller spawning a cluster can offset members perpendicular to the
  // entry direction (along the edge).
  _pickEdgePosition() {
    const { canvasW, canvasH } = this._stats, m = 40;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
      case 0: x = Math.random() * canvasW; y = -m;          break;
      case 1: x = canvasW + m;             y = Math.random() * canvasH; break;
      case 2: x = Math.random() * canvasW; y = canvasH + m; break;
      default: x = -m;                    y = Math.random() * canvasH;
    }
    return { side, x, y };
  }

  _spawnOne(type, x, y) {
    const cfg   = this._getEnemyConfig(type);
    const enemy = new Engine.GameObject(x, y);
    enemy.attach(new SurvivorsEnemy(enemy, { ...cfg, player: this._playerObj }));
    this._enemies.push(enemy);
    this.add(enemy);
  }

  // Rolls a type once, then spawns 1 enemy (most types) or 3 clustered
  // enemies along the same edge (swarm). Cluster spread is perpendicular to
  // the entry direction (x for top/bottom, y for left/right).
  _spawnEnemy() {
    const pool = this._getEnemyTypePool();
    const type = pool[Math.floor(Math.random() * pool.length)];
    const { side, x, y } = this._pickEdgePosition();

    if (type === 'swarm') {
      const SPREAD = 36;
      for (let i = 0; i < 3; i++) {
        const t = (i - 1) * SPREAD; // -SPREAD, 0, +SPREAD
        let ex = x, ey = y;
        if (side === 0 || side === 2) ex += t;
        else                          ey += t;
        this._spawnOne(type, ex, ey);
      }
    } else {
      this._spawnOne(type, x, y);
    }
  }

  // Pulls coins within stats.magnetRange toward the player at 220 px/s.
  _applyMagnet(dt) {
    const mr = this._stats.magnetRange || 0;
    if (mr <= 0 || !this._playerObj) return;
    const px = this._playerObj.x, py = this._playerObj.y;
    const PULL_SPEED = 220;
    for (const obj of this.objects) {
      for (const s of obj.scripts) {
        if (s.tag === 'coin' && !s._dead) {
          const dx = px - obj.x, dy = py - obj.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < mr * mr && distSq > 1) {
            const dist = Math.sqrt(distSq);
            obj.x += (dx / dist) * PULL_SPEED * dt;
            obj.y += (dy / dist) * PULL_SPEED * dt;
          }
        }
      }
    }
  }

  enter() {
    this._playerHealth = this._stats.currentHealth;
    this._kills        = 0;
    this._waveTimer    = this.WAVE_DURATION;
    this._spawningDone = false;
    this._spawnTimer   = 1.0;
    this._enemies      = [];
    this._state        = 'playing';
    this._deadTimer    = 3.0;
    this._fadeIn       = 1.0;
    this._pendingOut   = null;
    this._fadeOutTimer = 0;

    const { canvasW, canvasH, playerSize } = this._stats;
    this._playerObj = new Engine.GameObject(canvasW / 2, canvasH / 2);
    this._playerObj.attach(new RectRenderer(this._playerObj, { width:playerSize, height:playerSize, color:'#2ecc71' }));
    this._playerObj.attach(new SurvivorsPlayerController(this._playerObj, { stats:this._stats, scene:this, enemies:this._enemies }));
    this._playerObj.attach(new Collider(this._playerObj, { width:playerSize, height:playerSize, tag:'player' }));
    this.add(this._playerObj);

    this._pause = new PauseOverlay(this._game, { onQuit: () => {
      this._pendingOut   = new SurvivorsMenuScene(this._game);
      this._fadeOutTimer = 0;
    }});

    this._unsubscribers.push(
      Engine.signals.on('survivors_remove', ({ obj }) => {
        const idx = this._enemies.indexOf(obj); if (idx !== -1) this._enemies.splice(idx, 1);
        this.remove(obj);
      }),
      Engine.signals.on('survivors_enemy_died', ({ obj, coinValue }) => {
        this._kills++;
        if ((coinValue || 0) > 0) {
          const coin = new Engine.GameObject(obj.x, obj.y);
          coin.attach(new SurvivorsCoin(coin, { value: coinValue }));
          this.add(coin);
        }
      }),
      Engine.signals.on('survivors_player_hit', ({ damage }) => {
        if (this._state !== 'playing') return;
        this._playerHealth = Math.max(0, this._playerHealth - damage);
        this._stats.currentHealth = this._playerHealth;
        if (this._playerHealth <= 0) this._state = 'dead';
      }),
      Engine.signals.on('survivors_coin_collected', ({ value }) => {
        this._stats.coins = (this._stats.coins || 0) + value;
      }),
    );
  }

  exit() {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = []; this.objects.length = 0; this._enemies = [];
  }

  update(dt) {
    // Fade-in (visual only, doesn't block logic).
    if (this._fadeIn > 0) this._fadeIn = Math.max(0, this._fadeIn - dt * 2.5);

    // Fade-out to queued next scene.
    if (this._pendingOut) {
      this._fadeOutTimer += dt;
      if (this._fadeOutTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }

    this._pause.update(dt);
    if (this._pause.isPaused()) return;

    if (this._state === 'dead') {
      this._deadTimer -= dt;
      if (this._deadTimer <= 0 || Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
        this._pendingOut   = new SurvivorsMenuScene(this._game);
        this._fadeOutTimer = 0;
      }
      return;
    }

    // Wave timer: spawn until WAVE_DURATION, then stop.
    if (!this._spawningDone) {
      this._waveTimer -= dt;
      if (this._waveTimer <= 0) {
        this._waveTimer    = 0;
        this._spawningDone = true;
      } else {
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0) {
          this._spawnEnemy();
          if (this._level >= 5 && Math.random() < 0.25) this._spawnEnemy();
          this._spawnTimer = this._getSpawnInterval();
        }
      }
    }

    // Wave complete: all enemies cleared after spawning stopped.
    if (this._spawningDone && this._enemies.length === 0) {
      this._stats.currentHealth = this._playerHealth;
      this._pendingOut   = new SurvivorsShopScene(this._game, {
        level: this._level, stats: this._stats, kills: this._kills,
      });
      this._fadeOutTimer = 0;
      return;
    }

    super.update(dt);
    this._applyMagnet(dt);
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
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#e74c3c'; ctx.font='bold 62px monospace'; ctx.fillText('GAME OVER', W/2, H/2-44);
      ctx.fillStyle='#aaaaaa'; ctx.font='20px monospace'; ctx.fillText('Level '+this._level+'   Kills: '+this._kills, W/2, H/2+14);
      ctx.fillStyle='#666666'; ctx.font='16px monospace'; ctx.fillText('SPACE or ENTER to continue', W/2, H/2+54);
      ctx.restore();
    }

    this._pause.draw(ctx);

    // Fade-in overlay (clears as scene opens)
    if (this._fadeIn > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._fadeIn})`;
      ctx.fillRect(0, 0, W, H);
    }
    // Fade-out overlay (builds as scene closes)
    if (this._pendingOut) {
      const a = Math.min(1, this._fadeOutTimer / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawHUD(ctx) {
    const W = this._stats.canvasW, H = this._stats.canvasH;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = '#dddddd'; ctx.font = '14px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const timerPart = this._spawningDone
      ? '   DEFEAT ALL! (' + this._enemies.length + ' left)'
      : '   ' + Math.ceil(Math.max(0, this._waveTimer)) + 's';
    ctx.fillText(
      'LEVEL ' + this._level + timerPart +
      '   KILLS: ' + this._kills +
      '   COINS: ' + (this._stats.coins || 0),
      W / 2, 7
    );
    const bw=220, bh=12, bx=W/2-bw/2, by=H-22;
    const ratio = Math.max(0, this._playerHealth / this._stats.maxHealth);
    ctx.fillStyle='#222'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle=ratio>0.5?'#2ecc71':ratio>0.25?'#f39c12':'#e74c3c';
    ctx.fillRect(bx, by, bw*ratio, bh);
    ctx.fillStyle='#888'; ctx.font='10px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(Math.ceil(this._playerHealth)+' / '+this._stats.maxHealth, W/2, by+bh/2);
    ctx.fillStyle='#333'; ctx.font='11px monospace';
    ctx.textAlign='right'; ctx.textBaseline='bottom';
    ctx.fillText('ESC: pause', W-6, H-4);
    ctx.restore();
  }
}
