// ============================================================================
// games/drift/scenes/game-over.js
// ============================================================================
//
// DriftGameOverScene — Win or loss screen shown at the end of a run.
//
// Constructor args:
//   game       — the Engine.Game instance
//   outcome    — 'win' | 'loss_hull' | 'loss_crew'
//   finalHull  — hull integrity at run end (integer 0–10)
//   finalCrew  — active crew count at run end (integer 0–8)
//
// Depends on: Engine.Scene, Engine.audio, Engine.input
// Registered in: scenes/_registry.md
//
// ============================================================================

class DriftGameOverScene extends Engine.Scene {
  constructor(game, outcome, finalHull, finalCrew) {
    super();
    this._game      = game;
    this._outcome   = outcome;   // 'win' | 'loss_hull' | 'loss_crew'
    this._hull      = finalHull;
    this._crew      = finalCrew;
    this._btnRect   = null;
    this._prevLeft  = false;
    this._prevHover = false;
  }

  enter() {
    Engine.audio.register('blip',    'blipSelect');
    Engine.audio.register('confirm', 'powerUp');
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
      this._game.setScene(new DriftMenuScene(this._game));
    }
    this._prevLeft = m.left;
  }

  draw(ctx) {
    const W   = ctx.canvas.width;
    const H   = ctx.canvas.height;
    const win = this._outcome === 'win';

    // Background
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // Outcome header
    const headSize = Math.max(28, Math.floor(H * 0.09));
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = `bold ${headSize}px monospace`;

    if (win) {
      ctx.fillStyle = '#48c870';
      ctx.fillText('THRESHOLD REACHED', W / 2, H * 0.27);
    } else {
      ctx.fillStyle = '#c84040';
      const msg = this._outcome === 'loss_crew' ? 'NO CREW REMAINING' : 'HULL BREACH';
      ctx.fillText(msg, W / 2, H * 0.27);
    }

    // Final stats
    const statSize = Math.max(12, Math.floor(H * 0.036));
    ctx.font      = `${statSize}px monospace`;
    ctx.fillStyle = '#606075';
    ctx.fillText(`hull integrity  ${this._hull} / 10`, W / 2, H * 0.44);
    ctx.fillText(`crew remaining  ${this._crew} / 4`,  W / 2, H * 0.52);

    // Flavor line
    const flavorSize = Math.max(10, Math.floor(H * 0.026));
    ctx.font      = `${flavorSize}px monospace`;
    ctx.fillStyle = '#303045';
    const flavor  = win
      ? 'the Rim remembers those who arrive'
      : 'the crossing does not forgive every mistake';
    ctx.fillText(flavor, W / 2, H * 0.62);

    // Return button
    const bw = Math.max(160, Math.floor(W * 0.26));
    const bh = Math.max(36,  Math.floor(H * 0.07));
    const bx = Math.floor(W / 2 - bw / 2);
    const by = Math.floor(H * 0.72);
    this._btnRect = { x: bx, y: by, w: bw, h: bh };

    const hover = Engine.input.mouse.x >= bx && Engine.input.mouse.x <= bx + bw &&
                  Engine.input.mouse.y >= by && Engine.input.mouse.y <= by + bh;

    ctx.fillStyle   = hover ? '#282870' : '#141440';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = hover ? '#8080d0' : '#383870';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    const btnSize    = Math.max(12, Math.floor(H * 0.036));
    ctx.font         = `${btnSize}px monospace`;
    ctx.fillStyle    = hover ? '#e0e8ff' : '#8888b8';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RETURN TO MENU', W / 2, by + bh / 2);

    super.draw(ctx);
  }
}
