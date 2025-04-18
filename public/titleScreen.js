const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas width and height
canvas.width = window.innerWidth; 
canvas.height = window.innerHeight; 

let previousScore = 0; // Store previous score
let gameStarted = false; // Track if the game has started

// Event listener for starting the game
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !gameStarted) { // Start game on Enter key
        gameStarted = true; // Set gameStarted to true
        startGame(); // Call the function to start the game
    }
});

// Function to start the game (you can replace this with your game logic)
function startGame() {
    // Here you can initialize your game or redirect to the main game logic
    alert('Game Started!'); // Placeholder for starting the game
}

// Draw title screen
function drawTitleScreen() {
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';      

    // Calculate the width of the text to center it
    const startText = 'Press Enter to Start';
    const previousScoreText = 'Previous Score: ' + previousScore;

    // Center the start text
    const startTextWidth = ctx.measureText(startText).width;
    ctx.fillText(startText, (canvas.width - startTextWidth) / 2, canvas.height / 2);

    // Center the previous score text
    const previousScoreWidth = ctx.measureText(previousScoreText).width;
    ctx.fillText(previousScoreText, (canvas.width - previousScoreWidth) / 2, canvas.height / 2 + 40);
}

// Main loop to draw the title screen
function titleScreenLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    drawTitleScreen(); // Draw the title screen
    requestAnimationFrame(titleScreenLoop); // Keep looping
}

// Start the title screen loop
titleScreenLoop();