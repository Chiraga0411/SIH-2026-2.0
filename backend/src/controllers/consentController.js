const Consent = require("../models/Consent");
const Parcel = require("../models/Parcel");


// ==========================================
// BUYER REQUESTS FULL REPORT
// ==========================================

exports.requestConsent = async (req, res) => {
  try {
    const { ulpin } = req.body;

    const parcel = await Parcel.findOne({ ulpin });

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found"
      });
    }

    if (!parcel.owner) {
      return res.status(400).json({
        message: "Parcel has no registered owner"
      });
    }

    // Owner cannot request own report
    if (parcel.owner.toString() === req.user.id.toString()) {
      return res.status(400).json({
        message: "You are the owner of this parcel"
      });
    }

    const existing = await Consent.findOne({
      parcel: parcel._id,
      requester: req.user.id,
      status: "PENDING"
    });

    if (existing) {
      return res.json({
        message: "Request already pending",
        consentId: existing._id
      });
    }

    const consent = await Consent.create({
      parcel: parcel._id,
      owner: parcel.owner,
      requester: req.user.id,
      status: "PENDING"
    });

    res.status(201).json({
      message: "Full report access requested",
      consentId: consent._id,
      status: "PENDING"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to request consent"
    });
  }
};


// ==========================================
// OWNER CONSENT INBOX
// ==========================================

exports.getConsentInbox = async (req, res) => {
  try {

    const requests = await Consent.find({
      owner: req.user.id,
      status: "PENDING"
    })
      .populate("requester", "name phone role")
      .populate("parcel", "ulpin name state district");

    res.json({
      count: requests.length,
      requests
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch consent requests"
    });
  }
};


// ==========================================
// APPROVE / REJECT
// ==========================================

exports.updateConsent = async (req, res) => {
  try {

    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be APPROVED or REJECTED"
      });
    }

    const consent = await Consent.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!consent) {
      return res.status(404).json({
        message: "Consent request not found"
      });
    }

    if (consent.status !== "PENDING") {
      return res.status(400).json({
        message: "Request already processed"
      });
    }

    consent.status = status;

    // Full report valid for 24 hours
    if (status === "APPROVED") {
      consent.expiresAt =
        new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await consent.save();

    res.json({
      message:
        status === "APPROVED"
          ? "Access approved for 24 hours"
          : "Access request rejected",

      status: consent.status,

      expiresAt: consent.expiresAt || null
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update consent"
    });
  }
};