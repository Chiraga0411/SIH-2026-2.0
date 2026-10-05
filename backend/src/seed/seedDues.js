require("dotenv").config();
const mongoose = require("mongoose");
require("./guard")();
const Parcel = require("../models/Parcel");
const TaxDue = require("../models/TaxDue");

// One or two dues for about every fifth parcel. Amounts are demo values derived from area.
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await TaxDue.deleteMany({});
    const parcels = await Parcel.find({}).sort({ ulpin: 1 }).lean();
    const rows = [];
    parcels.forEach((p, idx) => {
      if (idx % 5 !== 0) return;
      const base = Math.round((p.registeredAreaSqYd || 150) * 12);
      rows.push({ parcel: p._id, financialYear: "2026-27", amount: base, dueDate: new Date("2027-03-31") });
      if (idx % 10 === 0) rows.push({ parcel: p._id, financialYear: "2025-26", amount: Math.round(base * 0.9), dueDate: new Date("2026-03-31") });
    });
    await TaxDue.insertMany(rows);
    console.log(`${rows.length} tax dues inserted`);
    process.exit();
  } catch (e) { console.error(e); process.exit(1); }
})();
