const Listing = require("../models/Listing");
const Parcel = require("../models/Parcel");
const Inquiry = require("../models/Inquiry");

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

    const parcel = await Parcel.findOne({ ulpin });

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found"
      });
    }

    // Only owner can sell
    if (
      !parcel.owner ||
      parcel.owner.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "Only the verified owner can list this parcel"
      });
    }

    // Mortgage block
    if (parcel.status === "mort") {
      return res.status(400).json({
        eligible: false,
        reason: "Listing blocked because the parcel has an active mortgage"
      });
    }

    // Dispute block
    if (parcel.status === "disp") {
      return res.status(400).json({
        eligible: false,
        reason: "Listing blocked because the parcel is disputed"
      });
    }

    // Already listed
    const existingListing = await Listing.findOne({
      parcel: parcel._id,
      status: "LIVE"
    });

    if (existingListing) {
      return res.status(400).json({
        message: "This parcel is already listed for sale"
      });
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
      .populate(
        "parcel",
        "ulpin state district name area zoning status trustScore geometry maskedOwner"
      )
      .lean();

    res.json({
      count: listings.length,
      listings
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

    const listing = await Listing.findById(req.params.id)
      .populate(
        "parcel",
        "ulpin state district name area zoning trustScore maskedOwner geometry"
      );

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    res.json(listing);

  } catch (error) {
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