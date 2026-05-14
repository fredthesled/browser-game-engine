// games/minesweeper/scenes/menu.js
// MinesweeperMenuScene -- title screen and difficulty selection for Minesweeper.
//
// Three difficulties: Beginner (9x9 / 10), Intermediate (16x16 / 40),
// Expert (30x16 / 99). Each shows its best cleared time when one is stored.
//
// Selection: Up/Down or 1/2/3 keys, mouse hover, Enter/Space/click to start.
// Audio is registered here so it is available before the match scene first runs.
//
// Depends on: Engine.Scene, Engine.input, Engine.audio, Engine.storage,
//             MinesweeperMatchScene (forward ref; resolved at runtime).
// Used by:    bootstrap, MinesweeperMatchScene (quit returns here).

const MINESWEEPER_DIFFICULTIES = [
  { key: 'beginner',     label: 'BEGINNER',     cols:  9, rows:  9, mines: 10, cellSize: 36 },
  { key: 'intermediate', label: 'INTERMEDIATE', cols: 16, rows: 16, mines: 40, cellSize: 28 },
  { key: 'expert',       label: 'EXPERT',       cols: 30, rows: 16, mines: 99, cellSize: 24 },
];

class MinesweeperMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
    this._cursor = 1; // intermediate by default
    this._prevMouseLeft = false;
  }

  enter() {
    Engine.audio.register('mw-click',  'blipSelect');
    Engine.audio.register('mw-flag',   'pickupCoin');
    Engine.audio.register('mw-boom',   'explosion');
    Engine.audio.register('mw-win',    'powerUp');
    Engine.audio.register('mw-select', 'blipSelect');
  }

  update(dt) {
    const mouseClicked = !this._prevMouseLeft && Engine.input.mouse.left;
    this._prevMouseLeft = Engine.input.mouse.left;

    const n = MINESWEEPER_DIFFICULTIES.length;
    if (Engine.input.wasJustPressed('ArrowUp'))   { this._cursor = (this._cursor - 1 + n) % n; Engine.audio.play('mw-select'); }
    if (Engine.input.wasJustPressed('ArrowDown')) { this._cursor = (this._cursor + 1) % n;     Engine.audio.play('mw-select'); }
    if (Engine.input.wasJustPressed('1')) this._cursor = 0;
    if (Engine.input.wasJustPressed('2')) this._cursor = 1;
    if (Engine.input.wasJustPressed('3')) this._cursor = 2;

    // Mouse hover updates cursor.
    const W = this._game.canvas.width;
    const optTop = 280, optStep = 70;
    for (let i = 0; i < n; i++) {
      const oy = optTop + i * optStep;
      if (Engine.input.mouse.x >= W / 2 - 260 && Engine.input.mouse.x <= W / 2 + 260 &&
          Engine.input.mouse.y >= oy - 24      && Engine.input.mouse.y <= oy + 24) {
        if (this._cursor !== i) { this._cursor = i; Engine.audio.play('mw-select'); }
      }
    }

    const startKey = Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ');
    if (startKey || mouseClicked) {
      const diff = MINESWEEPER_DIFFICULTIES[this._cursor];
      Engine.audio.play('mw-click');
      this._game.setScene(new MinesweeperMatchScene(this._game, diff));
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();

    // Classic Windows 3.1 gray background.
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, 0, W, H);

    // Title and subtitle.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('MINESWEEPER', W / 2, 110);
    ctx.fillStyle = '#555';
    ctx.font = '16px monospace';
    ctx.fillText('Select difficulty', W / 2, 170);

    // Mine glyph + flag glyph decoration row.
    this._drawMineGlyph(ctx, W / 2 - 60, 210, 24);
    this._drawFlagGlyph(ctx, W / 2 + 60, 210, 24);

    // Difficulty rows.
    const optTop = 280, optStep = 70;
    for (let i = 0; i < MINESWEEPER_DIFFICULTIES.length; i++) {
      const d = MINESWEEPER_DIFFICULTIES[i];
      const oy = optTop + i * optStep;
      const sel = i === this._cursor;
      if (sel) {
        ctx.fillStyle = '#e8e0a8';
        ctx.fillRect(W / 2 - 260, oy - 24, 520, 48);
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
        ctx.strokeRect(W / 2 - 260, oy - 24, 520, 48);
      }
      ctx.fillStyle = sel ? '#1a1a1a' : '#2c2c2c';
      ctx.font = sel ? 'bold 22px monospace' : '20px monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText((i + 1) + '. ' + d.label, W / 2 - 240, oy);
      ctx.textAlign = 'right';
      ctx.font = '18px monospace';
      ctx.fillText(d.cols + 'x' + d.rows + '  ' + d.mines + ' mines', W / 2 - 30, oy);

      // Best time per difficulty (null when no record yet).
      const best = Engine.storage.load('best_' + d.key, null);
      ctx.textAlign = 'right';
      ctx.font = '16px monospace';
      ctx.fillStyle = best ? '#1b5e20' : '#888';
      ctx.fillText(best ? ('BEST ' + best.toFixed(2) + 's') : 'no record', W / 2 + 240, oy);
    }

    // Controls strip.
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '14px monospace';
    ctx.fillText('UP/DOWN or 1-3 to select   ENTER/SPACE/CLICK to play', W / 2, H - 80);
    ctx.fillText('In game: LEFT click reveal   RIGHT click flag   R restart   ESC pause', W / 2, H - 56);

    ctx.restore();
  }

  _drawMineGlyph(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    const sp = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - sp, cy);      ctx.lineTo(cx + sp, cy);
    ctx.moveTo(cx, cy - sp);      ctx.lineTo(cx, cy + sp);
    ctx.moveTo(cx - sp * 0.7, cy - sp * 0.7); ctx.lineTo(cx + sp * 0.7, cy + sp * 0.7);
    ctx.moveTo(cx + sp * 0.7, cy - sp * 0.7); ctx.lineTo(cx - sp * 0.7, cy + sp * 0.7);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - size * 0.1, cy - size * 0.1, size * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawFlagGlyph(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - 1, cy - size * 0.4, 2, size * 0.8);
    ctx.fillRect(cx - size * 0.32, cy + size * 0.35, size * 0.64, 4);
    ctx.fillRect(cx - size * 0.22, cy + size * 0.27, size * 0.44, 4);
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.45, cy - size * 0.18);
    ctx.lineTo(cx, cy + size * 0.04);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
