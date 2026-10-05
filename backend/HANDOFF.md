# Backend v7: final handoff
All backend tasks B1 to B15 are implemented. Run order: npm install, copy .env.example to .env (MONGO_URI = replica set), seed:officials, seed:parcels, seed:dues, seed:kb, seed:demo, npm run dev.
Verified here: 44 unit tests pass, app boots, public/guarded routes answer as expected without a database.
NOT verified (needs MongoDB): seeds, transactions (registration, claim approval), geo queries, full flows. The registration rollback test is in test/registration.test.js and is skipped until mongodb-memory-server is installed (npm install, then it downloads a MongoDB binary on first run).
Frontend contract notes: ids are ULPIN strings; track returns {id, dept, steps, stage, status}; service request PATCH uses {action: advance|reject, reason}; consent POST needs purpose; GET /api/consents?as=requester for the buyer; GET /api/registrations?mine=1 for the buyer.
Demo values to flag in reports: fees, tax amounts, ULPIN layout, Hindi and Tamil KB text (needs native-speaker review).
