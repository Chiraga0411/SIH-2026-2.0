const mongoose = require("mongoose");
const stepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: String,
  slaHours: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "in_progress", "done", "rejected"], default: "pending" },
  startedAt: Date,
  decidedAt: Date,
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  note: String
}, { _id: false });
const serviceRequestSchema = new mongoose.Schema({
  refId: { type: String, required: true, unique: true },
  serviceId: { type: String, required: true },
  serviceName: { type: String, required: true },
  ulpin: { type: String, required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  department: { type: String, required: true },
  fee: { type: Number, default: 0 },
  feePaid: { type: Boolean, default: false },
  status: { type: String, enum: ["IN_PROGRESS", "ISSUED", "REJECTED"], default: "IN_PROGRESS" },
  steps: [stepSchema],
  currentStep: { type: Number, default: 0 },
  slaDueAt: Date,
  rejection: { department: String, step: String, reason: String },
  decisionNote: String,
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  decidedAt: Date,
  certificateUrl: String
}, { timestamps: true });
serviceRequestSchema.index({ applicant: 1, createdAt: -1 });
module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
