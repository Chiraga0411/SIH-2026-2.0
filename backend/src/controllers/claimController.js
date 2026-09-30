const Claim = require("../models/Claim");
const Parcel = require("../models/Parcel");


// POST /api/claims
exports.createClaim = async (req, res) => {
  try {
    const { ulpin } = req.body;

    if (!ulpin) {
      return res.status(400).json({
        message: "ULPIN is required"
      });
    }

    const parcel = await Parcel.findOne({ ulpin });

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found"
      });
    }

    // Already owned by someone
    if (parcel.owner) {
      if (parcel.owner.toString() === req.user.id.toString()) {
        return res.json({
          status: "Verified",
          message: "You already own this parcel"
        });
      }

      return res.json({
        status: "Rejected",
        message: "Parcel is already claimed by another owner"
      });
    }

    // Existing claim
    const existingClaim = await Claim.findOne({
      parcel: parcel._id,
      claimant: req.user.id
    });

    if (existingClaim) {
      return res.json({
        status: existingClaim.status,
        claimId: existingClaim._id
      });
    }

    // Demo verification
    const claim = await Claim.create({
      parcel: parcel._id,
      claimant: req.user.id,
      status: "Verified",
      reviewedAt: new Date()
    });

    // Assign ownership
    parcel.owner = req.user.id;
    parcel.maskedOwner = req.user.name
      .split(" ")
      .map(word => word[0] + "••••")
      .join(" ");

    await parcel.save();

    res.status(201).json({
      message: "Plot claimed successfully",
      status: "Verified",
      claimId: claim._id,
      ulpin: parcel.ulpin
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to claim parcel"
    });
  }
};


// GET /api/claims/my-properties
exports.myProperties = async (req, res) => {
  try {

    const parcels = await Parcel.find({
      owner: req.user.id
    }).select("-owner");

    res.json({
      count: parcels.length,
      properties: parcels
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch properties"
    });
  }
};