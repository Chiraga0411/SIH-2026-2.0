const mongoose = require("mongoose");
const taxDueSchema = new mongoose.Schema({
  parcel: { type: mongoose.Schema.Types.ObjectId, ref: "Parcel", required: true },
  financialYear: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ["DUE", "PAID"], default: "DUE" },
  paidAt: Date,
  receiptNo: String,
  simulated: { type: Boolean, default: false }
}, { timestamps: true });
taxDueSchema.index({ parcel: 1, status: 1 });
module.exports = mongoose.model("TaxDue", taxDueSchema);
