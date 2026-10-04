const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Listing = require("../models/Listing");
const Parcel = require("../models/Parcel");
const User = require("../models/User");
const Consent = require("../models/Consent");
const audit = require("../utils/audit");
const { maskName } = require("../utils/mask");
const { inTransaction, httpError } = require("../utils/tx");

// POST /api/registrations  { listingId }
exports.createRegistration = async (req, res) => {
  try {
    const { listingId } = req.body || {};
    if (!listingId || !mongoose.isValidObjectId(listingId)) return res.status(400).json({ message: "listingId is required" });
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.status !== "LIVE") return res.status(400).json({ message: "Listing is not available" });
    if (listing.owner.toString() === req.user.id.toString()) return res.status(400).json({ message: "Owner cannot register own listing" });
    const parcel = await Parcel.findById(listing.parcel);
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });

    const pending = (existing) => res.json({ message: "Registration already pending", registrationId: existing._id, status: existing.status });
    const existing = await Registration.findOne({ listing: listing._id, status: "PENDING" });
    if (existing) return pending(existing);

    let registration;
    try {
      registration = await Registration.create({ listing: listing._id, parcel: parcel._id, seller: listing.owner, buyer: req.user.id, salePrice: listing.price, status: "PENDING" });
    } catch (e) {
      if (e.code === 11000) return pending(await Registration.findOne({ listing: listing._id, status: "PENDING" }));
      throw e;
    }
    await audit(req, "REGISTRATION_SUBMITTED", { resourceType: "Registration", resourceId: String(registration._id), ulpin: parcel.ulpin });
    res.status(201).json({ message: "Registration submitted", registrationId: registration._id, status: registration.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create registration" });
  }
};

// GET /api/registrations (registrar, admin: pending queue) or ?mine=1 (signed in: own as buyer)
exports.getRegistrationQueue = async (req, res) => {
  try {
    const mine = req.query.mine === "1";
    if (!mine && !["registrar", "admin"].includes(req.user.role)) return res.status(403).json({ message: "You do not have permission" });
    const filter = mine ? { buyer: req.user.id } : { status: "PENDING" };
    const registrations = await Registration.find(filter).sort({ createdAt: -1 })
      .populate("buyer", "name").populate("seller", "name")
      .populate("parcel", "ulpin name state district").populate("listing", "price useType status").lean();
    res.json({ count: registrations.length, registrations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
};

// PATCH /api/registrations/:id  { status: APPROVED | REJECTED }  (registrar, admin). One transaction.
exports.updateRegistration = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Status must be APPROVED or REJECTED" });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Registration not found" });

    const out = await inTransaction(async (session) => {
      const registration = await Registration.findById(req.params.id).session(session);
      if (!registration) throw httpError(404, "Registration not found");
      if (registration.status !== "PENDING") throw httpError(409, "Registration already processed");
      const parcel = await Parcel.findById(registration.parcel).session(session);
      const listing = await Listing.findById(registration.listing).session(session);
      if (!parcel || !listing) throw httpError(404, "Parcel or listing not found");

      if (status === "REJECTED") {
        registration.status = "REJECTED";
        registration.approvedBy = req.user.id;
        registration.approvedAt = new Date();
        await registration.save({ session });
        await audit(req, "REGISTRATION_REJECTED", { resourceType: "Registration", resourceId: String(registration._id), ulpin: parcel.ulpin }, { session });
        return { message: "Registration rejected", status: "REJECTED" };
      }

      // Re-check inside the transaction
      if (listing.status !== "LIVE") throw httpError(409, "Listing is no longer live");
      if (!parcel.owner || String(parcel.owner) !== String(registration.seller)) throw httpError(409, "Seller no longer owns this parcel");

      const buyer = await User.findById(registration.buyer).select("name").session(session);
      parcel.owner = registration.buyer;
      parcel.maskedOwner = maskName(buyer && buyer.name);
      parcel.status = "none";
      listing.status = "SOLD";
      registration.status = "APPROVED";
      registration.roRUpdated = true;
      registration.taxNotified = true;
      registration.approvedBy = req.user.id;
      registration.approvedAt = new Date();

      await parcel.save({ session });
      await listing.save({ session });
      await registration.save({ session });
      await Consent.updateMany({ parcel: parcel._id, status: { $in: ["PENDING", "APPROVED"] } }, { $set: { status: "EXPIRED" } }, { session });
      await audit(req, "REGISTRATION_APPROVED", { resourceType: "Registration", resourceId: String(registration._id), ulpin: parcel.ulpin }, { session });
      return { message: "Registration approved successfully", status: "APPROVED", ulpin: parcel.ulpin, roRUpdated: true, taxNotified: true, listingStatus: "SOLD" };
    });
    res.json(out);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: "Failed to update registration" });
  }
};
