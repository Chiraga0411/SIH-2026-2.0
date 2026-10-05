const express = require("express");
const { rateLimit } = require("express-rate-limit");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const { getParcels, searchParcels, getParcelByUlpIN, getFullReport } = require("../controllers/parcelController");

const router = express.Router();
const skip = () => process.env.DISABLE_RATE_LIMIT === "1" && process.env.NODE_ENV !== "production";
const searchLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false, message: { message: "Too many searches. Please slow down." }, skip });

router.get("/", optionalAuth, getParcels);
router.get("/search", searchLimit, optionalAuth, searchParcels); // before /:ulpin
router.get("/:ulpin/full", auth, getFullReport);
router.get("/:ulpin", optionalAuth, getParcelByUlpIN);

module.exports = router;
