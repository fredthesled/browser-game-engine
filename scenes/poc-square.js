// scenes/poc-square.js
// Proof-of-concept scene: a single colored square the player moves with arrow keys.
// Verifies the engine works end to end (Game loop, Scene lifecycle, GameObject,
// Script attachment, and Input querying).
// Depends on: Engine.Scene, Engine.GameObject, RectRenderer, KeyboardMover.
// Used by: build/poc-square.html.

class POCSquareScene extends Engine.Scene {
  enter() {
    const square = new Engine.GameObject(320, 180);
    square.attach(new RectRenderer(square, { width: 40, height: 40, color: '#4ec9b0' }));
    square.attach(new KeyboardMover(square, { speed: 220 }));
    this.add(square);
  }
}
