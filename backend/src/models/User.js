const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    district: { type: String, trim: true, maxlength: 80 },
    circle: { type: String, trim: true, maxlength: 80 },
    mauza: { type: String, trim: true, maxlength: 80 },

    role: {
      type: String,
      enum: ["citizen", "buyer", "officer", "registrar", "planner", "auditor", "admin"],
      default: "citizen"
    },

    employeeId: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    department: { type: String, trim: true },

    passwordHash: { type: String },
    verified: { type: Boolean, default: false },

    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Email must be unique among verified citizens only (unverified sign-ups can be overwritten).
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { verified: true, email: { $type: "string" } } }
);

module.exports = mongoose.model("User", userSchema);
