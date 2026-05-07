// games/clown-brawler/scenes/clown-menu.js
// Title screen for Clown Brawler.
// Press Enter or Space to start.
//
// Depends on: Engine.Scene, Engine.input, ClownMatchScene
// Used by: Bootstrap, ClownMatchScene (quit path)

class ClownMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game        = game;
    this._fadeIn      = 1.0;
    this._pendingOut  = null;
    this._fadeTimer   = 0;
    this._blinkTimer  = 0;
    this._showPrompt  = true;
    // Decorative balloon animation state.
    this._balloons    = this._makeBalloons();
  }

  _makeBalloons() {
    const colors = ['#ff1744', '#2979ff', '#ffea00', '#69f0ae', '#ff6d00', '#e040fb'];
    return Array.from({ length: 8 }, (_, i) => ({
      x:     80 + i * 90 + Math.random() * 40,
      y:     480 + Math.random() * 60,
      vy:    -(35 + Math.random() * 25),
      vx:    (Math.random() - 0.5) * 18,
      color: colors[i % colors.length],
      r:     12 + Math.random() * 5,
    }));
  }

  enter() {
    this._fadeIn     = 1.0;
    this._pendingOut = null;
    this._fadeTimer  = 0;
  }

  update(dt) {
    if (this._fadeIn > 0) this._fadeIn = Math.max(0, this._fadeIn - 2.5 * dt);

    if (this._pendingOut) {
      this._fadeTimer += dt;
      if (this._fadeTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }

    this._blinkTimer += dt;
    if (this._blinkTimer >= 0.55) { this._blinkTimer = 0; this._showPrompt = !this._showPrompt; }

    // Animate decorative balloons; loop them back when they exit the top.
    for (const b of this._balloons) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -60) { b.y = 520; b.x = 40 + Math.random() * 720; }
    }

    if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
      this._pendingOut = new ClownMatchScene(this._game);
      this._fadeTimer  = 0;
    }
  }

  draw(ctx) {
    const W = 800, H = 500;

    // Deep purple circus background.
    ctx.fillStyle = '#12002f';
    ctx.fillRect(0, 0, W, H);

    // Tent-stripe wedges radiating from the top center.
    const stripeColors = ['#1a0040', '#200050'];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = stripeColors[i % 2];
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      const a1 = (i / 12) * Math.PI * 2;
      const a2 = ((i + 1) / 12) * Math.PI * 2;
      ctx.arc(W / 2, 0, W, a1, a2);
      ctx.closePath();
      ctx.fill();
    }

    // Decorative floating balloons.
    for (const b of this._balloons) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle   = b.color;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.r * 1.2);
      ctx.lineTo(b.x + 4, b.y + b.r * 1.2 + 20);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Title: two stacked lines.
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Shadow pass.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 78px monospace';
    ctx.fillText('CLOWN',   W / 2 + 4, 152);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('BRAWLER', W / 2 + 4, 242);

    // Main title.
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 78px monospace';
    ctx.fillText('CLOWN',   W / 2, 148);
    ctx.fillStyle = '#ff1744';
    ctx.fillText('BRAWLER', W / 2, 238);

    // Subtitle.
    ctx.fillStyle = '#ce93d8';
    ctx.font = '20px monospace';
    ctx.fillText('vs. The Gorilla Gang', W / 2, 296);

    // Blink prompt.
    if (this._showPrompt) {
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.fillText('PRESS ENTER or SPACE', W / 2, 374);
    }

    // Control reminder.
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('WASD / Arrows: Move   Space / Z: Punch   ESC: Pause', W / 2, 448);

    // Fade overlays.
    if (this._fadeIn > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._fadeIn})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this._pendingOut) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this._fadeTimer / 0.35)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
