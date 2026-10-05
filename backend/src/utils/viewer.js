const { activeConsent } = require("./consent");
// The only place that builds a parcel response. Never returns `owner` (account id).
const PUBLIC_FIELDS = ["ulpin", "legacyId", "state", "district", "name", "surveyNo", "area", "zoning", "status", "trustScore", "geometry"];
const STAFF_ROLES = ["officer", "planner", "registrar"];
const OVERSIGHT_ROLES = ["admin", "auditor"];
const RISK_ROLES = [...STAFF_ROLES, ...OVERSIGHT_ROLES];
const DEFAULT_PRIVACY = { ownerName: "masked", phone: "hidden", price: "public", address: "consent" };

function relationOf(parcel, viewer, hasConsent) {
  if (viewer && parcel.owner && String(parcel.owner) === String(viewer.id)) return "owner";
  if (viewer && STAFF_ROLES.includes(viewer.role)) return "staff";
  if (viewer && OVERSIGHT_ROLES.includes(viewer.role)) return "oversight";
  if (hasConsent) return "consented";
  return "public";
}

// What this viewer may see. name: full | masked | none.
function decide(relation, privacy, hasConsent) {
  const p = { ...DEFAULT_PRIVACY, ...(privacy || {}) };
  const open = (setting) => setting === "public" || (setting === "consent" && hasConsent);
  const full = relation === "owner" || relation === "staff";
  const oversight = relation === "oversight";
  let name;
  if (full) name = "full";
  else if (oversight) name = "masked";
  else if (open(p.ownerName)) name = "full";
  else if (p.ownerName === "hidden") name = "none";
  else name = "masked";
  return {
    name,
    phone: full || (!oversight && open(p.phone)),
    price: full || oversight || open(p.price),
    address: full || (!oversight && open(p.address)),
    risks: false // set by role below
  };
}

// Pure serializer. ctx: { privacy, hasConsent, ownerUser: {name, phone}, list }
function shapeParcel(parcel, viewer, ctx = {}) {
  const hasConsent = !!ctx.hasConsent;
  const relation = relationOf(parcel, viewer, hasConsent);
  const d = decide(relation, ctx.privacy, hasConsent);
  const out = { id: parcel._id ? String(parcel._id) : undefined };
  for (const f of PUBLIC_FIELDS) if (parcel[f] !== undefined) out[f] = parcel[f];
  out.viewer = { relation };
  const hidden = [];

  if (parcel.owner) {
    if (d.name === "full" && ctx.ownerUser) out.ownerName = ctx.ownerUser.name;
    else {
      hidden.push("ownerName");
      if (d.name !== "none" && parcel.maskedOwner) out.maskedOwner = parcel.maskedOwner;
    }
    if (d.phone && ctx.ownerUser && ctx.ownerUser.phone) out.phone = ctx.ownerUser.phone;
    else hidden.push("phone");
  }
  if (parcel.price !== undefined) { if (d.price) out.price = parcel.price; else hidden.push("price"); }
  if (parcel.address !== undefined) { if (d.address) out.address = parcel.address; else hidden.push("address"); }

  if (!ctx.noRisks && viewer && RISK_ROLES.includes(viewer.role)) {
    out.risks = parcel.risks;
    out.floorsAllowed = parcel.floorsAllowed;
    out.floorsBuilt = parcel.floorsBuilt;
  }
  if (!ctx.list) out.hidden = hidden;
  return out;
}

// Listing serializer: explicit fields only, so the seller's account id (`owner`) never leaves the server.
// `isMine` lets the UI show the seller their own listing without exposing who the seller is to others.
function shapeListing(listing, shapedParcel, viewer) {
  return {
    id: String(listing._id), parcel: shapedParcel, useType: listing.useType, price: listing.price,
    visibility: listing.visibility, zoningWarning: listing.zoningWarning, status: listing.status,
    createdAt: listing.createdAt, isMine: !!(viewer && listing.owner && String(listing.owner) === String(viewer.id))
  };
}

// Does this response expose owner details to staff/oversight (so the read must be audited)?
function isPrivateRead(shaped) {
  return ["staff", "oversight"].includes(shaped.viewer.relation) && (shaped.viewer.relation === "oversight" || shaped.ownerName || shaped.phone);
}

// Loads only what the rules need, then shapes. deps: { Privacy, Consent, User }
async function shapeOne(parcel, viewer, deps) {
  const ctx = { hasConsent: false };
  const base = relationOf(parcel, viewer, false);
  if (parcel.owner && base !== "owner" && base !== "staff") {
    ctx.privacy = await deps.Privacy.findOne({ parcel: parcel._id }).lean();
    if (viewer && base === "public") {
      ctx.hasConsent = !!(await (deps.activeConsent || activeConsent)(parcel._id, viewer.id));
    }
  }
  const relation = relationOf(parcel, viewer, ctx.hasConsent);
  const d = decide(relation, ctx.privacy, ctx.hasConsent);
  if (parcel.owner && (d.name === "full" || d.phone)) {
    // second query: name and phone leave the database only when the rules allow them
    ctx.ownerUser = await deps.User.findById(parcel.owner).select("name phone").lean();
  }
  return { shaped: shapeParcel(parcel, viewer, ctx), ctx };
}

// List version: one Privacy query for all parcels, no owner details.
async function shapeMany(parcels, viewer, deps) {
  const ids = parcels.filter((p) => p.owner).map((p) => p._id);
  const docs = ids.length ? await deps.Privacy.find({ parcel: { $in: ids } }).lean() : [];
  const byParcel = new Map(docs.map((x) => [String(x.parcel), x]));
  return parcels.map((p) => shapeParcel(p, viewer, { privacy: byParcel.get(String(p._id)), list: true }));
}

module.exports = { shapeListing, shapeParcel, shapeOne, shapeMany, relationOf, decide, isPrivateRead, DEFAULT_PRIVACY, RISK_ROLES };
