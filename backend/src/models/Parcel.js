const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
  {
    ulpin: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9A-Z]{14}$/
    },

    legacyId: String,
    surveyNo: String,
    address: String,
    registeredAreaSqYd: Number,
    rorAreaSqYd: Number,

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
        default: "Polygon",
        required: true
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
        validate: (v) => Array.isArray(v) && v.length > 0 && v[0].length >= 4
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

parcelSchema.index({ geometry: "2dsphere" });
parcelSchema.index({ legacyId: 1 });
parcelSchema.index({ surveyNo: 1 });
parcelSchema.index({ state: 1 });

module.exports = mongoose.model("Parcel", parcelSchema);