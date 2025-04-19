import Bullet from './Bullet.js';

export default class Enemy {
  constructor(type, baseStats) {
    this.size = baseStats.size;
    this.color = baseStats.color;
    this.canShoot = baseStats.canShoot || false;
    this.shootingInterval = baseStats.shootingInterval || 2000;
    this.lastShotTime = 0;

    const wave = window.engine.currentWave;
    const waveScaling = 1 + (wave - 1) * 0.1;
    const defScaling  = 1 + (wave - 1) * 0.025;
    const colScaling  = 1 + (wave - 1) * 0.05;

    this.health = baseStats.health * waveScaling;
    this.attack = baseStats.attack * waveScaling;
    this.defense= baseStats.defense * defScaling;
    this.score  = baseStats.score * waveScaling;
    this.collisionDamage = baseStats.collisionDamage * colScaling;
    this.speed  = baseStats.speed + (wave - 1) * 0.05;

    const edge = Math.floor(Math.random() * 4);
    const cw = window.engine.canvas.width;
    const ch = window.engine.canvas.height;
    if (edge === 0) { this.x = Math.random()*cw;    this.y = -this.size; }
    else if (edge === 1) { this.x = cw + this.size; this.y = Math.random()*ch; }
    else if (edge === 2) { this.x = Math.random()*cw;    this.y = ch + this.size; }
    else                { this.x = -this.size;       this.y = Math.random()*ch; }
  }

  update() {
    const dx = window.engine.player.x - this.x;
    const dy = window.engine.player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.x += dx/dist * this.speed;
    this.y += dy/dist * this.speed;
  }

  draw() {
    window.engine.ctx.fillStyle = this.color;
    window.engine.ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  destroy() {
    const arr = window.engine.enemies;
    const idx = arr.indexOf(this);
    if (idx > -1) arr.splice(idx, 1);
  }

  shoot() {
    if (!this.canShoot) return;
    const now = Date.now();
    if (now - this.lastShotTime < this.shootingInterval) return;
    const dx = window.engine.player.x - this.x;
    const dy = window.engine.player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dir = { x: dx/dist, y: dy/dist };
    window.engine.bullets.push(new Bullet(this.x, this.y, dir, false));
    this.lastShotTime = now;
  }
}