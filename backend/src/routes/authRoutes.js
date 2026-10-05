const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const auth = require("../middleware/auth");
const c = require("../controllers/authController");

const router = express.Router();
const tooMany = { message: "Too many requests. Please try again later." };
// Test-only switch; ignored in production.
const skip = () => process.env.DISABLE_RATE_LIMIT === "1" && process.env.NODE_ENV !== "production";

// Broad cap on every auth call from one IP.
const general = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false, message: tooMany, skip });

// Calls that send an SMS: capped per IP and again per phone/identifier, to limit SMS pumping and harassment.
const smsByIp = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: tooMany, skip });
const smsByTarget = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
  keyGenerator: (req) => {
    const b = req.body || {};
    const key = typeof (b.phone || b.identifier) === "string" ? (b.phone || b.identifier).toLowerCase().slice(0, 100) : "";
    return key || ipKeyGenerator(req.ip);
  }
});

// Password attempts per account (the account also locks after 5 wrong passwords).
const loginByTarget = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: tooMany, skip,
  keyGenerator: (req) => {
    const id = req.body && typeof req.body.identifier === "string" ? req.body.identifier.toLowerCase().slice(0, 100) : "";
    return id || ipKeyGenerator(req.ip);
  }
});

router.use(general);

router.post("/register", smsByIp, smsByTarget, c.register);
router.post("/register/verify", c.verifyRegister);
router.post("/login", loginByTarget, c.login);
router.post("/login/verify", c.verifyLogin);
router.post("/resend-otp", smsByIp, smsByTarget, c.resendOtp);
router.post("/official-login", c.officialLogin);
router.get("/me", auth, c.me);

module.exports = router;
