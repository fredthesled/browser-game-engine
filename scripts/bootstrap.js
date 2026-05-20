// ============================================================================
// scripts/bootstrap.js
// ============================================================================
//
// bootstrapGame(options) - canonical game bootstrap helper.
//
// Consolidates the boilerplate that every build/<game>.html's <script> tail
// currently repeats: viewport-aware canvas sizing per ADR-0017, touch
// capability detection, optional context-menu suppression (for right-click
// games), Engine.Game construction with optional gameName for namespaced
// storage, initial scene set via a factory, and game start.
//
// Depends on:
//   Engine.Game (engine/game.js). The engine bundle must be loaded before
//   this script in the build concatenation order.
//
// Depended on by:
//   Game build bootstrap snippets. Replaces the inline IIFE that previously
//   appeared at the end of each build/<game>.html. Adoption is per-build:
//   existing builds continue to work with their inline bootstrap until each
//   is naturally regenerated. Drift v1 is the planned first build to adopt
//   the helper from the start; existing games migrate when next touched.
//
// Usage (Minesweeper-style, current inline form for comparison):
//   (function () {
//     const canvas = document.getElementById('game');
//     const preset = { w: 900, h: 600 };
//     canvas.width = preset.w; canvas.height = preset.h;
//     // fitToViewport, resize listener, canvas.oncontextmenu, etc.
//     const game = new Engine.Game(canvas, { gameName: 'minesweeper' });
//     game.setScene(new MinesweeperMenuScene(game));
//     game.start();
//   })();
//
// Equivalent with bootstrapGame:
//   bootstrapGame({
//     gameName: 'minesweeper',
//     presets: { regular: { w: 900, h: 600 } },
//     initialScene: function (game) { return new MinesweeperMenuScene(game); },
//     suppressContextMenu: true,
//   });
//
// Options:
//   canvasId          string. ID of canvas element. Default 'game'.
//   canvas            DOM element. Overrides canvasId if both provided.
//   gameName          string. Passed to Engine.Game for storage namespacing.
//                     Default '' (no namespace).
//   presets           { regular: {w, h}, compact?: {w, h} }. Required.
//                     If compact is omitted, regular is always used (the
//                     intentional letterbox-on-portrait path per ADR-0017).
//   initialScene      (game) => Scene. Factory required because the Game
//                     instance must exist before the initial Scene's
//                     constructor argument can be passed.
//   suppressContextMenu  bool. Default false. true disables the canvas's
//                     right-click context menu (for games that read
//                     Engine.input.mouse.right; see Minesweeper).
//
// Returns:
//   { game, preset, presetName, isTouch }
//     game         the constructed Engine.Game (already started)
//     preset       the chosen preset object { w, h }
//     presetName   'regular' or 'compact'
//     isTouch      bool. true if touch capability detected per ADR-0017.
//                  Scenes can use this to enlarge hit-target minimums.
//
// Throws if the canvas element is not found, presets.regular is missing, or
// initialScene is not a function. Errors are explicit and actionable.
//
// Preset selection:
//   When both regular and compact are defined, picks whichever aspect ratio
//   is closer (in log space) to the current viewport's. This matches the
//   reference snippet in docs/ARCHITECTURE.md "Logical canvas and viewport
//   bootstrap" and ADR-0017.
// ============================================================================

function bootstrapGame(options) {
  const opts = options || {};

  const canvas = opts.canvas || document.getElementById(opts.canvasId || 'game');
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error(
      "bootstrapGame: canvas element not found (looked for id '" +
      (opts.canvasId || 'game') + "'). Pass options.canvas or options.canvasId."
    );
  }

  const presets = opts.presets;
  if (!presets || !presets.regular) {
    throw new Error('bootstrapGame: options.presets.regular is required (e.g. { regular: { w: 900, h: 600 } }).');
  }

  if (typeof opts.initialScene !== 'function') {
    throw new Error('bootstrapGame: options.initialScene must be a factory function (game) => sceneInstance.');
  }

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  function pickPreset() {
    if (!presets.compact) return { name: 'regular', preset: presets.regular };
    const va = window.innerWidth / window.innerHeight;
    const ra = presets.regular.w / presets.regular.h;
    const ca = presets.compact.w / presets.compact.h;
    const useCompact = Math.abs(Math.log(va / ca)) < Math.abs(Math.log(va / ra));
    return useCompact
      ? { name: 'compact', preset: presets.compact }
      : { name: 'regular', preset: presets.regular };
  }

  const chosen = pickPreset();
  const preset = chosen.preset;
  canvas.width = preset.w;
  canvas.height = preset.h;

  function fitToViewport() {
    const s = Math.min(window.innerWidth / preset.w, window.innerHeight / preset.h);
    canvas.style.width = (preset.w * s) + 'px';
    canvas.style.height = (preset.h * s) + 'px';
  }
  fitToViewport();
  window.addEventListener('resize', fitToViewport);

  if (opts.suppressContextMenu) {
    canvas.oncontextmenu = function (e) { e.preventDefault(); };
  }

  const game = new Engine.Game(canvas, { gameName: opts.gameName || '' });
  game.setScene(opts.initialScene(game));
  game.start();

  return { game: game, preset: preset, presetName: chosen.name, isTouch: isTouch };
}
