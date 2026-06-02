// games/marginalia/spells.js
// All spell definitions for Marginalia.
// Depends on: nothing.
// Required by: match.js, deck-select.js
//
// Each spell: { id, name, desc, dmg, def, cooldown, effect, glyphFn }
//   dmg/def: base numeric values applied each time the spell is cast.
//   cooldown: turns the spell is unavailable after being cast (0 = every turn).
//   effect(state): optional function called after dmg/def, receives the match
//     state object. May mutate: playerHp, encHpDelta, encAttackModifier,
//     encMarked, encStunned, chainBonus, extraCastThisTurn, encounter.armor.
//     May call: state.log(msg).
//   glyphFn(ctx, w, h): draws the spell icon into a (w x h) region, origin
//     at top-left of the icon cell. Called with a clean context save/restore.

var SPELLS = {};

function _spell(id, name, desc, dmg, def, cooldown, effect, glyphFn) {
  SPELLS[id] = { id, name, desc, dmg: dmg || 0, def: def || 0,
    cooldown: cooldown || 0, effect: effect || null, glyphFn };
}

// ─── base spells (always unlocked) ──────────────────────────────────────────

_spell('scrawl', 'Scrawl',
  'A frantic note in the margin.',
  4, 0, 0, null,
  function(ctx, w, h) {
    ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 1.5;
    for (var i = 0; i < 4; i++) {
      var y = h * (0.22 + i * 0.17);
      var x1 = w * 0.1, x2 = w * (0.45 + (i % 2 === 0 ? 0.35 : 0.25));
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    }
  });

_spell('warding_glyph', 'Warding Glyph',
  'Someone drew this carefully, in red ink.',
  0, 6, 0, null,
  function(ctx, w, h) {
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.1); ctx.lineTo(w / 2, h * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.1, h / 2); ctx.lineTo(w * 0.9, h / 2); ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.22); ctx.lineTo(w * 0.78, h * 0.78); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.78, h * 0.22); ctx.lineTo(w * 0.22, h * 0.78); ctx.stroke();
  });

_spell('footnote', 'Footnote',
  'The annotation runs to three pages.',
  3, 3, 0, null,
  function(ctx, w, h) {
    ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.28); ctx.lineTo(w * 0.9, h * 0.28); ctx.stroke();
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.8;
    for (var i = 0; i < 4; i++) {
      var y = h * (0.44 + i * 0.13);
      ctx.beginPath(); ctx.moveTo(w * 0.12, y); ctx.lineTo(w * (i === 3 ? 0.55 : 0.88), y); ctx.stroke();
    }
  });

_spell('inkblot', 'Inkblot',
  'Burst an inkwell. Wasteful.',
  6, 0, 0,
  function(state) {
    state.playerHp = Math.max(0, state.playerHp - 2);
    state.log('The inkblot costs you 2 HP.');
  },
  function(ctx, w, h) {
    ctx.fillStyle = '#0d0d1a';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.48, w * 0.34, h * 0.4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.68, h * 0.38, w * 0.11, h * 0.09, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.3, h * 0.68, w * 0.09, h * 0.08, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a40';
    ctx.beginPath();
    ctx.ellipse(w * 0.48, h * 0.4, w * 0.08, h * 0.06, -0.2, 0, Math.PI * 2);
    ctx.fill();
  });

_spell('redaction', 'Redaction',
  'Someone crossed it out for a reason.',
  0, 0, 0,
  function(state) {
    state.encAttackModifier -= 2;
    state.log('Redaction: enemy attack reduced by 2 this turn.');
  },
  function(ctx, w, h) {
    ctx.fillStyle = '#1a0f05';
    ctx.fillRect(w * 0.08, h * 0.28, w * 0.84, h * 0.38);
    ctx.strokeStyle = '#0d0905'; ctx.lineWidth = 1.5;
    for (var i = 0; i < 5; i++) {
      var y = h * (0.32 + i * 0.06);
      ctx.beginPath(); ctx.moveTo(w * 0.08, y); ctx.lineTo(w * 0.92, y); ctx.stroke();
    }
  });

_spell('dog_ear', 'Dog-ear',
  'You know where to find it again.',
  2, 0, 0,
  function(state) {
    if (!state.encMarked) {
      state.encMarked = true;
      state.log('Dog-ear: enemy marked. All attacks deal +2 damage.');
    } else {
      state.log('Dog-ear: enemy already marked.');
    }
  },
  function(ctx, w, h) {
    ctx.fillStyle = '#2c1a0a'; ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.1);
    ctx.lineTo(w * 0.85, h * 0.1);
    ctx.lineTo(w * 0.85, h * 0.72);
    ctx.lineTo(w * 0.62, h * 0.9);
    ctx.lineTo(w * 0.15, h * 0.9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Folded corner
    ctx.fillStyle = '#1a0f05';
    ctx.beginPath();
    ctx.moveTo(w * 0.85, h * 0.72);
    ctx.lineTo(w * 0.62, h * 0.72);
    ctx.lineTo(w * 0.62, h * 0.9);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h * 0.72);
    ctx.lineTo(w * 0.85, h * 0.72);
    ctx.lineTo(w * 0.62, h * 0.9);
    ctx.stroke();
  });

_spell('palimpsest', 'Palimpsest',
  'Written over something older.',
  0, 0, 0,
  function(state) {
    var heal = 4;
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + heal);
    state.log('Palimpsest: you recover ' + heal + ' HP.');
  },
  function(ctx, w, h) {
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.35;
    for (var i = 0; i < 3; i++) {
      var y = h * (0.26 + i * 0.2);
      ctx.beginPath(); ctx.moveTo(w * 0.1, y); ctx.lineTo(w * 0.9, y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 1.3;
    for (var j = 0; j < 2; j++) {
      var y2 = h * (0.4 + j * 0.24);
      ctx.beginPath(); ctx.moveTo(w * 0.14, y2); ctx.lineTo(w * 0.86, y2); ctx.stroke();
    }
    ctx.fillStyle = '#27ae60'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(w * 0.82, h * 0.22, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

_spell('marginalia_chain', 'M. Chain',
  '+1 to all other spell damage this turn.',
  2, 1, 0,
  function(state) {
    state.chainBonus += 1;
    state.log('Marginalia Chain: +1 damage to remaining spells this turn.');
  },
  function(ctx, w, h) {
    ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 1.5;
    var centers = [[w*0.22,h*0.3],[w*0.5,h*0.68],[w*0.78,h*0.3]];
    centers.forEach(function(c) {
      ctx.beginPath(); ctx.arc(c[0], c[1], w * 0.11, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w*0.33, h*0.3); ctx.lineTo(w*0.41, h*0.54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w*0.67, h*0.3); ctx.lineTo(w*0.59, h*0.54); ctx.stroke();
  });

// ─── unlockable spells ───────────────────────────────────────────────────────

_spell('overdue', 'Overdue',
  'Long overdue.',
  9, 0, 2, null,
  function(ctx, w, h) {
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w/2, h*0.46, Math.min(w,h)*0.34, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold ' + Math.floor(h * 0.42) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', w / 2, h * 0.5);
  });

_spell('errata', 'Errata',
  'Corrects the record. Permanently.',
  5, 0, 0,
  function(state) {
    if (state.encounter.armor > 0) {
      var strip = Math.min(3, state.encounter.armor);
      state.encounter.armor -= strip;
      state.log('Errata: stripped ' + strip + ' armor from enemy.');
    } else {
      state.log('Errata: enemy has no armor to strip.');
    }
  },
  function(ctx, w, h) {
    ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 1;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w*0.1, h*(0.24+i*0.17)); ctx.lineTo(w*(i===2?0.6:0.9), h*(0.24+i*0.17));
      ctx.stroke();
    }
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w*0.12, h*0.62); ctx.lineTo(w*0.88, h*0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w*0.88, h*0.62); ctx.lineTo(w*0.12, h*0.78); ctx.stroke();
  });

_spell('citation', 'Citation',
  'As previously established.',
  0, 0, 0,
  function(state) {
    if (state.lastCastSpell && state.lastCastSpell.id !== 'citation') {
      state.log('Citation: repeating ' + state.lastCastSpell.name + '.');
      state.applySpellEffect(state.lastCastSpell, true);
    } else {
      state.log('Citation: nothing to cite.');
    }
  },
  function(ctx, w, h) {
    ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w*0.1, h*0.34); ctx.lineTo(w*0.9, h*0.34); ctx.stroke();
    ctx.fillStyle = '#8a6f4e';
    ctx.font = Math.floor(h*0.18) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('[ibid.]', w/2, h*0.58);
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(w*0.2, h*0.72); ctx.lineTo(w*0.8, h*0.72); ctx.stroke();
  });

_spell('illuminated', 'Illuminated',
  'Gilded borders, burning intent.',
  4, 2, 0,
  function(state) {
    if (state.encMarked) {
      state.encHpDelta += 3;
      state.log('Illuminated bonus: +3 damage (marked target).');
    }
  },
  function(ctx, w, h) {
    ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2;
    ctx.strokeRect(w*0.1, h*0.1, w*0.8, h*0.8);
    ctx.strokeStyle = '#d4b896'; ctx.lineWidth = 0.8;
    ctx.strokeRect(w*0.18, h*0.18, w*0.64, h*0.64);
    ctx.fillStyle = '#f39c12';
    [[w*0.1,h*0.1],[w*0.9,h*0.1],[w*0.9,h*0.9],[w*0.1,h*0.9]].forEach(function(p) {
      ctx.beginPath(); ctx.arc(p[0],p[1],3.5,0,Math.PI*2); ctx.fill();
    });
  });

_spell('ex_libris', 'Ex Libris',
  'This belongs here. It cannot be taken.',
  0, 4, 0,
  function(state) {
    state.encStunned = true;
    state.log('Ex Libris: enemy stunned, skips their next attack.');
  },
  function(ctx, w, h) {
    ctx.fillStyle = '#1e2b38';
    ctx.fillRect(w*0.14, h*0.08, w*0.72, h*0.84);
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 1;
    ctx.strokeRect(w*0.14, h*0.08, w*0.72, h*0.84);
    ctx.fillStyle = '#d4b896';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.floor(h*0.14) + 'px serif';
    ctx.fillText('EX', w/2, h*0.36);
    ctx.fillText('LIBRIS', w/2, h*0.54);
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(w*0.22, h*0.67); ctx.lineTo(w*0.78, h*0.67); ctx.stroke();
  });

_spell('codex', 'Codex',
  'One source contains all sources.',
  3, 3, 0,
  function(state) {
    state.extraCastThisTurn += 1;
    state.log('Codex: you may cast one additional spell this turn.');
  },
  function(ctx, w, h) {
    var bw = w * 0.16, bh = h * 0.62;
    var colors = ['#2c1a0a','#3d2b1a','#1a100a','#2c200f'];
    for (var i = 0; i < 4; i++) {
      var bx = w * (0.1 + i * 0.21);
      ctx.fillStyle = colors[i];
      ctx.fillRect(bx, h*0.2, bw, bh);
      ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, h*0.2, bw, bh);
    }
  });

// ─── lookup helpers ──────────────────────────────────────────────────────────

var BASE_SPELL_IDS    = ['scrawl','warding_glyph','footnote','inkblot',
                         'redaction','dog_ear','palimpsest','marginalia_chain'];
var UNLOCK_SPELL_IDS  = ['overdue','errata','citation','illuminated','ex_libris','codex'];

function getSpellList(ids) {
  return ids.map(function(id) { return SPELLS[id]; }).filter(Boolean);
}
