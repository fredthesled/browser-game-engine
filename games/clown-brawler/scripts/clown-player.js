// games/clown-brawler/scripts/clown-player.js
// Player controller for Clown Brawler. Refactored to delegate rendering to an
// internally-owned ShapeSprite (per ADR-0015) while game logic stays here.
//
// Combat contract with ClownMatchScene unchanged:
//   - scene calls script.takeHit(damage) when a gorilla attack lands
//   - scene reads script.isAttacking and script.punchHitSet to resolve player attacks
//   - punchHitSet is reset per-punch so each gorilla takes at most one hit per swing
//
// Emits unchanged:
//   brawler_player_hurt  { health, maxHealth }  on each hit
//   brawler_player_died  {}                      on death
//
// Depends on: Engine.Script, Engine.input, Engine.signals, Engine.audio, Engine.ShapeSprite
// Used by: ClownMatchScene

// --- Drawing helper (module-private) ---

function _drawClownBody(ctx, { punching }) {
  // Big shoes (red, oversized).
  ctx.fillStyle = '#e53935';
  ctx.fillRect(-26, -10, 23, 10);
  ctx.fillRect(3,   -10, 23, 10);

  // Baggy legs.
  ctx.fillStyle = '#ce93d8';
  ctx.fillRect(-16, -38, 13, 29);
  ctx.fillRect(3,   -38, 13, 29);

  // Suit body (purple).
  ctx.fillStyle = '#e040fb';
  ctx.fillRect(-19, -76, 38, 39);

  // White polka dots on suit.
  ctx.fillStyle = '#fffde7';
  const dots = [[-2, -63], [10, -53], [-11, -49], [7, -42]];
  for (const [px, py] of dots) {
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (punching) {
    // Right arm fully extended with fist.
    ctx.fillStyle = '#e040fb';
    ctx.fillRect(17, -72, 44, 12);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath(); ctx.arc(64, -66, 9, 0, Math.PI * 2); ctx.fill();
    // Left arm tucked.
    ctx.fillStyle = '#e040fb';
    ctx.fillRect(-30, -72, 13, 28);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath(); ctx.arc(-24, -44, 7, 0, Math.PI * 2); ctx.fill();
  } else {
    // Both arms at sides.
    ctx.fillStyle = '#e040fb';
    ctx.fillRect(-30, -72, 13, 30);
    ctx.fillRect(17,  -72, 13, 30);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath(); ctx.arc(-24, -42, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24,  -42, 7, 0, Math.PI * 2); ctx.fill();
  }

  // Head.
  ctx.fillStyle = '#ffcc80';
  ctx.beginPath(); ctx.arc(0, -90, 17, 0, Math.PI * 2); ctx.fill();

  // Clown hair: three tufts of yellow.
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath(); ctx.arc(-19, -101, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19,  -101, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0,   -108,  9, 0, Math.PI * 2); ctx.fill();

  // Eyes.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-6, -92, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,  -92, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-6, -92, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,  -92, 2, 0, Math.PI * 2); ctx.fill();

  // Red nose.
  ctx.fillStyle = '#f44336';
  ctx.beginPath(); ctx.arc(0, -87, 6, 0, Math.PI * 2); ctx.fill();

  // Smile.
  ctx.strokeStyle = '#5d3b1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -83, 10, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

// --- Animation definitions ---

const CLOWN_ANIMATIONS = {
  idle: {
    duration: 1.0,
    loop: true,
    draw: (ctx) => _drawClownBody(ctx, { punching: false }),
  },
  // Total swing duration 0.45s matches ClownPlayer's attackCooldown. The
  // punching pose displays during the first 0.18/0.45 of normalized t (active
  // hit window); after that the body returns to idle pose for the recovery
  // phase, mirroring the original draw-based ternary.
  punch: {
    duration: 0.45,
    loop: false,
    draw: (ctx, state) => {
      const punching = state.t < (0.18 / 0.45);
      _drawClownBody(ctx, { punching });
    },
  },
  // Static rotated pose. The original code applied a fixed PI/2 rotation
  // (not animated over time); we preserve that exactly. Fade is driven
  // externally by ClownPlayer setting sprite.alpha based on _deathTimer.
  dying: {
    duration: 1.0,
    loop: true,
    draw: (ctx) => {
      ctx.save();
      ctx.rotate(Math.PI / 2);
      _drawClownBody(ctx, { punching: false });
      ctx.restore();
    },
  },
};

// --- Script class ---

class ClownPlayer extends Engine.Script {
  constructor(host, config = {}) {
    super(host);
    this._speed          = 180;
    this._maxHealth      = config.maxHealth || 5;
    this._health         = this._maxHealth;
    this._floorMin       = config.floorMin  || 310;
    this._floorMax       = config.floorMax  || 460;
    this._stageW         = config.stageW    || 2400;
    this._facing         = 1;
    this._attackCooldown = 0.45;
    this._attackDuration = 0.18;
    this._attackTimer    = 0;
    this._punchHitSet    = new Set();
    this._hitIframes     = 0;
    this._dead           = false;
    this._deathTimer     = 0;

    // Internally owned sprite. NOT attached to host.scripts; ClownPlayer drives
    // its lifecycle (update/draw) so we can layer effects (alpha flicker, death
    // fade) around the sprite draw call without ordering issues.
    this._sprite = new Engine.ShapeSprite(host, {
      animations:  CLOWN_ANIMATIONS,
      initialAnim: 'idle',
    });
  }

  // -- Getters used by ClownMatchScene --

  get health()    { return this._health; }
  get maxHealth() { return this._maxHealth; }
  get facing()    { return this._facing; }
  get dead()      { return this._dead; }

  // True only during the active hit window portion of the current swing.
  get isAttacking() {
    return this._attackTimer > (this._attackCooldown - this._attackDuration);
  }

  // Match scene reads this to know which enemies have already been struck this swing.
  get punchHitSet() { return this._punchHitSet; }

  // -- Called by ClownMatchScene on gorilla attack --

  takeHit(damage) {
    if (this._hitIframes > 0 || this._dead) return;
    this._health = Math.max(0, this._health - damage);
    this._hitIframes = 0.8;
    Engine.audio.play('brawler_player_hit');
    Engine.signals.emit('brawler_player_hurt', { health: this._health, maxHealth: this._maxHealth });
    if (this._health <= 0) {
      this._dead = true;
      this._sprite.play('dying');
      Engine.signals.emit('brawler_player_died', {});
    }
  }

  // -- Engine lifecycle --

  update(dt) {
    if (this._dead) {
      this._deathTimer += dt;
      this._sprite.update(dt);
      return;
    }

    if (this._hitIframes > 0) this._hitIframes -= dt;
    if (this._attackTimer > 0) this._attackTimer -= dt;

    // Movement: WASD and arrow keys, normalized diagonal.
    const inp   = Engine.input;
    const left  = inp.isDown('ArrowLeft')  || inp.isDown('a') || inp.isDown('A');
    const right = inp.isDown('ArrowRight') || inp.isDown('d') || inp.isDown('D');
    const up    = inp.isDown('ArrowUp')    || inp.isDown('w') || inp.isDown('W');
    const down  = inp.isDown('ArrowDown')  || inp.isDown('s') || inp.isDown('S');

    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down  ? 1 : 0) - (up   ? 1 : 0);
    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      this.host.x += (dx / mag) * this._speed * dt;
      this.host.y += (dy / mag) * this._speed * dt;
      if (dx !== 0) this._facing = dx > 0 ? 1 : -1;
    }

    // Clamp to stage bounds and floor band.
    this.host.x = Math.max(40,             Math.min(this._stageW - 40, this.host.x));
    this.host.y = Math.max(this._floorMin, Math.min(this._floorMax,    this.host.y));

    // Attack input: Space, Z, or X. Only starts if cooldown is clear.
    const wantPunch = inp.wasJustPressed(' ')  || inp.wasJustPressed('z') || inp.wasJustPressed('Z')
                   || inp.wasJustPressed('x')  || inp.wasJustPressed('X');
    if (wantPunch && this._attackTimer <= 0) {
      this._attackTimer = this._attackCooldown;
      this._punchHitSet = new Set();
      Engine.audio.play('brawler_punch');
      this._sprite.play('punch');
    }

    // Return to idle once the punch's full duration elapses.
    if (this._attackTimer <= 0 && this._sprite.currentAnim !== 'idle') {
      this._sprite.play('idle');
    }

    this._sprite.setFlipX(this._facing === -1);
    this._sprite.update(dt);
  }

  draw(ctx) {
    if (this._dead) {
      this._sprite.alpha = Math.max(0, 1 - this._deathTimer * 0.8);
      this._sprite.draw(ctx);
      return;
    }
    // Flicker during i-frames.
    const flash = this._hitIframes > 0 && Math.floor(this._hitIframes * 10) % 2 === 0;
    this._sprite.alpha = flash ? 0.35 : 1.0;
    this._sprite.draw(ctx);
  }
}
