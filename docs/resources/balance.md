# Balance math reference

Consolidated reference for difficulty, cost, and progression math used by
`Engine.Balance` (`engine/balance.js`) and by game authors. Consult this before
deriving balance formulas from scratch. The module and the balance-check
authoring step are recorded in ADR-0020; the underlying research is broader
than what is distilled here.

## When to use which formula

| Mechanic | Primitive / formula | Status |
|---|---|---|
| Difficulty ramp, wave intensity, level-up pacing | `difficulty(t)`, default logistic | implemented |
| Upgrade / building / unit pricing | `cost(n)`; bulk via `bulkCost`; affordability via `maxAffordable` | implemented |
| Armor, damage reduction, softcap | `reduce(x, k) = x/(x+k)` | deferred |
| Base attack vs defense | multiplicative `atk * k/(k+def)` | deferred |
| Proc / crit / drop with anti-streak | pseudo-random distribution plus pity timer | deferred |
| XP to next level | `xp(level, opts)` - cubic, quadratic, exponential | implemented |
| Auto difficulty from player performance | DDA controller (EWMA + proportional + dead-zone) | deferred |
| Prestige / reset reward | `prestige(lifetime, opts)` - cube-root or sqrt | implemented |

## Implemented primitives (`engine/balance.js`)

`Engine.Balance` is a namespace of pure, stateless functions. The engine core
does not use it; it is opt-in per game.

### `difficulty(t, opts)`

Difficulty or intensity as a function of progress `t` (caller-defined: elapsed
seconds, wave index, level). `opts.type` selects the family; default `logistic`.

- `linear`: `d0 + m*t`. Simplest; players tend to outpace it.
- `exponential`: `d0 * r^t`. Compounding; can run away if unchecked.
- `logarithmic`: `d0 + k*ln(1+t)`. Rises to a soft maximum then flattens.
- `logistic` (default): `L / (1 + e^(-k*(t - t0)))`. Slow start, steep middle,
  bounded plateau at `L`. Set `t0` to the progress midpoint; the default `t0` of
  0 is structural only (it places you at `L/2` at `t=0`).

### `cost(n, opts)`

Price of a purchase when you already own `n` units: `base * rate^n` (so the
first unit, `n=0`, costs `base`). `rate` defaults to 1.10; documented band is
1.07 (long-haul games) to 1.15 (short sessions). Exponential cost growth bakes
diminishing returns into each upgrade path.

### `bulkCost(owned, count, opts)`

Closed-form total to buy `count` units starting from `owned`:
`base * (rate^owned * (rate^count - 1)) / (rate - 1)`. Replaces a summation
loop; exact for fixed `rate`. Verified against brute-force summation and the
Clicker Heroes cost reference.

### `maxAffordable(owned, currency, opts)`

Closed-form inverse of `bulkCost`: how many units `currency` buys starting from
`owned`: `floor( log_rate( (currency*(rate-1)) / (base*rate^owned) + 1 ) )`.

All functions use nullish-coalescing defaults, so an explicit `0` (for example
`d0: 0`) is respected rather than overridden by the default.

### `xp(level, opts)`

XP required to advance FROM level `level` to `level+1` (1-indexed; level 1 is
the first playable level). Levels below 1 are clamped to 1.

- `cubic` (default): `base * level^3`. XP cost grows cubically - level 1 costs
  `base`, level 10 costs `100 * base`. Matches Pokemon's medium-fast curve.
- `quadratic`: `base * level^2`. Gentler; level 10 costs `10 * base`.
- `exponential`: `base * rate^(level-1)` (`rate` default 1.1). Each level costs
  ~10% more than the previous; matches the RuneScape growth shape for early
  levels. The same `rate` band as `cost()` (1.07-1.15) applies here.

Typical usage: compare `player.xp >= Engine.Balance.xp(player.level)` each
frame and level-up when the threshold is crossed.

### `prestige(lifetime, opts)`

Prestige points earned from `lifetime` total earnings. Formula:
`floor((lifetime / scale) ^ (1 / expo))`.

- `expo: 3` (default): cube-root. Prestige 1 at `scale`, 2 at `8*scale`,
  3 at `27*scale`. The cost of the x-th prestige point grows as x^3, matching
  Cookie Clicker's curve.
- `expo: 2`: square-root. Prestige 1 at `scale`, 2 at `4*scale`. Gentler,
  faster repeat prestige.
- `scale` defaults to `1`; set it to match your economy (e.g. `1e6` if the
  player accrues millions of coins before their first reset).

## Deferred primitives (roadmap)

Future increments extend `Engine.Balance`. Formulas are recorded here so the
next session does not re-derive them. Each is its own ADR and commit.

- **Diminishing returns / softcap / armor**: `reduce(x, k) = x / (x + k)`. `k`
  is the value of `x` at which the effect reaches 50%. Under this form,
  effective health `HP / (1 - DR)` is linear in armor, so each armor point adds
  a constant amount of survivability.
- **Multiplicative damage**: `damage = atk * k / (k + def)` (`k` default 100).
  Never reaches zero and has smooth diminishing returns. Additive alternative
  `max(1, atk - def)` suits tactical games but is brittle (high defense drives
  damage to zero).
- **Pseudo-random distribution (anti-streak proc)**: on the N-th attempt since
  the last success, `P(N) = C * N`, rising to 1; choose `C` so the long-run
  rate equals the nominal probability `p`. Reduces streakiness while preserving
  the mean. A pity timer is the limiting case (guaranteed after a maximum
  number of failures). Prerequisite: `Engine.PRNG` (in flight, PR #9).
- **Dynamic difficulty adjustment (DDA)**: smooth the performance signal with an
  EWMA `score = a*obs + (1-a)*score` (`a` ~ 0.1); correct proportionally
  `difficulty += K * (target - score)` (`target` ~ 0.5, `K` ~ 0.1 of the
  difficulty range); apply a dead-zone (~0.1) and a minimum dwell time before
  reversing direction, to prevent oscillation. Oscillation (retuning from
  too-hard to no-challenge and back) is the overcorrection failure mode this
  whole effort targets. Adjust pacing before amplitude (the Left 4 Dead
  principle).

## Key constants and rationale

- **Cost growth 1.07-1.15**: produces affordable early purchases and
  meaningful-but-not-prohibitive later ones. Clicker Heroes uses 1.07, Cookie
  Clicker 1.15. The default 1.10 is the midpoint.
- **Logistic for difficulty**: bounds maximum difficulty (the plateau) while
  front-loading an easy onboarding, which is the general-purpose pacing shape.
- **DDA target ~0.5 success**: a flow-channel engineering convention, not a
  proven enjoyment optimum.

## Caveats

- The 50% success target is a starting point, not a guaranteed optimum; at
  least one study found the system closest to 50% was not the one players rated
  most enjoyable. Tune against retention.
- Variable-ratio reward schedules (loot, gacha) are psychologically akin to
  gambling and are regulated in some jurisdictions. Expose rarity parameters
  transparently and use them ethically.
- The cost-growth band and the cube-root prestige curve are conventions drawn
  from successful titles, not theoretical optima. Validate with simulation and
  telemetry for any specific game.
