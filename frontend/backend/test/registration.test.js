// Integration test: needs mongodb-memory-server (dev dependency). It downloads a MongoDB binary on first run,
// so allow network once. Skipped when the package or binary is unavailable.
const test = require("node:test");
const assert = require("node:assert");

let MongoMemoryReplSet;
try { ({ MongoMemoryReplSet } = require("mongodb-memory-server")); } catch { /* not installed */ }

test("registration approval is atomic", { skip: !MongoMemoryReplSet && "mongodb-memory-server not installed" }, async (t) => {
  let rs;
  try { rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); } catch (e) { return t.skip("could not start in-memory replica set: " + e.message); }
  const mongoose = require("mongoose");
  await mongoose.connect(rs.getUri());
  try {
    const User = require("../src/models/User"), Parcel = require("../src/models/Parcel"), Listing = require("../src/models/Listing");
    const Registration = require("../src/models/Registration"), AuditLog = require("../src/models/AuditLog");
    const { updateRegistration } = require("../src/controllers/registrationController");
    const seller = await User.create({ name: "Sita Rao", phone: "1" }), buyer = await User.create({ name: "Ravi Iyer", phone: "2" });
    const parcel = await Parcel.create({ ulpin: "04010010010001", state: "Chandigarh", owner: seller._id, status: "sale", geometry: { type: "Polygon", coordinates: [[[76, 30], [76.1, 30], [76.1, 30.1], [76, 30.1], [76, 30]]] } });
    const listing = await Listing.create({ parcel: parcel._id, owner: seller._id, useType: "residential", price: 100, status: "LIVE" });
    const reg = await Registration.create({ listing: listing._id, parcel: parcel._id, seller: seller._id, buyer: buyer._id, salePrice: 100 });
    const call = async () => { const out = {}; const res = { status(c) { out.code = c; return this; }, json(b) { out.body = b; return this; } }; await updateRegistration({ params: { id: String(reg._id) }, body: { status: "APPROVED" }, user: { id: String(seller._id), role: "registrar" } }, res); return out; };

    // force a failure in the middle: listing.save throws
    const orig = Listing.prototype.save;
    Listing.prototype.save = async function () { throw new Error("boom"); };
    const failed = await call();
    Listing.prototype.save = orig;
    assert.strictEqual(failed.code, 500);
    assert.strictEqual(String((await Parcel.findById(parcel._id)).owner), String(seller._id));
    assert.strictEqual((await Listing.findById(listing._id)).status, "LIVE");
    assert.strictEqual((await Registration.findById(reg._id)).status, "PENDING");
    assert.strictEqual(await AuditLog.countDocuments({ action: "REGISTRATION_APPROVED" }), 0);

    const ok = await call();
    assert.strictEqual(ok.body.status, "APPROVED");
    assert.strictEqual(String((await Parcel.findById(parcel._id)).owner), String(buyer._id));
    assert.strictEqual((await Listing.findById(listing._id)).status, "SOLD");
    assert.strictEqual(await AuditLog.countDocuments({ action: "REGISTRATION_APPROVED" }), 1);

    const again = await call();
    assert.strictEqual(again.code, 409);
  } finally { await mongoose.disconnect(); await rs.stop(); }
});
