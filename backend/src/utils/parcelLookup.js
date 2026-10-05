const Parcel = require("../models/Parcel");
const { isUlpin, normalizeUlpin } = require("./ulpin");
// Accepts a 14-character ULPIN (dashes and spaces allowed) or an old demo ID such as CH-0421-8873.
async function findParcelByIdentifier(identifier, { lean = false } = {}) {
  if (typeof identifier !== "string" || !identifier.trim()) return null;
  const n = normalizeUlpin(identifier);
  const q = isUlpin(n) ? Parcel.findOne({ ulpin: n }) : Parcel.findOne({ legacyId: identifier.trim().toUpperCase() });
  return lean ? q.lean() : q;
}
module.exports = { findParcelByIdentifier };
