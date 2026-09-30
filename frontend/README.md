# LandStack

Unified land-record demo (citizen, land officer, admin). One UI, many states (Chandigarh, Madhya Pradesh).

    npm install
    cp .env.example .env   # add a URL-restricted Mapbox public token
    npm run dev

Log in as Ramesh Kumar (citizen), Land officer, or System admin. OTP is a demo value.

Structure: `src/data.js` mock parcels and state; `src/records.js` per-parcel record fields, name matching and trust breakdown; `src/panels.jsx` record status, score breakdown and data-layer explorer; `src/screens.jsx` citizen/officer screens; `src/admin.jsx` admin screens; `src/Chat.jsx` demo assistant (keyword matching, not retrieval); `src/Sat.jsx` placeholder imagery; `src/ui.jsx` shared components.

Trust score: set `VITE_TRUST_API` to call `GET {base}/score?ulpin=...`; otherwise the panel shows a labelled local estimate.
