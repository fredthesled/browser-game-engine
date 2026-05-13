// games/party-house/scenes/match.js
// Core Party House gameplay scene.
//
// Single-scenario MVP study of UFO 50 #25 (Party House). Nine guest types,
// 25-day clock, win = four star guests at one successful party. Trouble cap
// = 3 (cops shut down). After a shutdown the player bans one guest type from
// the next party (banned type loses one rolodex instance for one party then
// returns).
//
// Phase machine (this.phase):
//   'day-start'  -- brief day banner
//   'party'      -- guests entering one at a time, click/SPACE to invite next
//   'party-end'  -- party finished cleanly, results banner, click to continue
//   'shutdown'   -- party shut down by trouble, banner, click to continue
//   'ban'        -- pick a guest type to ban from the next party (or skip)
//   'shop'       -- buy new rolodex guests, expand house, advance day
//   'win'        -- 4 stars in a successful party; high score saved
//   'lose'       -- day > 25; total wins still saved
//
// High score (Engine.storage key 'best'):
//   { fewestDays: number|null, totalWins: number }
//
// Depends on: Engine.Scene, Engine.input, Engine.audio, Engine.storage,
//             PauseOverlay, PHMenuScene.
// Used by: PHMenuScene (transitions in); PHMenuScene (transitions out on
//          win/lose or via pause overlay quit).

// ---- Static catalog -------------------------------------------------------

const PH_GUESTS = {
  OF: { key:'OF', name:'Old Friend',  pop:1,  cash: 0, trouble:0, max:4, cost:0,  star:false, color:'#8896a3', text:'#1a1530' },
  WB: { key:'WB', name:'Wild Buddy',  pop:2,  cash: 0, trouble:1, max:4, cost:0,  star:false, color:'#c46a6a', text:'#1a1530' },
  RP: { key:'RP', name:'Rich Pal',    pop:0,  cash: 1, trouble:0, max:4, cost:0,  star:false, color:'#c9a14a', text:'#1a1530' },
  CD: { key:'CD', name:'Cute Dog',    pop:1,  cash: 0, trouble:0, max:4, cost:5,  star:false, color:'#a8784a', text:'#fff5e0', ability:'removeTrouble' },
  HP: { key:'HP', name:'Hippie',      pop:2,  cash: 0, trouble:0, max:4, cost:6,  star:false, color:'#6fa86b', text:'#1a1530', ability:'removeTrouble' },
  AU: { key:'AU', name:'Auctioneer',  pop:0,  cash: 1, trouble:0, max:4, cost:4,  star:false, color:'#9c64a4', text:'#fff5e0', ability:'cashPerOldFriend' },
  RS: { key:'RS', name:'Rock Star',   pop:3,  cash: 0, trouble:1, max:4, cost:12, star:false, color:'#7e5fb8', text:'#fff5e0' },
  CE: { key:'CE', name:'Celebrity',   pop:1,  cash: 0, trouble:0, max:4, cost:20, star:true,  color:'#e8c248', text:'#1a1530' },
  DR: { key:'DR', name:'Dragon',      pop:2,  cash:-3, trouble:0, max:4, cost:22, star:true,  color:'#b34747', text:'#fff5e0' }
};

const PH_SHOP_ORDER = ['CD','HP','AU','RS','CE','DR'];

const PH_ABILITY_LABEL = {
  removeTrouble:    'on enter: -1 trouble',
  cashPerOldFriend: 'on enter: +1 cash per Old Friend already inside'
};

// ---- Match scene ----------------------------------------------------------

class PHMatchScene extends Engine.Scene {
  constructor(game) {
    super();
    this.game = game;

    this._pause = new PauseOverlay(game, {
      onRestart: () => game.setScene(new PHMatchScene(game)),
      onQuit:    () => game.setScene(new PHMenuScene(game))
    });

    this._initGameState();
  }

  _initGameState() {
    this.day          = 1;
    this.maxDays      = 25;
    this.popularity   = 0;
    this.cash         = 0;
    this.rolodex      = ['OF','OF','OF','OF','WB','WB','WB','WB','RP','RP'];
    this.bought       = { CD:0, HP:0, AU:0, RS:0, CE:0, DR:0 };
    this.houseCapacity = 5;
    this.expandCost   = 2;
    this.bannedType   = null;
    this.phase        = 'day-start';
    this.phaseTimer   = 0;
    this.inParty      = [];
    this.partyLog     = [];
    this.partyDeck    = [];
    this.partyPop     = 0;
    this.partyCash    = 0;
    this.partyTrouble = 0;
    this.shutdownReason = '';
    this._prevMouseLeft = false;
    this._mouseClicked  = false;
    this.message      = '';
    this.messageTimer = 0;
  }

  enter() {
    Engine.audio.register('ph-invite',   'click');
    Engine.audio.register('ph-pop',      'pickupCoin');
    Engine.audio.register('ph-cash',     'powerUp');
    Engine.audio.register('ph-trouble',  'hitHurt');
    Engine.audio.register('ph-shutdown', 'explosion');
    Engine.audio.register('ph-buy',      'blipSelect');
    Engine.audio.register('ph-expand',   'powerUp');
    Engine.audio.register('ph-win',      'pickupCoin');
    Engine.audio.register('ph-lose',     'explosion');
    Engine.audio.register('ph-star',     'pickupCoin');

    this._startDay();
  }

  _startDay() {
    this.phase        = 'day-start';
    this.phaseTimer   = 0;
    this.inParty      = [];
    this.partyLog     = [];
    this.partyPop     = 0;
    this.partyCash    = 0;
    this.partyTrouble = 0;
    this.shutdownReason = '';

    this.partyDeck = [...this.rolodex];
    if (this.bannedType) {
      const i = this.partyDeck.indexOf(this.bannedType);
      if (i !== -1) this.partyDeck.splice(i, 1);
      this.bannedType = null;
    }
    this._shuffle(this.partyDeck);
  }

  _shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ---- Update --------------------------------------------------------------

  update(dt) {
    super.update(dt);

    this._pause.update(dt);

    // Track mouse edge every frame so a click during pause is consumed
    // rather than firing as a phantom click after resume.
    this._mouseClicked = !this._prevMouseLeft && Engine.input.mouse.left;
    this._prevMouseLeft = Engine.input.mouse.left;

    if (this._pause.isPaused()) return;

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }

    this.phaseTimer += dt;

    switch (this.phase) {
      case 'day-start':  this._updateDayStart(dt);  break;
      case 'party':      this._updateParty(dt);     break;
      case 'party-end':  this._updateContinue();    break;
      case 'shutdown':   this._updateContinue('ban'); break;
      case 'ban':        this._updateBan();         break;
      case 'shop':       this._updateShop();        break;
      case 'win':        this._updateEnd();         break;
      case 'lose':       this._updateEnd();         break;
    }
  }

  _updateDayStart(dt) {
    if (this.phaseTimer > 0.9) {
      this.phase = 'party';
      this.phaseTimer = 0;
    }
  }

  _updateParty(dt) {
    if (Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter') ||
        this._clickedRect(this._inviteBtnRect())) {
      this._inviteNextGuest();
    }
    if (Engine.input.wasJustPressed('e') || Engine.input.wasJustPressed('E') ||
        this._clickedRect(this._endPartyBtnRect())) {
      this._endPartySuccessfully();
    }
  }

  _inviteNextGuest() {
    if (this.partyDeck.length === 0) {
      this._flash('Rolodex exhausted');
      this._endPartySuccessfully();
      return;
    }
    if (this.inParty.length >= this.houseCapacity) {
      this._flash('House is full');
      this._endPartySuccessfully();
      return;
    }
    const key = this.partyDeck.pop();
    this.inParty.push(key);
    const g = PH_GUESTS[key];

    this.partyPop     += g.pop;
    this.partyCash    += g.cash;
    this.partyTrouble += g.trouble;
    this._log(`${g.name} arrives`);

    if (g.ability === 'removeTrouble' && this.partyTrouble > 0) {
      this.partyTrouble -= 1;
      this._log(`  ${g.name}: -1 trouble`);
    } else if (g.ability === 'cashPerOldFriend') {
      const count = this.inParty.filter((k, idx) => k === 'OF' && idx !== this.inParty.length - 1).length;
      if (count > 0) {
        this.partyCash += count;
        this._log(`  ${g.name}: +${count} cash`);
      }
    }

    if (g.star) Engine.audio.play('ph-star');
    else if (g.trouble > 0) Engine.audio.play('ph-trouble');
    else if (g.cash > 0 && g.pop === 0) Engine.audio.play('ph-cash');
    else if (g.pop > 0) Engine.audio.play('ph-pop');
    else Engine.audio.play('ph-invite');

    if (this.partyTrouble >= 3) {
      this._shutdown('Too much trouble. The cops shut it down.');
      return;
    }

    if (this.inParty.length >= this.houseCapacity) {
      this._endPartySuccessfully();
    }
  }

  _endPartySuccessfully() {
    this.popularity = Math.max(0, this.popularity + this.partyPop);
    this.cash       = Math.max(0, this.cash       + this.partyCash);

    const stars = this.inParty.filter(k => PH_GUESTS[k].star).length;
    if (stars >= 4) {
      this._win();
      return;
    }

    this.phase = 'party-end';
    this.phaseTimer = 0;
  }

  _shutdown(reason) {
    this.shutdownReason = reason;
    this.phase = 'shutdown';
    this.phaseTimer = 0;
    Engine.audio.play('ph-shutdown');
  }

  _updateContinue(nextPhase) {
    if (this._mouseClicked || Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter')) {
      if (nextPhase === 'ban') {
        const unique = [...new Set(this.inParty)];
        if (unique.length === 0) {
          this._advanceToShop();
        } else {
          this.phase = 'ban';
          this.phaseTimer = 0;
        }
      } else {
        this._advanceToShop();
      }
    }
  }

  _updateBan() {
    const unique = [...new Set(this.inParty)];
    for (let i = 0; i < unique.length; i++) {
      if (this._clickedRect(this._banGuestRect(i, unique.length))) {
        this.bannedType = unique[i];
        this._flash(`Banned ${PH_GUESTS[unique[i]].name} from next party`);
        this._advanceToShop();
        return;
      }
    }
    if (Engine.input.wasJustPressed('s') || Engine.input.wasJustPressed('S') ||
        this._clickedRect(this._banSkipRect())) {
      this._advanceToShop();
    }
  }

  _advanceToShop() {
    this.phase = 'shop';
    this.phaseTimer = 0;
  }

  _updateShop() {
    for (let i = 0; i < PH_SHOP_ORDER.length; i++) {
      if (this._clickedRect(this._shopGuestRect(i))) {
        this._tryBuyGuest(PH_SHOP_ORDER[i]);
      }
    }
    if (this._clickedRect(this._expandBtnRect()) ||
        Engine.input.wasJustPressed('x') || Engine.input.wasJustPressed('X')) {
      this._tryExpandHouse();
    }
    if (this._clickedRect(this._continueBtnRect()) ||
        Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter')) {
      this._nextDay();
    }
  }

  _tryBuyGuest(key) {
    const g = PH_GUESTS[key];
    if (this.bought[key] >= g.max) {
      this._flash(`Maxed out on ${g.name}`);
      return;
    }
    if (this.popularity < g.cost) {
      this._flash(`Need ${g.cost} pop`);
      return;
    }
    this.popularity -= g.cost;
    this.bought[key] += 1;
    this.rolodex.push(key);
    Engine.audio.play('ph-buy');
    this._flash(`Added ${g.name} to rolodex`);
  }

  _tryExpandHouse() {
    if (this.cash < this.expandCost) {
      this._flash(`Need $${this.expandCost}`);
      return;
    }
    this.cash -= this.expandCost;
    this.houseCapacity += 1;
    this.expandCost = Math.min(12, this.expandCost + 1);
    Engine.audio.play('ph-expand');
    this._flash(`House expanded to ${this.houseCapacity}`);
  }

  _nextDay() {
    this.day += 1;
    if (this.day > this.maxDays) {
      this._lose();
      return;
    }
    this._startDay();
  }

  _win() {
    this.phase = 'win';
    this.phaseTimer = 0;
    Engine.audio.play('ph-win');
    const best = Engine.storage.load('best', { fewestDays: null, totalWins: 0 });
    if (best.fewestDays === null || this.day < best.fewestDays) {
      best.fewestDays = this.day;
      this._newRecord = true;
    } else {
      this._newRecord = false;
    }
    best.totalWins = (best.totalWins || 0) + 1;
    Engine.storage.save('best', best);
    this._savedBest = best;
  }

  _lose() {
    this.phase = 'lose';
    this.phaseTimer = 0;
    Engine.audio.play('ph-lose');
  }

  _updateEnd() {
    if (this.phaseTimer > 0.5 &&
        (this._mouseClicked || Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter'))) {
      this.game.setScene(new PHMenuScene(this.game));
    }
  }

  _clickedRect(r) {
    if (!r || !this._mouseClicked) return false;
    const m = Engine.input.mouse;
    return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
  }

  _flash(msg) {
    this.message = msg;
    this.messageTimer = 1.5;
  }

  _log(msg) {
    this.partyLog.push(msg);
    if (this.partyLog.length > 8) this.partyLog.shift();
  }

  // ---- Layout helpers -----------------------------------------------------

  _inviteBtnRect()    { return { x: 540, y: 470, w: 180, h: 50 }; }
  _endPartyBtnRect()  { return { x: 740, y: 470, w: 180, h: 50 }; }
  _continueBtnRect()  { return { x: 740, y: 470, w: 180, h: 50 }; }
  _expandBtnRect()    { return { x: 540, y: 470, w: 180, h: 50 }; }

  _shopGuestRect(i) {
    const col = i % 3, row = Math.floor(i / 3);
    return { x: 40 + col * 160, y: 270 + row * 100, w: 140, h: 80 };
  }

  _banGuestRect(i, n) {
    const slotW = 120, gap = 12;
    const totalW = n * slotW + (n - 1) * gap;
    const startX = (960 - totalW) / 2;
    return { x: startX + i * (slotW + gap), y: 380, w: slotW, h: 80 };
  }

  _banSkipRect() {
    return { x: 960 / 2 - 80, y: 480, w: 160, h: 36 };
  }

  // ---- Draw ----------------------------------------------------------------

  draw(ctx) {
    super.draw(ctx);
    const W = ctx.canvas.width, H = ctx.canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a0d2e');
    grad.addColorStop(1, '#2a1547');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    this._drawHeader(ctx, W, H);

    switch (this.phase) {
      case 'day-start': this._drawHouseSlots(ctx, W, H); this._drawDayStart(ctx, W, H); break;
      case 'party':     this._drawHouseSlots(ctx, W, H); this._drawPartyControls(ctx, W, H); break;
      case 'party-end': this._drawHouseSlots(ctx, W, H); this._drawPartyEndOverlay(ctx, W, H); break;
      case 'shutdown':  this._drawHouseSlots(ctx, W, H); this._drawShutdownOverlay(ctx, W, H); break;
      case 'ban':       this._drawBanScreen(ctx, W, H); break;
      case 'shop':      this._drawShop(ctx, W, H); break;
      case 'win':       this._drawHouseSlots(ctx, W, H); this._drawEndOverlay(ctx, W, H, true); break;
      case 'lose':      this._drawHouseSlots(ctx, W, H); this._drawEndOverlay(ctx, W, H, false); break;
    }

    if (this.message && this.messageTimer > 0) {
      this._drawMessage(ctx, W, H);
    }

    this._pause.draw(ctx);
  }

  _drawHeader(ctx, W, H) {
    ctx.fillStyle = '#0d0820';
    ctx.fillRect(0, 0, W, 56);
    ctx.strokeStyle = '#3d2a5c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(W, 56); ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d76e';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`DAY ${this.day} / ${this.maxDays}`, 20, 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`POP ${this.popularity}    CASH $${this.cash}`, W / 2, 28);

    const stars = this.inParty.filter(k => PH_GUESTS[k].star).length;
    ctx.textAlign = 'right';
    ctx.fillStyle = stars >= 4 ? '#f5d76e' : '#c8b8e0';
    ctx.fillText(`STARS ${stars} / 4`, W - 20, 28);

    const tx = W - 320, ty = 14;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8b8e0';
    ctx.font = '13px monospace';
    ctx.fillText('TROUBLE', tx, 28);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.partyTrouble ? '#c46a6a' : '#3d2a5c';
      ctx.fillRect(tx + 78 + i * 20, ty + 4, 16, 18);
      ctx.strokeStyle = '#1a0d2e';
      ctx.strokeRect(tx + 78 + i * 20, ty + 4, 16, 18);
    }
  }

  _drawHouseSlots(ctx, W, H) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8b8e0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`HOUSE -- capacity ${this.houseCapacity}`, 30, 84);

    ctx.fillStyle = '#9a8cbe';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`deck: ${this.partyDeck.length}   rolodex: ${this.rolodex.length}`, W - 30, 84);

    const slotW = 80, slotH = 110, gap = 14;
    const totalW = this.houseCapacity * slotW + (this.houseCapacity - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 110;

    for (let i = 0; i < this.houseCapacity; i++) {
      const sx = startX + i * (slotW + gap);
      const sy = startY;
      const filled = i < this.inParty.length;
      if (filled) {
        const g = PH_GUESTS[this.inParty[i]];
        this._drawGuestCard(ctx, sx, sy, slotW, slotH, g, false);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx, sy, slotW, slotH);
        ctx.strokeStyle = '#3d2a5c';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sx, sy, slotW, slotH);
        ctx.setLineDash([]);
      }
    }

    const py = startY + slotH + 18;
    ctx.fillStyle = '#0d0820';
    ctx.fillRect(30, py, W - 60, 44);
    ctx.strokeStyle = '#3d2a5c';
    ctx.strokeRect(30, py, W - 60, 44);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8b8e0';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('THIS PARTY', 50, py + 22);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(`pop +${this.partyPop}   cash ${this.partyCash >= 0 ? '+' : ''}${this.partyCash}   trouble ${this.partyTrouble}`,
                 170, py + 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#9a8cbe';
    ctx.font = '11px monospace';
    for (let i = 0; i < this.partyLog.length; i++) {
      const m = this.partyLog[this.partyLog.length - 1 - i];
      ctx.globalAlpha = Math.max(0.25, 1 - i * 0.18);
      ctx.fillText(m, W - 50, py + 22 - i * 14);
    }
    ctx.globalAlpha = 1;
  }

  _drawGuestCard(ctx, x, y, w, h, g, showCost) {
    ctx.fillStyle = g.color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#1a0d2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    if (g.star) {
      ctx.fillStyle = '#f5d76e';
      ctx.beginPath();
      const sx = x + w - 14, sy = y + 14;
      this._drawStar(ctx, sx, sy, 8);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 6, y + 6, 24, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.key, x + 10, y + 17);

    ctx.fillStyle = g.text;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, x + w / 2, y + 38);

    ctx.font = '11px monospace';
    ctx.fillStyle = g.text;
    let line = y + 56;
    const stats = [];
    if (g.pop !== 0)     stats.push(`${g.pop > 0 ? '+' : ''}${g.pop} pop`);
    if (g.cash !== 0)    stats.push(`${g.cash > 0 ? '+' : ''}${g.cash} cash`);
    if (g.trouble !== 0) stats.push(`+${g.trouble} trouble`);
    for (const s of stats) {
      ctx.fillText(s, x + w / 2, line);
      line += 14;
    }

    if (g.ability) {
      ctx.font = 'italic 9px monospace';
      ctx.fillText('ability!', x + w / 2, line);
    }

    if (showCost) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x, y + h - 18, w, 18);
      ctx.fillStyle = '#f5d76e';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${g.cost} pop`, x + w / 2, y + h - 9);
    }
  }

  _drawStar(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a  = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  _drawDayStart(ctx, W, H) {
    const alpha = Math.min(1, this.phaseTimer * 3);
    ctx.fillStyle = `rgba(13,8,32,${alpha * 0.6})`;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(245,215,110,${alpha})`;
    ctx.font = 'bold 64px monospace';
    ctx.fillText(`DAY ${this.day}`, W / 2, H / 2);
    if (this.bannedType) {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = '16px monospace';
      ctx.fillText(`${PH_GUESTS[this.bannedType].name} skips tonight`, W / 2, H / 2 + 60);
    }
  }

  _drawPartyControls(ctx, W, H) {
    const invR = this._inviteBtnRect();
    const endR = this._endPartyBtnRect();
    this._drawButton(ctx, invR, '[SPACE] INVITE NEXT', '#3a7a4a', this.partyDeck.length > 0);
    this._drawButton(ctx, endR, '[E] END PARTY',        '#7a3a4a', true);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a8cbe';
    ctx.font = '11px monospace';
    ctx.fillText('ESC: pause / audio settings / restart / quit', W / 2, H - 12);
  }

  _drawButton(ctx, r, label, color, enabled) {
    ctx.fillStyle = enabled ? color : '#2a2440';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = enabled ? '#fff' : '#5a4880';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = enabled ? '#fff' : '#7a6aa0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  }

  _drawPartyEndOverlay(ctx, W, H) {
    ctx.fillStyle = 'rgba(13,8,32,0.85)';
    ctx.fillRect(80, 350, W - 160, 160);
    ctx.strokeStyle = '#5a4880';
    ctx.strokeRect(80, 350, W - 160, 160);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d76e';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('PARTY ENDED', W / 2, 380);

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(`+ ${this.partyPop} pop    + ${this.partyCash} cash`, W / 2, 420);

    const stars = this.inParty.filter(k => PH_GUESTS[k].star).length;
    ctx.fillStyle = '#c8b8e0';
    ctx.fillText(`${stars} star${stars === 1 ? '' : 's'} at the party`, W / 2, 442);

    ctx.fillStyle = '#9a8cbe';
    ctx.font = '12px monospace';
    ctx.fillText('click or press SPACE to continue', W / 2, 480);
  }

  _drawShutdownOverlay(ctx, W, H) {
    ctx.fillStyle = 'rgba(40,10,10,0.88)';
    ctx.fillRect(80, 350, W - 160, 160);
    ctx.strokeStyle = '#c46a6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 350, W - 160, 160);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c46a6a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SHUT DOWN', W / 2, 380);

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(this.shutdownReason, W / 2, 410);
    ctx.fillStyle = '#c8b8e0';
    ctx.fillText('no popularity or cash earned this party', W / 2, 432);

    ctx.fillStyle = '#9a8cbe';
    ctx.font = '12px monospace';
    ctx.fillText('click or press SPACE to ban a guest', W / 2, 480);
  }

  _drawBanScreen(ctx, W, H) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c46a6a';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('PICK A GUEST TO BAN FROM THE NEXT PARTY', W / 2, 110);

    ctx.fillStyle = '#c8b8e0';
    ctx.font = '14px monospace';
    ctx.fillText('they keep their rolodex slot, but skip the next night', W / 2, 140);

    const unique = [...new Set(this.inParty)];
    for (let i = 0; i < unique.length; i++) {
      const r = this._banGuestRect(i, unique.length);
      const g = PH_GUESTS[unique[i]];
      const m = Engine.input.mouse;
      const hover = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
      if (hover) {
        ctx.fillStyle = 'rgba(245,215,110,0.15)';
        ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      }
      this._drawGuestCard(ctx, r.x, r.y, r.w, r.h, g, false);

      const count = this.inParty.filter(k => k === unique[i]).length;
      if (count > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(r.x + r.w - 26, r.y + r.h - 22, 22, 18);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`x${count}`, r.x + r.w - 15, r.y + r.h - 13);
      }
    }

    const sk = this._banSkipRect();
    this._drawButton(ctx, sk, '[S] skip ban', '#3d2a5c', true);

    ctx.fillStyle = '#9a8cbe';
    ctx.font = '11px monospace';
    ctx.fillText('click a guest to ban one rolodex copy for one party', W / 2, H - 12);
  }

  _drawShop(ctx, W, H) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d76e';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('SHOP', W / 2, 92);

    ctx.fillStyle = '#c8b8e0';
    ctx.font = '13px monospace';
    ctx.fillText('add guests to your rolodex   |   expand your house', W / 2, 116);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8b8e0';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('AVAILABLE GUESTS', 40, 142);

    for (let i = 0; i < PH_SHOP_ORDER.length; i++) {
      const key = PH_SHOP_ORDER[i];
      const g   = PH_GUESTS[key];
      const r   = this._shopGuestRect(i);

      const owned = this.bought[key];
      const maxed = owned >= g.max;
      const afford = this.popularity >= g.cost;

      if (maxed || !afford) ctx.globalAlpha = 0.45;

      const m = Engine.input.mouse;
      const hover = !maxed && afford && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
      if (hover) {
        ctx.fillStyle = 'rgba(245,215,110,0.15)';
        ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      }

      ctx.fillStyle = g.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#1a0d2e';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      if (g.star) {
        ctx.fillStyle = '#f5d76e';
        this._drawStar(ctx, r.x + r.w - 12, r.y + 12, 7);
      }
      ctx.fillStyle = g.text;
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(g.name, r.x + 8, r.y + 16);
      ctx.font = '10px monospace';
      const stats = [];
      if (g.pop !== 0)     stats.push(`${g.pop > 0 ? '+' : ''}${g.pop}p`);
      if (g.cash !== 0)    stats.push(`${g.cash > 0 ? '+' : ''}${g.cash}$`);
      if (g.trouble !== 0) stats.push(`+${g.trouble}T`);
      ctx.fillText(stats.join('  '), r.x + 8, r.y + 32);
      if (g.ability) {
        ctx.font = 'italic 9px monospace';
        ctx.fillText(PH_ABILITY_LABEL[g.ability] || 'ability', r.x + 8, r.y + 46);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(r.x, r.y + r.h - 20, r.w, 20);
      ctx.fillStyle = '#f5d76e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${g.cost} pop`, r.x + 8, r.y + r.h - 7);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${owned} / ${g.max}`, r.x + r.w - 8, r.y + r.h - 7);

      if (maxed) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#c46a6a';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('MAXED', r.x + r.w / 2, r.y + r.h / 2);
      }

      ctx.globalAlpha = 1;
    }

    const ex = this._expandBtnRect();
    this._drawButton(ctx, ex, `[X] EXPAND $${this.expandCost}`,
                     this.cash >= this.expandCost ? '#3a7a4a' : '#2a2440',
                     this.cash >= this.expandCost);

    const cb = this._continueBtnRect();
    this._drawButton(ctx, cb, '[SPACE] NEXT DAY', '#5a3a8a', true);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a8cbe';
    ctx.font = '11px monospace';
    ctx.fillText(`ESC: pause   |   POP ${this.popularity}   CASH $${this.cash}   capacity ${this.houseCapacity}`, W / 2, H - 12);
  }

  _drawEndOverlay(ctx, W, H, won) {
    ctx.fillStyle = won ? 'rgba(40,30,10,0.92)' : 'rgba(20,10,30,0.92)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (won) {
      ctx.fillStyle = '#f5d76e';
      ctx.font = 'bold 72px monospace';
      ctx.fillText('CHERRY!', W / 2, H / 2 - 100);
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.fillText('four stars at one party', W / 2, H / 2 - 50);
      ctx.fillText(`cleared in ${this.day} day${this.day === 1 ? '' : 's'}`, W / 2, H / 2 - 20);

      if (this._newRecord) {
        ctx.fillStyle = '#f5d76e';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('NEW RECORD', W / 2, H / 2 + 20);
      } else if (this._savedBest && this._savedBest.fewestDays !== null) {
        ctx.fillStyle = '#c8b8e0';
        ctx.font = '14px monospace';
        ctx.fillText(`best: ${this._savedBest.fewestDays} days`, W / 2, H / 2 + 20);
      }

      ctx.fillStyle = '#c8b8e0';
      ctx.font = '14px monospace';
      ctx.fillText(`total wins: ${(this._savedBest && this._savedBest.totalWins) || 1}`, W / 2, H / 2 + 50);
    } else {
      ctx.fillStyle = '#c46a6a';
      ctx.font = 'bold 64px monospace';
      ctx.fillText('THE NIGHTS RAN OUT', W / 2, H / 2 - 60);
      ctx.fillStyle = '#c8b8e0';
      ctx.font = '18px monospace';
      ctx.fillText('twenty-five days came and went without four stars at one party', W / 2, H / 2 - 10);
    }

    ctx.fillStyle = '#9a8cbe';
    ctx.font = '13px monospace';
    ctx.fillText('click or press SPACE to return to the menu', W / 2, H - 40);
  }

  _drawMessage(ctx, W, H) {
    const alpha = Math.min(1, this.messageTimer);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(245,215,110,${alpha})`;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(this.message, W / 2, 76);
  }
}

window.PHMatchScene = PHMatchScene;
