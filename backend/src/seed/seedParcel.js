// Synthetic demo parcels: 50 per state at real city coordinates. Not state records.
require("dotenv").config();
const mongoose = require("mongoose");
require("./guard")();
const Parcel = require("../models/Parcel");
const { makeUlpin } = require("../utils/ulpin");

const STATES = [
  { state: "Chandigarh", code: "04", district: "Chandigarh", lat: 30.7333, lng: 76.7794, survey: 0, legacyPrefix: "CH",
    names: (i) => `Plot ${i + 1}, Sector ${17 + (i % 18)}` },
  { state: "Tamil Nadu", code: "33", district: "Chennai", lat: 13.0827, lng: 80.2707, survey: 300, legacyPrefix: "TN",
    names: (i) => `Plot ${i + 1}, ${["Adyar", "T. Nagar", "Velachery", "Anna Nagar", "Mylapore", "Guindy", "Nungambakkam", "Porur", "Tambaram", "Perungudi"][i % 10]}` },
  { state: "Madhya Pradesh", code: "23", district: "Bhopal", lat: 23.2599, lng: 77.4126, survey: 600, legacyPrefix: "MP",
    names: (i) => `Plot ${i + 1}, ${["Arera Colony", "MP Nagar", "Kolar Road", "Shahpura", "Berasia Road", "Hoshangabad Road", "Bairagarh", "Piplani", "Habibganj", "Ashoka Garden"][i % 10]}` }
];
const LEGACY = {
  Chandigarh: ["CH-0421-8873", "CH-0421-8874", "CH-0421-9102", "CH-0533-2210", "CH-0533-2211", "CH-0533-3001", "CH-0533-3002", "CH-0612-4101", "CH-0612-4102", "CH-0612-4188"],
  "Tamil Nadu": ["TN-0101-2001"],
  "Madhya Pradesh": ["MP-0101-3001"]
};
const statuses = ["none", "sale", "mort", "disp"];
const zones = ["R", "R", "R", "C"];
const COLS = 10, PITCH_M = 80, SIZE_M = 60; // plots about 60 m wide on an 80 m pitch

// Local index (0..49) flags per state: one of each risk, one floors-over-permit, three area mismatches.
const FLAGS = { encroachment: 4, stale: 12, mismatch: 20, floors: 30 };
const AREA_MISMATCH = { 7: 1.12, 17: 1.08, 27: 1.065 }; // registered vs RoR area ratio (12%, 8%, 6.5% apart)

function polygon(centerLat, centerLng, i) {
  const mLat = 111320, mLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const col = i % COLS, row = Math.floor(i / COLS);
  const south = centerLat + ((row - 2) * PITCH_M) / mLat; // 5 rows centred on the city point
  const west = centerLng + ((col - COLS / 2) * PITCH_M) / mLng;
  const dLat = SIZE_M / mLat, dLng = SIZE_M / mLng;
  const r = (n) => Math.round(n * 1e6) / 1e6;
  return [[[r(west), r(south)], [r(west + dLng), r(south)], [r(west + dLng), r(south + dLat)], [r(west), r(south + dLat)], [r(west), r(south)]]];
}

function build(cfg, i) {
  const base = 150 + ((i * 13) % 200);
  const ratio = AREA_MISMATCH[i] || 1;
  return {
    ulpin: makeUlpin({ state: cfg.code, district: 1, subdistrict: 1 + Math.floor(i / COLS), village: 1 + (i % COLS), plot: i + 1 }),
    legacyId: (LEGACY[cfg.state] || [])[i],
    surveyNo: `${101 + i + cfg.survey}/${1 + ((i * 2) % 5)}`,
    state: cfg.state,
    district: cfg.district,
    name: cfg.names(i),
    address: `${cfg.names(i).replace(/^Plot \d+, /, "")}, ${cfg.district}`,
    area: `${base} sq yd`,
    registeredAreaSqYd: Math.round(base * ratio),
    rorAreaSqYd: base,
    zoning: zones[i % zones.length],
    status: statuses[i % statuses.length],
    trustScore: 40 + ((i * 7) % 61),
    price: `₹${(1 + (i % 5) * 0.4).toFixed(1)} Cr`,
    geometry: { type: "Polygon", coordinates: polygon(cfg.lat, cfg.lng, i) },
    risks: { encroachmentSuspected: i === FLAGS.encroachment, staleRecord: i === FLAGS.stale, dataMismatch: i === FLAGS.mismatch },
    floorsAllowed: i === FLAGS.floors ? 1 : 3,
    floorsBuilt: i === FLAGS.floors ? 3 : 1
  };
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Parcel.deleteMany({});
    const parcels = STATES.flatMap((cfg) => Array.from({ length: 50 }, (_, i) => build(cfg, i)));
    await Parcel.insertMany(parcels);
    await Parcel.syncIndexes();
    console.log(`${parcels.length} parcels inserted (50 per state)`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
if (require.main === module) seed();
module.exports = { build, polygon, STATES };
