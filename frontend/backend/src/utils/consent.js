const Consent = require("../models/Consent");
const audit = require("./audit");

const ttlMs = () => {
  const h = Number(process.env.CONSENT_TTL_HOURS);
  return (Number.isFinite(h) && h > 0 ? h : 24) * 60 * 60 * 1000;
};
// An APPROVED consent whose expiresAt is still in the future.
const activeConsent = (parcelId, userId, now = new Date()) =>
  Consent.findOne({ parcel: parcelId, requester: userId, status: "APPROVED", expiresAt: { $gt: now } }).lean();
// Pure check, so it can be tested with a fake clock.
const isActive = (consent, now = new Date()) => !!consent && consent.status === "APPROVED" && !!consent.expiresAt && new Date(consent.expiresAt) > now;
// Marks APPROVED consents past their expiry as EXPIRED. Returns how many changed.
async function expireStale(now = new Date()) {
  const r = await Consent.updateMany({ status: "APPROVED", expiresAt: { $lte: now } }, { $set: { status: "EXPIRED" } });
  const count = r.modifiedCount || 0;
  if (count) await audit({}, "CONSENT_EXPIRED", { resourceType: "Consent", metadata: { count } });
  return count;
}
module.exports = { ttlMs, activeConsent, expireStale, isActive };
