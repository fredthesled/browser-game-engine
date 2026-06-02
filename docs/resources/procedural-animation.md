# Procedural Sprite Animation: Stateless Time-Function Pattern

First used in Libromancer (`games/libromancer/scenes/LibromancerCombatScene.js`, `_drawEnemySprite`).

## Core idea

A sprite is a pure function of wall-clock time. Given `t = Date.now() / 1000`, the drawing is fully deterministic with no per-frame state, no animation objects, and no sprite sheets. Any `draw(ctx)` method can call it without setup.

```javascript
function drawSprite(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);         // origin at sprite center
  const t  = Date.now() / 1000; // continuously increasing seconds
  const fl = Math.sin(t * 2.5) * 0.5 + 0.5; // 0..1 "flicker", ~2.5 Hz
  // ... draw using t and fl
  ctx.restore();
}
```

## Three primitive motions

### 1. Oscillation

```javascript
Math.sin(t * frequency + phaseOffset) * amplitude
```

Apply to x or y offsets for back-and-forth motion. Phase-offset repeated elements so they move sequentially rather than in lockstep:

```javascript
// Bookworm body segments -- each segment i is offset by i * 0.9 radians
const ox = Math.sin(t * 2.2 + i * 0.9) * 9;
```

### 2. Float / bob

A slow single-frequency sin applied to a vertical offset:

```javascript
// Forbidden Tome -- entire sprite bobs up and down
const bob = Math.sin(t * 1.4) * 6;
ctx.roundRect(-30, -22 + bob, 60, 44, 2);
```

### 3. Sway

A slow sin applied to horizontal offsets across a tall shape, with a per-part scalar so higher parts move further:

```javascript
// Archivist -- robe, head, arms all use sw with different scalars
const sw = Math.sin(t * 0.8) * 5;
ctx.moveTo(-22 + sw * 0.3, -40); // robe top (slight)
ctx.lineTo(-50 + sw, 5);         // arm end (full)
```

### Alpha / opacity pulse

Useful for ghosts and semi-transparent elements:

```javascript
// Shelf Spirit -- overall translucency pulses
const fl   = Math.sin(t * 2.5) * 0.5 + 0.5; // 0..1
const ghost = 0.5 + fl * 0.3;               // 0.5..0.8
ctx.fillStyle = 'rgba(90,110,170,' + ghost + ')';
```

## Per-enemy summary

| Enemy | Primary motion | Notes |
|---|---|---|
| Bookworm | Phase-offset oscillation per segment | Eye bobs with head segment |
| Dust Mite | Orbiting particles (polar coords + t) | Centre blob; no positional sway |
| Shelf Spirit | Full-body alpha pulse | No positional motion -- ghostly stillness |
| Forbidden Tome | Vertical bob | Chains use same bob offset; lag via different y anchor |
| Archivist | Robe/arm sway; eye flicker | Differential sway by height fakes pendulum mass |

## Known limitation

`Date.now()` is wall-clock time, not engine `dt`. Animations run at real-world speed during game pause. If pause-correct animation is needed, accumulate a local timer via `dt` in the scene's `update()` and pass it in instead of computing `t` inside the sprite function.

## Reuse recipe

1. `ctx.save()` / `ctx.translate(cx, cy)` to work in local coordinates.
2. Declare `const t = Date.now() / 1000` once at the top of the sprite function.
3. Derive any secondary values (`fl`, `bob`, `sw`) from `t` via `Math.sin`.
4. Draw primitives (arcs, rects, lines, paths) with `t`-driven offsets.
5. `ctx.restore()` to return to parent coordinate space.

No external dependencies, no state, compatible with any canvas draw call.
