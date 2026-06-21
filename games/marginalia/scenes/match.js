// games/marginalia/scenes/match.js
// LibraryMatchScene – core combat for Marginalia.
// Runs all 6 encounters sequentially in one scene; HP carries across.
// Depends on: Engine, PauseOverlay, SPELLS, ENCOUNTERS, ENCOUNTER_ORDER,
//             getEncounter, UNLOCK_SPELL_IDS, LibraryMenuScene, LibraryGameOverScene
// Receives: game (Engine.Game), deck (Array<Spell>) – the 5 chosen spell objects.

class LibraryMatchScene extends Engine.Scene {
  constructor(game, deck) {
    super();
    this._game = game;
    this._deck = deck;   // 5 Spell objects, fixed for the run
    this._W = game.canvas.width;
    this._H = game.canvas.height;

    // Run-level state
    this._playerHp     = 20;
    this._playerMaxHp  = 20;
    this._totalTurns   = 0;
    this._roomsCleared = 0;
    this._encIdx       = 0;

    // Per-encounter (set in _startEncounter)
    this._encounter     = null;  // { ...def, currentHp }
    this._encMarked     = false; // dog_ear: persists for encounter duration
    this._lastCastSpell = null;
    this._turnInEnc     = 1;

    // Per-turn
    this._castsUsed  = 0;
    this._castsAllowed = 1;
    this._encHpDelta = 0;
    this._playerDef  = 0;   // defense accumulated this turn
    this._encAttMod  = 0;   // attack modifier (from redaction etc.)
    this._encStunned = false;
    this._chainBonus = 0;

    // Cooldowns: spellId -> turns remaining
    this._cooldowns = {};

    // State machine
    this._state  = 'PLAYER_TURN';
    this._timer  = 0;
    this._t      = 0;
    this._log    = [];
    this._winText      = '';
    this._unlockEarned = null;

    // UI
    this._hoverCard = -1;
    this._hoverEnd  = false;
    this._prevMouse = false;

    this._pause = new PauseOverlay(game, {
      onQuit: function() {
        game.setScene(new LibraryMenuScene(game));
      }
    });

    this._startEncounter(0);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  enter() { this._t = 0; }

  update(dt) {
    this._t += dt;
    if (this._pause.update(dt)) return;

    if (this._state === 'RESOLVING') {
      this._timer += dt;
      if (this._playerHp <= 0 && this._timer > 1.2) {
        this._game.setScene(new LibraryGameOverScene(this._game, {
          outcome: 'loss', roomsCleared: this._roomsCleared,
          hpRemaining: 0,  turnsTotal: this._totalTurns
        }));
      } else if (this._playerHp > 0 && this._timer > 0.8) {
        this._beginPlayerTurn();
      }
      return;
    }

    if (this._state === 'ENCOUNTER_WIN') {
      this._timer += dt;
      if (this._timer > 1.8) {
        this._encIdx++;
        if (this._encIdx >= ENCOUNTER_ORDER.length) {
          this._game.setScene(new LibraryGameOverScene(this._game, {
            outcome: 'win', roomsCleared: this._roomsCleared,
            hpRemaining: this._playerHp, turnsTotal: this._totalTurns
          }));
        } else {
          this._startEncounter(this._encIdx);
        }
      }
      return;
    }

    if (this._state !== 'PLAYER_TURN') return;

    var mx = Engine.input.mouse.x, my = Engine.input.mouse.y;
    var cards = this._cardRects();
    this._hoverCard = -1;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
        this._hoverCard = i; break;
      }
    }
    var eb = this._endTurnRect();
    this._hoverEnd = mx >= eb.x && mx <= eb.x + eb.w && my >= eb.y && my <= eb.y + eb.h;

    var cur = Engine.input.mouse.left;
    var just = cur && !this._prevMouse;
    this._prevMouse = cur;
    if (just) {
      if (this._hoverCard !== -1) this._castSpell(this._deck[this._hoverCard]);
      else if (this._hoverEnd) this._endTurn();
    }
  }

  // ── Combat helpers ─────────────────────────────────────────────────────────────

  _startEncounter(idx) {
    this._encIdx       = idx;
    var def = getEncounter(ENCOUNTER_ORDER[idx]);
    this._encounter    = Object.assign({}, def, { currentHp: def.hp });
    this._encMarked    = false;
    this._lastCastSpell = null;
    this._unlockEarned = null;
    this._log = ['— ' + def.room + ' —', def.name + ': ' + def.desc];
    this._turnInEnc = 1;
    this._beginPlayerTurn();
  }

  _beginPlayerTurn() {
    this._castsUsed    = 0;
    this._castsAllowed = 1;
    this._encHpDelta   = 0;
    this._playerDef    = 0;
    this._encAttMod    = 0;
    this._chainBonus   = 0;
    // encMarked and lastCastSpell persist across turns
    this._state = 'PLAYER_TURN';
  }

  _addLog(msg) {
    this._log.push(msg);
    if (this._log.length > 6) this._log.shift();
  }

  _castSpell(spell) {
    if (this._castsUsed >= this._castsAllowed) return;
    if ((this._cooldowns[spell.id] || 0) > 0) return;

    var self = this;
    // Build a mutable state object for this cast
    var s = {
      playerHp: this._playerHp,
      playerMaxHp: this._playerMaxHp,
      encHpDelta: this._encHpDelta,
      encAttackModifier: this._encAttMod,
      encMarked: this._encMarked,
      encStunned: this._encStunned,
      chainBonus: this._chainBonus,
      extraCastThisTurn: 0,
      encounter: this._encounter,
      lastCastSpell: this._lastCastSpell,
      log: function(msg) { self._addLog(msg); }
    };
    s.applySpellEffect = function(sp, isCitation) {
      if (!sp) return;
      var d = sp.dmg + s.chainBonus + (s.encMarked ? 2 : 0);
      s.encHpDelta += d;
      self._playerDef += sp.def;
      if (sp.effect) sp.effect(s);
      if (!isCitation) s.lastCastSpell = sp;
    };

    // Apply this spell
    var dmg = spell.dmg + this._chainBonus + (this._encMarked ? 2 : 0);
    s.encHpDelta += dmg;
    this._playerDef += spell.def;
    if (spell.effect) spell.effect(s);
    s.lastCastSpell = spell;

    // Sync state object back to scene
    this._playerHp    = Math.max(0, Math.min(s.playerHp, this._playerMaxHp));
    this._encHpDelta  = s.encHpDelta;
    this._encAttMod   = s.encAttackModifier;
    this._encMarked   = s.encMarked;
    this._encStunned  = s.encStunned;
    this._chainBonus  = s.chainBonus;
    this._castsAllowed += s.extraCastThisTurn;
    this._lastCastSpell = s.lastCastSpell;

    this._cooldowns[spell.id] = spell.cooldown + 1;
    this._castsUsed++;

    var parts = [];
    if (dmg > 0) parts.push(dmg + ' dmg');
    if (spell.def > 0) parts.push(spell.def + ' def');
    var suffix = parts.length ? ' (' + parts.join(', ') + ')' : '';
    this._addLog('Cast: ' + spell.name + suffix);
  }

  _endTurn() {
    if (this._state !== 'PLAYER_TURN') return;
    this._totalTurns++;
    this._state  = 'RESOLVING';
    this._timer  = 0;

    // Apply player damage to encounter
    var encDmg = Math.max(0, this._encHpDelta - this._encounter.armor);
    this._encounter.currentHp -= encDmg;
    if (encDmg > 0) {
      this._addLog(this._encounter.name + ' takes ' + encDmg + ' dmg. ('
                   + this._encounter.currentHp + ' HP remaining)');
    } else if (this._encHpDelta > 0) {
      this._addLog('Attack absorbed by armor.');
    }

    if (this._encounter.currentHp <= 0) {
      this._encounter.currentHp = 0;
      this._onEncounterWin();
      return;
    }

    // Enemy heals (before attacking)
    if (this._encounter.healEvery > 0 && this._turnInEnc % this._encounter.healEvery === 0) {
      var prevHp = this._encounter.currentHp;
      this._encounter.currentHp = Math.min(this._encounter.hp,
        this._encounter.currentHp + this._encounter.healAmount);
      var healed = this._encounter.currentHp - prevHp;
      if (healed > 0) this._addLog(this._encounter.name + ' recovers ' + healed + ' HP.');
    }

    // Enemy attacks
    if (this._encStunned) {
      this._addLog(this._encounter.name + ' is stunned — misses their attack.');
    } else {
      var isAlt = this._encounter.altAttackEvery > 0
                  && this._turnInEnc % this._encounter.altAttackEvery === 0;
      var taken;
      if (isAlt) {
        taken = this._encounter.altAttackDmg;
        this._addLog(this._encounter.altAttackMsg + ' (' + taken + ' piercing damage!)');
      } else {
        taken = Math.max(0, this._encounter.attack + this._encAttMod - this._playerDef);
        this._addLog(this._encounter.name + ' attacks for ' + taken + '.');
      }
      this._playerHp = Math.max(0, this._playerHp - taken);
    }
    this._encStunned = false;

    // Decrement cooldowns
    var self = this;
    Object.keys(this._cooldowns).forEach(function(id) {
      if (self._cooldowns[id] > 0) self._cooldowns[id]--;
    });

    this._turnInEnc++;
  }

  _onEncounterWin() {
    this._roomsCleared++;

    // Unlock one spell per encounter
    var unlockId = UNLOCK_SPELL_IDS[this._encIdx] || null;
    if (unlockId) {
      var existing = Engine.storage.load('marginalia_unlocks', []);
      if (existing.indexOf(unlockId) === -1) {
        existing.push(unlockId);
        Engine.storage.save('marginalia_unlocks', existing);
        this._unlockEarned = SPELLS[unlockId];
        this._addLog('New spell discovered: ' + this._unlockEarned.name);
      }
    }

    // Heal between encounters (not after the last one)
    if (this._encIdx < ENCOUNTER_ORDER.length - 1) {
      var prev = this._playerHp;
      this._playerHp = Math.min(this._playerMaxHp, this._playerHp + 3);
      var h = this._playerHp - prev;
      if (h > 0) this._addLog('You recover ' + h + ' HP.');
    }

    this._winText = this._encounter.name + ' is cataloged.';
    this._state   = 'ENCOUNTER_WIN';
    this._timer   = 0;
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  _cardRects() {
    var W = this._W, H = this._H, n = this._deck.length;
    var cardH = Math.min(120, H * 0.16);
    var pad = 12, gap = 8;
    var cardW = Math.floor((W - 2 * pad - (n - 1) * gap) / n);
    var startX = pad, startY = H - cardH - 46;
    return this._deck.map(function(_, i) {
      return { x: startX + i * (cardW + gap), y: startY, w: cardW, h: cardH };
    });
  }

  _endTurnRect() {
    var W = this._W, H = this._H;
    return { x: W - 130, y: H - 36, w: 118, h: 28 };
  }

  _enemyZone() {
    var W = this._W, H = this._H;
    var zoneX = Math.floor(W * 0.04);
    var zoneY = 56;
    var zoneW = Math.min(Math.floor(W * 0.40), 320);
    var cardH = Math.min(120, H * 0.16);
    var zoneH = Math.min(H - zoneY - cardH - 100, 260);
    return { x: zoneX, y: zoneY, w: zoneW, h: zoneH };
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  draw(ctx) {
    var W = this._W, H = this._H;

    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, W, H);

    this._drawTopBar(ctx);
    this._drawEnemyAndIntent(ctx);
    this._drawLog(ctx);
    this._drawSpellCards(ctx);
    this._drawEndTurnBtn(ctx);

    if (this._state === 'ENCOUNTER_WIN') this._drawEncounterWinOverlay(ctx);
    if (this._state === 'RESOLVING' && this._playerHp <= 0) this._drawDeathOverlay(ctx);

    this._pause.draw(ctx);
  }

  _drawTopBar(ctx) {
    var W = this._W;
    var enc = this._encounter;
    ctx.fillStyle = '#110a03';
    ctx.fillRect(0, 0, W, 48);
    ctx.strokeStyle = '#3a2518'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();

    // Player HP (left)
    ctx.font = 'bold 13px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4b896';
    ctx.fillText('HP ' + this._playerHp + ' / ' + this._playerMaxHp, 12, 20);
    var bw = Math.min(90, W * 0.12), bh = 5, bx = 12, by = 32;
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this._playerHp > 7 ? '#27ae60' : '#c0392b';
    ctx.fillRect(bx, by, bw * (this._playerHp / this._playerMaxHp), bh);

    // Room + enemy name (center)
    ctx.font = 'italic 12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a4030';
    ctx.fillText(enc.room, W / 2, 16);
    ctx.font = 'bold 14px serif'; ctx.fillStyle = '#d4b896';
    ctx.fillText(enc.name, W / 2, 34);

    // Enemy HP (right)
    ctx.font = '12px serif'; ctx.textAlign = 'right';
    var hpStr = enc.currentHp + ' / ' + enc.hp + ' HP';
    if (enc.armor > 0) hpStr += '  [' + enc.armor + ' armor]';
    ctx.fillStyle = '#d4b896'; ctx.fillText(hpStr, W - 12, 20);

    var tags = [];
    if (this._encMarked) tags.push('◆ marked');
    if (this._encStunned) tags.push('✦ stunned');
    ctx.font = '11px serif'; ctx.fillStyle = '#f39c12';
    ctx.fillText(tags.join('  '), W - 12, 36);
  }

  _drawEnemyAndIntent(ctx) {
    var z = this._enemyZone();
    var enc = this._encounter;

    // Border
    ctx.strokeStyle = '#2c1a0a'; ctx.lineWidth = 1;
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    // Enemy sprite via drawFn
    enc.drawFn(ctx, z.x, z.y, z.w, z.h, this._t);

    // Enemy HP bar
    var bx = z.x + z.w * 0.05, by = z.y + z.h + 5, bw = z.w * 0.9, bh = 7;
    ctx.fillStyle = '#1a0f05'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = enc.currentHp / enc.hp > 0.4 ? '#c0392b' : '#7b241c';
    ctx.fillRect(bx, by, bw * Math.max(0, enc.currentHp / enc.hp), bh);

    // Intent panel (right of enemy zone)
    var ip = { x: z.x + z.w + 16, y: z.y, w: this._W - (z.x + z.w + 16) - 10, h: z.h };
    if (ip.w > 80) this._drawIntentPanel(ctx, ip);
  }

  _drawIntentPanel(ctx, ip) {
    ctx.fillStyle = '#110a03';
    ctx.fillRect(ip.x, ip.y, ip.w, ip.h);
    ctx.strokeStyle = '#2c1a0a'; ctx.lineWidth = 1;
    ctx.strokeRect(ip.x, ip.y, ip.w, ip.h);

    var enc = this._encounter;
    var tn = this._turnInEnc;
    var isAlt = enc.altAttackEvery > 0 && tn % enc.altAttackEvery === 0;
    var willHeal = enc.healEvery > 0 && tn % enc.healEvery === 0;

    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '11px serif'; ctx.fillStyle = '#3a2518';
    ctx.fillText('Enemy intent:', ip.x + 8, ip.y + 8);

    var ly = ip.y + 24;
    ctx.textBaseline = 'middle';
    if (this._encStunned) {
      ctx.font = '12px serif'; ctx.fillStyle = '#f39c12';
      ctx.fillText('Stunned — no attack', ip.x + 8, ly); ly += 20;
    } else if (isAlt) {
      ctx.font = 'bold 12px serif'; ctx.fillStyle = '#c0392b';
      ctx.fillText(enc.altAttackMsg, ip.x + 8, ly); ly += 18;
      ctx.font = '11px serif'; ctx.fillStyle = '#8a6f4e';
      ctx.fillText(enc.altAttackDmg + ' piercing (ignores defense)', ip.x + 8, ly); ly += 18;
    } else {
      var netAtk = Math.max(0, enc.attack + this._encAttMod - this._playerDef);
      ctx.font = '12px serif'; ctx.fillStyle = '#c0392b';
      ctx.fillText('Attack: ' + enc.attack, ip.x + 8, ly); ly += 18;
      if (this._playerDef > 0 || this._encAttMod !== 0) {
        ctx.font = '11px serif'; ctx.fillStyle = '#5a4030';
        ctx.fillText('Net: ' + netAtk + ' dmg', ip.x + 8, ly); ly += 16;
      }
    }
    if (willHeal) {
      ctx.font = '11px serif'; ctx.fillStyle = '#27ae60';
      ctx.fillText('Heals ' + enc.healAmount + ' HP this turn', ip.x + 8, ly);
    }

    // Casts remaining
    ctx.textBaseline = 'bottom'; ctx.font = '11px serif'; ctx.fillStyle = '#3a2518';
    var left = this._castsAllowed - this._castsUsed;
    ctx.fillText('Casts left: ' + left + ' / ' + this._castsAllowed, ip.x + 8, ip.y + ip.h - 8);
  }

  _drawLog(ctx) {
    var W = this._W, H = this._H;
    var cardH = Math.min(120, H * 0.16);
    var logH = 78, logY = H - cardH - 46 - logH - 6;

    ctx.fillStyle = '#0f0904'; ctx.fillRect(0, logY, W, logH);
    ctx.strokeStyle = '#2c1a0a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, logY); ctx.lineTo(W, logY); ctx.stroke();

    var lines = this._log.slice(-4);
    ctx.font = '12px serif'; ctx.textAlign = 'left';
    for (var i = 0; i < lines.length; i++) {
      var a = 0.3 + 0.7 * ((i + 1) / lines.length);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#8a6f4e'; ctx.textBaseline = 'middle';
      ctx.fillText(lines[i], 12, logY + 10 + i * 16);
    }
    ctx.globalAlpha = 1;
  }

  _drawSpellCards(ctx) {
    var cards = this._cardRects();
    for (var i = 0; i < this._deck.length; i++) {
      var spell = this._deck[i], r = cards[i];
      var cd = this._cooldowns[spell.id] || 0;
      var canCast = cd === 0 && this._castsUsed < this._castsAllowed && this._state === 'PLAYER_TURN';
      var hov = i === this._hoverCard && canCast;

      ctx.fillStyle = canCast ? (hov ? '#2c1a0a' : '#1e1208') : '#140d06';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = canCast ? (hov ? '#d4b896' : '#5a3a20') : '#251608';
      ctx.lineWidth = canCast ? 1.5 : 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      var gs = Math.min(32, Math.floor(r.h * 0.28)), gx = r.x + 6, gy = r.y + 6;
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gs, gs); ctx.clip();
      ctx.translate(gx, gy);
      ctx.globalAlpha = canCast ? 1 : 0.3;
      spell.glyphFn(ctx, gs, gs);
      ctx.globalAlpha = 1;
      ctx.restore();

      var tx = gx + gs + 5;
      ctx.textAlign = 'left'; ctx.font = 'bold ' + Math.min(11, r.w * 0.082) + 'px serif';
      ctx.textBaseline = 'top'; ctx.fillStyle = canCast ? (hov ? '#d4b896' : '#8a6f4e') : '#3a2518';
      ctx.fillText(spell.name, tx, r.y + 6);

      ctx.font = '10px serif';
      ctx.fillStyle = '#c0392b'; ctx.fillText(spell.dmg + ' dmg', tx, r.y + 20);
      ctx.fillStyle = '#2980b9'; ctx.fillText(spell.def + ' def', tx, r.y + 32);
      if (spell.cooldown > 0) {
        ctx.fillStyle = '#5a4030'; ctx.fillText('cd ' + spell.cooldown, tx, r.y + 44);
      }

      if (cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.font = 'bold 12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#8a6f4e'; ctx.fillText('CD ' + cd, r.x + r.w / 2, r.y + r.h * 0.6);
      }

      // Description at card bottom
      ctx.font = '9px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#3a2518';
      var desc = spell.desc;
      var maxLen = Math.max(14, Math.floor(r.w / 5.2));
      if (desc.length > maxLen) desc = desc.slice(0, maxLen - 1) + '…';
      ctx.fillText(desc, r.x + 5, r.y + r.h - 4);
    }
  }

  _drawEndTurnBtn(ctx) {
    var btn = this._endTurnRect();
    var active = this._state === 'PLAYER_TURN';
    var hov = this._hoverEnd && active;
    ctx.fillStyle = hov ? '#2c1a0a' : '#1a1008';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = active ? (hov ? '#d4b896' : '#5a3a20') : '#251608';
    ctx.lineWidth = 1; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? (hov ? '#d4b896' : '#8a6f4e') : '#3a2518';
    ctx.fillText('End Turn', btn.x + btn.w / 2, btn.y + btn.h / 2);
  }

  _drawEncounterWinOverlay(ctx) {
    var W = this._W, H = this._H;
    ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, W, H);
    ctx.font = 'italic 22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f39c12';
    ctx.fillText(this._winText, W / 2, H / 2 - (this._unlockEarned ? 20 : 0));
    if (this._unlockEarned) {
      ctx.font = '14px serif'; ctx.fillStyle = '#d4b896';
      ctx.fillText('Discovered: ' + this._unlockEarned.name, W / 2, H / 2 + 16);
      ctx.font = 'italic 11px serif'; ctx.fillStyle = '#5a4030';
      ctx.fillText(this._unlockEarned.desc, W / 2, H / 2 + 36);
    }
  }

  _drawDeathOverlay(ctx) {
    var W = this._W, H = this._H;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.font = 'italic 32px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c0392b'; ctx.fillText('Overdue.', W / 2, H / 2);
  }
}
