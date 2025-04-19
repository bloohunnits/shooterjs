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

  // Update position; dtFactor approximates number of frames elapsed (dt * 60fps)
  update(dtFactor = 1) {
    this.x += this.direction.x * this.speed * dtFactor;
    this.y += this.direction.y * this.speed * dtFactor;
    this.distanceTraveled += this.speed * dtFactor;
    if (this.distanceTraveled > this.maxDistance) this.destroy();
  }

  draw() {
    window.engine.ctx.fillStyle = this.color;
    window.engine.ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  // Mark for removal; actual filtering done in engine
  destroy() {
    this._destroyed = true;
  }
}