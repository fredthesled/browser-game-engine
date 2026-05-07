// games/pong/scenes/pong-menu.js
// Title and start screen for Pong.
// Registers all game SFX (jsfxr presets are randomized, so each session
// gets fresh-sounding effects). Waits for Space or Enter to start the match.
// Depends on: Engine.Scene, Engine.input, Engine.audio.
// PongMatchScene must be defined before this file in the build (scenes load
// in order; this scene references PongMatchScene by name during transition).
// Used by: Pong bootstrap; PongMatchScene (transition back after game ends).

class PongMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
  }

  enter() {
    // Re-register each entry so SFX are fresh-sounding each play session.
    Engine.audio.register('paddle_hit',  'blipSelect');
    Engine.audio.register('wall_hit',    'blipSelect');
    Engine.audio.register('score',       'pickupCoin');
    Engine.audio.register('menu_select', 'blipSelect');
  }

  exit() {}

  update(_dt) {
    if (Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter')) {
      Engine.audio.play('menu_select');
      this._game.setScene(new PongMatchScene(this._game));
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 96px monospace';
    ctx.fillText('PONG', W / 2, H / 2 - 60);

    ctx.font = '24px monospace';
    ctx.fillText('PRESS SPACE OR ENTER TO PLAY', W / 2, H / 2 + 20);

    ctx.fillStyle = '#777777';
    ctx.font      = '16px monospace';
    ctx.fillText('ARROW KEYS or W / S  to move your paddle', W / 2, H / 2 + 72);
    ctx.fillText('FIRST TO 7 WINS', W / 2, H / 2 + 100);

    ctx.restore();
  }
}
