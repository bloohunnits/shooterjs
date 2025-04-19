import Bullet from './Bullet.js';

export default class Enemy {
  constructor(type, baseStats) {
    this.size = baseStats.size;
    this.color = baseStats.color;
    this.canShoot = baseStats.canShoot || false;
    this.shootingInterval = baseStats.shootingInterval || 2000;
    this.lastShotTime = 0;

    const waveScalingFactor = 1 + (window.currentWave - 1) * 0.1;
    const defenseWaveScalingFactor = 1 + (window.currentWave - 1) * 0.025;
    const collisionWaveScalingFactor = 1 + (window.currentWave - 1) * 0.05;

    this.health = baseStats.health * waveScalingFactor;
    this.attack = baseStats.attack * waveScalingFactor;
    this.defense = baseStats.defense * defenseWaveScalingFactor;
    this.score = baseStats.score * waveScalingFactor;
    this.collisionDamage = baseStats.collisionDamage * collisionWaveScalingFactor;
    this.speed = baseStats.speed + (window.currentWave - 1) * 0.05;

    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      this.x = Math.random() * window.canvas.width;
      this.y = -this.size;
    } else if (edge === 1) {
      this.x = window.canvas.width + this.size;
      this.y = Math.random() * window.canvas.height;
    } else if (edge === 2) {
      this.x = Math.random() * window.canvas.width;
      this.y = window.canvas.height + this.size;
    } else {
      this.x = -this.size;
      this.y = Math.random() * window.canvas.height;
    }
  }

  update() {
    const dx = window.currentPlayer.x - this.x;
    const dy = window.currentPlayer.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;
  }

  draw() {
    window.ctx.fillStyle = this.color;
    window.ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  destroy() {
    const idx = window.enemies.indexOf(this);
    if (idx > -1) window.enemies.splice(idx, 1);
  }

  shoot() {
    if (this.canShoot) {
      const now = Date.now();
      if (now - this.lastShotTime > this.shootingInterval) {
        const direction = {
          x: window.currentPlayer.x - this.x,
          y: window.currentPlayer.y - this.y,
        };
        const dist = Math.hypot(direction.x, direction.y);
        direction.x /= dist;
        direction.y /= dist;
        window.bullets.push(new Bullet(this.x, this.y, direction, false));
        this.lastShotTime = now;
      }
    }
  }
}