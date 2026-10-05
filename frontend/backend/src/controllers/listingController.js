const Listing = require("../models/Listing");
const Parcel = require("../models/Parcel");
const Inquiry = require("../models/Inquiry");
const Privacy = require("../models/Privacy");
const Consent = require("../models/Consent");
const User = require("../models/User");
const audit = require("../utils/audit");
const { findParcelByIdentifier } = require("../utils/parcelLookup");
const { shapeMany, shapeOne, shapeListing } = require("../utils/viewer");

const deps = { Privacy, Consent, User };
const viewerOf = (req) => (req.user ? { id: req.user.id, role: req.user.role } : null);
const logBlocked = (req, parcel, reason) =>
  audit(req, "LISTING_BLOCKED", { resourceType: "Parcel", resourceId: String(parcel._id), ulpin: parcel.ulpin, metadata: { reason } });

// One rule set for createListing and the eligibility endpoint.
async function checkEligibility(parcel, userId) {
  const zoning = parcel.zoning;
  const commercialWarning = parcel.zoning === "R";
  if (!parcel.owner || parcel.owner.toString() !== String(userId)) return { status: 403, eligible: false, code: "not_owner", reason: "Only the verified owner can list this parcel", zoning, commercialWarning };
  if (parcel.status === "mort") return { status: 400, eligible: false, code: "mortgage", reason: "Listing blocked because the parcel has an active mortgage", zoning, commercialWarning };
  if (parcel.status === "disp") return { status: 400, eligible: false, code: "dispute", reason: "Listing blocked because the parcel is disputed", zoning, commercialWarning };
  const existing = await Listing.findOne({ parcel: parcel._id, status: "LIVE" });
  if (existing) return { status: 400, eligible: false, code: "already_listed", reason: "This parcel is already listed for sale", zoning, commercialWarning };
  return { status: 200, eligible: true, zoning, commercialWarning };
}

exports.getEligibility = async (req, res) => {
  try {
    const parcel = await findParcelByIdentifier(req.params.ulpin);
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    const { eligible, reason, zoning, commercialWarning, status } = await checkEligibility(parcel, req.user.id);
    if (status === 403) return res.status(403).json({ message: reason });
    res.json({ eligible, ...(reason ? { reason } : {}), zoning, commercialWarning });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
};

// ==========================================
// CREATE LISTING
// ==========================================

exports.createListing = async (req, res) => {
  try {
    const {
      ulpin,
      useType,
      price,
      visibility
    } = req.body;

    if (!ulpin || !useType || !price) {
      return res.status(400).json({
        message: "ULPIN, useType and price are required"
      });
    }

    const parcel = await findParcelByIdentifier(ulpin);

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found"
      });
    }

    const check = await checkEligibility(parcel, req.user.id);
    if (!check.eligible) {
      if (check.code !== "not_owner") await logBlocked(req, parcel, check.code);
      return res.status(check.status).json(check.code === "already_listed" || check.code === "not_owner" ? { message: check.reason } : { eligible: false, reason: check.reason });
    }

    // Residential → commercial warning
    const zoningWarning =
      parcel.zoning === "R" && useType === "commercial";

    const listing = await Listing.create({
      parcel: parcel._id,
      owner: req.user.id,
      useType,
      price,
      visibility: visibility || "public",
      zoningWarning,
      status: "LIVE"
    });

    // Change parcel status
    parcel.status = "sale";
    await parcel.save();
    await audit(req, "LISTING_CREATED", { resourceType: "Listing", resourceId: String(listing._id), ulpin: parcel.ulpin, metadata: { useType, zoningWarning } });

    res.status(201).json({
      message: "Property listed successfully",
      listing: {
        id: listing._id,
        ulpin: parcel.ulpin,
        useType: listing.useType,
        price: listing.price,
        visibility: listing.visibility,
        zoningWarning: listing.zoningWarning,
        status: listing.status
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create listing"
    });
  }
};


// ==========================================
// GET BUYER LISTINGS
// ==========================================

exports.getListings = async (req, res) => {
  try {

    const {
      use_type,
      price
    } = req.query;

    const filter = {
      status: "LIVE"
    };

    if (use_type) {
      filter.useType = use_type;
    }

    if (price) {
      filter.price = {
        $lte: Number(price)
      };
    }

    const listings = await Listing.find(filter)
      .populate("parcel")
      .lean();

    const live = listings.filter((l) => l.parcel);
    const shaped = await shapeMany(live.map((l) => l.parcel), viewerOf(req), deps);
    const viewer = viewerOf(req);

    res.json({
      count: live.length,
      listings: live.map((l, i) => shapeListing(l, shaped[i], viewer))
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch listings"
    });
  }
};


// ==========================================
// GET SINGLE LISTING
// ==========================================

exports.getListing = async (req, res) => {
  try {

    const listing = await Listing.findById(req.params.id).populate("parcel").lean();

    if (!listing || !listing.parcel) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    const { shaped } = await shapeOne(listing.parcel, viewerOf(req), deps);

    res.json(shapeListing(listing, shaped, viewerOf(req)));

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch listing"
    });
  }
};

// ==========================================
// BUYER INTEREST
// ==========================================

exports.createInquiry = async (req, res) => {
  try {
    const { message } = req.body;

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    if (listing.status !== "LIVE") {
      return res.status(400).json({
        message: "This listing is no longer available"
      });
    }

    // Owner cannot inquire on own property
    if (
      listing.owner.toString() === req.user.id.toString()
    ) {
      return res.status(400).json({
        message: "Owner cannot send inquiry on own property"
      });
    }

    const existing = await Inquiry.findOne({
      listing: listing._id,
      buyer: req.user.id
    });

    if (existing) {
      return res.json({
        message: "Inquiry already sent",
        inquiry: existing
      });
    }

    const inquiry = await Inquiry.create({
      listing: listing._id,
      buyer: req.user.id,
      message: message || ""
    });

    await audit(req, "INQUIRY_CREATED", { resourceType: "Inquiry", resourceId: String(inquiry._id), metadata: { listing: String(listing._id) } });

    res.status(201).json({
      message: "Interest sent successfully",
      inquiry
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to send inquiry"
    });
  }
};