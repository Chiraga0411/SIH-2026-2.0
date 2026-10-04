// Creates/updates official accounts. Run: npm run seed:officials   (add --reset to overwrite existing passwords)
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

const OFFICIALS = [
  { employeeId: "REV-001", name: "Vikram Singh", role: "officer", department: "Revenue & Land Records" },
  { employeeId: "REG-001", name: "Sunita Devi", role: "registrar", department: "Registration Department" },
  { employeeId: "PLN-001", name: "Meera Singh", role: "planner", department: "Urban Planning" },
  { employeeId: "TAX-001", name: "Karthik Raja", role: "officer", department: "Revenue / Tax Officer" },
  { employeeId: "AUD-001", name: "Lakshmi Devi", role: "auditor", department: "C&AG Audit" },
  { employeeId: "ADM-001", name: "Ops Admin", role: "admin", department: "IT & System Administration" }
];

const randomPassword = () => crypto.randomBytes(12).toString("base64url") + "9a"; // letters + digit, ~16 chars

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  const shared = process.env.OFFICIAL_PASSWORD;
  if (shared && shared.length < 12) throw new Error("OFFICIAL_PASSWORD must be at least 12 characters");
  const reset = process.argv.includes("--reset");

  await mongoose.connect(process.env.MONGO_URI);
  const issued = [];
  for (const o of OFFICIALS) {
    const existing = await User.findOne({ employeeId: o.employeeId });
    if (existing && !reset) {
      existing.set({ name: o.name, role: o.role, department: o.department, isActive: true });
      await existing.save();
      continue;
    }
    const password = shared || randomPassword();
    const passwordHash = await bcrypt.hash(password, 12);
    if (existing) existing.set({ ...o, passwordHash, failedLogins: 0, lockUntil: undefined, isActive: true }), await existing.save();
    else await User.create({ ...o, passwordHash });
    issued.push([o.employeeId, shared ? "(OFFICIAL_PASSWORD)" : password]);
  }
  if (issued.length) {
    console.log("\nPasswords set. Store them securely, they will not be shown again:\n");
    issued.forEach(([id, pw]) => console.log(`  ${id}  ${pw}`));
  } else console.log("All officials already exist. Use --reset to issue new passwords.");
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
