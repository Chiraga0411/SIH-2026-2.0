# LandStack full-stack completion

## Completed workflow slice

- **Alerts**: `GET /api/alerts`, role-scoped to officer, planner, registrar, and admin. Returns suspected encroachment, stale-record, data-mismatch, and change-detection alerts using careful wording.
- **Land Services**: catalogue of all eight services at `GET /api/services`; instant checks at `GET /api/services/:id?ulpin=...`; certificate workflows at `POST/GET/PATCH /api/service-requests...`.
- **Audit Log**: `GET /api/audit-log` for official roles, plus audit events for alerts, service checks, service submissions, and service decisions.
- **Swagger**: interactive docs at `/docs`; machine-readable OpenAPI at `/openapi.json`.
- **Frontend integration**: citizen and official login call the backend and store the JWT in session storage; parcel data is hydrated from `GET /api/parcels` when available, while the existing 100-parcel mock dataset remains a graceful offline fallback.
- **Role alignment**: registrar and planner accounts now use the backend roles and receive matching navigation.

## Demo credentials

- Citizen OTP: `123456` after any valid 10-digit Indian mobile number.
- Official password: `demo123`.
- Official IDs: `REV-001`, `REG-001`, `PLN-001`, `ADM-001`.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and a strong `JWT_SECRET`.
2. Run `npm ci` in `backend`, then `npm start`.
3. Run `npm ci` and `npm run dev` in `frontend`.
4. Open `http://localhost:5173`; API docs are at `http://localhost:5000/docs`.

The backend health and documentation routes remain available without MongoDB, but data-backed routes require a configured MongoDB connection and the parcel seed script.
