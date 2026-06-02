// games/marginalia/scenes/game-over.js
// LibraryGameOverScene: win or loss screen for Marginalia.
// Depends on: Engine, LibraryMenuScene.
// Receives: { outcome: 'win'|'loss', roomsCleared, hpRemaining, turnsTotal }

class LibraryGameOverScene extends Engine.Scene {
  constructor(game, result) {
    super();
    this._game = game;
    this._result = result; // { outcome, roomsCleared, hpRemaining, turnsTotal }
    this._t = 0;
    this._hovered = false;
    this._clicked = false;
  }

  enter() {
    this._t = 0;
    this._clicked = false;
  }

  update(dt) {
    this._t += dt;
    if (this._clicked) return;

    var mx = Engine.input.mouse.x, my = Engine.input.mouse.y;
    var btn = this._buttonRect();
    this._hovered = mx >= btn.x && mx <= btn.x+btn.w &&
                    my >= btn.y && my <= btn.y+btn.h;

    if ((this._hovered && Engine.input.mouse.left) ||
        Engine.input.wasJustPressed('Enter') ||
        Engine.input.wasJustPressed(' ')) {
      this._clicked = true;
      var game = this._game;
      setTimeout(function() {
        game.setScene(new LibraryMenuScene(game));
      }, 120);
    }
  }

  _buttonRect() {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    var bw = Math.min(200, W * 0.4), bh = 40;
    return { x: W/2 - bw/2, y: H * 0.76, w: bw, h: bh };
  }

  draw(ctx) {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    var r = this._result;
    var won = r.outcome === 'win';

    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, W, H);

    // Outcome heading
    var headSize = Math.min(56, W * 0.09);
    ctx.font = 'italic ' + headSize + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = won ? '#f39c12' : '#c0392b';
    ctx.fillText(won ? 'Cataloged.' : 'Overdue.', W/2, H * 0.26);

    // Rule
    var ruleW = Math.min(260, W * 0.48);
    ctx.strokeStyle = won ? '#8a6f4e' : '#5a1a1a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W/2-ruleW/2, H*0.36); ctx.lineTo(W/2+ruleW/2, H*0.36); ctx.stroke();

    // Flavor line
    var flavors = won
      ? ['The Grand Index has been filed.','The margins are silent at last.','Everything accounted for.']
      : ['Some books are never returned.','The catalog grows longer.','Filed under: unfinished business.'];
    ctx.font = Math.min(14, W*0.024) + 'px serif';
    ctx.fillStyle = '#8a6f4e';
    ctx.fillText(flavors[Math.floor(this._t * 0.1) % flavors.length], W/2, H * 0.42);

    // Stats
    var statsSize = Math.min(13, W * 0.022);
    ctx.font = statsSize + 'px serif';
    ctx.fillStyle = '#5a4030';
    var lines = [
      'Rooms cleared: ' + r.roomsCleared + ' / 6',
      'HP remaining: ' + r.hpRemaining,
      'Turns taken: ' + r.turnsTotal
    ];
    lines.forEach(function(line, i) {
      ctx.fillText(line, W/2, H * (0.52 + i * 0.07));
    });

    // Return button
    var btn = this._buttonRect();
    var lit = this._hovered || this._clicked;
    ctx.fillStyle = lit ? '#2c1a0a' : '#1e1208';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = lit ? '#d4b896' : '#8a6f4e'; ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.font = Math.min(15, W*0.025) + 'px serif';
    ctx.fillStyle = lit ? '#d4b896' : '#8a6f4e';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Return to the foyer', btn.x + btn.w/2, btn.y + btn.h/2);
  }
}
