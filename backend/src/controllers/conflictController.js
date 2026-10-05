const Parcel = require("../models/Parcel");
const Listing = require("../models/Listing");
const audit = require("../utils/audit");

const WORDING = "Possible conflict; needs officer review";
const item = (ruleId, severity, p, evidence) => ({ ruleId, severity, ulpin: p.ulpin, parcelName: p.name, state: p.state, evidence, wording: WORDING });

// Pure rules so they can be unit tested. parcels: parcel docs; listings: LIVE listings with .parcel populated.
function findConflicts(parcels, liveListings) {
  const out = [];
  for (const p of parcels) {
    const { registeredAreaSqYd: reg, rorAreaSqYd: ror } = p;
    if (typeof reg === "number" && typeof ror === "number" && ror > 0) {
      const diffPct = Math.round((Math.abs(reg - ror) / ror) * 1000) / 10;
      if (diffPct > 5) out.push(item("AREA_MISMATCH", diffPct > 10 ? "high" : "medium", p, { registered: reg, ror, diffPct }));
    }
    if (typeof p.floorsBuilt === "number" && typeof p.floorsAllowed === "number" && p.floorsBuilt > p.floorsAllowed) {
      out.push(item("FLOORS_OVER_PERMIT", "high", p, { allowed: p.floorsAllowed, built: p.floorsBuilt }));
    }
  }
  for (const l of liveListings) {
    const p = l.parcel;
    if (!p) continue;
    if (["mort", "disp"].includes(p.status)) out.push(item("LISTED_WHILE_ENCUMBERED", "high", p, { listingId: String(l._id), parcelStatus: p.status }));
    if (l.zoningWarning) out.push(item("USE_ZONING_MISMATCH", "medium", p, { listingId: String(l._id), zoning: p.zoning, useType: l.useType }));
  }
  return out;
}

// GET /api/conflicts?state=
exports.getConflicts = async (req, res) => {
  try {
    const filter = req.query.state ? { state: String(req.query.state) } : {};
    const parcels = await Parcel.find(filter).lean();
    const ids = parcels.map((p) => p._id);
    const listings = await Listing.find({ status: "LIVE", parcel: { $in: ids } }).populate("parcel").lean();
    const conflicts = findConflicts(parcels, listings);
    await audit(req, "CONFLICTS_VIEWED", { resourceType: "Conflict", metadata: { count: conflicts.length } });
    res.json({ count: conflicts.length, conflicts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to compute conflicts" });
  }
};
exports.findConflicts = findConflicts;
