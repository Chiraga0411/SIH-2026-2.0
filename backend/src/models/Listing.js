const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    parcel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parcel",
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    useType: {
      type: String,
      enum: ["residential", "commercial"],
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    visibility: {
      type: String,
      enum: ["public", "masked"],
      default: "public"
    },

    zoningWarning: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["LIVE", "SOLD", "CLOSED"],
      default: "LIVE"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Listing", listingSchema);