// scripts/rect-renderer.js
// Draws a filled rectangle centered at the host GameObject's position.
// Depends on: Engine.Script.
// Used by: any GameObject that should render as a colored rectangle.

class RectRenderer extends Engine.Script {
  constructor(host, options = {}) {
    super(host);
    this.width = options.width ?? 32;
    this.height = options.height ?? 32;
    this.color = options.color ?? '#ffffff';
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
  }
}
