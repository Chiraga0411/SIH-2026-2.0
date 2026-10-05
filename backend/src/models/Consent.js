const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema(
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

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    purpose: {
      type: String,
      enum: ["due_diligence", "loan", "legal", "other"],
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
      default: "PENDING"
    },

    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

consentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("Consent", consentSchema);