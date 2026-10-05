const express = require("express");
const { rateLimit } = require("express-rate-limit");
const auth = require("../middleware/auth");
const { ask } = require("../controllers/assistantController");
const router = express.Router();
const skip = () => process.env.DISABLE_RATE_LIMIT === "1" && process.env.NODE_ENV !== "production";
const perUser = rateLimit({
  windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, skip,
  message: { message: "Too many questions. Please wait a minute." },
  keyGenerator: (req) => String(req.user?.id || "anon")
});
router.post("/ask", auth, perUser, ask);
module.exports = router;
