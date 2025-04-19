// Game state definitions
import { TITLE, PLAYING, PAUSED, GAME_OVER } from './GameState.js';

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
resizeCanvas();

window.addEventListener("resize", resizeCanvas);
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Game variables & state machine
let score = 0;
// Current game state (TITLE, PLAYING, PAUSED, GAME_OVER)
let gameState = PLAYING;
const keys = {};
const bullets = [];
const enemies = [];
const damageNumbers = [];
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let currentWave = 1; // Start at wave 1
let enemiesToSpawn = 5; // Number of enemies in the first wave
let enemiesRemaining = enemiesToSpawn; // Track how many enemies remain to spawn in the current wave
let enemiesAliveInWave = enemiesToSpawn; // Track how many students remain alive in the wave
let waveCooldown = false; // A flag to introduce a delay between waves

// Group core game state into a single object for future refactor
const Game = {
  keys,
  bullets,
  enemies,
  damageNumbers,
  score,
  currentWave,
  enemiesToSpawn,
  enemiesRemaining,
  enemiesAliveInWave,
  waveCooldown,
};
window.Game = Game;

const player1 = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 40,
  speed: 5,
  maxHealth: 100,
  health: 100,
  defense: 10,
  attack: 10,
  isInvincible: false,
  invincibilityDuration: 1000,
  direction: { x: 0, y: -1 },
  update: function () {
    let dx = 0;
    let dy = 0;

    if (keys["ArrowUp"] || keys["w"]) dy -= this.speed;
    if (keys["ArrowDown"] || keys["s"]) dy += this.speed;
    if (keys["ArrowLeft"] || keys["a"]) dx -= this.speed;
    if (keys["ArrowRight"] || keys["d"]) dx += this.speed;

    this.x += dx;
    this.y += dy;

    // Keep currentPlayer within canvas bounds
    this.x = Math.max(0, Math.min(this.x, canvas.width - this.size));
    this.y = Math.max(0, Math.min(this.y, canvas.height - this.size));

    // Update direction
    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      this.direction = { x: dx / length, y: dy / length };
    }
  },
  drawHealthBar: function () {
    const barWidth = 60; // Reduced width of health bar
    const barHeight = 10; // Height of health bar
    const healthPercentage = this.health / this.maxHealth; // Percentage of health remaining

    // Calculate position to center the health bar above the player
    const barX = this.x + this.size / 2 - barWidth / 2;
    const barY = this.y - 20; // Positioned above the player

    // Draw background (empty health)
    ctx.fillStyle = "red";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Draw foreground (remaining health)
    ctx.fillStyle = "green";
    ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
  },
  draw: function () {
    // Flash effect during invincibility (every other frame)
    if (this.isInvincible) {
      const currentTime = Date.now();
      const flashInterval = 100; // Flash every 100ms
      // Skip drawing every other frame for flashing effect
      if (Math.floor(currentTime / flashInterval) % 2 === 0) {
        return; // Skip drawing this frame
      }
    }
    ctx.save();
    this.drawHealthBar();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    const angle = Math.atan2(this.direction.y, this.direction.x);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = "#00f";
    ctx.beginPath();
    ctx.moveTo(0, -this.size / 2);
    ctx.lineTo(this.size / 2, this.size / 2);
    ctx.lineTo(-this.size / 2, this.size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

// Declare currentPlayer in module scope rather than assigning to an undeclared global
let currentPlayer = player1;

// Bullet class
class Bullet {
  constructor(x, y, direction, firedByPlayer = true) {
    this.x = x + (firedByPlayer ? currentPlayer.size / 2 : 0) - 5;
    this.y = y + (firedByPlayer ? currentPlayer.size / 2 : 0) - 5;
    this.size = 10;
    this.speed = firedByPlayer? 10 : 9;
    this.color = firedByPlayer ? "yellow" : "red"; // Enemy bullets are red
    const dmgScalingFactor = 1 + (currentWave - 1) * 0.05;
    this.damage =  firedByPlayer ? 5: 3 * dmgScalingFactor; 
    this.firedByPlayer = firedByPlayer; // Distinguish who fired the bullet
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
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  destroy() {
    bullets.splice(bullets.indexOf(this), 1);
  }
}

// Enemy class
class Enemy {
  constructor(type, baseStats) {
    this.size = baseStats.size; // Size remains constant across waves
    this.color = baseStats.color; // Color remains constant across waves
    this.canShoot = baseStats.canShoot || false; // Define if this enemy type can shoot
    this.shootingInterval = baseStats.shootingInterval || 2000; // Default shooting interval (milliseconds)
    this.lastShotTime = 0; // Track time since last shot

    // Scaling factors based on wave progression
    const waveScalingFactor = 1 + (currentWave - 1) * 0.1;
    const defenseWaveScalingFactor = 1 + (currentWave - 1) * 0.025;
    const collisionWaveScalingFactor = 1 + (currentWave - 1) * 0.05;

    // Stats that will scale with waves
    this.health = baseStats.health * waveScalingFactor;
    this.attack = baseStats.attack * waveScalingFactor;
    this.defense = baseStats.defense * defenseWaveScalingFactor;
    this.score = baseStats.score * waveScalingFactor;
    this.collisionDamage =
      baseStats.collisionDamage * collisionWaveScalingFactor;
    this.speed = baseStats.speed + (currentWave - 1) * 0.05; // Slow speed scaling per wave

    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      this.x = Math.random() * canvas.width;
      this.y = -this.size;
    } else if (edge === 1) {
      this.x = canvas.width + this.size;
      this.y = Math.random() * canvas.height;
    } else if (edge === 2) {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + this.size;
    } else {
      this.x = -this.size;
      this.y = Math.random() * canvas.height;
    }
  }

  update() {
    const dx = currentPlayer.x - this.x;
    const dy = currentPlayer.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }

  destroy() {
    enemies.splice(enemies.indexOf(this), 1);
  }
  shoot() {
    if (this.canShoot) {
      const now = Date.now();
      if (now - this.lastShotTime > this.shootingInterval) {
        // Shoot a bullet in the direction of the player
        const direction = {
          x: currentPlayer.x - this.x,
          y: currentPlayer.y - this.y,
        };
        const distance = Math.hypot(direction.x, direction.y);
        direction.x /= distance; // Normalize direction
        direction.y /= distance;

        bullets.push(new Bullet(this.x, this.y, direction, false)); // Enemy bullet
        this.lastShotTime = now; // Reset the shot timer
      }
    }
  }
}

const enemyTypes = {
  basic: {
    health: 15,
    attack: 5,
    defense: 10,
    score: 1,
    collisionDamage: 30,
    speed: 2,
    size: 30, // Size remains constant across waves
    color: "red", // Visual appearance remains constant
  },
  tank: {
    health: 25,
    attack: 4,
    defense: 12,
    score: 2,
    collisionDamage: 38,
    speed: 1.5, // Slower but stronger
    size: 40, // Larger, heavier enemies
    color: "blue",
  },
  fast: {
    health: 10,
    attack: 2,
    defense: 6,
    score: 1.5,
    collisionDamage: 18,
    speed: 3, // Faster enemy
    size: 20, // Smaller, faster enemies
    color: "green",
  },
  shooter: {
    health: 20,
    attack: 4,
    defense: 5,
    score: 3,
    collisionDamage: 15,
    speed: 1.8,
    size: 25,
    color: "purple",
    canShoot: true, // This enemy can shoot
    shootingInterval: 2000, 
  },
};

function createEnemy(type) {
  const baseStats = enemyTypes[type];
  return new Enemy(type, baseStats);
}

class DamageNumber {
  constructor(x, y, damage) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.opacity = 1; // Fully visible
    this.lifetime = 1000; // 1 second duration
    this.riseSpeed = 1; // Speed at which the number rises
    this.fadeSpeed = 0.01; // Slower fade-out speed for smoother effect
  }

  update() {
    // Make the number rise and fade out
    this.y -= this.riseSpeed;
    this.opacity -= this.fadeSpeed;

    // Remove the damage number smoothly before it's fully invisible
    if (this.opacity <= 0.1) {
      this.destroy(); // Remove it before it becomes fully transparent
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity; // Apply the fade-out effect
    ctx.fillStyle = "white"; // Color of the damage number
    ctx.font = "20px Arial";
    ctx.fillText(this.damage, this.x, this.y);
    ctx.restore();
  }

  destroy() {
    // Remove from the array without waiting for full opacity = 0 to avoid flashing
    damageNumbers.splice(damageNumbers.indexOf(this), 1);
  }
}

function getRandomEnemyTypeByWaveNumber(waveNumber) {
    let basicChance = 1;
    let tankChance = 0;
    let shooterChance = 0;
  
    if (waveNumber <= 2) {
      // Waves 1-2: 100% basic enemies
      basicChance = 1;
      tankChance = 0;
      shooterChance = 0;
    } else if (waveNumber <= 7) {
      // Waves 3-7: Gradually introduce tanks
      basicChance = 1;
      tankChance = (waveNumber - 2) * 0.2; // Increasing chance for tanks, starts at 20%
      basicChance = 1 - tankChance; // Remaining percentage for basics
    } else if (waveNumber <= 89) {
      // Waves 8-89: 90% basic, 10% tank, gradually introduce shooters
      basicChance = 0.90;
      tankChance = 0.10;
      shooterChance = Math.min((waveNumber - 7) * 0.01, 0.05); // Gradually introduce shooters, max at 5%
      basicChance = 1 - (tankChance + shooterChance); // Adjust to fit 100% probability
    } else {
      // Wave 90+: Cap at 85% basic, 10% tank, 5% shooters
      basicChance = 0.85;
      tankChance = 0.10;
      shooterChance = 0.05;
    }
  
    // Calculate random selection based on percentages
    const rand = Math.random();
  
    if (rand < basicChance) {
      return "basic";
    } else if (rand < basicChance + tankChance) {
      return "tank";
    } else {
      return "shooter";
    }
  }
  

  function spawnEnemy() {
    if (gameState === PLAYING && enemiesRemaining > 0 && !waveCooldown) {
      const enemyType = getRandomEnemyTypeByWaveNumber(currentWave);
      enemies.push(createEnemy(enemyType));
      enemiesRemaining--;
    }
  }
  

function handleCurrentPlayerCollisionDamage(enemy, player) {
  if (!player.isInvincible) {
    console.log(
      "Player took this damage:",
      enemy.collisionDamage - player.defense
    );
    player.health -= Math.max(1, enemy.collisionDamage - player.defense); // Decrease currentPlayer HP by collisionDamage
    applyInvincibility(player);

    // End game if health drops to 0 or below
    if (isDead(player)) {
      endGame();
    }
  }
}
// Utility: apply temporary invincibility to an entity
function applyInvincibility(entity) {
  entity.isInvincible = true;
  setTimeout(() => {
    entity.isInvincible = false;
  }, entity.invincibilityDuration);
}

function handleCurrentPlayerBulletDamage(bullet, player) {
    if (!player.isInvincible && !bullet.firedByPlayer) {  // Ensure the bullet was fired by an enemy
      console.log(player.health, "player.health before", bullet.damage, "bullet.damage");
 
      player.health -= bullet.damage; // Decrease player's health by the bullet's damage
      
      console.log(player.health, "player.health after");
      
      applyInvincibility(player);
  
      // Check if the player is dead
      if (isDead(player)) {
        endGame();
      }
  
      bullet.destroy(); // Remove the bullet after it hits the player
    }
  }
  
function isDead(thing) {
  return thing.health <= 0;
}

function handleEnemyDamage(player, bullet, enemy) {
  if (!enemy.isInvincible) {
    let totalDamage = Math.max(
      1,
      player.attack + bullet.damage - enemy.defense
    ); // Calculate damage and ensure it doesn't go negative
    totalDamage = Math.round(totalDamage);
    enemy.health -= totalDamage;
    damageNumbers.push(new DamageNumber(enemy.x, enemy.y, totalDamage));

    enemy.isInvincible = true; // Set invincibility
    setTimeout(() => {
      enemy.isInvincible = false; // Remove invincibility after duration
    }, enemy.invincibilityDuration); // Same duration as player i-frames

    if (!bullet.doesPierce) bullet.destroy();
    if (isDead(enemy)) {
      handleEnemyDeathByBullet(bullet, enemy);
      updateScore(enemy);
    }
  }
}

function calculateEnemiesForWave(waveNumber) {
  const baseEnemies = 5; // Base number of enemies in the first wave
  const growthRate = 1.2; // Exponential growth rate (adjust as needed)
  return Math.floor(baseEnemies * Math.pow(growthRate, waveNumber - 1));
}


function handleEnemyDeathByBullet(bullet, enemy) {
  bullet.destroy();
  enemy.destroy();
  enemiesAliveInWave--;
  console.log(enemiesAliveInWave, "enemiesAliveInWave:");
}

function isWaveCleared(enemiesAliveInWave, waveCooldown) {
  return enemiesAliveInWave === 0 && !waveCooldown;
}

function handleWaveProgression(enemiesAliveInWave, waveCooldown) {
  if (isWaveCleared(enemiesAliveInWave, waveCooldown)) {
    triggerNextWaveCooldown();
  }
}

function updateGame() {
  // Stop updating when game is over
  if (gameState === GAME_OVER) return;

  if (gameState === PLAYING) {
    if (!waveCooldown) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      currentPlayer.update();
      currentPlayer.draw();

      bullets.forEach((bullet) => {
        bullet.update();
        bullet.draw();
        enemies.forEach((enemy) => {
          if (bullet.firedByPlayer && isColliding(bullet, enemy)) {
            handleEnemyDamage(currentPlayer, bullet, enemy);
            handleWaveProgression(enemiesAliveInWave, waveCooldown);
          }
          if (!bullet.firedByPlayer && isColliding(bullet, currentPlayer)) {
            handleCurrentPlayerBulletDamage(bullet, currentPlayer);
          }
        });
      });

      enemies.forEach((enemy) => {
        enemy.update();
        enemy.shoot();
        enemy.draw();
        if (isColliding(enemy, currentPlayer)) {
          handleCurrentPlayerCollisionDamage(enemy, currentPlayer);
        }
      });

      damageNumbers.forEach((damageNumber) => {
        damageNumber.update();
        damageNumber.draw();
      });
    } else {
      // Wave complete / cooldown display
      ctx.fillStyle = "#fff";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        `Wave ${currentWave} Complete!`,
        canvas.width / 2,
        canvas.height / 2
      );
      ctx.font = "24px Arial";
      ctx.fillText(
        "Next wave starting soon...",
        canvas.width / 2,
        canvas.height / 2 + 50
      );
    }
  } else if (gameState === PAUSED) {
    // Draw paused overlay
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(updateGame);
}

function spawnWaveEnemies() {
  console.log(`Starting wave ${currentWave} with ${enemiesRemaining} enemies.`);
  const spawnInterval = setInterval(() => {
    if (enemiesRemaining > 0) {
      spawnEnemy(); // Spawn enemies one by one
    } else {
      clearInterval(spawnInterval); // Stop spawning when no enemies are left
    }
  }, 1000); // Spawn an enemy every 1 second
  //startSpawningEnemies(); // Use the new reusable function
}

function resetEnemySpawnCounters() {
  enemiesRemaining = enemiesToSpawn; // Reset the number of enemies to spawn
  enemiesAliveInWave = enemiesToSpawn; // Reset the number of alive enemies for the new wave
}

function triggerNextWaveCooldown() {
  waveCooldown = true;
  console.log("Next wave cooldown started");

  setTimeout(() => {
    console.log("Next wave starting now");
    updateWave();
    spawnWaveEnemies(); // Start the next wave of enemies
  }, 3000); // 3-second delay between waves
}

function updateGameInfoDisplay(score, currentWave) {
  document.getElementById(
    "gameInfo"
  ).innerText = `Score: ${score} Wave: ${currentWave}`;
}

function hideGameInfoDisplay() {
  document.getElementById("gameInfo").style.display = "none";
}

function updateScore(enemy) {
  score += enemy.score;
  score = Math.round(score);
  updateGameInfoDisplay(score, currentWave);
}

function updateWave() {
  currentWave++;
  // Reflect updated wave number in module/global scope
  window.currentWave = currentWave;
  updateGameInfoDisplay(score, currentWave);
  enemiesToSpawn = calculateEnemiesForWave(currentWave);
  resetEnemySpawnCounters();
  waveCooldown = false; // End cooldown
}

function endGame() {
  // Switch to GAME_OVER state
  gameState = GAME_OVER;
  setFinalStats();
  showGameOverDisplay();
  hideGameInfoDisplay();
}

function setFinalStats() {
  document.getElementById("finalScore").innerText = score; // Display final score
  document.getElementById("finalWave").innerText = currentWave; // Display final wave
}

function showGameOverDisplay() {
  document.getElementById("gameOverScreen").style.display = "block"; // Show game over screen
}

function resetPlayerPosition(player) {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
}

function restartGame() {
  score = 0;
  currentPlayer.health = currentPlayer.maxHealth;
  // Reset to PLAYING state
  gameState = PLAYING;
  currentWave = 1; // Reset to wave 1
  enemiesToSpawn = calculateEnemiesForWave(currentWave);
  resetEnemySpawnCounters();
  resetPlayerPosition(currentPlayer);
  bullets.length = 0;
  enemies.length = 0;
  waveCooldown = false;
  updateGameInfoDisplay(score, currentWave);
  document.getElementById("gameOverScreen").style.display = "none"; // Hide game over screen
  document.getElementById("gameInfo").style.display = "block"; // Show game info display
  // Reset and start the first wave
  spawnWaveEnemies(); // Start the first wave
  updateGame(); // Start the game loop
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  );
}

// Toggle between PLAYING and PAUSED states
function togglePause() {
  if (gameState === PLAYING) {
    gameState = PAUSED;
  } else if (gameState === PAUSED) {
    gameState = PLAYING;
  }
}

function shoot() {
  // Only fire when in PLAYING state
  if (gameState === PLAYING) {
    bullets.push(
      new Bullet(
        currentPlayer.x,
        currentPlayer.y,
        currentPlayer.direction,
        true
      )
    );
  }
}

// Event listeners

document.getElementById("restartButton").addEventListener("click", restartGame);

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " ") shoot();
  if (e.key === "p" && gameState !== GAME_OVER) togglePause();
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});
canvas.addEventListener("mousedown", (e) => {
  if (gameState === PLAYING) {
    const rect = canvas.getBoundingClientRect();
    mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dx = mousePos.x - (currentPlayer.x + currentPlayer.size / 2);
    const dy = mousePos.y - (currentPlayer.y + currentPlayer.size / 2);
    const distance = Math.hypot(dx, dy);
    currentPlayer.direction = { x: dx / distance, y: dy / distance };
    shoot();
  }
});

// Start the game

spawnWaveEnemies();
updateGame();
