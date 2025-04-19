export default class DamageNumber {
  constructor(x, y, damage) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.opacity = 1;
    this.riseSpeed = 1;
    this.fadeSpeed = 0.01;
  }

  // Update rise and fade; dtFactor approximates number of frames elapsed (dt * 60fps)
  update(dtFactor = 1) {
    this.y -= this.riseSpeed * dtFactor;
    this.opacity -= this.fadeSpeed * dtFactor;
    if (this.opacity <= 0.1) this.destroy();
  }

  draw() {
    const ctx = window.engine.ctx;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(this.damage, this.x, this.y);
    ctx.restore();
  }

  // Mark for removal; actual filtering done in engine
  destroy() {
    this._destroyed = true;
  }
}