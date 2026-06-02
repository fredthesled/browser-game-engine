// games/marginalia/scenes/menu.js
// LibraryMenuScene: title screen for Marginalia.
// Depends on: Engine (Game, Scene, Input), bootstrapGame result.
// Required by: build manifest.

class LibraryMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
    this._t = 0;
    this._hovered = false;
    this._clicked = false;
    this._particles = [];
    this._initParticles();
  }

  _initParticles() {
    var canvas = this._game.canvas;
    for (var i = 0; i < 28; i++) {
      this._particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 1.5,
        speed: 0.08 + Math.random() * 0.18,
        alpha: 0.2 + Math.random() * 0.5
      });
    }
  }

  enter() {
    this._t = 0;
    this._clicked = false;
  }

  update(dt) {
    this._t += dt;
    var canvas = this._game.canvas;
    // drift particles upward, wrap
    this._particles.forEach(function(p) {
      p.y -= p.speed;
      if (p.y < -4) p.y = canvas.height + 4;
    });
    // mouse hover detection for the begin button
    var mx = Engine.input.mouse.x, my = Engine.input.mouse.y;
    var btn = this._buttonRect();
    this._hovered = mx >= btn.x && mx <= btn.x+btn.w &&
                    my >= btn.y && my <= btn.y+btn.h;

    if (this._clicked) return;
    if ((this._hovered && Engine.input.mouse.left) ||
        Engine.input.wasJustPressed('Enter') ||
        Engine.input.wasJustPressed(' ')) {
      this._clicked = true;
      var game = this._game;
      setTimeout(function() {
        game.setScene(new LibraryDeckSelectScene(game));
      }, 120);
    }
  }

  _buttonRect() {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    var bw = Math.min(220, W * 0.42), bh = 44;
    return { x: W/2 - bw/2, y: H * 0.72, w: bw, h: bh };
  }

  draw(ctx) {
    var W = this._game.canvas.width, H = this._game.canvas.height;
    var t = this._t;

    // Background
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, W, H);

    // Floating dust motes
    this._particles.forEach(function(p) {
      ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(t * 0.7 + p.x));
      ctx.fillStyle = '#d4b896';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Title
    var titleSize = Math.min(62, W * 0.1);
    ctx.font = 'italic ' + titleSize + 'px serif';
    ctx.fillStyle = '#d4b896';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Marginalia', W/2, H * 0.3);

    // Subtitle rule lines
    var ruleW = Math.min(280, W * 0.5);
    ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W/2 - ruleW/2, H*0.38); ctx.lineTo(W/2 + ruleW/2, H*0.38); ctx.stroke();

    // Tagline
    ctx.font = Math.min(15, W*0.025) + 'px serif';
    ctx.fillStyle = '#8a6f4e';
    ctx.fillText('The library is condemned. Something is still cataloging.', W/2, H*0.44);

    // Stats line
    var unlocks = Engine.storage.load('marginalia_unlocks', []);
    ctx.font = Math.min(13, W*0.022) + 'px serif';
    ctx.fillStyle = '#5a4030';
    ctx.fillText(unlocks.length + ' / ' + UNLOCK_SPELL_IDS.length + ' spells discovered', W/2, H*0.52);

    // Begin button
    var btn = this._buttonRect();
    var lit = this._hovered || this._clicked;
    ctx.fillStyle = lit ? '#2c1a0a' : '#1e1208';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = lit ? '#d4b896' : '#8a6f4e'; ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = lit ? '#d4b896' : '#8a6f4e';
    ctx.font = Math.min(16, W*0.027) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Begin cataloging', btn.x + btn.w/2, btn.y + btn.h/2);

    // Key hint
    ctx.fillStyle = '#3a2518';
    ctx.font = Math.min(11, W*0.018) + 'px serif';
    ctx.fillText('Enter or Space to start', W/2, H * 0.82);
  }
}
