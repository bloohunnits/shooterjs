
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

For example, if you want to store the project in a folder named `dev` you can run this command:
```bash
cd ~/dev
```

Then create the game folders and navigate to the path
```bash
mkdir games ; cd games ; mkdir top-down-shooter ; cd top-down-shooter
```

Clone the files to the folder by running
```bash
git clone https://github.com/bloohunnits/shooterjs.git
```


### Step 3: Understand the Project Structure

After cloning, your project directory looks like this:

  .
  ├── node_modules/        (installed dependencies)
  ├── package.json         (npm scripts & devDependencies)
  ├── package-lock.json
  └── public/
      ├── index.html       (entry point for the game)
      ├── game.js          (core game logic)
      ├── titleScreen.js   (title screen logic)
      └── game.css         (styles for the game)


### Step 4: Running the Game in Your Browser

We’ve added a simple HTTP server to avoid file:// CORS issues. To run the game locally:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm run start
   ```
   This serves the `public/` directory on port 8000.
3. Open your browser and go to:
   ```
   http://localhost:8000/
   ```
   This will load `public/index.html` by default.

### Step 5: Deploying to Firebase Hosting

When you’re ready to publish:
1. Log in to Firebase (if you’re not already):
   ```bash
   firebase login
   ```
2. Initialize Hosting in your project directory:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project (or create a new one).
   - Set the public directory to `public`.
   - Choose **No** when asked about single‑page app rewrites (unless you use client‑side routing).
3. Deploy:
   ```bash
   firebase deploy
   ```
   Your game will then be live at `https://<your-project-id>.web.app` (or `.firebaseapp.com`).
