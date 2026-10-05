// Minimal in-memory stand-ins for the Mongoose models, so auth logic can be tested without a database.
const path = require("path");
let seq = 0;
const newId = () => String(++seq).padStart(24, "0");

const matches = (doc, q) =>
  Object.entries(q).every(([k, v]) => {
    if (k === "$or") return v.some((x) => matches(doc, x));
    if (k === "_id" || k === "userId") return String(doc[k]) === String(v);
    return doc[k] === v;
  });

function makeModel(defaults) {
  const rows = [];
  class Model {
    constructor(o) { Object.assign(this, defaults, o); }
    async save() { if (!rows.includes(this)) rows.push(this); return this; }
    static async create(o) { const d = new Model({ _id: newId(), ...o }); rows.push(d); return d; }
    static async findOne(q) { return rows.find((r) => matches(r, q)) || null; }
    static async findById(id) { return rows.find((r) => String(r._id) === String(id)) || null; }
    static async deleteOne(q) { const i = rows.findIndex((r) => matches(r, q)); if (i >= 0) rows.splice(i, 1); }
    static async deleteMany(q) { for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], q)) rows.splice(i, 1); }
  }
  Model.rows = rows;
  return Model;
}

const User = makeModel({ role: "citizen", verified: false, isActive: true, failedLogins: 0 });
const Otp = makeModel({ attempts: 0 });
const sentSms = [];
const sentMail = [];

function install() {
  const put = (rel, exports) => {
    const filename = require.resolve(path.join(__dirname, "..", rel));
    require.cache[filename] = { id: filename, filename, loaded: true, exports, children: [], paths: [] };
  };
  put("src/models/User.js", User);
  put("src/models/Otp.js", Otp);
  put("src/utils/sms.js", { sendOtpSms: async (phone, code) => { sentSms.push({ phone, code }); } });
  put("src/utils/mail.js", { sendOtpEmail: async (email, code) => { sentMail.push({ email, code }); } });
}

module.exports = { User, Otp, sentSms, sentMail, install };
