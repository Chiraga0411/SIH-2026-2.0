const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
  {
    ulpin: {
      type: String,
      required: true,
      unique: true
    },

    state: {
      type: String,
      required: true
    },

    district: String,
    name: String,
    area: String,

    zoning: {
      type: String,
      enum: ["R", "C", "A", "I", "G"],
      default: "R"
    },

    status: {
      type: String,
      enum: ["none", "sale", "mort", "disp"],
      default: "none"
    },

    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },

    price: String,

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    maskedOwner: String,

    geometry: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon"
      },
      coordinates: {
        type: [[[Number]]],
        default: []
      }
    },

    risks: {
      encroachmentSuspected: {
        type: Boolean,
        default: false
      },

      staleRecord: {
        type: Boolean,
        default: false
      },

      dataMismatch: {
        type: Boolean,
        default: false
      }
    },

    floorsAllowed: {
      type: Number,
      default: 1
    },

    floorsBuilt: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Parcel", parcelSchema);