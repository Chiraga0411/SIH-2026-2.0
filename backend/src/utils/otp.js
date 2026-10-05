const crypto = require("crypto");

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

// Keyed hash so a leaked OTP collection can't be reversed without the server secret.
const hashCode = (userId, purpose, code) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${userId}:${purpose}:${code}`).digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = { OTP_TTL_MS, RESEND_COOLDOWN_MS, MAX_ATTEMPTS, generateCode, hashCode, safeEqual };
