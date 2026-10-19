Orbittroniz Neon Offroad
A browser-based 3D driving game for Orbittroniz.com. It uses Three.js from a public CDN; no paid API or backend is required for this starter version.
Files
index.html — page structure and interface
style.css — responsive styling
config.js — cars, prices, terrain settings, and game tuning
game.js — 3D world, controls, collectibles, obstacles, garage, and local save
Publish with GitHub + Vercel
In the existing GitHub repository connected to Vercel, create a folder named neon-offroad at the repository root.
Put all five files in that folder. Keep the filenames exactly as written.
Commit and push to the branch Vercel deploys.
After deployment completes, visit https://orbittroniz.com/neon-offroad/.
Do not replace the existing root homepage files. This folder adds a separate game page.
Controls
Keyboard: W/Up accelerate, S/Down brake, A/Left and D/Right steer, Space accelerate, Escape pause.
Touch: drag the steering wheel and press/hold the pedals.
Use +/− to change gear, collect coins and fuel, avoid obstacles, buy cars, and select terrain.
Notes
Coins, owned cars, selected car, fuel, and terrain are saved in this browser's local storage. Clearing site data resets the saved progress.
The car is built from 3D primitives, not a photorealistic licensed model. For more realistic visuals, add a properly licensed GLB/GLTF model and PBR textures.
Three.js loads from jsDelivr, so the first load needs an internet connection. Device performance varies.
