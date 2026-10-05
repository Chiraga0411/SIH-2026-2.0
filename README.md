# LandStack

Unified land-record frontend (citizen, officers, admin). Pilot states: Chandigarh, Tamil Nadu, Madhya Pradesh.

## Run

    npm install
    cp .env.example .env
    npm run dev

- `VITE_API_BASE` empty: the Vite proxy forwards live `/api` calls to the backend.
- Set `VITE_DEMO_MOCK=true` only for the offline mock dataset and demo banner.
- `src/api.js` uses the backend `/api` contract, sends the stored Bearer token on protected calls, and normalizes responses through `src/adapters.js`.
- `VITE_TRUST_API`: optional trust-score service, `GET {base}/score?ulpin=...`.

## Notes
- Map: MapLibre GL with OSM and Esri World Imagery tiles, no token needed.
- Imagery thumbnails use real Esri tiles; parcel placement is illustrative.
- Login OTP is a demo value (123456). Listing and mutation fraud feeds are simulated.
- Login globe: `src/Globe.jsx` (d3-geo canvas, world-atlas land data, drag to rotate).
