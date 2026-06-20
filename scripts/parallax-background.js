// scripts/parallax-background.js
// Scrolling multi-layer parallax background utility.
// Not a Script subclass — a plain class that scenes own and call directly,
// same pattern as PauseOverlay.
//
// Usage:
//   this._bg = new ParallaxBackground(game, [
//     { asset: 'bg-sky',      speedX: 0,   speedY: 0, repeat: false },
//     { asset: 'bg-hills',    speedX: 40,  speedY: 0, repeat: true  },
//     { asset: 'bg-road',     speedX: 120, speedY: 0, repeat: true  },
//     { asset: 'floor-tiles', speedX: 200, repeat: true, tileW: 96  },
//   ]);
//   // In scene update(dt):
//   this._bg.update(dt);
//   // In scene draw(ctx), before super.draw(ctx):
//   this._bg.draw(ctx);
//
// Layers is an array matching the parallax.anim.json sidecar schema.
// The `asset` field is an ASSETS key (data URI from the build pipeline);
// if ASSETS is not defined or the key is absent, the string is used as a URL.
//
// Layer fields:
//   asset   - ASSETS key for the image (required).
//   speedX  - Pixels per second. Positive = scrolls left. Default 0.
//   speedY  - Pixels per second. Positive = scrolls up. Default 0.
//             Only applied to non-repeating layers as a vertical pan.
//   repeat  - If true, tiles the image horizontally and scrolls with speedX.
//             If false, stretches the image to fill the canvas (static or vertical-pan).
//   tileW   - Override repeat tile width. Defaults to image's natural width.
//             Use when the image has right-edge padding to crop cleanly.
//
// Depends on: nothing (plain class, no Engine imports).
// Used by: game scenes that need scrolling multi-layer backgrounds.
// See docs/ANIM_CONFIG.md for the parallax.anim.json sidecar schema.

const _pbImageCache = new Map();

function _pbLoadImage(src) {
  if (_pbImageCache.has(src)) return _pbImageCache.get(src);
  const img = new Image();
  img.src = src;
  _pbImageCache.set(src, img);
  return img;
}

class ParallaxBackground {
  constructor(game, layers = []) {
    this._canvas = game.canvas;
    this._layers = layers.map(cfg => {
      // Prefer ASSETS data URI; fall back to raw string as URL.
      const src = (typeof ASSETS !== 'undefined' && ASSETS[cfg.asset])
        ? ASSETS[cfg.asset]
        : cfg.asset;
      return {
        img:     _pbLoadImage(src),
        speedX:  cfg.speedX  ?? 0,
        speedY:  cfg.speedY  ?? 0,
        repeat:  !!cfg.repeat,
        tileW:   cfg.tileW   ?? null,
        offsetX: 0,
        offsetY: 0,
      };
    });
  }

  /** Advance scroll offsets. Call each frame from the scene's update(dt). */
  update(dt) {
    for (const layer of this._layers) {
      layer.offsetX += layer.speedX * dt;
      layer.offsetY += layer.speedY * dt;
    }
  }

  /**
   * Draw all layers in back-to-front order. Call from the scene's draw(ctx)
   * before super.draw(ctx) so backgrounds render behind game objects.
   */
  draw(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.save();
    for (const layer of this._layers) {
      const img = layer.img;
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      if (layer.repeat) {
        // Tile horizontally. phase is how many pixels into a tile cycle we are;
        // startX is the left edge of the first tile, always <= 0 so the left
        // canvas edge is covered even at fractional offsets.
        const iw = layer.tileW ?? img.naturalWidth;
        const phase = layer.offsetX % iw;
        const startX = phase <= 0 ? phase : phase - iw;
        for (let x = startX; x < W; x += iw) {
          // Crop source to iw so tileW trimming (e.g. sheet padding) works cleanly.
          ctx.drawImage(img, 0, 0, iw, img.naturalHeight, x, 0, iw, H);
        }
      } else {
        // Non-repeating: stretch the image to W×H. offsetY lets a tall image
        // pan vertically (positive = image moves up; image must be taller than
        // the canvas for a seamless pan). offsetX is intentionally ignored for
        // non-repeat; use repeat:true for horizontal scrolling.
        ctx.drawImage(img, 0, -layer.offsetY, W, H);
      }
    }
    ctx.restore();
  }
}
