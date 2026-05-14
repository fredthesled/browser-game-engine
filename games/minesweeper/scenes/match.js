// games/minesweeper/scenes/match.js
// MinesweeperMatchScene -- core gameplay for Minesweeper.
//
// State and rendering are scene-level (no GameObjects); the board is intrinsic-
// ally turn-based and discrete, matching the Party House pattern. Difficulty is
// passed in by the menu scene as { key, label, cols, rows, mines, cellSize }.
//
// Rules:
//   - First click is always safe and clears at least its 3x3 neighborhood (mines
//     are placed lazily on first click, excluding the clicked cell and its
//     immediate neighbors).
//   - Left click on an unrevealed unflagged cell reveals it; zero-neighbor cells
//     flood-fill iteratively.
//   - Right click toggles a flag (works pre-first-click for convenience).
//   - Left click on a revealed numbered cell whose adjacent flags equal its
//     number ("chord click") reveals all adjacent unflagged cells. Standard
//     Minesweeper convenience.
//   - Timer starts on first reveal, stops on game end, clamps display to 999s.
//   - Mine counter shows (total mines - flags placed), can read negative if the
//     player over-flags but is clamped to 0 in the LED display.
//   - On loss: triggered mine highlights red; all remaining mines reveal;
//     wrongly-flagged cells get a red X overlay.
//   - On win: remaining mines are auto-flagged for a clean final board, best
//     time is recorded to Engine.storage under 'best_<key>'.
//
// HUD: digital mine counter (left), smiley face (center, click to restart),
// digital timer (right). ESC opens PauseOverlay with RESUME / AUDIO / RESTART /
// QUIT TO MENU rows. The mouse-edge detection runs before the pause early-return
// per the convention noted in STATE.md, so clicks made while paused do not fire
// as phantom clicks on resume.
//
// Depends on: Engine.Scene, Engine.input, Engine.audio, Engine.storage,
//             PauseOverlay, MinesweeperMenuScene.

class MinesweeperMatchScene extends Engine.Scene {
  constructor(game, difficulty) {
    super();
    this._game       = game;
    this._difficulty = difficulty;
    this._cols       = difficulty.cols;
    this._rows       = difficulty.rows;
    this._mineCount  = difficulty.mines;
    this._cellSize   = difficulty.cellSize;

    const boardW = this._cols * this._cellSize;
    const boardH = this._rows * this._cellSize;
    this._boardW = boardW;
    this._boardH = boardH;
    this._boardX = Math.floor((this._game.canvas.width - boardW) / 2);
    this._boardY = 110;

    this._pause = new PauseOverlay(this._game, {
      onRestart: () => this._game.setScene(new MinesweeperMatchScene(this._game, this._difficulty)),
      onQuit:    () => this._game.setScene(new MinesweeperMenuScene(this._game)),
    });

    this._prevMouseLeft  = false;
    this._prevMouseRight = false;
    this._reset();
  }

  enter() {
    Engine.audio.register('mw-click', 'blipSelect');
    Engine.audio.register('mw-flag',  'pickupCoin');
    Engine.audio.register('mw-boom',  'explosion');
    Engine.audio.register('mw-win',   'powerUp');
  }

  // ------------------------------------------------------------------- state

  _reset() {
    this._mines        = new Set();
    this._revealed     = new Set();
    this._flagged      = new Set();
    this._minesPlaced  = false;
    this._over         = false;
    this._won          = false;
    this._explodedIdx  = -1;
    this._startTime    = 0;
    this._elapsed      = 0;
    this._neighborCache = null;
    this._newRecord    = false;
  }

  _idx(c, r) { return r * this._cols + c; }
  _ofIdx(i)  { return [i % this._cols, Math.floor(i / this._cols)]; }

  _placeMines(safeIdx) {
    const [sc, sr] = this._ofIdx(safeIdx);
    const safe = new Set([safeIdx]);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = sc + dc, r = sr + dr;
      if (c >= 0 && c < this._cols && r >= 0 && r < this._rows) safe.add(this._idx(c, r));
    }
    const total = this._cols * this._rows;
    const pool = [];
    for (let i = 0; i < total; i++) if (!safe.has(i)) pool.push(i);
    // Fisher-Yates shuffle, take first mineCount entries.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    const need = Math.min(this._mineCount, pool.length);
    for (let i = 0; i < need; i++) this._mines.add(pool[i]);
    this._minesPlaced = true;
    this._startTime = performance.now();

    // Precompute neighbor-mine counts for every cell. -1 marks a mine cell.
    this._neighborCache = new Int8Array(total);
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const idx = this._idx(c, r);
        if (this._mines.has(idx)) { this._neighborCache[idx] = -1; continue; }
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nc = c + dc, nr = r + dr;
          if (nc < 0 || nc >= this._cols || nr < 0 || nr >= this._rows) continue;
          if (this._mines.has(this._idx(nc, nr))) n++;
        }
        this._neighborCache[idx] = n;
      }
    }
  }

  _neighborMines(c, r) { return this._neighborCache[this._idx(c, r)]; }

  _reveal(c, r) {
    const startIdx = this._idx(c, r);
    if (this._revealed.has(startIdx) || this._flagged.has(startIdx)) return;
    if (this._mines.has(startIdx)) {
      this._revealed.add(startIdx);
      this._explodedIdx = startIdx;
      this._over = true;
      this._won = false;
      for (const m of this._mines) this._revealed.add(m);
      Engine.audio.play('mw-boom');
      return;
    }
    // Iterative flood-fill for zero-neighbor cells.
    const stack = [[c, r]];
    while (stack.length) {
      const [cc, cr] = stack.pop();
      const ii = this._idx(cc, cr);
      if (this._revealed.has(ii) || this._flagged.has(ii)) continue;
      if (this._mines.has(ii)) continue;
      this._revealed.add(ii);
      if (this._neighborMines(cc, cr) === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nc = cc + dc, nr = cr + dr;
          if (nc < 0 || nc >= this._cols || nr < 0 || nr >= this._rows) continue;
          stack.push([nc, nr]);
        }
      }
    }
    Engine.audio.play('mw-click');
    this._checkWin();
  }

  _checkWin() {
    if (this._over) return;
    const total = this._cols * this._rows;
    if (this._revealed.size === total - this._mineCount) {
      this._won = true;
      this._over = true;
      Engine.audio.play('mw-win');
      // Auto-flag remaining mines for a clean final board.
      for (const m of this._mines) this._flagged.add(m);
      // Persist best time per difficulty.
      const t = this._elapsed;
      const key = 'best_' + this._difficulty.key;
      const best = Engine.storage.load(key, null);
      if (best === null || t < best) {
        Engine.storage.save(key, +t.toFixed(3));
        this._newRecord = true;
      }
    }
  }

  _toggleFlag(c, r) {
    const i = this._idx(c, r);
    if (this._revealed.has(i)) return;
    if (this._flagged.has(i)) this._flagged.delete(i); else this._flagged.add(i);
    Engine.audio.play('mw-flag');
  }

  _chord(c, r) {
    // Reveal all unflagged neighbors of a revealed numbered cell whose flag
    // count around it matches its number. Standard Minesweeper convenience.
    const i = this._idx(c, r);
    if (!this._revealed.has(i)) return;
    const n = this._neighborMines(c, r);
    if (n <= 0) return;
    let flagsAround = 0;
    const targets = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= this._cols || nr < 0 || nr >= this._rows) continue;
      const ni = this._idx(nc, nr);
      if (this._flagged.has(ni))           flagsAround++;
      else if (!this._revealed.has(ni))    targets.push([nc, nr]);
    }
    if (flagsAround === n) {
      for (const [tc, tr] of targets) {
        this._reveal(tc, tr);
        if (this._over) return;
      }
    }
  }

  _cellAt(mx, my) {
    const c = Math.floor((mx - this._boardX) / this._cellSize);
    const r = Math.floor((my - this._boardY) / this._cellSize);
    if (c < 0 || c >= this._cols || r < 0 || r >= this._rows) return null;
    return [c, r];
  }

  _faceRect() {
    const W = this._game.canvas.width;
    const size = 44;
    return { x: W / 2 - size / 2, y: 36, w: size, h: size };
  }

  _pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  // ------------------------------------------------------------------- frame

  update(dt) {
    // Mouse edge detection BEFORE pause handling so paused clicks do not
    // phantom-fire on resume.
    const mouseClicked      = !this._prevMouseLeft  && Engine.input.mouse.left;
    const mouseRightClicked = !this._prevMouseRight && Engine.input.mouse.right;
    this._prevMouseLeft  = Engine.input.mouse.left;
    this._prevMouseRight = Engine.input.mouse.right;

    this._pause.update(dt);
    if (this._pause.isPaused()) return;

    if (Engine.input.wasJustPressed('r') || Engine.input.wasJustPressed('R')) {
      this._reset();
      return;
    }

    if (!this._over && this._minesPlaced) {
      this._elapsed = (performance.now() - this._startTime) / 1000;
    }

    const mx = Engine.input.mouse.x, my = Engine.input.mouse.y;

    // Face-button restart.
    if (mouseClicked && this._pointInRect(mx, my, this._faceRect())) {
      this._reset();
      return;
    }

    if (this._over) return;

    if (mouseClicked) {
      const cell = this._cellAt(mx, my);
      if (cell) {
        const [c, r] = cell;
        const i = this._idx(c, r);
        if (!this._minesPlaced) this._placeMines(i);
        if (this._flagged.has(i)) {
          // Flag protects -- no-op.
        } else if (this._revealed.has(i)) {
          this._chord(c, r);
        } else {
          this._reveal(c, r);
        }
      }
    }

    if (mouseRightClicked) {
      const cell = this._cellAt(mx, my);
      if (cell) {
        const [c, r] = cell;
        this._toggleFlag(c, r);
      }
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();

    // Background.
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, 0, W, H);

    // HUD bar with sunken frame.
    const hudY = 24, hudH = 60, hudPad = 24;
    this._drawSunken(ctx, hudPad, hudY, W - hudPad * 2, hudH);

    // Mine counter (left): mines minus flags placed, floored at 0.
    const minesLeft = Math.max(0, this._mineCount - this._flagged.size);
    this._drawDigitDisplay(ctx, hudPad + 16, hudY + 12, 3, minesLeft);

    // Timer (right): integer seconds capped at 999.
    const time = Math.min(999, Math.floor(this._elapsed));
    this._drawDigitDisplay(ctx, W - hudPad - 16 - 3 * 26, hudY + 12, 3, time);

    // Face button (center).
    this._drawFace(ctx);

    // Board frame.
    this._drawSunken(ctx, this._boardX - 4, this._boardY - 4, this._boardW + 8, this._boardH + 8);

    // Cells.
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        this._drawCell(ctx, c, r);
      }
    }

    // End-state banner below the board.
    if (this._over) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const bannerY = this._boardY + this._boardH + 28;
      ctx.fillStyle = this._won ? '#1b5e20' : '#b71c1c';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(this._won ? 'CLEARED' : 'BOOM', W / 2, bannerY);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '16px monospace';
      const detail = this._elapsed.toFixed(2) + 's' + (this._newRecord ? '   NEW RECORD' : '');
      ctx.fillText(detail, W / 2, bannerY + 26);
      ctx.fillStyle = '#444';
      ctx.font = '13px monospace';
      ctx.fillText('Click face or press R to play again', W / 2, bannerY + 46);
    }

    this._pause.draw(ctx);
    ctx.restore();
  }

  // ------------------------------------------------------------------ render

  _drawSunken(ctx, x, y, w, h) {
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#7b7b7b';
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);
  }

  _drawRaised(ctx, x, y, w, h) {
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = '#7b7b7b';
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x + w - 3, y, 3, h);
  }

  _drawDigitDisplay(ctx, x, y, count, value) {
    const dw = 24, dh = 36, gap = 2;
    const totalW = count * dw + (count - 1) * gap + 6;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, y - 3, totalW, dh + 6);
    const str = String(Math.max(0, value)).padStart(count, '0').slice(-count);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + (dh - 4) + 'px monospace';
    for (let i = 0; i < count; i++) {
      const cx = x + i * (dw + gap) + dw / 2;
      const cy = y + dh / 2;
      ctx.fillStyle = '#400000';
      ctx.fillText('8', cx, cy + 1);
      ctx.fillStyle = '#ff2a2a';
      ctx.fillText(str[i], cx, cy + 1);
    }
  }

  _drawFace(ctx) {
    const f = this._faceRect();
    this._drawRaised(ctx, f.x, f.y, f.w, f.h);
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    const r = f.w / 2 - 6;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.lineWidth = 1.5; ctx.strokeStyle = '#000'; ctx.fillStyle = '#000';
    if (this._over && !this._won) {
      // X eyes and frown.
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5); ctx.lineTo(cx - 2, cy - 1);
      ctx.moveTo(cx - 2, cy - 5); ctx.lineTo(cx - 6, cy - 1);
      ctx.moveTo(cx + 2, cy - 5); ctx.lineTo(cx + 6, cy - 1);
      ctx.moveTo(cx + 6, cy - 5); ctx.lineTo(cx + 2, cy - 1);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + 6, 4, Math.PI, 0); ctx.stroke();
    } else if (this._over && this._won) {
      // Sunglasses and grin.
      ctx.fillRect(cx - 9, cy - 5, 6, 4);
      ctx.fillRect(cx + 3, cy - 5, 6, 4);
      ctx.fillRect(cx - 9, cy - 6, 18, 2);
      ctx.beginPath(); ctx.arc(cx, cy + 4, 4, 0, Math.PI); ctx.fill();
    } else {
      // Eyes and smile.
      ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy + 3, 4, 0, Math.PI); ctx.stroke();
    }
  }

  _drawCell(ctx, c, r) {
    const i = this._idx(c, r);
    const x = this._boardX + c * this._cellSize;
    const y = this._boardY + r * this._cellSize;
    const s = this._cellSize;

    const revealed = this._revealed.has(i);
    const flagged  = this._flagged.has(i);
    const mine     = this._mines.has(i);

    if (revealed) {
      ctx.fillStyle = (mine && i === this._explodedIdx) ? '#ff4444' : '#c0c0c0';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = '#7b7b7b';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);

      if (mine) {
        this._drawMine(ctx, x, y, s);
      } else {
        const n = this._neighborMines(c, r);
        if (n > 0) this._drawNumber(ctx, x, y, s, n);
      }
    } else {
      this._drawRaised(ctx, x, y, s, s);
      if (flagged) {
        this._drawFlag(ctx, x, y, s);
        // On loss, wrongly-flagged cells get a red X overlay.
        if (this._over && !this._won && !mine) {
          ctx.strokeStyle = '#c62828'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);     ctx.lineTo(x + s - 4, y + s - 4);
          ctx.moveTo(x + s - 4, y + 4); ctx.lineTo(x + 4, y + s - 4);
          ctx.stroke();
        }
      }
    }
  }

  _drawNumber(ctx, x, y, s, n) {
    const colors = [null, '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
    ctx.fillStyle = colors[n] || '#000';
    ctx.font = 'bold ' + Math.floor(s * 0.7) + 'px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), x + s / 2, y + s / 2 + 1);
  }

  _drawMine(ctx, x, y, s) {
    const cx = x + s / 2, cy = y + s / 2;
    const r = s * 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(1, s * 0.06);
    const sp = r * 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - sp, cy);                ctx.lineTo(cx + sp, cy);
    ctx.moveTo(cx, cy - sp);                ctx.lineTo(cx, cy + sp);
    ctx.moveTo(cx - sp * 0.7, cy - sp * 0.7); ctx.lineTo(cx + sp * 0.7, cy + sp * 0.7);
    ctx.moveTo(cx + sp * 0.7, cy - sp * 0.7); ctx.lineTo(cx - sp * 0.7, cy + sp * 0.7);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }

  _drawFlag(ctx, x, y, s) {
    const px = x + s * 0.5;
    ctx.fillStyle = '#000';
    ctx.fillRect(px - 1, y + s * 0.28, 2, s * 0.5);
    ctx.fillRect(x + s * 0.25, y + s * 0.78, s * 0.5, 3);
    ctx.fillRect(x + s * 0.32, y + s * 0.72, s * 0.36, 3);
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(px - 1, y + s * 0.28);
    ctx.lineTo(x + s * 0.22, y + s * 0.45);
    ctx.lineTo(px - 1, y + s * 0.58);
    ctx.closePath(); ctx.fill();
  }
}
