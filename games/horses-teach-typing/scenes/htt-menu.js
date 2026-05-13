// games/horses-teach-typing/scenes/htt-menu.js
// Title screen for Horses Teach Typing. Pictographic-first layout: minimal
// English beyond the title. A horse silhouette anchors the left, a
// demonstrative mini-diagram shows letters moving toward a hit zone, and a
// blinking SPACE pictograph at the bottom communicates "press space to begin".
//
// SPACE or ENTER advances to HTTMatchScene with a brief fade-out.
//
// Depends on: Engine.Scene, Engine.input.
//   HTTMatchScene must be defined in the build (transition target).
// Used by: bootstrap; HTTMatchScene (back via pause -> quit).

class HTTMenuScene extends Engine.Scene {
  constructor(game) {
    super();
    this._game = game;
    this._t = 0;
    this._fadeIn = 1.0;
    this._pendingOut = null;
    this._fadeOutTimer = 0;
    this._demoT = 0;
  }

  enter() {
    this._t = 0;
    this._fadeIn = 1.0;
    this._pendingOut = null;
    this._fadeOutTimer = 0;
    this._demoT = 0;
  }
  exit() {}

  update(dt) {
    this._t += dt;
    this._demoT += dt;

    if (this._pendingOut) {
      this._fadeOutTimer += dt;
      if (this._fadeOutTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }
    if (this._fadeIn > 0) this._fadeIn = Math.max(0, this._fadeIn - dt * 2.5);

    if (Engine.input.wasJustPressed(' ') || Engine.input.wasJustPressed('Enter')) {
      this._pendingOut = new HTTMatchScene(this._game);
    }
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;

    // Black background (Apple II Oregon Trail palette: white on black).
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Distant mountain silhouette across top half (decorative).
    this._drawMountains(ctx, W);

    // Trail / ground line.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 90);
    ctx.lineTo(W, H - 90);
    ctx.stroke();

    // Title text.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('HORSES TEACH TYPING', W / 2, 70);
    // Subtle horizontal rule under title.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 240, 96);
    ctx.lineTo(W / 2 + 240, 96);
    ctx.stroke();
    ctx.restore();

    // Horse silhouette on the left, in front of the trail.
    this._drawHorse(ctx, 150, H - 90, this._t);

    // Mini mechanic demo: letters approaching a hit zone.
    this._drawDemo(ctx, W, H);

    // Blinking SPACE pictograph (bottom-center).
    this._drawSpaceBar(ctx, W, H);

    // Fade overlays.
    if (this._fadeIn > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this._fadeIn})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this._pendingOut) {
      const a = Math.min(1, this._fadeOutTimer / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Distant jagged mountain silhouette, drawn as a single stroked polyline.
   *  Apple II vibe: 1-bit lines, no shading. */
  _drawMountains(ctx, W) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const peaks = [
      [0, 200], [60, 170], [120, 195], [180, 145], [240, 180], [320, 155],
      [400, 190], [480, 140], [560, 175], [640, 160], [720, 195], [800, 175],
    ];
    ctx.moveTo(peaks[0][0], peaks[0][1]);
    for (let i = 1; i < peaks.length; i++) ctx.lineTo(peaks[i][0], peaks[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  /** Horse silhouette, side profile facing right. Drawn as filled white shapes
   *  centered on (cx, groundY). Slight head-bob on time t for life. */
  _drawHorse(ctx, cx, groundY, t) {
    ctx.save();
    ctx.translate(cx, groundY);
    const bob = Math.sin(t * 1.8) * 1.5;
    ctx.fillStyle = '#ffffff';

    // Body (rounded rectangle approximated with ellipse).
    ctx.beginPath();
    ctx.ellipse(0, -40 + bob * 0.3, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck (trapezoid via polygon).
    ctx.beginPath();
    ctx.moveTo(28, -50 + bob * 0.3);
    ctx.lineTo(48, -72 + bob);
    ctx.lineTo(56, -65 + bob);
    ctx.lineTo(34, -42 + bob * 0.3);
    ctx.closePath();
    ctx.fill();

    // Head (rounded shape).
    ctx.beginPath();
    ctx.ellipse(56, -78 + bob, 14, 9, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Ear.
    ctx.beginPath();
    ctx.moveTo(50, -88 + bob);
    ctx.lineTo(54, -96 + bob);
    ctx.lineTo(58, -86 + bob);
    ctx.closePath();
    ctx.fill();

    // Mane (small jagged shape from neck top backward).
    ctx.beginPath();
    ctx.moveTo(46, -71 + bob);
    ctx.lineTo(40, -78 + bob);
    ctx.lineTo(34, -68 + bob);
    ctx.lineTo(28, -75 + bob);
    ctx.lineTo(22, -62 + bob);
    ctx.lineTo(28, -56 + bob * 0.6);
    ctx.closePath();
    ctx.fill();

    // Tail (curved triangle).
    ctx.beginPath();
    ctx.moveTo(-38, -42);
    ctx.lineTo(-58, -36);
    ctx.lineTo(-56, -22);
    ctx.lineTo(-40, -32);
    ctx.closePath();
    ctx.fill();

    // Legs (four rectangles to the ground).
    ctx.fillRect(-30, -22, 6, 22);
    ctx.fillRect(-14, -22, 6, 22);
    ctx.fillRect(10,  -22, 6, 22);
    ctx.fillRect(26,  -22, 6, 22);

    // Eye (black dot on the white head).
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(60, -79 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** Mini demonstration of the core mechanic: three letters approaching a hit
   *  zone, with a bracket pictograph indicating where to press. Continuously
   *  animates so the player can read the rule visually. */
  _drawDemo(ctx, W, H) {
    ctx.save();
    const cy = H / 2 + 10;
    const hitX = W / 2 - 110;
    const period = 2.4;
    const tphase = (this._demoT % period) / period; // 0..1

    // Brackets at the hit zone.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const bracketSize = 22;
    // Left bracket
    ctx.beginPath();
    ctx.moveTo(hitX - 18, cy - bracketSize);
    ctx.lineTo(hitX - 26, cy - bracketSize);
    ctx.lineTo(hitX - 26, cy + bracketSize);
    ctx.lineTo(hitX - 18, cy + bracketSize);
    ctx.stroke();
    // Right bracket
    ctx.beginPath();
    ctx.moveTo(hitX + 18, cy - bracketSize);
    ctx.lineTo(hitX + 26, cy - bracketSize);
    ctx.lineTo(hitX + 26, cy + bracketSize);
    ctx.lineTo(hitX + 18, cy + bracketSize);
    ctx.stroke();

    // Three trailing letters moving right-to-left. Spaced one phase apart.
    const letters = ['A', 'S', 'D'];
    const spawnX = W / 2 + 180;
    const range  = spawnX - hitX + 90; // a bit past so they exit smoothly
    for (let i = 0; i < 3; i++) {
      const p = ((tphase + i * 0.33) % 1);
      const x = spawnX - p * range;
      ctx.save();
      ctx.translate(x, cy);
      const size = 28;
      const inHit = Math.abs(x - hitX) < 4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = inHit ? 3 : 2;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letters[i], 0, 2);
      ctx.restore();
    }
    ctx.restore();
  }

  /** Blinking SPACE pictograph: a wide outlined rectangle with "SPACE" label.
   *  Blinks once per second to signal "press this". */
  _drawSpaceBar(ctx, W, H) {
    ctx.save();
    const cx = W / 2;
    const cy = H - 50;
    const bw = 240, bh = 32;
    const blink = (Math.floor(this._t * 2) % 2) === 0;
    ctx.strokeStyle = blink ? '#ffffff' : '#666666';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
    ctx.fillStyle = blink ? '#ffffff' : '#666666';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPACE', cx, cy + 1);
    ctx.restore();
  }
}
