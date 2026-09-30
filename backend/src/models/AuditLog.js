const mongoose = require("mongoose");
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actorName: String,
  role: String,
  action: { type: String, required: true },
  resourceType: String,
  resourceId: String,
  ulpin: String,
  metadata: mongoose.Schema.Types.Mixed,
  ip: String
}, { timestamps: true });
module.exports = mongoose.model("AuditLog", auditLogSchema);
