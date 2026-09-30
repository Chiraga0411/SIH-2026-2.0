const express = require("express");

const auth = require("../middleware/auth");

const {
  createClaim,
  myProperties
} = require("../controllers/claimController");

const router = express.Router();

router.post("/", auth, createClaim);

router.get("/my-properties", auth, myProperties);

module.exports = router;