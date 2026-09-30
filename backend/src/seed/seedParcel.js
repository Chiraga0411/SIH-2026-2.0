const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Parcel = require("../models/Parcel");

dotenv.config();

const statuses = ["none", "sale", "mort", "disp"];
const zones = ["R", "R", "R", "C"];

const owners = [
  "Ramesh Kumar",
  "Suresh Yadav",
  "Manish Thakur",
  "Anil Gupta",
  "Priya Devi"
];

function createPolygon(index) {
  const x = (index % 10) * 0.001;
  const y = Math.floor(index / 10) * 0.001;

  return [
    [
      [x, y],
      [x + 0.0008, y],
      [x + 0.0008, y + 0.0008],
      [x, y + 0.0008],
      [x, y]
    ]
  ];
}

function createParcel(index, state) {

  const prefix = state === "Chandigarh"
    ? "CH"
    : "MP";

  const status = statuses[index % statuses.length];
  const zoning = zones[index % zones.length];

  const trustScore = 40 + ((index * 7) % 61);

  return {
    ulpin: `${prefix}-${String(index + 1).padStart(4, "0")}-${String(1000 + index)}`,

    state,

    district:
      state === "Chandigarh"
        ? "Chandigarh"
        : "Bhopal",

    name: `Plot ${index + 1}, Sector ${22 + (index % 18)}`,

    area: `${150 + (index % 200)} sq yd`,

    zoning,

    status,

    trustScore,

    price: `₹${(1 + (index % 5) * 0.4).toFixed(1)} Cr`,

    maskedOwner:
      owners[index % owners.length]
        .split(" ")
        .map(word => word[0] + "••••")
        .join(" "),

    geometry: {
      type: "Polygon",
      coordinates: createPolygon(index)
    },

    risks: {
      encroachmentSuspected: index === 4,
      staleRecord: index === 12,
      dataMismatch: index === 20
    },

    floorsAllowed: index === 30 ? 1 : 3,

    floorsBuilt: index === 30 ? 3 : 1
  };
}


async function seed() {

  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    await Parcel.deleteMany({});

    const parcels = [];

    // 50 Chandigarh
    for (let i = 0; i < 50; i++) {
      parcels.push(
        createParcel(i, "Chandigarh")
      );
    }

    // 50 Madhya Pradesh
    for (let i = 0; i < 50; i++) {
      parcels.push(
        createParcel(i + 50, "Madhya Pradesh")
      );
    }

    await Parcel.insertMany(parcels);

    console.log(`${parcels.length} parcels inserted ✅`);

    process.exit();

  } catch (error) {

    console.error(error);

    process.exit(1);
  }
}

seed();