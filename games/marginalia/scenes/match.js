// games/marginalia/scenes/match.js
// LibraryMatchScene: combat loop for Marginalia.
// Runs through ENCOUNTER_ORDER (6 encounters) in sequence.
// Player casts from a chosen 5-spell deck; enemy attacks each round.
//
// State machine:
//   PLAYER_TURN -> cast spell or End Turn -> ANIMATING
//   ANIMATING   -> 0.4s delay             -> resolveEnemy -> PLAYER_TURN
//   ENCOUNTER_WIN -> click                -> next encounter (or VICTORY)
//   VICTORY / GAME_OVER -> 0.6s auto      -> LibraryGameOverScene
//
// Spell state fields (passed in effect(state)):
//   playerHp, playerMaxHp, encHpDelta, encAttackModifier, encMarked,
//   encStunned, chainBonus, extraCastThisTurn, encounter.armor,
//   lastCastSpell, log(msg), applySpellEffect(spell, isCitation)
//
// Depends on: Engine, SPELLS, ENCOUNTERS, ENCOUNTER_ORDER, getEncounter,
//             UNLOCK_SPELL_IDS, LibraryGameOverScene

class LibraryMatchScene extends Engine.Scene {
  constructor(game, deck) {
    super();
    this._game = game;
    this._deck = deck; // Array<spell>, length 5

    // Run-level state
    this._encIdx       = 0;
    this._roomsCleared = 0;
    this._turnsTotal   = 0;
    this._playerHp     = 24;
    this._playerMaxHp  = 24;

    // Encounter-level state (reset in _initEncounter)
    this._encHp    = 0;
    this._encArmor = 0;
    this._encTurn  = 0;  // enemy turn counter for heal/alt-attack intervals
    this._encMarked = false;

    // Per-turn accumulators (reset in _beginPlayerTurn)
    this._playerDef     = 0;
    this._chainBonus    = 0;
    this._pendingAtkMod = 0;
    this._encStunned    = false;
    this._castsLeft     = 1;
    this._lastCastSpell = null;

    // Spell cooldowns: { spellId: turnsRemaining }
    this._cooldowns = {};

    // UI
    this._state        = 'PLAYER_TURN';
    this._animTimer    = 0;
    this._hoverIdx     = -1;
    this._hoverEnd     = false;
    this._wasMouseDown = false;
    this._log          = [];
    this._t            = 0;
  }

  enter() {
    this._wasMouseDown = Engine.input.mouse.left;
    this._initEncounter();
  }

  // ── Encounter lifecycle ─────────────────────────────────────────────

  _enc() {
    return getEncounter(ENCOUNTER_ORDER[this._encIdx]);
  }

  _initEncounter() {
    var enc = this._enc();
    this._encHp    = enc.hp;
    this._encArmor = enc.armor || 0;
    this._encTurn  = 0;
    this._encMarked = false;
    // Reset all cooldowns on entering a new encounter
    var cd = this._cooldowns;
    for (var id in cd) cd[id] = 0;
    this._log = [enc.room + '.', enc.name + ' — ' + enc.desc];
    this._beginPlayerTurn();
  }

  _beginPlayerTurn() {
    this._playerDef     = 0;
    this._chainBonus    = 0;
    this._pendingAtkMod = 0;
    this._encStunned    = false;
    this._castsLeft     = 1;
    this._lastCastSpell = null;
    this._state         = 'PLAYER_TURN';
    this._turnsTotal++;
    var cd = this._cooldowns;
    for (var id in cd) { if (cd[id] > 0) cd[id]--; }
  }

  // ── Spell casting ────────────────────────────────────────────────

  _castSpell(spell) {
    if ((this._cooldowns[spell.id] || 0) > 0) return;
    if (this._castsLeft <= 0) return;

    var self = this;
    var state = {
      playerHp:          this._playerHp,
      playerMaxHp:       this._playerMaxHp,
      encHpDelta:        spell.dmg + this._chainBonus,
      encAttackModifier: 0,
      encMarked:         this._encMarked,
      encStunned:        false,
      chainBonus:        0,
      extraCastThisTurn: 0,
      encounter:         { armor: this._encArmor },
      lastCastSpell:     this._lastCastSpell,
      log: function(msg) { self._log2(msg); },
      // Used by citation to repeat a spell's full effect within this turn
      applySpellEffect: function(sp, isCitation) {
        if (!sp || (isCitation && sp.id === 'citation')) return;
        state.encHpDelta += sp.dmg + state.chainBonus;
        self._playerDef  += sp.def;
        if (sp.effect) sp.effect(state);
      }
    };

    if (spell.effect) spell.effect(state);
    this._playerDef += spell.def;

    // Commit turn-state mutations
    this._playerHp   = Math.max(0, Math.min(this._playerMaxHp, state.playerHp));
    this._encMarked  = state.encMarked;
    this._chainBonus += state.chainBonus;
    this._pendingAtkMod += state.encAttackModifier;
    if (state.encStunned) this._encStunned = true;

    // Apply damage to enemy (armor absorbs first)
    var rawDmg   = Math.max(0, state.encHpDelta);
    var absorbed = Math.min(rawDmg, state.encounter.armor);
    this._encArmor = Math.max(0, state.encounter.armor - absorbed);
    var dealt = rawDmg - absorbed;
    this._encHp -= dealt;

    // Log the cast
    var msg = spell.name;
    if (dealt > 0)    msg += ': -' + dealt + ' to enemy';
    if (absorbed > 0) msg += ' (' + absorbed + ' armored)';
    if (spell.def > 0) msg += ', +' + spell.def + ' def';
    this._log2(msg);

    if (spell.cooldown > 0) this._cooldowns[spell.id] = spell.cooldown;
    this._lastCastSpell = spell;

    this._castsLeft--;
    this._castsLeft += state.extraCastThisTurn;

    if (this._encHp <= 0) {
      this._encHp = 0;
      this._resolveEncounterWin();
      return;
    }
    if (this._playerHp <= 0) {
      this._playerHp = 0;
      this._animTimer = 0;
      this._state = 'GAME_OVER';
      return;
    }
    if (this._castsLeft <= 0) {
      this._animTimer = 0;
      this._state = 'ANIMATING';
    }
  }

  _endTurn() {
    if (this._state !== 'PLAYER_TURN') return;
    this._animTimer = 0;
    this._state = 'ANIMATING';
  }

  // ── Enemy turn ───────────────────────────────────────────────────

  _resolveEnemyTurn() {
    var enc = this._enc();
    this._encTurn++;

    // Heal (runs regardless of stun — healing is not an action)
    if (enc.healEvery > 0 && this._encTurn % enc.healEvery === 0) {
      var before = this._encHp;
      this._encHp = Math.min(enc.hp, this._encHp + enc.healAmount);
      var healed = this._encHp - before;
      if (healed > 0) this._log2(enc.name + ' recovers ' + healed + ' HP.');
    }

    if (this._encStunned) {
      this._log2(enc.name + ' is stunned.');
    } else {
      var useAlt = enc.altAttackEvery > 0 && this._encTurn % enc.altAttackEvery === 0;
      if (useAlt) {
        // Alt attack bypasses all player defense
        var altDmg = enc.altAttackDmg;
        this._playerHp = Math.max(0, this._playerHp - altDmg);
        this._log2((enc.altAttackMsg || 'Special') + ': -' + altDmg + ' HP (ignores def).');
      } else {
        var rawAtk  = Math.max(0, enc.attack + this._pendingAtkMod);
        var blocked = Math.min(rawAtk, this._playerDef);
        var taken   = rawAtk - blocked;
        this._playerHp = Math.max(0, this._playerHp - taken);
        var atkMsg = enc.name + ' attacks';
        if (blocked > 0) atkMsg += ' (' + blocked + ' blocked)';
        atkMsg += ': -' + taken + ' HP.';
        this._log2(atkMsg);
      }
    }

    this._encStunned    = false;
    this._pendingAtkMod = 0;
    this._playerDef     = 0;

    if (this._playerHp <= 0) {
      this._playerHp = 0;
      this._animTimer = 0;
      this._state = 'GAME_OVER';
      return;
    }
    this._beginPlayerTurn();
  }

  // ── Encounter win ────────────────────────────────────────────────

  _resolveEncounterWin() {
    var enc = this._enc();
    this._roomsCleared++;
    this._log2(enc.name + ' cataloged.');

    // Unlock the spell associated with this encounter position
    var unlockId = UNLOCK_SPELL_IDS[this._encIdx];
    if (unlockId) {
      var existing = Engine.storage.load('marginalia_unlocks', []);
      if (existing.indexOf(unlockId) === -1) {
        existing.push(unlockId);
        Engine.storage.save('marginalia_unlocks', existing);
        var spl = SPELLS[unlockId];
        this._log2('Discovered: ' + (spl ? spl.name : unlockId) + '.');
      }
    }

    // Minor heal between encounters (not after the final one)
    if (this._encIdx < ENCOUNTER_ORDER.length - 1) {
      var heal = Math.min(4, this._playerMaxHp - this._playerHp);
      if (heal > 0) {
        this._playerHp += heal;
        this._log2('+' + heal + ' HP recovered.');
      }
    }

    this._state = 'ENCOUNTER_WIN';
  }

  _advanceEncounter() {
    var next = this._encIdx + 1;
    if (next >= ENCOUNTER_ORDER.length) {
      this._animTimer = 0;
      this._state = 'VICTORY';
      return;
    }
    this._encIdx = next;
    this._initEncounter();
  }

  // ── Helpers ────────────────────────────────────────────────────────

  _log2(msg) {
    this._log.push(msg);
    if (this._log.length > 5) this._log.shift();
  }

  _cardRects(W, H) {
    var n = this._deck.length;
    var cw = Math.min(130, (W - 40) / n - 8);
    var ch = Math.min(88, H * 0.145);
    var total = n * cw + (n - 1) * 8;
    var ox = W / 2 - total / 2, oy = H * 0.815;
    var rects = [];
    for (var i = 0; i < n; i++) {
      rects.push({ x: ox + i * (cw + 8), y: oy, w: cw, h: ch });
    }
    return rects;
  }

  _endTurnRect(W, H) {
    var bw = 112, bh = 26;
    return { x: W / 2 - bw / 2, y: H * 0.975 - bh, w: bw, h: bh };
  }

  // ── Update ───────────────────────────────────────────────────────────

  update(dt) {
    this._t += dt;
    var mouse = Engine.input.mouse;
    var just = mouse.left && !this._wasMouseDown;
    this._wasMouseDown = mouse.left;

    if (this._state === 'ANIMATING') {
      this._animTimer += dt;
      if (this._animTimer >= 0.4) this._resolveEnemyTurn();
      return;
    }

    if (this._state === 'GAME_OVER' || this._state === 'VICTORY') {
      this._animTimer += dt;
      if (this._animTimer >= 0.65) {
        var won = this._state === 'VICTORY';
        this._game.setScene(new LibraryGameOverScene(this._game, {
          outcome:       won ? 'win' : 'loss',
          roomsCleared:  this._roomsCleared,
          hpRemaining:   this._playerHp,
          turnsTotal:    this._turnsTotal
        }));
      }
      return;
    }

    if (this._state === 'ENCOUNTER_WIN') {
      if (just) this._advanceEncounter();
      return;
    }

    // PLAYER_TURN interaction
    if (this._state === 'PLAYER_TURN') {
      var W = this._game.canvas.width, H = this._game.canvas.height;
      var cards = this._cardRects(W, H);
      var mx = mouse.x, my = mouse.y;
      this._hoverIdx = -1;
      this._hoverEnd = false;

      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
          this._hoverIdx = i;
          break;
        }
      }
      var eb = this._endTurnRect(W, H);
      if (mx >= eb.x && mx <= eb.x + eb.w && my >= eb.y && my <= eb.y + eb.h) {
        this._hoverEnd = true;
      }

      if (just) {
        if (this._hoverIdx >= 0) {
          this._castSpell(this._deck[this._hoverIdx]);
        } else if (this._hoverEnd) {
          this._endTurn();
        }
      }
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────

  draw(ctx) {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, W, H);

    if (this._state === 'GAME_OVER') {
      this._drawTransition(ctx, W, H, false);
      return;
    }
    if (this._state === 'VICTORY') {
      this._drawTransition(ctx, W, H, true);
      return;
    }
    if (this._state === 'ENCOUNTER_WIN') {
      this._drawEncounterWin(ctx, W, H);
      return;
    }

    this._drawHeader(ctx, W, H);
    this._drawEnemy(ctx, W, H);
    this._drawLog(ctx, W, H);
    this._drawTurnState(ctx, W, H);
    this._drawHand(ctx, W, H);
  }

  _drawHeader(ctx, W, H) {
    ctx.fillStyle = '#0f0904';
    ctx.fillRect(0, 0, W, H * 0.08);
    ctx.font = Math.min(13, H * 0.021) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a4030';
    var enc = this._enc();
    ctx.fillText(
      enc.room + '   ·   Enc ' + (this._encIdx + 1) + '/' + ENCOUNTER_ORDER.length +
      '   ·   HP ' + this._playerHp + '/' + this._playerMaxHp,
      W / 2, H * 0.04
    );
  }

  _drawEnemy(ctx, W, H) {
    var enc = this._enc();

    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#d4b896';
    ctx.font = 'italic ' + Math.min(20, H * 0.033) + 'px serif';
    ctx.fillText(enc.name, W / 2, H * 0.1);

    // HP bar
    var bw = Math.min(220, W * 0.38), bh = 9;
    var bx = W / 2 - bw / 2, by = H * 0.155;
    var ratio = Math.max(0, this._encHp / enc.hp);
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = ratio > 0.5 ? '#4a8a4a' : ratio > 0.25 ? '#aa8822' : '#882222';
    ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.font = Math.min(11, H * 0.018) + 'px serif';
    ctx.fillStyle = '#8a6f4e';
    var hpLine = 'HP ' + this._encHp + ' / ' + enc.hp;
    if (this._encArmor > 0)  hpLine += '   Armor ' + this._encArmor;
    if (this._encMarked)     hpLine += '   [marked]';
    if (this._encStunned)    hpLine += '   [stunned]';
    ctx.fillText(hpLine, W / 2, by + bh + 3);

    // Enemy sprite
    var sw = Math.min(200, W * 0.36), sh = Math.min(160, H * 0.28);
    ctx.save();
    enc.drawFn(ctx, W / 2 - sw / 2, H * 0.2, sw, sh, this._t);
    ctx.restore();
  }

  _drawLog(ctx, W, H) {
    var lines = this._log.slice(-4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var lh = Math.min(15, H * 0.025);
    ctx.font = Math.min(12, H * 0.02) + 'px serif';
    for (var i = 0; i < lines.length; i++) {
      var alpha = 0.3 + (i + 1) / lines.length * 0.7;
      ctx.fillStyle = 'rgba(180,158,120,' + alpha + ')';
      ctx.fillText(lines[i], W / 2, H * 0.52 + i * lh);
    }
  }

  _drawTurnState(ctx, W, H) {
    var parts = [];
    if (this._playerDef > 0)   parts.push('Def ' + this._playerDef);
    if (this._chainBonus > 0)  parts.push('Chain +' + this._chainBonus + ' dmg');
    if (this._castsLeft > 1)   parts.push('Extra cast!');
    if (parts.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = Math.min(11, H * 0.018) + 'px serif';
      ctx.fillStyle = '#6aaf6a';
      ctx.fillText(parts.join('   '), W / 2, H * 0.73);
    }
  }

  _drawHand(ctx, W, H) {
    var cards = this._cardRects(W, H);
    for (var i = 0; i < this._deck.length; i++) {
      var spell  = this._deck[i];
      var card   = cards[i];
      var onCD   = (this._cooldowns[spell.id] || 0) > 0;
      var active = this._state === 'PLAYER_TURN';
      var hover  = this._hoverIdx === i && active && !onCD;
      var dimmed = onCD || !active;

      ctx.save();
      ctx.globalAlpha = dimmed ? 0.4 : 1;

      ctx.fillStyle   = hover ? '#2c1a0a' : '#160d05';
      ctx.strokeStyle = hover ? '#d4b896' : (onCD ? '#2a1a0a' : '#3a2518');
      ctx.lineWidth   = hover ? 1.5 : 1;
      ctx.beginPath();
      ctx.rect(card.x, card.y, card.w, card.h);
      ctx.fill(); ctx.stroke();

      // Glyph in top-left corner
      var gs = Math.min(26, card.h * 0.29);
      ctx.save();
      ctx.beginPath(); ctx.rect(card.x + 4, card.y + 4, gs, gs); ctx.clip();
      ctx.translate(card.x + 4, card.y + 4);
      spell.glyphFn(ctx, gs, gs);
      ctx.restore();

      // Name
      ctx.font = 'bold ' + Math.min(10, card.w * 0.08) + 'px serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = hover ? '#d4b896' : '#8a6f4e';
      ctx.fillText(spell.name, card.x + gs + 8, card.y + 5);

      // Stats
      ctx.font = Math.min(9, card.w * 0.072) + 'px serif';
      ctx.fillStyle = '#c0392b';
      ctx.fillText(spell.dmg + ' dmg', card.x + gs + 8, card.y + 18);
      ctx.fillStyle = '#2980b9';
      ctx.fillText(spell.def + ' def', card.x + gs + 8, card.y + 28);

      // Cooldown overlay
      if (onCD) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#8a6f4e';
        ctx.font = 'bold ' + Math.min(11, card.h * 0.13) + 'px serif';
        ctx.fillText('cd ' + this._cooldowns[spell.id], card.x + card.w / 2, card.y + card.h * 0.68);
      }

      ctx.restore();
    }

    // End Turn button
    var eb = this._endTurnRect(W, H);
    var active2 = this._state === 'PLAYER_TURN';
    ctx.globalAlpha = active2 ? 1 : 0.35;
    ctx.fillStyle   = this._hoverEnd ? '#2c1a0a' : '#160d05';
    ctx.strokeStyle = this._hoverEnd ? '#d4b896' : '#3a2518';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(eb.x, eb.y, eb.w, eb.h);
    ctx.fill(); ctx.stroke();
    ctx.font = Math.min(11, H * 0.018) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this._hoverEnd ? '#d4b896' : '#5a4030';
    ctx.fillText('End Turn', eb.x + eb.w / 2, eb.y + eb.h / 2);
    ctx.globalAlpha = 1;
  }

  // ── Terminal screens ───────────────────────────────────────────────

  _drawEncounterWin(ctx, W, H) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4b896';
    ctx.font = 'italic ' + Math.min(24, H * 0.04) + 'px serif';
    ctx.fillText(this._enc().name + ' cataloged.', W / 2, H * 0.28);

    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 1;
    var ruleW = Math.min(260, W * 0.48);
    ctx.beginPath();
    ctx.moveTo(W / 2 - ruleW / 2, H * 0.36);
    ctx.lineTo(W / 2 + ruleW / 2, H * 0.36);
    ctx.stroke();

    var msgs = this._log.slice(-3);
    ctx.font = Math.min(13, H * 0.022) + 'px serif';
    for (var i = 0; i < msgs.length; i++) {
      ctx.fillStyle = '#8a6f4e';
      ctx.fillText(msgs[i], W / 2, H * 0.44 + i * H * 0.058);
    }

    var bw = Math.min(200, W * 0.36), bh = 38;
    var bx = W / 2 - bw / 2, by = H * 0.72;
    ctx.fillStyle = '#1e1208';
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
    ctx.font = Math.min(14, H * 0.023) + 'px serif';
    ctx.fillStyle = '#d4b896';
    ctx.fillText('Continue', W / 2, by + bh / 2);
  }

  // Brief overlay before handing off to LibraryGameOverScene
  _drawTransition(ctx, W, H, won) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = won ? '#f39c12' : '#c0392b';
    ctx.font = 'italic ' + Math.min(52, H * 0.086) + 'px serif';
    ctx.fillText(won ? 'Cataloged.' : 'Overdue.', W / 2, H / 2);
  }
}
