
<img width="1556" alt="Screenshot 2024-10-18 at 12 03 43 AM" src="https://github.com/user-attachments/assets/6a1292de-9120-4ce7-889a-ec03a1870ac0">

# Setup and Running the Game

This guide will walk you through how to download the game files, navigate through the project directory, and either run or edit the game locally. We’ll use the terminal for cloning the repository, navigating through folders, and running the game in a web browser.

## 1. Cloning the Repository

To get the project onto your computer, you’ll need to clone the repository from GitHub. Here’s how you can do it:

### Step 1: Open the terminal (or command prompt)
- On **Windows**, press `Win + R`, type `cmd`, and hit **Enter**.
- On **Mac**, open **Terminal** from your Applications or by pressing `Cmd + Space` and searching for "Terminal."

### Step 2: Navigate to the folder where you want to clone the project
Before cloning, you need to decide where to store the project on your computer. You can navigate to any directory you want to work in using the `cd` command.

For example, if you want to store the project in a folder named `dev` you can run:
```bash
cd ~/dev
```

Then create the game folders and navigate to the path
```bash
mkdir games
cd games
mkdir top-down-shooter
cd top-down-shooter
```

Clone the files to the folder by running
```bash
git clone https://github.com/bloohunnits/shooterjs.git
```


### Step 3: Understand the Project Structure

Inside the top-down-shooter folder, you’ll find the following key files:

game.html: The entry point for the game that runs in the browser.
game.js: The core JavaScript file that handles game logic.
titleScreen.js: The JavaScript file that manages the title screen.
game.css: The stylesheet for styling the game elements.


### Step 4: Running the Game in Your Browser
Once you have the files in your top-down-shooter folder, you can run the game directly in your browser.

Open the game.html file in a web browser
Navigate to the folder where game.html is located, and open it in your browser.

For Windows:
Open File Explorer and navigate to C:\Users\YourUsername\dev\games\top-down-shooter.
Find the game.html file.
Right-click on game.html, select Open with, and choose your browser (Chrome, Firefox, etc.).

For Mac:
Open Finder and go to ~/dev/games/top-down-shooter.
Find the game.html file.
Right-click, choose Open With, and select Safari, Chrome, or another browser.

The game should now load in your browser.
