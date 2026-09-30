const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },

    parcel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parcel",
      required: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    salePrice: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },

    roRUpdated: {
      type: Boolean,
      default: false
    },

    taxNotified: {
      type: Boolean,
      default: false
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    approvedAt: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Registration", registrationSchema);