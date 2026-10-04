const Consent = require("../models/Consent");
const audit = require("../utils/audit");
const { findParcelByIdentifier } = require("../utils/parcelLookup");
const { ttlMs, expireStale } = require("../utils/consent");

const PURPOSES = ["due_diligence", "loan", "legal", "other"];

// POST /api/consents  { ulpin, purpose }
exports.requestConsent = async (req, res) => {
  try {
    const { ulpin, purpose } = req.body || {};
    if (!PURPOSES.includes(purpose)) return res.status(400).json({ message: `purpose must be one of ${PURPOSES.join(", ")}` });
    const parcel = await findParcelByIdentifier(ulpin);
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    if (!parcel.owner) return res.status(400).json({ message: "Parcel has no registered owner" });
    if (parcel.owner.toString() === req.user.id.toString()) return res.status(400).json({ message: "You are the owner of this parcel" });

    const existing = await Consent.findOne({ parcel: parcel._id, requester: req.user.id, status: "PENDING" });
    if (existing) return res.json({ message: "Request already pending", consentId: existing._id });

    const consent = await Consent.create({ parcel: parcel._id, owner: parcel.owner, requester: req.user.id, purpose, status: "PENDING" });
    await audit(req, "CONSENT_REQUESTED", { resourceType: "Consent", resourceId: String(consent._id), ulpin: parcel.ulpin, metadata: { purpose } });
    res.status(201).json({ message: "Full report access requested", consentId: consent._id, status: "PENDING" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to request consent" });
  }
};

// GET /api/consents?as=owner|requester
exports.getConsents = async (req, res) => {
  try {
    await expireStale();
    const asRequester = req.query.as === "requester";
    const filter = asRequester ? { requester: req.user.id } : { owner: req.user.id, status: { $in: ["PENDING", "APPROVED"] } };
    const q = Consent.find(filter).sort({ createdAt: -1 }).populate("parcel", "ulpin name state district");
    if (!asRequester) q.populate("requester", "name role");
    const requests = await q.lean();
    res.json({ count: requests.length, requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch consent requests" });
  }
};
exports.getConsentInbox = exports.getConsents;

// PATCH /api/consents/:id  { status: APPROVED | REJECTED }
exports.updateConsent = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Status must be APPROVED or REJECTED" });
    const consent = await Consent.findOne({ _id: req.params.id, owner: req.user.id });
    if (!consent) return res.status(404).json({ message: "Consent request not found" });
    if (consent.status !== "PENDING") return res.status(400).json({ message: "Request already processed" });

    consent.status = status;
    if (status === "APPROVED") consent.expiresAt = new Date(Date.now() + ttlMs());
    await consent.save();
    await audit(req, status === "APPROVED" ? "CONSENT_APPROVED" : "CONSENT_REJECTED", { resourceType: "Consent", resourceId: String(consent._id), metadata: { status } });
    res.json({
      message: status === "APPROVED" ? "Access approved" : "Access request rejected",
      status: consent.status,
      expiresAt: consent.expiresAt || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update consent" });
  }
};
