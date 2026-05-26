# Animation Config: `.anim.json` Sidecar Format

Every raster sprite sheet committed to a game's `assets/` folder should have a matching `.anim.json` sidecar. The sidecar is the single source of truth for how the sheet is sliced and how animations are mapped to frame sequences.

**Purpose:** Trevor edits the JSON; Claude reads it to generate or update `SpriteSheet` constructor calls. The file is small enough to paste directly into chat for ad-hoc adjustments without a GitHub fetch.

## File naming

Place the sidecar alongside the PNG in `games/<name>/assets/`:

```
games/clown-brawler/assets/gorilla-sheet.png
games/clown-brawler/assets/gorilla-sheet.anim.json
```

The sidecar's base name matches the PNG's base name. It is not committed to the manifest's `assets` array (it is not inlined into the build); it exists only as a communication artifact in the repo.

---

## Sprite sheet sidecar schema

```json
{
  "sheet": "gorilla-sheet",
  "frameW": 48,
  "frameH": 48,
  "scale": 2,
  "offsetX": 0,
  "offsetY": 0,
  "notes": "Optional freeform note to Claude, e.g. 'frame [4,2] is blank, skip it'.",
  "animations": {
    "idle": {
      "frames": [[0,0],[1,0]],
      "fps": 4,
      "loop": true
    },
    "walk": {
      "frames": [[0,1],[1,1],[2,1],[3,1]],
      "fps": 8,
      "loop": true
    },
    "attack": {
      "frames": [[0,2],[1,2],[2,2]],
      "fps": 12,
      "loop": false
    },
    "die": {
      "frames": [[0,3],[1,3],[2,3],[3,3]],
      "fps": 6,
      "loop": false
    }
  }
}
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sheet` | string | yes | The `ASSETS` key matching the PNG filename without extension. Claude uses this as the `src` argument. |
| `frameW` | number | yes | Width of a single frame in pixels on the source sheet. |
| `frameH` | number | yes | Height of a single frame in pixels on the source sheet. |
| `scale` | number | no | Draw-time scale multiplier. Default 1. Use 2 for a 24px sheet you want drawn at 48px. Applied in the SpriteSheet constructor or as a host `scale` value. |
| `offsetX` | number | no | Pixel offset to the first frame's left edge. Default 0. Non-zero when Kenney sheets have a margin before the grid starts. |
| `offsetY` | number | no | Pixel offset to the first frame's top edge. Default 0. |
| `notes` | string | no | Freeform instruction to Claude. Use for blank frames to skip, palette notes, or anything not captured by the schema. |
| `animations` | object | yes | Map of animation name to definition (see below). |

### Animation definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `frames` | `[[col, row], ...]` | yes | Ordered list of [column, row] pairs (zero-indexed from top-left). Claude translates these to `SpriteSheet` frame coordinates. |
| `fps` | number | yes | Playback speed. SpriteSheet converts this to a per-frame duration internally. |
| `loop` | boolean | yes | Whether the animation cycles. `false` means it stops on the last frame and `isDone()` becomes true. |

---

## Parallax / scrolling background schema

Scrolling backgrounds are defined in a separate sidecar, `parallax.anim.json`, at the game level. This file is also not inlined into the build; it tells Claude how to configure a `ParallaxBackground` script (see `scripts/_registry.md` once that script exists).

```json
{
  "notes": "Floor tiles repeat every 96px. Sky is static.",
  "layers": [
    {
      "asset": "bg-sky",
      "speedX": 0,
      "speedY": 0,
      "repeat": false
    },
    {
      "asset": "bg-hills",
      "speedX": 40,
      "speedY": 0,
      "repeat": true
    },
    {
      "asset": "bg-road",
      "speedX": 120,
      "speedY": 0,
      "repeat": true
    },
    {
      "asset": "floor-tiles",
      "speedX": 200,
      "speedY": 0,
      "repeat": true,
      "tileW": 96
    }
  ]
}
```

### Parallax layer fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset` | string | yes | `ASSETS` key for the layer image. |
| `speedX` | number | yes | Scroll speed in pixels per second. 0 = static. Positive = scrolls left (scene moving right). |
| `speedY` | number | no | Vertical scroll speed. Default 0. |
| `repeat` | boolean | yes | Whether the image tiles horizontally to fill the canvas. |
| `tileW` | number | no | Override tile width for repeat. Defaults to the image's natural width. Use when the image has padding or when a specific repeat boundary is wanted. |

The `ParallaxBackground` script reads a layers config array in its constructor. The sidecar is how Trevor specifies that config; Claude converts it into the constructor call.

---

## How to use these files

1. **Commit the PNG** to `games/<name>/assets/<sheet-name>.png` via GitHub web UI.
2. **Commit the sidecar** `<sheet-name>.anim.json` alongside it.
3. **Tell Claude in chat** what you want (e.g. "Wire up the gorilla sprite sheet") and paste or reference the sidecar. Claude reads the sidecar and generates the `SpriteSheet` constructor and the animation state logic.
4. **For adjustments**, edit the sidecar JSON and paste the changed block into chat: "Walk is now 12fps, attack got a new frame at [3,2]." Claude updates the source without needing to re-read unrelated code.

### How to find frame dimensions for a Kenney sheet

Kenney packs include a `preview.png` and usually a `sheet.png` with a consistent grid. Frame dimensions are in the pack's README or inferable from the preview image. Use [ezgif.com/sprite-cutter](https://ezgif.com/sprite-cutter) to upload the sheet, enter your guessed frame size, and preview the sliced frames before committing. Adjust until the frames align cleanly.
