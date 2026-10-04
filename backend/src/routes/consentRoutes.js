const express = require("express");

const auth = require("../middleware/auth");

const {
  requestConsent,
  getConsents,
  updateConsent
} = require("../controllers/consentController");

const router = express.Router();


// Buyer requests full report
router.post("/", auth, requestConsent);


// Owner sees requests
router.get("/", auth, getConsents);


// Owner approves/rejects
router.patch("/:id", auth, updateConsent);

module.exports = router;