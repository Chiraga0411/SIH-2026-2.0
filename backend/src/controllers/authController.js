const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { OTP_TTL_MS, RESEND_COOLDOWN_MS, MAX_ATTEMPTS, generateCode, hashCode, safeEqual } = require("../utils/otp");
const { channel, targetOf, deliverOtp } = require("../utils/delivery");

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const OFFICIAL_ROLES = ["officer", "registrar", "planner", "auditor", "admin"];
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const RESEND_AFTER_S = RESEND_COOLDOWN_MS / 1000;

// Used so a request for an unknown account costs the same time as a real one.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// Signup always verifies the email. A code on every login is optional: set LOGIN_OTP=always to require it.
const loginOtpRequired = () => (process.env.LOGIN_OTP || "off").toLowerCase() === "always";

const str = (v) => (typeof v === "string" ? v.trim() : "");

const passwordProblem = (pw) => {
  if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters.";
  if (Buffer.byteLength(pw) > 72) return "Password is too long (max 72 bytes).";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain both letters and numbers.";
  return null;
};

const publicUser = (u) => ({
  id: String(u._id),
  name: u.name,
  phone: u.phone,
  email: u.email,
  role: u.role,
  department: u.department,
  employeeId: u.employeeId
});

const signToken = (user) =>
  jwt.sign({ role: user.role }, process.env.JWT_SECRET, { subject: String(user._id), algorithm: "HS256", expiresIn: "8h" });

const session = (user) => ({ token: signToken(user), user: publicUser(user) });

// --- helpers -------------------------------------------------------------

async function findCitizen(identifier) {
  const id = str(identifier);
  if (!id) return null;
  let digits = id.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2); // accept +91 prefix
  const query = id.includes("@") ? { email: id.toLowerCase() } : { phone: digits };
  const user = await User.findOne({ ...query, verified: true });
  return user && ["citizen", "buyer"].includes(user.role) && user.isActive !== false ? user : null;
}

const isLocked = (u) => u.lockUntil && new Date(u.lockUntil).getTime() > Date.now();

async function recordFailure(user) {
  user.failedLogins = (user.failedLogins || 0) + 1;
  if (user.failedLogins >= MAX_FAILED) {
    user.lockUntil = new Date(Date.now() + LOCK_MS);
    user.failedLogins = 0;
  }
  await user.save();
}

async function clearFailures(user) {
  if (user.failedLogins || user.lockUntil) {
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();
  }
}

// Creates + sends a fresh OTP. Returns { ok:true } or { ok:false, status, message }.
async function issueOtp(user, purpose, { enforceCooldown = true } = {}) {
  const existing = await Otp.findOne({ userId: user._id, purpose });
  if (enforceCooldown && existing && Date.now() - new Date(existing.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, status: 429, message: `Please wait ${RESEND_AFTER_S} seconds before requesting another code.` };
  }
  const code = generateCode();
  if (existing) await Otp.deleteOne({ _id: existing._id });
  const doc = await Otp.create({
    userId: user._id,
    purpose,
    codeHash: hashCode(user._id, purpose, code),
    attempts: 0,
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + OTP_TTL_MS)
  });
  try {
    await deliverOtp(user, code, OTP_TTL_MS / 60000);
  } catch (error) {
    console.error("OTP delivery failed:", error.message);
    await Otp.deleteOne({ _id: doc._id });
    return { ok: false, status: 502, message: "Could not send the verification code. Please try again." };
  }
  return { ok: true };
}

// Returns "ok" | "invalid" | "locked". Codes are single-use.
async function checkOtp(user, purpose, code) {
  const doc = await Otp.findOne({ userId: user._id, purpose });
  if (!doc || new Date(doc.expiresAt).getTime() < Date.now()) {
    if (doc) await Otp.deleteOne({ _id: doc._id });
    return "invalid";
  }
  if (doc.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: doc._id });
    return "locked";
  }
  const given = /^\d{6}$/.test(str(code)) ? str(code) : "";
  if (!given || !safeEqual(doc.codeHash, hashCode(user._id, purpose, given))) {
    doc.attempts += 1;
    await doc.save();
    if (doc.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: doc._id });
      return "locked";
    }
    return "invalid";
  }
  await Otp.deleteOne({ _id: doc._id });
  return "ok";
}

const otpFailure = (res, result) =>
  result === "locked"
    ? res.status(429).json({ message: "Too many incorrect attempts. Request a new code." })
    : res.status(401).json({ message: "Incorrect or expired code." });

const fail = (res, error, message) => {
  console.error(error);
  return res.status(500).json({ message });
};

// --- citizen: register ---------------------------------------------------

exports.register = async (req, res) => {
  try {
    const name = str(req.body.name);
    const phone = str(req.body.phone);
    const email = str(req.body.email).toLowerCase();
    const password = req.body.password;

    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: "Enter your full legal name." });
    if (!PHONE_RE.test(phone)) return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ message: "Enter a valid email address." });
    const pwProblem = passwordProblem(password);
    if (pwProblem) return res.status(400).json({ message: pwProblem });

    const byPhone = await User.findOne({ phone });
    const byEmail = await User.findOne({ email });
    if ((byPhone && byPhone.verified) || (byEmail && byEmail.verified)) {
      return res.status(409).json({ message: "An account with this phone number or email already exists. Please log in." });
    }

    // Unverified sign-ups never proved ownership, so a later sign-up may take over the phone/email.
    if (byEmail && (!byPhone || String(byEmail._id) !== String(byPhone._id))) {
      await Otp.deleteMany({ userId: byEmail._id });
      await User.deleteOne({ _id: byEmail._id });
    }

    const fields = {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      district: str(req.body.district).slice(0, 80) || undefined,
      circle: str(req.body.circle).slice(0, 80) || undefined,
      mauza: str(req.body.mauza).slice(0, 80) || undefined
    };

    let user = byPhone;
    if (user) {
      Object.assign(user, fields, { role: "citizen" });
      await user.save();
    } else {
      user = await User.create({ ...fields, phone, role: "citizen", verified: false });
    }

    const sent = await issueOtp(user, "register");
    if (!sent.ok) return res.status(sent.status).json({ message: sent.message });
    res.json({ message: "Verification code sent.", sentTo: targetOf(user), channel: channel(), resendAfter: RESEND_AFTER_S });
  } catch (error) {
    fail(res, error, "Registration failed");
  }
};

exports.verifyRegister = async (req, res) => {
  try {
    const phone = str(req.body.phone);
    const user = PHONE_RE.test(phone) ? await User.findOne({ phone, verified: false }) : null;
    if (!user) return res.status(401).json({ message: "Incorrect or expired code." });

    const result = await checkOtp(user, "register", req.body.otp);
    if (result !== "ok") return otpFailure(res, result);

    user.verified = true;
    await user.save();
    res.json({ message: "Account verified.", ...session(user) });
  } catch (error) {
    fail(res, error, "Verification failed");
  }
};

// --- citizen: login (password, then OTP) ---------------------------------

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await findCitizen(identifier);
    const generic = () => res.status(401).json({ message: "Incorrect login details." });

    if (!user || typeof password !== "string") {
      await bcrypt.compare(typeof password === "string" ? password : "", DUMMY_HASH);
      return generic();
    }
    if (isLocked(user)) return res.status(429).json({ message: "Too many failed attempts. Try again in 15 minutes." });

    const ok = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!ok) {
      await recordFailure(user);
      return generic();
    }
    await clearFailures(user);

    if (!loginOtpRequired()) return res.json({ message: "Login successful.", ...session(user) });

    const sent = await issueOtp(user, "login");
    if (!sent.ok) return res.status(sent.status).json({ message: sent.message });
    res.json({ message: "Verification code sent.", sentTo: targetOf(user), channel: channel(), resendAfter: RESEND_AFTER_S });
  } catch (error) {
    fail(res, error, "Login failed");
  }
};

exports.verifyLogin = async (req, res) => {
  try {
    if (!loginOtpRequired()) return res.status(400).json({ message: "Login codes are not enabled." });
    const user = await findCitizen(req.body.identifier);
    if (!user) return res.status(401).json({ message: "Incorrect or expired code." });
    const result = await checkOtp(user, "login", req.body.otp);
    if (result !== "ok") return otpFailure(res, result);
    res.json({ message: "Login successful.", ...session(user) });
  } catch (error) {
    fail(res, error, "Login failed");
  }
};

// Resend only works for a flow that was already started (password verified / sign-up submitted).
exports.resendOtp = async (req, res) => {
  try {
    const purpose = req.body.purpose === "register" ? "register" : "login";
    const idValue = str(req.body.identifier);
    let user = null;
    if (purpose === "register") {
      const phone = idValue.replace(/\D/g, "");
      user = PHONE_RE.test(phone) ? await User.findOne({ phone, verified: false }) : null;
    } else {
      user = await findCitizen(idValue);
    }
    const started = user && (await Otp.findOne({ userId: user._id, purpose }));
    if (started) {
      const sent = await issueOtp(user, purpose);
      if (!sent.ok) return res.status(sent.status).json({ message: sent.message });
    }
    // Same answer whether or not a flow existed, so this can't be used to probe accounts.
    res.json({ message: "If a code was requested, a new one has been sent.", resendAfter: RESEND_AFTER_S });
  } catch (error) {
    fail(res, error, "Could not resend the code");
  }
};

// --- officials -----------------------------------------------------------

exports.officialLogin = async (req, res) => {
  try {
    const employeeId = str(req.body.employeeId).toUpperCase();
    const { password } = req.body;
    const user = employeeId && typeof password === "string" ? await User.findOne({ employeeId }) : null;
    const valid = user && OFFICIAL_ROLES.includes(user.role) && user.isActive !== false;
    const generic = () => res.status(401).json({ message: "Employee ID or password is incorrect." });

    if (!valid) {
      await bcrypt.compare(typeof password === "string" ? password : "", DUMMY_HASH);
      return generic();
    }
    if (isLocked(user)) return res.status(429).json({ message: "Too many failed attempts. Try again in 15 minutes." });

    const ok = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!ok) {
      await recordFailure(user);
      return generic();
    }
    await clearFailures(user);
    res.json({ message: "Official login successful.", ...session(user) });
  } catch (error) {
    fail(res, error, "Official login failed");
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Invalid or expired token" });
    res.json({ user: publicUser(user) });
  } catch (error) {
    fail(res, error, "Could not load profile");
  }
};
