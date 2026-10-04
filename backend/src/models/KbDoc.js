const mongoose = require("mongoose");
const kbDocSchema = new mongoose.Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  lang: { type: String, enum: ["en", "hi", "ta"], required: true },
  tags: [String],
  text: { type: String, required: true },
  sourceLabel: { type: String, required: true }
}, { timestamps: true });
kbDocSchema.index({ key: 1, lang: 1 }, { unique: true });
module.exports = mongoose.model("KbDoc", kbDocSchema);
