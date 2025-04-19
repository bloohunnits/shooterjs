export default class Bullet {
  constructor(x, y, direction, firedByPlayer = true) {
    this.x = x + (firedByPlayer ? window.currentPlayer.size / 2 : 0) - 5;
    this.y = y + (firedByPlayer ? window.currentPlayer.size / 2 : 0) - 5;
    this.size = 10;
    this.speed = firedByPlayer ? 10 : 9;
    const dmgScalingFactor = 1 + (window.currentWave - 1) * 0.05;
    this.damage = firedByPlayer ? 5 : 3 * dmgScalingFactor;
    this.color = firedByPlayer ? "yellow" : "red";
    this.firedByPlayer = firedByPlayer;
    this.direction = { ...direction };
    this.distanceTraveled = 0;
    this.maxDistance = 4000;
  }

  update() {
    this.x += this.direction.x * this.speed;
    this.y += this.direction.y * this.speed;
    this.distanceTraveled += this.speed;
    if (this.distanceTraveled > this.maxDistance) this.destroy();
  }

  draw() {
    window.ctx.fillStyle = this.color;
    window.ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  destroy() {
    const idx = window.bullets.indexOf(this);
    if (idx > -1) window.bullets.splice(idx, 1);
  }
}