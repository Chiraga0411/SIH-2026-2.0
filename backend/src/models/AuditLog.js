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

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ ulpin: 1 });

// Append-only: block every update and delete path.
const blocked = () => { throw new Error("Audit log is append-only"); };
["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne",
  "deleteOne", "deleteMany", "findOneAndDelete"].forEach((op) => auditLogSchema.pre(op, { document: false, query: true }, blocked));
auditLogSchema.pre("deleteOne", { document: true, query: false }, blocked);
auditLogSchema.pre("save", function (next) { if (!this.isNew) return next(new Error("Audit log is append-only")); next(); });

module.exports = mongoose.model("AuditLog", auditLogSchema);
