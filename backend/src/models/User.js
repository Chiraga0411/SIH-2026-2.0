const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    role: {
      type: String,
      enum: [
        "citizen",
        "buyer",
        "officer",
        "registrar",
        "planner",
        "admin"
      ],
      default: "citizen"
    },

    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true
    },

    department: {
      type: String,
      trim: true
    },

    passwordHash: {
      type: String
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);