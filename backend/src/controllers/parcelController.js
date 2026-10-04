const Parcel = require("../models/Parcel");
const Privacy = require("../models/Privacy");
const Consent = require("../models/Consent");
const User = require("../models/User");
const audit = require("../utils/audit");
const { activeConsent } = require("../utils/consent");
const { parseBbox } = require("../utils/bbox");
const { isUlpin, normalizeUlpin, escapeRegex } = require("../utils/ulpin");
const { shapeParcel, shapeOne, shapeMany, isPrivateRead, relationOf } = require("../utils/viewer");

const deps = { Privacy, Consent, User };
const STAFF = ["officer", "planner", "registrar"];
const viewerOf = (req) => (req.user ? { id: req.user.id, role: req.user.role } : null);

// GET /api/parcels  (filters: state, zoning, status, bbox, limit)
exports.getParcels = async (req, res) => {
  try {
    const { state, zoning, status, bbox } = req.query;
    const filter = {};
    if (state) filter.state = String(state);
    if (zoning) filter.zoning = String(zoning);
    if (status) filter.status = String(status);
    if (bbox !== undefined) {
      const b = parseBbox(bbox);
      if (!b.ok) return res.status(400).json({ message: b.message });
      filter.geometry = { $geoWithin: { $geometry: b.polygon } };
    }
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || (bbox !== undefined ? 200 : 500), 1), 500);
    const rows = await Parcel.find(filter).limit(limit + 1).lean();
    const truncated = rows.length > limit;
    const shaped = await shapeMany(rows.slice(0, limit), viewerOf(req), deps);
    res.json({ count: shaped.length, truncated, parcels: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch parcels" });
  }
};

// GET /api/parcels/search?q=
exports.searchParcels = async (req, res) => {
  try {
    const raw = String(req.query.q || "").trim().slice(0, 100);
    if (raw.length < 2) return res.status(400).json({ message: "q must be at least 2 characters" });
    const viewer = viewerOf(req);
    const found = new Map(); // id -> { parcel, matchedBy }
    const add = (rows, by) => rows.forEach((p) => { if (found.size < 20 && !found.has(String(p._id))) found.set(String(p._id), { parcel: p, matchedBy: by }); });
    const n = normalizeUlpin(raw);
    if (isUlpin(n)) add(await Parcel.find({ ulpin: n }).limit(20).lean(), "ulpin");
    add(await Parcel.find({ legacyId: raw.toUpperCase() }).limit(20).lean(), "legacyId");
    const safe = escapeRegex(raw);
    add(await Parcel.find({ surveyNo: new RegExp(`^${safe}$`, "i") }).limit(20).lean(), "surveyNo");
    add(await Parcel.find({ name: new RegExp(safe, "i") }).limit(20).lean(), "name");
    if (viewer) {
      const re = new RegExp(safe, "i");
      if (STAFF.includes(viewer.role)) {
        const users = await User.find({ name: re }).select("_id").limit(50).lean();
        if (users.length) add(await Parcel.find({ owner: { $in: users.map((u) => u._id) } }).limit(20).lean(), "owner");
      } else if (viewer.role === "citizen" || viewer.role === "buyer") {
        const me = await User.findById(viewer.id).select("name").lean();
        if (me && re.test(me.name || "")) add(await Parcel.find({ owner: viewer.id }).limit(20).lean(), "owner");
      }
    }
    const items = [...found.values()];
    const shaped = await shapeMany(items.map((i) => i.parcel), viewer, deps);
    res.json({ count: shaped.length, parcels: shaped.map((p, i) => ({ ...p, matchedBy: items[i].matchedBy })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Search failed" });
  }
};

// GET /api/parcels/:ulpin
exports.getParcelByUlpIN = async (req, res) => {
  try {
    const parcel = await Parcel.findOne({ ulpin: normalizeUlpin(req.params.ulpin) }).lean();
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    const { shaped } = await shapeOne(parcel, viewerOf(req), deps);
    if (isPrivateRead(shaped)) {
      const fields = ["ownerName", "phone"].filter((f) => shaped[f]);
      if (shaped.viewer.relation === "oversight") fields.push("maskedOwner");
      await audit(req, "PRIVATE_FIELD_READ", { resourceType: "Parcel", resourceId: String(parcel._id), ulpin: parcel.ulpin, metadata: { fields } });
    }
    res.json(shaped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch parcel" });
  }
};

// GET /api/parcels/:ulpin/full  (owner, officer roles, or an active consent)
exports.getFullReport = async (req, res) => {
  try {
    const parcel = await Parcel.findOne({ ulpin: normalizeUlpin(req.params.ulpin) }).lean();
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    const viewer = viewerOf(req);
    let relation = relationOf(parcel, viewer, false);
    if (relation !== "owner" && relation !== "staff") {
      const ok = relation === "public" && !!(await activeConsent(parcel._id, viewer.id));
      if (!ok) return res.status(403).json({ message: "Consent required or expired" });
      relation = "consented";
    }
    const ownerUser = parcel.owner ? await User.findById(parcel.owner).select("name phone").lean() : null;
    const open = { ownerName: "public", phone: "public", price: "public", address: "public" };
    const shaped = shapeParcel(parcel, viewer, { privacy: open, hasConsent: relation === "consented", ownerUser });
    delete shaped.hidden;
    await audit(req, "PARCEL_FULL_REPORT_VIEWED", { resourceType: "Parcel", resourceId: String(parcel._id), ulpin: parcel.ulpin, metadata: { relation } });
    res.json(shaped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch full report" });
  }
};
