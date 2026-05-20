// ============================================================================
// games/drift/scenes/menu.js
// ============================================================================
//
// DriftMenuScene — Title screen for Drift.
//
// Renders a static star field, title, flavor text, and a begin button.
// Transitions to DriftMatchScene on click.
//
// Depends on: Engine.Scene, Engine.audio, Engine.input
// Registered in: scenes/_registry.md
//
// ============================================================================

class DriftMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game      = game;
    this._btnRect   = null;
    this._prevLeft  = false;
    this._prevHover = false;
    this._stars     = [];
  }

  enter() {
    Engine.audio.register('blip',    'blipSelect');
    Engine.audio.register('confirm', 'powerUp');

    // Static star field generated once at scene entry.
    const W = this._game.canvas.width;
    const H = this._game.canvas.height;
    this._stars = [];
    for (let i = 0; i < 140; i++) {
      this._stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() < 0.12 ? 1.5 : 0.8,
        a: 0.25 + Math.random() * 0.75,
      });
    }
  }

  exit() {}

  update(dt) {
    super.update(dt);
    const m  = Engine.input.mouse;
    const br = this._btnRect;
    if (!br) return;

    const hover = m.x >= br.x && m.x <= br.x + br.w &&
                  m.y >= br.y && m.y <= br.y + br.h;

    if (hover && !this._prevHover) Engine.audio.play('blip');
    this._prevHover = hover;

    if (hover && m.left && !this._prevLeft) {
      Engine.audio.play('confirm');
      this._game.setScene(new DriftMatchScene(this._game));
    }
    this._prevLeft = m.left;
  }

  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of this._stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle   = '#c8d0ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title
    const titleSize = Math.max(48, Math.floor(H * 0.14));
    ctx.fillStyle    = '#d0d8ff';
    ctx.font         = `bold ${titleSize}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DRIFT', W / 2, H * 0.30);

    // Subtitle
    const subSize = Math.max(12, Math.floor(H * 0.034));
    ctx.fillStyle = '#505075';
    ctx.font      = `${subSize}px monospace`;
    ctx.fillText('survive the crossing', W / 2, H * 0.43);

    // Begin button
    const bw = Math.max(160, Math.floor(W * 0.22));
    const bh = Math.max(36,  Math.floor(H * 0.07));
    const bx = Math.floor(W / 2 - bw / 2);
    const by = Math.floor(H * 0.56);
    this._btnRect = { x: bx, y: by, w: bw, h: bh };

    const hover = Engine.input.mouse.x >= bx && Engine.input.mouse.x <= bx + bw &&
                  Engine.input.mouse.y >= by && Engine.input.mouse.y <= by + bh;

    ctx.fillStyle   = hover ? '#282870' : '#141440';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = hover ? '#8080d0' : '#383870';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    const btnSize = Math.max(12, Math.floor(H * 0.036));
    ctx.fillStyle    = hover ? '#e0e8ff' : '#8888b8';
    ctx.font         = `${btnSize}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BEGIN CROSSING', W / 2, by + bh / 2);

    // Mission summary
    const noteSize = Math.max(10, Math.floor(H * 0.026));
    ctx.fillStyle = '#2a2a42';
    ctx.font      = `${noteSize}px monospace`;
    ctx.fillText('five sectors  ·  four crew  ·  ten hull', W / 2, H * 0.77);

    super.draw(ctx);
  }
}
