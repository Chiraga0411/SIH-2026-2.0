# Land Stack frontend (React + Vite)
    npm install
    npm run dev
Land services: 8 checks and applications (src/services.jsx). Log in as Ramesh Kumar (citizen), Land officer, or System admin. OTP is a demo value.

Structure: `src/data.js` mock data and initial state · `src/screens.jsx` citizen/officer screens · `src/admin.jsx` admin screens · `src/Chat.jsx` assistant · `src/Sat.jsx` placeholder satellite imagery · `src/ui.jsx` shared components · `src/index.css` EVA AOS theme tokens and styles.

Next steps from the plan: replace `data.js` with API calls (`/parcels`, `/claims`, `/listings`...), swap the SVG map and `Sat` canvas for MapLibre with satellite raster tiles, add a JWT auth guard, Hindi toggle and the 3D view.
