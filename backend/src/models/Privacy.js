const mongoose = require("mongoose");

const privacySchema = new mongoose.Schema(
  {
    parcel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parcel",
      required: true,
      unique: true
    },

    ownerName: {
      type: String,
      enum: ["hidden", "masked", "consent", "public"],
      default: "masked"
    },

    phone: {
      type: String,
      enum: ["hidden", "masked", "consent", "public"],
      default: "hidden"
    },

    price: {
      type: String,
      enum: ["hidden", "masked", "consent", "public"],
      default: "public"
    },

    address: {
      type: String,
      enum: ["hidden", "masked", "consent", "public"],
      default: "consent"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Privacy", privacySchema);