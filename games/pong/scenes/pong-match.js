// games/pong/scenes/pong-match.js
// Core match scene for Pong: two paddles, one ball, score tracking, and win detection.
// Depends on: Engine.Scene, Engine.GameObject, Engine.signals, Engine.audio,
//             RectRenderer, Collider, PongBall, PongPaddlePlayer, PongAI.
// PongMenuScene must also be defined (used for the win-state transition back).
// Used by: PongMenuScene (via setScene on start), Pong bootstrap.

class PongMatchScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;

    // Layout constants. Match these in the HTML bootstrap canvas dimensions.
    this.CANVAS_W     = 800;
    this.CANVAS_H     = 600;
    this.PADDLE_W     = 14;
    this.PADDLE_H     = 90;
    this.BALL_SIZE    = 12;
    this.BALL_SPEED   = 280;
    this.PLAYER_SPEED = 340;
    this.AI_SPEED     = 250;
    this.WIN_SCORE    = 7;

    this._leftScore   = 0;
    this._rightScore  = 0;
    this._winner      = null;  // null | 'PLAYER' | 'COMPUTER'
    this._returnTimer = 0;
    this._unsubscribers = [];
  }

  enter() {
    this._leftScore  = 0;
    this._rightScore = 0;
    this._winner     = null;

    // Ball (also acts as its own collider per ADR-0010).
    this._ballObj    = new Engine.GameObject(this.CANVAS_W / 2, this.CANVAS_H / 2);
    this._ballScript = new PongBall(this._ballObj, {
      width:        this.BALL_SIZE,
      height:       this.BALL_SIZE,
      speed:        this.BALL_SPEED,
      canvasWidth:  this.CANVAS_W,
      canvasHeight: this.CANVAS_H,
    });
    this._ballObj.attach(this._ballScript);
    this.add(this._ballObj);

    // Player paddle (left side).
    this._playerObj = new Engine.GameObject(30, this.CANVAS_H / 2);
    this._playerObj.attach(new RectRenderer(this._playerObj, {
      width:  this.PADDLE_W,
      height: this.PADDLE_H,
      color:  '#ffffff',
    }));
    this._playerObj.attach(new PongPaddlePlayer(this._playerObj, {
      speed:        this.PLAYER_SPEED,
      paddleHeight: this.PADDLE_H,
      canvasHeight: this.CANVAS_H,
    }));
    this._playerObj.attach(new Collider(this._playerObj, {
      width:  this.PADDLE_W,
      height: this.PADDLE_H,
      tag:    'paddle',
    }));
    this.add(this._playerObj);

    // AI paddle (right side).
    this._aiObj = new Engine.GameObject(this.CANVAS_W - 30, this.CANVAS_H / 2);
    this._aiObj.attach(new RectRenderer(this._aiObj, {
      width:  this.PADDLE_W,
      height: this.PADDLE_H,
      color:  '#ffffff',
    }));
    this._aiObj.attach(new PongAI(this._aiObj, {
      speed:        this.AI_SPEED,
      paddleHeight: this.PADDLE_H,
      canvasHeight: this.CANVAS_H,
      ball:         this._ballObj,
    }));
    this._aiObj.attach(new Collider(this._aiObj, {
      width:  this.PADDLE_W,
      height: this.PADDLE_H,
      tag:    'paddle',
    }));
    this.add(this._aiObj);

    // Score tracking. Unsubscribed in exit() to prevent ghost listeners.
    this._unsubscribers.push(
      Engine.signals.on('ball_scored', ({ side }) => {
        if (this._winner) return;
        if (side === 'left')  this._leftScore++;
        else                  this._rightScore++;
        Engine.audio.play('score');
        if (this._leftScore  >= this.WIN_SCORE ||
            this._rightScore >= this.WIN_SCORE) {
          this._winner      = this._leftScore >= this.WIN_SCORE ? 'PLAYER' : 'COMPUTER';
          this._returnTimer = 3.5;
        }
      })
    );
  }

  exit() {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    this.objects.length = 0;
  }

  update(dt) {
    // Once someone wins, freeze game logic and wait for input or timer.
    if (this._winner) {
      this._returnTimer -= dt;
      if (this._returnTimer <= 0
          || Engine.input.wasJustPressed(' ')
          || Engine.input.wasJustPressed('Enter')) {
        this._game.setScene(new PongMenuScene(this._game));
      }
      return;
    }
    super.update(dt);
  }

  draw(ctx) {
    const W = this.CANVAS_W;
    const H = this.CANVAS_H;

    // Background.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Center dashed divider.
    ctx.save();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth   = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Score and player labels.
    ctx.save();
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#444444';
    ctx.font      = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', W / 2 - 90, 12);
    ctx.fillText('CPU', W / 2 + 90, 12);

    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 56px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(this._leftScore,  W / 2 - 36, 16);
    ctx.textAlign = 'left';
    ctx.fillText(this._rightScore, W / 2 + 36, 16);
    ctx.restore();

    // GameObjects (paddles and ball).
    super.draw(ctx);

    // Win overlay drawn on top of everything.
    if (this._winner) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffffff';
      ctx.font      = 'bold 64px monospace';
      ctx.fillText(this._winner + ' WINS', W / 2, H / 2 - 40);

      ctx.fillStyle = '#888888';
      ctx.font      = '22px monospace';
      ctx.fillText('SPACE or ENTER to continue', W / 2, H / 2 + 30);
      ctx.restore();
    }
  }
}
