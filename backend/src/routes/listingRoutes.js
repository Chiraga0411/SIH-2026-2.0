const express = require("express");

const auth = require("../middleware/auth");

const {
  createListing,
  getListings,
  getListing,
  createInquiry
} = require("../controllers/listingController");

const router = express.Router();


// Buyer listings
router.get("/", getListings);

// Single listing
router.get("/:id", getListing);

// Owner → List property
router.post("/", auth, createListing);

// Buyer → Interest
router.post("/:id/inquiry", auth, createInquiry);

module.exports = router;