// games/survivors/scenes/survivors-menu.js
// Title screen for Survivors. Creates fresh stats on each new game.
// Fades in on enter; fades out before handing off to the match scene.
// Depends on: Engine.Scene, Engine.input.
//   SurvivorsMatchScene must be defined in build (transition target).
// Used by: Survivors bootstrap; SurvivorsMatchScene (back on death/quit).

class SurvivorsMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game     = game;
    this._fadeIn   = 1.0;
    this._pendingOut    = null;
    this._fadeOutTimer  = 0;
  }

  enter() {
    this._fadeIn        = 1.0;
    this._pendingOut    = null;
    this._fadeOutTimer  = 0;
  }
  exit() {}

  update(dt) {
    // Fade-out to next scene takes priority.
    if (this._pendingOut) {
      this._fadeOutTimer += dt;
      if (this._fadeOutTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }

    // Fade-in: decrement but don't block input (player may press immediately).
    if (this._fadeIn > 0) this._fadeIn = Math.max(0, this._fadeIn - dt * 2.5);

    if (Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter')) {
      this._pendingOut = new SurvivorsMatchScene(this._game, {
        level: 1,
        stats: {
          maxHealth:      100,
          currentHealth:  100,
          speed:          180,
          fireRate:       1.5,
          damage:         25,
          projectileCount:1,
          projectileSize: 6,
          playerSize:     20,
          canvasW:        800,
          canvasH:        600,
          range:          200,
          coins:          0,
          upgradeLevels:  {},
          magnetRange:    0,
        },
      });
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 72px monospace';
    ctx.fillText('SURVIVORS', W / 2, H / 2 - 90);
    ctx.fillStyle = '#ffffff'; ctx.font = '22px monospace';
    ctx.fillText('PRESS SPACE OR ENTER TO PLAY', W / 2, H / 2 - 10);
    ctx.fillStyle = '#666666'; ctx.font = '15px monospace';
    ctx.fillText('WASD or ARROW KEYS to move', W / 2, H / 2 + 44);
    ctx.fillText('Auto-shoots enemies within range', W / 2, H / 2 + 68);
    ctx.fillText('Collect coins, spend them in the shop', W / 2, H / 2 + 92);
    ctx.fillText('ESC to pause', W / 2, H / 2 + 116);
    ctx.restore();

    // Fade-in overlay
    if (this._fadeIn > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._fadeIn})`;
      ctx.fillRect(0, 0, W, H);
    }
    // Fade-out overlay
    if (this._pendingOut) {
      const a = Math.min(1, this._fadeOutTimer / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
