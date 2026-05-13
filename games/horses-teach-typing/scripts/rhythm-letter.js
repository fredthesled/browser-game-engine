// games/horses-teach-typing/scripts/rhythm-letter.js
// A single rhythm-game letter. Holds a target character, a target hit time, and
// a state machine: alive -> judged -> dead.
//
// Position is time-driven, not dt-driven. While alive, the letter's X is
// computed from the conductor time so that x === hitZoneX exactly when
// conductor.time === targetTime. This makes the game deterministic regardless
// of frame-rate jitter or skipped frames.
//
// When judged (either by player keypress or by auto-miss when conductor time
// passes target + window), the letter enters a brief feedback animation
// (floats upward, fades out), then signals removal via 'htt_letter_dead'.
//
// Signals emitted:
//   htt_letter_dead   { obj }   when feedback animation completes
//
// Depends on: Engine.Script, Engine.signals
// Used by: HTTMatchScene

class RhythmLetter extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.letter     = (options.letter || 'a').toLowerCase();
    this.spawnTime  = options.spawnTime  ?? 0;
    this.targetTime = options.targetTime ?? 0;
    this.spawnX     = options.spawnX     ?? 780;
    this.hitZoneX   = options.hitZoneX   ?? 240;
    this._scene     = options.scene      ?? null;

    this.state      = 'alive';   // alive | judged | dead
    this.judgement  = null;      // 'perfect' | 'great' | 'good' | 'miss'
    this._feedbackT = 0;
    this._feedbackDuration = 0.5;
    this._signalled = false;     // guard so we emit dead exactly once
  }

  /** Position-time function. x === hitZoneX exactly when now === targetTime. */
  positionAt(now) {
    const lead = this.targetTime - this.spawnTime;
    if (lead <= 0) return this.hitZoneX;
    const progress = (now - this.spawnTime) / lead; // 0 at spawn, 1 at target
    return this.spawnX + (this.hitZoneX - this.spawnX) * progress;
  }

  /** Mark this letter as judged. Caller picks one of perfect/great/good/miss. */
  judge(j) {
    if (this.state !== 'alive') return;
    this.state = 'judged';
    this.judgement = j;
    this._feedbackT = 0;
  }

  update(dt) {
    if (this.state === 'alive') {
      const now = this._scene ? this._scene.conductorTime : 0;
      this.host.x = this.positionAt(now);
    } else if (this.state === 'judged') {
      this._feedbackT += dt;
      this.host.y -= 40 * dt;
      if (this._feedbackT >= this._feedbackDuration) {
        this.state = 'dead';
        if (!this._signalled) {
          this._signalled = true;
          Engine.signals.emit('htt_letter_dead', { obj: this.host });
        }
      }
    }
  }

  draw(ctx) {
    if (this.state === 'dead') return;
    ctx.save();

    if (this.state === 'judged') {
      const a = 1 - (this._feedbackT / this._feedbackDuration);
      ctx.globalAlpha = Math.max(0, a);
      let label;
      if      (this.judgement === 'perfect') label = 'PERFECT';
      else if (this.judgement === 'great')   label = 'GREAT';
      else if (this.judgement === 'good')    label = 'GOOD';
      else                                   label = 'MISS';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);
    } else {
      // Alive: blocky white letter with a thin outline box to read as a card.
      const size = 30;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Tiny vertical offset so the glyph sits visually centered in the box.
      ctx.fillText(this.letter.toUpperCase(), 0, 2);
    }

    ctx.restore();
  }
}
