const { RISK_ROLES } = require("../utils/viewer");
const ServiceRequest = require("../models/ServiceRequest");
const TaxDue = require("../models/TaxDue");
const audit = require("../utils/audit");
const { SERVICES, getService, newRefId, initialSteps, restrictionResult } = require("../utils/services");
const { findParcelByIdentifier } = require("../utils/parcelLookup");

const STAFF = ["officer", "admin", "registrar", "planner"];
const SEE_ALL = [...STAFF, "auditor"];
const publicService = ({ prefix, ...s }) => s;

exports.listServices = (req, res) => res.json({ services: SERVICES.map(publicService) });

exports.getServiceResult = async (req, res) => {
  try {
    const service = getService(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    const parcel = await findParcelByIdentifier(String(req.query.ulpin || ""), { lean: true });
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    let result;
    if (service.id === "property-tax-query") {
      const dues = await TaxDue.find({ parcel: parcel._id, status: "DUE" }).lean();
      const total = dues.reduce((s, d) => s + d.amount, 0);
      result = { status: "COMPLETED", result: dues.length ? { taxStatus: `Dues pending: ₹${total}`, amount: total, count: dues.length } : { taxStatus: "No dues", amount: 0, count: 0 } };
    } else if (service.id === "encumbrance-certificate") {
      result = { status: "COMPLETED", result: { clear: parcel.status !== "mort", mortgage: parcel.status === "mort" ? "Active mortgage on record" : "None on record" } };
    } else if (service.id === "restriction-check") {
      result = { status: "COMPLETED", result: restrictionResult(parcel, RISK_ROLES.includes(req.user?.role)) };
    } else {
      result = { status: "REQUEST_REQUIRED", message: "This service is issued by the responsible department." };
    }
    await audit(req, "SERVICE_CHECKED", { resourceType: "Parcel", ulpin: parcel.ulpin, metadata: { serviceId: service.id } });
    res.json({ service: publicService(service), ulpin: parcel.ulpin, ...result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Service check failed" });
  }
};

const view = (r) => ({
  id: r._id, refId: r.refId, serviceId: r.serviceId, serviceName: r.serviceName, ulpin: r.ulpin, department: r.department,
  fee: r.fee, feePaid: r.feePaid, status: r.status, steps: r.steps, currentStep: r.currentStep, slaDueAt: r.slaDueAt,
  rejection: r.rejection, certificateUrl: r.certificateUrl, createdAt: r.createdAt, applicant: r.applicant
});

exports.createServiceRequest = async (req, res) => {
  try {
    const { serviceId, ulpin } = req.body || {};
    const service = getService(serviceId);
    if (!service || service.mode !== "request") return res.status(400).json({ message: "A certificate-request service is required" });
    const parcel = await findParcelByIdentifier(String(ulpin || ""), { lean: true });
    if (!parcel) return res.status(404).json({ message: "Parcel not found" });
    const init = initialSteps(service);
    let request;
    for (let attempt = 0; attempt < 5 && !request; attempt++) {
      try {
        request = await ServiceRequest.create({ refId: newRefId(service.prefix), serviceId, serviceName: service.name, ulpin: parcel.ulpin, applicant: req.user.id, department: service.department, fee: service.fee, ...init });
      } catch (e) { if (e.code !== 11000) throw e; }
    }
    if (!request) return res.status(503).json({ message: "Could not create a reference ID. Try again." });
    await audit(req, "SERVICE_REQUESTED", { resourceType: "ServiceRequest", resourceId: String(request._id), ulpin: parcel.ulpin, metadata: { serviceId, refId: request.refId } });
    res.status(201).json({ request: view(request), refId: request.refId, steps: request.steps, slaDueAt: request.slaDueAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create request" });
  }
};

exports.listServiceRequests = async (req, res) => {
  try {
    const filter = SEE_ALL.includes(req.user.role) ? {} : { applicant: req.user.id };
    const rows = await ServiceRequest.find(filter).populate("applicant", "name").sort({ createdAt: -1 }).limit(200).lean();
    res.json({ count: rows.length, requests: rows.map(view) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// PATCH /api/service-requests/:id  { action: "advance" } | { action: "reject", reason }
exports.updateServiceRequest = async (req, res) => {
  try {
    const { action, reason } = req.body || {};
    if (!["advance", "reject"].includes(action)) return res.status(400).json({ message: "action must be advance or reject" });
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Service request not found" });
    if (request.status !== "IN_PROGRESS") return res.status(409).json({ message: "Request is already closed" });
    const now = new Date();
    const step = request.steps[request.currentStep];

    if (action === "reject") {
      if (typeof reason !== "string" || reason.trim().length < 3) return res.status(400).json({ message: "A reason is required" });
      step.status = "rejected"; step.decidedAt = now; step.decidedBy = req.user.id; step.note = reason.trim().slice(0, 500);
      request.status = "REJECTED";
      request.rejection = { department: step.department, step: step.name, reason: step.note };
      request.decisionNote = step.note; request.decidedBy = req.user.id; request.decidedAt = now; request.slaDueAt = undefined;
      request.markModified("steps");
      await request.save();
      await audit(req, "SERVICE_REJECTED", { resourceType: "ServiceRequest", resourceId: String(request._id), ulpin: request.ulpin, metadata: { step: step.name, department: step.department } });
      return res.json({ request: view(request) });
    }

    step.status = "done"; step.decidedAt = now; step.decidedBy = req.user.id;
    const next = request.steps[request.currentStep + 1];
    if (next) {
      next.status = "in_progress"; next.startedAt = now;
      request.currentStep += 1;
      request.slaDueAt = new Date(now.getTime() + next.slaHours * 3600000);
    } else {
      request.status = "ISSUED"; request.decidedBy = req.user.id; request.decidedAt = now; request.slaDueAt = undefined;
      request.currentStep = request.steps.length;
      request.certificateUrl = `/api/service-requests/${request._id}/certificate`;
    }
    request.markModified("steps");
    await request.save();
    await audit(req, "SERVICE_STEP_ADVANCED", { resourceType: "ServiceRequest", resourceId: String(request._id), ulpin: request.ulpin, metadata: { step: step.name, status: request.status } });
    res.json({ request: view(request) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update request" });
  }
};

// GET /api/service-requests/track?ref=  (public). Limited fields only.
exports.trackRequest = async (req, res) => {
  try {
    const ref = String(req.query.ref || "").trim().toUpperCase();
    if (!/^[A-Z]{2,4}-\d{6}$/.test(ref)) return res.status(404).json({ message: "No application found" });
    const r = await ServiceRequest.findOne({ refId: ref }).lean();
    if (!r) return res.status(404).json({ message: "No application found" });
    res.json({ id: r.refId, dept: r.department, steps: r.steps.map((s) => s.name), stage: r.currentStep, status: r.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Tracking failed" });
  }
};

exports.getCertificate = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request || request.status !== "ISSUED") return res.status(404).json({ message: "Issued certificate not found" });
    if (!SEE_ALL.includes(req.user.role) && String(request.applicant) !== String(req.user.id)) return res.status(403).json({ message: "You do not have permission" });
    await audit(req, "CERTIFICATE_DOWNLOADED", { resourceType: "ServiceRequest", resourceId: String(request._id), ulpin: request.ulpin });
    res.type("text/plain").send(`LandStack certificate (demo)\nReference: ${request.refId}\nService: ${request.serviceName}\nULPIN: ${request.ulpin}\nStatus: ISSUED\nIssued: ${request.decidedAt?.toISOString() || ""}`);
  } catch (error) {
    res.status(500).json({ message: "Failed to download certificate" });
  }
};
exports.SERVICES = SERVICES;
