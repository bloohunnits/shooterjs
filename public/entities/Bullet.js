export default class Bullet {
  constructor(x, y, direction, firedByPlayer = true) {
    this.x = x + (firedByPlayer ? this._getPlayerSize() / 2 : 0) - 5;
    this.y = y + (firedByPlayer ? this._getPlayerSize() / 2 : 0) - 5;
    this.size = 10;
    this.speed = firedByPlayer ? 10 : 9;
    const dmgScaling = 1 + (window.engine.currentWave - 1) * 0.05;
    this.damage = firedByPlayer ? 5 : 3 * dmgScaling;
    this.color = firedByPlayer ? 'yellow' : 'red';
    this.firedByPlayer = firedByPlayer;
    this.direction = { ...direction };
    this.distanceTraveled = 0;
    this.maxDistance = 4000;
  }

  _getPlayerSize() {
    return window.engine && window.engine.player ? window.engine.player.size : 0;
  }

  update() {
    this.x += this.direction.x * this.speed;
    this.y += this.direction.y * this.speed;
    this.distanceTraveled += this.speed;
    if (this.distanceTraveled > this.maxDistance) this.destroy();
  }

  draw() {
    window.engine.ctx.fillStyle = this.color;
    window.engine.ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  destroy() {
    const arr = window.engine.bullets;
    const idx = arr.indexOf(this);
    if (idx > -1) arr.splice(idx, 1);
  }
}