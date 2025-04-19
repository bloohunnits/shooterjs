export default class DamageNumber {
  constructor(x, y, damage) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.opacity = 1;
    this.riseSpeed = 1;
    this.fadeSpeed = 0.01;
  }

  update() {
    this.y -= this.riseSpeed;
    this.opacity -= this.fadeSpeed;
    if (this.opacity <= 0.1) this.destroy();
  }

  draw() {
    window.ctx.save();
    window.ctx.globalAlpha = this.opacity;
    window.ctx.fillStyle = "white";
    window.ctx.font = "20px Arial";
    window.ctx.fillText(this.damage, this.x, this.y);
    window.ctx.restore();
  }

  destroy() {
    const idx = window.damageNumbers.indexOf(this);
    if (idx > -1) window.damageNumbers.splice(idx, 1);
  }
}