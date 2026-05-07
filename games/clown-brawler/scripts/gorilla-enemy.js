// games/clown-brawler/scripts/gorilla-enemy.js
// Gorilla enemy AI for Clown Brawler.
//
// States: 'walking' -> 'attacking' -> 'stunned' -> 'dying' -> 'dead'
// The gorilla holds a party balloon which is drawn above its head while alive.
//
// Player reference must be set via setPlayer(playerObj) before the scene starts.
// The match scene calls script.takeHit() when the player's punch connects.
//
// Emits:
//   brawler_gorilla_attack   {}         when the gorilla's attack swing lands
//   brawler_balloon_release  { x, y, color }  just before the gorilla is removed
//   brawler_remove           { obj }     when death animation completes
//
// Depends on: Engine.Script, Engine.signals, Engine.audio
// Used by: ClownMatchScene

// Balloon colors -- one is assigned randomly at construction.
const _GORILLA_BALLOON_COLORS = ['#ff1744', '#2979ff', '#ffea00', '#69f0ae', '#ff6d00', '#e040fb'];

class GorillaEnemy extends Engine.Script {
  constructor(host, config = {}) {
    super(host);
    this._maxHealth        = config.health || 3;
    this._health           = this._maxHealth;
    this._speed            = config.speed  || 72;
    this._balloonColor     = _GORILLA_BALLOON_COLORS[
      Math.floor(Math.random() * _GORILLA_BALLOON_COLORS.length)
    ];
    this._playerObj        = null;  // set via setPlayer()
    this._state            = 'walking';
    this._attackWindup     = 0;
    this._attackWindupTime = 0.65;
    this._attackCooldown   = 0;
    this._stunTimer        = 0;
    this._deathTimer       = 0;
    this._hitFlash         = 0;
    this._walkBob          = 0;    // animation phase for walking bob
  }

  get dead()    { return this._state === 'dead'; }
  get isDying() { return this._state === 'dying'; }

  // Called by ClownMatchScene after spawning the GameObject.
  setPlayer(playerObj) {
    this._playerObj = playerObj;
  }

  // Called by ClownMatchScene when the player's punch connects.
  takeHit() {
    if (this._state === 'dying' || this._state === 'dead') return;
    this._health--;
    this._hitFlash = 0.15;
    Engine.audio.play('brawler_enemy_hit');
    if (this._health <= 0) {
      this._state      = 'dying';
      this._deathTimer = 0;
      Engine.audio.play('brawler_enemy_die');
    } else {
      this._state      = 'stunned';
      this._stunTimer  = 0.28;
    }
  }

  update(dt) {
    if (this._hitFlash > 0) this._hitFlash -= dt;

    switch (this._state) {
      case 'walking':  this._updateWalking(dt);  break;
      case 'attacking':this._updateAttacking(dt);break;
      case 'stunned':
        this._stunTimer -= dt;
        if (this._stunTimer <= 0) this._state = 'walking';
        break;
      case 'dying':
        this._deathTimer += dt;
        if (this._deathTimer >= 0.7) {
          Engine.signals.emit('brawler_balloon_release', {
            x:     this.host.x,
            y:     this.host.y - 120,
            color: this._balloonColor,
          });
          this._state = 'dead';
          Engine.signals.emit('brawler_remove', { obj: this.host });
        }
        break;
      case 'dead': break;
    }
  }

  _updateWalking(dt) {
    if (!this._playerObj) return;
    this._walkBob += dt * 6;

    const dx = this._playerObj.x - this.host.x;
    const dy = this._playerObj.y - this.host.y;

    if (this._attackCooldown > 0) this._attackCooldown -= dt;

    if (Math.abs(dx) < 52 && Math.abs(dy) < 38 && this._attackCooldown <= 0) {
      this._state       = 'attacking';
      this._attackWindup = 0;
      return;
    }

    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      this.host.x += (dx / dist) * this._speed * dt;
      this.host.y += (dy / dist) * this._speed * dt;
    }
  }

  _updateAttacking(dt) {
    this._attackWindup += dt;
    if (this._attackWindup >= this._attackWindupTime) {
      // Attack lands.  Match scene resolves damage via signal.
      if (this._playerObj) {
        const dx = this._playerObj.x - this.host.x;
        const dy = this._playerObj.y - this.host.y;
        if (Math.abs(dx) < 65 && Math.abs(dy) < 45) {
          Engine.signals.emit('brawler_gorilla_attack', {});
        }
      }
      this._state          = 'walking';
      this._attackCooldown = 1.5;
    }
  }

  draw(ctx) {
    if (this._state === 'dead') return;

    // White flash on hit.
    if (this._hitFlash > 0) {
      ctx.globalAlpha = 0.35;
    }

    if (this._state === 'dying') {
      // Tip over sideways.
      ctx.save();
      const tilt = Math.min(1, this._deathTimer / 0.7) * (Math.PI / 2);
      ctx.rotate(tilt);
      this._drawGorilla(ctx, false);
      ctx.restore();
    } else {
      this._drawGorilla(ctx, this._state === 'attacking');
    }

    ctx.globalAlpha = 1;
  }

  _drawGorilla(ctx, attacking) {
    // Determine which way the gorilla faces (toward player).
    const facing = (this._playerObj && this._playerObj.x > this.host.x) ? 1 : -1;

    ctx.save();
    if (facing === -1) ctx.scale(-1, 1);

    // Walking bob (only applies during walk state, gentle).
    const bob = (this._state === 'walking') ? Math.sin(this._walkBob) * 2 : 0;

    // Legs.
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-15, -32 + bob, 11, 32);
    ctx.fillRect(4,   -32 + bob, 11, 32);

    // Body (barrel chest).
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-22, -78 + bob, 44, 48);
    // Chest highlight.
    ctx.fillStyle = '#795548';
    ctx.fillRect(-14, -72 + bob, 28, 28);

    if (attacking) {
      // Right arm lunging forward.
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(20,  -76 + bob, 44, 14);   // extended right arm
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(66, -69 + bob, 10, 0, Math.PI * 2);
      ctx.fill();   // fist
      // Left arm up for balance.
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(-34, -80 + bob, 14, 24);
    } else {
      // Both arms at sides (slightly angled like a gorilla).
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(-34, -78 + bob, 14, 36);
      ctx.fillRect(20,  -78 + bob, 14, 36);
      // Knuckles touching ground when walking (bob creates this illusion).
      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.arc(-27, -42 + bob, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(27,  -42 + bob, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Head (large, forward-set).
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -91 + bob, 22, 0, Math.PI * 2);
    ctx.fill();

    // Brow ridge (dark bar).
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-18, -107 + bob, 36, 10);

    // Eyes.
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-8, -96 + bob, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,  -96 + bob, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.arc(-8, -96 + bob, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,  -96 + bob, 3, 0, Math.PI * 2); ctx.fill();

    // Nostrils.
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.arc(-5, -83 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,  -83 + bob, 3.5, 0, Math.PI * 2); ctx.fill();

    // Mouth / grimace.
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -78 + bob, 9, 0.3, Math.PI - 0.3, true);
    ctx.stroke();

    // Balloon (only when not dying).
    if (this._state !== 'dying') {
      this._drawBalloon(ctx, bob);
    }

    ctx.restore();
  }

  _drawBalloon(ctx, bob) {
    const bx = 6, by = -80 + bob;  // string base near gorilla's hand

    // String from hand up to balloon.
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    // Slight S-curve for a natural string droop.
    ctx.bezierCurveTo(bx + 6, by - 20, bx - 4, by - 38, bx, by - 52);
    ctx.stroke();

    // Balloon body (ellipse).
    const cx = bx, cy = by - 66;
    ctx.fillStyle = this._balloonColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Balloon knot at bottom.
    ctx.fillStyle = this._balloonColor;
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 3, 0, Math.PI * 2);
    ctx.fill();

    // Shine highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 6, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
