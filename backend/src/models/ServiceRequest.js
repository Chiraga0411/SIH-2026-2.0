const mongoose = require("mongoose");
const serviceRequestSchema = new mongoose.Schema({
  serviceId: { type: String, required: true },
  serviceName: { type: String, required: true },
  ulpin: { type: String, required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  department: { type: String, required: true },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  decisionNote: String,
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  decidedAt: Date,
  certificateUrl: String
}, { timestamps: true });
module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
