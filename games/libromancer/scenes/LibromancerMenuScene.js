// games/libromancer/scenes/LibromancerMenuScene.js
// ----------------------------------------------------------------
// Main menu for Libromancer.
// Depends on: Engine, LIBROMANCER_SPELLS, LibromancerCombatScene
// Used by: LibromancerCombatScene (back-navigation from game over / victory)
// ----------------------------------------------------------------

class LibromancerMenuScene extends Engine.Scene {
  constructor(game, preset) {
    super();
    this._game = game;
    this._preset = preset;
    this._W = preset.w;
    this._H = preset.h;

    this._unlocks = [];
    this._runs = 0;
    this._best = 0;

    this._startBtn = null;
    this._btnHover = false;
    this._wasMouseDown = false;
  }

  enter() {
    this._unlocks = Engine.storage.load('unlocks', []);
    this._runs   = Engine.storage.load('runs', 0);
    this._best   = Engine.storage.load('best', 0);
    this._buildLayout();
    // Consume any lingering mouse-down from previous scene transition.
    this._wasMouseDown = Engine.input.mouse.left;
  }

  _buildLayout() {
    const W = this._W, H = this._H;
    const btnW = Math.min(260, W * 0.5);
    const btnH = 50;
    this._startBtn = {
      x: W / 2 - btnW / 2,
      y: H * 0.6,
      w: btnW,
      h: btnH
    };
  }

  update(dt) {
    super.update(dt);
    const mouse = Engine.input.mouse;
    const justClicked = mouse.left && !this._wasMouseDown;
    this._wasMouseDown = mouse.left;

    const btn = this._startBtn;
    this._btnHover = mouse.x >= btn.x && mouse.x <= btn.x + btn.w &&
                     mouse.y >= btn.y && mouse.y <= btn.y + btn.h;

    if (justClicked && this._btnHover) {
      this._beginRun();
    }
  }

  _beginRun() {
    Engine.storage.save('runs', this._runs + 1);

    // Deck = all starter spells + permanently unlocked spells.
    const deck = Object.values(LIBROMANCER_SPELLS)
      .filter(function(s) {
        return s.starter || this._unlocks.indexOf(s.id) !== -1;
      }, this)
      .map(function(s) { return s.id; });

    const runState = {
      hp: 22,
      maxHp: 22,
      encounterIndex: 0,
      deck: deck
    };

    this._game.setScene(new LibromancerCombatScene(this._game, this._preset, runState));
  }

  draw(ctx) {
    super.draw(ctx);
    const W = this._W, H = this._H;

    // Background.
    ctx.fillStyle = '#1a1510';
    ctx.fillRect(0, 0, W, H);

    // Subtle shelf lines.
    ctx.strokeStyle = '#231a10';
    ctx.lineWidth = 1;
    for (let y = 70; y < H; y += 55) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title.
    ctx.fillStyle = '#c4a862';
    ctx.font = 'bold ' + Math.floor(H * 0.085) + 'px serif';
    ctx.fillText('LIBROMANCER', W / 2, H * 0.2);

    // Subtitle.
    ctx.fillStyle = '#6a5a3a';
    ctx.font = Math.floor(H * 0.035) + 'px serif';
    ctx.fillText('a card game in an abandoned library', W / 2, H * 0.31);

    // Stats row (only once a run has been started).
    if (this._runs > 0) {
      ctx.fillStyle = '#4a3a22';
      ctx.font = Math.floor(H * 0.028) + 'px monospace';
      ctx.fillText(
        'Runs: ' + this._runs + '   Best: enc ' + this._best + '/5   Spells: ' +
        (this._unlocks.length + 5) + ' known',
        W / 2, H * 0.43
      );
    }

    // Unlocked spell list.
    if (this._unlocks.length > 0) {
      var names = this._unlocks
        .filter(function(id) { return LIBROMANCER_SPELLS[id]; })
        .map(function(id) { return LIBROMANCER_SPELLS[id].name; });
      ctx.fillStyle = '#3a2e18';
      ctx.font = Math.floor(H * 0.024) + 'px monospace';
      ctx.fillText('Discovered: ' + names.join(', '), W / 2, H * 0.51);
    }

    // Begin Run button.
    var btn = this._startBtn;
    ctx.fillStyle = this._btnHover ? '#3e3328' : '#2a2218';
    ctx.strokeStyle = this._btnHover ? '#c4a862' : '#6a5428';
    ctx.lineWidth = this._btnHover ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this._btnHover ? '#e8d5a3' : '#c4a862';
    ctx.font = 'bold ' + Math.floor(btn.h * 0.42) + 'px serif';
    ctx.fillText('Begin Run', W / 2, btn.y + btn.h / 2);

    // Hint.
    ctx.fillStyle = '#2e2518';
    ctx.font = Math.floor(H * 0.024) + 'px monospace';
    ctx.fillText('Five encounters. Survive them all.', W / 2, H * 0.83);
  }
}
