const ServiceRequest = require("../models/ServiceRequest");
const Parcel = require("../models/Parcel");
const audit = require("../utils/audit");
const SERVICES = [
  { id: "ownership-verification", name: "Ownership verification", department: "Revenue + Registration", mode: "request" },
  { id: "ror-extract", name: "RoR extract", department: "Revenue Department", mode: "request" },
  { id: "encumbrance-certificate", name: "Encumbrance certificate", department: "Registration Department", mode: "instant" },
  { id: "building-permission", name: "Building permission", department: "Planning Department", mode: "request" },
  { id: "land-use-certificate", name: "Land use certificate", department: "Planning Department", mode: "request" },
  { id: "property-tax-query", name: "Property tax query", department: "Municipality Department", mode: "instant" },
  { id: "property-mutation", name: "Property mutation", department: "Revenue Department", mode: "request" },
  { id: "restriction-check", name: "Restriction check", department: "Revenue Department", mode: "instant" }
];
const getService = id => SERVICES.find(x => x.id === id);
exports.listServices = (req, res) => res.json({ services: SERVICES });
exports.getServiceResult = async (req, res) => {
  const service = getService(req.params.id); if (!service) return res.status(404).json({ message: "Service not found" });
  const parcel = await Parcel.findOne({ ulpin: req.query.ulpin }).lean();
  if (!parcel) return res.status(404).json({ message: "Parcel not found" });
  const result = service.id === "property-tax-query"
    ? { status: "COMPLETED", result: { taxStatus: parcel.status === "none" ? "No dues" : "Review required" } }
    : service.id === "encumbrance-certificate"
      ? { status: "COMPLETED", result: { clear: parcel.status !== "mort", mortgage: parcel.status === "mort" ? "Active mortgage on record" : "None on record" } }
      : service.id === "restriction-check"
        ? { status: "COMPLETED", result: { clear: !parcel.risks?.encroachmentSuspected, flags: parcel.risks || {} } }
        : { status: "REQUEST_REQUIRED", message: "This service is issued by the responsible department." };
  await audit(req, "SERVICE_CHECKED", { resourceType: "Parcel", ulpin: parcel.ulpin, metadata: { serviceId: service.id } });
  res.json({ service, ulpin: parcel.ulpin, ...result });
};
exports.createServiceRequest = async (req, res) => {
  const { serviceId, ulpin } = req.body, service = getService(serviceId);
  if (!service || service.mode !== "request") return res.status(400).json({ message: "A certificate-request service is required" });
  const parcel = await Parcel.findOne({ ulpin }); if (!parcel) return res.status(404).json({ message: "Parcel not found" });
  const request = await ServiceRequest.create({ serviceId, serviceName: service.name, ulpin, applicant: req.user.id, department: service.department });
  await audit(req, "SERVICE_REQUEST_CREATED", { resourceType: "ServiceRequest", resourceId: String(request._id), ulpin, metadata: { serviceId } });
  res.status(201).json({ request });
};
exports.listServiceRequests = async (req, res) => {
  const filter = ["officer", "admin", "registrar", "planner"].includes(req.user.role) ? {} : { applicant: req.user.id };
  const requests = await ServiceRequest.find(filter).populate("applicant", "name phone").sort({ createdAt: -1 }); res.json({ count: requests.length, requests });
};
exports.updateServiceRequest = async (req, res) => {
  const { status, decisionNote } = req.body; if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Status must be APPROVED or REJECTED" });
  const request = await ServiceRequest.findById(req.params.id); if (!request) return res.status(404).json({ message: "Service request not found" });
  request.status = status; request.decisionNote = decisionNote || ""; request.decidedBy = req.user.id; request.decidedAt = new Date();
  if (status === "APPROVED") request.certificateUrl = `/api/service-requests/${request._id}/certificate`;
  await request.save(); await audit(req, "SERVICE_REQUEST_DECIDED", { resourceType: "ServiceRequest", resourceId: String(request._id), ulpin: request.ulpin, metadata: { status } });
  res.json({ request });
};
exports.getCertificate = async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id); if (!request || request.status !== "APPROVED") return res.status(404).json({ message: "Approved certificate not found" });
  res.type("text/plain").send(`LandStack certificate\nService: ${request.serviceName}\nULPIN: ${request.ulpin}\nStatus: APPROVED\nIssued: ${request.decidedAt?.toISOString() || ""}`);
};
exports.SERVICES = SERVICES;
