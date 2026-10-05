const crypto = require("crypto");
// Fees are demo values in INR.
const SERVICES = [
  { id: "ownership-verification", name: "Ownership verification", department: "Revenue + Registration", mode: "request", prefix: "OWN", fee: 100 },
  { id: "ror-extract", name: "RoR extract", department: "Revenue Department", mode: "request", prefix: "ROR", fee: 50 },
  { id: "encumbrance-certificate", name: "Encumbrance certificate", department: "Registration Department", mode: "instant", prefix: "ENC", fee: 0 },
  { id: "building-permission", name: "Building permission", department: "Planning Department", mode: "request", prefix: "BLD", fee: 500 },
  { id: "land-use-certificate", name: "Land use certificate", department: "Planning Department", mode: "request", prefix: "LUC", fee: 200 },
  { id: "property-tax-query", name: "Property tax query", department: "Municipality Department", mode: "instant", prefix: "TAX", fee: 0 },
  { id: "property-mutation", name: "Property mutation", department: "Revenue Department", mode: "request", prefix: "MUT", fee: 300 },
  { id: "restriction-check", name: "Restriction check", department: "Revenue Department", mode: "instant", prefix: "RST", fee: 0 }
];
// Restriction check outcome. Risk flags are staff-only; everyone else gets the yes/no result.
const restrictionResult = (parcel, staff) => ({ clear: !parcel.risks?.encroachmentSuspected, ...(staff ? { flags: parcel.risks || {} } : {}) });
const getService = (id) => SERVICES.find((x) => x.id === id);
// Default template: Submitted, Department review, Verification, Issued.
const stepTemplate = (service) => [
  { name: "Submitted", department: "Citizen portal", slaHours: 0 },
  { name: "Department review", department: service.department, slaHours: 24 },
  { name: "Verification", department: service.department, slaHours: 48 },
  { name: "Issued", department: service.department, slaHours: 24 }
];
const newRefId = (prefix) => `${prefix}-${String(crypto.randomInt(0, 1000000)).padStart(6, "0")}`;
// Builds the initial request data: step 0 done, step 1 in progress.
function initialSteps(service, now = new Date()) {
  const steps = stepTemplate(service).map((s) => ({ ...s, status: "pending" }));
  steps[0] = { ...steps[0], status: "done", startedAt: now, decidedAt: now };
  steps[1] = { ...steps[1], status: "in_progress", startedAt: now };
  return { steps, currentStep: 1, slaDueAt: new Date(now.getTime() + steps[1].slaHours * 3600000) };
}
module.exports = { restrictionResult, SERVICES, getService, stepTemplate, newRefId, initialSteps };
