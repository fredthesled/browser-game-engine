// games/factory/scenes/game.js
// FactoryGameScene -- core factory simulation.
//
// Architecture (Option A, scene-owned flat grid):
//   - A 30x30 tile grid stored as a flat array of tile objects.
//   - No GameObjects; all state lives in the scene.
//   - Camera is a (camX, camY) pixel offset into the grid, bounded to grid edges.
//   - Simulation runs a discrete tick every TICK_MS milliseconds, independent of
//     the render frame rate.
//
// Tile schema:
//   { type, dir, item, color, subtype, tickTimer, splitPhase }
//   type:      'empty' | 'resource' | 'extractor' | 'belt' | 'splitter' | 'painter' | 'hub'
//   dir:       0=right 1=down 2=left 3=up  (for directional buildings)
//   item:      null | { shape, color }  -- at most one item per tile
//   color:     painter/resource color ('red'|'green'|'blue')
//   subtype:   resource shape ('circle'|'square'|'triangle')
//   tickTimer: countdown to next produce/process step (machines only)
//   splitPhase:0|1 alternating output side for splitter
//
// Simulation tick order:
//   1. Extractors: if tickTimer expired and output belt accepts, push item.
//   2. Painters:   if tickTimer expired and has item, dye it.
//   3. Belts/Splitters: advance items one tile toward their output.
//   4. Hub:        collect any arriving items, score them.
//
// Goals: five sequential deliveries. Each goal specifies shape + color + count.
// Completing all five transitions to a win screen.
//
// Controls:
//   Left-click:  place selected building / pick up to cycle through placed buildings.
//   Right-click: demolish tile.
//   R:           rotate selected building (before placement).
//   WASD or middle-mouse drag: pan camera.
//   ESC:         clear selection.
//   1-5:         select building type by hotkey.
//
// Depends on: Engine.Scene, Engine.input, Engine.storage, FactoryMenuScene.

const TILE_SIZE  = 36;   // px per grid tile
const GRID_COLS  = 30;
const GRID_ROWS  = 30;
const TICK_MS    = 500;  // ms between simulation ticks
const MACHINE_TICKS = 2; // ticks an extractor/painter takes to produce

const SHAPES = ['circle', 'square', 'triangle'];
const COLORS = ['red', 'green', 'blue'];

// Direction vectors: 0=right 1=down 2=left 3=up
const DIR_DELTA = [
  [1, 0],   // right
  [0, 1],   // down
  [-1, 0],  // left
  [0, -1],  // up
];

const DIR_LABELS = ['>', 'v', '<', '^'];

const SHAPE_COLORS = {
  red:   '#ef5350',
  green: '#66bb6a',
  blue:  '#42a5f5',
};

const BUILDING_DEFS = [
  { type: 'extractor', label: 'Extractor', key: '1', color: '#78909c' },
  { type: 'belt',      label: 'Belt',      key: '2', color: '#ffa726' },
  { type: 'splitter',  label: 'Splitter',  key: '3', color: '#ab47bc' },
  { type: 'painter',   label: 'Painter',   key: '4', color: '#26c6da' },
  { type: 'hub',       label: 'Hub',       key: '5', color: '#66bb6a' },
];

// Goal definitions: [shape, color, count]
const GOAL_SEQUENCE = [
  ['circle',   'red',   10],
  ['square',   'blue',  15],
  ['triangle', 'green', 12],
  ['circle',   'green', 20],
  ['square',   'red',   25],
];

function makeTile() {
  return {
    type:       'empty',
    dir:        0,
    item:       null,
    color:      null,
    subtype:    null,
    tickTimer:  0,
    splitPhase: 0,
  };
}

class FactoryGameScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;

    // Grid.
    this._grid = [];
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) this._grid.push(makeTile());

    // Camera: pixel offset of the grid's top-left corner within the canvas.
    this._camX = 0;
    this._camY = 0;

    // Simulation timer.
    this._tickAccum = 0;

    // Building placement state.
    this._selectedType = null;  // string type name
    this._selectedDir  = 0;

    // Middle-mouse pan state.
    this._mmDown  = false;
    this._mmLastX = 0;
    this._mmLastY = 0;

    // Goal state.
    this._goalIdx      = 0;
    this._goalDelivered = 0;
    this._won           = false;

    // Input edge detection.
    this._prevLeft    = false;
    this._prevRight   = false;
    this._prevMiddle  = false;

    // Feedback flash for hub delivery: { shape, color, count, alpha }
    this._flash = null;

    this._placeHub();
    this._placeResources();
    this._centerCamera();
  }

  // ----------------------------------------------------------------- setup

  _idx(c, r) { return r * GRID_COLS + c; }

  _tile(c, r) {
    if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return null;
    return this._grid[this._idx(c, r)];
  }

  _placeHub() {
    // Hub at center of grid.
    const hc = Math.floor(GRID_COLS / 2);
    const hr = Math.floor(GRID_ROWS / 2);
    const t = this._tile(hc, hr);
    t.type = 'hub';
  }

  _placeResources() {
    // Scatter resource tiles across the grid, avoiding the hub center and
    // its immediate neighbors. Use a deterministic pattern so the map is
    // reproducible without a seed UI.
    const prng = new Engine.PRNG(42);
    const hubC = Math.floor(GRID_COLS / 2);
    const hubR = Math.floor(GRID_ROWS / 2);
    const safe = (c, r) => Math.abs(c - hubC) <= 3 && Math.abs(r - hubR) <= 3;

    // Aim for roughly 18 resource patches.
    let placed = 0;
    while (placed < 18) {
      const c = prng.int(1, GRID_COLS - 2);
      const r = prng.int(1, GRID_ROWS - 2);
      if (safe(c, r)) continue;
      const t = this._tile(c, r);
      if (t.type !== 'empty') continue;
      t.type    = 'resource';
      t.subtype = prng.pick(SHAPES);
      t.color   = prng.pick(COLORS);
      placed++;
    }
  }

  _centerCamera() {
    const W = this._game.canvas.width;
    const H = this._game.canvas.height;
    const gridPxW = GRID_COLS * TILE_SIZE;
    const gridPxH = GRID_ROWS * TILE_SIZE;
    this._camX = Math.round((W - gridPxW) / 2);
    this._camY = Math.round((H - gridPxH) / 2);
    this._clampCamera();
  }

  _clampCamera() {
    const W = this._game.canvas.width;
    const H = this._game.canvas.height;
    const gridPxW = GRID_COLS * TILE_SIZE;
    const gridPxH = GRID_ROWS * TILE_SIZE;
    // Allow the grid to be panned until the opposite edge hits the canvas edge.
    this._camX = Math.min(0, Math.max(W - gridPxW, this._camX));
    this._camY = Math.min(0, Math.max(H - gridPxH, this._camY));
  }

  // ------------------------------------------------------------ simulation

  _currentGoal() {
    if (this._goalIdx >= GOAL_SEQUENCE.length) return null;
    const g = GOAL_SEQUENCE[this._goalIdx];
    return { shape: g[0], color: g[1], count: g[2] };
  }

  _tick() {
    // Collect pending output from machines into a staging buffer so order of
    // iteration does not create same-tick double-advances.
    const pending = new Map(); // idx -> item

    // 1. Extractors.
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        if (t.type !== 'extractor') continue;
        const [dc, dr] = DIR_DELTA[t.dir];
        const nc = c + dc, nr = r + dr;
        const dest = this._tile(nc, nr);
        if (!dest || dest.item || pending.has(this._idx(nc, nr))) continue;
        t.tickTimer--;
        if (t.tickTimer <= 0) {
          t.tickTimer = MACHINE_TICKS;
          // Find what resource tile this extractor sits on.
          // Extractors must be placed on resource tiles; their subtype/color
          // is copied from the underlying resource at placement time.
          pending.set(this._idx(nc, nr), { shape: t.subtype, color: t.color });
        }
      }
    }

    // 2. Painters (dye in-place; no movement this tick).
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        if (t.type !== 'painter' || !t.item) continue;
        t.tickTimer--;
        if (t.tickTimer <= 0) {
          t.tickTimer = MACHINE_TICKS;
          t.item = { shape: t.item.shape, color: t.color };
        }
      }
    }

    // 3. Flush pending into grid.
    for (const [idx, item] of pending) {
      if (!this._grid[idx].item) this._grid[idx].item = item;
    }

    // 4. Belt movement (iterate from output end toward input end to avoid
    // same-tick double-advance: process tiles in reverse traversal order
    // by running each direction sweep in the direction of flow).
    // Strategy: collect (src, dst, item) moves, then apply atomically.
    const moves = [];
    const occupied = new Set();

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        if ((t.type !== 'belt' && t.type !== 'splitter') || !t.item) continue;

        let destCols, destRows;
        if (t.type === 'splitter') {
          // Two possible output directions: primary (t.dir) and secondary (t.dir+1)%4.
          const dirs = [t.dir, (t.dir + 1) % 4];
          const chosen = dirs[t.splitPhase % 2];
          const [dc, dr] = DIR_DELTA[chosen];
          destCols = [c + dc];
          destRows = [r + dr];
        } else {
          const [dc, dr] = DIR_DELTA[t.dir];
          destCols = [c + dc];
          destRows = [r + dr];
        }

        const dc2 = destCols[0], dr2 = destRows[0];
        const dest = this._tile(dc2, dr2);
        if (!dest) continue;

        const destIdx = this._idx(dc2, dr2);
        if (occupied.has(destIdx)) continue;

        // Hub: consume immediately.
        if (dest.type === 'hub') {
          moves.push({ si: this._idx(c, r), di: destIdx, item: t.item, toHub: true });
          occupied.add(destIdx);
          if (t.type === 'splitter') t.splitPhase ^= 1;
          continue;
        }

        // Painter input: accept item if painter has none.
        if (dest.type === 'painter' && !dest.item) {
          dest.item = t.item;
          t.item = null;
          dest.tickTimer = MACHINE_TICKS;
          if (t.type === 'splitter') t.splitPhase ^= 1;
          continue;
        }

        // Normal belt/empty destination.
        if (dest.item || pending.has(destIdx)) continue;
        moves.push({ si: this._idx(c, r), di: destIdx, item: t.item, toHub: false });
        occupied.add(destIdx);
        if (t.type === 'splitter') t.splitPhase ^= 1;
      }
    }

    for (const mv of moves) {
      const src = this._grid[mv.si];
      const dst = this._grid[mv.di];
      if (mv.toHub) {
        src.item = null;
        this._scoreItem(mv.item);
      } else {
        if (!dst.item) {
          dst.item = mv.item;
          src.item = null;
        }
      }
    }
  }

  _scoreItem(item) {
    const goal = this._currentGoal();
    if (!goal) return;
    if (item.shape === goal.shape && item.color === goal.color) {
      this._goalDelivered++;
      this._flash = { shape: item.shape, color: item.color, count: this._goalDelivered, alpha: 1.0 };
      if (this._goalDelivered >= goal.count) {
        this._goalIdx++;
        this._goalDelivered = 0;
        if (this._goalIdx >= GOAL_SEQUENCE.length) {
          this._won = true;
        }
      }
    }
  }

  // ----------------------------------------------------------- input helpers

  _canvasToGrid(px, py) {
    const c = Math.floor((px - this._camX) / TILE_SIZE);
    const r = Math.floor((py - this._camY) / TILE_SIZE);
    return { c, r };
  }

  _inGrid(c, r) {
    return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
  }

  // ----------------------------------------------------------- update/draw

  update(dt) {
    const mx = Engine.input.mouse.x;
    const my = Engine.input.mouse.y;

    // Edge detection.
    const clickedLeft   = !this._prevLeft   && Engine.input.mouse.left;
    const clickedRight  = !this._prevRight  && Engine.input.mouse.right;
    const clickedMiddle = !this._prevMiddle && Engine.input.mouse.middle;
    this._prevLeft   = Engine.input.mouse.left;
    this._prevRight  = Engine.input.mouse.right;
    this._prevMiddle = Engine.input.mouse.middle;

    // Win-state: only allow returning to menu.
    if (this._won) {
      if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ') || clickedLeft) {
        this._game.setScene(new FactoryMenuScene(this._game));
      }
      return;
    }

    // --- Hotkeys for building selection.
    for (let i = 0; i < BUILDING_DEFS.length; i++) {
      if (Engine.input.wasJustPressed(BUILDING_DEFS[i].key)) {
        this._selectedType = BUILDING_DEFS[i].type;
      }
    }
    if (Engine.input.wasJustPressed('Escape')) this._selectedType = null;
    if (Engine.input.wasJustPressed('r') || Engine.input.wasJustPressed('R')) {
      this._selectedDir = (this._selectedDir + 1) % 4;
    }

    // --- Camera pan: WASD.
    const PAN_SPEED = 200; // px/s
    if (Engine.input.isDown('w') || Engine.input.isDown('ArrowUp'))    this._camY += PAN_SPEED * dt;
    if (Engine.input.isDown('s') || Engine.input.isDown('ArrowDown'))  this._camY -= PAN_SPEED * dt;
    if (Engine.input.isDown('a') || Engine.input.isDown('ArrowLeft'))  this._camX += PAN_SPEED * dt;
    if (Engine.input.isDown('d') || Engine.input.isDown('ArrowRight')) this._camX -= PAN_SPEED * dt;
    this._clampCamera();

    // --- Middle-mouse pan.
    // Engine.input.mouse.middle is not tracked by the engine, so we listen
    // via a mousedown/mouseup delta approach stored on this scene.
    // (The engine tracks left and right only; middle panning uses a stored
    // position delta updated every frame.)
    // NOTE: middle button is tracked via separate listeners attached in enter().

    // --- Left click: place or pick.
    if (clickedLeft) {
      const { c, r } = this._canvasToGrid(mx, my);
      if (this._inGrid(c, r)) {
        const t = this._tile(c, r);
        if (this._selectedType) {
          this._placeBuildingAt(t, c, r);
        }
      }
    }

    // --- Right click: demolish.
    if (clickedRight) {
      const { c, r } = this._canvasToGrid(mx, my);
      if (this._inGrid(c, r)) {
        const t = this._tile(c, r);
        if (t.type !== 'resource' && t.type !== 'hub') {
          t.type       = 'empty';
          t.item       = null;
          t.dir        = 0;
          t.color      = null;
          t.subtype    = null;
          t.tickTimer  = 0;
          t.splitPhase = 0;
        }
      }
    }

    // --- Simulation tick.
    this._tickAccum += dt * 1000;
    while (this._tickAccum >= TICK_MS) {
      this._tickAccum -= TICK_MS;
      this._tick();
    }

    // --- Flash decay.
    if (this._flash) {
      this._flash.alpha -= dt * 1.5;
      if (this._flash.alpha <= 0) this._flash = null;
    }
  }

  enter() {
    // Attach middle-mouse listeners for panning.
    const canvas = this._game.canvas;
    this._onMmDown = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this._mmDown  = true;
        this._mmLastX = e.clientX;
        this._mmLastY = e.clientY;
      }
    };
    this._onMmMove = (e) => {
      if (!this._mmDown) return;
      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      this._camX += (e.clientX - this._mmLastX) * scaleX;
      this._camY += (e.clientY - this._mmLastY) * scaleY;
      this._mmLastX = e.clientX;
      this._mmLastY = e.clientY;
      this._clampCamera();
    };
    this._onMmUp = (e) => {
      if (e.button === 1) this._mmDown = false;
    };
    canvas.addEventListener('mousedown', this._onMmDown);
    window.addEventListener('mousemove', this._onMmMove);
    window.addEventListener('mouseup',   this._onMmUp);
  }

  exit() {
    const canvas = this._game.canvas;
    canvas.removeEventListener('mousedown', this._onMmDown);
    window.removeEventListener('mousemove', this._onMmMove);
    window.removeEventListener('mouseup',   this._onMmUp);
  }

  _placeBuildingAt(t, c, r) {
    const type = this._selectedType;
    // Extractor must go on a resource tile.
    if (type === 'extractor') {
      if (t.type !== 'resource') return;
      t.type      = 'extractor';
      t.dir       = this._selectedDir;
      t.tickTimer = MACHINE_TICKS;
      // subtype and color inherited from resource (already set).
      return;
    }
    // Hub cannot be placed; it is fixed.
    if (type === 'hub') return;
    // Painter gets a color picker -- use the current selectedDir as a color index.
    if (type === 'painter') {
      if (t.type !== 'empty') return;
      t.type      = 'painter';
      t.dir       = this._selectedDir;
      t.color     = COLORS[this._selectedDir % COLORS.length];
      t.tickTimer = 0;
      t.item      = null;
      return;
    }
    // Belt and splitter go on empty tiles.
    if (t.type !== 'empty') return;
    t.type      = type;
    t.dir       = this._selectedDir;
    t.item      = null;
    t.tickTimer = 0;
  }

  // ----------------------------------------------------------- draw

  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background.
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(this._camX, this._camY);
    this._drawGrid(ctx);
    ctx.restore();

    this._drawHUD(ctx);

    if (this._won) this._drawWin(ctx);
  }

  _drawGrid(ctx) {
    const visC0 = Math.max(0, Math.floor(-this._camX / TILE_SIZE));
    const visR0 = Math.max(0, Math.floor(-this._camY / TILE_SIZE));
    const visC1 = Math.min(GRID_COLS - 1, Math.ceil((-this._camX + this._game.canvas.width)  / TILE_SIZE));
    const visR1 = Math.min(GRID_ROWS - 1, Math.ceil((-this._camY + this._game.canvas.height) / TILE_SIZE));

    for (let r = visR0; r <= visR1; r++) {
      for (let c = visC0; c <= visC1; c++) {
        this._drawTile(ctx, c, r);
      }
    }
  }

  _drawTile(ctx, c, r) {
    const t  = this._tile(c, r);
    const x  = c * TILE_SIZE;
    const y  = r * TILE_SIZE;
    const S  = TILE_SIZE;
    const hs = S / 2;

    // Base tile background.
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(x, y, S, S);
    // Grid line.
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.25, y + 0.25, S - 0.5, S - 0.5);

    // Tile-type rendering.
    switch (t.type) {
      case 'resource':
        ctx.fillStyle = '#2a2a1e';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        this._drawShape(ctx, x + hs, y + hs, t.subtype, t.color, S * 0.28);
        break;

      case 'extractor':
        ctx.fillStyle = '#263238';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        // Body.
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, S - 8, S - 8);
        // Direction arrow.
        this._drawArrow(ctx, x + hs, y + hs, t.dir, '#78909c', 8);
        break;

      case 'belt':
        ctx.fillStyle = '#1a1200';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        // Belt track lines.
        ctx.strokeStyle = '#4a3800';
        ctx.lineWidth = 1;
        const [bdx, bdy] = DIR_DELTA[t.dir];
        // Draw two parallel track lines.
        const perp = [-bdy, bdx];
        for (const side of [-1, 1]) {
          const ox = perp[0] * 5;
          const oy = perp[1] * 5;
          ctx.beginPath();
          ctx.moveTo(x + hs + ox - bdx * hs * 0.8, y + hs + oy - bdy * hs * 0.8);
          ctx.lineTo(x + hs + ox + bdx * hs * 0.8, y + hs + oy + bdy * hs * 0.8);
          ctx.stroke();
        }
        this._drawArrow(ctx, x + hs, y + hs, t.dir, '#ffa726', 6);
        break;

      case 'splitter':
        ctx.fillStyle = '#1a0a1a';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#ab47bc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, S - 6, S - 6);
        this._drawArrow(ctx, x + hs, y + hs - 4, t.dir, '#ab47bc', 5);
        this._drawArrow(ctx, x + hs, y + hs + 4, (t.dir + 1) % 4, '#ab47bc', 5);
        break;

      case 'painter':
        ctx.fillStyle = '#001a1e';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#26c6da';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, S - 6, S - 6);
        // Color swatch.
        ctx.fillStyle = SHAPE_COLORS[t.color] || '#fff';
        ctx.beginPath();
        ctx.arc(x + hs, y + hs, 5, 0, Math.PI * 2);
        ctx.fill();
        this._drawArrow(ctx, x + hs, y + hs, t.dir, '#26c6da', 6);
        break;

      case 'hub':
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 3, y + 3, S - 6, S - 6);
        ctx.fillStyle = '#66bb6a';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HUB', x + hs, y + hs);
        break;

      default: break;
    }

    // Item on tile (drawn on top of building).
    if (t.item) {
      this._drawShape(ctx, x + hs, y + hs, t.item.shape, t.item.color, S * 0.22);
    }
  }

  _drawArrow(ctx, cx, cy, dir, color, size) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.6);
    ctx.lineTo(-size * 0.6,  size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawShape(ctx, cx, cy, shape, color, r) {
    const col = SHAPE_COLORS[color] || '#ffffff';
    ctx.fillStyle = col;
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
        break;
      case 'triangle':
        ctx.moveTo(cx,     cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.lineTo(cx - r, cy + r);
        ctx.closePath();
        break;
    }
    ctx.fill();
  }

  _drawHUD(ctx) {
    const W = ctx.canvas.width;
    const hudH = 52;

    // HUD bar background.
    ctx.fillStyle = 'rgba(10,10,20,0.88)';
    ctx.fillRect(0, 0, W, hudH);

    // Goal display.
    const goal = this._currentGoal();
    ctx.textBaseline = 'middle';
    if (goal) {
      ctx.fillStyle = '#9090a0';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('GOAL ' + (this._goalIdx + 1) + '/' + GOAL_SEQUENCE.length + ':', 16, 16);

      // Shape icon.
      this._drawShape(ctx, 120, 16, goal.shape, goal.color, 7);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        goal.color.toUpperCase() + ' ' + goal.shape.toUpperCase() +
        '  ' + this._goalDelivered + ' / ' + goal.count,
        134, 16
      );

      // Progress bar.
      const barX = 16, barY = 30, barW = 340, barH = 8;
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = SHAPE_COLORS[goal.color] || '#fff';
      ctx.fillRect(barX, barY, barW * (this._goalDelivered / goal.count), barH);
    } else {
      ctx.fillStyle = '#66bb6a';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ALL GOALS COMPLETE', 16, 26);
    }

    // Building palette.
    const paletteX = W - BUILDING_DEFS.length * 70 - 16;
    for (let i = 0; i < BUILDING_DEFS.length; i++) {
      const def = BUILDING_DEFS[i];
      const bx  = paletteX + i * 70;
      const by  = 6;
      const bw  = 64;
      const bh  = 40;
      const sel = this._selectedType === def.type;
      ctx.fillStyle = sel ? def.color : '#1e1e2e';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = sel ? '#000' : def.color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[' + def.key + '] ' + def.label.slice(0, 5), bx + bw / 2, by + 14);
      // Show rotation for directional buildings.
      if (sel && def.type !== 'hub') {
        ctx.fillStyle = sel ? '#000' : '#999';
        ctx.font = '9px monospace';
        ctx.fillText('R: ' + DIR_LABELS[this._selectedDir] + '  (rotate)', bx + bw / 2, by + 28);
      }
    }

    // Delivery flash.
    if (this._flash && this._flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this._flash.alpha);
      ctx.fillStyle = SHAPE_COLORS[this._flash.color] || '#fff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        '+1  ' + this._flash.color.toUpperCase() + ' ' + this._flash.shape.toUpperCase() +
        '  (' + this._flash.count + ')',
        ctx.canvas.width / 2,
        hudH + 8
      );
      ctx.restore();
    }

    // Tooltip: painter color note.
    if (this._selectedType === 'painter') {
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        'Painter color: ' + COLORS[this._selectedDir % COLORS.length].toUpperCase() + '  (rotate R to cycle)',
        W / 2, hudH + 8
      );
    }
  }

  _drawWin(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#66bb6a';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('FACTORY COMPLETE', W / 2, H / 2 - 30);
    ctx.fillStyle = '#c0c0c0';
    ctx.font = '20px monospace';
    ctx.fillText('All deliveries made.', W / 2, H / 2 + 20);
    ctx.fillStyle = '#888';
    ctx.font = '15px monospace';
    ctx.fillText('Click or press Enter to return to menu.', W / 2, H / 2 + 60);
  }
}
