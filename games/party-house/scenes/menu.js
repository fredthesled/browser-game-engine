// games/party-house/scenes/menu.js
// Title screen for Party House.
//
// Pictographic title with the high-score record loaded from Engine.storage.
// SPACE / ENTER / click anywhere to start a new run.
//
// Save state shape (key 'best'): { fewestDays: number|null, totalWins: number }
//
// Depends on: Engine.input, Engine.audio, Engine.storage, PHMatchScene.
// Used by: PHMatchScene (returns to this on win/lose).

class PHMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this.game = game;
    this.t    = 0;
    this.best = Engine.storage.load('best', { fewestDays: null, totalWins: 0 });
    this._prevMouseLeft = false;
  }

  enter() {
    Engine.audio.register('ph-start', 'blipSelect');
  }

  update(dt) {
    super.update(dt);
    this.t += dt;

    const mouseClick = !this._prevMouseLeft && Engine.input.mouse.left;
    this._prevMouseLeft = Engine.input.mouse.left;

    if (Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter') || mouseClick) {
      Engine.audio.play('ph-start');
      this.game.setScene(new PHMatchScene(this.game));
    }
  }

  draw(ctx) {
    super.draw(ctx);
    const W = ctx.canvas.width, H = ctx.canvas.height;

    // Background: deep purple night
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a0d2e');
    grad.addColorStop(1, '#2a1547');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative drifting "guests" in background
    this._drawBackgroundGuests(ctx, W, H);

    // House silhouette (pictographic)
    this._drawHouse(ctx, W / 2, H / 2 - 30);

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d76e';
    ctx.font = 'bold 60px monospace';
    ctx.fillText('PARTY HOUSE', W / 2, 90);

    ctx.fillStyle = '#c8b8e0';
    ctx.font = '16px monospace';
    ctx.fillText('throw the ultimate party within 25 days', W / 2, 130);
    ctx.fillText('four stars at one party wins the night', W / 2, 152);

    // Record panel
    const panelY = H / 2 + 110;
    if (this.best.fewestDays !== null || this.best.totalWins > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(W / 2 - 180, panelY - 28, 360, 70);
      ctx.strokeStyle = '#5a4880';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 180, panelY - 28, 360, 70);

      ctx.fillStyle = '#f5d76e';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('BEST RECORD', W / 2, panelY - 12);

      ctx.fillStyle = '#fff';
      ctx.font = '15px monospace';
      const daysTxt = this.best.fewestDays !== null
        ? `fewest days to win: ${this.best.fewestDays}`
        : 'fewest days to win: --';
      ctx.fillText(daysTxt, W / 2, panelY + 10);
      ctx.fillText(`total wins: ${this.best.totalWins || 0}`, W / 2, panelY + 30);
    }

    // Press prompt (blinking)
    if (Math.sin(this.t * 4) > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('press SPACE to start the night', W / 2, H - 50);
    }

    // Footer credit
    ctx.fillStyle = '#6a5a8a';
    ctx.font = '10px monospace';
    ctx.fillText('a study after UFO 50 #25 - PARTY HOUSE by mossmouth', W / 2, H - 18);
  }

  _drawHouse(ctx, cx, cy) {
    ctx.save();
    // House body
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(cx - 70, cy - 30, 140, 90);
    // Roof
    ctx.fillStyle = '#5a3a8a';
    ctx.beginPath();
    ctx.moveTo(cx - 85, cy - 30);
    ctx.lineTo(cx, cy - 75);
    ctx.lineTo(cx + 85, cy - 30);
    ctx.closePath();
    ctx.fill();
    // Door (warm glow)
    const doorGlow = 0.6 + 0.3 * Math.sin(this.t * 2);
    ctx.fillStyle = `rgba(245, 215, 110, ${doorGlow})`;
    ctx.fillRect(cx - 14, cy + 10, 28, 50);
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(cx + 8, cy + 34, 3, 3); // doorknob
    // Windows (flickering party light)
    const winGlow = 0.4 + 0.4 * Math.sin(this.t * 5 + 1);
    ctx.fillStyle = `rgba(180, 120, 220, ${winGlow})`;
    ctx.fillRect(cx - 50, cy - 10, 22, 22);
    ctx.fillRect(cx + 28, cy - 10, 22, 22);
    // Music notes floating up
    ctx.fillStyle = '#f5d76e';
    ctx.font = '16px monospace';
    for (let i = 0; i < 3; i++) {
      const phase = (this.t * 0.6 + i * 0.5) % 2;
      const ny = cy - 80 - phase * 50;
      const nx = cx - 40 + i * 40 + Math.sin(phase * 4) * 8;
      const alpha = 1 - phase / 2;
      ctx.globalAlpha = alpha;
      ctx.fillText(['♪', '♫', '♪'][i], nx, ny);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawBackgroundGuests(ctx, W, H) {
    // Small drifting silhouettes near the bottom -- "guests arriving"
    ctx.save();
    const colors = ['#8896a3', '#c46a6a', '#c9a14a', '#6fa86b', '#9c64a4'];
    for (let i = 0; i < 5; i++) {
      const phase = (this.t * 0.15 + i * 0.2) % 1;
      const gx = phase * W;
      const gy = H - 60 + Math.sin(phase * 8 + i) * 4;
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(gx, gy - 12, 6, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.fillRect(gx - 6, gy - 6, 12, 16); // body
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

window.PHMenuScene = PHMenuScene;
