// games/factory/scenes/menu.js
// FactoryMenuScene -- title card, goal preview, and start.
//
// Displays the game title, a one-line description of the first goal,
// and a START prompt. No settings; the game is self-contained.
//
// Depends on: Engine.Scene, Engine.input, FactoryGameScene.

class FactoryMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
    this._prevMouseLeft = false;
    this._hoverStart = false;
  }

  update(dt) {
    const mouseClicked = !this._prevMouseLeft && Engine.input.mouse.left;
    this._prevMouseLeft = Engine.input.mouse.left;

    const W = this._game.canvas.width;
    const H = this._game.canvas.height;
    const btn = this._startRect(W, H);
    const mx = Engine.input.mouse.x;
    const my = Engine.input.mouse.y;
    this._hoverStart = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;

    if (mouseClicked && this._hoverStart) {
      this._game.setScene(new FactoryGameScene(this._game));
    }

    if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
      this._game.setScene(new FactoryGameScene(this._game));
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Title.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('FACTORY', W / 2, H / 2 - 100);

    // Tagline.
    ctx.font = '18px monospace';
    ctx.fillStyle = '#9090a0';
    ctx.fillText('Extract. Process. Deliver.', W / 2, H / 2 - 50);

    // Building legend.
    const legend = [
      { color: '#78909c', label: 'Extractor  — pulls resources from the ground' },
      { color: '#ffa726', label: 'Belt       — carries items in a direction' },
      { color: '#ab47bc', label: 'Painter    — dyes items to the target color' },
      { color: '#42a5f5', label: 'Splitter   — alternates output between two exits' },
      { color: '#66bb6a', label: 'Hub        — receives completed deliveries' },
    ];
    const legendY = H / 2 - 10;
    ctx.font = '14px monospace';
    for (let i = 0; i < legend.length; i++) {
      const y = legendY + i * 22;
      ctx.fillStyle = legend[i].color;
      ctx.fillRect(W / 2 - 230, y - 7, 12, 12);
      ctx.fillStyle = '#c0c0c0';
      ctx.textAlign = 'left';
      ctx.fillText(legend[i].label, W / 2 - 212, y);
    }
    ctx.textAlign = 'center';

    // Start button.
    const btn = this._startRect(W, H);
    ctx.fillStyle = this._hoverStart ? '#4caf50' : '#2e7d32';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('START', W / 2, btn.y + btn.h / 2);

    ctx.fillStyle = '#555';
    ctx.font = '13px monospace';
    ctx.fillText('WASD or middle-drag to pan   R to rotate selected building   ESC to clear selection', W / 2, H - 20);
  }

  _startRect(W, H) {
    return { x: W / 2 - 80, y: H / 2 + 130, w: 160, h: 44 };
  }
}
