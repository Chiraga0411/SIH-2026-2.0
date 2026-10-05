// OpenAPI 3.0.3 description of every route. Responses show the main fields only.
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema, description = "OK") => ({ description, content: { "application/json": { schema } } });
const body = (schema) => ({ required: true, content: { "application/json": { schema } } });
const obj = (properties, required) => ({ type: "object", properties, ...(required ? { required } : {}) });
const str = { type: "string" }, num = { type: "number" }, bool = { type: "boolean" };
const q = (name, description, schema = str) => ({ name, in: "query", description, schema });
const p = (name, description = name) => ({ name, in: "path", required: true, description, schema: str });
const err = (description) => json(ref("Error"), description);
const errs = { 401: err("Missing or invalid token"), 403: err("Not allowed for this role or viewer") };
const open = { security: [] };
const optional = { security: [{}, { bearerAuth: [] }] };
const staffRoles = "officer, planner, registrar, auditor, admin";

module.exports = {
  openapi: "3.0.3",
  info: { title: "LandStack API", version: "2.0.0", description: "Verified land records, privacy, consent, services, dues and audit APIs. Demo data is synthetic." },
  servers: [{ url: "/api" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: obj({ message: str }),
      Parcel: obj({
        id: str, ulpin: { type: "string", description: "14 characters [0-9A-Z]" }, legacyId: str, surveyNo: str, state: str, district: str, name: str, area: str, zoning: str, status: str, trustScore: num, geometry: { type: "object", description: "GeoJSON Polygon" },
        ownerName: { type: "string", description: "Only when the viewer may see it" }, maskedOwner: str, phone: { type: "string", description: "Only when allowed" }, price: str, address: str,
        risks: { type: "object", description: "Officer roles, admin and auditor only" }, floorsAllowed: num, floorsBuilt: num,
        viewer: obj({ relation: { type: "string", enum: ["owner", "staff", "oversight", "consented", "public"] } }), hidden: { type: "array", items: str }, matchedBy: str
      }),
      Privacy: obj({ ulpin: str, ownerName: { type: "string", enum: ["hidden", "masked", "consent", "public"] }, phone: { type: "string", enum: ["hidden", "masked", "consent", "public"] }, price: { type: "string", enum: ["hidden", "masked", "consent", "public"] }, address: { type: "string", enum: ["hidden", "masked", "consent", "public"] } }),
      ServiceRequest: obj({ id: str, refId: str, serviceId: str, serviceName: str, ulpin: str, department: str, fee: num, feePaid: bool, status: { type: "string", enum: ["IN_PROGRESS", "ISSUED", "REJECTED"] }, steps: { type: "array", items: obj({ name: str, department: str, slaHours: num, status: str }) }, currentStep: num, slaDueAt: { type: "string", format: "date-time" }, rejection: obj({ department: str, step: str, reason: str }) })
    }
  },
  paths: {
    "/auth/register": { post: { ...open, tags: ["Auth"], summary: "Create citizen account and send OTP", requestBody: body(obj({ name: str, phone: str, email: str, password: str }, ["name", "phone", "email", "password"])), responses: { 200: json(obj({ message: str })), 400: err("Invalid input"), 429: err("Rate limited") } } },
    "/auth/register/verify": { post: { ...open, tags: ["Auth"], summary: "Verify registration OTP; returns token", requestBody: body(obj({ phone: str, otp: str })), responses: { 200: json(obj({ token: str, user: { type: "object" } })), 400: err("Wrong or expired code") } } },
    "/auth/login": { post: { ...open, tags: ["Auth"], summary: "Citizen password login (OTP if LOGIN_OTP=always)", requestBody: body(obj({ identifier: str, password: str })), responses: { 200: json(obj({ token: str })), 401: err("Wrong credentials"), 429: err("Rate limited or locked") } } },
    "/auth/login/verify": { post: { ...open, tags: ["Auth"], summary: "Verify login OTP", requestBody: body(obj({ identifier: str, otp: str })), responses: { 200: json(obj({ token: str })), 400: err("Wrong or expired code") } } },
    "/auth/resend-otp": { post: { ...open, tags: ["Auth"], summary: "Resend OTP (30 s cooldown)", requestBody: body(obj({ identifier: str, purpose: str })), responses: { 200: json(obj({ message: str })), 429: err("Cooldown or rate limit") } } },
    "/auth/official-login": { post: { ...open, tags: ["Auth"], summary: "Employee ID and password login", requestBody: body(obj({ employeeId: str, password: str })), responses: { 200: json(obj({ token: str })), 401: err("Wrong credentials") } } },
    "/auth/me": { get: { tags: ["Auth"], summary: "Current user", responses: { 200: json(obj({ user: { type: "object" } })), 401: errs[401] } } },

    "/parcels": { get: { ...optional, tags: ["Parcels"], summary: "List parcels, shaped by viewer. Anonymous callers get public fields only", parameters: [q("state", "State name"), q("zoning", "R, C, A, I or G"), q("status", "none, sale, mort or disp"), q("bbox", "minLng,minLat,maxLng,maxLat (span at most 2 degrees)"), q("limit", "Default 200 with bbox, else 500; max 500", num)], responses: { 200: json(obj({ count: num, truncated: bool, parcels: { type: "array", items: ref("Parcel") } })), 400: err("Invalid bbox") } } },
    "/parcels/search": { get: { ...optional, tags: ["Parcels"], summary: "Search by ULPIN, old ID, survey number or plot name. Owner name only for officer roles and own plots. 60 requests per minute per IP", parameters: [q("q", "Search text, at least 2 characters")], responses: { 200: json(obj({ count: num, parcels: { type: "array", items: ref("Parcel") } })), 400: err("q too short"), 429: err("Rate limited") } } },
    "/parcels/{ulpin}": { get: { ...optional, tags: ["Parcels"], summary: "One parcel, shaped by viewer, owner privacy setting and active consent", parameters: [p("ulpin")], responses: { 200: json(ref("Parcel")), 404: err("Not found") } } },
    "/parcels/{ulpin}/full": { get: { tags: ["Parcels"], summary: "Full report for the owner, officer roles or a user with an active consent. Audited", parameters: [p("ulpin")], responses: { 200: json(ref("Parcel")), ...errs, 404: err("Not found") } } },

    "/privacy/{ulpin}": {
      get: { tags: ["Privacy"], summary: "Owner reads per-field visibility", parameters: [p("ulpin")], responses: { 200: json(ref("Privacy")), ...errs, 404: err("Not found") } },
      put: { tags: ["Privacy"], summary: "Owner updates visibility. Making phone public needs confirmPublicPhone true", parameters: [p("ulpin")], requestBody: body(obj({ ownerName: str, phone: str, price: str, address: str, confirmPublicPhone: bool })), responses: { 200: json(ref("Privacy")), 400: err("Invalid value"), ...errs, 404: err("Not found") } }
    },

    "/claims": {
      post: { tags: ["Claims"], summary: "Claim a parcel by ULPIN or old ID. Verified, Pending (disputed parcel) or Rejected", requestBody: body(obj({ ulpin: str }, ["ulpin"])), responses: { 200: json(obj({ status: str })), 201: json(obj({ status: str, claimId: str })), 404: err("Parcel not found"), 401: errs[401] } },
      get: { tags: ["Claims"], summary: `Claims queue (officer, admin)`, parameters: [q("status", "Pending, Verified or Rejected")], responses: { 200: json(obj({ count: num, claims: { type: "array", items: { type: "object" } } })), ...errs } }
    },
    "/claims/my-properties": { get: { tags: ["Claims"], summary: "The caller's verified plots", responses: { 200: json(obj({ count: num, properties: { type: "array", items: { type: "object" } } })), 401: errs[401] } } },
    "/claims/{id}": { patch: { tags: ["Claims"], summary: "Approve or reject a Pending claim (officer, admin). One transaction. Audited", parameters: [p("id")], requestBody: body(obj({ status: { type: "string", enum: ["Verified", "Rejected"] }, note: str }, ["status"])), responses: { 200: json(obj({ id: str, status: str, ulpin: str })), 404: err("Not found"), 409: err("Already decided or parcel owned"), ...errs } } },

    "/listings": {
      get: { ...optional, tags: ["Listings"], summary: "Live listings with the parcel shaped by viewer", parameters: [q("use_type", "residential or commercial"), q("price", "Maximum price", num)], responses: { 200: json(obj({ count: num, listings: { type: "array", items: { type: "object" } } })) } },
      post: { tags: ["Listings"], summary: "Create a listing (owner). Blocked on mortgage, dispute or existing listing. Audited", requestBody: body(obj({ ulpin: str, useType: str, price: num, visibility: str }, ["ulpin", "useType", "price"])), responses: { 201: json(obj({ listing: { type: "object" } })), 400: err("Blocked: eligible false with reason"), ...errs, 404: err("Parcel not found") } }
    },
    "/listings/eligibility/{ulpin}": { get: { tags: ["Listings"], summary: "Can this plot be listed (owner only)", parameters: [p("ulpin")], responses: { 200: json(obj({ eligible: bool, reason: str, zoning: str, commercialWarning: bool })), ...errs, 404: err("Not found") } } },
    "/listings/{id}": { get: { ...optional, tags: ["Listings"], summary: "One listing", parameters: [p("id")], responses: { 200: json({ type: "object" }), 404: err("Not found") } } },
    "/listings/{id}/inquiry": { post: { tags: ["Listings"], summary: "Buyer interest. Audited", parameters: [p("id")], requestBody: body(obj({ message: str })), responses: { 201: json({ type: "object" }), 400: err("Not allowed"), 404: err("Not found"), 401: errs[401] } } },

    "/consents": {
      post: { tags: ["Consent"], summary: "Buyer requests the full report with a purpose", requestBody: body(obj({ ulpin: str, purpose: { type: "string", enum: ["due_diligence", "loan", "legal", "other"] } }, ["ulpin", "purpose"])), responses: { 201: json(obj({ consentId: str, status: str })), 400: err("Invalid input"), 404: err("Parcel not found"), 401: errs[401] } },
      get: { tags: ["Consent"], summary: "Owner inbox (PENDING and APPROVED) or the caller's own requests", parameters: [q("as", "owner (default) or requester")], responses: { 200: json(obj({ count: num, requests: { type: "array", items: { type: "object" } } })), 401: errs[401] } }
    },
    "/consents/{id}": { patch: { tags: ["Consent"], summary: "Owner approves (valid CONSENT_TTL_HOURS, default 24) or rejects", parameters: [p("id")], requestBody: body(obj({ status: { type: "string", enum: ["APPROVED", "REJECTED"] } })), responses: { 200: json(obj({ status: str, expiresAt: { type: "string", format: "date-time" } })), 404: err("Not found"), 401: errs[401] } } },

    "/registrations": {
      post: { tags: ["Registrations"], summary: "Buyer submits registration for a live listing", requestBody: body(obj({ listingId: str }, ["listingId"])), responses: { 201: json(obj({ registrationId: str, status: str })), 200: json(obj({ message: str }), "Already pending"), 404: err("Not found"), 401: errs[401] } },
      get: { tags: ["Registrations"], summary: "Pending queue (registrar, admin) or ?mine=1 for the buyer's own", parameters: [q("mine", "1 for own registrations")], responses: { 200: json(obj({ count: num, registrations: { type: "array", items: { type: "object" } } })), ...errs } }
    },
    "/registrations/{id}": { patch: { tags: ["Registrations"], summary: "Approve or reject (registrar, admin). Approval is one transaction", parameters: [p("id")], requestBody: body(obj({ status: { type: "string", enum: ["APPROVED", "REJECTED"] } })), responses: { 200: json(obj({ status: str, ulpin: str, listingStatus: str })), 404: err("Not found"), 409: err("Already processed or changed"), ...errs } } },

    "/alerts": { get: { tags: ["Alerts"], summary: `Risk alerts (${staffRoles})`, responses: { 200: json(obj({ count: num, alerts: { type: "array", items: { type: "object" } } })), ...errs } } },
    "/conflicts": { get: { tags: ["Alerts"], summary: `Rule-based data conflicts (${staffRoles}). Rules: AREA_MISMATCH, FLOORS_OVER_PERMIT, LISTED_WHILE_ENCUMBERED, USE_ZONING_MISMATCH`, parameters: [q("state", "State name")], responses: { 200: json(obj({ count: num, conflicts: { type: "array", items: obj({ ruleId: str, severity: str, ulpin: str, parcelName: str, state: str, evidence: { type: "object" }, wording: str }) } })), ...errs } } },
    "/audit-log": { get: { tags: ["Audit"], summary: "Audit events (admin, auditor)", parameters: [q("action", "Action name"), q("role", "Actor role"), q("actor", "User id"), q("ulpin", "ULPIN"), q("from", "ISO date"), q("to", "ISO date"), q("page", "Default 1", num), q("limit", "Default 50, max 200", num)], responses: { 200: json(obj({ total: num, page: num, limit: num, logs: { type: "array", items: { type: "object" } } })), 400: err("Invalid filter"), ...errs } } },

    "/services": { get: { tags: ["Services"], summary: "The 8 services with department, mode and fee", responses: { 200: json(obj({ services: { type: "array", items: { type: "object" } } })), 401: errs[401] } } },
    "/services/{id}": { get: { tags: ["Services"], summary: "Instant checks: encumbrance, property tax query, restriction check", parameters: [p("id"), q("ulpin", "ULPIN or old ID")], responses: { 200: json({ type: "object" }), 404: err("Not found"), 401: errs[401] } } },
    "/service-requests": {
      post: { tags: ["Services"], summary: "Create a certificate request. Returns reference ID, steps and SLA due time", requestBody: body(obj({ serviceId: str, ulpin: str }, ["serviceId", "ulpin"])), responses: { 201: json(obj({ refId: str, request: ref("ServiceRequest"), slaDueAt: str })), 400: err("Invalid service"), 404: err("Parcel not found"), 401: errs[401] } },
      get: { tags: ["Services"], summary: "Own requests; staff see all", responses: { 200: json(obj({ count: num, requests: { type: "array", items: ref("ServiceRequest") } })), 401: errs[401] } }
    },
    "/service-requests/track": { get: { ...open, tags: ["Services"], summary: "Public tracking by reference ID (30 per minute per IP). Returns id, dept, steps, stage and status only", parameters: [q("ref", "e.g. OWN-482913")], responses: { 200: json(obj({ id: str, dept: str, steps: { type: "array", items: str }, stage: num, status: str })), 404: err("Unknown reference"), 429: err("Rate limited") } } },
    "/service-requests/{id}": { patch: { tags: ["Services"], summary: "Advance the current step or reject with a reason (officer, admin, registrar, planner)", parameters: [p("id")], requestBody: body(obj({ action: { type: "string", enum: ["advance", "reject"] }, reason: str }, ["action"])), responses: { 200: json(obj({ request: ref("ServiceRequest") })), 400: err("Invalid action"), 409: err("Request closed"), ...errs } } },
    "/service-requests/{id}/certificate": { get: { tags: ["Services"], summary: "Download an issued certificate (applicant or staff). Audited", parameters: [p("id")], responses: { 200: { description: "Certificate text", content: { "text/plain": { schema: str } } }, 404: err("Not issued"), ...errs } } },

    "/dues": { get: { tags: ["Dues"], summary: "Tax dues for the caller's plots plus unpaid service fees. Staff may pass ulpin", parameters: [q("ulpin", "Staff only")], responses: { 200: json(obj({ count: num, items: { type: "array", items: obj({ id: str, kind: { type: "string", enum: ["tax", "fee"] }, label: str, amount: num, dueDate: str, status: str }) } })), 401: errs[401] } } },
    "/dues/{id}/pay": { post: { tags: ["Dues"], summary: "Simulated payment. No money moves. Audited", parameters: [p("id")], responses: { 200: json(obj({ receiptNo: str, amount: num, paidAt: str, simulated: bool })), 404: err("Not found"), 409: err("Already paid"), ...errs } } },

    "/assistant/ask": { post: { tags: ["Assistant"], summary: "Keyword retrieval with citations plus the caller's own data. 20 per minute per user", requestBody: body(obj({ question: str, lang: { type: "string", enum: ["en", "hi", "ta"] }, ulpin: str }, ["question"])), responses: { 200: json(obj({ answer: str, sources: { type: "array", items: obj({ type: { type: "string", enum: ["kb", "application", "parcel", "due"] }, id: str, label: str }) }, lang: str, matched: bool })), 400: err("question required"), 429: err("Rate limited"), 401: errs[401] } } }
  }
};
