// games/horses-teach-typing/scenes/htt-match.js
// Core gameplay scene. Drives a conductor clock, spawns letters at beat-locked
// times, judges player keypresses against the closest matching letter's
// targetTime, and renders the Oregon Trail style monochrome scene.
//
// Conductor model:
//   conductorTime starts at 0 on enter() and advances by dt each non-paused
//   frame. Letters are scheduled to be HIT at integer multiples of
//   beatInterval (one letter per beat at BPM). A letter spawned at time
//   targetTime - leadTime travels right-to-left, reaching the hit zone X
//   exactly at targetTime.
//
// Judgement windows (absolute |conductorTime - targetTime|):
//   perfect  <= 0.060s
//   great    <= 0.120s
//   good     <= 0.180s
//   miss     > 0.180s (or letter auto-missed by passing the hit zone)
//
// Scoring:
//   perfect 300, great 200, good 100, miss 0.
//   Combo increments on any non-miss, resets on miss.
//
// Input handling:
//   Each frame, for each alphabet key just-pressed, find the closest alive
//   letter with that character. If within any judgement window, mark it
//   judged with the appropriate label. Wrong-key or no-match keypresses are
//   ignored (lenient policy; the rhythm itself penalizes misses).
//
// Pause overlay:
//   Provides RESUME / AUDIO / RESTART / QUIT. Restart re-enters this scene.
//
// Signals:
//   htt_letter_dead { obj }  emitted by RhythmLetter when feedback ends;
//                            the scene removes the host GameObject.
//
// Depends on: Engine.Scene, Engine.GameObject, Engine.input, Engine.audio,
//   Engine.signals, RhythmLetter, PauseOverlay, HTTMenuScene.
// Used by: HTTMenuScene, bootstrap.

class HTTMatchScene extends Engine.Scene {
  constructor(game, options = {}) {
    super();
    this._game = game;

    // Rhythm parameters.
    this._bpm           = options.bpm ?? 90;
    this._beatInterval  = 60 / this._bpm;
    this._leadTime      = 2.0;       // seconds from spawn to hit-zone arrival
    this._beatsPerLetter = 1;        // one letter per beat for v1

    // Lane geometry.
    this._spawnX   = 780;
    this._hitZoneX = 240;
    this._laneY    = 250;

    // Conductor clock and spawn cursor.
    this.conductorTime = 0;
    this._nextSpawnBeat = 0;

    // Scoring state.
    this._score      = 0;
    this._combo      = 0;
    this._bestCombo  = 0;
    this._totalHits  = 0;
    this._totalNotes = 0;

    // Recent judgement banner.
    this._lastJudgement  = null;
    this._lastJudgementT = 0;

    // Judgement windows in seconds.
    this._windows = { perfect: 0.060, great: 0.120, good: 0.180 };

    // Scene infra.
    this._pause = null;
    this._unsubs = [];
    this._fadeIn = 1.0;
    this._pendingOut = null;
    this._fadeOutTimer = 0;

    // For the alphabet keypress loop in _handleInput.
    this._alphabet = 'abcdefghijklmnopqrstuvwxyz';
  }

  enter() {
    this.conductorTime  = 0;
    this._nextSpawnBeat = 0;
    this._score         = 0;
    this._combo         = 0;
    this._bestCombo     = 0;
    this._totalHits     = 0;
    this._totalNotes    = 0;
    this._lastJudgement = null;
    this._fadeIn        = 1.0;
    this._pendingOut    = null;
    this._fadeOutTimer  = 0;

    // Register SFX. Each call regenerates the procedural params, so sounds
    // vary slightly per match. That's acceptable; cheaper than chosen seeds.
    Engine.audio.register('htt-perfect', 'laserShoot');
    Engine.audio.register('htt-good',    'pickupCoin');
    Engine.audio.register('htt-miss',    'hitHurt');

    this._pause = new PauseOverlay(this._game, {
      onRestart: () => {
        this._pendingOut   = new HTTMatchScene(this._game);
        this._fadeOutTimer = 0;
      },
      onQuit: () => {
        this._pendingOut   = new HTTMenuScene(this._game);
        this._fadeOutTimer = 0;
      },
    });

    this._unsubs.push(
      Engine.signals.on('htt_letter_dead', ({ obj }) => {
        this.remove(obj);
      }),
    );
  }

  exit() {
    for (const u of this._unsubs) u();
    this._unsubs = [];
    this.objects.length = 0;
  }

  update(dt) {
    if (this._fadeIn > 0) this._fadeIn = Math.max(0, this._fadeIn - dt * 2.5);

    if (this._pendingOut) {
      this._fadeOutTimer += dt;
      if (this._fadeOutTimer >= 0.35) this._game.setScene(this._pendingOut);
      return;
    }

    this._pause.update(dt);
    if (this._pause.isPaused()) return;

    // Advance conductor.
    this.conductorTime += dt;

    // Spawn any letters whose spawnTime (= targetTime - leadTime) has now arrived.
    // Spawn-cursor walks beats; spawn when conductorTime + leadTime >= targetTime.
    while (true) {
      const targetTime = this._nextSpawnBeat * this._beatInterval * this._beatsPerLetter
                      + this._leadTime; // first letter targets at leadTime
      if (this.conductorTime + this._leadTime >= targetTime) {
        this._spawnLetter(targetTime);
        this._nextSpawnBeat++;
      } else break;
    }

    // Letter movement (handled by each RhythmLetter via scene.conductorTime).
    super.update(dt);

    // Player input.
    this._handleInput();

    // Auto-miss any letters that have passed the hit zone outside the good window.
    this._autoMissCheck();

    // Decay the recent-judgement banner.
    if (this._lastJudgement) {
      this._lastJudgementT += dt;
      if (this._lastJudgementT > 0.6) this._lastJudgement = null;
    }
  }

  _spawnLetter(targetTime) {
    const idx = Math.floor(Math.random() * this._alphabet.length);
    const ch  = this._alphabet.charAt(idx);
    const spawnTime = targetTime - this._leadTime;
    const obj = new Engine.GameObject(this._spawnX, this._laneY);
    obj.attach(new RhythmLetter(obj, {
      letter:    ch,
      spawnTime,
      targetTime,
      spawnX:    this._spawnX,
      hitZoneX:  this._hitZoneX,
      scene:     this,
    }));
    this.add(obj);
    this._totalNotes++;
  }

  _handleInput() {
    for (const ch of this._alphabet) {
      if (!Engine.input.wasJustPressed(ch)) continue;
      this._attemptHit(ch);
    }
  }

  /** Find the alive letter with this character closest to current conductor time.
   *  If within any judgement window, judge it. Out-of-window or no-match: ignore. */
  _attemptHit(ch) {
    let best = null;
    let bestDiff = Infinity;
    for (const obj of this.objects) {
      for (const s of obj.scripts) {
        if (s instanceof RhythmLetter && s.state === 'alive' && s.letter === ch) {
          const diff = Math.abs(this.conductorTime - s.targetTime);
          if (diff < bestDiff) { bestDiff = diff; best = s; }
        }
      }
    }
    if (!best) return;

    let judgement;
    if      (bestDiff <= this._windows.perfect) judgement = 'perfect';
    else if (bestDiff <= this._windows.great)   judgement = 'great';
    else if (bestDiff <= this._windows.good)    judgement = 'good';
    else return; // outside the lenient window: ignore (will auto-miss later)

    best.judge(judgement);
    this._onJudgement(judgement);
  }

  _autoMissCheck() {
    const cutoff = this._windows.good + 0.05;
    for (const obj of this.objects) {
      for (const s of obj.scripts) {
        if (s instanceof RhythmLetter && s.state === 'alive') {
          if (this.conductorTime > s.targetTime + cutoff) {
            s.judge('miss');
            this._onJudgement('miss');
          }
        }
      }
    }
  }

  _onJudgement(j) {
    const points = { perfect: 300, great: 200, good: 100, miss: 0 };
    this._score += points[j];
    if (j === 'miss') {
      this._combo = 0;
      Engine.audio.play('htt-miss');
    } else {
      this._combo++;
      this._bestCombo = Math.max(this._bestCombo, this._combo);
      this._totalHits++;
      Engine.audio.play(j === 'perfect' ? 'htt-perfect' : 'htt-good');
    }
    this._lastJudgement  = j;
    this._lastJudgementT = 0;
  }

  draw(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;

    // Background: solid black (Apple II monochrome).
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Distant mountains (decorative).
    this._drawMountains(ctx, W);

    // Trail / ground line.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 90);
    ctx.lineTo(W, H - 90);
    ctx.stroke();

    // Hit zone (vertical brackets, pulsing on each beat).
    this._drawHitZone(ctx);

    // Letters (delegated to scene base draw).
    super.draw(ctx);

    // Horse silhouette on the left, in front of the trail.
    this._drawHorse(ctx, 150, H - 90, this.conductorTime);

    // HUD: score, combo, last-judgement banner.
    this._drawHUD(ctx, W, H);

    // Pause overlay on top.
    this._pause.draw(ctx);

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

  _drawHitZone(ctx) {
    ctx.save();
    const x = this._hitZoneX;
    const cy = this._laneY;
    const half = 26;

    // Beat pulse: brighter on the beat, faded between beats.
    const beatPhase = (this.conductorTime % this._beatInterval) / this._beatInterval;
    const pulse = Math.max(0, 1 - beatPhase * 1.8); // peaks just after each beat
    const alpha = 0.55 + 0.45 * pulse;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2;

    // Left bracket
    ctx.beginPath();
    ctx.moveTo(x - 18, cy - half);
    ctx.lineTo(x - 26, cy - half);
    ctx.lineTo(x - 26, cy + half);
    ctx.lineTo(x - 18, cy + half);
    ctx.stroke();
    // Right bracket
    ctx.beginPath();
    ctx.moveTo(x + 18, cy - half);
    ctx.lineTo(x + 26, cy - half);
    ctx.lineTo(x + 26, cy + half);
    ctx.lineTo(x + 18, cy + half);
    ctx.stroke();

    ctx.restore();
  }

  _drawHorse(ctx, cx, groundY, t) {
    ctx.save();
    ctx.translate(cx, groundY);
    const bob = Math.sin(t * 1.8) * 1.5;
    ctx.fillStyle = '#ffffff';

    // Body
    ctx.beginPath();
    ctx.ellipse(0, -40 + bob * 0.3, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck (trapezoid via polygon)
    ctx.beginPath();
    ctx.moveTo(28, -50 + bob * 0.3);
    ctx.lineTo(48, -72 + bob);
    ctx.lineTo(56, -65 + bob);
    ctx.lineTo(34, -42 + bob * 0.3);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(56, -78 + bob, 14, 9, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Ear
    ctx.beginPath();
    ctx.moveTo(50, -88 + bob);
    ctx.lineTo(54, -96 + bob);
    ctx.lineTo(58, -86 + bob);
    ctx.closePath();
    ctx.fill();

    // Mane
    ctx.beginPath();
    ctx.moveTo(46, -71 + bob);
    ctx.lineTo(40, -78 + bob);
    ctx.lineTo(34, -68 + bob);
    ctx.lineTo(28, -75 + bob);
    ctx.lineTo(22, -62 + bob);
    ctx.lineTo(28, -56 + bob * 0.6);
    ctx.closePath();
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-38, -42);
    ctx.lineTo(-58, -36);
    ctx.lineTo(-56, -22);
    ctx.lineTo(-40, -32);
    ctx.closePath();
    ctx.fill();

    // Legs
    ctx.fillRect(-30, -22, 6, 22);
    ctx.fillRect(-14, -22, 6, 22);
    ctx.fillRect(10,  -22, 6, 22);
    ctx.fillRect(26,  -22, 6, 22);

    // Eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(60, -79 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawHUD(ctx, W, H) {
    ctx.save();
    ctx.textBaseline = 'top';

    // Top thin bar to ground HUD against background.
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, W, 28);

    // Score (left).
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE  ' + String(this._score).padStart(6, '0'), 12, 8);

    // Combo (right).
    const comboStr = this._combo > 0
      ? 'COMBO  x' + this._combo
      : 'COMBO  --';
    ctx.textAlign = 'right';
    ctx.fillText(comboStr, W - 12, 8);

    // Center: BPM.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888888';
    ctx.font = '12px monospace';
    ctx.fillText(this._bpm + ' BPM', W / 2, 9);

    // Bottom: pause hint.
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    ctx.fillText('ESC: pause', W - 6, H - 4);

    // Last judgement banner just above the hit zone.
    if (this._lastJudgement) {
      const alpha = Math.max(0, 1 - this._lastJudgementT / 0.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      let label;
      if      (this._lastJudgement === 'perfect') label = 'PERFECT';
      else if (this._lastJudgement === 'great')   label = 'GREAT';
      else if (this._lastJudgement === 'good')    label = 'GOOD';
      else                                        label = 'MISS';
      ctx.fillText(label, this._hitZoneX, this._laneY - 60);
      ctx.restore();
    }

    ctx.restore();
  }
}
