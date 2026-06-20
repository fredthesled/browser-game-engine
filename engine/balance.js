// ============================================================================
// engine/balance.js
// ============================================================================
// Tunable balance primitives: parameterized difficulty curves and cost
// scaling. Pure, stateless functions under Engine.Balance. Default constants
// follow the values supported by docs/resources/balance.md (see ADR-0020).
//
// Depends on: nothing (pure math).
// Depended on by: game-specific scripts/scenes that ramp difficulty or price
//   upgrades. NOT used by the engine core; opt-in per game.
// ============================================================================

var Engine = Engine || {};

const Balance = {
  // --- Difficulty curves ----------------------------------------------------
  // difficulty(t, opts): difficulty/intensity as a function of progress t.
  // t is caller-defined (elapsed seconds, wave index, level, etc).
  // opts.type selects the family; default 'logistic' (slow start, steep
  // middle, bounded plateau), the general-purpose pacing curve.
  // For logistic, set opts.t0 to the progress midpoint; the default of 0
  // is structural only (it places you at L/2 at t=0).
  difficulty(t, opts = {}) {
    const type = opts.type || 'logistic';
    switch (type) {
      case 'linear':       // d0 + m*t
        return (opts.d0 ?? 0) + (opts.m ?? 1) * t;
      case 'exponential':  // d0 * r^t
        return (opts.d0 ?? 1) * Math.pow(opts.r ?? 1.1, t);
      case 'logarithmic':  // d0 + k*ln(1+t); rises to a soft max then flattens
        return (opts.d0 ?? 0) + (opts.k ?? 1) * Math.log(1 + t);
      case 'logistic':     // L / (1 + e^(-k*(t - t0)))
        return (opts.L ?? 1) / (1 + Math.exp(-(opts.k ?? 1) * (t - (opts.t0 ?? 0))));
      default:
        throw new Error(`Engine.Balance.difficulty: unknown curve type '${type}'`);
    }
  },

  // --- Cost scaling ---------------------------------------------------------
  // cost(n, opts): price of a purchase when you already own n units, base*rate^n.
  // So the first unit (n=0) costs base. rate in [1.07, 1.15] is the documented
  // band; default 1.10. Use ~1.15 for short sessions, ~1.07 for long-haul games.
  cost(n, opts = {}) {
    return (opts.base ?? 1) * Math.pow(opts.rate ?? 1.1, n);
  },

  // bulkCost(owned, count, opts): closed-form total to buy `count` units from
  // `owned`. Exact for fixed rate; replaces a loop.
  bulkCost(owned, count, opts = {}) {
    const base = opts.base ?? 1;
    const rate = opts.rate ?? 1.1;
    if (count <= 0) return 0;
    if (rate === 1) return base * count;
    return base * (Math.pow(rate, owned) * (Math.pow(rate, count) - 1)) / (rate - 1);
  },

  // maxAffordable(owned, currency, opts): how many units `currency` buys from
  // `owned`. Closed-form inverse of bulkCost.
  maxAffordable(owned, currency, opts = {}) {
    const base = opts.base ?? 1;
    const rate = opts.rate ?? 1.1;
    if (currency <= 0) return 0;
    if (rate === 1) return Math.floor(currency / base);
    const n = Math.log((currency * (rate - 1)) / (base * Math.pow(rate, owned)) + 1) / Math.log(rate);
    return Math.max(0, Math.floor(n));
  }
};

Engine.Balance = Balance;

// Engine.Balance.DDA — Dynamic Difficulty Adjustment controller.
// Stateful; construct one instance per session. Call observe(outcome) each
// round or frame (outcome: 1=success, 0=failure; fractional [0,1] for partial
// credit). Read .difficulty after each call; it is normalised to [0, 1] —
// scale it to your own parameter range.
//
// Design: EWMA smooths the noisy performance signal; proportional correction
// nudges difficulty toward the target success rate; the dead-zone ignores
// micro-fluctuations; the dwell gate requires the controller to stay in one
// direction for minDwell active observations before it is allowed to reverse,
// preventing the oscillation failure mode ("too-hard → too-easy → repeat").
// Adjust pacing (wave timing, spawn rate) before amplitude (damage numbers)
// — the Left 4 Dead principle.
//
// opts:
//   alpha    — EWMA smoothing factor; lower = slower to react (default 0.1)
//   target   — desired success rate in [0,1] (default 0.5)
//   K        — proportional gain; fraction of difficulty range per step (default 0.1)
//   deadZone — |error| below which no adjustment fires (default 0.1)
//   minDwell — active observations before direction reversal is permitted (default 10)
//   initial  — starting difficulty in [0,1] (default 0.5)
Engine.Balance.DDA = class {
  constructor(opts = {}) {
    this._alpha    = opts.alpha    ?? 0.1;
    this._target   = opts.target   ?? 0.5;
    this._K        = opts.K        ?? 0.1;
    this._deadZone = opts.deadZone ?? 0.1;
    this._minDwell = opts.minDwell ?? 10;
    this.difficulty = opts.initial ?? 0.5;
    this.score      = this._target;
    this._lastDir   = 0;
    this._dwell     = 0;
  }

  // Feed one observation. Returns the (possibly updated) difficulty.
  observe(outcome) {
    this.score = this._alpha * outcome + (1 - this._alpha) * this.score;
    const error = this.score - this._target;
    if (Math.abs(error) < this._deadZone) return this.difficulty;
    const dir = error > 0 ? 1 : -1;
    if (this._lastDir !== 0 && dir !== this._lastDir) {
      // Wants to reverse — require minDwell active observations in current direction first.
      if (++this._dwell < this._minDwell) return this.difficulty;
      this._dwell = 0;
    } else {
      this._dwell++;
    }
    this._lastDir = dir;
    this.difficulty = Math.max(0, Math.min(1, this.difficulty + this._K * error));
    return this.difficulty;
  }

  // Reset to initial state (e.g., between levels).
  reset(opts = {}) {
    this.difficulty = opts.initial ?? 0.5;
    this.score      = this._target;
    this._lastDir   = 0;
    this._dwell     = 0;
  }
};
