const Registration = require("../models/Registration");
const Listing = require("../models/Listing");
const Parcel = require("../models/Parcel");


// ==========================================
// CREATE REGISTRATION
// ==========================================

exports.createRegistration = async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({
        message: "listingId is required"
      });
    }

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    if (listing.status !== "LIVE") {
      return res.status(400).json({
        message: "Listing is not available"
      });
    }

    // Seller cannot buy own property
    if (listing.owner.toString() === req.user.id.toString()) {
      return res.status(400).json({
        message: "Owner cannot register own listing"
      });
    }

    const parcel = await Parcel.findById(listing.parcel);

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found"
      });
    }

    const existing = await Registration.findOne({
      listing: listing._id,
      status: "PENDING"
    });

    if (existing) {
      return res.json({
        message: "Registration already pending",
        registrationId: existing._id,
        status: existing.status
      });
    }

    const registration = await Registration.create({
      listing: listing._id,
      parcel: parcel._id,
      seller: listing.owner,
      buyer: req.user.id,
      salePrice: listing.price,
      status: "PENDING"
    });

    res.status(201).json({
      message: "Registration submitted",
      registrationId: registration._id,
      status: registration.status
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create registration"
    });
  }
};


// ==========================================
// REGISTRAR QUEUE
// ==========================================

exports.getRegistrationQueue = async (req, res) => {
  try {
    const registrations = await Registration.find({
      status: "PENDING"
    })
      .populate("buyer", "name phone")
      .populate("seller", "name phone")
      .populate("parcel", "ulpin name state district")
      .populate("listing", "price useType");

    res.json({
      count: registrations.length,
      registrations
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch registration queue"
    });
  }
};


// ==========================================
// APPROVE / REJECT REGISTRATION
// ==========================================

exports.updateRegistration = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be APPROVED or REJECTED"
      });
    }

    const registration = await Registration.findById(
      req.params.id
    );

    if (!registration) {
      return res.status(404).json({
        message: "Registration not found"
      });
    }

    if (registration.status !== "PENDING") {
      return res.status(400).json({
        message: "Registration already processed"
      });
    }

    // Rejection
    if (status === "REJECTED") {
      registration.status = "REJECTED";
      registration.approvedBy = req.user.id;
      registration.approvedAt = new Date();

      await registration.save();

      return res.json({
        message: "Registration rejected",
        status: "REJECTED"
      });
    }

    // Approval
    const parcel = await Parcel.findById(
      registration.parcel
    );

    const listing = await Listing.findById(
      registration.listing
    );

    if (!parcel || !listing) {
      return res.status(404).json({
        message: "Parcel or listing not found"
      });
    }

    // Transfer ownership
    parcel.owner = registration.buyer;

    parcel.maskedOwner = "Buyer ••••";

    // Listing becomes SOLD
    listing.status = "SOLD";

    // Registration complete
    registration.status = "APPROVED";
    registration.roRUpdated = true;
    registration.taxNotified = true;
    registration.approvedBy = req.user.id;
    registration.approvedAt = new Date();

    await parcel.save();
    await listing.save();
    await registration.save();

    res.json({
      message: "Registration approved successfully",

      status: "APPROVED",

      ulpin: parcel.ulpin,

      roRUpdated: true,

      taxNotified: true,

      listingStatus: "SOLD"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update registration"
    });
  }
};