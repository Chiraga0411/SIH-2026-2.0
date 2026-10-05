// Run against a real MongoDB replica set after `npm run seed:parcels` (and seed:demo).
//   MONGO_URI="mongodb://localhost:27017/landstack?replicaSet=rs0" npm run verify:db
// Exits 1 if any check fails. Writes nothing permanent (the transaction check aborts on purpose).
require("dotenv").config();
const mongoose = require("mongoose");
const Parcel = require("../src/models/Parcel");
const CITIES = { Chandigarh: [76.7794, 30.7333], "Tamil Nadu": [80.2707, 13.0827], "Madhya Pradesh": [77.4126, 23.2599] };
const CODES = { Chandigarh: "04", "Madhya Pradesh": "23", "Tamil Nadu": "33" };
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); if (!ok) failed++; };

(async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI is not set"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  await Parcel.init(); // builds indexes, including 2dsphere

  const total = await Parcel.countDocuments();
  check("150 parcels", total === 150, `found ${total}`);
  for (const [state, [lng, lat]] of Object.entries(CITIES)) {
    const rows = await Parcel.find({ state }).lean();
    check(`${state}: 50 parcels`, rows.length === 50, `found ${rows.length}`);
    check(`${state}: every ULPIN is 14 characters and starts with ${CODES[state]}`, rows.every((p) => /^[0-9A-Z]{14}$/.test(p.ulpin) && p.ulpin.startsWith(CODES[state])));
    const near = rows.every((p) => { const [x, y] = p.geometry.coordinates[0][0]; return Math.abs(x - lng) < 0.1 && Math.abs(y - lat) < 0.1; });
    check(`${state}: geometry sits near the city`, near);
    const f = (k) => rows.some((p) => p.risks && p.risks[k]);
    check(`${state}: encroachment, stale and mismatch flags present`, f("encroachmentSuspected") && f("staleRecord") && f("dataMismatch"));
    check(`${state}: a floors-over-permit parcel exists`, rows.some((p) => p.floorsBuilt > p.floorsAllowed));
  }

  const idx = await Parcel.collection.indexes();
  check("2dsphere index on geometry", idx.some((i) => i.key && i.key.geometry === "2dsphere"));

  // bbox query exactly as the API builds it: $geoWithin + $geometry polygon
  const [lng, lat] = CITIES["Tamil Nadu"], d = 0.05;
  const poly = { type: "Polygon", coordinates: [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]] };
  const hit = await Parcel.find({ geometry: { $geoWithin: { $geometry: poly } } }).lean();
  check("bbox around Chennai returns parcels", hit.length > 0, `found ${hit.length}`);
  check("bbox around Chennai returns only Tamil Nadu", hit.every((p) => p.state === "Tamil Nadu"));

  // Transactions need a replica set. Write inside one, abort, and confirm nothing was kept.
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  check("MongoDB is a replica set (transactions available)", !!hello.setName, hello.setName || "standalone: set replicaSet in MONGO_URI");
  if (hello.setName) {
    const first = await Parcel.findOne().lean(), session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Parcel.updateOne({ _id: first._id }, { $set: { name: "ROLLBACK-TEST" } }, { session });
        throw new Error("abort on purpose");
      });
    } catch (e) { if (e.message !== "abort on purpose") throw e; }
    await session.endSession();
    const after = await Parcel.findById(first._id).lean();
    check("aborted transaction leaves the parcel unchanged", after.name === first.name);
  }
  await mongoose.disconnect();
  console.log(failed ? `\n${failed} check(s) failed` : "\nAll database checks passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
