// scripts/pause-overlay.js
// Reusable pause overlay utility. Not a Script subclass -- a plain class that
// any scene owns and delegates to. Lives in scripts/ as the closest available
// folder; a utils/ folder may be warranted if more non-Script utilities appear.
//
// Usage in a scene:
//   this._pause = new PauseOverlay(game, {
//     onRestart: () => game.setScene(new MatchScene(game)),  // optional
//     onQuit:    () => game.setScene(new Menu(game)),        // optional
//   });
//   In update(dt): this._pause.update(dt); if (this._pause.isPaused()) return;
//   In draw(ctx): /* game draw */ this._pause.draw(ctx); // last, on top
//
// ESC toggles pause. Row layout (rows present only if their callback is provided):
//   RESUME
//   AUDIO    (volume + mute)
//   RESTART  (only if onRestart)
//   QUIT     (only if onQuit)
//
// Controls when paused:
//   Up/Down       navigate rows
//   Left/Right    adjust volume when on AUDIO row
//   M             toggle mute when on AUDIO row
//   Space/Enter   activate selected row
//   Escape        resume
//
// Depends on: Engine.input, Engine.audio.
// Used by: SurvivorsMatchScene, HTTMatchScene, and any future game scene.

class PauseOverlay {
  constructor(game, options = {}) {
    this._game      = game;
    this._paused    = false;
    this._onRestart = options.onRestart ?? null;
    this._onQuit    = options.onQuit    ?? null;
    this._cursor    = 0;
    this._rows      = this._buildRows();
  }

  /** Build the row layout based on which callbacks were provided. Each row is
   * { kind, label }. The 'volume' row's label is regenerated at draw time. */
  _buildRows() {
    const rows = [
      { kind: 'resume', label: 'RESUME' },
      { kind: 'volume', label: '' }, // regenerated dynamically
    ];
    if (this._onRestart) rows.push({ kind: 'restart', label: 'RESTART' });
    if (this._onQuit)    rows.push({ kind: 'quit',    label: 'QUIT TO MENU' });
    return rows;
  }

  toggle() { this._paused = !this._paused; if (!this._paused) this._cursor = 0; }
  isPaused() { return this._paused; }

  update(dt) {
    if (Engine.input.wasJustPressed('Escape')) { this.toggle(); return; }
    if (!this._paused) return;

    const n = this._rows.length;
    if (Engine.input.wasJustPressed('ArrowUp'))
      this._cursor = (this._cursor - 1 + n) % n;
    if (Engine.input.wasJustPressed('ArrowDown'))
      this._cursor = (this._cursor + 1) % n;

    const row = this._rows[this._cursor];

    if (row.kind === 'volume') {
      if (Engine.input.wasJustPressed('ArrowLeft'))
        Engine.audio.setVolume(+(Math.max(0, Engine.audio.getVolume() - 0.1)).toFixed(1));
      if (Engine.input.wasJustPressed('ArrowRight'))
        Engine.audio.setVolume(+(Math.min(1, Engine.audio.getVolume() + 0.1)).toFixed(1));
      if (Engine.input.wasJustPressed('m') || Engine.input.wasJustPressed('M'))
        Engine.audio.setMuted(!Engine.audio.isMuted());
    }

    if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
      if (row.kind === 'resume')  { this.toggle(); }
      else if (row.kind === 'restart' && this._onRestart) { this._paused = false; this._onRestart(); }
      else if (row.kind === 'quit'    && this._onQuit)    { this._paused = false; this._onQuit(); }
    }
  }

  draw(ctx) {
    if (!this._paused) return;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);

    // Panel height scales with row count so 4-row layouts don't crowd.
    const n  = this._rows.length;
    const pw = 420;
    const ph = 180 + n * 50;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2 - 16;
    ctx.fillStyle = '#111827'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px monospace';
    ctx.fillText('PAUSED', W / 2, py + 44);

    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 20, py + 72); ctx.lineTo(px + pw - 20, py + 72); ctx.stroke();

    const muted = Engine.audio.isMuted();
    const vol   = Math.round(Engine.audio.getVolume() * 10);
    const volStr = muted ? 'AUDIO  [MUTED]' : 'AUDIO  [' + '|'.repeat(vol) + ' '.repeat(10 - vol) + '] ' + vol + '/10';

    for (let i = 0; i < n; i++) {
      const row = this._rows[i];
      const ry  = py + 106 + i * 50, sel = i === this._cursor;
      if (sel) { ctx.fillStyle = 'rgba(241,196,15,0.10)'; ctx.fillRect(px + 12, ry - 20, pw - 24, 40); }
      ctx.fillStyle = sel ? '#f1c40f' : '#9ca3af';
      ctx.font      = sel ? 'bold 20px monospace' : '18px monospace';
      const label = row.kind === 'volume' ? volStr : row.label;
      ctx.fillText(label, W / 2, ry);
    }

    ctx.fillStyle = '#4b5563'; ctx.font = '11px monospace';
    ctx.fillText('UP/DOWN navigate   LEFT/RIGHT volume   M mute   ESC resume', W / 2, py + ph - 16);
    ctx.restore();
  }
}
