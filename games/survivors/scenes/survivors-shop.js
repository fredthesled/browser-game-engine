// games/survivors/scenes/survivors-shop.js
// Between-wave shop for Survivors.
// Fades in on entry; fades out before transitioning to the next match.
// Upgrade prices: basePrice + purchaseCount * priceInc.
// 8 upgrades shown simultaneously (all available at once, prices visible).
// Navigation: ArrowUp/Down or W/S; confirm with Enter/Space.
// Depends on: Engine.Scene, Engine.input.
//   SurvivorsMatchScene must be defined in build (transition target).
// Used by: SurvivorsMatchScene (on wave completion).

class SurvivorsShopScene extends Engine.Scene {
  constructor(game, options = {}) {
    super();
    this._game   = game;
    this._level  = options.level ?? 1;
    this._stats  = options.stats;
    this._kills  = options.kills ?? 0;
    this._cursor = 0;
    this._fade   = 1.0;   // fade-in
    this._pendingOut   = null;
    this._fadeOutTimer = 0;
    this._flashMsg     = '';
    this._flashTimer   = 0;
  }

  _nextBgColor() {
    const p = ['#050510','#051005','#100505','#050a10','#0d0510','#051010'];
    return p[this._level % p.length];
  }

  // MULTI-SHOT adds 2 (not 1) to keep projectileCount odd (center shot always present).
  _upgradePool() {
    const ul = this._stats.upgradeLevels || {};
    const defs = [
      { id:'maxHealth', label:'MAX HEALTH +25',    desc:'Increase max HP and fully heal.',         basePrice:20, priceInc:15, apply:(s)=>{ s.maxHealth+=25; s.currentHealth=s.maxHealth; } },
      { id:'speed',     label:'SPEED +30',          desc:'Move faster.',                             basePrice:22, priceInc:18, apply:(s)=>{ s.speed+=30; } },
      { id:'fireRate',  label:'FIRE RATE +20%',     desc:'Shoot more frequently.',                   basePrice:28, priceInc:22, apply:(s)=>{ s.fireRate=+(s.fireRate*1.2).toFixed(3); } },
      { id:'damage',    label:'DAMAGE +10',          desc:'More damage per projectile.',              basePrice:24, priceInc:18, apply:(s)=>{ s.damage+=10; } },
      { id:'range',     label:'RANGE +60',           desc:'Expand shooting range.',                   basePrice:18, priceInc:14, apply:(s)=>{ s.range+=60; } },
      { id:'magnet',    label:'COIN MAGNET +80px',   desc:'Auto-attract nearby coins.',               basePrice:30, priceInc:22, apply:(s)=>{ s.magnetRange=(s.magnetRange||0)+80; } },
      { id:'multiShot', label:'MULTI-SHOT (+2)',      desc:'Two more projectiles, always symmetric.',  basePrice:45, priceInc:35, apply:(s)=>{ s.projectileCount+=2; } },
      { id:'projSize',  label:'PROJECTILE SIZE +2',  desc:'Larger projectile hitbox.',                basePrice:14, priceInc:10, apply:(s)=>{ s.projectileSize+=2; } },
    ];
    return defs.map(u => ({ ...u, price: u.basePrice + (ul[u.id] || 0) * u.priceInc }));
  }

  _getItems() {
    return [
      ...this._upgradePool(),
      { id:'continue', label:'CONTINUE TO NEXT WAVE', desc:'Proceed with current loadout.', price:0 },
    ];
  }

  enter() {
    this._fade         = 1.0;
    this._cursor       = 0;
    this._pendingOut   = null;
    this._fadeOutTimer = 0;
    this._flashMsg     = '';
    this._flashTimer   = 0;
  }
  exit() {}

  update(dt) {
    // Fade-out to next scene.
    if (this._pendingOut) {
      this._fadeOutTimer += dt;
      if (this._fadeOutTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }

    // Fade-in: block interaction while black overlay is still substantial.
    if (this._fade > 0) { this._fade = Math.max(0, this._fade - dt * 2.5); return; }

    if (this._flashTimer > 0) this._flashTimer -= dt;

    const items = this._getItems();
    // Accept arrow keys and WASD, matching the player-controller pattern.
    if (Engine.input.wasJustPressed('ArrowUp')   || Engine.input.wasJustPressed('w') || Engine.input.wasJustPressed('W'))
      this._cursor = (this._cursor - 1 + items.length) % items.length;
    if (Engine.input.wasJustPressed('ArrowDown') || Engine.input.wasJustPressed('s') || Engine.input.wasJustPressed('S'))
      this._cursor = (this._cursor + 1) % items.length;

    if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
      const sel = items[this._cursor];
      const ul  = this._stats.upgradeLevels;

      if (sel.id === 'continue') {
        this._pendingOut = new SurvivorsMatchScene(this._game, {
          level: this._level + 1, stats: this._stats,
        });
      } else if (this._stats.coins >= sel.price) {
        this._stats.coins  -= sel.price;
        ul[sel.id]          = (ul[sel.id] || 0) + 1;
        sel.apply(this._stats);
        this._flashMsg   = 'Purchased!';
        this._flashTimer = 1.2;
      } else {
        this._flashMsg   = 'Not enough coins.';
        this._flashTimer = 1.2;
      }
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = this._nextBgColor(); ctx.fillRect(0, 0, W, H);

    // Fade-in: draw background + black overlay, skip UI content.
    if (this._fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._fade})`; ctx.fillRect(0, 0, W, H); return;
    }

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Header
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 26px monospace';
    ctx.fillText('LEVEL ' + this._level + ' COMPLETE  --  SHOP', W / 2, 22);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 20px monospace';
    ctx.fillText('COINS: ' + this._stats.coins, W / 2, 50);

    ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 64); ctx.lineTo(W - 30, 64); ctx.stroke();

    const items  = this._getItems();
    const startY = 68, rowH = 44;

    for (let i = 0; i < items.length; i++) {
      const item   = items[i];
      const cy     = startY + i * rowH + rowH / 2;
      const sel    = i === this._cursor;
      const isCont = item.id === 'continue';
      const afford = isCont || this._stats.coins >= item.price;

      if (sel) {
        ctx.fillStyle = 'rgba(241,196,15,0.10)';
        ctx.fillRect(28, startY + i * rowH + 2, W - 56, rowH - 4);
      }

      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isCont
        ? (sel ? '#ffffff' : '#888888')
        : (sel ? '#f1c40f' : (afford ? '#cccccc' : '#555555'));
      ctx.font = sel ? 'bold 17px monospace' : '16px monospace';
      ctx.fillText((sel ? '> ' : '  ') + item.label, 36, cy);

      if (!isCont) {
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillStyle = afford ? (sel ? '#f1c40f' : '#888888') : '#c0392b';
        ctx.font = '14px monospace';
        ctx.fillText(item.price + ' coins', W - 36, cy);
      } else if (sel) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4ade80'; ctx.font = '14px monospace';
        ctx.fillText('ENTER', W - 36, cy);
      }
    }

    const listBottom = startY + items.length * rowH;
    ctx.strokeStyle = '#2a3040';
    ctx.beginPath(); ctx.moveTo(30, listBottom + 4); ctx.lineTo(W - 30, listBottom + 4); ctx.stroke();

    // Flash message or selected item description
    const feedbackY = listBottom + 22;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this._flashTimer > 0) {
      ctx.fillStyle = this._flashMsg === 'Purchased!' ? '#4ade80' : '#e74c3c';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this._flashMsg, W / 2, feedbackY);
    } else {
      const selItem = items[this._cursor];
      if (selItem && selItem.desc) {
        ctx.fillStyle = '#666666'; ctx.font = '13px monospace';
        ctx.fillText(selItem.desc, W / 2, feedbackY);
      }
    }

    // Current stats summary
    const s = this._stats;
    ctx.fillStyle = '#3a4a5a'; ctx.font = '12px monospace';
    const magnetStr = s.magnetRange > 0 ? '  MAGNET ' + s.magnetRange + 'px' : '';
    ctx.fillText(
      'HP ' + Math.ceil(s.currentHealth) + '/' + s.maxHealth +
      '  SPD ' + s.speed + '  DMG ' + s.damage +
      '  RATE ' + s.fireRate.toFixed(1) + '/s' +
      '  RNG ' + s.range + '  SHOTS ' + s.projectileCount + magnetStr,
      W / 2, listBottom + 42
    );

    ctx.fillStyle = '#3a4a5a'; ctx.font = '11px monospace';
    ctx.fillText('UP/DOWN or W/S navigate   ENTER buy or continue', W / 2, H - 12);

    ctx.restore();

    // Fade-out overlay (drawn over all UI content)
    if (this._pendingOut) {
      const a = Math.min(1, this._fadeOutTimer / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
