# LandStack backend

Express 5 + MongoDB (Mongoose). Run on port 5000.

## Setup
    npm install
    cp .env.example .env        # then fill in MONGO_URI and JWT_SECRET (see comments in the file)
    npm run seed:officials      # official accounts; prints passwords ONCE
    npm run seed:parcels        # 150 demo parcels (50 each: Chandigarh, Tamil Nadu, Madhya Pradesh)
    npm run seed:dues           # tax dues for about every fifth parcel
    npm run seed:kb             # Assistant knowledge base (English, Hindi, Tamil)
    npm run seed:demo           # two demo citizens, a live listing, a pending consent, a pending registration, two service requests
    npm run dev
    npm test                    # unit tests need no database; the registration rollback test needs mongodb-memory-server

**MongoDB must be a replica set** (Atlas, or a local one-node set: `mongod --replSet rs0` then `rs.initiate()`). Registration approval and claim approval use transactions, which a standalone MongoDB cannot run. Seed scripts refuse to run when `NODE_ENV=production`. All parcel data is synthetic and the ULPIN layout is a demo layout (state 2, district 2, sub-district 3, village 3, plot 4); confirm it against the state guideline before relying on it.

The server refuses to start if `JWT_SECRET` is missing or under 32 characters, and in production if `SMS_PROVIDER` is `console`.

## Authentication
The email is verified once at sign-up. Set `LOGIN_OTP=always` in `.env` to also require an emailed code at every login (stronger, more friction).

**Citizens** (email + password created at sign-up, plus a one-time code sent to their email; SMS is available via `OTP_CHANNEL=sms`):
1. `POST /api/auth/register` {name, phone, email, password, district?, circle?, mauza?} sends an OTP
2. `POST /api/auth/register/verify` {phone, otp} returns `{token, user}`
3. `POST /api/auth/login` {identifier (phone or email), password} returns `{token, user}`. With `LOGIN_OTP=always` it instead sends a code and returns no token yet
4. `POST /api/auth/login/verify` {identifier, otp} (only when `LOGIN_OTP=always`) returns `{token, user}`
5. `POST /api/auth/resend-otp` {identifier, purpose: "login"|"register"} (30 s cooldown)

**Officials:** `POST /api/auth/official-login` {employeeId, password}. Accounts come from `npm run seed:officials` (roles: officer, registrar, planner, auditor, admin).

`GET /api/auth/me` returns the current user. Send `Authorization: Bearer <token>` on protected routes. The role is always read from the database, never trusted from the token.

## OTP and login protections
6-digit code from `crypto.randomInt`, stored as an HMAC (never plaintext), 5-minute expiry, single use, max 5 attempts, new code replaces the old one, 30 s resend cooldown. Account locks for 15 min after 5 wrong passwords. SMS-sending routes are rate limited per IP and per phone/identifier. Wrong password and unknown account return the same response.

## Delivering the OTP
Default is **email** (`OTP_CHANNEL=email`). Set `MAIL_PROVIDER` to:
- `console`: dev only. The code is printed in the server terminal. Refused in production.
- `smtp`: e.g. Gmail with an App password (`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`). Some free hosts block outgoing SMTP ports, so test this on your host.
- `brevo` or `resend`: plain HTTPS APIs that work on any host. Brevo only needs a verified sender address; Resend needs a verified domain to email anyone but yourself.

`OTP_CHANNEL=sms` uses `SMS_PROVIDER` (`twilio` or `msg91`) and needs India's DLT registration. Provider code is unit-tested against mocked services only, so send one real code from your deployed server before relying on it.

## API
Full request and response shapes are in OpenAPI at `/openapi.json` (Swagger UI at `/docs`, which loads Swagger from unpkg and needs internet). Access: Public, Optional (token read if present; response shaped by viewer), Signed in, or role-restricted.

| Route | Access | Purpose |
|---|---|---|
| `GET /api/parcels` (state, zoning, status, bbox, limit) | Optional | List; bbox is `minLng,minLat,maxLng,maxLat`, span at most 2 degrees |
| `GET /api/parcels/search?q=` | Optional | ULPIN, old ID, survey no., plot name; owner name for officer roles and own plots; 60/min per IP |
| `GET /api/parcels/:ulpin` | Optional | One parcel shaped by viewer, owner privacy and consent |
| `GET /api/parcels/:ulpin/full` | Owner, officer roles, active consent | Full report, audited |
| `GET, PUT /api/privacy/:ulpin` | Owner | Per-field visibility |
| `POST /api/claims`, `GET /api/claims/my-properties` | Signed in | Claim (Pending on disputed plots) |
| `GET /api/claims`, `PATCH /api/claims/:id` | Officer, admin | Claims queue and decision |
| `GET /api/listings`, `GET /api/listings/:id` | Optional | Live listings |
| `GET /api/listings/eligibility/:ulpin`, `POST /api/listings`, `POST /api/listings/:id/inquiry` | Signed in | Sell and interest |
| `POST /api/consents`, `GET /api/consents?as=owner\|requester`, `PATCH /api/consents/:id` | Signed in | Consent with purpose |
| `POST /api/registrations`, `GET /api/registrations(?mine=1)`, `PATCH /api/registrations/:id` | Buyer / registrar, admin | Registration; approval is one transaction |
| `GET /api/alerts`, `GET /api/conflicts` | Officer, planner, registrar, auditor, admin | Alerts and rule-based conflicts |
| `GET /api/audit-log` | Admin, auditor | Filters: action, role, actor, ulpin, from, to, page, limit |
| `GET /api/services`, `GET /api/services/:id`, `POST/GET /api/service-requests`, `PATCH /api/service-requests/:id`, `GET /api/service-requests/:id/certificate` | Signed in (PATCH: staff) | Services with steps and SLA |
| `GET /api/service-requests/track?ref=` | Public, 30/min per IP | Limited tracking fields |
| `GET /api/dues`, `POST /api/dues/:id/pay` | Signed in | Tax dues and simulated payment |
| `POST /api/assistant/ask` | Signed in, 20/min per user | Retrieval with source citations (no language model) |

## Privacy
Every parcel response is built by `src/utils/viewer.js`. The owner account ID is never returned. Risk flags and floors built go only to officer, planner, registrar, admin and auditor. Owner name and phone follow the owner's privacy setting (default: name masked, phone hidden); officer roles and the owner see them; admin and auditor see the masked name and the read is audited. An approved consent (valid `CONSENT_TTL_HOURS`, default 24) unlocks fields set to On-consent and the `/full` report.

## Environment variables added
`CONSENT_TTL_HOURS` (consent lifetime in hours, default 24; use 0.01 to test expiry), `DEMO_PASSWORD` (optional, for `seed:demo`), `DISABLE_RATE_LIMIT=1` (tests only, ignored in production). `MONGO_URI` must point to a replica set.

## Known limitations / next steps
- In email mode the phone number is collected but not verified, so don't use it as proof of identity. There is no password-reset flow yet (it could reuse the email OTP).
- Officials sign in with password only. Consider TOTP for admin and registrar roles.
- JWT lives 8 h and cannot be revoked individually (deactivating a user does block it). Add refresh tokens if you need shorter sessions.
- Rate limits are in-memory (per process). Use a shared store such as Redis if you run several instances.
