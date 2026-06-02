// games/marginalia/scenes/deck-select.js
// LibraryDeckSelectScene: pre-run spell selection.
// Player picks exactly 5 spells from their unlocked collection, then begins.
// Depends on: Engine, SPELLS, BASE_SPELL_IDS, UNLOCK_SPELL_IDS, LibraryMatchScene.

class LibraryDeckSelectScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
    this._t = 0;
    this._selected = new Set();
    this._hoverIdx = -1;
    this._hoverBegin = false;
    this._clickedBegin = false;

    // Build the available pool: base spells + any unlocked extras
    var unlocks = Engine.storage.load('marginalia_unlocks', []);
    this._pool = BASE_SPELL_IDS.concat(
      UNLOCK_SPELL_IDS.filter(function(id) { return unlocks.indexOf(id) !== -1; })
    ).map(function(id) { return SPELLS[id]; }).filter(Boolean);

    // Pre-select the first 5 for convenience
    this._pool.slice(0, 5).forEach(function(s) { this._selected.add(s.id); }, this);
  }

  enter() {
    this._t = 0;
    this._clickedBegin = false;
  }

  update(dt) {
    this._t += dt;
    if (this._clickedBegin) return;

    var mx = Engine.input.mouse.x, my = Engine.input.mouse.y;
    var cards = this._cardRects();

    this._hoverIdx = -1;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (mx >= c.x && mx <= c.x+c.w && my >= c.y && my <= c.y+c.h) {
        this._hoverIdx = i;
        break;
      }
    }

    // Toggle card on click
    if (Engine.input.mouse.left && this._hoverIdx !== -1) {
      // Debounce: only toggle on fresh press via wasJustPressed is tricky for mouse.
      // We track per-card click state instead via a flag.
    }

    var btn = this._beginRect();
    this._hoverBegin = mx >= btn.x && mx <= btn.x+btn.w && my >= btn.y && my <= btn.y+btn.h;

    if (Engine.input.wasJustPressed('MouseLeft') || this._mouseJustClicked()) {
      // handled below
    }
  }

  // Track mouse click with a simple latch
  _prevMouseLeft = false;
  _mouseJustClicked() {
    var cur = Engine.input.mouse.left;
    var just = cur && !this._prevMouseLeft;
    this._prevMouseLeft = cur;
    return just;
  }

  // Separate update with click logic; called from draw-cycle workaround
  _processClick() {
    var mx = Engine.input.mouse.x, my = Engine.input.mouse.y;
    var cards = this._cardRects();

    // Card toggle
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (mx >= c.x && mx <= c.x+c.w && my >= c.y && my <= c.y+c.h) {
        var id = this._pool[i].id;
        if (this._selected.has(id)) {
          this._selected.delete(id);
        } else if (this._selected.size < 5) {
          this._selected.add(id);
        }
        return;
      }
    }

    // Begin button
    if (this._selected.size === 5 && !this._clickedBegin) {
      var btn = this._beginRect();
      if (mx >= btn.x && mx <= btn.x+btn.w && my >= btn.y && my <= btn.y+btn.h) {
        this._clickedBegin = true;
        var deck = BASE_SPELL_IDS.concat(UNLOCK_SPELL_IDS)
          .filter(function(id) { return this._selected.has(id); }, this)
          .map(function(id) { return SPELLS[id]; });
        var game = this._game;
        setTimeout(function() {
          game.setScene(new LibraryMatchScene(game, deck));
        }, 100);
      }
    }
  }

  enter() {
    this._t = 0;
    this._clickedBegin = false;
    this._prevMouseLeft = false;
  }

  _cardRects() {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    var cols = Math.min(4, this._pool.length), rows = Math.ceil(this._pool.length / cols);
    var cw = Math.min(145, (W - 40) / cols), ch = Math.min(100, (H * 0.55) / rows);
    var totalW = cols * cw + (cols-1)*8, totalH = rows * ch + (rows-1)*8;
    var ox = W/2 - totalW/2, oy = H * 0.28 - totalH/2;
    var rects = [];
    for (var i = 0; i < this._pool.length; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      rects.push({ x: ox + col*(cw+8), y: oy + row*(ch+8), w: cw, h: ch });
    }
    return rects;
  }

  _beginRect() {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    var bw = Math.min(200, W*0.38), bh = 42;
    return { x: W/2 - bw/2, y: H * 0.85, w: bw, h: bh };
  }

  draw(ctx) {
    // Process clicks here to avoid the one-frame ghost-click issue
    if (this._mouseJustClicked()) this._processClick();

    var W = this._game.canvas.width, H = this._game.canvas.height;

    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, W, H);

    // Heading
    ctx.font = 'italic ' + Math.min(22, W*0.036) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4b896';
    ctx.fillText('Choose five spells for this run', W/2, H * 0.1);

    ctx.font = Math.min(12, W*0.02) + 'px serif';
    ctx.fillStyle = '#5a4030';
    ctx.fillText(this._selected.size + ' / 5 selected', W/2, H * 0.17);

    // Spell cards
    var cards = this._cardRects();
    var pool = this._pool;
    var selected = this._selected;
    var hoverIdx = this._hoverIdx;
    var t = this._t;

    for (var i = 0; i < pool.length; i++) {
      var spell = pool[i];
      var card = cards[i];
      var isSel = selected.has(spell.id);
      var isHov = i === hoverIdx;

      // Card background
      ctx.fillStyle = isSel ? '#2c1a0a' : (isHov ? '#201408' : '#160d05');
      ctx.fillRect(card.x, card.y, card.w, card.h);
      ctx.strokeStyle = isSel ? '#d4b896' : (isHov ? '#8a6f4e' : '#3a2518');
      ctx.lineWidth = isSel ? 1.5 : 1;
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      // Glyph area
      var glyphSize = Math.min(32, card.w * 0.22);
      var glyphX = card.x + 8, glyphY = card.y + 10;
      ctx.save();
      ctx.beginPath();
      ctx.rect(glyphX, glyphY, glyphSize, glyphSize);
      ctx.clip();
      ctx.translate(glyphX, glyphY);
      spell.glyphFn(ctx, glyphSize, glyphSize);
      ctx.restore();

      // Name
      ctx.font = 'bold ' + Math.min(11, card.w*0.08) + 'px serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = isSel ? '#d4b896' : '#8a6f4e';
      ctx.fillText(spell.name, glyphX + glyphSize + 6, card.y + 10);

      // DMG / DEF
      ctx.font = Math.min(10, card.w*0.072) + 'px serif';
      ctx.fillStyle = '#c0392b';
      ctx.fillText(spell.dmg + ' dmg', glyphX + glyphSize + 6, card.y + 24);
      ctx.fillStyle = '#2980b9';
      ctx.fillText(spell.def + ' def', glyphX + glyphSize + 6, card.y + 36);

      // Cooldown indicator
      if (spell.cooldown > 0) {
        ctx.fillStyle = '#8a6f4e';
        ctx.font = Math.min(9, card.w*0.065) + 'px serif';
        ctx.fillText('cd: ' + spell.cooldown, glyphX + glyphSize + 6, card.y + 48);
      }

      // Desc (truncated)
      ctx.font = Math.min(9, card.w*0.065) + 'px serif';
      ctx.fillStyle = '#3a2518';
      ctx.textBaseline = 'bottom';
      var desc = spell.desc;
      if (desc.length > 32) desc = desc.slice(0, 30) + '...';
      ctx.fillText(desc, card.x + 6, card.y + card.h - 6);

      // Selected checkmark
      if (isSel) {
        ctx.fillStyle = '#27ae60';
        ctx.font = Math.min(12, card.h*0.13) + 'px sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText('✓', card.x + card.w - 6, card.y + 6);
      }
    }

    // Begin button
    var canBegin = this._selected.size === 5;
    var btn = this._beginRect();
    var btnLit = this._hoverBegin && canBegin;
    ctx.fillStyle = canBegin ? (btnLit ? '#2c1a0a' : '#1e1208') : '#110c05';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = canBegin ? (btnLit ? '#d4b896' : '#8a6f4e') : '#2a1a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.font = Math.min(15, W*0.025) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = canBegin ? (btnLit ? '#d4b896' : '#8a6f4e') : '#3a2518';
    ctx.fillText('Enter the stacks', btn.x + btn.w/2, btn.y + btn.h/2);

    // Hint
    ctx.font = Math.min(11, W*0.018) + 'px serif';
    ctx.fillStyle = '#2a1a0a';
    ctx.fillText('Click a spell to select or deselect', W/2, H * 0.93);
  }
}
