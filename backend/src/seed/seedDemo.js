// Demo data so the buyer flow, consent, registration and tracking work on a fresh database.
// Run after seed:officials and seed:parcels. Refuses to run in production.
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
require("./guard")();
const User = require("../models/User");
const Parcel = require("../models/Parcel");
const Listing = require("../models/Listing");
const Consent = require("../models/Consent");
const Registration = require("../models/Registration");
const ServiceRequest = require("../models/ServiceRequest");
const { maskName } = require("../utils/mask");
const { getService, newRefId, initialSteps } = require("../utils/services");

const DEMO = [
  { name: "Asha Verma", phone: "9000000001", email: "asha.demo@example.com" },
  { name: "Rohan Mehta", phone: "9000000002", email: "rohan.demo@example.com" }
];

async function makeRequest(serviceId, ulpin, applicant, advance = 0) {
  const service = getService(serviceId);
  const init = initialSteps(service);
  const now = new Date();
  for (let i = 0; i < advance; i++) {
    init.steps[init.currentStep].status = "done"; init.steps[init.currentStep].decidedAt = now;
    init.currentStep += 1; init.steps[init.currentStep].status = "in_progress"; init.steps[init.currentStep].startedAt = now;
    init.slaDueAt = new Date(now.getTime() + init.steps[init.currentStep].slaHours * 3600000);
  }
  return ServiceRequest.create({ refId: newRefId(service.prefix), serviceId, serviceName: service.name, ulpin, applicant, department: service.department, fee: service.fee, ...init });
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const password = process.env.DEMO_PASSWORD || crypto.randomBytes(9).toString("base64url") + "9a";
    if (password.length < 12) throw new Error("DEMO_PASSWORD must be at least 12 characters");
    const passwordHash = await bcrypt.hash(password, 12);
    const users = [];
    for (const d of DEMO) {
      users.push(await User.findOneAndUpdate({ phone: d.phone }, { ...d, passwordHash, verified: true, role: "citizen", isActive: true, failedLogins: 0, $unset: { lockUntil: 1 } }, { upsert: true, new: true }));
    }
    const [owner, buyer] = users;
    // reset earlier demo records
    const ids = users.map((u) => u._id);
    await Promise.all([
      Listing.deleteMany({ owner: { $in: ids } }), Consent.deleteMany({ owner: { $in: ids } }),
      Registration.deleteMany({ seller: { $in: ids } }), ServiceRequest.deleteMany({ applicant: { $in: ids } }),
      Parcel.updateMany({ owner: { $in: ids } }, { $set: { status: "none" }, $unset: { owner: 1, maskedOwner: 1 } })
    ]);

    const free = await Parcel.find({ state: "Chandigarh", status: "none", owner: { $exists: false } }).sort({ ulpin: 1 }).limit(3);
    if (free.length < 3) throw new Error("Run npm run seed:parcels first");
    const [forSale, forConsent] = free;
    for (const p of [forSale, forConsent]) { p.owner = owner._id; p.maskedOwner = maskName(owner.name); }
    forSale.status = "sale";
    await forSale.save(); await forConsent.save();

    const listing = await Listing.create({ parcel: forSale._id, owner: owner._id, useType: "residential", price: 12000000, visibility: "public", status: "LIVE" });
    await Registration.create({ listing: listing._id, parcel: forSale._id, seller: owner._id, buyer: buyer._id, salePrice: listing.price, status: "PENDING" });
    await Consent.create({ parcel: forConsent._id, owner: owner._id, requester: buyer._id, purpose: "due_diligence", status: "PENDING" });
    const r1 = await makeRequest("land-use-certificate", forSale.ulpin, owner._id, 1);
    const r2 = await makeRequest("ror-extract", forConsent.ulpin, owner._id, 0);

    console.log("Demo data ready.");
    console.log(`Citizens (password: ${password}):`);
    DEMO.forEach((d) => console.log(`  ${d.name}  phone ${d.phone}  email ${d.email}`));
    console.log(`Owned plots: ${forSale.ulpin} (listed, registration pending), ${forConsent.ulpin} (consent request pending)`);
    console.log(`Tracking IDs: ${r1.refId}, ${r2.refId}`);
    process.exit();
  } catch (e) { console.error(e); process.exit(1); }
})();
