// games/clown-brawler/scenes/clown-match.js
// Core gameplay scene for Clown Brawler.
//
// Belt-scrolling model:
//   The stage is STAGE_W x canvas-height.  The camera follows the player on X
//   with smooth lag.  In draw(), a ctx.translate(-camX, 0) wraps super.draw()
//   so all GameObjects render at their world-space coordinates without needing
//   individual offset compensation.  HUD, overlays, and fades are drawn after
//   ctx.restore() in screen space.
//
//   Objects are Z-sorted by Y before super.draw() so characters deeper in the
//   belt (lower Y = further back) render behind characters at the front.
//
// Background parallax layers:
//   Clouds    (parallax 0.08): very slow drift, 1600px tile with seamless wrap.
//   Buildings (parallax 0.28): mid-speed, 1100px tile with window grids.
//   Floor     (parallax 1.00): vertical tile marks every 80px offset by camX,
//                               the primary horizontal-motion readability cue.
//
// Combat:
//   Player: Space/Z/X to punch.  The active hit window (isAttacking) is checked
//   each frame in _checkPlayerPunch(); each gorilla can only be hit once per swing
//   via a per-punch hit Set on the player script.
//   Gorillas: emit brawler_gorilla_attack when their windup completes and the
//   player is still in range.  This scene routes that to playerScript.takeHit(1).
//
// Wave model:
//   3 waves (4 / 6 / 8 gorillas).  When _enemies is empty a 2.5s wave-clear pause
//   runs before the next wave.  After wave 3, the game transitions to 'victory'.
//   Player health carries between waves.
//
// Signals consumed:
//   brawler_remove           { obj }           remove a world GameObject
//   brawler_balloon_release  { x, y, color }   spawn a FloatingBalloon
//   brawler_gorilla_attack   {}                 player takes 1 damage
//   brawler_player_died      {}                 trigger game-over state
//
// Depends on: Engine.Scene, Engine.GameObject, Engine.signals, Engine.input,
//   PauseOverlay, ClownPlayer, GorillaEnemy, FloatingBalloon, ClownMenuScene
// Used by: ClownMenuScene (start), PauseOverlay quit path (return)

class ClownMatchScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;

    // Canvas and stage dimensions.
    this.W       = 800;
    this.H       = 500;
    this.STAGE_W = 2400;
    this.FLOOR_MIN = 310;   // Y of back edge of belt (furthest from viewer)
    this.FLOOR_MAX = 455;   // Y of front edge (closest to viewer)

    // Camera.
    this._camX = 0;

    // Player.
    this._playerObj    = null;
    this._playerScript = null;

    // Enemy and balloon tracking (parallel to this.objects).
    this._enemies  = [];   // [{ obj, script }]
    this._balloons = [];   // [obj]  floating balloons

    // Wave state.
    this._wave       = 1;
    this.TOTAL_WAVES = 3;
    this._state      = 'fighting';  // 'fighting' | 'wave_clear' | 'game_over' | 'victory'
    this._waveClearTimer = 0;

    // Signal unsubscribers.
    this._unsubs = [];

    // Pause overlay.
    this._pause = null;

    // Fades.
    this._fadeIn     = 1.0;
    this._pendingOut = null;
    this._fadeTimer  = 0;
  }

  // ---- Lifecycle ----

  enter() {
    this._camX           = 0;
    this._enemies        = [];
    this._balloons       = [];
    this._wave           = 1;
    this._state          = 'fighting';
    this._waveClearTimer = 0;
    this._fadeIn         = 1.0;
    this._pendingOut     = null;
    this._fadeTimer      = 0;

    this._spawnPlayer();
    this._spawnWave(1);

    this._pause = new PauseOverlay(this._game, {
      onQuit: () => {
        this._pendingOut = new ClownMenuScene(this._game);
        this._fadeTimer  = 0;
      },
    });

    this._unsubs.push(
      Engine.signals.on('brawler_remove', ({ obj }) => {
        this.remove(obj);
        this._enemies  = this._enemies.filter(e => e.obj !== obj);
        this._balloons = this._balloons.filter(b => b  !== obj);
      }),
      Engine.signals.on('brawler_balloon_release', ({ x, y, color }) => {
        this._spawnBalloon(x, y, color);
      }),
      Engine.signals.on('brawler_gorilla_attack', () => {
        if (this._playerScript) this._playerScript.takeHit(1);
      }),
      Engine.signals.on('brawler_player_died', () => {
        this._state = 'game_over';
      }),
    );

    // Audio registrations.  Presets roll randomized parameters at register time.
    Engine.audio.register('brawler_punch',      'hitHurt');
    Engine.audio.register('brawler_player_hit', 'explosion');
    Engine.audio.register('brawler_enemy_hit',  'hitHurt');
    Engine.audio.register('brawler_enemy_die',  'explosion');
    Engine.audio.register('brawler_wave_clear', 'powerUp');
  }

  exit() {
    for (const u of this._unsubs) u();
    this._unsubs    = [];
    this.objects.length = 0;
    this._enemies   = [];
    this._balloons  = [];
  }

  // ---- Update ----

  update(dt) {
    if (this._fadeIn > 0) this._fadeIn = Math.max(0, this._fadeIn - 2.5 * dt);

    if (this._pendingOut) {
      this._fadeTimer += dt;
      if (this._fadeTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }

    this._pause.update(dt);
    if (this._pause.isPaused()) return;

    if (this._state === 'fighting') {
      super.update(dt);
      this._checkPlayerPunch();
      this._updateCamera(dt);

      if (this._enemies.length === 0 && this._playerScript && !this._playerScript.dead) {
        this._state          = 'wave_clear';
        this._waveClearTimer = 2.5;
        Engine.audio.play('brawler_wave_clear');
      }

    } else if (this._state === 'wave_clear') {
      // Keep balloons and any lingering effects updating.
      super.update(dt);
      this._updateCamera(dt);

      this._waveClearTimer -= dt;
      if (this._waveClearTimer <= 0) {
        this._wave++;
        if (this._wave > this.TOTAL_WAVES) {
          this._state = 'victory';
        } else {
          this._spawnWave(this._wave);
          this._state = 'fighting';
        }
      }

    } else if (this._state === 'game_over' || this._state === 'victory') {
      // Still update balloons and scene so things look alive.
      super.update(dt);
      if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
        this._pendingOut = new ClownMenuScene(this._game);
        this._fadeTimer  = 0;
      }
    }
  }

  // -- Combat helpers --

  _checkPlayerPunch() {
    if (!this._playerScript || !this._playerScript.isAttacking) return;
    const hitSet = this._playerScript.punchHitSet;
    const px = this._playerObj.x;
    const py = this._playerObj.y;
    const f  = this._playerScript.facing;

    for (const { obj, script } of this._enemies) {
      if (hitSet.has(obj) || script.dead || script.isDying) continue;
      // dx is signed in facing direction: positive means the enemy is "in front".
      const dx = (obj.x - px) * f;
      const dy = Math.abs(obj.y - py);
      if (dx > -20 && dx < 92 && dy < 55) {
        script.takeHit();
        hitSet.add(obj);
      }
    }
  }

  _updateCamera(dt) {
    if (!this._playerObj) return;
    const target = this._playerObj.x - this.W / 2;
    this._camX  += (target - this._camX) * Math.min(1, 5 * dt);
    this._camX   = Math.max(0, Math.min(this.STAGE_W - this.W, this._camX));
  }

  // ---- Spawning ----

  _spawnPlayer() {
    this._playerObj    = new Engine.GameObject(220, 385);
    this._playerScript = new ClownPlayer(this._playerObj, {
      maxHealth: 5,
      floorMin:  this.FLOOR_MIN,
      floorMax:  this.FLOOR_MAX,
      stageW:    this.STAGE_W,
    });
    this._playerObj.attach(this._playerScript);
    this.add(this._playerObj);
  }

  _spawnWave(waveNum) {
    const configs = this._waveConfigs(waveNum);
    for (const cfg of configs) {
      const obj    = new Engine.GameObject(cfg.x, cfg.y);
      const script = new GorillaEnemy(obj, { health: cfg.health, speed: cfg.speed });
      script.setPlayer(this._playerObj);
      obj.attach(script);
      this.add(obj);
      this._enemies.push({ obj, script });
    }
  }

  _waveConfigs(wave) {
    // Gorilla counts: 4, 6, 8.  Spread across stage X.
    const counts = [4, 6, 8];
    const count  = counts[Math.min(wave - 1, counts.length - 1)];
    const yPool  = [340, 370, 410, 440, 355, 395, 425, 445];
    const health = wave >= 3 ? 4 : 3;
    const configs = [];

    for (let i = 0; i < count; i++) {
      // Spread gorillas evenly with jitter.
      const xBase = 480 + i * (1700 / Math.max(count - 1, 1));
      configs.push({
        x:      xBase + (Math.random() - 0.5) * 100,
        y:      yPool[i % yPool.length],
        health: health,
        speed:  62 + wave * 10 + Math.random() * 18,
      });
    }
    return configs;
  }

  _spawnBalloon(x, y, color) {
    const obj    = new Engine.GameObject(x, y);
    const script = new FloatingBalloon(obj, { color });
    obj.attach(script);
    this.add(obj);
    this._balloons.push(obj);
  }

  // ---- Draw ----

  draw(ctx) {
    // 1. Background (screen space, does not scroll).
    this._drawBackground(ctx);

    // 2. World objects, translated by camera offset.
    //    Z-sort by Y so characters further back render first.
    this.objects.sort((a, b) => a.y - b.y);

    ctx.save();
    ctx.translate(-Math.round(this._camX), 0);
    super.draw(ctx);
    ctx.restore();

    // 3. HUD, overlays, fades (screen space).
    this._drawHUD(ctx);
    this._drawStateOverlay(ctx);
    this._pause.draw(ctx);

    if (this._fadeIn > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._fadeIn})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this._pendingOut) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this._fadeTimer / 0.35)})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  _drawBackground(ctx) {
    const W = this.W, H = this.H;
    const camX = this._camX;

    // --- Sky gradient (no parallax; sky is infinite) ---
    const sky = ctx.createLinearGradient(0, 0, 0, this.FLOOR_MIN);
    sky.addColorStop(0, '#5c9ec7');
    sky.addColorStop(1, '#b8dff5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, this.FLOOR_MIN);

    // --- Cloud layer (parallax 0.08 -- very distant) ---
    // Defined in a 1600px tile so they wrap seamlessly over the 2400px stage.
    const CLOUD_TILE = 1600;
    const cloudOffset = (camX * 0.08) % CLOUD_TILE;
    const clouds = [
      { x:  80, y: 55,  r: 28 }, { x: 310, y: 40,  r: 22 },
      { x: 560, y: 70,  r: 32 }, { x: 890, y: 38,  r: 20 },
      { x:1150, y: 60,  r: 26 }, { x:1400, y: 45,  r: 24 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    for (const c of clouds) {
      // Draw at both tile offsets to cover any wrap position.
      for (let tile = 0; tile <= 1; tile++) {
        const cx = c.x - cloudOffset + tile * CLOUD_TILE;
        if (cx + c.r * 3 < 0 || cx - c.r * 3 > W) continue;
        // Three overlapping circles make a convincing puff.
        ctx.beginPath(); ctx.arc(cx,        c.y, c.r,        0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + c.r,  c.y, c.r * 0.78, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - c.r,  c.y, c.r * 0.65, 0, Math.PI*2); ctx.fill();
      }
    }

    // --- Building layer (parallax 0.28 -- mid distance) ---
    // Tiles every 1100px so buildings loop over the full stage scroll range.
    const BLDG_TILE = 1100;
    const bldgOffset = (camX * 0.28) % BLDG_TILE;
    const BLDG_COLOR_FAR  = '#3d5c73';
    const BLDG_COLOR_MID  = '#2e4a5e';
    const buildings = [
      { x:  40, w: 90,  h:100, dark:false }, { x: 185, w: 55, h:145, dark:true  },
      { x: 290, w:110,  h: 75, dark:false }, { x: 450, w: 70, h:125, dark:true  },
      { x: 570, w: 85,  h: 95, dark:false }, { x: 700, w:100, h:115, dark:true  },
      { x: 850, w: 60,  h:130, dark:false }, { x: 980, w: 80, h: 85, dark:true  },
    ];
    for (const b of buildings) {
      ctx.fillStyle = b.dark ? BLDG_COLOR_MID : BLDG_COLOR_FAR;
      for (let tile = 0; tile <= 1; tile++) {
        const bx = b.x - bldgOffset + tile * BLDG_TILE;
        if (bx + b.w < 0 || bx > W) continue;
        ctx.fillRect(bx, this.FLOOR_MIN - b.h, b.w, b.h);
        // Simple window grid on each building.
        ctx.fillStyle = 'rgba(255,240,160,0.18)';
        for (let wy = this.FLOOR_MIN - b.h + 10; wy < this.FLOOR_MIN - 12; wy += 18) {
          for (let wx = bx + 8; wx < bx + b.w - 8; wx += 16) {
            ctx.fillRect(wx, wy, 8, 10);
          }
        }
        ctx.fillStyle = b.dark ? BLDG_COLOR_MID : BLDG_COLOR_FAR;
      }
    }

    // --- Floor belt ---
    const floor = ctx.createLinearGradient(0, this.FLOOR_MIN, 0, H);
    floor.addColorStop(0, '#7c6242');
    floor.addColorStop(1, '#5c4830');
    ctx.fillStyle = floor;
    ctx.fillRect(0, this.FLOOR_MIN, W, H - this.FLOOR_MIN);

    // Horizon line.
    ctx.fillStyle = '#4a3522';
    ctx.fillRect(0, this.FLOOR_MIN - 3, W, 5);

    // --- Floor tile marks (parallax 1.0 -- fully tied to world) ---
    // Vertical marks every 80px, offset by camX so they scroll at full camera speed.
    // This is the primary horizontal-motion readability cue.
    const TILE_W = 80;
    const tileOffset = camX % TILE_W;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    for (let kx = -tileOffset; kx < W + TILE_W; kx += TILE_W) {
      ctx.beginPath();
      ctx.moveTo(Math.round(kx), this.FLOOR_MIN);
      ctx.lineTo(Math.round(kx), H);
      ctx.stroke();
    }

    // Horizontal lane lines (static depth cue).
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let ly = this.FLOOR_MIN + 40; ly < H; ly += 55) {
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(W, ly);
      ctx.stroke();
    }
  }

  _drawHUD(ctx) {
    const W = this.W, H = this.H;
    ctx.save();

    // Top bar.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 30);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ddd';
    ctx.font         = '14px monospace';

    const waveLabel = this._state === 'wave_clear'
      ? 'WAVE ' + this._wave + ' CLEAR!'
      : 'WAVE ' + this._wave + ' / ' + this.TOTAL_WAVES
        + '   ENEMIES: ' + this._enemies.length;
    ctx.fillText(waveLabel, W / 2, 15);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#555';
    ctx.font      = '11px monospace';
    ctx.fillText('ESC: pause', W - 6, 22);

    // Player health bar at the bottom.
    if (this._playerScript) {
      const bw    = 200, bh = 14;
      const bx    = W / 2 - bw / 2, by = H - 22;
      const ratio = Math.max(0, this._playerScript.health / this._playerScript.maxHealth);

      ctx.fillStyle = '#222';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(bx, by, bw * ratio, bh);

      ctx.fillStyle    = '#888';
      ctx.font         = '10px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this._playerScript.health + ' / ' + this._playerScript.maxHealth,
        W / 2, by + bh / 2,
      );

      // HP label.
      ctx.fillStyle    = '#aaa';
      ctx.textAlign    = 'right';
      ctx.font         = '11px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText('HP', bx - 4, by + bh / 2);
    }

    ctx.restore();
  }

  _drawStateOverlay(ctx) {
    const W = this.W, H = this.H;

    if (this._state === 'wave_clear') {
      // Brief "WAVE CLEAR" banner.
      ctx.save();
      const alpha = Math.min(1, this._waveClearTimer > 1.5
        ? (2.5 - this._waveClearTimer) / 1.0      // fade in
        : this._waveClearTimer / 1.0);             // fade out near end
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H / 2 - 55, W, 110);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#ffeb3b';
      ctx.font         = 'bold 52px monospace';
      ctx.fillText('WAVE ' + this._wave + ' CLEAR!', W / 2, H / 2 - 14);
      if (this._wave < this.TOTAL_WAVES) {
        ctx.fillStyle = '#ccc';
        ctx.font      = '20px monospace';
        ctx.fillText('Wave ' + (this._wave + 1) + ' incoming...', W / 2, H / 2 + 28);
      }
      ctx.restore();
    }

    if (this._state === 'game_over') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#f44336';
      ctx.font         = 'bold 64px monospace';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
      ctx.fillStyle = '#aaa';
      ctx.font      = '20px monospace';
      ctx.fillText('Wave ' + this._wave + ' of ' + this.TOTAL_WAVES, W / 2, H / 2 + 14);
      ctx.fillStyle = '#666';
      ctx.font      = '16px monospace';
      ctx.fillText('ENTER or SPACE to return to menu', W / 2, H / 2 + 52);
      ctx.restore();
    }

    if (this._state === 'victory') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#ffeb3b';
      ctx.font         = 'bold 64px monospace';
      ctx.fillText('VICTORY!', W / 2, H / 2 - 50);
      ctx.fillStyle = '#ce93d8';
      ctx.font      = '22px monospace';
      ctx.fillText('The gorillas are defeated!', W / 2, H / 2 + 10);
      ctx.fillStyle = '#aaa';
      ctx.font      = '18px monospace';
      ctx.fillText('The balloons float free.', W / 2, H / 2 + 44);
      ctx.fillStyle = '#666';
      ctx.font      = '16px monospace';
      ctx.fillText('ENTER or SPACE to return to menu', W / 2, H / 2 + 82);
      ctx.restore();
    }
  }
}
