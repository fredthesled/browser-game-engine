// games/libromancer/scenes/LibromancerCombatScene.js
// ----------------------------------------------------------------
// All combat, between-encounter transitions, game over, and victory
// for Libromancer. Handles all five encounters within a single run
// without a scene change; HP carries across encounters.
//
// Depends on: Engine, PauseOverlay, LIBROMANCER_SPELLS, LIBROMANCER_ENCOUNTERS,
//             LibromancerMenuScene
// Used by: LibromancerMenuScene
//
// State machine:
//   PLAYER_TURN  -> player clicks a card  -> ANIMATING
//   ANIMATING    -> 0.4s delay            -> ENEMY_TURN (or ENCOUNTER_WIN/GAME_OVER)
//   ENEMY_TURN   -> 0.4s delay            -> PLAYER_TURN (via _beginPlayerTurn)
//   ENCOUNTER_WIN -> player clicks        -> next encounter or VICTORY
//   GAME_OVER    -> player clicks         -> LibromancerMenuScene
//   VICTORY      -> player clicks         -> LibromancerMenuScene
//
// Status effects:
//   fray  (on enemy) - enemy takes [fray] damage at start of each enemy turn;
//                      fray decreases by 1 each tick
//   dust  (on player) - player takes +1 damage per stack; dust decreases by 1
//                       at the start of each player turn
// ----------------------------------------------------------------

class LibromancerCombatScene extends Engine.Scene {
  constructor(game, preset, runState) {
    super();
    this._game    = game;
    this._preset  = preset;
    this._W       = preset.w;
    this._H       = preset.h;
    this._run     = runState;

    this._encounterIdx  = runState.encounterIndex;
    this._encounter     = LIBROMANCER_ENCOUNTERS[this._encounterIdx];

    // Combat state.
    this._playerHp    = runState.hp;
    this._playerMaxHp = runState.maxHp;
    this._playerBlock = 0;
    this._enemyHp     = 0;
    this._enemyBlock  = 0;
    this._fray        = 0;
    this._dust        = 0;
    this._drawBonus   = 0;
    this._cardsPlayed = 0;
    this._actionIdx   = 0;

    // Deck state.
    this._deck    = [];
    this._discard = [];
    this._hand    = [];

    // UI state.
    this._state        = 'PLAYER_TURN';
    this._animTimer    = 0;
    this._cardHoverIdx = -1;
    this._wasMouseDown = false;
    this._log          = [];
    this._unlockText   = null;

    this._pause = new PauseOverlay(game, {
      onQuit: function() {
        game.setScene(new LibromancerMenuScene(game, preset));
      }
    });

    this._layout = this._buildLayout();
  }

  _buildLayout() {
    const H = this._H, W = this._W;
    const cardH = Math.min(120, H * 0.19);
    const cardW = Math.min(200, (W - 50) / 4);
    const cardY = H - cardH - 14;
    return {
      logY:    H * 0.42,
      cardH:   cardH,
      cardW:   cardW,
      cardY:   cardY,
      playerY: cardY - 60
    };
  }

  // ----------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------

  enter() {
    this._wasMouseDown = Engine.input.mouse.left;
    this._initCombat();
  }

  _initCombat() {
    this._encounter  = LIBROMANCER_ENCOUNTERS[this._encounterIdx];
    this._enemyHp    = this._encounter.hp;
    this._enemyBlock = 0;
    this._playerBlock = 0;
    this._fray       = 0;
    this._dust       = 0;
    this._cardsPlayed = 0;
    this._actionIdx  = 0;
    this._unlockText = null;
    this._log        = [
      'You face: ' + this._encounter.name + '.',
      this._encounter.flavor.slice(0, 58) + (this._encounter.flavor.length > 58 ? '...' : '')
    ];

    this._deck    = this._shuffle([].concat(this._run.deck));
    this._discard = [];
    this._hand    = [];
    this._beginPlayerTurn();
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ----------------------------------------------------------------
  // Turn flow
  // ----------------------------------------------------------------

  _beginPlayerTurn() {
    this._playerBlock = 0;
    if (this._dust > 0) this._dust--;
    const count = 3 + this._drawBonus;
    this._drawBonus = 0;
    // Discard remaining hand.
    for (let i = 0; i < this._hand.length; i++) this._discard.push(this._hand[i]);
    this._hand = [];
    this._drawCards(count);
    this._state = 'PLAYER_TURN';
  }

  _drawCards(n) {
    for (let i = 0; i < n; i++) {
      if (this._deck.length === 0) {
        if (this._discard.length === 0) break;
        this._deck    = this._shuffle([].concat(this._discard));
        this._discard = [];
      }
      this._hand.push(this._deck.shift());
    }
  }

  _playCard(handIdx) {
    const spellId = this._hand[handIdx];
    const spell   = LIBROMANCER_SPELLS[spellId];
    if (!spell) return;

    this._hand.splice(handIdx, 1);
    this._discard.push(spellId);
    this._cardsPlayed++;

    const result = spell.effect({
      playerHp:             this._playerHp,
      playerMaxHp:          this._playerMaxHp,
      playerBlock:          this._playerBlock,
      enemyHp:              this._enemyHp,
      enemyMaxHp:           this._encounter.maxHp,
      enemyBlock:           this._enemyBlock,
      cardsPlayedThisCombat: this._cardsPlayed
    });

    // Apply block.
    if (result.block) {
      this._playerBlock += result.block;
    }

    // Apply heal.
    if (result.heal) {
      const prev = this._playerHp;
      this._playerHp = Math.min(this._playerMaxHp, this._playerHp + result.heal);
      const gained = this._playerHp - prev;
      if (gained > 0) this._log2('Recovered ' + gained + ' HP.');
    }

    // Strip enemy block (Ink Splash).
    if (result.stripBlock && this._enemyBlock > 0) {
      const stripped = Math.min(this._enemyBlock, result.stripBlock);
      this._enemyBlock = Math.max(0, this._enemyBlock - result.stripBlock);
      if (stripped > 0) this._log2('Stripped ' + stripped + ' block.');
    }

    // Apply damage to enemy.
    if (result.damage) {
      const absorbed = Math.min(result.damage, this._enemyBlock);
      this._enemyBlock = Math.max(0, this._enemyBlock - absorbed);
      const dealt = result.damage - absorbed;
      this._enemyHp -= dealt;
      var dmgMsg = spell.name + ': ' + dealt + ' damage';
      if (absorbed > 0) dmgMsg += ' (' + absorbed + ' blocked)';
      dmgMsg += '.';
      this._log2(dmgMsg);
    }

    // Apply Fray.
    if (result.applyFray) {
      this._fray += result.applyFray;
      this._log2('Fray ' + this._fray + ' applied to ' + this._encounter.name + '.');
    }

    // Draw bonus for next turn.
    if (result.drawBonus) {
      this._drawBonus += result.drawBonus;
    }

    // Check enemy death.
    if (this._enemyHp <= 0) {
      this._enemyHp = 0;
      this._resolveEncounterWin();
      return;
    }

    this._state     = 'ANIMATING';
    this._animTimer = 0;
  }

  _resolveEnemyTurn() {
    const enc    = this._encounter;
    const action = enc.actions[this._actionIdx % enc.actions.length];
    this._actionIdx++;

    // Fray tick before enemy acts.
    if (this._fray > 0) {
      this._enemyHp -= this._fray;
      this._log2('Fray: ' + this._fray + ' damage to ' + enc.name + '.');
      this._fray--;
      if (this._enemyHp <= 0) {
        this._enemyHp = 0;
        this._resolveEncounterWin();
        return;
      }
    }

    // Resolve action.
    if (action.type === 'attack' || action.type === 'attack_status' || action.type === 'attack_variable') {
      let rawDmg;
      if (action.type === 'attack_variable') {
        rawDmg = Math.max(1, 10 - Math.floor(this._playerHp / 2));
      } else {
        rawDmg = action.value;
      }
      const total   = rawDmg + this._dust;
      const taken   = Math.max(0, total - this._playerBlock);
      const absorbed = Math.min(this._playerBlock, total);
      this._playerBlock = Math.max(0, this._playerBlock - total);
      this._playerHp   -= taken;
      var atkMsg = enc.name + ': ' + taken + ' damage';
      if (absorbed > 0) atkMsg += ' (' + absorbed + ' blocked)';
      atkMsg += '.';
      this._log2(atkMsg);

      if (action.type === 'attack_status' && action.statusType === 'fray') {
        this._fray += action.statusStacks;
        this._log2('Fray ' + action.statusStacks + ' applied to you. Wait, wrong target - Fray on enemy.');
        // Archivist applies fray to the PLAYER in Redact. Reinterpret as
        // a debuff that makes the player's next N turns deal less block.
        // For simplicity: Redact just does damage + strips player block.
        this._playerBlock = Math.max(0, this._playerBlock - action.statusStacks * 2);
      }
    } else if (action.type === 'defend') {
      this._enemyBlock += action.value;
      this._log2(enc.name + ' gains ' + action.value + ' block.');
    } else if (action.type === 'status_dust') {
      this._dust += action.statusStacks;
      this._log2(enc.name + ' applies Dust x' + action.statusStacks + '. Total: ' + this._dust + '.');
    }

    // Check player death.
    if (this._playerHp <= 0) {
      this._playerHp = 0;
      this._log2('You collapse among the stacks.');
      this._state = 'GAME_OVER';
      return;
    }

    this._state     = 'ENEMY_TURN';
    this._animTimer = 0;
  }

  _resolveEncounterWin() {
    const cleared = this._encounterIdx + 1;
    const prev    = Engine.storage.load('best', 0);
    if (cleared > prev) Engine.storage.save('best', cleared);

    // Permanent spell unlock.
    const unlockId = this._encounter.unlocks;
    if (unlockId && LIBROMANCER_SPELLS[unlockId]) {
      const unlocks = Engine.storage.load('unlocks', []);
      if (unlocks.indexOf(unlockId) === -1) {
        unlocks.push(unlockId);
        Engine.storage.save('unlocks', unlocks);
        // Also add to this run's deck for remaining encounters.
        this._run.deck.push(unlockId);
        this._unlockText = 'Discovered: ' + LIBROMANCER_SPELLS[unlockId].name;
      }
    }

    this._log2(this._encounter.name + ' defeated.');
    this._state = 'ENCOUNTER_WIN';
  }

  _advanceEncounter() {
    const nextIdx = this._encounterIdx + 1;
    if (nextIdx >= LIBROMANCER_ENCOUNTERS.length) {
      this._state = 'VICTORY';
      return;
    }
    // Carry HP forward.
    this._run.hp           = this._playerHp;
    this._run.encounterIndex = nextIdx;
    this._encounterIdx     = nextIdx;
    this._initCombat();
  }

  _log2(msg) {
    this._log.push(msg);
    if (this._log.length > 6) this._log.shift();
  }

  // ----------------------------------------------------------------
  // Update
  // ----------------------------------------------------------------

  update(dt) {
    super.update(dt);

    const mouse = Engine.input.mouse;
    const justClicked  = mouse.left && !this._wasMouseDown;
    this._wasMouseDown = mouse.left;

    // Pause only applies during active combat states.
    if (this._state !== 'GAME_OVER' && this._state !== 'VICTORY') {
      this._pause.update(dt);
      if (this._pause.isPaused()) return;
    }

    const L = this._layout;

    // Hover detection for card hand.
    this._cardHoverIdx = -1;
    if (this._state === 'PLAYER_TURN' && this._hand.length > 0) {
      const n      = this._hand.length;
      const totalW = n * L.cardW + (n - 1) * 10;
      const startX = this._W / 2 - totalW / 2;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * (L.cardW + 10);
        if (mouse.x >= cx && mouse.x <= cx + L.cardW &&
            mouse.y >= L.cardY && mouse.y <= L.cardY + L.cardH) {
          this._cardHoverIdx = i;
        }
      }
    }

    // Click handling.
    if (justClicked) {
      if (this._state === 'PLAYER_TURN' && this._cardHoverIdx >= 0) {
        this._playCard(this._cardHoverIdx);
      } else if (this._state === 'ENCOUNTER_WIN') {
        this._advanceEncounter();
      } else if (this._state === 'GAME_OVER' || this._state === 'VICTORY') {
        this._game.setScene(new LibromancerMenuScene(this._game, this._preset));
      }
    }

    // Animation timers.
    if (this._state === 'ANIMATING') {
      this._animTimer += dt;
      if (this._animTimer >= 0.4) this._resolveEnemyTurn();
    } else if (this._state === 'ENEMY_TURN') {
      this._animTimer += dt;
      if (this._animTimer >= 0.4) this._beginPlayerTurn();
    }
  }

  // ----------------------------------------------------------------
  // Draw
  // ----------------------------------------------------------------

  draw(ctx) {
    super.draw(ctx);
    const W = this._W, H = this._H;

    ctx.fillStyle = '#1a1510';
    ctx.fillRect(0, 0, W, H);

    if (this._state === 'GAME_OVER') { this._drawGameOver(ctx); return; }
    if (this._state === 'VICTORY')   { this._drawVictory(ctx); return; }
    if (this._state === 'ENCOUNTER_WIN') {
      this._drawEncounterWin(ctx);
      this._pause.draw(ctx);
      return;
    }

    this._drawHeader(ctx);
    this._drawEnemy(ctx);
    this._drawLog(ctx);
    this._drawPlayerStats(ctx);
    this._drawHand(ctx);
    this._pause.draw(ctx);
  }

  _drawHeader(ctx) {
    const W = this._W;
    ctx.fillStyle = '#231a0e';
    ctx.fillRect(0, 0, W, 40);
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 39); ctx.lineTo(W, 39); ctx.stroke();
    ctx.fillStyle = '#6a5430';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Encounter ' + (this._encounterIdx + 1) + ' of ' + LIBROMANCER_ENCOUNTERS.length +
      '   |   HP: ' + this._playerHp + '/' + this._playerMaxHp +
      '   |   Turn ' + this._cardsPlayed,
      W / 2, 20
    );
  }

  _drawEnemy(ctx) {
    const W = this._W;
    const enc = this._encounter;

    // Name.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold 22px serif';
    ctx.fillText(enc.name, W / 2, 52);

    // HP bar.
    const barW = Math.min(280, W * 0.48);
    const barH = 11;
    const barX = W / 2 - barW / 2;
    const barY = 83;
    const ratio = Math.max(0, this._enemyHp / enc.maxHp);
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#44aa66' : ratio > 0.25 ? '#cc9922' : '#cc4433';
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#7a6a4a';
    ctx.font = '12px monospace';
    ctx.fillText('HP ' + this._enemyHp + ' / ' + enc.maxHp, W / 2, 98);

    // Block and fray indicators.
    let tagLine = '';
    if (this._enemyBlock > 0) tagLine += 'Block: ' + this._enemyBlock + '  ';
    if (this._fray > 0)       tagLine += 'Fray: ' + this._fray;
    if (tagLine) {
      ctx.fillStyle = '#4488cc';
      ctx.fillText(tagLine.trim(), W / 2, 113);
    }

    // Intent box.
    const action = enc.actions[this._actionIdx % enc.actions.length];
    ctx.fillStyle = '#2e2014';
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 135, 128, 270, 32, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8c860';
    ctx.font = '13px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('Next: ' + action.intent, W / 2, 144);

    // Enemy sprite.
    this._drawEnemySprite(ctx, W / 2, 215, enc.id);
  }

  _drawEnemySprite(ctx, cx, cy, id) {
    ctx.save();
    ctx.translate(cx, cy);
    const t  = Date.now() / 1000;
    const fl = Math.sin(t * 2.5) * 0.5 + 0.5;

    if (id === 'bookworm') {
      ctx.strokeStyle = '#c8b060';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const ox = Math.sin(t * 2.2 + i * 0.9) * 9;
        const oy = Math.cos(t * 1.8 + i * 0.7) * 4;
        if (i === 0) ctx.moveTo(-30 + i * 13 + ox, oy);
        else         ctx.lineTo(-30 + i * 13 + ox, oy);
      }
      ctx.stroke();
      ctx.fillStyle = '#e8d060';
      ctx.beginPath();
      ctx.arc(35 + Math.sin(t * 2.2) * 9, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1510';
      ctx.beginPath();
      ctx.arc(38 + Math.sin(t * 2.2) * 9, -2, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (id === 'dust_mite') {
      ctx.fillStyle = 'rgba(180,160,110,' + (0.3 + fl * 0.25) + ')';
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + t;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (16 + fl * 4), Math.sin(a) * (10 + fl * 3), 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#c0a850';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1510';
      ctx.beginPath();
      ctx.arc(-5, -4, 3, 0, Math.PI * 2);
      ctx.arc(5, -4, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (id === 'shelf_spirit') {
      const ghost = 0.5 + fl * 0.3;
      ctx.fillStyle = 'rgba(90,110,170,' + ghost + ')';
      ctx.strokeStyle = 'rgba(130,150,220,' + ghost + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-24, -40, 48, 70, [4, 4, 16, 16]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,230,255,' + ghost + ')';
      ctx.fillRect(-14, -22, 9, 14);
      ctx.fillRect(5, -22, 9, 14);

    } else if (id === 'forbidden_tome') {
      const bob = Math.sin(t * 1.4) * 6;
      ctx.fillStyle = '#2a1008';
      ctx.strokeStyle = '#c4a040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-30, -22 + bob, 60, 44, 2);
      ctx.fill();
      ctx.stroke();
      // Chains.
      ctx.strokeStyle = '#706030';
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 10, -22 + bob);
        ctx.lineTo(i * 12, -44);
        ctx.stroke();
      }
      ctx.fillStyle = '#cc3300';
      ctx.beginPath();
      ctx.arc(0, -2 + bob, 8, 0, Math.PI * 2);
      ctx.fill();

    } else if (id === 'the_archivist') {
      const sw = Math.sin(t * 0.8) * 5;
      // Robe.
      ctx.fillStyle = '#180c04';
      ctx.beginPath();
      ctx.moveTo(-22 + sw * 0.3, -40);
      ctx.lineTo(22 + sw * 0.3, -40);
      ctx.lineTo(30 + sw * 0.3, 36);
      ctx.lineTo(-30 + sw * 0.3, 36);
      ctx.closePath();
      ctx.fill();
      // Head.
      ctx.fillStyle = '#100800';
      ctx.beginPath();
      ctx.arc(sw * 0.5, -50, 20, 0, Math.PI * 2);
      ctx.fill();
      // Eyes.
      ctx.fillStyle = 'rgba(200,160,60,' + (0.5 + fl * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(-7 + sw * 0.4, -50, 5, 0, Math.PI * 2);
      ctx.arc(7 + sw * 0.4, -50, 5, 0, Math.PI * 2);
      ctx.fill();
      // Arms.
      ctx.strokeStyle = '#240e04';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22 + sw * 0.3, -20);
      ctx.lineTo(-50 + sw, 5);
      ctx.moveTo(22 + sw * 0.3, -20);
      ctx.lineTo(50 + sw, 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawLog(ctx) {
    const W = this._W;
    const logY = this._layout.logY;
    const recent = this._log.slice(-3);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '13px monospace';

    for (let i = 0; i < recent.length; i++) {
      const alpha = 0.3 + ((i + 1) / recent.length) * 0.7;
      ctx.fillStyle = 'rgba(200,185,140,' + alpha + ')';
      ctx.fillText(recent[i], W / 2, logY + i * 21);
    }
  }

  _drawPlayerStats(ctx) {
    const W = this._W;
    const y = this._layout.playerY;
    const barW = Math.min(200, W * 0.38);
    const barH = 10;
    const barX = W / 2 - barW / 2;
    const ratio = Math.max(0, this._playerHp / this._playerMaxHp);

    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(barX, y, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#44aa66' : ratio > 0.25 ? '#cc9922' : '#cc4433';
    ctx.fillRect(barX, y, barW * ratio, barH);
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, y, barW, barH);

    let line = 'HP: ' + this._playerHp + '/' + this._playerMaxHp;
    if (this._playerBlock > 0) line += '   Block: ' + this._playerBlock;
    if (this._dust > 0)        line += '   Dust: ' + this._dust;

    ctx.fillStyle = '#7a6a4a';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(line, W / 2, y + 13);
  }

  _drawHand(ctx) {
    const L  = this._layout;
    const n  = this._hand.length;
    const W  = this._W;

    if (n === 0) {
      ctx.fillStyle = '#2e2518';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No cards', W / 2, L.cardY + L.cardH / 2);
      return;
    }

    const totalW = n * L.cardW + (n - 1) * 10;
    const startX = W / 2 - totalW / 2;

    for (let i = 0; i < n; i++) {
      const spell   = LIBROMANCER_SPELLS[this._hand[i]];
      if (!spell) continue;
      const x       = startX + i * (L.cardW + 10);
      const hover   = this._cardHoverIdx === i && this._state === 'PLAYER_TURN';
      const dimmed  = this._state !== 'PLAYER_TURN';
      this._drawCard(ctx, x, L.cardY, L.cardW, L.cardH, spell, hover, dimmed);
    }

    // Deck/discard counts.
    ctx.fillStyle = '#3a2e1a';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('deck:' + this._deck.length + ' disc:' + this._discard.length, W - 10, this._H - 5);
  }

  _drawCard(ctx, x, y, w, h, spell, hover, dimmed) {
    ctx.globalAlpha = dimmed ? 0.45 : 1.0;

    ctx.fillStyle = hover ? '#3e3228' : '#2a1e12';
    ctx.strokeStyle = hover ? '#c4a862' : '#5a4220';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();

    // Name.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hover ? '#e8d5a0' : '#c4a862';
    ctx.font = 'bold ' + Math.floor(h * 0.17) + 'px serif';
    ctx.fillText(spell.name, x + w / 2, y + 9);

    // Divider.
    ctx.strokeStyle = '#3a2c18';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + Math.floor(h * 0.32));
    ctx.lineTo(x + w - 10, y + Math.floor(h * 0.32));
    ctx.stroke();

    // Description lines.
    ctx.fillStyle = '#8a7a52';
    ctx.font = Math.floor(h * 0.13) + 'px monospace';
    const lines = spell.description.split('\n');
    const lineH = h * 0.155;
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      ctx.fillText(lines[i], x + w / 2, y + h * 0.38 + i * lineH);
    }

    ctx.globalAlpha = 1.0;
  }

  // ----------------------------------------------------------------
  // Terminal / transition screens
  // ----------------------------------------------------------------

  _drawEncounterWin(ctx) {
    const W = this._W, H = this._H;
    ctx.fillStyle = 'rgba(10,7,4,0.88)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold 26px serif';
    ctx.fillText(this._encounter.name + ' defeated.', W / 2, H * 0.3);

    if (this._unlockText) {
      ctx.fillStyle = '#44aa66';
      ctx.font = '17px serif';
      ctx.fillText(this._unlockText, W / 2, H * 0.42);
    }

    const more = this._encounterIdx + 1 < LIBROMANCER_ENCOUNTERS.length;
    ctx.fillStyle = '#7a6a4a';
    ctx.font = '15px monospace';
    ctx.fillText(
      more ? 'Continue deeper.' : 'Only the inner sanctum remains.',
      W / 2, H * 0.54
    );

    ctx.fillStyle = '#1e1810';
    ctx.strokeStyle = '#c4a862';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 110, H * 0.64, 220, 44, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold 17px serif';
    ctx.fillText('Continue', W / 2, H * 0.64 + 22);
  }

  _drawGameOver(ctx) {
    const W = this._W, H = this._H;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#cc4433';
    ctx.font = 'bold 30px serif';
    ctx.fillText('You Perished', W / 2, H * 0.28);

    ctx.fillStyle = '#7a6a4a';
    ctx.font = '17px serif';
    ctx.fillText('Lost in encounter ' + (this._encounterIdx + 1) + ':', W / 2, H * 0.39);
    ctx.font = '15px serif';
    ctx.fillText(this._encounter.name, W / 2, H * 0.47);

    ctx.fillStyle = '#1e1810';
    ctx.strokeStyle = '#5a4220';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 120, H * 0.59, 240, 44, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold 17px serif';
    ctx.fillText('Return to Menu', W / 2, H * 0.59 + 22);
  }

  _drawVictory(ctx) {
    const W = this._W, H = this._H;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold 28px serif';
    ctx.fillText('The Library is Yours', W / 2, H * 0.24);

    ctx.fillStyle = '#7a6a4a';
    ctx.font = '17px serif';
    ctx.fillText('You catalogued all five encounters.', W / 2, H * 0.36);
    ctx.fillText('The Archivist sleeps.', W / 2, H * 0.45);

    const unlocks = Engine.storage.load('unlocks', []);
    if (unlocks.length > 0) {
      var names = unlocks
        .filter(function(id) { return LIBROMANCER_SPELLS[id]; })
        .map(function(id) { return LIBROMANCER_SPELLS[id].name; });
      ctx.fillStyle = '#44aa66';
      ctx.font = '14px monospace';
      ctx.fillText('Collection: ' + names.join(', '), W / 2, H * 0.56);
    }

    ctx.fillStyle = '#1e1810';
    ctx.strokeStyle = '#c4a862';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 120, H * 0.66, 240, 44, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold 17px serif';
    ctx.fillText('Return to Menu', W / 2, H * 0.66 + 22);
  }
}
