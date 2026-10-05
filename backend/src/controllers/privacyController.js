const Parcel = require("../models/Parcel");
const Privacy = require("../models/Privacy");
const audit = require("../utils/audit");
const { DEFAULT_PRIVACY } = require("../utils/viewer");

const FIELDS = ["ownerName", "phone", "price", "address"];
const VALUES = ["hidden", "masked", "consent", "public"];

async function ownedParcel(req, res) {
  const parcel = await Parcel.findOne({ ulpin: String(req.params.ulpin) });
  if (!parcel) { res.status(404).json({ message: "Parcel not found" }); return null; }
  if (!parcel.owner || String(parcel.owner) !== String(req.user.id)) {
    res.status(403).json({ message: "Only the verified owner can manage privacy" });
    return null;
  }
  return parcel;
}
const pick = (doc) => Object.fromEntries(FIELDS.map((f) => [f, (doc && doc[f]) || DEFAULT_PRIVACY[f]]));

// GET /api/privacy/:ulpin (owner only)
exports.getPrivacy = async (req, res) => {
  try {
    const parcel = await ownedParcel(req, res);
    if (!parcel) return;
    const doc = await Privacy.findOne({ parcel: parcel._id }).lean();
    res.json({ ulpin: parcel.ulpin, ...pick(doc) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch privacy settings" });
  }
};

// PUT /api/privacy/:ulpin (owner only)
exports.updatePrivacy = async (req, res) => {
  try {
    const parcel = await ownedParcel(req, res);
    if (!parcel) return;
    const body = req.body || {};
    const update = {};
    for (const f of FIELDS) {
      if (body[f] === undefined) continue;
      if (!VALUES.includes(body[f])) return res.status(400).json({ message: `${f} must be one of ${VALUES.join(", ")}` });
      update[f] = body[f];
    }
    if (!Object.keys(update).length) return res.status(400).json({ message: "Send at least one of ownerName, phone, price, address" });
    if (update.phone === "public" && body.confirmPublicPhone !== true) {
      return res.status(400).json({ message: "Making the phone number public needs confirmPublicPhone: true" });
    }
    const existing = await Privacy.findOne({ parcel: parcel._id }).lean();
    const before = pick(existing);
    const changed = Object.keys(update).filter((f) => update[f] !== before[f]);
    const doc = await Privacy.findOneAndUpdate(
      { parcel: parcel._id },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    if (changed.length) await audit(req, "PRIVACY_UPDATED", { resourceType: "Privacy", resourceId: String(parcel._id), ulpin: parcel.ulpin, metadata: { fields: changed } });
    res.json({ ulpin: parcel.ulpin, ...pick(doc) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};
