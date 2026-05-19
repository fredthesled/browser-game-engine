// games/minesweeper/scenes/menu.js
// MinesweeperMenuScene -- difficulty selection screen.
//
// First concrete application of the visual language tokens per ADR-0017.
// Design tokens are defined inline (a future commit will extract them to
// scripts/ui-tokens.js once a second game uses the same vocabulary). The
// menu presents three preview cards in a row, each showing a mini board
// render at the correct aspect ratio, with a LED-style best-time readout
// at the bottom of the card. Raised bevel for unselected cards, sunken
// bevel for the currently selected card, matching the Win 3.1 vocabulary
// already used in-game for cells.
//
// Input: Up/Down/Left/Right arrows or 1/2/3 to select, ENTER to confirm,
// mouse hover highlights the card under the cursor and click confirms.
//
// Depends on: Engine.Scene, Engine.input, Engine.audio, Engine.storage,
//             MinesweeperMatchScene.

const MS_TOKENS = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  type: { small: 14, body: 18, label: 22, heading: 36, hero: 60 },
  hit: { mouseMin: 32, touchMin: 48 },
  colors: {
    bg:             '#c0c0c0',
    surface:        '#c0c0c0',
    surfacePressed: '#a8a8a8',
    bevelLight:     '#ffffff',
    bevelDark:      '#808080',
    bevelDarker:    '#404040',
    textPrimary:    '#000000',
    textSecondary:  '#404040',
    accent:         '#e0001a',
    danger:         '#cc0000',
    success:        '#008000'
  },
  fontFamily: '"Courier New", "Lucida Console", monospace'
};

function msDrawRaised(ctx, x, y, w, h, depth) {
  if (typeof depth !== 'number') depth = 3;
  ctx.fillStyle = MS_TOKENS.colors.surface;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = MS_TOKENS.colors.bevelLight;
  ctx.fillRect(x, y, w, depth);
  ctx.fillRect(x, y, depth, h);
  ctx.fillStyle = MS_TOKENS.colors.bevelDark;
  ctx.fillRect(x, y + h - depth, w, depth);
  ctx.fillRect(x + w - depth, y, depth, h);
}

function msDrawSunken(ctx, x, y, w, h, depth) {
  if (typeof depth !== 'number') depth = 2;
  ctx.fillStyle = MS_TOKENS.colors.surfacePressed;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = MS_TOKENS.colors.bevelDark;
  ctx.fillRect(x, y, w, depth);
  ctx.fillRect(x, y, depth, h);
  ctx.fillStyle = MS_TOKENS.colors.bevelLight;
  ctx.fillRect(x, y + h - depth, w, depth);
  ctx.fillRect(x + w - depth, y, depth, h);
}

function msDrawMine(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45);
    ctx.lineTo(cx + Math.cos(a) * r,        cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function msDrawFlag(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx + r * 0.15, cy - r * 0.55, r * 0.18, r * 1.1);
  ctx.fillRect(cx - r * 0.45, cy + r * 0.45, r * 0.95, r * 0.18);
  ctx.fillStyle = MS_TOKENS.colors.accent;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.15, cy - r * 0.55);
  ctx.lineTo(cx + r * 0.15, cy - r * 0.05);
  ctx.lineTo(cx - r * 0.55, cy - r * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function msFormatTime(seconds) {
  if (seconds === null || seconds === undefined) return null;
  const s = Math.min(999, Math.max(0, Math.floor(seconds)));
  return String(s).padStart(3, '0');
}

function msDrawLED(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = '#1a0000';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = MS_TOKENS.colors.bevelDarker;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = MS_TOKENS.colors.accent;
  ctx.font = `bold ${Math.floor(h * 0.72)}px ${MS_TOKENS.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function msPreviewPattern(cols, rows) {
  const total = cols * rows;
  const out = new Array(total).fill('covered');
  let r = (cols * 31 + rows * 17 + 13) | 0;
  const next = () => {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    return r;
  };
  const revealCount = Math.floor(total * 0.22);
  const flagCount = Math.max(2, Math.floor(total * 0.04));
  for (let i = 0; i < revealCount; i++) {
    out[next() % total] = 'revealed';
  }
  for (let i = 0; i < flagCount; i++) {
    const idx = next() % total;
    if (out[idx] === 'covered') out[idx] = 'flag';
  }
  return out;
}

function msDrawMiniBoard(ctx, x, y, w, h, cols, rows, sample) {
  const cellSize = Math.max(2, Math.floor(Math.min(w / cols, h / rows)));
  const boardW = cellSize * cols;
  const boardH = cellSize * rows;
  const bx = x + Math.floor((w - boardW) / 2);
  const by = y + Math.floor((h - boardH) / 2);

  ctx.fillStyle = MS_TOKENS.colors.bevelDarker;
  ctx.fillRect(bx - 1, by - 1, boardW + 2, boardH + 2);

  const bevD = Math.max(1, Math.floor(cellSize / 6));
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const px = bx + cx * cellSize;
      const py = by + cy * cellSize;
      const cell = sample[cy * cols + cx];
      if (cell === 'revealed') {
        ctx.fillStyle = MS_TOKENS.colors.surfacePressed;
        ctx.fillRect(px, py, cellSize, cellSize);
        if (cellSize >= 5) {
          ctx.strokeStyle = MS_TOKENS.colors.bevelDark;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        }
      } else if (cell === 'flag') {
        msDrawRaised(ctx, px, py, cellSize, cellSize, bevD);
        if (cellSize >= 6) {
          ctx.fillStyle = MS_TOKENS.colors.accent;
          const inset = Math.max(1, Math.floor(cellSize * 0.3));
          ctx.fillRect(px + inset, py + inset, cellSize - inset * 2, cellSize - inset * 2);
        }
      } else {
        msDrawRaised(ctx, px, py, cellSize, cellSize, bevD);
      }
    }
  }
}

class MinesweeperMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
    this._difficulties = [
      { key: 'beginner',     label: 'BEGINNER',     cols: 9,  rows: 9,  mines: 10, cellSize: 28 },
      { key: 'intermediate', label: 'INTERMEDIATE', cols: 16, rows: 16, mines: 40, cellSize: 26 },
      { key: 'expert',       label: 'EXPERT',       cols: 30, rows: 16, mines: 99, cellSize: 18 }
    ];
    this._selected = 0;
    this._prevMouseLeft = false;
    this._mouseClicked = false;
    this._previews = this._difficulties.map(d => msPreviewPattern(d.cols, d.rows));

    this._cardW = 240;
    this._cardH = 340;
    this._cardGap = MS_TOKENS.spacing.lg;
    const totalW = this._cardW * 3 + this._cardGap * 2;
    this._cardsX0 = Math.floor((this._game.canvas.width - totalW) / 2);
    this._cardsY = 150;
  }

  enter() {
    Engine.audio.register('ms-menu-hover',  'blipSelect');
    Engine.audio.register('ms-menu-select', 'pickupCoin');
  }

  _cardRect(i) {
    return {
      x: this._cardsX0 + i * (this._cardW + this._cardGap),
      y: this._cardsY,
      w: this._cardW,
      h: this._cardH
    };
  }

  _hitTestCard(mx, my) {
    for (let i = 0; i < 3; i++) {
      const r = this._cardRect(i);
      if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
        return i;
      }
    }
    return -1;
  }

  update(_dt) {
    this._mouseClicked = !this._prevMouseLeft && Engine.input.mouse.left;
    this._prevMouseLeft = Engine.input.mouse.left;

    const hovered = this._hitTestCard(Engine.input.mouse.x, Engine.input.mouse.y);
    if (hovered >= 0 && hovered !== this._selected) {
      this._selected = hovered;
      Engine.audio.play('ms-menu-hover');
    }

    if (Engine.input.wasJustPressed('ArrowLeft') || Engine.input.wasJustPressed('ArrowUp')) {
      this._selected = (this._selected + 2) % 3;
      Engine.audio.play('ms-menu-hover');
    }
    if (Engine.input.wasJustPressed('ArrowRight') || Engine.input.wasJustPressed('ArrowDown')) {
      this._selected = (this._selected + 1) % 3;
      Engine.audio.play('ms-menu-hover');
    }
    if (Engine.input.wasJustPressed('1')) { this._selected = 0; Engine.audio.play('ms-menu-hover'); }
    if (Engine.input.wasJustPressed('2')) { this._selected = 1; Engine.audio.play('ms-menu-hover'); }
    if (Engine.input.wasJustPressed('3')) { this._selected = 2; Engine.audio.play('ms-menu-hover'); }

    const confirmedByKeyboard = Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ');
    const confirmedByClick = this._mouseClicked && hovered >= 0;
    if (confirmedByKeyboard || confirmedByClick) {
      Engine.audio.play('ms-menu-select');
      this._game.setScene(new MinesweeperMatchScene(this._game, this._difficulties[this._selected]));
    }
  }

  draw(ctx) {
    const cw = this._game.canvas.width;
    const ch = this._game.canvas.height;

    ctx.fillStyle = MS_TOKENS.colors.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Title row with flanking mine and flag
    const titleY = 70;
    ctx.font = `bold ${MS_TOKENS.type.hero}px ${MS_TOKENS.fontFamily}`;
    ctx.fillStyle = MS_TOKENS.colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MINESWEEPER', cw / 2, titleY);
    const titleHalfWidth = ctx.measureText('MINESWEEPER').width / 2;
    msDrawMine(ctx, cw / 2 - titleHalfWidth - 56, titleY, 24);
    msDrawFlag(ctx, cw / 2 + titleHalfWidth + 56, titleY, 24);

    // Subtitle
    ctx.font = `${MS_TOKENS.type.body}px ${MS_TOKENS.fontFamily}`;
    ctx.fillStyle = MS_TOKENS.colors.textSecondary;
    ctx.fillText('Select a difficulty to begin', cw / 2, 118);

    for (let i = 0; i < 3; i++) {
      this._drawCard(ctx, i);
    }

    // Bottom hint block
    ctx.font = `${MS_TOKENS.type.small}px ${MS_TOKENS.fontFamily}`;
    ctx.fillStyle = MS_TOKENS.colors.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys or 1/2/3 to select   ENTER or click to play', cw / 2, ch - 52);
    ctx.fillText('Best times save per difficulty', cw / 2, ch - 30);
  }

  _drawCard(ctx, i) {
    const r = this._cardRect(i);
    const d = this._difficulties[i];
    const isSelected = i === this._selected;

    if (isSelected) {
      msDrawSunken(ctx, r.x, r.y, r.w, r.h, 3);
    } else {
      msDrawRaised(ctx, r.x, r.y, r.w, r.h, 3);
    }

    // Title plate (inset sunken bar at top)
    const tx = r.x + MS_TOKENS.spacing.md;
    const ty = r.y + MS_TOKENS.spacing.md;
    const tw = r.w - MS_TOKENS.spacing.md * 2;
    const th = 44;
    msDrawSunken(ctx, tx, ty, tw, th, 2);
    ctx.font = `bold ${MS_TOKENS.type.label}px ${MS_TOKENS.fontFamily}`;
    ctx.fillStyle = MS_TOKENS.colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.label, r.x + r.w / 2, ty + th / 2 + 1);

    // Mini board preview
    const previewY = ty + th + MS_TOKENS.spacing.md;
    const previewH = 152;
    msDrawMiniBoard(ctx, r.x + MS_TOKENS.spacing.md, previewY, r.w - MS_TOKENS.spacing.md * 2, previewH, d.cols, d.rows, this._previews[i]);

    // Stats line: dimensions and mine count
    const statsY = previewY + previewH + MS_TOKENS.spacing.md + 4;
    ctx.font = `${MS_TOKENS.type.body}px ${MS_TOKENS.fontFamily}`;
    ctx.fillStyle = MS_TOKENS.colors.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${d.cols} x ${d.rows}   ${d.mines} mines`, r.x + r.w / 2, statsY);

    // Best-time LED or placeholder
    const best = Engine.storage.load('best_' + d.key, null);
    const bestText = msFormatTime(best);
    const ledW = 84;
    const ledH = 28;
    const ledX = r.x + Math.floor((r.w - ledW) / 2);
    const ledY = statsY + MS_TOKENS.spacing.sm;
    if (bestText) {
      msDrawLED(ctx, ledX, ledY, ledW, ledH, bestText);
      ctx.font = `${MS_TOKENS.type.small}px ${MS_TOKENS.fontFamily}`;
      ctx.fillStyle = MS_TOKENS.colors.textSecondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('BEST', r.x + r.w / 2, ledY + ledH + 14);
    } else {
      ctx.font = `${MS_TOKENS.type.small}px ${MS_TOKENS.fontFamily}`;
      ctx.fillStyle = MS_TOKENS.colors.textSecondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('no best time yet', r.x + r.w / 2, ledY + ledH / 2);
    }
  }
}
