const crypto = require("crypto");
const mongoose = require("mongoose");
const TaxDue = require("../models/TaxDue");
const Parcel = require("../models/Parcel");
const ServiceRequest = require("../models/ServiceRequest");
const audit = require("../utils/audit");
const { findParcelByIdentifier } = require("../utils/parcelLookup");

const STAFF = ["officer", "admin", "registrar", "planner", "auditor"];
const receipt = () => `RCPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
const taxItem = (d, parcel) => ({ id: String(d._id), kind: "tax", label: `Property tax ${d.financialYear}${parcel ? ` (${parcel.name})` : ""}`, amount: d.amount, dueDate: d.dueDate, status: d.status, ulpin: parcel?.ulpin });

// GET /api/dues
exports.listDues = async (req, res) => {
  try {
    let items = [];
    if (STAFF.includes(req.user.role)) {
      const filter = {};
      if (req.query.ulpin) {
        const p = await findParcelByIdentifier(String(req.query.ulpin), { lean: true });
        if (!p) return res.json({ count: 0, items: [] });
        filter.parcel = p._id;
      }
      const dues = await TaxDue.find(filter).populate("parcel", "ulpin name").limit(200).lean();
      items = dues.map((d) => taxItem(d, d.parcel));
    } else {
      const mine = await Parcel.find({ owner: req.user.id }).select("ulpin name").lean();
      const byId = new Map(mine.map((p) => [String(p._id), p]));
      const dues = await TaxDue.find({ parcel: { $in: mine.map((p) => p._id) } }).sort({ dueDate: 1 }).lean();
      items = dues.map((d) => taxItem(d, byId.get(String(d.parcel))));
      const fees = await ServiceRequest.find({ applicant: req.user.id, fee: { $gt: 0 }, feePaid: false }).lean();
      items.push(...fees.map((r) => ({ id: String(r._id), kind: "fee", label: `${r.serviceName} fee (${r.refId})`, amount: r.fee, dueDate: r.createdAt, status: "DUE", ulpin: r.ulpin })));
    }
    res.json({ count: items.length, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch dues" });
  }
};

// POST /api/dues/:id/pay  (simulated, no money moves)
exports.payDue = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Due not found" });
    const paidAt = new Date();
    const receiptNo = receipt();
    const due = await TaxDue.findById(req.params.id);
    if (due) {
      const parcel = await Parcel.findById(due.parcel).select("owner ulpin");
      if (!parcel || !parcel.owner || String(parcel.owner) !== String(req.user.id)) return res.status(403).json({ message: "Only the owner can pay this due" });
      if (due.status === "PAID") return res.status(409).json({ message: "Already paid" });
      due.status = "PAID"; due.paidAt = paidAt; due.receiptNo = receiptNo; due.simulated = true;
      await due.save();
      await audit(req, "PAYMENT_SIMULATED", { resourceType: "TaxDue", resourceId: String(due._id), ulpin: parcel.ulpin, metadata: { amount: due.amount, kind: "tax" } });
      return res.json({ receiptNo, amount: due.amount, paidAt, simulated: true });
    }
    const fee = await ServiceRequest.findById(req.params.id);
    if (!fee || fee.fee <= 0) return res.status(404).json({ message: "Due not found" });
    if (String(fee.applicant) !== String(req.user.id)) return res.status(403).json({ message: "Only the applicant can pay this fee" });
    if (fee.feePaid) return res.status(409).json({ message: "Already paid" });
    fee.feePaid = true;
    await fee.save();
    await audit(req, "PAYMENT_SIMULATED", { resourceType: "ServiceRequest", resourceId: String(fee._id), ulpin: fee.ulpin, metadata: { amount: fee.fee, kind: "fee" } });
    res.json({ receiptNo, amount: fee.fee, paidAt, simulated: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment failed" });
  }
};
