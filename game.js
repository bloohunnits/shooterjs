console.log("Game script loaded"); // Check if the script is running
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas width and height
canvas.width = window.innerWidth; 
canvas.height = window.innerHeight; 

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 20,
    height: 20,
    speed: 5,
    angle: 0,
};

let bullets = [];
let enemies = [];
let score = 0;
let gameOver = false;
let keys = {}; // Initialize keys object
let gameStarted = false; // Track if the game has started
let previousScore = 0; // Store previous score

// Event listeners for controls
window.addEventListener('keydown', (e) => {
    keys[e.key] = true; // Track key presses
    if (e.key === ' ') shoot(); // Shoot on spacebar
    if (e.key === 'Enter' && !gameStarted) { // Start game on Enter key
        gameStarted = true; // Set gameStarted to true
        previousScore = score; // Store previous score
        score = 0; // Reset score for new game
        gameLoop(); // Start the game loop
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false; // Track key releases
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
});

// Function to shoot bullets
function shoot() {
    if (!gameOver && gameStarted) { // Ensure the game has started
        bullets.push({
            x: player.x,
            y: player.y,
            angle: player.angle,
            speed: 10,
            range: 500,
            distance: 0,
        });
    }
}

// Function to spawn enemies
function spawnEnemy() {
    const edge = Math.random() < 0.5 ? 0 : canvas.width;
    const y = Math.random() * canvas.height;
    enemies.push({
        x: edge,
        y: y,
        width: 20,
        height: 20,
        speed: 2,
    });
}

// Game loop
function gameLoop() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Move player
    if (keys['ArrowUp']) player.y -= player.speed;
    if (keys['ArrowDown']) player.y += player.speed;
    if (keys['ArrowLeft']) player.x -= player.speed;
    if (keys['ArrowRight']) player.x += player.speed;

    // Update bullets
    bullets.forEach((bullet, index) => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
        bullet.distance += bullet.speed;

        // Remove bullet if out of range
        if (bullet.distance > bullet.range) bullets.splice(index, 1);
    });

    // Update enemies
    enemies.forEach((enemy, index) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // Check collision with player
        if (collision(player, enemy)) {
            gameOver = true;
            alert('Game Over! Your score: ' + score);
            document.location.reload();
        }

        // Check collision with bullets
        bullets.forEach((bullet, bulletIndex) => {
            if (collision(bullet, enemy)) {
                score++;
                bullets.splice(bulletIndex, 1);
                enemies.splice(index, 1);
            }
        });
    });
}

// Draw everything
function draw() {
    if (!gameStarted) {
        // Draw title screen
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.fillText('Press Enter to Start', canvas.width / 2 - 100, canvas.height / 2);
        ctx.fillText('Previous Score: ' + previousScore, canvas.width / 2 - 100, canvas.height / 2 + 40);
        return; // Exit the draw function if the game hasn't started
    }

    // Draw player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = 'blue';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(bullet.x, bullet.y, 5, 5);
    });

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 20);
}

// Collision detection
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Start the game
setInterval(spawnEnemy, 1000); // Spawn enemies every second