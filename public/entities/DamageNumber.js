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
    const ctx = window.engine.ctx;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(this.damage, this.x, this.y);
    ctx.restore();
  }

  destroy() {
    const arr = window.engine.damageNumbers;
    const idx = arr.indexOf(this);
    if (idx > -1) arr.splice(idx, 1);
  }
}