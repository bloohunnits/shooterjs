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
    // Expose engine globally for entity modules
    window.engine = this;
    // Canvas & context
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    // Track timestamp for frame delta
    this.lastTimestamp = 0;
    // Debug mode flag (enable via URL ?dev=true) and FPS counter
    this.devMode = new URLSearchParams(window.location.search).get('dev') === 'true';
    this.fps = 0;
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
    // Gamepad support
    this.gamepadIndex = null;
    this.prevGamepadButtons = [];
    window.addEventListener('gamepadconnected', e => {
      this.gamepadIndex = e.gamepad.index;
      // initialize previous button states
      this.prevGamepadButtons = e.gamepad.buttons.map(b => b.pressed);
    });
    window.addEventListener('gamepaddisconnected', e => { if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null; });
    // Touch support: aim and shoot
    this.canvas.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('mousedown', e => this.handleMouseDown(e));

    // Game state: start at title screen
    this.gameState = TITLE;
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

    // Player setup (initial position in CSS pixels)
    this.player = {
      x: this.canvas.clientWidth / 2,
      y: this.canvas.clientHeight / 2,
      size: 40,
      speed: 5,
      maxHealth: 100,
      health: 100,
      defense: 10,
      attack: 10,
      isInvincible: false,
      invincibilityDuration: 1000,
      direction: { x: 0, y: -1 },
      // Update position; dtFactor approximates number of frames elapsed (dt * 60fps)
      update: (dtFactor = 1) => {
        let dx = 0, dy = 0;
        if (this.keys['ArrowUp'] || this.keys['w'])    dy -= this.player.speed * dtFactor;
        if (this.keys['ArrowDown']|| this.keys['s'])    dy += this.player.speed * dtFactor;
        if (this.keys['ArrowLeft']|| this.keys['a'])    dx -= this.player.speed * dtFactor;
        if (this.keys['ArrowRight']|| this.keys['d'])    dx += this.player.speed * dtFactor;
        const maxX = this.canvas.clientWidth - this.player.size;
        const maxY = this.canvas.clientHeight - this.player.size;
        this.player.x = Math.max(0, Math.min(this.player.x + dx, maxX));
        this.player.y = Math.max(0, Math.min(this.player.y + dy, maxY));
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

  // Resize canvas for high-DPI displays and maintain crisp rendering
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Set display size (css pixels)
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    // Set actual drawing buffer size (device pixels)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    // Reset transform and scale to map CSS pixels to device pixels
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  handleKeyDown(e) {
    this.keys[e.key] = true;
    // Shoot with space
    if (e.key === ' ') this.shoot();
    // Toggle pause with 'p'
    if (e.key === 'p' && this.gameState !== GAME_OVER) this.togglePause();
    // Start game from title with Enter (with fade transition)
    if (e.key === 'Enter' && this.gameState === TITLE && !this.transition) {
      this.startGameTransition();
    }
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
    // Save score for title screen
    this.previousScore = this.score;
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
    // Reset player position (CSS pixels)
    this.player.x = this.canvas.clientWidth / 2;
    this.player.y = this.canvas.clientHeight / 2;
    this.updateGameInfoDisplay();
    this.hideGameOverDisplay();
    this.spawnWaveEnemies();
    this.update();
  }

  // Initiates fade-out transition from title screen to gameplay
  startGameTransition() {
    this.transition = {
      startTime: performance.now(),
      duration: 1000,
      onComplete: () => {
        this.transition = null;
        this.restartGame();
      }
    };
  }

  togglePause() {
    if (this.gameState === PLAYING) this.gameState = PAUSED;
    else if (this.gameState === PAUSED) this.gameState = PLAYING;
  }

  shoot() {
    if (this.gameState !== PLAYING) return;
    this.bullets.push(new Bullet(this.player.x, this.player.y, this.player.direction, true));
  }

  // Main game loop; receives timestamp for frame normalization
  update(timestamp) {
    // Compute delta time factor (~frames at 60fps) and FPS for debug
    let dtFactor = 1;
    if (timestamp !== undefined) {
      if (this.lastTimestamp) {
        const dt = (timestamp - this.lastTimestamp) / 1000;
        dtFactor = dt * 60;
        this.fps = Math.round(1 / dt);
      }
      this.lastTimestamp = timestamp;
    }
    // Handle title screen with fade transition
    if (this.gameState === TITLE) {
      let alpha = 1;
      if (this.transition && timestamp !== undefined) {
        const elapsed = timestamp - this.transition.startTime;
        alpha = Math.max(1 - elapsed / this.transition.duration, 0);
      }
      this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.drawTitleScreen();
      this.ctx.restore();
      // Complete transition when fade-out done
      if (this.transition && timestamp !== undefined) {
        const elapsed = timestamp - this.transition.startTime;
        if (elapsed >= this.transition.duration) {
          this.transition.onComplete();
          return;
        }
      }
      requestAnimationFrame(ts => this.update(ts));
      return;
    }
    if (this.gameState === GAME_OVER) return;
    if (this.gameState === GAME_OVER) return;
    // Clear using CSS pixel dimensions
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    if (this.gameState === PLAYING) {
      // Handle gamepad input for movement and shooting
      if (this.gamepadIndex != null) {
        const gp = navigator.getGamepads()[this.gamepadIndex];
        if (gp) {
          const deadZone = 0.2;
          // Left stick for movement (axes 0 & 1)
          const mx = gp.axes[0], my = gp.axes[1];
          if (Math.abs(mx) > deadZone || Math.abs(my) > deadZone) {
            const dx = mx * this.player.speed * dtFactor;
            const dy = my * this.player.speed * dtFactor;
            this.player.x = Math.max(0, Math.min(this.player.x + dx, this.canvas.clientWidth - this.player.size));
            this.player.y = Math.max(0, Math.min(this.player.y + dy, this.canvas.clientHeight - this.player.size));
            const len = Math.hypot(mx, my) || 1;
            this.player.direction = { x: mx / len, y: my / len };
          }
          // Button 0 (A) for shooting
          if (gp.buttons[0].pressed && !this.prevGamepadButtons[0]) {
            this.shoot();
          }
          this.prevGamepadButtons = gp.buttons.map(b => b.pressed);
        }
      }
      if (!this.waveCooldown) {
        // Player update & draw
        this.player.update(dtFactor);
        this.player.draw();
        // Build spatial hash for enemies
        const gridSize = 100;
        const spatialHash = new Map();
        for (const enemy of this.enemies) {
          if (enemy._destroyed) continue;
          const cx = Math.floor((enemy.x + enemy.size/2) / gridSize);
          const cy = Math.floor((enemy.y + enemy.size/2) / gridSize);
          const key = `${cx},${cy}`;
          if (!spatialHash.has(key)) spatialHash.set(key, []);
          spatialHash.get(key).push(enemy);
        }
        // Bullets & collisions using spatial hash
        this.bullets.forEach(bullet => {
          bullet.update(dtFactor);
          bullet.draw();
          if (bullet.firedByPlayer) {
            const bx = bullet.x + bullet.size/2;
            const by = bullet.y + bullet.size/2;
            const cellX = Math.floor(bx / gridSize);
            const cellY = Math.floor(by / gridSize);
            for (let ix = cellX - 1; ix <= cellX + 1; ix++) {
              for (let iy = cellY - 1; iy <= cellY + 1; iy++) {
                const cell = spatialHash.get(`${ix},${iy}`);
                if (!cell) continue;
                for (const enemy of cell) {
                  if (enemy._destroyed) continue;
                  if (this.isColliding(bullet, enemy)) {
                    if (!enemy.isInvincible) {
                      let dmg = Math.round(Math.max(1, this.player.attack + bullet.damage - enemy.defense));
                      enemy.health -= dmg;
                      this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, dmg));
                      this.applyInvincibility(enemy);
                      bullet.destroy();
                      if (enemy.health <= 0) {
                        // Handle enemy death
                        enemy.destroy();
                        this.enemiesAliveInWave--;
                        this.updateScore(enemy);
                        // Only advance wave when all enemies in current wave are defeated
                        if (this.enemiesAliveInWave <= 0) {
                          this.triggerNextWaveCooldown();
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {
            // Enemy-fired bullets vs player
            if (this.isColliding(bullet, this.player)) {
              if (!this.player.isInvincible) {
                this.player.health -= bullet.damage;
                this.applyInvincibility(this.player);
                bullet.destroy();
                if (this.player.health <= 0) this.endGame();
              }
            }
          }
        });
        // Enemies update, shoot & draw
        this.enemies.forEach(enemy => {
          if (enemy._destroyed) return;
          enemy.update(dtFactor);
          enemy.shoot();
          enemy.draw();
          if (this.isColliding(enemy, this.player)) {
            if (!this.player.isInvincible) {
              let cd = enemy.collisionDamage - this.player.defense;
              this.player.health -= Math.max(1, cd);
              this.applyInvincibility(this.player);
              if (this.player.health <= 0) this.endGame();
            }
          }
        });
        // Damage numbers update & draw
        this.damageNumbers.forEach(dn => { dn.update(dtFactor); dn.draw(); });
        // Remove destroyed entities
        this.bullets = this.bullets.filter(b => !b._destroyed);
        this.enemies = this.enemies.filter(e => !e._destroyed);
        this.damageNumbers = this.damageNumbers.filter(dn => !dn._destroyed);
      } else {
        // Wave cooldown display
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Wave ${this.currentWave} Complete!`, this.canvas.clientWidth/2, this.canvas.clientHeight/2);
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Next wave starting soon...', this.canvas.clientWidth/2, this.canvas.clientHeight/2 + 50);
      }
    } else if (this.gameState === PAUSED) {
      // Paused overlay
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Paused', this.canvas.clientWidth/2, this.canvas.clientHeight/2);
    }
    // Debug overlay if enabled
    if (this.devMode) {
      this.drawDebug();
    }
    // Request next frame with timestamp
    requestAnimationFrame(ts => this.update(ts));
  }

  start() {
    // Begin rendering; will show title screen first
    this.update();
  }

  // Draw the title screen
  drawTitleScreen() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.font = '48px Arial';
    this.ctx.fillText('Top-Down Shooter', w/2, h/2 - 40);
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press Enter to Start', w/2, h/2);
    if (this.previousScore) {
      this.ctx.fillText(`Last Score: ${this.previousScore}`, w/2, h/2 + 40);
    }
  }

  // Debug overlay for FPS and bounding boxes
  drawDebug() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.ctx.save();
    this.ctx.fillStyle = 'lime';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    this.ctx.strokeStyle = 'lime';
    this.ctx.lineWidth = 1;
    // Player box
    this.ctx.strokeRect(this.player.x, this.player.y, this.player.size, this.player.size);
    // Enemies
    for (const enemy of this.enemies) {
      this.ctx.strokeRect(enemy.x, enemy.y, enemy.size, enemy.size);
      this.ctx.fillText(Math.round(enemy.health), enemy.x, enemy.y - 2);
    }
    // Bullets
    for (const b of this.bullets) {
      this.ctx.strokeRect(b.x, b.y, b.size, b.size);
    }
    this.ctx.restore();
  }

  // Handle touch to aim and shoot
  handleTouchStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    const x = t.clientX, y = t.clientY;
    const px = this.player.x + this.player.size/2;
    const py = this.player.y + this.player.size/2;
    const dx = x - px, dy = y - py;
    const len = Math.hypot(dx, dy) || 1;
    this.player.direction = { x: dx/len, y: dy/len };
    if (this.gameState === PLAYING) this.shoot();
  }
}