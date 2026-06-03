// ============================================================================
// engine/balance.js
// ============================================================================
// Tunable balance primitives: parameterized difficulty curves and cost
// scaling. Pure, stateless functions under Engine.Balance. Default constants
// follow the values supported by docs/resources/balance.md (see ADR-0019).
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
