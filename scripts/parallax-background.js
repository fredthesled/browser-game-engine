// scripts/parallax-background.js
// Scrolling parallax background renderer. Draws layered images in screen space
// (independent of host position) to fill the canvas.
//
// Usage:
//   const bg = new ParallaxBackground(host, {
//     layers: [
//       { asset: 'bg-sky',   speedX:   0, speedY: 0, repeat: false },
//       { asset: 'bg-hills', speedX:  40, speedY: 0, repeat: true  },
//       { asset: 'bg-road',  speedX: 120, speedY: 0, repeat: true, tileW: 96 },
//     ]
//   });
//   host.attach(bg);
//
// Attach to a host that is added to the scene BEFORE other game objects so the
// background renders underneath them (engine draws in insertion order).
//
// Layer config fields (match parallax.anim.json sidecar schema):
//   asset   {string}  Key into the ASSETS global (filename without extension).
//   speedX  {number}  Horizontal scroll speed in pixels/second (positive = scrolls
//                     left, i.e. the scene appears to move right). 0 = static.
//   speedY  {number}  Vertical scroll speed in pixels/second. Default 0.
//   repeat  {boolean} Tile horizontally to fill the canvas.
//   tileW   {number}  Override tile width for repeat. Defaults to image natural width.
//
// Camera-driven scrolling (follow a moving camera):
//   Call bg.setCameraX(x) each frame from your scene's update(). Each layer's
//   effective scroll position becomes layer.speedX * cameraX / referenceSpeed,
//   where referenceSpeed is set in the constructor config. Calling setCameraX()
//   disables auto-scrolling for that frame (the two modes can coexist per layer
//   by mixing speedX=0 for driven layers and nonzero speedX for auto-scrolling
//   ones — but it's simpler to pick one mode per script instance).
//
// Depends on: Engine.Script
// Used by: any game that needs scrolling or layered backgrounds

const _pbImageCache = new Map();

function _pbLoad(key) {
  if (_pbImageCache.has(key)) return _pbImageCache.get(key);
  const img = new Image();
  // ASSETS is the global injected by the build pipeline (build-game.sh).
  // If undefined, the image simply never loads and the layer is skipped.
  if (typeof ASSETS !== 'undefined' && ASSETS[key]) {
    img.src = ASSETS[key];
  }
  _pbImageCache.set(key, img);
  return img;
}

class ParallaxBackground extends Engine.Script {
  // config.layers   {Array}  Layer definitions (see schema above).
  // config.referenceSpeed  {number}  Reference camera speed for setCameraX().
  //                         Defaults to 200. Only relevant when using camera-driven mode.
  constructor(host, config = {}) {
    super(host);

    this._referenceSpeed = config.referenceSpeed || 200;
    this._cameraX = null;  // null = auto-scroll mode

    this._layers = (config.layers || []).map(layer => ({
      asset:   layer.asset,
      speedX:  layer.speedX  ?? 0,
      speedY:  layer.speedY  ?? 0,
      repeat:  layer.repeat  ?? false,
      tileW:   layer.tileW   ?? null,
      img:     _pbLoad(layer.asset),
      scrollX: 0,
      scrollY: 0,
    }));
  }

  // Set the current camera X position for camera-driven parallax.
  // Call this each frame from your scene's update(). Each layer scrolls at a
  // fraction of the camera movement: layer.speedX / referenceSpeed * cameraX.
  setCameraX(x) {
    this._cameraX = x;
  }

  // ---- Engine lifecycle ----

  update(dt) {
    for (const layer of this._layers) {
      if (this._cameraX !== null) {
        // Camera-driven: position is proportional to cameraX.
        const factor = layer.speedX / this._referenceSpeed;
        layer.scrollX = this._cameraX * factor;
        layer.scrollY = 0;
      } else {
        // Auto-scroll: advance by speed * dt each frame.
        layer.scrollX += layer.speedX * dt;
        layer.scrollY += layer.speedY * dt;
      }
    }
    // Reset after each frame so caller must re-supply cameraX every update.
    this._cameraX = null;
  }

  draw(ctx) {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    ctx.save();
    // Reset transform: draw in screen space regardless of host position.
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (const layer of this._layers) {
      const img = layer.img;
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const iw = layer.tileW  || img.naturalWidth;
      const ih = img.naturalHeight;

      // Scale image to fill canvas height (maintaining aspect for non-repeating
      // layers; repeating layers are drawn at natural size unless tileW overrides width).
      const drawH = layer.repeat ? ih : ch;
      const drawW = layer.repeat ? iw : (iw * ch / ih);

      if (layer.repeat) {
        // Tile horizontally. scrollX wraps within iw so the seam is invisible.
        const offset = -((layer.scrollX % iw) + iw) % iw;
        // Draw enough tiles to fill the canvas width.
        for (let x = offset; x < cw; x += iw) {
          ctx.drawImage(img, 0, 0, img.naturalWidth, ih, x, 0, drawW, drawH);
        }
      } else {
        // Single image; draw centred or top-left depending on aspect.
        const x = -layer.scrollX;
        const y = -layer.scrollY;
        ctx.drawImage(img, 0, 0, img.naturalWidth, ih, x, y, drawW, drawH);
      }
    }

    ctx.restore();
  }
}
