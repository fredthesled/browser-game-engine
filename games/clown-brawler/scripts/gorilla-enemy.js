// games/clown-brawler/scripts/gorilla-enemy.js
// Gorilla enemy AI for Clown Brawler. Refactored to delegate rendering to an
// internally-owned ShapeSprite (per ADR-0015) while game logic stays here.
//
// States: 'walking' -> 'attacking' -> 'stunned' -> 'dying' -> 'dead'
// The gorilla holds a party balloon, drawn above its head while alive.
// Player reference must be set via setPlayer(playerObj) before the scene starts.
//
// Emits unchanged:
//   brawler_gorilla_attack   {}                       when an attack swing lands
//   brawler_balloon_release  { x, y, color }          just before removal
//   brawler_remove           { obj }                  when death anim completes
//
// Depends on: Engine.Script, Engine.signals, Engine.audio, Engine.ShapeSprite
// Used by: ClownMatchScene

const _GORILLA_BALLOON_COLORS = ['#ff1744', '#2979ff', '#ffea00', '#69f0ae', '#ff6d00', '#e040fb'];

// --- Drawing helpers (module-private) ---

function _drawBalloon(ctx, bob, color) {
  const bx = 6, by = -80 + bob;

  // String from hand up to balloon (S-curve).
  ctx.strokeStyle = '#9e9e9e';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.bezierCurveTo(bx + 6, by - 20, bx - 4, by - 38, bx, by - 52);
  ctx.stroke();

  // Balloon body.
  const cx = bx, cy = by - 66;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 13, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Knot.
  ctx.beginPath();
  ctx.arc(cx, cy + 16, 3, 0, Math.PI * 2);
  ctx.fill();

  // Shine.
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 6, 4, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function _drawGorillaBody(ctx, { bob, attacking, showBalloon, balloonColor }) {
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
    ctx.fillRect(20, -76 + bob, 44, 14);
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(66, -69 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    // Left arm up for balance.
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-34, -80 + bob, 14, 24);
  } else {
    // Both arms at sides, slightly angled.
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

  // Brow ridge.
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

  // Balloon (only when alive and not dying).
  if (showBalloon) {
    _drawBalloon(ctx, bob, balloonColor);
  }
}

// --- Animation factory (balloon color is per-instance) ---

function _gorillaAnimations(balloonColor) {
  return {
    // Walking duration ~1.047s gives one bob cycle per loop, matching the
    // original walkBob frequency of 6 rad/sec.
    walking: {
      duration: 2 * Math.PI / 6,
      loop: true,
      draw: (ctx, state) => {
        const bob = Math.sin(state.t * 2 * Math.PI) * 2;
        _drawGorillaBody(ctx, { bob, attacking: false, showBalloon: true, balloonColor });
      },
    },
    // Attack windup. Duration matches GorillaEnemy._attackWindupTime.
    attacking: {
      duration: 0.65,
      loop: false,
      draw: (ctx) => {
        _drawGorillaBody(ctx, { bob: 0, attacking: true, showBalloon: true, balloonColor });
      },
    },
    // Stunned holds the standing pose without bob. Duration matches the
    // stun timer (0.28s); GorillaEnemy transitions back to walking when
    // its own timer expires.
    stunned: {
      duration: 0.28,
      loop: true,
      draw: (ctx) => {
        _drawGorillaBody(ctx, { bob: 0, attacking: false, showBalloon: true, balloonColor });
      },
    },
    // Tip over animated from 0 to PI/2 over the duration. Balloon is hidden
    // since the gorilla is collapsing.
    dying: {
      duration: 0.7,
      loop: false,
      draw: (ctx, state) => {
        ctx.save();
        ctx.rotate(state.t * (Math.PI / 2));
        _drawGorillaBody(ctx, { bob: 0, attacking: false, showBalloon: false, balloonColor });
        ctx.restore();
      },
    },
  };
}

// --- Script class ---

class GorillaEnemy extends Engine.Script {
  constructor(host, config = {}) {
    super(host);
    this._maxHealth        = config.health || 3;
    this._health           = this._maxHealth;
    this._speed            = config.speed  || 72;
    this._balloonColor     = _GORILLA_BALLOON_COLORS[
      Math.floor(Math.random() * _GORILLA_BALLOON_COLORS.length)
    ];
    this._playerObj        = null;
    this._state            = 'walking';
    this._attackWindup     = 0;
    this._attackWindupTime = 0.65;
    this._attackCooldown   = 0;
    this._stunTimer        = 0;
    this._deathTimer       = 0;
    this._hitFlash         = 0;

    this._sprite = new Engine.ShapeSprite(host, {
      animations:  _gorillaAnimations(this._balloonColor),
      initialAnim: 'walking',
    });
  }

  get dead()    { return this._state === 'dead'; }
  get isDying() { return this._state === 'dying'; }

  setPlayer(playerObj) {
    this._playerObj = playerObj;
  }

  takeHit() {
    if (this._state === 'dying' || this._state === 'dead') return;
    this._health--;
    this._hitFlash = 0.15;
    Engine.audio.play('brawler_enemy_hit');
    if (this._health <= 0) {
      this._state      = 'dying';
      this._deathTimer = 0;
      this._sprite.play('dying');
      Engine.audio.play('brawler_enemy_die');
    } else {
      this._state     = 'stunned';
      this._stunTimer = 0.28;
      this._sprite.play('stunned');
    }
  }

  update(dt) {
    if (this._hitFlash > 0) this._hitFlash -= dt;

    switch (this._state) {
      case 'walking':   this._updateWalking(dt);   break;
      case 'attacking': this._updateAttacking(dt); break;
      case 'stunned':
        this._stunTimer -= dt;
        if (this._stunTimer <= 0) {
          this._state = 'walking';
          this._sprite.play('walking');
        }
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

    // Track facing toward the player. Set every frame; setFlipX is idempotent.
    if (this._playerObj) {
      const facing = this._playerObj.x > this.host.x ? 1 : -1;
      this._sprite.setFlipX(facing === -1);
    }

    // Apply hit-flash by lowering sprite alpha for the flash duration.
    this._sprite.alpha = this._hitFlash > 0 ? 0.35 : 1.0;

    this._sprite.update(dt);
  }

  _updateWalking(dt) {
    if (!this._playerObj) return;
    if (this._attackCooldown > 0) this._attackCooldown -= dt;

    const dx = this._playerObj.x - this.host.x;
    const dy = this._playerObj.y - this.host.y;

    if (Math.abs(dx) < 52 && Math.abs(dy) < 38 && this._attackCooldown <= 0) {
      this._state       = 'attacking';
      this._attackWindup = 0;
      this._sprite.play('attacking');
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
      // Attack lands. Match scene resolves damage via the signal.
      if (this._playerObj) {
        const dx = this._playerObj.x - this.host.x;
        const dy = this._playerObj.y - this.host.y;
        if (Math.abs(dx) < 65 && Math.abs(dy) < 45) {
          Engine.signals.emit('brawler_gorilla_attack', {});
        }
      }
      this._state          = 'walking';
      this._attackCooldown = 1.5;
      this._sprite.play('walking');
    }
  }

  draw(ctx) {
    if (this._state === 'dead') return;
    this._sprite.draw(ctx);
  }
}
