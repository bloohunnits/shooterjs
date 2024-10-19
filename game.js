// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
resizeCanvas();

window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Game variables
let score = 0;
let gameOver = false;
let paused = false;
const keys = {};
const bullets = [];
const enemies = [];
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let currentWave = 1;  // Start at wave 1
let enemiesToSpawn = 5;  // Number of enemies in the first wave
let enemiesRemaining = enemiesToSpawn;  // Track how many enemies remain to spawn in the current wave
let enemiesAliveInWave = enemiesRemaining; // Track how many students remain alive in the wave
let waveCooldown = false;  // A flag to introduce a delay between waves


// currentPlayer object
const player1 = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 40,
    speed: 5,
    maxHealth:100,
    health:100,
    isInvincible: false,
    invincibilityDuration: 1000,
    direction: { x: 0, y: -1 },
    update: function() {
        //let moved = false;
        let dx = 0;
        let dy = 0;

        if (keys['ArrowUp'] || keys['w']) dy -= this.speed;
        if (keys['ArrowDown'] || keys['s']) dy += this.speed;
        if (keys['ArrowLeft'] || keys['a']) dx -= this.speed;
        if (keys['ArrowRight'] || keys['d']) dx += this.speed;

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
    drawHealthBar: function() {
        const barWidth = 60;  // Reduced width of health bar
        const barHeight = 10;  // Height of health bar
        const healthPercentage = this.health / this.maxHealth;  // Percentage of health remaining
    
        // Calculate position to center the health bar above the player
        const barX = this.x + (this.size / 2) - (barWidth / 2);
        const barY = this.y - 20;  // Positioned above the player
    
        // Draw background (empty health)
        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
    
        // Draw foreground (remaining health)
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    }
,    
    draw: function() {
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
        ctx.fillStyle = '#00f';
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(this.size / 2, this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
};

currentPlayer = player1;

// Bullet class
class Bullet {
    constructor(x, y, direction) {
        this.x = x + currentPlayer.size / 2 - 5;
        this.y = y + currentPlayer.size / 2 - 5;
        this.size = 10;
        this.speed = 10;
        this.color = 'yellow';
        this.direction = { ...direction };
        this.distanceTraveled = 0;
        this.maxDistance = 4000; // Increased distance for the bullet
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
    constructor() {
        this.size = 30;
        this.speed = 2;
        this.color = 'red';
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
}


function spawnEnemy() {
    if (!gameOver && !paused && enemiesRemaining > 0 && !waveCooldown) {
        enemiesRemaining--;
        enemies.push(new Enemy());
    }
}



function handlecurrentPlayerDamage() {
    if (!currentPlayer.isInvincible) {
        currentPlayer.health -= 20;  // Decrease currentPlayer HP by 20 on collision
        currentPlayer.isInvincible = true;  // Make currentPlayer invincible after taking damage

        // Set a timeout to remove invincibility after the duration
        setTimeout(() => {
            currentPlayer.isInvincible = false;  // After 1 second, currentPlayer can take damage again
        }, currentPlayer.invincibilityDuration);

        // End game if health drops to 0 or below
        if (currentPlayer.health <= 0) {
            endGame();
        }
    }
}

function updateGame() {
    if (gameOver) return;

    // If not paused and not in cooldown
    if (!paused && !waveCooldown) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        currentPlayer.update();
        currentPlayer.draw();

        bullets.forEach(bullet => {
            bullet.update();
            bullet.draw();
            enemies.forEach(enemy => {
                if (isColliding(bullet, enemy)) {
                    bullet.destroy();
                    enemy.destroy();
                    enemiesAliveInWave--;
                    console.log(enemiesAliveInWave,"enemiesAliveInWave:")
                    updateScore();
                    if (enemiesAliveInWave === 0 && !waveCooldown) {
                        triggerNextWaveCooldown();
                    }
                }
            });
        });

        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw();
            if (isColliding(enemy, currentPlayer)) {
                handlecurrentPlayerDamage();
            }
        });

    // Display the wave complete message during cooldown
    } else if (waveCooldown) {
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Wave ${currentWave} Complete!`, canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Next wave starting soon...', canvas.width / 2, canvas.height / 2 + 50);
    }

    requestAnimationFrame(updateGame);
}

function startSpawningEnemies() {
    const spawnInterval = setInterval(() => {
        if (enemiesRemaining > 0) {
            spawnEnemy();  // Spawn enemies one by one
        } else {
            clearInterval(spawnInterval);  // Stop spawning when no enemies are left
        }
    }, 1000);  // Spawn an enemy every 1 second
}

function spawnWaveEnemies() {
    console.log(`Starting wave ${currentWave} with ${enemiesToSpawn} enemies.`);
    startSpawningEnemies();  // Use the new reusable function
}

function triggerNextWaveCooldown() {
    waveCooldown = true;
    console.log('Next wave cooldown started');

    setTimeout(() => {
        console.log('Next wave starting now');
        updateWave();
        enemiesToSpawn = 5 * currentWave;  // Increase enemies based on wave number
        enemiesRemaining = enemiesToSpawn;  // Reset the number of enemies to spawn
        enemiesAliveInWave = enemiesToSpawn;  // Reset the number of alive enemies for the new wave
        waveCooldown = false;  // End cooldown
        spawnWaveEnemies();  // Start the next wave of enemies
    }, 3000);  // 3-second delay between waves
}




function isColliding(a, b) {
    return (
        a.x < b.x + b.size &&
        a.x + a.size > b.x &&
        a.y < b.y + b.size &&
        a.y + a.size > b.y
    );
}

function updateScore() {
    score++;
    document.getElementById('score').innerText = `Score: ${score}`;
}

function updateWave() {
    currentWave++;
    document.getElementById('wave').innerText = `Wave: ${currentWave}`;
}

function endGame() {
    gameOver = true;
    document.getElementById('gameOverScreen').style.display = 'block';
}

function restartGame() {
    score = 0;
    currentPlayer.health = currentPlayer.maxHealth;
    gameOver = false;
    paused = false;
    currentWave = 1;  // Reset to wave 1
    enemiesToSpawn = 5;  // Start with 5 enemies in wave 1
    enemiesRemaining = enemiesToSpawn;  // Reset the number of enemies remaining
    enemiesAliveInWave = enemiesRemaining;  // Reset alive enemies count
    currentPlayer.x = canvas.width / 2;
    currentPlayer.y = canvas.height / 2;
    bullets.length = 0;
    enemies.length = 0;
    waveCooldown = false;
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('wave').innerText = `Wave: ${currentWave}`;
    document.getElementById('gameOverScreen').style.display = 'none';

    // Reset and start the first wave
    spawnWaveEnemies();  // Start the first wave
    updateGame();  // Start the game loop
}



// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') shoot();
    if (e.key === 'p' && !gameOver) togglePause();
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});
canvas.addEventListener('mousedown', (e) => {
    if (!paused && !gameOver) {
        const rect = canvas.getBoundingClientRect();
        mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const dx = mousePos.x - (currentPlayer.x + currentPlayer.size / 2);
        const dy = mousePos.y - (currentPlayer.y + currentPlayer.size / 2);
        const distance = Math.hypot(dx, dy);
        currentPlayer.direction = { x: dx / distance, y: dy / distance };
        shoot();
    }
});
document.getElementById('restartButton').addEventListener('click', restartGame);

function togglePause() {
    paused = !paused;
    if (paused) clearInterval(enemySpawnInterval);
    //else enemySpawnInterval = setInterval(spawnEnemy, 1000);
}

function shoot() {
    if (!paused && !gameOver) {
        bullets.push(new Bullet(currentPlayer.x, currentPlayer.y, currentPlayer.direction));
    }
}

// Start the game
//let enemySpawnInterval = setInterval(spawnEnemy, 1000);
spawnWaveEnemies();
updateGame();
