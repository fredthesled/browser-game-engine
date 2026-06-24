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
// Simulation tick order (each TICK_MS):
//   1. Painters:   if item present and tickTimer expired, dye it in-place.
//   2. Extractors: if output tile is free and tickTimer expired, emit item.
//   3. Belt/Splitter movement: advance items one tile atomically.
//      Hub receipt and painter intake happen as part of this pass.
//
// Goals: five sequential deliveries. Each goal specifies shape + color + count.
// Completing all five transitions to a win screen.
//
// Controls:
//   Left-click:        place selected building.
//   Right-click:       demolish tile (resource and hub tiles are protected).
//   R:                 rotate selected building direction.
//   Q:                 cycle painter color (painter only).
//   WASD / arrow keys: pan camera.
//   Middle-mouse drag: pan camera.
//   ESC:               clear selection.
//   1-5:               select building type by hotkey.
//
// UI features:
//   - Minimap (bottom-right): full 30x30 grid overview at 3px/tile.
//   - Placement preview: ghost of selected building follows mouse cursor;
//     red tint on invalid placements.
//   - Direction picker: four arrow buttons shown below selected palette entry.
//   - Placement feedback: brief ring flash on success, red ring on invalid.
//
// Depends on: Engine.Scene, Engine.input, Engine.PRNG, FactoryMenuScene.

const TILE_SIZE     = 36;   // px per grid tile
const GRID_COLS     = 30;
const GRID_ROWS     = 30;
const TICK_MS       = 500;  // ms between simulation ticks
const MACHINE_TICKS = 2;    // ticks an extractor takes per item

const MINIMAP_TILE  = 3;    // px per tile in minimap
const MINIMAP_PAD   = 10;   // px inset from canvas bottom-right

const SHAPES = ['circle', 'square', 'triangle'];
const COLORS = ['red', 'green', 'blue'];

// Direction vectors: 0=right 1=down 2=left 3=up
const DIR_DELTA = [
  [ 1,  0],
  [ 0,  1],
  [-1,  0],
  [ 0, -1],
];

const DIR_LABELS = ['>', 'v', '<', '^'];
const DIR_NAMES  = ['Right', 'Down', 'Left', 'Up'];

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

    this._grid = [];
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) this._grid.push(makeTile());

    this._camX = 0;
    this._camY = 0;
    this._tickAccum = 0;

    // Placement state.
    this._selectedType  = null;
    this._selectedDir   = 0;
    this._painterColor  = 0;  // index into COLORS; separated from dir

    // Middle-mouse pan.
    this._mmDown  = false;
    this._mmLastX = 0;
    this._mmLastY = 0;

    // Goal state.
    this._goalIdx       = 0;
    this._goalDelivered = 0;
    this._won           = false;

    // Input edge detection.
    this._prevLeft  = false;
    this._prevRight = false;

    // Delivery flash: { shape, color, count, alpha }
    this._flash = null;

    // Placement feedback rings: [{ c, r, alpha, valid }]
    this._rings = [];

    // Hovered grid cell (updated each frame for ghost/preview).
    this._hoverC = -1;
    this._hoverR = -1;

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
    const hc = Math.floor(GRID_COLS / 2);
    const hr = Math.floor(GRID_ROWS / 2);
    this._tile(hc, hr).type = 'hub';
  }

  _placeResources() {
    const prng = new Engine.PRNG(42);
    const hubC = Math.floor(GRID_COLS / 2);
    const hubR = Math.floor(GRID_ROWS / 2);
    const safe = (c, r) => Math.abs(c - hubC) <= 3 && Math.abs(r - hubR) <= 3;
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
    this._camX = Math.round((W - GRID_COLS * TILE_SIZE) / 2);
    this._camY = Math.round((H - GRID_ROWS * TILE_SIZE) / 2);
    this._clampCamera();
  }

  _clampCamera() {
    const W = this._game.canvas.width;
    const H = this._game.canvas.height;
    this._camX = Math.min(0, Math.max(W - GRID_COLS * TILE_SIZE, this._camX));
    this._camY = Math.min(0, Math.max(H - GRID_ROWS * TILE_SIZE, this._camY));
  }

  // ------------------------------------------------------------ simulation

  _currentGoal() {
    if (this._goalIdx >= GOAL_SEQUENCE.length) return null;
    const g = GOAL_SEQUENCE[this._goalIdx];
    return { shape: g[0], color: g[1], count: g[2] };
  }

  _tick() {
    // Step 1: Painters.
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        if (t.type !== 'painter' || !t.item) continue;
        t.tickTimer--;
        if (t.tickTimer <= 0) {
          t.item = { shape: t.item.shape, color: t.color };
          t.tickTimer = 0;
        }
      }
    }

    // Step 2: Extractors.
    const pending = new Map();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        if (t.type !== 'extractor') continue;
        const [dc, dr] = DIR_DELTA[t.dir];
        const nc = c + dc, nr = r + dr;
        const dest = this._tile(nc, nr);
        const destIdx = dest ? this._idx(nc, nr) : -1;
        if (!dest || dest.item || pending.has(destIdx)) continue;
        t.tickTimer--;
        if (t.tickTimer <= 0) {
          t.tickTimer = MACHINE_TICKS;
          pending.set(destIdx, { shape: t.subtype, color: t.color });
        }
      }
    }
    for (const [idx, item] of pending) {
      if (!this._grid[idx].item) this._grid[idx].item = item;
    }

    // Step 3: Belt movement.
    const moves    = [];
    const occupied = new Set();

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        if ((t.type !== 'belt' && t.type !== 'splitter') || !t.item) continue;

        let outDir = t.dir;
        if (t.type === 'splitter') {
          outDir = t.splitPhase === 0 ? t.dir : (t.dir + 1) % 4;
        }

        const [dc, dr] = DIR_DELTA[outDir];
        const nc = c + dc, nr = r + dr;
        const dest = this._tile(nc, nr);
        if (!dest) continue;

        const destIdx = this._idx(nc, nr);
        if (occupied.has(destIdx)) continue;

        if (dest.type === 'hub') {
          moves.push({ si: this._idx(c, r), item: t.item, toHub: true });
          occupied.add(destIdx);
          if (t.type === 'splitter') t.splitPhase ^= 1;
          continue;
        }

        if (dest.type === 'painter' && !dest.item) {
          dest.item      = t.item;
          dest.tickTimer = 1;
          t.item         = null;
          if (t.type === 'splitter') t.splitPhase ^= 1;
          continue;
        }

        if (dest.item || pending.has(destIdx)) continue;
        moves.push({ si: this._idx(c, r), di: destIdx, item: t.item, toHub: false });
        occupied.add(destIdx);
        if (t.type === 'splitter') t.splitPhase ^= 1;
      }
    }

    for (const mv of moves) {
      const src = this._grid[mv.si];
      if (mv.toHub) {
        src.item = null;
        this._scoreItem(mv.item);
      } else {
        const dst = this._grid[mv.di];
        if (!dst.item) { dst.item = mv.item; src.item = null; }
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
        if (this._goalIdx >= GOAL_SEQUENCE.length) this._won = true;
      }
    }
  }

  // ----------------------------------------------------------- placement

  _canPlaceAt(type, t) {
    if (type === 'extractor') return t.type === 'resource';
    if (type === 'hub')       return false;
    if (type === 'painter')   return t.type === 'empty';
    return t.type === 'empty'; // belt, splitter
  }

  _placeBuildingAt(t, c, r) {
    const type = this._selectedType;
    if (!this._canPlaceAt(type, t)) {
      this._rings.push({ c, r, alpha: 1.0, valid: false });
      return;
    }

    if (type === 'extractor') {
      t.type      = 'extractor';
      t.dir       = this._selectedDir;
      t.tickTimer = MACHINE_TICKS;
      // subtype and color already set from resource tile.
    } else if (type === 'painter') {
      t.type      = 'painter';
      t.dir       = this._selectedDir;
      t.color     = COLORS[this._painterColor];
      t.tickTimer = 0;
      t.item      = null;
    } else {
      // belt, splitter
      t.type      = type;
      t.dir       = this._selectedDir;
      t.item      = null;
      t.tickTimer = 0;
    }
    this._rings.push({ c, r, alpha: 1.0, valid: true });
  }

  // ----------------------------------------------------------- input helpers

  _canvasToGrid(px, py) {
    return {
      c: Math.floor((px - this._camX) / TILE_SIZE),
      r: Math.floor((py - this._camY) / TILE_SIZE),
    };
  }

  _inGrid(c, r) {
    return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
  }

  // ----------------------------------------------------------------- lifecycle

  enter() {
    const canvas = this._game.canvas;
    this._onMmDown = (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      this._mmDown  = true;
      this._mmLastX = e.clientX;
      this._mmLastY = e.clientY;
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
    this._onMmUp = (e) => { if (e.button === 1) this._mmDown = false; };
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

  // ----------------------------------------------------------------- update

  update(dt) {
    const mx = Engine.input.mouse.x;
    const my = Engine.input.mouse.y;

    const clickedLeft  = !this._prevLeft  && Engine.input.mouse.left;
    const clickedRight = !this._prevRight && Engine.input.mouse.right;
    this._prevLeft  = Engine.input.mouse.left;
    this._prevRight = Engine.input.mouse.right;

    // Win state.
    if (this._won) {
      if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ') || clickedLeft) {
        this._game.setScene(new FactoryMenuScene(this._game));
      }
      return;
    }

    // Building hotkeys.
    for (let i = 0; i < BUILDING_DEFS.length; i++) {
      if (Engine.input.wasJustPressed(BUILDING_DEFS[i].key)) {
        this._selectedType = BUILDING_DEFS[i].type;
      }
    }
    if (Engine.input.wasJustPressed('Escape')) this._selectedType = null;

    // R: rotate direction.
    if (Engine.input.wasJustPressed('r') || Engine.input.wasJustPressed('R')) {
      this._selectedDir = (this._selectedDir + 1) % 4;
    }
    // Q: cycle painter color.
    if (Engine.input.wasJustPressed('q') || Engine.input.wasJustPressed('Q')) {
      this._painterColor = (this._painterColor + 1) % COLORS.length;
    }

    // Camera pan.
    const PAN = 200;
    if (Engine.input.isDown('w') || Engine.input.isDown('ArrowUp'))    this._camY += PAN * dt;
    if (Engine.input.isDown('s') || Engine.input.isDown('ArrowDown'))  this._camY -= PAN * dt;
    if (Engine.input.isDown('a') || Engine.input.isDown('ArrowLeft'))  this._camX += PAN * dt;
    if (Engine.input.isDown('d') || Engine.input.isDown('ArrowRight')) this._camX -= PAN * dt;
    this._clampCamera();

    // Update hovered cell for ghost preview.
    const hg = this._canvasToGrid(mx, my);
    this._hoverC = hg.c;
    this._hoverR = hg.r;

    // Left click: place.
    if (clickedLeft && this._selectedType) {
      const { c, r } = hg;
      if (this._inGrid(c, r)) {
        this._placeBuildingAt(this._tile(c, r), c, r);
      }
    }

    // Right click: demolish.
    if (clickedRight) {
      const { c, r } = hg;
      if (this._inGrid(c, r)) {
        const t = this._tile(c, r);
        if (t.type !== 'resource' && t.type !== 'hub') {
          t.type = 'empty'; t.item = null; t.dir = 0;
          t.color = null; t.subtype = null; t.tickTimer = 0; t.splitPhase = 0;
        }
      }
    }

    // Simulation tick.
    this._tickAccum += dt * 1000;
    while (this._tickAccum >= TICK_MS) {
      this._tickAccum -= TICK_MS;
      this._tick();
    }

    // Decay flash and rings.
    if (this._flash) {
      this._flash.alpha -= dt * 1.5;
      if (this._flash.alpha <= 0) this._flash = null;
    }
    this._rings = this._rings
      .map(rg => ({ ...rg, alpha: rg.alpha - dt * 3 }))
      .filter(rg => rg.alpha > 0);
  }

  // ----------------------------------------------------------------- draw

  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(this._camX, this._camY);
    this._drawGrid(ctx);
    this._drawGhost(ctx);
    this._drawRings(ctx);
    ctx.restore();

    this._drawHUD(ctx);
    this._drawMinimap(ctx);
    if (this._won) this._drawWin(ctx);
  }

  // ----------------------------------------------------------------- grid

  _drawGrid(ctx) {
    const W = this._game.canvas.width;
    const H = this._game.canvas.height;
    const visC0 = Math.max(0, Math.floor(-this._camX / TILE_SIZE));
    const visR0 = Math.max(0, Math.floor(-this._camY / TILE_SIZE));
    const visC1 = Math.min(GRID_COLS - 1, Math.ceil((-this._camX + W) / TILE_SIZE));
    const visR1 = Math.min(GRID_ROWS - 1, Math.ceil((-this._camY + H) / TILE_SIZE));
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

    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(x, y, S, S);
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.25, y + 0.25, S - 0.5, S - 0.5);

    switch (t.type) {
      case 'resource':
        ctx.fillStyle = '#2a2a1e';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        this._drawShape(ctx, x + hs, y + hs, t.subtype, t.color, S * 0.28);
        break;

      case 'extractor':
        ctx.fillStyle = '#263238';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, S - 8, S - 8);
        this._drawArrow(ctx, x + hs, y + hs, t.dir, '#78909c', 8);
        break;

      case 'belt': {
        ctx.fillStyle = '#1a1200';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#4a3800';
        ctx.lineWidth = 1;
        const [bdx, bdy] = DIR_DELTA[t.dir];
        const perp = [-bdy, bdx];
        for (const side of [-1, 1]) {
          const ox = perp[0] * 5 * side;
          const oy = perp[1] * 5 * side;
          ctx.beginPath();
          ctx.moveTo(x + hs + ox - bdx * hs * 0.8, y + hs + oy - bdy * hs * 0.8);
          ctx.lineTo(x + hs + ox + bdx * hs * 0.8, y + hs + oy + bdy * hs * 0.8);
          ctx.stroke();
        }
        this._drawArrow(ctx, x + hs, y + hs, t.dir, '#ffa726', 6);
        break;
      }

      case 'splitter':
        ctx.fillStyle = '#1a0a1a';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#ab47bc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, S - 6, S - 6);
        this._drawArrow(ctx, x + hs, y + hs - 5, t.dir,            '#ab47bc', 5);
        this._drawArrow(ctx, x + hs, y + hs + 5, (t.dir + 1) % 4, '#ab47bc', 5);
        break;

      case 'painter':
        ctx.fillStyle = '#001a1e';
        ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.strokeStyle = '#26c6da';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, S - 6, S - 6);
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

    if (t.item) {
      this._drawShape(ctx, x + hs, y + hs, t.item.shape, t.item.color, S * 0.22);
    }
  }

  // Ghost preview drawn in grid-space (inside the ctx.translate block).
  _drawGhost(ctx) {
    if (!this._selectedType) return;
    const c = this._hoverC, r = this._hoverR;
    if (!this._inGrid(c, r)) return;
    const t = this._tile(c, r);
    const valid = this._canPlaceAt(this._selectedType, t);
    const x = c * TILE_SIZE, y = r * TILE_SIZE, S = TILE_SIZE, hs = S / 2;

    ctx.save();
    ctx.globalAlpha = 0.55;

    if (!valid) {
      // Red tint over the tile.
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      // X mark.
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + S - 6, y + S - 6);
      ctx.moveTo(x + S - 6, y + 6); ctx.lineTo(x + 6, y + S - 6);
      ctx.stroke();
    } else {
      // Draw a lightweight representation of the building being placed.
      const def = BUILDING_DEFS.find(d => d.type === this._selectedType);
      ctx.fillStyle = def ? def.color : '#ffffff';
      ctx.fillRect(x + 4, y + 4, S - 8, S - 8);
      // Direction arrow.
      if (this._selectedType !== 'hub') {
        ctx.globalAlpha = 1.0;
        this._drawArrow(ctx, x + hs, y + hs, this._selectedDir, '#ffffff', 7);
      }
      // Painter: show color swatch too.
      if (this._selectedType === 'painter') {
        ctx.fillStyle = SHAPE_COLORS[COLORS[this._painterColor]] || '#fff';
        ctx.beginPath();
        ctx.arc(x + hs, y + hs - 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Placement feedback rings drawn in grid-space.
  _drawRings(ctx) {
    for (const rg of this._rings) {
      const x = rg.c * TILE_SIZE + TILE_SIZE / 2;
      const y = rg.r * TILE_SIZE + TILE_SIZE / 2;
      const radius = TILE_SIZE * 0.5 * (1 + (1 - rg.alpha) * 0.6);
      ctx.save();
      ctx.globalAlpha = rg.alpha * 0.9;
      ctx.strokeStyle = rg.valid ? '#ffffff' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ----------------------------------------------------------------- HUD

  _drawHUD(ctx) {
    const W    = ctx.canvas.width;
    const hudH = 52;

    ctx.fillStyle = 'rgba(10,10,20,0.92)';
    ctx.fillRect(0, 0, W, hudH);

    // Goal strip.
    const goal = this._currentGoal();
    ctx.textBaseline = 'middle';

    if (goal) {
      ctx.fillStyle = '#9090a0';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('GOAL ' + (this._goalIdx + 1) + '/' + GOAL_SEQUENCE.length + ':', 16, 16);
      this._drawShape(ctx, 120, 16, goal.shape, goal.color, 7);
      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(
        goal.color.toUpperCase() + ' ' + goal.shape.toUpperCase() +
        '  ' + this._goalDelivered + ' / ' + goal.count,
        134, 16
      );
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

    // Building palette + controls panel below HUD bar.
    this._drawPalette(ctx, hudH);

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
        W / 2, hudH + 8
      );
      ctx.restore();
    }
  }

  _drawPalette(ctx, hudH) {
    const W = ctx.canvas.width;

    // Panel background strip.
    const panelH = 64;
    ctx.fillStyle = 'rgba(10,10,20,0.82)';
    ctx.fillRect(0, hudH, W, panelH);

    // Five building buttons.
    const btnW = 70, btnH = 44, btnY = hudH + 10;
    const startX = W - BUILDING_DEFS.length * (btnW + 4) - 16;

    for (let i = 0; i < BUILDING_DEFS.length; i++) {
      const def = BUILDING_DEFS[i];
      const bx  = startX + i * (btnW + 4);
      const sel = this._selectedType === def.type;

      ctx.fillStyle   = sel ? def.color : '#1e1e2e';
      ctx.fillRect(bx, btnY, btnW, btnH);
      ctx.strokeStyle = def.color;
      ctx.lineWidth   = sel ? 2.5 : 1;
      ctx.strokeRect(bx, btnY, btnW, btnH);

      ctx.fillStyle    = sel ? '#000' : def.color;
      ctx.font         = 'bold 11px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[' + def.key + '] ' + def.label.slice(0, 7), bx + btnW / 2, btnY + 14);

      // For non-hub buildings: show a small direction arrow inside the button.
      if (def.type !== 'hub') {
        const arrowColor = sel ? '#000000' : def.color;
        this._drawArrow(ctx, bx + btnW / 2, btnY + 32, this._selectedDir, arrowColor, 5);
      }

      // For painter: show color swatch.
      if (def.type === 'painter') {
        const swatchColor = SHAPE_COLORS[COLORS[this._painterColor]] || '#fff';
        ctx.fillStyle = swatchColor;
        ctx.beginPath();
        ctx.arc(bx + btnW - 10, btnY + 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = sel ? '#000' : '#555';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Controls legend: left of the buttons.
    const legendX = 16;
    const legendY = hudH + 12;
    ctx.fillStyle    = '#606070';
    ctx.font         = '12px monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    const selDef = BUILDING_DEFS.find(d => d.type === this._selectedType);
    if (selDef) {
      ctx.fillStyle = '#b0b0c0';
      ctx.fillText('Selected: ' + selDef.label, legendX, legendY);
      ctx.fillStyle = '#606070';
      ctx.fillText('R  rotate direction  (' + DIR_NAMES[this._selectedDir] + ')', legendX, legendY + 16);
      if (this._selectedType === 'painter') {
        const col = COLORS[this._painterColor];
        ctx.fillStyle = SHAPE_COLORS[col];
        ctx.fillText('Q  cycle color  (' + col.toUpperCase() + ')', legendX, legendY + 32);
        ctx.fillStyle = '#606070';
      }
      ctx.fillText('Right-click  demolish', legendX, legendY + (this._selectedType === 'painter' ? 48 : 32));
    } else {
      ctx.fillText('1-5  select building     R  rotate     Q  painter color', legendX, legendY);
      ctx.fillText('Left-click  place     Right-click  demolish     WASD  pan', legendX, legendY + 16);
    }
  }

  // ----------------------------------------------------------------- minimap

  _drawMinimap(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const MW = GRID_COLS * MINIMAP_TILE;
    const MH = GRID_ROWS * MINIMAP_TILE;
    const mx = W - MW - MINIMAP_PAD;
    const my = H - MH - MINIMAP_PAD;

    // Background.
    ctx.fillStyle = 'rgba(5,5,15,0.88)';
    ctx.fillRect(mx - 2, my - 2, MW + 4, MH + 4);
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 2, my - 2, MW + 4, MH + 4);

    // Tiles.
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this._tile(c, r);
        let col = null;
        switch (t.type) {
          case 'resource':  col = SHAPE_COLORS[t.color] || '#888'; break;
          case 'extractor': col = '#78909c'; break;
          case 'belt':      col = '#ffa726'; break;
          case 'splitter':  col = '#ab47bc'; break;
          case 'painter':   col = '#26c6da'; break;
          case 'hub':       col = '#66bb6a'; break;
          default: break;
        }
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(mx + c * MINIMAP_TILE, my + r * MINIMAP_TILE, MINIMAP_TILE, MINIMAP_TILE);
        }
      }
    }

    // Viewport rect overlay.
    const vx = mx + (-this._camX / TILE_SIZE) * MINIMAP_TILE;
    const vy = my + (-this._camY / TILE_SIZE) * MINIMAP_TILE;
    const vw = (this._game.canvas.width  / TILE_SIZE) * MINIMAP_TILE;
    const vh = (this._game.canvas.height / TILE_SIZE) * MINIMAP_TILE;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, Math.min(vw, MW), Math.min(vh, MH));

    // Label.
    ctx.fillStyle    = '#555566';
    ctx.font         = '10px monospace';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('MAP', W - MINIMAP_PAD, H - MINIMAP_PAD - MH - 4);
  }

  // ----------------------------------------------------------------- primitives

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
    ctx.fillStyle = SHAPE_COLORS[color] || '#ffffff';
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

  // ----------------------------------------------------------------- win

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
    ctx.fillText('Click or Enter to return to menu.', W / 2, H / 2 + 60);
  }
}
