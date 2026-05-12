// ============================================================================
// DEAD-FILE
// ----------------------------------------------------------------------------
// Status:      Inactive. Not loaded by any build. Do not maintain, modify, or
//              include in builds. This file is parked, awaiting deletion.
// Marked:      2026-05-12
// Reason:      Superseded by SurvivorsShopScene.
// Replacement: games/survivors/scenes/survivors-shop.js
// Disposal:    GitHub:delete_file requires an in-browser approval that is not
//              consistently available, so the file is annotated rather than
//              removed. Listed in docs/DEAD_FILES.md (disposal queue).
// Convention:  See docs/DEAD_FILES.md.
// ============================================================================
//
// Original contents preserved below for git history continuity.

// games/survivors/scenes/survivors-levelup.js
// Post-wave upgrade selection. Fades in from black (room transition illusion).
// Shows 3 random upgrade cards; Up/Down navigates, Space/Enter confirms.
// Applies chosen upgrade to shared stats, then transitions to next match level.
// Depends on: Engine.Scene, Engine.input.
//   SurvivorsMatchScene must be defined in build (transition target).
// Used by: SurvivorsMatchScene (on wave complete).

class SurvivorsLevelupScene extends Engine.Scene {
  constructor(game, options = {}) {
    super();
    this._game    = game;
    this._level   = options.level ?? 1;
    this._stats   = options.stats;
    this._kills   = options.kills ?? 0;
    this._cursor  = 0;
    this._choices = [];
    this._fade    = 1.0;
  }

  _nextBgColor() {
    const p = ['#050510','#051005','#100505','#050a10','#0d0510','#051010'];
    return p[this._level % p.length];
  }

  _upgradePool() {
    return [
      { label:'MAX HEALTH +25',      desc:'Increase max HP and fully heal.',          apply:(s)=>{ s.maxHealth+=25; s.currentHealth=s.maxHealth; } },
      { label:'SPEED +30',           desc:'Move faster.',                              apply:(s)=>{ s.speed+=30; } },
      { label:'FIRE RATE +20%',      desc:'Shoot more frequently.',                    apply:(s)=>{ s.fireRate=+(s.fireRate*1.2).toFixed(3); } },
      { label:'DAMAGE +10',          desc:'Each projectile deals more damage.',        apply:(s)=>{ s.damage+=10; } },
      { label:'MULTI-SHOT',          desc:'Fire one additional projectile.',           apply:(s)=>{ s.projectileCount+=1; } },
      { label:'PROJECTILE SIZE +2',  desc:'Slightly larger projectile hitbox.',        apply:(s)=>{ s.projectileSize+=2; } },
    ];
  }

  enter() {
    this._fade = 1.0; this._cursor = 0;
    this._choices = this._upgradePool().sort(() => Math.random() - 0.5).slice(0, 3);
  }
  exit() {}

  update(dt) {
    if (this._fade > 0) { this._fade = Math.max(0, this._fade - dt * 2.5); return; }
    if (Engine.input.wasJustPressed('ArrowUp'))   this._cursor = Math.max(0, this._cursor - 1);
    if (Engine.input.wasJustPressed('ArrowDown'))  this._cursor = Math.min(this._choices.length - 1, this._cursor + 1);
    if (Engine.input.wasJustPressed('Enter') || Engine.input.wasJustPressed(' ')) {
      this._choices[this._cursor].apply(this._stats);
      this._game.setScene(new SurvivorsMatchScene(this._game, { level: this._level + 1, stats: this._stats }));
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = this._nextBgColor(); ctx.fillRect(0, 0, W, H);
    if (this._fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this._fade})`; ctx.fillRect(0, 0, W, H); return; }
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 34px monospace';
    ctx.fillText('LEVEL ' + this._level + ' COMPLETE', W / 2, H / 2 - 145);
    ctx.fillStyle = '#888888'; ctx.font = '16px monospace';
    ctx.fillText('Kills: ' + this._kills + '   Choose an upgrade:', W / 2, H / 2 - 105);
    for (let i = 0; i < this._choices.length; i++) {
      const c = this._choices[i], sel = i === this._cursor;
      const cy = H / 2 - 38 + i * 84, cw = 500, ch = 70, cx = W / 2 - cw / 2;
      ctx.fillStyle   = sel ? '#1a2740' : '#0d1520'; ctx.fillRect(cx, cy - ch/2, cw, ch);
      ctx.strokeStyle = sel ? '#f1c40f' : '#2a3a50'; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(cx, cy - ch/2, cw, ch);
      ctx.fillStyle = sel ? '#f1c40f' : '#cccccc'; ctx.font = sel ? 'bold 20px monospace' : '18px monospace';
      ctx.fillText(c.label, W / 2, cy - 10);
      ctx.fillStyle = '#777777'; ctx.font = '13px monospace'; ctx.fillText(c.desc, W / 2, cy + 16);
    }
    ctx.fillStyle = '#444444'; ctx.font = '13px monospace';
    ctx.fillText('UP/DOWN to select   SPACE or ENTER to confirm', W / 2, H / 2 + 155);
    ctx.restore();
  }
}
