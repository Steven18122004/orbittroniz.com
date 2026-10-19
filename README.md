Orbittroniz Games — Website starter
A responsive, static browser-games dashboard for orbittroniz.com/games/. It uses plain HTML, CSS and JavaScript. No paid APIs, server, or build tools are required.
Included
Responsive dashboard with search and category filters
Ludo Royale (simplified local pass-and-play version)
Neon Snake (keyboard and touch direction buttons, score and saved best score)
Tic-Tac-Toe (computer opponent and two-player mode)
Memory Match (8 pairs, moves counter)
2048 (keyboard and swipe controls, score and saved best score)
App-style visual design, animated hero artwork and modal game windows
Put it on GitHub Pages / Vercel
Download and unzip this project.
Open your GitHub repository for orbittroniz.com.
Create a folder named games in the repository root.
Upload index.html, style.css, and games.js from this project's games folder into that GitHub games/ folder. Keep your existing root homepage files unchanged.
Commit the changes. If the domain is connected to GitHub Pages or Vercel already, the game dashboard should be available at https://orbittroniz.com/games/ after deployment.
For Vercel, import/connect the same repository and keep the project's existing framework/build settings. This folder is static and needs no build command of its own. If the root website is already deployed, adding the games/ directory to the same repository deploys it alongside the homepage.
Controls
Tic-Tac-Toe: tap/click a square; switch between computer and two-player modes.
Snake: arrow keys or WASD on desktop; direction buttons on mobile.
Memory Match: tap/click cards.
2048: arrow keys/WASD or swipe on the board.
Ludo: roll and move using the on-screen buttons; local pass-and-play.
Important notes
This is a beginner-friendly, playable prototype—not a photorealistic 3D game engine. The 3D look is created with CSS gradients, lighting, shadows and perspective. A true 3D open-world game would need an engine such as Godot or Unreal and additional assets.
Ludo is deliberately simplified: the current prototype supports two players by default and simplified token movement. It is not a complete official Ludo rules implementation.
The page uses Google Fonts when an internet connection is available; system fonts are used as fallback.
