const { shapeParcel } = require("../utils/viewer");
const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const Parcel = require("../models/Parcel");
const User = require("../models/User");
const audit = require("../utils/audit");
const { maskName } = require("../utils/mask");
const { findParcelByIdentifier } = require("../utils/parcelLookup");
const { inTransaction, httpError } = require("../utils/tx");

// POST /api/claims  { ulpin }  (14-character ULPIN or old demo ID)
exports.createClaim = async (req, res) => {
  try {
    const { ulpin } = req.body || {};
    if (!ulpin) return res.status(400).json({ message: "ULPIN is required" });
    const parcel = await findParcelByIdentifier(ulpin);
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });

    if (parcel.owner) {
      if (parcel.owner.toString() === req.user.id.toString()) return res.json({ status: "Verified", message: "You already own this parcel" });
      return res.json({ status: "Rejected", message: "Parcel is already claimed by another owner" });
    }
    const existingClaim = await Claim.findOne({ parcel: parcel._id, claimant: req.user.id });
    if (existingClaim) return res.json({ status: existingClaim.status, claimId: existingClaim._id });

    // Decision D4: only disputed parcels need officer review; the rest are auto-verified for the demo.
    const needsReview = parcel.status === "disp";
    const claim = await Claim.create({ parcel: parcel._id, claimant: req.user.id, status: needsReview ? "Pending" : "Verified", reviewedAt: needsReview ? undefined : new Date() });
    if (!needsReview) {
      parcel.owner = req.user.id;
      parcel.maskedOwner = maskName(req.user.name);
      await parcel.save();
    }
    await audit(req, "CLAIM_CREATED", { resourceType: "Claim", resourceId: String(claim._id), ulpin: parcel.ulpin, metadata: { status: claim.status } });
    res.status(201).json({
      message: needsReview ? "Claim submitted for officer review" : "Plot claimed successfully",
      status: claim.status,
      claimId: claim._id,
      ulpin: parcel.ulpin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to claim parcel" });
  }
};

// GET /api/claims/my-properties
exports.myProperties = async (req, res) => {
  try {
    const viewer = { id: req.user.id, role: req.user.role };
    const [parcels, me] = await Promise.all([
      Parcel.find({ owner: req.user.id }).lean(),
      User.findById(req.user.id).select("name phone").lean()
    ]);
    // Owner relation: own name and phone, no account id. noRisks: risk flags and floors are staff-only, even if the owner also holds a staff role.
    const properties = parcels.map((p) => shapeParcel(p, viewer, { ownerUser: me, noRisks: true }));
    res.json({ count: properties.length, properties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch properties" });
  }
};

// GET /api/claims?status=  (officer, admin)
exports.listClaims = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!["Pending", "Verified", "Rejected"].includes(req.query.status)) return res.status(400).json({ message: "Invalid status" });
      filter.status = req.query.status;
    }
    const claims = await Claim.find(filter).sort({ submittedAt: -1 }).limit(200)
      .populate("claimant", "name").populate("parcel", "ulpin name").lean();
    res.json({
      count: claims.length,
      claims: claims.map((c) => ({ id: c._id, claimantName: c.claimant?.name, ulpin: c.parcel?.ulpin, parcelName: c.parcel?.name, status: c.status, submittedAt: c.submittedAt, note: c.note }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch claims" });
  }
};

// PATCH /api/claims/:id  { status: Verified | Rejected, note }  (officer, admin)
exports.decideClaim = async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!["Verified", "Rejected"].includes(status)) return res.status(400).json({ message: "Status must be Verified or Rejected" });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Claim not found" });
    const out = await inTransaction(async (session) => {
      const claim = await Claim.findById(req.params.id).session(session);
      if (!claim) throw httpError(404, "Claim not found");
      if (claim.status !== "Pending") throw httpError(409, "Claim already decided");
      const parcel = await Parcel.findById(claim.parcel).session(session);
      if (!parcel) throw httpError(404, "Parcel not found");
      if (status === "Verified") {
        if (parcel.owner) throw httpError(409, "Parcel already has an owner");
        const claimant = await User.findById(claim.claimant).select("name").session(session);
        parcel.owner = claim.claimant;
        parcel.maskedOwner = maskName(claimant && claimant.name);
        await parcel.save({ session });
      }
      claim.status = status;
      claim.note = typeof note === "string" ? note.slice(0, 500) : undefined;
      claim.reviewedAt = new Date();
      claim.reviewedBy = req.user.id;
      await claim.save({ session });
      await audit(req, status === "Verified" ? "CLAIM_APPROVED" : "CLAIM_REJECTED", { resourceType: "Claim", resourceId: String(claim._id), ulpin: parcel.ulpin }, { session });
      return { id: claim._id, status, ulpin: parcel.ulpin };
    });
    res.json(out);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: "Failed to decide claim" });
  }
};
