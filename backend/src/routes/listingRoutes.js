const express = require("express");

const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

const {
  createListing,
  getListings,
  getListing,
  createInquiry,
  getEligibility
} = require("../controllers/listingController");

const router = express.Router();


// Buyer listings
router.get("/", optionalAuth, getListings);

// Owner eligibility check (before /:id)
router.get("/eligibility/:ulpin", auth, getEligibility);

// Single listing
router.get("/:id", optionalAuth, getListing);

// Owner → List property
router.post("/", auth, createListing);

// Buyer → Interest
router.post("/:id/inquiry", auth, createInquiry);

module.exports = router;