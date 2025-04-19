import { TITLE, PLAYING, PAUSED, GAME_OVER } from './GameState.js';
import Bullet from './entities/Bullet.js';
import Enemy from './entities/Enemy.js';
import DamageNumber from './entities/DamageNumber.js';

export default class GameEngine {
  // Define enemy types and base stats
  static enemyTypes = {
    basic: { health: 15, attack: 5, defense: 10, score: 1, collisionDamage: 30, speed: 2, size: 30, color: 'red' },
    tank:  { health: 25, attack: 4, defense: 12, score: 2, collisionDamage: 38, speed: 1.5, size: 40, color: 'blue' },
    fast:  { health: 10, attack: 2, defense: 6, score: 1.5, collisionDamage: 18, speed: 3, size: 20, color: 'green' },
    shooter:{ health: 20, attack: 4, defense: 5, score: 3, collisionDamage: 15, speed: 1.8, size: 25, color: 'purple', canShoot: true, shootingInterval: 2000 }
  };

  constructor(canvasId = 'gameCanvas', gameInfoId = 'gameInfo', gameOverId = 'gameOverScreen') {
    // Canvas & context
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // UI elements
    this.gameInfoElem = document.getElementById(gameInfoId);
    this.gameOverElem = document.getElementById(gameOverId);
    this.restartButton = this.gameOverElem.querySelector('#restartButton');
    this.restartButton.addEventListener('click', () => this.restartGame());

    // Input state
    this.keys = {};
    window.addEventListener('keydown', e => this.handleKeyDown(e));
    window.addEventListener('keyup',   e => this.handleKeyUp(e));
    this.canvas.addEventListener('mousedown', e => this.handleMouseDown(e));

    // Game state
    this.gameState = PLAYING;
    this.score = 0;
    this.currentWave = 1;
    this.enemiesToSpawn = 5;
    this.enemiesRemaining = this.enemiesToSpawn;
    this.enemiesAliveInWave = this.enemiesToSpawn;
    this.waveCooldown = false;

    // Entities
    this.bullets = [];
    this.enemies = [];
    this.damageNumbers = [];

    // Player setup
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      size: 40,
      speed: 5,
      maxHealth: 100,
      health: 100,
      defense: 10,
      attack: 10,
      isInvincible: false,
      invincibilityDuration: 1000,
      direction: { x: 0, y: -1 },
      update: () => {
        let dx = 0, dy = 0;
        if (this.keys['ArrowUp'] || this.keys['w'])    dy -= this.player.speed;
        if (this.keys['ArrowDown']|| this.keys['s'])    dy += this.player.speed;
        if (this.keys['ArrowLeft']|| this.keys['a'])    dx -= this.player.speed;
        if (this.keys['ArrowRight']|| this.keys['d'])    dx += this.player.speed;
        this.player.x = Math.max(0, Math.min(this.player.x + dx, this.canvas.width  - this.player.size));
        this.player.y = Math.max(0, Math.min(this.player.y + dy, this.canvas.height - this.player.size));
        if (dx || dy) {
          const len = Math.hypot(dx, dy);
          this.player.direction = { x: dx / len, y: dy / len };
        }
      },
      drawHealthBar: () => {
        const barWidth = 60, barHeight = 10;
        const pct = this.player.health / this.player.maxHealth;
        const x = this.player.x + this.player.size/2 - barWidth/2;
        const y = this.player.y - 20;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(x, y, barWidth * pct, barHeight);
      },
      draw: () => {
        if (this.player.isInvincible) {
          const t = Date.now(), iv = 100;
          if (Math.floor(t/iv) % 2 === 0) return;
        }
        this.ctx.save();
        this.player.drawHealthBar();
        this.ctx.translate(this.player.x + this.player.size/2, this.player.y + this.player.size/2);
        const ang = Math.atan2(this.player.direction.y, this.player.direction.x);
        this.ctx.rotate(ang + Math.PI/2);
        this.ctx.fillStyle = '#00f';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.player.size/2);
        this.ctx.lineTo(this.player.size/2, this.player.size/2);
        this.ctx.lineTo(-this.player.size/2, this.player.size/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      }
    };
  }

  resizeCanvas() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  handleKeyDown(e) {
    this.keys[e.key] = true;
    if (e.key === ' ') this.shoot();
    if (e.key === 'p' && this.gameState !== GAME_OVER) this.togglePause();
  }

  handleKeyUp(e) {
    this.keys[e.key] = false;
  }

  handleMouseDown(e) {
    if (this.gameState !== PLAYING) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const dx = mx - (this.player.x + this.player.size/2);
    const dy = my - (this.player.y + this.player.size/2);
    const len = Math.hypot(dx, dy);
    this.player.direction = { x: dx/len, y: dy/len };
    this.shoot();
  }

  applyInvincibility(ent) {
    ent.isInvincible = true;
    setTimeout(() => { ent.isInvincible = false; }, ent.invincibilityDuration);
  }

  isColliding(a, b) {
    return a.x < b.x + b.size && a.x + a.size > b.x && a.y < b.y + b.size && a.y + a.size > b.y;
  }

  calculateEnemiesForWave(w) {
    return Math.floor(5 * Math.pow(1.2, w - 1));
  }

  getRandomEnemyTypeByWaveNumber(w) {
    let basicChance = 1, tankChance = 0, shooterChance = 0;
    if (w <=2) {
      basicChance=1;
    } else if (w <=7) {
      tankChance = (w-2)*0.2;
      basicChance = 1 - tankChance;
    } else if (w <= 89) {
      tankChance = 0.10;
      shooterChance = Math.min((w-7)*0.01, 0.05);
      basicChance = 1 - (tankChance + shooterChance);
    } else {
      basicChance=0.85; tankChance=0.10; shooterChance=0.05;
    }
    const r = Math.random();
    if (r < basicChance) return 'basic';
    if (r < basicChance + tankChance) return 'tank';
    return 'shooter';
  }

  spawnEnemy() {
    if (this.gameState === PLAYING && this.enemiesRemaining > 0 && !this.waveCooldown) {
      const type = this.getRandomEnemyTypeByWaveNumber(this.currentWave);
      this.enemies.push(new Enemy(type, GameEngine.enemyTypes[type]));
      this.enemiesRemaining--;
    }
  }

  spawnWaveEnemies() {
    const interval = setInterval(() => {
      if (this.enemiesRemaining > 0) this.spawnEnemy();
      else clearInterval(interval);
    }, 1000);
  }

  triggerNextWaveCooldown() {
    this.waveCooldown = true;
    setTimeout(() => {
      this.currentWave++;
      this.updateGameInfoDisplay();
      this.enemiesToSpawn = this.calculateEnemiesForWave(this.currentWave);
      this.enemiesRemaining = this.enemiesToSpawn;
      this.enemiesAliveInWave = this.enemiesToSpawn;
      this.waveCooldown = false;
      this.spawnWaveEnemies();
    }, 3000);
  }

  updateScore(enemy) {
    this.score += enemy.score;
    this.score = Math.round(this.score);
    this.updateGameInfoDisplay();
  }

  setFinalStats() {
    document.getElementById('finalScore').innerText = this.score;
    document.getElementById('finalWave').innerText = this.currentWave;
  }

  showGameOverDisplay() {
    this.gameOverElem.style.display = 'block';
  }

  hideGameOverDisplay() {
    this.gameOverElem.style.display = 'none';
  }

  updateGameInfoDisplay() {
    this.gameInfoElem.innerText = `Score: ${this.score} Wave: ${this.currentWave}`;
  }

  endGame() {
    this.gameState = GAME_OVER;
    this.setFinalStats();
    this.showGameOverDisplay();
  }

  restartGame() {
    this.score = 0;
    this.player.health = this.player.maxHealth;
    this.gameState = PLAYING;
    this.currentWave = 1;
    this.enemiesToSpawn = this.calculateEnemiesForWave(this.currentWave);
    this.enemiesRemaining = this.enemiesToSpawn;
    this.enemiesAliveInWave = this.enemiesToSpawn;
    this.bullets.length = 0;
    this.enemies.length = 0;
    this.damageNumbers.length = 0;
    this.waveCooldown = false;
    this.player.x = this.canvas.width/2;
    this.player.y = this.canvas.height/2;
    this.updateGameInfoDisplay();
    this.hideGameOverDisplay();
    this.spawnWaveEnemies();
    this.update();
  }

  togglePause() {
    if (this.gameState === PLAYING) this.gameState = PAUSED;
    else if (this.gameState === PAUSED) this.gameState = PLAYING;
  }

  shoot() {
    if (this.gameState !== PLAYING) return;
    this.bullets.push(new Bullet(this.player.x, this.player.y, this.player.direction, true));
  }

  update() {
    if (this.gameState === GAME_OVER) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.gameState === PLAYING) {
      if (!this.waveCooldown) {
        // Player
        this.player.update();
        this.player.draw();
        // Bullets & collisions
        this.bullets.forEach(bullet => {
          bullet.update(); bullet.draw();
          this.enemies.forEach(enemy => {
            if (bullet.firedByPlayer && this.isColliding(bullet, enemy)) {
              // handle enemy damage
              if (!enemy.isInvincible) {
                let dmg = Math.round(Math.max(1, this.player.attack + bullet.damage - enemy.defense));
                enemy.health -= dmg;
                this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, dmg));
                this.applyInvincibility(enemy);
                bullet.destroy();
                if (enemy.health <= 0) {
                  enemy.destroy();
                  this.enemiesAliveInWave--;
                  this.updateScore(enemy);
                  this.triggerNextWaveCooldown();
                }
              }
            }
            if (!bullet.firedByPlayer && this.isColliding(bullet, this.player)) {
              if (!this.player.isInvincible) {
                this.player.health -= bullet.damage;
                this.applyInvincibility(this.player);
                bullet.destroy();
                if (this.player.health <= 0) this.endGame();
              }
            }
          });
        });
        // Enemies
        this.enemies.forEach(enemy => {
          enemy.update(); enemy.shoot(); enemy.draw();
          if (this.isColliding(enemy, this.player)) {
            if (!this.player.isInvincible) {
              let cd = enemy.collisionDamage - this.player.defense;
              this.player.health -= Math.max(1, cd);
              this.applyInvincibility(this.player);
              if (this.player.health <= 0) this.endGame();
            }
          }
        });
        // Damage numbers
        this.damageNumbers.forEach(dn => { dn.update(); dn.draw(); });
      } else {
        // Wave cooldown display
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Wave ${this.currentWave} Complete!`, this.canvas.width/2, this.canvas.height/2);
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Next wave starting soon...', this.canvas.width/2, this.canvas.height/2 + 50);
      }
    } else if (this.gameState === PAUSED) {
      // Paused overlay
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Paused', this.canvas.width/2, this.canvas.height/2);
    }
    requestAnimationFrame(() => this.update());
  }

  start() {
    this.updateGameInfoDisplay();
    this.spawnWaveEnemies();
    this.update();
  }
}